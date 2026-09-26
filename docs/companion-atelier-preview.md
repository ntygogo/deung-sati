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

The source GLB shares gill and head topology. The initial stem-compression pass
left stretched connecting faces, so it has been replaced with topology-aware
clipping. Only projecting gill tissue is removed; intersection vertices preserve
UVs and normalized skin weights. Actual cut boundary loops are triangulated and
closed in the same geometry, with a root material color rather than stretched
source texture. Two tiny authored root seams are joined only within 0.025 model
units. All nine cut loops close; a partial cut is rejected rather than rendered.
A regression test loads the actual GLB, validates closure and normalized weights,
and verifies that front-face vertices are unchanged. No rear-head cover or
floating root caps are used. The approved tail fan geometry and motion remain
unchanged. The new fin skeleton is disposed on renderer cleanup.

## Six-gill anatomy correction
Every element has three separate gill fans per side: upper, middle, and lower.
The four source bone chains are not the anatomical count. Each middle fan is
positioned between its upper/lower neighbors and blends their interpolated bone
weights (up to four influences), retaining continuous motion without a rigid
attachment. Upper and lower tips are slightly fanned apart; middle fans extend
outward so the three tiers read separately. Tail and dorsal designs are unchanged.

## Collectible remix atelier

- Twelve coordinated saturated palettes, each defining body, face, belly, cheeks, markings, fin roots/tips and lamp light. Palettes travel as complete recipes across silhouettes.
- Independent six-element gill, dorsal, tail and lamp selection; original six-gill anatomy and the corrected right upper silhouette remain shared across combinations.
- Full-look randomization also chooses among four existing body patterns and a pattern seed. Color-only preserves shapes/patterns; parts-only preserves the selected color recipe. Explicit palette swatches, lamp-only selection and reset remain available.
- All remix state is preview-only. It does not overwrite the companion birth snapshot or establish a uniqueness guarantee. Current selectable shape/color/pattern recipes allow 12 × 6^4 × 4 = 62,208 combinations before pattern-seed variation; this is a combination count, not a rarity claim.
- Volumetric pearl spots avoid stretched side stripes; markings fade off fin surfaces. Exported portrait uses the active palette name and live rendered mixed geometry.
- Verified: production build; eight relevant tests including deterministic remix isolation; all 12 palettes in mobile-sized Chromium with local fixture API responses, mixed-part controls, portrait downloads, animation and no WebGL/page errors. Not physical-device validation.
