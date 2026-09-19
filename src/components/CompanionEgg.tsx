import { useEffect, useRef, useState, type CSSProperties } from 'react';
import './CompanionEgg.css';

export function eggProgress(count: number): number {
  return Number.isFinite(count) ? Math.min(20, Math.max(0, Math.floor(count))) : 0;
}

/** Artwork, baby and glass are separate layers. Petting is visual, never a growth event. */
export function CompanionEgg({ traceCount = 0, size = 320, onPet, isInteracting = false, paused = false, variant = 'terrarium' }: {
  traceCount?: number; size?: number; onPet?: () => void; isInteracting?: boolean; paused?: boolean; variant?: 'terrarium' | 'room';
}) {
  const [touched, setTouched] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const progress = eggProgress(traceCount);
  const pet = () => {
    if (timer.current) clearTimeout(timer.current);
    setTouched(true);
    timer.current = setTimeout(() => setTouched(false), 900);
    onPet?.();
  };
  return <button type="button" className="living-egg" onClick={pet}
    aria-label={`แตะทักทายตัวอ่อนในไข่ เรียนรู้แล้ว ${progress} จาก 20 ลูป`}
    data-testid="companion-egg-container" data-touched={touched || isInteracting}
    data-variant={variant} data-ready={progress === 20} data-paused={paused}
    style={{ '--egg-size': `${size}px`, '--embryo-growth': .91 + progress / 220 } as CSSProperties}>
    {variant === 'terrarium' && <img className="living-egg-garden" src="/images/dreamy_egg_terrarium.png" alt="" fetchPriority="high" draggable={false} />}
    <span className="living-egg-interior" aria-hidden="true">
      <span className="living-egg-waterlight" />
      <span className="living-egg-reaction">
        <span className="living-egg-swim">
          {variant === 'room' ? <span className="embryo-creature" data-testid="egg-embryo">
            <span className="embryo-tail"><i /></span>
            <span className="embryo-body">
              <span className="embryo-gill gill-left"><i /><i /><i /></span>
              <span className="embryo-gill gill-right"><i /><i /><i /></span>
              <span className="embryo-face"><i className="embryo-eye left" /><i className="embryo-eye right" /><i className="embryo-mouth" /></span>
              <i className="embryo-arm arm-left" /><i className="embryo-arm arm-right" />
              <i className="embryo-leg leg-left" /><i className="embryo-leg leg-right" />
              <span className="embryo-feeler"><i /></span>
            </span>
          </span> : <img className="living-egg-baby" src="/images/companion_dna_base.png" alt="" draggable={false} data-testid="egg-embryo" />}
        </span>
      </span>
      {variant === 'room' && <span className="living-egg-habitat" aria-hidden="true">
        <i className="habitat-coral coral-one" /><i className="habitat-coral coral-two" />
        <i className="habitat-leaf leaf-one" /><i className="habitat-leaf leaf-two" />
        <span className="habitat-pebbles"><i /><i /><i /><i /><i /></span>
        <span className="egg-bubbles"><i /><i /><i /><i /></span>
      </span>}
      <span className="living-egg-shell" />
      <span className="living-egg-dust">{Array.from({ length: 9 }, (_, i) =>
        <i key={i} style={{ left: `${13 + i * 9}%`, top: `${22 + ((i * 17) % 60)}%`, animationDelay: `${i * -.7}s` }} />)}</span>
    </span>
    <span className="living-egg-heart" aria-hidden="true">♡</span>
  </button>;
}
