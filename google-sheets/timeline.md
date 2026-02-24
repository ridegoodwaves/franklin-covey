# Timeline

Last synced: 2026-02-24

Canonical sources:
- `franklin-covey/docs/plans/2026-02-18-fc-project-plan.md`
- `franklin-covey/docs/plans/2026-02-12-feat-mvp-backend-vertical-slices-plan.md`
- `franklin-covey/docs/drafts/2026-02-18-mvp-contract-v1.md`

| Milestone | Target Date | Status | What Ships | Risk to Watch | Last Updated |
| --- | --- | --- | --- | --- | --- |
| Decisions locked | Feb 17, 2026 | Complete | Core MVP decisions are locked and documented. | None | 2026-02-18 |
| Coach scheduling links policy lock | Feb 20, 2026 | Complete | Tool-agnostic booking links accepted (Calendly/Acuity/etc.); missing-link coaches remain selectable with coach-outreach fallback messaging. | If remaining links arrive late, manual outreach workload increases. | 2026-02-20 |
| Kari timeline clarifications integrated | Feb 20, 2026 | Complete | ALP-138 corrected to Aug 7 and EF/EL reporting anchor confirmed as coach-selection-window start + 9 months. | None. | 2026-02-24 |
| Communications ownership lock | Feb 20, 2026 | Complete | USPS owns participant welcome sends; Andrea/Kari own coach access instructions before Mar 2. | Missing per-cohort send-date tracker fields can cause execution drift. | 2026-02-20 |
| Reminder ownership boundary confirmation | Feb 24, 2026 | Complete | Confirmed: participant reminders are manual by USPS/FC Ops; MVP system emails are coach/admin magic-link only. | Manual comm execution quality now becomes operational (not engineering) risk. | 2026-02-24 |
| Capacity and baseline lock | Feb 24, 2026 | Complete | EF/EL capacity confirmed at 20; MVP participant planning baseline confirmed at 400. | Per-cohort participant allocation details still required for overlap validation. | 2026-02-24 |
| Security/tier baseline lock | Feb 21, 2026 | In Progress | Vercel Pro + Supabase Pro decision and activation; security baseline references documented. | Delay here increases launch risk around support, retention, and readiness. | 2026-02-19 |
| Environment isolation setup | Feb 20, 2026 (2:00 PM CT) | In Progress | Separate Vercel/Supabase staging and production projects with environment-scoped secrets. | Delays here push all auth/email and import testing. | 2026-02-19 |
| Staging email safety gates | Feb 20, 2026 (2:00 PM CT) | In Progress | Sandbox sending, hard allowlist, and proof test log complete. | Missing gate creates accidental-send risk during QA. | 2026-02-19 |
| Phase 0 setup | Feb 18-21, 2026 | In Progress | Database + auth foundation + import scripts + environments. | Waiting on FC data package, sender-domain confirmation, and environment credentials. | 2026-02-19 |
| Staging ready | Feb 25, 2026 | Committed | Slice 1 running on Vercel/Supabase with smoke checks. | Depends on Phase 0 completion and clean seed/import data. | 2026-02-18 |
| Kari beta day | Feb 26, 2026 | Committed | End-to-end participant flow test on staging. | Needs coach data and first participant lists loaded first. | 2026-02-18 |
| Slice 1 live | Mar 2, 2026 | Hard Deadline | Participant access-code entry, coach selection, remix, confirmation + scheduling link. | Data inputs and USPS participant email execution are the main launch risks. | 2026-02-24 |
| Slice 2 live | Mar 9, 2026 | Hard Deadline | Coach/admin sign-in, coach dashboard, session logging. | Coach access/onboarding timing still needs FC confirmation. | 2026-02-18 |
| Slice 3 live | Mar 16, 2026 | Hard Deadline | Admin import, KPIs, nudges, exports, print views. | P1 policy decisions must be closed by Mar 9. | 2026-02-18 |
