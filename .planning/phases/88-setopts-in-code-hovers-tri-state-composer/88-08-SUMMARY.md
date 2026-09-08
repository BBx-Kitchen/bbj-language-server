---
phase: 88-setopts-in-code-hovers-tri-state-composer
plan: 08
subsystem: testing
tags: [packaging, e2e, lsp, vsce, setopts, gap-closure]
requires:
  - phase: 88-01..88-07
    provides: SETOPTS-in-code hover decode, tri-state composer client/server surfaces, indexed-target unsafe-reason fix
provides:
  - "vscode:prepublish now rebuilds out/extension.cjs and out/language/main.cjs from source (npm run build) before vsce package reads them"
  - "bbj-vscode/test/functional/installed-extension-e2e.test.ts — a standing regression gate that spawns the INSTALLED extension bundle as a real --node-ipc LSP process and asserts hover/decodeInCode/composeTriState/client-manifest/diagnostics/codeAction against it"
  - "examples/issue475-setopts-in-code.bbj — shared retest fixture (automated harness + human retest) carrying the user's exact reported reproduction plus a canonical safe chain"
  - "a measured shared-server diagnostics/codeAction latency data point recorded in .planning/debug/g-88-2-composer-never-activates.md"
affects:
  - 88-09 (IntelliJ-side plan, wave 2, depends on this plan; uses the same fixture for the human retest checkpoint)
actuals:
  tokens: 11150
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "Installed-bundle e2e gate: resolve the actual VS Code install from ~/.ext-test/extensions/extensions.json's identifier.id entry (never a directory glob or hardcoded version), spawn its out/language/main.cjs with the same --node-ipc invocation the extension itself uses, and drive it over a real vscode-jsonrpc/node connection — proves the ARTIFACT a user loads, not just the source tree"
    - "Warm-up poll after didOpen: a hover/decode request sent immediately after a didOpen notification can race the server's async document build and return undefined; poll a known-good position with a bounded retry loop until it returns a real result before running real assertions, instead of a fixed sleep or trusting the first request to block internally"
key-files:
  created:
    - bbj-vscode/test/functional/installed-extension-e2e.test.ts
    - examples/issue475-setopts-in-code.bbj
  modified:
    - bbj-vscode/package.json
    - .planning/debug/g-88-2-composer-never-activates.md
key-decisions:
  - "vscode:prepublish gains `npm run build` positioned after `shx cp ../LICENSE` and before `esbuild-base --minify`, leaving every other segment untouched — this is the single line that was silently missing from every packaging path (bbj-ext-install, manual-release.yml, preview.yml) and produced both G-88-1 and G-88-2's VS Code halves"
  - "The e2e harness sets rootUri/workspaceFolders to null on initialize, deliberately preventing a workspace scan — keeps the probe scoped to exactly one fixture file and java-interop on :5008 off the critical path for Tasks 1-2's measurements"
  - "Task 3 spawns its own separate server instance and deliberately omits the compiler.trigger:'off' override Tasks 1-2 send, so its diagnostics/codeAction latency measurement reflects what a live IDE actually experiences (debounced compiler trigger, real BBjCPL round trip)"
patterns-established:
  - "findPosition(fullText, exactLine, token) locates a hover/decode target by searching for a physical line whose TRIMMED text exactly equals a given string, then the LAST occurrence of a token within that line — exact-line matching (not substring/.includes) avoids false matches when one target line is a substring of another (e.g. a standalone `SETOPTS A$` line vs. a compound line ending in `; SETOPTS A$`), and lastIndexOf resolves to the intended trailing occurrence when a token like `A$` also appears earlier on the same line"
