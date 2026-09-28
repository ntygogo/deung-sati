import { useCallback, useEffect, useRef, useState } from 'react';
import { authHeaders } from '../utils/authHeaders';
import './Notebook.css';
const kinds = {free:'เขียนอิสระ',feelings:'ทบทวนความรู้สึก',gratitude:'สิ่งที่อยากขอบคุณ'};
type Kind = keyof typeof kinds;
interface Entry {id:string;kind:Kind;text:string;createdAt:string}
const prompts:Record<Kind,string> = {free:'วันนี้อยากเก็บเรื่องอะไรไว้ให้ตัวเอง?',feelings:'เกิดอะไรขึ้น ฉันรู้สึกอย่างไร และตอนนี้ต้องการอะไร?',gratitude:'วันนี้มีสิ่งเล็ก ๆ อะไรที่อยากขอบคุณ?'};
export function Notebook({ownerId,onClose}:{ownerId:string;onClose:()=>void}) {
  const [entries,setEntries]=useState<Entry[]>([]);
  const [kind,setKind]=useState<Kind>('gratitude');
  const [title,setTitle]=useState('');
  const [history,setHistory]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{dialog.current?.showModal();},[]);
  const [text,setText]=useState('');
  const [loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [deleting,setDeleting]=useState<string|null>(null);
  const pending=useRef<{id:string;kind:Kind;text:string}|null>(null);
  const request=useCallback(async (path='',method='GET',body?:unknown) => {
    const response=await fetch('/api/notebook'+path,{method,credentials:'include',headers:{...authHeaders(),'X-DeungSati-Owner':ownerId},...(body?{body:JSON.stringify(body)}:{})});
    if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('ยังเชื่อมต่อสมุดไม่ได้ กรุณาลองอีกครั้ง');
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
    function warn(event:BeforeUnloadEvent){if(text.trim()||title.trim()){event.preventDefault();event.returnValue='';}}
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[text,title]);
  async function reload(){setBusy(true);try{const data=await request();setEntries(data.entries);setLoaded(true);setError('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function save(){
    if(busy||!text.trim())return;
    setBusy(true);setError('');setNotice('');
    const content=(title.trim()?title.trim()+'\n\n':'')+text.trim();
    if(!pending.current||pending.current.text!==content||pending.current.kind!==kind)pending.current={id:crypto.randomUUID(),text:content,kind};
    try{const {entry}=await request('/'+pending.current.id,'PUT',pending.current);setEntries(previous=>[entry,...previous.filter(e=>e.id!==entry.id)]);setText('');setTitle('');pending.current=null;setHistory(true);setNotice('เก็บหน้านี้ไว้ในสมุดของเธอแล้ว ♡');}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function remove(id:string){setBusy(true);setError('');try{await request('/'+id,'DELETE');setEntries(previous=>previous.filter(e=>e.id!==id));setDeleting(null);setNotice('ลบบันทึกแล้ว');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  function close(){if(!busy&&(!(text.trim()||title.trim())||window.confirm('ข้อความยังไม่ได้บันทึก ต้องการปิดสมุดไหม?')))onClose();}
  return <dialog ref={dialog} className="notebook-dialog" aria-labelledby="notebook-title" onCancel={event=>{event.preventDefault();close();}}>
    <div className="paper-binding" aria-hidden="true"/>
    <div className="paper-topline"><span>MY LITTLE BOOK</span><button onClick={close} disabled={busy} aria-label="ปิดสมุด">✕</button></div>
    <h2 id="notebook-title">สมุดของฉัน <span aria-hidden="true">♡</span></h2>
    <div className="paper-view-switch"><button aria-pressed={!history} onClick={()=>setHistory(false)}>✎ เขียนหน้าวันนี้</button><button aria-pressed={history} onClick={()=>setHistory(true)}>ย้อนอ่าน ({entries.length})</button></div>
    {error&&<p className="journal-error" role="alert">{error} <button onClick={()=>void reload()} disabled={busy}>ลองอีกครั้ง</button></p>}
    {notice&&<p className="paper-saved" role="status">✓ {notice}</p>}
    {!history ? <form className="notebook-write" onSubmit={event=>{event.preventDefault();void save();}}>
      <p className="paper-date">{new Date().toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'long',year:'numeric'})}</p>
      <label htmlFor="journal-title">หัวข้อของหน้านี้</label>
      <input id="journal-title" value={title} onChange={event=>setTitle(event.target.value)} maxLength={120} disabled={busy} placeholder="เช่น ขอบคุณตัวเองที่ยังพยายาม"/>
      <label className="paper-kind" htmlFor="journal-kind">วันนี้อยากเขียนเรื่อง <select id="journal-kind" value={kind} disabled={busy} onChange={event=>setKind(event.target.value as Kind)}>{(Object.keys(kinds) as Kind[]).map(k=><option value={k} key={k}>{kinds[k]}</option>)}</select></label>
      {kind==='gratitude'&&<aside className="paper-guide"><strong>เริ่มจากเรื่องเล็ก ๆ ก็ได้นะ</strong><p>♡ วันนี้อยากขอบคุณตัวเองเรื่องอะไร?<br/>♡ ใคร หรือสิ่งไหนที่ทำให้วันนี้ดีขึ้น?<br/>♡ มีอะไรที่เรามีอยู่แล้ว และอยากเก็บไว้ในใจ?</p></aside>}
      <label htmlFor="journal-text">{prompts[kind]}</label>
      <textarea id="journal-text" value={text} onChange={event=>{setText(event.target.value);setNotice('');}} maxLength={9800} disabled={busy||!loaded} placeholder="วันนี้ฉันอยากขอบคุณ…"/>
      <button className="paper-save" disabled={busy||!loaded||!text.trim()}>{busy?'กำลังเก็บบันทึก…':'เก็บหน้านี้ไว้ในสมุด ♡'}</button>
      <small className="paper-sync">บันทึกในบัญชีของเธอ · ย้อนอ่านได้ทุกอุปกรณ์</small>
    </form> : <section className="paper-history" aria-label="บันทึกของฉัน"><div className="journal-actions"><p>ค่อย ๆ พลิกอ่าน ในวันที่อยากเติมใจ</p><button onClick={()=>void reload()} disabled={busy} aria-label="อัปเดตสมุด">↻</button></div>{!loaded&&!error&&<p role="status">กำลังเปิดสมุด…</p>}{loaded&&!entries.length&&<p className="paper-empty">สมุดยังว่างอยู่<br/>เรื่องเล็ก ๆ ของวันนี้ เป็นหน้าแรกได้นะ ♡</p>}
      {entries.map(entry=><article className="journal-entry" key={entry.id}><small>{kinds[entry.kind]} · {new Date(entry.createdAt).toLocaleString('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'medium',timeStyle:'short'})} น.</small><p>{entry.text}</p>{deleting===entry.id?<div><span>ลบบันทึกนี้ถาวรไหม? </span><button disabled={busy} onClick={()=>void remove(entry.id)}>ยืนยันลบ</button> <button disabled={busy} onClick={()=>setDeleting(null)}>เก็บไว้</button></div>:<button disabled={busy} onClick={()=>setDeleting(entry.id)}>ลบบันทึก</button>}</article>)}
    </section>}
  </dialog>;
}
