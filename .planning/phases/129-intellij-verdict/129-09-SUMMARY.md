---
phase: 129-intellij-verdict
plan: 09
subsystem: intellij-release-gate
status: complete
verdict_served: supported
tags: [intellij, release-gate, plugin-zip, vsix, register-check, requirements]
requires:
  - phase: 129-05
    provides: "129-VERDICT.md: verdict supported, eol_character known-issue"
  - phase: 129-06
    provides: "LSP_FORMATTING_ENABLED = true, no range-only constant, bbj/openFormatterSettings handler"
  - phase: 129-07
    provides: "Formatter section on the BBj settings page; whole-suite baseline 1301"
  - phase: 129-08
    provides: "record that the disabled-outcome plan did not apply"
provides:
  - "final VSIX and plugin zip built from the final tree; zip main.cjs byte-identical to the fresh build"
  - "zip-versus-verdict proof: packaged switch ConstantValue int 1, no range constant, FormatterInitOptions and openFormatterSettings present"
  - "gate results: whole IntelliJ suite 1301/0/0, register, scope, allowlist and redaction checks clean"
  - "REQUIREMENTS.md: IJF-02, IJF-03, IJF-04 complete"
  - "hand-check list for the final zip"
affects: [130]
tech-stack:
  added: []
  patterns: []
key-files:
  created:
    - .planning/phases/129-intellij-verdict/129-09-SUMMARY.md
  modified:
    - .planning/REQUIREMENTS.md
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
decisions:
  - "IJF-04 marked Complete on the supported verdict (settings page in the final zip); IJF-02 and IJF-03 Complete"
metrics:
  duration: "about 9 min"
  completed: 2026-10-04
actuals:
  tokens: 4200
  tasks: 3
  commits: 3
---

# Phase 129 Plan 09: Final gate for the IntelliJ verdict Summary

Both distributables are rebuilt from the final tree. The plugin zip users install ships what the user decided:
LSP formatting on (`ConstantValue: int 1`), no range-only constant, the `FormatterInitOptions` seam and the
`openFormatterSettings` handler. The whole IntelliJ suite passes (1301 tests, 0 failures, 0 errors). The register,
scope, allowlist and redaction checks are clean. IJF-02, IJF-03 and IJF-04 are marked complete.

## Task 1: final builds and the zip-versus-verdict check

Precondition: `git diff --quiet HEAD -- bbj-intellij bbj-vscode` succeeded (no uncommitted source change, no leftover
evaluation flip), and `129-VERDICT.md` exists. Run start: 2026-10-04T15:22:43Z. The comment fix (see Deviations) was
committed before the builds, so the builds include it.

1. `npm --prefix …/bbj-vscode run build`: exit 0, no `error TS`, no esbuild error. Node is v24.20.0 in this shell;
   `build` is `tsc -b && node ./esbuild.mjs` and does not run `langium generate`, so Node 24 is not a problem here.
2. `bbj-ext-install`: exit 0, `DONE  Packaged: /tmp/bbj-lang.vsix (34 files, 672.02 KB)`, then
   `Extension 'bbj-lang.vsix' was successfully installed.` and `Extension installed — reload the 'VS Code (ext test)'
   browser tab to pick it up.`
3. `./gradlew buildPlugin --offline --console=plain`: exit 0, `BUILD SUCCESSFUL in 2s`; `verifyLanguageServerBundle`
   and `buildPlugin` ran. `test` was UP-TO-DATE: the only source change was a comment, so the compiled classes did not
   change. The whole suite ran separately in Task 2. The zip's modification time is 15:23:17, after the run started,
   so a `clean buildPlugin` was not needed.
4. Zip-versus-verdict check: exit 0 for verdict `supported`.

**VSIX:** `/tmp/bbj-lang.vsix`, 688153 bytes, sha256
`ea1784b23a6a4aff6a74535dd85071d130e5295abdca33b948d7696b7d5473ab`. It is installed in the test code-server.

**Plugin zip:** `/home/coder/repos/bbj-language-server/bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`,
1050726 bytes, sha256 `2a69a53c6f377056a887e9b84e6b8804dea170c77e96f72a6e0588927c704e7f`.

`unzip -l` lines under `lib/`:

