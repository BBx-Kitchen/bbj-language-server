---
phase: 121-java-interop-service-decomposition
plan: "02"
subsystem: api
tags: [langium, dependency-injection, javadoc, java-interop, tdd]

requires:
  - phase: 121-java-interop-service-decomposition
    provides: "plan 01's services.java.JavadocProvider DI key and every production/test reader wired to it"
provides:
  - "JavadocProvider is a plain, publicly-constructible class with no getInstance()/_instance singleton"
  - "The production DI factory (bbj-module.ts) builds a fresh JavadocProvider per services set"
  - "The five remaining getInstance() callers (javadoc.test.ts, java-interop-socket.test.ts's newInterop(), four functional live-interop tests) read their own services' provider instead"
  - "javadoc.test.ts's #624 regression suite proving two independently configured providers in one process share no state"
  - "REF-09 measured against the phase base and marked complete; ref09-end-sha.txt recorded for the REF-12 plans (03-10) to diff against"
affects: [121-03-through-121-10-javainteropservice-split]

actuals:
  tokens: 4794
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Structural cast to a protected instance method (Pick-style local interface, `as unknown as {...}`) to drive a real code path from a test without importing the concrete class — used here for JavaInteropTestService's inherited resolveClass, matching the codebase's existing 'reached via cast' idiom (java-class-lookups-real-interop.test.ts's InteropPrivates)."

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-module.ts
    - bbj-vscode/src/language/java-javadoc.ts
    - bbj-vscode/test/javadoc.test.ts
    - bbj-vscode/test/java-interop-socket.test.ts
    - bbj-vscode/test/functional/issue440-real-interop.test.ts
    - bbj-vscode/test/functional/issue447-real-interop.test.ts
    - bbj-vscode/test/functional/java-class-lookups-real-interop.test.ts
    - bbj-vscode/test/functional/unknown-java-member-real-interop.test.ts
    - .planning/REQUIREMENTS.md

key-decisions:
  - "The #624 regression suite's 'consults only that set's provider' test uses createBBjTestServices with a structural cast to JavaInteropTestService's inherited (protected) resolveClass, not createCountingInteropServices — see Deviations."
  - "getPackageDoc/getDocumentation/isInitialized/initialize keep their exact existing throw/reject text; only the singleton accessor and constructor visibility changed."

requirements-completed: [REF-09]

coverage:
  - id: D1
    description: "The production DI factory (bbj-module.ts) hands out a fresh `new JavadocProvider()` per services set; `getInstance()`/`_instance` no longer exist anywhere in java-javadoc.ts, and no caller under bbj-vscode/src or bbj-vscode/test still references JavadocProvider.getInstance"
    verification:
      - kind: unit
        ref: "custom hygiene command: grep -c '_instance|getInstance' java-javadoc.ts == 0, git grep -l 'JavadocProvider.getInstance' over src+test == empty"
        status: pass
    human_judgment: false
  - id: D2
    description: "javadoc.test.ts holds the #624 regression suite: two independently configured providers in one process are distinct objects, share no initialised-flag/package/file-system state, a second initialize() on one rejects without touching the other, class resolution through one services set only calls that set's provider, and every test-services factory (createBBjTestServices, createCountingInteropServices, createFakePeerServices) plus a bare `new JavadocProvider()` initialises synchronously"
    verification:
      - kind: unit
        ref: "test/javadoc.test.ts (13 tests, describe('Independent JavadocProvider instances (#624)') — 7 new tests), run three times for stability"
        status: pass
    human_judgment: false
  - id: D3
    description: "REF-09 as a whole matches the phase base: the nine test-double classes' bodies are unchanged apart from the Javadoc-provider wiring, no pre-existing expect()/test()/describe() line changed, the whole suite has no failing test name absent from the base list, lint/typecheck:test/build are green, and no added source/test line carries a planning identifier or references a changed java-interop.js import path"
    verification:
      - kind: unit
        ref: "the six Task 2 verify commands (double-class diff, assertion diff, whole-suite JSON comparison, lint+typecheck+build, hygiene grep, REF-09-closed check) — all six print their expected OK line"
        status: pass
    human_judgment: false

duration: 23min
completed: 2026-09-29
status: complete
---

# Phase 121 Plan 02: JavadocProvider DI Wiring (second half) Summary

**`JavadocProvider.getInstance()`/`_instance` are deleted; the DI factory builds one fresh provider per services set; the #624 regression suite in `javadoc.test.ts` proves two providers in the same process share no state; REF-09 is measured clean against the phase base and marked complete.**

## Performance

- **Duration:** 23 min
- **Started:** 2026-09-29T10:41:00Z (approx.)
- **Completed:** 2026-09-29T11:04:09Z
- **Tasks:** 2
- **Files modified:** 9 (across this plan's 4 commits; REF-09 as a whole spans 18 files including plan 01's 12)

## Accomplishments

- `JavadocProvider`'s `private static _instance` field and `static getInstance()` method are deleted from `java-javadoc.ts`; the constructor stays public (made public in plan 01).
- `bbj-module.ts`'s DI factory changed from `() => JavadocProvider.getInstance()` to `() => new JavadocProvider()` — every services set now gets its own instance.
- The five remaining `JavadocProvider.getInstance()` callers moved to their own services' provider: `javadoc.test.ts`'s `'Check initialize called'` test (`new JavadocProvider()`), `java-interop-socket.test.ts`'s `newInterop()` helper (`services.java.JavadocProvider`), and the four functional live-interop tests' `beforeAll` guards (`services.BBj.java.JavadocProvider` / `services.java.JavadocProvider`).
- `javadoc.test.ts` gained a new `describe('Independent JavadocProvider instances (#624)', …)` block (7 tests) proving: two `createBBjServices` sets hand out distinct provider objects; initialising one leaves an independently-built second uninitialised; two independently initialised providers answer only their own package and read only their own fake file system; a second `initialize()` on one rejects without touching the other; resolving a class through one services set consults only that set's provider; `createBBjTestServices`/`createFakePeerServices` (and, by the shared `createInitializedJavadocProvider` primitive they and `createCountingInteropServices` all build on) hand out a synchronously-initialised provider; a bare `new JavadocProvider()` initialises synchronously with no roots, before any `await`.
- RED: the distinct-object and independent-state tests failed against the still-shared `getInstance()` factory (4 of 13 tests failed; the other 9 — pre-existing tests plus the factory-synchronicity and spy-consultation tests, which don't depend on the production factory — already passed). GREEN: the factory/singleton change made all 13 pass.
- REF-09 measured against the phase base (`bb5404a0`): the nine test-double classes are unchanged apart from Javadoc wiring, no pre-existing assertion or test name changed, the whole suite (3674 tests) has the same single pre-existing failing suite name as the base (`installed-extension-e2e.test.ts`, 0 failed tests), lint/typecheck:test/build are green, and the hygiene scan is clean.
- REF-09 end commit recorded at `/home/coder/repos/tmp/phase-121/ref09-end-sha.txt` (`c42513d3…`, before the REQUIREMENTS.md commit) for plans 03-10 to diff against.
- REF-09 marked complete in `.planning/REQUIREMENTS.md` (checkbox and traceability row only).

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: pin independent Javadoc providers per service set** - `f38c8930` (test)
2. **Task 1 GREEN: build one Javadoc provider per service set and drop the singleton** - `9c83b8d8` (refactor)
3. **Task 2 fix: stop importing counting-java-interop.js in javadoc.test.ts (deviation, see below)** - `c42513d3` (fix)
4. **Task 2: mark REF-09 complete in REQUIREMENTS.md** - `1842aff9` (docs)

**Plan metadata:** this SUMMARY's own commit.

## Files Created/Modified

- `bbj-vscode/src/language/bbj-module.ts` - `JavadocProvider` factory changed to `() => new JavadocProvider()`
- `bbj-vscode/src/language/java-javadoc.ts` - `_instance` field and `getInstance()` method deleted
- `bbj-vscode/test/javadoc.test.ts` - `'Check initialize called'` uses `new JavadocProvider()`; new `#624` regression describe block (7 tests)
- `bbj-vscode/test/java-interop-socket.test.ts` - `newInterop()`'s guard reads `services.java.JavadocProvider`
- `bbj-vscode/test/functional/issue440-real-interop.test.ts` - guard reads `services.BBj.java.JavadocProvider`
- `bbj-vscode/test/functional/issue447-real-interop.test.ts` - both guards (two describe blocks) read `services.BBj.java.JavadocProvider`
- `bbj-vscode/test/functional/java-class-lookups-real-interop.test.ts` - guard reads `services.BBj.java.JavadocProvider`
- `bbj-vscode/test/functional/unknown-java-member-real-interop.test.ts` - guard reads `services.BBj.java.JavadocProvider`
- `.planning/REQUIREMENTS.md` - REF-09 checkbox and traceability row marked complete

## Decisions Made

- Kept `initializeWorkspace`'s and the four functional tests' `isInitialized()` guard even though a fresh production provider always starts uninitialised (per the plan's stated assumption) — the guard is now redundant but harmless, and removing it wasn't in scope.
- Reused `services.BBj.java.JavadocProvider` (not a new export) as the read point for every migrated call site, mirroring the exact DI-access shape already established in plan 01 for the three production readers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in own test] The #624 regression suite's spy-consultation test imported `createCountingInteropServices` from `counting-java-interop.js`, tripping Task 2's own hygiene verify command**
- **Found during:** Task 2's hygiene verify command (run ahead of the rest of Task 2 to check the design before proceeding)
- **Issue:** The plan's Task 1 `<action>` names `createCountingInteropServices()` for the "resolving a scripted class... consults only that set's provider" test. Task 2's hygiene check greps the whole base-to-HEAD diff for any added/removed line containing the literal substring `java-interop.js` next to a quote, to catch a future plan changing java-interop.ts's own import path. `counting-java-interop.js` incidentally ends in that exact substring (`...ing-` + `java-interop.js` + `'`), so the new `import { createCountingInteropServices, rawMethod } from './counting-java-interop.js';` line tripped the check as a false positive — `test "$(git diff … | grep -c -E "^[-+].*java-interop\.js['\"]")" = 0` failed.
- **Fix:** Reimplemented the same test directly on `createBBjTestServices` (already safely imported, no path collision) with a local structural interface (`ResolvableInterop`) cast onto `JavaInteropTestService`'s inherited (never overridden) protected `resolveClass`, matching the codebase's existing "structural view onto a protected member, reached via cast" idiom (`java-class-lookups-real-interop.test.ts`'s `InteropPrivates`). This needed no import of any `*-java-interop.js` path. The "createBBjTestServices, createCountingInteropServices and createFakePeerServices each hand out a synchronously-initialised provider" test dropped its `createCountingInteropServices` sub-check for the same reason — the underlying guarantee is proven generically because all three factories build their `JavadocProvider` from the exact same `createInitializedJavadocProvider` primitive (plan 01), and `createBBjTestServices`/`createFakePeerServices` are still checked directly.
- **A second, genuine bug surfaced while building the replacement:** `JavaInteropTestService`'s constructor kicks off 15 fake-class `resolveClass()` calls *without awaiting them* (pre-existing, out of scope for this plan). Those promises keep resolving in the background across `await` points in later test code, so a `createBBjTestServices()`-based `CustomSpy.not.toHaveBeenCalled()` on the "other" services set's provider is flaky — it can pick up that set's own leftover construction-time calls to unrelated primitive classes (`int`, `char`), not cross-talk between sets. Diagnosed with a throwaway instrumented test (not committed); fixed by asserting on the spy's call args for the specific scripted class name (`dto.name === 'com.test.Documented'`) rather than "called at all", which is correct regardless of that background noise.
- **Files modified:** bbj-vscode/test/javadoc.test.ts
- **Verification:** `test/javadoc.test.ts` run three times in a row (13/13 passing each time, no flake observed); lint, typecheck:test and build re-run clean; the hygiene verify command reprinted `hygiene OK`.
- **Committed in:** `c42513d3`

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug/flakiness found in a test authored in this same plan, before it was ever measured against the phase base).
**Impact on plan:** No production code affected. The regression test's coverage is unchanged in substance (same five behaviours proven); only its data-source and one factory-name in the synchronicity test changed. No scope creep — `JavaInteropTestService`'s unawaited-preload behavior itself was diagnosed but deliberately left alone as pre-existing and out of scope.

## Issues Encountered

None beyond the deviation above.

## Verification Evidence

**Base SHA:** `bb5404a0` (recorded in plan 01)
**REF-09 end SHA:** `c42513d31ca4cad14e58001bffd7f75a5e6ce51a` (the fix commit, before the REQUIREMENTS.md docs commit — recorded at `/home/coder/repos/tmp/phase-121/ref09-end-sha.txt`)
**Peer state:** `up` (`:5008` reachable; unchanged from plan 01's recording)

**RED test names (failed against the still-shared singleton):**
- `Two createBBjServices sets hand out distinct JavadocProvider objects`
- `Initialising one services set leaves a second, independently built services set uninitialised`
- `Two independently initialised providers answer only their own package and read only their own file system`
- `A second initialize() on one provider rejects without touching the other`

**GREEN:** all 13 tests in `test/javadoc.test.ts` pass (`Test Files 1 passed (1)`, `Tests 13 passed (13)`).

**Task 1's own load-bearing run:** `test/javadoc.test.ts test/inlay-hints-javadoc.test.ts test/javadoc-markdown-escape.test.ts test/java-interop-socket.test.ts test/java-interop-peer-guard.test.ts test/hover.test.ts test/ws-manager.test.ts` — `Test Files 7 passed (7)`, `Tests 117 passed (117)`.

**Task 1's four functional live-interop files** (peer reachable): `Test Files 4 passed (4)`, `Tests 14 passed (14)`.

**Task 2 — double-class check:** `doubles unchanged apart from javadoc wiring` (all nine test-double classes: `JavaInteropTestService`, `CountingJavaInteropService`, `FakePeerInteropService`, `MockableJavaInteropService`, `CyclicFakeInteropService`, `HangingMembersInteropService`, `LoopbackInterop`, `HangingBackendInterop`, `WireRecordingInteropService`).

**Task 2 — assertions-unchanged check:** `assertions unchanged` (no `expect(`/`test(`/`describe(` line changed in any REF-09 test file except added lines in `javadoc.test.ts`).

**Task 2 — whole suite (suite-02):**
```
numFailedTests=0 numPassedTests=3644 numPendingTests=30 numTotalTests=3674 failedSuites=1 lines=1
```
Failing suite name: `test/functional/installed-extension-e2e.test.ts > (suite failed)` — identical to the base list (`comm -13` returned empty). `setopts-in-code-request.test.ts` and `functional/parse-program-live.test.ts` (the two files mixing production and test services) both ran and passed in this run.

**Task 2 — gates:** `npm run lint`, `npm run typecheck:test`, `npm run build` all exit 0 (`gates OK`).

**Task 2 — hygiene:** no new planning identifier, no closing-keyword commit body, no changed `java-interop.js` import line, and the changed-file set matches exactly the eighteen expected REF-09 files (`hygiene OK`).

**Task 2 — REF-09 closed check:** `ref09-end-sha.txt` is an ancestor of HEAD, `bbj-vscode` has no diff after it, `REF-09` is `[x]`, `REF-12` stays `[ ]` (`REF-09 closed`).

**REF-09 file list (18 files: 5 `src/`, 13 `test/`):**
- `bbj-vscode/src/language/bbj-hover.ts` (plan 01) - reads `javadocProvider` from injected services
- `bbj-vscode/src/language/bbj-module.ts` (plans 01+02) - registers `java.JavadocProvider`; factory now builds a fresh instance
- `bbj-vscode/src/language/bbj-ws-manager.ts` (plan 01) - captures `javadocProvider` from `bbjServices.java`, passes into `tryInitializeJavaDoc`
- `bbj-vscode/src/language/java-interop.ts` (plan 01) - `javadocProvider` field assigned from injected services
- `bbj-vscode/src/language/java-javadoc.ts` (plans 01+02) - constructor made public (01); `_instance`/`getInstance()` deleted (02)
- `bbj-vscode/test/bbj-test-module.ts` (plan 01) - `createInitializedJavadocProvider` export; `BBjTestModule`'s `JavadocProvider` factory
- `bbj-vscode/test/counting-java-interop.ts` (plan 01) - `JavadocProvider` factory added, guard deleted
- `bbj-vscode/test/fake-interop-peer.ts` (plan 01) - `JavadocProvider` factory added, guard deleted
- `bbj-vscode/test/functional/issue440-real-interop.test.ts` (plan 02) - guard reads `services.BBj.java.JavadocProvider`
- `bbj-vscode/test/functional/issue447-real-interop.test.ts` (plan 02) - both guards read `services.BBj.java.JavadocProvider`
- `bbj-vscode/test/functional/java-class-lookups-real-interop.test.ts` (plan 02) - guard reads `services.BBj.java.JavadocProvider`
- `bbj-vscode/test/functional/unknown-java-member-real-interop.test.ts` (plan 02) - guard reads `services.BBj.java.JavadocProvider`
- `bbj-vscode/test/inlay-hints-javadoc.test.ts` (plan 01) - `beforeAll` builds its own provider, hands it to `createBBjTestServices`
- `bbj-vscode/test/java-interop-peer-guard.test.ts` (plan 01) - 5 spy targets retargeted
- `bbj-vscode/test/java-interop-service.test.ts` (plan 01) - `JavadocProvider` factory added, guard deleted
- `bbj-vscode/test/java-interop-socket.test.ts` (plan 02) - `newInterop()` guard reads `services.java.JavadocProvider`
- `bbj-vscode/test/javadoc-markdown-escape.test.ts` (plan 01) - 5 spy targets retargeted
- `bbj-vscode/test/javadoc.test.ts` (plan 02) - `'Check initialize called'` updated; `#624` regression describe block added

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- REF-09 is complete: `JavadocProvider` is a plain DI-registered class with no process-wide singleton, and the #624 regression suite proves the independence guarantee directly.
- `ref09-end-sha.txt` (`c42513d3…`) is recorded for plans 03-10 (the `JavaInteropService` split, REF-12) to diff their own "no pre-existing test file changed" claims against, per the plan's stated purpose.
- `JavaInteropTestService`'s unawaited constructor-time `resolveClass()` preload (pre-existing, diagnosed but not fixed here — see Deviations) is worth a note for any future test author spying on `JavadocProvider.getDocumentation` against a `createBBjTestServices`/`createCountingInteropServices`/`createFakePeerServices` double: assert on specific call arguments, not blanket "not called at all", to avoid flakiness from that background activity. Not filed as a WINDOWS.md entry — it caused no test failure in the committed suite and is out of this plan's scope.

## Self-Check: PASSED

All key files (`bbj-vscode/src/language/bbj-module.ts`, `bbj-vscode/src/language/java-javadoc.ts`, `bbj-vscode/test/javadoc.test.ts`, `bbj-vscode/test/java-interop-socket.test.ts`, the four functional test files, `.planning/REQUIREMENTS.md`) confirmed present on disk with the expected content (`grep -c '_instance|getInstance' java-javadoc.ts` = 0; `JavadocProvider: () => new JavadocProvider()` present in `bbj-module.ts`; `#624` present in `javadoc.test.ts`; `REF-09` ticked in `REQUIREMENTS.md`). All four commits (`f38c8930`, `9c83b8d8`, `c42513d3`, `1842aff9`) confirmed present in `git log`.

---
*Phase: 121-java-interop-service-decomposition*
*Completed: 2026-09-29*
