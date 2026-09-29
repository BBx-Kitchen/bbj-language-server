---
phase: 121-java-interop-service-decomposition
plan: "10"
subsystem: api
tags: [java-interop, refactor, javadoc, dependency-injection, close-out]

requires:
  - phase: 121-java-interop-service-decomposition
    provides: "all nine prior plans: REF-09 (JavadocProvider DI), and REF-12's five extracted collaborator modules (ResolutionLock, JavaInteropConnection, CompleteClassIndex, ClasspathLoader, JavaResolutionCache) plus the exports-check.mjs D-08 harness"
provides:
  - "Task 1: phase-wide evidence that the whole of REF-09 and REF-12 matches the phase base in file set, public API, protected hooks, DI registrations, import graph, clearCache order, test assertions and test-double bodies, with each of the five modules independently testable and the whole suite, lint, typecheck and build clean"
  - "Task 1: both distributables (VSIX, IntelliJ zip) built from the final tree, proven fresh and byte-identical in their bundled language server"
  - "Task 2: the roadmap's live hand check against a running BBjServices in VS Code and IntelliJ — approved 2026-09-29; REF-12 marked complete"
affects: []

actuals:
  tokens: 9800
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Phase close-out plan: re-run every phase-wide regression check (file set, API surface, import graph, clearCache order, assertion/double-body diff, per-module isolation, whole suite, gates, hygiene) one more time against the recorded phase base, then build and freshness-prove both distributables before handing off to a human for the one check automation cannot do."

key-files:
  created: []
  modified: []

key-decisions:
  - "Task 1 completed and committed on its own; Task 2 (the live hand-check checkpoint) was left open pending human approval. This SUMMARY was completed by a continuation executor after the checkpoint was answered 'approved', per the plan's 'After the checkpoint' section."
  - "The IntelliJ gradle test task failed one test, ComposerRequestContractTest, a documented pre-existing failure (since 116-02 moved the bbj/refreshJavaClasses literal out of main.ts; tracked in STATE.md Blockers/Concerns). Per the executor shell rules, this was reported and not fixed; the plugin zip was built with 'gradlew buildPlugin -x test' as instructed."

requirements-completed: [REF-12]

coverage:
  - id: D1
    description: "The whole phase (REF-09 + REF-12) matches its base in file set, public API/protected hooks, DI registrations, import graph, clearCache order, exports, test assertions and test-double bodies; each of the five extracted modules passes its own test in isolation; the whole suite, lint, typecheck:test and build are clean; hygiene (no planning ids, no closing keywords) is clean"
    requirement: "REF-12"
    verification:
      - kind: unit
        ref: "Task 1's eight <verify> commands — phase file set, API surface/graph/order, assertions and doubles unchanged, each module tested alone (lock/connection/class-index/classpath/cache), whole suite (suite-10, 3,724 tests), gates (lint/typecheck:test/build), hygiene"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both distributables (the VS Code VSIX and the IntelliJ plugin zip) are built from the final tree, non-empty, the IntelliJ zip's bundled language server is byte-identical to bbj-vscode/out/language/main.cjs, and the VSIX is newer than the last source commit"
    requirement: "REF-12"
    verification:
      - kind: unit
        ref: "Task 1's eighth <verify> command ('distributables fresh')"
        status: pass
    human_judgment: false
  - id: D3
    description: "Against a live BBjServices, hover, completion, the missing-USE quick fix and Refresh Java Classes behave as before in VS Code and IntelliJ (roadmap success criterion 4); REF-12 is marked complete only after this is approved"
    requirement: "REF-12"
    verification:
      - kind: manual_procedural
        ref: "Task 2 checkpoint:human-verify hand-check script (hover, completion, missing-USE quick fix, Refresh Java Classes) in VS Code and IntelliJ against live BBjServices :5008"
        status: pass
    human_judgment: true
    rationale: "Task 2 checkpoint:human-verify — a human exercised both built IDEs against the live interop peer and responded 'approved' on 2026-09-29. See 'Task 2 — approval record' below."
  - id: D4
    description: "JavadocProvider is a DI service with no getInstance() singleton (REF-09)"
    requirement: "REF-09"
    verification:
      - kind: unit
        ref: "already measured complete in 121-02-SUMMARY.md; re-confirmed unchanged in Task 1's phase-wide diff against the phase base"
        status: pass
    human_judgment: false

