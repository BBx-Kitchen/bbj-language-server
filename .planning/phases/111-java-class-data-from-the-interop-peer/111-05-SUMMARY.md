---
phase: 111-java-class-data-from-the-interop-peer
plan: 05
subsystem: api
tags: [java-interop, security, input-validation, langium, vitest, code-actions, completion]

# Dependency graph
requires:
  - phase: 111-java-class-data-from-the-interop-peer
    provides: "111-01's java-peer-guard.ts module (this plan adds isJavaQualifiedName to it); 111-03's escapeMarkdown/toFenceSafeLine pattern of render/insert-boundary gating, reused here as insert-boundary gating"
provides:
  - "isJavaQualifiedName in java-peer-guard.ts — the single owner of the Java-qualified-name check applied before any candidate class name from the interop peer is inserted into source as a `use` line"
  - "BBjCodeActionProvider.getCodeActions filters candidates before ranking; createUseAction refuses to build an edit for an invalid fqn on its own"
  - "BBjCompletionProvider.completeAutoImportClasses skips an invalid candidate before its simple name is computed, so it can never block a valid candidate with the same simple name"
affects: []

# Actuals (#2632)
actuals:
  tokens: 4393
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Insert-boundary gating: isJavaQualifiedName is checked immediately before a TextEdit/CodeAction is built (both call sites), mirroring 111-03's render-boundary escaping — the check lives where the text actually leaves the server, not where the candidate list is first produced"
    - "Filter-before-index: a candidate list is filtered for validity before the loop that assigns isPreferred/rank position runs, so the preferred flag naturally lands on the first surviving candidate with no separate re-ranking step"

key-files:
  created:
    - bbj-vscode/test/java-qualified-name.test.ts
  modified:
    - bbj-vscode/src/language/java-peer-guard.ts
    - bbj-vscode/src/language/bbj-code-action-provider.ts
    - bbj-vscode/src/language/bbj-completion-provider.ts
    - bbj-vscode/test/code-action.test.ts

key-decisions:
  - "D-09/D-10 implemented as designed: one predicate isJavaQualifiedName covers both call sites; each site checks its own candidate independently (the quick fix in the candidate-list filter plus createUseAction's own defensive check; completion in the completeAutoImportClasses loop) rather than trusting the other site's filtering"
  - "isJavaQualifiedName uses Unicode property escapes (\\p{L}, \\p{Nl}, \\p{Sc}, \\p{Pc}, \\p{Nd}, \\p{Mn}, \\p{Mc}) with the 'u' flag rather than an ASCII character class, so a non-ASCII Java identifier (com.exämple.Klasse) passes while a bidi-override or zero-width-space character is excluded by construction, without a separate denylist"

patterns-established:
  - "isJavaQualifiedName in java-peer-guard.ts: the shared insertion-time gate any future call site that builds a `use` TextEdit from an interop-peer-supplied name must import, not re-derive"

requirements-completed: [SEC-05]

coverage:
  - id: D1
    description: "isJavaQualifiedName accepts genuine Java qualified names (including $-nested and non-ASCII spellings, up to the 1,024-character identifier limit) and rejects a non-string, an empty string, a name with whitespace/semicolon/line break/other punctuation, an empty segment, a leading-digit segment, angle brackets, format/control characters (bidi override, zero-width space), and anything over the length limit"
    requirement: SEC-05
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-qualified-name.test.ts#isJavaQualifiedName accepts/rejects tables and the idempotency test"
        status: pass
    human_judgment: false
  - id: D2
    description: "The missing-USE quick fix drops an invalid candidate silently (debug log only, never the value), and when the top-ranked candidate is dropped the preferred flag moves to the next valid candidate instead of being lost"
    requirement: SEC-05
    verification:
      - kind: integration
        ref: "bbj-vscode/test/code-action.test.ts#BBj code actions — candidates that are not Java qualified names (#525)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Auto-import completion drops an invalid candidate before it consumes a simple name, so an invalid candidate sharing a simple name with a later valid candidate never hides it; an all-invalid candidate list offers no auto-import edit"
    requirement: SEC-05
    verification:
      - kind: integration
        ref: "bbj-vscode/test/java-qualified-name.test.ts#auto-import completion candidates that are not Java qualified names (#525)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Existing code-action and completion behavior is unchanged for valid candidates"
    requirement: SEC-05
    verification:
      - kind: integration
        ref: "bbj-vscode/test/code-action.test.ts (all pre-existing tests)"
        status: pass
      - kind: integration
        ref: "bbj-vscode/test/completion-test.test.ts (all pre-existing tests)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-09-26
