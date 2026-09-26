import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { useCompanion, type CompanionData } from '../context/CompanionContext';
import { resolveCompanionAppearance } from '../shared/companionAppearance';
import { welcomeName } from '../shared/companionWelcome';
import { CompanionEgg } from './CompanionEgg';
import { AxolotlWaterPreview, type CompanionCaptureHandle } from './AxolotlWaterPreview';
import CompanionShareCard from './CompanionShareCard';
import './CompanionWelcome.css';

export function CompanionWelcome({companion}:{companion:CompanionData}) {
  const {welcomeCompanion}=useCompanion();
  const appearance=useMemo(()=>resolveCompanionAppearance(companion),[companion]);
  const [phase,setPhase]=useState<'egg'|'reveal'|'name'>('egg');
  const [modelReady,setModelReady]=useState(false);
  const [name,setName]=useState(companion.name||'น้องดึงสติ');
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const capture=useRef<CompanionCaptureHandle>(null);
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{heading.current?.focus();},[phase]);
  useEffect(()=>{
    if(phase!=='reveal'||!modelReady)return;
    const timer=setTimeout(()=>setPhase('name'),window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:2400);
    return ()=>clearTimeout(timer);
  },[phase,modelReady]);
  const save=async(event:FormEvent)=>{
    event.preventDefault();if(saving)return;
    let clean:string;try{clean=welcomeName(name);}catch(e){setError((e as Error).message);return;}
    setSaving(true);setError('');
    const result=await welcomeCompanion(clean);
    if(!result.success){setError(result.error||'ลองบันทึกอีกครั้งนะ');setSaving(false);}
  };
  return <main className="companion-welcome" data-phase={phase} data-model-ready={modelReady} style={{'--welcome-tint':appearance.palette.body} as CSSProperties}>
    <div className="welcome-panel">
      <span className="welcome-eyebrow">FIRST WONDERS</span>
      <h1 ref={heading} tabIndex={-1}>{phase==='egg'?'มีใครอยากเจอเธอ…':'สวัสดี โลกของเธอ ♡'}</h1>
      <p>{phase==='egg'?'20 ครั้งที่เธอค่อย ๆ เข้าใจตัวเอง วันนี้น้องพร้อมออกมาอยู่ข้างเธอแล้ว':'เพื่อนร่วมทางตัวนี้ มีชุดประจำตัวเพียงหนึ่งเดียวในคอลเลกชัน'}</p>
      <div className="welcome-stage">
        {phase==='egg'?<CompanionEgg traceCount={20} size={380} appearance={appearance} variant="room"/>:
          <AxolotlWaterPreview ref={capture} appearance={appearance} onReady={()=>setModelReady(true)} autoGreet showControls={phase==='name'}/>}
        <span className="welcome-orbit" aria-hidden="true"/>
      </div>
      {phase==='egg'?<div className="welcome-actions"><button type="button" className="welcome-primary" onClick={()=>setPhase('reveal')}>พบกับน้องของฉัน ✦</button><button type="button" onClick={()=>setPhase('name')}>ข้ามการเปิดตัว</button></div>:
        <>
          <p className="welcome-edition">#{String(appearance.collectibleSerial).padStart(5,'0')} / 62,208 · {appearance.palette.label}</p>
          {phase==='name'?<form onSubmit={save} className="welcome-form">
            <label htmlFor="welcome-name">อยากเรียกน้องว่าอะไร?</label>
            <input id="welcome-name" name="companionName" value={name} maxLength={80} disabled={saving} onChange={e=>setName(e.target.value)} autoComplete="off" aria-describedby={error?'welcome-error':undefined}/>
            {error&&<p id="welcome-error" role="alert">{error}</p>}
            <div className="welcome-actions"><button className="welcome-primary" type="submit" disabled={saving}>{saving?'กำลังบันทึก…':'พาน้องกลับบ้าน ♡'}</button>
              <CompanionShareCard appearance={appearance} displayName={name.trim()||companion.name} capture={()=>capture.current?capture.current.capture():Promise.reject(new Error('รอให้น้องโหลดเสร็จก่อนนะ'))}/>
            </div>
            <small>ชื่อน้องและหน้าตาจะตามไปกับบัญชีของเธอ</small>
          </form>:<button type="button" className="welcome-skip" onClick={()=>setPhase('name')}>ไปตั้งชื่อให้น้อง</button>}
        </>}
    </div>
  </main>;
}
