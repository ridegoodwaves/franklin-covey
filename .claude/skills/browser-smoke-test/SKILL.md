---
name: "browser-smoke-test"
description: "Structured browser smoke testing using Claude in Chrome for the FranklinCovey coaching platform."
---

# Browser Smoke Test Skill

Run functional and visual QA against the FranklinCovey coaching platform using Claude in Chrome MCP tools. Adapted from the Playwright Interactive Skill pattern — uses Chrome extension automation instead of a Playwright REPL.

## Preconditions

- Chrome is running with the Claude in Chrome extension active.
- The target environment is deployed and accessible.
- Test accounts are available: at least one participant email (roster-matched), one coach email, and one admin email.
- The smoke test checklist exists at `docs/checklists/pre-deploy-smoke-test.md`.
- For magic link flows, the human operator must check email and click the link manually. The skill will PAUSE and prompt for this.

## Invocation

```
/browser-smoke-test [target-url]
```

If no URL is provided, prompt the user for the target environment URL (e.g., `https://staging.example.com` or `http://localhost:3000`).

## Core Workflow

1. Read `docs/checklists/pre-deploy-smoke-test.md` to load the scenario inventory.
2. Call `mcp__claude-in-chrome__tabs_context_mcp` to discover the current browser state.
3. Create a dedicated test tab with `mcp__claude-in-chrome__tabs_create_mcp`.
4. Execute functional QA scenarios sequentially (Flows 1, 2, 3).
5. Run a separate visual QA pass on each portal's key pages.
6. Run viewport and overflow diagnostics via `mcp__claude-in-chrome__javascript_tool`.
7. Compile results and output to `docs/checklists/smoke-test-results-{YYYY-MM-DD}.md`.
8. Present the signoff checklist to the user.

## Session Management

- Always call `tabs_context_mcp` at the start of each session to get fresh tab state.
- Create ONE test tab and reuse it across all scenarios within a flow.
- Never reuse tab IDs from a previous or different session.
- If a tool returns an error indicating the tab doesn't exist, call `tabs_context_mcp` for fresh IDs.
- Do NOT close the user's other tabs. Only interact with your test tab.

## Dialog Safety

CRITICAL: Do NOT trigger JavaScript `alert()`, `confirm()`, or `prompt()` dialogs through your actions. Browser dialogs block the Chrome extension from receiving further commands.

- Avoid clicking buttons that may trigger confirmation dialogs (e.g., delete buttons, "Are you sure?" flows) unless you have verified they use custom modals, not native browser dialogs.
- The FranklinCovey app uses `window.confirm()` for the unsaved-changes warning on the engagement detail page. Do NOT trigger this during automated testing — save or clear the form state before navigating away.
- The remix confirmation on the coach selector also uses a custom modal (safe to interact with).
- If you accidentally trigger a dialog and lose responsiveness, inform the user to manually dismiss it in Chrome.

## Functional QA Protocol

For each scenario step:

1. **Navigate** using `mcp__claude-in-chrome__navigate`.
2. **Locate elements** using `mcp__claude-in-chrome__find` with descriptive selectors.
3. **Fill forms** using `mcp__claude-in-chrome__form_input`.
4. **Click and interact** using `mcp__claude-in-chrome__computer` (click, scroll).
5. **Capture evidence** using `mcp__claude-in-chrome__read_page` after each significant state change.
6. **Check console** using `mcp__claude-in-chrome__read_console_messages` with a `pattern` filter (e.g., `"error|Error|ERR"`) after each page load. Filter to avoid verbose output.
7. **Check network** using `mcp__claude-in-chrome__read_network_requests` to catch 4xx/5xx responses.

Rules:
- Use real user interactions (click, type) for signoff — not `javascript_tool` to manipulate state.
- `javascript_tool` is for diagnostics and inspection only, not for driving the application.
- Wait for page loads to settle before capturing evidence. If a page uses animations, pause briefly.
- Record the result of each checklist item as PASS, FAIL, or SKIP (with reason).

## Visual QA Protocol (Separate Pass)

After all functional scenarios pass, run a dedicated visual inspection:

