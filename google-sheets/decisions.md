# Decisions

Last synced: 2026-02-19

Canonical sources:
- `franklin-covey/docs/plans/2026-02-18-fc-project-plan.md`
- `franklin-covey/docs/plans/2026-02-12-feat-mvp-backend-vertical-slices-plan.md`
- `franklin-covey/docs/drafts/2026-02-18-mvp-contract-v1.md`

| Topic | Approved Language | Avoid Saying | Business Impact | Date | Source |
| --- | --- | --- | --- | --- | --- |
| Commercial + decision support | Contract is signed and FC has a 24-hour decision owner through March 16. | Execution is blocked by contract or slow decisions. | Reduces delivery risk during milestone weeks. | 2026-02-18 | docs/plans/2026-02-18-fc-project-plan.md |
| MVP infrastructure | MVP runs on Vercel + Supabase. | We must wait for FC-hosted infrastructure before launch. | Team can build now and migrate later if needed. | 2026-02-18 | docs/plans/2026-02-18-fc-project-plan.md |
| Participant sign-in | One shared participant link + email OTP. | Unique link per participant is required. | Simple and scalable access for all cohorts. | 2026-02-18 | docs/drafts/2026-02-18-mvp-contract-v1.md |
| Coach/admin sign-in | Coaches and admins use /auth/signin and request a new magic link when needed. | Old magic-link emails should be reused forever. | Low-friction sign-in with clear repeat-login behavior. | 2026-02-18 | docs/drafts/2026-02-18-mvp-contract-v1.md |
| Coach pools | Separate pools: 15 coaches for MLP/ALP and 16 for EF/EL; no cross-pool matching in MVP. | All programs share one coach pool. | Matches FC operating model and avoids assignment drift. | 2026-02-18 | docs/plans/2026-02-18-fc-project-plan.md |
| Session outcomes + wording | Coaches log outcomes; no automatic Session 1 expiry in MVP. Forfeiture labels are locked in approved language. | System auto-forfeits sessions by deadline in MVP. | Keeps policy controlled by coaches/ops and language consistent in reporting. | 2026-02-18 | docs/plans/2026-02-18-fc-project-plan.md |
| Nudge timing | Day 0 = cohortStartDate; reminders on Day 5/10 and auto-assign on Day 15. | Nudges run from invitation date or first login. | Consistent schedule behavior across cohorts. | 2026-02-18 | docs/drafts/2026-02-18-mvp-contract-v1.md |
| Capacity counting | Coach load counts assigned and active/paused participants; invited, completed, and canceled do not count. | Invited-only or completed/canceled participants consume capacity. | Prevents overcounting and keeps assignment logic consistent. | 2026-02-18 | docs/plans/2026-02-18-fc-project-plan.md |
| Environment isolation | Staging and production run in separate Vercel and Supabase projects with separate secrets. | One shared environment is fine for MVP. | Reduces deployment and data-leak risk during launch period. | 2026-02-19 | docs/briefings/2026-02-18-status-note-for-tim-implementation-readiness.md |
| Staging data + email safety | Staging uses sanitized-only data and sandboxed email mode with a hard allowlist. | Staging can use raw production data and send to any address. | Prevents accidental external sends and lowers privacy risk during QA. | 2026-02-19 | docs/briefings/2026-02-18-status-note-for-tim-implementation-readiness.md |
