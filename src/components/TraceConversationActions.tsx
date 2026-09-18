import { useEffect, useState } from 'react';
import type { Conversation } from '../shared/conversation';
const buttonStyle = { border: '1px solid #d8cbe1', borderRadius: 16, padding: '10px 14px', background: '#fff', color: '#51375f', cursor: 'pointer', font: 'inherit' };
export function TraceConversationActions({ trace, history, resume, remove, isGuest }: {
  trace: any; history: (trace: any) => Promise<Conversation[]>; resume: (trace: any) => Promise<void>;
  remove: (trace: any) => Promise<void>; isGuest: boolean;
}) {
  const [docs, setDocs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const load = async () => {
    setLoading(true); setError('');
    try { setDocs(await history(trace)); } catch { setError('เปิดประวัติไม่สำเร็จ ลองอีกครั้งได้'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [trace.id]);
  const hasHistory = docs.some(d => d.messages.some(m => m.role === 'user'));
  return <section aria-label="คุยต่อจากลูป" style={{ background: '#faf6fc', borderRadius: 20, padding: 16, color: '#51375f', marginBottom: 12 }}>
    <p style={{ marginTop: 0 }}>กลับมาคุยเรื่องนี้ได้เสมอ</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <button style={buttonStyle} disabled={loading || !!error || !hasHistory} onClick={() => setReading(true)}>อ่านแชทเดิม</button>
      <button style={buttonStyle} disabled={loading || !!error} onClick={async () => {
        setLoading(true); try { await resume(trace); } catch { setError('เปิดแชทไม่สำเร็จ ลองอีกครั้งได้'); } finally { setLoading(false); }
      }}>{loading ? 'กำลังเปิด...' : hasHistory ? 'คุยเรื่องนี้ต่อ' : 'เริ่มคุยจากลูปนี้'}</button>
    </div>
    {!loading && !error && !hasHistory && <p>ยังไม่มีประวัติแชทของลูปนี้ เริ่มคุยจากสรุปที่บันทึกไว้ได้</p>}
    {isGuest && <p style={{ fontSize: 12 }}>โหมดทดลอง: ประวัติแชทเก็บในเบราว์เซอร์นี้เท่านั้น</p>}
    {error && <p role="alert">{error} <button onClick={load}>ลองใหม่</button></p>}
    {reading && <div role="dialog" aria-modal="true" aria-label="อ่านแชทเดิม" style={{ position: 'fixed', inset: 0, zIndex: 12000, background: '#faf6fc', color: '#302342', display: 'flex', flexDirection: 'column', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><h2>แชทเรื่อง {trace.title}</h2><button style={buttonStyle} onClick={() => setReading(false)}>ปิดประวัติ</button></div>
      <p>อ่านอย่างเดียว · บันทึกลูปและคะแนนยังคงเดิม</p>
      <div style={{ overflowY: 'auto', flex: 1, maxWidth: 640, width: '100%', margin: '0 auto' }}>
        {docs.map((doc, i) => <section key={doc.id}>
          <h3>{doc.parentTraceId ? 'คุยต่อจากลูป' : 'บทสนทนาต้นทาง'} · {new Date(doc.messages[0]?.createdAt || doc.updatedAt).toLocaleDateString('th-TH')}</h3>
          {doc.messages.map(m => <div key={`${i}-${m.id}`} style={{ margin: '12px 0', marginLeft: m.role === 'user' ? 32 : 0, padding: 16, background: m.role === 'user' ? '#e3eadc' : '#fff', borderRadius: 20, whiteSpace: 'pre-wrap' }}><small>{m.role === 'user' ? 'คุณ' : 'เพื่อนร่วมทาง'}</small><p>{m.text}</p></div>)}
        </section>)}
      </div>
      {confirmDelete ? <div><p>ลบแชททั้งหมดที่เชื่อมกับลูปนี้? สรุปลูปยังอยู่ แต่กู้ข้อความที่ลบไม่ได้</p><button style={buttonStyle} onClick={async () => { setLoading(true); try { await remove(trace); setReading(false); setConfirmDelete(false); await load(); } catch { setError('ลบไม่สำเร็จ ลองใหม่อีกครั้ง'); } finally { setLoading(false); } }} disabled={loading}>ยืนยันลบประวัติ</button> <button style={buttonStyle} onClick={() => setConfirmDelete(false)}>เก็บไว้</button></div> : <button style={buttonStyle} onClick={() => setConfirmDelete(true)}>ลบประวัติแชทของลูปนี้</button>}
    </div>}
  </section>;
}
