# Smoke Test Results — 2026-02-28

**Run by:** Claude (browser automation via Chrome MCP)
**Date:** 2026-02-28
**Target URL:** `https://franklin-covey-git-feat-testing-i-6cf90b-ridegoodwaves-projects.vercel.app`
**Branch:** `feat/testing-infrastructure-phase1`
**Result:** PASS (6/6 scenarios tested, 3 skipped per request)

---

## Results

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Participant email verify | PASS | Valid email redirects to /select-coach; invalid shows inline error "We couldn't find your email" |
| 2 | Coach cards load | PASS | 3 cards with photos, credentials, location, bio. Minor: Devi McFadden bio has raw `#` markdown prefix |
| 3 | Remix one-way door | PASS | Confirmation dialog, new coaches loaded, "No More Refreshes Available" after use, persists on refresh |
| 4 | Selection + confirmation | PASS | Profile modal, confirm dialog ("This choice is **final**"), redirect to /confirmation with coach card + booking button |
| 5 | Returning participant redirect | PASS | Re-entering same email redirects to /participant/confirmation?already=true |
| 6 | Capacity enforcement | PASS | API returns `atCapacity: false` for all coaches, `allAtCapacity: false`. Cap-20 exclusion not testable (only 2 selections in staging) |
| 7 | Coach magic link sign-in | SKIPPED | Per request — requires email delivery (Resend) |
| 8 | Admin magic link sign-in | SKIPPED | Per request — requires email delivery (Resend) |
| 9 | Selection window enforcement | SKIPPED | Per request — requires cohort with closed window |

---

## Test Participants Used

| Email | Program | Action Taken |
|-------|---------|--------------|
| `kristy.l.anderson@usps.gov` | ALP-136 | Email verified, coaches loaded (Ashley Seeley, Beth Toth, Yuval Goren). No selection made. |
| `orlando.ayala@usps.gov` | ALP-136 | Full flow: verify → coaches (Beth Toth, Devi McFadden, Taylor Morrison) → remix (Helle Hegelund, Heather Vassilev, Darren Jones) → selected Helle Hegelund |
| `mark.a.betman@usps.gov` | ALP-136 | Verified, used for capacity check API validation only. No selection made. |

---

## Issues Found

### Minor — Bio Markdown Leak (P2)
**Scenario 2:** Devi McFadden's coach card bio preview starts with `# Kathy Devi McFadden, MBA, MDiv, PCC` — raw markdown heading character leaked into the rendered bio text. Source data likely has a markdown `#` that isn't being stripped during rendering.

**Impact:** Cosmetic only. Does not block functionality.
**Recommendation:** Strip leading `#` characters from coach bio content during import or rendering.

### Note — Remix 8-Second Auto-Cancel Timer
**Scenario 3:** The remix confirmation dialog has an 8-second auto-cancel timer (`setTimeout(() => setRemixPending(false), 8000)` in `select-coach/page.tsx:211`). This caused the dialog to dismiss before confirmation could be clicked during browser automation (round-trip latency). Not a real-user issue (humans click faster than automation round-trips), but worth noting:
- The timer is intentional UX (prevents stale confirmation state)
- Consider extending to 15 seconds for accessibility or increasing the visual countdown cue

---

## Environment Notes

- Staging deployment is on Vercel preview branch (`feat/testing-infrastructure-phase1`)
- Session cookies work correctly across page reloads
- Coach headshot signed URLs from Supabase Storage are loading correctly
- Staggered fade-in animations render properly
- All API routes respond correctly (verify-email, coaches GET, remix POST, select POST)
