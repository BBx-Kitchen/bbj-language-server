# Phase 80: EM Token Security - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-04
**Phase:** 80-em-token-security
**Mode:** `--auto` — no user prompts; every question below was answered with the recommended option and logged inline.
**Areas discussed:** Fail-closed expiry shape, Windows owner-only ACL, Non-keychain backend notice, Validation trust window, Plan split and landing

`[--auto] Selected all gray areas: Fail-closed expiry shape, Windows owner-only ACL, Non-keychain backend notice, Validation trust window, Plan split and landing.`
`[auto] Context did not exist — created fresh. No checkpoint, no existing plans.`
`[auto] Todos: two matches (0.6, 0.4) reviewed, neither folded — keyword-only overlap; scope guardrail wins as in Phases 78/79.`

---

## Fail-closed expiry shape (TOKEN-01, #535)

| Option | Description | Selected |
|--------|-------------|----------|
| Three-valued result type | Extract a pure `JwtValidity` (`VALID`/`EXPIRED`/`MALFORMED`) with an injected clock; `isTokenExpired` delegates and returns true for anything not `VALID` (research Pitfall 5) | ✓ |
| Flip the three branches in place | Change the three `return false` sites to `return true` inside the existing method | |
| `isTokenWellFormed()` gate | Add a separate well-formedness check every caller must invoke first (issue's alternative wording) | |

`[auto] Fail-closed expiry — Q: "How should the three fail-open branches become fail-closed?" → Selected: "Three-valued result type" (recommended default)`
`[auto] Fail-closed expiry — Q: "Should performLogin check the token before storing it?" → Selected: "Yes, MALFORMED/EXPIRED is a login failure" (recommended; keeps fail-closed coherent — otherwise a non-JWT login 'succeeds' and every Run then reports expiry). Alternative: store as today and rely on the Run path.`
`[auto] Fail-closed expiry — Q: "Clock leeway for exp?" → Selected: "None; strict exp <= now, server absorbs skew". Alternative: 30–60 s leeway.`

**Notes:** Verified on `main` that there are four `return false` sites, not three; null/empty is classified `MALFORMED` too, with no behavioural change for callers (they check null first).

---

## Windows owner-only ACL (TOKEN-02, #536)

| Option | Description | Selected |
|--------|-------------|----------|
| ACL at creation (`acl:acl` attribute) | Pass a one-entry owner-only `FileAttribute<List<AclEntry>>` to `Files.createTempFile`; no broader-DACL window; pure ACL-builder function unit-tested on Linux | ✓ |
| Create then `setAcl` | Create with defaults, then replace the DACL via `AclFileAttributeView` (small window) — kept only as the fallback when principal lookup by name fails | |
| Keep per-user temp-dir reliance | Current fallback; rejected by TOKEN-02's wording ("rather than the current default-permission fallback") | |

`[auto] Windows ACL — Q: "How is owner-only achieved on Windows?" → Selected: "ACL at creation" (recommended default)`
`[auto] Windows ACL — Q: "What if neither POSIX nor ACL views exist?" → Selected: "Fail closed: throw IOException naming the temp dir" (recommended). Alternative: create with defaults and log a warning.`
`[auto] Windows ACL — Q: "How is the Windows half verified without a Windows CI runner?" → Selected: "Pure ACL-builder unit test + source guard + documented manual icacls check as a UAT item" (recommended). Alternative: add a windows-latest CI job (not requested; out of phase).`

---

## Non-keychain backend notice (TOKEN-03, #552)

| Option | Description | Selected |
|--------|-------------|----------|
| `PasswordSafeSettings.getProviderType()` behind one method | Map `ProviderType` to a plain `TokenBackend` enum inside a single `resolveBackend()`; unknown/exception → warn-worthy (Pitfall 7) | ✓ |
| Public `PasswordSafe.isMemoryOnly()` only | Stable API but cannot distinguish KeePass from keychain — misses half of #552 | |
| `PasswordSafeSettingsListener.TOPIC` subscription | Event-driven; extra lifecycle code, no extra coverage of the requirement | |

`[auto] Backend notice — Q: "How is the resolved backend detected?" → Selected: "PasswordSafeSettings behind one method" (recommended default)`
`[auto] Backend notice — Q: "What does 'one-time' mean?" → Selected: "Once per distinct non-keychain backend, persisted in PropertiesComponent; cleared when the backend returns to keychain" (recommended). Alternatives: once per IDE installation (hides later downgrades); once per session (re-nags every restart).`
`[auto] Backend notice — Q: "Where is it evaluated?" → Selected: "storeToken and getToken" (recommended; covers setting changed after login). Alternative: storeToken only.`
`[auto] Backend notice — Q: "Balloon or modal?" → Selected: "Non-modal WARNING balloon in the existing group with Open Password Settings / Dismiss" (recommended). Alternative: modal dialog after login.`

---

## Validation trust window (TOKEN-04, #542)

| Option | Description | Selected |
|--------|-------------|----------|
| Static cache keyed on SHA-256 of token bytes, 5-minute window, invalidated on store/delete | Plain-Java `TokenValidationCache` with injected clock; never stores plaintext; only successful validations recorded | ✓ |
| Key on token string, 60 s window | Same shape, shorter window, plaintext key in memory | |
| Per-session "validated once" flag | Skip validation for the rest of the IDE session after one success — violates "short" (Pitfall 6) | |

`[auto] Trust window — Q: "Cache key and storage?" → Selected: "SHA-256 of token bytes; no plaintext in the cache" (recommended default)`
`[auto] Trust window — Q: "Window length?" → Selected: "5 minutes, fixed upper bound; Claude may lower to ≥60 s" (recommended). Alternatives: 60 s; 15 min.`
`[auto] Trust window — Q: "Invalidation triggers?" → Selected: "storeToken, deleteToken, failed validation; read-time expiry, no timer" (recommended).`
`[auto] Trust window — Q: "Where does the wiring live?" → Selected: "One base-class trusted-validation method replacing the two identical BUI/DWC blocks" (recommended). Alternative: edit both subclasses in place.`

---

## Plan split and landing

| Option | Description | Selected |
|--------|-------------|----------|
| Four plans, P04 after P01 | P01 TOKEN-01, P02 TOKEN-02, P03 TOKEN-03, P04 TOKEN-04; P02/P03 independent | ✓ |
| Three plans (P01+P03 merged) | Same-file batching of #535 and #552 — allowed at planner's discretion | |
| One plan | Everything in one PR — rejected: the #535-before-#542 ordering must be visible in the commit history | |

`[auto] Plan split — Q: "How many plans and in what order?" → Selected: "Four plans, P04 after P01" (recommended default)`

---

## Claude's Discretion

- Seam names/packages (`JwtValidity`, `TokenValidationCache`, `BackendNoticePolicy`, `TokenBackend`; `actions/` vs `auth/`).
- Whether `isTokenExpired` survives as a delegate or callers use the three-valued result directly.
- Windows ACL owner permission set beyond the D-09 minimum; principal lookup order.
- Notification wording and the Passwords configurable id.
- Trust window between 60 s and 5 min.
- Test file placement and source-guard scoping.

## Deferred Ideas

- `PasswordSafeSettingsListener` subscription for instant warnings.
- Compile-time canary for the internal `PasswordSafeSettings` API — Phase 83.
- Windows CI runner for the ACL test.
- Client-side JWT signature verification — out of scope by design.
- Same fail-closed fix for VS Code's `isTokenExpired` (`bbj-vscode/src/extension.ts:342`) — VS Code-side, outside v4.2; todo candidate.