requirements-completed: [DISC-05, DISC-06]
coverage:
  - id: self-rebuilding-packaging
    description: "vsce package (including bbj-ext-install) can no longer ship a stale out/extension.cjs / out/language/main.cjs — vscode:prepublish rebuilds both from source first"
    verification:
      - kind: other
        ref: "node -e checking package.json's vscode:prepublish script contains 'npm run build'"
        status: pass
    human_judgment: false
  - id: installed-bundle-hover-decode
    description: "The extension VS Code actually loads returns correct SETOPTS hover decode markdown over a real LSP connection for the absolute literal, IOR/AND mask-call, and byte-range-unsafe chain shapes on the user's exact reported reproduction, plus the canonical safe chain's Sets/Clears"
    requirement: DISC-05
    verification:
      - kind: e2e
        ref: "bbj-vscode/test/functional/installed-extension-e2e.test.ts (SETOPTS-in-code hover decode describe block, tests a-e)"
        status: pass
    human_judgment: false
  - id: installed-bundle-composer-client-registration
    description: "The installed package.json registers bbj.composeSetoptsInCode at all three VS Code entry points (contributes.commands, editor/context menu, activationEvents) and the compiled out/extension.cjs client bundle carries the command id literal — inverting the exact evidence that proved G-88-2's VS Code half"
    requirement: DISC-06
    verification:
      - kind: e2e
        ref: "bbj-vscode/test/functional/installed-extension-e2e.test.ts (tri-state composer describe block, client manifest/bundle tests)"
        status: pass
    human_judgment: false
  - id: installed-bundle-composer-server-requests
    description: "decodeInCode opens the edit gate (mode: chain, editable: true) on the canonical safe chain with a populated chain/initial, keeps it shut with a named byte-range reason on the reported chain, returns found:false on a comment line, and composeTriState renders the canonical var$=OPTS/IOR/AND/SETOPTS var$ block with option keys derived from the live catalog response"
    requirement: DISC-06
    verification:
      - kind: e2e
        ref: "bbj-vscode/test/functional/installed-extension-e2e.test.ts (tri-state composer describe block, decodeInCode/composeTriState tests)"
        status: pass
    human_judgment: false
  - id: shared-server-latency-measured
    description: "Diagnostics and codeAction latency on the reported snippet are measured against the shared language server (compiler trigger left at its live-IDE default) and both are well within budget, eliminating the one untested alternative hypothesis for IntelliJ's reported hang"
    verification:
      - kind: e2e
        ref: "bbj-vscode/test/functional/installed-extension-e2e.test.ts (shared-server diagnostics and codeAction latency describe block); .planning/debug/g-88-2-composer-never-activates.md (2026-09-08T17:08:02Z Evidence entry)"
        status: pass
    human_judgment: false
  - id: live-ui-and-intellij-retest
    description: "Whether the hover popup and Code Action lightbulb actually render in a live VS Code editor, and the entire IntelliJ half of both gaps"
    verification: []
    human_judgment: true
    rationale: "No IntelliJ sandbox is reachable from this devcontainer (confirmed by the g-88-2 debug session), and this harness proves the language server answers/the client manifest registers, but does not drive VS Code's UI. Explicitly deferred to 88-09-PLAN.md's blocking human checkpoint. G-88-1 and G-88-2 stay status:failed in 88-UAT.md."
duration: 34min
completed: 2026-09-08
status: complete
---

# Phase 88 Plan 08: Self-Rebuilding Packaging + Installed-Bundle SETOPTS E2E Gate Summary

**`vscode:prepublish` now rebuilds `out/` from source before packaging, and a new installed-extension-e2e.test.ts proves the artifact VS Code actually loads serves correct SETOPTS hover/composer decode over a real LSP connection — closing the packaging gap that shipped a pre-Phase-88 bundle into the UAT round.**

## Performance

- **Duration:** 34 min
- **Started:** 2026-09-08T16:46:00Z (worktree spawn)
- **Completed:** 2026-09-08T17:20:00Z
- **Tasks:** 3
- **Files modified:** 4 (1 modified, 3 new/appended)

## Accomplishments

