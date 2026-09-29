---
phase: 121-java-interop-service-decomposition
verified: 2026-09-29T13:26:42Z
status: passed
score: 8/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 121: Java Interop Service Decomposition Verification Report

**Phase Goal:** The Java class services are decomposed and injected: `JavadocProvider` is a DI
service, and `JavaInteropService` is split along its five responsibilities, with unchanged
behaviour on the language server's hottest path.
**Verified:** 2026-09-29T13:26:42Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (roadmap success criterion) | Status | Evidence |
|---|---|---|---|
| 1 | `JavadocProvider` is registered in `BBjServices` and constructor-injected; `getInstance()` and the test module's `isInitialized()` workaround are gone; a test builds two independently configured providers that share no state | ✓ VERIFIED | `bbj-module.ts:60-61,98-99` registers `services.java.JavadocProvider: () => new JavadocProvider()`; `java-javadoc.ts` has a public constructor, no `_instance` field, no `getInstance()` (confirmed by diff against base `bb5404a0` — the entire diff for this file is exactly the singleton removal). Repo-wide grep for `getInstance` across `src/` and `test/` finds only an unrelated method name (`getInstanceString`) in `parser.test.ts`. `javadoc.test.ts:198-211` contains `describe('Independent JavadocProvider instances (#624)', ...)` asserting `second.java.JavadocProvider.isInitialized()` is `false` while the first is initialised — independently re-run, passes (part of the 109-test six-file run below). |
| 2 | The connection lifecycle, class resolution and cache, request lock, classpath loading and complete class index each live in their own module, each importable and testable on its own | ✓ VERIFIED | Five sibling files exist next to `java-interop.ts` with the claimed exported classes: `java-interop-connection.ts` (`JavaInteropConnection`, 578 lines), `java-interop-cache.ts` (`JavaResolutionCache`, 900 lines), `java-interop-lock.ts` (`ResolutionLock`, 73 lines), `java-interop-classpath.ts` (`ClasspathLoader`, 183 lines), `java-interop-class-index.ts` (`CompleteClassIndex`, 141 lines). None is registered in `bbj-module.ts`'s DI (grep for the five class names in that file returns nothing); `java-interop.ts` builds each as a private field (`new JavaInteropConnection(...)`, `new ResolutionLock()`, `new JavaResolutionCache(...)`, `new ClasspathLoader(...)`, `new CompleteClassIndex(...)`). Independently re-ran `npx vitest run` against all five module test files together: 5 files, 50 tests, all passed, with no `JavaInteropService` import needed (each test file drives the class directly with stub hooks). |
| 3 | The `java-interop-*.test.ts` suites, the Phase 116 fake-socket suite (`java-interop-socket.test.ts`) and the whole suite pass without assertion changes | ✓ VERIFIED | Independently re-ran `javadoc.test.ts`, `java-interop-service.test.ts`, `java-interop-socket.test.ts`, `java-interop-peer-guard.test.ts`, `inlay-hints-javadoc.test.ts`, `javadoc-markdown-escape.test.ts`: 6 files, 109 tests, all passed. Independently diffed `expect(`/`test(`/`it(`/`describe(` lines for `java-interop-service.test.ts`, `java-interop-socket.test.ts` and `inlay-hints-javadoc.test.ts` against the phase base commit `bb5404a0`: identical. Loaded the orchestrator's independent whole-suite run (`/home/coder/repos/tmp/phase-121/suite-orch.json`): `numFailedTests=0`, `numPassedTests=3694`, `numTotalTests=3724`, the only non-passing suite file is `test/functional/installed-extension-e2e.test.ts`, matching the phase base's pre-existing failure list. |
| 4 | Against a live BBjServices, hover, completion, the missing-USE quick fix and Refresh Java Classes behave as before in VS Code and IntelliJ | ✓ VERIFIED | Human-verified: the user ran the documented hand-check script (hover, completion, missing-USE quick fix, Refresh Java Classes) against a live BBjServices on `127.0.0.1:5008` in both VS Code (from a freshly built, byte-verified VSIX) and IntelliJ (from a freshly built, byte-verified plugin zip whose bundled `main.cjs` was proven identical to `bbj-vscode/out/language/main.cjs`) and replied "approved" on 2026-09-29. Recorded in `121-10-SUMMARY.md` "Task 2 — approval record". Per task instructions, this is treated as authoritative human-verified evidence, not a pending item. |

**Score:** 4/4 roadmap success criteria verified (0 present-but-behavior-unverified)

### Requirement-level must-haves (PLAN frontmatter, cross-checked against the four criteria above)

| # | Truth | Status | Evidence |
|---|---|---|---|
| 5 | Per D-02, every protected hook stays on `JavaInteropService`; test-double class bodies unchanged apart from the D-10 javadoc-wiring exception | ✓ VERIFIED | `java-interop.ts` retains `createSocket`, `wrapSocket`, `connect`, `getRawClass`, `resolvedClassesCacheLimit`, `inFlightResolutionCount`, `buildCompleteClassIndex`, `clearCompleteClassIndex`, `resolveClass` as protected methods, plus `classpath`, `_connectionGeneration` get/set, `langiumDocuments`, `classpathDocument`, `javadocProvider` as protected members (per 121-10-SUMMARY's verify command 2, independently spot-checked for `javadocProvider` at `java-interop.ts:98`). Nine test-double class bodies diffed byte-for-byte against base in Task 1's automated verify (re-inspected, not re-run — see note below). |
| 6 | `clearCache()` calls the five collaborators' resets in the base's exact six-step order, ending with the unchanged `'Java interop cache cleared'` log line | ✓ VERIFIED | Read `java-interop.ts`'s `clearCache()` body directly: `resolutionCache.reset()` → `clearCompleteClassIndex()` → `lock.reset()` → `interopConnection.resetBreaker()` → `classpathLoader.reset()` + classpath array resets → `interopConnection.disconnect()` → `logger.info('Java interop cache cleared')`. Matches D-07 and the base order exactly. |
| 7 | No new planning identifier in any added `src`/`test` line since the phase base | ✓ VERIFIED | Independently re-ran the hygiene grep (`D-NN`, `121-NN`, `REF/FIX/SEC/...-NN`, `Phase NN`, `P6N-DN` patterns) against `bb5404a0` vs. HEAD for `bbj-vscode/src` and `bbj-vscode/test`: `comm -13` (new-since-base) is empty. Pre-existing identifiers (`P61-D2-004`, javadoc `TODO`s) confirmed present in the base commit already. |
| 8 | Requirements REF-09 and REF-12 are both marked complete, and REQUIREMENTS.md's Phase 121 traceability rows match | ✓ VERIFIED | `.planning/REQUIREMENTS.md:88,91` — `[x] REF-09`, `[x] REF-12`; lines 173 and 176 map both to "Phase 121 / Complete". No other requirement ID maps to Phase 121 (no orphaned requirements). |

**Score:** 8/8 must-haves verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `bbj-vscode/src/language/java-javadoc.ts` | Public constructor, no singleton | ✓ VERIFIED | Diff against base is exactly the singleton removal; line count 212 |
| `bbj-vscode/src/language/bbj-module.ts` | `services.java.JavadocProvider` DI key | ✓ VERIFIED | `JavadocProvider: () => new JavadocProvider()` at line 99, type at line 61 |
| `bbj-vscode/src/language/java-interop-lock.ts` | `export class ResolutionLock` | ✓ VERIFIED | Exists, 73 lines, zero imports |
| `bbj-vscode/src/language/java-interop-connection.ts` | `export class JavaInteropConnection` | ✓ VERIFIED | Exists, 578 lines |
| `bbj-vscode/src/language/java-interop-class-index.ts` | `export class CompleteClassIndex` | ✓ VERIFIED | Exists, 141 lines |
| `bbj-vscode/src/language/java-interop-classpath.ts` | `export class ClasspathLoader` | ✓ VERIFIED | Exists, 183 lines |
| `bbj-vscode/src/language/java-interop-cache.ts` | `export class JavaResolutionCache` | ✓ VERIFIED | Exists, 900 lines |
| `bbj-vscode/src/language/java-interop.ts` | Front class, delegates only | ✓ VERIFIED | 467 lines (base: 1,764 — a 73% reduction), builds all five collaborators as private fields |
| `bbj-vscode/test/java-interop-{lock,connection,class-index,classpath,cache}.test.ts` | Per-module unit tests | ✓ VERIFIED | All 5 files exist and pass independently (50 tests, re-run) |
| `.planning/phases/121-java-interop-service-decomposition/121-10-SUMMARY.md` | Phase-wide evidence + hand-check record | ✓ VERIFIED | Contains `Closes #624` / `Closes #558`, module table, approval record |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `java-interop.ts` | `services.java.JavadocProvider` | constructor assignment | ✓ WIRED | `this.javadocProvider = services.java.JavadocProvider;` (line 111) |
| `bbj-hover.ts` | `services.java.JavadocProvider` | constructor assignment | ✓ WIRED | `this.javadocProvider = services.java.JavadocProvider;` (line 30) |
| `bbj-ws-manager.ts` | `services.java.JavadocProvider` | field assignment + `tryInitializeJavaDoc` | ✓ WIRED | `this.javadocProvider = bbjServices.java.JavadocProvider;` (line 136), passed into `tryInitializeJavaDoc` (line 195) |
| `java-interop.ts` | five collaborator modules | field construction | ✓ WIRED | `new JavaInteropConnection(...)`, `new ResolutionLock()`, `new JavaResolutionCache(...)`, `new ClasspathLoader(...)`, `new CompleteClassIndex(...)` all present as private fields |
| `bbj-module.ts` | five collaborator classes | absence check | ✓ CONFIRMED NOT REGISTERED | Zero matches for any of the five collaborator class names in `bbj-module.ts` (per D-01, they must not be DI services) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Five module tests pass in isolation | `npx vitest run test/java-interop-{lock,connection,class-index,classpath,cache}.test.ts` | 5 files, 50 tests passed | ✓ PASS |
| javadoc/interop-service/socket/peer-guard/inlay/markdown-escape suites pass with no assertion drift | `npx vitest run` on those 6 files | 6 files, 109 tests passed | ✓ PASS |
| `exports-check.mjs` (D-08 export-surface guard) | `node /home/coder/repos/tmp/phase-121/exports-check.mjs` | `exports base=15 head=15 missing=0` / `exports OK` | ✓ PASS |
| No new planning identifiers since base | hygiene grep re-run | `comm -13` empty | ✓ PASS |
| Repo working tree clean apart from unrelated `.planning/milestone.lock` | `git status --short` | only `?? .planning/milestone.lock` | ✓ PASS |
| Whole suite (orchestrator's independent run) | evidence file `suite-orch.json` | `numFailedTests=0`, 3,724 tests, one pre-existing failed suite | ✓ PASS (evidence-based, not re-run here per task instructions) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| REF-09 | 121-01, 121-02 | `JavadocProvider` DI, `getInstance()` removed | ✓ SATISFIED | Verified above (truth 1) |
| REF-12 | 121-03 through 121-10 | `JavaInteropService` split into five modules, unchanged behaviour | ✓ SATISFIED | Verified above (truths 2-4) |

No orphaned requirements — REQUIREMENTS.md maps only REF-09 and REF-12 to Phase 121, and both appear in plan frontmatter.

### Anti-Patterns Found

None introduced by this phase. Scanned all 10 changed `src/` files and the 5 new test files for
`TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` and stub-language patterns; the only hits
(`java-javadoc.ts:108,110`, `bbj-ws-manager.ts:15,279`) are pre-existing `TODO` comments confirmed
present, unchanged, in the phase base commit `bb5404a0`.

Code review (`121-REVIEW.md`, 2026-09-29, depth standard, 28 files): 0 critical, 0 warning, 1 info
(`IN-01`, a test-quality note about a narrow type cast in `java-interop-cache.test.ts` — not a
functional or security issue, does not affect goal achievement).

### Human Verification Required

None. Roadmap success criterion 4's live hand check was already completed and approved by the user
on 2026-09-29 (recorded in `121-10-SUMMARY.md`), and is treated as authoritative evidence per the
task's explicit instruction, not routed as a pending item here.

### Gaps Summary

No gaps. All four roadmap success criteria are independently verified against the codebase, not
merely asserted by SUMMARY.md:

- The `getInstance()` singleton is fully removed and replaced by constructor injection at
  `services.java.JavadocProvider`, confirmed by diffing `java-javadoc.ts` against the phase base and
  by a repo-wide grep finding no remaining caller.
- All five collaborator modules exist as the claimed exported classes, are wired into
  `JavaInteropService` as private fields, are absent from the DI container, and each passes its own
  test file in isolation when re-run independently (50 tests).
- The `java-interop-*` suites, the Phase 116 fake-socket suite (`java-interop-socket.test.ts`) and
  a further sample of pre-existing test files show byte-identical assertions against the phase base
  when independently diffed, and the orchestrator's independent whole-suite run shows 0 failed
  tests with the same single pre-existing failing suite as the base.
- `clearCache()`'s six-step reset order was read directly from the final source and matches D-07
  and the base exactly.
- No new planning identifiers or debt markers were introduced.
- The live IDE hand check (roadmap criterion 4) was performed and approved by a human against a
  real BBjServices peer.

One minor bookkeeping note (not a gap): `.planning/ROADMAP.md`'s phase-index checkbox list (line
420) still shows `[ ] Phase 121` even though the phase's own detailed section shows all 10 plans
checked off and its success criteria met — this is standing orchestrator bookkeeping that is
normally updated after verification passes (consistent with prior MEMORY note on stale
STATE/ROADMAP bookkeeping), not a defect in the phase's actual deliverable.

---

_Verified: 2026-09-29T13:26:42Z_
_Verifier: Claude (gsd-verifier)_
