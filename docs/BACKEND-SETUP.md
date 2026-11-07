# Driver accounts and private cloud backups

## Current status

Implementation is on `codex/backend-setup`. The owner-selected existing project `wxaghlxbiglxaqnbtjky` is now configured with the private backup table and account-deletion Edge Function. The dashboard identifies its organization as **Truck Load**, on the Free plan, in West US (Oregon). Initial creation in True Lavender failed because of the free-project quota; no paid plan or unrelated project was changed.

The migration was applied through the dashboard SQL editor, not the CLI migration runner. Do not blindly reapply it: the table, policies, trigger and function already exist. Reconcile migration history before future CLI migration deployment.

`dist/cloud-config.js` remains disabled until email delivery and end-to-end authenticated checks pass. Hosted setup is waiting for the owner to enter a Gmail app password directly in Supabase SMTP settings. The prepared sender and username are `truckload464@gmail.com`, sender name `Truckload`, host `smtp.gmail.com`, port `465`. No password is stored in the repository. Custom SMTP is required by this project's dashboard before editing sign-in email templates.

Email authentication and email confirmation are enabled, anonymous sign-ins are disabled, and email code expiry was set to 600 seconds. The dashboard's default code length is eight digits. Templates, live email delivery and authenticated cloud operations still need verification. The installed iPhone build has not been replaced with this incomplete integration.

## Hosted verification (November 6, 2026)

- A transaction containing disposable Auth users and test backups passed owner access, cross-driver read/write/delete denial, ownership reassignment protection, stale revision rejection, anonymous denial and deletion cascade. All test changes were rolled back. These are live database role/claim tests, not separate real Auth sessions.
- `delete-account` is deployed with gateway legacy-JWT verification off; its own `auth.getUser(token)` validates callers. Live requests without a token and with an invalid token returned HTTP 401 with the expected function messages.
- Security and performance advisors were rerun and showed zero errors, warnings or suggestions. Health advisor also showed zero findings.
- Real email sign-in, authenticated REST backup/restore, successful Edge account deletion and real-device cloud operations remain untested.

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

1. Continue with existing project `wxaghlxbiglxaqnbtjky`; do not create or alter unrelated projects.
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

For browser tests, install Playwright separately, serve `dist` on port 8017, and run `tests/mobile-browser.cjs` and `tests/cloud-browser.cjs`. These are browser/mocked API checks, not evidence of real email delivery or deployed database behavior. Hosted database, Edge rejection-path and advisor results are recorded above. Live Auth/API and real-device cloud tests still require working email delivery.
