---
phase: 105-live-diagnostics-responsiveness-on-large-workspaces
plan: 04
subsystem: language-server
tags: [langium, diagnostics, reconciliation, verdict, concurrency, tdd]

requires:
  - phase: 105-01-live-parse-scheduling
    provides: "The event-armed live-parse cycle, the compute-first publish-once debounce cycle, and the state-aware publish split (client-only below Validated, write+notify at/above it)"
  - phase: 105-02-diagnostic-snapshot-composition
    provides: "composeWithVerdict, reconcileEarlyVerdict, the validated-text-aware LangiumDiagnosticsSnapshot, and the version/diagnostics-aware VerdictState -- all unwired until this plan"
provides:
  - "The validator composes its published list from the freshly validated diagnostics and the stored verdict via composeWithVerdict, including the verdict's own diagnostics when it is current for the live text version, and refreshes the verdict's seen set after reconciling against it"
  - "The builder's verdict cycle stores the verdict together with its text version and diagnostics, and composes against the latest known Langium snapshot (recalled via latestLangiumBaseline) instead of document.diagnostics or an ad-hoc reconcileWithVerdict call"
  - "The bbjcpl fallback and the USE-file-path revalidation both read/write through the same latestLangiumBaseline/recallLangiumSnapshot seam, so a concurrent writer overwriting document.diagnostics can never leak into either"
  - "An end-to-end interleaving test suite (8 tests) proving no diagnostic is ever lost, doubled or misattributed across arrival order, text-version skew, staleness and idempotency"
affects: [105-05]

actuals:
  tokens: 11642
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Every writer of document.diagnostics re-derives its whole list from one consistent snapshot (latestLangiumBaseline / recallLangiumSnapshot) rather than reading document.diagnostics directly -- immune to a concurrent writer's overwrite between an await and the write that follows it"
    - "A test that needs a third, independently-controlled syntax complaint layers a hand-placed Diagnostic onto a genuinely-validated snapshot via the production rememberLangiumDiagnostics/recallLangiumSnapshot API, rather than fighting the parser's own error-recovery for a third real syntax error"

key-files:
  created:
    - bbj-vscode/test/live-parse-interleaving.test.ts
  modified:
    - bbj-vscode/src/language/bbj-document-validator.ts
    - bbj-vscode/src/language/bbj-document-builder.ts
    - bbj-vscode/test/document-builder.test.ts

key-decisions:
  - "validateDocument() calls composeWithVerdict only when a verdict exists for the document (getVerdictState truthy) and the compiler trigger is on -- both other cases (no verdict, trigger off) leave the freshly validated diagnostics untouched, exactly matching pre-phase-105 behaviour for a document that never had a verdict"
  - "The stored verdict's seen set is refreshed via setVerdictState({...verdict, seen: result.seen}) only when isVerdictForVersion(verdict, liveVersion) is true -- a carry-over-only verdict (no version/diagnostics) is never mistaken for a current one just because composeWithVerdict happened to run"
  - "latestLangiumBaseline(document) is the one seam both the builder's verdict branch and its bbjcpl fallback read through: recallLangiumSnapshot(document) when Langium has validated this document at least once this session, else the cycle's own current list stripped of compiler-sourced diagnostics -- the same fallback shape for both call sites, so a document Langium has never validated behaves identically whichever branch reaches it first"
  - "The bbjcpl fallback no longer branches on whether a verdict was forgotten (hadVerdict) -- it always reads latestLangiumBaseline at the moment the compile resolves, which already converges to the pre-phase-105 behaviour in both the hadVerdict-true and hadVerdict-false cases (the intervening write, whichever writer produced it, is a real Langium snapshot in either case), and additionally became immune to an unrelated writer's overwrite of document.diagnostics in between -- proven by the race test constructing exactly that overwrite"
  - "revalidateUseFilePathDiagnostics re-remembers through recallLangiumSnapshot/rememberLangiumDiagnostics(..., snapshot.validatedText) instead of the two-argument recallLangiumDiagnostics/rememberLangiumDiagnostics pair, so a USE diagnostic resolved after the fact does not lose track of which text the remembered list belongs to"
  - "Two independent Langium syntax complaints in one test fixture use the dangling-binary-operator pattern ('x = 1 +\\nrem ok\\ny = 2 *\\n'), not an unclosed parenthesis paired with a line-break complaint: checkLineBreaks bails unconditionally whenever document.parseResult.parserErrors.length > 0, so no document can carry both a real parser error and a real line-break complaint at once, discovered while trying to build the tracer's fixture"
  - "A third, independently-positioned syntax complaint for the 'verdict newer than Langium' test is hand-placed into the remembered snapshot via rememberLangiumDiagnostics rather than derived from a third real parse error -- repeated probing showed the parser's own recovery does not reliably produce a third, separately-positioned diagnostic from a third dangling operator (it gets silently absorbed); the rest of the scenario (event, verdict cycle, composition, publish) stays fully real"

