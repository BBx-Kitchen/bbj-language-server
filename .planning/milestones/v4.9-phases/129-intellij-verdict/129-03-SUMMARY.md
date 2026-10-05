---
phase: 129-intellij-verdict
plan: 03
subsystem: intellij
tags: [intellij, lsp4ij, formatting, evaluation, runIde, xvfb, performanceTesting, wire-capture]

requires:
  - phase: 129-intellij-verdict
    provides: interopHost/interopPort wire keys (plan 01) and the formatter initializationOptions seam (plan 02)
provides:
  - 129-EVALUATION.md with setup, driver route, rows C1, C2a, C2b, C7a, C7b, C7c recorded from real sessions and skeleton rows for the rest
  - 129-WINDOWS-CHECKLIST.md for the same evaluation zip (sha256 ae214de3...)
  - a working script driver (Xvfb + runIde + performanceTesting) and wire capture, kept under the git-excluded tmp/129-eval/
affects: [129-04, 129-05, 129-09]

actuals:
  tokens: 10100
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "runIde under xvfb-run driven by the IDE's bundled performanceTesting script plugin (-Dtestscript.filename), no key injection"
    - "A bash wrapper as the plugin's Node.js path copies the language server's stdin and stdout for a request/response trace"

key-files:
  created:
    - .planning/phases/129-intellij-verdict/129-EVALUATION.md
    - .planning/phases/129-intellij-verdict/129-WINDOWS-CHECKLIST.md
  modified: []

key-decisions:
  - "Route 1 (performanceTesting script) passed its spike on the first run, so driver is script and the Robot route was not needed"
  - "The wire capture through a node wrapper is the request/response trace for Linux rows; the LSP4IJ console was not readable without a display"
  - "Every case opens a corpus file name the IDE has never seen and runs a Synchronize action first, because the IDE's file system cache serves stale or missing files"

requirements-completed: []

duration: 20min
completed: 2026-10-04
status: complete
---

# Phase 129 Plan 03: Linux evaluation setup and first formatting cases Summary

**The evaluation build (switch on, local flip) formats real BBj files in a running IntelliJ 2024.2 against live BBjServices, driven by a script under Xvfb, and six rows (Reformat Code, two selections, one undo step, idempotency, already-formatted) are recorded from real wire captures and idea.log lines; all six pass.**

## Accomplishments

- Both distributables built from the committed tree before the evaluation: VSIX through `bbj-ext-install` ("Extension 'bbj-lang.vsix' was successfully installed."), plugin zip through `./gradlew cleanTest buildPlugin --offline` (tests=1286 failures=0 errors=0). The committed zip's `main.cjs` is byte-identical to `bbj-vscode/out/language/main.cjs` and its switch compiles to `ConstantValue: int 0`.
- Evaluation zip (committed tree plus one local line setting `LSP_FORMATTING_ENABLED = true`): sha256 `ae214de390169bc955c05ce0c53075e644bbe242e7986c86c070e2721ef69626`, 1044094 bytes, `main.cjs` identical, `ConstantValue: int 1`, carries `FormatterInitOptions`. The committed zip is 1044049 bytes, sha256 `8caf96f0d694f6ab017b89c98afd2fdaa69f5ecc45514c6611bae2df4af3167b`. Both are under `tmp/129-eval/`.
- Driver spike: route 1 passed. `xvfb-run` around `runIde` with `-Dtestscript.filename` ran `%openFile`, `%waitForSmart`, `%executeEditorAction ReformatCode`, `%takeScreenshot` and exit; the real editor action formatted the file. The sandbox plugin jar is byte-identical to the evaluation zip's jar.
- C1 (Reformat Code): one `textDocument/formatting` request (id 12), one edit over lines 5 to 62, indented with `indentWidth` 2; the `initialize` request on the wire carries `interopHost`, `interopPort` and a `formatter` object with 15 keys, proving plans 01 and 02 end to end. Both formatting capabilities are advertised by the server.
- C2a (selection in a block) sends `textDocument/rangeFormatting`; the response is one whole-line edit, applied; lines outside the selection unchanged. C2b (selection inside a continued statement) gets a response range wider than the selection (the whole continuation line), applied with no `Overlapping edit` in idea.log. C7a: formatting is one document change and one Undo is one document change, the saved file equals the original byte for byte. C7b: the second Reformat Code is answered with `[]`. C7c: an already formatted file gets `[]` and keeps its modification time.
- `129-WINDOWS-CHECKLIST.md` for the user's Windows IntelliJ: how to verify the zip with `Get-FileHash` against the sha256, set the trace to verbose, the four cases W1 to W4, and the files to return (`idea.log`, `lsp-trace.txt`, `notes.txt`, `ide-build.txt`). A heading "Extra steps from the Linux run" is left for the next plan.
- Skeleton rows (`not run`, Observed `pending`) for C3a, C3b, C4a, C4b, C5, C6a, C6b, C6c, V1 to V6 (code-verified, test titles checked to exist) and W1 to W4; the corpus (`numbered.bbj`, `crlf.bbj`, two `eolCharacter` copies, `config.bbx` copy) is in `/home/coder/tinybbj` with sha256 recorded.

## Task Commits

1. **Task 1: Reformat Code end to end from the evaluation build, with real log and wire evidence** - `f09075e8` (docs)
2. **Task 2: Reformat selection and edit application recorded from real sessions** - `9479e4cf` (docs)
3. **Task 3: The Windows checklist and the rest of the corpus, every remaining row pending** - `b4258ce8` (docs)

## The evaluation flip is still in the working tree

`bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` is modified and uncommitted for the next plan to restore. Its diff is one line:

