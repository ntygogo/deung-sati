import { useEffect, useId, useRef, useState } from 'react';
import './LivingCompanion3D.css';

type LivingCompanion3DProps = { paused?: boolean; className?: string };
type CompanionReaction = 'wave' | 'hop' | 'wiggle' | 'nuzzle';

// The public entry point now uses native SVG. Keep the GLB renderer below intact
// for future comparison; it is never mounted or imported by this SVG path.
export function LivingCompanion3D({ paused = false, className = '' }: LivingCompanion3DProps) {
  const id = useId().replace(/:/g, '');
  const runtime = useRef({ time: 0, touched: 0, next: 7, blink: 2, blinkUntil: 0, actionAt: -10, action: 'wave', count: 0, look: 0 });
  const [pose, setPose] = useState({ time: 0, action: 'idle', strength: 0, closed: false, sleepy: false, rest: false, look: 0, happy: false });
  useEffect(() => {
    if (paused) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let last = performance.now();
    let painted = last;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, .05);
      last = now;
      if (document.hidden) return;
      const r = runtime.current;
      r.time += dt;
      if (now - painted < 33) return;
      painted = now;
      const idle = r.time - r.touched;
      if (r.time >= r.blink) { r.blinkUntil = r.time + .15; r.blink = r.time + 2.5 + Math.random() * 4; }
      if (r.time >= r.next && idle < 30 && r.time - r.actionAt > 2) {
        const actions = ['wave', 'wiggle', 'curious'];
        r.action = actions[Math.floor(Math.random() * actions.length)];
        r.actionAt = r.time;
        r.next = r.time + 8 + Math.random() * 10;
      }
      const age = r.time - r.actionAt;
      const strength = age < 1.8 ? Math.sin(age / 1.8 * Math.PI) : 0;
      setPose({ time: reduced.matches ? 0 : r.time, action: r.action, strength: reduced.matches ? 0 : strength,
        closed: r.time < r.blinkUntil, sleepy: idle > 50, rest: idle > 30,
        look: reduced.matches ? 0 : r.look, happy: idle < 2.2 && r.count > 0 });
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused]);
  const greet = () => {
    if (paused) return;
    const r = runtime.current;
    r.action = ['wave', 'hop', 'wiggle', 'nuzzle'][r.count++ % 4];
    r.actionAt = r.time;
    r.touched = r.time;
    r.next = r.time + 8 + Math.random() * 10;
  };
  const { time: t, strength: s, sleepy, rest, happy } = pose;
  const action = (name: string) => pose.action === name ? s : 0;
  const breath = Math.sin(t * (sleepy ? 1.4 : 2)) * (sleepy ? .006 : .009);
  const tilt = action('curious') * 10 + action('nuzzle') * -13 + pose.look * 3 + (sleepy ? 9 : 0);
  const wave = action('wave') * (50 + Math.sin(t * 16) * 24);
  const bounce = action('hop') * Math.abs(Math.sin(s * Math.PI * 2)) * -15;
  const wiggle = Math.sin(t * 12) * action('wiggle') * 8;
  const tail = Math.sin(t * 9) * (s * 18 + (happy ? 10 : 0));
  const fill = `url(#${id}-body)`;
  return <button type="button" className={`living-companion-3d ${className}`} data-renderer="svg" data-status="ready"
    data-mood={sleepy ? 'sleep' : rest ? 'rest' : happy ? 'happy' : 'awake'} data-action={s > 0 ? pose.action : 'idle'}
    aria-label="แตะเล่นกับน้องดึงสติ" onClick={greet}
    onPointerMove={e => { if (!paused) { const box = e.currentTarget.getBoundingClientRect(); runtime.current.look = Math.max(-1, Math.min(1, (e.clientX - box.left) / box.width * 2 - 1)); } }}
    onPointerLeave={() => { runtime.current.look = 0; }}>
    <svg viewBox="0 0 240 250" role="img" aria-label="น้องแอกโซลอเติลสีชมพู โต้ตอบได้โดยไม่ใช้ WebGL" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <radialGradient id={`${id}-body`} cx="35%" cy="24%" r="80%"><stop stopColor="#fff2f5"/><stop offset=".5" stopColor="#ffb7cc"/><stop offset="1" stopColor="#d97da6"/></radialGradient>
        <linearGradient id={`${id}-gill`} x2="0" y2="1"><stop stopColor="#ffa6c4"/><stop offset="1" stopColor="#e75691"/></linearGradient>
      </defs>
      <ellipse cx="120" cy="220" rx={49 + bounce * .4} ry="8" fill="#895c8224"/>
      <g transform={`translate(${wiggle} ${bounce + (rest ? 5 : 0)}) translate(120 211) scale(${1 - breath / 2} ${1 + breath}) translate(-120 -211)`}>
        <g transform={`rotate(${tail} 153 174)`}>
          <path d="M145 184 Q211 206 197 148 Q190 130 173 138 Q193 178 145 162Z" fill={fill}/>
          <path d="M174 138 Q201 132 208 158 Q210 181 192 189 Q204 160 174 138" fill="#a7cfe6" opacity=".65"/>
        </g>
        <ellipse cx="120" cy="169" rx="44" ry="42" fill={fill}/>
        <ellipse cx="120" cy="172" rx="30" ry="31" fill="#fff0f0" opacity=".85"/>
        <g transform={`rotate(${action('hop') * -18} 96 200)`}><ellipse cx="94" cy="205" rx="17" ry="11" fill={fill}/><path d="M87 207v3m7-3v3" stroke="#d580a1" strokeWidth="1.5" strokeLinecap="round"/></g>
        <g transform={`rotate(${action('hop') * 18} 145 200)`}><ellipse cx="146" cy="205" rx="17" ry="11" fill={fill}/><path d="M145 207v3m7-3v3" stroke="#d580a1" strokeWidth="1.5" strokeLinecap="round"/></g>
        <g transform={`rotate(${wave} 84 156)`}><ellipse cx="79" cy="174" rx="11" ry="21" transform="rotate(18 79 174)" fill={fill}/><ellipse cx="75" cy="185" rx="6" ry="5" fill="#f393b6"/></g>
        <g transform={`rotate(${-action('wiggle') * 24} 157 156)`}><ellipse cx="161" cy="174" rx="11" ry="21" transform="rotate(-18 161 174)" fill={fill}/><ellipse cx="165" cy="185" rx="6" ry="5" fill="#f393b6"/></g>
        <g transform={`rotate(${tilt} 120 140)`}>
          {[-1, 1].map(side => <g key={side} transform={`translate(120 112) scale(${side} 1) rotate(${Math.sin(t * 1.8) * 2 + s * 5} 48 0)`}>
            {[[-20, -26], [0, 0], [20, 27]].map(([y, tip], i) => <g key={i}>
              <path d={`M47 ${y} Q70 ${y - 3} 91 ${tip}`} fill="none" stroke={`url(#${id}-gill)`} strokeWidth="10" strokeLinecap="round"/>
              <path d={`M67 ${y} l4 -10 M78 ${tip} l5 -9 M72 ${y + 2} l5 8`} fill="none" stroke="#f889b1" strokeWidth="5" strokeLinecap="round"/>
            </g>)}
          </g>)}
          <path d="M57 110 C53 57 181 55 184 106 C190 159 51 164 57 110Z" fill={fill}/>
          <ellipse cx="80" cy="126" rx="11" ry="6" fill="#ee7da5" opacity=".55"/>
          <ellipse cx="160" cy="126" rx="11" ry="6" fill="#ee7da5" opacity=".55"/>
          {sleepy || pose.closed || happy ? <g fill="none" stroke="#543346" strokeWidth="3.5" strokeLinecap="round">
            <path d={happy ? 'M85 111 Q95 99 105 111' : 'M85 109 Q95 118 105 109'}/><path d={happy ? 'M135 111 Q145 99 155 111' : 'M135 109 Q145 118 155 109'}/>
          </g> : <g transform={`translate(${pose.look * 3} 0)`}>
            {[95, 145].map(x => <g key={x}><ellipse cx={x} cy="108" rx="9" ry={rest ? 7 : 12} fill="#483046"/><ellipse cx={x - 2.5} cy="103" rx="3" ry="4" fill="white"/><circle cx={x + 3} cy="113" r="1.5" fill="#fff"/></g>)}
          </g>}
          <path d={happy ? 'M109 127 Q120 147 132 127Z' : 'M112 129 Q120 136 129 129'} fill={happy ? '#a44d73' : 'none'} stroke="#694057" strokeWidth="2.5" strokeLinecap="round"/>
          {happy && <ellipse cx="121" cy="136" rx="5" ry="2.5" fill="#ffb3cc"/>}
          <path d="M120 72 Q115 53 123 43" fill="none" stroke="#ec9bb6" strokeWidth="5" strokeLinecap="round"/>
          <circle cx="124" cy="39" r="12" fill="#ffe393" opacity=".25"/><circle cx="124" cy="39" r="7" fill="#ffe49a"/><circle cx="122" cy="37" r="2.5" fill="#fffbed"/>
        </g>
      </g>
      {happy && <text x="189" y="65" fill="#e869a1" fontSize="24">♥</text>}
      {sleepy && <text x="180" y="65" fill="#8274a4" fontSize="15">z Z</text>}
    </svg>
  </button>;
}

