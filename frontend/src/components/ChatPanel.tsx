import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Send, RefreshCw } from 'lucide-react';
import type { CheckResult, ChatSession, ChatMessage, ChatScoreRow, ChatActionItem } from '../types/index.js';
import { createChatSession, fetchChatSession, sendChatMessage, ApiError } from '../utils/api.js';

interface ChatPanelProps {
  checkResult: CheckResult;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ checkResult }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSession(null);
    setIsOpen(false);
    setInput('');
    setIsSending(false);
    setError(null);
  }, [checkResult.url, checkResult.timestamp]);

  const ensureSession = async (): Promise<ChatSession> => {
    if (session) {
      return session;
    }
    setIsInitializing(true);
    try {
      const created = await createChatSession(checkResult);
      setSession(created);
      return created;
    } finally {
      setIsInitializing(false);
    }
  };

  const refreshSession = async (targetSessionId: string) => {
    try {
      const refreshed = await fetchChatSession(targetSessionId);
      setSession(refreshed);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'チャット履歴の読み込みに失敗しました。';
      setError(message);
    }
  };

  const handleToggle = async () => {
    if (!isOpen) {
      try {
        const targetSession = await ensureSession();
        await refreshSession(targetSession.id);
        setError(null);
        setIsOpen(true);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'チャットの初期化に失敗しました。Geminiの設定をご確認ください。';
        setError(message);
      }
      return;
    }
    setIsOpen(false);
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;

    try {
      const currentSession = await ensureSession();
      setIsSending(true);
      setError(null);
      const updatedSession = await sendChatMessage(currentSession.id, input.trim());
      setSession(updatedSession);
      setInput('');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'AI応答の生成に失敗しました。時間を置いて再度お試しください。';
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  const renderAssistantExtras = (message: ChatMessage) => {
    const extras: React.ReactNode[] = [];

    if (Array.isArray(message.scoreTable) && message.scoreTable.length > 0) {
      extras.push(
        <div className="chat-score-table" key={`table-${message.id}`}>
          <table>
            <thead>
              <tr>
                <th>指標</th>
                <th>スコア</th>
                <th>目標</th>
                <th>コメント</th>
              </tr>
            </thead>
            <tbody>
              {message.scoreTable.map((row: ChatScoreRow, index: number) => (
                <tr key={`${message.id}-score-${index}`}>
                  <td>{row.metric}</td>
                  <td>{row.score ?? 'N/A'}</td>
                  <td>{row.goal ?? 90}</td>
                  <td>{row.comment || '詳細なし'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (Array.isArray(message.actionItems) && message.actionItems.length > 0) {
      extras.push(
        <div className="chat-action-items" key={`actions-${message.id}`}>
          <h5>優先改善アクション</h5>
          <ul>
            {message.actionItems.map((item: ChatActionItem, index: number) => (
              <li key={`${message.id}-action-${index}`}>
                <span className={`priority-badge priority-${item.priority || 'medium'}`}>
                  {item.priority || 'medium'}
                </span>
                <div className="action-content">
                  <strong>{item.title}</strong>
                  {item.description && <p>{item.description}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    if (Array.isArray(message.followUpQuestions) && message.followUpQuestions.length > 0) {
      extras.push(
        <div className="chat-followups" key={`followups-${message.id}`}>
          <h5>深掘りのヒント</h5>
          <ul>
            {message.followUpQuestions.map((question, index) => (
              <li key={`${message.id}-followup-${index}`}>{question}</li>
            ))}
          </ul>
        </div>
      );
    }

    return extras;
  };

  const renderMessages = () => {
    if (!session || session.messages.length === 0) {
      return (
        <div className="chat-placeholder">
          <p>チャットを開始すると、診断結果をもとにAIが改善ポイントを提案します。</p>
        </div>
      );
    }

    return session.messages.map((message) => {
      const lines = message.content.split('\n');
      return (
        <div
          key={message.id}
          className={`chat-message chat-message-${message.role}`}
        >
          <div className="chat-bubble">
            <p>
              {lines.map((line, index) => (
                <React.Fragment key={`${message.id}-${index}`}>
                  {line}
                  {index < lines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
            {message.role === 'assistant' && renderAssistantExtras(message)}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="chat-panel">
      <button
        className="chat-toggle-button"
        onClick={handleToggle}
        disabled={isInitializing}
      >
        <MessageCircle size={18} />
        <span>{isOpen ? 'チャットを閉じる' : 'チャットで確認'}</span>
      </button>

      {error && (
        <div className="chat-error" role="alert">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {isOpen && (
        <div className="chat-container">
          <div className="chat-header">
            <div className="chat-title">
              <MessageCircle size={18} />
              <span>診断チャットアシスタント</span>
            </div>
            <div className="chat-actions">
              {session && (
                <button
                  className="chat-refresh"
                  onClick={() => refreshSession(session.id)}
                  title="最新の会話を取得"
                  type="button"
                >
                  <RefreshCw size={16} />
                </button>
              )}
              <button className="chat-close" onClick={() => setIsOpen(false)} type="button">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="chat-body">
            {isInitializing ? (
              <div className="chat-placeholder">
                <p>チャットを準備しています...</p>
              </div>
            ) : (
              renderMessages()
            )}
          </div>

          <form className="chat-input" onSubmit={handleSend}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="気になる問題や改善したいポイントを聞いてみよう"
              disabled={isSending}
              rows={3}
            />
            <button type="submit" disabled={isSending || !input.trim()}>
              {isSending ? '送信中...' : <Send size={16} />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