duration: 42min (Task 1) + close-out
completed: 2026-09-29
status: complete
---

# Phase 121 Plan 10: Java Interop Service Decomposition Close-out Summary

**The whole phase (JavadocProvider DI plus the five-way JavaInteropService split into ResolutionLock/JavaInteropConnection/CompleteClassIndex/ClasspathLoader/JavaResolutionCache) measures byte-for-byte clean against the phase base across file set, API surface, import graph, clearCache order, test assertions/doubles, per-module isolation, the whole suite, gates and hygiene; both distributables were built fresh from the final tree and approved by hand in VS Code and IntelliJ against a live BBjServices — REF-12 is complete.**

## Performance

- **Duration:** 42 min (Task 1) + Task 2 checkpoint (human hand-check, elapsed time not tracked)
- **Started:** 2026-09-29T12:56:00Z (approx.)
- **Completed:** 2026-09-29 (Task 2 approved; SUMMARY closed out by continuation executor)
- **Tasks:** 2 of 2
- **Files modified:** 2 (this SUMMARY, REQUIREMENTS.md)

## Accomplishments

- Re-ran all eight of Task 1's phase-wide `<verify>` commands against the recorded phase base; all eight passed, each printing its expected line.
- Built both distributables from the final tree (`/tmp/bbj-lang.vsix`, `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`), installed the VSIX into the "VS Code (ext test)" code-server, and proved the IntelliJ zip's bundled `main.cjs` is byte-identical to `bbj-vscode/out/language/main.cjs`.
- Confirmed the `:5008` live interop peer is still up, matching `peer-state.txt`'s recorded `up`.
- Documented the pre-existing IntelliJ `ComposerRequestContractTest` failure (tracked in STATE.md's Blockers/Concerns since Phase 120) rather than fixing it, per the executor shell rules; the plugin zip was built with `-x test` after confirming it was the only failing test (1 of 1160).
- Task 2's live hand check was run against a live BBjServices on `127.0.0.1:5008` in both VS Code (from `/tmp/bbj-lang.vsix`, sha256 `a36bb7c3…`) and IntelliJ (from `bbj-intellij-0.1.0.zip`, sha256 `02dce861…`, built with `-x test`), covering hover, completion, the missing-USE quick fix and Refresh Java Classes; approved 2026-09-29. REF-12 marked complete in `REQUIREMENTS.md`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Whole phase measured against its base, each module tested on its own, both distributables built from the final tree** — SUMMARY committed as `docs(phase): record the java interop decomposition evidence` (commit `08b51901`).
2. **Task 2: Live hand check in VS Code and IntelliJ against a running BBjServices** — `checkpoint:human-verify`, blocking; approved by the human. Approval record and REF-12 completion committed as `docs(requirements): mark the java interop decomposition complete`.

## Files Created/Modified

- `.planning/phases/121-java-interop-service-decomposition/121-10-SUMMARY.md` — created by Task 1, completed with the Task 2 approval record by the continuation executor
- `.planning/REQUIREMENTS.md` — REF-12 checkbox and traceability row marked complete

No source or test files were modified by this plan; the whole plan is a measurement-and-approval close-out.

## Decisions Made

See `key-decisions` in the frontmatter.

## Deviations from Plan

None — plan executed exactly as written. Task 2's stop for human approval was a designed checkpoint, not a deviation; it resumed on "approved" with no gap findings to plan.

## Issues Encountered

- IntelliJ's `./gradlew buildPlugin` first run failed its `:test` task on one pre-existing failure (`ComposerRequestContractTest`, 1159/1160 passed). This is the same known issue recorded in STATE.md's Blockers/Concerns ("`ComposerRequestContractTest` fails since 116-02 moved the `bbj/refreshJavaClasses` literal from `main.ts` to `language/java-class-refresh.ts`"), not a regression introduced by this phase. Per the executor shell rules, it was not fixed; `./gradlew clean buildPlugin -x test --console=plain -q` was used instead, exit 0.

## Verification Evidence

**Phase base SHA:** `bb5404a0aa90c6365efb9b7d8bd28da718edd173`
**REF-09 end SHA (plan 02):** `c42513d31ca4cad14e58001bffd7f75a5e6ce51a`
**Final HEAD at Task 1 measurement time:** `dac2262e60ae0b51d4724147b585e9dce274ae12` (121-09's own commit)
**Live peer state:** `up` (matches `peer-state.txt`)
**Precondition:** `node /home/coder/repos/tmp/phase-121/exports-check.mjs` → `exports base=15 head=15 missing=0` / `exports OK`

### Verify command 1 — phase file set

```
phase file set OK
```
Exactly the ten planned `src` files changed since the base, exactly the five new REF-12 module test files added, exactly 13 pre-existing test files modified, no file deleted or renamed.

### Verify command 2 — API surface, import graph and clearCache order

```
API surface, graph and order OK
```
All 18 public delegate methods present, all 9 protected hooks present, all 6 protected members (`classpath`, `_connectionGeneration` get/set, `langiumDocuments`, `classpathDocument`, `javadocProvider`) present; zero collaborator classes registered in `bbj-module.ts`'s DI; zero modules import `./java-interop.js`; the connection and lock leaf modules import no sibling; `clearCache()`'s nine-statement sequence matches the base's documented six-step order exactly, ending with `logger.info('Java interop cache cleared')`; `exports-check.mjs` again reports `exports base=15 head=15 missing=0`.

### Verify command 3 — assertions and test-double bodies unchanged

```
assertions and doubles unchanged
```
No `expect(...)`/`test(...)`/`it(...)`/`describe(...)` line changed in any of the 13 modified test files except `javadoc.test.ts`, which only gained lines (the #624 regression suite from plan 02); all nine test-double class bodies (`JavaInteropTestService`, `CountingJavaInteropService`, `FakePeerInteropService`, `MockableJavaInteropService`, `CyclicFakeInteropService`, `HangingMembersInteropService`, `LoopbackInterop`, `HangingBackendInterop`, `WireRecordingInteropService`) are byte-identical to the base apart from the javadoc-wiring lines D-10 permits.

### Verify command 4 — each module tested in isolation

```
each module tested on its own
```
| Module test file | Tests | Result |
|---|---|---|
| `test/java-interop-lock.test.ts` | 6 | passed |
| `test/java-interop-connection.test.ts` | 14 | passed |
| `test/java-interop-class-index.test.ts` | 7 | passed |
| `test/java-interop-classpath.test.ts` | 10 | passed |
| `test/java-interop-cache.test.ts` | 13 | passed |

### Verify command 5 — whole suite (suite-10)

```
numFailedTests=0 numPassedTests=3694 numPendingTests=30 numTotalTests=3724 failedSuites=1 lines=1
```
Failing name: `test/functional/installed-extension-e2e.test.ts > (suite failed)` — identical to the base list. `comm -13 suite-base-failed.txt suite-10-failed.txt` returned empty (no new failing name). `suite names OK`.

**Phase-wide suite progression (every plan's whole-suite run against the same base list, all with `comm -13` empty):**

| Run | numFailedTests | numPassedTests | numPendingTests | numTotalTests | New failing names vs. base |
|---|---|---|---|---|---|
| base | 0 | 3637 | 30 | 3667 | — |
| suite-01 (121-01) | 0 | 3637 | 30 | 3667 | none |
| suite-02 (121-02) | 0 | 3644 | 30 | 3674 | none |
| suite-03 (121-03) | 0 | 3650 | 30 | 3680 | none |
| suite-04 (121-04) | 0 | 3659 | 30 | 3689 | none |
| suite-05 (121-05) | 0 | 3664 | 30 | 3694 | none |
| suite-06 (121-06) | 0 | 3671 | 30 | 3701 | none |
| suite-07 (121-07) | 0 | 3681 | 30 | 3711 | none |
| suite-08 (121-08) | 0 | 3688 | 30 | 3718 | none |
| suite-09 (121-09) | 0 | 3694 | 30 | 3724 | none |
| suite-10 (this plan) | 0 | 3694 | 30 | 3724 | none |

The single failing suite name (`installed-extension-e2e.test.ts`, a pre-existing stale-installed-bundle issue) is identical across every run in the table, base through this plan.

### Verify command 6 — gates

```
gates OK
```
`npm run lint` (0 warnings), `npm run typecheck:test`, `npm run build` all exit 0.

### Verify command 7 — hygiene

```
hygiene OK
```
No added `src`/`test` line since the base carries a planning identifier the base did not already have; no commit body since the base carries a GitHub closing keyword.

### Distributables built and Verify command 8 — distributables fresh

```
distributables fresh
```

| Artifact | Path | sha256 |
|---|---|---|
| VS Code extension | `/tmp/bbj-lang.vsix` | `a36bb7c3c4197275e1754842af006ebe95ae4aa071edc99b9dc02641d626c1ac` |
| IntelliJ plugin | `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` | `02dce8619bba96f5d8471e45d3b18ace378b0c89cdbb9a28cd94f298296d43d7` |

The IntelliJ zip's bundled `bbj-intellij/lib/language-server/main.cjs` is byte-identical (`cmp` exit 0) to `bbj-vscode/out/language/main.cjs`. The VSIX's mtime is newer than the last commit touching `bbj-vscode/src`. The VSIX was installed into the "VS Code (ext test)" code-server (port 13338).

**Note for the next step:** per standing practice, both distributables must be rebuilt from the final tree again after any code-review fixes to this phase, before the milestone PR's own UAT.

## Module table (REF-12 + REF-09 final shape)

| Module file | Exported class | Responsibility | Hooks it receives (call-time, routed back through the front's own possibly-overridden method) | Lines |
|---|---|---|---|---|
| `java-interop-lock.ts` | `ResolutionLock` | Request lock: `acquire`, `currentToken`, `reset` (FIFO re-entrancy) | none — zero-import leaf module | 73 |
| `java-interop-connection.ts` | `JavaInteropConnection` | Connection lifecycle: socket, three-state circuit breaker, connection generation, recovery listeners, plus the dedicated `parseProgram` lane | `createSocket()`, `wrapSocket(socket)`, `connect()` | 578 |
| `java-interop-class-index.ts` | `CompleteClassIndex` | Complete class index: build, has, clear, size, simple-name and prefix lookup | `connect()`, `probeIfDue()`, `buildCompleteClassIndex(fqns)` | 141 |
| `java-interop-classpath.ts` | `ClasspathLoader` | Classpath loading and implicit-import loading | `connect()`, `resolveClass(javaClass, token)`, `registerResolvedClass(name, javaClass)`, `classpath()`, `ensureClasspathDocument()`, `addTopLevelPackage(packageName)` | 183 |
| `java-interop-cache.ts` | `JavaResolutionCache` | Resolved-class LRU cache, package/children tree, and the full class-resolution pipeline (`resolveClassByName`/`doResolveClassByName`/`createStubClass`/`resolveClass`) | `classpath()`, `ensureClasspathDocument()`, `getDocumentation(node)`, `getRawClass(className, token)`, `resolveClass(javaClass, token, depth)`, `resolveClassByName(className, token, depth)` | 900 |
| `java-javadoc.ts` | `JavadocProvider` | Javadoc source loading (REF-09 DI service; not a REF-12 collaborator — registered directly at `services.java.JavadocProvider`) | n/a — plain constructor-injected DI service, no hooks | 212 |
| `java-interop.ts` | `JavaInteropService` (front) | Wiring and delegation: builds all five collaborators as private fields with call-time hook closures, keeps every protected test hook and the whole public API as thin delegates, and orchestrates `clearCache()` | n/a — is the object the hooks close over `this` for | 467 |

**`java-interop.ts` line count:** 467, against the phase base's 1,764 (a 73% reduction on the front class; the removed ~1,297 lines moved into the five sibling modules plus `java-javadoc.ts`'s DI wiring, with zero net loss — collaborator lines (73+578+141+183+900=1,875) plus the front's 467 plus `java-javadoc.ts`'s 212 = 2,554 total across the seven files that changed since the base, vs. the base's single 1,764-line file plus its then-separate `java-javadoc.ts`).

## Task 2 — approval record

**Approved:** 2026-09-29
**Response:** "approved"
**IDEs checked:** VS Code (ext-test code-server, port 13338, from `/tmp/bbj-lang.vsix`, sha256 `a36bb7c3c4197275e1754842af006ebe95ae4aa071edc99b9dc02641d626c1ac`) and IntelliJ (from `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`, sha256 `02dce8619bba96f5d8471e45d3b18ace378b0c89cdbb9a28cd94f298296d43d7`, built with `-x test` per the documented pre-existing `ComposerRequestContractTest` failure).
**Live peer:** BBjServices on `127.0.0.1:5008`.
**Steps checked:** hover (HashMap and a BBjAPI method via `getGlobalNamespace()`), completion (`h!.` and `api!.`), the missing-USE quick fix for `ArrayList`, and Refresh Java Classes — all behaved as before in both IDEs, per the script below.
**Outcome:** No differences reported. REF-12 marked complete in `.planning/REQUIREMENTS.md` (checkbox and traceability row).

The live hand check was the plan's Task 2, a `checkpoint:human-verify gate="blocking"` task, answered by a human. The script, reproduced from the plan for the record:

**Preconditions:** BBjServices running and answering on `127.0.0.1:5008` (confirmed `up` above). VSIX already installed into the "VS Code (ext test)" code-server (port 13338); reload that tab, or install `/tmp/bbj-lang.vsix` via "Extensions: Install from VSIX…" in any VS Code. In IntelliJ: Settings → Plugins → Install Plugin from Disk… with `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`, then restart.

**Warm-up (both IDEs):** open a BBj file from `examples/` that uses sysgui classes (e.g. one declaring a `BBjWindow` or `BBjHtmlView`) and wait for "Loaded N classes" in the server log. Cold resolution of a large class can hit the 30s timeout; retry hover after a few seconds — that is not a finding.

**Then, in VS Code and again in IntelliJ, in a scratch `.bbj` file:**
1. **Hover:** `declare java.util.HashMap h!` — hovering `HashMap` shows the class header and its documentation as before; `api! = BBjAPI()` then hovering a method in `api!.getGlobalNamespace()` shows its signature and javadoc text as before.
2. **Completion:** after `h!.` the completion list offers HashMap's methods (`put`, `get`, …) with details; after `api!.` it offers BBjAPI methods.
3. **Missing-USE quick fix:** `declare ArrayList a!` with no `use` line — the unresolved-class diagnostic offers the quick fix that adds `use java.util.ArrayList`, and applying it clears the diagnostic.
4. **Refresh Java Classes:** run "BBj: Refresh Java Classes" (VS Code command palette) or the IntelliJ refresh action — the information message appears, the server log shows "Java interop cache cleared", and steps 1-2 still work afterward.
5. The language server log shows no new error stack traces from java-interop during these steps.

**Resume signal:** "approved", or a description of what behaved differently (IDE, step, what was seen).

## Closing lines for the milestone PR (not for any commit body in this branch)

```
Closes #624
Closes #558
```

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Both tasks are complete. Task 2's checkpoint was approved 2026-09-29; REF-12 is marked complete in `.planning/REQUIREMENTS.md` (checkbox and traceability row).
- REF-09 was already marked complete by plan 02 and is untouched by this plan.
- Phase 121 is fully closed: all ten plans landed clean, both requirements (REF-09, REF-12) complete, the phase measures byte-for-byte clean against its base, and the live hand check in both IDEs confirmed unchanged behaviour against a real BBjServices peer.
- Per the plan's note, both distributables must be rebuilt from the final tree again after any code-review fixes to this phase, before the milestone PR's own UAT.
- Next: `.planning/ROADMAP.md` and `.planning/STATE.md` plan-progress bookkeeping (10/10 for Phase 121), then Phase 122 (Release & CI Pipeline Hardening).

## Self-Check: PASSED

- `.planning/phases/121-java-interop-service-decomposition/121-10-SUMMARY.md` confirmed present on disk (this file).
- All eight Task 1 verify commands re-run above and confirmed passing at write time.
- `/tmp/bbj-lang.vsix` and `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` confirmed present and non-empty on disk, sha256 recorded above.
- Task 2 approval recorded above (date, IDEs, builds used, outcome).
- REQUIREMENTS.md confirmed to carry the REF-12 checkbox and traceability-row edit only (`git diff --stat` for that path shows a 2-line change).

---
*Phase: 121-java-interop-service-decomposition*
*Completed: 2026-09-29*
