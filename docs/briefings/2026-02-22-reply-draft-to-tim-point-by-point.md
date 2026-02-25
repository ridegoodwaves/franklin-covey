# Sent Reply to Tim (Record)

**Date Sent:** 2026-02-22  
**Status:** Sent

**Status Update:** ALP-135 roster is now received for MVP import, and the `FY26 ALP 136_EF 1 Coaching Bios.xlsx` participant-context file is explicitly logged as post-MVP (not integrated into selector/matching logic for March launch). As of 2026-02-25, staging schema migration is applied, USPS baseline data is seeded, and staging email controls now enforce outbound kill-switch + shared guard before send.

I’m aligned on all three points and agree that is the best way for us to move forward. It was a good call to hold on sharing dates until we aligned.

To make it unambiguous, I suggest we present two options as follows:

- Path A: Build directly in FC AWS from day one. This results in lower security friction but creates a higher risk for the planned launch in March.
- Path B (Recommended): Launch MVP on Vercel + Supabase bridge with pre-launch controls while the VSA is in progress. This protects the March launch, followed by a dependency-driven migration to FC AWS (targeting ~30 days post-launch).

I agree with you on asking FC to explicitly choose the tradeoff. If they choose Path A, we will need to explicitly re-baseline the March 2 date as at-risk and align on revised dates. When you message them, what do you think about explicitly listing the following FC-owned dependencies, so they can review how we are thinking about this and also add any other important items that we may need to be aware of?

- Okta app setup
- SendGrid access and domain/DNS authorization
- FC GitHub access
- DevOps bandwidth (Mike/Ivan)
- VSA/legal turnaround

And if they are going to select path B, then to protect the March 2 launch plan date, we must request a decision by EOD Feb 23, 2026.
