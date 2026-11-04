# Truckload iPhone build and signing

The GitHub Actions workflow **iOS Xcode project and simulator build** generates an Xcode project from the checked-in `dist/` site and attempts an **unsigned simulator build** on a hosted Mac. It does **not** sign an iPhone app, install on a physical iPhone, or submit to TestFlight.

## Get the generated project

1. In GitHub, open **Actions → iOS Xcode project and simulator build → Run workflow**.
2. Wait for the job to finish. Under **Artifacts**, download `truckload-ios-xcode-project`.
3. Unzip on a Mac with Xcode installed. Open `ios/App/App.xcworkspace` (not the .xcodeproj).
4. The generated native project is disposable: rerun the workflow after website changes to regenerate it.

## Configure signing on your Mac

1. In Xcode, open **Settings → Accounts** and sign in with your Apple Account. An active Apple Developer Program membership is needed for TestFlight/App Store distribution.
2. Select the **App** target → **Signing & Capabilities**. Choose your Apple Developer **Team** and turn on **Automatically manage signing**.
3. Verify the bundle identifier `online.truelavender.truckload` is available in your Apple Developer team. If unavailable, choose a unique ID and update `capacitor.config.json` to match for future builds.
4. Set the correct deployment target, version and build number, and add app icons and required usage descriptions before distributing. Do not put signing certificates, API keys or provisioning profiles into this public repository.
5. Select your connected iPhone as the run destination and press **Run**. If prompted, enable Developer Mode on the iPhone and trust the developer certificate.
6. For TestFlight, choose **Product → Archive**, then **Distribute App → App Store Connect**. Complete App Store Connect metadata and compliance questions.

## Physical iPhone test checklist (not yet performed)

- [ ] Install and launch from Xcode on a real iPhone
- [ ] Navigate every Truckload tab and confirm no content is clipped
- [ ] Enter, save, reopen and delete a trip; confirm totals
- [ ] Import a diesel CSV and review calculated gallons/costs
- [ ] Upload and review a PDF/photo rate confirmation using iOS file/photo permissions
- [ ] Export a backup and locate it in Files
- [ ] Delete local data and verify it stays deleted after relaunch
- [ ] Submit a support question and verify delivery to the recipient inbox
- [ ] Test offline behavior and app resume after force quit
- [ ] Check privacy disclosure against actual network requests and permissions

**Important:** Web data in the Capacitor app is stored in the app's own WebView storage, separate from Safari. No cloud account sync exists. Subscriptions and account login remain unimplemented; do not present them as working in App Store metadata.

## Limitations

This workflow can verify compilation for an iOS Simulator but cannot test an actual iPhone or configure your private signing identity. A Mac with Xcode and access to your Apple Developer team is required for the physical-device steps.
