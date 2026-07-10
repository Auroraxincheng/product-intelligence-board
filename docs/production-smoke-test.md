# Production Smoke Test

Run this checklist after deploying to Vercel and after any restore.

## Deployment Readiness

- `npm run check` passes locally.
- Vercel deployment succeeds.
- No secrets appear in deployment logs.
- `SUPABASE_URL` is set.
- `SUPABASE_SERVICE_ROLE_KEY` is set.
- `SUPABASE_STATE_ID` is set to `production`.
- `SESSION_SECRET` is set.
- Supabase `app_state` has a `production` row.

## Login And Roles

Login is a release blocker. If any login path fails, do not deploy.

Test each role:

- Viewer: valid passcode works, invalid passcode rejected.
- PM Team: valid PM account and passcode work.
- PMM: valid passcode works.
- Product Lead: valid passcode works.
- Admin: valid passcode works.

Confirm:

- Correct role is assigned.
- PM Team account maps to the configured PM Profile.
- Passcodes are not visible in frontend code.
- No login screen JavaScript error appears before or after submit.
- Successful login does not hang on loading.
- Existing production passcodes continue to work unless the change explicitly updates them.
- Viewer cannot write through UI.
- Viewer cannot write through direct API request.
- PM Team cannot archive through direct API request.
- Product Lead can archive.
- Admin can manage records.

## Dashboard

- Shared dashboard loads.
- Summary cards render.
- Reporting week selector works.
- Weekly, bi-weekly, monthly, and quarterly toggles work.
- Filters work.
- Reset filters works.
- Product / Workstream filter works.
- Update cards show current data.
- PM Team and Product Lead can see all update content.
- Archived items are hidden from the default dashboard.
- Done items are hidden from future weeks by default.

## Update Item

- Create Update Item.
- Edit Update Item.
- Owner defaults correctly.
- Owner can be changed.
- Status defaults correctly.
- Target completion date is required if configured in the UI.
- Related links save.
- Sub-tasks save.
- QA issue styling appears when selected.
- `lastUpdatedBy` and `lastUpdatedAt` update.

## Weekly Update Entry

- Add Weekly Update to an existing item.
- Progress this week can be optional if the UI allows it.
- Next step can be optional if the UI allows it.
- Multiple entries under the same item and same reporting week are preserved.
- Existing entries are not overwritten.
- Timeline shows all entries.
- Previous Update Reference shows the nearest previous entry.
- Previous Update Reference does not show the current entry.
- Blocked or Delay requires Blocker / Delay.
- Submitted by and submitted at are captured.
- Last updated by and last updated at update on edit.

## Done Behavior

- Mark item as Done.
- `doneDate` and `doneWeek` are recorded.
- Item remains visible in the done week.
- Item is hidden in future weeks by default.
- Timeline remains accessible.
- Historical previous weeks are not rewritten to Done incorrectly.

## Archived Behavior

- Product Lead can archive with a reason.
- PM Team cannot archive.
- Archived item is hidden from default dashboard.
- Archived item appears in archive folder/view.
- Archived item timeline remains accessible.
- No physical deletion happens for normal Product Lead archive.
- Admin delete is reserved for cleanup only.

## Announcements

- Add announcement.
- Edit announcement.
- Delete/archive announcement as permitted.
- Announcement appears on the shared dashboard for the intended week.
- All roles that can view dashboard can see active announcements.

## Meetings

- Upload or create meeting note.
- Edit meeting note as permitted.
- Meeting note appears in the dashboard area where expected.
- PM Team and Product Lead permissions match current implementation.

## Product Marketing

- PMM board loads.
- Create/edit item works if enabled.
- Links render.
- No unexpected AI or Lark behavior is enabled.

## PM Capacity

- Capacity section loads.
- Product Lead can update capacity data.
- Non-lead roles can view capacity.
- Data persists after refresh.

## Multi-User And Persistence

- Open production URL in two browsers.
- User A creates an update.
- User B refreshes and sees it.
- User A and User B add weekly entries to the same item/week.
- Both entries remain.
- Dashboard latest entry and update count are correct.
- Refresh browser and confirm data remains.
- Redeploy app and confirm data remains.
- Confirm data does not reset to `data/store.json`.

## Backup And Restore

- Run manual backup before launch.
- Confirm backup file is created under `backups/`.
- Confirm backup file is not tracked by git.
- Test restore in a separate Supabase project before production restore.
- Confirm `app_state.production` exists after restore.

## Go / No-Go Report Template

```text
Deployment readiness status:
Backup readiness status:
Environment variable status:
Smoke test results:
Critical blockers:
Non-blocking issues:
Recommended fixes:
Final recommendation: GO / NO-GO
```
