export interface SessionData {
  sessionId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  createdAt: Date;
  updatedAt: Date;
}

class SessionStore {
  private sessions = new Map<string, SessionData>();

  getSession(sessionId: string): SessionData {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.sessions.set(sessionId, session);
    }
    return session;
  }

  recordUserTurn(sessionId: string, userText: string): SessionData {
    const session = this.getSession(sessionId);
    session.messages.push({ role: 'user', content: userText.trim() });
    session.updatedAt = new Date();
    return session;
  }

  recordAssistantTurn(sessionId: string, assistantText: string): SessionData {
    const session = this.getSession(sessionId);
    session.messages.push({ role: 'assistant', content: assistantText.trim() });
    session.updatedAt = new Date();
    return session;
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

export const sessionStore = new SessionStore();
