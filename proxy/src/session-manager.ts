export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  messages: Message[];
  model: string;
  provider: string;
  apiKey: string;
  createdAt: number;
}

const sessions = new Map<string, Session>();

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

export function createSession(sessionId: string, config: { model: string; provider: string; apiKey: string }): Session {
  const session: Session = {
    id: sessionId,
    messages: [],
    model: config.model,
    provider: config.provider,
    apiKey: config.apiKey,
    createdAt: Date.now(),
  };
  sessions.set(sessionId, session);
  return session;
}

export function updateSessionConfig(sessionId: string, config: { model: string; provider: string; apiKey: string }): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.model = config.model;
    session.provider = config.provider;
    session.apiKey = config.apiKey;
  }
}

export function addMessage(sessionId: string, message: Message): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.messages.push(message);
  }
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function getSessionHistory(sessionId: string): Message[] {
  return sessions.get(sessionId)?.messages || [];
}
