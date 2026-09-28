import { Notebook } from './Notebook';
import { CurrentCompanion } from './CurrentCompanion';
import { BetaTrialNotice } from './BetaTrialNotice';
import { useState, type FormEvent } from 'react';
import { ArrowUp, Menu, MessageCircle, History, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './DreamyHome.css';
import './ChatBetaHome.css';

export function ChatBetaHome({ onOpenMenu, onOpenChat, onHistory, onStartChat, ready }: {
  onOpenMenu: () => void; onOpenChat: () => void; onHistory: () => void;
  onStartChat: (text: string) => void; ready: boolean;
}) {
  const { currentUser } = useAuth();
  const [message, setMessage] = useState('');
  const [notebookOpen,setNotebookOpen] = useState(false);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    if (message.trim()) onStartChat(message.trim());
    else onOpenChat();
  }
  return <main className="dreamy-home beta-home" data-testid="chat-beta-home">
    <section className="dreamy-hero" aria-label="ห้องพักใจ">
      <div className="room-architecture" aria-hidden="true">
        <div className="room-arch"><div className="room-sky"><i /><i /><i /></div><span className="room-moon" /><span className="room-window-bar" /></div>
        <div className="room-light" /><div className="room-floor" /><div className="room-rug" />
        <div className="room-plant"><i /><i /><i /><i /><span /></div>
      </div>
      <header className="dreamy-header">
        <span className="dreamy-wordmark">Deung Sati<span aria-hidden="true">*</span></span>
        <div className="dreamy-header-actions"><span className="beta-badge">CHAT BETA</span><button className="dreamy-menu" onClick={onOpenMenu} aria-label="เปิดเมนู"><Menu size={23} /></button></div>
      </header>
      <div className="dreamy-greeting"><img className="dreamy-avatar" src="/images/deung-sati-selfie.webp" alt="น้องดึงสติ" /><strong>สวัสดี {currentUser?.name || 'เธอ'}</strong></div>
      <p className="dreamy-note">พักตรงนี้<br />ได้เสมอนะ <span>♡</span></p>
      <div className="beta-live-companion"><CurrentCompanion /></div>
      <button type="button" className="room-journal beta-room-journal" onClick={()=>setNotebookOpen(true)} aria-label="เปิดสมุดของฉัน เขียนบันทึก" disabled={!currentUser}>
        <span className="book-invitation">วันนี้มีอะไรดี ๆ บ้าง?</span>
        <span className="room-book" aria-hidden="true"><BookOpen size={25}/><i/></span>
        <span className="room-object-label">สมุดของฉัน <span aria-hidden="true">✎</span></span>
      </button>
    </section>
    <section className="dreamy-chat-card" aria-labelledby="beta-heading">
      <div className="dreamy-chat-heading"><div><h1 id="beta-heading">ตอนนี้ข้างในเป็นยังไงบ้าง?</h1><p>ไม่ต้องเรียบเรียงให้ดี ก็เริ่มเล่าได้เลย</p></div></div>
      <form onSubmit={submit} className="dreamy-composer">
        <MessageCircle size={21} aria-hidden="true" />
        <input disabled={!ready} value={message} onChange={event => setMessage(event.target.value)} aria-label="พิมพ์เรื่องในใจ" placeholder="วันนี้มีเรื่องอยากเล่า…" maxLength={6000} />
        <button type="submit" disabled={!ready} aria-label="เริ่มคุย"><ArrowUp size={25} /></button>
      </form>
      <button className="beta-start" onClick={onOpenChat}>เข้าห้องแชท</button>
      <button className="beta-history" onClick={onHistory}><History size={17} /> ย้อนอ่านบทสนทนา</button>
    </section>
    <BetaTrialNotice />
    <aside className="beta-intro"><strong>พื้นที่ทดลองเล่า และค่อย ๆ เข้าใจตัวเอง</strong><p>แชท AI ช่วยรับฟัง แยกสิ่งที่เกิดขึ้นกับสิ่งที่เราคิด และช่วยมองทางเลือก โดยเธอเป็นคนตัดสินใจเอง</p><p>ทดลองแชทฟรี 14 วัน พร้อมสมุดบันทึกที่ผูกกับบัญชีของเธอ ส่วนบันทึกลูปและการเลี้ยงไข่กำลังพัฒนาในเฟส 2</p><small>AI อาจเข้าใจคลาดเคลื่อนได้ และไม่ใช่บริการฉุกเฉินหรือการรักษา</small></aside>
    {notebookOpen && currentUser && <Notebook key={currentUser.id} ownerId={currentUser.id} onClose={()=>setNotebookOpen(false)}/>}
  </main>;
}