1. Navigate to each portal's primary page.
2. Capture a screenshot with `read_page`.
3. Inspect for:
   - FranklinCovey branding visible (logo, brand colors).
   - Layout is balanced — no large empty gaps or crushed elements.
   - Status badges display correct colors (emerald for completed, amber for attention).
   - No content is clipped, overflowed, or pushed off-screen.
   - No stuck loading spinners or skeleton states.
   - No broken images (placeholder avatars are expected for coaches without photos).
   - Text is legible — no overlapping, no truncation that loses meaning.
   - Animations completed — no elements stuck at `opacity: 0`.
4. Test mobile viewport:
   - Use `mcp__claude-in-chrome__resize_window` to set width 390, height 844.
   - Capture screenshot. Verify the page is functional (not broken).
   - Restore desktop viewport (width 1440, height 900) after mobile check.

## Viewport Diagnostics

Run this diagnostic on each portal's main page via `mcp__claude-in-chrome__javascript_tool`:

```javascript
JSON.stringify({
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight,
  scrollWidth: document.documentElement.scrollWidth,
  scrollHeight: document.documentElement.scrollHeight,
  canScrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  bodyOverflow: getComputedStyle(document.body).overflow,
  resourceErrors: performance.getEntriesByType('resource')
    .filter(r => r.responseStatus >= 400)
    .map(r => r.name.split('/').pop())
    .slice(0, 10)
})
```

Fail conditions:
- `canScrollX: true` on pages that should not scroll horizontally (all portal pages).
- Any entries in `resourceErrors` (broken assets).

## Test Flows

### Flow 1: Participant Portal (Scenarios 1-5)

**Scenario 1 — Email Verification**
```
1. navigate → {TARGET_URL}/participant
2. read_page → verify FC branding, email input visible
3. read_console_messages (pattern: "error|Error") → check clean
4. form_input → enter valid participant email
5. computer → click submit button
6. read_page → verify redirect to /participant/select-coach
7. navigate → {TARGET_URL}/participant (reset)
8. form_input → enter unknown email (e.g., "nobody@test.com")
9. computer → click submit
10. read_page → verify inline error message (no redirect)
```

**Scenario 2 — Coach Selection Cards**
```
1. (Continuing from successful Scenario 1 redirect)
2. read_page → verify exactly 3 coach cards visible
3. Inspect each card: photo/placeholder, name, credentials, location, bio
4. Verify staggered animation completed (cards not stuck at opacity 0)
5. find → locate "See Different Coaches" button, verify enabled
6. read_console_messages (pattern: "error") → check clean
```

**Scenario 3 — Remix (One-Way Door)**
```
1. computer → click "See Different Coaches"
2. read_page → verify confirmation modal appears
3. computer → click confirm
4. read_page → verify 3 NEW coach cards (different from original)
5. find → verify remix button is disabled or hidden
6. navigate → reload the page
7. read_page → verify remix button remains disabled (server-backed state)
```

**Scenario 4 — Coach Selection and Confirmation**
```
1. computer → click "Select" on a coach card
2. read_page → verify confirmation modal with coach name
3. computer → click confirm
4. read_page → verify redirect to /participant/confirmation
5. Inspect: selected coach card, "Book your first session" button
6. read_console_messages (pattern: "error") → check clean
```

**Scenario 5 — Returning Participant**
```
1. navigate → {TARGET_URL}/participant
2. form_input → enter the SAME participant email used in Scenario 1
3. computer → click submit
4. read_page → verify redirect to /participant/confirmation (already selected)
```

### Flow 2: Coach Portal (Scenario 7 + Slice 3 Wiring)

**Scenario 7a — Magic Link Sign-In**
```
1. navigate → {TARGET_URL}/auth/signin
2. form_input → enter known coach email
3. computer → click submit
4. read_page → verify "Check your email" confirmation shown
5. *** PAUSE — ASK USER: "Please check email for the magic link, click it, and tell me when the coach dashboard has loaded." ***
6. (After user confirms) read_page → verify coach dashboard loaded
7. Inspect: coach name displayed, KPI cards visible
```

**Scenario 7b — Coach Dashboard Inspection**
```
1. read_page → capture dashboard state
2. Verify KPI cards: Active Engagements, Sessions Logged (7d), Completion Rate
3. Inspect Needs Attention section: count badge, overdue items (if any)
4. Inspect My Engagements section: tabs (Active/Completed), engagement rows
5. read_console_messages (pattern: "error") → check clean
6. read_network_requests → check for 4xx/5xx
```

