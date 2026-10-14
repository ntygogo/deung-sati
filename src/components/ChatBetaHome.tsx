import { MindJourney } from './MindJourney';
import { Notebook } from './Notebook';
import { CurrentCompanion } from './CurrentCompanion';
import { BetaTrialNotice } from './BetaTrialNotice';
import { useState, type FormEvent } from 'react';
import { ArrowUp, Menu, MessageCircle, History, BookOpen, Heart, Sparkles, Flower2, ArrowUpRight, CloudSun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './DreamyHome.css';
import './ChatBetaHome.css';

export function ChatBetaHome({ onOpenMenu, onOpenChat, onHistory, onStartChat, ready, roomOnly = false }: {
  onOpenMenu: () => void; onOpenChat: () => void; onHistory: () => void;
  onStartChat: (text: string) => void; ready: boolean; roomOnly?: boolean;
}) {
  const { currentUser } = useAuth();
  const [journeyOpen,setJourneyOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [notebookOpen,setNotebookOpen] = useState(false);
  const [journeyView,setJourneyView] = useState<'checkin'|'overview'|'history'|'intro'|undefined>();
  function openJourney(view:'checkin'|'overview'|'history'|'intro'){setJourneyView(view);setJourneyOpen(true);}
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    if (message.trim()) onStartChat(message.trim());
    else onOpenChat();
  }
  if(!roomOnly && journeyOpen && currentUser) return <MindJourney initialView={journeyView} ready={ready} key={currentUser.id} ownerId={currentUser.id} onClose={()=>setJourneyOpen(false)} onChat={onStartChat} onHistory={onHistory}/>;
  if(!roomOnly) return <main className="daily-sanctuary" aria-label="พื้นที่ดูแลใจวันนี้">
    <header className="sanctuary-top"><span className="dreamy-wordmark">Deung Sati<span>*</span></span><button className="dreamy-menu" aria-label="เปิดเมนู" onClick={onOpenMenu}><Menu size={22}/></button></header>
    <div className="sanctuary-greeting"><small>YOUR LITTLE SAFE SPACE</small><p>สวัสดี {currentUser?.name || 'เธอ'} <span>♡</span></p></div>
    <section className="sanctuary-picture"><img src="/images/deung-sati-selfie.webp" alt="น้องดึงสติสีชมพูม่วง โบกมือต้อนรับท่ามกลางแสงอุ่น"/><div><span>ไม่ต้องเก่งตลอดเวลาก็ได้</span><h1>วันนี้…<br/>กลับมาฟังใจตัวเองกัน</h1><p>ทีละความรู้สึก ทีละก้าวเล็ก ๆ</p></div></section>
    <button className="sanctuary-checkin" onClick={()=>openJourney('checkin')}><span className="sanctuary-object rose"><Heart size={29}/></span><span><small>เริ่มจากตรงนี้ · ใช้เวลาสั้น ๆ</small><strong>วันนี้ใจเป็นอย่างไรบ้าง?</strong><span>เช็คอินอารมณ์ของฉัน</span></span><ArrowUpRight size={22}/></button>
    <div className="sanctuary-section-title"><h2>พื้นที่เล็ก ๆ สำหรับใจ</h2><Sparkles size={18}/></div>
    <div className="sanctuary-grid">
      <button onClick={onOpenChat}><span className="sanctuary-object lavender"><MessageCircle size={29}/></span><strong>มีเรื่องอยากเล่า</strong><span>ไม่ต้องเรียบเรียงให้ดี</span><ArrowUpRight size={17}/></button>
      <button onClick={()=>openJourney('overview')}><span className="sanctuary-object peach"><CloudSun size={30}/></span><strong>ภาพรวมใจของฉัน</strong><span>ค่อย ๆ เห็นสิ่งที่เกิดขึ้น</span><ArrowUpRight size={17}/></button>
      <button onClick={()=>openJourney('history')}><span className="sanctuary-object sage"><Flower2 size={30}/></span><strong>เส้นทางของฉัน</strong><span>วงจรและสิ่งที่ได้ลอง</span><ArrowUpRight size={17}/></button>
      <button onClick={()=>setNotebookOpen(true)}><span className="sanctuary-object cream"><BookOpen size={29}/></span><strong>สมุดของฉัน</strong><span>เก็บเรื่องราวที่มีความหมาย</span><ArrowUpRight size={17}/></button>
    </div>
    <section className="sanctuary-video" aria-label="คลิปแนะนำจากนัตตี้"><h2>เริ่มต้นกับดึงสติ</h2>{import.meta.env.VITE_INTRO_VIDEO_URL ? <video className="mj-intro-video" controls playsInline preload="metadata" src={import.meta.env.VITE_INTRO_VIDEO_URL} aria-label="คลิปแนะนำดึงสติโดยนัตตี้"/> : <div className="mj-video-placeholder"><span aria-hidden="true">▷</span><p>คลิปจากนัตตี้ เร็ว ๆ นี้</p></div>}</section>
    <p className="sanctuary-footnote">ไม่ต้องเปลี่ยนทั้งชีวิตในวันเดียว<br/>แค่วันนี้แวะมารับฟังตัวเอง ก็เริ่มได้แล้ว ♡</p>
    <BetaTrialNotice/>
    <p className="sanctuary-disclaimer">AI อาจเข้าใจคลาดเคลื่อน และไม่ใช่บริการฉุกเฉินหรือการรักษา</p>
    {notebookOpen&&currentUser&&<Notebook key={currentUser.id} ownerId={currentUser.id} onClose={()=>setNotebookOpen(false)}/>}
  </main>;
  return <main className={`dreamy-home beta-home${roomOnly ? ' beta-companion-room' : ''}`} data-testid={roomOnly ? 'companion-room' : 'chat-beta-home'}>
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
    </section>
    {roomOnly && <section className="beta-room-welcome"><h1>ห้องน้องดึงสติ</h1><p>พื้นที่ของเรากับน้อง ♡</p></section>}
    {!roomOnly && <><section className="dreamy-chat-card" aria-labelledby="beta-heading">
      <div className="dreamy-chat-heading"><div><h1 id="beta-heading">ตอนนี้ข้างในเป็นยังไงบ้าง?</h1><p>ไม่ต้องเรียบเรียงให้ดี ก็เริ่มเล่าได้เลย</p></div></div>
      <form onSubmit={submit} className="dreamy-composer">
        <MessageCircle size={21} aria-hidden="true" />
        <input disabled={!ready} value={message} onChange={event => setMessage(event.target.value)} aria-label="พิมพ์เรื่องในใจ" placeholder="วันนี้มีเรื่องอยากเล่า…" maxLength={6000} />
        <button type="submit" disabled={!ready} aria-label="เริ่มคุย"><ArrowUp size={25} /></button>
      </form>
      <button className="beta-start" onClick={onOpenChat}>เข้าห้องแชท</button>
      <button className="beta-history" onClick={onHistory}><History size={17} /> ย้อนอ่านบทสนทนา</button>
    </section>
    <section className="mj-entry-card"><h2>ภาพรวมใจของฉัน</h2><p>เช็คอินอารมณ์ เห็นวงจร เข้าใจความต้องการ และเก็บสิ่งที่ได้ลองในชีวิตจริง</p><button disabled={!currentUser} onClick={()=>setJourneyOpen(true)}>เปิดพื้นที่ดูแลใจ →</button></section>
    <BetaTrialNotice />
    <aside className="beta-intro"><strong>พื้นที่ทดลองเล่า และค่อย ๆ เข้าใจตัวเอง</strong><p>แชท AI ช่วยรับฟัง แยกสิ่งที่เกิดขึ้นกับสิ่งที่เราคิด และช่วยมองทางเลือก โดยเธอเป็นคนตัดสินใจเอง</p><p>ทดลองแชทฟรี 14 วัน พร้อมสมุดบันทึกที่ผูกกับบัญชีของเธอ พร้อมเช็คอินและบันทึกเส้นทางดูแลใจ ส่วนการเลี้ยงไข่อยู่ในเฟส 2</p><small>AI อาจเข้าใจคลาดเคลื่อนได้ และไม่ใช่บริการฉุกเฉินหรือการรักษา</small></aside>
    </>}
    {notebookOpen && currentUser && <Notebook key={currentUser.id} ownerId={currentUser.id} onClose={()=>setNotebookOpen(false)}/>}
  </main>;
}


