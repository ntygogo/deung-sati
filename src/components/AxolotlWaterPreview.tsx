import { useEffect, useRef, useState } from 'react';
import './LivingCompanion3D.css';

type Props = { paused?: boolean };
// The eye line on this Meshy export is turned about 21 degrees from +Z.
const FRONT_YAW = -0.372;

// Meshy UniRig bone names were checked against this specific model's skin weights.
// Keep this preview separate from the sprite renderer until its appearance is approved.
const TAIL = ['Bone_022', 'Bone_021', 'Bone_020', 'Bone_019', 'Bone_018', 'Bone_017'] as const;
const GILLS = [
  { root: 'Bone_052', tip: 'Bone_049', phase: 0.1, side: -1 },
  { root: 'Bone_056', tip: 'Bone_053', phase: 0.65, side: 1 },
  { root: 'Bone_045', tip: 'Bone_043', phase: 1.3, side: -1 },
  { root: 'Bone_048', tip: 'Bone_046', phase: 1.85, side: 1 },
] as const;

export function AxolotlWaterPreview({ paused = false }: Props) {
  const mountRef = useRef<HTMLSpanElement>(null);
  const pausedRef = useRef(paused);
  const touchedRef = useRef(-100);
  const elapsedRef = useRef(0);
  const orbitRef = useRef(FRONT_YAW);
  const gazeRef = useRef(0);
  const dragRef = useRef<{ id: number; x: number; y: number; yaw: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
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
        let viewYaw = FRONT_YAW;
        camera.position.set(Math.sin(viewYaw) * 3.8, 0.35, Math.cos(viewYaw) * 3.8);
        camera.lookAt(0, 0.04, 0);
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.88;
        renderer.setClearColor(0x000000, 0);
        mount.appendChild(renderer.domElement);
        scene.add(new THREE.HemisphereLight(0xfff9f2, 0x9c88ae, 1.25));
        const key = new THREE.DirectionalLight(0xffe9dc, 1.4);
        key.position.set(3, 5, 4);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xd7dfff, 0.6);
        rim.position.set(-3, 2, -3);
        scene.add(rim);

        const gltf = await new GLTFLoader().loadAsync('/models/deung-sati-axolotl-water-textured.glb');
        const model = gltf.scene;
        const faces: import('three').SkinnedMesh[] = [];
        const eyelids = { value: 0 };
        // Small local morphs work with the existing skinning and baked face texture.
        // These coordinates belong to this model, not to arbitrary Meshy exports.
        model.traverse(object => {
          if (!(object as import('three').SkinnedMesh).isSkinnedMesh) return;
          const mesh = object as import('three').SkinnedMesh;
          const positions = mesh.geometry.getAttribute('position');
          const smile = new Float32Array(positions.count * 3);
          const eyes = [[0.1503, 0.9447, 1.9278], [-0.3378, 0.8956, 1.7373]];
          for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
            for (const [cx, cy, cz] of eyes) {
              const horizontal = (x - cx) * 0.932 + (z - cz) * 0.363;
              const depth = -(x - cx) * 0.363 + (z - cz) * 0.932;
              const radius = Math.sqrt((horizontal / 0.145) ** 2 + ((y - cy) / 0.18) ** 2 + (depth / 0.15) ** 2);
              const weight = 1 - THREE.MathUtils.smoothstep(radius, 0.58, 1.1);
              smile[i * 3 + 1] += (cy - y) * 0.16 * weight;
            }
            const horizontal = (x + 0.08) * 0.932 + (z - 1.94) * 0.363;
            const depth = -(x + 0.08) * 0.363 + (z - 1.94) * 0.932;
            const mouthWeight = Math.exp(-(((y - 0.755) / 0.068) ** 2 + (depth / 0.08) ** 2))
              * (1 - THREE.MathUtils.smoothstep(Math.abs(horizontal), 0.14, 0.23));
            smile[i * 3 + 1] += Math.min(1, Math.abs(horizontal) / 0.14) * 0.025 * mouthWeight;
          }
          mesh.geometry.morphTargetsRelative = true;
          mesh.geometry.morphAttributes.position = [new THREE.BufferAttribute(smile, 3)];
          // Keep cheek lighting consistent with the small smile deformation.
          const normalGeometry = new THREE.BufferGeometry();
          normalGeometry.setIndex(mesh.geometry.index);
          normalGeometry.setAttribute('position', positions.clone());
          normalGeometry.computeVertexNormals();
          const restNormals = normalGeometry.getAttribute('normal').clone();
          mesh.geometry.morphAttributes.normal = [smile].map(offsets => {
            const morphed = normalGeometry.getAttribute('position');
            for (let i = 0; i < positions.count; i++) morphed.setXYZ(i,
              positions.getX(i) + offsets[i * 3], positions.getY(i) + offsets[i * 3 + 1], positions.getZ(i) + offsets[i * 3 + 2]);
            normalGeometry.computeVertexNormals();
            const normals = normalGeometry.getAttribute('normal');
            const deltaNormals = new Float32Array(positions.count * 3);
            for (let i = 0; i < positions.count; i++) {
              deltaNormals[i * 3] = normals.getX(i) - restNormals.getX(i);
              deltaNormals[i * 3 + 1] = normals.getY(i) - restNormals.getY(i);
              deltaNormals[i * 3 + 2] = normals.getZ(i) - restNormals.getZ(i);
            }
            return new THREE.BufferAttribute(deltaNormals, 3);
          });
          normalGeometry.dispose();
          mesh.updateMorphTargets();
          faces.push(mesh);
          // The source has no separate eyelids. Shade smooth closing lids on the
          // surface rather than collapsing the sparse eye topology into a crease.
          for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            material.onBeforeCompile = shader => {
              shader.uniforms.axolotlBlink = eyelids;
              shader.uniforms.axolotlSkinRight = { value: new THREE.Color('#f5cfe1') };
              shader.uniforms.axolotlSkinLeft = { value: new THREE.Color('#f8cbde') };
              shader.vertexShader = shader.vertexShader
                .replace('#include <common>', '#include <common>\nvarying vec3 axolotlFacePosition;')
                .replace('#include <begin_vertex>', '#include <begin_vertex>\naxolotlFacePosition = position;');
              shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>', `#include <common>
                  varying vec3 axolotlFacePosition;
                  uniform float axolotlBlink;
                  uniform vec3 axolotlSkinRight;
                  uniform vec3 axolotlSkinLeft;
                  void closeAxolotlEye(inout vec3 color, inout float coverage, vec3 center, vec3 skin) {
                    vec3 d = axolotlFacePosition - center;
                    float x = dot(d, vec3(0.932, 0.0, 0.363));
                    float depth = dot(d, vec3(-0.363, 0.0, 0.932));
                    float region = 1.0 - smoothstep(0.94, 1.13, length(vec3(x / 0.092, d.y / 0.095, depth / 0.11)));
                    float aperture = 0.097 * (1.0 - axolotlBlink);
                    float lid = region * smoothstep(aperture - 0.008, aperture + 0.006, abs(d.y)) * smoothstep(0.0, 0.12, axolotlBlink);
                    color = mix(color, skin * mix(0.97, 1.025, smoothstep(-0.08, 0.08, d.y)), lid);
                    float curve = -0.002 + 0.009 * pow(x / 0.07, 2.0);
                    float line = (1.0 - smoothstep(0.001, 0.004, abs(d.y - curve))) * (1.0 - smoothstep(0.055, 0.075, abs(x)));
                    line *= region * smoothstep(0.83, 0.98, axolotlBlink);
                    color = mix(color, vec3(0.23, 0.085, 0.13), line);
                    coverage = max(coverage, lid);
                  }`)
                .replace('#include <map_fragment>', `#include <map_fragment>
                  float axolotlLidCoverage = 0.0;
                  closeAxolotlEye(diffuseColor.rgb, axolotlLidCoverage, vec3(0.1503, 0.9447, 1.9278), axolotlSkinRight);
                  closeAxolotlEye(diffuseColor.rgb, axolotlLidCoverage, vec3(-0.3378, 0.8956, 1.7373), axolotlSkinLeft);`)
                .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.65, axolotlLidCoverage);');
            };
            material.customProgramCacheKey = () => 'axolotl-soft-lids-v1';
          }
        });
        // Keep authored GLB materials intact when the textured model arrives.
        // The current clay export needs a temporary skin-weight color preview.
        const pearl = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.78, metalness: 0, clearcoat: 0.05, side: THREE.DoubleSide });
        model.traverse(object => {
          if ((object as import('three').Mesh).isMesh) {
            const mesh = object as import('three').SkinnedMesh;
            const authoredMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            if (authoredMaterials.some(material =>
              ('map' in material && Boolean(material.map)) ||
              ('vertexColors' in material && Boolean(material.vertexColors)) ||
              ('color' in material && material.color instanceof THREE.Color && material.color.getHex() !== 0xffffff)
            )) {
              mesh.frustumCulled = false;
              return;
            }
            const geometry = mesh.geometry;
            const positions = geometry.getAttribute('position');
            const indices = geometry.getAttribute('skinIndex');
            const weights = geometry.getAttribute('skinWeight');
            const colors = new Float32Array(positions.count * 3);
            const base = new THREE.Color(0xf2c3d0);
            const gill = new THREE.Color(0xd888ae);
            const lamp = new THREE.Color(0xffdfab);
            const color = new THREE.Color();
            const gillBones = new Set<string>(GILLS.flatMap(({ root, tip }) => [root, tip]));
            const gillJoints = new Set(mesh.skeleton.bones.flatMap((bone, index) => gillBones.has(bone.name) ? [index] : []));
            const lampJoints = new Set(mesh.skeleton.bones.flatMap((bone, index) => ['Bone_037', 'Bone_038'].includes(bone.name) ? [index] : []));
            for (let i = 0; i < positions.count; i++) {
              let gillWeight = 0;
              let lampWeight = 0;
              if (indices && weights) for (let j = 0; j < 4; j++) {
                const joint = indices.getComponent(i, j);
                const weight = weights.getComponent(i, j);
                if (gillJoints.has(joint)) gillWeight += weight;
                if (lampJoints.has(joint)) lampWeight += weight;
              }
              color.copy(base).lerp(gill, Math.min(0.85, gillWeight * 0.65)).lerp(lamp, Math.min(1, lampWeight));
              color.toArray(colors, i * 3);
            }
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            mesh.material = pearl;
            mesh.frustumCulled = false;
          }
        });
        const antennaTip = model.getObjectByName('Bone_037');
        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = glowCanvas.height = 128;
        const context = glowCanvas.getContext('2d');
        if (!context) throw new Error('Unable to make antenna glow');
        const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(255,248,214,1)');
        gradient.addColorStop(0.2, 'rgba(255,213,158,0.75)');
        gradient.addColorStop(1, 'rgba(255,180,130,0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 128, 128);
        const glowTexture = new THREE.CanvasTexture(glowCanvas);
        const glowMaterial = new THREE.SpriteMaterial({ map: glowTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.48 });
        const halo = new THREE.Sprite(glowMaterial);
        halo.position.set(0, 0.065, 0);
        halo.scale.setScalar(0.42);
        antennaTip?.add(halo);
        const light = new THREE.PointLight(0xffd7a6, 0.32, 0.7);
        light.position.copy(halo.position);
        antennaTip?.add(light);
        disposeModel = () => {
          model.traverse(object => {
            if (!(object as import('three').Mesh).isMesh) return;
            const mesh = object as import('three').Mesh;
            mesh.geometry.dispose();
            for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
              const surface = material as import('three').MeshStandardMaterial;
              surface.map?.dispose();
              surface.normalMap?.dispose();
              surface.metalnessMap?.dispose();
              material.dispose();
            }
          });
          pearl.dispose();
          glowMaterial.dispose();
          glowTexture.dispose();
        };
        if (disposed) { disposeModel(); return; }
        const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
        const pivot = new THREE.Group();
        model.position.copy(center).multiplyScalar(-0.56);
        model.scale.setScalar(0.56);
        pivot.add(model);
        scene.add(pivot);

        const names = [...TAIL, ...GILLS.flatMap(({ root, tip }) => [root, tip]), 'Bone_034', 'Bone_035', 'Bone_042', 'Bone_039'] as const;
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
        let nextBlink = 2.8;
        let blinkStarted = -10;
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
            if (t >= nextBlink) {
              blinkStarted = t;
              nextBlink = t + 3.1 + Math.random() * 3.4;
            }
            const blinkAge = t - blinkStarted;
            const blink = blinkAge < 0.24 ? Math.sin(Math.PI * Math.max(0, blinkAge) / 0.24) ** 2 : 0;
            eyelids.value = reducedMotion.matches ? 0 : blink;
            faces.forEach(mesh => {
              if (!mesh.morphTargetInfluences) return;
              mesh.morphTargetInfluences[0] = response;
            });
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
            // A small attentive tilt accompanies the smile; the antenna follows.
            pose('Bone_035', motion * response * -0.018, motion * Math.sin(t * 1.12 - 0.4) * 0.012, motion * (Math.sin(t * 0.77) * 0.012 + response * 0.05));
            pose('Bone_034', 0, motion * gazeRef.current * 0.035, motion * Math.sin(t * 1.12 - 0.85) * 0.015);
            pose('Bone_042', motion * Math.sin(t * 0.92) * 0.009, 0, motion * Math.sin(t * 0.88) * 0.014);
            pose('Bone_039', 0, 0, motion * Math.sin(t * 0.88 - 0.5) * 0.018);
            // Inhale brightens the antenna; exhale releases it gradually.
            const breath = (1 + Math.sin(t * 1.3 - 0.4)) / 2;
            const shimmer = 0.035 * Math.sin(t * 3.2) * Math.sin(t * 2.1);
            glowMaterial.opacity = 0.31 + motion * (0.33 * breath + shimmer);
            halo.scale.setScalar(0.34 + motion * 0.12 * breath);
            light.intensity = 0.24 + motion * 0.24 * breath;
            pivot.position.y = motion * (Math.sin(t * 1.3) * 0.018 + Math.sin(t * 0.46) * 0.009);
            pivot.rotation.y = motion * Math.sin(t * 0.39) * 0.013;
          }
          // Manual viewing remains available when animation is paused.
          viewYaw += (orbitRef.current - viewYaw) * (1 - Math.exp(-dt * 16));
          camera.position.set(Math.sin(viewYaw) * 3.8, 0.35, Math.cos(viewYaw) * 3.8);
          camera.lookAt(0, 0.04, 0);
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

  const faceViewer = () => {
    const delta = FRONT_YAW - orbitRef.current;
    orbitRef.current += Math.atan2(Math.sin(delta), Math.cos(delta));
    gazeRef.current = 0;
  };
  return <div className="axolotl-viewer">
    <button type="button" className="living-companion-3d axolotl-orbit" data-renderer="axolotl-water-preview" data-status={status}
    aria-label="แตะทักทายน้อง ลากซ้ายขวาหรือใช้ปุ่มลูกศรเพื่อหมุนดูรอบตัว"
    onPointerDown={event => {
      if (event.button !== 0 || !event.isPrimary) return;
      suppressClickRef.current = false;
      dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: orbitRef.current, moved: false };
    }}
    onPointerMove={event => {
      const box = event.currentTarget.getBoundingClientRect();
      gazeRef.current = clampGaze((event.clientX - box.left) / box.width * 2 - 1);
      const drag = dragRef.current;
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy)) {
        drag.moved = true;
        suppressClickRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      if (drag.moved) orbitRef.current = drag.yaw - dx / box.width * Math.PI * 2;
    }}
    onPointerUp={event => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      dragRef.current = null;
    }}
    onPointerCancel={() => { dragRef.current = null; suppressClickRef.current = true; }}
    onPointerLeave={() => { gazeRef.current = 0; if (!dragRef.current?.moved) dragRef.current = null; }}
    onKeyDown={event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        orbitRef.current += event.key === 'ArrowLeft' ? -0.25 : 0.25;
      }
      if (event.key === 'Home') { event.preventDefault(); faceViewer(); }
    }}
    onClick={event => {
      if (suppressClickRef.current && event.detail !== 0) { suppressClickRef.current = false; return; }
      if (!paused) touchedRef.current = elapsedRef.current;
    }}>
    <span ref={mountRef} className="living-companion-canvas" aria-hidden="true" />
    {status !== 'ready' && <span role="status" className="companion-model-message">{status === 'error' ? 'โหลดตัวอย่าง 3D ไม่ได้' : 'กำลังพาน้องมาหา…'}</span>}
    </button>
    <button type="button" className="axolotl-front-button" onClick={faceViewer}>หันมาหาเรา</button>
  </div>;
}

function clampGaze(value: number) { return Math.max(-1, Math.min(1, value)); }
