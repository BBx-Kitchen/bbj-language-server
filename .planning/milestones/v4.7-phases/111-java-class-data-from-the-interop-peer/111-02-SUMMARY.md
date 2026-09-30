---
phase: 111-java-class-data-from-the-interop-peer
plan: 02
subsystem: api
tags: [langium, diagnostics, linking, validation, vitest]

# Dependency graph
requires:
  - phase: 111-java-class-data-from-the-interop-peer
    provides: "111-01's java-peer-guard.ts pattern precedent (not consumed directly by this plan; both plans build on the same phase's shared context)"
provides:
  - "LinkingErrorData.javaMemberAccess/memberName/ownerSimpleName on a MemberCall linking error whose receiver's inferred type is a Java class"
  - "isJavaMemberLinkingWarning, javaMemberOwnerName, javaMemberLinkingMessage exported from bbj-document-validator.ts"
  - "applyDiagnosticHierarchy Rule 2 exemption for the flagged Java-member linking Warning, alongside isDowngradedSyntaxWarning"
  - "BBjDocumentValidator constructor typed BBjServices with a typeInferer field"
affects: [111-03, 111-04, 111-05]

# Actuals (#2632)
actuals:
  tokens: 4955
  tasks: 2
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Flag-on-LinkingErrorData: a second Rule-2 exemption predicate (isJavaMemberLinkingWarning) mirrors the existing isDowngradedSyntaxWarning shape exactly"
    - "Inferer call guarded by try/catch inside processLinkingErrors so a throw simply leaves the diagnostic unflagged, never aborting validation"

key-files:
  modified:
    - bbj-vscode/src/language/bbj-document-validator.ts
    - bbj-vscode/test/unknown-java-member.test.ts

key-decisions:
  - "D-13/D-14/D-15 implemented as designed: javaMemberAccess computed only for a MemberCall's 'member' property whose receiver infers to a JavaClass, excluding the cyclic-reference message shape; Rule 2 gains a second exemption beside isDowngradedSyntaxWarning; the flagged message replaces Langium's 'NamedElement' wording while keeping the existing [in file:line] suffix"
  - "No new dedup logic added for D-14, per the phase's own research: the existing dropShadowedMemberLinkingDiagnostics (Phase 107) already removes a same-range linking Warning whenever the certain-receiver Error fires; a regression test proves this is undisturbed rather than reimplementing it"
  - "Task 2 followed a real RED/GREEN split: the message-rewrite tests were committed first against the unfixed tree (4 failures matching the untouched wording/import), then the implementation was re-applied and committed once all rows passed"

patterns-established: []

requirements-completed: [FIX-03]

coverage:
  - id: D1
    description: "An unresolved Java member on an uncertain receiver stays visible next to an unrelated Error via a new javaMemberAccess flag and a second Rule 2 exemption; Rule 1 (parse errors suppress all linking errors) and every other linking Warning are unchanged"
    requirement: FIX-03
    verification:
      - kind: unit
        ref: "bbj-vscode/test/unknown-java-member.test.ts#An unresolved member on an uncertain Java receiver stays visible next to an unrelated Error"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/unknown-java-member.test.ts#applyDiagnosticHierarchy Rule 2 exempts a flagged Java-member linking Warning"
        status: pass
    human_judgment: false
  - id: D2
    description: "The flagged Warning's message names the member and its owner's simple name instead of Langium's 'NamedElement' wording, keeping the existing [in file:line] suffix; every other linking message is untouched and bbj-linker.ts is unmodified"
    requirement: FIX-03
    verification:
      - kind: unit
        ref: "bbj-vscode/test/unknown-java-member.test.ts#javaMemberLinkingMessage: the flagged Warning names the member and its owner"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/unknown-java-member.test.ts#The flagged Warning reads in plain words end to end, and other wordings are unchanged"
        status: pass
    human_judgment: false
  - id: D3
    description: "The Phase 107 unknown-member Error for a certain receiver is unaffected: dropShadowedMemberLinkingDiagnostics still removes the same-range linking Warning, so exactly one diagnostic (the Error) shows for a certain receiver"
    requirement: FIX-03
    verification:
      - kind: unit
        ref: "bbj-vscode/test/unknown-java-member.test.ts#a certain receiver still shows exactly one diagnostic: the Error, not a linking Warning"
        status: pass
    human_judgment: false

