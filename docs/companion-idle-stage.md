# Companion idle stage — 27 September 2026

The canonical corrected-gill `CurrentCompanion` now plays four presentation-only idle gestures: cheek scratch (5.4 s), curious head tilt (5.8 s), approach/knock/selfie/retreat (10 s), and a swimming oval (11.6 s). The first gesture begins after 3.2 s. A shuffled bag then gives 8–15 seconds of quiet breathing between gestures, shows every gesture before reshuffling, and avoids adjacent repeats. Manually previewed gestures are removed from the remaining bag.

`src/shared/companionIdleMotion.ts` owns scheduling and the 0.55-second interruption fade. `AxolotlWaterPreview.tsx` applies poses to the existing bones and paw IK. The cheek target is on the side of the face within the short foreleg's reach. The glass gesture has two silent contact rings and follows the animated face with the camera. Narrow views get extra room during swimming. Animation pauses with the viewer and while the document is hidden; automatic gestures yield to petting, orbit dragging, explicit reactions, and rest. Reduced-motion preferences disable the spontaneous gestures. Existing sleep and wake behavior remains available.

`/companion-reference.html` provides the four gesture previews, pause/resume, and capture of the current camera view. `capture()` still defaults to a full-character image for existing callers; `capture('view')` preserves the selfie crop. An unavailable WebGL context reports an error instead of leaving the new stage's loading badge spinning.

This change does not modify the model asset, corrected topology/gill pipeline, profile image, saved DNA, accounts, XP, hatch state, or chat beta scope.

Validation: production build and whitespace checks passed. A scheduler simulation across 25 random seeds checked gesture coverage, quiet intervals, no adjacent repeats, interruption fade, and queued manual requests. The actual pose code was also exercised offline with its corrected rig, projecting skinned geometry through the actual camera to check narrow-screen framing and paw reach. A 320px-wide forward swim sweep stayed inside the frame after correction. These checks do not establish device frame rate or final shader appearance.

Cloud Browser could load the stage UI but could not create a WebGL context for either the known prior deployment or this version (`GL_RENDERER = Disabled`). Live rendered animation and physical-phone testing remain unverified; do not describe the offline geometry check as an on-device browser test.
