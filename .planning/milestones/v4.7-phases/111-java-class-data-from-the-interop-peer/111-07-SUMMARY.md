---
phase: 111-java-class-data-from-the-interop-peer
plan: 07
subsystem: api
tags: [markdown, hover, completion, javadoc, security, vitest]

# Dependency graph
requires:
  - phase: 111-java-class-data-from-the-interop-peer
    provides: "111-03's escapeMarkdown/toFenceSafeLine render-boundary escaping in java-peer-guard.ts, bbj-hover.ts, bbj-completion-provider.ts (SEC-04)"
provides:
  - "escapeJavadocMarkdown(text) in java-peer-guard.ts, exempting one strictly allowlisted trailing BASIS documentation link from Markdown escaping"
  - "hover's render-boundary return statement (both the stored node.docu path and the javadoc-file fallback) escaped through escapeJavadocMarkdown"
  - "completion's javadoc part escaped through escapeJavadocMarkdown"
  - "the amendment recorded in 111-CONTEXT.md next to D-06"
affects: [111-VERIFICATION.md re-verification, phase 111 UAT re-test]

# Actuals (#2632)
actuals:
  tokens: 3200
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One narrowly allowlisted trailing-link regex exemption applied at the same render boundary as the blanket escape, re-appending the matched link verbatim after escaping only the text before it"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/java-peer-guard.ts
    - bbj-vscode/src/language/bbj-hover.ts
    - bbj-vscode/src/language/bbj-completion-provider.ts
    - bbj-vscode/test/javadoc-markdown-escape.test.ts
    - .planning/phases/111-java-class-data-from-the-interop-peer/111-CONTEXT.md

key-decisions:
  - "escapeJavadocMarkdown exempts exactly one shape: [Docs](https://documentation.basis.cloud/<path>) at the very end of the text, preceded by whitespace or start-of-text, path charset limited to letters/digits/./_/-//, no flags on the regex (no g, i or m)"
  - "The exemption is a strict superset check: with no match, escapeJavadocMarkdown falls through to escapeMarkdown unchanged; with a match, only the prefix before the link is escaped and the matched link is re-appended verbatim"
  - "Signatures and headers are unaffected — only the javadoc body call sites (hover's javaDoc.javadoc argument, completion's node.docu.javadoc push) were switched from escapeMarkdown to escapeJavadocMarkdown"

requirements-completed: [SEC-04]

coverage:
  - id: D1
    description: "The trailing BASIS Docs link in Java hover documentation (both the stored node.docu path and the javadoc-file fallback path) renders as a clickable 'Docs' hyperlink, while every other link/image shape (13 spoof variants, a second link, truncation, no link) stays fully escaped"
    requirement: "SEC-04"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/javadoc-markdown-escape.test.ts#escapeJavadocMarkdown (18 tests: real tail, 13 spoof rows, two links, no link, trailing whitespace, truncation)"
        status: pass
      - kind: integration
        ref: "bbj-vscode/test/javadoc-markdown-escape.test.ts#the trailing BASIS Docs link in a Java method javadoc stays a clickable link in hover, while other link syntax stays escaped"
        status: pass
      - kind: integration
        ref: "bbj-vscode/test/javadoc-markdown-escape.test.ts#the trailing BASIS Docs link in a javadoc-file fallback stays a clickable link in hover"
        status: pass
    human_judgment: true
    rationale: "The plan's own success_criteria defers the actual visual re-test (BBjGrid.isPaging rendering as a clickable link in real VS Code and IntelliJ) to /gsd-verify-work 111, after both distributables are rebuilt from the final tree — automated tests prove the escaped string shape but not the rendered click behavior in either IDE."
  - id: D2
    description: "The trailing BASIS Docs link in Java completion documentation stays a clickable 'Docs' hyperlink, with the fenced java signature and the documentationHeader fallback unchanged"
    requirement: "SEC-04"
    verification:
      - kind: integration
        ref: "bbj-vscode/test/javadoc-markdown-escape.test.ts#the trailing BASIS Docs link in Java completion documentation stays a clickable link, while other link syntax stays escaped"
        status: pass
    human_judgment: true
    rationale: "Same as D1 — the UAT re-test of actual rendered completion documentation in both IDEs is deferred to /gsd-verify-work 111."

