---
phase: 122-release-ci-pipeline-hardening
plan: "01"
subsystem: infra
tags: [esbuild, vsce, vscode-extension-manifest, langium, packaging]

requires:
  - phase: 117-dependency-hygiene-and-dependabot-coverage
    provides: vsce moved to devDependencies, package-lock.json regenerated without a Node 24 prepare-script break
provides:
  - "vscode:prepublish that bundles only the two shipped entry points, minified, with esbuild keepNames on, and no lint/tsc/second bundler in the hook"
  - "prepare that only runs langium generate"
  - ".vscodeignore excluding sourcemaps, the stale out/main.js and local coverage output"
  - "activationEvents narrowed to the two onLanguage entries VS Code actually needs"
  - "langium-config.json with no TextMate output directive; the generated grammar and its .gitignore line are gone"
affects: [122-02, 122-03, 122-04, 122-05, 122-06]

actuals:
  tokens: 1960
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: ["esbuild keepNames on minified bundles for readable stack traces", "VSIX exclusion list as the order-independent fix for stale sourcemap leakage"]

key-files:
  created: []
  modified:
    - bbj-vscode/package.json
    - bbj-vscode/esbuild.mjs
    - bbj-vscode/.vscodeignore
    - bbj-vscode/langium-config.json
    - bbj-vscode/.gitignore
    - bbj-vscode/test/cvs-composer-ui.test.ts
    - bbj-vscode/test/setopts-in-code-ui.test.ts
    - bbj-vscode/test/functional/installed-extension-e2e.test.ts

key-decisions:
  - "prepare = 'npm run langium:generate' only (D-12); vscode:prepublish = 'shx cp ../LICENSE ./LICENSE && node ./esbuild.mjs --minify' (D-13/D-14), no tsc/lint/second bundler"
  - "esbuild.mjs sets keepNames: true unconditionally, after minify, with sourcemap: !minify left unchanged (D-15)"
  - ".vscodeignore gained three exclusions (**/*.map, out/main.js, coverage/**) as the order-independent fix for CI's sourcemapped-build-then-minified-package sequence (D-13)"
  - "activationEvents is exactly [onLanguage:bbj, onLanguage:bbx-config]; all twenty onCommand entries removed since engines.vscode ^1.101 derives command activation from contributes.commands (D-16)"
  - "all three tests asserting an onCommand activation entry (including the third one RESEARCH.md found beyond CONTEXT.md's two) were rewritten to assert contribution plus absence from activationEvents, each also asserting the onLanguage:bbj entry is present so a missing/empty array cannot pass"
  - "langium-config.json's textMate block removed (D-17); the stale generated grammar was deleted before its .gitignore line, so it never showed as untracked"

requirements-completed: [CI-07, CI-08, CI-09]

