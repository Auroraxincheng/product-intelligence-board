# Product Intelligence Board Production Rules

This app is already live. Treat every change as production work.

## Non-Negotiable MVP Safety Rule

Do not make any change that breaks normal login or the existing MVP workflows.

Before finishing any code change, verify that these still work:

- Login for `viewer`, `pm_team`, `product_lead`, `admin`, and `pmm`.
- Invalid passcodes are rejected.
- `pm_team` account selection still maps to the correct PM Profile.
- A logged-in user can reach the shared dashboard without a blank or endless loading page.
- Dashboard cards, reporting week selector, filters, and product/workstream views still render.
- `Add Weekly Update` opens for existing items and submits without overwriting previous entries.
- `Create New Update Item` still saves required project-level fields.
- Timeline still shows historical weekly entries.
- Done items keep correct done-week behavior.
- Archived items stay out of the default dashboard and remain accessible through archive/search.
- Announcements, meeting notes, PMM, and PM Capacity continue to load if already enabled.

## Change Discipline

- Keep fixes narrow. Do not refactor working production flows unless required.
- Do not change auth/session logic, role names, data schema, or persistence behavior casually.
- If touching a shared frontend helper, confirm every caller has the helper defined before login renders.
- If touching API/store code, confirm both local JSON fallback and Supabase-backed production paths still work.
- If touching Vercel routing, confirm `/`, `/app.js`, `/styles.css`, `/assets/...`, and `/api/...` still resolve.
- Do not add P1/P2 behavior that changes existing MVP behavior without an explicit user request.

## Minimum Verification

Run syntax checks after code edits:

```bash
npm run check
```

For production-impacting changes, also run the checklist in `docs/production-smoke-test.md`.
