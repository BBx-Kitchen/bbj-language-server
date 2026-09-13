---
phase: 88-setopts-in-code-hovers-tri-state-composer
plan: 10
subsystem: ide-composer
tags: [bbj, hex-literal, setopts, vscode, intellij, codegen, gap-closure]

# Dependency graph
requires:
  - phase: 88-setopts-in-code-hovers-tri-state-composer
    provides: composeSetOptsBlock (plan 03), the VS Code tri-state UI and absolute-mode writer (plan 06), and the IntelliJ tri-state dialog / ComposerLauncher routing (plan 05) that this plan corrects
provides:
  - "bbjHexLiteral(digits) — the single TypeScript formatter deciding a BBj hex literal's `$…$` delimiters, used by both composeSetOptsBlock reassignment lines"
  - "BbjHexLiteral.of(String) — its Java twin, a plain-Java seam with no IntelliJ dependency"
  - "SetOptsEditTarget.hexSyntax discriminator ('config-bare' default | 'bbj-literal') so the shared VS Code in-place writer emits the right syntax for config.bbx vs a BBj program"
  - "A non-tautological test oracle for composeSetOptsBlock: literal expected strings (both catalog boundaries plus the mid-catalog case) and a no-double-quote property assertion"
  - "IntelliJ's openSetoptsInCodeAbsolute routed through BbjHexLiteral.of, with a region-scoped source guard keeping it apart from openSetopts's still-bare config.bbx writer"
affects: [88-11, 88-13]

# Actuals (#2632)
actuals:
  tokens: 7200
  tasks: 3
  commits: 6

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One formatter per host decides a generated/rewritten literal's syntax; every call site routes through it rather than hand-rolling delimiters (mirrors the existing plain-Java-seam convention: RemToggleSeam, CompilerInitOptions, NodeAvailability)"
    - "A shared writer serving two file formats gets an explicit discriminator field (hexSyntax) rather than an implicit per-caller assumption, with the pre-existing caller's behavior kept as the unmarked default"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjHexLiteral.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/BbjHexLiteralTest.java
  modified:
    - bbj-vscode/src/setopts-catalog.ts
    - bbj-vscode/src/setopts-composer-webview.ts
    - bbj-vscode/src/setopts-in-code-ui.ts
    - bbj-vscode/test/setopts-catalog.test.ts
    - bbj-vscode/test/setopts-in-code-ui.test.ts
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/SetoptsInCodeSourceGuardTest.java

key-decisions:
  - "Chose the writer side of the hexRange/hexDigits contract mismatch, not the range side: hexRange keeps spanning the whole $…$ token (its documented, test-pinned meaning at setopts-in-code-request.test.ts:87), and both in-place writers now put a complete literal back instead. Narrowing hexRange to exclude delimiters was rejected — it would have required touching setopts-in-code-request.ts (out of this plan's scope, owned by 88-11) and doubling up on any caller that still expected a delimiter-inclusive range."
  - "SetOptsEditTarget.hexSyntax defaults to 'config-bare' (unmarked) rather than requiring every caller to opt in explicitly, so the pre-existing config.bbx composer (#474) needed zero changes and its correctness is now pinned by a direct test rather than assumed by omission."
  - "The old tautological test oracle (expected strings built by re-calling the same production template/mask functions) was replaced with literal expected strings, cross-checked against the already-pinned mask-value tests — this is what let the double-quote defect ship past 33 previously-passing tests."

requirements-completed: [DISC-06]

coverage:
  - id: D1
    description: "composeSetOptsBlock's generated IOR/AND reassignment lines are bare $…$ BBj hex literals (no surrounding double quotes), via one exported bbjHexLiteral formatter"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "bbj-vscode/test/setopts-catalog.test.ts#bbjHexLiteral / composeSetOptsBlock describe blocks"
        status: pass
    human_judgment: false
  - id: D2
    description: "VS Code's absolute edit-in-place writer restores a complete $…$ literal over the whole hexRange token; the config.bbx composer (#474) keeps writing bare digits unchanged"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "bbj-vscode/test/setopts-in-code-ui.test.ts#setopts-composer-webview.ts hexSyntax discriminator (Task 2)"
        status: pass
    human_judgment: false
  - id: D3
    description: "IntelliJ's openSetoptsInCodeAbsolute writes the same complete literal via BbjHexLiteral.of; openSetopts's config.bbx writer is untouched, enforced by a region-scoped source guard"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "bbj-intellij BbjHexLiteralTest + SetoptsInCodeSourceGuardTest#theInCodeWriterUsesBbjHexLiteralWhileTheConfigBbxWriterStaysBare"
        status: pass
    human_judgment: false
  - id: D4
    description: "G-88-3's live-runtime correctness (88-RESEARCH.md Assumption A2 — is a 16-byte mask the right width against a real OPTS value) — this plan proves the emitted TEXT only"
    verification: []
    human_judgment: true
    rationale: "Only a live BBjServices run (staged by plan 88-13) can confirm the runtime accepts the corrected literal end-to-end; unit tests here cannot execute BBj's AND()/IOR() against a real OPTS value."

