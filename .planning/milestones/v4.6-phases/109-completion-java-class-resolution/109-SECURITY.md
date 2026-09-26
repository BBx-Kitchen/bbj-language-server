---
phase: "109"
slug: "completion-java-class-resolution"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-26"
---

# Phase 109 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| java-interop backend (:5008) → language server | `getClassInfo` answers feed the class cache, completion, hover, overload selection and validation | Java class/member metadata (low sensitivity) |
| language server → IDE user | completion candidates, inferred types and diagnostics the developer trusts | derived analysis results |
| maintainer → public GitHub issue #561 | the comment and close action posted in 109-06 | maintainer-chosen text |
| private conformance corpus → repository | 109-08's corpus probe measured newly surfaced diagnostics | counts only (corpus content stays out of tracked files) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-109-01 | Repudiation | #561 comment/close | low | mitigate | Choice recorded at the 109-01 checkpoint; 109-COMP03-MEASUREMENT.md "#561 decision" section; UAT test 2 confirms the single recorded comment | closed |
| T-109-02 | Information disclosure | fixtures, measurement record | low | mitigate | Invented fixture names; no planning ids (D-NN, 109-0N, T-109, COMP/JINT, G-109) added under bbj-vscode/src or bbj-vscode/test since phase base 4b0cd256 | closed |
| T-109-03 | Tampering (developer trust) | provider fallback | low | mitigate | completion-test.test.ts green; bbj.langium untouched by the phase | closed |
| T-109-04 | Tampering (developer trust) | member scope for FQN receivers | medium | mitigate | Static-only branch in bbj-scope.ts (isClassRef, line 211ff); completion-class-reference.test.ts pins `.class`, instance, package and case-variant receivers | closed |
| T-109-05 | Denial of service | cyclic reference in scope computation | low | mitigate | `.ref` read wrapped in the existing try/catch; isClassRef defaults false (bbj-scope.ts:211-224) | closed |
| T-109-06 | Tampering (developer trust) | inferred call type | medium | mitigate | overloadedCallType in bbj-type-inferer.ts:111 returns no type for undecided choices; overload-return-type.test.ts pins it | closed |
| T-109-07 | Denial of service | recursive argument inference | low | mitigate | `resolving` set guard in bbj-type-inferer.ts:14-24 | closed |
| T-109-08 | Denial of service | getClassInfo traffic on cold start | medium | mitigate | isLocalJavaTypeName choke point (java-interop.ts:101); java-interop-local-types.test.ts and real-interop test (RUN_BBJ_TESTS=1, 3/3 green) assert zero requests | closed |
| T-109-09 | Tampering (developer trust) | local answer shape | medium | mitigate | Local answer goes through the same resolveClass pipeline; field-by-field neutrality tests in java-interop-local-types.test.ts | closed |
| T-109-10 | Spoofing (identity confusion) | class cache key | medium | mitigate | canonicalJavaClassName (java-interop.ts:161) keeps `$<digit>`, segment-start `$`, `$$` and trailing `$`; 13 look-alike assertions in java-interop-nested-class-names.test.ts | closed |
| T-109-11 | Denial of service | duplicate fetches / cache entries | low | mitigate | One canonical key (java-interop.ts:531, 979); #659 mechanism test asserts one request | closed |
| T-109-12 | Tampering (backend compatibility) | request spelling | low | mitigate | Request keeps the arriving spelling; real-interop test green against the current backend | closed |
| T-109-13 | Information disclosure | live-run SUMMARY | low | mitigate | 109-06-SUMMARY records counts and JDK class names only | closed |
| T-109-14 | Repudiation | #561 action | low | mitigate | Posted text matches the 109-01 record; URL kept in 109-COMP03-MEASUREMENT.md | closed |
| T-109-15 | Tampering (release hygiene) | commit messages | low | mitigate | No closing keyword (`close/fix/resolve #N`) in any commit body since phase base 4b0cd256 | closed |
| T-109-16 | Tampering (developer trust) | member scope after `java.lang.Class.` / `.class` | medium | mitigate | isPseudoClassMember branch (bbj-scope.ts:220); label-set equality tests in completion-class-reference.test.ts; unknown-java-member.test.ts pins no Error | closed |
| T-109-17 | Denial of service | extra type inference in scope computation | low | mitigate | Extra getType runs only for `class` member text, behind the inferer's guard and try/catch | closed |
| T-109-18 | Tampering (developer trust) | plain-name lookup inside a METHOD body | medium | mitigate | lexicalScope (bbj-scope.ts:390) drops only Program-keyed VariableDecl subtypes inside a MethodDecl; method-body-scope.test.ts presence/absence tests; completion-method-body.test.ts extraInMethod check; UAT test 33 passed in the IDE | closed |
| T-109-19 | Information disclosure | corpus probe output | medium | mitigate | Probe file (zz-method-scope-probe.test.ts) and /tmp/method-scope-gap output absent from `git ls-files`; SUMMARY carries counts only | closed |
| T-109-20 | Denial of service | extra walk per in-method lookup | low | accept | See Accepted Risks Log | closed |
| T-109-SC | Tampering | package installs | low | accept | See Accepted Risks Log; package.json, package-lock.json and build.gradle.kts unchanged since phase base | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-109-01 | T-109-20 | Same O(depth) container walk Langium already performs, only for references inside a MethodDecl; other references keep the unchanged superGetScope path | planner (109-08 threat model) | 2026-09-26 |
| AR-109-02 | T-109-SC | No package was installed or upgraded in this phase | planner (109-01..08 threat models) | 2026-09-26 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-26 | 21 | 21 | 0 | secure-phase orchestrator (ASVS L1, grep-depth; register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-26
