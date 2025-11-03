import { GeminiClient, GeminiApiError } from '../ai/geminiClient.js';
import { getGeminiConfig, isGeminiConfigValid } from '../../config/gemini.js';
import {
  createChatSession as createSessionInStore,
  getChatSession,
  appendMessage,
  deleteChatSession as deleteSessionInStore
} from './chatSessionStore.js';
import { buildChatPrompt } from './chatPromptBuilder.js';

function ensureGeminiAvailable() {
  if (!isGeminiConfigValid()) {
    const config = getGeminiConfig();
    const reason = !config.enabled
      ? 'Gemini分析が無効化されています。管理者にお問い合わせください。'
      : 'Gemini APIキーが未設定です。';
    const error = new Error(reason);
    error.statusCode = 503;
    throw error;
  }
}

function getGeminiClient() {
  const config = getGeminiConfig();
  return new GeminiClient(config);
}

function normalizeGeminiReply(response) {
  const base = {
    reply: '現在AIからの回答を取得できませんでした。少し時間をおいて再度お試しください。',
    scoreTable: null,
    actionItems: null,
    followUpQuestions: null
  };

  if (!response || typeof response !== 'object') {
    return base;
  }

  const { content } = response;

  if (typeof content === 'string') {
    return {
      ...base,
      reply: content
    };
  }

  if (content && typeof content === 'object') {
    const replyText = typeof content.reply === 'string'
      ? content.reply
      : typeof content.text === 'string'
        ? content.text
        : base.reply;

    const scoreTable = Array.isArray(content.scoreTable)
      ? content.scoreTable
          .map((row) => ({
            metric: typeof row.metric === 'string' ? row.metric : '指標',
            score: typeof row.score === 'number' ? row.score : Number.parseFloat(row.score) || null,
            goal: typeof row.goal === 'number' ? row.goal : Number.parseFloat(row.goal) || null,
            comment: typeof row.comment === 'string' ? row.comment : null
          }))
          .filter((row) => row.metric && row.comment)
      : null;

    const actionItems = Array.isArray(content.actionItems)
      ? content.actionItems.map((item) => ({
          title: typeof item.title === 'string' ? item.title : '改善項目',
          description: typeof item.description === 'string' ? item.description : null,
          priority: typeof item.priority === 'string' ? item.priority : 'medium'
        }))
      : null;

    const followUpQuestions = Array.isArray(content.followUpQuestions)
      ? content.followUpQuestions.filter((q) => typeof q === 'string')
      : null;

    return {
      reply: replyText,
      scoreTable,
      actionItems,
      followUpQuestions
    };
  }

  return base;
}

export function createChatSession({ checkResult }) {
  if (!checkResult || typeof checkResult !== 'object') {
    const error = new Error('診断結果が提供されていないためチャットを開始できません。');
    error.statusCode = 400;
    throw error;
  }
  return createSessionInStore({ checkResult });
}

export function fetchChatSession(sessionId) {
  const session = getChatSession(sessionId);
  if (!session) {
    const error = new Error('チャットセッションが見つかりません。');
    error.statusCode = 404;
    throw error;
  }
  return session;
}

export async function submitUserMessage(sessionId, messageContent) {
  if (!messageContent || typeof messageContent !== 'string' || !messageContent.trim()) {
    const error = new Error('メッセージ本文を入力してください。');
    error.statusCode = 400;
    throw error;
  }

  const trimmedContent = messageContent.trim();
  const sessionAfterUser = appendMessage(sessionId, {
    role: 'user',
    content: trimmedContent
  });

  if (!sessionAfterUser) {
    const error = new Error('チャットセッションが存在しないためメッセージを送信できません。');
    error.statusCode = 404;
    throw error;
  }

  ensureGeminiAvailable();
  const client = getGeminiClient();

  const prompt = buildChatPrompt({
    checkResult: sessionAfterUser.checkResult,
    history: sessionAfterUser.messages,
    userMessage: trimmedContent
  });

  try {
    const response = await client.generateContent(prompt);
    const normalized = normalizeGeminiReply(response);

    const updatedSession = appendMessage(sessionId, {
      role: 'assistant',
      content: normalized.reply,
      metadata: {
        model: response.model,
        tokensUsed: response.tokensUsed,
        generatedAt: response.generatedAt
      },
      scoreTable: normalized.scoreTable,
      actionItems: normalized.actionItems,
      followUpQuestions: normalized.followUpQuestions
    });

    return updatedSession;
  } catch (error) {
    let statusCode = 500;
    let userFacingMessage = 'AI応答の生成中にエラーが発生しました。時間をおいて再度お試しください。';

    if (error instanceof GeminiApiError) {
      statusCode = error.statusCode || 502;
      userFacingMessage = `Gemini APIエラー: ${error.message}`;
    } else if (error.statusCode) {
      statusCode = error.statusCode;
      userFacingMessage = error.message;
    }

    const wrappedError = new Error(userFacingMessage);
    wrappedError.statusCode = statusCode;
    throw wrappedError;
  }
}

export function deleteChatSession(sessionId) {
  deleteSessionInStore(sessionId);
}
