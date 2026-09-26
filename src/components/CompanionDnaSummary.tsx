import { resolveCompanionAppearance, type CompanionAppearanceSource } from '../shared/companionAppearance';
export function CompanionDnaSummary({source}: {source: CompanionAppearanceSource}) {
  const appearance = resolveCompanionAppearance(source);
  return <details style={{margin:'12px 0',padding:'12px 16px',borderRadius:16,background:'rgba(255,255,255,.08)',fontSize:13,lineHeight:1.7}}>
    <summary style={{cursor:'pointer'}}>สี ลาย และจังหวะของน้องมาจากไหน?</summary>
    <p>สี {appearance.palette.label} · ลาย {appearance.traits.pattern.label} · จังหวะ {appearance.traits.motion.label}</p>
    <p>{appearance.hasBirthSnapshot ? 'น้องเก็บลักษณะตอนฟักไว้แล้ว เปิดใหม่ก็ยังเป็นน้องตัวเดิม' : 'ก่อนฟักน้องใช้ลักษณะตั้งต้น เมื่อครบ 20 ลูปที่ยืนยัน ระบบจะบันทึกลักษณะตอนเกิด'}</p>
    <p>น้องที่ฟักด้วยระบบใหม่นำด้านที่ได้ฝึกบ่อยที่สุดมากำหนดลายและจังหวะ:</p>
    <ul style={{paddingLeft:20}}><li>สังเกตอารมณ์ → กลีบดอก / พลิ้วพักใจ</li><li>รับรู้ร่างกาย → เส้นน้ำ / ลอยช้า</li><li>แยกความคิดให้ชัด → กลุ่มดาว / เอียงหัวสำรวจ</li><li>เลือกการกระทำ → จุดไข่มุก / ลอยขี้เล่น</li></ul>
    <p>ถ้าเท่ากัน ใช้รหัสตั้งต้นของน้องเลือกอย่างคงที่ ทุกแบบมีคุณค่าเท่ากัน รูปทรงครีบและหางยังใช้โมเดลร่วมกัน และยังไม่รับประกันหน้าตาไม่ซ้ำ</p>
  </details>;
}