duration: 15min
completed: 2026-09-27
status: complete
---

# Phase 111 Plan 07: Trailing BASIS Docs Link Stays Clickable in Java Hover and Completion Summary

**One narrowly allowlisted trailing `[Docs](https://documentation.basis.cloud/…)` link now renders as a clickable hyperlink in Java hover and completion, while every other link/image shape from javadoc still escapes exactly as before.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-09-27T04:56:00Z
- **Completed:** 2026-09-27T05:11:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added `escapeJavadocMarkdown(text)` to `java-peer-guard.ts`: a strict, anchored, unflagged regex (`TRAILING_BASIS_DOCS_LINK_PATTERN`) matches only a trailing `[Docs](https://documentation.basis.cloud/<path>)` link preceded by whitespace or start-of-text, with a path charset of letters/digits/`.`/`_`/`/`/`-`; on no match it falls through to `escapeMarkdown` unchanged, on a match it escapes only the prefix and re-appends the matched link verbatim.
- Wired the helper into hover's single render-boundary return statement, which already covers both the stored `node.docu` path and the javadoc-file fallback path — no other hover change was needed.
- Wired the helper into completion's javadoc-body push, leaving the fenced signature (`toFenceSafeLine`) and the `documentationHeader()` fallback (`escapeMarkdown`) untouched.
- Recorded the amendment in `111-CONTEXT.md` directly after the existing 2026-09-26 D-06 amendment paragraph.
- Added 21 new tests to `javadoc-markdown-escape.test.ts`: the real BBjGrid.isPaging tail, 13 spoof shapes (other host, http, other label, lowercase label, image syntax, host suffix, userinfo on both sides, embedded paren, whitespace in URL, link title, not-at-the-end, glued-to-word), two links, no link, trailing whitespace, truncation, plus hover (stored + fallback) and completion end-to-end cases.

## Task Commits

Each task was committed atomically:

1. **Task 1: The trailing BASIS Docs link in Java javadoc renders as a clickable link in hover, end to end, while every spoof stays escaped** - `e850ffb0` (feat, tracer)
2. **Task 2: Completion documentation keeps the trailing BASIS Docs link clickable, and the amendment is recorded in the phase context** - `61351658` (feat)

_Note: both tasks carried `tdd="true"`; each was run RED (new tests added, confirmed failing) then GREEN (source change, confirmed passing) within its own commit rather than as separate test(...)/feat(...) commits, per the plan's own task-commit structure ("The slice is committed." / "the change is committed.")._

## Files Created/Modified
- `bbj-vscode/src/language/java-peer-guard.ts` - adds `TRAILING_BASIS_DOCS_LINK_PATTERN` and `export function escapeJavadocMarkdown`; extends the `MARKDOWN_ESCAPE_PATTERN` and `escapeMarkdown` doc comments; module header gains one clause
- `bbj-vscode/src/language/bbj-hover.ts` - imports `escapeJavadocMarkdown`; the javadoc-body argument of the single `createMarkdownContent` return call switches from `escapeMarkdown` to `escapeJavadocMarkdown`; the signature argument is unchanged
- `bbj-vscode/src/language/bbj-completion-provider.ts` - imports `escapeJavadocMarkdown`; the javadoc-body push in `createReferenceCompletionItem` switches from `escapeMarkdown` to `escapeJavadocMarkdown`; the fenced signature and header fallback are unchanged
- `bbj-vscode/test/javadoc-markdown-escape.test.ts` - 21 new tests: an `escapeJavadocMarkdown` describe (18 tests), one added hover test in the stored-path describe, one added hover test in the fallback-path describe, one added completion test
- `.planning/phases/111-java-class-data-from-the-interop-peer/111-CONTEXT.md` - records the 2026-09-27 UAT gap G-111-2 amendment next to the existing D-06 amendment