duration: 14min
completed: 2026-09-26
status: complete
---

# Phase 111 Plan 02: An Unresolved Java Member Survives an Unrelated Error, in Plain Words Summary

**A `javaMemberAccess` flag on `LinkingErrorData` and a second `applyDiagnosticHierarchy` Rule 2 exemption keep an unresolved-Java-member linking Warning visible next to an unrelated Error, and its message now reads `'<member>' is not a known method or field of <Owner>` instead of Langium's "NamedElement" wording.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-09-26T16:48:42Z (approx, right after 111-01's docs commit)
- **Completed:** 2026-09-26T17:02:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `LinkingErrorData` gains `javaMemberAccess?`, `memberName?` and `ownerSimpleName?`, computed in `processLinkingErrors` only when the linking error is for a `MemberCall`'s `'member'` property, the reference text is non-empty, the message is not a cyclic-reference case, and `this.typeInferer.getType(container.receiver)` (wrapped in try/catch) resolves to a `JavaClass` — mirroring the existing `instanceMemberAccess` flag exactly.
- `BBjDocumentValidator`'s constructor now takes `BBjServices` instead of the narrower `LangiumServices`, storing `services.types.Inferer` in a new `typeInferer` field; the DI factory in `bbj-module.ts` already passed `BBjServices`, so this is a type-only widening with no behaviour change at the call site.
- `applyDiagnosticHierarchy`'s Rule 2 now keeps `d.severity === Error || isDowngradedSyntaxWarning(d) || isJavaMemberLinkingWarning(d)`, so the flagged Warning survives next to any unrelated Error while Rule 1 (parse errors suppress every linking error) and every other linking Warning (unresolved BBj variables, classes, USE targets) are untouched.
- `javaMemberLinkingMessage(memberName, ownerSimpleName, originalMessage)` builds `'<member>' is not a known method or field of <Owner>` (or `Cannot resolve '<member>'` when no owner name is available), reusing the existing `[in <file>:<line>]` suffix pattern one function away (`extractCyclicReferenceRelatedInfo`); `processLinkingErrors` uses it only for the flagged case, so `bbj-linker.ts` and every other linking message are unmodified.
- `javaMemberOwnerName(type)` returns a fully resolved `JavaClass`'s simple name (last dot segment), `undefined` for a stub (`error` set) or anything else.
- The Phase 107 certain-receiver dedup (`dropShadowedMemberLinkingDiagnostics`) needed no new code: a regression test confirms a certain receiver still shows exactly one diagnostic (the Error), matching the phase research's finding that the existing dedup already handles this case.

## Task Commits

Each task was committed atomically:

1. **Task 1: An unresolved member on an uncertain Java receiver stays visible next to an unrelated Error, end to end** - `920386f8` (feat)
2. **Task 2 RED: add failing test for the flagged Java-member Warning wording** - `e27fc7b3` (test)
3. **Task 2 GREEN: the flagged Java-member Warning names the member and its owner** - `1a391853` (feat)
4. **Doc-comment fix (deviation): move the typeInferer field's doc comment off the constructor's own comment** - `a7ff3cf4` (docs)

**Plan metadata:** (this commit) `docs(111-02): complete an unresolved Java member survives an unrelated error plan`

_Task 2 carried `tdd="true"`: the message-rewrite tests were run and confirmed to fail (4 failures: 3 `javaMemberLinkingMessage` pure-function rows plus the end-to-end wording row) on the tree without the implementation, committed as the RED gate, then the implementation was re-applied and all rows re-verified green before the GREEN commit._

