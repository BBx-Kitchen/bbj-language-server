---
phase: 102-live-compiler-diagnostics-with-backward-compatibility
verified: 2026-09-22T19:40:00Z
status: passed
score: 6/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "Live and save-time compiler diagnostics on the same line coexist as two separate diagnostics, neither rewriting the other's source (D-03, D-09). Closed for sequential debounce cycles by 30708d5d, which clears both sources before mergeDiagnostics() runs. The regression test fails on the pre-fix source and passes on HEAD."
  gaps_remaining: []
  regressions: []
gaps: []
deferred:
  - truth: "Live and save-time diagnostics on the same line never rewrite each other's source, even when two debounce cycles for one document are in flight at once (a bbjcpl compile outlasting the next debounce window)"
    addressed_in: "Phase 105"
    evidence: "Phase 105 success criterion 3: 'Live-parse and BBjCPL diagnostics remain correct when both write `document.diagnostics` concurrently — no lost, doubled or misattributed diagnostic.'"
behavior_unverified_items: []
coincidental_reliance_items: []
human_verification: []
---

# Phase 102: Live Compiler Diagnostics With Backward Compatibility Verification Report

**Phase Goal:** With a BBj that has the endpoint, developers see the compiler's own syntax errors while they type in either IDE; with an older BBj or none at all, both extensions behave exactly as 0.16.x did.
**Verified:** 2026-09-22T19:40:00Z
**Status:** passed (one concurrent-cycle residue deferred to Phase 105, see Deferred Items)
**Re-verification:** Yes. The previous run (2026-09-22T18:20:00Z, gaps_found, 4/5) failed on the stale-relabel defect in `debouncedCompile()`.

## Re-verification Focus

### The closed gap: source relabelling in `debouncedCompile()`

- **Fix in source (HEAD):** `bbj-vscode/src/language/bbj-document-builder.ts`, in the `debouncedCompile()` timer callback. It now runs `document.diagnostics = (document.diagnostics ?? []).filter(d => d.source !== 'BBjCPL' && d.source !== BBJ_PARSER_SOURCE)` as its first step, before `cplService.compile()` and `mergeDiagnostics()`. The old post-merge filter is gone, and the live-parser step only appends. There is one clear per cycle and it runs before any merge. The fix commit is 30708d5d.
- **Regression test exists and passes:** `test/document-builder.test.ts`, test "a fresh same-line BBjCPL diagnostic is not absorbed into a leftover live-parser entry from a prior cycle". Cycle 1 leaves a live-parser diagnostic on line 5. Cycle 2 has BBjCPL report line 5 with a new message. The test asserts that exactly `{BBjCPL, 'current bbjcpl message'}` remains.
- **The test actually guards the defect:** this verifier ran the test against the pre-fix `bbj-document-builder.ts` (`30708d5d~1`) in a scratch export of HEAD, leaving the repo untouched. The test **fails** with exactly the original symptom: `received {source: 'BBjCPL', message: 'stale live-parser message'}`. The test is a genuine fail-first regression guard, not a tautology.
- **Human evidence:** 102-UAT.md re-test round, 20/20 pass on fresh builds of both IDEs. Test 19 ("Live and save-time errors on one line stay separate (post-fix)") checks that no `BBjCPL` entry keeps an old message after the line changes, in VS Code and IntelliJ.

### Concurrency assessment (overlapping debounce cycles)

This verifier traced the lifecycle against Langium 4.3.1 and probed it with a scratch test. The scratch test was run only in the scratch export and was not added to the repo.

1. **Sequential cycles are now sound twice over.** Every `debouncedCompile()` call is scheduled from `buildDocuments()`. Langium's `update()` → `resetToState(doc, Changed)` sets `document.diagnostics = undefined` before re-validation (`langium/lib/workspace/document-builder.js`, `resetToState`). On top of that, the fix clears both compiler sources before any merge. Once one cycle has finished, nothing from it can reach the next cycle's merge.
2. **A residual race remains when two cycles overlap in flight.** Langium reuses the same `LangiumDocument` object across edits (`update()` calls `getDocument(uri)`, not a new factory instance). The callback removes its own timer when it fires, before `await cplService.compile()`. So cycle B can fire while cycle A's `bbjcpl` is still running. Both then read-modify-write `document.diagnostics` with no synchronisation. The interleaving that breaks the truth:
   - A fires, clears, and awaits a slow compile.
   - The user edits, and B fires, clears, and awaits its compile.
   - A's compile resolves, and A appends its live-parser diagnostic for line N.
   - B's compile resolves with a BBjCPL diagnostic on line N.
   - `mergeDiagnostics()` (bbj-document-validator.ts) matches A's live entry, because its source is not `'BBjCPL'`. It relabels that entry `'BBjCPL'`, keeping the live-parser message, and drops B's real BBjCPL message.

   Scratch reproduction on HEAD, with scripted compile promises resolved in the order A then B, gives this final state: `[{"s":"BBjCPL","m":"live message from A"},{"s":"BBj Parser","m":"live message from B"}]`. `requestLiveParse()` does not guard against this. It has no client-side version or staleness check, and server-side `RequestCancelled` only covers a live request superseded while it is still in flight, which is not the case here.
