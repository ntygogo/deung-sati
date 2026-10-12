import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { db } from '../db/database.js';
import type { IDatabaseAdapter } from '../db/types.js';
import { ensureLineSchema } from './lineSchema.js';
import { ensureNotebookSchema } from './notebookSchema.js';
import { prepareLoopChat } from '../../src/shared/chat-protocol/loopChatGuide.js';
import { lineLoopFields, lineNotebookText, type LineLoopFields } from '../../src/shared/lineNotebook.js';

const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const iso=(n:number)=>new Date(n).toISOString();
const parseFields=(value:unknown):LineLoopFields=>typeof value==='string'?JSON.parse(value):value as LineLoopFields;
interface Transfer {id:string;line_id:string;fields_json:string|LineLoopFields;expires_at:string;saved_entry_id:string|null;saved_user_id:string|null}
export class LineNotebookError extends Error { constructor(public status:number,message:string){super(message);} }
function unavailable():never {throw new LineNotebookError(410,'ลิงก์หมดอายุหรือใช้ไม่ได้แล้ว กลับไป LINE แล้วกด “บันทึกลงสมุด” อีกครั้งนะ');}
export function lineNotebookOrigin() {
  const value=process.env.LINE_NOTEBOOK_ORIGIN;
  if(!value)return null;
  try{const url=new URL(value);return url.protocol==='https:'&&url.origin===value?value:null;}catch{return null;}
}
export async function createLineNotebookTransfer(tx:IDatabaseAdapter,lineId:string,loop:unknown,now:number) {
  const origin=lineNotebookOrigin();
  if(!origin)throw new LineNotebookError(503,'การส่งเข้าสมุดยังไม่เปิดในช่องทางนี้จ้ะ');
  const fields=prepareLoopChat([],loop).state.fields;
  if(!lineLoopFields.some(key=>fields[key]))throw new LineNotebookError(400,'ยังไม่มีข้อมูลพอสรุปลูป เล่าเรื่องที่อยากเก็บไว้ก่อนนะ');
  const sourceHash=hash(JSON.stringify(fields));
  const token=randomBytes(32).toString('hex');
  const tokenHash=hash(token);
  // Locking the LINE user in prepareLineReply serializes issuance and history deletion.
  await tx.execute(`INSERT INTO line_notebook_transfers (id,line_id,source_hash,token_hash,fields_json,expires_at)
    VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (line_id,source_hash) DO UPDATE SET
    token_hash=excluded.token_hash, fields_json=CASE WHEN line_notebook_transfers.saved_entry_id IS NULL THEN excluded.fields_json ELSE '{}' END,
    expires_at=excluded.expires_at`,[randomUUID(),lineId,sourceHash,tokenHash,JSON.stringify(fields),iso(now+30*60000)]);
  await tx.execute("UPDATE line_notebook_transfers SET fields_json='{}' WHERE line_id=$1 AND expires_at<$2",[lineId,iso(now)]);
  return `${origin}/line-notebook#${token}`;
}
async function getTransfer(tx:IDatabaseAdapter,token:unknown,now:number) {
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))unavailable();
  const row=await tx.queryOne<Transfer>('SELECT * FROM line_notebook_transfers WHERE token_hash=$1',[hash(token)]);
  if(!row||Date.parse(row.expires_at)<=now)unavailable();
  return row;
}
async function linked(tx:IDatabaseAdapter,lineId:string,userId:string) {
  const link=await tx.queryOne<{web_user_id:string}>('SELECT web_user_id FROM line_web_links WHERE line_id=$1',[lineId]);
  if(link&&link.web_user_id!==userId)throw new LineNotebookError(403,'LINE นี้เชื่อมกับบัญชีเว็บอื่นอยู่ กรุณาเข้าสู่บัญชีที่เชื่อมไว้');
  return !!link;
}
export async function reviewLineNotebook(userId:string,token:unknown,now=Date.now()) {
  await ensureLineSchema();
  const row=await getTransfer(db,token,now);
  if(!await linked(db,row.line_id,userId))return {linked:false};
  if(row.saved_entry_id){
    if(row.saved_user_id!==userId)throw new LineNotebookError(403,'บันทึกนี้เป็นของบัญชีอื่น');
    return {linked:true,saved:true};
  }
  return {linked:true,saved:false,fields:parseFields(row.fields_json)};
}
export async function requestLineNotebookLink(userId:string,token:unknown,now=Date.now()) {
  await ensureLineSchema();
  const row=await getTransfer(db,token,now);
  if(await linked(db,row.line_id,userId))return {linked:true};
  const other=await db.queryOne('SELECT line_id FROM line_web_links WHERE web_user_id=$1',[userId]);
  if(other)throw new LineNotebookError(409,'บัญชีเว็บนี้เชื่อมกับ LINE อื่นอยู่แล้ว');
  const code=randomBytes(12).toString('hex');
  await db.transaction(async tx=>{
    await tx.execute('DELETE FROM line_link_requests WHERE transfer_id=$1 AND web_user_id=$2',[row.id,userId]);
    await tx.execute('INSERT INTO line_link_requests (challenge_hash,transfer_id,web_user_id,expires_at) VALUES ($1,$2,$3,$4)',[hash(code),row.id,userId,iso(now+10*60000)]);
  });
  return {linked:false,command:`เชื่อมบัญชี ${code}`};
}
export async function confirmLineNotebookLink(tx:IDatabaseAdapter,lineId:string,input:string,now:number) {
  const code=input.match(/^เชื่อมบัญชี\s+([a-f0-9]{24})$/)?.[1];
  if(!code)return 'รหัสเชื่อมบัญชีไม่ถูกต้อง ให้คัดลอกทั้งข้อความจากหน้าเว็บนะ';
  const request=await tx.queryOne<{web_user_id:string;expires_at:string;transfer_id:string}>('SELECT * FROM line_link_requests WHERE challenge_hash=$1',[hash(code)]);
  if(!request||Date.parse(request.expires_at)<=now)return 'รหัสเชื่อมบัญชีหมดอายุแล้ว กลับไปขอรหัสใหม่ที่หน้าเว็บนะ';
  const transfer=await tx.queryOne<Transfer>('SELECT * FROM line_notebook_transfers WHERE id=$1',[request.transfer_id]);
  if(!transfer||transfer.line_id!==lineId||Date.parse(transfer.expires_at)<=now)return 'รหัสนี้ใช้กับบทสนทนานี้ไม่ได้ กลับไปเปิดลิงก์จาก LINE ของเธอเองนะ';
  const existing=await tx.queryOne<{web_user_id:string}>('SELECT web_user_id FROM line_web_links WHERE line_id=$1',[lineId]);
  if(existing&&existing.web_user_id!==request.web_user_id)return 'LINE นี้เชื่อมกับบัญชีอื่นอยู่แล้ว ถ้าต้องการเปลี่ยน พิมพ์ “ยกเลิกเชื่อมบัญชี” ก่อนนะ';
  await tx.execute('INSERT INTO line_web_links (line_id,web_user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',[lineId,request.web_user_id]);
  const result=await tx.queryOne<{web_user_id:string}>('SELECT web_user_id FROM line_web_links WHERE line_id=$1',[lineId]);
  if(result?.web_user_id!==request.web_user_id)return 'บัญชีเว็บนี้เชื่อมกับ LINE อื่นแล้ว กรุณาเลือกบัญชีเว็บของเธอเองนะ';
  await tx.execute('DELETE FROM line_link_requests WHERE transfer_id IN (SELECT id FROM line_notebook_transfers WHERE line_id=$1)',[lineId]);
  return 'เชื่อมบัญชีแล้วจ้ะ กลับหน้าเว็บแล้วกด “ยืนยันใน LINE แล้ว” เพื่อตรวจสรุปก่อนบันทึก ครั้งต่อไปไม่ต้องเชื่อมซ้ำนะ';
}
export async function revokeLineNotebookTransfers(tx:IDatabaseAdapter,lineId:string) {
  await tx.execute("UPDATE line_notebook_transfers SET fields_json='{}',expires_at=$1 WHERE line_id=$2",[iso(0),lineId]);
  await tx.execute('DELETE FROM line_link_requests WHERE transfer_id IN (SELECT id FROM line_notebook_transfers WHERE line_id=$1)',[lineId]);
}
export async function saveLineNotebook(userId:string,token:unknown,input:unknown,now=Date.now()) {
  await ensureLineSchema();await ensureNotebookSchema();
  if(!input||typeof input!=='object'||Array.isArray(input))throw new LineNotebookError(400,'กรุณาตรวจสรุปก่อนบันทึก');
  const fields:LineLoopFields={};
  for(const key of lineLoopFields){
    const value=(input as Record<string,unknown>)[key];
    if(value!==undefined&&(typeof value!=='string'||value.length>600))throw new LineNotebookError(400,'แต่ละช่องเขียนได้ไม่เกิน 600 ตัวอักษร');
    if(typeof value==='string'&&value.trim())fields[key]=value.trim();
  }
  if(!Object.keys(fields).length)throw new LineNotebookError(400,'กรุณาเก็บไว้อย่างน้อยหนึ่งช่อง');
  return db.transaction(async tx=>{
    const initial=await getTransfer(tx,token,now);
    await tx.queryOne('SELECT id FROM line_chat_users WHERE id=$1 FOR UPDATE',[initial.line_id]);
    const row=await getTransfer(tx,token,now);
    if(!await linked(tx,row.line_id,userId))throw new LineNotebookError(403,'กรุณายืนยันเชื่อมบัญชีใน LINE ก่อน');
    if(row.saved_entry_id){
      if(row.saved_user_id!==userId)throw new LineNotebookError(403,'บันทึกนี้เป็นของบัญชีอื่น');
      return {saved:true,duplicate:true};
    }
    const id=randomUUID();
    await tx.execute('INSERT INTO notebook_entries (id,user_id,kind,text,created_at) VALUES ($1,$2,$3,$4,$5)',[id,userId,'feelings',lineNotebookText(fields),iso(now)]);
    await tx.execute('INSERT INTO line_notebook_sources (entry_id,fields_json,confirmed_at) VALUES ($1,$2,$3)',[id,JSON.stringify(fields),iso(now)]);
    await tx.execute("UPDATE line_notebook_transfers SET saved_entry_id=$1,saved_user_id=$2,fields_json='{}' WHERE id=$3",[id,userId,row.id]);
    // Notebook only. No completed_loops, rewards, wallet, companion or DNA writes.
    return {saved:true,duplicate:false};
  });
}
