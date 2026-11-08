# Truckload administration and removal requests

Admin URL: https://lavender333.github.io/truckload/dist/admin.html

Only the verified Supabase Auth account with email `truckload464@gmail.com` is authorized by the server. The page itself is public static HTML; its data and review operations require a validated bearer token and the owner email returned by Auth. Client-side profile metadata never grants access. Sign in using the existing driver account and an email code. Sessions are memory-only; reload requires sign-in again. No service key is in the browser bundle.

## Operations

- Overview: verified accounts, accounts with one latest backup, new verified accounts created within 30 days, pending removal requests and open support messages. Admin accounts are included in verified-account counts.
- Driver lookup: literal email substring, creation time, last Auth sign-in and latest backup time, 50 per page. No trip/financial payloads are shown.
- Removal requests and support messages: oldest first, 50 per page, assignment to the sole authorized owner or unassigned, private internal notes and separate customer-visible updates. Updates are transactional and revision-checked.
- Support: new submissions are saved before forwarding through Web3Forms. Failed forwarding does not lose the inbox message. Existing Web3Forms history is not imported. A retry with the same request UUID cannot forward twice. Drivers can read their support status/updates only after verifying the matching email; submission addresses are otherwise unverified.
- Service health: counts of best-effort client-reported email-code request and backup failures (24 hours), failed support forwards, and five recent incidents from Supabase's public status feed. These are not a complete monitor or proof of delivery; no historical failures are backfilled. Unavailable feeds are explicitly labelled. Client event reports are anonymous and may be inaccurate; no alerts or paid monitoring were enabled.
- Activity: who, what, when, status, assignment and notes for reviews performed after this update. Activity is append-only for the service role. Older deletion-request audit rows remain in their original restricted table.
- Customer-visible updates appear in the app, not automatically by email. Support messages can be submitted without an account. A driver signs in with the same email to see updates.

Internal notes are in server-only tables, separate from driver-readable removal requests. Public inbox ingestion has a 20-per-hour network/action limit (daily salted hash; no source IP stored), length and topic checks; Supabase still sees normal connection metadata. This is basic abuse resistance, not CAPTCHA or a substitute for provider limits. Rate-limit records and event history require a future explicit retention policy; no purge task was added.

There is no permanent-delete action in this dashboard. The legacy `delete-account` endpoint now records a request, including for older apps that send `DELETE MY ACCOUNT`. It never returns `deleted:true`, revokes sessions or deletes Auth users. Authenticated database users no longer have DELETE permission on `driver_backups`.

Driver requests are submitted only through the authenticated service. The service derives ownership from the validated user, not a caller-supplied ID. Drivers have read-only access to their own request status and notes; they cannot update or delete requests/audit history or grant themselves administrator access.

## Manual fulfillment and Apple review

The owner requested no automatic permanent deletion. This is a request-and-review system, not a completed data-erasure service. Before App Store release, define an actual fulfillment process, a reasonable processing timeframe, completion notification and lawful retention policy. Apple permits manual processing, but requires users to initiate account deletion in the app and expects the account and associated personal data to be removed unless retention is legally required. Simply closing a ticket or retaining everything indefinitely does not meet that requirement. Reference: https://developer.apple.com/support/offering-account-deletion-in-your-app/ .

No automated email notification or reminder was added. The owner must review the dashboard and support inbox and communicate with customers. The app displays request status and customer-visible notes. Admins cannot remotely erase device-local records; provide device-specific guidance when needed. Account and audit foreign keys deliberately prevent accidental cascading deletion; any future approved erasure/anonymization process must explicitly handle those records.

## Deployment and verification

`20261107184713_reviewed_deletion_requests.sql` was applied through the Supabase SQL editor to project `wxaghlxbiglxaqnbtjky`, along with its four foreign-key indexes. Reconcile migration history before future CLI deployments; do not blindly reapply existing objects.

`delete-account` and `admin-dashboard` were deployed through the dashboard. Both use `verify_jwt=false` at the legacy gateway and validate the token themselves with `auth.getUser`; the admin service additionally checks verified email and rejects anonymous users.

Initial release checks passed: 26 Node tests including real Postgres policy/audit/revision tests and Edge authorization tests; Chromium/WebKit customer-request and admin-dashboard interaction tests; hosted rollback-only owner isolation, permission denial, revision and audit tests; missing/invalid-token requests to the live admin service returned 401. The signed iPhone build passed. The full owner email-code session against the live admin dashboard still needs owner participation; automated browser tests use mocked service responses.

Hosted security advisor after refresh: zero errors; an existing Auth warning reports leaked-password protection disabled (the dashboard previously indicated this protection requires Pro; the current driver flow now supports passwords). The informational RLS-without-policy item on `deletion_request_events` is intentional: all client grants are revoked and no client policy is provided; only the backend service can access audit records. No paid plan change was made.

Performance advisor initially reported missing foreign-key indexes. All four covering indexes were subsequently created in a separate committed query and verified in pg_indexes (request user/reviewer and event request/actor).

## November 8 dashboard/password update

Migration `20261108043329_admin_operations.sql` adds server-only operations tables, service-only overview and transactional review functions. Apply before deploying `admin-dashboard` and new `app-inbox`. The latter accepts support and diagnostic writes, but reads require a verified email; admin reads/reviews remain owner-only. Both use explicit service-side checks; no privileged keys are shipped to clients.

Driver flow: email code → password setup (12–128 characters in UI) → future password sign-in. Set/reset password verifies a new email code without creating a new user. Existing code-only users use that path. Admin dashboard continues to require an email code. Sessions remain memory-only; no password or token is written to localStorage. The local password policy minimum is 12 characters. The hosted email provider was also configured for a 12-character minimum and secure password changes after recent sign-in. Leaked-password screening remains a paid-plan setting; no upgrade was purchased.

Current verification: 30 Node tests passed, including operations-table isolation, transactional reviews, conflict prevention, support-read ownership, email-forward failure preservation and duplicate suppression. Chromium and WebKit passed driver password setup/sign-in/reset/cancel, backup operations, admin support/review/history and logout-clearing checks. Hosted rollback-only tests passed overview lookup, review, private grants, stale writes and audit; no test customer records were retained. Live unauthenticated overview/support reads returned 401. New live password setup and authenticated owner dashboard use still require the owner to enter their own code/password. Fuel account provider setup is temporarily hidden; manual Diesel/DEF purchases and stored fuel data remain available.

Current hosted Security Advisor: zero errors; leaked-password screening remains disabled because the dashboard limits it to Pro. Six informational no-policy findings correspond to deliberately server-only tables with all client grants revoked.
