# Paystack Webhook Operations

The `paystack-webhook` Edge Function is an external provider endpoint. Supabase JWT verification is disabled for this function in `supabase/config.toml`; this does not make the endpoint trusted. Every request must still pass the Paystack HMAC signature check over the untouched request body, and the function remains test-mode-only until explicitly enabled.

Set the following server-side variables before deployment:

- `PAYSTACK_SECRET_KEY`, using an `sk_test_` key.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- `PAYMENTS_ENABLED=true` only in the approved test environment.

The webhook stores the receipt before applying payment state. Claims use a five-minute lease and bounded attempts. A worker crash leaves the receipt in `processing`, but the next claim after lease expiry can retry it. Application is idempotent, so a crash after payment application but before receipt completion converges safely on the existing verified transaction.

Run a scheduled worker or reconciliation job frequently enough to retry receipts whose `next_attempt_at` is due. Inspect receipts at `processing_attempts >= max_processing_attempts` and resolve them manually; failed receipts must not be marked processed without a successful payment application result.
