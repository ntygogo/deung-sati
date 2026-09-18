import { useState, type CSSProperties, type FormEvent } from 'react';
import { ArrowUp, ChevronRight, Eye, Heart, Menu, MessageCircle, Pause, Play, Siren, Sparkles } from 'lucide-react';
import { CompanionEgg, eggProgress } from './CompanionEgg';
import { CompanionAppearance } from './CompanionAppearance';
import { resolveCompanionAppearance } from '../shared/companionAppearance';
import type { CompanionData } from '../context/CompanionContext';
import './DreamyHome.css';

export interface DreamyHomeProps {
  companion: CompanionData | null; traceCount: number; userName?: string; level?: number;
  onOpenMenu: () => void; onEmergency: () => void; onOpenCompanion: () => void;
  onOpenJourney: () => void; onOpenFuture: () => void; onOpenChat: () => void;
  onStartChat: (text: string) => void;
}

export function DreamyHome({ companion, traceCount, userName, level = 1, onOpenMenu, onEmergency,
  onOpenCompanion, onOpenJourney, onOpenFuture, onOpenChat, onStartChat }: DreamyHomeProps) {
  const [message, setMessage] = useState('');
  const [paused, setPaused] = useState(false);
  const progress = eggProgress(traceCount);
  const isEgg = !companion || companion.stage === 0;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (message.trim()) { onStartChat(message.trim()); setMessage(''); }
    else onOpenChat();
  };
  return <main className="dreamy-home" data-testid="dreamy-home">
    <section className="dreamy-hero" aria-label="สวนของสหายสติ">
      {isEgg ? <CompanionEgg traceCount={traceCount} size={640} paused={paused} /> :
        <div className="dreamy-hatched-garden" data-paused={paused}>
          <CompanionAppearance appearance={resolveCompanionAppearance(companion)} size={330} />
        </div>}
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
      <p className="dreamy-note">ร่องรอยเล็ก ๆ<br />ในวันนี้<br />ก็มีความหมาย<br />เสมอ <span>♡</span></p>
      <button type="button" onClick={onOpenCompanion} className="dreamy-progress"
        aria-label={isEgg ? `ดูความคืบหน้า ${progress} จาก 20 ลูป${progress === 20 ? ' น้องพร้อมฟักแล้ว' : ''}` : 'ไปหาน้องของเรา'}
        style={{ '--trace-angle': `${progress * 18}deg` } as CSSProperties}>
        <span className="dreamy-progress-inner">
          <strong>{isEgg ? `${progress} / 20` : companion?.name || 'สหายสติ'}</strong>
          <span>{isEgg ? (progress === 20 ? 'น้องพร้อมฟักแล้ว' : `อีก ${20 - progress} ร่องรอย\nก่อนฟัก`) : 'เติบโตไปด้วยกัน'}</span>
          <Heart size={15} fill="currentColor" aria-hidden="true" />
        </span>
      </button>
      <button type="button" className="dreamy-motion" onClick={() => setPaused(value => !value)}
        aria-pressed={paused} aria-label={paused ? 'เล่นการเคลื่อนไหว' : 'พักการเคลื่อนไหว'}>
        {paused ? <Play size={13} /> : <Pause size={13} />}<span>{paused ? 'ให้ขยับ' : 'พักภาพ'}</span>
      </button>
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
    <section className="dreamy-destinations" aria-label="พื้นที่ของเรา">
      <button className="dreamy-destination dreamy-room-card" onClick={onOpenCompanion}>
        <span><strong>ห้องของน้อง</strong><small>ไปดูว่าน้องเป็นยังไงบ้าง</small></span><ChevronRight className="dreamy-destination-arrow" size={23} />
        <img className="dreamy-room-baby" src="/images/companion_dna_base.png" alt="" loading="lazy" />
      </button>
      <button className="dreamy-destination dreamy-journey-card" onClick={onOpenJourney}>
        <span><strong>เส้นทางของฉัน</strong><small>ร่องรอยที่เราเคยผ่าน</small></span><ChevronRight className="dreamy-destination-arrow" size={23} />
      </button>
    </section>
    <button className="dreamy-future-link" onClick={onOpenFuture}><Sparkles size={17} aria-hidden="true" /> แวะหาฉันในวันข้างหน้า <ChevronRight size={17} /></button>
  </main>;
}
