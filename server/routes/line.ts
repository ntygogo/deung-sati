import { createHmac, timingSafeEqual } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { LINE_FRIEND_URL, lineEnabled, lineUserAllowed } from '../services/lineConfig.js';
import { prepareLineReply, markLineReplySent, forgetUnsentLineContext, type LineReply } from '../services/lineChat.js';
import { allowLinePilot, isLinePilotCode } from '../services/linePilot.js';
import { lineChoiceLabel } from '../services/lineConversation.js';
import { lineNotebookRouter } from './lineNotebook.js';

export function validLineSignature(body: Buffer, signature: unknown, secret: string) {
  if (!secret || typeof signature !== 'string') return false;
  const expected = Buffer.from(createHmac('sha256',secret).update(body).digest('base64'));
  const actual = Buffer.from(signature);
  return actual.length === expected.length && timingSafeEqual(actual,expected);
}
export function lineMessages(reply: LineReply) {
  // LINE accepts at most five text objects; split by UTF-16 without cutting a surrogate pair.
  const chunks: string[] = []; let current = '';
  for (const char of reply.text) {
    if (current.length + char.length > 4500) { chunks.push(current); current = ''; }
    current += char;
  }
  if (current) chunks.push(current);
  return chunks.slice(0,5).map((text,i) => ({type:'text',text,
    ...(i === Math.min(chunks.length,5)-1 && (reply.choices?.length || reply.link) ? {quickReply:{items:[
      ...(reply.link?[{type:'action',action:{type:'uri',label:reply.link.label,uri:reply.link.url}}]:[]),
      ...[...(reply.choices||[]).filter(x => x !== 'สิทธิ์ของฉัน'), ...(reply.choices||[]).includes('สิทธิ์ของฉัน') ? ['สิทธิ์ของฉัน'] : []].slice(-12).map(label => ({
      type:'action',action:{type:'message',label:Array.from(lineChoiceLabel(label)).slice(0,20).join(''),text:label},
    }))]}} : {}),
  }));
}
export async function sendLineReply(token: string, reply: LineReply) {
  const response = await fetch('https://api.line.me/v2/bot/message/reply',{
    method:'POST',headers:{Authorization:`Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,'Content-Type':'application/json'},
    body:JSON.stringify({replyToken:token,messages:lineMessages(reply)}),signal:AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`LINE delivery failed (${response.status})`);
}
interface Event {
  type?: string; webhookEventId?: string; timestamp?: number; replyToken?: string;
  source?: {type?: string; userId?: string}; message?: {type?: string; text?: string};
}
export function createLineWebhook(prepare = prepareLineReply, send = sendLineReply, markSent = markLineReplySent) {
  return async (req: Request,res: Response) => {
    res.setHeader('Cache-Control','no-store');
    if (!lineEnabled()) { res.status(503).json({error:'LINE is not configured'}); return; }
    if (!Buffer.isBuffer(req.body) || !validLineSignature(req.body,req.headers['x-line-signature'],process.env.LINE_CHANNEL_SECRET!)) {
      res.status(401).json({error:'Invalid signature'}); return;
    }
    let payload: {destination?: string; events?: Event[]};
    try { payload = JSON.parse(req.body.toString('utf8')); } catch { res.status(400).json({error:'Invalid body'}); return; }
    if (!payload || !Array.isArray(payload.events) || payload.events.length > 100
      || (process.env.LINE_BOT_USER_ID && payload.destination !== process.env.LINE_BOT_USER_ID)) {
      res.status(400).json({error:'Invalid events or destination'}); return;
    }
    try {
      // Await all work before returning: serverless runtimes may freeze after the response.
      // Concurrent events for the same user are serialized by DB leases; busy events request redelivery.
      const results = await Promise.allSettled(payload.events.map(async event => {
        if (!event || event.source?.type !== 'user' || !event.source.userId) return;
        if (!event.webhookEventId || event.webhookEventId.length > 100) return;
        if (typeof event.timestamp !== 'number' || event.timestamp < Date.now()-24*3600_000 || event.timestamp > Date.now()+300_000) return;
        const invitation = event.type === 'message' && event.message?.type === 'text' ? event.message.text || '' : '';
        if (!lineUserAllowed(event.source.userId) && !await allowLinePilot(event.source.userId,invitation)) return;
        if (event.type === 'unsend') { await forgetUnsentLineContext(event.source.userId,event.webhookEventId); return; }
        if (!event.replyToken) return;
        if (event.type !== 'message' && event.type !== 'follow') return;
        const input = event.type === 'follow' || isLinePilotCode(invitation) ? 'เมนู' : event.message?.type === 'text' && typeof event.message.text === 'string'
          ? event.message.text : 'วิธีส่งข้อความ';
        const reply = await prepare(event.source.userId,event.webhookEventId,input);
        if (reply) { await send(event.replyToken,reply); await markSent(event.webhookEventId); }
      }));
      if (results.some(r => r.status === 'rejected')) throw new Error('Retry incomplete events');
      res.json({received:true});
    } catch {
      // Never log tokens, message contents, LINE user IDs or provider payloads.
      console.error('[LINE] Webhook incomplete; redelivery required');
      res.status(503).json({error:'Retry delivery'});
    }
  };
}
export const lineWebhook = createLineWebhook();
export const lineRouter = Router();
lineRouter.use('/notebook',lineNotebookRouter);
lineRouter.get('/payment-return',(_req,res) => {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");
  res.type('html').send(`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>กลับไปคุยกับดึงสติ</title><style>body{font-family:system-ui;background:#f4f7f2;color:#253b32;margin:0;padding:8vh 24px}main{max-width:420px;margin:auto;background:white;padding:32px;border-radius:24px;line-height:1.8}a{display:block;padding:12px;text-align:center;background:#25694a;color:white;border-radius:12px;text-decoration:none}</style>
    <main><h1>กลับไปคุยกับดึงสติ 🌿</h1><p>หากชำระเงินแล้ว ระบบจะเปิดสิทธิ์เมื่อได้รับการยืนยันยอด กด “สิทธิ์ของฉัน” ใน LINE เพื่อตรวจสอบได้เลย</p>
    <p>หากยังไม่ได้จ่าย กลับไปคุยหรือสมัครใหม่ได้ ไม่มีการต่ออายุอัตโนมัติ</p><a href="${LINE_FRIEND_URL}">กลับไป LINE ดึงสติ</a></main></html>`);
});
