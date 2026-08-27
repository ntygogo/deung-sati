import express from 'express';
import type { Request, Response } from 'express';
import { classifySafety } from './safetyClassifier.ts';
import { streamChatResponse } from './aiProvider.ts';
import { extractLoop } from './loopExtractor.ts';
import { simulateConsequence } from './consequenceSimulator.ts';
import { analyzeEmpathyLens } from './empathyLens.ts';
import { filterCommunicationMessage } from './communicationFilter.ts';
import { sessionStore } from './sessionStore.ts';

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

// 4. Pure Gemini Streaming Chat endpoint (SSE)
apiApp.post('/chat/stream', async (req: Request, res: Response) => {
  try {
    const { messages, sessionId = 'default-session', sessionState } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const latestUserMsg = messages[messages.length - 1]?.content || '';

    // Record user message in session
    sessionStore.recordUserTurn(sessionId, latestUserMsg);

    // Run safety classification gate
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
      onChunk: (chunkText: string) => {
        res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunkText })}\n\n`);
      },
      onDone: (
        fullText: string,
        source: 'gemini' | 'fallback',
        options?: string[],
        checkinData?: any,
        exerciseCard?: any
      ) => {
        // Record assistant turn in session
        sessionStore.recordAssistantTurn(sessionId, fullText);
        res.write(
          `event: done\ndata: ${JSON.stringify({
            fullText,
            source,
            options,
            checkinData,
            exerciseCard,
          })}\n\n`
        );
        res.end();
      },
      onError: (err: Error) => {
        console.error('Chat stream error:', err);
        res.write(
          `event: error\ndata: ${JSON.stringify({
            message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง',
          })}\n\n`
        );
        res.end();
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

// 5. Structured Loop Extraction endpoint (Secondary observation / Loop Map)
apiApp.post('/extract-loop', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const loop = await extractLoop(messages);
    res.json(loop);
  } catch (err) {
    console.error('Extract loop error:', err);
    res.status(500).json({ error: 'Failed to extract loop' });
  }
});

// 6. Consequence Simulation endpoint (Gemini AI Powered Worst-Case Simulator)
apiApp.post('/simulate-consequence', async (req: Request, res: Response) => {
  try {
    const { action } = req.body;
    if (!action || typeof action !== 'string') {
      res.status(400).json({ error: 'Action string is required' });
      return;
    }

    const result = await simulateConsequence(action);
    res.json(result);
  } catch (err) {
    console.error('Consequence simulation error:', err);
    res.status(500).json({ error: 'Failed to simulate consequence' });
  }
});

// 7. Empathy Lens endpoint (Gemini AI Powered Reverse Perspective Decrypter)
apiApp.post('/simulate-empathy-lens', async (req: Request, res: Response) => {
  try {
    const { relationshipType = 'แฟน / คนรัก', situation, userReaction } = req.body;
    if (!situation || typeof situation !== 'string') {
      res.status(400).json({ error: 'Situation string is required' });
      return;
    }

    const result = await analyzeEmpathyLens({
      relationshipType,
      situation,
      userReaction,
    });
    res.json(result);
  } catch (err) {
    console.error('Empathy Lens simulation error:', err);
    res.status(500).json({ error: 'Failed to simulate empathy lens' });
  }
});

// 8. Communication Filter endpoint (Gemini AI Powered NVC Message Refiner)
apiApp.post('/filter-communication', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message string is required' });
      return;
    }

    const result = await filterCommunicationMessage(message);
    res.json(result);
  } catch (err) {
    console.error('Communication Filter error:', err);
    res.status(500).json({ error: 'Failed to filter message' });
  }
});


