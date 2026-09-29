---
phase: 119-grammar-declare-file-paths-shared-channel-opening
verified: 2026-09-29T00:30:00Z
status: human_needed
score: 7/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Decide whether the non-greedy BBjFilePath terminal's behavior on 3+ consecutive colons (e.g. `declare ::foo:::bar::ClassA x`) needs a regression test or a documented-acceptable-risk comment next to the terminal"
    expected: "Either a test pins the new (different) behavior for a malformed 3+-colon path, or a grammar comment next to `terminal BBjFilePath` explicitly accepts the current fallout as the reviewer's suggested fix proposed"
    why_human: "This is an unresolved WARNING (WR-01) from 119-REVIEW.md: a genuine, narrow behavior change with zero test coverage in either direction. It does not fail any roadmap success criterion or must-have truth (the private corpus and probe show zero unexplained differences, meaning this shape does not occur in the measured corpus), so it does not block phase completion, but it was never closed, documented, or logged to WINDOWS.md, and 119-02-SUMMARY.md's Next Phase Readiness section does not mention it as a carried-forward item."
---

# Phase 119: Grammar — DECLARE File Paths & Shared Channel Opening Verification Report

**Phase Goal:** Two DECLARE statements with library file paths on one line parse as two declarations, and the channel/options/RPAREN opening shared by the output-item and input-item statements is one grammar rule, with every other parse unchanged.
**Verified:** 2026-09-29T00:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `declare ::lib1::ClassA a; declare ::lib2::ClassB b` parses as two declarations, each with its own file-path token, no parse/validation errors | ✓ VERIFIED | `bbj-vscode/src/language/bbj.langium:1049` is `terminal BBjFilePath: /::.*?::/;`. `bbj-vscode/test/declare-file-paths.test.ts` test "the #527 line parses as two declarations..." asserts `decls.map(d=>d.name)` equals `['a','b']`, each `klass.$refText` and resolved document URI, and zero diagnostics. Ran the test myself: PASSED (557 passed, 1 pre-existing skip). |
| 2 | A regression file under `test/test-data/` pins the two-path shapes and is picked up by `example-files.test.ts`'s zero-error gate | ✓ VERIFIED | `bbj-vscode/test/test-data/issue527-declare-file-paths.bbj` exists, 8 lines, content matches D-06 exactly (verified by direct read). `example-files.test.ts` parses every file under `test-data/` automatically; ran targeted suite myself, passed. |
| 3 | The two fragments that open with channel/options/RPAREN share one grammar rule; output's extra alternatives are kept, with necessity documented | ✓ VERIFIED | `bbj-vscode/src/language/bbj.langium:575-593` and `:686-689`: `fragment ChannelAndOptions: '(' channelno=Expression? Options?;` is called by both `WithChannelAndOptionsAndOutputItems` (`ChannelAndOptions (RPAREN_NL \| RPAREN_NO_NL items+=OutputItem ... \| RPAREN_NO_NL ENDLINE_PRINT_COMMA)`) and `WithChannelAndOptionsAndInputItems` (`ChannelAndOptions (RPAREN_NL \| RPAREN_NO_NL items+=InputItem ...)`). A 6-line grammar comment above the output fragment documents the PRINT/WRITE-only trailing-comma rationale, naming READ/INPUT explicitly and citing #602. `grep -c "'(' channelno=Expression? Options?"` on the file = 3 (OPEN, CLOSE, the new fragment's own body) — OPEN/CLOSE untouched, confirmed by direct read of lines 549 and 752. No guard parameter exists in the grammar (`grep -c -E '^(fragment +)?[A-Za-z_]+ *<'` = 0). |
| 4 | `npm run langium:generate` (Node 22) and the whole suite, incl. `example-files.test.ts`, pass with no new failures | ✓ VERIFIED | Ran `npx vitest run test/declare-file-paths.test.ts test/example-files.test.ts test/parser.test.ts test/parser-keyword-statements.test.ts` myself: 557 passed, 1 skipped, 0 failed. `generated/ast.ts` contains `BBjFilePath: /::.*?::/,` (line 28) — regeneration ran and produced the expected reflection table. |
| 5 | A before/after parse probe over examples + test data shows no changed parse outcome except the #527 shape | ✓ VERIFIED | Inspected `/home/coder/repos/tmp/phase-119/diff-base-head.txt` directly: `DIFF onlyA=0 onlyB=1 lexerParserErrors=0 filePathTokens=7 tokens=7 nodeTypes=7`. The only new key is the regression file itself; the 7 differing cases are exactly `fp-two-declares`, `fp-two-uses`, `fp-extends-implements`, `fp-declare-then-new`, `fp-two-statics`, `fp-continuation`, `fp-two-drive-paths` — all seven #527 two-path probe cases, none of the 12 channel/options or other cases. |
| 6 | A local run of the private conformance corpus shows no changed parse outcome, by file set | ✓ VERIFIED | Inspected `/home/coder/repos/tmp/phase-119/corpus-diff-base-head.txt` directly: `falseRejects onlyA=0 onlyB=0 changed=0`, `falseAlarms onlyA=0 onlyB=0 changed=0`, `missed onlyA=0 onlyB=0 changed=0`, `CORPUS-DIFF total=0 unexplained=0 newFalseRejects=0`. |
| 7 | Whole suite has no failing test name absent from the base list; lint, typecheck:test, build clean | ✓ VERIFIED | `suite-base-failed.txt` and `suite-head-failed.txt` both contain exactly one line, `test/functional/installed-extension-e2e.test.ts > (suite failed)` (a pre-existing, documented stale-installed-bundle failure, unrelated to grammar). `comm -13` between them is empty. Ran `npm run lint` and `npm run typecheck:test` myself: both clean. |

**Score:** 7/7 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/bbj.langium` | non-greedy `BBjFilePath` terminal + shared `ChannelAndOptions` fragment | ✓ VERIFIED | Both changes present, substantive, and correctly wired (see truths 1 and 3) |
| `bbj-vscode/test/declare-file-paths.test.ts` | #527 acceptance test + regression-file token/AST assertions | ✓ VERIFIED | 154-line file, two `test()` blocks with real assertions against resolved lib documents and literal token/AST expectations — no stubs |
| `bbj-vscode/test/test-data/issue527-declare-file-paths.bbj` | 8-line parse regression fixture | ✓ VERIFIED | Exact content match to D-06 spec; picked up by `example-files.test.ts` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `bbj.langium` terminal `BBjFilePath` | `generated/ast.ts` `BBjTerminals` | `langium generate` (Node 22) | ✓ WIRED | `ast.ts:28` shows `BBjFilePath: /::.*?::/,` |
| `declare-file-paths.test.ts` | `test-data/issue527-declare-file-paths.bbj` | `fs.readFileSync` | ✓ WIRED | Confirmed by direct read of the test file (line 88-89) |
| `declare-file-paths.test.ts` | `bbj-service-registry.ts` `registerUseTarget` | extensionless lib fixture registration | ✓ WIRED | Confirmed by direct read (lines 32-46) |
| `WithChannelAndOptionsAndOutputItems` / `...InputItems` | `fragment ChannelAndOptions` | fragment call at start of first alternative | ✓ WIRED | Confirmed by direct read of `bbj.langium:586` and `:687` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FIX-01 | 119-01 | Two file-path-qualified DECLAREs on one line parse as two declarations (#527) | ✓ SATISFIED | Truths 1, 2, 5, 6, 7 above; `REQUIREMENTS.md` line 30 checked and traceability row (line 130) marked Complete |
| REF-13 | 119-02 | Shared channel/options/RPAREN opening rule, parsing unchanged (#602) | ✓ SATISFIED | Truths 3, 4, 5, 6, 7 above; `REQUIREMENTS.md` line 92 checked and traceability row (line 177) marked Complete |

No orphaned requirements: `grep "Phase 119" REQUIREMENTS.md` returns exactly the FIX-01 and REF-13 traceability rows, matching both plans' `requirements:` frontmatter.

### Anti-Patterns Found

None. Scanned all added lines (`git diff <base-sha> -- bbj-vscode/src bbj-vscode/test`) for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` — zero matches. No stub return patterns in the grammar or test files (both are substantive, not scaffolding).

### Code Review Findings (119-REVIEW.md)

| ID | Severity | Description | Disposition |
|----|----------|--------------|--------------|
| WR-01 | Warning | Non-greedy terminal changes behavior for a malformed 3+ consecutive-colon path (e.g. `::foo:::bar::`), with no test coverage in either direction and no documented rationale next to the terminal | **Unresolved.** Not fixed, not documented at the terminal, not logged to `WINDOWS.md`. Does not fail any roadmap success criterion (the corpus/probe show zero unexplained differences, so this shape isn't exercised by the measured corpus), so it is not a phase blocker — routed to human verification below. |
| IN-01 | Info | Two independent regexes (`BBjPathPattern`, `BBjClassNamePattern`) both assume the `BBjFilePath` terminal never emits more than one `::...::` pair | Optional, no action required per reviewer; not a phase blocker |

### Human Verification Required

### 1. WR-01 disposition: 3+ consecutive colons in a file-path token

**Test:** Review `bbj-vscode/src/language/bbj.langium:1049` and decide whether the narrow behavior change for malformed paths with 3+ consecutive colons (documented in `119-REVIEW.md` WR-01) needs a regression test, a grammar comment documenting acceptance of the new fallout, or neither.
**Expected:** A maintainer decision recorded either as a new test/comment commit, or an explicit accepted-risk note (e.g. in `WINDOWS.md` or a follow-up issue).
**Why human:** This is a judgment call about acceptable risk for a corner case with no observed real-world occurrence (zero unexplained corpus/probe differences), not a mechanically verifiable pass/fail.

### Gaps Summary

No gaps block the phase goal. All 3 roadmap success criteria and both requirement IDs (FIX-01, REF-13) are independently verified against the actual codebase: the grammar changes exist exactly as claimed, the tests are substantive and pass when run directly, the generated AST is unchanged beyond the one terminal line, and the probe/corpus/whole-suite evidence in `/home/coder/repos/tmp/phase-119/` is internally consistent and matches the SUMMARY.md narratives. The single open item is an unresolved code-review WARNING (WR-01) that was never closed or explicitly accepted — it does not fail any must-have truth but should not be silently dropped, hence `human_needed` rather than `passed`.

---

_Verified: 2026-09-29T00:30:00Z_
_Verifier: Claude (gsd-verifier)_
