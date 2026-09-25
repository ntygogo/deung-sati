import { useEffect, useRef, useState } from 'react';
import './LivingCompanion3D.css';

type LivingCompanion3DProps = { paused?: boolean; className?: string };

export function LivingCompanion3D({ paused = false, className = '' }: LivingCompanion3DProps) {
  const mountRef = useRef<HTMLSpanElement>(null);
  const pausedRef = useRef(paused);
  const greetingRef = useRef(0);
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
        const gltf = await loader.loadAsync('/models/deung-sati-companion.glb');
        if (disposed) return;
        const model = gltf.scene;
        const pivot = new THREE.Group();
        pivot.add(model);
        scene.add(pivot);

        const bounds = new THREE.Box3().setFromObject(model);
        const center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());
        model.position.sub(center);
        const fittedScale = 1.75 / Math.max(size.x, size.y);
        model.scale.setScalar(fittedScale);
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
        const pose = (name: typeof boneNames[number], x = 0, y = 0, z = 0) => {
          const bone = bones.get(name);
          const rest = rests.get(name);
          if (!bone || !rest) return;
          bone.quaternion.copy(rest).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)));
        };
        const clock = new THREE.Clock();
        let nextCuriousLook = 2.4;
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
          const t = clock.getElapsedTime();
          if (!pausedRef.current) {
            const hello = Math.max(0, greetingRef.current - performance.now()) / 850;
            const happy = Math.sin((1 - hello) * Math.PI * 4) * hello;
            const breath = Math.sin(t * 2.15);

            if (t > nextCuriousLook) {
              lookStarted = t;
              lookDirection *= -1;
              nextCuriousLook = t + 4.2 + Math.random() * 3.2;
            }
            const lookAge = t - lookStarted;
            const lookEnvelope = lookAge < 2.2 ? Math.sin((lookAge / 2.2) * Math.PI) : 0;
            const curious = lookEnvelope * lookDirection;

            // The body settles a fraction after the head so the character has weight.
            pivot.position.y = -0.03 + Math.sin(t * 1.18) * 0.018 + Math.abs(happy) * 0.085;
            pivot.rotation.y = Math.sin(t * 0.43) * 0.025 + happy * 0.11;
            pivot.rotation.z = Math.sin(t * 0.61) * 0.01 - happy * 0.045;
            pivot.scale.set(1 + breath * 0.004, 1 + breath * 0.009, 1 - breath * 0.003);

            pose('Bone_001', breath * 0.008, Math.sin(t * 0.48) * 0.018, Math.sin(t * 0.72) * 0.012);
            pose('Bone_002', -breath * 0.014, curious * 0.035, -curious * 0.012);
            pose('Bone_028', breath * 0.01, curious * 0.13 + happy * 0.08, curious * -0.055 - happy * 0.04);
            pose('Bone_029', Math.sin(t * 1.05) * 0.025, curious * 0.04, Math.sin(t * 1.42) * 0.035 + happy * 0.09);

            // Tail wave travels outward rather than rotating as one rigid piece.
            pose('Bone_017', 0, Math.sin(t * 1.55) * 0.045, Math.sin(t * 1.55) * 0.07 + happy * 0.1);
            pose('Bone_018', 0, Math.sin(t * 1.55 - 0.65) * 0.055, Math.sin(t * 1.55 - 0.65) * 0.105 + happy * 0.14);
            pose('Bone_019', 0, Math.sin(t * 1.55 - 1.25) * 0.065, Math.sin(t * 1.55 - 1.25) * 0.14 + happy * 0.18);

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
            pose('Bone_023', breath * 0.014, 0, Math.sin(t * 0.92) * 0.018 + happy * 0.06);
            pose('Bone_027', -breath * 0.014, 0, -Math.sin(t * 0.92 + 0.5) * 0.018 - happy * 0.06);
            pose('Bone_009', 0, Math.sin(t * 0.7) * 0.012, Math.sin(t * 0.86) * 0.012);
            pose('Bone_014', 0, -Math.sin(t * 0.7) * 0.012, -Math.sin(t * 0.86 + 0.4) * 0.012);
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
      cancelAnimationFrame(frame);
      observer?.disconnect();
      if (renderer) { renderer.dispose(); renderer.domElement.remove(); }
    };
  }, []);

  const greet = () => {
    greetingRef.current = performance.now() + 850;
    setGreeting(true);
    window.setTimeout(() => setGreeting(false), 850);
  };

  return <button type="button" className={`living-companion-3d ${className}`} onClick={greet}
    aria-label="แตะทักทายน้อง" data-status={status} data-greeting={greeting}>
    <span ref={mountRef} className="living-companion-canvas" aria-hidden="true" />
    {status !== 'ready' && <img src="/images/companion_form1.png" alt="" className="living-companion-fallback" />}
    {status === 'loading' && <span className="living-companion-loading" aria-hidden="true" />}
    {greeting && <span className="living-companion-heart" aria-hidden="true">♥</span>}
  </button>;
}