- `bbj-vscode/package.json`'s `vscode:prepublish` script now runs `npm run build` (which produces `out/extension.cjs` and `out/language/main.cjs`) before `esbuild-base --minify` — the previously-missing link that let every packaging path (`bbj-ext-install`, `manual-release.yml`, `preview.yml`) ship whatever `out/` happened to already contain.
- New `bbj-vscode/test/functional/installed-extension-e2e.test.ts`: resolves the extension VS Code actually loads from `~/.ext-test/extensions/extensions.json`'s `identifier.id` entry (never a directory glob, never a hardcoded version — two version directories exist on disk), spawns its `out/language/main.cjs` as a real `--node-ipc` LSP server process, and asserts hover decode (5 shapes), tri-state composer client registration (3 manifest sites + the bundled client's command-id literal), composer server requests (`decodeInCode`/`composeTriState` edit-gate and block-shape behavior), and shared-server diagnostics/codeAction latency — 14 tests, all against the freshly installed artifact.
- New `examples/issue475-setopts-in-code.bbj`: the single shared fixture carrying the user's exact reported reproduction (byte-range IOR chain, absolute literal, byte-range AND chain) plus a canonical statically-safe `B$` chain, in the folder the ext-test VS Code instance opens by default.
- Captured and recorded the before/after evidence this plan exists to produce: 5/5 hover assertions failed against the stale install (`basis-intl.bbj-lang-0.12.28`, installed `2026-09-07T19:13:51Z`), all 5 passed after rebuild + reinstall (`2026-09-08T17:01:55Z`).
- Measured the shared-server diagnostics/codeAction latency on the reported snippet with the compiler trigger left at its live-IDE default: diagnostics arrived in 11082ms (budget 30000ms), `codeAction` resolved in 205ms (budget 15000ms) — recorded as a new Evidence entry in `.planning/debug/g-88-2-composer-never-activates.md`, eliminating the one untested alternative hypothesis for IntelliJ's reported hang.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end — self-rebuilding package step + installed-bundle SETOPTS hover proof** - `1d29b5a1` (feat)
2. **Task 2: Prove the tri-state composer's client entry points and server requests ship in the installed bundle** - `c554a980` (test)
3. **Task 3: Measure the shared-server diagnostics/codeAction path and record what it eliminates for IntelliJ** - `939756fd` (test)

_No plan-metadata commit yet — this worktree's changes are merged back by the orchestrator; STATE.md/ROADMAP.md are not touched here._

## Files Created/Modified

- `bbj-vscode/package.json` - `vscode:prepublish` gains `npm run build` before `esbuild-base --minify`
- `bbj-vscode/test/functional/installed-extension-e2e.test.ts` - new standing e2e regression gate (14 tests across 3 describe blocks)
- `examples/issue475-setopts-in-code.bbj` - new shared retest fixture
- `.planning/debug/g-88-2-composer-never-activates.md` - one new Evidence entry appended (frontmatter/Resolution/prior entries untouched)

## Decisions Made

