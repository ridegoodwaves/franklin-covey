---
status: pending
priority: p3
issue_id: pr4
tags: [tooling, safety, email, validate-env-safety]
---

# validate-env-safety.mjs Blocks EMAIL_OUTBOUND_ENABLED=true on Staging but Email Guard Already Does This

## Problem Statement

`scripts/validate-env-safety.mjs` hard-fails if `EMAIL_OUTBOUND_ENABLED` is not `"false"` in staging:

```javascript
if (String(env.EMAIL_OUTBOUND_ENABLED).toLowerCase() !== "false") {
  failures.push('Staging requires EMAIL_OUTBOUND_ENABLED="false"');
}
```

This is correct as a pre-deploy safety gate. However, the `evaluateEmailGuard` function in `src/lib/email/guard.ts` also blocks all outbound email if `EMAIL_OUTBOUND_ENABLED` is not `"true"` — meaning the application itself would never send email in staging regardless of the flag. The validate-env-safety script layer is redundant but adds friction for any legitimate staging email testing scenario.

More importantly, the staging example has `EMAIL_OUTBOUND_ENABLED=false` but `EMAIL_MODE=sandbox` and `EMAIL_ALLOWLIST` set — these sandbox/allowlist settings are only useful if outbound is `true`. The combination of `EMAIL_OUTBOUND_ENABLED=false` + `EMAIL_MODE=sandbox` is valid but means the allowlist is irrelevant (emails are never sent).

The intent appears to be: staging can send sandbox email to allowlisted addresses. But the current default blocks outbound entirely. This creates a situation where staging email testing requires changing `EMAIL_OUTBOUND_ENABLED` to `true` AND updating the validate-env-safety script's expectation — two changes instead of one.

## Findings

File: `/Users/amitbhatia/.cursor/franklin-covey/scripts/validate-env-safety.mjs` (lines 120-143)

```javascript
if (appEnv === "staging") {
  if (env.EMAIL_MODE !== "sandbox") failures.push(...)
  if (isBlank(env.EMAIL_ALLOWLIST)) failures.push(...)
  if (String(env.EMAIL_OUTBOUND_ENABLED).toLowerCase() !== "false") failures.push(...)
  ...
}
```

File: `/Users/amitbhatia/.cursor/franklin-covey/.env.staging.example`

```
EMAIL_MODE=sandbox
EMAIL_ALLOWLIST=amit@example.com,tim@example.com
EMAIL_OUTBOUND_ENABLED=false
```

## Proposed Solutions

Change the staging validation to allow `EMAIL_OUTBOUND_ENABLED=true` in staging when `EMAIL_MODE=sandbox` AND `EMAIL_ALLOWLIST` is non-empty. Enforce that production cannot have `EMAIL_MODE=sandbox`.

The guard logic is the true safety layer. The validate script should verify the guard is correctly configured, not independently block functionality.

Updated staging rule:

```javascript
if (appEnv === "staging") {
  if (env.EMAIL_MODE !== "sandbox") failures.push('Staging requires EMAIL_MODE="sandbox"');
  if (String(env.EMAIL_OUTBOUND_ENABLED).toLowerCase() === "true" && isBlank(env.EMAIL_ALLOWLIST)) {
    failures.push("Staging with EMAIL_OUTBOUND_ENABLED=true requires EMAIL_ALLOWLIST");
  }
  // Remove hard requirement that EMAIL_OUTBOUND_ENABLED=false
}
```

## Acceptance Criteria

- [ ] Staging can use `EMAIL_OUTBOUND_ENABLED=true` when `EMAIL_MODE=sandbox` and allowlist is set
- [ ] Staging still cannot use `EMAIL_MODE=live`
- [ ] Production still requires `EMAIL_MODE=live` and `EMAIL_OUTBOUND_ENABLED=true`
- [ ] validate-env-safety test suite updated if tests exist

## Work Log

- 2026-02-25: Identified during PR #4 review — minor friction point, p3 priority
