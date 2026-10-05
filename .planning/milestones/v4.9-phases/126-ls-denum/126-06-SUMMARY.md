---
phase: 126-ls-denum
plan: 06
subsystem: language-server-formatting
tags: [langium, lsp, formatting, denumber, vitest]
requires:
  - phase: 126-ls-denum
    provides: "BBjDenumService.offer and the format-service denum-needed path (plans 04 and 05)"
provides:
  - "A ledger-free offerDenum: Format Document, Format Selection and format-on-save raise the offer or explanation on every DENUM-needed answer"
  - "Tests pinning the every-request rule and the ledger independence"
affects: [126-07, 127-ls-denum-on-open, uat-recheck]

actuals:
  tokens: 3350
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A user-initiated answer stays out of the bounded notice ledger so repeats and ledger eviction never suppress it"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-format-service.ts
    - bbj-vscode/test/bbj-denum-offer.test.ts

key-decisions:
  - "Format-on-save gets the offer on every save: a formatting request carries no trigger and no save signal reliably arrives before the save's format request, so the server cannot tell a save from Format Document (supersedes the per-version dedupe)"
  - "The offer is never recorded in the notice ledger; every other formatting notice keeps its once-per-scope rule"

requirements-completed: [FMT-06]

coverage:
  - id: D1
    description: "Every Format Document on a numbered file returns no edits at once and raises the Denumber / Denumber and Format offer, however often it is repeated on one version"
    requirement: FMT-06
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-offer.test.ts#Format Document shows the offer on every request, edited or not"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every Format Selection on a numbered file raises the explanation with Denumber only"
    requirement: FMT-06
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-offer.test.ts#Format Selection shows the explanation on every request"
        status: pass
    human_judgment: false
  - id: D3
    description: "Saves and concurrent requests each get the offer; offers never wait for the user, never denumber by themselves and never consume the notice ledger"
    requirement: FMT-06
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-offer.test.ts#every request on a file with line numbers raises its own message"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-offer.test.ts#the offer and the notice ledger"
        status: pass
    human_judgment: false
  - id: D4
    description: "In VS Code from a VSIX built from the final tree, Format Document twice on an unchanged numbered file shows the offer twice"
    requirement: FMT-06
    verification: []
    human_judgment: true
    rationale: "The notification the user sees is drawn by the editor; hermetic tests stop at the fake language client"

duration: 9 min
completed: 2026-10-03
status: complete
---

# Phase 126 Plan 06: Offer denumbering on every format request Summary

**BBjFormatService.offerDenum now raises the Denumber offer (Format Document, saves) or the selection explanation (Format Selection) on every DENUM-needed answer, outside the bounded notice ledger, so a repeat on an unchanged version shows again.**

## Performance

- **Duration:** 9 min
- **Completed:** 2026-10-03
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `offerDenum` no longer calls `notice()`. It writes one fixed-token debug line, resolves `BBjDenumService` at that moment, calls `offer(...)` without awaiting it, and swallows anything it throws so a format request cannot break. The `report` caller no longer passes a document scope.
- The `offerDenum` and `report` doc comments state the new rule: the offer is raised on every request, a save cannot be told from Format Document, VS Code replaces a showing notification with the same text and buttons, and the offer is the one message that is not deduplicated.
- `test/bbj-denum-offer.test.ts` pins the rule: repeated and edited Format Document, repeated Format Selection, a save as the same request, both orderings of selection and document, two concurrent requests, a never-answered prompt, a late Denumber pick on the second of two offers running exactly one DENUM, and ledger independence (257 offers on distinct versions never evict an earlier too-large notice).

## Task Commits

1. **Task 1: Repeated Format Document shows the offer again** - `1f78db7a` (fix)
2. **Task 2: Selection, saves, concurrent requests, ledger independence, comments** - `407d46bc` (test)

**Plan metadata:** committed with this summary (docs: complete plan)

## Files Created/Modified

- `bbj-vscode/src/language/bbj-format-service.ts` - ledger-free `offerDenum`, updated `report` and `offerDenum` doc comments
- `bbj-vscode/test/bbj-denum-offer.test.ts` - every-request tests, ledger-independence and never-settling-prompt tests, new file header

## Decisions Made

- Format-on-save offers on every save. The plan's save-signal research found no robust way to tell a save-time format from an explicit one (no trigger in the LSP request; the extension-host save participant that sends willSave races the built-in format-on-save participant), so the user's fallback rule applies. VS Code closes a showing notification with identical message and buttons before adding a new one, and auto-saves never format.
- No second ledger, in-flight guard or timer was added, and the denumber permission is never part of the format parameters (`allowDenum` count in the format service stays 0).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 1 also rewrote the other tests that pinned the old rule**
- **Found during:** Task 1
- **Issue:** Task 1's verify runs the whole `bbj-denum-offer.test.ts`; the repeated-selection, unchanged-save, order and concurrent tests asserted one message per version and failed as soon as `offerDenum` left the ledger, so the task could not pass its own verify with only the first test replaced.
- **Fix:** Rewrote those four tests (and added the second-offer Denumber test) in Task 1 under a describe that states the every-request rule. Task 2 then added the never-settling prompt and ledger-independence tests, the file header, the `FORMAT_NOTICE_LEDGER_LIMIT` import and the `report` comment.
- **Files modified:** bbj-vscode/test/bbj-denum-offer.test.ts
- **Verification:** the Task 1 and Task 2 verify commands both pass
- **Committed in:** 1f78db7a

**2. [Attribution] Commit trailer is Claude Sonnet 5.5, not Opus 5.5**
- **Issue:** The plan and dispatch prompt asked for `Co-Authored-By: Claude Opus 5.5`; this executor is Sonnet 5.5, and the session's attribution guidance and the project notes say an executor uses its own trailer.
- **Fix:** Both task commits carry `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

---

**Total deviations:** 2 (1 blocking-task ordering, 1 attribution)
**Impact on plan:** No scope change; the same two files and the same behavior lines.

## Issues Encountered

None.

## Verification

- `npx vitest run` over the eight targeted files: 238 passed
- `npm run typecheck:test`, `npm run lint`, `npm run build`: clean
- Whole suite `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2`: 4266 passed, 0 failed tests; the only failed suite is `test/functional/installed-extension-e2e.test.ts` (spawns the installed `~/.ext-test` bundle, known environment noise)
- Acceptance greps: no `this.notice(` in `offerDenum`, one `.offer(`, `denum-needed-selection` present, `allowDenum` count 0, no old once-per-version titles or comments, no planning identifiers in either file

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- G-126-1 is closed in code. Re-check by hand in the next UAT round with a VSIX built from the final tree: Format Document twice on an unchanged numbered file shows the offer twice.
- Plan 07 (G-126-2, the Problems view for DENUM diagnostics) is independent of these files.

## Self-Check: PASSED

- `bbj-vscode/src/language/bbj-format-service.ts` and `bbj-vscode/test/bbj-denum-offer.test.ts` exist and carry the changes
- Commits `1f78db7a` and `407d46bc` exist and are on `gsd/v4.9-bbj-ls-denum-format`
- All task acceptance criteria and plan-level verification commands re-run and pass

---
*Phase: 126-ls-denum*
*Completed: 2026-10-03*
