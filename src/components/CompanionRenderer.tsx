import React, { useState, useEffect, useRef } from 'react';

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
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; char: string; color: string }[]>([]);
  const [touchPoint, setTouchPoint] = useState<{ x: number; y: number; id: number } | null>(null);
  const [isTouched, setIsTouched] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleInteraction = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onPet) {
      onPet();
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Trigger local touch ripple and joyful axolotl reaction
    setIsTouched(true);
    setTouchPoint({ x: clientX, y: clientY, id: Date.now() });
    setTimeout(() => setIsTouched(false), 650);

    // Particle burst: pearl hearts, amber sparkles, water bubbles
    const symbols = ['✨', '💖', '🫧', '✦', '🌸'];
    const colors = ['#FBBF24', '#FF8DA1', '#60A5FA', '#C084FC', '#F472B6'];
    const newParticles = Array.from({ length: 3 }).map((_, i) => ({
      id: Date.now() + i,
      x: clientX + (Math.random() * 40 - 20),
      y: clientY + (Math.random() * 30 - 15),
      char: symbols[Math.floor(Math.random() * symbols.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => Date.now() - p.id < 1400));
    }, 1400);
  };

  // Color mapping from Growth DNA
  const pinkShades: Record<string, { body: string; shadow: string; belly: string; glow: string; highlight: string }> = {
    soft_sakura: { body: '#FFB7C5', shadow: '#E297A7', belly: '#FFF0F3', glow: '#FFD1DC', highlight: '#FFFFFF' },
    coral_pastel: { body: '#FFA07A', shadow: '#E57373', belly: '#FFF5EB', glow: '#FF8A75', highlight: '#FFEFEA' },
    electric_rose: { body: '#FF6584', shadow: '#D83A56', belly: '#FFE3EC', glow: '#FF4D6D', highlight: '#FFF0F5' },
    lavender_pink: { body: '#E8A7D0', shadow: '#B5739D', belly: '#FAF0F7', glow: '#D8B4E2', highlight: '#FFFFFF' },
    golden_pink: { body: '#FDB095', shadow: '#D97A5E', belly: '#FFF4EE', glow: '#FBBF24', highlight: '#FFFDF0' },
  };

  const currentShade = (dna?.primary_pink_shade && pinkShades[dna.primary_pink_shade]) || pinkShades.soft_sakura;
  const secondaryColor = dna?.secondary_color || '#8BD3DD';

  // --------------------------------------------------------------------------
  // STAGE 0: THE TRANSLUCENT EMOTIONAL TERRARIUM EGG
  // Visible Axolotl Embryo floating inside glass/jelly shell with living movement
  // --------------------------------------------------------------------------
  if (stage === 0) {
    const progress = Math.min(20, Math.max(0, traceCount));
    const ratio = progress / 20;
    const isReadyToHatch = progress >= 20;

    // Embryo developmental scale & opacity across milestones
    // 0/20: tiny sleeping seed, 5/20: stirring buds, 10/20: defined tail, 15/20: radiant frills, 20/20: ready
    let embryoScale = 0.70;
    let embryoOpacity = 0.70;
    let gillLength = 10;
    let coreGlowOpacity = 0.45;

    if (progress >= 20) {
      embryoScale = 0.98;
      embryoOpacity = 1.0;
      gillLength = 28;
      coreGlowOpacity = 0.95;
    } else if (progress >= 15) {
      embryoScale = 0.92;
      embryoOpacity = 0.95;
      gillLength = 24;
      coreGlowOpacity = 0.85;
    } else if (progress >= 10) {
      embryoScale = 0.84;
      embryoOpacity = 0.88;
      gillLength = 19;
      coreGlowOpacity = 0.70;
    } else if (progress >= 5) {
      embryoScale = 0.77;
      embryoOpacity = 0.80;
      gillLength = 14;
      coreGlowOpacity = 0.58;
    }

    return (
      <div
        className="companion-egg-container"
        data-testid="companion-egg-container"
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
          touchAction: 'manipulation',
        }}
        role="button"
        tabIndex={0}
        aria-label={`ไข่แห่งการรู้ตัว ความคืบหน้า ${progress} จาก 20 Loop Traces`}
      >
        <style>{`
          @keyframes embryoBreathe {
            0%, 100% { transform: scale(1) translateY(0); }
            50% { transform: scale(1.035) translateY(-2px); }
          }
          @keyframes embryoTailDrift {
            0%, 100% { transform: rotate(-3deg); }
            50% { transform: rotate(4deg); }
          }
          @keyframes gillWaveSoft {
            0%, 100% { transform: rotate(-2deg); }
            50% { transform: rotate(3deg); }
          }
          @keyframes soulPulseGlow {
            0%, 100% { opacity: ${coreGlowOpacity}; transform: scale(1); }
            50% { opacity: ${Math.min(1, coreGlowOpacity + 0.25)}; transform: scale(1.15); }
          }
          @keyframes auraBreathe {
            0%, 100% { transform: scale(0.96); opacity: 0.65; }
            50% { transform: scale(1.04); opacity: 0.90; }
          }
          @keyframes eggFloatDrift {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-4px) rotate(0.8deg); }
          }
          @keyframes touchRippleEffect {
            0% { transform: scale(0.2); opacity: 0.9; }
            100% { transform: scale(2.2); opacity: 0; }
          }
          @keyframes particleFloatUp {
            0% { transform: translateY(0) scale(0.6); opacity: 1; }
            100% { transform: translateY(-48px) scale(1.1); opacity: 0; }
          }

          /* Accessibility: Respect user motion preference */
          @media (prefers-reduced-motion: reduce) {
            .eggLivingAnimated, .embryoAnimatedGroup, .gillWaveGroup, .tailAnimatedGroup, .auraAnimated {
              animation: none !important;
            }
          }
        `}</style>

        {/* 1. LAYER: Multi-Spectral Background Bioluminescent Aura */}
        <div
          className="auraAnimated"
          style={{
            position: 'absolute',
            width: size * 0.88,
            height: size * 1.05,
            borderRadius: '50% 50% 46% 46% / 60% 60% 40% 40%',
            background: isReadyToHatch
              ? 'radial-gradient(circle at 50% 55%, rgba(251, 191, 36, 0.45) 0%, rgba(244, 114, 182, 0.35) 45%, rgba(139, 92, 246, 0.25) 70%, transparent 85%)'
              : `radial-gradient(circle at 50% 55%, ${currentShade.glow}44 0%, rgba(192, 132, 252, ${0.15 + ratio * 0.25}) 40%, rgba(37, 99, 235, 0.12) 68%, transparent 85%)`,
            filter: 'blur(22px)',
            animation: 'auraBreathe 5s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />

        {/* 2. LAYER: Main SVG Translucent Glass Egg */}
        <svg
          ref={svgRef}
          className="eggLivingAnimated"
          width={size * 0.82}
          height={size * 0.98}
          viewBox="0 0 240 300"
          style={{
            overflow: 'visible',
            filter: isTouched
              ? 'drop-shadow(0 14px 28px rgba(244, 114, 182, 0.4))'
              : 'drop-shadow(0 12px 24px rgba(30, 27, 75, 0.22))',
            animation: 'eggFloatDrift 6s ease-in-out infinite',
            transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: isTouched ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          <defs>
            {/* Amniotic Glass Jelly Fluid Gradient */}
            <radialGradient id="amnioticJellyGrad" cx="50%" cy="56%" r="62%">
              <stop offset="0%" stopColor="#FFF9FB" stopOpacity="0.48" />
              <stop offset="38%" stopColor={currentShade.belly} stopOpacity="0.32" />
              <stop offset="72%" stopColor="#DDD6FE" stopOpacity="0.26" />
              <stop offset="92%" stopColor="#3B82F6" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#F472B6" stopOpacity="0.55" />
            </radialGradient>

            {/* Specular Rim Glow Gradient (Refracting Terrarium Light) */}
            <linearGradient id="eggRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="25%" stopColor={currentShade.highlight} stopOpacity="0.65" />
              <stop offset="60%" stopColor="#C084FC" stopOpacity="0.4" />
              <stop offset="85%" stopColor="#F59E0B" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.75" />
            </linearGradient>

            {/* Axolotl Embryo Body Gradient */}
            <linearGradient id="embryoBodyGrad" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#FFF4F6" />
              <stop offset="30%" stopColor={currentShade.body} />
              <stop offset="85%" stopColor={currentShade.shadow} />
              <stop offset="100%" stopColor="#BE185D" />
            </linearGradient>

            {/* Axolotl Gills Gradient */}
            <linearGradient id="embryoGillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF7597" />
              <stop offset="60%" stopColor={currentShade.body} />
              <stop offset="100%" stopColor={secondaryColor} />
            </linearGradient>

            {/* Inner Core Soul Nucleus (Bioluminescent Heartbeat) */}
            <radialGradient id="soulNucleusGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFBEB" stopOpacity="0.95" />
              <stop offset="25%" stopColor="#FBBF24" stopOpacity="0.85" />
              <stop offset="65%" stopColor="#F43F5E" stopOpacity="0.6" />
              <stop offset="90%" stopColor="#8B5CF6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </radialGradient>

            {/* Soft Glow Filter */}
            <filter id="softGlowFilter" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Intense Golden Radiance Filter */}
            <filter id="radiantVeinGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4.5" result="blur1" />
              <feGaussianBlur stdDeviation="1.5" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Egg Shell Clip Path to encapsulate amniotic fluid & baby axolotl */}
            <clipPath id="eggShellInnerClip">
              <path d="M120,26 C182,26 214,104 214,182 C214,240 175,268 120,268 C65,268 26,240 26,182 C26,104 58,26 120,26 Z" />
            </clipPath>
          </defs>

          {/* Ground Refracted Shadow */}
          <ellipse cx="120" cy="272" rx="72" ry="14" fill="rgba(30, 27, 75, 0.18)" filter="blur(5px)" />

          {/* ================================================================= */}
          {/* EGG INTERIOR (Inside Glass Jelly Shell)                           */}
          {/* ================================================================= */}
          <g clipPath="url(#eggShellInnerClip)">
            {/* Deep Amniotic Fluid Fill */}
            <path
              d="M120,25 C185,25 218,105 218,185 C218,245 178,272 120,272 C62,272 22,245 22,185 C22,105 55,25 120,25 Z"
              fill="url(#amnioticJellyGrad)"
            />

            {/* Ambient Internal Caustic Nebula Rays */}
            <circle cx="120" cy="165" r="75" fill={`url(#soulNucleusGrad)`} opacity={0.3 + ratio * 0.4} />
            <ellipse cx="85" cy="115" rx="35" ry="50" fill="rgba(255, 255, 255, 0.12)" filter="blur(8px)" />

            {/* ------------------------------------------------------------- */}
            {/* THE LIVING PINK BABY AXOLOTL EMBRYO                           */}
            {/* ------------------------------------------------------------- */}
            <g
              className="embryoAnimatedGroup"
              style={{
                transformOrigin: '120px 165px',
                animation: 'embryoBreathe 4.5s ease-in-out infinite',
                opacity: embryoOpacity,
              }}
            >
              {/* Scale container based on Growth Progress */}
              <g transform={`translate(120, 165) scale(${embryoScale}) translate(-120, -165)`}>
                
                {/* 1. Embryo Curled Long Swimming Tail with Translucent Swimming Fin */}
                <g className="tailAnimatedGroup" style={{ transformOrigin: '135px 185px', animation: 'embryoTailDrift 3.5s ease-in-out infinite' }}>
                  {/* Outer Translucent Salamander Swimming Fin Ribbon */}
                  <path
                    d="M136,176 C162,198 154,238 120,248 C88,258 64,232 74,204 C78,190 90,188 92,198 C85,214 100,234 122,228 C142,220 150,196 128,176 Z"
                    fill={secondaryColor}
                    opacity="0.6"
                    filter="url(#softGlowFilter)"
                  />
                  {/* Core Muscular Axolotl Tail */}
                  <path
                    d="M132,180 C148,198 140,224 116,232 C96,238 80,220 86,206 C88,198 94,196 95,202 C92,212 102,224 116,218 C128,212 136,198 124,180 Z"
                    fill="url(#embryoBodyGrad)"
                    opacity="0.94"
                  />
                </g>

                {/* 2. Embryo Curled Axolotl Torso */}
                <path
                  d="M98,138 C136,134 156,158 150,188 C144,214 118,224 96,212 C76,200 80,168 90,146 C94,140 96,138 98,138 Z"
                  fill="url(#embryoBodyGrad)"
                />

                {/* Soft Pearlescent Warm Belly */}
                <ellipse cx="118" cy="176" rx="20" ry="15" fill={currentShade.belly} opacity="0.7" filter="blur(2px)" />

                {/* 3. Bioluminescent Soul Nucleus (Inner Heartbeat of Mindfulness) */}
                <g style={{ transformOrigin: '118px 172px', animation: 'soulPulseGlow 3s ease-in-out infinite' }}>
                  <circle cx="118" cy="172" r={16 + ratio * 10} fill="url(#soulNucleusGrad)" filter="url(#radiantVeinGlow)" />
                  <circle cx="118" cy="172" r="5" fill="#FFFFFF" opacity="0.92" />
                </g>

                {/* 4. Cute Wide Rounded Baby Axolotl Head */}
                <ellipse cx="118" cy="124" rx="39" ry="29" fill="url(#embryoBodyGrad)" />

                {/* Cute Rosy Cheeks */}
                <ellipse cx="92" cy="131" rx="7" ry="4.5" fill="#F43F5E" opacity="0.5" filter="blur(1px)" />
                <ellipse cx="144" cy="131" rx="7" ry="4.5" fill="#F43F5E" opacity="0.5" filter="blur(1px)" />

                {/* Cute Axolotl Eyes & Sweet Expression */}
                {isTouched ? (
                  // Open sparkly joyful kawaii eyes on tap!
                  <g>
                    <ellipse cx="104" cy="122" rx="4.8" ry="6" fill="#1E1B4B" />
                    <ellipse cx="132" cy="122" rx="4.8" ry="6" fill="#1E1B4B" />
                    <circle cx="106" cy="120" r="1.8" fill="#FFFFFF" />
                    <circle cx="134" cy="120" r="1.8" fill="#FFFFFF" />
                    <circle cx="103" cy="124" r="0.9" fill="#FFFFFF" />
                    <circle cx="131" cy="124" r="0.9" fill="#FFFFFF" />
                    <path d="M115,129 Q118,133 121,129" stroke="#9F1239" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  </g>
                ) : (
                  // Sleeping calm crescent eyes with sweet smile
                  <g stroke="#9F1239" strokeWidth="2.2" strokeLinecap="round" fill="none">
                    <path d="M100,122 Q105,127 110,122" />
                    <path d="M126,122 Q131,127 136,122" />
                    <path d="M115,129 Q118,132 121,129" strokeWidth="1.5" />
                  </g>
                )}

                {/* 5. Feathery External Gills (3 distinct branching frills on each side) */}
                {/* Left External Gill Stalks */}
                <g className="gillWaveGroup" style={{ transformOrigin: '84px 124px', animation: 'gillWaveSoft 2.8s ease-in-out infinite' }}>
                  {/* Top Feathery Branch */}
                  <path
                    d={`M86,114 Q${86 - gillLength * 0.7},${104 - gillLength * 0.3} ${86 - gillLength * 1.35},${110 - gillLength * 0.2}`}
                    stroke="url(#embryoGillGrad)"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Gill frill fringe spikes */}
                  <path d={`M${86 - gillLength * 0.6},${108 - gillLength * 0.2} Q${86 - gillLength * 0.8},${102 - gillLength * 0.3} ${86 - gillLength * 1.0},${104 - gillLength * 0.3}`} stroke={secondaryColor} strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  <circle cx={86 - gillLength * 1.35} cy={110 - gillLength * 0.2} r="3.2" fill={secondaryColor} opacity="0.85" />

                  {/* Mid Feathery Branch */}
                  <path
                    d={`M82,124 Q${82 - gillLength * 0.8},122 ${82 - gillLength * 1.45},127`}
                    stroke="url(#embryoGillGrad)"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path d={`M${82 - gillLength * 0.7},121 Q${82 - gillLength * 0.9},116 ${82 - gillLength * 1.1},118`} stroke={secondaryColor} strokeWidth="2" strokeLinecap="round" fill="none" />
                  <circle cx={82 - gillLength * 1.45} cy={127} r="3.5" fill={secondaryColor} opacity="0.85" />

                  {/* Bottom Feathery Branch */}
                  <path
                    d={`M85,134 Q${85 - gillLength * 0.7},${138 + gillLength * 0.3} ${85 - gillLength * 1.3},${144 + gillLength * 0.5}`}
                    stroke="url(#embryoGillGrad)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path d={`M${85 - gillLength * 0.6},${137 + gillLength * 0.2} Q${85 - gillLength * 0.8},${142 + gillLength * 0.3} ${85 - gillLength * 1.0},${141 + gillLength * 0.4}`} stroke={secondaryColor} strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  <circle cx={85 - gillLength * 1.3} cy={144 + gillLength * 0.5} r="3" fill={secondaryColor} opacity="0.85" />
                </g>

                {/* Right External Gill Stalks */}
                <g className="gillWaveGroup" style={{ transformOrigin: '152px 124px', animation: 'gillWaveSoft 2.8s ease-in-out infinite alternate' }}>
                  {/* Top Feathery Branch */}
                  <path
                    d={`M150,114 Q${150 + gillLength * 0.7},${104 - gillLength * 0.3} ${150 + gillLength * 1.35},${110 - gillLength * 0.2}`}
                    stroke="url(#embryoGillGrad)"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path d={`M${150 + gillLength * 0.6},${108 - gillLength * 0.2} Q${150 + gillLength * 0.8},${102 - gillLength * 0.3} ${150 + gillLength * 1.0},${104 - gillLength * 0.3}`} stroke={secondaryColor} strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  <circle cx={150 + gillLength * 1.35} cy={110 - gillLength * 0.2} r="3.2" fill={secondaryColor} opacity="0.85" />

                  {/* Mid Feathery Branch */}
                  <path
                    d={`M154,124 Q${154 + gillLength * 0.8},122 ${154 + gillLength * 1.45},127`}
                    stroke="url(#embryoGillGrad)"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path d={`M${154 + gillLength * 0.7},121 Q${154 + gillLength * 0.9},116 ${154 + gillLength * 1.1},118`} stroke={secondaryColor} strokeWidth="2" strokeLinecap="round" fill="none" />
                  <circle cx={154 + gillLength * 1.45} cy={127} r="3.5" fill={secondaryColor} opacity="0.85" />

                  {/* Bottom Feathery Branch */}
                  <path
                    d={`M151,134 Q${151 + gillLength * 0.7},${138 + gillLength * 0.3} ${151 + gillLength * 1.3},${144 + gillLength * 0.5}`}
                    stroke="url(#embryoGillGrad)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path d={`M${151 + gillLength * 0.6},${137 + gillLength * 0.2} Q${151 + gillLength * 0.8},${142 + gillLength * 0.3} ${151 + gillLength * 1.0},${141 + gillLength * 0.4}`} stroke={secondaryColor} strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  <circle cx={151 + gillLength * 1.3} cy={144 + gillLength * 0.5} r="3" fill={secondaryColor} opacity="0.85" />
                </g>

                {/* 6. Curled Baby Front Paws */}
                <ellipse cx="106" cy="162" rx="7" ry="5" fill={currentShade.body} transform="rotate(-15 106 162)" />
                <ellipse cx="130" cy="162" rx="7" ry="5" fill={currentShade.body} transform="rotate(15 130 162)" />
              </g>
            </g>

            {/* Suspended Floating Bioluminescent Micro-Bubbles */}
            <circle cx="70" cy="155" r="2.5" fill="#FFFFFF" opacity="0.6" />
            <circle cx="165" cy="140" r="3" fill={secondaryColor} opacity="0.7" />
            <circle cx="150" cy="205" r="2" fill="#FBBF24" opacity="0.75" />
            <circle cx="85" cy="225" r="2" fill="#FFFFFF" opacity="0.5" />
          </g>

          {/* ================================================================= */}
          {/* EGG SHELL EXTERIOR (Glass Surface, Specular & Luminous Veins)      */}
          {/* ================================================================= */}

          {/* Translucent Glass Outline with Fresnel Color Shift */}
          <path
            d="M120,25 C185,25 218,105 218,185 C218,245 178,272 120,272 C62,272 22,245 22,185 C22,105 55,25 120,25 Z"
            fill="none"
            stroke="url(#eggRimGrad)"
            strokeWidth="3.5"
            opacity="0.88"
          />

          {/* Primary Top-Left Specular Reflection (Curved Glass Sheen) */}
          <path
            d="M80,48 C108,35 142,38 162,52 C142,60 112,54 84,68 C78,60 76,54 80,48 Z"
            fill="#FFFFFF"
            opacity="0.62"
            filter="blur(1.5px)"
          />

          {/* Side Arc Glass Highlight */}
          <path
            d="M40,130 C35,160 42,195 58,225"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.4"
            filter="blur(1px)"
          />

          {/* Secondary Rim Caustic Reflection (Bottom Right) */}
          <path
            d="M190,210 C180,235 160,255 135,264"
            stroke="url(#eggRimGrad)"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />

          {/* ================================================================= */}
          {/* LUMINOUS FRACTURES OF AWARENESS (0, 5, 10, 15, 20 TRACES)         */}
          {/* ================================================================= */}
          {/* 5+ Traces: First Hairline Vein of Inner Light */}
          {progress >= 5 && (
            <path
              d="M92,85 L102,105 L96,122 L110,140"
              stroke="#FDE68A"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              filter="url(#radiantVeinGlow)"
              opacity={0.88}
            />
          )}

          {/* 10+ Traces: Secondary Vein with Golden Spark */}
          {progress >= 10 && (
            <g>
              <path
                d="M148,82 L136,104 L150,120 L140,142 L154,160"
                stroke="#FBBF24"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                filter="url(#radiantVeinGlow)"
                opacity={0.92}
              />
              <circle cx="140" cy="142" r="3" fill="#FFF" filter="url(#softGlowFilter)" />
            </g>
          )}

          {/* 15+ Traces: Crown Crystalline Veins */}
          {progress >= 15 && (
            <g>
              <path
                d="M112,42 L124,65 L114,84 L128,104"
                stroke="#FDE047"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                filter="url(#radiantVeinGlow)"
              />
              <path
                d="M68,172 L82,185 L76,204"
                stroke="#FCD34D"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
                filter="url(#radiantVeinGlow)"
              />
            </g>
          )}

          {/* 20+ Traces: Radiant Web of Emergence (Ready to Hatch) */}
          {progress >= 20 && (
            <g>
              <path
                d="M120,25 L124,62 L108,92 L132,130 L115,168 L128,212 L120,272"
                stroke="#FFFFFF"
                strokeWidth="3.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                filter="url(#radiantVeinGlow)"
              />
              <circle cx="132" cy="130" r="9" fill="#FEF08A" opacity="0.8" filter="blur(3px)" />
              <circle cx="115" cy="168" r="7" fill="#FEF08A" opacity="0.75" filter="blur(2.5px)" />
            </g>
          )}

          {/* Dynamic Golden Energy Motes (Count scales with progress) */}
          {Array.from({ length: Math.min(progress, 16) }).map((_, i) => (
            <circle
              key={i}
              cx={50 + (i * 27) % 140}
              cy={70 + (i * 37) % 160}
              r={1.2 + (i % 2.2) * 0.8}
              fill={i % 2 === 0 ? '#FDE047' : '#FFFFFF'}
              opacity={0.65 + (i % 3) * 0.12}
              filter="url(#softGlowFilter)"
            />
          ))}

          {/* Touch Ripple Visual in SVG space */}
          {touchPoint && isTouched && (
            <circle
              cx={touchPoint.x * (240 / size)}
              cy={touchPoint.y * (300 / size)}
              r="22"
              stroke="#FFF"
              strokeWidth="2.5"
              fill="rgba(255, 255, 255, 0.25)"
              style={{
                animation: 'touchRippleEffect 0.65s ease-out forwards',
                transformOrigin: `${touchPoint.x * (240 / size)}px ${touchPoint.y * (300 / size)}px`,
              }}
            />
          )}
        </svg>

        {/* 3. LAYER: Floating Particles Burst upon Petting */}
        {particles.map((p) => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y,
              pointerEvents: 'none',
              animation: 'particleFloatUp 1.4s cubic-bezier(0.22, 1, 0.36, 1) forwards',
              fontSize: '22px',
              textShadow: `0 0 10px ${p.color}`,
              zIndex: 10,
            }}
          >
            {p.char}
          </div>
        ))}
      </div>
    );
  }

  // -------------------------------------------------------------
  // STAGE 1+: HATCHED COMPANION (Axolotl / Salamander)
  // -------------------------------------------------------------
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

      {/* Form 1 Master Candidate Asset with Floating & Glow */}
      <img
        src="/images/companion_form1.png"
        alt="สหายสติ ร่าง 1"
        className="form1AxolotlAsset"
        data-testid="companion-form1-asset"
        style={{
          width: size * 0.95,
          height: size * 0.95,
          objectFit: 'contain',
          position: 'relative',
          zIndex: 5,
          animation: 'form1FloatSoft 4.5s ease-in-out infinite alternate',
          filter: isInteracting
            ? 'drop-shadow(0 0 22px rgba(251, 191, 36, 0.65)) drop-shadow(0 12px 28px rgba(244, 114, 182, 0.55))'
            : 'drop-shadow(0 0 12px rgba(244, 114, 182, 0.35)) drop-shadow(0 8px 20px rgba(168, 85, 247, 0.2))',
          transform: isInteracting ? 'scale(1.08) translateY(-6px)' : 'scale(1)',
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease',
          pointerEvents: 'none',
        }}
      />

      {/* Floating Particles upon Petting */}
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            pointerEvents: 'none',
            animation: 'floatUpHeart 1.2s forwards ease-out',
            fontSize: '22px',
            textShadow: `0 0 10px ${p.color}`,
            zIndex: 10,
          }}
        >
          {p.char}
        </div>
      ))}

      <style>{`
        @keyframes form1FloatSoft {
          0% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-8px) rotate(-1.5deg);
          }
          100% {
            transform: translateY(4px) rotate(1deg);
          }
        }
        @keyframes floatUpHeart {
          0% { opacity: 1; transform: translateY(0) scale(0.8); }
          100% { opacity: 0; transform: translateY(-50px) scale(1.3); }
        }
        @media (prefers-reduced-motion: reduce) {
          .form1AxolotlAsset {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};
