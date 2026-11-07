# Truckload iPhone build and signing

## Build on a Mac

The checked-in `ios/` project uses Swift Package Manager (SPM), Capacitor 7.6.10, and bundle ID `online.truelavender.truckload`. Keep this project: it contains the native settings. Do not run `cap add ios` on subsequent builds. No CocoaPods installation is needed.

From the repository root, with Node 22+ and Xcode installed:

```sh
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
npm ci
npm test
npm run ios:sync
npm run ios:build:simulator
npm run ios:open
```

Open `ios/App/App.xcodeproj`, not a CocoaPods `.xcworkspace`. The project's internal workspace resolves SPM dependencies. `dist/` contains the website assets. Run `npm run build:cloud` after editing the cloud client source; sync copies the assets into the ignored native `public/` directory. Run sync after changing web assets or Capacitor configuration. Commit native source, package-lock.json and Package.resolved, not generated public assets or build output.

The initial Capacitor 7.6.10 CLI incorrectly lowercases the SPM option before testing it and can report CocoaPods missing. This project was generated using the CLI's bundled SPM template and add routine with the package manager explicitly set to SPM. Normal `cap sync ios` works; regenerating is unnecessary.

GitHub Actions now runs `npm ci`, tests, sync and the unsigned simulator build against this checked-in project. It runs on relevant pushes, pull requests and manual dispatch. Download the project artifact and open `ios/App/App.xcodeproj`; that artifact already contains synced web assets. The simulator artifact cannot be installed on a physical iPhone.

## Automatic signing and installation

1. In Xcode **Settings → Accounts**, sign in to the Apple Account that owns the intended development team. Keep credentials in Xcode/Keychain.
2. Open the project, select the blue **App** project, then **TARGETS → App → Signing & Capabilities**. **Automatically manage signing** is already enabled for Debug and Release. The selected team is **True Lavender LLC** (`24YM7QGF6R`), as requested by the owner. This public team identifier is not a signing secret; certificates and provisioning profiles remain outside Git.
3. Verify that your team owns `online.truelavender.truckload`. Do not change the bundle ID if this is an update to an existing app: that would create a separate app/storage container. Resolve registration conflicts with the owner.
4. Connect and unlock the iPhone. Accept **Trust This Computer** if requested. Enable **Settings → Privacy & Security → Developer Mode** on the phone if Xcode requests it; restart and confirm as prompted.
5. In Xcode choose scheme **App** and the physical **iPhone** destination, then **Product → Run**. Allow Xcode to register the device and manage provisioning. Resolve any account agreements or membership prompts in your own account.
6. If iOS asks to trust the developer, use **Settings → General → VPN & Device Management**. Launch Truckload and follow the device checklist below.

Apple's [device installation instructions](https://help.apple.com/xcode/mac/current/en.lproj/dev5a825a1ca.html) describe automatic signing. TestFlight/App Store distribution requires Apple Developer Program access and a separate archive/distribution step. No certificates, private keys or provisioning profiles belong in this repository.

## Verification on November 4, 2026

- Mac: Xcode 26.3, build 17C529; Node 24.17.0.
- Clean `npm ci`, Capacitor doctor and asset sync passed.
- All 16 Node checks passed. Fixed a stale mailto assertion and added mocked Web3Forms success, HTTP failure, provider rejection, network failure and timeout checks. No real support message was sent.
- Unsigned Debug simulator build passed, including arm64 and x86_64 compilation; installed and launched on an iPhone 17 Pro simulator running iOS 26.3. Runtime reported **WebView loaded**.
- Native safe-area adjustment is automatic so the app header avoids the camera/status area.
- Chromium and WebKit browser checks passed across seven widths (320–1440 pixels), covering six main tabs, trip calculation/save, fuel and business forms. Declining analytics persists across reload, and GTM remains unloaded. This is browser coverage, not equivalent to physical-device testing.
- Follow-up: the owner selected True Lavender LLC. Automatic signing succeeded for team `24YM7QGF6R`; a signed Debug device build passed and installed on the paired iPhone 17e running iOS 27.2. Device launch succeeded and its runtime reported **WebView loaded**. This verifies installation/startup only; interactive physical-device workflows remain pending. No distribution archive, TestFlight upload or App Store validation has completed.
- The GitHub simulator workflow also passed: https://github.com/Lavender333/truckload/actions/runs/41884857363 .

