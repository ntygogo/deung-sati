# Companion first draft — 2026-09-26

The home, companion room, and shared companion renderer now use the approved
textured, skinned axolotl GLB. There is no sprite fallback. The egg contains the
same real 3D rig in a curled pose, with folded legs, delayed gill movement,
breathing, intermittent wriggling, and a short response to tapping.

The egg shell is a translucent CSS layer around the 3D viewport. This draft
reuses the approved topology; it is not a separately sculpted Blender embryo.
Growth within the egg follows the existing 0–20 completed-loop count. Preview
queries do not change the saved stage or award growth. Reward logic is unchanged.

## Appearance and identity

All integrated views use the same companion source and existing birth snapshot
resolver. The current rig supports body palette tint, lamp color, and subtle
seeded spots/ripple markings. Catalog traits such as alternate gill topology,
tail shapes, and accessories still need dedicated geometry/material assets.
Some pattern catalog entries currently share the same spot implementation.

**Global visual uniqueness is not guaranteed.** The appearance hash is a display
fingerprint, not a globally unique identifier. Distinct companion IDs or seeds
can produce the same or visually similar result. Guests are local-only and do
not participate in a global allocation registry.

Before promising exclusive appearances, implement a versioned signature of the
traits actually rendered, atomically reserve it under a database UNIQUE
constraint, retry collisions, and persist the chosen recipe in the immutable
birth snapshot. Keep existing companions stable and define finite-capacity
exhaustion and guest migration behavior. This guarantees distinct registered
recipes within that catalog's capacity; perceptual similarity still needs art
direction and sufficiently different geometry, colors, and markings.

## Review paths

- `?previewEgg=1`: view the egg without changing saved progress.
- `?previewAxolotl=1`: inspect the accepted adult interactions.
- Normal home: egg or hatched companion follows the saved stage.

The rejected alternating glass taps are not reintroduced. Keep the previously
accepted greeting. Actual iOS/Android GPU and touch testing remains necessary;
desktop Chromium mobile viewport tests are not physical-device verification.