- `vscode:prepublish`'s new `npm run build` segment is positioned after `shx cp ../LICENSE ./LICENSE` and before `npm run esbuild-base -- --minify`, changing nothing else in `package.json` — minimizes the diff to exactly the missing link.
- The e2e harness's `initialize` request sends `rootUri: null, workspaceFolders: null` to avoid any workspace scan, keeping java-interop on `:5008` off the critical path for Tasks 1-2's measurements (Task 3 needs the real BBjCPL/validator path, so it is the one describe block that omits the `compiler.trigger:'off'` override).
- Added a warm-up poll after `textDocument/didOpen` (not in the original plan text, but required to make the harness reliable): the first hover request sent immediately after `didOpen` can race the server's async document build and return `undefined` (`bbj-hover.ts` bails out when `document.parseResult` isn't populated yet). The harness now polls a known-good position with a bounded 30s retry loop until it gets a real result before running any real assertion, so every test measures the intended behavior rather than a startup race.
- `findPosition`'s line lookup uses an EXACT trimmed-line match (not `.includes()`), because the fixture's compound reproduction line (`a$=OPTS; A$(1,1)=IOR(A$(1,1),$C2$); SETOPTS A$`) contains `SETOPTS A$` as a raw substring, which would otherwise collide with the fixture's separate standalone `SETOPTS A$` line (closing the second reported reproduction) when searching by substring.
- `composeTriState`'s test derives its two option keys from `decodeInCode`'s own `initial.entries` array (which the catalog populates for every tracked bit, not just ones the fixture's chain happens to touch) rather than hardcoding a byte/mask pair, per the plan's own "so a catalog rename cannot silently make this vacuous" requirement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Worktree branch predated all of Phase 88's landed source**
- **Found during:** Pre-Task-1 setup, before reading any plan-referenced source file
- **Issue:** This agent's worktree branch was created from a commit (`c0b113c7`, "Bump preview version") 246 commits behind `main`. `bbj-vscode/src/language/setopts-in-code-request.ts`, `setopts-code-scanner.ts`, and every other 88-01..88-07 deliverable this plan's `<interface_context>` and READ-ONLY constraints depend on did not exist in the worktree at all.
- **Fix:** Merged `main` into the worktree branch (`git merge main --no-edit`, a clean fast-forward with no conflicts, since the worktree branch had no unique prior commits of its own). Discarded one harmless `npm install`-driven `package-lock.json` version-field diff first (`git checkout -- bbj-vscode/package-lock.json`) so the merge stayed clean.
- **Files modified:** none beyond the merge itself (no working-tree files touched by this fix)
- **Verification:** `bbj-vscode/src/language/setopts-in-code-request.ts` and `setopts-code-scanner.ts` present after merge; `npm run build` succeeds; the Phase 88 targeted suite (5 files, 183 tests) passes at the documented 0-failed baseline both immediately after merge and again after this plan's own changes.
- **Committed in:** not a separate commit — the merge only fast-forwarded local branch state; no new commit was created since the worktree branch had no divergent history.

**2. [Rule 3 - Blocking] `langium generate` fails in this environment; generated/ dir is gitignored and was missing from the fresh worktree**
- **Issue:** `npm install`'s `prepare` script runs `langium:generate && build`; `langium generate` throws `TypeError: Invalid URL ... /undefined#/$defs/languageItem` in `node_modules/jsonschema`, reproducing identically against the main checkout (pre-existing environment issue, unrelated to this plan's scope — the grammar itself is unchanged).
- **Fix:** Copied the already-generated `src/language/generated/` directory from the main repo checkout (same commit, so byte-identical output) into the worktree instead of regenerating it, then ran `npm run build` (tsc + esbuild only, no `langium:generate`) successfully.
- **Files modified:** none tracked by git (`src/language/generated/` is gitignored build output)
- **Verification:** `npm run build` succeeds; the full Phase 88 targeted and whole-suite runs pass at documented baselines.

---

**Total deviations:** 2 auto-fixed (1 bug — stale worktree base; 1 blocking — broken codegen tool, worked around with a same-commit copy)
**Impact on plan:** Both were setup-only prerequisites for being able to execute the plan at all in a fresh worktree; neither touched any file this plan's `files_modified` didn't already name, and neither is itself part of the plan's shipped artifact.

## Issues Encountered

- Running the plan's own verify commands via `npm --prefix <path> exec -- vitest run ...` from this agent's default working directory (which resets to the worktree root between Bash calls) does NOT change the child process's `cwd` to `<path>` — a pre-existing, unrelated test (`test/language-configuration.test.ts`) reads `bbj-language-configuration.json`/`package.json` via bare relative paths and fails with `ENOENT` under that invocation shape, inflating an initial whole-suite run to 16 failed tests. Re-running the identical suite with `cd <bbj-vscode-dir> && npx vitest run ...` (matching how a human or CI would actually invoke it) reproduced the documented baseline exactly: `numFailedTests: 12` (11 `linking.test.ts` + 1 `issue447-real-interop.test.ts`, both already-filed java-interop `getAllClassNames` environment drift), with zero failures in any Phase 88 file including the new e2e suite. This is an invocation-shape artifact of the harness, not a regression from this plan's changes — all verify commands referenced in this SUMMARY use the corrected invocation.

