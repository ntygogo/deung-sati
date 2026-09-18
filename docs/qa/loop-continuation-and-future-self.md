# Saved-loop continuation and Future Self QA

Date: 2026-09-18. Synthetic inputs only. No evidence of clinical efficacy is claimed.

## Local checks

Six regression suites pass: conversationPersistence, loopChatGuide, loopChatBeginnerRegression, loopChatEmotionAgency, loopChatSourceMeaning, loopReviewContext.

The new persistence suite exercises a real in-memory SQLite database: owner-scoped read/write/delete, foreign trace rejection, retry deduplication, stale revision conflict, duplicate message validation, original transcript immutability after confirmation, continuation reward rejection, and deletion tombstones. Ledger is unchanged after history operations. PostgreSQL live-account persistence has not been exercised with a test account.

## Browser checks completed on preview

- New chat → partial summary → save draft → open saved-loop list: one draft.
- Read-only archive contains actual user and assistant messages in order.
- Resume that draft, then say the feeling is no longer the same: response acknowledges the change rather than asserting the old feeling.
- Reload the same preview (renewing official deployment access): source chat and later continuation are restored; summary reuses the same draft fields.
- Future Self: choose a concrete direction, edit/accept if–then plan, select smaller versus normal step, record “ยังไม่เห็นต่าง” with a note: exactly one visible journal entry with that outcome.
- Future Self: rest action preserves the chosen plan and journal count; no success, streak, or reward is manufactured.

Build note: the shared guide used Array.at in serverless compilation where the compiler library target differed. Replaced that single lookup with indexed access without changing semantics; regression suites rerun.

- Confirmed synthetic guest trace once: one loop, +15 XP, +10 Shells. The original transcript becomes read-only.
- Continue from the confirmed trace: a new linked conversation opens and the original transcript remains in the archive.
- Send “สรุปแล้วบันทึก” in that continuation: saves the conversation and does not open another growth confirmation.

- Delete both source/continuation transcript through the UI: old chat action is disabled and summary-only entry is offered. Fresh conversation explicitly says the old chat is unavailable.

- Future Self reload: the selected plan and the single reflection with its original note are restored.
- Latest preview (30d9280): “ยังไม่รู้ ขอคุยให้เห็นภาพก่อน” opens an independent chat; the live assistant invites the user to describe what is weighing on them without rushing to a plan.
- Preview layout inspected at the app's phone width. Final styling scopes the cream background above the shared screen style.
- Latest preview build is READY; the Array.at compiler diagnostic is absent.

Production smoke is performed after merging. Live signed-in account/cross-device persistence and real-user outcome evaluation remain outside this synthetic verification.
