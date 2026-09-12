# Supabase setup

This checkout is linked to project `xcfcngpjmkdylemgalbb`. The browser uses the public project URL and publishable key through `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

From PowerShell in the repository directory, install Node.js 20 or newer, then run:

```powershell
npx supabase@latest login
npx supabase@latest link --project-ref xcfcngpjmkdylemgalbb
npx supabase@latest db push
```

The repository already contains `supabase/config.toml`, so do not run `supabase init` again in this checkout. If starting a new local checkout, run `npx supabase@latest init` once before linking.

The direct PostgreSQL connection string is a server credential. Keep it in a password manager or an untracked server-side environment variable. Never commit it, put it in `.env.example`, or expose it through a `VITE_` variable. Rotate it if it has been shared publicly.
