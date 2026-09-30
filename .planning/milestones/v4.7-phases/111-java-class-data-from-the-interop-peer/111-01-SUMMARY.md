---
phase: 111-java-class-data-from-the-interop-peer
plan: 01
subsystem: api
tags: [java-interop, security, input-validation, langium, vitest]

# Dependency graph
requires:
  - phase: 110-workspace-settings-filesystem-trust
    provides: "the plain-module pattern (config-path-resolver.ts / interop-config.ts) this phase's java-peer-guard.ts follows"
provides:
  - "java-peer-guard.ts: MAX_JAVA_IDENTIFIER_LENGTH, MAX_JAVADOC_LENGTH, MAX_PEER_ERROR_LENGTH, TRUNCATION_MARKER, UNREADABLE_PEER_ERROR, truncateText, isUsableJavaClassName, sanitizeJavaClassDto — the single owner of every bound applied to java-interop peer class data"
  - "JavaInteropService.resolveClass() guarded at entry (unusable class name -> uncached stub) and before storeJavaClass() (sanitizeJavaClassDto); loadImplicitImports() survives a non-array/non-object/unusable-name entry"
  - "Phase 2 javadoc and javadoc-parameter-realName bounds, with one combined logger.warn line per adjusted class"
affects: [111-02, 111-03, 111-04, 111-05]

# Actuals (#2632)
actuals:
  tokens: 11436
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plain guard module (java-peer-guard.ts) with no Langium/editor imports, mirroring config-path-resolver.ts/interop-config.ts"
    - "Bound-not-reject: free text is always truncated with a visible marker, never rejected"
    - "One combined logger.warn line per class, naming only field paths, never a rejected value"

key-files:
  created:
    - bbj-vscode/src/language/java-peer-guard.ts
    - bbj-vscode/test/java-interop-peer-guard.test.ts
  modified:
    - bbj-vscode/src/language/java-interop.ts

key-decisions:
  - "D-01/D-02/D-03/D-04/D-05 implemented as designed: one shared plain module, guard runs before storeJavaClass and before any field is copied, member/class-level/free-text rules by kind, fixed constants clearing every measured real value, one log line per class naming field paths only"
  - "Rule 1 fix (not in the original plan): packageName/simpleName sanitization must accept an empty string — '' is the legitimate spelling of the unnamed/default package (BBjAPI's synthetic test class carries it) — so a dedicated isUsablePackageOrSimpleName predicate replaces the reused isUsableJavaClassName, which wrongly required non-empty"

patterns-established:
  - "sanitizeJavaClassDto mutates the peer DTO in place and returns field-path-only notes; callers decide whether/how to log them"

requirements-completed: [SEC-03]

