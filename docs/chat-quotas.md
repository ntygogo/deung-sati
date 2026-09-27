# Chat quota decision — 27 September 2026

Owner delegated the initial allowance decision: trial remains 14 days, with 15 successful AI responses per Bangkok calendar day; the 149 THB / 30-day pass allows 50 per day. Buying during trial raises the daily allowance to 50 total (not 50 additional). No automatic recurring charge.

The authenticated server reserves a request against the account, across devices. Only one request may run at a time. Successful responses count; provider errors and the static crisis response do not. Failed request retries require a new request ID. Pending requests expire after five minutes. A stale request cannot later complete its reservation. Provider calls time out after 45 seconds per candidate. Five seconds between attempts and at most three times the daily allowance in attempts prevent error-retry abuse; the latter is a separate attempt ceiling, not successful-message billing.

Latest user message: at most 4,000 JavaScript characters. Recent conversation context: at most 16,000 characters; older messages remain in the archive but are not all resent to the model. Exercise/loop/session context is limited to 8,000 serialized characters per field. Existing output token cap remains 2,048.

The notice displays remaining messages and gives a reminder when five or fewer remain. The purchase panel states both allowances and the Bangkok reset. Archive, notebook and non-AI activities are not subject to the message quota. No existing trial expiry is changed.

This change does not enable live Stripe payments or demonstrate profitability. Keep the existing live-mode gate until usage costs and the separate live implementation are reviewed. Live webhook, database mode isolation and production billing rollout remain separate launch work.

Validation: npm run build; npm run test:beta; npm run test:billing; npm run test:quota. CI also runs quota concurrency tests against an isolated PostgreSQL service via QUOTA_TEST_DATABASE_URL.
