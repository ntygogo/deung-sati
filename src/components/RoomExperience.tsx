import { authHeaders } from '../utils/authHeaders';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Eye, Heart, Sparkles, CloudSun, X, MessageCircle } from 'lucide-react';
import { useCompanion } from '../context/CompanionContext';
import { CurrentCompanion } from './CurrentCompanion';
import { CompanionRenderer } from './CompanionRenderer';
import type { CompanionCaptureHandle } from './AxolotlWaterPreview';
import { ROOM_ACTIONS, ROOM_WEATHERS, type RoomState, type RoomEvent, type RoomWeather } from '../shared/roomProgress';
import './RoomExperience.css';
const WEATHER_LABELS = { sunny: 'แดดอ่อน', rain: 'ฝนพรำ', mist: 'หมอก', snow: 'หิมะ' };
const QUOTES = { feed: 'ขอบคุณที่ดูแลเรา อย่าลืมดูแลตัวเองด้วยนะ', ball: 'วันนี้มีช่วงดี ๆ เล็ก ๆ เพิ่มมาอีกแล้ว', pet: 'ดีใจที่ได้อยู่ตรงนี้ด้วยกันนะ', rest: 'ยังไม่ต้องทำทุกอย่างให้เสร็จก็ได้ พักตรงนี้ก่อนนะ' };
async function api(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`/api/room${path}`, { method, credentials: 'include', headers: authHeaders(), ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!res.ok) throw new Error('ยังเชื่อมต่อห้องไม่ได้ ลองอีกครั้งนะ');
  return res.json();
}
export function RoomExperience({ onBack, onOpenChat }: { onBack: () => void; onOpenChat: () => void }) {
  const { companion, traceCount, wallet } = useCompanion();
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState('');
  const [hidden, setHidden] = useState(false);
  const [panel, setPanel] = useState<'weather' | 'actions' | null>(null);
  const [quote, setQuote] = useState('ดีใจที่ได้เจอ วันนี้มาอยู่ด้วยกันสักพักนะ');
  const [position, setPosition] = useState({ x: 50, y: 70 });
  const [walking, setWalking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ballPlaying, setBallPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [ackBusy, setAckBusy] = useState(false);
  const model = useRef<CompanionCaptureHandle>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const active = useRef(true);
  const event = state?.events[0];
  const egg = companion?.stage === 0;
  const refresh = useCallback(async () => { try { const data = await api(''); if(active.current) { setState(data); setError(''); } } catch(e) { if(active.current) setError((e as Error).message); } }, []);
  useEffect(() => { const pendingTimers = timers.current; active.current = true; void refresh(); const visible = () => { if (!document.hidden) void refresh(); }; document.addEventListener('visibilitychange', visible); window.addEventListener('focus',visible); return () => { active.current = false; pendingTimers.forEach(clearTimeout); document.removeEventListener('visibilitychange', visible); window.removeEventListener('focus',visible); }; }, [refresh]);
  useEffect(() => { const t = setTimeout(() => setQuote(''), 6500); return () => clearTimeout(t); }, [quote]);
  const later = (fn: () => void, delay: number) => { timers.current.push(setTimeout(fn, delay)); };
  const interact = async (action: keyof typeof QUOTES) => {
    if (busy || !state || event || (!egg && !ready)) return;
    if (egg && action !== 'pet') { setQuote('อยู่เป็นเพื่อนกันก่อนนะ อีกหน่อยเราจะได้เล่นด้วยกัน'); return; }
    setBusy(true); setError('');
    const targets = { feed: {x:35,y:75}, ball: {x:68,y:76}, rest: {x:78,y:38}, pet:{x:50,y:72} };
    if (!egg) { setWalking(true); model.current?.roomAction('pet'); setPosition(targets[action]); }
    later(() => {
      setWalking(false); model.current?.roomAction(action); setQuote(QUOTES[action]);
      if(action === 'ball') setBallPlaying(true);
      later(() => { setBallPlaying(false); setBusy(false); }, 2200);
      void api('/interact', 'POST', {action, requestId: crypto.randomUUID()}).then(data => { if(active.current) setState(data); }).catch(e => { if(active.current) setError(e.message); });
    }, egg || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 1800);
  };
  const acknowledge = useCallback(async (tryAction = false) => {
    if(!event || ackBusy) return;
    setAckBusy(true);
    try {
      await api(`/events/${encodeURIComponent(event.id)}/seen`, 'POST');
      if(tryAction) { const action = ROOM_ACTIONS.find(a => a.id === event.payload.unlocks?.[0]); if(action) model.current?.playIdle(action.id); }
      setState(prev => prev ? {...prev, events:prev.events.filter(e => e.id !== event.id)} : prev);
      setError('');
    } catch(e) { setError((e as Error).message); } finally { setAckBusy(false); }
  }, [event, ackBusy]);
  useEffect(() => {
    if(!event || event.payload.unlocks?.length || (!egg && !ready)) return;
    // The event remains on the account until its animation has had time to play.
    const t = setTimeout(() => { if(!document.hidden) void acknowledge(); }, 5200);
    return () => clearTimeout(t);
  }, [event, acknowledge, egg, ready]);
  const weather = state?.weather || 'sunny';
  const chooseWeather = async (value: RoomWeather) => { try { setState(await api('/weather','PUT',{weather:value})); setPanel(null); setError(''); } catch(e) { setError((e as Error).message); } };
  return <main className={`living-room weather-${weather} ${hidden ? 'controls-hidden' : ''}`} aria-label="ห้องของน้องดึงสติ">
    <div className="room-stage">
      <img className="room-background" src="/images/room/background.webp" alt="ห้องไม้แสงอุ่น มองเห็นสวนผ่านหน้าต่าง" />
      <div className="room-weather" aria-hidden="true">{Array.from({length:35},(_,i)=><i key={i} style={{left:`${(i*37)%100}%`,animationDelay:`-${i*.37}s`,animationDuration:`${weather==='snow'?6+i%4:1+i%3*.2}s`}} />)}</div>
      <div className="room-light" aria-hidden="true" />
      <button className="room-bed" aria-label="ชวนน้องไปนอน" disabled={busy} onClick={()=>void interact('rest')}><span>พักด้วยกัน</span></button>
      <button className="room-prop room-food" aria-label="ป้อนอาหารน้อง" disabled={busy} onClick={()=>void interact('feed')}><img src="/images/room/bowl.webp" alt="" /><span>ป้อนอาหาร</span></button>
      <button className={`room-prop room-ball ${ballPlaying?'playing':''}`} aria-label="เล่นลูกบอลกับน้อง" disabled={busy} onClick={()=>void interact('ball')}><img src="/images/room/ball.webp" alt="" /><span>เล่นด้วยกัน</span></button>
      <div className={`room-pet ${event?.kind==='growth'?'receiving-growth':''}`} style={{left:`${position.x}%`,top:`${position.y}%`,zIndex:Math.round(position.y),transform:`translate(-50%,-85%) scale(${.78+(position.y-49)*.01})`}}>
        {egg ? <CompanionRenderer stage={0} traceCount={traceCount} dna={companion?.dna} size={280} onPet={()=>void interact('pet')}/> : <CurrentCompanion source={companion || undefined} captureRef={model} allowedIdleKinds={ROOM_ACTIONS.filter(a=>a.bond <= (state?.bond || 0)).map(a=>a.id)} walking={walking} onPet={()=>void interact('pet')} onReady={()=>setReady(true)} onError={()=>setError('โหลดน้องไม่สำเร็จ ลองเปิดห้องอีกครั้งนะ')} />}
      </div>
      <img className="room-foreground" src="/images/room/foreground.webp" alt="" />
      {event?.kind==='growth' && <div className="room-growth-particles" key={event.id} aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{animationDelay:`${i*.12}s`,left:`${20+i*5}%`}}>✦</i>)}</div>}
    </div>
    {!hidden && <>
      <header className="room-header"><button onClick={onBack} aria-label="กลับหน้าหลัก"><ArrowLeft size={20}/></button><div><strong>{companion?.name || 'น้องดึงสติ'}</strong><small>{egg?`ไข่แห่งการเติบโต · ${Math.min(20,traceCount)}/20`:`เลเวล ${wallet.level}`}</small></div><button onClick={()=>setPanel('actions')} aria-label={`ความสนิท ${state?.bond || 0}`}><Heart size={18}/><span>{state?.bond || 0}</span></button></header>
      {quote && !event && <p className="room-quote" role="status">{quote}</p>}
      <footer className="room-tools"><button onClick={()=>setPanel('weather')} aria-label="เลือกอากาศ"><CloudSun size={21}/><span>{WEATHER_LABELS[weather]}</span></button><button onClick={()=>setPanel('actions')}><Sparkles size={21}/><span>แอคชั่น</span></button><button onClick={onOpenChat}><MessageCircle size={21}/><span>คุยพักใจ</span></button></footer>
    </>}
    <button className="room-hide" onClick={()=>setHidden(!hidden)} aria-label={hidden?'แสดงเมนู':'ซ่อนเมนู'}><Eye size={19}/></button>
    {error && <div className="room-error" role="alert">{error}<button onClick={()=>void refresh()}>ลองอีกครั้ง</button></div>}
    {event && <RoomCelebration key={event.id} event={event} busy={ackBusy} onDismiss={()=>void acknowledge()} onTry={()=>void acknowledge(true)}/>}
    {panel && <div className="room-panel-backdrop" onClick={()=>setPanel(null)}><section className="room-panel" role="dialog" aria-modal="true" aria-label={panel==='weather'?'สภาพอากาศ':'ความสนิทและแอคชั่น'} onClick={e=>e.stopPropagation()}><button className="room-panel-close" autoFocus onClick={()=>setPanel(null)} aria-label="ปิด"><X/></button><h2>{panel==='weather'?'วันนี้อยากอยู่กับอากาศแบบไหน?':`ความสนิท ${state?.bond || 0} ♡`}</h2>{panel==='weather'?ROOM_WEATHERS.map(w=><button key={w} aria-pressed={weather===w} onClick={()=>void chooseWeather(w)}>{WEATHER_LABELS[w]}</button>):<><p>ค่อย ๆ สนิทกันจากการใช้เวลาด้วยกัน</p>{ROOM_ACTIONS.map(a=><button key={a.id} disabled={egg || !ready || (state?.bond || 0)<a.bond} onClick={()=>{model.current?.playIdle(a.id);setPanel(null);}}>{a.label}<small>{(state?.bond||0)<a.bond?`ความสนิท ${a.bond}`:egg?'รอน้องฟักก่อนนะ':'ลองเล่น'}</small></button>)}</>}</section></div>}
  </main>;
}
function RoomCelebration({event,busy,onDismiss,onTry}:{event:RoomEvent;busy:boolean;onDismiss:()=>void;onTry:()=>void}) {
  const p=event.payload, unlock=ROOM_ACTIONS.find(a=>a.id===p.unlocks?.[0]);
  return <section className={`room-celebration ${unlock?'unlock':''}`} role={unlock?'dialog':'status'} aria-label="การเติบโตของน้อง">
    <span aria-hidden="true">{unlock?'✨':event.kind==='bond'?'♡':p.hatched?'🐣':'✦'}</span>
    <strong>{unlock?'ปลดล็อกแอคชั่นน้องใหม่!':event.kind==='bond'?'ความสนิท +1':p.hatched?'น้องฟักแล้ว!':p.levelUp?`เลเวลอัพ! เลเวล ${p.level}`:'การเรียนรู้ส่งถึงน้องแล้ว'}</strong>
    <p>{unlock?ROOM_ACTIONS.filter(a=>p.unlocks?.includes(a.id)).map(a=>a.label).join(' · '):event.kind==='growth'?`${p.previousProgress} → ${p.progress} บันทึก${p.xp?` · +${p.xp} XP`:''}`:'ดีใจที่ได้ใช้เวลาด้วยกัน'}</p>
    {event.kind==='growth' && <progress max={20} value={Math.min(20,p.progress||0)} aria-label="ความก้าวหน้าการฟักไข่"/>}
    {unlock?<div><button disabled={busy} onClick={onTry}>ลองเล่นเลย</button><button disabled={busy} onClick={onDismiss}>ไว้ก่อน</button></div>:<button disabled={busy} onClick={onDismiss}>รับแล้ว ♡</button>}
  </section>;
}
