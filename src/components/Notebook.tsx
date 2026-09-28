import { useCallback, useEffect, useRef, useState } from 'react';
import { authHeaders } from '../utils/authHeaders';
import './Notebook.css';
const kinds = {free:'เขียนอิสระ',feelings:'ทบทวนความรู้สึก',gratitude:'สิ่งที่อยากขอบคุณ'};
type Kind = keyof typeof kinds;
interface Entry {id:string;kind:Kind;text:string;createdAt:string}
const prompts:Record<Kind,string> = {free:'วันนี้อยากเก็บเรื่องอะไรไว้ให้ตัวเอง?',feelings:'เกิดอะไรขึ้น ฉันรู้สึกอย่างไร และตอนนี้ต้องการอะไร?',gratitude:'วันนี้มีสิ่งเล็ก ๆ อะไรที่อยากขอบคุณ?'};
export function Notebook({ownerId,onClose}:{ownerId:string;onClose:()=>void}) {
  const [entries,setEntries]=useState<Entry[]>([]);
  const [kind,setKind]=useState<Kind>('free');
  const [text,setText]=useState('');
  const [loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [deleting,setDeleting]=useState<string|null>(null);
  const pending=useRef<{id:string;kind:Kind;text:string}|null>(null);
  const request=useCallback(async (path='',method='GET',body?:unknown) => {
    const response=await fetch('/api/notebook'+path,{method,credentials:'include',headers:{...authHeaders(),'X-DeungSati-Owner':ownerId},...(body?{body:JSON.stringify(body)}:{})});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'ยังเชื่อมต่อสมุดไม่ได้');
    return data;
  },[ownerId]);
  useEffect(()=>{
    let active=true;
    void request().then(data=>{if(active){setEntries(data.entries);setLoaded(true);}}).catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[request]);
  useEffect(()=>{
    function warn(event:BeforeUnloadEvent){if(text.trim()){event.preventDefault();event.returnValue='';}}
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[text]);
  async function reload(){setBusy(true);try{const data=await request();setEntries(data.entries);setLoaded(true);setError('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function save(){
    if(busy||!text.trim())return;
    setBusy(true);setError('');setNotice('');
    if(!pending.current||pending.current.text!==text.trim()||pending.current.kind!==kind)pending.current={id:crypto.randomUUID(),text:text.trim(),kind};
    try{const {entry}=await request('/'+pending.current.id,'PUT',pending.current);setEntries(previous=>[entry,...previous.filter(e=>e.id!==entry.id)]);setText('');pending.current=null;setNotice('บันทึกไว้ในบัญชีของเธอแล้ว');}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function remove(id:string){setBusy(true);setError('');try{await request('/'+id,'DELETE');setEntries(previous=>previous.filter(e=>e.id!==id));setDeleting(null);setNotice('ลบบันทึกแล้ว');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <main className="notebook-page">
    <button className="journal-back" onClick={()=>{if(!busy&&(!text.trim()||window.confirm('ข้อความยังไม่ได้บันทึก ต้องการออกจากสมุดไหม?')))onClose();}} disabled={busy}>← กลับหน้าหลัก</button>
    <header><span className="journal-eyebrow">MY QUIET PAGES · สมุดของฉัน</span><h1>ไม่ต้องเขียนให้ดี<br/>แค่เขียนให้เป็นเธอ</h1><p>พื้นที่เก็บเรื่องราว ความรู้สึก และสิ่งเล็ก ๆ ที่อยากจำ</p></header>
    <p className="journal-note">บันทึกผูกกับบัญชีของเธอ เปิดอ่านได้ทุกอุปกรณ์ และยังเขียนได้เมื่อสิทธิ์แชทหมดอายุ · สมุดนี้ยังไม่มีการสรุปหรือแนะนำแบบฝึกหัดด้วย AI</p>
    <section className="journal-paper" aria-label="เขียนบันทึก">
      <div className="journal-tabs">{(Object.keys(kinds) as Kind[]).map(key=><button key={key} aria-pressed={kind===key} disabled={busy} onClick={()=>setKind(key)}>{kinds[key]}</button>)}</div>
      <form onSubmit={event=>{event.preventDefault();void save();}}><label htmlFor="journal-text">{prompts[kind]}</label><textarea id="journal-text" value={text} onChange={event=>setText(event.target.value)} maxLength={10000} disabled={busy||!loaded} placeholder="ค่อย ๆ เขียนตรงนี้ได้เลย…"/><div className="journal-actions"><small>{text.length.toLocaleString()} / 10,000</small><button className="journal-primary" disabled={busy||!loaded||!text.trim()}>{busy?'กำลังดำเนินการ…':'เก็บบันทึกนี้'}</button></div></form>
    </section>
    {error&&<p className="journal-error" role="alert">{error} <button onClick={()=>void reload()} disabled={busy}>โหลดข้อมูลอีกครั้ง</button></p>}
    {notice&&<p role="status">✓ {notice}</p>}
    <section className="journal-history"><div className="journal-actions"><h2>เรื่องราวที่ผ่านมา</h2><button onClick={()=>void reload()} disabled={busy}>อัปเดตสมุด</button></div>{!loaded&&!error&&<p role="status">กำลังเปิดสมุด…</p>}{loaded&&!entries.length&&<p>หน้ากระดาษแรกกำลังรอเรื่องราวของเธออยู่ ♡</p>}
      {entries.map(entry=><article className="journal-entry" key={entry.id}><small>{kinds[entry.kind]} · {new Date(entry.createdAt).toLocaleString('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'medium',timeStyle:'short'})} น.</small><p>{entry.text}</p>{deleting===entry.id?<div><span>ลบบันทึกนี้ถาวรไหม? </span><button disabled={busy} onClick={()=>void remove(entry.id)}>ยืนยันลบ</button> <button disabled={busy} onClick={()=>setDeleting(null)}>เก็บไว้</button></div>:<button disabled={busy} onClick={()=>setDeleting(entry.id)}>ลบบันทึก</button>}</article>)}
    </section>
  </main>;
}