coverage:
  - id: D1
    description: "prepare only generates Langium sources; vscode:prepublish bundles only the two shipped entry points, minified, with names kept; the four dead scripts (esbuild-base and its two sourcemap variants, test-compile) are gone"
    requirement: "CI-07"
    verification:
      - kind: other
        ref: "task 1 verify block 2 (packaging config OK): node assertion over package.json scripts + esbuild.mjs keepNames/sourcemap + .vscodeignore exclusions"
        status: pass
    human_judgment: false
  - id: D2
    description: "A VSIX packaged after a sourcemapped npm run build ships neither the stale out/main.js bundle, nor a sourcemap, nor coverage output, nor the generated TextMate grammar; nothing else was added or removed from the package"
    requirement: "CI-07"
    verification:
      - kind: other
        ref: "task 1 verify block 3 (VSIX contents OK) and task 2 verify block 4 (package file set OK): unzip -Z1 exclusion checks plus a 74-file vsce-ls-base.txt vs vsce-ls-01.txt diff (70 coverage files + 2 maps + out/main.js + gen-bbj grammar removed, 0 added)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The packaged VSIX installs into the ext-test rig and the installed minified language server serves real LSP requests (hover, codeLens, composer decode/compose) correctly"
    requirement: "CI-07"
    verification:
      - kind: e2e
        ref: "test/functional/installed-extension-e2e.test.ts + test/language-server-lifecycle.test.ts, both runs after bbj-ext-install"
        status: unknown
    human_judgment: true
    rationale: "21 of the file's other tests pass end-to-end against the freshly installed minified bundle (hover decode, codeLens cues, composer decode/compose, manifest/bundle literal checks). One describe block ('installed extension e2e: SETOPTS-in-code (#475)', 14 tests) is skipped by a pre-existing beforeAll race unrelated to this plan -- see Deviations below for full evidence it predates this plan. A human should confirm this pre-existing condition is acceptable to carry forward rather than block on it."
  - id: D4
    description: "activationEvents holds only the two onLanguage entries; every onCommand entry is gone; the three tests that asserted an onCommand entry now assert contribution plus absence from activationEvents"
    requirement: "CI-09"
    verification:
      - kind: unit
        ref: "test/cvs-composer-ui.test.ts, test/setopts-in-code-ui.test.ts, test/functional/installed-extension-e2e.test.ts (task 2 verify block 3, manifest tests)"
        status: unknown
    human_judgment: true
    rationale: "Two of the three rewritten tests pass directly. The third (in installed-extension-e2e.test.ts) lives inside the same pre-existing-skip describe block as D3 and never executes for that reason, not because the rewrite is wrong -- the rewritten assertion source is identical in shape to its two passing siblings. A human should spot-check the rewritten assertion text in Files Modified below."
  - id: D5
    description: "langium-config.json declares no TextMate output; the stale generated grammar and its .gitignore line are gone; langium generate on Node 22 writes no file under syntaxes/"
    requirement: "CI-09"
    verification:
      - kind: other
        ref: "task 2 verify block 2 (generate OK): langium generate exit code, absence of syntaxes/gen-bbj.tmLanguage.json, non-empty generated ast.ts, clean git status on the generated paths"
        status: pass
    human_judgment: false
  - id: D6
    description: "The whole test suite, lint, typecheck:test and build all agree with the base commit; no added line carries a planning identifier; only the plan's eight files changed"
    requirement: "CI-08"
    verification:
      - kind: other
        ref: "task 2 verify blocks 5-7 (suite names OK, gates OK, hygiene OK): whole-suite JSON report diffed against suite-base-failed.txt, npm run lint/typecheck:test/build, and a diff-scoped planning-id grep"
        status: pass
    human_judgment: false

duration: 18min
completed: 2026-09-29
status: complete
---

# Phase 122 Plan 01: Minified-only packaging and manifest hygiene Summary

**`vscode:prepublish` now bundles exactly `out/extension.cjs` and `out/language/main.cjs`, minified with `keepNames`, and the VSIX excludes sourcemaps/`out/main.js`/coverage; `activationEvents` is down to the two `onLanguage` entries VS Code actually needs.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-09-29T15:45:03Z
- **Completed:** 2026-09-29T16:02:32Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- `prepare` now runs only `npm run langium:generate`; `vscode:prepublish` copies `LICENSE` and runs `node ./esbuild.mjs --minify` with no `tsc`, no lint and no second bundler; the four dead scripts (`esbuild-base`, `esbuild`, `esbuild-watch`, `test-compile`) are deleted.
- `esbuild.mjs` sets `keepNames: true` on both bundles so class/function names survive minification (verified via literal string checks for `CvsCodeActionProvider` and `BBjHoverProvider` inside the packaged, minified bundles). `sourcemap: !minify` is unchanged.
- `.vscodeignore` gained `**/*.map`, `out/main.js` and `coverage/**` exclusions — a VSIX packaged right after a sourcemapped `npm run build` carries neither stale maps, the dead bundle, nor local coverage output, regardless of step ordering.
- `activationEvents` is exactly `["onLanguage:bbj", "onLanguage:bbx-config"]`. All twenty `onCommand:` entries are gone, including a third test site (`test/functional/installed-extension-e2e.test.ts:266-270`) that RESEARCH.md found beyond CONTEXT.md's two named files. All three rewritten tests assert the command is contributed via `contributes.commands` AND that `activationEvents` both contains `onLanguage:bbj` and does not contain the removed `onCommand:` entry.
- `langium-config.json`'s `textMate` block is removed; the stale generated grammar was deleted before its `.gitignore` line so it never showed as untracked; `langium generate` on Node 22 exits 0 and writes nothing under `syntaxes/`.
- The ext-test rig was reinstalled twice (once per task) from this tree; `vsce ls --no-dependencies` dropped from 125 to 51 entries — exactly the 70 coverage files, 2 sourcemaps, `out/main.js` and the generated TextMate grammar, with zero files added.
- Whole test suite, lint, `typecheck:test` and `build` all match the phase base commit exactly (same pass/pending/total counts, same single pre-existing failed-suite name).

