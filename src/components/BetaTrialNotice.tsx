import { SubscriptionModal } from './SubscriptionModal';
import { useState } from 'react';
import { useBetaTrial } from '../context/BetaTrialContext';
export function BetaTrialNotice(){
  const {trial,error,refresh,expressInterest}=useBetaTrial();
  const [busy,setBusy]=useState(false);
  const [billingOpen,setBillingOpen]=useState(false);
  if(error)return <aside className="beta-trial-notice" role="alert">{error} <button onClick={()=>void refresh()}>ลองอีกครั้ง</button></aside>;
  if(!trial)return <aside className="beta-trial-notice" role="status">กำลังตรวจสอบสิทธิ์ทดลอง…</aside>;
  const until=trial.expiresAt?new Date(trial.expiresAt).toLocaleString('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
  return <aside className="beta-trial-notice" data-expired={trial.state==='expired'}>
    {trial.paidUntil && trial.state==='active'?<><strong>สิทธิ์ชำระเงิน{trial.paymentMode === 'test' ? 'ทดสอบ' : ''} · เหลือ {trial.daysRemaining} วัน</strong><span>ใช้ได้ถึง {until} น. {trial.daysRemaining<=3?'· ใกล้หมดอายุแล้ว':''}</span></>:trial.state==='not_started'?<><strong>ทดลองแชทฟรี 14 วัน</strong><span>เริ่มนับเมื่อส่งข้อความแรก · ไม่มีการเรียกเก็บเงินอัตโนมัติ</span></>:
    trial.state==='active'?<><strong>{trial.daysRemaining<=3?'ใกล้ครบช่วงทดลองแล้ว':'กำลังทดลองแชทฟรี'} · เหลือ {trial.daysRemaining} วัน</strong><span>ใช้ได้ถึง {until} น. (เวลาไทย)</span></>:
    <><strong>ครบช่วงทดลองแล้ว ขอบคุณที่มาลองด้วยกันนะ</strong><span>ยังย้อนอ่านประวัติและเขียนสมุดได้ สนับสนุนนัตตี้เพื่อเพิ่มสิทธิ์แชทได้</span><button disabled={busy||trial.interested} onClick={async()=>{setBusy(true);await expressInterest();setBusy(false);}}>{trial.interested?'บันทึกความสนใจแล้ว ♡':busy?'กำลังบันทึก…':'อยากใช้ต่อ'}</button></>}
    {trial.quota && trial.state !== 'expired' && <span role="status">วันนี้เหลือ {trial.quota.remaining}/{trial.quota.limit} ข้อความ · เริ่มใหม่เที่ยงคืนไทย{trial.quota.remaining <= 5 && trial.quota.remaining > 0 ? ' · เหลือไม่มากแล้ว หากอยากสรุปเรื่องที่คุย บอกน้องได้เลยนะ' : ''}{trial.quota.remaining === 0 ? ' · ยังอ่านประวัติและเขียนสมุดได้' : ''}</span>}
    <button onClick={()=>setBillingOpen(true)}>สนับสนุนนัตตี้ 149 บาท · เพิ่ม 30 วัน</button>
    <SubscriptionModal isOpen={billingOpen} onClose={()=>setBillingOpen(false)}/>
  </aside>;
}