## User Setup Required

None - no external service configuration required. (The ext-test rig `~/.ext-test/extensions`, `code-server-test`, and `bbj-ext-install` were already provisioned in this devcontainer per its own setup memory.)

## Evidence: before/after the packaging fix

**Installed extension before this plan's rebuild:** `basis-intl.bbj-lang-0.12.28`, `installedTimestamp: 2026-09-07T19:13:51Z` (predates every Phase 88 commit — same stale install both `g-88-1-hover-no-decode.md` and `g-88-2-composer-never-activates.md` already proved).

**RED — `npm --prefix .../bbj-vscode exec -- vitest run test/functional/installed-extension-e2e.test.ts` against that stale install (verbatim):**

```
 RUN  v4.1.10 /home/.../bbj-vscode

 ❯ test/functional/installed-extension-e2e.test.ts (6 tests | 5 failed | 1 skipped) 9951ms
     × a. absolute literal hover decodes the byte vector 7329ms
     × b. IOR mask-call hover names the options it sets 2175ms
     × c. AND mask-call hover names the options it CLEARS, never as a set/raw mask 17ms
     × d. SETOPTS A$ closing the byte-range IOR reproduction names the unsafe byte-range reason 20ms
     × e. SETOPTS B$ closing the canonical safe chain still decodes Sets/Clears over the wire 28ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  ... > a. absolute literal hover decodes the byte vector
AssertionError: expected a hover result, got: undefined. stderr: (empty): expected undefined to be defined

 FAIL  ... > b. IOR mask-call hover names the options it sets
AssertionError: expected '__`IOR(string,string{,ERR=lineref})`\…' to contain 'Sets these options:'
- Expected
+ Received
- Sets these options:
+ __`IOR(string,string{,ERR=lineref})`
+
+ The IOR() function inclusive ORs the bits of the two string arguments and returns a string. Both string arguments must be the same length.__

 FAIL  ... > c. AND mask-call hover names the options it CLEARS, never as a set/raw mask
AssertionError: expected '__AND(left:string, right:string, ERR?…' to contain 'Clears these options:'
- Expected
+ Received
- Clears these options:
+ __AND(left:string, right:string, ERR?!:lineref): string__

 FAIL  ... > d. SETOPTS A$ closing the byte-range IOR reproduction names the unsafe byte-range reason
AssertionError: expected a hover result, got: undefined: expected undefined to be defined

 FAIL  ... > e. SETOPTS B$ closing the canonical safe chain still decodes Sets/Clears over the wire
AssertionError: expected a hover result, got: undefined: expected undefined to be defined

 Test Files  1 failed (1)
      Tests  5 failed | 1 skipped (6)
```

This is exactly the reported symptom: no hover at all for the absolute literal and both `SETOPTS var$` chain closings, and the IOR/AND mask-call tokens falling back to the generic builtin-function-signature hover instead of the SETOPTS decode — because the installed bundle predates all of Phase 88's hover code and instead resolves `IOR`/`AND` as ordinary library functions.

**Rebuild + reinstall:** `npm run build` then `bbj-ext-install` (with `BBJ_LS_SRC` pointed at this worktree's root, per the plan's own precondition guidance for worktree execution). `vscode:prepublish` (now carrying the `npm run build` fix) ran as part of `vsce package`.

**Installed extension after rebuild:** `basis-intl.bbj-lang-0.12.28`, `installedTimestamp: 2026-09-08T17:01:55Z` (later than the stale `2026-09-07T19:13:51Z` — the install moved forward). Verified `out/language/main.cjs` now contains `setoptsHoverTarget` (3 occurrences) and `package.json`/`out/extension.cjs` now carry `composeSetoptsInCode` (3 and 2 occurrences respectively).