duration: 25min
completed: 2026-09-11
status: complete
---

# Phase 88 Plan 10: Correct BBj hex-literal syntax in the SETOPTS-in-code composer Summary

**One `bbjHexLiteral`/`BbjHexLiteral.of` formatter per host now decides every generated or rewritten BBj hex literal's `$…$` delimiters, closing both G-88-3 manifestations (double-quoted IOR/AND masks and delimiter-stripped absolute edits) while a non-tautological test oracle can finally catch a stray delimiter.**

**G-88-3 remains `status: failed`.** This plan proves the composer's emitted TEXT is now valid BBj syntax (unit-tested, character-for-character pinned). It does **not** prove the runtime accepts that text: 88-RESEARCH.md Assumption A2 — whether a 16-byte/32-hex-digit mask is the right width against a live `OPTS` value — is still unverified, because the quoting defect aborted the original live test run (test 8) before `AND()` ever saw two decoded operands. Plan 88-13 stages the live BBjServices check that would resolve G-88-3.

## Performance

- **Duration:** ~25 min
- **Tasks:** 3
- **Files modified:** 9 (2 created, 7 modified)
- **Commits:** 6

## Accomplishments

- Exported `bbjHexLiteral(digits)` in `setopts-catalog.ts` — the sole formatter deciding a BBj hex literal's spelling — and routed both `composeSetOptsBlock` reassignment lines (`IOR`/`AND`) through it, removing the spurious double-quote wrapper that made BBj treat a 16-byte hex mask as a 34-character plain string and raise `!ERROR=17`.
- Replaced the tautological `composeSetOptsBlock` test oracle (expected strings built by re-calling the same production template) with literal expected strings, pinned at both catalog boundaries (first entry as Set, last entry as Clear) plus the mid-catalog case, and added a property assertion that no composed line in either scope contains a `"` character.
- Added an explicit `hexSyntax?: 'config-bare' | 'bbj-literal'` discriminator to VS Code's `SetOptsEditTarget`, defaulting to the config.bbx form (#474) so every existing caller is unaffected; the `apply` handler now computes the write-text once from that discriminator and uses it in both the replace and insert branches. `setopts-in-code-ui.ts`'s absolute-mode branch is the only caller that opts into `'bbj-literal'`.
- Added `BbjHexLiteral.of(String)` in IntelliJ as the Java twin (a plain-Java seam, no IntelliJ import, mirroring `RemToggleSeam`/`CompilerInitOptions`/`NodeAvailability`), and routed `ComposerLauncher.openSetoptsInCodeAbsolute`'s single `doc.replaceString(...)` call through it. `openSetopts`'s config.bbx writer is byte-identical to HEAD.
- Extended `SetoptsInCodeSourceGuardTest` with a region-scoped test pinning the BBj-program writer to the new formatter and the config.bbx writer away from it.

## The four literal block lines the new oracle pins (verbatim)

```
opts$=OPTS
opts$=IOR(opts$,$08000000000000000000000000000000$)
opts$=AND(opts$,$FFDFFFFFFFFFFFFFFFFFFFFFFFFFFFFF$)
SETOPTS opts$
```

Catalog-boundary lines (also pinned literally, `scope: 'reassignments'`):
- First entry (byte 1, mask `0x80`) as Set: `opts$=IOR(opts$,$80000000000000000000000000000000$)`
- Last entry (byte 9, mask `0x10`) as Clear: `opts$=AND(opts$,$FFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFF$)`

## Task Commits

Each task was committed atomically (Tasks 1 and 2 are `tdd="true"`, so each carries a RED `test(...)` commit followed by a GREEN `feat(...)` commit):

1. **Task 1: One exported hex-literal formatter, both generated mask arguments routed through it, and an oracle that can fail**
   - `c6cfc2ec` `test(88-10): pin composeSetOptsBlock output with literal expectations, not the same template` (RED)
   - `eab6e7a8` `feat(88-10): route composeSetOptsBlock's IOR/AND arguments through one hex-literal formatter` (GREEN)
2. **Task 2: The VS Code in-place writer puts a complete literal back, and config.bbx keeps its bare hex**
   - `cd254f54` `test(88-10): pin the absolute panel's write text and add a config.bbx bare-hex regression guard` (RED)
   - `fd6d073a` `feat(88-10): VS Code in-place writer puts a complete hex literal back for BBj-program edits` (GREEN)
3. **Task 3: The IntelliJ in-place writer gets the same formatter, and a source guard keeps the two file formats apart**
   - `99202370` `feat(88-10): IntelliJ in-place writer puts a complete hex literal back (G-88-3)`

