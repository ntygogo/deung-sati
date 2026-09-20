# Original-model 2.5D companion

These assets are native Blender renders of the existing `DeungSati_Puppy_V2.blend` model, not a redrawn SVG character or an AI-generated replacement.

- Source SHA-256: `bfbeb1fb4321bc8ef95c4d6b2696d936621d0c4fd1515306e1811fca98997575`
- Existing mesh, UVs, textures, materials, rig, and lighting are preserved.
- Existing rig bones and facial shape keys produce each pose.
- Blender 4.5.9 LTS, CPU Cycles, 12 samples, denoising, deterministic sampling.
- 448 × 448 pixel RGBA tiles; four columns; row-major frame order.
- Transparent background is rendered natively, not removed afterward.
- WebP atlases use quality 92 and preserve alpha; the initial poster uses quality 95.

`manifest.json` is the runtime contract. Clips: `idle` (12 frames), `blink` (6), `greet` (18), `play` (18), and `sleep` (12), each at 12 fps. `greet` is a head tilt with gentle arm movement, not a fully raised hand wave. `sleep` progresses from awake to a standing doze; hold its final frame to sleep and play frames in reverse to wake. Other action clips return to the neutral pose. The application chooses actions in response to input and elapsed time; no video is used.

The browser displays pre-rendered frames using CSS background positions on a DOM element, so it does not load or rotate the `.blend`/`.glb` model and does not require WebGL. This preserves the rendered 3D appearance, but it is not an arbitrary-viewpoint real-time 3D renderer.

Rebuild using `scripts/render-companion-sprites.py`. The source model is read-only and is never overwritten by that script.
