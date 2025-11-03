import express from 'express';
import {
  createChatSession,
  fetchChatSession,
  submitUserMessage,
  deleteChatSession
} from '../services/chat/chatService.js';
import { sendErrorResponse } from '../utils/error-handler.js';

const router = express.Router();

function handleError(res, error, fallbackMessage) {
  const status = error.statusCode || 500;
  const message = error.message || fallbackMessage;
  sendErrorResponse(res, status, 'Chat Error', message);
}

router.post('/session', (req, res) => {
  try {
    const { checkResult } = req.body || {};
    const session = createChatSession({ checkResult });
    res.status(201).json(session);
  } catch (error) {
    handleError(res, error, 'チャットセッションの作成に失敗しました');
  }
});

router.get('/session/:sessionId', (req, res) => {
  try {
    const session = fetchChatSession(req.params.sessionId);
    res.json(session);
  } catch (error) {
    handleError(res, error, 'チャットセッションの取得に失敗しました');
  }
});

router.delete('/session/:sessionId', (req, res) => {
  try {
    deleteChatSession(req.params.sessionId);
    res.status(204).end();
  } catch (error) {
    handleError(res, error, 'チャットセッションの削除に失敗しました');
  }
});

router.post('/:sessionId/messages', async (req, res) => {
  try {
    const { message } = req.body || {};
    const updatedSession = await submitUserMessage(req.params.sessionId, message);
    res.json(updatedSession);
  } catch (error) {
    handleError(res, error, 'AI応答の生成に失敗しました');
  }
});

export default router;
