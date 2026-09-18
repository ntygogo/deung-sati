# Live chat QA: beginners and emotion awareness

Date: 2026-09-18. These are fictional users roleplayed by one tester against the real deployed chat UI and live AI responses. They are not human participants, clinical outcomes, or evidence about prevalence in the population.

## Method and scope

- Initial beginner baseline: 10 scenarios, 98 user turns on production commit `788c4e7173478c3b9a2f27e8f80f84f93c0d9343`.
- First beginner retest: 10 scenarios, 81 user turns on preview `36baa53b9feb5fe15366a1970044660882e0f0af`.
- Added emotion-awareness baseline: 20 scenarios, six user turns each (120 total), on preview `0c0b19892b4ef6811932906bd2efc0ad90daa211`.
- Replies were adapted to actual AI responses. The simulated user could disagree, remain unsure, reject a proposed word, or stop in frustration.
- The 20-case extension focused on recognizing feelings, respecting uncertainty and corrections, and stopping. It was not a full eight-field completion trial for every case.
- Review forms were opened separately to inspect all eight visible fields. No trace was saved or confirmed and no rewards were claimed.
- Exact transcripts and visible review values are in the JSON files beside this report. Inspection commands are excluded from user-turn counts.

## What the original ten conversations showed

A visible 8/8 count is insufficient to establish a useful conversation. Only four of ten initial conversations reached it, and two of those had an incorrect thought field.

| Case | Scenario | Initial ending / friction |
| --- | --- | --- |
| 1 | Boss requests revisions | 8/8, but vague choices and repeated action question |
| 2 | Partner reads without replying | Simulated dropout after missed consent and repeated invitations |
| 3 | Mother requests errands | 8/8; natural consent missed and action repeated |
| 4 | Low exam score | 5/8; repeated skip request not honored |
| 5 | Money almost gone | 8/8; bodily sensation incorrectly stored as thought |
| 6 | Comparison with friends | 7/8; meaningful reflection ignored |
| 7 | Interrupted at work | Useful boundary/action discussion, but guide did not recognize natural consent |
| 8 | Too exhausted to reflect | Chose quiet company; early response sent user away prematurely |
| 9 | Friends did not invite user | Simulated dropout after repeated invitation |
| 10 | Procrastination | 8/8; act of self-criticism stored instead of thought content |

The first retest reached 8/8 in six scenarios (1, 3, 5, 6, 9, 10). All six review forms were inspected. This is not a clean six-pass result: case 10 still quoted part of a clarification question as a choice, and several conversations remained too abstract. Cases 2 and 7 stopped in frustration, case 4 still struggled with skipping, and case 8 chose quiet company. No unsolicited exercise card appeared in any of the ten opening replies, compared with eight initial openings; some text still suggested a tool or pause prematurely.

## Twenty emotion-awareness cases: observed before the final fixes

"Progress" below means a useful user-authored observation or request during a scripted simulation. It does not mean that a real person's distress improved.

| Case | Difficulty | What happened | Material limitation |
| --- | --- | --- | --- |
| 1 | Cannot name discomfort | Used "อึดอัด" and distinguished a revision request from self-judgment | AI invented a sudden meeting at first; continued prompting after a partial conclusion |
| 2 | Only notices a tight stomach | Connected tension to expecting criticism; reached 8/8 | Initially suggested putting the phone down without being asked |
| 3 | Notices only slamming a door | Identified not wanting to be rushed; remained uncertain about "อึดอัด" | Consent with a qualification was missed; earlier tentative emotion remained in review |
| 4 | Feels empty after a breakup | Tried to understand not crying | Asked to prove not being heartless; simulated user stopped |
| 5 | Cannot distinguish annoyance and fatigue | Identified wanting uninterrupted rest; reached 8/8 | AI invented a heavy workload at first; review retained an uncertain interpretation |
| 6 | Calls self worthless instead of naming a feeling | Identified self-critical thoughts and requested listening | Listening request was overridden by another choice question |
| 7 | Very short, vague replies | "ตื้อ ๆ" was sufficient to continue | Body questions came first; later advice continued after a partial observation |
| 8 | Says "normal" but withdraws | Identified wanting personal space and stopped | AI assumed depleted energy and asked about the body initially |
| 9 | Happy for a friend and unsettled | Identified both happiness and wanting personal progress | Explicit "วันนี้ขอพักก่อน" was missed |
| 10 | Afraid to choose the wrong emotion word | Describing the meeting led to user-chosen "กลัวพูดผิด" | Initial body-based alternatives also confused the user |
| 11 | Rejects anger label | Used "รำคาญ", wanted space to finish speaking, chose a boundary | Qualified consent missed; excessive praise |
| 12 | Rejects envy label | Used "ข้องใจ", wanted clear promotion criteria | Invitation repeated after a useful conclusion |
| 13 | Rejects jealousy label | Wanted a conversation about relationship boundaries instead of phone checking | Review incorrectly counted "ไม่ได้หึง" as an emotion observation |
| 14 | Says birthday omission is "fine" | Chose tentative "น้อยใจนิดนึงมั้ง" | Initial "ปากบอก...แต่ใจ..." framing; later stop request missed |
| 15 | Ashamed to feel hurt | Preferred "เจ็บ ๆ กับอาย" | Direct question about weakness was first replaced by a navigation menu; causal claims too strong |
| 16 | Rejects fear and body checking | Used "หงุดหงิด", wanted respectful interviewing | Body question initially; not-ready/skip request still followed by choices |
| 17 | Declines body exercises and emotion labels | Identified wanting father to listen; stopped | Some unnecessary follow-up questions, but no forced body exercise |
| 18 | Feels relief rather than expected sadness | Relief respected; reached 8/8 | Review included others' expectations in thought field; early next-step pressure |
| 19 | Wants practical help without labels | Received and refined a usable sentence for the boss | Navigation menu interrupted practical request and later goodbye |
| 20 | Changes, then withdraws a label | Review correctly ended with "จุก" | Initial response assumed anger had existed and faded; qualified consent missed |

