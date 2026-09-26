import { useEffect, useRef, useState } from 'react';
import { companionMotion } from '../shared/companionBirthVisuals';
import type { CompanionAppearance } from '../shared/companionAppearance';
import './LivingCompanion3D.css';

type Props = { paused?: boolean; appearance?: CompanionAppearance; mode?: 'companion' | 'embryo'; progress?: number; interactionPulse?: number; onPet?: () => void; showControls?: boolean; activityVersion?: number; autoGreet?: boolean };
const FLIP_DURATION = 3.2;
const TICKLE_DURATION = 9.4;
const HELLO_DURATION = 11.8;
const WALK_START = 1.8;
const WALK_STEPS = 32;
const STEP_SECONDS = 0.45;
const WALK_PAUSE = 0.65;
const WALK_END = WALK_START + WALK_STEPS * STEP_SECONDS + WALK_PAUSE;
const SLEEP_SETTLE_DURATION = WALK_END + 4.7;
const WAKE_DURATION = 7;
type RestPhase = 'awake' | 'settling' | 'sleeping' | 'waking';
type Reaction = 'content' | 'squish' | 'blep' | 'flip' | 'tickle' | 'hello';
const REACTIONS: Reaction[] = ['content', 'squish', 'blep', 'content', 'squish', 'flip', 'hello'];
// The eye line on this Meshy export is turned about 21 degrees from +Z.
const FRONT_YAW = -0.372;

// Meshy UniRig bone names were checked against this specific model's skin weights.
// Shared by the hatched companion and its curled embryo pose.
const TAIL = ['Bone_022', 'Bone_021', 'Bone_020', 'Bone_019', 'Bone_018', 'Bone_017'] as const;
const GILLS = [
  { root: 'Bone_052', mids: ['Bone_051', 'Bone_050'], tip: 'Bone_049', phase: 0.1, side: -1 },
  { root: 'Bone_056', mids: ['Bone_055', 'Bone_054'], tip: 'Bone_053', phase: 0.65, side: 1 },
  { root: 'Bone_045', mids: ['Bone_044'], tip: 'Bone_043', phase: 1.3, side: -1 },
  { root: 'Bone_048', mids: ['Bone_047'], tip: 'Bone_046', phase: 1.85, side: 1 },
] as const;

