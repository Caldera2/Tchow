# Tchow Database Schema

Migration: `20260910000200_normalize_tchow_database.sql`

The migration is designed to run after the existing prototype migration on an empty local database. It removes the prototype-only tables and recreates the normalized model. It is not a production data migration; review it before applying to any database containing real data.

## Data classification

| Classification | Tables/data | Access boundary |
| --- | --- | --- |
| Public | Published products, public categories/images, published box sizes/components/rules, active delivery zones/schedules, public business settings | `anon` and `authenticated` read policies; unpublished records remain private |
| Customer-owned | Profiles, addresses, saved boxes, orders, order items, checkout snapshots, status history | Authenticated owner policies; staff may read operational order records |
| Staff-only | Staff membership/permissions, staff notes, operational settings, enquiry records, admin updates, audit events | Active staff policies; manager-only operational settings |
| Server-only | Payment attempts, verified transactions, refunds, notification outbox, webhook receipts | No `anon` or `authenticated` grants; service-side jobs/functions only |

## Normalized areas

- Identity: `profiles`, `customer_addresses`, `staff_members`, `staff_permissions`.
- Catalogue: `categories`, `products`, `product_images`.
- Custom boxes: `box_sizes`, `box_components`, `box_pricing_rules`, `saved_box_configurations`, `saved_box_items`.
- Delivery: `delivery_zones`, `delivery_schedules`, `delivery_closures`.
- Orders: `orders`, `order_items`, `checkout_snapshots`, `order_status_history`.
- Payments: `payment_attempts`, `verified_transactions`, `refunds`.
- Enquiries: `contact_enquiries`, `catering_enquiries`, `partnership_applications`.
- Operations: `staff_notes`, `public_business_settings`, `operational_settings`, `notification_outbox`, `webhook_receipts`, `audit_events`.

## Historical integrity

- Order item names, unit prices, line totals, and custom-box components are copied into snapshots.
- Delivery address, fees, currency, discount, and total are stored on the order.
- Product deletion is restricted or set-null where appropriate; archival is represented by `products.status = 'archived'`.
- Checkout snapshots are protected by a database trigger that rejects update and delete operations.
- Customer-visible status history is separate from staff-only notes.
- Payment references, webhook event IDs, order numbers, and idempotency keys are unique.

## Fixture policy

`supabase/fixtures/catalogue-drafts.mjs` imports the existing 36-product catalogue, 8 categories, and 4 box sizes as `draft`/non-public records using legacy keys for idempotent upserts. It does not insert customers, orders, payments, applications, or sales.
