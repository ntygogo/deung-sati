import express from 'express';
import type { Request, Response } from 'express';
import { classifySafety } from './safetyClassifier';
import { streamChatResponse } from './aiProvider';
import { extractLoop } from './loopExtractor';
import { simulateConsequence } from './consequenceSimulator';
import { analyzeEmpathyLens } from './empathyLens';
import { filterCommunicationMessage } from './communicationFilter';
import { sessionStore } from './sessionStore';
import type { ChatEngineTurnResponse } from '../src/shared/chat-protocol';

export const apiApp = express();

apiApp.use(express.json());

// 1. Health endpoint
apiApp.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// 2. Safety Triage endpoint
apiApp.post('/safety-check', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const classification = await classifySafety(messages);
    res.json(classification);
  } catch (err) {
    console.error('Safety check error:', err);
    res.status(500).json({
      mode: 'normal',
      error: 'Failed to classify safety',
    });
  }
});

// 3. Get session history endpoint
apiApp.get('/session/:sessionId', (req: Request, res: Response) => {
  const sessionId = Array.isArray(req.params.sessionId)
    ? req.params.sessionId[0]
    : String(req.params.sessionId);
  const session = sessionStore.getSession(sessionId);
  res.json({
    sessionId: session.sessionId,
    messageCount: session.messages.length,
    messages: session.messages,
  });
});

// 4. Pure Gemini Streaming Chat endpoint (SSE) with Structured Turn Contract
apiApp.post('/chat/stream', async (req: Request, res: Response) => {
  try {
    const { messages, sessionId = 'default-session', sessionState, requestId } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const lastMsg = messages[messages.length - 1];
    const latestUserMsg = lastMsg?.content || '';

    // Safe debugging log (no secrets)
    console.log(
      `[Chat API] reqId=${requestId ?? 'none'}, count=${messages.length}, lastRole=${lastMsg?.role}, preview="${latestUserMsg.slice(0, 50)}"`
    );

    // Record user message in session
    sessionStore.recordUserTurn(sessionId, latestUserMsg);

    // Run safety classification gate (0ms fast path)
    const safety = await classifySafety(messages);

    // Setup Server-Sent Events headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send safety event
    res.write(`event: safety\ndata: ${JSON.stringify(safety)}\n\n`);

    // Stream AI response directly from Gemini Multi-Turn with Shared Protocol Fallback
    await streamChatResponse({
      messages,
      safety,
      sessionState,
      requestId,
      onAssistantToken: (chunkText: string) => {
        if (!res.writableEnded) {
          res.write(`event: assistant_token\ndata: ${JSON.stringify({ text: chunkText, requestId })}\n\n`);
          // Also emit legacy chunk event for backward compatibility
          res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunkText, requestId })}\n\n`);
        }
      },
      onAssistantMeta: (meta: ChatEngineTurnResponse) => {
        if (!res.writableEnded) {
          res.write(
            `event: assistant_meta\ndata: ${JSON.stringify({
              requestId,
              safety_state: meta.safety_state,
              mode: meta.mode,
              capacity: meta.capacity,
              user_intent: meta.user_intent,
              readiness: meta.readiness,
              recommended_exercise: meta.recommended_exercise,
              quick_replies: meta.quick_replies,
            })}\n\n`
          );
        }
      },
      onDone: (
        fullText: string,
        source: 'gemini' | 'error',
        structuredTurn: ChatEngineTurnResponse
      ) => {
        // Record assistant turn in session
        sessionStore.recordAssistantTurn(sessionId, fullText);
        if (!res.writableEnded) {
          res.write(
            `event: done\ndata: ${JSON.stringify({
              requestId,
              fullText,
              source,
              structuredTurn,
              options: structuredTurn.quick_replies,
              recommended_exercise: structuredTurn.recommended_exercise,
              mode: structuredTurn.mode,
              safety_state: structuredTurn.safety_state,
              capacity: structuredTurn.capacity,
              user_intent: structuredTurn.user_intent,
              readiness: structuredTurn.readiness,
            })}\n\n`
          );
          res.end();
        }
      },
      onError: (err: Error) => {
        console.error('Chat stream error:', err);
        if (!res.writableEnded) {
          res.write(
            `event: error\ndata: ${JSON.stringify({
              requestId,
              message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง',
            })}\n\n`
          );
          res.end();
        }
      },
    });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.end();
    }
  }
});

// 5. Structured Loop Extraction endpoint
apiApp.post('/extract-loop', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }
    const result = await extractLoop(messages);
    res.json(result);
  } catch (err) {
    console.error('Extract loop error:', err);
    res.status(500).json({ error: 'Failed to extract loop' });
  }
});

// 6. Consequence Simulator endpoint
apiApp.post('/simulate-consequence', async (req: Request, res: Response) => {
  try {
    const { actionDescription } = req.body;
    if (!actionDescription) {
      res.status(400).json({ error: 'actionDescription is required' });
      return;
    }
    const result = await simulateConsequence(actionDescription);
    res.json(result);
  } catch (err) {
    console.error('Simulate consequence error:', err);
    res.status(500).json({ error: 'Failed to simulate consequence' });
  }
});

// 7. Perspective / Empathy Lens endpoint (4-Quadrant)
apiApp.post('/analyze-empathy', async (req: Request, res: Response) => {
  try {
    const { rawConflictText } = req.body;
    if (!rawConflictText) {
      res.status(400).json({ error: 'rawConflictText is required' });
      return;
    }
    const result = await analyzeEmpathyLens(rawConflictText);
    res.json(result);
  } catch (err) {
    console.error('Analyze empathy error:', err);
    res.status(500).json({ error: 'Failed to analyze empathy' });
  }
});

// 8. Communication Filter / Before Speak endpoint (NVC 4-Style)
apiApp.post('/filter-communication', async (req: Request, res: Response) => {
  try {
    const { rawMessage } = req.body;
    if (!rawMessage) {
      res.status(400).json({ error: 'rawMessage is required' });
      return;
    }
    const result = await filterCommunicationMessage(rawMessage);
    res.json(result);
  } catch (err) {
    console.error('Filter communication error:', err);
    res.status(500).json({ error: 'Failed to filter communication' });
  }
});