status: complete
---

# Phase 111 Plan 05: The Missing-USE Quick Fix and Auto-Import Completion Insert Only Java Qualified Names Summary

**`isJavaQualifiedName` in the shared `java-peer-guard.ts` module gates both `createUseAction` and `completeAutoImportClasses` immediately before either builds a `use ${fqn}\n` edit, so a candidate class name carrying a line break, semicolon or other BBj statement text from the interop peer is dropped silently instead of being typed into the user's source, while the preferred/next-valid-candidate flag is never lost (issue #525).**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-26T17:51:21Z (approx, right after 111-04's docs commit)
- **Completed:** 2026-09-26T18:03:00Z (approx)
- **Tasks:** 2
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments
- `isJavaQualifiedName(fqn: unknown): fqn is string` in `java-peer-guard.ts` checks a candidate is 1 to `MAX_JAVA_IDENTIFIER_LENGTH` UTF-16 code units of one or more dot-separated segments, each segment starting with a Unicode letter, letter number, currency symbol (including `$`) or connector punctuation (including `_`), continuing with those plus decimal digits and combining marks — built with `\p{...}` Unicode property escapes under the `u` flag so it accepts non-ASCII identifiers (`com.exämple.Klasse`) and both nested-class spellings (`java.util.Map$Entry`, `java.util.Map.Entry`) while excluding format/control characters (a bidi override, a zero-width space) by construction, not by denylist.
- `BBjCodeActionProvider.getCodeActions` filters `resolveClassCandidatesBySimpleName`'s result with `isJavaQualifiedName` before `rankCandidates` runs, so `index === 0` always lands on the first candidate that is safe to insert — the preferred flag naturally moves to the next valid candidate when the top-ranked one is dropped, with no separate re-ranking logic. `createUseAction` now returns `CodeAction | undefined` and refuses to build the `TextEdit` for an invalid fqn as its own last-line check, independent of whether the caller already filtered.
- `BBjCompletionProvider.completeAutoImportClasses` skips an invalid candidate as the very first statement of its loop — before the simple name is even computed and before `alreadyOffered.add` — so an invalid candidate can never consume (and thereby hide) a later valid candidate that shares its simple name.
- Both call sites log exactly one `logger.debug` line when anything was dropped, naming only a count (and, for the quick fix, the simple name being resolved) — never a dropped value.
- `test/java-qualified-name.test.ts` (new) covers the predicate's accept/reject table (27 rows covering every case named in the plan's behavior spec, including the `$`-nested case tested directly since today's candidate producers never emit it), purity/idempotency, and — added in Task 2 — end-to-end auto-import completion cases against a fresh `createBBjTestServices` instance with `findClassCandidatesByPrefix` mocked.
- `test/code-action.test.ts` gained a new `describe` block covering: an invalid-candidate-mixed-with-one-valid-candidate case (exactly one preferred action, correct insertion text), a preferred-flag-reassignment case (`java.awt.List` beats `java.util.List` once `java.util List` is dropped), and an all-invalid case (no action).

## Task Commits

Each task was committed atomically:

1. **Task 1: The missing-USE quick fix never inserts a non-qualified name, and the preferred flag moves to the next valid candidate, end to end** - `b4cefe59` (feat)
2. **Task 2: Auto-import completion offers only Java qualified names, and an invalid candidate never hides a valid one** - `174d7568` (feat)

**Plan metadata:** (this commit) `docs(111-05): complete the missing-USE quick fix and auto-import completion insert only Java qualified names plan`

_Task 1 is a `type="tracer"` task: executed and committed exactly like `type="auto"`, then the tracer feedback gate re-ran its `<verify>` end to end (auto mode active) before Task 2 began — it passed, so expansion proceeded with no checkpoint. Task 2 carried `tdd="true"`; the test rows and the loop-guard implementation were written and run together per the plan's own `<action>` wording, and both were green before the single commit._

