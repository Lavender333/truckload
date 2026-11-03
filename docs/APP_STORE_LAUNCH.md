# Truckload iOS launch plan — implementation checklist

## Current limitations
This branch prepares the existing static browser application for an iOS Capacitor build. It **does not** implement authentication, cross-device sync, subscriptions, cloud collection, or a database. Do not claim those features are available. Production launch with those promised features is blocked until the deferred backend phase.

## iOS build (requires macOS + Xcode)
1. Install Node.js, Xcode and CocoaPods as required by the selected Capacitor version.
2. Run `npm install`, then `npm run ios:add`, `npm run ios:sync`, `npm run ios:open`.
3. Confirm the proposed bundle ID `online.truelavender.truckload` is available in the True Lavender Apple Developer account; change it if needed.
4. Configure the Apple development team, signing, version, app icon, launch screen and deployment target in Xcode.
5. Test on a **physical iPhone**: navigation, CSV imports/exports, document picker, PDF viewing, OCR resource downloads, IndexedDB persistence, app relaunch, offline handling, storage warnings, and accessibility.
6. Archive and upload through Xcode to App Store Connect. Invite internal TestFlight testers first. External TestFlight testing may require beta app review.
7. Capture **actual** App Store screenshots from supported iPhone simulator/device sizes; do not fabricate screenshots or imply testing occurred.

## Subscriptions — not yet implemented
- Configure subscription group and products in App Store Connect.
- Implement native StoreKit 2 or an appropriately maintained Capacitor purchase integration.
- Display full billed price, period, trial terms if any, privacy policy, terms of use, and restore purchases.
- Validate transactions and subscription status securely, handle renewal, refunds, expiration and device changes.
- Test with StoreKit sandbox/TestFlight before enabling a paid gate.
- Do not rely on localStorage to determine subscription entitlements.

## Driver accounts and sync — deferred backend
- Plan sign-up, sign-in, password reset, verified email, account settings and account deletion.
- A functioning account requires secure identity services. Sync requires authenticated server storage and per-user authorization.
- Plan migration from existing localStorage keys and IndexedDB documents only after explicit user confirmation, with conflict resolution and no silent uploads.
- Encrypt sensitive records in transit and at rest; restrict access by user; define backup, retention, deletion and breach response.
- Do not expose registration or cloud sync controls as functional until implemented.

## App Store Connect
- Complete app name, subtitle, description, keywords, category, age rating, support URL, privacy policy URL, App Privacy data types, encryption export-compliance responses, review contact and demo access.
- Provide a real support contact and data-deletion request process.
- Check Apple review guideline 4.2: a thin website wrapper may be rejected for insufficient app-like functionality; test and add native value as needed.
- Privacy labels must reflect **actual** shipped collection and third-party SDK behavior, not future planned features.

## Release gate
**Do not submit as a fully functional multi-device subscription app** until account backend, synchronization, StoreKit payments, privacy/deletion flow and physical-device QA pass.
