import { Router, type Response } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db/database.js';
import { DiscoveryError, DiscoveryRepository } from '../repositories/discoveryRepository.js';

const repository = new DiscoveryRepository(db);
export const discoveryRouter = Router();
discoveryRouter.use((_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
discoveryRouter.use(requireAuth);
discoveryRouter.use((req: AuthenticatedRequest, res, next) => {
  if (req.get('X-DeungSati-Owner') !== req.userId) {
    res.status(409).json({ code: 'ACCOUNT_CHANGED', error: 'Account changed; reopen self discovery' });
    return;
  }
  next();
});
function failure(res: Response, error: unknown): void {
  res.status(error instanceof DiscoveryError ? error.status : 500).json({ error: error instanceof DiscoveryError ? error.message : 'Unable to access self discovery' });
}
discoveryRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try { res.json(await repository.get(req.userId!)); } catch (error) { failure(res, error); }
});
discoveryRouter.post('/', async (req: AuthenticatedRequest, res) => {
  try { res.json(await repository.create(req.userId!, req.body)); } catch (error) { failure(res, error); }
});
discoveryRouter.put('/:id', async (req: AuthenticatedRequest, res) => {
  try { res.json(await repository.update(req.userId!, req.params.id, req.body)); } catch (error) { failure(res, error); }
});
discoveryRouter.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try { res.json(await repository.delete(req.userId!, req.params.id, req.body)); } catch (error) { failure(res, error); }
});