## Product decisions from the tests

1. Success is increased understanding in the user's own words, a useful next step, or an informed choice to pause. Completing eight fields is optional.
2. Disagreeing with an AI label is not evidence of denial. The user can reject or revise a word, keep it tentative, or leave the emotion unnamed.
3. Help should start with one concrete moment and optional everyday descriptions. Body attention requires its own consent.
4. Answer direct questions before offering navigation. A request for a usable sentence should receive a sentence, not just a promise of examples.
5. Preserve negation, uncertainty and corrections in the stored review, not merely the conversational reply.
6. Do not ask the user to prove their feelings wrong or prove that another person cares. Observable events and unknown intentions can remain separate.

## Changes and regression coverage

- Broader consent with qualifications; listen, skip and pause phrases recognized within ordinary messages.
- Not-ready action skip does not immediately produce another action question.
- Direct questions defer automatic navigation invitations.
- Generic facts question no longer asks for evidence against the user's interpretation or moral character.
- Reflection asks what changed in understanding during chat, not an assumed completed action or an additional task.
- Emotion corrections establish a new source boundary so withdrawn earlier labels cannot be re-extracted on later turns.
- Emotion extraction rejects negated words, uncertain isolated labels, and another person's feelings; accepts everyday descriptions and full tentative quotes.
- Master instructions explicitly give the user authority over their emotion description and remove rigid turn-by-turn progression.
- Four local suites verify existing guide behavior, beginner regressions, emotion authority, and preservation of review context. Full deployment build and targeted live retest are recorded below.

## Remaining limits

The model can still overstate causes, overpraise, ask abstract questions, or misclassify a quote in a non-emotion field. Quote grounding is necessary but does not guarantee semantic correctness. The deterministic guards cover observed patterns, not all Thai wording. These simulations cannot establish clinical efficacy or the proportion of real users with these difficulties.

## Final targeted verification

- Preview `57c197f9de0cbcf358f97ab48ea0e8ab10673835`: eight targeted conversations, 31 user turns, eight review forms inspected. Direct questions received answers without navigation menus; qualified consent worked; withdrawn "น้อยใจ" remained "จุก" in the review after later turns; stop requests with thanks ended without another question. This retest also found a regression: rejecting "โกรธ/หึง" erased the already accepted "รำคาญ/ค้างคา", and preferred wording inside a consent message was excluded.
- Release candidate `c91456f597df75df215d6c94f258d8357cb0a6ed`: four focused conversations, 20 user turns, four review forms inspected. "รำคาญ" survived rejection of "โกรธ"; "ค้างคา" survived rejection of "หึง"; "เจ็บ ๆ กับอาย" replaced an earlier description even when chosen in a consent message; "ตื้อ ๆ" remained valid without naming another emotion. Embedded requests to listen returned to listening without questions. Not-ready choice skips led to optional reflection, not another action demand. Two cases ended at a 5/8 draft review with needs/options/action genuinely unfilled.
- All four local regression suites passed. Both previews completed the full Vercel TypeScript/build pipeline and were READY.
- Final verification is targeted, not a claim that all 20 baseline conversations were repeated against the release candidate. First-turn phrasing can still overstate a feeling or suggest a body question too soon; this release does not certify all model-generated wording as correct.
- Evidence: `emotion-awareness-targeted-retest.json` and `emotion-awareness-release-verification.json`. Combined with the initial ten-case work, 350 simulated user turns were recorded. Counts exclude separate summary-inspection commands.

