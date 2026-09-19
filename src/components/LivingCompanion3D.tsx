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

        const animatedNames = [
          'Bone_019', 'Bone_018', 'Bone_017',
          'Bone_034', 'Bone_037', 'Bone_043', 'Bone_046', 'Bone_049', 'Bone_052', 'Bone_055',
          'Bone_028', 'Bone_029',
        ];
        const bones = animatedNames.map(name => model.getObjectByName(name)).filter(Boolean) as import('three').Object3D[];
        const rests = bones.map(bone => bone.quaternion.clone());
        const clock = new THREE.Clock();

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
            pivot.position.y = -0.03 + Math.sin(t * 1.35) * 0.025 + Math.abs(happy) * 0.07;
            pivot.rotation.y = Math.sin(t * 0.52) * 0.035 + happy * 0.08;
            pivot.rotation.z = Math.sin(t * 0.72) * 0.012 - happy * 0.035;
            pivot.scale.setScalar(1 + Math.sin(t * 1.5) * 0.008);
            bones.forEach((bone, index) => {
              bone.quaternion.copy(rests[index]);
              const isTail = index < 3;
              const wave = Math.sin(t * (isTail ? 1.7 : 1.25) - index * 0.67);
              const amount = isTail ? 0.045 + index * 0.012 : index < 10 ? 0.025 : 0.012;
              bone.rotateZ(wave * amount + happy * (isTail ? 0.09 : 0.035));
            });
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
