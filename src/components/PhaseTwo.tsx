import './Notebook.css';
export function PhaseTwo({onClose,onNotebook}:{onClose:()=>void;onNotebook:()=>void}) {
  return <main className="notebook-page phase-two">
    <button className="journal-back" onClick={onClose}>← กลับหน้าหลัก</button>
    <header><span className="journal-eyebrow">PHASE 02 · COMING SOON</span><div className="phase-egg" aria-hidden="true">✦</div><h1>ทุกครั้งที่เข้าใจตัวเอง<br/>บางสิ่งก็ค่อย ๆ เติบโต</h1><p>จากเรื่องราวของเธอ สู่เพื่อนร่วมทางที่มีเอกลักษณ์เฉพาะตัว</p></header>
    <section className="journal-paper"><h2>เรากำลังเตรียมอะไรให้เธอ</h2><ol className="phase-steps">
      <li><strong>บันทึกลูปที่กลับมาเจอบ่อย ๆ</strong><p>เก็บเหตุการณ์ ความคิด ความรู้สึก และสิ่งที่เราเลือกทำ เพื่อค่อย ๆ มองเห็นรูปแบบของตัวเอง</p></li>
      <li><strong>สรุปให้เห็นภาพ พร้อมให้เธอทบทวน</strong><p>ช่วยเรียบเรียงสิ่งที่บันทึก และชวนสังเกตสิ่งที่เกิดขึ้นซ้ำ โดยเธอตรวจและแก้ความเข้าใจได้</p></li>
      <li><strong>แบบฝึกหัดและบทความที่เข้ากับเรื่องนั้น</strong><p>ต่อยอดจากการบันทึกด้วยสิ่งเล็ก ๆ ที่เลือกลองทำ หรืออ่านเพิ่มเติมเมื่อพร้อม</p></li>
      <li><strong>เลี้ยงไข่ให้เป็นน้องในแบบของเธอ</strong><p>ให้การกลับมาดูแลตัวเองเป็นส่วนหนึ่งของการเติบโตของน้อง ที่มีเอกลักษณ์จากเรื่องราวของคุณ</p></li>
    </ol></section>
    <aside className="journal-note"><strong>ทั้งหมดนี้อยู่ระหว่างพัฒนา</strong><p>ยังไม่เปิดบันทึกลูป สรุป AI แนะนำแบบฝึกหัดหรือบทความ และเลี้ยงไข่ในเฟส 2 ยังไม่มีกำหนดเปิดตัว และไม่รับรองว่าจะเปิดภายในสิทธิ์ 30 วันที่ซื้อ</p></aside>
    <section className="phase-now"><h2>วันนี้ เริ่มจากหน้ากระดาษของเธอได้เลย</h2><p>แชทกับน้องดึงสติ และสมุดบันทึกพร้อมให้ใช้แล้ว</p><button className="journal-primary" onClick={onNotebook}>เปิดสมุดบันทึก</button></section>
  </main>;
}