export function AxolotlWaterPreview({ paused = false, appearance, mode = 'companion', progress = 0, interactionPulse = 0, onPet, showControls = true, activityVersion = 0, autoGreet = false }: Props) {
  const embryo = mode === 'embryo';
  const motionId = appearance?.traits.motion.id;
  const motionProfile = companionMotion(motionId);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const lastActivityVersion = useRef(activityVersion);
  const lastPetNotice = useRef(-10000);
  const welcomedRef = useRef(false);
  useEffect(() => { if (interactionPulse > 0) touchedRef.current = elapsedRef.current; }, [interactionPulse]);
  useEffect(() => {
    if (activityVersion > lastActivityVersion.current) {
      reactionRef.current = { kind: 'content', started: elapsedRef.current };
      touchedRef.current = elapsedRef.current;
      lastActivityRef.current = elapsedRef.current;
    }
    lastActivityVersion.current = activityVersion;
  }, [activityVersion]);
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
  const restRef = useRef<{ phase: RestPhase; started: number; wakeAge: number }>({ phase: 'awake', started: 0, wakeAge: 0 });
  const lastActivityRef = useRef(0);
  const [restPhase, setRestPhase] = useState<RestPhase>('awake');
  const headHitRef = useRef({ x: 0, y: 0, rx: 0, ry: 0, visible: false });
  const dragRef = useRef<{ id: number; x: number; y: number; yaw: number; moved: boolean; pet: boolean; lastX: number; lastY: number; distance: number; direction: number; travel: number } | null>(null);
  const suppressClickRef = useRef(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  const canPlay = status === 'ready';

  const wakeFromRest = () => {
    const t = elapsedRef.current;
    lastActivityRef.current = t;
    const resting = restRef.current;
    if (resting.phase === 'awake') return false;
    if (resting.phase !== 'waking') {
      restRef.current = { phase: 'waking', started: t, wakeAge: t - resting.started };
      rapidPetsRef.current = [];
      setRestPhase('waking');
    }
    return true;
  };

  const toggleRest = () => {
    if (pausedRef.current || !canPlay) return;
    if (wakeFromRest()) return;
    const t = elapsedRef.current;
    const reaction = reactionRef.current;
    if ((reaction.kind === 'tickle' && t - reaction.started < TICKLE_DURATION)
      || (reaction.kind === 'flip' && t - reaction.started < FLIP_DURATION)
      || (reaction.kind === 'hello' && t - reaction.started < HELLO_DURATION)) return;
    restRef.current = { phase: 'settling', started: t, wakeAge: 0 };
    reactionRef.current = { kind: 'content', started: -100 };
    rapidPetsRef.current = [];
    setRestPhase('settling');
  };

  const registerRapidPet = () => {
    if (pausedRef.current || !canPlay) return false;
    if (wakeFromRest()) return true;
    const t = elapsedRef.current;
    const previous = reactionRef.current;
    if ((previous.kind === 'tickle' && t - previous.started < TICKLE_DURATION)
      || (previous.kind === 'flip' && t - previous.started < FLIP_DURATION)
      || (previous.kind === 'hello' && t - previous.started < HELLO_DURATION)) return true;
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
    if (pausedRef.current || !canPlay) return;
    if (performance.now() - lastPetNotice.current > 1000) { onPet?.(); lastPetNotice.current = performance.now(); }
    if (registerRapidPet()) return;
    const t = elapsedRef.current;
    const previous = reactionRef.current;
    if (previous.kind === 'flip' && t - previous.started < FLIP_DURATION) return;
    let kind = REACTIONS[reactionCountRef.current++ % REACTIONS.length];
    if (kind === 'flip' && (t - lastFlipRef.current < 9 || window.matchMedia('(prefers-reduced-motion: reduce)').matches)) kind = 'blep';
    if (kind === 'flip') lastFlipRef.current = t;
    if (kind === 'hello') orbitRef.current += Math.atan2(Math.sin(FRONT_YAW - orbitRef.current), Math.cos(FRONT_YAW - orbitRef.current));
    reactionRef.current = { kind, started: t };
    touchedRef.current = t;
  };

  const sayHello = () => {
    if (pausedRef.current || !canPlay || wakeFromRest()) return;
    const t = elapsedRef.current, previous = reactionRef.current;
    if ((previous.kind === 'flip' && t - previous.started < FLIP_DURATION)
      || (previous.kind === 'tickle' && t - previous.started < TICKLE_DURATION)
      || (previous.kind === 'hello' && t - previous.started < HELLO_DURATION)) return;
    orbitRef.current += Math.atan2(Math.sin(FRONT_YAW - orbitRef.current), Math.cos(FRONT_YAW - orbitRef.current));
    reactionRef.current = { kind: 'hello', started: t };
    touchedRef.current = t;
    rapidPetsRef.current = [];
  };

  const doFlip = () => {
    if (pausedRef.current || !canPlay || wakeFromRest()) return;
    const t = elapsedRef.current, previous = reactionRef.current;
    if ((previous.kind === 'tickle' && t - previous.started < TICKLE_DURATION)
      || (previous.kind === 'hello' && t - previous.started < HELLO_DURATION)) return;
    reactionRef.current = { kind: 'flip', started: t };
    lastFlipRef.current = t;
    rapidPetsRef.current = [];
    lastActivityRef.current = t;
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    setStatus('loading');
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
        const bodyColor = new THREE.Color(appearance?.palette.body ?? '#F4BACD');
        const finColor = new THREE.Color(appearance?.palette.secondary ?? '#8BD3DD');
        const faceColor = new THREE.Color('#FFE2D7').lerp(bodyColor, 0.72);
        const markingColor = finColor.clone().multiplyScalar(0.48);
        const patternKind = ['pearl_freckles', 'starlight_speckles', 'water_ripples', 'petal_marks'].indexOf(appearance?.traits.pattern.id ?? '');

        const squish = { value: 0 };
        // Small local morphs work with the existing skinning and baked face texture.
        // These coordinates belong to this model, not to arbitrary Meshy exports.
        model.traverse(object => {
          if (!(object as import('three').SkinnedMesh).isSkinnedMesh) return;
          const mesh = object as import('three').SkinnedMesh;
          const positions = mesh.geometry.getAttribute('position');
          // Preview silhouettes deform the existing skinned vertices, preserving rig weights.
          // These are shape studies, not replacement gill/lantern topology.
          const design = appearance?.previewDesign;
          if (design) {
            const indices = mesh.geometry.getAttribute('skinIndex');
            const weights = mesh.geometry.getAttribute('skinWeight');
            const gillSet = new Set<string>(GILLS.flatMap(g => [g.root,...g.mids,g.tip]));
            const tailSet = new Set<string>(TAIL);
            const sizes = design === 'lotus' ? {gill:1.22,tail:.82,width:1.22} : design === 'stream' ? {gill:.83,tail:1.16,width:.78} : {gill:1.07,tail:.94,width:1.06};
            for(let i=0;i<positions.count;i++) {
              let gill=0,tail=0;
              for(let j=0;j<4;j++) {
                const name=mesh.skeleton.bones[indices.getComponent(i,j)]?.name;
                if(gillSet.has(name)) gill+=weights.getComponent(i,j);
                if(tailSet.has(name)) tail+=weights.getComponent(i,j);
              }
              const x=positions.getX(i), y=positions.getY(i), z=positions.getZ(i);
              positions.setXYZ(i,x*(1+gill*(sizes.gill-1)+tail*(sizes.width-1)),y+gill*(y-.6)*(sizes.gill-1)*.6,z+tail*(z-.4)*(sizes.tail-1));
            }
            positions.needsUpdate=true;
            mesh.geometry.computeVertexNormals();
          }
          const skinIndices = mesh.geometry.getAttribute('skinIndex');
          const skinWeights = mesh.geometry.getAttribute('skinWeight');
          const finBones = new Set<string>([...TAIL, ...GILLS.flatMap(g => [g.root, ...g.mids, g.tip])]);
          const finRegions = new Float32Array(positions.count);
          for (let i = 0; i < positions.count; i++) {
            for (let j = 0; j < 4; j++) {
              const bone = mesh.skeleton.bones[skinIndices.getComponent(i, j)];
              if (bone && finBones.has(bone.name)) finRegions[i] += skinWeights.getComponent(i, j);
            }
          }
          mesh.geometry.setAttribute('axolotlFinRegion', new THREE.BufferAttribute(finRegions, 1));
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
              shader.uniforms.axolotlBodyColor = { value: bodyColor };
              shader.uniforms.axolotlFinColor = { value: finColor };
              shader.uniforms.axolotlFaceColor = { value: faceColor };
              shader.uniforms.axolotlMarkingColor = { value: markingColor };
              shader.uniforms.axolotlPattern = { value: patternKind };
              shader.uniforms.axolotlPatternSeed = { value: (appearance?.patternSeed ?? 0) % 1000 };
              shader.uniforms.axolotlBlink = eyelids;
              shader.uniforms.axolotlSquish = squish;
              shader.uniforms.axolotlSkinRight = { value: faceColor.clone() };
              shader.uniforms.axolotlSkinLeft = { value: faceColor.clone() };
              shader.vertexShader = shader.vertexShader
                .replace('#include <common>', '#include <common>\nvarying vec3 axolotlFacePosition;\nattribute float axolotlFinRegion;\nvarying float axolotlFin;')
                .replace('#include <begin_vertex>', '#include <begin_vertex>\naxolotlFacePosition = position;\naxolotlFin = axolotlFinRegion;');
              shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>', `#include <common>
                  varying vec3 axolotlFacePosition;
                  uniform vec3 axolotlBodyColor;
                  uniform vec3 axolotlFinColor;
                  uniform vec3 axolotlFaceColor;
                  uniform vec3 axolotlMarkingColor;
                  varying float axolotlFin;
                  uniform float axolotlPattern;
                  uniform float axolotlPatternSeed;
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
                  vec3 p = axolotlFacePosition;
                  float faceMask = smoothstep(1.1, 1.65, p.z) * (1.0-axolotlFin);
                  float bellyMask = (1.0-smoothstep(0.1,0.6,p.y)) * (1.0-axolotlFin);
                  float pale = max(faceMask, bellyMask * 0.6);
                  vec3 regionColor = mix(axolotlBodyColor, axolotlFinColor, smoothstep(0.12,0.85,axolotlFin));
                  regionColor = mix(regionColor, axolotlFaceColor, pale);
                  float luminance = dot(diffuseColor.rgb, vec3(0.2126,0.7152,0.0722));
                  float skinMask = smoothstep(0.04,0.22,luminance);
                  diffuseColor.rgb = mix(diffuseColor.rgb, regionColor * clamp(luminance / 0.62, 0.65, 1.16), skinMask * 0.9);
                  float bodyMask = (1.0 - smoothstep(1.05, 1.55, p.z)) * smoothstep(0.15, 0.5, p.y);
                  vec2 uvMark = vec2(p.z, p.x) * 4.2 + axolotlPatternSeed * 0.137;
                  vec2 cell = floor(uvMark);
                  float noise = fract(sin(dot(cell, vec2(12.9898,78.233))) * 43758.5453);
                  vec2 mark = fract(uvMark) - 0.5;
                  float spots = step(0.32,noise) * (1.0-smoothstep(0.13,0.22,length(mark)));
                  float star = step(0.56,noise) * (1.0-smoothstep(0.16,0.22,sqrt(abs(mark.x*mark.y)) + .25*length(mark)));
                  float ripple = 1.0-smoothstep(0.22,0.40,abs(sin(p.z*8.0+p.x*3.0+sin(p.x*5.0)*0.45)));
                  vec2 lotus = vec2(p.z-.25, p.x) * 2.8;
                  float petalAngle = atan(lotus.y,lotus.x);
                  float petals = .42 + .17*cos(petalAngle*5.0);
                  float petal = (1.0-smoothstep(petals-.04,petals+.035,length(lotus))) * smoothstep(.12,.2,length(lotus));
                  float pattern = axolotlPattern < 0.0 ? 0.0 : axolotlPattern < 0.5 ? spots : axolotlPattern < 1.5 ? star : axolotlPattern < 2.5 ? ripple : petal;
                  diffuseColor.rgb = mix(diffuseColor.rgb, axolotlMarkingColor, bodyMask * pattern * skinMask * 0.78);
                  float cheekR = exp(-dot((p-vec3(0.25,0.72,1.90))/vec3(.18,.10,.16),(p-vec3(0.25,0.72,1.90))/vec3(.18,.10,.16)));
                  float cheekL = exp(-dot((p-vec3(-.40,.68,1.69))/vec3(.18,.10,.16),(p-vec3(-.40,.68,1.69))/vec3(.18,.10,.16)));
                  diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.88,.25,.34),max(cheekR,cheekL)*.36*skinMask);
                  float axolotlLidCoverage = 0.0;
                  closeAxolotlEye(diffuseColor.rgb, axolotlLidCoverage, vec3(0.1503, 0.9447, 1.9278), axolotlSkinRight, 1.0);
                  closeAxolotlEye(diffuseColor.rgb, axolotlLidCoverage, vec3(-0.3378, 0.8956, 1.7373), axolotlSkinLeft, -1.0);`)
                .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.65, axolotlLidCoverage);');
            };
            material.customProgramCacheKey = () => 'axolotl-design-lids-v7';
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
            const gillBones = new Set<string>(GILLS.flatMap(({ root, mids, tip }) => [root, ...mids, tip]));
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
        let helloFraming = 0;
        let waveFraming = 0;
        let helloNear = 0;
        let helloActive = false;
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
        const light = new THREE.PointLight(appearance?.palette.lamp ?? 0xffd7a6, 0.32, 0.7);
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

        const names = [...TAIL, ...GILLS.flatMap(({ root, mids, tip }) => [root, ...mids, tip]), 'Bone_034', 'Bone_035', 'Bone_036', 'Bone_042', 'Bone_039', 'Bone_032', 'Bone_027', 'Bone_011', 'Bone_016', 'Bone_031', 'Bone_026', 'Bone_010', 'Bone_015', 'Bone_006', 'Bone_005', 'Bone_004', 'Bone_003', 'Bone_002', 'Bone_030', 'Bone_029', 'Bone_025', 'Bone_024', 'Bone_009', 'Bone_008', 'Bone_014', 'Bone_013'] as const;
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
        const sideAxes = new Map(names.map(name => {
          const orientation = bones.get(name)?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion();
          return [name, new THREE.Vector3(0, 1, 0).applyQuaternion(orientation.invert())] as const;
        }));
        const curlSideways = (name: typeof names[number], angle: number) => {
          const bone = bones.get(name), axis = sideAxes.get(name);
          if (bone && axis) bone.quaternion.multiply(delta.setFromAxisAngle(axis, angle));
        };
        const upAxis = new THREE.Vector3(0, 1, 0);
        const walkRotation = new THREE.Quaternion();
        const walkPoint = (step: number, target: import('three').Vector3) => {
          const angle = THREE.MathUtils.clamp(step / WALK_STEPS, 0, 1) * Math.PI * 2;
          // The path tangent follows the model's authored forward direction.
          return target.set((1 - Math.cos(angle)) * 0.24, 0, Math.sin(angle) * 0.24).applyAxisAngle(upAxis, FRONT_YAW);
        };
        const walkingFeet = [
          { joints: ['Bone_032', 'Bone_031', 'Bone_030', 'Bone_029'], tip: 'Bone_028', offset: 2 },
          { joints: ['Bone_027', 'Bone_026', 'Bone_025', 'Bone_024'], tip: 'Bone_023', offset: 0 },
          { joints: ['Bone_011', 'Bone_010', 'Bone_009', 'Bone_008'], tip: 'Bone_007', offset: 1 },
          { joints: ['Bone_016', 'Bone_015', 'Bone_014', 'Bone_013'], tip: 'Bone_012', offset: 3 },
        ].map(leg => {
          const tip = model.getObjectByName(leg.tip)!;
          const neutral = pivot.worldToLocal(tip.getWorldPosition(new THREE.Vector3()));
          const shoulder = model.getObjectByName(leg.joints[0])!;
          const support = pivot.worldToLocal(shoulder.getWorldPosition(new THREE.Vector3()));
          // Place paws beneath the body, leaving reach for the next curved step.
          neutral.lerp(support, 0.3);
          return { ...leg, tip, neutral, chain: leg.joints.map(name => model.getObjectByName(name)!), target: new THREE.Vector3() };
        });
        const footFrom = new THREE.Vector3(), footTo = new THREE.Vector3(), pathPoint = new THREE.Vector3();
        const localTip = new THREE.Vector3(), localTarget = new THREE.Vector3();
        const correction = new THREE.Quaternion(), beforeIK = new THREE.Quaternion();
        const footPlant = (foot: typeof walkingFeet[number], step: number, target: import('three').Vector3) => {
          const clamped = THREE.MathUtils.clamp(step, 0, WALK_STEPS);
          walkRotation.setFromAxisAngle(upAxis, clamped / WALK_STEPS * Math.PI * 2);
          target.copy(foot.neutral).applyQuaternion(walkRotation).add(walkPoint(clamped, pathPoint));
          target.y = -0.635;
          return target;
        };
        const solvePaw = (foot: typeof walkingFeet[number], extraReach = 0) => {
            for (let iteration = 0; iteration < 16; iteration++) {
              for (let j = foot.chain.length - 1; j >= 0; j--) {
                const joint = foot.chain[j];
                foot.tip.getWorldPosition(localTip);
                joint.worldToLocal(localTip).normalize();
                localTarget.copy(foot.target);
                joint.worldToLocal(localTarget).normalize();
                correction.setFromUnitVectors(localTip, localTarget);
                beforeIK.identity();
                const turn = beforeIK.angleTo(correction);
                if (turn > 0.22) {
                  beforeIK.copy(correction);
                  correction.identity().slerp(beforeIK, 0.22 / turn);
                }
                joint.quaternion.multiply(correction);
                const initial = rest.get(foot.joints[j] as typeof names[number]);
                if (initial) {
                  const bend = initial.angleTo(joint.quaternion);
                  const limit = j === 0 ? 1.15 + extraReach : 1.8;
                  if (bend > limit) {
                    beforeIK.copy(joint.quaternion);
                    joint.quaternion.copy(initial).slerp(beforeIK, limit / bend);
                  }
                }
                joint.updateMatrixWorld(true);
              }
            }
        };
        // CCD keeps stance paws planted while shoulders and hips travel over them.
        // Each foot swings for one beat, then bears weight for the other three.
        const plantWalkingFeet = (step: number, weight: number) => {
          for (const foot of walkingFeet) {
            const cycle = Math.floor((step - foot.offset) / 4);
            const lift = cycle * 4 + foot.offset;
            const phase = step - lift;
            const previousPlant = lift < 4 ? 0 : lift - 1.5;
            const nextPlant = lift < 0 ? 0 : lift + 2.5;
            footPlant(foot, previousPlant, footFrom);
            footPlant(foot, nextPlant, footTo);
            foot.target.copy(footFrom).lerp(footTo, THREE.MathUtils.smoothstep(phase, 0, 1));
            if (lift >= 0 && phase < 1 && step < WALK_STEPS) foot.target.y += Math.sin(Math.PI * phase) * 0.075;
            // Blend into/out of planted walking without snapping the existing pose.
            foot.tip.getWorldPosition(localTip);
            foot.target.lerpVectors(localTip, foot.target, weight);
            solvePaw(foot);
          }
        };
        const rearSupport = walkingFeet.slice(2).map(foot => ({
          foot, point: foot.neutral.clone().setY(-0.635),
        }));
        const rearCenter = rearSupport[0].point.clone().add(rearSupport[1].point).multiplyScalar(0.5);
        const rearLocal = walkingFeet[2].chain[0].getWorldPosition(new THREE.Vector3())
          .add(walkingFeet[3].chain[0].getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
        pivot.worldToLocal(rearLocal);
        const standOffset = new THREE.Vector3(), shoulderPoint = new THREE.Vector3();
        const screenForward = new THREE.Vector3(-0.363, 0, 0.932).normalize();
        const handGlowGeometry = new THREE.RingGeometry(0.055, 0.061, 32);
        const handGlows = [0, 1].map(() => {
          const material = new THREE.MeshBasicMaterial({ color: 0xffe1ed, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
          const mesh = new THREE.Mesh(handGlowGeometry, material);
          scene.add(mesh);
          return mesh;
        });
        const disposeRest = disposeModel;
        disposeModel = () => { disposeRest?.(); handGlowGeometry.dispose(); handGlows.forEach(glow => glow.material.dispose()); };
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
          // Animation timing follows wall time on slow mobile GPUs; only smoothing needs a small dt.
          const elapsed = Math.min(clock.getDelta(), 1.5);
          const dt = Math.min(elapsed, 0.05);
          if (!pausedRef.current && !document.hidden) {
            elapsedRef.current += elapsed;
            const t = elapsedRef.current;
            const flowTime = t * motionProfile.flow;
            if (embryo) {
              const growth = Math.max(0, Math.min(20, progressRef.current)) / 20;
              const cycle = (t + (appearance?.patternSeed ?? 0) % 7) % 14;
              const spontaneous = THREE.MathUtils.smoothstep(cycle, 7, 7.5) * (1 - THREE.MathUtils.smoothstep(cycle, 9.2, 10.2));
              const touchAge = t - touchedRef.current;
              const response = touchAge >= 0 && touchAge < 2.6 ? Math.sin(Math.PI * touchAge / 2.6) : 0;
              const wriggle = Math.max(spontaneous * (0.4 + growth * 0.35), response);
              for (const name of names) pose(name, 0, 0, 0);
              TAIL.forEach((bone, i) => {
                curlSideways(bone, 0.58 + Math.sin(t * 1.25 - i * 0.48) * 0.055 + wriggle * Math.sin(t * 4.1 - i * 0.55) * 0.085);
                bendBody(bone, 0.08 + Math.sin(t * 0.8 - i * 0.35) * 0.025);
              });
              for (const name of ['Bone_006', 'Bone_005', 'Bone_004', 'Bone_003', 'Bone_002'] as const) curlSideways(name, 0.08 + wriggle * Math.sin(t * 3.4) * 0.028);
              legNames.forEach((name, i) => kickLeg(name, (i % 4 < 2 ? 1 : -1) * (0.45 + wriggle * Math.sin(t * 5.3 + i * 1.7) * 0.24)));
              GILLS.forEach(({root,mids,tip,side,phase}) => {
                [root,...mids,tip].forEach((bone,i) => pose(bone,0,side * Math.sin(t * 1.1 + phase - i * 0.4) * 0.035,side * Math.sin(t * 1.1 + phase - i * 0.4) * 0.07));
              });
              bendBody('Bone_034', 0.1 + wriggle * 0.05);
              pose('Bone_039', 0, 0, Math.sin(t * 0.9) * 0.035);
              const breath = Math.sin(t * 1.3);
              const scale = 0.96 + growth * 0.12;
              pivot.scale.set(scale, scale * (1 + breath * 0.018), scale);
              pivot.position.set(-0.08, -0.05 + Math.sin(t * 0.75) * 0.035 + wriggle * Math.sin(t * 3.4) * 0.018, 0);
              pivot.quaternion.setFromAxisAngle(rollAxis, -0.15 + Math.sin(t * 0.8) * 0.045 + wriggle * Math.sin(t * 2.9) * 0.07);
              eyelids.value = 0.9 - response * 0.65;
              squish.value = 0;
              faces.forEach(mesh => { if(mesh.morphTargetInfluences) { mesh.morphTargetInfluences[0] = 0.2 + response * 0.4; mesh.morphTargetInfluences[1] = 0; } });
              tongue.visible = false;
              glowMaterial.opacity = 0.3 + (breath + 1) * 0.12;
              halo.scale.setScalar(0.29 + (breath + 1) * 0.025);
              light.intensity = 0.16 + (breath + 1) * 0.08;
              mount.parentElement?.setAttribute('data-reaction', wriggle > 0.15 ? 'wriggling' : 'sleeping-embryo');
            } else {
            if (autoGreet && !welcomedRef.current && t > 2) {
              welcomedRef.current = true;
              if (lastActivityRef.current === 0) {
                reactionRef.current = {kind: 'hello', started: t};
                lastActivityRef.current = t;
              }
            }
            // A quiet current travels from the base toward the tail tip.
            // A second slower current prevents a short, visibly repeated loop.
            const smooth = THREE.MathUtils.smoothstep;
            let resting = restRef.current;
            if (resting.phase === 'awake' && t - lastActivityRef.current > 180 && !dragRef.current) {
              resting = restRef.current = { phase: 'settling', started: t, wakeAge: 0 };
              reactionRef.current = { kind: 'content', started: -100 };
              setRestPhase('settling');
            }
            const waking = resting.phase === 'waking';
            const wakeAge = waking ? t - resting.started : 0;
            const restAge = resting.phase === 'awake' ? 0 : waking ? resting.wakeAge : t - resting.started;
            if (resting.phase === 'settling' && restAge >= SLEEP_SETTLE_DURATION) {
              resting.phase = 'sleeping';
              setRestPhase('sleeping');
            }
            const awakeBlend = waking ? smooth(wakeAge, 5, WAKE_DURATION) : 0;
            const restGround = smooth(restAge, 0, 1.3) * (1 - awakeBlend);
            const uncoil = waking ? 1 - smooth(wakeAge, 0.6, 3.2) : 1;
            const restCurl = smooth(restAge, WALK_END - 0.2, WALK_END + 2) * uncoil;
            const lieDown = smooth(restAge, WALK_END + 0.8, WALK_END + 3.8) * uncoil;
            const sleepy = smooth(restAge, WALK_END + 2.2, WALK_END + 4.5) * (waking ? 1 - smooth(wakeAge, 0.1, 1.3) : 1);
            const stretch = waking ? smooth(wakeAge, 2.7, 3.6) * (1 - smooth(wakeAge, 4.2, 5.1)) : 0;
            const walkClock = Math.max(0, restAge - WALK_START);
            const pauseAt = STEP_SECONDS * 15;
            const walkingTime = walkClock - THREE.MathUtils.clamp(walkClock - pauseAt, 0, WALK_PAUSE);
            const rawStep = THREE.MathUtils.clamp(walkingTime / STEP_SECONDS, 0, WALK_STEPS);
            const beat = rawStep % 1;
            const easedBeat = beat - Math.sin(beat * Math.PI * 2) / (Math.PI * 2) * 0.55;
            const walkStep = Math.floor(rawStep) + easedBeat;
            const circleAngle = walkStep / WALK_STEPS * Math.PI * 2;
            const walk = smooth(restAge, 1.3, WALK_START)
              * (1 - smooth(restAge, WALK_END, WALK_END + 0.65))
              * (waking ? 1 - smooth(wakeAge, 0, 0.7) : 1);
            const restYaw = circleAngle + (waking ? Math.atan2(-Math.sin(circleAngle), Math.cos(circleAngle)) * smooth(wakeAge, 0.4, 3.2) : 0);
            const pathBlend = waking ? 1 - smooth(wakeAge, 0.4, 3.2) : 1;
            const stepPhase = walkStep * Math.PI / 2;
            const searching = smooth(restAge, 1.3, 2.2) * (1 - smooth(restAge, WALK_END - 0.5, WALK_END + 0.5));
            const leading = searching * (0.075 + 0.035 * Math.sin(walkStep * 0.5));
            const planting = walk * (waking ? 1 - smooth(wakeAge, 0, 0.4) : 1);
            const motion = (reducedMotion.matches ? 0.15 : 1) * (1 - lieDown * 0.78);
            const touchAge = t - touchedRef.current;
            const greeting = touchAge > 0 && touchAge < 2.8 ? Math.sin(Math.PI * touchAge / 2.8) : 0;
            const reaction = reactionRef.current;
            const age = t - reaction.started;
            const envelope = THREE.MathUtils.smoothstep(age, 0, 0.38) * (1 - THREE.MathUtils.smoothstep(age, 1.8, 2.8));
            tickleActive = reaction.kind === 'tickle' && age >= 0 && age < TICKLE_DURATION;
            const ticklePose = tickleActive && !reducedMotion.matches;
            helloActive = reaction.kind === 'hello' && age >= 0 && age < HELLO_DURATION;
            const hello = helloActive ? 1 : 0;
            const helloGround = hello * smooth(age, 0, 0.8) * (1 - smooth(age, 10.6, HELLO_DURATION));
            const stand = hello * smooth(age, 0.78, 2.3) * (1 - smooth(age, 9.6, 11.05));
            const wave = hello * smooth(age, 2.45, 2.85) * (1 - smooth(age, 5.65, 6.1));
            const glass = hello * smooth(age, 6.0, 6.8) * (1 - smooth(age, 8.7, 9.5));
            const waveBeat = Math.sin((age - 2.85) * (reducedMotion.matches ? 5.2 : 8.8));
            const crouch = hello * smooth(age, 0.12, 0.38) * (1 - smooth(age, 0.78, 1.2));
            const risePush = hello * smooth(age, 0.75, 1.15) * (1 - smooth(age, 1.55, 2.2));
            helloFraming = stand;
            waveFraming = wave;
            helloNear = glass;
            const landing = ticklePose ? THREE.MathUtils.smoothstep(age, 0, 1.1) : 0;
            const rising = ticklePose ? THREE.MathUtils.smoothstep(age, 8.2, TICKLE_DURATION) : 0;
            const grounded = landing * (1 - rising);
            const rollIn = ticklePose ? THREE.MathUtils.smoothstep(age, 0.3, 1.5) : 0;
            const getUp = ticklePose ? THREE.MathUtils.smoothstep(age, 6.65, 8.2) : 0;
            const belly = rollIn * (1 - getUp);
            const laughing = tickleActive ? THREE.MathUtils.smoothstep(age, 0.15, 1.25) * (1 - THREE.MathUtils.smoothstep(age, 3.65, 4.5)) : 0;
            const wriggle = reducedMotion.matches ? 0 : laughing;
            const tired = tickleActive ? THREE.MathUtils.smoothstep(age, 4.1, 4.7) * (1 - THREE.MathUtils.smoothstep(age, 6.5, 8)) : 0;
            const stroking = resting.phase === 'awake' && !helloActive && !tickleActive && t - strokeRef.current < 0.3;
            affection += ((stroking ? 1 : 0) - affection) * (1 - Math.exp(-dt * (stroking ? 5 : 2.8)));
            const content = Math.max(affection, reaction.kind === 'content' ? envelope : 0, tired * 0.85);
            const response = Math.max(greeting, affection, laughing * 0.8, sleepy * 0.22, stand * 0.78);
            const squint = Math.max(reaction.kind === 'squish' ? envelope : 0, laughing * (0.82 + 0.15 * Math.sin(age * 5.5)), sleepy * 0.35);
            squish.value += (squint - squish.value) * (1 - Math.exp(-dt * 12));
            const blep = Math.max(reaction.kind === 'blep' ? envelope : 0, tired * 0.6);
            tongue.visible = blep > 0.01;
            tongue.scale.set(0.85 + blep * 0.15, blep, blep);
            const flipping = reaction.kind === 'flip' && age >= 0 && age < FLIP_DURATION;
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
            curlFraming = Math.max(curl, walk * 0.9);
            if (t >= nextBlink) {
              blinkStarted = t;
              nextBlink = t + 2.5 + Math.random() * 1.9;
            }
            const blinkAge = t - blinkStarted;
            const blink = blinkAge < 0.34 ? Math.sin(Math.PI * Math.max(0, blinkAge) / 0.34) ** 2 : 0;
            eyelids.value = Math.max(blink, content * 0.98, blep * 0.3, sleepy);
            faces.forEach(mesh => {
              if (!mesh.morphTargetInfluences) return;
              mesh.morphTargetInfluences[0] = response * (1 - squish.value * 0.7);
              mesh.morphTargetInfluences[1] = squish.value;
            });
            TAIL.forEach((bone, index) => {
              const phase = flowTime * 1.45 - index * 0.51;
              const spread = 0.035 + index * 0.013;
              const follow = flipping ? Math.sin(Math.PI * THREE.MathUtils.clamp((age - 0.5 - index * 0.07) / 2.4, 0, 1)) : 0;
              pose(bone,
                motion * (Math.sin(phase - 0.3) * spread * 0.28 + follow * 0.02 + belly * 0.03),
                motion * (Math.sin(phase) * spread + Math.sin(t * 0.47 - index * 0.33) * 0.018 + response * Math.sin(t * 5 - index * 0.6) * 0.065 + wriggle * Math.sin(age * 7 - index * 0.7) * 0.045),
                motion * Math.sin(phase + 0.6) * spread * 0.35);
              // Tail bends toward the belly in a delayed arc, not a rigid spin.
              const tailCurl = flipping ? THREE.MathUtils.smoothstep(age, 0.83 + index * 0.035, 1.23 + index * 0.035)
                * (1 - THREE.MathUtils.smoothstep(age, 1.85 + index * 0.04, 2.4 + index * 0.04)) : 0;
              bendBody(bone, -tailCurl * (0.42 + index * 0.02) + stand * (index < 3 ? 0.28 : 0.06));
              const tailRest = smooth(restAge, WALK_END - 0.2 + index * 0.13, WALK_END + 2 + index * 0.13) * uncoil;
              curlSideways(bone, tailRest * (0.54 - index * 0.035) - leading * (0.8 - index * 0.08));
            });
            GILLS.forEach(({ root, mids, tip, phase, side }) => {
              const follow = flipping ? Math.sin((age - phase * 0.06) * 4.2) * Math.sin(Math.PI * flight) * 0.035 : 0;
              const current = follow + wriggle * Math.sin(age * 8 - phase) * 0.024 + Math.sin(flowTime * 1.33 + phase) * 0.038 + Math.sin(t * 0.54 + phase * 0.6) * 0.014;
              const finFlow = 1 - lieDown * 0.55;
              pose(root, finFlow * current * 0.42, finFlow * side * current * 0.66, finFlow * side * (current * 1.35 + response * 0.035));
              mids.forEach((bone, index) => {
                const delayed = Math.sin(flowTime * 1.33 + phase - 0.3 - index * 0.28);
                pose(bone, finFlow * delayed * 0.033, finFlow * side * delayed * 0.04, finFlow * side * delayed * (0.06 + index * 0.012));
              });
              pose(tip, finFlow * Math.sin(flowTime * 1.33 + phase - 0.55) * 0.045,
                finFlow * side * Math.sin(t * 0.92 + phase - 0.4) * 0.037,
                finFlow * side * Math.sin(flowTime * 1.33 + phase - 0.65) * 0.087);
            });
            // A small attentive tilt accompanies the smile; the antenna follows.
            pose('Bone_036', -tuck * 0.07 + launch * 0.025, wriggle * Math.sin(age * 6) * 0.045, tuck * 0.045 + belly * 0.035);
            pose('Bone_035', motion * response * -0.018 - tuck * 0.08, motion * Math.sin(t * 1.12 - 0.4) * 0.012, motion * (Math.sin(flowTime * 0.77) * 0.012 * motionProfile.tilt + response * 0.05));
            pose('Bone_034', -motion * content * 0.035 + launch * 0.055 - tuck * 0.04 + wriggle * Math.sin(age * 7) * 0.045, motion * gazeRef.current * (0.035 + affection * 0.055), motion * (Math.sin(t * 1.12 - 0.85) * 0.015 + content * 0.06));
            pose('Bone_032', tuck * 0.28 - launch * 0.14, 0, -tuck * 0.12);
            pose('Bone_027', tuck * 0.28 - launch * 0.14, 0, tuck * 0.12);
            pose('Bone_011', tuck * -0.18 + launch * 0.16, 0, -tuck * 0.1);
            pose('Bone_016', tuck * -0.18 + launch * 0.16, 0, tuck * 0.1);
            for (const name of ['Bone_030', 'Bone_029', 'Bone_025', 'Bone_024', 'Bone_009', 'Bone_008', 'Bone_014', 'Bone_013']) pose(name, 0, 0, 0);
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
              if (resting.phase !== 'awake') {
                const leg = i % 4, front = leg < 2;
                const fold = front ? 1 : -1;
                const angle = i < 4
                  ? -fold * lieDown * 0.4 + (front ? 0.26 : -0.12) * stretch
                  : -fold * lieDown * 1.0 + (front ? -0.45 : 0.12) * stretch;
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
              curlSideways(name, restCurl * (name === 'Bone_003' || name === 'Bone_002' ? -0.13 : 0.09));
              curlSideways(name, leading * (name === 'Bone_003' || name === 'Bone_002' ? -0.35 : 0.2));
              bendBody(name, stretch * (name === 'Bone_006' ? 0.08 : -0.035));
            }
            bendBody('Bone_036', curl * 0.3 + lieDown * 0.18 + stand * 0.26 - crouch * 0.06);
            bendBody('Bone_035', curl * 0.3 + lieDown * 0.16 + stand * 0.31 - crouch * 0.08);
            bendBody('Bone_034', curl * 0.33 - launch * 0.06 + lieDown * 0.12 - stretch * 0.13 + stand * 0.3 + risePush * 0.045);
            curlSideways('Bone_036', -restCurl * 0.1 + leading);
            curlSideways('Bone_035', -restCurl * 0.12 + leading * 0.7);
            const neck = bones.get('Bone_034');
            if (neck) neck.quaternion.multiply(delta.setFromEuler(euler.set(0, 0, glass * Math.sin(age * 1.6) * 0.09 * motion)));
            pose('Bone_042', motion * Math.sin(t * 0.92) * 0.009, 0, motion * Math.sin(t * 0.88) * 0.014);
            if (antennaBase) antennaBase.quaternion.multiply(delta.setFromAxisAngle(antennaLieAxis, belly * 1.4 + lieDown * 0.1));
            pose('Bone_039', 0, 0, motion * Math.sin(t * 0.88 - 0.5) * 0.018 + (flipping ? Math.sin(age * 5 - 0.8) * Math.sin(Math.PI * flight) * 0.035 : 0));
            // Inhale brightens the antenna; exhale releases it gradually.
            const breath = (1 + Math.sin(t * 1.3 * motionProfile.breath - 0.4)) / 2;
            const sleepBreath = (1 + Math.sin(t * 1.05 * motionProfile.breath - 0.4)) / 2;
            const glowBreath = THREE.MathUtils.lerp(breath, sleepBreath, sleepy);
            const shimmer = 0.035 * Math.sin(t * 3.2) * Math.sin(t * 2.1);
            glowMaterial.opacity = 0.31 + motion * (0.33 * glowBreath + shimmer);
            halo.scale.setScalar(0.34 + motion * 0.12 * glowBreath);
            light.intensity = 0.24 + motion * 0.24 * glowBreath;
            pivot.position.y = motion * motionProfile.bob * (Math.sin(flowTime * 1.3) * 0.018 + Math.sin(t * 0.46) * 0.009);
            pivot.position.y += jumpHeight - anticipation * 0.13 - settle * 0.04;
            const squash = anticipation * 0.055 + settle * 0.025 + crouch * 0.07;
            pivot.scale.set(1 + squash * 0.5, 1 - squash, 1 + squash * 0.5);
            const pant = motion * tired * Math.sin(age * 7.5) * 0.012;
            pivot.scale.y += pant;
            pivot.scale.z -= pant * 0.35;
            pivot.scale.y += lieDown * (sleepBreath - 0.5) * 0.018;
            walkPoint(walkStep, pathPoint);
            pivot.position.x = pathPoint.x * pathBlend;
            pivot.position.z = pathPoint.z * pathBlend;
            pivot.quaternion.setFromAxisAngle(flipAxis, -flipAngle)
              .multiply(delta.setFromEuler(euler.set(0, motion * Math.sin(t * 0.39) * 0.013, 0)));
            if (resting.phase !== 'awake') {
              pivot.quaternion.premultiply(delta.setFromAxisAngle(upAxis, restYaw));
              pivot.quaternion.multiply(rollQuaternion.setFromAxisAngle(rollAxis, lieDown * 0.16 + walk * Math.sin(stepPhase + 0.35) * 0.018));
            }
            if (helloActive) {
              const rising = stand * 1.03 + risePush * 0.075;
              pivot.quaternion.premultiply(delta.setFromAxisAngle(flipAxis, -rising));
              // Pivot above the planted rear paws; the small side shift loads the supporting leg.
              standOffset.copy(rearLocal).applyQuaternion(pivot.quaternion);
              pivot.position.x += stand * (rearCenter.x - standOffset.x - wave * 0.035);
              pivot.position.z += stand * (rearCenter.z - standOffset.z + glass * 0.08);
              pivot.quaternion.multiply(rollQuaternion.setFromAxisAngle(rollAxis, -wave * (0.055 + 0.014 * waveBeat)));
            }
            if (ticklePose) {
              // Roll onto the back, rest, then unwind onto the paws before rising.
              const roll = belly * (Math.PI * 0.91 + wriggle * Math.sin(age * 7.1) * 0.10);
              pivot.quaternion.multiply(rollQuaternion.setFromAxisAngle(rollAxis, roll));
              pivot.quaternion.multiply(delta.setFromAxisAngle(flipAxis, belly * 0.12));
            }
            if (ticklePose || restGround > 0 || helloGround > 0) {
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
              pivot.position.y = THREE.MathUtils.lerp(Math.sin(t * 1.3) * 0.018, floorOffset, Math.max(grounded, restGround, helloGround));
              pivot.position.y -= walk * (0.025 + Math.sin(stepPhase * 2) * 0.006);
            }
            for (const glow of handGlows) glow.material.opacity = 0;
            if (helloActive) {
              const standingY = -0.635 + 0.18 - standOffset.y;
              pivot.position.y = THREE.MathUtils.lerp(pivot.position.y - crouch * 0.055, standingY + risePush * 0.015, stand);
              scene.updateMatrixWorld(true);
              for (const { foot, point } of rearSupport) {
                foot.tip.getWorldPosition(localTip);
                foot.target.copy(localTip).lerp(point, stand);
                solvePaw(foot);
              }
              for (let i = 0; i < 2; i++) {
                const foot = walkingFeet[i];
                foot.chain[0].getWorldPosition(shoulderPoint);
                const side = i === 0 ? 1 : -1;
                foot.target.copy(shoulderPoint).addScaledVector(screenForward, 0.17 + glass * 0.055 + (i === 0 ? wave * 0.055 : 0));
                foot.target.addScaledVector(flipAxis, side * (0.075 + (i === 0 ? wave * (0.095 + waveBeat * 0.07) : 0)));
                foot.target.y += 0.035 + glass * 0.025 + (i === 0 ? wave * (0.21 + waveBeat * 0.065) : 0);
                foot.tip.getWorldPosition(localTip);
                foot.target.lerpVectors(localTip, foot.target, stand);
                solvePaw(foot, i === 0 ? wave * 0.23 : 0);
                if (i === 0 && wave > 0) {
                  // This paw is free in the air: let the shoulder and wrist swing
                  // after IK rather than pinning the wave to a nearly fixed point.
                  curlSideways('Bone_032', wave * (0.32 + waveBeat * 0.31));
                  bendBody('Bone_031', wave * (0.12 + waveBeat * 0.16));
                  foot.chain[0].updateMatrixWorld(true);
                }
                foot.tip.getWorldPosition(handGlows[i].position);
                handGlows[i].position.addScaledVector(screenForward, 0.015);
                handGlows[i].material.opacity = glass * 0.42;
                handGlows[i].scale.setScalar(1 + glass * 0.12);
              }
            }
            if (planting > 0) {
              scene.updateMatrixWorld(true);
              plantWalkingFeet(walkStep, planting);
            }
            mount.parentElement?.setAttribute('data-reaction', resting.phase !== 'awake' ? (waking ? 'waking' : restAge < 1.3 ? 'landing' : restAge < WALK_END ? 'circling' : restAge < SLEEP_SETTLE_DURATION ? 'settling' : 'sleeping') : helloActive ? (age < 2.45 ? 'standing-up' : age < 6.1 ? 'waving' : age < 9.5 ? 'touching-glass' : 'lowering') : tickleActive ? (age < 1.5 ? 'rolling' : age < 4.5 ? 'ticklish' : age < 6.65 ? 'resting' : 'getting-up') : flipping ? 'flip' : age < 3.2 && age >= 0 && (reaction.kind === 'content' || reaction.kind === 'squish' || reaction.kind === 'blep') ? reaction.kind : 'idle');
            if (waking && wakeAge >= WAKE_DURATION) {
              restRef.current = { phase: 'awake', started: t, wakeAge: 0 };
              lastActivityRef.current = t;
              setRestPhase('awake');
            }
          }
          }
          // Manual viewing remains available when animation is paused.
          viewYaw += (orbitRef.current - viewYaw) * (1 - Math.exp(-dt * 16));
          // Make room above the head while preserving the visible upward leap.
          // Bring the face forward for the wave while leaving room for the raised paw.
          const viewRadius = embryo ? 4.1 : 3.8 + jumpHeight * 1.15 + curlFraming * 0.55 + helloFraming * 0.35 - waveFraming * 0.28 - helloNear * 0.65;
          const framingLift = jumpHeight * 0.38 + helloFraming * 0.24 + helloNear * 0.04;
          camera.position.set(Math.sin(viewYaw) * viewRadius, 0.35 + framingLift, Math.cos(viewYaw) * viewRadius);
          camera.lookAt(0, 0.04 + framingLift, 0);
          for (const glow of handGlows) glow.quaternion.copy(camera.quaternion);
          renderer?.render(scene, camera);
          crown.getWorldPosition(projectedCrown).project(camera);
          const headSize = 0.56 / (3.8 - 0.9 * Math.cos(viewYaw - FRONT_YAW)) / (2 * Math.tan(THREE.MathUtils.degToRad(17)));
          headHitRef.current = {
            x: (projectedCrown.x + 1) / 2, y: (1 - projectedCrown.y) / 2,
            rx: headSize * 0.35 / camera.aspect, ry: headSize * 0.26,
            visible: !!head && !helloActive && !tickleActive && Math.cos(viewYaw - FRONT_YAW) > 0.35 && Math.abs(flipAngle) < 0.01,
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
  }, [embryo, autoGreet, appearance?.identity, appearance?.palette.body, appearance?.palette.secondary, appearance?.palette.lamp, appearance?.traits.pattern.id, appearance?.patternSeed, appearance?.previewDesign, motionId]);

  const faceViewer = () => {
    lastActivityRef.current = elapsedRef.current;
    const delta = FRONT_YAW - orbitRef.current;
    orbitRef.current += Math.atan2(Math.sin(delta), Math.cos(delta));
    gazeRef.current = 0;
  };
  if (embryo) return <span className="axolotl-embryo" data-status={status} data-testid="egg-embryo-3d">
    <span ref={mountRef} className="living-companion-canvas" aria-hidden="true" />
    {status !== 'ready' && <span className="companion-model-message" role="status">{status === 'error' ? 'เปิดตัวอ่อน 3D ไม่ได้' : 'กำลังพาน้องมา…'}</span>}
  </span>;
  return <div className="axolotl-viewer" data-rest={restPhase} data-paused={paused} data-motion={motionId} data-pattern={appearance?.traits.pattern.id}>
    <button type="button" className="living-companion-3d axolotl-orbit" data-renderer="axolotl-water-preview" data-status={status}
    aria-label="ลูบหัวน้องเพื่อเล่นด้วย ลากบริเวณรอบตัวหรือใช้ลูกศรเพื่อหมุนดู กด Enter เพื่อให้น้องเล่น"
    onPointerDown={event => {
      if (event.button !== 0 || !event.isPrimary) return;
      lastActivityRef.current = elapsedRef.current;
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
          wakeFromRest();
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
        lastActivityRef.current = elapsedRef.current;
        orbitRef.current += event.key === 'ArrowLeft' ? -0.25 : 0.25;
      }
      if (event.key === 'Home') { event.preventDefault(); faceViewer(); }
    }}
    onClick={event => {
      if (suppressClickRef.current && event.detail !== 0) { suppressClickRef.current = false; return; }
      reactToPet();
    }}>
    <span ref={mountRef} className="living-companion-canvas" aria-hidden="true" />
    {!canPlay && <span role="status" className="companion-model-message">{status === 'error' ? 'เปิดโมเดล 3D บนอุปกรณ์นี้ไม่ได้' : 'กำลังพาน้องมาหา…'}</span>}
    </button>
    {showControls && <div className="axolotl-viewer-controls">
      <button type="button" className="axolotl-front-button" disabled={paused || !canPlay} onClick={reactToPet}>ลูบหัว ♡</button>
      <button type="button" className="axolotl-front-button" disabled={paused || !canPlay || restPhase === 'waking'} onClick={toggleRest}>{restPhase === 'awake' ? 'นอนพัก' : restPhase === 'waking' ? 'กำลังตื่น…' : 'ปลุกน้อง'}</button>
      <button type="button" className="axolotl-front-button" disabled={paused || !canPlay || restPhase !== 'awake'} onClick={doFlip}>ตีลังกา</button>
      <button type="button" className="axolotl-front-button" disabled={paused || !canPlay || restPhase !== 'awake'} onClick={sayHello} aria-label="ทักทาย โบกมือและแตะกระจก">ทักทาย</button>
      <button type="button" className="axolotl-front-button" onClick={faceViewer} aria-label="หันมาหาเรา">มองเรา</button>
    </div>}
  </div>;
}

function clampGaze(value: number) { return Math.max(-1, Math.min(1, value)); }
