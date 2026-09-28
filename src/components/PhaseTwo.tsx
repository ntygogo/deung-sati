import { useState } from 'react';
import { ArrowDown, BookOpen, Heart, Sparkles } from 'lucide-react';
import { CompanionRenderer } from './CompanionRenderer';
import { Notebook } from './Notebook';
import { useAuth } from '../context/AuthContext';
import './Notebook.css';
export function PhaseTwo({onClose}:{onClose:()=>void}) {
  const {currentUser}=useAuth();
  const [notebookOpen,setNotebookOpen]=useState(false);
  const [greeted,setGreeted]=useState(false);
  return <main className="phase-preview">
    <header className="phase-top"><button onClick={onClose} aria-label="กลับหน้าหลัก">←</button><span>THE NEXT CHAPTER</span><span className="phase-pill">COMING SOON</span></header>
    <section className="phase-hero" aria-labelledby="phase-title">
      <span className="phase-orbit orbit-one" aria-hidden="true"/><span className="phase-orbit orbit-two" aria-hidden="true"/>
      <p className="phase-whisper">มีใครบางคน…กำลังรอเจอเธอ</p>
      <h1 id="phase-title">ไข่ใบนี้<br/><em>จะโตเป็นใครนะ?</em></h1>
      <div className="phase-egg-stage" onClick={()=>setGreeted(true)}>
        <span className="phase-stardust star-a" aria-hidden="true">✧</span><span className="phase-stardust star-b" aria-hidden="true">✦</span>
        <CompanionRenderer stage={0} traceCount={0} size={300} previewLabel="แตะทักทายน้องดึงสติในไข่ ตัวอย่างเฟส 2"/>
        <span className="phase-egg-shadow" aria-hidden="true"/>
      </div>
      <p className="phase-touch" aria-live="polite">{greeted?'น้องรู้แล้วว่ามีเธออยู่ตรงนี้ ♡':'แตะไข่เบา ๆ เพื่อทักทายน้อง ♡'}</p>
      <p className="phase-promise">เพื่อนร่วมทางที่ค่อย ๆ มีเอกลักษณ์<br/>จากเรื่องราวและการเติบโตของเธอ</p>
      <a className="phase-discover" href="#phase-story">แอบดูสิ่งที่กำลังมา <ArrowDown size={17}/></a>
    </section>
    <section className="phase-story" id="phase-story"><span className="phase-kicker">YOUR STORY, THEIR BEGINNING</span><h2>เมื่อเธอเข้าใจตัวเองมากขึ้น<br/>น้องก็เติบโตไปด้วยกัน</h2><p className="phase-story-intro">เรากำลังเชื่อมการดูแลใจ กับการเลี้ยงเพื่อนตัวเล็ก ๆ ให้ทุกครั้งที่กลับมา มีเรื่องราวให้มองย้อนกลับไป</p>
      <article><span className="phase-step-icon"><BookOpen size={23}/></span><div><small>01 · มองเห็นตัวเอง</small><h3>ลูปเดิม ๆ กำลังบอกอะไรเรา?</h3><p>บันทึกเหตุการณ์ ความคิด และความรู้สึก พร้อมสรุปให้ทบทวนว่าอะไรเกิดขึ้นซ้ำ</p></div></article>
      <article><span className="phase-step-icon rose"><Heart size={23}/></span><div><small>02 · ลองดูแลใจอีกแบบ</small><h3>ไม่จบแค่รู้ แต่มีสิ่งให้ลองต่อ</h3><p>แบบฝึกหัดและบทความที่เชื่อมกับเรื่องของเธอ เลือกอ่านหรือลองทำเมื่อพร้อม</p></div></article>
      <article><span className="phase-step-icon gold"><Sparkles size={23}/></span><div><small>03 · เติบโตไปด้วยกัน</small><h3>น้องในแบบที่เรื่องราวของเธอสร้าง</h3><p>ดูแลไข่และค่อย ๆ พบเอกลักษณ์ของเพื่อนร่วมทาง จากการกลับมาทำความเข้าใจตัวเอง</p></div></article>
    </section>
    <section className="phase-letter"><span aria-hidden="true">♡</span><h2>ระหว่างรอน้องตื่น…<br/>เก็บเรื่องของวันนี้ไว้ก่อนนะ</h2><p>สมุดของเธอพร้อมแล้ว<br/>เริ่มจากหนึ่งเรื่องที่อยากขอบคุณก็พอ</p><button onClick={()=>setNotebookOpen(true)} disabled={!currentUser}><BookOpen size={18}/> เปิดสมุดของฉัน</button></section>
    <p className="phase-disclaimer">เฟส 2 อยู่ระหว่างพัฒนา ยังไม่เปิดเลี้ยงไข่ สรุปลูป หรือแนะนำแบบฝึกหัดและบทความ ยังไม่มีกำหนดเปิดตัว · ภาพไข่นี้เป็นตัวอย่าง การแตะทักทายไม่เพิ่มความคืบหน้า</p>
    {notebookOpen&&currentUser&&<Notebook key={currentUser.id} ownerId={currentUser.id} onClose={()=>setNotebookOpen(false)}/>}
  </main>;
}
