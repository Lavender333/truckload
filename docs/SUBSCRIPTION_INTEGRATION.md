# Apple subscription integration — pending native implementation

**This is not a working Apple subscription integration.** The Account & privacy UI explicitly disables purchasing and restoration until native StoreKit integration is built and verified. Never claim billing is live.

## Requirements before activation
1. Obtain the approved subscription product identifiers, duration, prices, and trial terms from App Store Connect. Do not hardcode or invent a price.
2. Add StoreKit 2 native purchase and restore implementation, or a maintained Capacitor StoreKit plugin, to the generated iOS project.
3. Fetch product display name, price, period and introductory terms from StoreKit and display the billed amount prominently before purchase.
4. Implement verified transaction handling, current entitlement refresh, renewal/expiration/refund/revocation handling, and restore purchases.
5. For cross-device entitlements, implement secure server-side validation when the deferred backend phase resumes. Never grant paid access from localStorage alone.
6. Include functioning privacy policy and terms-of-use links in the purchase screen and App Store listing.
7. Test on physical iPhone with StoreKit sandbox and TestFlight; confirm cancellation and restoration.

## Current release gate
Subscription purchase and restore controls remain disabled. Public paid-subscription release is blocked until the above is complete.
