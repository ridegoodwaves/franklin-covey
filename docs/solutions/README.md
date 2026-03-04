# Solutions Knowledge Base

Documented solutions for the FranklinCovey Coaching Platform project. Each solution captures root cause analysis, working fixes, and prevention strategies to compound the team's knowledge.

## How to Search

Search by **tags** in YAML frontmatter or by **category** directory:

```bash
# Find solutions by tag
grep -r "calendly\|scheduling" docs/solutions/

# Find solutions by severity
grep -r "severity: high" docs/solutions/
```

## Solutions Index

### integration-issues/

| File | Title | Severity | Date |
|------|-------|----------|------|
| [calendly-api-scope-miscommunication.md](integration-issues/calendly-api-scope-miscommunication.md) | Calendly Integration Scope Miscommunication | High | 2026-02-11 |

### ui-bugs/

| File | Title | Severity | Date |
|------|-------|----------|------|
| [coach-selector-session-state-refresh-reset.md](ui-bugs/coach-selector-session-state-refresh-reset.md) | Coach Selector State Not Persisting Across Browser Refreshes | High | 2026-02-27 |

### security-issues/

| File | Title | Severity | Date |
|------|-------|----------|------|
| [nextjs-app-router-csp-client-navigation-blocks-third-party-resources.md](security-issues/nextjs-app-router-csp-client-navigation-blocks-third-party-resources.md) | CSP + Client-Side Navigation Blocking Third-Party Resources in Next.js App Router | High | 2026-03-01 |
| [participant-session-storage-carryover.md](security-issues/participant-session-storage-carryover.md) | Stale Participant Session Carryover Across Users | High | 2026-03-02 |

## Tags

| Tag | Solutions |
|-----|----------|
| #calendly | [calendly-api-scope-miscommunication](integration-issues/calendly-api-scope-miscommunication.md) |
| #stakeholder-communication | [calendly-api-scope-miscommunication](integration-issues/calendly-api-scope-miscommunication.md) |
| #scope-management | [calendly-api-scope-miscommunication](integration-issues/calendly-api-scope-miscommunication.md) |
| #architecture-decision | [calendly-api-scope-miscommunication](integration-issues/calendly-api-scope-miscommunication.md) |
| #partial-removal | [calendly-api-scope-miscommunication](integration-issues/calendly-api-scope-miscommunication.md) |
| #split-brain-state | [coach-selector-session-state-refresh-reset](ui-bugs/coach-selector-session-state-refresh-reset.md) |
| #session-persistence | [coach-selector-session-state-refresh-reset](ui-bugs/coach-selector-session-state-refresh-reset.md) |
| #coach-selector | [coach-selector-session-state-refresh-reset](ui-bugs/coach-selector-session-state-refresh-reset.md) |
| #participant-portal | [coach-selector-session-state-refresh-reset](ui-bugs/coach-selector-session-state-refresh-reset.md) |
| #next-js | [coach-selector-session-state-refresh-reset](ui-bugs/coach-selector-session-state-refresh-reset.md) |
| #state-management | [coach-selector-session-state-refresh-reset](ui-bugs/coach-selector-session-state-refresh-reset.md) |
| #csp | [nextjs-app-router-csp-client-navigation-blocks-third-party-resources](security-issues/nextjs-app-router-csp-client-navigation-blocks-third-party-resources.md) |
| #client-navigation | [nextjs-app-router-csp-client-navigation-blocks-third-party-resources](security-issues/nextjs-app-router-csp-client-navigation-blocks-third-party-resources.md) |
| #session-management | [participant-session-storage-carryover](security-issues/participant-session-storage-carryover.md) |
| #identity-boundary | [participant-session-storage-carryover](security-issues/participant-session-storage-carryover.md) |

## Statistics

- **Total solutions**: 4
- **Last updated**: 2026-03-02
