import React, { useState, useEffect } from 'react';

export interface GrowthDnaProps {
  primary_pink_shade?: string;
  secondary_color?: string;
  gill_type?: string;
  cheek_feeler_type?: string;
  head_light_type?: string;
  head_light_tip?: string;
  tail_type?: string;
  body_pattern?: string;
  movement_personality?: string;
  safe_space_theme?: string;
}

interface CompanionRendererProps {
  stage: number; // 0 = Egg, 1 = Hatchling, 2 = Adolescent, 3 = Mature
  traceCount?: number; // 0 to 20+
  dna?: GrowthDnaProps | null;
  moodState?: string;
  isInteracting?: boolean;
  onPet?: () => void;
  size?: number;
}

export const CompanionRenderer: React.FC<CompanionRendererProps> = ({
  stage,
  traceCount = 0,
  dna,
  moodState = 'calm',
  isInteracting = false,
  onPet,
  size = 280,
}) => {
  const [blink, setBlink] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  // Natural blinking effect for hatched mascot
  useEffect(() => {
    if (stage === 0) return;
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 220);
    }, 3600);
    return () => clearInterval(interval);
  }, [stage]);

  const handleInteraction = (e: React.MouseEvent) => {
    if (onPet) {
      onPet();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setHearts((prev) => [...prev, { id: Date.now(), x, y }]);
      setTimeout(() => {
        setHearts((prev) => prev.filter((h) => Date.now() - h.id < 1200));
      }, 1200);
    }
  };

  // Color mapping from Growth DNA
  const pinkShades: Record<string, { body: string; shadow: string; belly: string }> = {
    soft_sakura: { body: '#FFB7C5', shadow: '#E297A7', belly: '#FFF0F3' },
    coral_pastel: { body: '#FFAA95', shadow: '#E58A75', belly: '#FFF2EE' },
    electric_rose: { body: '#FF8DA1', shadow: '#D96E82', belly: '#FFEBF0' },
    lavender_pink: { body: '#F2B5D4', shadow: '#CC95B0', belly: '#FCF2F7' },
    golden_pink: { body: '#FFBEA6', shadow: '#E29C85', belly: '#FFF7F2' },
  };

  const currentShade = (dna?.primary_pink_shade && pinkShades[dna.primary_pink_shade]) || pinkShades.soft_sakura;
  const secondaryColor = dna?.secondary_color || '#8BD3DD';

  // -------------------------------------------------------------
  // STAGE 0: THE COMPANION EGG (0 to 20 Loop Traces Progress)
  // -------------------------------------------------------------
  if (stage === 0) {
    const progress = Math.min(20, Math.max(0, traceCount));
    const ratio = progress / 20;
    const isReadyToHatch = progress >= 20;

    return (
      <div
        className="companion-egg-wrapper"
        onClick={handleInteraction}
        style={{
          width: size,
          height: size,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Radiating Aura based on trace progress */}
        <div
          style={{
            position: 'absolute',
            width: size * 0.75,
            height: size * 0.9,
            borderRadius: '50% 50% 46% 46% / 60% 60% 40% 40%',
            background: isReadyToHatch
              ? 'radial-gradient(circle, rgba(255, 215, 0, 0.55) 0%, rgba(255, 182, 193, 0.4) 50%, transparent 75%)'
              : `radial-gradient(circle, rgba(255, 183, 197, ${0.15 + ratio * 0.45}) 0%, transparent 70%)`,
            filter: 'blur(16px)',
            transform: isInteracting ? 'scale(1.12)' : 'scale(1)',
            transition: 'all 0.5s ease',
            animation: isReadyToHatch ? 'pulseHatch 1.8s infinite' : 'pulseWarmth 3.5s ease-in-out infinite',
          }}
        />

        {/* The SVG Egg */}
        <svg
          width={size * 0.7}
          height={size * 0.88}
          viewBox="0 0 200 250"
          style={{
            overflow: 'visible',
            filter: 'drop-shadow(0 12px 20px rgba(160, 110, 120, 0.25))',
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: isInteracting ? 'scale(1.05) rotate(2deg)' : 'scale(1)',
          }}
        >
          <defs>
            <linearGradient id="eggGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF9FA" />
              <stop offset="35%" stopColor={currentShade.body} />
              <stop offset="85%" stopColor={currentShade.shadow} />
              <stop offset="100%" stopColor="#C97585" />
            </linearGradient>

            <linearGradient id="innerGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFE066" stopOpacity={0.1 + ratio * 0.7} />
              <stop offset="100%" stopColor="#FF70A6" stopOpacity={0.2 + ratio * 0.5} />
            </linearGradient>

            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Ground Soft Shadow */}
          <ellipse cx="100" cy="235" rx="65" ry="14" fill="rgba(80, 50, 60, 0.15)" filter="blur(3px)" />

          {/* Egg Base Shell */}
          <path
            d="M100,15 C155,15 185,90 185,160 C185,215 150,235 100,235 C50,235 15,215 15,160 C15,90 45,15 100,15 Z"
            fill="url(#eggGrad)"
          />

          {/* Inner Light from Self-Observation */}
          <path
            d="M100,30 C145,30 170,95 170,155 C170,205 140,222 100,222 C60,222 30,205 30,155 C30,95 55,30 100,30 Z"
            fill="url(#innerGlow)"
            opacity={0.7}
          />

          {/* Soft Highlight */}
          <ellipse
            cx="65"
            cy="75"
            rx="30"
            ry="55"
            transform="rotate(-25 65 75)"
            fill="white"
            opacity="0.35"
            filter="blur(5px)"
          />

          {/* Mindful Pattern based on DNA */}
          {dna?.body_pattern === 'ripples' && (
            <g stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none">
              <ellipse cx="100" cy="140" rx="40" ry="12" strokeDasharray="4 6" />
              <ellipse cx="100" cy="165" rx="55" ry="14" strokeDasharray="5 7" />
            </g>
          )}

          {/* DYNAMIC PROGRESS CRACKS (Scale with 0 to 20 Traces) */}
          {progress >= 5 && (
            <path
              d="M75,100 L85,115 L78,130 L90,145"
              stroke="#FFF"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
              filter="url(#softGlow)"
              opacity={0.85}
            />
          )}

          {progress >= 10 && (
            <path
              d="M125,95 L115,112 L128,125 L120,140 L132,152"
              stroke="#FFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              filter="url(#softGlow)"
              opacity={0.9}
            />
          )}

          {progress >= 15 && (
            <g>
              <path
                d="M95,45 L102,65 L92,80 L108,98"
                stroke="#FFD700"
                strokeWidth="2.8"
                strokeLinecap="round"
                fill="none"
                filter="url(#softGlow)"
              />
              <path
                d="M60,160 L75,172 L70,190"
                stroke="#FFE066"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          )}

          {progress >= 20 && (
            <g>
              <path
                d="M100,15 L102,50 L88,75 L112,110 L95,145 L105,185 L98,235"
                stroke="#FFF"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                filter="url(#softGlow)"
              />
              <circle cx="102" cy="110" r="12" fill="#FFE57F" opacity="0.6" filter="blur(4px)" />
            </g>
          )}

          {/* Golden Speckles / Energy Sparks */}
          {Array.from({ length: Math.min(progress, 12) }).map((_, i) => (
            <circle
              key={i}
              cx={60 + (i * 23) % 80}
              cy={80 + (i * 31) % 100}
              r={1.5 + (i % 2)}
              fill={i % 2 === 0 ? '#FFE066' : '#FFF'}
              opacity="0.75"
            />
          ))}
        </svg>

        {/* Floating Heart Particles upon Petting */}
        {hearts.map((h) => (
          <div
            key={h.id}
            style={{
              position: 'absolute',
              left: h.x,
              top: h.y,
              pointerEvents: 'none',
              animation: 'floatUpHeart 1.2s forwards ease-out',
              fontSize: '22px',
            }}
          >
            💖
          </div>
        ))}
      </div>
    );
  }

  // -------------------------------------------------------------
  // STAGE 1+: HATCHED COMPANION (Axolotl / Salamander)
  // -------------------------------------------------------------
  const isSleeping = moodState === 'tired' || moodState === 'sleep';
  const isExcited = moodState === 'excited' || moodState === 'playful';

  return (
    <div
      className="companion-axolotl-wrapper"
      onClick={handleInteraction}
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Soft Ambient Pond/Habitat Glow */}
      <div
        style={{
          position: 'absolute',
          width: size * 0.8,
          height: size * 0.8,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${secondaryColor}33 0%, rgba(255, 183, 197, 0.2) 50%, transparent 70%)`,
          filter: 'blur(20px)',
          transform: isInteracting ? 'scale(1.15)' : 'scale(1)',
          transition: 'all 0.4s ease',
        }}
      />

      <svg
        width={size * 0.85}
        height={size * 0.85}
        viewBox="0 0 240 240"
        style={{
          overflow: 'visible',
          filter: 'drop-shadow(0 10px 18px rgba(150, 100, 115, 0.2))',
          transform: isInteracting ? 'scale(1.06) translateY(-4px)' : 'scale(1)',
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <defs>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF0F3" />
            <stop offset="45%" stopColor={currentShade.body} />
            <stop offset="100%" stopColor={currentShade.shadow} />
          </linearGradient>

          <linearGradient id="gillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF7597" />
            <stop offset="100%" stopColor="#FF2E63" />
          </linearGradient>
        </defs>

        {/* Soft shadow */}
        <ellipse cx="120" cy="210" rx="55" ry="12" fill="rgba(80, 50, 60, 0.12)" filter="blur(3px)" />

        {/* LAYER 1: CURVED TAIL WITH TRANSLUCENT FIN */}
        <path
          d="M145,160 Q190,175 185,135 Q175,105 140,135 Z"
          fill="url(#bodyGrad)"
          opacity="0.95"
        />
        <path
          d="M150,155 Q198,178 190,130 Q178,98 140,130 Z"
          fill={secondaryColor}
          opacity="0.35"
        />

        {/* LAYER 2: EXTERNAL GILLS (Feathery Axolotl Ears) */}
        {/* Left Gills */}
        <g style={{ transformOrigin: '70px 105px', animation: 'gillWaveLeft 3s ease-in-out infinite' }}>
          <path d="M75,95 Q40,75 25,85 Q45,100 70,105" fill="url(#gillGrad)" />
          <path d="M72,110 Q32,105 20,118 Q40,125 70,118" fill="url(#gillGrad)" />
          <path d="M73,125 Q38,135 28,150 Q52,142 75,128" fill="url(#gillGrad)" />
          <circle cx="24" cy="85" r="3.5" fill="#FF85A2" />
          <circle cx="19" cy="118" r="3.5" fill="#FF85A2" />
          <circle cx="27" cy="150" r="3.5" fill="#FF85A2" />
        </g>

        {/* Right Gills */}
        <g style={{ transformOrigin: '170px 105px', animation: 'gillWaveRight 3s ease-in-out infinite' }}>
          <path d="M165,95 Q200,75 215,85 Q195,100 170,105" fill="url(#gillGrad)" />
          <path d="M168,110 Q208,105 220,118 Q200,125 170,118" fill="url(#gillGrad)" />
          <path d="M167,125 Q202,135 212,150 Q188,142 165,128" fill="url(#gillGrad)" />
          <circle cx="216" cy="85" r="3.5" fill="#FF85A2" />
          <circle cx="221" cy="118" r="3.5" fill="#FF85A2" />
          <circle cx="213" cy="150" r="3.5" fill="#FF85A2" />
        </g>

        {/* LAYER 3: ROUND PLUMP BODY */}
        <ellipse cx="120" cy="150" rx="52" ry="48" fill="url(#bodyGrad)" />
        <ellipse cx="120" cy="156" rx="38" ry="34" fill={currentShade.belly} opacity="0.9" />

        {/* LAYER 4: STUBBY PAWS */}
        <circle cx="82" cy="175" r="9" fill="url(#bodyGrad)" />
        <circle cx="158" cy="175" r="9" fill="url(#bodyGrad)" />
        <circle cx="95" cy="195" r="10" fill="url(#bodyGrad)" />
        <circle cx="145" cy="195" r="10" fill="url(#bodyGrad)" />

        {/* LAYER 5: CUTE WIDE AXOLOTL HEAD */}
        <path
          d="M60,110 C60,65 180,65 180,110 C180,145 60,145 60,110 Z"
          fill="url(#bodyGrad)"
        />

        {/* Blushing Cheeks */}
        <ellipse cx="78" cy="118" rx="8" ry="5" fill="#FF7597" opacity="0.55" />
        <ellipse cx="162" cy="118" rx="8" ry="5" fill="#FF7597" opacity="0.55" />

        {/* LAYER 6: EYES & BLINKING */}
        {isSleeping ? (
          <g stroke="#3D2630" strokeWidth="2.5" strokeLinecap="round" fill="none">
            <path d="M88,106 Q98,114 108,106" />
            <path d="M132,106 Q142,114 152,106" />
          </g>
        ) : blink ? (
          <g stroke="#3D2630" strokeWidth="2.5" strokeLinecap="round">
            <line x1="88" y1="108" x2="108" y2="108" />
            <line x1="132" y1="108" x2="152" y2="108" />
          </g>
        ) : (
          <g>
            <ellipse cx="98" cy="106" rx="7.5" ry="9" fill="#2E1C24" />
            <circle cx="96" cy="103" r="2.8" fill="white" />
            <circle cx="101" cy="108" r="1.2" fill="white" />

            <ellipse cx="142" cy="106" rx="7.5" ry="9" fill="#2E1C24" />
            <circle cx="140" cy="103" r="2.8" fill="white" />
            <circle cx="145" cy="108" r="1.2" fill="white" />
          </g>
        )}

        {/* LAYER 7: GENTLE SMILE */}
        <path
          d={isExcited ? "M110,120 Q120,132 130,120" : "M112,121 Q120,127 128,121"}
          stroke="#3D2630"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill={isExcited ? "#FF8DA1" : "none"}
        />

        {/* LAYER 8: HEAD LIGHT / GROWTH DNA TRAIT */}
        {dna?.head_light_type === 'lotus' && (
          <g transform="translate(112, 55)">
            <path d="M8,0 C0,-10 0,-18 8,-22 C16,-18 16,-10 8,0 Z" fill="#FFE57F" />
            <circle cx="8" cy="-12" r="6" fill="#FFF" opacity="0.8" filter="blur(2px)" />
          </g>
        )}

        {dna?.head_light_type === 'crystal' && (
          <g transform="translate(114, 52)">
            <polygon points="6,-24 14,-12 6,0 -2,-12" fill={secondaryColor} opacity="0.9" />
            <circle cx="6" cy="-12" r="5" fill="#FFF" opacity="0.75" filter="blur(2px)" />
          </g>
        )}

        {(!dna?.head_light_type || dna?.head_light_type === 'lantern') && (
          <g transform="translate(112, 55)">
            <circle cx="8" cy="-10" r="7" fill="#FFE066" opacity="0.9" />
            <circle cx="8" cy="-10" r="11" fill="#FFE066" opacity="0.4" filter="blur(3px)" />
            <circle cx="8" cy="-10" r="3" fill="#FFF" />
          </g>
        )}
      </svg>

      {/* Floating Heart Particles upon Petting */}
      {hearts.map((h) => (
        <div
          key={h.id}
          style={{
            position: 'absolute',
            left: h.x,
            top: h.y,
            pointerEvents: 'none',
            animation: 'floatUpHeart 1.2s forwards ease-out',
            fontSize: '22px',
          }}
        >
          💖
        </div>
      ))}

      <style>{`
        @keyframes pulseWarmth {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes pulseHatch {
          0%, 100% { transform: scale(1.05); opacity: 0.9; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes gillWaveLeft {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-6deg); }
        }
        @keyframes gillWaveRight {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(6deg); }
        }
        @keyframes floatUpHeart {
          0% { opacity: 1; transform: translateY(0) scale(0.8); }
          100% { opacity: 0; transform: translateY(-50px) scale(1.3); }
        }
      `}</style>
    </div>
  );
};
