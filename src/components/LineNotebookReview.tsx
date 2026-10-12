import { useCallback, useEffect, useState } from 'react';
import { authHeaders } from '../utils/authHeaders';
import { lineLoopFields, lineLoopLabels, type LineLoopFields } from '../shared/lineNotebook';
import { Notebook } from './Notebook';
import './LineNotebookReview.css';

export function LineNotebookReview({ownerId,email}:{ownerId:string;email:string}) {
  const [token]=useState(()=>window.location.hash.slice(1));
  const [fields,setFields]=useState<LineLoopFields>({});
  const [stage,setStage]=useState<'loading'|'link'|'review'|'saved'>('loading');
  const [command,setCommand]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [accepted,setAccepted]=useState(false);
  const [copied,setCopied]=useState(false);
  const [book,setBook]=useState(false);
  const request=useCallback(async(action:string,extra:Record<string,unknown>={})=>{
    const response=await fetch('/api/line/notebook/'+action,{method:'POST',credentials:'include',headers:{...authHeaders(),'X-DeungSati-Owner':ownerId},body:JSON.stringify({token,...extra})});
    if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('ยังเปิดสรุปไม่ได้ กรุณาลองอีกครั้ง');
    const data=await response.json();if(!response.ok)throw new Error(data.error||'ยังเปิดสรุปไม่ได้');return data;
  },[ownerId,token]);
  const load=useCallback(async()=>{
    const data=await request('review');
    setStage(data.saved?'saved':data.linked?'review':'link');
    if(data.fields)setFields(data.fields);
    if(!data.linked&&command)setError('ยังไม่พบการยืนยัน ให้ส่งข้อความรหัสใน LINE ก่อน แล้วกลับมากดอีกครั้งนะ');
  },[request,command]);
  useEffect(()=>{let active=true;void request('review').then(data=>{if(active){setStage(data.saved?'saved':data.linked?'review':'link');if(data.fields)setFields(data.fields);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[request]);
  async function run(action:()=>Promise<void>){setBusy(true);setError('');try{await action();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <main className="line-review">
    <header><span className="line-review-kicker">จากบทสนทนา สู่สมุดของเธอ</span><h1>{stage==='saved'?'เก็บเรื่องนี้ไว้แล้ว ♡':'ค่อย ๆ ทบทวนสิ่งที่ได้คุย'}</h1><p>บัญชีที่จะบันทึก: <strong>{email}</strong></p></header>
    {error&&<p className="line-review-error" role="alert">{error} <button disabled={busy} onClick={()=>void run(load)}>ลองอีกครั้ง</button></p>}
    {stage==='loading'&&!error&&<p role="status">กำลังเปิดสรุป…</p>}
    {stage==='link'&&<section className="line-review-paper">
      <h2>เชื่อมบัญชีครั้งแรก</h2><p>เพื่อให้สรุปเข้าสมุดของเธอ ให้ยืนยันจาก LINE ก่อน เราจะไม่ส่งประวัติทั้งหมดเข้าสมุด และยังไม่มีการเพิ่มการเติบโตของไข่</p>
      {!command?<><label className="line-review-consent"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>ฉันต้องการเชื่อม LINE กับบัญชี {email}</label><button className="line-review-primary" disabled={busy||!accepted} onClick={()=>void run(async()=>{const data=await request('link');if(data.linked)await load();else setCommand(data.command);})}>ขอรหัสยืนยัน</button></>:<>
        <p>คัดลอกข้อความนี้ ส่งในแชทดึงสติ แล้วกลับมาหน้านี้ รหัสใช้ได้ 10 นาที</p><code className="line-review-code">{command}</code>
        <div className="line-review-actions"><button onClick={()=>void run(async()=>{await navigator.clipboard.writeText(command);setCopied(true);})}>{copied?'คัดลอกแล้ว':'คัดลอกข้อความ'}</button><a href="https://lin.ee/TKjFZTm" target="_blank" rel="noreferrer">เปิด LINE</a></div>
        <button className="line-review-primary" disabled={busy} onClick={()=>void run(async()=>{await load();})}>ยืนยันใน LINE แล้ว</button>
        <button disabled={busy} onClick={()=>{setCommand('');setCopied(false);}}>ขอรหัสใหม่</button>
      </>}
      <p className="line-review-note">หากเข้าผิดบัญชี ให้กลับหน้าเว็บเพื่อออกจากระบบ แล้วเปิดลิงก์นี้ใหม่ ยกเลิกการเชื่อมภายหลังได้ด้วยข้อความ “ยกเลิกเชื่อมบัญชี” ใน LINE</p>
    </section>}
    {stage==='review'&&<form className="line-review-paper" onSubmit={e=>{e.preventDefault();void run(async()=>{await request('save',{fields});setStage('saved');setFields({});});}}>
      <p>ตรงไหนไม่ตรง แก้เป็นคำของเธอได้เลย ช่องไหนยังไม่รู้เว้นไว้ได้</p>
      {lineLoopFields.map((key,i)=><label className="line-review-field" key={key}>{i+1}. {lineLoopLabels[i]}<textarea rows={2} maxLength={600} disabled={busy} value={fields[key]||''} onChange={e=>setFields(previous=>({...previous,[key]:e.target.value}))} placeholder="ยังไม่ได้สำรวจ / เว้นไว้ก่อนได้"/></label>)}
      <p className="line-review-note">เมื่อยืนยัน สรุปที่ตรวจแล้วจะอยู่ในสมุดของบัญชีนี้และเปิดอ่านได้ทุกอุปกรณ์ การบันทึกนี้ยังไม่เพิ่มคะแนนหรือการเติบโตของไข่</p>
      <button className="line-review-primary" disabled={busy||!Object.values(fields).some(value=>value?.trim())}>{busy?'กำลังบันทึก…':'ยืนยันบันทึกลงสมุด'}</button>
    </form>}
    {stage==='saved'&&<section className="line-review-paper"><h2>ย้อนอ่านได้ในสมุดของฉัน</h2><p>บันทึกเรียบร้อยแล้ว กดซ้ำจะไม่สร้างหน้าซ้ำ ระบบไข่ยังไม่เปิด จึงยังไม่มีการเพิ่มการเติบโตนะ</p><button className="line-review-primary" onClick={()=>setBook(true)}>เปิดสมุดของฉัน</button><p><a href="https://lin.ee/TKjFZTm" rel="noreferrer">กลับไปคุยใน LINE</a></p></section>}
    <footer><a href="/">กลับหน้าเว็บดึงสติ</a></footer>
    {book&&<Notebook ownerId={ownerId} initialHistory onClose={()=>setBook(false)}/>}
  </main>;
}
