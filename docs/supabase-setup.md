# Supabase setup

This repository is linked to the Tchow Supabase project by the public project
reference `nmxrxcmlsjqottedtqop`. The project URL is public configuration; keys
and database credentials are not committed.

## Local frontend

1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_PUBLISHABLE_KEY` to the project's `sb_publishable_...`
   key in your local environment or deployment provider.
3. Run `npm run dev`.

Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` may be sent to the
browser. Never put `SUPABASE_SERVICE_ROLE_KEY`, a database URL, payment keys, or
webhook secrets in a `VITE_` variable.

## Supabase CLI

The repository already contains `supabase/config.toml`, so `supabase init` is
needed only when starting from a new checkout without that directory:

```bash
supabase login
supabase link --project-ref nmxrxcmlsjqottedtqop
```

Run migrations only after reviewing the target project and taking the normal
database backup. CI applies the migrations from a clean Postgres service and
must remain green before production changes are made.

## Server-side configuration

Configure Edge Function secrets in Supabase's project secret store or the
deployment provider. At minimum, server-side functions use `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_APP_URL`, and `FRONTEND_ORIGINS`; payment,
email, webhook, and worker secrets are configured only when those features are
enabled.

Do not commit a direct PostgreSQL connection string. If a database URL is ever
needed for a local tool, keep it outside Git and URL-encode reserved password
characters such as `@`, `:`, `/`, `?`, `#`, and `[`. The database password
included in the setup message should be rotated before using the project again,
because it has been shared in a chat message.
