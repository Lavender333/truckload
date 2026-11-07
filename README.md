# Truckload Trip Companion

[Open the public app](https://lavender333.github.io/truckload/dist/)

Mobile-responsive trucking trip estimator with local fuel-statement import.

## Working features

- Check numbers first: target earnings per total mile, diesel consumption, driver pay, company percentage, dispatch/factoring, tolls, weight scale, reefer fuel, parking and DEF.
- Lumper amount can remain unknown while planning. Record company, driver or broker payment and explicitly choose whether to deduct it. Unknown charges are excluded with a visible pending notice. Completed trips require a resolved lumper amount/payer or no lumper needed.
- Separate monthly business budgets for insurance, truck note, tags and other recurring costs, with effective dates and editing.
- Weekly Monday–Sunday dashboard uses entered completion dates and validated final trip costs. Saved estimates and undated older records do not count as earnings. Business budgets allocate by calendar days in each month, separate from trip expenses.
- Manual diesel/DEF purchases, diesel spreadsheet import (.csv/.tsv), weighted diesel price, trip linking, individual purchase deletion and exports.
- Save, reuse and delete trips; enter/edit final costs including diesel/DEF gallons consumed, lumper and separate expenses. Export trip and weekly spreadsheets.
- PDF/photo rate confirmations with review, field suggestions, original document access, rescanning and deletion.

Maintenance reserve and fixed daily overhead are no longer included in new estimates. Old saved estimate values remain unchanged and labeled as earlier estimates. Legacy storage keys preserve existing device data. No saved-routes or fuel-comparison navigation remains.

## Data boundaries

This package contains no customer trip history, account credentials or private repository history. `dist/history.json` is intentionally empty. Fuel statements are parsed in the browser; only selected fields are retained in browser localStorage. Raw statement data, unmapped columns and card numbers are not intentionally saved or uploaded. Users should not map card numbers to transaction IDs. Local data is not encrypted and is scoped to the browser, not to an individual signed-in driver. Do not use this edition on shared devices for separate driver accounts without a proper authenticated storage backend.

This is the public GitHub source. Do not copy the private deployment repository's `.git` directory, `.openai` directory, workbook or historical data. No license is granted by this README; the owner should choose a license before inviting outside reuse.

## Run

October 22 updates: forms stack on mobile across all six tabs, including document review and final costs. Fuel purchases have Diesel/DEF buttons and a per-gallon price that calculates the total. Truck settings retain company, dispatch and factoring percentages for every estimate and support driver pay per mile or as a percentage of gross load pay. Combined percentage deductions must remain below 100%.

Earnings now accept an inclusive start/end date range and display gross and net. Monthly business budgets include fees, maintenance, repairs and meals; dated one-time expenses are deducted in their selected range. Do not enter the same expense in both a budget and a dated entry. Existing saved budgets default the new categories to zero. Reviewed rate-confirmation details populate the trip and immediately calculate an estimate when required fields are valid.

Run `node --test tests/*test.cjs tests/*test.mjs` for automated checks. Optional layout checks require Playwright with Chromium and WebKit installed, a server on port 8017 serving dist, and `node tests/mobile-browser.cjs`. Chromium and WebKit layout/form checks passed on November 4, 2026.

Serve the `dist` directory with any static web server (for example, `python -m http.server 8000 --directory dist`) and open its local address. No package install or build is required. For GitHub Pages, select main and / (root); the root entry redirects to dist/. GitHub Pages can host this browser-local edition; it cannot hold private provider API secrets.

## Test

Run `node tests/trip-math.test.cjs`, `node tests/fuel-core.test.cjs` and syntax checks with `node --check dist/app.js` and `node --check dist/connections.js`.

## Not yet connected

No fuel provider API, live fuel prices, truck routing, toll API, automatic background refresh, cloud driver accounts or bank account connection is implemented. Selecting a fuel provider records a preference only. It does not connect an account. Spreadsheet import works without those integrations. Receipt-photo reading for fuel purchases is planned, not implemented; enter receipt details manually.

Direct syncing requires the selected provider's supported API, commercial access if required, authentication documentation and approved credentials. Implement it in a secure backend, not in this static bundle. Do not collect drivers' provider passwords in browser forms or commit secrets to GitHub.

For a multi-driver release, add authenticated per-driver storage, server-side authorization on each request, secure provider credential storage, scoped provider authorization, disconnect/revocation, transaction pagination and idempotency, provider-specific currency/unit mapping, last-successful-sync timestamps and visible error states. Routing must account for truck dimensions, weight and restrictions. Transaction access does not imply access to current discounted station prices.

## Calculation limits

Historical paid prices are not current quotes. Fuel purchased on a trip may be consumed on other trips. Purchase totals therefore remain separate from consumed fuel cost and final profit. Imported diesel totals must exclude non-fuel items and separate fees. Only positive USD/US gallon diesel purchases are supported; credits and other currencies need separate reconciliation. No IFTA settlement, income tax or unentered cost is included. Estimates are only as complete as the input profile.

## Rate confirmation uploads

PDF, JPEG, PNG and WebP rate confirmations can be attached to estimates. Files are validated by signature, limited to 10 MB each and 50 MB total, and stored in IndexedDB on the current browser. They are not sent to a server. Users can open/download originals, review suggested fields, link to a saved estimate or delete a document. Removing a document detaches it without deleting the estimate. Reusing a saved trip does not carry its rate confirmation onto a different load.

Text PDF extraction uses vendored Mozilla PDF.js 5.6.205 (Apache-2.0; license in dist/vendor/pdfjs-LICENSE), reading at most 20 pages and 100,000 characters. Simple labeled fields are suggested; competing values are left blank. Review is required before applying fields. Scanned PDFs and images use Tesseract.js 7 English OCR, up to six scanned pages per file. Engine and English language resources download on first use from jsDelivr and Project Naptha; document contents remain on-device. A progress indicator, cancellation and Rescan button are available. OCR is imperfect; review suggested fields before applying. Tabular pickup/delivery stops and adjacent mileage/weight columns are supported. Password-protected or unreadable PDFs remain attachable. Documents and links do not sync across devices. Keep original copies outside the app.

Run `node tests/ratecon-core.test.cjs` for field extraction and file signature checks.

## Accounting behavior and verification

Estimated trip expenses = consumed diesel + driver pay + tolls + scale + reefer fuel + parking + DEF + lumper borne by the user + percentage deductions on gross load payment. Business budgets are not part of that estimate. Target load payment divides fixed trip expenses plus desired earnings by one minus the combined deduction rate; displayed required payment rounds upward to the next cent. Actual final expenses use entered consumed fuel and expense amounts, not linked purchase totals. Reimbursements should not be counted both in final payment and as excluded costs. Enter amounts consistently to avoid double counting.

Monthly budgets apply from their effective date and are divided by the calendar days in each applicable month, including leap years. Weekly business allocation includes all seven days, even when no trip completes. Editing the same effective date replaces that budget; creating a later effective date retains earlier periods. These are budget allocations, not recorded bill payments. Data remains device-local; exports do not constitute a complete backup of documents and settings.

Run all core checks: `node tests/trip-math.test.cjs`, `node tests/fuel-core.test.cjs`, `node tests/ratecon-core.test.cjs`, `node tests/review-fields.test.cjs`, `node tests/safari-stream.test.mjs` and `node tests/ui-wiring.test.cjs`.

## Native iOS testing

The native SPM Xcode project is checked in under `ios/`. See [Mac build, signing instructions and verification results](docs/IOS-XCODE-DEVICE-SETUP.md). Run `npm ci`, `npm run ios:sync`, then `npm run ios:build:simulator`. Automatic signing is configured for True Lavender LLC; signed installation and startup passed on the owner’s iPhone. Interactive device QA remains pending.

## Cloud backend work

Email sign-in and explicit private cloud backup are implemented on the backend feature branch but remain disabled until email delivery and authenticated end-to-end checks pass. The hosted private backup table and account-deletion service are deployed; database isolation and security checks passed. See [backend setup and verification](docs/BACKEND-SETUP.md). Local records remain available; no automatic upload, document sync or subscriptions are enabled. Run `npm run build:cloud` after changing cloud-client source.
