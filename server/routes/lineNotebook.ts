import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { LineNotebookError, lineNotebookOrigin, reviewLineNotebook, requestLineNotebookLink, saveLineNotebook } from '../services/lineNotebook.js';
export const lineNotebookRouter=Router();
lineNotebookRouter.use((_req,res,next)=>{res.setHeader('Cache-Control','private, no-store');res.setHeader('Referrer-Policy','no-referrer');next();});
lineNotebookRouter.use(requireAuth);
lineNotebookRouter.use((req:AuthenticatedRequest,res,next)=>{
  if(!lineNotebookOrigin()){res.status(404).json({error:'ฟีเจอร์นี้ยังไม่เปิด'});return;}
  if(req.get('X-DeungSati-Owner')!==req.userId){res.status(409).json({error:'บัญชีเปลี่ยนแล้ว กรุณาเปิดลิงก์ใหม่'});return;}
  next();
});
for(const action of ['review','link','save'] as const)lineNotebookRouter.post('/'+action,async(req:AuthenticatedRequest,res)=>{
  try{
    const token=req.body?.token;
    const result=action==='review'?await reviewLineNotebook(req.userId!,token)
      :action==='link'?await requestLineNotebookLink(req.userId!,token)
      :await saveLineNotebook(req.userId!,token,req.body?.fields);
    res.json(result);
  }catch(error){res.status(error instanceof LineNotebookError?error.status:503).json({error:error instanceof LineNotebookError?error.message:'ยังเชื่อมต่อสมุดไม่ได้ ลองใหม่อีกครั้งนะ'});}
});