3. **How reachable it is:** the default trigger is `debounced`, which fires on every edit-triggered build. A real `bbjcpl -N` took 609-689 ms here for a 3-line file, mostly JVM startup, and takes longer for large programs or slower hosts. The race needs the compile to outlast the gap between A firing and B firing, which is at least 500 ms plus build time. In practice the user has to resume typing within roughly 100-150 ms of a pause on this machine, with a wider window for larger files. It also needs an error on the same line. The window is narrow but real. The UAT would not reliably hit it.
4. **Verdict:** this residue is the same violation class as the must-have ("neither rewriting the other's source"). It is **not** just a benign advisory, and this report does not describe it as one. It is recorded as **deferred** rather than as a gap because the roadmap already assigns exactly this defect to a later phase. Phase 105 success criterion 3 reads: "Live-parse and BBjCPL diagnostics remain correct when both write `document.diagnostics` concurrently — no lost, doubled or misattributed diagnostic." Phase 105's criteria are still marked "draft, to be firmed at planning". **The Phase 105 planner must keep criterion 3.** The interleaving above, driven by two manually resolved `compileMock` promises in `document-builder.test.ts`'s existing `buildHarness()`, is ready to use as its fail-first test.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Typing invalid BBj in VS Code or IntelliJ, against a BBjServices offering the endpoint, surfaces the compiler's syntax errors without saving (PSRV-03) | ✓ VERIFIED | Regression check: `requestLiveParse()` is still called from `debouncedCompile()` behind `isEnabled()`, and its results are appended and published through one `notifyDocumentPhase`. 45/45 tests pass across the three suites. UAT test 20 (re-check on the fixed build) passed in both IDEs. The large-workspace scheduling caveat stays with Phase 105 (issue #692), as before. |
| 2 | Against pre-26.03 BBj or no connection, both extensions keep every 0.16.x feature with no error, dialog or repeated log line; the endpoint is probed once per connection; an automated test runs against a service double lacking the endpoint (PSRV-04) | ✓ VERIFIED | Regression check: `isEnabled()`/`latchOff()` on `METHOD_NOT_FOUND` are unchanged by the three fix commits (30708d5d, ba0f9853 and b02ffbb0 touch only the builder, `parseErrorToRange` and a type generic). The `bbj-parser-service.test.ts` suite passes. |
| 3 | Diagnostics land on the right line/range for continuation lines, user line numbers, CRLF files, and a last line with no trailing newline (PSRV-05) | ✓ VERIFIED | `parseErrorToRange()` now also clamps `endLine = Math.max(clampLine(editorEndLine), startLine)` (ba0f9853), so an inverted range can no longer occur. The four fixture shapes are unaffected: all measured records have equal start and end lines. The converter suite passes, including the new inverted-line test. |
| 4 | An endpoint exception, timeout, or unreachable BBjServices never appears as a syntax error (PSRV-08) | ✓ VERIFIED | The failure-kind classification and the `RequestCancelled` path are unchanged. The "never becomes a diagnostic" tests pass. |
| 5 | The user can tell which mode is active: one log line per connection, and both extensions' docs say BBj 26.03+ (PSRV-09) | ✓ VERIFIED | `latchOn`/`latchOff` still log once per generation. No docs were touched since the previous run, which grep-verified all six pages. |
| 6 | Live and save-time compiler diagnostics on the same line coexist as two separate diagnostics, neither rewriting the other's source (plan 102-01 truth; D-03, D-09) | ✓ VERIFIED (concurrent-cycle residue deferred to Phase 105) | The fix is in source, and the named regression test passes on HEAD and fails on the pre-fix source. UAT test 19 passed in both IDEs. The overlapping in-flight cycle case is reproduced and deferred to Phase 105 criterion 3 (see above). |

