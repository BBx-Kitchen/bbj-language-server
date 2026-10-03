---
phase: 127-vs-code-cut-over
plan: 06
subsystem: testing
tags: [vsix, live-interop, gates, intellij, hand-check, cut-over]

requires:
  - phase: 127-vs-code-cut-over
    provides: "the VS Code cut-over to bbj/format and bbj/denum, the removed formatter jar, the typed formatter settings, the plain-text decompile refusal (plans 01-05)"
provides:
  - "VSIX built from the final tree and installed in the test VS Code, with its file list"
  - "live format and DENUM results against the BBjServices on :5008"
  - "gate results for the final tree"
  - "IntelliJ plugin zip path and the hand-check record (16 of 17 passed; step 15 routed to backlog 999.1)"
affects: [verification]

actuals:
  tokens: 5200
  tasks: 3
  commits: 1

key-files:
  created: []
  modified: []

key-decisions:
  - "No source file changed; every gate reported zero failed tests, so nothing was fixed in an earlier plan"
  - "Hand-check step 15 (decompile of a tokenized program) failed; not a phase regression, routed by the user to backlog 999.1 for separate planning"

requirements-completed: [CUT-02, CUT-03]

status: complete
completed: 2026-10-03
---

# Phase 127 Plan 06: VSIX, live proof and gates Summary

**Tasks 1 and 2 are done: the VSIX built from the final tree (no jar, no `tools/formatter`) is installed in the test VS Code, the live peer formats and denumbers, and every CI gate passes with zero failed tests. The user's hand check passed 16 of 17 steps; step 15 (in-place decompile of a tokenized program, pre-existing) is routed to backlog 999.1.**

Status: complete. CUT-02 and CUT-03 are met: format and DENUM work end to end from the installed VSIX against live BBj 26.03.

## Performance

- **Started:** 2026-10-03T10:43Z (approximate)
- **Tasks 1 and 2 finished:** 2026-10-03T10:48Z
- **Tasks:** 3 of 3 executed (Task 3 by the user)
- **Files modified:** 0 source files (this SUMMARY only)
- **Packaged root:** `/home/coder/repos/bbj-language-server/bbj-vscode` (the main working tree on branch `gsd/v4.9-bbj-ls-denum-format`, HEAD `f7fedae8`; no worktree, so `BBJ_LS_SRC` was not set)

## Task 1: VSIX, live peer, IntelliJ zip

Preconditions held: BBjServices listening on 127.0.0.1:5008, the test code-server on 127.0.0.1:13338, `/usr/local/bin/bbj-ext-install` present.

### VSIX

`bbj-ext-install` exited 0 (vsce package with `vscode:prepublish`, then `code-server-test --install-extension ... --force`), ended with `Extension installed - reload the 'VS Code (ext test)' browser tab to pick it up.` and printed `Extension 'bbj-lang.vsix' was successfully installed.`

- Package: `/tmp/bbj-lang.vsix`, 34 files, 671.98 KB per vsce (688106 bytes on disk; 2629884 bytes unpacked).
- `unzip -l` lines for `extension/tools/` and `extension/out/`:

```
     2005  2026-09-03 15:31   extension/tools/em-login.bbj
     1218  2026-09-03 15:31   extension/tools/em-validate-token.bbj
     5484  2026-09-30 05:55   extension/tools/web.bbj
  1100415  2026-10-03 10:43   extension/out/extension.cjs
  1291724  2026-10-03 10:43   extension/out/language/main.cjs
```

- Forbidden-path check: `grep -E 'tools/formatter|\.jar$'` over the list printed nothing (exit 1). All five required files present: `extension/tools/web.bbj`, `em-login.bbj`, `em-validate-token.bbj`, `extension/out/extension.cjs`, `extension/out/language/main.cjs`. `tools/` holds exactly three files, both bundles are dated 2026-10-03 10:43.

### Live companion test

`RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts --disable-console-intercept`: exit 0, **1 file passed, 17 tests passed, 0 failed, 0 skipped**. The peer answered; nothing was skipped. Every `program-live:` line:

```
program-live: idle small denum (client) median=45ms runs=[45, 46, 44]
program-live: idle large parse (client) median=225ms runs=[219, 225, 241]
program-live: (a) small denum behind a pending parse, same raw connection median=202ms runs=[211, 202, 197]
program-live: (b) small denum behind a pending parse, dedicated lane median=5ms runs=[6, 5, 3]
program-live: (c) idle small parse median=85ms runs=[82, 87, 85]
program-live: (c) small parse while a large denum runs median=43ms runs=[42, 45, 43]
program-live: cancel honoured=yes code=-32800 ms=2
program-live: client cancel outcome=cancelled ms=0
program-live: format service first edits=1 second edits=0
program-live: mixed-numbered file without denumber permission kind=failed failure=denum-needed
program-live: first format on a fresh program connection median=13ms runs=[10, 13, 16]
program-live: denumber numbered status=denumbered reason=none
program-live: denumber unnumbered status=not-line-numbered reason=none
program-live: denumber mixed status=failed reason=mixed-numbering line=1
program-live: denumber tokenized status=failed reason=tokenized
program-live: denumber syntax error status=denumbered diagnostics=[{"line":1,"originalLineNumber":"0010","severity":"ERROR","message":"syntax error"}]
program-live: denumber and format status=denumbered reason=none calls=1
program-live: offer edits=0 offers=1
```