## Files Created/Modified
- `bbj-vscode/src/language/bbj-document-validator.ts` — `LinkingErrorData` flag fields, `typeInferer` field and widened constructor type, `isJavaMemberLinkingWarning`, `javaMemberOwnerName`, `javaMemberLinkingMessage`, the Rule 2 exemption, and the flagged-message rewrite in `processLinkingErrors`
- `bbj-vscode/test/unknown-java-member.test.ts` — new describe blocks: uncertain-receiver survival end to end, `applyDiagnosticHierarchy` Rule 1/Rule 2 unit rows, `javaMemberLinkingMessage` and `javaMemberOwnerName` pure-function rows, and the end-to-end wording/certain-receiver-dedup rows

## Decisions Made
- Followed D-13/D-14/D-15 exactly: the flag mirrors `instanceMemberAccess`'s shape, the Rule 2 exemption sits beside `isDowngradedSyntaxWarning`, and the message rewrite happens in `processLinkingErrors` (not `bbj-linker.ts`), preserving the `[in ...]` suffix.
- No new dedup logic for the certain-receiver/VAL-03 co-occurrence — confirmed via a regression test rather than reimplemented, per the phase research's finding that `dropShadowedMemberLinkingDiagnostics` (Phase 107) already covers it.
- Task 2's TDD gate was honored as a real RED/GREEN split (the implementation was written once, then temporarily backed out, the tests run and confirmed failing, committed, and the implementation re-applied) rather than writing both together and skipping the RED proof.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Constructor doc comment ended up describing the wrong declaration**
- **Found during:** Post-Task-2 review of the full modified file
- **Issue:** Task 1 inserted the new `typeInferer` field directly above the constructor's own "A `LangiumDocument` survives editor close..." doc comment, leaving that comment appearing to document the field instead of the constructor's `onDidClose` subscription it actually explains.
- **Fix:** Gave `typeInferer` its own one-line doc comment and moved the constructor's original comment back to sit directly above `constructor(...)`.
- **Files modified:** `bbj-vscode/src/language/bbj-document-validator.ts`
- **Verification:** `npx tsc -p tsconfig.json` clean; the five-file verification suite still 140/140 green after the change (comment-only, no behavior change).
- **Committed in:** `a7ff3cf4`

---

**Total deviations:** 1 auto-fixed (1 Rule 1 doc-comment correctness fix, no behavior change).
**Impact on plan:** Cosmetic only. No scope creep — no other files touched.

## Issues Encountered

None beyond the documented deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FIX-03 (todo `2026-09-24-unknown-java-member-linking-warning-extras`) is fully implemented; the todo itself is moved to completed at phase end, not by this plan.
- `bbj-document-validator.ts`'s `BBjServices`-typed constructor and `typeInferer` field are available for any later plan that needs type inference inside validation; no other 111-0x plan currently depends on this directly (111-03/04/05 build on 111-01's `java-peer-guard.ts` module instead).
- No blockers for 111-03.

---
*Phase: 111-java-class-data-from-the-interop-peer*
*Completed: 2026-09-26*

## Self-Check: PASSED

- `bbj-vscode/src/language/bbj-document-validator.ts` — FOUND
- `bbj-vscode/test/unknown-java-member.test.ts` — FOUND
- `.planning/phases/111-java-class-data-from-the-interop-peer/111-02-SUMMARY.md` — FOUND
- Commit `920386f8` — FOUND
- Commit `e27fc7b3` — FOUND
- Commit `1a391853` — FOUND
- Commit `a7ff3cf4` — FOUND
- All acceptance-criteria greps (Tasks 1-2) re-run against final `HEAD` — all match expected counts
- `npx tsc -p tsconfig.json` — clean
- `npx vitest run test/unknown-java-member.test.ts test/bbj-document-validator.test.ts test/bbj-diagnostic-reconciliation.test.ts test/class-validations-issues.test.ts test/code-action.test.ts` — 140/140 green (final tree, after the doc-comment fix)
- Whole-suite `npx vitest run --maxWorkers=2` — matched the plan's documented known local drift (11 `linking.test.ts` interop-case failures, BBjServices reachable on :5008); 0 failures attributable to this plan