**Score:** 6/6 truths verified (0 present-but-behavior-unverified). Truth 6 is behavior-dependent (an ordering invariant), and a passing named test that fails first on the old code backs it, not symbol presence.

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Same-line live/BBjCPL diagnostics stay separate even when two debounce cycles for one document overlap (slow `bbjcpl` plus continued typing) | Phase 105 | Criterion 3: "Live-parse and BBjCPL diagnostics remain correct when both write `document.diagnostics` concurrently — no lost, doubled or misattributed diagnostic." |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/bbj-document-builder.ts` | debounce hook, clear-before-merge of both compiler sources, trigger-off clear | ✓ VERIFIED | Combined pre-merge filter present; live step append-only; `off` trigger clears both sources. |
| `bbj-vscode/src/language/bbj-parser-service.ts` | `BBJ_PARSER_SOURCE`, `BBjParserService`, `parseErrorToRange`, `parseErrorsToDiagnostics` | ✓ VERIFIED | All present; end-line clamp added. |
| `bbj-vscode/src/language/java-interop.ts` | `parseProgram()`, `connectionGeneration` | ✓ VERIFIED | `parseProgramRequest` error-data generic now `null`, matching the file's other request types (b02ffbb0); no runtime change. |
| `bbj-vscode/src/language/bbj-document-validator.ts` | `getMaxErrors()`, `mergeDiagnostics()` | ✓ VERIFIED | Unchanged. |
| `bbj-vscode/src/language/bbj-module.ts` | `BBjParserService` registered | ✓ VERIFIED | Unchanged. |
| `bbj-vscode/test/document-builder.test.ts` | harness with mocked `BBjParserService` plus stale-relabel regression test | ✓ VERIFIED | Present, passes, fails first against the pre-fix source. |
| `bbj-vscode/test/bbj-parser-service.test.ts` / `parser-coordinate-converter.test.ts` | unit suites | ✓ VERIFIED | Pass; converter gained the inverted-line test. |
| Six documentation pages | BBj 26.03 requirement | ✓ VERIFIED | Unchanged since the previous grep verification. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `debouncedCompile()` | `BBjParserService.requestLiveParse()` | `isEnabled()` gate, lazy service-registry resolution | ✓ WIRED | Unchanged. |
| `requestLiveParse()` | `JavaInteropService.parseProgram()` | direct call | ✓ WIRED | Unchanged. |
| `debouncedCompile()` clear step | `mergeDiagnostics()` | clear both sources, then compile, then merge, then append live | ✓ WIRED | The previous hazardous ordering is fixed for sequential cycles. The concurrent residue is deferred (Phase 105). |
| Both `features.md` pages | `bbj.compiler.trigger` | prose cross-reference | ✓ WIRED | Unchanged. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 102 suites plus builder harness | `cd bbj-vscode && npx vitest run test/document-builder.test.ts test/bbj-parser-service.test.ts test/parser-coordinate-converter.test.ts` | 3 files, 45 tests, all passed (1.06 s) | ✓ PASS |
| Regression test fails first | same test file, `-t "absorbed into a leftover"`, run in a scratch export with `bbj-document-builder.ts` from `30708d5d~1` | 1 failed: received `{BBjCPL, 'stale live-parser message'}` | ✓ PASS (guard is real) |
| Overlapping-cycle probe | scratch test in the scratch export on HEAD source: two in-flight compiles resolved A then B | final `[{BBjCPL, 'live message from A'}, {BBj Parser, 'live message from B'}]` | Reproduced; deferred to Phase 105 |
| `bbjcpl` duration | `/opt/bbx/bin/bbjcpl -N <3-line file>` ×3 | 639 / 609 / 689 ms | Informational |
| TypeScript build | `npx tsc -b tsconfig.json` | exit 0, no output | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PSRV-03 | 102-01, 102-04 | Live syntax errors while typing, both IDEs | ✓ SATISFIED (caveat) | Large-workspace scheduling and concurrent-write correctness belong to Phase 105 (issue #692). |
| PSRV-04 | 102-01 | Backward compatibility with pre-26.03 BBj or no connection | ✓ SATISFIED | Unchanged from the previous run. |
| PSRV-05 | 102-02, 102-03 | Coordinate conversion for all four document shapes | ✓ SATISFIED | Hardened by the end-line clamp. |
| PSRV-08 | 102-01 | Endpoint failures never surface as document errors | ✓ SATISFIED | Unchanged. |
| PSRV-09 | 102-01, 102-03, 102-04 | Mode log line plus documentation | ✓ SATISFIED | Unchanged. |

No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | | | | The added lines of 30708d5d..b02ffbb0 across `bbj-vscode/src` and `bbj-vscode/test` contain no `TBD`/`FIXME`/`XXX`/`TODO`/`HACK` markers and no planning or review ids (`CR-`/`WR-`/`IN-`/`D-NN`/`PSRV-`). The previous run's blocker (clear-after-merge ordering) and warning (unclamped end line) are both resolved. |

### Human Verification Required

None outstanding. 102-UAT.md's re-test round (20/20, fresh builds of both IDEs) covers the post-fix behavior, including test 19 for this gap.

### Gaps Summary

The single gap from the previous run is closed. `debouncedCompile()` now clears both `'BBjCPL'` and live-parser diagnostics before the BBjCPL merge. A regression test pins this, and this verifier confirmed the test fails against the pre-fix source and passes on HEAD. The end-line clamp and the type-generic alignment are in, with their tests passing.

One residue remains and is deliberately not hidden. When two debounce cycles for the same document are in flight at once, their unsynchronised read-modify-write of `document.diagnostics` can still relabel a live-parser diagnostic as `'BBjCPL'` and drop the real BBjCPL message. This needs a slow `bbjcpl` plus continued typing, and this verifier reproduced it with a scratch test. It is the same violation class as truth 6. It is recorded as deferred, not as a gap, only because Phase 105 criterion 3 explicitly owns concurrent-write correctness ("no lost, doubled or misattributed diagnostic"). The concrete remedy options (a per-document generation or sequence token checked after each await, or serialising cycles per document) and the fail-first interleaving test belong to that phase.

---

_Verified: 2026-09-22T19:40:00Z_
_Verifier: Claude (gsd-verifier)_