## Native and release review

- Deployment target: iOS 14.0, matching this Capacitor template. Only iOS 26.3 simulator runtime has been tested; older supported iOS versions need compatibility testing (including PDF/OCR).
- Version/build: template defaults 1.0 / 1. Confirm release numbering before distribution.
- App icon and launch screen: Capacitor template placeholders are included so builds work; replace with approved Truckload branding before release.
- No location, microphone, push, tracking or native camera plugin/capability was added. There are no permission usage descriptions. Test the HTML file chooser's photo/camera options on a physical phone and add accurate descriptions only for capabilities actually used.
- Capacitor and Cordova framework privacy manifests are present in the built app. They do not describe Web3Forms or the remotely configured GTM container. Review actual network activity and container tags before finalizing App Privacy answers; do not claim “no data collected.” Support sends email/message contents to Web3Forms. Optional analytics may process identifiers and network metadata; the consent banner alone does not establish Apple tracking compliance. If configured tags perform tracking, resolve ATT requirements before release.
- Review the privacy policy's older “if analytics ... introduced” wording against its existing optional-analytics section. Confirm public support/privacy links, OCR CDN behavior, privacy labels, encryption answers, screenshots, age rating and review notes. The pending GA4 configuration is unchanged.
- Check placeholders/disabled account and purchase screens against Apple's completeness requirements. Driver accounts and manual private cloud backup are now enabled. Subscriptions remain disabled. App Store acceptance/minimum functionality has not been established.

References: [Capacitor privacy manifests](https://capacitorjs.com/docs/v7/ios/privacy-manifest), [Apple SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/), [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

## Physical-device checklist

- [x] Install and launch signed app on the physical iPhone; confirm WebView loaded through device console.
- [ ] Rotate, navigate all seven tabs; check keyboard, safe areas and readable text.
- [ ] Calculate, save, reopen and delete a test trip; confirm totals and persistence after force quit.
- [ ] Import diesel CSV and PDF/photo rate confirmations, review OCR and open originals.
- [ ] Export trips/fuel/backup and confirm files actually appear in Files; browser Blob downloads need native-device verification.
- [ ] Test offline calculator, first-use OCR network needs, background/resume and relaunch.
- [ ] Test consent allow/decline/revocation and inspect actual analytics requests.
- [ ] Submit an explicitly authorized support test and confirm recipient delivery.
- [ ] Delete disposable test data and verify deletion after relaunch, including documents.

The app's WebView storage is separate from Safari. Existing Safari data is not migrated automatically. Keep original documents and exports; do not delete real user data for testing. Local storage keys, calculator logic, Web3Forms and consent code remain unchanged.

## Cloud-enabled publication — November 7, 2026

The tested backend branch was fast-forwarded to main and pushed at `aacfb84`. GitHub Pages deployment succeeded and the public cloud configuration was verified enabled. The signed physical-device build succeeded with automatic True Lavender signing. Installation initially failed because the device connection reset, then succeeded on retry on the paired iPhone 17e, preserving the bundle identifier and existing app container. The updated app also launched successfully through device controls. Live authenticated backup/restore and interactive device QA remain pending.

## Analytics update — November 7, 2026

Removed the automatic analytics popup. Website users can opt in or turn analytics off under Account & privacy; fresh installs default off. The native Capacitor app blocks Google Tag Manager regardless of a saved consent choice and hides the website opt-in buttons. This avoids enabling unreviewed third-party tags inside the app. A custom website consent control is not a substitute for Apple App Tracking Transparency if tracking is introduced later.

Chromium and WebKit checks verified no popup, no initial Google requests, explicit website opt-in and revocation, and native blocking even with previously granted consent. The 22 unit/database tests and mobile/cloud browser suites passed. Privacy disclosure was updated. App Store privacy answers must still accurately cover cloud accounts/backups and support submissions; this change does not establish overall App Store approval. See https://developer.apple.com/app-store/user-privacy-and-data-use/ .
