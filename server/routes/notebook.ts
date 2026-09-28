import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';

export const notebookRouter = Router();
let ready: Promise<unknown> | undefined;
notebookRouter.use((_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
notebookRouter.use(requireAuth);
notebookRouter.use(async (req: AuthenticatedRequest, res, next) => {
  if (req.get('X-DeungSati-Owner') !== req.userId) { res.status(409).json({error:'บัญชีเปลี่ยนแล้ว กรุณาเปิดสมุดใหม่'}); return; }
  try {
    ready ??= db.execute(`CREATE TABLE IF NOT EXISTS notebook_entries (
      id VARCHAR(80) PRIMARY KEY, user_id VARCHAR(80) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind VARCHAR(20) NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL
    )`).catch(e => { ready = undefined; throw e; });
    await ready; next();
  } catch { res.status(503).json({error:'ยังเชื่อมต่อสมุดไม่ได้ กรุณาลองอีกครั้ง'}); }
});
notebookRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try { res.json({entries:await db.query('SELECT id, kind, text, created_at AS "createdAt" FROM notebook_entries WHERE user_id = $1 ORDER BY created_at DESC, id DESC', [req.userId])}); }
  catch { res.status(500).json({error:'โหลดสมุดไม่สำเร็จ'}); }
});
notebookRouter.put('/:id', async (req: AuthenticatedRequest, res) => {
  const {kind, text} = req.body ?? {};
  if (!/^[a-f0-9-]{36}$/.test(String(req.params.id)) || !['free','feelings','gratitude'].includes(kind) || typeof text !== 'string' || !text.trim() || text.length > 10000) {
    res.status(400).json({error:'กรุณาเขียนบันทึกไม่เกิน 10,000 ตัวอักษร'}); return;
  }
  try {
    await db.execute('INSERT INTO notebook_entries (id,user_id,kind,text,created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING', [req.params.id,req.userId,kind,text.trim(),new Date().toISOString()]);
    const entry = await db.queryOne<{kind:string;text:string}>('SELECT id, kind, text, created_at AS "createdAt" FROM notebook_entries WHERE id = $1 AND user_id = $2',[req.params.id,req.userId]);
    if (!entry || entry.kind !== kind || entry.text !== text.trim()) { res.status(409).json({error:'รายการนี้มีข้อมูลอยู่แล้ว กรุณาเปิดสมุดใหม่'}); return; }
    res.json({entry});
  } catch { res.status(500).json({error:'ยังบันทึกไม่สำเร็จ ข้อความยังอยู่ ลองบันทึกอีกครั้งได้'}); }
});
notebookRouter.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try { await db.execute('DELETE FROM notebook_entries WHERE id = $1 AND user_id = $2',[req.params.id,req.userId]); res.json({ok:true}); }
  catch { res.status(500).json({error:'ลบบันทึกไม่สำเร็จ'}); }
});
