-- The standalone Supabase Postgres service used by CI does not load the
-- platform's auth helper functions. Define the small compatibility surface
-- that migrations and RLS policies use, without replacing platform helpers.
create schema if not exists auth;

do $$
begin
  if to_regprocedure('auth.jwt()') is null then
    execute $fn$
      create function auth.jwt()
      returns jsonb
      language sql
      stable
      as $body$
        select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
      $body$
    $fn$;
  end if;
  if to_regprocedure('auth.uid()') is null then
    execute $fn$
      create function auth.uid()
      returns uuid
      language sql
      stable
      as $body$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $body$
    $fn$;
  end if;
end
$$;

create extension if not exists pgtap;
