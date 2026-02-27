# Supabase Magic-Link Setup (Sender: coachinginnovationlab.com)

**Date:** 2026-02-25  
**Goal:** Coach/admin magic-link emails use `@coachinginnovationlab.com` sender identity.

## Decision

- Use Supabase Auth magic links for coach/admin sign-in.
- Sender domain target: `coachinginnovationlab.com`.

## Required Setup

1. Verify `coachinginnovationlab.com` in email provider (Resend or SES) with DNS (SPF/DKIM).
2. In Supabase Auth email settings, configure custom SMTP using that provider.
3. Set sender address to:
   - Staging: `coaching-staging@coachinginnovationlab.com`
   - Production: `coaching@coachinginnovationlab.com`
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
