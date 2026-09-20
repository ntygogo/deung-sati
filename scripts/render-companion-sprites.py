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
Use --clips wave curious nuzzle stretch to add selected clips without rendering
or repacking existing atlases; subset packing merges the existing manifest.
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
    "wave": {"frames": 24, "fps": 12},
    "curious": {"frames": 24, "fps": 12},
    "nuzzle": {"frames": 24, "fps": 12},
    "stretch": {"frames": 24, "fps": 12},
    "look": {"frames": 36, "fps": 12},
    "shift": {"frames": 36, "fps": 12},
    "tail": {"frames": 36, "fps": 12},
    "sitDown": {"frames": 24, "fps": 12},
    "seated": {"frames": 36, "fps": 12},
    "lieDown": {"frames": 36, "fps": 12},
    "sleeping": {"frames": 36, "fps": 12},
    "rise": {"frames": 36, "fps": 12},
    "spin": {"frames": 48, "fps": 12},
}


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path)
    parser.add_argument("--frames", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--pack", action="store_true")
    parser.add_argument("--proof", action="store_true")
    parser.add_argument("--samples", type=int, default=12)
    parser.add_argument("--clips", nargs="+", choices=CLIPS, help="Render/pack only selected clips, preserving other existing atlases")
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    return parser.parse_args(argv)


def smooth(x):
    x = max(0, min(1, x))
    return x * x * (3 - 2 * x)


def render(args):
    import bpy
    from mathutils import Quaternion, Vector

    if not args.source:
        raise ValueError("--source must point to the existing .blend model")
    bpy.ops.wm.open_mainfile(filepath=str(args.source.resolve()), use_scripts=False)
    scene = bpy.context.scene
    model = bpy.data.objects["Mesh_0"]
    rig = bpy.data.objects["UniRigArmature"]
    rig.rotation_mode = "XYZ"
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
    neutral_rotation = rig.rotation_euler.copy()
    rest_rig_matrix = rig.matrix_world.copy()
    rest_floor = None

    def bone(name, x=0, y=0, z=0):
        rig.pose.bones[name].rotation_euler = (x, y, z)

    def bone_world(name, axis, angle):
        """Rotate around a known rest-space world axis without guessing bone roll.

        Existing UniRig limb bones have different local orientations. Converting
        the anatomical axis into each bone's rest coordinates keeps shoulder and
        forearm rotations mirrored correctly without modifying the rig itself.
        """
        item = rig.pose.bones[name]
        rest_rotation = (rest_rig_matrix @ item.bone.matrix_local).to_quaternion()
        local_axis = rest_rotation.inverted() @ Vector(axis)
        item.rotation_euler = Quaternion(local_axis, angle).to_euler("XYZ")

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
        rig.rotation_euler = neutral_rotation
        t = index / max(1, count - 1)
        beat = math.sin(math.pi * t) ** 2
        expression("Smile", .12)

        if clip in ("sitDown", "seated", "lieDown", "sleeping", "rise"):
            sitting = smooth(t) if clip == "sitDown" else 1.0
            lying = smooth(t) if clip == "lieDown" else 1.0 if clip == "sleeping" else 1 - smooth(t) if clip == "rise" else 0.0
            if clip == "rise":
                sitting = 1 - smooth(t)
            # Fold the original short hind legs forward into a seated pose.
            for upper, lower, foot in [("Bone_009", "Bone_008", "Bone_007"), ("Bone_014", "Bone_013", "Bone_012")]:
                bone_world(upper, (1, 0, 0), -1.35 * sitting)
                bone_world(lower, (1, 0, 0), 1.65 * sitting)
                bone_world(foot, (1, 0, 0), -.30 * sitting)
            # Lower the torso forward and turn slightly so the tucked body and
            # resting head read as lying down, rather than standing with shut eyes.
            bone_world("Bone_001", (1, 0, 0), .12 * lying)
            bone_world("Bone_029", (0, 1, 0), -.12 * lying)
            rig.rotation_euler.y = 1.35 * lying
            rig.rotation_euler.z = -.15 * lying
            centre = Vector((.094, -.052, .75))
            rig.location += centre - rig.rotation_euler.to_matrix() @ centre
            for upper, lower in [("Bone_023", "Bone_022"), ("Bone_027", "Bone_026")]:
                bone_world(upper, (1, 0, 0), -.40 * sitting - .55 * lying)
                bone_world(lower, (1, 0, 0), .55 * sitting + .50 * lying)
            bone_world("Bone_019", (0, 1 - lying, -2.44 * lying), .45 * sitting + .65 * lying)
            bone_world("Bone_018", (0, 0, 1), -.35 * lying)
            expression("Blink_L", .98 * lying)
            expression("Blink_R", .98 * lying)
            expression("Smile", .12 * (1 - lying))
            if clip in ("seated", "sleeping"):
                phase = index / count * math.tau
                breath = (1 - math.cos(phase)) / 2
                rig.scale.z *= 1 + .006 * breath
                if clip == "seated":
                    bone("Bone_029", y=.028 * math.sin(phase), z=.022 * math.sin(phase))
                    expression("Gaze_X", .16 * math.sin(phase))
                    blink = max(0, 1 - abs(index / count - .68) / .055)
                    expression("Blink_L", .85 * blink)
                    expression("Blink_R", .85 * blink)

        elif clip == "spin":
            angle = math.tau * smooth(t)
            rig.rotation_euler.z = angle
            # Turn around the body centre instead of orbiting the rig origin.
            centre = Vector((.094, -.052, 0))
            rig.location += centre - rig.rotation_euler.to_matrix() @ centre
            for name, phase in [("Bone_009", 0), ("Bone_014", math.pi)]:
                bone_world(name, (1, 0, 0), .15 * beat * math.sin(t * math.tau * 3 + phase))
            expression("Smile", .12 + .32 * beat)
            for i, name in enumerate(["Bone_019", "Bone_018", "Bone_017"]):
                bone(name, z=.07 * beat * math.sin(t * math.tau * 2 - i * .4))

        elif clip == "idle":
            phase = index / count * math.tau
            breath = (1 - math.cos(phase)) / 2
            rig.scale.z *= 1 + .003 * breath
            for i, name in enumerate(["Bone_034", "Bone_037", "Bone_046", "Bone_049", "Bone_052", "Bone_055"]):
                bone(name, z=.009 * math.sin(phase) * (-1 if i % 2 else 1))
            bone("Bone_043", z=.007 * math.sin(phase))

        elif clip in ("look", "shift", "tail"):
            # Finite, neutral-to-neutral idle details. Separate clocks avoid a
            # synchronized whole-body sway; eyes lead the head when exploring.
            rig.scale.z *= 1 + .006 * beat
            for i, name in enumerate(["Bone_034", "Bone_037", "Bone_046", "Bone_049", "Bone_052", "Bone_055"]):
                bone(name, z=.018 * beat * math.sin(t * math.tau * 1.3 - i * .65))
            if clip == "look":
                gaze = smooth(t / .18) - 2 * smooth((t - .38) / .18) + smooth((t - .78) / .22)
                head = smooth((t - .08) / .22) - 2 * smooth((t - .48) / .20) + smooth((t - .82) / .18)
                expression("Gaze_X", .65 * gaze)
                bone("Bone_029", y=.085 * head, z=.045 * head)
                bone("Bone_043", z=.025 * beat)
            elif clip == "shift":
                weight = beat * math.sin(t * math.tau)
                rig.location.x += .020 * weight
                bone("Bone_029", z=-.055 * weight)
                bone_world("Bone_009", (0, 1, 0), .065 * weight)
                bone_world("Bone_014", (0, 1, 0), .065 * weight)
                bone_world("Bone_023", (0, 1, 0), .055 * weight)
                bone_world("Bone_027", (0, 1, 0), .040 * weight)
                expression("Blink_L", .65 * max(0, 1 - abs(t - .52) / .065))
                expression("Blink_R", .65 * max(0, 1 - abs(t - .52) / .065))
            else:
                for i, name in enumerate(["Bone_019", "Bone_018", "Bone_017"]):
                    bone(name, z=.14 * beat * math.sin(t * math.tau * 1.5 - i * .5))
                bone("Bone_029", x=.025 * beat, z=-.035 * beat)
                expression("Smile", .12 + .13 * beat)

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

        elif clip == "wave":
            # Raise one original forearm into a recognisable hand greeting,
            # hold briefly with two wrist/elbow waves, then return to rest.
            raised = smooth(t / .24) * (1 - smooth((t - .76) / .24))
            flutter = math.sin((t - .24) * math.tau * 2.8) * raised
            bone_world("Bone_027", (0, 1, 0), -1.22 * raised)
            bone_world("Bone_026", (0, 1, 0), (-.30 + .20 * flutter) * raised)
            bone_world("Bone_025", (0, 1, 0), .16 * flutter)
            bone("Bone_029", y=-.035 * raised, z=-.075 * raised)
            expression("Smile", .12 + .43 * raised)
            expression("Gaze_Z", .12 * raised)
            for i, name in enumerate(["Bone_019", "Bone_018", "Bone_017"]):
                bone(name, z=.08 * raised * math.sin(t * math.tau * 2 - i * .4))

        elif clip == "curious":
            # A deliberate side-to-side look with a large, readable head tilt.
            look = math.sin(t * math.tau) * beat
            bone("Bone_029", x=.015 * beat, y=.16 * look, z=.18 * beat)
            bone("Bone_043", z=-.035 * beat)
            bone("Bone_042", z=.035 * beat)
            expression("Gaze_X", .72 * look)
            expression("Gaze_Z", .35 * beat)
            expression("Smile", .12 + .12 * beat)
            bone_world("Bone_023", (0, 1, 0), .12 * beat)
            bone_world("Bone_027", (0, 1, 0), -.12 * beat)

        elif clip == "nuzzle":
            # Lean the existing head into a gentle pet, smile/squint, and relax.
            lean = smooth(t / .30) * (1 - smooth((t - .70) / .30))
            rig.location.x += .025 * lean
            bone("Bone_029", x=.035 * lean, y=-.045 * lean, z=-.17 * lean)
            expression("Happy_Eyes", .78 * lean)
            expression("Smile", .12 + .52 * lean)
            bone_world("Bone_023", (0, 1, 0), -.12 * lean)
            bone_world("Bone_027", (0, 1, 0), .12 * lean)
            for i, name in enumerate(["Bone_019", "Bone_018", "Bone_017"]):
                bone(name, z=.075 * lean * math.sin(t * math.tau * 1.5 - i * .45))
            for i, name in enumerate(["Bone_034", "Bone_037", "Bone_046", "Bone_049", "Bone_052", "Bone_055"]):
                bone(name, z=.024 * lean * (-1 if i % 2 else 1))

        elif clip == "stretch":
            # Both arms open away from the body, feet shift outward a little,
            # the head tips upward, and every joint settles back to neutral.
            reach = smooth(t / .38) * (1 - smooth((t - .68) / .32))
            rig.location.z += .018 * reach
            bone_world("Bone_023", (0, 1, 0), 1.02 * reach)
            bone_world("Bone_027", (0, 1, 0), -1.02 * reach)
            bone_world("Bone_022", (0, 1, 0), .20 * reach)
            bone_world("Bone_026", (0, 1, 0), -.20 * reach)
            bone_world("Bone_009", (0, 1, 0), .15 * reach)
            bone_world("Bone_014", (0, 1, 0), -.15 * reach)
            bone("Bone_029", x=.085 * reach)
            expression("Happy_Eyes", .60 * reach)
            expression("Smile", .12 + .40 * reach)
            bone("Bone_043", z=.025 * reach)

        bpy.context.view_layer.update()
        # Keep every contact pose planted on the original floor after folding.
        if clip in ("sitDown", "seated", "lieDown", "sleeping", "rise", "spin"):
            evaluated = model.evaluated_get(bpy.context.evaluated_depsgraph_get())
            bottom = min((evaluated.matrix_world @ v.co).z for v in evaluated.data.vertices)
            rig.location.z += rest_floor - bottom
            bpy.context.view_layer.update()

    # Measure the neutral floor once without altering the source model.
    pose("idle", 0, CLIPS["idle"]["frames"])
    evaluated = model.evaluated_get(bpy.context.evaluated_depsgraph_get())
    rest_floor = min((evaluated.matrix_world @ v.co).z for v in evaluated.data.vertices)

    for clip, spec in CLIPS.items():
        if args.clips and clip not in args.clips:
            continue
        target = args.frames / clip
        target.mkdir(parents=True, exist_ok=True)
        count = spec["frames"]
        indices = [count - 1 if clip in ("sleep", "sitDown", "lieDown") else 0 if clip in ("seated", "sleeping", "rise") else count // 2] if args.proof else range(count)
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
    manifest_path = args.output / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if args.clips and manifest_path.exists() else {"tileSize": TILE_SIZE, "columns": COLUMNS, "clips": {}}
    if manifest.get("tileSize") != TILE_SIZE or manifest.get("columns") != COLUMNS:
        raise ValueError("Cannot merge atlases with a different tile size or column count")
    for clip, spec in CLIPS.items():
        if args.clips and clip not in args.clips:
            continue
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
    if not args.clips or "idle" in args.clips:
        poster = Image.open(args.frames / "idle" / "000.png").convert("RGBA")
        poster.save(args.output / "poster.webp", "WEBP", quality=95, method=6, exact=True)
        manifest["poster"] = "/sprites/companion-model-v1/poster.webp"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest))


if __name__ == "__main__":
    options = arguments()
    pack(options) if options.pack else render(options)