**GREEN — the same command against the freshly installed bundle (verbatim):**

```
 RUN  v4.1.10 /home/.../bbj-vscode

 Test Files  1 passed (1)
      Tests  5 passed | 1 skipped (6)
```

(All 5 hover assertions pass; the visible-skip guard test correctly stays skipped since the install is present. Task 2 and Task 3 extended this same file afterward — the full suite is 14 passed | 1 skipped across hover, composer, and latency describe blocks.)

## Task 3: shared-server latency measurement

Measured against the freshly installed bundle, with the compiler trigger left at its live-IDE `'debounced'` default (not overridden to `'off'` as Tasks 1-2 do):

- First `textDocument/publishDiagnostics` for the fixture: **11082ms** (budget 30000ms)
- `textDocument/codeAction` over the reported reproduction's line: **205ms** (budget 15000ms)

Both are well inside budget. Recorded as a new `## Evidence` entry (timestamp `2026-09-08T17:08:02Z`) in `.planning/debug/g-88-2-composer-never-activates.md`, with the `implication:` stating plainly: the one untested alternative hypothesis (a slow or blocked BBjCPL compile-diagnostics round trip specific to this snippet) is eliminated at the shared-server layer, so the stale-install explanation is now the only surviving one for IntelliJ's reported "Searching Content Actions..." hang; any residual risk is IntelliJ-platform-local, not a shared-server latency problem this probe could have caught. The file's frontmatter `status`, its `## Resolution` text, and every pre-existing `## Evidence` entry are byte-identical to before this plan (verified via `diff` against the pristine original) — this was a pure append.

## G-88-1 and G-88-2 status: still `failed`

**Neither gap is closed by this plan.** Every gate above proves the language server answers correctly and the client manifest registers correctly, over a real LSP connection to the actual installed artifact — but none of it drives VS Code's UI (whether the hover popup or the Code Action lightbulb actually render on screen), and none of it touches IntelliJ at all (no IntelliJ sandbox is reachable from this devcontainer, per the g-88-2 debug session's own "Blind spot" note). `88-UAT.md` keeps both gaps at `status: failed`; `gap_ids` in `88-08-PLAN.md`'s frontmatter is deliberately empty for exactly this reason — closing either gap requires 88-09-PLAN.md's blocking human checkpoint (a live VS Code retest of the popup/lightbulb, plus the entire IntelliJ side).

## Next Phase Readiness

- `examples/issue475-setopts-in-code.bbj` is ready to be opened directly in the ext-test VS Code instance (and, per 88-09's scope, an IntelliJ sandbox) for the human retest — it is the same file this plan's automated harness already proved decodes correctly at the server layer.
- The installed VS Code extension is now current (rebuilt from this worktree's merged-in Phase 88 source); a human retest of Test 1/Test 2 in `88-UAT.md` can proceed without a further rebuild step for the VS Code side.
- 88-09-PLAN.md (wave 2, `depends_on: [88-08]`) owns: the IntelliJ-side build/verification, and the blocking human checkpoint that alone can flip G-88-1/G-88-2 to `resolved`.
- No blockers for 88-09 from this plan's side — `bbj-vscode/src/`, `bbj-intellij/`, and every 88-01..88-07 deliverable remain untouched, as required by this plan's own scope guard.

---
*Phase: 88-setopts-in-code-hovers-tri-state-composer*
*Completed: 2026-09-08*

## Self-Check: PASSED

- FOUND: `bbj-vscode/package.json`
- FOUND: `bbj-vscode/test/functional/installed-extension-e2e.test.ts`
- FOUND: `examples/issue475-setopts-in-code.bbj`
- FOUND: `.planning/debug/g-88-2-composer-never-activates.md`
- FOUND commit: `1d29b5a1`
- FOUND commit: `c554a980`
- FOUND commit: `939756fd`