coverage:
  - id: D1
    description: "A peer member (field/method/constructor/parameter) with an unusable name or type is dropped before storage, proven end-to-end through the real resolveClass()/resolveClassByName()/resolveRaw() pipeline"
    requirement: SEC-03
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-peer-guard.test.ts#member drops: an oversized or wrongly typed field/method/parameter never reaches the class node"
        status: pass
    human_judgment: false
  - id: D2
    description: "A class whose name is unusable (non-string, empty, or over the identifier limit) never reaches canonicalJavaClassName or the package tree; it lands on the existing uncached stub path with no exception and no console.error"
    requirement: SEC-03
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-peer-guard.test.ts#an unusable class name never reaches canonicalJavaClassName or the package tree"
        status: pass
    human_judgment: false
  - id: D3
    description: "Class-level fields/methods/constructors/classes/parameters that are present but not arrays default to []; non-boolean isDeprecated/isStatic default to false; an oversized/non-string error is truncated or replaced; an unusable packageName/simpleName is removed so the caller's own derivation applies"
    requirement: SEC-03
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-peer-guard.test.ts#non-array class-level members default to [] instead of throwing"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/java-interop-peer-guard.test.ts#non-boolean isDeprecated/isStatic flags default to false"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/java-interop-peer-guard.test.ts#the class-level error field is truncated or replaced, never rejected"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/java-interop-peer-guard.test.ts#packageName and simpleName are removed when unusable, letting resolveClass derive its own"
        status: pass
    human_judgment: false
  - id: D4
    description: "loadImplicitImports (the bulk implicit-import path) treats a non-array getClassInfos answer as empty, skips a non-object entry without calling resolveClass, and skips building a simple-name copy for an entry whose name never became usable — no exception escapes the Promise.all"
    requirement: SEC-03
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-peer-guard.test.ts#loadImplicitImports survives junk entries in a getClassInfos answer (bulk path)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Javadoc text and javadoc parameter real names copied in Phase 2 are bounded with a visible marker; the stored signature is built from the bounded real name; a non-string docu/param name leaves the field unset instead of storing junk; Markdown is not escaped at storage time"
    requirement: SEC-03
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-peer-guard.test.ts#javadoc text and parameter real names copied in Phase 2 are bounded"
        status: pass
    human_judgment: false
  - id: D6
    description: "Dropping/defaulting/truncating a class's peer data logs exactly one combined logger.warn line per class, naming only the class and the affected field paths — never a rejected value"
    requirement: SEC-03
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-peer-guard.test.ts#sanitation adjustments log exactly one warn line per class, naming only field paths"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/java-interop-peer-guard.test.ts#a class with a dropped field and a truncated javadoc produces exactly one logger.warn line naming both field paths"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-09-26
status: complete
---

# Phase 111 Plan 01: Java Class Data from the Interop Peer Summary

**Every java-interop peer field is bounded and type-checked in one shared plain module (`java-peer-guard.ts`) before it is copied onto a `JavaClass` node, guarding `resolveClass()`'s entry, `storeJavaClass()`, Phase 2's javadoc/real-name copies, and the bulk implicit-import path — proven end to end through the real pipeline via `CountingJavaInteropService`/`FakePeerInteropService`, never `JavaInteropTestService`.**

## Performance