These exercise the server-side services (the language server's own `bbj/format` and `bbj/denum` over the real peer). The VS Code client side (Denumber command, prompts, settings, Decompile) rests on the hand check in Task 3.

### IntelliJ plugin zip

`./gradlew buildPlugin` in `bbj-intellij`: `BUILD SUCCESSFUL` (buildPlugin reported UP-TO-DATE; the zip's `bbj-intellij/lib/language-server/main.cjs` was compared with `cmp` against the `bbj-vscode/out/language/main.cjs` that the VSIX packaged and is byte-identical, 1291724 bytes).

- Plugin zip: `/home/coder/repos/bbj-language-server/bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` (1017752 bytes). The same directory also holds an older `bbj-lang.vsix`, a leftover, not the one installed (the installed VSIX is `/tmp/bbj-lang.vsix`).

### Task 1 acceptance

| Criterion | Result |
|-----------|--------|
| bbj-ext-install, "Extension installed" line | PASS |
| VSIX list: no jar, no `tools/formatter`, five required files | PASS |
| live test exit 0, no failed | PASS (17 of 17) |
| `buildPlugin` BUILD SUCCESSFUL | PASS |
| one plugin zip listed | PASS (`bbj-intellij-0.1.0.zip`) |
| `git status --porcelain -- bbj-vscode/src bbj-vscode/test bbj-intellij/src` empty | PASS |

## Task 2: gates on the final tree

| Gate | Command | Result |
|------|---------|--------|
| Whole vitest suite | `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` | Test Files: 1 failed, 193 passed, 5 skipped (199). Tests: **4390 passed, 0 failed**, 70 skipped (4460). The one failed file is `test/functional/installed-extension-e2e.test.ts` (15 of its 34 tests skipped, 19 passed): suite-level error `No document found for URI: file:///home/coder/repos/bbj-language-server/examples/issue475-setopts-in-code.bbj`. Exit 1 comes from that suite only. See the note below. |
| Lint | `npm run lint` (`eslint src test tools/interop-test-harness --max-warnings 0`) | exit 0, no problem reported |
| Typecheck | `npm run typecheck:test` | exit 0, no `error TS` line |
| Build | `npm run build` | exit 0 (`tsc -b` and esbuild) |
| IntelliJ | `./gradlew cleanTest test` in `bbj-intellij` | `BUILD SUCCESSFUL`; fresh XML reports (written 10:47:55): 1165 tests, 0 failures, 0 errors, 0 skipped; `ComposerRequestContractTest` 4 tests, 0 failures |
| Workflow secrets | `check-workflow-secrets.mjs` | `Scanned 7 file(s), 39 run block(s), 0 findings.` |
| Gradle wrapper | `check-gradle-wrapper.mjs` | `1 wrapper(s), 6 workflow file(s), 5 Gradle job(s), 0 findings.` |
| Action pins | `check-action-pins-and-permissions.mjs` | `Scanned 7 file(s), 64 uses reference(s), 6 workflow(s), 0 findings.` |
| Register check | diff from the commit that added the phase plans (`fbe7e07d`) to HEAD over `bbj-vscode/src` and `bbj-vscode/test`, grep of added lines for D-NN / SET-NN / DEN-NN / CUT-NN / "plan N" / "phase 1NN" / CR-NN / WR-NN | printed nothing (grep exit 1) |
| Leftover processes | `pgrep -af vitest` after the whole suite | printed nothing |
| Source untouched | `git status --porcelain -- bbj-vscode/src bbj-vscode/test bbj-intellij/src` | printed nothing |

### installed-extension-e2e: needs the user's eye

The plan treats this file as the one known environment failure, and the task prompt expected it to pass once the fresh VSIX was installed. It did not: it fails the same way with the new bundle installed, both in the whole suite and when run alone (19 passed, 15 skipped, the same suite-level error, no failed test).

Evidence that it is not caused by this phase:

- The file spawns only the installed `out/language/main.cjs` over IPC and talks to the language server; it never loads `extension.cjs`.
- `git diff fbe7e07d HEAD -- bbj-vscode/src/language` is empty: phase 127 changed no language-server source, so the server under test is the same code as on the phase base commit. A base-commit run would execute identical server code, so a scratch-worktree build was not run.
- The identical error text, file and fixture were recorded as the failing suite at the end of phase 126 (see `126-05-SUMMARY.md`), before any phase 127 change; the 2026-10-01 whole-suite baseline names the same single suite.
- Zero failed tests; the error surfaces as an unhandled rejection attributed to the suite.

This is recorded as an unchanged pre-existing failure, not as a gate pass. The orchestrator may want to decide whether the plan's "after the install it runs this tree" expectation still holds.

## Task 3: hand check

Checkpoint `human-verify`, blocking. The 17 steps are in `127-06-PLAN.md`. The user ran them on 2026-10-03 from the installed VSIX (reloaded "VS Code (ext test)" tab, BBjServices with bbj-ls on :5008) and the IntelliJ zip `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`.

| Steps | Outcome |
|-------|---------|
| 1-4 Settings (typed controls, splitSingleLineIF migration, leftover javaPath, live setting changes) | passed |
| 5-6 Format (Document, Selection, on save, numbered-file offer and selection refusal) | passed |
| 7-14 Denumber (prompt, Alt+N, title icon, context menu, Explorer, Denumber and Format, refusals, config.bbx, Open Read-only) | passed |
| 15 Decompile of a tokenized program from the open prompt | **failed** — see below |
| 16 Decompile commands on a plain-text file refuse with the "not a tokenized BBj program" message | passed |
| 17 IntelliJ smoke | passed |

### Step 15 failure: routed to backlog 999.1

The user reported: opening a binary (tokenized) program, with or without line numbers, does not work safely — it fails to upgrade the binary to source text in place. The user asked for this to be revisited as a separate, properly planned effort.

It is not a phase 127 regression. For a tokenized input, `decompileReplace` runs bbjlst with the same argv as on the phase base `fbe7e07d` (`-l <file>`, `-xlst` added for `.lst`; previously reached via `denumber: true`), and the `.lst` → original rename is the same; phase 127 only added the plain-text refusal in front of it and removed the bbjlst Denumber path. Routed to ROADMAP backlog item **Phase 999.1: Safe in-place decompile of tokenized BBj programs**. CUT-02 and CUT-03 (format and DENUM end to end) are unaffected.

## Deviations from Plan

None - Tasks 1 and 2 executed as written. The commit trailer follows the task prompt (`Claude Opus 5.5`).

## Issues Encountered

- `installed-extension-e2e.test.ts` still fails after the install (see above); unchanged pre-existing failure with zero failed tests.
- `npm run build` ran after the VSIX was packaged, so `bbj-vscode/out/` now holds the unminified bundles; the installed VSIX and the IntelliJ zip carry the minified ones built at 10:43. Both come from the same source.

## Known Stubs

None.

## Threat Flags

None - the plan adds no source.

## Self-Check

- VSIX list, live lines, zip path, gate numbers: each taken from the command output in this session.
- `/tmp/bbj-lang.vsix`: FOUND. `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`: FOUND.
- Source and test trees: no change (`git status --porcelain` empty for `bbj-vscode/src`, `bbj-vscode/test`, `bbj-intellij/src`).
- Self-check result: PASSED. Task 3: 16 of 17 steps passed; step 15 routed to backlog 999.1.

---
*Phase: 127-vs-code-cut-over*
*Completed: 2026-10-03*