```
        0  1980-02-01 00:00   bbj-intellij/lib/
     1298  1980-02-01 00:00   bbj-intellij/lib/bbj-intellij-0.1.0-searchableOptions.jar
   810129  1980-02-01 00:00   bbj-intellij/lib/bbj-intellij-0.1.0.jar
        0  1980-02-01 00:00   bbj-intellij/lib/language-server/
  1291897  1980-02-01 00:00   bbj-intellij/lib/language-server/main.cjs
        0  1980-02-01 00:00   bbj-intellij/lib/textmate/
        0  1980-02-01 00:00   bbj-intellij/lib/textmate/bbj-bundle/
     1855  1980-02-01 00:00   bbj-intellij/lib/textmate/bbj-bundle/bbj-language-configuration.json
     1323  1980-02-01 00:00   bbj-intellij/lib/textmate/bbj-bundle/bbx-language-configuration.json
      720  1980-02-01 00:00   bbj-intellij/lib/textmate/bbj-bundle/package.json
        0  1980-02-01 00:00   bbj-intellij/lib/textmate/bbj-bundle/syntaxes/
     4049  1980-02-01 00:00   bbj-intellij/lib/textmate/bbj-bundle/syntaxes/bbj.tmLanguage.json
     4813  1980-02-01 00:00   bbj-intellij/lib/textmate/bbj-bundle/syntaxes/bbx.tmLanguage.json
        0  1980-02-01 00:00   bbj-intellij/lib/tools/
     2005  1980-02-01 00:00   bbj-intellij/lib/tools/em-login.bbj
     1218  1980-02-01 00:00   bbj-intellij/lib/tools/em-validate-token.bbj
     5484  1980-02-01 00:00   bbj-intellij/lib/tools/web.bbj
```

**cmp:** `unzip -p … main.cjs | cmp - bbj-vscode/out/language/main.cjs` printed nothing and exited 0. The bundled
language server is byte-identical to the fresh build (1291897 bytes).

**Verdict:** `supported` (from `129-VERDICT.md`).

**javap** on `com.basis.bbj.intellij.lsp.BbjLanguageServerFactory` inside the packaged `bbj-intellij-0.1.0.jar`:

```
  private static final boolean LSP_FORMATTING_ENABLED;
    descriptor: Z
    flags: (0x001a) ACC_PRIVATE, ACC_STATIC, ACC_FINAL
    ConstantValue: int 1
```

`LSP_RANGE_FORMATTING_ENABLED` appears 0 times, as the supported verdict requires.

**Seam and handler in the jar:** `com/basis/bbj/intellij/lsp/FormatterInitOptions.class` and
`FormatterInitOptions$Values.class` are present (with `FormatterSettingTexts.class` and
`FormatterSettingTexts$Choice.class`). `javap -p BbjLanguageClient` lists
`public void openFormatterSettings(java.lang.Object);`.

**Tracer gate:** all four verify commands passed end to end, so Task 2 went ahead.

## Task 2: suite, register, scope and redaction checks; requirements

| Check | Result |
|-------|--------|
| `./gradlew cleanTest test --offline` | exit 0, `BUILD SUCCESSFUL`, no FAILED line |
| Test tally over `TEST-*.xml` | **tests=1301 failures=0 errors=0** (skipped 0, 148 suites), above the 1263 floor and equal to the 129-07 baseline |
| Register check (added lines under `bbj-intellij/src` since base `e4cd8c4e`) | no line printed, exit 0 |
| Scope check (paths outside `bbj-intellij/` and `.planning/` since base) | none; no `bbj-vscode` change in the phase |
| `Lsp4ijImportAllowlistTest.java` since base | unchanged |
| `git ls-files -- tmp` | empty |
| Windows home path in the phase documents (`C:\Users\<name>`) | none |
| REQUIREMENTS.md check | exit 0 |

The first `cleanTest test` finished in 4 s. To rule out a build-cache restore, it was re-run with
`--no-build-cache`: the same result, 1301/0/0, and all 148 XML files were rewritten at 15:23:52, during that run. The
suite really executed. The run left no vitest process (`pgrep -af vitest` matched only its own shell).

Phase base: `e4cd8c4e docs(129): create phase plan`. The phase changed 16 paths under `bbj-intellij/`; everything
else is under `.planning/`.

The untracked `com/` directory at the repository root (it contains `com/intellij`) is not tracked and is not part of
the phase diff, so the scope check does not flag it. It was left alone, as were `.planning/config.json` (modified),
`.planning/milestone.lock` and the pending todo `2026-10-04-nested-java-classes-from-bbj-ls.md`.

**REQUIREMENTS.md** (commit c96859c6):

- IJF-02, IJF-03 and IJF-04 are ticked `- [x]`.
- Their traceability rows read `| Phase 129 | Complete |`. The IJF-04 row's old "Pending (only on a supported
  verdict…)" text is replaced by `Complete`.
- The Last updated line reads 2026-10-04.
- No other line changed (`git diff HEAD~1` shows only those seven lines).

## Hand check (Task 3)

Run this in the user's IntelliJ with LSP4IJ, against a live BBj 26.03 BBjServices, after installing the final zip.