```diff
-    private static final boolean LSP_FORMATTING_ENABLED = false;
+    private static final boolean LSP_FORMATTING_ENABLED = true;
```

`git diff --numstat HEAD -- bbj-intellij bbj-vscode` shows exactly `1 1` for that file and HEAD still declares `false` (both checked after the last commit). It was never staged. Besides it, `.planning/config.json`, `.planning/milestone.lock` and `com/` were already dirty or untracked at the start and were left alone. The seeded `config_runIde/options/BbjSettings.xml` (wrapper as Node.js path) is in the git-ignored sandbox and still needs removing by the next plan.

## Final init-script JVM arguments

`-Dtestscript.filename=<BBJ_EVAL_SCRIPT>`, `-Didea.trust.all.projects=true`, `-Dide.show.tips.on.startup.default.value=false`, `-Djb.privacy.policy.text=<!--999.999-->`, `-Djb.consents.confirmation.enabled=false`, `-Dide.no.platform.update=true`, `-Dnosplash=true`, `-DjbScreenMenuBar.enabled=false`. No modal dialog blocked startup.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The runIde sandbox uses suffixed folders**
- **Found during:** Task 1 (driver spike)
- **Issue:** The plan's `SANDBOX` paths (`config`, `log`, `plugins`) are not what `runIde` uses; IPGP 2.19 uses `config_runIde`, `log_runIde`, `plugins_runIde`, `system_runIde`. The first seed went into `config/options` and was ignored.
- **Fix:** seeded `config_runIde/options/BbjSettings.xml`, read `log_runIde/idea.log`, compared `plugins_runIde/bbj-intellij/lib/bbj-intellij-0.1.0.jar` for the sandbox-equivalence check. The sandbox plugin folder holds only the jar, so the server is the jar's embedded copy (byte-identical).
- **Files modified:** none tracked (documented in 129-EVALUATION.md Setup)

**2. [Rule 3 - Blocking] runIde cannot run offline**
- **Found during:** Task 1
- **Issue:** `--offline` failed with "No cached version available for offline mode" for `hot-reload-agent-1.1.0-alpha03`.
- **Fix:** `runIde` ran online; the builds stayed offline.

**3. [Rule 1 - Bug in own method] Stale IDE file-system cache in two forms**
- **Found during:** Task 1 (first C1 rerun) and Task 2 (C2b)
- **Issue:** a corpus file overwritten between sessions opens with the previous content (first Reformat answered `[]` on an already formatted buffer); a freshly created file was not found by `%openFile` even after `%reloadFiles`.
- **Fix:** one fresh file name per case plus the `Synchronize` editor action before `%openFile`; the unusable sessions are kept under `tmp/129-eval/linux/aside/` and not used as evidence.

**4. [Rule 3 - Blocking] `%selectText` takes 1-based arguments**
- **Found during:** Task 2 (C2a probe selected the wrong lines)
- **Fix:** C2a re-run with `%selectText 12 1 14 31`; the range is taken from the wire (11:0 to 13:30). The probe is kept in `aside/` and not used.

Other differences, not defects: the task ran `./gradlew cleanTest buildPlugin` after a plain `buildPlugin` reported the tests UP-TO-DATE, so the 1286-test count is fresh; commits carry `Co-Authored-By: Claude Sonnet 5.5` (the executing model's own trailer, as in plan 02) rather than the Opus trailer named in the plan; I once chained `cd` with `grep` in a shell call and once used `cd ... ;` before a `for` loop with absolute-path greps (neither prompted nor changed anything).

**Total deviations:** 4 auto-fixed (3 blocking, 1 own-method bug). **Impact:** none on the evidence; every excerpt is from a session run after the fix.

## Rows to carry forward

All Linux rows that could be driven in this plan are done. Left for 129-04: C3a, C3b (Actions on Save), C4a, C4b (numbered-file message), C5 (settings through the sandbox XML), C6a, C6b, C6c (CRLF), the code-verified rows V1 to V6, and the Windows rows W1 to W4 (the user runs the checklist).

## Known Stubs

None. The skeleton rows in the record say `not run` / `pending` on purpose and are listed above.

## Threat Flags

None beyond the plan's register. T-129-08 holds (the flip is unstaged and HEAD still says false), T-129-09 (corpus uses a copy of `examples/config.bbx`, nothing under `/opt/bbx/cfg` touched), T-129-10 (the wrapper seed is only in the sandbox config and the wrapper lives under `tmp/129-eval/`), T-129-11 (raw logs under git-excluded `tmp/`; the Linux user is `coder`), T-129-12 (every excerpt copied from the case's files; the long `newText` bodies are elided with `…` inside the line, the temp file number in the launch line is shown as `<n>`).

## Issues Encountered

None open. The IDE's own SEVERE lines (`GradleJvmSupportMatrix` ... `IllegalArgumentException: 25`, the IDE failing to read its Gradle state under the host JDK) appear in every session; none names a BBj or LSP4IJ class.

## Self-Check: PASSED

- FOUND: `.planning/phases/129-intellij-verdict/129-EVALUATION.md`, `.planning/phases/129-intellij-verdict/129-WINDOWS-CHECKLIST.md`, `tmp/129-eval/bbj-intellij-eval.zip`, `tmp/129-eval/bbj-intellij-committed.zip`
- FOUND commits `f09075e8`, `9479e4cf`, `b4258ce8` on `gsd/v4.9-bbj-ls-denum-format`
- Task 1 to 3 verify commands re-run green; only tracked source change is the one-line flip
- No sandbox IDE, Xvfb or wrapper process left running
