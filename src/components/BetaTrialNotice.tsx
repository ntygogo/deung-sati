import { SubscriptionModal } from './SubscriptionModal';
import { useState } from 'react';
import { useBetaTrial } from '../context/BetaTrialContext';
export function BetaTrialNotice({compact=false}:{compact?:boolean}){
  const {trial,error,refresh}=useBetaTrial();
  const [billingOpen,setBillingOpen]=useState(false);
  return <aside className={compact?'beta-access-strip':'beta-trial-notice'}>
    {error ? <button onClick={()=>void refresh()}>ตรวจสอบสิทธิ์ไม่สำเร็จ · ลองอีกครั้ง ↻</button> : !trial ? <span role="status">กำลังโหลด…</span> : <>
      <strong>ใช้งานฟรี · ไม่มีวันหมดอายุ</strong>
      {trial.quota && <span role="status">วันนี้เหลือ {trial.quota.remaining}/{trial.quota.limit} ข้อความ · เริ่มใหม่เที่ยงคืนไทย{trial.quota.remaining===0?' · ยังอ่านประวัติและเขียนสมุดได้':''}</span>}
      <button onClick={()=>setBillingOpen(true)}>รายละเอียดและประวัติการชำระเงิน</button>
    </>}
    <SubscriptionModal isOpen={billingOpen} onClose={()=>setBillingOpen(false)}/>
  </aside>;
}
