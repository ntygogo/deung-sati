import React, { useEffect, useRef, useState } from 'react';
import type { CompanionAppearance as Appearance } from '../shared/companionAppearance';
import { appearanceHash } from '../shared/companionAppearance';
import './CompanionAppearance.css';

const ASSET = '/images/companion_form1.png';
export function CompanionAppearance({ appearance, size = 280, onPet, isInteracting = false }: {
  appearance: Appearance; size?: number; onPet?: () => void; isInteracting?: boolean;
}) {
  const [touched, setTouched] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current); }, []);
  const pet = () => {
    if (timeout.current) clearTimeout(timeout.current);
    setTouched(true);
    timeout.current = setTimeout(() => setTouched(false), 650);
    onPet?.();
  };
  const { palette, traits, patternSeed } = appearance;
  const active = touched || isInteracting;
  const variables = {
    '--dna-size': `${size}px`, '--dna-primary': palette.body, '--dna-accent': palette.secondary,
    '--dna-lamp': palette.lamp, '--dna-hue': `${palette.hue}deg`, '--dna-saturation': palette.saturation,
    '--dna-mask': `url("${ASSET}")`,
  } as React.CSSProperties;
  return <button type="button" className="dna-companion" style={variables} onClick={pet}
    data-testid="dna-companion" data-identity={appearance.identity} data-palette={palette.id}
    data-aura={traits.aura.id} data-motion={traits.motion.id} data-touched={active}
    aria-label="ลูบน้อง" >
    <span className="dna-aura" aria-hidden="true" />
    <span className="dna-motes" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => {
        const angle = i * Math.PI / 6;
        return <i key={i} style={{ left: `${50 + Math.cos(angle) * 41}%`, top: `${50 + Math.sin(angle) * 36}%`, animationDelay: `${i * -.31}s` }} />;
      })}
    </span>
    <span className="dna-pet-response">
      <span className="dna-float" data-surface={traits.surface.id}>
        <img src={ASSET} alt="" className="dna-base" draggable={false} data-testid="companion-form1-asset" />
        <span className="dna-pattern-mask" aria-hidden="true">
          <svg viewBox="0 0 100 100" className="dna-pattern" data-pattern={traits.pattern.id}>
            {Array.from({ length: 15 }, (_, i) => {
              const h = appearanceHash(`${patternSeed}:${i}`);
              const x = 23 + (h % 40), y = 57 + ((h >>> 8) % 18);
              if (traits.pattern.id === 'water_ripples') return <path key={i} d={`M${x},${y} q5,-3 10,0 t10,0`} fill="none" stroke="currentColor" strokeWidth=".4" opacity=".65" />;
              if (traits.pattern.id === 'petal_marks') return <ellipse key={i} cx={x} cy={y} rx=".8" ry="1.6" transform={`rotate(${h % 180} ${x} ${y})`} fill="currentColor" opacity=".72" />;
              if (traits.pattern.id === 'starlight_speckles') return <path key={i} d={`M${x},${y - 1} l.3,.7 .7,.3 -.7,.3 -.3,.7 -.3,-.7 -.7,-.3 .7,-.3 Z`} fill="currentColor" />;
              return <circle key={i} cx={x} cy={y} r={.2 + (h % 4) / 10} fill="currentColor" opacity=".8" />;
            })}
          </svg>
        </span>
        <span className="dna-surface-shine" aria-hidden="true" />
      </span>
    </span>
    <span className="dna-touch-heart" aria-hidden="true">♡</span>
  </button>;
}
