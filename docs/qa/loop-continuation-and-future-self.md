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

Pending at this checkpoint: final preview and production smoke checks, confirmed-loop continuation/no second reward browser flow, and deletion fallback.
