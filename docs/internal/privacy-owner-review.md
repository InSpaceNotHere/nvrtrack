# NVRTRACK Privacy — internal owner / legal review notes

This document is **internal**. It is not rendered on `/privacy` and is not a public policy.

Public contact addresses (do not publish any forwarding destination):

- Privacy: `privacy@nvrtrack.com`
- Support: `support@nvrtrack.com`

Owner-controlled domain: `nvrtrack.com` (Email Routing is active). Do not expose the inbox that those addresses forward to.

## Unresolved questions (not legal conclusions)

- FTC Health Breach Notification Rule (HBNR) applicability requires legal review. Do not claim compliance or exemption.
- Consumer health/fitness privacy requirements require legal review. Do not claim HIPAA, CCPA, or similar compliance or exemption.
- Account deletion and complete data-export requirements should be evaluated. The product does not currently provide those self-service flows.
- Authentication email provider (for example, whatever sends Supabase confirmation or recovery mail) should be confirmed and disclosed if it is a processor.
- Hosting, logging, and processors should be periodically re-audited. Current verified application host is Vercel. Current app processors also include Supabase. USDA FoodData Central is source provenance for some reviewed built-in Common foods stored in NVRTRACK; it is not a current runtime processor and signed-in search text is not sent to USDA.
- Vercel platform logs and any optional Vercel Analytics (not present in this repository) should be confirmed separately. Do not describe unverified processing.
- Discovery source remains collected as a self-reported “how did you hear about us” field. Public copy states it may be used to understand discovery and is not used for behavioral ads or automated workout recommendations.
- Height remains optional, stored on the profile, editable, and unused for calorie calculation.
- No forced consent checkbox was added; revisit if a legal/product requirement is established.

## What must stay off the public page

- Internal draft labels such as `OWNER_LEGAL_REVIEW_DRAFT`
- Owner/legal review banners and checklists
- `[Owner review: ...]` annotations
- Database/migration implementation commentary
- Any forwarding destination inbox

