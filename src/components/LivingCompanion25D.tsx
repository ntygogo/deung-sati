import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CompanionSpriteMotion, SPRITE_CLIPS, type SpriteManifest, type SpritePose } from './companionSpriteMotion';
import './LivingCompanion25D.css';

const MANIFEST_URL = '/sprites/companion-model-v1/manifest.json?v=natural-idle-3';
const INITIAL_POSE: SpritePose = { clip: 'idle', frame: 0, mood: 'awake', action: 'idle' };

export function LivingCompanion25D({ paused = false, className = '' }: { paused?: boolean; className?: string }) {
  const [manifest, setManifest] = useState<SpriteManifest | null>(null);
  const [pose, setPose] = useState(INITIAL_POSE);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const clock = useRef(new CompanionSpriteMotion());
  const loaded = useRef(new Set<string>());
  const stroke = useRef({ x: 0, y: 0, distance: 0, at: -10, handled: false });

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const images: HTMLImageElement[] = [];
    loaded.current.clear();
    setLoadError(false);
    const load = async () => {
      try {
        const response = await fetch(MANIFEST_URL, { signal: controller.signal });
        if (!response.ok) throw new Error(`Companion sprite manifest: ${response.status}`);
        const data = await response.json() as SpriteManifest;
        if (!Number.isInteger(data.columns) || data.columns < 1 ||
          !SPRITE_CLIPS.every(name => {
            const item = data.clips?.[name as keyof SpriteManifest['clips']];
            return item && Number.isInteger(item.frames) && item.frames > 0 && Number.isFinite(item.fps) && item.fps > 0 &&
              typeof item.src === 'string' && item.src.startsWith('/sprites/companion-model-v1/');
          })) throw new Error('Invalid companion sprite manifest');
        const decode = async (name: keyof SpriteManifest['clips']) => {
          const image = new Image();
          images.push(image);
          image.src = data.clips[name].src;
          await image.decode();
          if (!disposed) loaded.current.add(name);
        };
        await decode('idle');
        if (disposed) return;
        clock.current = new CompanionSpriteMotion();
        setPose(INITIAL_POSE);
        setManifest(data);
        // Keep idle visible during later downloads or if an optional action fails.
        await Promise.all(SPRITE_CLIPS.filter(name => name !== 'idle').map(decode));
      } catch (error) {
        if (disposed) return;
        console.error('[companion-2.5d] image loading failed', error);
        setLoadError(true);
      }
    };
    void load();
    return () => { disposed = true; controller.abort(); images.forEach(image => { image.onload = null; image.onerror = null; }); };
  }, [retry]);

  useEffect(() => {
    if (!manifest || paused) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min((now - previous) / 1000, .2);
      previous = now;
      if (document.hidden) return;
      const next = clock.current.step(dt, manifest, reduced.matches);
      if (!loaded.current.has(next.clip)) { next.clip = 'idle'; next.frame = 0; next.action = 'loading-action'; }
      setPose(current => current.clip === next.clip && current.frame === next.frame && current.mood === next.mood && current.action === next.action ? current : next);
    }, 1000 / 24);
    return () => window.clearInterval(timer);
  }, [manifest, paused]);

  const greet = () => {
    if (loadError && !manifest) { setRetry(n => n + 1); return; }
    if (paused || !manifest) return;
    clock.current.touch();
  };
  const clip = manifest?.clips[pose.clip];
  const columns = manifest?.columns ?? 1;
  const rows = clip ? Math.ceil(clip.frames / columns) : 1;
  const spriteStyle: CSSProperties = clip ? {
    backgroundImage: `url("${clip.src}")`,
    backgroundSize: `${columns * 100}% ${rows * 100}%`,
    backgroundPosition: `${columns > 1 ? (pose.frame % columns) / (columns - 1) * 100 : 0}% ${rows > 1 ? Math.floor(pose.frame / columns) / (rows - 1) * 100 : 0}%`,
  } : {};

  return <button type="button" className={`living-companion-3d living-companion-25d ${className}`}
    data-renderer="model-sprites" data-status={manifest ? 'ready' : loadError ? 'error' : 'loading'}
    data-action={pose.action} data-mood={pose.mood} data-frame={pose.frame} aria-label="แตะเล่นกับน้องดึงสติ"
    aria-description="แตะเพื่อเล่น หรือลากลูบเบา ๆ เพื่อให้น้องอ้อน"
    onClick={event => {
      if (event.detail > 0 && stroke.current.handled) { stroke.current.handled = false; return; }
      greet();
    }} onPointerDown={event => { stroke.current = { ...stroke.current, x: event.clientX, y: event.clientY, distance: 0, handled: false }; }}
    onPointerMove={event => {
      if (!event.buttons || paused || !manifest) return;
      const state = stroke.current;
      state.distance += Math.hypot(event.clientX - state.x, event.clientY - state.y);
      state.x = event.clientX; state.y = event.clientY;
      if (state.distance > 35 && clock.current.time - state.at > 2) { clock.current.touch('pet'); state.at = clock.current.time; state.distance = 0; state.handled = true; }
    }}>
    <span className="companion-model-sprite" role="img" aria-label="น้องจากโมเดล 3D เดิม แสดงแบบ 2.5D" style={spriteStyle}/>
    {!manifest && !loadError && <span className="companion-model-message" role="status">กำลังพาน้องมาหา…</span>}
    {loadError && <span className="companion-model-message" role="status">{manifest ? 'บางท่าโหลดไม่ครบ แต่น้องยังเล่นได้' : 'โหลดภาพน้องไม่ครบ · แตะเพื่อลองใหม่'}</span>}
    {pose.mood === 'happy' && <span className="companion-model-heart" aria-hidden="true">♥</span>}
    {pose.mood === 'sleep' && <span className="companion-model-sleep" aria-hidden="true">z Z</span>}
  </button>;
}
