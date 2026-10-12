# LINE chat channel — implementation and rollout

LINE is a standalone text chat product using the existing Deung Sati provider and conversation rules. It does not register web users, grant web access, create companions, award XP or claim to synchronize accounts. The web companion remains Coming soon. Account linking and permanent journals are separate future work; LINE currently retains only bounded recent conversation context.

## Proposed pilot terms (checkout disabled by default)

- Free: five rounds per Bangkok calendar month; at most ten successful user/AI exchanges per round. A 30-minute gap, ten messages, month change or explicit new topic starts another round. Menus, consent, errors and crisis replies do not spend allowance.
- Paid draft: 99 THB for 30 days, 50 successful replies per Bangkok day. One-time PromptPay; customers actively renew. This is not unlimited or automatic billing. Prices and caps live in `server/services/lineConfig.ts`; review these before enabling public paid access.
- LINE purchases are independent of the existing 149 THB web pass. No automatic bundling is implemented.
- Menu: มีเรื่องอยากเล่า / เช็กใจวันนี้ / เขียนบันทึก / สิทธิ์ของฉัน. Users can type สมัครสมาชิก, เริ่มเรื่องใหม่, ลบประวัติ or เปิดเว็บ. Writing is conversational, not a permanent notebook.

## Configuration

Add secrets directly to the matching Vercel environment, never Git or chat:

| Variable | Purpose |
| --- | --- |
| LINE_CHANNEL_SECRET | Verify HMAC-SHA256 over the raw incoming body |
| LINE_CHANNEL_ACCESS_TOKEN | Reply through Messaging API |
| LINE_BOT_USER_ID | Optional strict match for webhook destination |
| LINE_ENABLED | `true` enables the handler only after credentials are present |
| LINE_TEST_USER_IDS | Comma-separated pilot LINE user IDs from the intended Messaging API provider |
| LINE_PUBLIC_ENABLED | Keep absent/false for pilot; true opens chat beyond the allowlist |
| LINE_BILLING_ENABLED | Keep absent/false until payment end-to-end verification and commercial terms are approved |

Reuse `GEMINI_API_KEY` / `AI_MODEL`, the database adapter, and Stripe configuration `BILLING_MODE`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BILLING_APP_ORIGIN`. Test mode checkout additionally requires a LINE test user even if public chat is enabled. Preview should have an isolated PostgreSQL database, test Stripe keys and its own matching webhook secret; do not test payment flows against production.

Webhook path: `/api/line/webhook`. For production after release: `https://deung-sati.vercel.app/api/line/webhook`.
Existing Stripe path: `/api/billing/webhook`; the verified dispatcher also reconciles LINE orders. Existing subscribed checkout and refund event types are sufficient. The payment return page never grants access; signed webhooks plus authoritative Stripe retrieval verify mode, order, session, amount, currency and payment intent. Replays preserve the original entitlement dates; full successful refunds revoke that pass. Pending and failed refunds do not revoke access.

In LINE OA Manager enable Messaging API for the existing account linked by `https://lin.ee/TKjFZTm`. In LINE Developers configure the deployed webhook, Verify, enable webhooks and redelivery. Review existing auto-responses/greetings before disabling duplicates; do not disturb existing human support workflows. LINE is one-to-one only: groups/rooms, files, images and voice do not invoke AI. No broadcast, proactive reminders or push messages are implemented.

## Reliability and privacy

Raw-body signature validation happens before JSON parsing or database access. Each sender has a database lock plus fenced 90-second generation lease. Event receipts make repeated delivery reuse the prepared answer without another AI call or quota charge. All outbound replies finish before HTTP acknowledgement; failed delivery returns 503 for LINE redelivery. LINE gets one 30-second provider attempt and an 8-second reply timeout, without changing the web fallback chain. Provider failure sends a retry message without charging a successful reply.

Exactly-once *visible delivery* is not guaranteed: if LINE accepts a reply but the acknowledgement is lost, the reply token may already be consumed on retry. The event still prevents a second AI generation or allowance charge. No automatic push fallback is used. Old events over 24 hours are ignored. Receipt tombstones are retained to prevent deleted content from being restored on replay.

Consent precedes normal AI processing. Context is at most 12 recent messages and 16,000 characters; input is capped at 4,000 characters. A confirmed delete clears server conversation and guide context, revokes chat consent and clears cached response contents while preserving quota, financial records and content-free event receipts. LINE's own message history is outside this database. Unsend clears recent server context and fences active writers. AI analytics store counts/model/outcome only, separately from web analytics.

## Validation and remaining release checks

`npm run build`, `npm run test:line`, `npm run test:billing`, `npm run test:quota`.
CI also runs LINE tests against isolated PostgreSQL, including simultaneous duplicate delivery. Local provider and payment tests use stubs and do not prove live delivery or a real payment.

Before public launch: configure a pilot account/channel, run LINE Verify, send real test messages (consent, menu, continuation, quota), test duplicate/redelivery and unsend, use Stripe test-mode PromptPay checkout and refund, verify LINE-only entitlement and unchanged web access, and review cost counts against provider invoices. Then set the agreed commercial terms and enable production deliberately. Current draft does not change production settings or connect the OA automatically.
