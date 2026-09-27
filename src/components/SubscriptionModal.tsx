import { CHAT_LIMITS } from '../shared/chatQuota';
import { useEffect, useRef, useState } from 'react';
import { authHeaders } from '../utils/authHeaders';
import { useBetaTrial } from '../context/BetaTrialContext';
import type { BetaTrialStatus } from '../shared/betaTrial';
import '../billing.css';

interface Order { id:string;amount:number;status:string;createdAt:string;startsAt:string|null;expiresAt:string|null;refundedAmount:number;mode:'test' }
interface Status { mode:'test';enabled:boolean;isAdmin:boolean;plan:{amount:number;days:number};access:BetaTrialStatus;orders:Order[] }
interface Usage {model:string;attempts:number;estimated_usd:number|null;unpriced_attempts:number}
interface Report {since:string;sales:{gross_satang:number;refunded_satang:number};usage:Usage[];perUser:{user_id:string|null;attempts:number;estimated_usd:number|null;unpriced_attempts:number}[];orders:Record<string,unknown>[];trial:{started:number};buyers:{buyers:number};note:string}
const baht = (satang:number) => (satang/100).toLocaleString('th-TH',{style:'currency',currency:'THB'});
const date = (value:string|null) => value ? new Date(value).toLocaleString('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'medium',timeStyle:'short'}) : '—';
const labels:Record<string,string> = {pending:'รอยืนยันการชำระ',paid:'ชำระแล้ว',expired:'รายการหมดอายุ',failed:'ชำระไม่สำเร็จ',refunded:'คืนเงินครบแล้ว',partially_refunded:'คืนเงินบางส่วน'};
async function api<T>(path:string,method='GET'):Promise<T> {
  const res=await fetch('/api/billing'+path,{method,credentials:'include',headers:authHeaders(),...(method==='POST'?{body:'{}'}:{})});
  const data=await res.json();
  if(!res.ok) throw new Error(data.error || 'ยังเชื่อมต่อระบบชำระเงินไม่ได้');
  return data as T;
}

export function SubscriptionModal({isOpen,onClose}:{isOpen:boolean;onClose:()=>void;onUpgradeSuccess?:()=>void;isAlreadyPlus?:boolean;onOpenAuth?:()=>void}) {
  return isOpen ? <BillingPanel onClose={onClose}/> : null;
}
function BillingPanel({onClose}:{onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [status,setStatus]=useState<Status|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [report,setReport]=useState<Report|null>(null);
  const {refresh}=useBetaTrial();
  useEffect(()=>{ dialog.current?.showModal(); },[]);
  useEffect(()=>{
    let disposed=false;
    let timer:ReturnType<typeof setTimeout>|undefined;
    let attempts=0;
    const params=new URLSearchParams(window.location.search);
    const returnedOrder=params.get('order');
    const isReturn=params.get('billing')==='return' && /^[a-f0-9-]{36}$/.test(returnedOrder || '');
    async function load(){
      try {
        let data=await api<Status>('/status');
        const order=data.orders.find(o=>o.id===returnedOrder);
        if(isReturn && data.enabled && order?.status==='pending' && attempts<12) {
          attempts++;
          await api('/orders/'+returnedOrder+'/reconcile','POST');
          data=await api<Status>('/status');
        }
        if(disposed)return;
        setStatus(data);setError('');await refresh();
        if(isReturn && data.orders.some(o=>o.id===returnedOrder && o.status==='pending') && attempts<12 && data.enabled) timer=setTimeout(()=>void load(),5000);
      } catch(e){if(!disposed)setError((e as Error).message);}
    }
    void load();
    return()=>{disposed=true;if(timer)clearTimeout(timer);};
  },[refresh]);
  async function reload(){setBusy(true);try{setStatus(await api<Status>('/status'));setError('');await refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function checkout(){
    setBusy(true);setError('');
    try {const result=await api<{url:string}>('/checkout','POST');const url=new URL(result.url);
      if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw new Error('ลิงก์ชำระเงินไม่ถูกต้อง');
      window.location.assign(url.href);
    }catch(e){setError((e as Error).message);setBusy(false);}
  }
  async function reconcile(id:string){setBusy(true);try{await api('/orders/'+id+'/reconcile','POST');await reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function loadReport(){setBusy(true);try{setReport(await api<Report>('/admin/report'));setError('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  function exportOrders(){
    if(!report)return;
    const keys=['id','user_id','status','amount','refunded_amount','created_at','paid_at','starts_at','expires_at'];
    const cell=(v:unknown)=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
    const csv='\uFEFF'+[keys.join(','),...report.orders.map(o=>keys.map(k=>cell(o[k])).join(','))].join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download='deung-sati-test-orders.csv';anchor.click();URL.revokeObjectURL(url);
  }
  return <dialog className="billing-dialog" ref={dialog} aria-labelledby="billing-title" onCancel={onClose}>
    <header><div><small>ดึงสติ · บัญชีของฉัน</small><h2 id="billing-title">สิทธิ์ใช้งานและการชำระเงิน</h2></div><button onClick={onClose} aria-label="ปิด">✕</button></header>
    <p className="billing-test">โหมดทดสอบ · ไม่มีการเรียกเก็บเงินจริง</p>
    {error&&<p role="alert" className="billing-error">{error} <button disabled={busy} onClick={()=>void reload()}>ลองอีกครั้ง</button></p>}
    {!status&&!error&&<p role="status">กำลังโหลดสิทธิ์ใช้งาน…</p>}
    {status&&<>
      <section className="billing-plan"><h3>อยู่กับดึงสติต่ออีก 30 วัน</h3><p className="billing-price">{baht(status.plan.amount)} <span>/ 30 วัน</span></p>
        <p>คุยกับ AI เพื่อทบทวนเรื่องในใจ และย้อนอ่านบทสนทนาของตัวเอง</p>
        <p>แชทได้ {CHAT_LIMITS.paid} ข้อความ/วัน · ทดลองฟรี {CHAT_LIMITS.trial} ข้อความ/วัน เป็นเวลา 14 วัน</p>
        <p>รีเซ็ตเที่ยงคืนเวลาไทย · ครั้งละไม่เกิน 4,000 ตัวอักษร · ข้อความที่ระบบตอบไม่สำเร็จไม่หักโควตา</p>
        <p>จ่ายเป็นครั้ง ๆ ไม่มีการต่ออายุหรือตัดเงินอัตโนมัติ</p>
        <p>{status.access.state==='not_started'?'ยังไม่ได้เริ่มทดลองฟรี 14 วัน':status.access.state==='expired'?'สิทธิ์แชทหมดแล้ว ยังย้อนอ่านประวัติได้':`สิทธิ์ปัจจุบันถึง ${date(status.access.expiresAt)} น. (เวลาไทย)`}</p>
        <p>ซื้อก่อนหมดอายุ: เพิ่มวันต่อจากสิทธิ์เดิม ซื้อหลังหมดอายุ: เริ่มเมื่อยืนยันยอดสำเร็จ</p>
        <button className="billing-primary" disabled={!status.enabled||busy} onClick={()=>void checkout()}>{busy?'กำลังดำเนินการ…':'ทดสอบชำระด้วยพร้อมเพย์'}</button>
        {!status.enabled&&<p className="billing-muted">ยังไม่เปิดขาย ขณะนี้เตรียมระบบและทดสอบเฉพาะบัญชีที่กำหนดไว้ ราคาและโควตาจะยืนยันก่อนเปิดขายจริง</p>}
      </section>
      <section><h3>ประวัติการชำระเงิน</h3><button disabled={busy} onClick={()=>void reload()}>อัปเดตข้อมูล</button>
        {!status.orders.length?<p className="billing-muted">ยังไม่มีรายการชำระเงิน</p>:<ul className="billing-orders">{status.orders.map(o=><li key={o.id}>
          <div><strong>{baht(o.amount)} · {labels[o.status]||o.status}</strong><span className="billing-tag">ทดสอบ</span></div>
          <p>{date(o.createdAt)} · รายการ {o.id.slice(0,8)}</p>
          {o.expiresAt&&<p>ช่วงสิทธิ์: {date(o.startsAt)} – {date(o.expiresAt)}</p>}
          {o.refundedAmount>0&&<p>คืนเงินแล้ว {baht(o.refundedAmount)} {o.status==='refunded'?'· สิทธิ์จากรายการนี้ถูกยกเลิก':''}</p>}
          {o.status==='pending'&&<button disabled={busy||!status.enabled} onClick={()=>void reconcile(o.id)}>ตรวจสอบยอดอีกครั้ง</button>}
          <a href={`mailto:puksorn.gg@gmail.com?subject=${encodeURIComponent('สอบถามการชำระเงิน '+o.id)}`}>แจ้งปัญหา / ขอคืนเงิน</a>
        </li>)}</ul>}
        <p className="billing-muted">ถ้าจ่ายแล้วแต่สิทธิ์ยังไม่ขึ้น ให้ตรวจสอบยอดอีกครั้งก่อนสร้างรายการใหม่ การกลับจากหน้าชำระเงินอย่างเดียวไม่ถือว่าจ่ายสำเร็จ</p>
      </section>
      {status.isAdmin&&<section><h3>หลังบ้านสำหรับผู้ดูแล</h3><button disabled={busy} onClick={()=>void loadReport()}>ดูรายงาน 30 วัน</button>
        {report&&<><p>{report.note}</p><p>ยอดทดสอบ {baht(Number(report.sales.gross_satang))} · คืนเงิน {baht(Number(report.sales.refunded_satang))}</p>
          <p>เริ่มทดลอง {report.trial.started} บัญชี · ผู้ซื้อทดสอบ {report.buyers.buyers} บัญชี (ไม่ใช่อัตราเปลี่ยนเป็นลูกค้าของกลุ่มเดียวกัน)</p>
          <div className="billing-table"><table><thead><tr><th>โมเดล</th><th>เรียกใช้</th><th>ต้นทุนที่ประเมินได้ USD</th><th>ยังไม่ทราบต้นทุน</th></tr></thead><tbody>{report.usage.map(u=><tr key={u.model}><td>{u.model}</td><td>{u.attempts}</td><td>{u.estimated_usd===null?'ยังไม่มีราคา':Number(u.estimated_usd).toFixed(4)}</td><td>{u.unpriced_attempts}</td></tr>)}</tbody></table></div>
          <details><summary>ต้นทุนแยกตามบัญชี (ไม่แสดงข้อความแชท)</summary>{report.perUser.map(u=><p key={u.user_id||'deleted'}>{u.user_id?.slice(0,8)||'บัญชีถูกลบ'} · {u.attempts} ครั้ง · {u.estimated_usd===null?'ยังไม่มีราคา':`$${Number(u.estimated_usd).toFixed(4)}`} · ยังไม่ทราบต้นทุน {u.unpriced_attempts} ครั้ง</p>)}</details>
          <button onClick={exportOrders}>ดาวน์โหลดรายการทดสอบล่าสุด 100 รายการ (CSV)</button>
          <p className="billing-muted">ยอดเงินจริง ค่าธรรมเนียม และเงินโอนเข้าธนาคารต้องตรวจจากผู้ให้บริการหลังเปิดระบบจริง การคืนเงินทดสอบทำผ่าน Stripe Dashboard แล้วระบบจะรับสถานะกลับมา</p>
        </>}
      </section>}
    </>}
  </dialog>;
}
export function BillingReturn(){
  const [open,setOpen]=useState(()=>['return','cancel'].includes(new URLSearchParams(window.location.search).get('billing')||''));
  function close(){const url=new URL(window.location.href);url.searchParams.delete('billing');url.searchParams.delete('order');window.history.replaceState({},'',url);setOpen(false);}
  return <SubscriptionModal isOpen={open} onClose={close}/>;
}

