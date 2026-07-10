# Database Backup And Restore

This project currently uses Supabase as a production persistence target through a single JSONB table:

```sql
create table app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);
```

The application stores the full Product Intelligence Board state in `app_state.data` with `id = production`.

## Current Setup

- Supabase integration: supported through the Supabase REST API in `src/store.js`.
- Required runtime variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STATE_ID`.
- Current production table: `app_state`.
- Recommended state rows: `production` for live data, `staging` for local/preview testing.
- Current local fallback data: `data/store.json`.
- Upload seed script: `scripts/upload-store-to-supabase.mjs`.
- Pull state script: `scripts/pull-supabase-state.mjs`.
- Promote state script: `scripts/copy-supabase-state.mjs`.
- Full normalized business tables such as `update_items`, `weekly_update_entries`, `pm_profiles`, `track_categories`, `announcements`, `meetings`, and `pm_capacity` are not currently implemented as separate Supabase tables.
- Production data is separate from local data only after `data/store.json` is uploaded into Supabase and Vercel is configured with Supabase environment variables.

## Method A: Supabase Built-In Backup

Use Supabase dashboard backups when available on the current plan.

1. Open the Supabase project.
2. Go to `Project Settings`.
3. Go to `Database`.
4. Find `Backups`, `PITR`, or scheduled backups.
5. Confirm whether daily backups are enabled.
6. Confirm restore options.
7. Confirm project region and retention period.
8. Document plan limitations before production launch.

Important: Free or lower-tier Supabase plans may not include daily scheduled backups or point-in-time recovery. If PITR is unavailable, use manual backups before large edits, imports, or deployments.

## Method B: Manual SQL Backup

Set `DATABASE_URL` to the Supabase PostgreSQL connection string. Do not commit it.

Custom dump:

```bash
scripts/backup-db.sh custom
```

Plain SQL export:

```bash
scripts/backup-db.sh sql
```

Equivalent manual commands:

```bash
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file=backups/product-intelligence-board-$(date +%Y%m%d-%H%M%S).dump
```

```bash
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-acl \
  --file=backups/product-intelligence-board-$(date +%Y%m%d-%H%M%S).sql
```

The `backups/` folder and backup file extensions are ignored by git.

## Method C: Table-Level CSV Export

For business review, export `app_state` from Supabase Table Editor as CSV. Because the current production model is JSONB, this is not a normalized table-level backup, but it is useful for confirming the current `production` row exists and has recent data.

If the app later migrates to normalized tables, manually export key tables:

- `update_items`
- `weekly_update_entries`
- `pm_profiles`
- `segments`
- `track_categories`
- `product_marketing_items`
- `announcements`
- `meetings`
- `pm_capacity`

## Restore From Custom Dump

```bash
scripts/restore-db.sh backups/product-intelligence-board-YYYYMMDD-HHMMSS.dump
```

Equivalent manual command:

```bash
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --dbname "$DATABASE_URL" \
  backups/product-intelligence-board-YYYYMMDD-HHMMSS.dump
```

## Restore From SQL

```bash
scripts/restore-db.sh backups/product-intelligence-board-YYYYMMDD-HHMMSS.sql
```

Equivalent manual command:

```bash
psql "$DATABASE_URL" \
  --file=backups/product-intelligence-board-YYYYMMDD-HHMMSS.sql
```

## Restore Warnings

- Never restore directly into production without explicit confirmation.
- Test restore in a separate Supabase project first.
- Confirm `app_state` row count after restore.
- Confirm the `production` row exists.
- Confirm dashboard loads.
- Confirm login/passcodes work.
- Confirm update creation and weekly update creation persist.
- Confirm no production data was accidentally overwritten.

## Supabase JSONB Data Safety Notes

Current implementation supports product launch readiness quickly, but it is not a fully normalized relational schema. Database-level foreign keys and per-table constraints do not exist yet for individual update items and weekly entries because they live inside `app_state.data`.

The app enforces business rules in backend code:

- Weekly entries are appended and do not overwrite previous entries.
- Multiple entries can exist under the same item and reporting week.
- Archived items remain in JSONB data.
- Done items keep `doneDate` and `doneWeek`.
- Passcode validation runs server-side.
- Service role key is used only on the server.

For a later hardening phase, migrate `app_state.data` into normalized Supabase tables with foreign keys, row-level constraints, and explicit audit columns.
