import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BookOpen, PenLine, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './MyNotebook.css';

import { AuthModal } from './AuthModal';
import { validateNotebookEntry, type NotebookEntry as Entry } from '../shared/notebook';
async function request(ownerId: string, entry?: Entry) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-DeungSati-Owner': ownerId, 'X-DeungSati-Client': 'true' };
  const token = localStorage.getItem('deung_sati_session_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch('/api/user/notebook', { method: entry ? 'POST' : 'GET', credentials: 'include', cache: 'no-store', headers, ...(entry ? { body: JSON.stringify(entry) } : {}) });
  if (!response.ok) throw new Error([401, 403, 409].includes(response.status) ? 'บัญชีเปลี่ยนไปหรือหมดอายุ กรุณาปิดสมุดแล้วเข้าสู่ระบบใหม่' : 'เชื่อมต่อสมุดไม่ได้ ลองอีกครั้งนะ');
  const data = await response.json();
  if (data.ownerId !== ownerId) throw new Error('บัญชีเปลี่ยนไป กรุณาเปิดสมุดใหม่');
  return data;
}
const dateLabel = (date: string) => new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

export function MyNotebook({ onClose, onOpenJourney }: { onClose: () => void; onOpenJourney: () => void }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <AuthModal isOpen onClose={onClose} />;
  return <NotebookPages key={currentUser.id} ownerId={currentUser.id} onClose={onClose} onOpenJourney={onOpenJourney} />;
}
function NotebookPages({ ownerId, onClose, onOpenJourney }: { ownerId: string; onClose: () => void; onOpenJourney: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const pending = useRef<Entry | null>(null);
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [page, setPage] = useState<'list' | 'write' | 'read'>('list');
  const [selected, setSelected] = useState<Entry | null>(null);
  const [title, setTitle] = useState('');
  const [self, setSelf] = useState('');
  const [grateful, setGrateful] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const dirty = Boolean(title.trim() || self.trim() || grateful.trim() || note.trim());
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;

    dialog.current?.showModal();
    return () => { dialog.current?.close(); opener?.focus(); };
  }, []);
  useEffect(() => {
    let active = true; setLoading(true);
    request(ownerId).then(data => {
      if (!Array.isArray(data.entries)) throw new Error('อ่านข้อมูลสมุดไม่ได้');
      const saved = data.entries.map(validateNotebookEntry);
      if (active) { setEntries(saved); setError(''); }
    }).catch(error => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ownerId, reload]);
  useEffect(() => { heading.current?.focus(); }, [page]);
  const close = () => { if (busy.current) return; if (dirty) setConfirmClose(true); else onClose(); };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy.current || (!self.trim() && !grateful.trim() && !note.trim())) return;
    busy.current = true; setSaving(true);
    const entry: Entry = { id: crypto.randomUUID(), title: title.trim() || 'สิ่งเล็ก ๆ ที่อยากขอบคุณ', self: self.trim(), grateful: grateful.trim(), note: note.trim(), createdAt: new Date().toISOString() };
    try {
      // Keep the ID for an identical retry after the server response is lost.
      const previous = pending.current;
      if (previous && ['title', 'self', 'grateful', 'note'].every(key => previous[key as keyof Entry] === entry[key as keyof Entry])) { entry.id = previous.id; entry.createdAt = previous.createdAt; }
      pending.current = entry;
      const data = await request(ownerId, entry);
      const saved = validateNotebookEntry(data.entry);
      setEntries(current => [saved, ...current.filter(item => item.id !== saved.id)]);
      pending.current = null; setTitle(''); setSelf(''); setGrateful(''); setNote('');
      setError(''); setNotice('บันทึกในบัญชีแล้ว เปิดอ่านจากเครื่องอื่นได้'); setPage('list');
    } catch (error) { setError(`${error instanceof Error ? error.message : 'ยังบันทึกไม่สำเร็จ'} ข้อความยังอยู่ตรงนี้ กดบันทึกเพื่อลองอีกครั้งได้`); }
    finally { busy.current = false; setSaving(false); }
  };
  return <dialog ref={dialog} className="my-notebook" aria-labelledby="notebook-heading" onCancel={event => { event.preventDefault(); close(); }}>
    <div className="notebook-paper">
      <header className="notebook-top"><span><BookOpen size={17} /> สมุดของฉัน</span><button type="button" disabled={saving} onClick={close} aria-label="ปิดสมุด"><X size={21} /></button></header>
      {page !== 'list' && <button type="button" className="notebook-back" disabled={saving} onClick={() => { setPage('list'); setNotice(''); }}><ArrowLeft size={16} /> กลับไปหน้าสมุด</button>}
      <h2 id="notebook-heading" ref={heading} tabIndex={-1}>{page === 'write' ? 'ขอบคุณวันนี้' : page === 'read' ? selected?.title : 'เก็บเรื่องเล็ก ๆ ที่มีความหมาย'}</h2>
      {error && <p role="alert" className="notebook-error">{error}</p>}
      {notice && <p role="status" className="notebook-notice">{notice}</p>}
      {page === 'list' && <>
        <p className="notebook-intro">พื้นที่เก็บคำขอบคุณให้ตัวเอง และสิ่งที่มีอยู่ในชีวิต กลับมาอ่านเมื่อไรก็ได้นะ</p>
        <button type="button" className="notebook-save" onClick={() => { setPage('write'); setNotice(''); }}><PenLine size={18} /> {dirty ? 'เขียนต่อ' : 'เขียนบันทึก'}</button>
        <p className="notebook-storage">บันทึกส่วนตัวผูกกับบัญชีของเธอ เปิดอ่านได้ทุกเครื่องเมื่อล็อกอินบัญชีเดียวกัน</p>
        <button type="button" className="notebook-back" disabled={loading} onClick={() => setReload(value => value + 1)}>{loading ? 'กำลังเปิดสมุด…' : 'โหลดบันทึกล่าสุด'}</button>
        <div className="notebook-entries">
          {loading ? <p role="status">กำลังโหลดบันทึกจากบัญชี…</p> : error ? <p>ยังโหลดบันทึกไม่สำเร็จ กดโหลดบันทึกล่าสุดเพื่อลองอีกครั้ง</p> : entries.length === 0 ? <p className="notebook-empty">หน้ากระดาษแรกกำลังรอเธออยู่<br />เริ่มจากเรื่องเล็ก ๆ เพียงเรื่องเดียวก็ได้</p> : entries.map(entry => <button type="button" key={entry.id} onClick={() => { setSelected(entry); setPage('read'); setNotice(''); }}>
            <time dateTime={entry.createdAt}>{dateLabel(entry.createdAt)}</time><strong>{entry.title}</strong><span>{entry.self || entry.grateful || entry.note}</span><small>เปิดอ่าน →</small>
          </button>)}
        </div>
        <button className="notebook-back" type="button" onClick={() => { if (dirty) { setConfirmClose(true); return; } onClose(); onOpenJourney(); }}>ดูเส้นทางการเติบโตของฉัน →</button>
      </>}
      {page === 'write' && <form onSubmit={save}><fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <p className="notebook-date">{dateLabel(new Date().toISOString())}</p>
        <p className="notebook-intro">วันนี้ไม่จำเป็นต้องเป็นวันที่ดีทั้งหมด เขียนเท่าที่รู้สึกจริง เลือกตอบเพียงข้อเดียวก็ได้นะ</p>
        <label className="notebook-field">หัวข้อ<input autoComplete="off" value={title} maxLength={160} onChange={e => setTitle(e.target.value)} placeholder="อยากเรียกหน้ากระดาษนี้ว่าอะไร?" /></label>
        <label className="notebook-field">วันนี้อยากขอบคุณตัวเองเรื่องอะไร?<small>ลองนึกถึงสิ่งที่พยายาม การดูแลตัวเอง หรือการยอมให้ตัวเองพัก</small><textarea rows={3} maxLength={20000} value={self} onChange={e => setSelf(e.target.value)} placeholder="ขอบคุณตัวเองที่วันนี้…" /></label>
        <label className="notebook-field">สิ่งที่มีอยู่ในวันนี้ ที่อยากขอบคุณคืออะไร?<small>อาจเป็นคนข้าง ๆ อาหารหนึ่งมื้อ สัตว์เลี้ยง หรือช่วงเวลาสงบ สิ่งนี้มีความหมายกับเธอยังไง?</small><textarea rows={3} maxLength={20000} value={grateful} onChange={e => setGrateful(e.target.value)} placeholder="วันนี้ฉันขอบคุณที่มี… เพราะ…" /></label>
        <label className="notebook-field">อยากฝากอะไรถึงตัวเองอีกไหม?<small>เขียนอย่างอิสระ หรือเว้นไว้ก็ได้</small><textarea rows={3} maxLength={20000} value={note} onChange={e => setNote(e.target.value)} placeholder="ถึงตัวฉันที่กลับมาอ่านหน้านี้…" /></label>
        <button className="notebook-save" type="submit" disabled={saving || (!self.trim() && !grateful.trim() && !note.trim())}>{saving ? 'กำลังบันทึกในบัญชี…' : 'เก็บไว้ในสมุดของฉัน'}</button></fieldset>
      </form>}
      {page === 'read' && selected && <article className="notebook-reading">
        <time dateTime={selected.createdAt}>{dateLabel(selected.createdAt)}</time>
        {([[selected.self, 'ขอบคุณตัวเอง'], [selected.grateful, 'ขอบคุณสิ่งที่มี'], [selected.note, 'ถึงตัวฉัน']] as const).filter(([text]) => text).map(([text, label]) => <section key={label}><h3>{label}</h3><p>{text}</p></section>)}
        <p className="notebook-signature">ด้วยความขอบคุณ จากฉันในวันนั้น ♡</p>
      </article>}
      {confirmClose && <section className="notebook-confirm" role="alert" aria-label="มีข้อความที่ยังไม่บันทึก"><p>ข้อความนี้ยังไม่ได้บันทึก จะกลับไปเขียนต่อไหม?</p><button type="button" className="notebook-save" onClick={() => { setConfirmClose(false); setPage('write'); }}>เขียนต่อ</button><button type="button" className="notebook-back" onClick={onClose}>ทิ้งข้อความและปิดสมุด</button></section>}
    </div>
  </dialog>;
}