## Decisions Made
- The allowlist regex carries no flags (no `g`, `i`, or `m`): no `g` so `exec` keeps no `lastIndex` state across calls, and the planning-time probe validated this exact pattern.
- The exemption is applied only at the two javadoc-body call sites (hover's return statement, completion's javadoc push) — signatures, headers, and the stored `node.docu` text are untouched, exactly matching D-06/D-07/D-08 as amended.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The whole-suite `--maxWorkers=2` run and the plan-level 3-file verification run each hit a transient `beforeAll` "Hook timed out in 10000ms" failure on `hover.test.ts` on the first attempt (0 failed tests, only timed-out/skipped hooks) — this is the known local worker contention documented in the plan's executor rules. A retry of the identical command passed cleanly both times (104/104, then the full suite below).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- G-111-2 is closed in code: the trailing BASIS Docs link renders as a clickable link in both hover paths and in completion, pinned by 21 new automated tests, with the 22 pre-existing tests in the same file, all of `hover.test.ts`, and all of `completion-test.test.ts` still green.
- `SEC-04` is **not** flipped to Complete in `REQUIREMENTS.md`/`ROADMAP.md` here — per this plan's own instructions, that decision is deferred to phase 111's re-verification.
- The actual visual UAT re-test (BBjGrid.isPaging rendering as a clickable "Docs" link in real VS Code and IntelliJ) still needs to run via `/gsd-verify-work 111`, after both distributables are rebuilt from this final tree.

---

## Whole-Suite Regression Check

`cd bbj-vscode && npx vitest run --maxWorkers=2 --reporter=json --outputFile=<scratchpad>/suite-111-07.json`:

- **numTotalTests:** 3105
- **numPassedTests:** 2974
- **numFailedTests:** 11
- **numPendingTests:** 120

All 11 failures are the known local-environment drift (BBjServices reachable on :5008), every one inside `linking.test.ts`'s "Interop related tests" describe block:
- All BBj classes extends Object
- Import and declare simple Java class without using FQNs
- Import Java class
- Declare with direct import
- Class definition with direct import in extends
- Class definition with direct import in implements
- Unloaded Java FQN access - test for #6
- Java FQN access - test for #6
- Linked List is resolved
- Resolve nested class in use statement
- Resolve nested class FQN

No other test file failed. This matches the plan's accepted-failure list exactly.

## Self-Check: PASSED

- `bbj-vscode/src/language/java-peer-guard.ts` — FOUND (modified, exists)
- `bbj-vscode/src/language/bbj-hover.ts` — FOUND (modified, exists)
- `bbj-vscode/src/language/bbj-completion-provider.ts` — FOUND (modified, exists)
- `bbj-vscode/test/javadoc-markdown-escape.test.ts` — FOUND (modified, exists)
- `.planning/phases/111-java-class-data-from-the-interop-peer/111-CONTEXT.md` — FOUND (modified, exists)
- Commit `e850ffb0` — FOUND in `git log --oneline --all`
- Commit `61351658` — FOUND in `git log --oneline --all`
- `javadoc-markdown-escape.test.ts` alone: `Tests 43 passed (43)` (22 pre-existing + 21 new) — matches plan verification
- `test/javadoc-markdown-escape.test.ts test/hover.test.ts test/completion-test.test.ts` together: `104 passed (104)` on retry — matches plan verification
- `npx tsc -p tsconfig.json` exits 0 with no output — matches plan verification
- No planning identifiers in the staged source/test diff for either task commit (`grep` exit 1, no match) — matches both tasks' acceptance criteria
- `java-interop.ts`, `bbj-intellij`, `java-interop` unchanged since `ead3144c` (`git diff --quiet` exit 0) — matches plan verification

---
*Phase: 111-java-class-data-from-the-interop-peer*
*Completed: 2026-09-27*
