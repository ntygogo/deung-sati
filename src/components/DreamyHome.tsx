import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { ArrowUp, BookOpen, ChevronRight, Eye, Heart, Menu, MessageCircle, Pause, Play, Siren, Sparkles } from 'lucide-react';
import { CompanionEgg, eggProgress } from './CompanionEgg';
import { AxolotlWaterPreview } from './AxolotlWaterPreview';
import { PALETTES, TRAIT_CATALOG, previewAppearance, resolveCompanionAppearance, type CompanionAppearance } from '../shared/companionAppearance';
import type { CompanionData } from '../context/CompanionContext';
import './DreamyHome.css';

export interface DreamyHomeProps {
  onPet?: () => void;
  companion: CompanionData | null; traceCount: number; userName?: string; level?: number;
  onOpenMenu: () => void; onEmergency: () => void; onOpenCompanion: () => void;
  onOpenJourney: () => void; onOpenFuture: () => void; onOpenChat: () => void;
  onStartChat: (text: string) => void;
}

export function DreamyHome({ companion, traceCount, userName, level = 1, onOpenMenu, onEmergency,
  onOpenCompanion, onOpenJourney, onOpenFuture, onOpenChat, onStartChat, onPet }: DreamyHomeProps) {
  const [message, setMessage] = useState('');
  const [paused, setPaused] = useState(false);
  const appearance = useMemo(() => resolveCompanionAppearance(companion ?? {}), [companion]);
  const [dnaPreview, setDnaPreview] = useState<CompanionAppearance | null>(null);
  const displayedAppearance = dnaPreview ?? appearance;
  const randomizeDna = () => {
    const current = dnaPreview ?? appearance;
    const palettes = PALETTES.filter(palette => ['soft_sakura','jade_mint','powder_blue','golden_pink'].includes(palette.id) && palette.id !== current.palette.id);
    const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
    const next = previewAppearance(appearance, {
      palette: pick(palettes).id,
      pattern: pick(TRAIT_CATALOG.pattern.options.filter(option => option[0] !== current.traits.pattern.id))[0],
      motion: pick(TRAIT_CATALOG.motion.options.filter(option => option[0] !== current.traits.motion.id))[0],
    });
    setDnaPreview({...next, patternSeed: Math.floor(Math.random() * 0xffffffff)});
  };
  const progress = eggProgress(traceCount);
  const previewAxolotl = new URLSearchParams(window.location.search).get('previewAxolotl') === '1';
  const previewCompanion = previewAxolotl || new URLSearchParams(window.location.search).get('previewCompanion') === '1';
  const previewEgg = new URLSearchParams(window.location.search).get('previewEgg') === '1';
  const isEgg = !dnaPreview && (previewEgg || (!previewCompanion && (!companion || companion.stage === 0)));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (message.trim()) { onStartChat(message.trim()); setMessage(''); }
    else onOpenChat();
  };
  return <main className="dreamy-home" data-testid="dreamy-home" data-paused={paused}>
    <section className="dreamy-hero" aria-label="ห้องพักใจของเรา">
      <div className="room-architecture" aria-hidden="true">
        <div className="room-arch"><div className="room-sky"><i /><i /><i /></div><span className="room-moon" /><span className="room-window-bar" /></div>
        <div className="room-light" /><div className="room-floor" /><div className="room-rug" />
        <div className="room-plant"><i /><i /><i /><i /><span /></div>
        <div className="room-particles">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ left: `${12 + i * 12}%`, top: `${32 + (i * 13) % 40}%`, animationDelay: `${-i * 1.3}s` }} />)}</div>
      </div>
      <div className="room-companion">
        <span className="room-pedestal" aria-hidden="true" />
        {isEgg ? <CompanionEgg traceCount={traceCount} size={320} paused={paused} variant="room" appearance={displayedAppearance} onPet={dnaPreview ? undefined : onPet} /> :
          <div className="dreamy-hatched-garden axolotl-stage" data-paused={paused}>
            <AxolotlWaterPreview paused={paused} appearance={displayedAppearance} onPet={dnaPreview ? undefined : onPet} activityVersion={traceCount} autoGreet={!previewCompanion && !dnaPreview} key={dnaPreview ? `dna-${dnaPreview.patternSeed}` : 'saved-companion'} />
          </div>}
      </div>
      <header className="dreamy-header">
        <span className="dreamy-wordmark">Deung Sati<span aria-hidden="true">*</span></span>
        <div className="dreamy-header-actions">
          <button type="button" className="dreamy-emergency" onClick={onEmergency}><Siren size={19} aria-hidden="true" /><span>ฉุกเฉิน</span></button>
          <button type="button" className="dreamy-menu" onClick={onOpenMenu} aria-label="เปิดเมนู"><Menu size={23} /></button>
        </div>
      </header>
      <div className="dreamy-greeting">
        <span className="dreamy-avatar" aria-hidden="true">{userName?.trim().slice(0, 1) || '♡'}</span>
        <div><strong>สวัสดี {userName || 'เธอ'} <span aria-hidden="true">♡</span></strong><span className="dreamy-level">Lv.{Math.max(1, level)}</span></div>
      </div>
      <p className="dreamy-note">พักตรงนี้<br />ได้เสมอนะ <span>♡</span></p>
      <button type="button" className="room-journal" onClick={onOpenJourney} aria-label="เปิดสมุดบันทึก เส้นทางของฉัน">
        <span className="room-book" aria-hidden="true"><BookOpen size={25} /><i /></span>
        <span className="room-object-label">สมุดของฉัน</span>
      </button>
      <button type="button" onClick={onOpenCompanion} className="dreamy-progress"
        aria-label={isEgg ? `ดูความคืบหน้า ${progress} จาก 20 ลูป${progress === 20 ? ' น้องพร้อมฟักแล้ว' : ''}` : 'ไปหาน้องของเรา'}
        style={{ '--trace-glow': .2 + progress * .025 } as CSSProperties}>
        <span className="room-lamp-cap" aria-hidden="true" /><span className="dreamy-progress-inner">
          <strong>{isEgg ? `${progress} / 20` : companion?.name || 'สหายสติ'}</strong>
          <span>{isEgg ? (progress === 20 ? 'พร้อมฟักแล้ว' : 'ร่องรอยก่อนฟัก') : 'เติบโตไปด้วยกัน'}</span>
          <Heart size={15} fill="currentColor" aria-hidden="true" />
        </span>
      </button>
      <p className="room-companion-caption">{isEgg ? 'แตะไข่เพื่อทักทายน้อง' : 'ลูบหัวเพื่อเล่น · ลากรอบตัวเพื่อหมุนดู'}</p>
      <button type="button" className="dreamy-motion" onClick={() => setPaused(value => !value)}
        aria-pressed={paused} aria-label={paused ? 'เล่นการเคลื่อนไหว' : 'พักการเคลื่อนไหว'}>
        {paused ? <Play size={13} /> : <Pause size={13} />}<span>{paused ? 'ให้ขยับ' : 'พักภาพ'}</span>
      </button>
    </section>

    <section className="dreamy-dna-preview" aria-label="ลองสุ่ม DNA">
      <div><button type="button" onClick={randomizeDna}>🎲 สุ่ม DNA ดูตัวอย่าง</button>
      {dnaPreview && <button type="button" onClick={() => setDnaPreview(null)}>กลับสู่น้องของฉัน</button>}</div>
      <p role="status">{displayedAppearance.palette.label} · {displayedAppearance.traits.pattern.label} · {displayedAppearance.traits.motion.label}</p>
      <small>{dnaPreview ? 'กำลังดูตัวอย่าง ไม่เปลี่ยน DNA หรือฟักไข่จริง' : 'ลองสี ลาย และจังหวะบนตัวน้อง 3D ได้เลย'}</small>
    </section>
    <section className="dreamy-chat-card" aria-labelledby="dreamy-chat-heading">
      <div className="dreamy-chat-heading"><MessageCircle className="dreamy-chat-doodle" size={32} aria-hidden="true" />
        <div><h1 id="dreamy-chat-heading">ตอนนี้ข้างในเป็นยังไงบ้าง?</h1><p>เล่าได้ทุกเรื่องเลยนะ ♡</p></div>
      </div>
      <form onSubmit={submit} className="dreamy-composer">
        <span className="dreamy-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
        <input value={message} onChange={event => setMessage(event.target.value)} aria-label="พิมพ์เรื่องในใจ" placeholder="เล่าให้เราฟัง..." autoComplete="off" />
        <button type="submit" aria-label={message.trim() ? 'ส่งข้อความเริ่มคุย' : 'เปิดแชทคุยกับเรา'}>
          {message.trim() ? <ArrowUp size={25} /> : <MessageCircle size={26} />}
        </button>
      </form>
      <span className="dreamy-composer-caption">คุยกับเรา</span>
    </section>

    <section className="dreamy-path" aria-labelledby="dreamy-path-heading">
      <div className="dreamy-section-heading"><h2 id="dreamy-path-heading">เส้นทางวันนี้ <span aria-hidden="true">〰</span></h2><p>ค่อย ๆ ไปด้วยกันนะ ☺</p></div>
      <div className="dreamy-path-steps">
        <button onClick={() => onStartChat('อยากลองสังเกตสิ่งที่เกิดขึ้นข้างใน ช่วยพาทีละนิดได้ไหม')}><span className="dreamy-flower violet"><Eye size={26} /></span><b>สังเกต</b></button>
        <span className="dreamy-path-dots" aria-hidden="true" />
        <button onClick={() => onStartChat('ยังเรียกไม่ถูกว่ากำลังรู้สึกอะไร ช่วยค่อย ๆ สำรวจด้วยกันได้ไหม')}><span className="dreamy-flower pink"><Heart size={26} fill="currentColor" /></span><b>เรียกชื่อ</b></button>
        <span className="dreamy-path-dots" aria-hidden="true" />
        <button onClick={() => onStartChat('อยากลองหาทางเลือกเล็ก ๆ ที่พอทำไหว ช่วยคิดไปด้วยกันหน่อย')}><span className="dreamy-flower peach"><Sparkles size={26} /></span><b>เลือกใหม่</b></button>
      </div>
    </section>
    <button className="dreamy-future-link" onClick={onOpenFuture}><Sparkles size={17} aria-hidden="true" /> แวะหาฉันในวันข้างหน้า <ChevronRight size={17} /></button>
  </main>;
}
