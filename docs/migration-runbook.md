# Tchow Migration Runbook

## Clean install

The legacy prototype migration `20260910000100_initial_tchow_schema.sql` is intentionally inert. Apply migrations in filename order starting with `20260910000200_normalize_tchow_database.sql`. This creates the normalized schema without dropping business records.

Run locally with Supabase CLI after Docker is available:

```sh
supabase start
supabase db reset
supabase db lint
```

`db reset` is disposable only. Never point it at production.

## Existing database upgrade

The repository has no recorded deployment ledger or connection to confirm whether the legacy prototype migration was applied. Do not run the clean-install sequence against an existing database. First inventory tables, columns, enum values, row counts, policies, and migration history; take a verified backup; then write a reviewed forward migration with explicit backfills and validation. Never use old destructive statements as an upgrade.

Existing legacy records require a separately approved mapping because the old schema uses text product IDs, free-text delivery fields, and different order/profile columns.

## Server-only functions

Privileged functions revoke browser execution by default. Edge Functions use the service role only after authenticating and authorizing the caller.
