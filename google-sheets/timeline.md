# Timeline

Last synced: 2026-02-19

Canonical sources:
- `franklin-covey/docs/plans/2026-02-18-fc-project-plan.md`
- `franklin-covey/docs/plans/2026-02-12-feat-mvp-backend-vertical-slices-plan.md`
- `franklin-covey/docs/drafts/2026-02-18-mvp-contract-v1.md`

| Milestone | Target Date | Status | What Ships | Risk to Watch | Last Updated |
| --- | --- | --- | --- | --- | --- |
| Decisions locked | Feb 17, 2026 | Complete | Core MVP decisions are locked and documented. | None | 2026-02-18 |
| Environment isolation setup | Feb 20, 2026 (2:00 PM CT) | In Progress | Separate Vercel/Supabase staging and production projects with environment-scoped secrets. | Delays here push all auth/email and import testing. | 2026-02-19 |
| Staging email safety gates | Feb 20, 2026 (2:00 PM CT) | In Progress | Sandbox sending, hard allowlist, and proof test log complete. | Missing gate creates accidental-send risk during QA. | 2026-02-19 |
| Phase 0 setup | Feb 18-21, 2026 | In Progress | Database + auth foundation + import scripts + environments. | Waiting on FC data package, sender-domain confirmation, and environment credentials. | 2026-02-19 |
| Staging ready | Feb 25, 2026 | Committed | Slice 1 running on Vercel/Supabase with smoke checks. | Depends on Phase 0 completion and clean seed/import data. | 2026-02-18 |
| Kari beta day | Feb 26, 2026 | Committed | End-to-end participant flow test on staging. | Needs coach data and first participant lists loaded first. | 2026-02-18 |
| Slice 1 live | Mar 2, 2026 | Hard Deadline | Participant OTP, coach selection, remix, confirmation + scheduling link. | Data inputs and email setup are the main launch risks. | 2026-02-18 |
| Slice 2 live | Mar 9, 2026 | Hard Deadline | Coach/admin sign-in, coach dashboard, session logging. | Coach access/onboarding timing still needs FC confirmation. | 2026-02-18 |
| Slice 3 live | Mar 16, 2026 | Hard Deadline | Admin import, KPIs, nudges, exports, print views. | P1 policy decisions must be closed by Mar 9. | 2026-02-18 |