export function LegacyLivingCompanion3D({ paused = false, className = '' }: LivingCompanion3DProps) {
  const mountRef = useRef<HTMLSpanElement>(null);
  const pausedRef = useRef(paused);
  const greetingRef = useRef(0);
  const hoverRef = useRef(false);
  const reactionRef = useRef<{ kind: CompanionReaction; startedAt: number }>({ kind: 'wave', startedAt: -10_000 });
  const reactionIndexRef = useRef(0);
  const greetingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [greeting, setGreeting] = useState(false);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    let renderer: import('three').WebGLRenderer | undefined;
    let releaseModel: (() => void) | undefined;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const start = async () => {
      try {
        const THREE = await import('three');
        const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
          import('three/addons/loaders/GLTFLoader.js'),
          import('three/addons/libs/meshopt_decoder.module.js'),
        ]);
        if (disposed) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(29, 1, 0.01, 100);
        camera.position.set(0, 0.03, 4.25);
        camera.lookAt(0, 0.05, 0);
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;
        renderer.setClearColor(0x000000, 0);
        mount.appendChild(renderer.domElement);

        scene.add(new THREE.HemisphereLight(0xfff3ed, 0x6d638d, 2.5));
        const key = new THREE.DirectionalLight(0xffe1cf, 3.2);
        key.position.set(2.8, 4.2, 4.8);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xaeb9ff, 2.1);
        rim.position.set(-3.4, 2.3, -2.2);
        scene.add(rim);

        const loader = new GLTFLoader();
        loader.setMeshoptDecoder(MeshoptDecoder);
        const gltf = await loader.loadAsync('/models/deung-sati-puppy-v2-web.glb');
        releaseModel = () => {
          const textures = new Set<import('three').Texture>();
          gltf.scene.traverse(object => {
            const mesh = object as import('three').Mesh;
            if (!mesh.isMesh) return;
            mesh.geometry.dispose();
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach(material => {
              Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); });
              material.dispose();
            });
          });
          textures.forEach(texture => texture.dispose());
        };
        if (disposed) { releaseModel(); return; }
        const model = gltf.scene;
        const pivot = new THREE.Group();
        pivot.add(model);
        scene.add(pivot);

        const bounds = new THREE.Box3().setFromObject(model);
        const center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());
        const fittedScale = 1.75 / Math.max(size.x, size.y);
        model.scale.setScalar(fittedScale);
        model.position.copy(center).multiplyScalar(-fittedScale);
        pivot.position.y = -0.03;
        model.traverse((object) => {
          if ('isMesh' in object && object.isMesh) (object as import('three').Mesh).frustumCulled = false;
        });

        const boneNames = [
          'Bone_001', 'Bone_002', 'Bone_028', 'Bone_029',
          'Bone_017', 'Bone_018', 'Bone_019',
          'Bone_034', 'Bone_037', 'Bone_043', 'Bone_046', 'Bone_049', 'Bone_052', 'Bone_055',
          'Bone_023', 'Bone_027', 'Bone_009', 'Bone_014',
        ] as const;
        const bones = new Map(boneNames.map(name => [name, model.getObjectByName(name)]));
        const rests = new Map(
          [...bones].flatMap(([name, bone]) => bone ? [[name, bone.quaternion.clone()] as const] : []),
        );
        let motionStrength = 1;
        const pose = (name: typeof boneNames[number], x = 0, y = 0, z = 0) => {
          const bone = bones.get(name);
          const rest = rests.get(name);
          if (!bone || !rest) return;
          bone.quaternion.copy(rest).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x * motionStrength, y * motionStrength, z * motionStrength)));
        };
        const faces: import('three').Mesh[] = [];
        model.traverse(object => {
          const mesh = object as import('three').Mesh;
          if (mesh.isMesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) faces.push(mesh);
        });
        const morph = (name: string, value: number, blend: number) => faces.forEach(mesh => {
          const index = mesh.morphTargetDictionary?.[name];
          if (index !== undefined && mesh.morphTargetInfluences) {
            mesh.morphTargetInfluences[index] += (value - mesh.morphTargetInfluences[index]) * blend;
          }
        });
        const clock = new THREE.Clock();
        let elapsed = 0;
        let lastTouch = -100;
        let lastGreeting = 0;
        let blinkAt = 1.6;
        let blinkStarted = -10;
        let nextCuriousLook = 2.4;
        let nextSpontaneousGesture = 7;
        let nextTailWag = 3.5;
        let tailWagStarted = -10;
        let tailWagDuration = 1.8;
        let lookStarted = 0;
        let lookDirection = 1;

        const resize = () => {
          const width = Math.max(1, mount.clientWidth);
          const height = Math.max(1, mount.clientHeight);
          renderer?.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        observer = new ResizeObserver(resize);
        observer.observe(mount);
        resize();
        setStatus('ready');

        const animate = () => {
          frame = requestAnimationFrame(animate);
          const dt = Math.min(clock.getDelta(), 0.05);
          if (!pausedRef.current && !document.hidden) {
            elapsed += dt;
            const t = elapsed;
            if (greetingRef.current !== lastGreeting) { lastGreeting = greetingRef.current; lastTouch = t; }
            // Long quiet intervals lead to rest and dozing; a touch wakes the puppy.
            const idle = t - Math.max(0, lastTouch);
            const sleepy = THREE.MathUtils.smoothstep(idle, 48, 58);
            const resting = THREE.MathUtils.smoothstep(idle, 28, 38);
            const playful = (1 - resting) * (0.45 + 0.55 * Math.max(0, Math.sin(t * 0.42)));
            motionStrength = reducedMotion.matches ? 0.12 : 1 - sleepy * 0.92;
            if (t >= blinkAt) { blinkStarted = t; blinkAt = t + 2.2 + Math.random() * 3; }
            const blink = Math.max(0, 1 - Math.abs(t - blinkStarted - 0.1) / 0.1);
            const touched = Math.max(0, 1 - (t - lastTouch) / 2);
            const reactionAge = (performance.now() - reactionRef.current.startedAt) / 1000;
            const reactionEnvelope = reactionAge < 1.7 ? Math.sin((reactionAge / 1.7) * Math.PI) : 0;
            const isReaction = (kind: CompanionReaction) => reactionRef.current.kind === kind ? reactionEnvelope : 0;
            const wave = isReaction('wave');
            const hop = isReaction('hop');
            const wiggle = isReaction('wiggle');
            const nuzzle = isReaction('nuzzle');
            const interested = hoverRef.current ? 1 : 0;
            if (t > nextTailWag && idle < 38) {
              tailWagStarted = t;
              tailWagDuration = 1.25 + Math.random() * 1.45;
              nextTailWag = t + 8 + Math.random() * 10;
            }
            const tailWagAge = t - tailWagStarted;
            const tailWag = tailWagAge < tailWagDuration ? Math.sin((tailWagAge / tailWagDuration) * Math.PI) : 0;
            const blend = 1 - Math.exp(-dt * 20);
            morph('Blink_L', Math.max(blink, sleepy, resting * 0.4), blend);
            morph('Blink_R', Math.max(blink, sleepy, resting * 0.36), blend);
            morph('Happy_Eyes', Math.max(touched * 0.65, interested * 0.34), blend);
            morph('Smile', 0.22 + playful * 0.5 + touched * 0.28 + interested * 0.12 - sleepy * 0.16, blend);
            morph('Gaze_X', Math.sin(t * 1.3) * 0.55 * (1 - sleepy) * (1 - interested), blend);
            morph('Gaze_Z', Math.sin(t * 1.6) * 0.16 * (1 - sleepy), blend);
            const hello = Math.max(0, greetingRef.current - performance.now()) / 850;
            const happy = Math.sin((1 - hello) * Math.PI * 4) * hello;
            const breath = Math.sin(t * 2.15);

            if (t > nextCuriousLook) {
              lookStarted = t;
              lookDirection *= -1;
              nextCuriousLook = t + 4.2 + Math.random() * 3.2;
            }
            if (t > nextSpontaneousGesture && idle < 25 && reactionEnvelope === 0) {
              const spontaneous: CompanionReaction[] = ['nuzzle', 'wiggle', 'wave'];
              reactionRef.current = { kind: spontaneous[Math.floor(Math.random() * spontaneous.length)], startedAt: performance.now() };
              nextSpontaneousGesture = t + 7 + Math.random() * 6;
            }
            const lookAge = t - lookStarted;
            const lookEnvelope = lookAge < 2.2 ? Math.sin((lookAge / 2.2) * Math.PI) : 0;
            const curious = lookEnvelope * lookDirection;
            const activeBody = Math.max(touched, reactionEnvelope, interested * .35, lookEnvelope * .25);

            // The body settles a fraction after the head so the character has weight.
            pivot.position.y = -0.03 + Math.sin(t * 1.18) * 0.018 + Math.abs(happy) * 0.085 + Math.sin(Math.min(reactionAge / .82, 1) * Math.PI) * .18 * hop;
            pivot.rotation.y = Math.sin(t * 0.43) * 0.025 + happy * 0.11 + Math.sin(reactionAge * 15) * .16 * wiggle;
            pivot.rotation.z = Math.sin(t * 0.61) * 0.01 - happy * 0.045 - .08 * nuzzle;
            pivot.scale.set(1 + breath * 0.004, 1 + breath * 0.009, 1 - breath * 0.003);
            pivot.rotation.y *= motionStrength;
            pivot.rotation.z *= motionStrength;

            pose('Bone_001', breath * 0.008, Math.sin(t * 0.48) * 0.018, Math.sin(t * 0.72) * 0.012);
            pose('Bone_002', -breath * 0.014, curious * 0.035, -curious * 0.012);
            pose('Bone_028', breath * 0.01 - .08 * nuzzle, curious * 0.13 + happy * 0.08, curious * -0.055 - happy * 0.04 - .1 * nuzzle);
            pose('Bone_029', Math.sin(t * 1.05) * 0.025 - .16 * nuzzle, curious * 0.04 + .08 * nuzzle, Math.sin(t * 1.42) * 0.035 + happy * 0.09 + .16 * nuzzle);
            if (sleepy > 0) {
              const head = bones.get('Bone_029');
              head?.rotateX(-0.12 * sleepy);
              head?.rotateZ(0.10 * sleepy);
            }

            // Tail wave travels outward rather than rotating as one rigid piece.
            const tailEnergy = Math.min(1.3, tailWag * .72 + touched * .7 + wiggle + interested * .22);
            pose('Bone_017', 0, Math.sin(t * 1.55) * 0.012, Math.sin(t * 5.2) * 0.11 * tailEnergy + happy * 0.1);
            pose('Bone_018', 0, Math.sin(t * 1.55 - 0.65) * 0.014, Math.sin(t * 5.2 - .65) * 0.17 * tailEnergy + happy * 0.14);
            pose('Bone_019', 0, Math.sin(t * 1.55 - 1.25) * 0.016, Math.sin(t * 5.2 - 1.25) * 0.24 * tailEnergy + happy * 0.18);

            // Six gills ripple in offset pairs, like soft fronds moving through water.
            const gills: Array<[typeof boneNames[number], number, number]> = [
              ['Bone_034', -1, 0], ['Bone_037', 1, 0.45],
              ['Bone_046', -1, 0.8], ['Bone_049', 1, 1.2],
              ['Bone_052', -1, 1.55], ['Bone_055', 1, 1.95],
            ];
            gills.forEach(([name, side, phase]) => {
              const flutter = Math.sin(t * 2.05 + phase) * 0.035 + Math.sin(t * 0.74 + phase) * 0.022;
              pose(name, flutter * 0.45, curious * side * 0.025, side * (flutter + happy * 0.055));
            });

            // Tiny limb shifts stop the silhouette from reading as a rubber figurine.
            pose('Bone_023', breath * 0.006 - .25 * wave, 0, Math.sin(t * 1.8) * 0.035 * activeBody + happy * 0.06 + (.42 + Math.sin(reactionAge * 14) * .18) * wave);
            pose('Bone_027', -breath * 0.006, 0, -Math.sin(t * 1.8 + 0.5) * 0.03 * activeBody - happy * 0.06);
            pose('Bone_009', 0, Math.sin(t * 1.45) * 0.025 * activeBody, Math.sin(t * 1.7) * 0.022 * activeBody);
            pose('Bone_014', 0, -Math.sin(t * 1.45) * 0.025 * activeBody, -Math.sin(t * 1.7 + 0.4) * 0.022 * activeBody);
          }
          renderer?.render(scene, camera);
        };
        animate();
      } catch (error) {
        console.error('Unable to load the companion model', error);
        if (!disposed) setStatus('error');
      }
    };

    void start();
    return () => {
      disposed = true;
      clearTimeout(greetingTimer.current);
      cancelAnimationFrame(frame);
      observer?.disconnect();
      releaseModel?.();
      if (renderer) { renderer.dispose(); renderer.domElement.remove(); }
    };
  }, []);

  const greet = () => {
    const reactions: CompanionReaction[] = ['wave', 'hop', 'wiggle', 'nuzzle'];
    const kind = reactions[reactionIndexRef.current++ % reactions.length];
    reactionRef.current = { kind, startedAt: performance.now() };
    greetingRef.current = performance.now() + 850;
    setGreeting(true);
    clearTimeout(greetingTimer.current);
    greetingTimer.current = setTimeout(() => setGreeting(false), 850);
  };

  return <button type="button" className={`living-companion-3d ${className}`} onClick={greet}
    onPointerEnter={() => { hoverRef.current = true; }} onPointerLeave={() => { hoverRef.current = false; }}
    aria-label="แตะทักทายน้อง" data-status={status} data-greeting={greeting}>
    <span ref={mountRef} className="living-companion-canvas" aria-hidden="true" />
    {status === 'loading' && <span className="living-companion-loading" aria-hidden="true" />}
    {status === 'error' && <span aria-live="polite" style={{ position: 'absolute', inset: '42% 8% auto', color: '#fff', fontSize: 13 }}>อุปกรณ์นี้ยังแสดงน้อง 3D ไม่ได้</span>}
    {greeting && <span className="living-companion-heart" aria-hidden="true">♥</span>}
  </button>;
}
