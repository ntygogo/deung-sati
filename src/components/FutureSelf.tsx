import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Leaf, MessageCircle, Pencil, Sprout, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './FutureSelf.css';
import { useFutureSelf } from '../hooks/useFutureSelf';
import type { FutureFocus as Focus, FutureEntry as Entry } from '../shared/futureSelf';

const choices = [
  { title: 'พูดความต้องการ โดยไม่ฝืนใจตัวเอง', detail: 'ค่อย ๆ กล้าบอกสิ่งที่ต้องการ', cue: 'มีคนขอให้ทำเพิ่ม แต่ฉันยังไม่พร้อม', action: 'บอกว่า “ขอดูก่อน แล้วจะกลับมาตอบนะ”', fallback: 'ขอเวลาคิดก่อนตอบหนึ่งครั้ง', obstacle: 'กลัวว่าอีกฝ่ายจะผิดหวัง', outcome: 'มีเวลาคิดก่อนรับปาก และได้ฟังใจตัวเองมากขึ้น' },
  { title: 'ใจดีกับตัวเอง เวลาทำพลาด', detail: 'ผิดพลาดได้ โดยไม่ต้องซ้ำเติมตัวเอง', cue: 'สังเกตว่ากำลังโทษตัวเองหลังทำพลาด', action: 'บอกตัวเองว่า “ครั้งนี้พลาดได้ เดี๋ยวค่อยดูทีละจุด”', fallback: 'หยุดซ้ำเติมตัวเองสักหนึ่งประโยค', obstacle: 'เผลอคิดว่าทำพลาดแปลว่าฉันไม่ดีพอ', outcome: 'กลับมาแก้เรื่องตรงหน้าได้ โดยไม่ต้องตัดสินตัวเองทั้งคน' },
  { title: 'มีพื้นที่พัก ก่อนตอบตอนอารมณ์แรง', detail: 'ฟังความรู้สึก แล้วค่อยเลือกว่าจะทำอะไร', cue: 'อ่านข้อความแล้วอยากตอบกลับทันที', action: 'วางโทรศัพท์สักครู่ แล้วค่อยกลับมาอ่านอีกครั้ง', fallback: 'ยังไม่กดส่ง แล้ววางมือจากหน้าจอหนึ่งครั้ง', obstacle: 'รู้สึกว่าต้องตอบเดี๋ยวนี้', outcome: 'มีจังหวะเลือกคำพูดที่ตรงใจขึ้น' },
];
const resultLabels: Record<Entry['result'], string> = { helpful: 'ช่วยได้', little: 'ช่วยนิดหน่อย', same: 'ยังไม่เห็นต่าง', harder: 'ยากหรือหนักขึ้น', notyet: 'ยังไม่ได้ลอง' };