- **Duration:** 45 min
- **Started:** 2026-09-26T16:08:00Z (approx)
- **Completed:** 2026-09-26T16:46:35Z
- **Tasks:** 3 (plus 1 auto-fixed deviation)
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- `java-peer-guard.ts` — a plain, Langium-free module — is the single owner of `MAX_JAVA_IDENTIFIER_LENGTH` (1,024), `MAX_JAVADOC_LENGTH` (32,768), `MAX_PEER_ERROR_LENGTH` (1,024), `TRUNCATION_MARKER`, `UNREADABLE_PEER_ERROR`, `truncateText`, `isUsableJavaClassName`, and `sanitizeJavaClassDto`. The limits clear every measured real value (longest member name 40, longest class name 38, longest javadoc parameter name 30, longest javadoc text 11,615 characters) by a wide margin, per the phase's D-04 measurement.
- `resolveClass()` rejects an unusable class name (non-string, empty, or over 1,024 characters) as its very first statement — before `canonicalJavaClassName` (which throws on a non-string) or the package tree ever see it — landing on the existing uncached `createStubClass('', false)` path with one log line (`logger.debug` for an empty name from the routine local blank-type path, `logger.warn` otherwise) that never contains the rejected value.
- `sanitizeJavaClassDto` runs before any field is copied onto the node: a field/method/constructor/parameter with an unusable name or type is dropped from its array (the array is replaced only when something was dropped, so a clean class keeps its original array objects); non-array `fields`/`methods`/`constructors`/`classes`/`parameters` default to `[]` when present but invalid (absent stays absent for the existing `??= []` defaulting); non-boolean `isDeprecated`/`isStatic` default to `false`; an oversized `error` is truncated and a non-string one is replaced by `UNREADABLE_PEER_ERROR`; an unusable `packageName`/`simpleName` is removed so `resolveClass`'s own derivation applies.
- `loadImplicitImports` treats a non-array `getClassInfos` answer as empty, skips a non-object entry without ever calling `resolveClass`, and skips building a simple-name copy for an entry whose name never became usable — proven with a mix of a valid class and four kinds of junk entries against `FakePeerInteropService`, adding exactly the same classpath class count as a clean run.
- Phase 2 bounds the javadoc parameter real name and the stored method javadoc with `truncateText`, and builds the stored signature from the already-bounded real name instead of re-reading the raw javadoc text; a non-string `docu`/parameter name leaves the field unset rather than storing junk; Markdown is left unescaped at storage time (escaping is SEC-04's render-time concern, a later plan).
- All sanitation and Phase 2 adjustment notes are combined into exactly one `logger.warn` line per class, emitted once after Phase 2 completes, naming only the class and the affected field paths — never a rejected value, and never more than 100 consecutive characters of any input.

## Task Commits

Each task was committed atomically:

1. **Task 1: A peer member with an over-long or non-string name never reaches the class node, end to end** - `634be333` (feat)
2. **Task 2: An unusable class name, wrong-typed fields and an oversized error never throw or reach the package tree, including on the bulk path** - `752404e3` (feat)
3. **Task 3: Javadoc text and parameter names copied in Phase 2 are bounded with a visible marker, and the class still logs once** - `f8e49b58` (feat)
4. **Deviation fix: keep an empty-string packageName/simpleName usable** - `3090b66d` (fix)

_TDD tasks 2 and 3 are single commits here (red/green/refactor folded into one commit per task) since the plan's `<action>` for each described writing behavior rows first and implementation together; both tasks' tests were run green before committing._

## Files Created/Modified
- `bbj-vscode/src/language/java-peer-guard.ts` — new plain module: length-limit constants, `truncateText`, `isUsableJavaClassName`, `sanitizeJavaClassDto`, and the internal helpers backing them
- `bbj-vscode/src/language/java-interop.ts` — `resolveClass()` entry guard, `sanitizeJavaClassDto()` call before `storeJavaClass()`, Phase 2 javadoc/real-name bounds, combined single log line, `loadImplicitImports()` junk-entry handling
- `bbj-vscode/test/java-interop-peer-guard.test.ts` — new: member drops, class-name rejection, non-array defaulting, boolean-flag defaulting, free-text truncation/replacement, packageName/simpleName removal (and the empty-string regression), single-log-line assertions, `truncateText` unit tests, bulk-path junk-entry tests, Phase 2 javadoc/real-name bound tests

## Decisions Made
- Followed the plan's D-01..D-05 exactly: one shared plain module, guard at `resolveClass()`'s entry and before `storeJavaClass()`, member/class-level/free-text rules by kind, fixed constants, one log line per class.
- `resolveClass`'s per-task `logger.warn` call was moved (per Task 3's explicit instruction) from immediately after `sanitizeJavaClassDto` to a single combined call after Phase 2 completes, so a class that's also adjusted in Phase 2 (javadoc/real-name) still produces exactly one line.
- `truncateText`'s surrogate-pair handling shortens the cut by one more code unit whenever the last kept unit would be a high surrogate, so a pair is never split; verified with a dedicated test.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `packageName`/`simpleName` sanitization wrongly rejected a legitimate empty string**
- **Found during:** Post-task whole-suite verification (`npx vitest run --maxWorkers=2`)
- **Issue:** `sanitizeIdentifierStringField` reused `isUsableJavaClassName`, which requires a *non-empty* string. `packageName: ''` is the legitimate spelling of the unnamed/default package — the test suite's own `BBjAPI` synthetic class carries it (`test/bbj-test-module.ts`) — so the guard was deleting it and logging a spurious `packageName removed` warning, which broke `test/bbj-parser-service.test.ts`'s exact-warn-call-count assertions (12 failing tests).
- **Fix:** Added `isUsablePackageOrSimpleName`, identical to `isUsableJavaClassName` except it allows an empty string, and used it in `sanitizeIdentifierStringField` instead.
- **Files modified:** `bbj-vscode/src/language/java-peer-guard.ts`, `bbj-vscode/test/java-interop-peer-guard.test.ts`
- **Verification:** `test/bbj-parser-service.test.ts` (39/39) and the full `java-interop-peer-guard.test.ts` suite pass; added a regression test (`an empty-string packageName (the unnamed/default package) is kept, not removed`) asserting no warn line is logged.
- **Committed in:** `3090b66d`

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug).
**Impact on plan:** Necessary correctness fix, caught by the phase's own required whole-suite verification step before it could reach any other plan in this phase. No scope creep — no other files touched.

