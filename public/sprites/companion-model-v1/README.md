# Original-model 2.5D companion

These assets are native Blender renders of the existing `DeungSati_Puppy_V2.blend` model, not a redrawn SVG character or an AI-generated replacement.

- Source SHA-256: `bfbeb1fb4321bc8ef95c4d6b2696d936621d0c4fd1515306e1811fca98997575`
- Existing mesh, UVs, textures, materials, rig, and lighting are preserved.
- Existing rig bones and facial shape keys produce each pose.
- Blender 4.5.9 LTS, CPU Cycles, 12 samples, denoising, deterministic sampling.
- 448 × 448 pixel RGBA tiles; four columns; row-major frame order.
- Transparent background is rendered natively, not removed afterward.
- WebP atlases use quality 92 and preserve alpha; the initial poster uses quality 95.

`manifest.json` is the runtime contract. Every clip uses 12 fps. Finite actions return to the neutral pose, except `sleep`, whose final dozing pose is held until waking; `idle` is a continuous subtle breathing loop.

| Clip | Frames | Duration | Model motion |
| --- | ---: | ---: | --- |
| `idle` | 12 | 1 second | Subtle breathing and gill motion |
| `blink` | 6 | 0.5 seconds | Both original textured eyes blink |
| `greet` | 18 | 1.5 seconds | Gentle head tilt and arm movement |
| `play` | 18 | 1.5 seconds | Two little hops with arm, leg, and tail movement |
| `sleep` | 12 | 1 second | Transitions from awake to standing doze; reverse to wake |
| `wave` | 24 | 2 seconds | Raises one hand beside the cheek and waves the forearm/wrist |
| `curious` | 24 | 2 seconds | Tilts the head, looks side to side, and settles |
| `nuzzle` | 24 | 2 seconds | Leans into a gentle pet with smiling, relaxed eyes |
| `stretch` | 24 | 2 seconds | Opens both arms, lifts the head, and shifts both feet outward |

The application chooses finite actions in response to input and elapsed time; no video is used. New limb gestures convert a known world-space anatomical rotation axis into each existing UniRig bone's rest coordinates, so the original rig is preserved and mirrored arms move correctly.

The browser displays pre-rendered frames using CSS background positions on a DOM element, so it does not load or rotate the `.blend`/`.glb` model and does not require WebGL. This preserves the rendered 3D appearance, but it is not an arbitrary-viewpoint real-time 3D renderer.

Rebuild using `scripts/render-companion-sprites.py`. The source model is read-only and is never overwritten by that script. Pass `--clips wave curious nuzzle stretch` to render/pack only the four extra gestures. Subset packing merges `manifest.json` and preserves all other atlas and poster bytes. Render with `--proof` first to inspect representative poses before producing the full sequences.