**Scenario 7c — Engagement Detail + Session Logging**
```
1. computer → click on an active engagement row
2. read_page → verify engagement detail page loads
3. Inspect: participant email, program badge, status, progress indicator
4. Inspect: "Log Session" tab active, form fields visible
5. Inspect form fields: date input, topic dropdown, outcome dropdown, duration dropdown, private notes
6. form_input → select session date (today)
7. form_input → select a topic from dropdown
8. form_input → select an outcome from dropdown
9. form_input → select a duration
10. form_input → type private notes text
11. find → verify "Log Session" button is enabled
12. computer → click "Log Session"
13. read_page → verify session appears in Session History tab
14. read_console_messages (pattern: "error") → check clean
```

**Scenario 7d — Auto-Save on Edit**
```
1. computer → click "Edit" on the session just logged (in Session History)
2. read_page → verify form populates with session data
3. form_input → modify private notes text
4. (Wait 6 seconds for auto-save to trigger)
5. read_page → look for "Saved" indicator text
6. read_console_messages (pattern: "error") → check clean
```

**Scenario 7e — Navigation and Sign-Out**
```
1. find → locate "Back to Engagements" in top nav
2. computer → click it (form should be saved, no unsaved warning)
3. read_page → verify engagements list page loads
4. find → locate sign-out button in sidebar
5. computer → click sign-out
6. read_page → verify redirect to /auth/signin
```

### Flow 3: Admin Portal (Scenario 8)

**Scenario 8a — Magic Link Sign-In**
```
1. navigate → {TARGET_URL}/auth/signin
2. form_input → enter known admin email
3. computer → click submit
4. read_page → verify "Check your email" confirmation
5. *** PAUSE — ASK USER: "Please check email for the admin magic link, click it, and tell me when the admin dashboard has loaded." ***
6. (After user confirms) read_page → verify admin dashboard loaded
```

**Scenario 8b — Admin Dashboard Inspection**
```
1. read_page → capture dashboard state
2. Verify KPI cards: total engagements, completion rates, needs attention count
3. Inspect engagement table: rows visible, pagination working
4. Inspect sidebar: all nav items visible (Dashboard, Coaches, Import should show)
5. read_console_messages (pattern: "error") → check clean
```

**Scenario 8c — Dashboard Filtering**
```
1. find → locate program filter dropdown
2. form_input → select a specific program (e.g., MLP)
3. read_page → verify table filters to show only MLP engagements
4. find → locate search input
5. form_input → type a partial participant email
6. read_page → verify table filters to matching results
7. Clear filters and verify full list restores
```

**Scenario 8d — Coach Roster Page**
```
1. find → click "Coaches" in sidebar nav
2. read_page → verify coach roster page loads
3. Inspect: coach list with names, utilization percentages, active engagement counts
4. read_console_messages (pattern: "error") → check clean
```

**Scenario 8e — CSV Export**
```
1. find → click "Dashboard" in sidebar nav to return
2. find → locate export/download button
3. computer → click export button
4. (CSV download should trigger — verify no errors)
5. read_console_messages (pattern: "error") → check clean
6. read_network_requests → verify export endpoint returned 200
```

## Signoff Checklist

Before declaring the test complete, verify ALL of the following:

### Functional Signoff
- [ ] Every scenario step passed with real user interactions (not JS manipulation).
- [ ] Each checklist item has a recorded status: PASS, FAIL, or SKIP with reason.
- [ ] Auth flows completed end-to-end (with human-assisted magic link step).
- [ ] Data displayed on dashboard matches expectations (non-zero counts, real names).

### Visual Signoff
- [ ] Each portal's primary page was visually inspected via screenshot.
- [ ] FranklinCovey branding is present and correct on all pages.
- [ ] No content is clipped, overflowed, or pushed off-screen.
- [ ] Status badges display correct colors.
- [ ] Mobile viewport (390x844) was tested — pages are functional, not broken.

### Technical Signoff
- [ ] Console is clean on every page (no uncaught errors, no 4xx/5xx in network).
- [ ] Viewport diagnostics passed (no unexpected horizontal scroll).
- [ ] No broken images or missing assets (resourceErrors empty).

