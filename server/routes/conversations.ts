import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db/database.js';
import { ConversationRepository, ConversationError } from '../repositories/conversationRepository.js';
export const conversationsRouter = Router();
const repository = new ConversationRepository(db);
conversationsRouter.use(requireAuth);
conversationsRouter.use((_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
const id = (req: AuthenticatedRequest) => String(req.params.id);
const error = (res: any, e: unknown) => res.status(e instanceof ConversationError ? e.status : 500).json({ error: e instanceof ConversationError ? e.message : 'Unable to save or load conversation' });
conversationsRouter.get('/', async (req: AuthenticatedRequest, res) => { try { res.json({ conversations: await repository.list(req.userId!, typeof req.query.traceId === 'string' ? req.query.traceId : undefined) }); } catch (e) { error(res, e); } });
conversationsRouter.get('/:id', async (req: AuthenticatedRequest, res) => { try {
  const conversation = await repository.get(req.userId!, id(req));
  if (!conversation) { res.status(404).json({ error: 'Conversation not found' }); return; }
  res.json({ conversation });
} catch (e) { error(res, e); } });
conversationsRouter.put('/:id', async (req: AuthenticatedRequest, res) => { try { res.json({ conversation: await repository.save(req.userId!, id(req), req.body) }); } catch (e) { error(res, e); } });
conversationsRouter.delete('/:id', async (req: AuthenticatedRequest, res) => { try { await repository.remove(req.userId!, id(req)); res.json({ success: true }); } catch (e) { error(res, e); } });
