import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { RoomRepository } from '../repositories/roomRepository.js';
import { ROOM_WEATHERS } from '../../src/shared/roomProgress.js';
export const roomRouter = Router();
const repo = new RoomRepository();
roomRouter.use(requireAuth);
roomRouter.get('/', async (req: AuthenticatedRequest, res, next) => { try { res.json(await repo.state(req.userId!)); } catch(e) { next(e); } });
roomRouter.put('/weather', async (req: AuthenticatedRequest, res, next) => {
  if (!ROOM_WEATHERS.includes(req.body.weather)) { res.status(400).json({error:'เลือกสภาพอากาศอีกครั้ง'}); return; }
  try { res.json(await repo.weather(req.userId!, req.body.weather)); } catch(e) { next(e); }
});
roomRouter.post('/interact', async (req: AuthenticatedRequest, res, next) => {
  if (!['feed','ball','pet','rest'].includes(req.body.action) || typeof req.body.requestId !== 'string' || req.body.requestId.length > 100 || !req.body.requestId) { res.status(400).json({error:'ข้อมูลกิจกรรมไม่ถูกต้อง'}); return; }
  try { res.json(await repo.interact(req.userId!, req.body.requestId)); } catch(e) { next(e); }
});
roomRouter.post('/events/:id/seen', async (req: AuthenticatedRequest, res, next) => {
  try { await repo.acknowledge(req.userId!, String(req.params.id)); res.json({success:true}); } catch(e) { next(e); }
});