### Negative Confirmations
Explicitly confirm NONE of the following were observed:
- [ ] No JavaScript console errors on any page.
- [ ] No 4xx or 5xx network responses (excluding expected 401s on auth test).
- [ ] No broken images or missing static assets.
- [ ] No content clipped or overflowed outside its container.
- [ ] No stuck loading spinners or skeleton placeholder states.
- [ ] No blank/white pages on any route.
- [ ] No stale data (timestamps from the distant past suggesting seed data issues).

## Results Output

After all flows complete, write results to `docs/checklists/smoke-test-results-{YYYY-MM-DD}.md` using this template:

```markdown
# Smoke Test Results — {YYYY-MM-DD}

**Target URL:** {TARGET_URL}
**Run by:** Claude (browser-smoke-test skill) + human operator
**Date:** {date}
**Slice scope:** Full (Scenarios 1-9)

## Results

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Participant email verify | PASS/FAIL | |
| 2 | Coach cards load | PASS/FAIL | |
| 3 | Remix one-way door | PASS/FAIL | |
| 4 | Selection + confirmation | PASS/FAIL | |
| 5 | Returning participant redirect | PASS/FAIL | |
| 6 | Capacity enforcement | SKIP | Requires specific DB state |
| 7a | Coach magic link sign-in | PASS/FAIL | |
| 7b | Coach dashboard inspection | PASS/FAIL | |
| 7c | Session logging | PASS/FAIL | |
| 7d | Auto-save on edit | PASS/FAIL | |
| 7e | Navigation + sign-out | PASS/FAIL | |
| 8a | Admin magic link sign-in | PASS/FAIL | |
| 8b | Admin dashboard inspection | PASS/FAIL | |
| 8c | Dashboard filtering | PASS/FAIL | |
| 8d | Coach roster page | PASS/FAIL | |
| 8e | CSV export | PASS/FAIL | |
| 9 | Selection window enforcement | SKIP | Requires expired cohort |

## Visual QA

| Page | Desktop | Mobile (390x844) | Notes |
|------|---------|-------------------|-------|
| /participant | PASS/FAIL | PASS/FAIL | |
| /participant/select-coach | PASS/FAIL | PASS/FAIL | |
| /participant/confirmation | PASS/FAIL | PASS/FAIL | |
| /coach/dashboard | PASS/FAIL | PASS/FAIL | |
| /coach/engagements | PASS/FAIL | PASS/FAIL | |
| /coach/engagements/[id] | PASS/FAIL | PASS/FAIL | |
| /admin/dashboard | PASS/FAIL | PASS/FAIL | |
| /admin/coaches | PASS/FAIL | PASS/FAIL | |

## Viewport Diagnostics

| Page | Horizontal Overflow | Resource Errors | Status |
|------|-------------------|-----------------|--------|
| /participant | none | none | PASS |
| /coach/dashboard | none | none | PASS |
| /admin/dashboard | none | none | PASS |

## Negative Confirmations

- [ ] No JavaScript console errors on any page
- [ ] No 4xx/5xx network responses
- [ ] No broken images or missing assets
- [ ] No clipped or overflowed content
- [ ] No stuck loading states
- [ ] No blank pages

## Overall Result: PASS / FAIL

**Failures requiring attention:**
(List any failures with details)

**Notes:**
(Any observations, warnings, or follow-ups)
```

## Common Failure Modes

- **Tab not found error:** Call `tabs_context_mcp` to refresh tab IDs. Never cache tab IDs across sessions.
- **Page not loading:** Verify the target URL is correct and the environment is deployed. Check if the URL needs a trailing slash.
- **Magic link not received:** Check Resend dashboard for delivery status. Verify the email address matches a known coach/admin in the database. Check spam folder.
- **Console flooded with noise:** Use the `pattern` parameter on `read_console_messages` to filter (e.g., `"error|Error|ERR|fail|Fail"`). Ignore React hydration warnings in development.
- **Auto-save not triggering:** The debounce is 5 seconds. Wait at least 6 seconds after the last input before checking for the "Saved" indicator.
- **Extension unresponsive after dialog:** A native browser dialog (`alert`/`confirm`/`prompt`) was triggered. Ask the user to manually dismiss it in Chrome, then retry.
- **Form dropdowns not working:** Some dropdowns may be custom components (not native `<select>`). Use `computer` to click the dropdown trigger, wait for the menu to appear, then click the option.
- **Mobile viewport issues:** After using `resize_window`, some pages may need a reload to re-render correctly. Navigate to the page again after resizing.
