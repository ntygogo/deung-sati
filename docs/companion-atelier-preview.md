# Companion atelier preview

This preview adds three coordinated art directions without writing to saved DNA:

| Collection | Face/body | Gills and fins | Markings | Lamp |
| --- | --- | --- | --- | --- |
| Lotus | Rose pink, warm pale belly | Lavender into pink tips | Curved five-petal motif | Rounded fluted flower bud |
| Moonpool | Mint, warm cream belly | Blue-green into lilac tips | Two winding water lines | Hanging luminous droplet |
| Starlight | Periwinkle, peach belly | Lilac into rose tips | Stars and pearl dust | Pearl globe |

The original head/body proportions and accepted sleep animations are retained.
This pass changes regional materials and lamp geometry; it does not claim three
new full-body meshes. Collection choice and lamp-only randomization are local UI
state. Restoring the saved companion discards all preview changes.

The lamp bulb is replaced with smooth geometry attached to Bone_038. Its local
+Y follows the measured stem-to-bulb axis (-0.19611631,-0.78446473,0.58834941),
not world vertical. The droplet is narrow at its stem and round at its free end.
A small collar covers the original bulb/stalk seam. The original bulb's skin
fragments are clipped only within the verified bulb region. The replacement
follows the original rig and breathes with its existing point light.

The portrait button captures the currently rendered 3D pose at 1200px viewport
width, immediately reads the rendered canvas, then restores its pixel ratio and
size. The card compositor trims transparent borders and exports a 1080x1350 PNG.
Download and mobile save are local; invoking the native share sheet requires a
separate explicit click. No sharing is automatic and no emotion/skill data is
included on the card.

Preview does not guarantee exclusive global appearances. Saved birth recipes,
reward logic, and production main are unchanged by this feature.

## Element studies
Six additional selectable previews use more saturated pastel palettes: earth,
water, wind, fire, leaf, and flower. Each adds real mesh forms to the lamp and
four verified gill-tip bones. These inherit the existing rig animation. This is
a first part-design study, not a replacement of the entire gill/tail meshes or
an implementation of cross-element breeding/reveal choreography. Lamp-only
randomization retains the element's gill adornments and swaps its lamp form.

## Element silhouette pass
Each element now has a distinct tail extension, three small dorsal accents on
separate spine joints, and jewelry-sized details on the antenna stalk. Curved
petal surfaces have root-to-tip vertex gradients, a subtle pearl finish, and
independent delayed flexion layered onto inherited tail movement. Earth uses a
faceted crystal fan; the others use wave, ribbon, flame, leaf, or peony forms.
These extend the original tail rather than replace the authored skinned mesh.
All additions are traversed by the existing GPU-resource cleanup.

Portrait capture now fits the current posed model bounds with a temporary camera
so side views retain the whole face and tail. The live view adds side-on viewing
space while preserving front-facing greeting framing and the accepted sleep rig.

## Gill and dorsal redesign
The previous small dorsal protrusions and gill-tip ornaments are removed for the
six elements. The dorsal is now a continuous skinned membrane with element-specific
wave, scallop, flame, leaf, or faceted edging. Broad flower petals, fern branches,
thin wind ribbons, water lobes, flame lobes, and angular earth plates create actual
new gill silhouettes. Both surfaces follow the existing skeleton with interpolated
weights, including sleep and rollover motions.

The source GLB shares gill and head topology. Old branching fronds are compressed
onto their nearest rig centerline outside a protected head envelope, retaining
closed roots rather than cutting holes. New membranes grow around these stems.
No rear-head cover or floating root caps are used. The approved tail fan geometry
and motion remain unchanged. The new fin skeleton is disposed on renderer cleanup.