patterns-established:
  - "latestLangiumBaseline as the one Langium-list seam every writer of document.diagnostics reads through, instead of each writer choosing between document.diagnostics and a remembered snapshot on a case-by-case basis"

requirements-completed: [RESP-01, RESP-03]

coverage:
  - id: D1
    description: "The validator composes its published list from the freshly validated Langium diagnostics and the stored verdict, including the verdict's own diagnostics when the verdict is for the live text version"
    requirement: "RESP-03"
    verification:
      - kind: unit
        ref: "test/live-parse-interleaving.test.ts#BBj's verdict first, then Langium's validation of the same text, publishes one consistent list"
        status: pass
      - kind: unit
        ref: "test/bbj-document-validator.test.ts (11 tests, unchanged surface, all pass)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The builder's live-parse cycle stores the verdict with its text version and diagnostics, and composes against the latest known Langium snapshot instead of an ad-hoc reconcileWithVerdict call over document.diagnostics"
    requirement: "RESP-03"
    verification:
      - kind: unit
        ref: "test/live-parse-interleaving.test.ts#order independence: verdict first, then Langium validates, ends with the full reconciliation"
        status: pass
      - kind: unit
        ref: "test/live-parse-interleaving.test.ts#order independence: Langium first, then the verdict cycle, ends with the same reconciliation as verdict first"
        status: pass
    human_judgment: false
  - id: D3
    description: "The bbjcpl fallback merges onto the latest remembered Langium snapshot with the hierarchy applied (0.16.x-shaped), immune to a concurrent writer overwriting document.diagnostics while the save-time compile is pending"
    requirement: "RESP-01"
    verification:
      - kind: unit
        ref: "test/live-parse-interleaving.test.ts#a save-time compile that resolves after Langium validates newer text merges onto that newer Langium list, not onto whatever another writer left in document.diagnostics"
        status: pass
      - kind: unit
        ref: "test/bbj-parser-service.test.ts#exact equality against the 0.16.x merge (unchanged, still passes)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The USE-file-path revalidation keeps the snapshot's own validated text after filtering a resolved diagnostic out of the remembered list"
    requirement: "RESP-01"
    verification:
      - kind: unit
        ref: "test/document-builder.test.ts#a now-resolved USE diagnostic is dropped from both document.diagnostics and the remembered list; the still-unresolved one survives in both"
        status: pass
    human_judgment: false
  - id: D5
    description: "No diagnostic is ever lost, doubled or misattributed across every interleaving tested: both publish orders, a verdict newer than Langium, Langium newer than a stale verdict, a stale Langium validation released after a newer verdict, and idempotent repeats"
    requirement: "RESP-03"
    verification:
      - kind: unit
        ref: "test/live-parse-interleaving.test.ts (8 tests total, all pass; 0 failed)"
        status: pass
    human_judgment: false

duration: ~85min
completed: 2026-09-23
status: complete
---

# Phase 105 Plan 04: Concurrent Diagnostics Writers Summary

**`composeWithVerdict` is now wired into both `BBjDocumentValidator.validateDocument()` and `BBjDocumentBuilder`'s live-parse cycle through one shared `latestLangiumBaseline` seam, so an early verdict and Langium's own validation of the same text always converge on one consistent list — proven end to end by an 8-test interleaving suite covering both arrival orders, both version skews, a stale-validation-after-newer-verdict race, and idempotent repeats.**

## Performance

