# Local PostgreSQL

Everything needed to run Pozhi against a PostgreSQL server on your own machine,
with no Supabase project involved.

## Layout

| Path | Purpose |
|---|---|
| `init/01_schema.sql` | Full schema + seeded pricing catalogue. **Generated** from `../pozhi_schema.sql` — don't edit by hand. |
| `../../docker-compose.yml` | The Postgres 16 and Redis 7 containers. |

## Start it

1. Launch **Docker Desktop** and wait for it to say "Engine running".
2. From the repo root:

```bash
docker compose up -d
docker compose ps          # both services should be "healthy"
```

On the very first start, Postgres runs `init/01_schema.sql` automatically: 22
tables plus the seeded pricing rows for every service.

## Check it worked

```bash
# Table count - expect 22
docker compose exec postgres psql -U pozhi -d pozhi -c "\dt"

# The catalogue should already be populated
docker compose exec postgres psql -U pozhi -d pozhi \
  -c "SELECT size_label, price FROM frame_sizes ORDER BY display_order;"
```

An interactive shell, when you want to poke around:

```bash
docker compose exec postgres psql -U pozhi -d pozhi
```

## Connection string

```
DATABASE_URL=postgresql://pozhi:pozhi_local_dev@localhost:5432/pozhi
REDIS_URL=redis://localhost:6379
```

## Re-applying the schema after a change

The init scripts only run when the data volume is created, so editing the SQL
and restarting does nothing. To rebuild from scratch (**this deletes all local
data**):

```bash
docker compose down -v
docker compose up -d
```

Once the app has real local data you care about, switch to adding numbered
migration files under `../migrations/` instead and applying them with:

```bash
docker compose exec -T postgres psql -U pozhi -d pozhi < ../migrations/00X_whatever.sql
```

## How this differs from the Supabase schema

`init/01_schema.sql` is generated from `../pozhi_schema.sql` with four changes,
all forced by leaving Supabase:

1. **`profiles` is now the identity table.** Its `id` no longer references
   `auth.users`, and it carries `password_hash` and `google_sub` itself.
2. **Row Level Security and every policy are dropped.** They were written
   against `auth.uid()`, which only exists inside Supabase. They were also
   already inert: the backend connects as a superuser-equivalent and was
   bypassing them entirely.
3. **Grants to `anon` / `authenticated` / `service_role` are dropped** — those
   roles are Supabase's.
4. **Three tables are added** to cover what Supabase Auth was doing for us:
   `refresh_tokens` (revocable sessions), `auth_tokens` (single-use email
   verification and password reset), and `webauthn_challenges` (passkey
   challenges, which currently live in process memory and so break across
   restarts).

It also adds the `orders` columns the application writes but the Supabase schema
never declared: `feedback_rating`, `feedback_comment`, `tracking_number`,
`courier_service`, `internal_notes`, `cancellation_reason`.

## Regenerating

```bash
python backend/scripts/gen_local_schema.py
```
