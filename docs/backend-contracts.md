# Tchow Backend Contracts

All monetary request and response fields use integer kobo. Timestamps are UTC ISO 8601 values and are displayed in `Africa/Lagos` by the client.

## Client services

- `src/lib/supabase.js`: creates a browser client only from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- `src/services/auth.js`: Auth sign-up, password sign-in, sign-out, current-user lookup, and session subscription.
- `src/services/repositories.js`: paginated products, profiles, orders, catering inserts, and partnership inserts.
- `src/services/api.js`: normalized Edge Function invocation and paginated table helpers.
- `src/services/contracts.js`: shared JavaScript validation and normalized API error shape.

## Auth

Use Supabase Auth methods rather than custom credentials or session storage:

- `signUp(email, password, fullName)`
- `signIn(email, password)`
- `signOut()`
- `getCurrentUser()`
- `onAuthStateChange(callback)`
- `getAuthenticatorAssuranceLevel()` and the staff step-up gate use Supabase MFA assurance; when a verified TOTP factor exists and the session is `aal1`, staff must complete a challenge before privileged screens render.

## Products

`productsRepository.list({ page, pageSize, category })` returns `{ data, count }`. Public reads must expose only available products. Admin reads require the admin role.

## Orders

`POST /functions/v1/create-order`

Request:

```json
{
  "idempotencyKey": "client-generated-unique-key",
  "customer": {
    "name": "Customer name",
    "email": "customer@example.com",
    "phone": "+234...",
    "address": "Delivery address",
    "area": "Area",
    "city": "Lagos",
    "state": "Lagos",
    "instructions": "Optional"
  },
  "items": [{ "productId": "product-id", "quantity": 2, "notes": "Optional" }]
}
```

The function loads prices and availability from `products`, calculates `subtotal_kobo`, applies the approved delivery policy, writes an order and item snapshots, and returns the existing order for a repeated idempotency key. Browser totals are advisory only.

Response:

```json
{ "order": { "id": "uuid", "order_number": "TC-...", "status": "received_for_review", "payment_status": "pending", "subtotal_kobo": 0, "delivery_fee_kobo": 0, "total_kobo": 0 }, "duplicate": false }
```

Errors use `{ "error": { "code": "stable_code", "message": "safe message" } }` with 400/409/422/500/503 status classes.

## Enquiries and profile

- `POST public.catering_enquiries`: validated public enquiry; admin-only reads and updates.
- `POST public.partnership_applications`: validated public interest record; admin-only reads and updates.
- `GET/PATCH public.profiles`: authenticated owner only.
- `GET public.orders` and `GET public.order_items`: authenticated owner or admin only.

## Admin

Admin operations use authenticated Supabase sessions plus `profiles.role = 'admin'`. UI route guards are convenience only. RLS policies and Edge Functions are authoritative.
Staff membership is queried from `staff_members` on session changes; disabled staff are denied even when an old session remains. Privileged Edge Functions must independently verify the caller, active staff record, required permission, and `aal2` where required.

## Payment boundary

Paystack initialization and verification must be server-side and must use the verified order total. The browser must never receive the Paystack secret or be allowed to mark `payment_status` as paid. Webhooks must be signature-verified, idempotent, and reconcile the order before fulfilment.