**Zip:** `/home/coder/repos/bbj-language-server/bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`,
sha256 `2a69a53c6f377056a887e9b84e6b8804dea170c77e96f72a6e0588927c704e7f`.

**Verdict:** `supported`, so the supported list applies. Step 5 (supported-no-range) does not apply.

**Setup:**

1. Settings | Plugins | gear icon | Install Plugin from Disk. Pick the zip, then restart the IDE.
2. In the Language Servers tool window, set the BBj server's trace to verbose. Step 3 needs the LSP trace.
3. Open a BBj project and a stripped BBj program (no leading indentation, no line numbers).

**Steps:**

1. **The Formatter section.** Open Settings | Languages & Frameworks | BBj. A "Formatter" section sits directly after
   "BBj Compiler". It has 15 controls, in this order: Indent width, Indent character, Indent label blocks, Keywords
   in upper case, IF closing keyword, IF keyword case, Split single-line IF, Remove line continuation, Move in-line
   comments to their own line, Move label comments to their own line, Collapse blank lines, Blank line after RETURN,
   Parameter layout, Operator spacing, Line ending.
   - Hover each control: each one has a tooltip. The combos list one `VALUE: description` line per value.
   - Below the controls is the restart note ("These settings apply after the language server restarts. Apply
     restarts it automatically. In IntelliJ, Line ending CRLF stops formatting entirely: …") and the line "To format
     on save, turn on Reformat code under Settings | Tools | Actions on Save."
   - **Layout, not yet seen in a running IDE:** the note and the hint wrap inside the page width and do not widen
     the page. The Indent width spinner has a sensible width. Report a screenshot if not.
2. **Apply restarts the server.** Set Indent width to 4 and turn on Keywords in upper case, then click Apply. In
   idea.log, find the `#com.basis.bbj.intellij.ui.BbjServerService - BBj language server status:` lines that appear
   after the Apply.
   - Pass: the last of these lines reads `starting -> started`, and its timestamp comes after the Apply.
   - Paste every status line from the Apply onward, as logged. Do not expect a particular sequence before
     `starting -> started`: the evaluation logged only startup sequences (`stopped -> starting`,
     `starting -> started`), never a restart triggered by Apply.
3. **Reformat Code follows the changed settings.** Run Code | Reformat Code on the BBj file.
   - The file gets four-space indentation per level and upper-case keywords (e.g. `METHODRET`, `PRINT`).
   - In the LSP trace, the latest `initialize` request carries `"indentWidth":4` and `"keywordsToUppercase":true`
     inside `initializationOptions.formatter`.
   - One `textDocument/formatting` request follows, answered with an edit.
   - Paste the `initialize` line (capabilities may be elided) and the formatting request line.
4. **Not marked modified.** Close Settings, then reopen Settings | Languages & Frameworks | BBj.
   - The page is not marked modified: Apply is disabled and the page has no modified marker.
   - Indent width shows 4 and Keywords in upper case is on.
5. *(supported-no-range only. Does not apply to this verdict.)*

**Report:** pass, or the numbers of the failed steps with the matching idea.log lines.

**Not to report as failures (known issues from 129-VERDICT.md):**

- With Line ending set to CRLF, formatting does nothing (`Wrong line separators` in idea.log; lsp4ij #381).
- One empty `didChange` follows a formatting answer that has no edits.
- With Actions on Save on, the file is saved twice.

## Deviations from Plan

1. **[Rule 1 - register check] Planning id removed from `BbjSettingsComponent.java`** (commit 9336b5da,
   `fix(129-09): …`).
   - **Found during:** pre-build register check, as the orchestrator asked.
   - **Issue:** the class Javadoc said `lookup (D-12)`, and the section comment `// --- Debounced background lookups
     (D-12) ---` carried the same id. The orchestrator named only the Javadoc hit; a grep found both. Both came from
     91e0d7b8 (`feat(79-02)`), long before this phase. Because they are context lines, not added lines, the phase's
     register check did not flag them.
   - **Fix:** removed ` (D-12)` from both comments. No code changed. The plan rule says to fix an identifier in the
     plan that added it, but that plan is in phase 79, so the fix is recorded here.
   - **Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java`
2. **[Rule 3 - verification] Re-ran the suite with `--no-build-cache`.** The first `cleanTest test` took 4 s. The
   uncached re-run confirmed that the tests ran and gave the same 1301/0/0.
3. **[Orchestrator request] ROADMAP.md bookkeeping.** 129-08 (not applicable) was not reflected in ROADMAP.md's
   phase-129 progress. This was brought in line during close-out (see the close-out commit).

## Known Stubs

None.

## Threat Flags

None. No new network endpoint, auth path or file access. The plan changed only a comment and planning files.
