---
phase: 123-documentation-drift
reviewed: 2026-09-30T14:50:04Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - .gitpod.yml
  - .vscode/launch.json
  - .vscode/tasks.json
  - CLAUDE.md
  - QA/FULL-TEST-CHECKLIST.md
  - QA/SMOKE-TEST-CHECKLIST.md
  - README.md
  - documentation/README.md
  - documentation/concepts/browser-editor.md
  - documentation/docs/intellij/commands.md
  - documentation/docs/intellij/composers.md
  - documentation/docs/intellij/configuration.md
  - documentation/docs/intellij/features.md
  - documentation/docs/intellij/index.md
  - documentation/docs/vscode/commands.md
  - documentation/docs/vscode/composers.md
  - documentation/docs/vscode/configuration.md
  - documentation/docs/vscode/features.md
  - documentation/docs/vscode/getting-started.md
  - documentation/docs/vscode/index.md
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 123: Code Review Report

**Reviewed:** 2026-09-30T14:50:04Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

This phase is a documentation-and-config drift fix (`.gitpod.yml`, `.vscode/launch.json`,
`.vscode/tasks.json`, `CLAUDE.md`, QA checklists, README.md, and the Docusaurus `documentation/`
tree for both VS Code and IntelliJ). I diffed every file against `8b53253d` and cross-checked the
specific, falsifiable claims in the new/changed text against the actual source: `package.json`
scripts and contribution points in `bbj-vscode/`, the IntelliJ `plugin.xml` and the Java action
classes behind commands/composers/EM-login, the `.github/workflows/deploy-docs.yml` +
`node-setup` composite action, `esbuild.mjs` output paths, `web.bbj`'s env-var and default-password
logic, and cross-file Markdown anchors between the new `composers.md` pages and `commands.md` /
`configuration.md`.

Every claim I could independently verify checked out: command titles, keyboard shortcuts, output
channel name (`BBj`, not `BBj Language Server`), VS Code engine version (`^1.101.0`), Node version
requirement, the `bbj.denumber` command's missing category, all new setting defaults
(`bbj.diagnostics.maxErrors: 20`, `bbj.compiler.trigger: debounced`,
`bbj.inlayHints.parameterNames.enabled: literals`, etc.), the EM login/re-prompt strings in
`BbjRunActionBase.java`, the `admin`-with-empty-password fallback in `web.bbj`, the
`[GUI] Launched <file>` log line and "BBj Language Server" tool-window name, the interop-host
trim/localhost-substitution behavior in both the language server's own settings validation and the
IntelliJ settings dialog, the `Compile output directory` placeholder text, and all Markdown anchor
targets referenced from the new `composers.md` pages. No leaked planning identifiers (plan numbers,
`D-xx`, `CR-xx`, "phase NN", milestone names) were found in any of the 20 files. No planning
identifiers found. No broken relative links were found among the changed pages.

One genuine internal contradiction survived the drift-fix pass in
`documentation/docs/vscode/configuration.md` (see WR-01) — the per-setting defaults for two
formatter options disagree with the "Complete Settings Example" a few dozen lines further down in
the very same file this phase edited. Two minor Info-level items are noted for completeness.

## Warnings

### WR-01: `bbj.formatter.indentWidth` / `keywordsToUppercase` defaults contradict the example block in the same file

**File:** `documentation/docs/vscode/configuration.md:272-306` vs `:359-361`
**Issue:** The per-setting sections state defaults of `2` (indentWidth) and `false`
(keywordsToUppercase), matching `bbj-vscode/package.json`'s actual `default` values (verified:
`"bbj.formatter.indentWidth"` → `default: 2`, `"bbj.formatter.keywordsToUppercase"` → `default:
false`). But the "Complete Settings Example" later in the same file (added/touched by this phase,
which added several other keys to that same JSON block) still shows
`"bbj.formatter.indentWidth": 4` and `"bbj.formatter.keywordsToUppercase": true` — i.e. the example
does not match either the documented defaults or the shipped extension defaults. This is exactly
the kind of doc/code drift this phase set out to fix, and it was touched (other keys inserted into
the same object) but not corrected.
**Fix:**
```diff
   "bbj.interop.host": "localhost",
   "bbj.interop.port": 5008,
-  "bbj.formatter.indentWidth": 4,
+  "bbj.formatter.indentWidth": 2,
   "bbj.formatter.removeLineContinuation": false,
-  "bbj.formatter.keywordsToUppercase": true,
+  "bbj.formatter.keywordsToUppercase": false,
   "bbj.formatter.splitSingleLineIF": false,
   "bbj.formatter.javaPath": ""
```

## Info

### IN-01: `.gitpod.yml` build step duplicates the new `preLaunchTask`

**File:** `.gitpod.yml:5`
**Issue:** The added `npm run build` in the Gitpod `init` task and the new `preLaunchTask:
"build bbj-vscode"` in `.vscode/launch.json` (which runs the same `npm run build`) both now build
`bbj-vscode` — once during workspace init, and again every time "Run Extension" is launched. Not
incorrect (esbuild's rebuild is fast and idempotent), but README.md's own new wording ("this first
runs the "build bbj-vscode" task") already guarantees a build before the debug session starts, so
the Gitpod-init build is redundant with the documented workflow. Not a bug, just worth confirming
this duplication is intentional (e.g. to fail fast on `npm install` in CI/init rather than at debug
launch time) rather than an oversight from editing both files in the same drift pass.
**Fix:** No change required if the redundancy is intentional; otherwise drop one of the two build
triggers and adjust README.md's Gitpod walkthrough accordingly.

### IN-02: Decompile commands documented as unreachable from any menu, but not cross-checked against the Explorer/editor-title-bar surfaces enumerated lower in the same page

**File:** `documentation/docs/vscode/commands.md:97-115`
**Issue:** The new "Decompile Commands" section states both decompile commands "are available from
the Command Palette only — they have no keybinding and appear in no context menu," which matches
`package.json`'s `menus` contributions (verified: `bbj.decompile` / `bbj.decompileReadonly` have no
`editor/context` or `explorer/context` entries and no `keybindings` entry). This is correct, but
the page's later "Editor Context Menu" and "Explorer Context Menu" subsections list only the five
run/build commands and don't explicitly restate that decompile is excluded, which could read as a
minor omission to a reader skimming just those subsections rather than the dedicated Decompile
section above. Purely a readability nit; the underlying facts as written are accurate.
**Fix:** Optional: add a one-line cross-reference in the "Editor Context Menu" subsection noting
decompile commands are Command-Palette-only (already stated earlier), for readers who jump directly
to that subsection.

---

_Reviewed: 2026-09-30T14:50:04Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
