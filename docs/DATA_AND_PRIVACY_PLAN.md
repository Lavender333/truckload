# Truckload data inventory and privacy implementation plan

**Draft engineering inventory, not a published privacy policy.** Review with legal/privacy counsel before publication.

## Existing local-only behavior
The README describes localStorage for trips, settings, fuel and budgets; IndexedDB for rate-confirmation documents. These are currently device-local, not server-collected by True Lavender. Document OCR may download language/engine resources from external CDNs; inspect actual requests and vendor disclosures before finalizing privacy labels.

## Proposed future server-side data collection (NOT ACTIVE)
| Data | Purpose | Suggested access |
| --- | --- | --- |
| Account name, verified email, user ID | Sign-in, support | Driver + authorized support |
| Truck and company settings | Calculations | Driver |
| Trip estimates, finalized trips, expenses | History, cross-device sync | Driver |
| Fuel purchases and statement fields | Cost accounting | Driver |
| Uploaded rate confirmations | Document review and sync | Driver |
| Subscription entitlement and transaction references | Paid access | Billing service |
| Support question and reply email | Customer service | Support team |

Avoid collecting full fuel-card numbers, provider passwords, unnecessary location history, or raw spreadsheet columns unrelated to the service. Do not promise cross-device sync until implemented.

## Consent and user controls
- Before any first cloud upload, clearly explain which existing local records will be transferred; provide a user-initiated import/consent action.
- Show an in-app privacy explanation and links to the full privacy policy and terms.
- Provide export, deletion request, and in-app account deletion initiation when account creation exists.
- Explain retention, deletion of backups, support response process, and third-party processors.
- Make account deletion work across cloud records and stored documents; verify exceptions required by law.
- If analytics, crash reporting, tracking or push notifications are added, revisit consent, permission prompts and App Privacy labels.
- No location permission is needed for the currently documented manual trucking calculator. Request it only when a real location feature is implemented.

## Security acceptance criteria
Per-user authorization on every request; TLS; encrypted storage; secure key management; rate limiting; no public document buckets; audit logs without secrets; access reviews; incident response and deletion verification.

## Support contact
Proposed support inbox from product owner: antoinettewilliams@thetruelavender.online. Confirm inbox operation before publishing.
