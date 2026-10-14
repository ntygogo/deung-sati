import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { validateJourney } from '../../src/shared/mindJourney.js';
export const mindJourneyRouter=Router();
let ready:Promise<void>|undefined;
const columns='id, data_json, revision, created_at AS "createdAt", updated_at AS "updatedAt"';
const decode=(row:any)=>({...(typeof row.data_json==='string'?JSON.parse(row.data_json):row.data_json),id:row.id,revision:row.revision,createdAt:row.createdAt,updatedAt:row.updatedAt});
mindJourneyRouter.use((_q,r,n)=>{r.setHeader('Cache-Control','private, no-store');n();});
mindJourneyRouter.use(requireAuth);
mindJourneyRouter.use(async(req:AuthenticatedRequest,res,next)=>{
 if(req.get('X-DeungSati-Owner')!==req.userId){res.status(409).json({error:'บัญชีเปลี่ยนแล้ว กรุณาเปิดหน้านี้ใหม่'});return;}
 try{ready??=db.execute(`CREATE TABLE IF NOT EXISTS mind_journey_entries (id VARCHAR(80) NOT NULL, user_id VARCHAR(80) NOT NULL REFERENCES users(id) ON DELETE CASCADE, data_json TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(user_id,id))`).then(()=>undefined).catch(e=>{ready=undefined;throw e;});await ready;next();}catch{res.status(503).json({error:'ยังเชื่อมต่อบันทึกไม่ได้ ลองอีกครั้งได้'});}
});
mindJourneyRouter.get('/',async(req:AuthenticatedRequest,res)=>{try{res.json({entries:(await db.query(`SELECT ${columns} FROM mind_journey_entries WHERE user_id=$1 ORDER BY created_at DESC,id DESC`,[req.userId])).map(decode)});}catch{res.status(500).json({error:'โหลดบันทึกไม่สำเร็จ'});}});
mindJourneyRouter.put('/:id',async(req:AuthenticatedRequest,res)=>{
 let data;try{data=validateJourney(req.body?.data);if(!/^[a-f0-9-]{36}$/.test(String(req.params.id))||!Number.isInteger(req.body?.revision)||req.body.revision<0)throw Error('ข้อมูลเวอร์ชันไม่ถูกต้อง');}catch(e){res.status(400).json({error:(e as Error).message});return;}
 try{
 const now=new Date().toISOString(),json=JSON.stringify(data),revision=req.body.revision;
 if(revision===0)await db.execute('INSERT INTO mind_journey_entries (id,user_id,data_json,revision,created_at,updated_at) VALUES ($1,$2,$3,1,$4,$5) ON CONFLICT(user_id,id) DO NOTHING',[req.params.id,req.userId,json,now,now]);
 else await db.execute('UPDATE mind_journey_entries SET data_json=$1,revision=revision+1,updated_at=$2 WHERE id=$3 AND user_id=$4 AND revision=$5',[json,now,req.params.id,req.userId,revision]);
 const row=await db.queryOne<any>(`SELECT ${columns} FROM mind_journey_entries WHERE id=$1 AND user_id=$2`,[req.params.id,req.userId]);
 if(!row||JSON.stringify(typeof row.data_json==='string'?JSON.parse(row.data_json):row.data_json)!==json){res.status(409).json({error:'มีการแก้ไขจากอีกหน้าหรือเครื่องหนึ่ง กรุณาโหลดข้อมูลล่าสุดก่อนแก้ไขอีกครั้ง'});return;}
 res.json({entry:decode(row)});
 }catch{res.status(500).json({error:'ยังบันทึกไม่สำเร็จ ข้อความยังอยู่ ลองอีกครั้งได้'});}
});
mindJourneyRouter.delete('/:id',async(req:AuthenticatedRequest,res)=>{try{const revision=Number(req.query.revision);if(!Number.isInteger(revision)||revision<1){res.status(400).json({error:'เวอร์ชันไม่ถูกต้อง'});return;}const result=await db.execute('DELETE FROM mind_journey_entries WHERE id=$1 AND user_id=$2 AND revision=$3',[req.params.id,req.userId,revision]);if(!result.affectedRows){res.status(409).json({error:'ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่'});return;}res.json({ok:true});}catch{res.status(500).json({error:'ยังลบไม่ได้'});}});
