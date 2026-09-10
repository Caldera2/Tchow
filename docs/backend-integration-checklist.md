# Tchow Backend Integration Checklist

## Current repository facts

- Framework: React 18.3.1 with Vite 5.4.21, JavaScript/JSX, ES modules.
- Routing: custom `history.pushState` and `popstate` routing in `src/App.jsx`; `react-router-dom` is installed but is not the active router.
- Actual catalogue: 36 products in `src/data/menuData.js`; 8 categories; 4 box sizes.
- Persistence: localStorage is used for the cart, box progress, last order, catering enquiry, contact enquiry, partnership application, profile, customer preview, admin menu, and admin settings.
- Backend foundation: Supabase client, repositories, initial migration, and `create-order` Edge Function are present but not connected to a live project.

## Screen-to-contract map

| Screen | Reads | Actions | Required permission |
| --- | --- | --- | --- |
| Home, menu, product detail | Products, categories | Browse, add to cart | Public; only available products in production |
| Build your box | Box sizes, products, local draft | Select components, create cart item | Public draft; server revalidates on order |
| Cart | Cart draft | Change quantity, remove item | Public local draft |
| Checkout | Cart, delivery form | Create order, later initialize payment | Authenticated or explicitly supported guest flow; server validates all totals |
| Order confirmation | Created order | Display received-for-review state | Order owner or authorized guest token |
| Account overview/orders/profile | Profile, orders | Read orders, update profile | Authenticated owner; admins only for operations views |
| Catering | Local form draft | Submit enquiry | Public insert; admin read/update |
| Contact | Local form draft, WhatsApp config | Submit enquiry | Public insert |
| Partnership application | Local form draft | Submit application | Public insert; admin read/update |
| FAQ, terms, privacy, 404 | Static content | Navigate/search/anchor | Public |
| Admin overview/orders/menu/catering/investors/settings | Operational records/configuration | Read/update/export preview | Authenticated admin role enforced by RLS and server |

## Authentication gaps

- Account screens still use preview localStorage and need Supabase Auth session state.
- No sign-in, sign-up, password reset, email verification, session loading, expired-session, or sign-out UI is connected.
- Order retrieval needs an ownership-safe query and a guest-order access decision.
- Admin route visibility is not authorization. Admin policies and server checks must remain authoritative.

## Production data boundary

- `src/data/fixtures.js` and `src/data/mockData.js` are development fixtures only.
- Live repositories must throw a configuration error when Supabase is unavailable; production must not fall back to fixtures.
- localStorage may retain only cart drafts and non-sensitive UI preferences. Customer, order, enquiry, and profile records must move to Supabase before launch.

## Unconfirmed business rules

- Product prices, preparation times, availability, and product composition are mock catalogue values.
- Box prices and compositions are currently represented by four fixture entries: Mini, Regular, Premium, and Mega. The displayed chop/drink/parfait counts are not yet an approved fulfilment rule.
- Delivery fee is currently a fixture value of ₦1,500 in the order function. Delivery zones, distance pricing, service areas, cut-off times, and dispatch SLAs are unconfirmed.
- Contact phone, email addresses, operating hours, and WhatsApp number are placeholders/configurable values. Existing screens contain inconsistent hours and must be confirmed by the business owner.
- Currency is initially constrained to NGN, but tax, discounts, refunds, minimum order values, and delivery-fee rules are not confirmed.
- Catering quote, cancellation, dietary-allergen, and fulfilment policies are not confirmed.
- Partnership applications are interest records only. No deposits, investment acceptance, guaranteed returns, wallets, or payouts are in scope.
