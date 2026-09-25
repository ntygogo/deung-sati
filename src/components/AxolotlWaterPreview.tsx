import { useEffect, useRef, useState } from 'react';
import './LivingCompanion3D.css';

type Props = { paused?: boolean };

// Meshy UniRig bone names were checked against this specific model's skin weights.
// Keep this preview separate from the sprite renderer until its appearance is approved.
const TAIL = ['Bone_019', 'Bone_018', 'Bone_017', 'Bone_016', 'Bone_015', 'Bone_014'] as const;
const GILLS = [
  { root: 'Bone_035', tip: 'Bone_034', phase: 0.1, side: 1 },
  { root: 'Bone_037', tip: 'Bone_036', phase: 0.65, side: -1 },
  { root: 'Bone_039', tip: 'Bone_038', phase: 1.3, side: 1 },
  { root: 'Bone_041', tip: 'Bone_040', phase: 1.85, side: -1 },
] as const;

export function AxolotlWaterPreview({ paused = false }: Props) {
  const mountRef = useRef<HTMLSpanElement>(null);
  const pausedRef = useRef(paused);
  const touchedRef = useRef(-100);
  const elapsedRef = useRef(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    let renderer: import('three').WebGLRenderer | undefined;
    let disposeModel: (() => void) | undefined;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const start = async () => {
      try {
        const THREE = await import('three');
        const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
        if (disposed) return;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 50);
        camera.position.set(3.0, 1.8, 3.0);
        camera.lookAt(0, 0.75, 0);
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x000000, 0);
        mount.appendChild(renderer.domElement);
        scene.add(new THREE.HemisphereLight(0xfff9f2, 0x9c88ae, 2.5));
        const key = new THREE.DirectionalLight(0xffe9dc, 3);
        key.position.set(3, 5, 4);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xd7dfff, 1.6);
        rim.position.set(-3, 2, -3);
        scene.add(rim);

        const gltf = await new GLTFLoader().loadAsync('/models/deung-sati-axolotl-water.glb');
        const model = gltf.scene;
        const pearl = new THREE.MeshPhysicalMaterial({ color: 0xffe5ed, roughness: 0.65, metalness: 0, clearcoat: 0.12, side: THREE.DoubleSide });
        model.traverse(object => {
          if ((object as import('three').Mesh).isMesh) {
            const mesh = object as import('three').Mesh;
            mesh.material = pearl;
            mesh.frustumCulled = false;
          }
        });
        disposeModel = () => {
          model.traverse(object => { if ((object as import('three').Mesh).isMesh) (object as import('three').Mesh).geometry.dispose(); });
          pearl.dispose();
        };
        if (disposed) { disposeModel(); return; }
        const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
        const pivot = new THREE.Group();
        model.position.copy(center).multiplyScalar(-0.56);
        model.scale.setScalar(0.56);
        pivot.add(model);
        scene.add(pivot);

        const names = [...TAIL, ...GILLS.flatMap(({ root, tip }) => [root, tip]), 'Bone_030', 'Bone_031', 'Bone_049', 'Bone_048'] as const;
        const bones = new Map(names.map(name => [name, model.getObjectByName(name)]));
        const rest = new Map([...bones].flatMap(([name, bone]) => bone ? [[name, bone.quaternion.clone()] as const] : []));
        const delta = new THREE.Quaternion();
        const euler = new THREE.Euler();
        const pose = (name: string, x: number, y: number, z: number) => {
          const bone = bones.get(name as typeof names[number]);
          const initial = rest.get(name as typeof names[number]);
          if (bone && initial) bone.quaternion.copy(initial).multiply(delta.setFromEuler(euler.set(x, y, z)));
        };
        const clock = new THREE.Clock();
        const resize = () => {
          if (!renderer) return;
          const width = Math.max(1, mount.clientWidth);
          const height = Math.max(1, mount.clientHeight);
          renderer.setSize(width, height, false);
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
            elapsedRef.current += dt;
            const t = elapsedRef.current;
            // A quiet current travels from the base toward the tail tip.
            // A second slower current prevents a short, visibly repeated loop.
            const motion = reducedMotion.matches ? 0.15 : 1;
            const touchAge = t - touchedRef.current;
            const response = touchAge > 0 && touchAge < 2.2 ? Math.sin(Math.PI * touchAge / 2.2) : 0;
            TAIL.forEach((bone, index) => {
              const phase = t * 1.45 - index * 0.51;
              const spread = 0.035 + index * 0.013;
              pose(bone,
                motion * (Math.sin(phase - 0.3) * spread * 0.28),
                motion * (Math.sin(phase) * spread + Math.sin(t * 0.47 - index * 0.33) * 0.018 + response * Math.sin(t * 5 - index * 0.6) * 0.065),
                motion * Math.sin(phase + 0.6) * spread * 0.35);
            });
            GILLS.forEach(({ root, tip, phase, side }) => {
              const current = Math.sin(t * 1.33 + phase) * 0.038 + Math.sin(t * 0.54 + phase * 0.6) * 0.014;
              pose(root, motion * current * 0.3, motion * side * current * 0.5, motion * side * (current + response * 0.035));
              pose(tip, motion * Math.sin(t * 1.33 + phase - 0.55) * 0.027,
                motion * side * Math.sin(t * 0.92 + phase - 0.4) * 0.022,
                motion * side * Math.sin(t * 1.33 + phase - 0.65) * 0.052);
            });
            // The small central frond and antenna lag behind the larger gills.
            pose('Bone_030', 0, motion * Math.sin(t * 1.12 - 0.4) * 0.012, motion * Math.sin(t * 0.77) * 0.012);
            pose('Bone_031', 0, 0, motion * Math.sin(t * 1.12 - 0.85) * 0.022);
            pose('Bone_049', motion * Math.sin(t * 0.92) * 0.009, 0, motion * Math.sin(t * 0.88) * 0.014);
            pose('Bone_048', 0, 0, motion * Math.sin(t * 0.88 - 0.5) * 0.018);
            pivot.position.y = motion * (Math.sin(t * 1.3) * 0.018 + Math.sin(t * 0.46) * 0.009);
            pivot.rotation.y = motion * Math.sin(t * 0.39) * 0.013;
          }
          renderer?.render(scene, camera);
        };
        animate();
      } catch (error) {
        console.error('Unable to load the axolotl preview', error);
        if (!disposed) setStatus('error');
      }
    };
    void start();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      disposeModel?.();
      if (renderer) { renderer.dispose(); renderer.domElement.remove(); }
    };
  }, []);

  return <button type="button" className="living-companion-3d" data-renderer="axolotl-water-preview" data-status={status}
    aria-label="แตะทักทายน้องแอกโซลอเติล" onClick={() => { if (!paused) touchedRef.current = elapsedRef.current; }}>
    <span ref={mountRef} className="living-companion-canvas" aria-hidden="true" />
    {status !== 'ready' && <span role="status" className="companion-model-message">{status === 'error' ? 'โหลดตัวอย่าง 3D ไม่ได้' : 'กำลังพาน้องมาหา…'}</span>}
  </button>;
}