- **Duration:** ~85 min
- **Started:** 2026-09-23T13:04:00Z (approx.)
- **Completed:** 2026-09-23T13:26:44Z
- **Tasks:** 3 completed
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- `BBjDocumentValidator.validateDocument()` remembers the validated text alongside its pre-hierarchy diagnostics list (`document.parseResult.value.$cstNode?.root.fullText`), then composes with any stored verdict via `composeWithVerdict` — including the verdict's own diagnostics for the first time when it is current for the live text version, not just its carry-over decisions — and refreshes the stored verdict's `seen` set from the fresh composition so the very next keystroke's carry-over reads current keys.
- `BBjDocumentBuilder`'s live-parse cycle's verdict branch now builds a `{ seen, version, diagnostics }` record and composes it against `latestLangiumBaseline(document)` — the latest remembered Langium snapshot when one exists, else this cycle's own current list stripped of compiler diagnostics — instead of calling `reconcileWithVerdict` directly over whichever list happened to be remembered.
- The bbjcpl fallback branch and the USE-file-path revalidation both read/write through the same `latestLangiumBaseline`/`recallLangiumSnapshot` seam, closing a concrete race: a save-time compile that resolves after an intervening Langium validation now always merges onto that validation's own list, never onto whatever a different writer left in `document.diagnostics` in between (proven by a dedicated race test that deliberately overwrites `document.diagnostics` with an unrelated diagnostic between the two).
- A new `test/live-parse-interleaving.test.ts` (8 tests) proves the whole phase's D-07 guarantee end to end: BBj's verdict published before Langium validates and Langium validating first both converge on the identical reconciled list; a verdict already for newer text than Langium has validated reconciles correctly against the stale snapshot (a three-way downgrade/keep/drop split); a verdict superseded by a real, newer validation publishes nothing and stores no state; a stale Langium validation released after a newer verdict already exists still carries that verdict's diagnostic; and two consecutive cycles with an unchanged verdict publish deep-equal lists. Every captured list in every test passes a shared source/message/line/severity uniqueness check.

## Task Commits

Each task was committed atomically; Tasks 2 and 3 carried `tdd="true"`:

1. **Task 1 (tracer): compose one diagnostics list wherever a document's verdict and Langium's own validation meet** - `9ee98820` (feat) — the validator and builder composition changes plus the tracer test; also carried the fallback-branch and USE-revalidation rewrite (see Deviations)
2. **Task 2: pin the bbjcpl fallback's snapshot base and the USE revalidation's preserved validated text** - `afea4339` (test) — no separate GREEN commit; see Deviations for why
3. **Task 3: pin the interleaving matrix across arrival order and text version skews** - `82165612` (test)

**Plan metadata:** commit pending (this SUMMARY + STATE.md + ROADMAP.md + REQUIREMENTS.md)

## Files Created/Modified

- `bbj-vscode/src/language/bbj-document-validator.ts` — `validateDocument()` remembers the validated text and composes with the stored verdict via `composeWithVerdict`, refreshing the verdict's `seen` set when it was current for this validation
- `bbj-vscode/src/language/bbj-document-builder.ts` — added `latestLangiumBaseline()`; the verdict branch composes against it instead of calling `reconcileWithVerdict` directly; the bbjcpl fallback reads it after the compile resolves instead of the old `hadVerdict`-gated two-way choice; `revalidateUseFilePathDiagnostics` re-remembers through `recallLangiumSnapshot`/`rememberLangiumDiagnostics(..., validatedText)`
- `bbj-vscode/test/live-parse-interleaving.test.ts` (new) — the tracer test, the bbjcpl race test, both order-independence tests, the verdict-newer-than-Langium test, the Langium-newer-than-verdict test, the stale-Langium-after-newer-verdict test, and the idempotency test (8 tests total)
- `bbj-vscode/test/document-builder.test.ts` — extended the existing USE-revalidation test to also assert the re-remembered list keeps the snapshot's validated text

## Decisions Made

