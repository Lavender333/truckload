# Driver accounts and private cloud backups

## Current status

Implementation is on `codex/backend-setup`. Hosted setup is **blocked**: Supabase rejected creation of Truckload in the owner-selected True Lavender organization because Lavender333 has reached the two-active-free-project limit. The owner approved the quoted $0/month creation cost, but no project was created. No cloud data has been uploaded, no service credentials have been committed, and no paid plan or unrelated project was changed.

`dist/cloud-config.js` deliberately has `enabled: false`. The local app works and shows that cloud sign-in is being configured. The new backend is not live. The existing installed iPhone build has not been replaced with this incomplete integration.

## Implemented

- Email code sign-in with verified first sign-in creating an account. Sessions remain in memory, requiring sign-in again after reload/restart.
- Explicit, consented backup upload of trips, fuel, truck settings, selected provider, business budgets and expenses. No automatic upload/sync, subscriptions, provider API connection or document storage.
- One backup per driver, 1.9 MB client limit / 2 MiB server limit, server timestamp and revision. Conditional updates prevent silently overwriting a backup changed by another device.
- Each table operation is restricted by database row-level security to the authenticated owner. Anonymous table access is revoked. User IDs reference Auth users with cascading deletion.
- Download, restore onto empty local storage, delete backup and delete account. Restore refuses to overwrite local data, rolls back partial writes, and drops stale document references. Original PDFs/photos must be kept separately.
- A local ownership marker prevents uploading records already associated with one driver into another driver's account. Signing out does not erase local records: this remains a personal-device app, not a shared-device workspace.
- Account deletion validates the bearer token server-side, derives the user ID from that token, revokes sessions and deletes the Auth user; the backup cascades. The service key is read only from Edge Function environment variables. Existing access tokens cannot recreate a backup after account removal because of the foreign key.
- Local export and deletion now include business budgets/expenses, which were previously omitted.

## Complete hosted setup

1. Select an existing suitable Supabase project, free a slot by explicitly choosing an unused project to pause, or approve a paid option. Do not pause/delete unrelated projects speculatively.
2. Inspect the chosen project's tables, migrations and security advisories before applying `supabase/migrations/20261104182105_driver_cloud_backups.sql`. The migration creates a new table/function and should not be applied on top of existing objects with the same names without review.
3. Run hosted isolation tests with disposable users, using separate authenticated sessions: A can write/read its backup; B cannot read/update/delete A's backup or insert a row for A; anon is denied; owner reassignment fails; stale revisions cannot overwrite; account deletion cascades and stale tokens cannot insert. Local Postgres tests already cover these database behaviors, but do not substitute for hosted Auth/API tests.
4. Deploy `supabase/functions/delete-account/index.ts` with `verify_jwt=false` because its own `auth.getUser(token)` validates the caller. Confirm missing/invalid tokens get 401, and test deletion with a disposable account only. Never disable the function's in-body authentication.
5. In Auth settings, keep email authentication and confirmation enabled, anonymous sign-ins disabled. Set the Magic Link **and Confirm Signup** email templates to `supabase/templates/sign-in-code.html` so both new and returning users receive a code rather than a deep link. Set code expiry to 10 minutes and resend interval to at least 60 seconds. Configure the public site URL to the intended Truckload web deployment.
6. Configure custom SMTP for real drivers, using the owner's approved sender/provider and credentials entered securely. Supabase's default mailer is limited to authorized project team addresses and is unsuitable for production. Do not expose SMTP credentials to the web client. See [Supabase SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).
7. Fetch the project URL and **publishable** key. Populate `dist/cloud-config.js` and enable it only after hosted checks pass. Never use a service-role/secret key there.
8. Run security/performance advisors. Resolve relevant findings, test real email-code sign-in with the owner's participation, then save/restore/delete a disposable backup and test account deletion. Confirm updates to privacy disclosures/App Store privacy answers before public release.
9. Build/sync iOS and install on the owner's device for real-network testing. Keep web and native deployment destinations explicit; pushing this feature branch does not update the public GitHub Pages main branch.

## Build and tests

```sh
npm ci
npm run build:cloud
npm test
npm run ios:sync
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer npm run ios:build:simulator
```

Cloud client source is `src/cloud-account.js`; its checked-in browser bundle is `dist/cloud-account.js`. Rebuild after editing source or dependencies. Versions are pinned in package.json/lockfile. The Supabase CLI v3 local configuration includes code-email templates; applying local config does not automatically configure a hosted project.

Passed on November 4, 2026:

- 22 Node tests, including actual in-memory Postgres (PGlite) tests for RLS, ownership, revision conflicts, anonymous denial, invalid payloads, deletion cascade and stale-token FK protection. Auth users/claims are simulated in this isolated test database, not live Supabase accounts.
- Chromium and WebKit: seven app tabs at seven screen widths; existing calculator/save, fuel and business flows; declined analytics stays off.
- Chromium and WebKit with mocked Supabase HTTP responses: code sign-in, no upload before consent, backup contents, revision conflict handling, overwrite protection and account deletion preserving local data.
- Unsigned iOS Simulator build.

For browser tests, install Playwright separately, serve `dist` on port 8017, and run `tests/mobile-browser.cjs` and `tests/cloud-browser.cjs`. These are browser/mocked API checks, not evidence of real email delivery or deployed database behavior. Hosted migration, Auth delivery, Edge deployment, hosted advisors, live two-user isolation and real-device cloud operations remain untested until a project is available.
