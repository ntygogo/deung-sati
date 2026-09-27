import { createRoot } from 'react-dom/client';
import { useRef, useState } from 'react';
import { CurrentCompanion } from './components/CurrentCompanion';
import type { CompanionCaptureHandle } from './components/AxolotlWaterPreview';
import type { CompanionIdleKind } from './shared/companionIdleMotion';
import './components/ChatBetaHome.css';
import './companionReference.css';

const gestures: { kind: CompanionIdleKind; label: string; detail: string }[] = [
  { kind: 'scratch', label: 'เกาแก้ม', detail: 'คันนิดเดียวเอง' },
  { kind: 'curious', label: 'เอียงหัวสงสัย', detail: 'มีอะไรอยู่ตรงนั้นนะ' },
  { kind: 'glass', label: 'เคาะกระจก', detail: 'ขอเข้ามาดูใกล้ ๆ' },
  { kind: 'swim', label: 'ว่ายน้ำเล่น', detail: 'เดี๋ยวว่ายกลับมาหา' },
];
function Reference() {
  const model = useRef<CompanionCaptureHandle>(null);
  const [message, setMessage] = useState('');
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  async function save() {
    try {
      const url = await model.current!.capture('view');
      const link = document.createElement('a');
      link.href = url;
      link.download = 'deung-sati-idle-selfie.png';
      link.click();
      setMessage('บันทึกภาพแล้ว');
    } catch { setMessage('รอให้น้องโหลดเสร็จก่อนนะ'); }
  }
  return <main className="companion-reference">
    <header><span className="idle-eyebrow">DEUNG SATI</span><h1>อยู่เล่นกับน้อง</h1><p>ปล่อยให้น้องเล่นเอง หรือเลือกท่าที่อยากดู</p></header>
    <div className="idle-stage">
      <span className="idle-status">{failed ? 'เปิด 3D ไม่สำเร็จ' : !ready ? 'กำลังพาน้องมา…' : paused ? 'หยุดภาพไว้แล้ว' : 'น้องกำลังเล่นเอง'}</span>
      <CurrentCompanion captureRef={model} controls paused={paused} onReady={() => setReady(true)} onError={() => setFailed(true)} />
    </div>
    <div className="idle-gestures" aria-label="เลือกท่าของน้อง">
      {gestures.map(gesture => <button key={gesture.kind} disabled={!ready || paused} onClick={() => model.current?.playIdle(gesture.kind)}>
        <span>{gesture.label}</span><small>{gesture.detail}</small>
      </button>)}
    </div>
    <div className="idle-actions">
      <button disabled={!ready} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'เล่นต่อ' : 'หยุดภาพ'}</button>
      <button className="idle-save" disabled={!ready} onClick={save}>บันทึกภาพมุมนี้</button>
    </div>
    <p className="idle-help">น้องจะพักสักนิดก่อนเปลี่ยนท่า ลองรอดูว่าจะเข้ามาทักเมื่อไหร่ ♡</p>
    <p className="idle-message" role="status">{message}</p><a className="idle-back" href="/">กลับเข้าแอพ</a>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Reference />);
