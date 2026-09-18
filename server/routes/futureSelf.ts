import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db/database.js';
import { FutureSelfError, FutureSelfRepository } from '../repositories/futureSelfRepository.js';
const repository = new FutureSelfRepository(db);
export const futureSelfRouter = Router();
futureSelfRouter.use((_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
futureSelfRouter.use(requireAuth);
// A cookie can switch accounts while an older tab still has the previous owner's
// state. Check identity on reads AND writes before accessing any journal.
futureSelfRouter.use((req: AuthenticatedRequest, res, next) => {
  if (req.get('X-DeungSati-Owner') !== req.userId) { res.status(409).json({ code: 'ACCOUNT_CHANGED', error: 'Account changed; reopen Future Self' }); return; }
  next();
});
futureSelfRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try { res.json(await repository.get(req.userId!)); }
  catch { res.status(500).json({ error: 'Unable to load Future Self' }); }
});
futureSelfRouter.put('/', async (req: AuthenticatedRequest, res) => {
  try { res.json(await repository.save(req.userId!, req.body)); }
  catch (e) { res.status(e instanceof FutureSelfError ? e.status : 500).json({ error: e instanceof FutureSelfError ? e.message : 'Unable to save Future Self' }); }
});
