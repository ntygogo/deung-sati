# Original-model 2.5D companion

These assets are native Blender renders of the existing `DeungSati_Puppy_V2.blend` model, not a redrawn SVG character or an AI-generated replacement.

- Source SHA-256: `bfbeb1fb4321bc8ef95c4d6b2696d936621d0c4fd1515306e1811fca98997575`
- Existing mesh, UVs, textures, materials, rig, and lighting are preserved.
- Existing rig bones and facial shape keys produce each pose.
- Blender 4.5.9 LTS, CPU Cycles, 12 samples, denoising, deterministic sampling.
- 448 × 448 pixel RGBA tiles; four columns; row-major frame order.
- Transparent background is rendered natively, not removed afterward.
- WebP atlases use quality 92 and preserve alpha; the initial poster uses quality 95.

`manifest.json` is the runtime contract. Every clip uses 12 fps. Play gestures return to standing; rest transitions connect the matching standing, seated and lying poses. `idle`, `seated`, and `sleeping` contain subtle breathing loops. The old `sleep` atlas is retained for compatibility but is no longer selected by the controller.

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
| `look` | 36 | 3 seconds | Eyes lead a gentle head turn, then return to face the user |
| `shift` | 36 | 3 seconds | Small weight transfer through feet and arms with a relaxed blink |
| `tail` | 36 | 3 seconds | A gentle, delayed tail-chain swish with independent gill motion |
| `sitDown` | 24 | 2 seconds | Folds the hind legs forward and lowers into sitting; reverse to stand |
| `seated` | 36 | 3 seconds | Seated breathing, small gaze movement and a relaxed blink |
| `lieDown` | 36 | 3 seconds | Settles from sitting onto the side, curls the tail and closes the eyes |
| `sleeping` | 36 | 3 seconds | Side-lying sleep with subtle breathing |
| `rise` | 36 | 3 seconds | Opens the eyes, uncurls and rises from lying to standing |
| `spin` | 48 | 4 seconds | A full rig rotation with small foot steps; actual side/back geometry |

Natural idle timing: small details alternate without consecutive repeats and leave 1.5–4.5 seconds after their duration before the next detail is due. Larger spontaneous gestures wait 18–30 seconds after their duration. Blinks have their own timer, and standing automatic actions leave at least a 0.7-second neutral gap. After 90 quiet seconds the pet sits down; after 180 it lies down to sleep. Connected posture transitions play without neutral-standing gaps. A touch during lowering reverses from the displayed frame, then stands and stretches. A touch during sleep plays rise then stretch. Repeated touches cannot restart waking. The room also offers sit, sleep and spin controls. Pausing, hidden tabs and reduced-motion preferences are respected.

All rest/spin poses keep the lowest evaluated model vertex on the original floor. Anatomical rotation axes use a fixed rest rig matrix, independent of the previous frame's whole-body rotation. This makes renders deterministic across proof/subset/full runs. Rest assets are preloaded together before playback so missing transition frames cannot cause standing flashes; failed loading offers a retry by tapping the pet.

The application chooses finite actions in response to input and elapsed time; no video is used. New limb gestures convert a known world-space anatomical rotation axis into each existing UniRig bone's rest coordinates, so the original rig is preserved and mirrored arms move correctly.

The browser displays pre-rendered frames using CSS background positions on a DOM element, so it does not load or rotate the `.blend`/`.glb` model and does not require WebGL. This preserves the rendered 3D appearance, but it is not an arbitrary-viewpoint real-time 3D renderer.

Rebuild using `scripts/render-companion-sprites.py`. The source model is read-only and is never overwritten by that script. Pass `--clips wave curious nuzzle stretch` to render/pack only the four extra gestures. Subset packing merges `manifest.json` and preserves all other atlas and poster bytes. Render with `--proof` first to inspect representative poses before producing the full sequences.