export function FutureSelf({ onBack, onChat }: { onBack: () => void; onChat: (text: string) => void }) {
  const { currentUser, isLoading } = useAuth();
  if (isLoading) return <p role="status">กำลังเปิดพื้นที่ของคุณ…</p>;
  return <FutureSelfPage key={currentUser?.id || 'guest'} ownerId={currentUser?.id || 'guest'} onBack={onBack} onChat={onChat} />;
}
function FutureSelfPage({ ownerId, onBack, onChat }: { ownerId: string; onBack: () => void; onChat: (text: string) => void }) {
  const sync = useFutureSelf(ownerId);
  const { journal, commit } = sync;
  const canSave = !['loading', 'conflict'].includes(sync.status);
  const [editing, setEditing] = useState<Focus | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [energy, setEnergy] = useState<'small' | 'normal'>('small');
  const [reviewing, setReviewing] = useState(false);
  const [result, setResult] = useState<Entry['result'] | ''>('');
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const savedReview = useRef(false);
  const reviewedStep = useRef({ focus: '', action: '' });
  const reviewRef = useRef<HTMLElement>(null);
  useEffect(() => { if (reviewing) reviewRef.current?.scrollIntoView({ block: 'nearest' }); }, [reviewing]);
  const focus = journal.focus;
  const currentAction = focus ? energy === 'small' && focus.fallback ? focus.fallback : focus.action : '';
  const choose = (i: number) => { const item = choices[i]; setEditing({ id: crypto.randomUUID(), ...item }); setNotice(''); };
  const openReview = (value: Entry['result'] | '' = '') => { reviewedStep.current = { focus: focus?.title || '', action: currentAction }; savedReview.current = false; setResult(value); setNote(''); setReviewing(true); setNotice(''); };
  const saveReview = () => {
    if (!focus || !result || savedReview.current) return;
    savedReview.current = true;
    const entry = { id: crypto.randomUUID(), at: new Date().toISOString(), focus: reviewedStep.current.focus, action: reviewedStep.current.action, result, note: note.trim() };
    if (commit({ ...journal, entries: [entry, ...journal.entries] })) {
      setReviewing(false);
      setNotice(result === 'notyet' ? 'ยังไม่ได้ลองก็เป็นข้อมูลได้ เราปรับก้าวนี้ให้เหมาะกับชีวิตจริงได้เสมอ' : result === 'harder' || result === 'same' ? 'ขอบคุณที่บอกตามจริง ไม่จำเป็นต้องฝืนวิธีเดิม ลองลดก้าวหรือเปลี่ยนวิธีได้' : 'เก็บสิ่งที่เธอสังเกตไว้แล้ว ครั้งหน้าค่อยดูว่ายังช่วยอยู่ไหม');
    } else savedReview.current = false;
  };
  const recent = journal.entries.slice(0, 5);
  return <div className="screen scrollArea future-self">
    <header className="fs-top"><button aria-label="กลับหน้าหลัก" onClick={onBack}><ArrowLeft size={20} /></button><span>FUTURE SELF</span><span className="fs-top-seed"><Sprout size={19} /></span></header>
    <main className="fs-content">
      <section className="fs-intro"><span className="fs-eyebrow">พื้นที่เติบโตในแบบของเธอ</span><h1>ค่อย ๆ เป็นฉัน<br /><em>ที่อยากเป็น</em></h1><p>เริ่มจากชีวิตที่อยากให้เบาขึ้นสักนิด<br />แล้วลองก้าวเล็ก ๆ ที่พอทำไหว</p><div className="fs-seed" aria-hidden="true"><Sprout size={58} strokeWidth={1.3} /></div></section>
      {error && <p role="alert" className="fs-error">{error}</p>}
      <section className="fs-sync" aria-label="สถานะการบันทึก">
        <p role="status">{ownerId === 'guest' ? 'โหมดทดลอง · เก็บในเบราว์เซอร์นี้' : sync.status === 'synced' ? 'บันทึกในบัญชีแล้ว · เปิดต่อบนอุปกรณ์อื่นได้' : sync.status === 'loading' ? 'กำลังเปิดแผนจากบัญชี…' : sync.status === 'saving' ? 'เก็บในเครื่องแล้ว · กำลังซิงก์กับบัญชี…' : sync.status === 'conflict' ? 'มีแผนที่แก้ต่างกันจากอีกเครื่อง' : 'ยังไม่ได้ยืนยันการซิงก์กับบัญชี'}</p>
        {sync.error && <p role="alert" className="fs-error">{sync.error}</p>}
        {ownerId !== 'guest' && ['offline', 'error'].includes(sync.status) && <button className="fs-text-button" onClick={() => void sync.retry()}>ลองซิงก์อีกครั้ง</button>}
        {sync.status === 'conflict' && <div className="fs-conflict"><p>บันทึกสิ่งที่เรียนรู้จะเก็บไว้ครบทั้งสองเครื่อง เลือกแผนที่จะใช้ต่อได้เลย</p>
          <article><strong>แผนในเครื่องนี้</strong><p>{journal.focus?.title || 'ยังไม่ได้เลือกเรื่อง'}</p><p>ถ้า {journal.focus?.cue || '—'} → {journal.focus?.action || '—'}</p><button className="fs-outline" onClick={() => sync.resolveConflict('local')}>ใช้แผนในเครื่องนี้</button></article>
          <article><strong>แผนที่บันทึกในบัญชี</strong><p>{sync.remoteFocus?.title || 'ยังไม่ได้เลือกเรื่อง'}</p><p>ถ้า {sync.remoteFocus?.cue || '—'} → {sync.remoteFocus?.action || '—'}</p><button className="fs-outline" onClick={() => sync.resolveConflict('account')}>ใช้แผนจากบัญชี</button></article>
        </div>}
        {sync.guestImport && canSave && <div className="fs-import"><p>มีบันทึกโหมดทดลอง {sync.guestImport.entries.length} รายการในเครื่องนี้ เพิ่มเข้าบัญชีที่ใช้อยู่ได้ โดยเก็บสำเนาโหมดทดลองไว้</p><button className="fs-text-button" onClick={() => { if (sync.importGuest()) setNotice('เพิ่มข้อมูลโหมดทดลองแล้ว กำลังเก็บในบัญชีนี้'); }}>เพิ่มข้อมูลโหมดทดลองเข้าบัญชีนี้</button></div>}
      </section>
      {editing ? <form className="fs-plan" onSubmit={e => { e.preventDefault(); if (!editing.title.trim() || !editing.cue.trim() || !editing.action.trim()) { setError('เติมเรื่องที่อยากฝึก สถานการณ์ และก้าวที่จะลองก่อนนะ'); return; } if (commit({ ...journal, focus: editing })) { setEditing(null); setChoosing(false); setNotice('เลือกก้าวของเธอแล้ว ลองเมื่อเจอสถานการณ์จริง ไม่ต้องทำให้ได้ทันที'); } }}>
        <div className="fs-section-head"><h2>ก้าวที่เข้ากับชีวิตเธอ</h2><button type="button" className="fs-text-button" onClick={() => setEditing(null)}>ย้อนกลับ</button></div>
        <p className="fs-soft">ตัวอย่างแก้ได้ทุกคำ เลือกเฉพาะที่ตรงกับเธอ</p>
        <label>ช่วงนี้ ฉันอยาก…<textarea required maxLength={200} value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} /></label>
        <label>ถ้าเจอสถานการณ์นี้…<textarea required maxLength={400} value={editing.cue} onChange={e => setEditing({ ...editing, cue: e.target.value })} placeholder="เช่น มีคนขอให้ทำเพิ่ม แต่ยังไม่พร้อม" /></label>
        <label>ฉันจะลอง…<textarea required maxLength={400} value={editing.action} onChange={e => setEditing({ ...editing, action: e.target.value })} placeholder="สิ่งเล็ก ๆ ที่ทำได้ด้วยตัวเอง" /></label>
        <details><summary>ช่วยให้แผนพอทำไหว <span>ไม่ต้องตอบครบ</span></summary>
          <label>ถ้าลองได้ ชีวิตจะง่ายขึ้นตรงไหน?<textarea maxLength={400} value={editing.outcome} onChange={e => setEditing({ ...editing, outcome: e.target.value })} /></label>
          <label>อะไรอาจทำให้ลองยาก?<textarea maxLength={400} value={editing.obstacle} onChange={e => setEditing({ ...editing, obstacle: e.target.value })} placeholder="อาจเป็นเวลา สถานการณ์ หรือสิ่งที่รู้สึก ยังไม่รู้ก็เว้นได้" /></label>
          <label>วันที่พลังน้อย ลดเหลือแค่…<textarea maxLength={400} value={editing.fallback} onChange={e => setEditing({ ...editing, fallback: e.target.value })} placeholder="เล็กแค่หนึ่งประโยคหรือหนึ่งจังหวะก็ได้" /></label>
        </details>
        <button type="submit" disabled={!canSave} className="fs-primary">เก็บก้าวนี้ไว้ลอง <ArrowRight size={18} /></button>
      </form> : (choosing || !focus) ? <section className="fs-choose">
        <div className="fs-section-head"><h2>ตอนนี้อยากให้เรื่องไหนเบาลง?</h2>{focus && <button className="fs-text-button" onClick={() => setChoosing(false)}>กลับก้าวเดิม</button>}</div>
        <p className="fs-soft">เลือกทีละเรื่อง เปลี่ยนใจได้เสมอ</p>
        {choices.map((item, i) => <button className="fs-choice" key={item.title} onClick={() => choose(i)}><span className="fs-choice-number">0{i + 1}</span><span><strong>{item.title}</strong><small>{item.detail}</small></span><ChevronRight size={18} /></button>)}
        <button className="fs-outline" onClick={() => { setEditing({ id: crypto.randomUUID(), title: '', outcome: '', cue: '', action: '', obstacle: '', fallback: '' }); }}>เขียนในแบบของฉัน</button>
        <button className="fs-help" onClick={() => onChat('ฉันยังไม่รู้ว่าตัวเองอยากเป็นคนแบบไหน แต่อยากให้ชีวิตเบาขึ้น ช่วยฟังเรื่องที่เจอก่อน แล้วค่อย ๆ ช่วยฉันหาก้าวเล็ก ๆ โดยไม่เร่งให้ตอบหรือวางแผนได้ไหม')}><MessageCircle size={18} /> ยังไม่รู้ ขอคุยให้เห็นภาพก่อน</button>
      </section> : focus && <>
        <section className="fs-direction"><span className="fs-eyebrow">สิ่งที่ฉันเลือกฝึกช่วงนี้</span><h2>{focus.title}</h2>{focus.outcome && <p>{focus.outcome}</p>}<button className="fs-text-button" onClick={() => setChoosing(true)}>เปลี่ยนสิ่งที่อยากฝึก <ChevronRight size={14} /></button></section>
        <section className="fs-today"><div className="fs-section-head"><h2><Sun size={19} /> ก้าวของวันนี้</h2><button className="fs-text-button" onClick={() => setEditing({ ...focus })}><Pencil size={14} /> ปรับก้าว</button></div>
          <div className="fs-energy" aria-label="เลือกขนาดก้าว"><button aria-pressed={energy === 'small'} onClick={() => setEnergy('small')}>วันนี้ขอเล็ก ๆ</button><button aria-pressed={energy === 'normal'} onClick={() => setEnergy('normal')}>พอมีพลังลอง</button></div>
          <div className="fs-if"><span>ถ้า…</span><p>{focus.cue}</p></div><div className="fs-then"><span>ฉันจะลอง…</span><h3>{currentAction}</h3></div>
          {focus.obstacle && <details className="fs-obstacle"><summary>ถ้าติดตรง “{focus.obstacle}”</summary><p>ยังไม่ต้องเอาชนะมันในครั้งเดียว ลดก้าวให้เล็กลง หรือขอแรงช่วยจากคนที่ไว้ใจได้</p><button className="fs-text-button" onClick={() => setEditing({ ...focus })}>ปรับแผนให้ทำไหว</button></details>}
          <button className="fs-primary" onClick={() => openReview()}><Check size={18} /> ลองแล้ว เป็นอย่างไรบ้าง</button>
          <div className="fs-secondary-actions"><button onClick={() => openReview('notyet')}>ยังไม่ได้ลอง</button><button onClick={() => setNotice('พักวันนี้ได้ ก้าวที่เลือกไว้ยังอยู่ กลับมาเมื่อพร้อมนะ')}>วันนี้ขอพักก่อน</button></div>
        </section>
        {reviewing && <section ref={reviewRef} className="fs-review" aria-label="ทบทวนหลังลอง"><div className="fs-section-head"><h2>{result === 'notyet' ? 'มีอะไรทำให้ยังไม่ได้ลอง?' : 'ก้าวนี้ช่วยเธอแค่ไหน?'}</h2><button className="fs-text-button" onClick={() => setReviewing(false)}>ไว้ก่อน</button></div><p className="fs-soft">ไม่มีคำตอบที่ต้องถูก และไม่ต้องรู้สึกดีขึ้นทุกครั้ง</p>
          {result !== 'notyet' && <div className="fs-outcomes">{(['helpful', 'little', 'same', 'harder'] as const).map(value => <button key={value} aria-pressed={result === value} onClick={() => setResult(value)}>{resultLabels[value]}</button>)}</div>}
          <label>{result === 'notyet' ? 'เช่น ยังไม่มีจังหวะ ลืม หรือก้าวนี้ยังยากไป' : 'มีอะไรที่สังเกตเห็นไหม?'}<textarea maxLength={800} value={note} onChange={e => setNote(e.target.value)} placeholder="ยังอธิบายไม่ได้ก็เว้นไว้ได้" /></label><button className="fs-primary" disabled={!result || !canSave} onClick={saveReview}>เก็บสิ่งที่เรียนรู้</button></section>}
        {notice && <div role="status" className="fs-notice"><Leaf size={20} /><p>{notice}</p></div>}
        <section className="fs-history"><div className="fs-section-head"><h2>ร่องรอยเล็ก ๆ ของฉัน</h2><span>{journal.entries.length} บันทึก</span></div><p className="fs-soft">สิ่งที่เธอบอกหลังลองจริง ช่วยให้เลือกก้าวครั้งต่อไป</p>
          {recent.length === 0 ? <div className="fs-empty"><Sprout size={26} /><p>ยังไม่ต้องมีความสำเร็จมาโชว์<br />เมื่อได้ลอง เราค่อยมาดูด้วยกัน</p></div> : recent.map(entry => <article key={entry.id}><div className="fs-entry-date">{new Date(entry.at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} <span>{resultLabels[entry.result]}</span></div><small className="fs-soft">{entry.focus}</small><p>{entry.action}</p>{entry.note && <blockquote>“{entry.note}”</blockquote>}</article>)}
        </section>
        <button className="fs-help" onClick={() => onChat(`ฉันกำลังฝึกเรื่อง “${focus.title}” แผนที่เลือกคือ ถ้า${focus.cue} ฉันจะ${currentAction} อยากคุยว่าก้าวนี้เหมาะกับฉันไหม ขอค่อย ๆ ฟังสิ่งที่ฉันเจอก่อน โดยยังไม่ถือว่าฉันทำตามแผนแล้ว`)}><MessageCircle size={18} /> อยากคุยเรื่องก้าวนี้</button>
      </>}
      <p className="fs-storage">{ownerId === 'guest' ? 'ข้อมูลโหมดทดลองอยู่ในเบราว์เซอร์นี้ เข้าสู่ระบบแล้วเลือกเพิ่มเข้าบัญชีได้' : 'แผนและบันทึกแยกตามบัญชี มีสำเนาในเบราว์เซอร์นี้สำหรับเวลาที่เชื่อมต่อไม่ได้'}</p>
    </main><div className="bottomSpacer" />
  </div>;
}
