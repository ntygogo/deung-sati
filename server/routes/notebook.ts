import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db/database.js';
import { NotebookRepository } from '../repositories/notebookRepository.js';
import { validateNotebookEntry } from '../../src/shared/notebook.js';
const repository = new NotebookRepository(db);
export const notebookRouter = Router();
notebookRouter.use((_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
notebookRouter.use(requireAuth);
notebookRouter.use((req: AuthenticatedRequest, res, next) => {
  if (req.get('X-DeungSati-Owner') !== req.userId) { res.status(409).json({ code: 'ACCOUNT_CHANGED' }); return; }
  next();
});
notebookRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try { res.json({ ownerId: req.userId, entries: await repository.list(req.userId!) }); }
  catch { res.status(500).json({ error: 'Unable to load notebook' }); }
});
notebookRouter.post('/', async (req: AuthenticatedRequest, res) => {
  let entry;
  try { entry = validateNotebookEntry(req.body); }
  catch { res.status(400).json({ error: 'Invalid notebook entry' }); return; }
  try { res.json({ ownerId: req.userId, entry: await repository.add(req.userId!, entry) }); }
  catch { res.status(500).json({ error: 'Unable to save notebook' }); }
});
