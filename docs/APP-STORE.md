# Truckload — iPhone release handoff

Status: iOS project and export integration prepared; NOT an App Store-ready release.
Database/accounts intentionally deferred. This branch does not implement subscriptions.

## Built in this change

- Capacitor 8 iOS project with bundled `dist` files (no remote website URL).
- iOS 15 minimum; Node 22+ and Xcode 26+ toolchain.
- Native share sheet for trip/fuel/earnings CSV exports and original rate confirmations, with web download fallback and temporary-file cleanup.
- Existing diamond mark rendered into app icon and launch assets.
- Camera purpose string for the document file chooser; no location permission requested.
- Filesystem required-reason privacy manifest included in the app Resources build phase.
- Help and privacy pages linked in the app; safe-area, input-size, keyboard-focus and reduced-motion adjustments.

## Build on a Mac

```sh
npm ci
npm test
npm run ios:sync
npm run ios:open
```

Open `ios/App/App.xcodeproj` if opening manually. Select True Lavender LLC's signing team in Xcode. Confirm ownership/availability of the proposed bundle ID `com.truelavender.truckload` before creating the App Store Connect record. Match any existing App Store bundle ID in both Capacitor configuration and the Xcode target. The signing team is deliberately not hardcoded.

Run on a real iPhone, then Archive / Validate / Distribute to App Store Connect. No signed archive, IPA, TestFlight upload or device test was produced in this Linux environment.

## Required release decisions and Apple setup

- Confirm bundle ID, app name availability, App Store category, age rating and support contact. The public GitHub issue channel is linked now; provide a monitored private business support contact for confidential requests before launch.
- Review the privacy policy against the final implementation. It describes local records, hosting and third-party OCR resource downloads. Inspect Xcode's combined SDK privacy report and complete Apple's privacy questionnaire; do not blindly select “Data Not Collected.” Revisit the policy and manifest when accounts, payments or other SDKs are introduced.
- Review encryption/export-compliance questions for the final archive. No compliance answers have been submitted or assumed.
- Take genuine screenshots from the final iPhone build. If keeping iPad in the target device family, also test and supply its required screenshots.

## Subscription work — still required for the paid subscription launch

The current branch has no paywall or purchase implementation. Do not market it as subscription-ready.

1. Choose monthly/annual prices and which capabilities are paid; create the subscription group and products in App Store Connect.
2. Add StoreKit purchase, verified entitlement checks, restore purchases and transaction update handling. Local UI state must never be the source of payment entitlement truth.
3. Show Apple's localized full billed price and renewal period prominently, with any trial secondary. Include subscription terms, privacy, restore and manage-subscription controls.
4. Test success, cancellation, pending purchase, expiration, refund/revocation, renewal and reinstall in StoreKit/TestFlight.
5. Provide Apple review instructions and any required test access. Driver accounts are not inherently necessary for Apple purchase restoration; cross-platform entitlements and cloud synchronization are separate decisions.

## Device acceptance checklist

- Cold launch in airplane mode: calculate, save, edit and reopen a trip.
- Reopen after force quit: local records and documents persist.
- CSV export to Files and a share destination; cancel share; verify originals remain.
- Import CSV/TSV; upload text PDF, scanned PDF and JPG; deny camera access; recover from read cancellation and unsupported HEIC.
- First-use OCR online, then without a connection: clear errors and manual-entry recovery. OCR resources are still fetched externally; offline first-use OCR is not promised.
- Open/share/delete originals; low-storage and 10 MB/50 MB limits.
- Small/large iPhone portrait/landscape, keyboard, notches and large text; check all six tabs. Check iPad if enabled.
- Website storage and app storage are separate. No automatic migration or full backup/restore is included.

## Draft App Store text

Name: Truckload Trip Companion

Subtitle: Trip costs & earnings

Description:
Plan a load before you accept it. Truckload helps drivers estimate trip expenses, compare load pay with an earnings target, and record final costs after delivery.

- Estimate diesel, driver pay, tolls, DEF, lumper and other trip costs.
- Track fuel purchases and import supported fuel spreadsheets.
- Review PDF or photo rate confirmations and check suggested load details.
- Save trips, enter final costs and review earnings by completion date.
- Track recurring business budgets and one-time expenses.
- Export spreadsheets and save or share original documents.

Records stay on your device in this version. Keep your own copies of important documents. OCR may require an internet connection and all suggestions need review. Truckload does not provide truck-safe routing, live fuel quotes, tax filing or guaranteed profit. Use while parked.

Proposed support URL after merge: https://lavender333.github.io/truckload/dist/support.html
Proposed privacy URL after merge: https://lavender333.github.io/truckload/dist/privacy.html

Review notes draft: No login is required in the current local-only build. Enter a pickup, delivery, load payment and mileage, then choose Estimate my profit. Save the estimate and enter final costs/completion date in Saved trips to populate earnings. Document reading takes place on-device; OCR downloads engine/language resources. Update these notes when subscriptions are implemented.

## Validation in this environment

Existing automated calculation, extraction, Safari-stream and UI-wiring checks passed. Added isolated native export tests cover success, cancellation, failed writes and browser fallback. Capacitor generation and sync succeeded. Browser smoke test covers calculation/save/navigation and policy pages. Native compilation, actual iPhone sharing, camera and App Store validation remain unverified.

References: https://capacitorjs.com/docs/ios • https://capacitorjs.com/docs/apis/filesystem • https://developer.apple.com/app-store/review/guidelines/
