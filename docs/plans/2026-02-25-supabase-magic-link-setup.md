# Magic-Link Email Sender Setup (Superseded Draft)

**Date:** 2026-02-25  
**Goal (historical):** Coach/admin magic-link emails use a verified custom sender domain.

> **Status (2026-02-28 lock):** This draft is superseded by current source-of-truth docs.
> - Auth model for MVP is **custom magic-link routes + signed portal session**, not Supabase Auth-managed sign-in.
> - Email delivery remains **Resend-backed** for MVP.
> - Preferred sender domain is `onusleadership.com` (or approved verified fallback).
>
> Use:
> - `docs/plans/2026-02-18-fc-project-plan.md`
> - `docs/plans/2026-02-22-environment-split-execution-runbook.md`
> - `docs/plans/2026-02-27-chore-production-launch-and-smoke-test-plan.md`
> for active implementation guidance.

## Decision (Historical)

- Original draft assumed Supabase Auth magic links for coach/admin sign-in.
- Sender domain target in this draft was `coachinginnovationlab.com`.

## Required Setup

1. Verify approved sender domain in email provider (Resend) with DNS (SPF/DKIM).
2. If using Supabase Auth in a future phase, configure custom SMTP in Supabase Auth email settings.
3. Set sender address to:
   - Staging: verified staging sender
   - Production: verified production sender (preferred on `onusleadership.com`)
4. Configure Supabase Site URL + allowed redirect URLs for staging and production.

## Important Safety Constraint

If client-side `signInWithOtp` is used directly, Supabase sends emails immediately and can bypass app-level guard logic.

To preserve staging safety controls (`EMAIL_OUTBOUND_ENABLED`, allowlist, sandbox discipline), use one of these patterns:

1. **Preferred:** call magic-link send through a server endpoint that runs guard checks first.
2. **Alternative:** keep direct Supabase send only if staging SMTP is fully isolated and restricted to test inboxes.

## Staging Test Checklist

1. Keep `EMAIL_OUTBOUND_ENABLED=false` (baseline hard block).
2. Trigger sign-in request and verify no send occurs.
3. Temporarily set `EMAIL_OUTBOUND_ENABLED=true`.
4. Verify allowlisted test inbox receives magic link and login succeeds.
5. Verify non-allowlisted recipient is blocked.
6. Set `EMAIL_OUTBOUND_ENABLED=false` again after test.

## References

- Supabase magic-link/OTP auth (JavaScript): https://supabase.com/docs/reference/javascript/auth-signinwithotp
- Supabase admin link generation: https://supabase.com/docs/reference/javascript/auth-admin-generatelink