## Files Created/Modified
- `bbj-vscode/src/language/java-peer-guard.ts` — adds `isJavaQualifiedName` and its backing Unicode-property regex pattern, plus a module-header note for issue #525
- `bbj-vscode/src/language/bbj-code-action-provider.ts` — imports `isJavaQualifiedName`/`logger`; filters candidates before `rankCandidates`; `createUseAction` returns `CodeAction | undefined` and checks its own fqn
- `bbj-vscode/src/language/bbj-completion-provider.ts` — imports `isJavaQualifiedName`/`logger`; `completeAutoImportClasses`'s loop skips an invalid candidate before computing its simple name, and logs one debug line with a drop count
- `bbj-vscode/test/java-qualified-name.test.ts` — new: the predicate accept/reject table, idempotency test, and auto-import completion end-to-end cases (Task 2)
- `bbj-vscode/test/code-action.test.ts` — new `describe` block: dropped-candidate/preferred-action case, preferred-flag-reassignment case, all-invalid case

## Decisions Made
- Followed D-09/D-10 exactly as locked: one shared predicate, both call sites gate independently and silently drop (debug log only, never the value), and filtering happens before indexing/ranking so the preferred flag reassignment falls out naturally.
- Used `\p{L}\p{Nl}\p{Sc}\p{Pc}` for a segment's start character and added `\p{Nd}\p{Mn}\p{Mc}` for continuation characters, matching the plan's exact Unicode-category spec (`$` is category `Sc`, `_` is category `Pc`) rather than hand-listing individual characters.
- Kept the quick fix's two checks (the pre-rank filter in `getCodeActions` and `createUseAction`'s own defensive check) both in place rather than relying on only one: `createUseAction` is a `protected` method a future caller could invoke directly, so its own check is not redundant.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SEC-05 (#525) is code-complete. This was the last plan of Phase 111 (5 of 5): SEC-03 (#523, 111-01), SEC-04 (#524, 111-03), SEC-05 (#525, this plan), FIX-02 (#676, 111-04) and FIX-03 (the unresolved-Java-member-warning todo, 111-02) are all code-complete.
- Whole-suite run after this plan (`npx vitest run --maxWorkers=2`): 11 failed tests, all in `test/linking.test.ts > Linking Tests > Interop related tests` — the repository's own documented local drift (BBjServices reachable on `:5008` during this session), matching the exact baseline recorded by 111-01 and 111-03. Zero failures attributable to this plan's changes; all of `java-qualified-name.test.ts`, `code-action.test.ts`, `bbj-code-action-handler.test.ts`, `completion-test.test.ts` and `javadoc-markdown-escape.test.ts` are green in both targeted and whole-suite runs.
- No blockers. Phase 111 is ready for end-of-phase verification/UAT (per `workflow.human_verify_mode`, the manual UAT lines deferred by 111-03's SUMMARY are consolidated there).

---
*Phase: 111-java-class-data-from-the-interop-peer*
*Completed: 2026-09-26*

## Self-Check: PASSED

- `bbj-vscode/src/language/java-peer-guard.ts` — FOUND
- `bbj-vscode/src/language/bbj-code-action-provider.ts` — FOUND
- `bbj-vscode/src/language/bbj-completion-provider.ts` — FOUND
- `bbj-vscode/test/java-qualified-name.test.ts` — FOUND
- `bbj-vscode/test/code-action.test.ts` — FOUND
- `.planning/phases/111-java-class-data-from-the-interop-peer/111-05-SUMMARY.md` — FOUND
- Commit `b4cefe59` — FOUND
- Commit `174d7568` — FOUND
- All acceptance-criteria greps (Tasks 1-2) re-run against final `HEAD` — all match expected counts
- `npx tsc -p tsconfig.json` — clean
- `npx vitest run test/java-qualified-name.test.ts test/code-action.test.ts test/bbj-code-action-handler.test.ts test/completion-test.test.ts test/javadoc-markdown-escape.test.ts` — 114 passed
- Whole-suite `npx vitest run --maxWorkers=2` — 11 failed tests, all pre-existing `test/linking.test.ts` interop drift; 0 failures attributable to this plan
- No planning identifiers in the final source/test diff (`git diff --cached` re-checked before each commit)
