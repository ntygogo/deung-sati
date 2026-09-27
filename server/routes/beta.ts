import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { trialStatus, recordTrialInterest } from '../services/betaTrial.js';
export const betaRouter = Router();
betaRouter.use(requireAuth);
betaRouter.use((_req,res,next) => { res.setHeader('Cache-Control','private, no-store'); next(); });
betaRouter.get('/status',async(req: AuthenticatedRequest,res) => {
  try { res.json(await trialStatus(req.userId!)); } catch { res.status(503).json({error:'ยังตรวจสอบสิทธิ์ทดลองไม่ได้'}); }
});
betaRouter.post('/interest',async(req: AuthenticatedRequest,res) => {
  try { res.json(await recordTrialInterest(req.userId!)); } catch { res.status(503).json({error:'ยังบันทึกความสนใจไม่ได้ กรุณาลองอีกครั้ง'}); }
});
