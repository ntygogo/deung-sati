# Self-discovery and emotion practice — implementation v1

September 19, 2026. Builds on the current Dreamy Home branch. This change does not enable paid billing or claim psychometric validation.

## What users can do

- Open **รู้จักตัวฉัน / Get to know myself** from Home, the app drawer, or `/?view=discovery`.
- Use two 12-item questionnaires: self-boundaries and recent emotional-awareness behaviors. Both have Thai and English copy, four dimensions, answers from 0–3, explicit skips, and a 14-day frame.
- See a total out of 36 only with twelve scored answers, and each dimension out of 9 only with its three scored answers. Missing/unsure/no-opportunity answers are never zero. Interpretations link back to answers, handle tied scores, and can be rejected or corrected.
- Explore current emotions in four steps: observations/interpretations; multiple feelings plus optional body observations and intensity; user-selected possible needs and goal; editable summary.
- Choose from eight practices: capacity check, boundaries, small actions, kind self-talk, grounding, facts/interpretations, savoring a good moment, and naming emotions.
- Keep a practice as a plan, mark it not yet tried, or report trying it with a helpful/unchanged/harder outcome. Improvement is never required. A partial plan can be saved; marking a practice tried requires its main fields and an outcome.
- Save only by explicit confirmation. Browse, revise, delete, and download saved reflections. Unsaved assessment/emotion answers stay in memory when opening a related practice and returning.

## Product boundaries

These are original exploratory questionnaires, not validated diagnostic or personality instruments. Scores describe reported behavior frequencies; there are no clinical thresholds, percentile rankings, or labels about a person's worth. The total and four-dimension structure are design hypotheses requiring evidence. Thai and English are separately authored wording, not demonstrated measurement equivalents.

Intensity means emotional strength, including positive feelings. It is optional and starts as `null`, distinct from an explicit zero. The app does not infer causes, needs, risk, or an exercise from emotion or intensity. Users select their goals. Body attention is optional. Practices do not require breath holds, closing eyes, forced gratitude, or positive reinterpretation.

Results and all first exercises are available without account creation or payment. The existing subscription simulation is outside this change. The business proposal remains: establish immediate free value, then test willingness to pay for useful continuing practice; no new paid promises are introduced here.

These records never increment the egg's 20 confirmed loops, XP, shells, DNA, or reward ledger. Saving a questionnaire or practice is not equivalent to confirming an eight-field Loop Trace. Existing chat, Future Self, and companion rules continue separately.

## Persistence and ownership

`src/shared/discovery.ts` is the versioned discriminated data contract. The three record kinds are `assessment`, `emotion`, and `practice`. Store raw questionnaire answers; compute scores deterministically from `discoveryAssessments.ts`. Do not accept client-computed scores as canonical data.

Guests may use the entire feature without saving. An explicit guest save writes to `deung_sati_discovery_guest_v1` in this browser; copy warns about shared devices. Web Locks coordinate read/check/write operations across tabs. Browsers without that capability may still explore but cannot save locally; no unsafe silent fallback. Local storage failures preserve the form and do not claim success. Guest records are never automatically uploaded after login.

Signed-in data is stored only through authenticated `/api/user/discovery` endpoints. The owner header is checked against the authenticated session on every request. The UI remounts account-owned state on identity changes. New responses are private/no-store; this feature does not send answers to AI, analytics, or advertising endpoints.

API:

| Method | Path | Body | Result |
|---|---|---|---|
| GET | `/api/user/discovery` | — | `{ ownerId, records }` |
| POST | `/api/user/discovery` | `{ record }` | `{ ownerId, record }` |
| PUT | `/api/user/discovery/:id` | `{ record, revision }` | `{ ownerId, record }` |
| DELETE | `/api/user/discovery/:id` | `{ revision }` | `{ ownerId, deletedId }` |

IDs, record kind, creation time, locale, version, and assessment identity cannot be changed by a correction. Updates and deletions use optimistic revision checks. A lost response can be retried without duplication. A conflict preserves the local editor and offers explicit saving as a new reflection rather than silently overwriting another device.

The repository ensures `discovery_records` and its owner index on first use, following existing repository conventions. It supports SQLite and PostgreSQL adapters. There is a maximum of 1,000 active records per account; the endpoint returns all active records without silently truncating history. A deleted record erases its answer payload and keeps an ID/revision tombstone to reject delayed retries. Account deletion cascades through the table. User data export includes all discovery records; the feature also exposes its own saved-record JSON download.

## Delivery and known limits

The new screen is lazy-loaded. Existing authentication and production database provisioning are reused. No production database was modified during development. There is no notification scheduler, automated diagnosis, paid billing integration, cross-language score comparison, or automatic guest-to-account import in this slice.

The pause action preserves the discovery screen in memory and closing Pause returns to the draft. Explicitly leaving discovery can discard unsaved changes after confirmation. A page refresh does not persist unconfirmed text.

## Validation

Run `npm run test:discovery` and `npm run build`.

The scoring suite covers the 20/36 example (8/9, 6/9, 2/9, 4/9), all-zero and maximum scores, missing data, ties, edited answers, and bilingual catalog consistency. The persistence suite uses a fresh in-memory SQLite database and actual local HTTP calls to exercise authentication, CSRF, account switching, retries, concurrent edits and inserts, deletion replay, export, account purge, invalid payloads, capacity, and no loop/reward mutations.

Browser verification used Chromium against the actual Vite app and local SQLite API. It covered Thai/English entry without onboarding, the 20/36 worked result, incomplete scores, Pause and practice roundtrips with unsaved answers, explicit guest saves, positive/uncertain emotions with null versus zero intensity, partial planned practices, history reload/delete/download, and a real local account save through API and database followed by reload. Guest history remained separate after login. The screen was checked at 390px and 320px widths without horizontal overflow or JavaScript runtime errors.

After integrating the latest 3D Home changes, additional browser checks confirmed that stale edits retain the draft and can be saved as a new reflection, simultaneous guest saves from two tabs retain both records, and tried practices accept a harder outcome. The production build and both discovery test suites passed again on that integrated code.

PostgreSQL production execution still needs deployment-environment verification. Usability and measurement quality need user studies and expert review; automated software tests do not establish either.

Design reference: [ITC Guidelines on Test Use](https://www.intestcom.org/files/guideline_test_use.pdf). Source informs interpretation limits; ITC does not endorse these new questionnaires.