## Task Commits

1. **Task 1: Phase base recorded, then vscode:prepublish bundles only the two shipped entry points, minified with names kept, and a CI-shaped VSIX ships no stale artifact and installs** - `81342e13` (build)
2. **Task 2: activationEvents keeps only the two onLanguage entries, the three manifest tests assert contribution instead, and the unused TextMate generator output is gone** - `3631c80b` (build)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP/REQUIREMENTS)

## Files Created/Modified
- `bbj-vscode/package.json` - narrowed `prepare`/`vscode:prepublish`, four dead scripts removed, `activationEvents` down to two entries
- `bbj-vscode/esbuild.mjs` - `keepNames: true` added to the shared esbuild options
- `bbj-vscode/.vscodeignore` - three new exclusions (`**/*.map`, `out/main.js`, `coverage/**`) with one-line comments
- `bbj-vscode/langium-config.json` - `textMate` block removed from the bbj language entry
- `bbj-vscode/.gitignore` - the generated-grammar ignore line removed
- `bbj-vscode/test/cvs-composer-ui.test.ts` - activation test rewritten to assert contribution + absence from activationEvents
- `bbj-vscode/test/setopts-in-code-ui.test.ts` - test renamed, last assertion replaced with a positive `onLanguage:bbj` check plus a negative `onCommand:` check
- `bbj-vscode/test/functional/installed-extension-e2e.test.ts` - the third (RESEARCH-found) onCommand assertion rewritten the same way

## Decisions Made
- Followed the plan's D-12 through D-17 exactly as written; no architectural deviation. See `key-decisions` in the frontmatter for the specific text each decision produced.

## Deviations from Plan

### Auto-fixed Issues

None - all code changes matched the plan as written; no bugs, missing critical functionality, or blocking issues were found in the target files.

### Documented Pre-existing Condition (not a deviation, not auto-fixed)

**Task 1's fourth `<verify>` block and Task 2's third `<verify>` block cannot print their literal "OK" line, due to a pre-existing test-harness race that predates this plan and is out of scope for it.**