## Issues Encountered

**Environment/tooling notes (not code issues):**
- `npx tsc -p tsconfig.json` only type-checks `src/**/*.ts` (see `bbj-vscode/tsconfig.json`'s `include`); test files are not type-checked by that command. `bbj-vscode/tsconfig.test.json` is a pre-existing, already-broken project-references config (`TS6306`/`TS6310`: the referenced `tsconfig.json` must be `composite: true` and may not disable emit) — unrelated to this plan, not fixed here (out of scope: not caused by this plan's changes). `npx eslint test/java-interop-peer-guard.test.ts` was run instead as a lint-level sanity check and is clean.
- The whole-suite run (`npx vitest run --maxWorkers=2`) is flaky under parallel worker contention: `test/hover.test.ts`'s `beforeAll` hooks intermittently exceed the 10s hook timeout (`initializeWorkspace`), and `test/completion-test.test.ts` intermittently hits per-test timeouts — both resolve to full green on an isolated or retried run, matching this repository's documented "whole-suite hook timeouts are contention" pattern. Judged on `numFailedTests`, not failed-suite count.
- Final whole-suite run against `HEAD`: 11 failed tests, all in `test/linking.test.ts > Linking Tests > Interop related tests` — the repository's own documented local drift (BBjServices reachable on `:5008` during this session), not caused by this plan. No `issue447` capability-test failure was observed this run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `java-peer-guard.ts` is ready for 111-02 (Java-member linking Warning), 111-03 (Markdown escaping, which extends this same module with `escapeMarkdown`/`toFenceSafeLine`), 111-04 (package-name collision handling), and 111-05 (`isJavaQualifiedName`) to build on directly, per the phase's `<assumption_delta_decision>` (no new primary noun introduced).
- SEC-03 (#523) is closed for bounding and type-checking; its escaping half is explicitly deferred to SEC-04 (111-03), per the plan's own success criteria.
- No blockers for 111-02.

---
*Phase: 111-java-class-data-from-the-interop-peer*
*Completed: 2026-09-26*

## Self-Check: PASSED

- `bbj-vscode/src/language/java-peer-guard.ts` — FOUND
- `bbj-vscode/test/java-interop-peer-guard.test.ts` — FOUND
- `.planning/phases/111-java-class-data-from-the-interop-peer/111-01-SUMMARY.md` — FOUND
- Commit `634be333` — FOUND
- Commit `752404e3` — FOUND
- Commit `f8e49b58` — FOUND
- Commit `3090b66d` — FOUND
- All acceptance criteria greps (Tasks 1-3) re-run against final `HEAD` — all match expected counts
- `npx tsc -p tsconfig.json` — clean
- `npx vitest run test/java-interop-peer-guard.test.ts test/java-interop-nested-class-names.test.ts test/java-interop-local-types.test.ts test/java-interop-service.test.ts test/java-interop-breaker.test.ts test/inlay-hints-javadoc.test.ts test/hover.test.ts test/completion-test.test.ts test/bbj-parser-service.test.ts --maxWorkers=2` — all green
- Whole-suite `npx vitest run --maxWorkers=2` — 11 failed tests, all pre-existing `test/linking.test.ts` interop drift; 0 failures attributable to this plan