**Register-check follow-up:** `ab331ca9` `docs(88-10): scrub the internal gap id from source/test comments (register check)` — the plan's own verification step 7 forbids gap ids in source/test comments (issue references like `#474`/`#475` stay allowed); the initial task commits named the internal gap id in doc comments and test names, so this commit reworded them to plain prose with no functional change, then re-ran every targeted and whole-suite verification to confirm nothing regressed.

## Files Created/Modified

- `bbj-vscode/src/setopts-catalog.ts` — `bbjHexLiteral(digits)` export; both `composeSetOptsBlock` reassignment lines routed through it
- `bbj-vscode/test/setopts-catalog.test.ts` — literal-string oracle, catalog-boundary pins, no-quote-character property test, `bbjHexLiteral` unit tests
- `bbj-vscode/src/setopts-composer-webview.ts` — `SetOptsEditTarget.hexSyntax` discriminator; `apply` handler computes write-text once
- `bbj-vscode/src/setopts-in-code-ui.ts` — absolute branch sets `hexSyntax: 'bbj-literal'`
- `bbj-vscode/test/setopts-in-code-ui.test.ts` — absolute-panel write-text assertions, config.bbx bare-hex regression guard, updated composed-line fixtures
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjHexLiteral.java` (new) — the Java twin formatter
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/BbjHexLiteralTest.java` (new) — plain JUnit 5 value tests
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` — `openSetoptsInCodeAbsolute`'s `replaceString` call routed through `BbjHexLiteral.of`; `openSetopts`'s config.bbx writer byte-identical to HEAD
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/SetoptsInCodeSourceGuardTest.java` — new region-scoped test pinning the two writers apart

## Decisions Made

- **Writer side chosen over range side** for the `hexRange`/`hexDigits` contract mismatch: `hexRange` keeps spanning the whole `$…$` token (its documented, test-pinned meaning), and both writers now put a complete literal back. The alternative — narrowing `hexRange` to exclude delimiters — was rejected because `setopts-in-code-request.ts` is out of this plan's scope (owned by plan 88-11) and doing both would double up the delimiters.
- **`hexSyntax` defaults to `'config-bare'`** so every pre-existing (unmarked) caller — specifically `setopts-composer-ui.ts`'s config.bbx composer (#474) — needed zero changes, and its bare-hex behavior is now pinned by a direct test instead of assumed correct by omission.
- **Test oracle rebuilt on literal expected strings**, cross-checked against the already-pinned mask-value tests rather than re-derived from the production code under test — this tautology is exactly what let the original double-quote defect ship past 33 previously-passing composer tests.

## Deviations from Plan

**1. [Register check] Removed the internal gap id from source/test comments after initial commits**
- **Found during:** Post-task-3 verification pass (plan verification step 7)
- **Issue:** The plan's own register check forbids gap ids in source/test comments; the doc comments and test names added across all three tasks named the internal gap id (allowed for commit-message titles, per existing repo convention, but not for file content)
- **Fix:** Reworded every occurrence to plain descriptive prose with no functional change; re-ran all targeted tests, `npm run build`, `npm run lint`, the targeted Gradle tests, the whole IntelliJ suite, and the whole VS Code suite to confirm nothing regressed
- **Files modified:** all 9 files this plan touches
- **Verification:** `git diff` register-check grep clean; full re-run of every verification command, all green
- **Committed in:** `ab331ca9`

---

**Total deviations:** 1 auto-fixed (register-check compliance, no functional change)
**Impact on plan:** No scope creep — the fix touched only comment/test-name prose, verified byte-for-byte equivalent behavior via a full re-run of every automated check.

## Issues Encountered

None beyond the register-check follow-up documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both G-88-3 manifestations are fixed at their single source (server-side `composeSetOptsBlock`) and independently in both IDE in-place writers; the whole VS Code suite (1475 passed, 29 skipped, 0 failed) and the whole IntelliJ suite are green.
- G-88-3 stays open (`status: failed`) pending plan 88-13's live BBjServices verification of 88-RESEARCH.md Assumption A2 — do not close the gap from this plan's SUMMARY alone.
- Plan 88-11 (decoder tolerance / test-fixture corpus) and plan 88-12 (G-88-2, unrelated) are unaffected by this plan's changes; `setopts-code-scanner.test.ts`, `hover.test.ts` and `setopts-in-code-request.test.ts` were not touched and remain green against the unmodified decoder.

---
*Phase: 88-setopts-in-code-hovers-tri-state-composer*
*Completed: 2026-09-11*

## Self-Check: PASSED

All 6 commit hashes (`c6cfc2ec`, `eab6e7a8`, `cd254f54`, `fd6d073a`, `99202370`, `ab331ca9`) verified present in `git log`; all created/modified files (`setopts-catalog.ts`, `setopts-composer-webview.ts`, `setopts-in-code-ui.ts`, `BbjHexLiteral.java`, `BbjHexLiteralTest.java`) verified present on disk.
