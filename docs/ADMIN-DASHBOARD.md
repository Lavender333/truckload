# Truckload administration and removal requests

Admin URL: https://lavender333.github.io/truckload/dist/admin.html

Only the verified Supabase Auth account with email `truckload464@gmail.com` is authorized by the server. The page itself is public static HTML; its data and review operations require a validated bearer token and the owner email returned by Auth. Client-side profile metadata never grants access. Sign in using the existing driver account and an email code. Sessions are memory-only; reload requires sign-in again. No service key is in the browser bundle.

## Operations

- View cloud-backup count and paginated cloud-account/backup removal requests (50 per page).
- Read the customer's verified account email, request date, scope and status.
- Save a status of Received, Under review or Closed with a customer-visible note. Updates use revision checks so stale screens cannot overwrite newer reviews.
- Every request creation/review is recorded in the restricted audit table. Closing a request does not delete anything. Notes must accurately explain the outcome; do not claim that retained data was erased.
- Support-information deletion requests submitted under Questions & feedback continue through Web3Forms to the existing support inbox. They are not mirrored into this dashboard.

There is no permanent-delete action in this dashboard. The legacy `delete-account` endpoint now records a request, including for older apps that send `DELETE MY ACCOUNT`. It never returns `deleted:true`, revokes sessions or deletes Auth users. Authenticated database users no longer have DELETE permission on `driver_backups`.

Driver requests are submitted only through the authenticated service. The service derives ownership from the validated user, not a caller-supplied ID. Drivers have read-only access to their own request status and notes; they cannot update or delete requests/audit history or grant themselves administrator access.

## Manual fulfillment and Apple review

The owner requested no automatic permanent deletion. This is a request-and-review system, not a completed data-erasure service. Before App Store release, define an actual fulfillment process, a reasonable processing timeframe, completion notification and lawful retention policy. Apple permits manual processing, but requires users to initiate account deletion in the app and expects the account and associated personal data to be removed unless retention is legally required. Simply closing a ticket or retaining everything indefinitely does not meet that requirement. Reference: https://developer.apple.com/support/offering-account-deletion-in-your-app/ .

No automated email notification or reminder was added. The owner must review the dashboard and support inbox and communicate with customers. The app displays request status and customer-visible notes. Admins cannot remotely erase device-local records; provide device-specific guidance when needed. Account and audit foreign keys deliberately prevent accidental cascading deletion; any future approved erasure/anonymization process must explicitly handle those records.

## Deployment and verification

`20261107184713_reviewed_deletion_requests.sql` was applied through the Supabase SQL editor to project `wxaghlxbiglxaqnbtjky`, along with its four foreign-key indexes. Reconcile migration history before future CLI deployments; do not blindly reapply existing objects.

`delete-account` and `admin-dashboard` were deployed through the dashboard. Both use `verify_jwt=false` at the legacy gateway and validate the token themselves with `auth.getUser`; the admin service additionally checks verified email and rejects anonymous users.

Checks passed: 26 Node tests including real Postgres policy/audit/revision tests and Edge authorization tests; Chromium/WebKit customer-request and admin-dashboard interaction tests; hosted rollback-only owner isolation, permission denial, revision and audit tests; missing/invalid-token requests to the live admin service returned 401. The signed iPhone build passed. The full owner email-code session against the live admin dashboard still needs owner participation; automated browser tests use mocked service responses.

Hosted security advisor after refresh: zero errors; an existing Auth warning reports leaked-password protection disabled (the app uses email codes and the dashboard previously indicated this protection requires Pro). The informational RLS-without-policy item on `deletion_request_events` is intentional: all client grants are revoked and no client policy is provided; only the backend service can access audit records. No paid plan change was made.

Performance advisor initially reported missing foreign-key indexes. All four covering indexes were subsequently created in a separate committed query and verified in pg_indexes (request user/reviewer and event request/actor).
