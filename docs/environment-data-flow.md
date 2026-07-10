# Environment Data Flow

Use separate Supabase state rows for safe testing and production.

## Recommended Environments

- `production`: live Vercel production data.
- `staging`: test data used by local development and Vercel preview.
- `data/store.json`: local fallback and editable seed file.

## Daily Workflow

0. Create local secrets in `.env.local`. This file is ignored by git:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SESSION_SECRET=local-dev-secret
```

1. Pull current production data into local:

```bash
SUPABASE_STATE_ID=production npm run pull:db
```

2. Upload that same local data to staging:

```bash
SUPABASE_STATE_ID=staging npm run upload:db
```

3. Run local app against staging:

```bash
npm run dev:staging
```

4. Test changes locally.

5. If the local/staging result is approved, promote staging data to production:

```bash
npm run promote:db
```

6. Commit and push code, then deploy/promote the matching Vercel build.

## Vercel Setup

Production environment variables:

```env
SUPABASE_STATE_ID=production
```

Preview environment variables:

```env
SUPABASE_STATE_ID=staging
```

Use the same `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only if preview testing is allowed to use the same Supabase project. Otherwise use a separate Supabase project for staging.

## Safety Rules

- Never test risky changes directly against `production`.
- Before large admin edits, pull and back up production data.
- Only run `npm run promote:db` after the local or preview board is approved.
- If production data was edited manually by Admin, pull `production` again before starting new code work.