- **What was found:** `test/functional/installed-extension-e2e.test.ts`'s `describe.skipIf(!installPresent)('installed extension e2e: SETOPTS-in-code (#475)', ...)` block (14 tests, including the D-16-rewritten activation test at what was base line 266-270) fails its `beforeAll` hook with `Error: No document found for URI: file:///home/coder/repos/bbj-language-server/examples/issue475-setopts-in-code.bbj`, thrown from `vscode-jsonrpc`'s `handleResponse`. vitest reports the 14 tests as `skipped` (not `failed`) and the whole file as `status: failed` with zero failed assertions — matching the exact `(suite failed)` line already present in `suite-base-failed.txt`.
- **Proof this predates the plan (out of scope for Task 1/2's file set):** `suite-base.json`, captured before any edit in this plan (step 1 of Task 1, on the untouched tree), contains the identical skip set for this describe block under its old (pre-D-16) test names. The condition was re-verified deterministic across two independent reruns after this plan's edits landed (`e2e-01-t1.json` and `e2e-01-t1-rerun.json`, both `bad=15`/`numPassedTests=21`). Isolating the block with `-t "SETOPTS-in-code"` reproduces the same `beforeAll` error directly. None of Task 1's or Task 2's files (`package.json`, `esbuild.mjs`, `.vscodeignore`, `langium-config.json`, `.gitignore`, and the three onCommand test rewrites) touch this describe block, its fixture, or the connection/document-open sequence it depends on.
- **Effect on the plan's own regression gate:** the substantive check both blocks perform — `comm -13` against `suite-base-failed.txt`, i.e. "no failing name is new" — passes cleanly both times. The stricter, additional per-run node check (no skip/pending assertion outside the plan's anticipated "two visible-skip markers") is what fails, because the actual repo state has a third, pre-existing skip source the plan's authoring session did not know about (an analogue of RESEARCH.md's own "third onCommand test file" surprise, one layer deeper).
- **Secondary, cosmetic mismatch in the same check:** Task 1's regex `/needs .* first/` does not match `test/language-server-lifecycle.test.ts`'s actual marker title, `"language server lifecycle tests need \`npm run build\` first"` (singular "need", not "needs"), so that legitimate, intentional skip (`test.skipIf(serverBuilt)`, expected once the tree is built) is also counted as "bad" by the literal check text.
- **Net counts, both runs:** Task 1's e2e+lifecycle run: `numPassedTests=21`, `numTotalTests=37`, 15 "bad" (14 SETOPTS-in-code + 1 regex mismatch), 0 new failing names vs base. Task 2's manifest run: `numPassedTests=95`, `numTotalTests=110`, 14 "bad" (all SETOPTS-in-code, including the D-16 rewrite that lives inside that block, `seen=2` of 3 expected), 0 new failing names vs base.
- **Whole-suite gate (Task 2 verify block 5) is unaffected and passed cleanly:** `numFailedTests=0 numPassedTests=3694 numPendingTests=30 numTotalTests=3724 failedSuites=1`, byte-identical to the base run, single failed-suite name (`installed-extension-e2e.test.ts`) already in `suite-base-failed.txt`.
- **Action taken:** none in this plan's file scope (Rule 1/3 scope boundary — the race lives in a describe block this plan does not touch, and fixing an LSP document-open ordering race is architecturally unrelated to packaging/manifest hygiene). Recorded here per "do not silently skip a failing acceptance criterion." Not added to `.planning/WINDOWS.md` per this plan's shell rules (SUMMARY-only).
- **Recommendation:** a future plan investigating live-interop E2E flakiness (see the related, but distinct, documented `java-interop-cold-resolution-gotcha` warm-up pattern) should look at whether the SETOPTS-in-code describe's `beforeAll` needs to await `textDocument/didOpen` completion (e.g. a `bbj/documentChangeApplied`-style acknowledgement, or a poll for the fixture's document to appear server-side) before sending its first `textDocument/hover`/custom request.

---

**Total deviations:** 0 auto-fixed. 1 pre-existing condition documented (proven via base-run comparison, not caused by this plan, out of its file scope).
**Impact on plan:** None on correctness of the packaging/manifest changes themselves — every check that targets code this plan actually touches (packaging config, VSIX contents, generate, whole-suite regression, lint/typecheck/build, hygiene) passed cleanly. The two `<verify>` blocks whose literal "OK" line could not print both had their substantive regression check (comparison against base) pass.

## Issues Encountered
None beyond the documented pre-existing condition above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Packaging half of roadmap criterion 4 is done: `vscode:prepublish` builds only the shipped bundles, minified, `prepare` no longer runs the build pipeline, and the packaged VSIX installs with its minified server serving real requests. The bumped-version half is proven in plan 06's scratch packaging run (not part of this plan).
- Roadmap criterion 5 is done: unreachable scripts, the TextMate generator directive, and the contradictory activation entries are gone; `build`, `langium generate` and the whole suite pass.
- `bbj-ext-install`'s own header comment (outside this repository, `/usr/local/bin/bbj-ext-install`) still says "vscode:prepublish runs the minified esbuild bundle + lint automatically" — lint is no longer part of `vscode:prepublish` as of this plan (D-14 moved it to CI's `verify` jobs). Not fixed here (outside the repo, out of this plan's file scope) — flagged for whoever next touches that script.
- Plans 02-06 (workflow permissions/pins/caching/composite action/hygiene checker, and the version-bump scratch packaging run) are unblocked and can proceed against this tree.

---
*Phase: 122-release-ci-pipeline-hardening*
*Completed: 2026-09-29*
