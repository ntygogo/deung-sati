"""Render the existing Deung Sati model as transparent, deterministic 2.5D clips.

The source .blend is read-only. Geometry, UVs, textures, and studio lighting are
preserved; only existing rig bones and existing facial shape keys are posed.
No generated imagery, repainting, background removal, or video is involved.

Render with Blender 4.5+ (CPU Cycles):
  blender -b --python scripts/render-companion-sprites.py -- \
    --source /path/to/DeungSati_Puppy_V2.blend --frames /tmp/companion-frames
Then mechanically pack the RGBA renders with Python + Pillow:
  python scripts/render-companion-sprites.py --pack \
    --frames /tmp/companion-frames --output public/sprites/companion-model-v1

Use --proof to render only representative frames for visual inspection first.
"""

import argparse
import json
import math
from pathlib import Path
import sys


TILE_SIZE = 448
COLUMNS = 4
CLIPS = {
    "idle": {"frames": 12, "fps": 12},
    "blink": {"frames": 6, "fps": 12},
    "greet": {"frames": 18, "fps": 12},
    "play": {"frames": 18, "fps": 12},
    "sleep": {"frames": 12, "fps": 12},
}


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path)
    parser.add_argument("--frames", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--pack", action="store_true")
    parser.add_argument("--proof", action="store_true")
    parser.add_argument("--samples", type=int, default=12)
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    return parser.parse_args(argv)


def smooth(x):
    x = max(0, min(1, x))
    return x * x * (3 - 2 * x)


def render(args):
    import bpy

    if not args.source:
        raise ValueError("--source must point to the existing .blend model")
    bpy.ops.wm.open_mainfile(filepath=str(args.source.resolve()), use_scripts=False)
    scene = bpy.context.scene
    model = bpy.data.objects["Mesh_0"]
    rig = bpy.data.objects["UniRigArmature"]
    keys = model.data.shape_keys
    scene.frame_set(1)
    rig.animation_data_clear()
    keys.animation_data_clear()
    for bone in rig.pose.bones:
        bone.rotation_mode = "XYZ"
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = args.samples
    scene.cycles.seed = 14
    scene.cycles.use_animated_seed = False
    scene.cycles.use_denoising = True
    scene.render.use_persistent_data = True
    scene.render.resolution_x = TILE_SIZE
    scene.render.resolution_y = TILE_SIZE
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.camera.data.ortho_scale = 2.42
    neutral_location = rig.location.copy()
    neutral_location.z = 0
    neutral_scale = rig.scale.copy()

    def bone(name, x=0, y=0, z=0):
        rig.pose.bones[name].rotation_euler = (x, y, z)

    def expression(name, value):
        if name in keys.key_blocks:
            keys.key_blocks[name].value = value

    def pose(clip, index, count):
        for key in keys.key_blocks:
            key.value = 0
        for item in rig.pose.bones:
            item.rotation_euler = (0, 0, 0)
            item.location = (0, 0, 0)
            item.scale = (1, 1, 1)
        rig.location = neutral_location
        rig.scale = neutral_scale
        t = index / max(1, count - 1)
        beat = math.sin(math.pi * t) ** 2
        expression("Smile", .12)

        if clip == "idle":
            phase = index / count * math.tau
            breath = (1 - math.cos(phase)) / 2
            rig.scale.z *= 1 + .003 * breath
            for i, name in enumerate(["Bone_034", "Bone_037", "Bone_046", "Bone_049", "Bone_052", "Bone_055"]):
                bone(name, z=.009 * math.sin(phase) * (-1 if i % 2 else 1))
            bone("Bone_043", z=.007 * math.sin(phase))

        elif clip == "blink":
            amount = [0, .3, .92, .92, .3, 0][index]
            expression("Blink_L", amount)
            expression("Blink_R", amount)

        elif clip == "greet":
            bone("Bone_029", x=-.025 * beat, y=.04 * beat, z=.11 * beat)
            bone("Bone_027", x=.035 * beat, z=.30 * beat)
            bone("Bone_026", x=.025 * beat, z=.09 * beat * math.sin(t * math.tau * 2))
            bone("Bone_023", z=-.035 * beat)
            expression("Smile", .12 + .34 * beat)
            expression("Gaze_X", .2 * beat)
            for i, name in enumerate(["Bone_019", "Bone_018", "Bone_017"]):
                bone(name, z=.12 * beat * math.sin(t * math.tau * 2 - i * .4))

        elif clip == "play":
            hop = math.sin(t * math.pi * 2) ** 2
            rig.location.z += .065 * hop
            bone("Bone_029", z=.07 * beat * math.sin(t * math.tau * 2))
            bone("Bone_023", z=-.15 * hop)
            bone("Bone_027", z=.15 * hop)
            bone("Bone_009", x=-.06 * hop)
            bone("Bone_014", x=-.06 * hop)
            for i, name in enumerate(["Bone_019", "Bone_018", "Bone_017"]):
                bone(name, z=.15 * beat * math.sin(t * math.tau * 3 - i * .4))
            expression("Smile", .12 + .64 * beat)
            expression("Happy_Eyes", .28 * beat)
            for i, name in enumerate(["Bone_034", "Bone_037", "Bone_046", "Bone_049", "Bone_052", "Bone_055"]):
                bone(name, z=.028 * hop * (-1 if i % 2 else 1))

        elif clip == "sleep":
            rest = smooth(t)
            bone("Bone_029", x=-.11 * rest, z=.065 * rest)
            expression("Blink_L", .97 * rest)
            expression("Blink_R", .97 * rest)
            expression("Smile", .12 * (1 - rest))
            for i, name in enumerate(["Bone_034", "Bone_037", "Bone_046", "Bone_049", "Bone_052", "Bone_055"]):
                bone(name, z=.024 * rest * (-1 if i % 2 else 1))

        bpy.context.view_layer.update()

    for clip, spec in CLIPS.items():
        target = args.frames / clip
        target.mkdir(parents=True, exist_ok=True)
        count = spec["frames"]
        indices = [count - 1 if clip == "sleep" else count // 2] if args.proof else range(count)
        for index in indices:
            path = target / f"{index:03d}.png"
            # Deterministic already-rendered proof frames are reused unchanged.
            if path.exists() and not args.proof:
                continue
            pose(clip, index, count)
            scene.render.filepath = str(path.resolve())
            bpy.ops.render.render(write_still=True)
            print(f"COMPANION_RENDER {clip} {index + 1}/{count}", flush=True)


def pack(args):
    from PIL import Image

    if not args.output:
        raise ValueError("--output is required for --pack")
    args.output.mkdir(parents=True, exist_ok=True)
    manifest = {"tileSize": TILE_SIZE, "columns": COLUMNS, "clips": {}}
    for clip, spec in CLIPS.items():
        count = spec["frames"]
        rows = math.ceil(count / COLUMNS)
        atlas = Image.new("RGBA", (COLUMNS * TILE_SIZE, rows * TILE_SIZE), (0, 0, 0, 0))
        for index in range(count):
            frame = Image.open(args.frames / clip / f"{index:03d}.png").convert("RGBA")
            if frame.size != (TILE_SIZE, TILE_SIZE):
                raise ValueError(f"Unexpected frame size for {clip}/{index}")
            alpha = frame.getchannel("A")
            if alpha.getextrema() != (0, 255):
                raise ValueError(f"Frame lacks transparent background: {clip}/{index}")
            if frame.getpixel((0, 0))[3] != 0 or frame.getpixel((TILE_SIZE - 1, TILE_SIZE - 1))[3] != 0:
                raise ValueError(f"Nontransparent corner in {clip}/{index}")
            bounds = alpha.getbbox()
            if not bounds or min(bounds[0], bounds[1]) < 4 or max(bounds[2], bounds[3]) > TILE_SIZE - 4:
                raise ValueError(f"Clipped silhouette in {clip}/{index}: {bounds}")
            # Copy RGBA directly; no mask argument, premultiplication, or compositing.
            atlas.paste(frame, ((index % COLUMNS) * TILE_SIZE, (index // COLUMNS) * TILE_SIZE))
        destination = args.output / f"{clip}.webp"
        atlas.save(destination, "WEBP", quality=92, method=6, lossless=False, exact=True)
        # Decode the actual deliverable and verify alpha survived the codec.
        with Image.open(destination) as decoded:
            if decoded.mode != "RGBA" or decoded.getpixel((0, 0))[3] != 0:
                raise ValueError(f"Alpha missing from packed atlas {destination}")
        manifest["clips"][clip] = {"src": f"/sprites/companion-model-v1/{clip}.webp", **spec}
        print(f"COMPANION_ATLAS {clip}: {destination.stat().st_size} bytes {atlas.size}")

    # A first-paint frame allows a visible original model before clip preloading.
    poster = Image.open(args.frames / "idle" / "000.png").convert("RGBA")
    poster.save(args.output / "poster.webp", "WEBP", quality=95, method=6, exact=True)
    manifest["poster"] = "/sprites/companion-model-v1/poster.webp"
    (args.output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest))


if __name__ == "__main__":
    options = arguments()
    pack(options) if options.pack else render(options)
