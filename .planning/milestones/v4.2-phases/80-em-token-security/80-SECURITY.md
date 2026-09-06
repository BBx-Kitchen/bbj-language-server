---
phase: "80"
slug: "em-token-security"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-04"
register_authored_at_plan_time: true
---

# Phase 80 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time in the four PLAN.md `<threat_model>` blocks (T-80-01 … T-80-25 plus the per-plan supply-chain row T-80-SC); verified after execution by `/gsd-secure-phase 80` at ASVS L1 (grep-depth mitigation presence against the merged source on `main` at `c8074d6`, plus the 234/234 green suite that runs every named test).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| `em-login.bbj` subprocess output → `BbjEMTokenStore.storeToken` | Untrusted text enters the credential store | EM JWT (secret) |
| Stored JWT → Run As BUI/DWC launch path | An unverifiable token decides whether the plugin launches or re-prompts | EM JWT (secret) |
| Client clock → expiry verdict | `now` is user-controlled on the client | timestamp |
| Plugin process → shared temporary directory | Plaintext JWT written to a file other local accounts may reach | EM JWT (secret) |
| Filesystem capability report → permission decision | `supportedFileAttributeViews()` selects posix / acl / fail-closed | capability set |
| IDE-wide PasswordSafe configuration → plugin credential storage | An IDE or org policy decides how strongly the JWT is protected | provider type |
| Internal platform API (`PasswordSafeSettings`, `ProviderType`) → plugin | Unversioned `@ApiStatus.Internal` contract | enum value |
| Plugin → user-visible notification | Balloon text visible to anyone at the screen | fixed literals only |
| Cached trust verdict → next Run's launch decision | A remembered verdict substitutes for a live server check for up to the window | SHA-256 digest + timestamp |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-80-01 | Spoofing | `isTokenExpired` fail-open branches | high | mitigate | Four `return false` sites replaced by `JwtValidity.check` → `MALFORMED`; `isTokenExpired` true for anything not `VALID` (`JwtValidityTest` 12/12, `EmTokenFailClosedSourceGuardTest` 7/7) | closed |
| T-80-02 | Elevation of Privilege | payload without `exp` | high | mitigate | Absent, non-integer or decimal `exp` is `MALFORMED` (`JwtValidityTest`) | closed |
| T-80-03 | Information Disclosure | login failure dialog echoing token content | medium | mitigate | Fixed literal message, no interpolation, no logging (source guard) | closed |
| T-80-04 | Tampering | manipulated client clock | low | accept | See Accepted Risks R-80-01 | closed |
| T-80-05 | Denial of Service | fail-closed rejecting an unexpected legitimate token shape | medium | accept | See Accepted Risks R-80-02 | closed |
| T-80-06 | Information Disclosure | other local account reading the JWT temp file on Windows | high | mitigate | `acl:acl` attribute with one ALLOW entry for the current user passed to `Files.createTempFile` (`OwnerOnlyAclTest` 6/6) | closed |
| T-80-07 | Information Disclosure | window with a broader DACL | high | mitigate | Attribute supplied at creation; second-best path restricts immediately and deletes on failure (`BbjProcessSecretEnvTest` 29/29) | closed |
| T-80-08 | Information Disclosure | neither view → default-permission file | high | mitigate | `selectOwnerOnlyStrategy` throws `IOException`; bare two-argument `createTempFile` gone (`BbjSecretArgvSourceGuardTest` 19/19) | closed |
| T-80-09 | Tampering | over-broad principal | medium | mitigate | Lookup by `user.name`, fallback `Files.getOwner`; exactly one ALLOW entry, no DENY (`OwnerOnlyAclTest`) | closed |
| T-80-10 | Denial of Service | over-restrictive ACL blocking BBj write or delete | medium | mitigate | Permission floor includes WRITE_DATA, APPEND_DATA, WRITE_ATTRIBUTES, DELETE (`OwnerOnlyAclTest`); Windows write-through is a manual UAT item | closed |
| T-80-11 | Information Disclosure | `IOException` message leaking a path | low | accept | See Accepted Risks R-80-03 | closed |
| T-80-12 | Information Disclosure | user believing the token is keychain-protected when it is not | high | mitigate | `resolveBackend()` + `BackendNoticePolicy` WARNING balloon on both `storeToken` and `getToken` (`BackendNoticePolicyTest` 10/10) | closed |
| T-80-13 | Spoofing | detection failure passing as native keychain | high | mitigate | Null service / null provider / unknown constant / `Throwable` → `UNKNOWN`, which is warn-worthy (`BackendNoticePolicyTest`) | closed |
| T-80-14 | Tampering | internal `PasswordSafeSettings` API changing shape | medium | mitigate | Access isolated to one method in one file (`EmTokenBackendNoticeSourceGuardTest` 7/7); failure degrades to `UNKNOWN` | closed |
| T-80-15 | Information Disclosure | balloon text leaking token or path | medium | mitigate | Three fixed literals selected by enum; no concatenation with variables (source guard) | closed |
| T-80-16 | Denial of Service | balloon on every Run | medium | mitigate | Once per distinct non-keychain value, persisted in `PropertiesComponent`; `evaluate` synchronized (`BackendNoticePolicyTest`) | closed |
| T-80-17 | Information Disclosure | last-warned backend name persisted | low | accept | See Accepted Risks R-80-04 | closed |
| T-80-18 | Elevation of Privilege | plugin overriding the PasswordSafe policy | medium | accept | See Accepted Risks R-80-05 | closed |
| T-80-19 | Information Disclosure | cache retaining token plaintext | high | mitigate | Only a SHA-256 digest stored; no `String` field in `TokenValidationCache` (`EmTokenTrustWindowSourceGuardTest` 7/7) | closed |
| T-80-20 | Spoofing | different token inheriting a prior validation | high | mitigate | Keyed on digest of UTF-8 bytes, compared with `MessageDigest.isEqual` (`TokenValidationCacheTest` 11/11) | closed |
| T-80-21 | Elevation of Privilege | malformed token entering the trust cache | high | mitigate | Fail-closed expiry check precedes `validateTokenTrusted` in both run actions (source guard); composed test proves zero server calls and no entry | closed |
| T-80-22 | Tampering | stale trust surviving logout / re-login / replacement | high | mitigate | `storeToken` and `deleteToken` both call `invalidate()` unconditionally (source guard asserts exactly two calls); nothing persisted | closed |
| T-80-23 | Elevation of Privilege | revoked token usable for up to the window | medium | accept | See Accepted Risks R-80-06 | closed |
| T-80-24 | Denial of Service | two concurrent cold-cache Runs both spawning the subprocess | low | accept | See Accepted Risks R-80-07 | closed |
| T-80-25 | Repudiation | cached success masking a later server rejection in logs | low | accept | See Accepted Risks R-80-08 | closed |
| T-80-SC | Tampering | package-manager installs | low | accept | No dependency added; `bbj-intellij/build.gradle.kts` unchanged across all four plans | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-80-01 | T-80-04 | The client clock is user-controlled by definition and the user already holds the token; `validateTokenServerSide` remains the authority; client-side signature verification is out of scope (no key material on the client) | plan 80-01 threat model (auto-mode) | 2026-09-04 |
| R-80-02 | T-80-05 | EM issues 3-part JWTs carrying `exp`; a shape change now surfaces once at login with a specific message instead of being silently trusted | plan 80-01 threat model (auto-mode) | 2026-09-04 |
| R-80-03 | T-80-11 | The message names the temp directory and the missing view names only, never a token or credential; callers already surface `IOException` text | plan 80-02 threat model (auto-mode) | 2026-09-04 |
| R-80-04 | T-80-17 | The stored value is an enum name, not a secret, and is inferable from the IDE settings the user set | plan 80-03 threat model (auto-mode) | 2026-09-04 |
| R-80-05 | T-80-18 | #552 asks for a warning, not an override; forcing the keychain is Out of Scope in REQUIREMENTS.md | plan 80-03 threat model (auto-mode) | 2026-09-04 |
| R-80-06 | T-80-23 | The trust window is a UX optimisation, not a security boundary (D-15): `web.bbj` presents the token to EM at every launch, so a revoked token fails at launch regardless; window is five minutes, may be lowered but not raised | plan 80-04 threat model (auto-mode) | 2026-09-04 |
| R-80-07 | T-80-24 | At most two calls, which is what the pre-fix code did every time; the `AtomicReference` swap keeps the entry coherent | plan 80-04 threat model (auto-mode) | 2026-09-04 |
| R-80-08 | T-80-25 | The plugin logs neither verdict today and adds none; the authoritative record is on the EM side | plan 80-04 threat model (auto-mode) | 2026-09-04 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-04 | 26 (25 + T-80-SC) | 26 | 0 | /gsd-secure-phase 80 (orchestrator, ASVS L1 grep-depth; 15 evidence checks against `main`) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-04
