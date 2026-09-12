# Supabase setup

This repository is linked to the Tchow Supabase project by the public project
reference `nmxrxcmlsjqottedtqop`. The project URL and publishable browser key
are public configuration. Private keys and database credentials are never
committed.

## Local frontend

1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_PUBLISHABLE_KEY` to the project's `sb_publishable_...`
   key in your local environment or deployment provider.
3. Run `npm run dev`.

The client contains public project defaults so a Vite deployment remains usable
when a provider has not yet received its build variables. Set the two `VITE_`
variables in Vercel Project Settings for Production, Preview, and Development
to override those defaults, then redeploy. Vite embeds these values at build
time; changing them does not affect an already-built deployment.

Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` may be sent to the
browser. Never put `SUPABASE_SERVICE_ROLE_KEY`, a database URL, payment keys, or
webhook secrets in a `VITE_` variable.

## Supabase CLI

If PowerShell says that `supabase` is not recognized, the CLI is not installed
or is not on your PATH. The most reliable Windows setup is a project-local CLI,
which avoids a global PATH dependency. Supabase CLI commands run through npm
require Node.js 20 or newer:

```powershell
node --version
npm install --save-dev supabase
npx supabase --help
```

The repository already contains `supabase/config.toml`, so do not run
`supabase init` again in this checkout. After the install, authenticate and
link the project:

```powershell
npx supabase login
npx supabase link --project-ref nmxrxcmlsjqottedtqop
```

If you do not want to add the CLI to `package.json`, use the one-off form in
the same folder instead:

```powershell
npx supabase@latest login
npx supabase@latest link --project-ref nmxrxcmlsjqottedtqop
```

Run migrations only after reviewing the target project and taking the normal
database backup. CI applies the migrations from a clean Postgres service and
must remain green before production changes are made:

```powershell
npx supabase db push
```

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
