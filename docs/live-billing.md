# Live billing rollout

149 THB / 30 days, one-time PromptPay; no automatic renewal. Existing quotas remain 15 trial / 50 paid; the proposed change to the free allowance is deferred.

Production configuration: BILLING_MODE=live; BILLING_APP_ORIGIN=https://deung-sati.vercel.app; STRIPE_SECRET_KEY=live secret or restricted key; STRIPE_WEBHOOK_SECRET=signing secret for the production endpoint. Missing configuration keeps checkout disabled. Never place credentials in Git or chat. Required Stripe API capabilities: create/read Checkout Sessions, read Payment Intents and list Refunds.

Webhook: POST https://deung-sati.vercel.app/api/billing/webhook. Subscribe to checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired, charge.refunded, refund.created, refund.updated, refund.failed.

Live orders and event receipts use separate additive billing_orders_live/billing_events_live tables. Test records cannot grant production access. Signed events must match the configured mode; provider retrieval verifies amount, currency, session, owner and intent before fulfillment. Duplicate events do not add days twice. Only succeeded refunds count toward revoked access; pending or failed refunds do not revoke it. Full refunds revoke only the original pass, without moving another pass across a gap.

Validation uses signed fixtures and provider stubs on SQLite and PostgreSQL. These tests are not proof of an actual live transfer. Final launch checks: production checkout opens with 149 THB / 30-day terms; signed webhook deliveries succeed; owner completes one real payment and confirms access, then exercises the real refund flow. Real payment/refund actions require the owner. Reconcile receipts, Stripe fees, payouts and AI costs with actual provider statements.

The main branch's latest companion renderer, mobile controls and prompt protections are retained. Production should remain disabled until the real webhook signing secret is saved and a fresh deployment has loaded it.