See `key-decisions` in the frontmatter for the full list. The most consequential: `latestLangiumBaseline` is the single seam every writer of `document.diagnostics` reads its "what did Langium last see" input through, replacing three different ad-hoc choices (the verdict branch's `remembered ?? langiumOnly`, the fallback's `hadVerdict ? recallLangiumDiagnostics(...) : withoutCompilerDiagnostics(document.diagnostics ?? [])`, and the USE revalidation's plain `recallLangiumDiagnostics`) with one function two call sites share.

## Deviations from Plan

### Auto-fixed Issues

**1. [Test-authoring — fixture adaptation] Two independent Langium syntax complaints use the dangling-binary-operator pattern, not an unclosed-parenthesis-plus-line-break combination**
- **Found during:** Task 1, while constructing the tracer test's fixture
- **Issue:** The plan's action text suggested "an unclosed parenthesis in an assignment, and a second shape Langium rejects on a line of its own (a line-break complaint shape from an existing reconciliation test works)." Probing this directly (`x = (1 + 2\n` combined with a line-break-violating statement on another line) showed only the parenthesis's own parse error — never the line-break complaint. `checkLineBreaks` (`line-break-validation.ts`) bails unconditionally whenever `document.parseResult.parserErrors.length > 0`, so no real document can carry both a genuine parser error and a genuine line-break complaint at once.
- **Fix:** Used the codebase's own already-proven "dangling-binary-operator" two-parse-error pattern instead (`'x = 1 +\nrem ok\ny = 2 *\n'`), the same shape `bbj-parser-service.test.ts`'s "an older server gets exactly the 0.16.x diagnostics" describe block already pins. Both complaint lines are derived dynamically via a throwaway `validationHelper` probe in `beforeAll`, never hard-coded, exactly as the plan's own action text requires.
- **Files modified:** `bbj-vscode/test/live-parse-interleaving.test.ts`
- **Verification:** The tracer test and every later test in the file reuse this same fixture and pass.
- **Committed in:** `9ee98820`

**2. [Test-authoring — TDD sequencing] Task 2's production code landed in Task 1's commit; Task 2's RED phase was verified via a temporary, uncommitted local revert rather than a literal RED commit**
- **Found during:** Task 2, starting the "write the tests first, watch them fail" step
- **Issue:** Task 1's action text scoped its builder rewrite to the verdict branch only. The verdict branch and the bbjcpl fallback branch live in the same contiguous `debouncedCompile()` method, and a single `Edit` call replacing the verdict branch's surrounding code also carried the fallback branch (which needed the same `latestLangiumBaseline` helper) and the USE-revalidation change along with it — both landed in Task 1's `9ee98820` commit, ahead of Task 2's own TDD cycle.
- **Fix:** Before writing Task 2's tests, temporarily reverted just the fallback branch and USE-revalidation spots to their pre-Task-1 shape (uncommitted, local-only) and re-added the now-unused `recallLangiumDiagnostics` import. Wrote the race test (`live-parse-interleaving.test.ts`) and the extended USE-revalidation test (`document-builder.test.ts`), ran them against the reverted code, and confirmed both genuinely failed (RED) — the race test's failure showed the fallback merging onto an unrelated writer's diagnostic instead of the newer Langium list, and the USE-revalidation test's failure showed the validated text was lost. Restored the file to byte-identical Task-1-committed content (confirmed via `git diff` showing no change), then re-ran both tests to confirm GREEN. Committed only the test files in `afea4339` — no separate feat commit, since the implementation was already correct and unchanged.
- **Files modified:** `bbj-vscode/test/live-parse-interleaving.test.ts`, `bbj-vscode/test/document-builder.test.ts` (tests only; production code unchanged from Task 1's commit, confirmed by `git status --short` showing no modification to `bbj-document-builder.ts` at commit time)
- **Verification:** Both new tests genuinely failed against the pre-Task-1 fallback/USE-revalidation code and pass against the already-committed Task 1 implementation; the three regression suites (`live-parse-interleaving.test.ts`, `document-builder.test.ts`, `bbj-parser-service.test.ts`) all pass with the correct code restored.
- **Committed in:** `afea4339`

**3. [Test-authoring — fixture construction] A third, hand-placed complaint pins the "verdict newer than Langium" three-way split, rather than a third real parse error**
- **Found during:** Task 3, constructing the "verdict newer than Langium" scenario, which needs three independently-positioned Langium syntax complaints (one downgraded, one kept as an Error because its line was edited, one dropped because it overlaps BBj's verdict)
- **Issue:** Repeated probing of longer dangling-operator fixtures (three dangling operators separated by one or two resynchronizing lines) consistently produced only two real diagnostics — the third dangling operator, placed at or near end-of-file, gets silently absorbed by the parser's own error recovery rather than producing its own, separately-positioned complaint.
- **Fix:** Ran a real Langium validation of the two-complaint fixture as usual, then layered a third, hand-constructed `Diagnostic` (shaped exactly like a real `ParsingError` syntax complaint) onto the genuinely-produced snapshot via the production `rememberLangiumDiagnostics`/`recallLangiumSnapshot` API, at a line the real validation never touches (confirmed dynamically, never hard-coded). Every other part of the scenario — the change event, the live-parse cycle, `composeWithVerdict`'s case selection, the publish, and the later real re-validation — stays fully real and exercises production code end to end; only the third complaint's exact position is chosen by hand.
- **Files modified:** `bbj-vscode/test/live-parse-interleaving.test.ts`
- **Verification:** The test passes and asserts all three outcomes (downgrade/keep/drop) independently, plus the post-re-validation reconciliation.
- **Committed in:** `82165612`

**4. [Rule 3 - Blocking, process] A register-check gap: `git diff` with no ref silently skips untracked new files**
- **Found during:** Between Task 1 and Task 2, while re-running the register check before starting Task 2
- **Issue:** The register check run at the end of Task 1 (`git diff -U0 -- <files> | grep ...`) used no commit ref, comparing the working tree against the index. For `live-parse-interleaving.test.ts` — a brand-new, then-untracked file — this comparison silently produces no output at all (git's `diff` without `--no-index` or an explicit ref does not include untracked files), so the check reported clean while never actually scanning the new file's content. Three planning-identifier references (`D-04`, `D-05`, `D-07`) had landed in file-level and test-level comments undetected.
- **Fix:** Re-ran the register check against the phase base commit (`git diff -U0 9601e712... -- <files>`, matching the plan's own `<verify>` command exactly) before starting Task 2, found the three references, reworded each to describe behaviour without the identifier, and re-verified clean. Every subsequent register check in this plan used the explicit base-commit form.
- **Files modified:** `bbj-vscode/test/live-parse-interleaving.test.ts` (comment wording only, no test logic changed)
- **Verification:** `git diff -U0 9601e7122827888ad308611553f9ee145ce9b1fe -- <all five plan files> | grep '^+' | grep -E '...'` finds nothing (exit 1) at every subsequent checkpoint, including the final one before this SUMMARY.
- **Committed in:** `9ee98820` (the reworded file-level comment; the register-check discovery itself happened just after that commit, so the fix landed as an uncommitted edit folded into the same working-tree state before Task 2's commit — the file content at every later commit reflects the fix)

---

**Total deviations:** 4 (3 test-authoring adaptations, 1 blocking process gap caught before it left the working tree)
**Impact on plan:** No production-code correctness impact. All four are test-construction/process adjustments; the shipped production code exactly matches the plan's own decisions (1-5) and D-04/D-05/D-07 guarantees, verified by 8 new interleaving tests plus the full existing regression suite.

## Issues Encountered

None beyond the deviations above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Every concurrent writer of `document.diagnostics` (the validator, the live-parse cycle's verdict branch, its bbjcpl fallback, and the USE-file-path revalidation) now re-derives its whole list from one consistent snapshot via `latestLangiumBaseline`/`composeWithVerdict`; no writer appends to or strips from a previously published list.
- Plan 05 (corpus measurement in both IDEs, `105-MEASUREMENT.md`) is next per the roadmap's own default plan split — it exercises this plan's production code (and plan 03's dedicated parser connection) on the real `bbj-corpus` workspace.
- No blockers.

---
*Phase: 105-live-diagnostics-responsiveness-on-large-workspaces*
*Completed: 2026-09-23*

## Self-Check: PASSED

- `bbj-vscode/src/language/bbj-document-validator.ts` exists on disk
- `bbj-vscode/src/language/bbj-document-builder.ts` exists on disk
- `bbj-vscode/test/live-parse-interleaving.test.ts` exists on disk
- Commits `9ee98820`, `afea4339`, `82165612` all found in `git log --oneline --all`
- All 8 tests in `test/live-parse-interleaving.test.ts` pass; `test/live-parse-scheduling.test.ts`, `test/bbj-parser-service.test.ts`, `test/document-builder.test.ts`, `test/bbj-document-validator.test.ts`, `test/bbj-diagnostic-reconciliation.test.ts` all pass unchanged (125 tests total across the six files); `npx tsc -b tsconfig.json` exits 0 with no output
- The register check (`git diff -U0 9601e7122827888ad308611553f9ee145ce9b1fe -- bbj-document-validator.ts bbj-document-builder.ts live-parse-interleaving.test.ts document-builder.test.ts bbj-parser-service.test.ts | grep '^+' | grep -E 'RESP-0|D-[0-9][0-9]|10[0-9]-[0-9][0-9]|CR-[0-9]|WR-[0-9]|T-105-'`) finds nothing — exit 1
- `git diff --diff-filter=D --name-only` after each of the three commits shows no unexpected file deletions
