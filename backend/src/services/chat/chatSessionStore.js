import { randomUUID } from 'crypto';

const sessions = new Map();
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

function cloneSession(session) {
  if (!session) return null;
  return {
    id: session.id,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    checkResult: session.checkResult,
    messages: session.messages.map((message) => ({ ...message }))
  };
}

function withSession(sessionId, updater) {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  const now = Date.now();
  if (now - new Date(session.updatedAt).getTime() > SESSION_TTL_MS) {
    sessions.delete(sessionId);
    return null;
  }

  const result = updater(session);
  session.updatedAt = new Date().toISOString();
  return result;
}

export function createChatSession({ checkResult }) {
  const id = randomUUID();
  const timestamp = new Date().toISOString();
  const session = {
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
    checkResult,
    messages: []
  };
  sessions.set(id, session);
  return cloneSession(session);
}

export function getChatSession(sessionId) {
  return cloneSession(sessions.get(sessionId));
}

export function listChatSessions() {
  return Array.from(sessions.values()).map((session) => cloneSession(session));
}

export function deleteChatSession(sessionId) {
  sessions.delete(sessionId);
}

export function appendMessage(sessionId, message) {
  return withSession(sessionId, (session) => {
    const storedMessage = {
      id: randomUUID(),
      role: message.role,
      content: message.content,
      createdAt: new Date().toISOString(),
      metadata: message.metadata || null,
      scoreTable: message.scoreTable || null,
      actionItems: message.actionItems || null,
      followUpQuestions: message.followUpQuestions || null
    };
    session.messages.push(storedMessage);
    return cloneSession(session);
  });
}

export function resetExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - new Date(session.updatedAt).getTime() > SESSION_TTL_MS) {
      sessions.delete(sessionId);
    }
  }
}
