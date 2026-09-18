# Future Self account sync — 18 September 2026

## Change

Authenticated GET/PUT /api/user/future-self stores one versioned journal per account. The existing /api/user rewrite is reused. Additive migration 009 is also safely ensured on authenticated journal access. No reward or trace tables are modified.

The request's expected owner header must match the authenticated session, including reads. This stops an old tab from writing its previous account's journal after another tab changes the session cookie. Server-side identity controls ownership; body fields cannot select another account.

The browser stores a versioned copy before sending. Failed requests retain unsynced changes. Focus/online events and an explicit retry refresh and merge. Reflections union by stable ID; immutable old entries cannot be silently removed or edited by a stale client. Plan conflicts show both choices. In-flight edits are retained after older responses.

Account-scoped v1 data migrates without removing its source. Guest data is imported only after the user presses the import button; an existing account plan stays selected. Guest source data is retained.

## Automated checks

`node server/tests/futureSelfSync.test.mjs` passes using a real in-memory SQLite repository and independent browser-storage simulations for two devices. Covers owner isolation, merge/conflict and both choices, conflict reload, offline reload/reconnect, lost PUT response, edits while a PUT is pending, legacy import, explicit guest import, wrong-owner response, storage failure, and untouched reward ledger.

Conversation persistence and loop chat guide suites pass as regression checks.

## Remaining verification boundary

Preview/build and production smoke are checked during release. A live signed-in two-device browser test has not been performed; account sync is exercised through the production store/repository code with simulated transport. No real personal data is used in tests.
