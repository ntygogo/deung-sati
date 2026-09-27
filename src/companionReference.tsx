import { createRoot } from 'react-dom/client';
import { useRef, useState } from 'react';
import { CurrentCompanion } from './components/CurrentCompanion';
import type { CompanionCaptureHandle } from './components/AxolotlWaterPreview';
import './components/ChatBetaHome.css';
function Reference() {
  const model = useRef<CompanionCaptureHandle>(null);
  const [message, setMessage] = useState('');
  async function save() {
    try { const url = await model.current!.capture(); const link = document.createElement('a'); link.href = url; link.download = 'deung-sati-corrected-gills.png'; link.click(); setMessage('บันทึกภาพแล้ว'); }
    catch { setMessage('รอให้น้องโหลดเสร็จก่อนนะ'); }
  }
  return <main style={{maxWidth:600,margin:'24px auto',padding:20,textAlign:'center',fontFamily:'Noto Sans Thai, sans-serif',color:'#62465f'}}>
    <h1>น้องดึงสติ · ต้นแบบปัจจุบัน</h1><p>เวอร์ชันแก้เหงือก · 26 กันยายน 2026</p>
    <div style={{height:450,background:'linear-gradient(#f5e6f1,#fff1e5)',borderRadius:32}}><CurrentCompanion captureRef={model} controls /></div>
    <p>หมุนดูตัวน้อง หรือกดทักทายแล้วบันทึกภาพท่าที่ชอบ</p><button onClick={save} style={{padding:'12px 24px',borderRadius:24,border:0,background:'#805b80',color:'white',font:'inherit'}}>บันทึกภาพจากโมเดลปัจจุบัน</button><p role="status">{message}</p><a href="/">กลับเข้าแอพ</a>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Reference />);
