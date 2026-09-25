import { useEffect, useRef, useState } from 'react';
import './LivingCompanion3D.css';

type Props = { paused?: boolean };
const FLIP_DURATION = 3.2;
const TICKLE_DURATION = 9.4;
type Reaction = 'content' | 'squish' | 'blep' | 'flip' | 'tickle';
const REACTIONS: Reaction[] = ['content', 'squish', 'blep', 'content', 'squish', 'flip'];
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
  const reactionRef = useRef<{ kind: Reaction; started: number }>({ kind: 'content', started: -100 });
  const reactionCountRef = useRef(0);
  const lastFlipRef = useRef(-100);
  const rapidPetsRef = useRef<number[]>([]);
  const lastTickleRef = useRef(-100);
  const strokeRef = useRef(-100);
  const headHitRef = useRef({ x: 0, y: 0, rx: 0, ry: 0, visible: false });
  const dragRef = useRef<{ id: number; x: number; y: number; yaw: number; moved: boolean; pet: boolean; lastX: number; lastY: number; distance: number; direction: number; travel: number } | null>(null);
  const suppressClickRef = useRef(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const registerRapidPet = () => {
    if (pausedRef.current || status !== 'ready') return false;
    const t = elapsedRef.current;
    const previous = reactionRef.current;
    if ((previous.kind === 'tickle' && t - previous.started < TICKLE_DURATION)
      || (previous.kind === 'flip' && t - previous.started < FLIP_DURATION)) return true;
    const now = performance.now();
    rapidPetsRef.current = [...rapidPetsRef.current.filter(time => now - time < 1800), now];
    if (rapidPetsRef.current.length < 4 || t - lastTickleRef.current < TICKLE_DURATION + 2) return false;
    rapidPetsRef.current = [];
    lastTickleRef.current = t;
    reactionRef.current = { kind: 'tickle', started: t };
    touchedRef.current = t;
    return true;
  };

  const reactToPet = () => {
    if (pausedRef.current || status !== 'ready') return;
    if (registerRapidPet()) return;
    const t = elapsedRef.current;
    const previous = reactionRef.current;
    if (previous.kind === 'flip' && t - previous.started < FLIP_DURATION) return;
    let kind = REACTIONS[reactionCountRef.current++ % REACTIONS.length];
    if (kind === 'flip' && (t - lastFlipRef.current < 9 || window.matchMedia('(prefers-reduced-motion: reduce)').matches)) kind = 'blep';
    if (kind === 'flip') lastFlipRef.current = t;
    reactionRef.current = { kind, started: t };
    touchedRef.current = t;
  };

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
        const squish = { value: 0 };
        // Small local morphs work with the existing skinning and baked face texture.
        // These coordinates belong to this model, not to arbitrary Meshy exports.
        model.traverse(object => {
          if (!(object as import('three').SkinnedMesh).isSkinnedMesh) return;
          const mesh = object as import('three').SkinnedMesh;
          const positions = mesh.geometry.getAttribute('position');
          const smile = new Float32Array(positions.count * 3);
          const happySqueeze = new Float32Array(positions.count * 3);
          const eyes = [[0.1503, 0.9447, 1.9278], [-0.3378, 0.8956, 1.7373]];
          for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
            for (const [cx, cy, cz] of eyes) {
              const horizontal = (x - cx) * 0.932 + (z - cz) * 0.363;
              const depth = -(x - cx) * 0.363 + (z - cz) * 0.932;
              const radius = Math.sqrt((horizontal / 0.145) ** 2 + ((y - cy) / 0.18) ** 2 + (depth / 0.15) ** 2);
              const weight = 1 - THREE.MathUtils.smoothstep(radius, 0.58, 1.1);
              smile[i * 3 + 1] += (cy - y) * 0.16 * weight;
              // Broad, smooth support retracts the eye bulge and raises the cheek.
              // Do not collapse the sparse eye vertices to a single crease.
              const squeezeRadius = Math.sqrt((horizontal / 0.19) ** 2 + ((y - cy) / 0.21) ** 2 + (depth / 0.20) ** 2);
              const squeezeWeight = 1 - THREE.MathUtils.smoothstep(squeezeRadius, 0.35, 1.25);
              const retract = Math.max(0, depth + 0.035) * 0.52 * squeezeWeight;
              happySqueeze[i * 3] += retract * 0.363;
              happySqueeze[i * 3 + 2] -= retract * 0.932;
              happySqueeze[i * 3 + 1] += ((cy - y) * 0.46 + 0.012) * squeezeWeight;
              const cheek = Math.exp(-((horizontal / 0.17) ** 2 + ((y - cy + 0.13) / 0.085) ** 2 + (depth / 0.15) ** 2));
              happySqueeze[i * 3 + 1] += cheek * 0.018;
            }
            const horizontal = (x + 0.08) * 0.932 + (z - 1.94) * 0.363;
            const depth = -(x + 0.08) * 0.363 + (z - 1.94) * 0.932;
            const mouthWeight = Math.exp(-(((y - 0.755) / 0.068) ** 2 + (depth / 0.08) ** 2))
              * (1 - THREE.MathUtils.smoothstep(Math.abs(horizontal), 0.14, 0.23));
            smile[i * 3 + 1] += Math.min(1, Math.abs(horizontal) / 0.14) * 0.025 * mouthWeight;
          }
          mesh.geometry.morphTargetsRelative = true;
          mesh.geometry.morphAttributes.position = [new THREE.BufferAttribute(smile, 3), new THREE.BufferAttribute(happySqueeze, 3)];
          // Keep cheek lighting consistent with the small smile deformation.
          const normalGeometry = new THREE.BufferGeometry();
          normalGeometry.setIndex(mesh.geometry.index);
          normalGeometry.setAttribute('position', positions.clone());
          normalGeometry.computeVertexNormals();
          const restNormals = normalGeometry.getAttribute('normal').clone();
          mesh.geometry.morphAttributes.normal = [smile, happySqueeze].map(offsets => {
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
              shader.uniforms.axolotlSquish = squish;
              shader.uniforms.axolotlSkinRight = { value: new THREE.Color('#f5cfe1') };
              shader.uniforms.axolotlSkinLeft = { value: new THREE.Color('#f8cbde') };
              shader.vertexShader = shader.vertexShader
                .replace('#include <common>', '#include <common>\nvarying vec3 axolotlFacePosition;')
                .replace('#include <begin_vertex>', '#include <begin_vertex>\naxolotlFacePosition = position;');
              shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>', `#include <common>
                  varying vec3 axolotlFacePosition;
                  uniform float axolotlBlink;
                  uniform float axolotlSquish;
                  uniform vec3 axolotlSkinRight;
                  uniform vec3 axolotlSkinLeft;
                  void closeAxolotlEye(inout vec3 color, inout float coverage, vec3 center, vec3 skin, float side) {
                    vec3 d = axolotlFacePosition - center;
                    float x = dot(d, vec3(0.932, 0.0, 0.363));
                    float depth = dot(d, vec3(-0.363, 0.0, 0.932));
                    float region = 1.0 - smoothstep(0.94, 1.13, length(vec3(x / 0.092, d.y / 0.095, depth / 0.11)));
                    float closure = max(axolotlBlink, axolotlSquish);
                    float aperture = 0.097 * (1.0 - closure);
                    float lid = region * smoothstep(aperture - 0.008, aperture + 0.006, abs(d.y)) * smoothstep(0.0, 0.12, closure);
                    lid = max(lid, region * smoothstep(0.75, 0.98, closure));
                    color = mix(color, skin * mix(0.97, 1.025, smoothstep(-0.08, 0.08, d.y)), lid);
                    float curve = -0.002 + 0.009 * (x * x / 0.0049);
                    float line = (1.0 - smoothstep(0.001, 0.004, abs(d.y - curve))) * (1.0 - smoothstep(0.055, 0.075, abs(x)));
                    line *= smoothstep(0.83, 0.98, axolotlBlink);
                    // A tapered lid seam spans the eye, following the raised cheek.
                    // The happy expression comes from the morph, not a drawn > symbol.
                    float happyCurve = 0.012 - 0.028 * (x * x / 0.007569) - side * x * 0.045;
                    float taper = 1.0 - smoothstep(0.055, 0.096, abs(x));
                    float happyLine = (1.0 - smoothstep(0.0015, 0.007, abs(d.y - happyCurve))) * taper;
                    line = mix(line, happyLine, axolotlSquish) * region;
                    color = mix(color, mix(skin * 0.36, vec3(0.23, 0.085, 0.13), 0.45), line);
                    coverage = max(coverage, lid);
                  }`)
                .replace('#include <map_fragment>', `#include <map_fragment>
                  float axolotlLidCoverage = 0.0;
                  closeAxolotlEye(diffuseColor.rgb, axolotlLidCoverage, vec3(0.1503, 0.9447, 1.9278), axolotlSkinRight, 1.0);
                  closeAxolotlEye(diffuseColor.rgb, axolotlLidCoverage, vec3(-0.3378, 0.8956, 1.7373), axolotlSkinLeft, -1.0);`)
                .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.65, axolotlLidCoverage);');
            };
            material.customProgramCacheKey = () => 'axolotl-sculpted-happy-lids-v3';
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
        model.updateMatrixWorld(true);
        const head = model.getObjectByName('Bone_033');
        const tongue = new THREE.Group();
        if (head) {
          tongue.position.copy(head.worldToLocal(new THREE.Vector3(-0.08, 0.746, 1.957)));
          const headWorld = head.getWorldQuaternion(new THREE.Quaternion());
          tongue.quaternion.copy(headWorld.invert()).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), FRONT_YAW));
          head.add(tongue);
        }
        const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshStandardMaterial({ color: '#6f304f', roughness: 0.85 }));
        mouth.scale.set(0.062, 0.025, 0.014);
        tongue.add(mouth);
        const tongueTip = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: '#f58ba7', roughness: 0.55 }));
        tongueTip.position.set(0, -0.031, 0.027);
        tongueTip.scale.set(0.037, 0.048, 0.022);
        tongueTip.rotation.x = -0.25;
        tongue.add(tongueTip);
        tongue.visible = false;
        // Follow the animated skull so the petting target stays under the head.
        const crown = new THREE.Object3D();
        if (head) {
          crown.position.copy(head.worldToLocal(new THREE.Vector3(-0.1, 1.10, 1.72)));
          head.add(crown);
        }
        const projectedCrown = new THREE.Vector3();
        const flipAxis = new THREE.Vector3(0.932, 0, 0.363).normalize();
        let affection = 0;
        let flipAngle = 0;
        let jumpHeight = 0;
        let curlFraming = 0;
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

        const names = [...TAIL, ...GILLS.flatMap(({ root, tip }) => [root, tip]), 'Bone_034', 'Bone_035', 'Bone_036', 'Bone_042', 'Bone_039', 'Bone_032', 'Bone_027', 'Bone_011', 'Bone_016', 'Bone_031', 'Bone_026', 'Bone_010', 'Bone_015', 'Bone_006', 'Bone_005', 'Bone_004', 'Bone_003', 'Bone_002'] as const;
        const bones = new Map(names.map(name => [name, model.getObjectByName(name)]));
        const rest = new Map([...bones].flatMap(([name, bone]) => bone ? [[name, bone.quaternion.clone()] as const] : []));
        const delta = new THREE.Quaternion();
        const euler = new THREE.Euler();
        const pose = (name: string, x: number, y: number, z: number) => {
          const bone = bones.get(name as typeof names[number]);
          const initial = rest.get(name as typeof names[number]);
          if (bone && initial) bone.quaternion.copy(initial).multiply(delta.setFromEuler(euler.set(x, y, z)));
        };
        model.updateMatrixWorld(true);
        const legNames = ['Bone_032', 'Bone_027', 'Bone_011', 'Bone_016', 'Bone_031', 'Bone_026', 'Bone_010', 'Bone_015'] as const;
        const kickAxes = new Map(names.map(name => {
          const bone = bones.get(name);
          const orientation = bone?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion();
          return [name, flipAxis.clone().applyQuaternion(orientation.invert())] as const;
        }));
        const kickLeg = (name: typeof legNames[number], angle: number) => {
          const bone = bones.get(name), initial = rest.get(name), axis = kickAxes.get(name);
          if (bone && initial && axis) bone.quaternion.copy(initial).multiply(delta.setFromAxisAngle(axis, angle));
        };
        const bendBody = (name: typeof names[number], angle: number) => {
          const bone = bones.get(name), axis = kickAxes.get(name);
          if (bone && axis) bone.quaternion.multiply(delta.setFromAxisAngle(axis, angle));
        };
        // A small sample of the torso/head surface anchors the roll to the floor.
        // Ignore the flexible gills, antenna and tail when finding back contact.
        const contactPoints = faces.map(mesh => {
          const positions = mesh.geometry.getAttribute('position');
          const indices: number[] = [];
          for (let i = 0; i < positions.count; i += 12) {
            const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
            if (Math.abs(x) < 0.6 && y < 1.3 && y > -0.02 && z > -0.8 && z < 1.94) indices.push(i);
          }
          return { mesh, indices };
        });
        const contactVertex = new THREE.Vector3();
        const rollAxis = new THREE.Vector3(-0.363, 0, 0.932).normalize();
        const rollQuaternion = new THREE.Quaternion();
        const antennaBase = bones.get('Bone_042');
        const antennaLieAxis = rollAxis.clone().applyQuaternion((antennaBase?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion()).invert());
        let tickleActive = false;
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
            const greeting = touchAge > 0 && touchAge < 2.8 ? Math.sin(Math.PI * touchAge / 2.8) : 0;
            const reaction = reactionRef.current;
            const age = t - reaction.started;
            const envelope = THREE.MathUtils.smoothstep(age, 0, 0.38) * (1 - THREE.MathUtils.smoothstep(age, 1.8, 2.8));
            tickleActive = reaction.kind === 'tickle' && age >= 0 && age < TICKLE_DURATION;
            const ticklePose = tickleActive && !reducedMotion.matches;
            const landing = ticklePose ? THREE.MathUtils.smoothstep(age, 0, 1.1) : 0;
            const rising = ticklePose ? THREE.MathUtils.smoothstep(age, 8.2, TICKLE_DURATION) : 0;
            const grounded = landing * (1 - rising);
            const rollIn = ticklePose ? THREE.MathUtils.smoothstep(age, 0.3, 1.5) : 0;
            const getUp = ticklePose ? THREE.MathUtils.smoothstep(age, 6.65, 8.2) : 0;
            const belly = rollIn * (1 - getUp);
            const laughing = tickleActive ? THREE.MathUtils.smoothstep(age, 0.15, 1.25) * (1 - THREE.MathUtils.smoothstep(age, 3.65, 4.5)) : 0;
            const wriggle = reducedMotion.matches ? 0 : laughing;
            const tired = tickleActive ? THREE.MathUtils.smoothstep(age, 4.1, 4.7) * (1 - THREE.MathUtils.smoothstep(age, 6.5, 8)) : 0;
            const stroking = !tickleActive && t - strokeRef.current < 0.3;
            affection += ((stroking ? 1 : 0) - affection) * (1 - Math.exp(-dt * (stroking ? 5 : 2.8)));
            const content = Math.max(affection, reaction.kind === 'content' ? envelope : 0, tired * 0.85);
            const response = Math.max(greeting, affection, laughing * 0.8);
            const squint = Math.max(reaction.kind === 'squish' ? envelope : 0, laughing * (0.82 + 0.15 * Math.sin(age * 5.5)));
            squish.value += (squint - squish.value) * (1 - Math.exp(-dt * 12));
            const blep = Math.max(reaction.kind === 'blep' ? envelope : 0, tired * 0.6);
            tongue.visible = blep > 0.01;
            tongue.scale.set(0.85 + blep * 0.15, blep, blep);
            const flipping = reaction.kind === 'flip' && age >= 0 && age < FLIP_DURATION && !reducedMotion.matches;
            // Lift first, turn near the apex, then unfold before drifting down.
            const flight = flipping ? THREE.MathUtils.clamp((age - 0.4) / 2.3, 0, 1) : 0;
            jumpHeight = Math.pow(Math.max(0, Math.sin(Math.PI * flight)), 1.3) * 0.48;
            const anticipation = flipping && age < 0.4 ? Math.sin(Math.PI * age / 0.4) ** 2 : 0;
            const settle = flipping && age > 2.7 ? Math.sin(Math.PI * (age - 2.7) / 0.5) ** 2 : 0;
            const launch = flipping ? Math.exp(-(((age - 0.58) / 0.18) ** 2)) : 0;
            const turn = flipping ? THREE.MathUtils.smoothstep(age, 0.72, 2.25) : 0;
            flipAngle = turn * Math.PI * 2;
            const tuck = flipping ? Math.sin(Math.PI * turn) : 0;
            const curl = flipping ? THREE.MathUtils.smoothstep(age, 0.78, 1.18) * (1 - THREE.MathUtils.smoothstep(age, 1.85, 2.4)) : 0;
            curlFraming = curl;
            if (t >= nextBlink) {
              blinkStarted = t;
              nextBlink = t + 3.1 + Math.random() * 3.4;
            }
            const blinkAge = t - blinkStarted;
            const blink = blinkAge < 0.24 ? Math.sin(Math.PI * Math.max(0, blinkAge) / 0.24) ** 2 : 0;
            eyelids.value = Math.max(reducedMotion.matches ? 0 : blink, content * 0.98, blep * 0.3);
            faces.forEach(mesh => {
              if (!mesh.morphTargetInfluences) return;
              mesh.morphTargetInfluences[0] = response * (1 - squish.value * 0.7);
              mesh.morphTargetInfluences[1] = squish.value;
            });
            TAIL.forEach((bone, index) => {
              const phase = t * 1.45 - index * 0.51;
              const spread = 0.035 + index * 0.013;
              const follow = flipping ? Math.sin(Math.PI * THREE.MathUtils.clamp((age - 0.5 - index * 0.07) / 2.4, 0, 1)) : 0;
              pose(bone,
                motion * (Math.sin(phase - 0.3) * spread * 0.28 + follow * 0.02 + belly * 0.03),
                motion * (Math.sin(phase) * spread + Math.sin(t * 0.47 - index * 0.33) * 0.018 + response * Math.sin(t * 5 - index * 0.6) * 0.065 + wriggle * Math.sin(age * 7 - index * 0.7) * 0.045),
                motion * Math.sin(phase + 0.6) * spread * 0.35);
              // Tail bends toward the belly in a delayed arc, not a rigid spin.
              const tailCurl = flipping ? THREE.MathUtils.smoothstep(age, 0.83 + index * 0.035, 1.23 + index * 0.035)
                * (1 - THREE.MathUtils.smoothstep(age, 1.85 + index * 0.04, 2.4 + index * 0.04)) : 0;
              bendBody(bone, -tailCurl * (0.42 + index * 0.02));
            });
            GILLS.forEach(({ root, tip, phase, side }) => {
              const follow = flipping ? Math.sin((age - phase * 0.06) * 4.2) * Math.sin(Math.PI * flight) * 0.035 : 0;
              const current = follow + wriggle * Math.sin(age * 8 - phase) * 0.024 + Math.sin(t * 1.33 + phase) * 0.038 + Math.sin(t * 0.54 + phase * 0.6) * 0.014;
              pose(root, motion * current * 0.3, motion * side * current * 0.5, motion * side * (current + response * 0.035));
              pose(tip, motion * Math.sin(t * 1.33 + phase - 0.55) * 0.027,
                motion * side * Math.sin(t * 0.92 + phase - 0.4) * 0.022,
                motion * side * Math.sin(t * 1.33 + phase - 0.65) * 0.052);
            });
            // A small attentive tilt accompanies the smile; the antenna follows.
            pose('Bone_036', -tuck * 0.07 + launch * 0.025, wriggle * Math.sin(age * 6) * 0.045, tuck * 0.045 + belly * 0.035);
            pose('Bone_035', motion * response * -0.018 - tuck * 0.08, motion * Math.sin(t * 1.12 - 0.4) * 0.012, motion * (Math.sin(t * 0.77) * 0.012 + response * 0.05));
            pose('Bone_034', -motion * content * 0.035 + launch * 0.055 - tuck * 0.04 + wriggle * Math.sin(age * 7) * 0.045, motion * gazeRef.current * (0.035 + affection * 0.055), motion * (Math.sin(t * 1.12 - 0.85) * 0.015 + content * 0.06));
            pose('Bone_032', tuck * 0.28 - launch * 0.14, 0, -tuck * 0.12);
            pose('Bone_027', tuck * 0.28 - launch * 0.14, 0, tuck * 0.12);
            pose('Bone_011', tuck * -0.18 + launch * 0.16, 0, -tuck * 0.1);
            pose('Bone_016', tuck * -0.18 + launch * 0.16, 0, tuck * 0.1);
            // Rear legs kick more strongly; knees flex after the upper leg.
            // Phase offsets keep this from becoming a synchronized bicycle loop.
            for (const [i, name] of legNames.entries()) {
              if (flipping) {
                const front = i % 4 < 2;
                const angle = i < 4
                  ? (front ? anticipation * 0.22 - launch * 0.95 + curl * 0.8 : -anticipation * 0.28 + launch * 0.3 - curl * 0.65)
                  : (front ? anticipation * 0.35 - launch * 0.25 + curl * 0.85 : -anticipation * 0.35 - curl * 0.8);
                kickLeg(name, angle);
                continue;
              }
              if (i < 4 && !ticklePose) continue;
              const leg = i % 4, rear = leg >= 2;
              const phase = age * (rear ? 12.4 : 9.6) + leg * 2.25 + Math.sin(age * 1.8 + leg) * 0.3;
              const kicks = wriggle * (0.75 + 0.25 * Math.sin(age * 2.6 + leg));
              const angle = i < 4
                ? belly * 0.3 + kicks * Math.sin(phase) * (rear ? 0.68 : 0.42)
                : belly * 0.24 + kicks * (0.5 + 0.5 * Math.sin(phase - 0.7)) * (rear ? 0.9 : 0.58);
              kickLeg(name, angle);
            }
            // Flex both halves of the torso so the roll folds at the body, too.
            for (const [name, angle] of [['Bone_006', 0.22], ['Bone_005', 0.26], ['Bone_004', 0.18], ['Bone_003', -0.22], ['Bone_002', -0.25]] as const) {
              pose(name, 0, 0, 0);
              bendBody(name, curl * angle);
            }
            bendBody('Bone_036', curl * 0.3);
            bendBody('Bone_035', curl * 0.3);
            bendBody('Bone_034', curl * 0.33 - launch * 0.06);
            pose('Bone_042', motion * Math.sin(t * 0.92) * 0.009, 0, motion * Math.sin(t * 0.88) * 0.014);
            if (antennaBase) antennaBase.quaternion.multiply(delta.setFromAxisAngle(antennaLieAxis, belly * 1.4));
            pose('Bone_039', 0, 0, motion * Math.sin(t * 0.88 - 0.5) * 0.018 + (flipping ? Math.sin(age * 5 - 0.8) * Math.sin(Math.PI * flight) * 0.035 : 0));
            // Inhale brightens the antenna; exhale releases it gradually.
            const breath = (1 + Math.sin(t * 1.3 - 0.4)) / 2;
            const shimmer = 0.035 * Math.sin(t * 3.2) * Math.sin(t * 2.1);
            glowMaterial.opacity = 0.31 + motion * (0.33 * breath + shimmer);
            halo.scale.setScalar(0.34 + motion * 0.12 * breath);
            light.intensity = 0.24 + motion * 0.24 * breath;
            pivot.position.y = motion * (Math.sin(t * 1.3) * 0.018 + Math.sin(t * 0.46) * 0.009);
            pivot.position.y += jumpHeight - anticipation * 0.13 - settle * 0.04;
            const squash = anticipation * 0.055 + settle * 0.025;
            pivot.scale.set(1 + squash * 0.5, 1 - squash, 1 + squash * 0.5);
            const pant = motion * tired * Math.sin(age * 7.5) * 0.012;
            pivot.scale.y += pant;
            pivot.scale.z -= pant * 0.35;
            pivot.quaternion.setFromAxisAngle(flipAxis, -flipAngle)
              .multiply(delta.setFromEuler(euler.set(0, motion * Math.sin(t * 0.39) * 0.013, 0)));
            if (ticklePose) {
              // Roll onto the back, rest, then unwind onto the paws before rising.
              const roll = belly * (Math.PI * 0.91 + wriggle * Math.sin(age * 7.1) * 0.10);
              pivot.quaternion.multiply(rollQuaternion.setFromAxisAngle(rollAxis, roll));
              pivot.quaternion.multiply(delta.setFromAxisAngle(flipAxis, belly * 0.12));
              pivot.position.y = 0;
              scene.updateMatrixWorld(true);
              let lowest = Infinity;
              for (const { mesh, indices } of contactPoints) {
                mesh.skeleton.update();
                for (const index of indices) {
                  mesh.getVertexPosition(index, contactVertex);
                  contactVertex.applyMatrix4(mesh.matrixWorld);
                  lowest = Math.min(lowest, contactVertex.y);
                }
              }
              const floorY = -0.68;
              const floorOffset = Number.isFinite(lowest) ? floorY - lowest : -0.3;
              pivot.position.y = THREE.MathUtils.lerp(Math.sin(t * 1.3) * 0.018, floorOffset, grounded);
            }
            mount.parentElement?.setAttribute('data-reaction', tickleActive ? (age < 1.5 ? 'rolling' : age < 4.5 ? 'ticklish' : age < 6.65 ? 'resting' : 'getting-up') : (reaction.kind === 'tickle' ? 'idle' : reaction.kind));
          }
          // Manual viewing remains available when animation is paused.
          viewYaw += (orbitRef.current - viewYaw) * (1 - Math.exp(-dt * 16));
          // Make room above the head while preserving the visible upward leap.
          const viewRadius = 3.8 + jumpHeight * 1.15 + curlFraming * 0.55;
          const framingLift = jumpHeight * 0.38;
          camera.position.set(Math.sin(viewYaw) * viewRadius, 0.35 + framingLift, Math.cos(viewYaw) * viewRadius);
          camera.lookAt(0, 0.04 + framingLift, 0);
          renderer?.render(scene, camera);
          crown.getWorldPosition(projectedCrown).project(camera);
          const headSize = 0.56 / (3.8 - 0.9 * Math.cos(viewYaw - FRONT_YAW)) / (2 * Math.tan(THREE.MathUtils.degToRad(17)));
          headHitRef.current = {
            x: (projectedCrown.x + 1) / 2, y: (1 - projectedCrown.y) / 2,
            rx: headSize * 0.35 / camera.aspect, ry: headSize * 0.26,
            visible: !!head && !tickleActive && Math.cos(viewYaw - FRONT_YAW) > 0.35 && Math.abs(flipAngle) < 0.01,
          };
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
    aria-label="ลูบหัวน้องเพื่อเล่นด้วย ลากบริเวณรอบตัวหรือใช้ลูกศรเพื่อหมุนดู กด Enter เพื่อให้น้องเล่น"
    onPointerDown={event => {
      if (event.button !== 0 || !event.isPrimary) return;
      suppressClickRef.current = false;
      const box = event.currentTarget.getBoundingClientRect();
      const hit = headHitRef.current;
      const x = (event.clientX - box.left) / box.width, y = (event.clientY - box.top) / box.height;
      const pet = !pausedRef.current && hit.visible && ((x - hit.x) / hit.rx) ** 2 + ((y - hit.y) / hit.ry) ** 2 < 1;
      dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: orbitRef.current, moved: false, pet, lastX: event.clientX, lastY: event.clientY, distance: 0, direction: 0, travel: 0 };
      if (pet) event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      const box = event.currentTarget.getBoundingClientRect();
      gazeRef.current = clampGaze((event.clientX - box.left) / box.width * 2 - 1);
      const drag = dragRef.current;
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (drag.pet) {
        const step = Math.hypot(event.clientX - drag.lastX, event.clientY - drag.lastY);
        const direction = Math.sign(event.clientX - drag.lastX);
        if (direction && direction !== drag.direction && drag.travel > 12) {
          registerRapidPet();
          drag.travel = 0;
        }
        if (direction) drag.direction = direction;
        drag.travel += step;
        drag.lastX = event.clientX; drag.lastY = event.clientY;
        drag.distance += step;
        if (step > 0.5 && drag.distance > 6 && !pausedRef.current) {
          strokeRef.current = elapsedRef.current;
          drag.moved = true;
          suppressClickRef.current = true;
        }
        return;
      }
      if (!drag.moved && Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy)) {
        drag.moved = true;
        suppressClickRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      if (drag.moved) orbitRef.current = drag.yaw - dx / box.width * Math.PI * 2;
    }}
    onPointerUp={event => {
      const drag = dragRef.current;
      if (!drag || drag.id !== event.pointerId) return;
      if (drag.pet && drag.moved) reactToPet();
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
      reactToPet();
    }}>
    <span ref={mountRef} className="living-companion-canvas" aria-hidden="true" />
    {status !== 'ready' && <span role="status" className="companion-model-message">{status === 'error' ? 'โหลดตัวอย่าง 3D ไม่ได้' : 'กำลังพาน้องมาหา…'}</span>}
    </button>
    <div className="axolotl-viewer-controls">
      <button type="button" className="axolotl-front-button" disabled={paused || status !== 'ready'} onClick={reactToPet}>ลูบหัว ♡</button>
      <button type="button" className="axolotl-front-button" onClick={faceViewer}>หันมาหาเรา</button>
    </div>
  </div>;
}

function clampGaze(value: number) { return Math.max(-1, Math.min(1, value)); }
