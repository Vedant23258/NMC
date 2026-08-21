# Supabase backend setup

This turns the app from mock data into a real, persistent backend. Do this
once per environment (once for the pilot is enough for now).

## 1. Create the project

In the Supabase dashboard: **New project** → name it, set a database
password (save it in a password manager — you won't need to give it to
Claude, but you'll need it later for direct database access), pick the
region closest to India, Free tier is fine.

## 2. Run the schema

Dashboard → **SQL Editor** → **New query** → paste the entire contents of
`supabase/schema.sql` → **Run**. This creates all 21 tables, the
`app_role` enum, and every Row Level Security policy. Safe to re-run.

## 3. Load the starting data

Same place → new query → paste `supabase/seed.sql` → **Run**. This loads
the wards, vehicles, complaints, etc. that the app currently ships as mock
data, so the pilot doesn't start from an empty database.

## 4. Invite your pilot users

Dashboard → **Authentication** → **Users** → **Invite user**, once per
person (Commissioner, Additional Commissioner, each Sanitary Inspector,
etc.). They'll get an email to set their password.

A profile row is created automatically the moment each account is
created (via the `handle_new_auth_user` trigger in `schema.sql`), but it
starts with a placeholder role. Set the real one:

```sql
update profiles
set role = 'ccc_operator',       -- one of the 8 roles in domain.ts
    name = 'Their Name',
    title = 'CCC Operator',
    ward_scope = array['ward-16']  -- or array['all'] for city-wide roles
where id = (select id from auth.users where email = 'their-email@example.com');
```

Run one of these per person, adjusting role/name/title/ward_scope.

## 5. Connect the app

Dashboard → **Project Settings** → **API** → copy the **Project URL** and
**anon public** key. Put them in `.env`:

```env
VITE_API_MODE=gateway
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Restart the dev server. The login page switches to a real email/password
form automatically, and every page now reads/writes the real database
instead of mock data.

## Known gap: creating users from inside the app

The System Administrator's **Add User** button (Administration page)
currently throws a clear error in gateway mode rather than silently
failing — creating a real Supabase Auth user needs the `service_role`
key, which must never be shipped to a browser. Until a Supabase Edge
Function is built to do this server-side, use step 4 above (dashboard
invite) to add new pilot staff.

## Switching back to mock mode

Set `VITE_API_MODE=mock` (or delete the two `VITE_SUPABASE_*` lines) and
restart — nothing about the database is affected, the app just goes back
to talking to the in-browser mock API.
