---
phase: 123-documentation-drift
plan: 08
subsystem: docs
tags: [build, qa, vscode, intellij, composers, claude-md, docusaurus, drift-scan]

requires:
  - phase: 123-documentation-drift
    provides: "123-01 through 123-07 SUMMARY.md files and the fixed documents they produced"
provides:
  - "Proof that the docs site builds via npm ci + npm run build under Node 22 with zero WARNING lines, and that the extension build task recreates out/extension.cjs"
  - "A 45-row cross-check table walking every DOC-DRIFT-2026-09-30.md item and every planning-time extra against the current documents"
  - "Confirmation sweeps: no old wrong string, no planning identifier in doc text, no out-of-scope file change since 8b53253d"
affects: []

actuals:
  tokens: 14000
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: []

key-decisions:
  - "All 45 drift-scan items and planning-time extras were already fixed by plans 123-01 through 123-07; this plan found no gap requiring a new doc edit."

requirements-completed: [BUILD-01, BUILD-02, BUILD-03, QA-01, QA-02, QA-03, VSC-01, VSC-02, VSC-03, VSC-04, VSC-05, VSC-06, IJ-01, IJ-02, COMP-01, DEV-01, DEV-02, DEV-03]

coverage:
  - id: D1
    description: "The docs site builds via npm ci + npm run build under Node 22 with zero WARNING lines, both Composers pages are built, and the bbj-vscode build task recreates out/extension.cjs from scratch"
    verification:
      - kind: other
        ref: "npx -p node@22 -p npm@10 npm ci / npm run build in documentation/, grep -c WARNING on the build log (0), test -f on both composers.html, rm+rebuild of bbj-vscode/out/extension.cjs"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every one of the 45 drift-scan items and planning-time extras has a recorded status (fixed or left on purpose) with file/heading evidence"
    verification:
      - kind: other
        ref: "grep -cE row-count check on 123-08-SUMMARY.md prints 45; settings two-way node check prints 'settings both ways ok'"
        status: pass
    human_judgment: false
  - id: D3
    description: "No old wrong string, no planning identifier on an added doc line, and no out-of-scope file change exists since commit 8b53253d"
    verification:
      - kind: other
        ref: "the five sweep grep/git-diff commands from Task 3's <verify> block all print nothing and exit non-zero (no match)"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-09-30
status: complete
---

# Phase 123 Plan 08: Drift Cross-Check and Final Sweeps Summary

**Every item of the 2026-09-30 drift scan and every planning-time extra was already fixed by plans 123-01 through 123-07; this plan proved the docs and extension build clean end to end, recorded a 45-row cross-check table with file evidence for each item, and swept the repository for old wrong strings, planning identifiers and out-of-scope changes — all clean.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-30T14:39:00Z (approx., following 123-07)
- **Completed:** 2026-09-30T14:44:00Z
- **Tasks:** 3
- **Files modified:** 1 (this SUMMARY.md; no other document required an edit)

## Drift scan cross-check

| Item | Scan text (short) | Status | Evidence |
|------|--------------------|--------|----------|
| 1.1 | README Building Locally only runs npm install | fixed | README.md "Building Locally" now gives per-folder steps (npm install + npm run build in bbj-vscode, ./gradlew build/run in java-interop, ./gradlew buildPlugin in bbj-intellij) — 123-01 |
| 1.2 | Gitpod init and Run Extension have no build | fixed | .gitpod.yml `init` runs `npm run build` right after `npm install`; `.vscode/tasks.json` "build bbj-vscode" is wired as `.vscode/launch.json`'s "Run Extension" `preLaunchTask` — 123-01 |
| 1.3 | README overview names only two of the three parts | fixed | README.md "Project Overview" lists bbj-vscode, java-interop and bbj-intellij — 123-01 |
| 1.4 | documentation/README uses the old package manager and a gh-pages deploy | fixed | documentation/README.md describes `npm ci`/`npm start`/`npm run build` and `.github/workflows/deploy-docs.yml`'s `actions/deploy-pages` flow; no yarn, no SSH/gh-pages text — 123-01 |
| 2.1 | QA EM rows expect credential settings | fixed | QA/FULL-TEST-CHECKLIST.md's Enterprise Manager rows test only `bbj.em.url` and the login prompt; no `bbj.em.host`/`port`/`username`/`password` string anywhere in either checklist — 123-02 |
| 2.2 | QA rows missing for the eight behaviours | fixed | QA/FULL-TEST-CHECKLIST.md rows 4-6 (remembered username, `web.bbj` username rule, token re-prompt) and rows 24-28/31/33 (assign-to validation both IDEs, formatter Java path, workspace configPath trust, interop host/port fallback, Java hover Docs link) — 123-02 |
| 2.3 | smoke run steps name a run submenu that does not exist | fixed | QA/SMOKE-TEST-CHECKLIST.md rows 7-8 name "Run As BBj Program" directly in each editor's context menu and IntelliJ's Project View "BBj Run" submenu — 123-02 |
| 3.1 | VS Code old minimum version | fixed | documentation/docs/vscode/index.md and getting-started.md state "VS Code 1.101.0 or higher" — 123-03 |
| 3.2 | bbj.configPath rules and Workspace Trust | fixed | documentation/docs/vscode/configuration.md's "Value rules" and "Workspace Trust" notes under `bbj.configPath` — 123-03 |
| 3.3 | "Workspace settings override user settings" | fixed | configuration.md's "Workspace Configuration" section now names the `bbj.formatter.javaPath` and untrusted-`configPath` exceptions instead of an unqualified claim — 123-03 |
| 3.4 | interop host/port fallback | fixed | configuration.md's "Invalid values" paragraph under `bbj.interop.port` describes the per-value default fallback and the `BBj` output channel warning — 123-03 |
| 3.5 | complete settings example | fixed | configuration.md's "Complete Settings Example" lists all 21 non-`bbj.compiler.*` settings; re-verified this plan against `package.json` (`settings both ways ok`) — 123-03 |
| 3.6 | six undocumented settings | fixed | configuration.md's "Opening Programs", "Diagnostics Settings" and "Inlay Hints" sections document `bbj.decompile.promptOnOpen`, `bbj.denumber.promptOnOpen`, `bbj.diagnostics.suppressCascading`, `bbj.diagnostics.maxErrors`, `bbj.compiler.trigger` and `bbj.inlayHints.parameterNames.enabled` — 123-03 |
| 3.7 | EM auth on the configuration page | fixed | configuration.md's "Enterprise Manager Authentication" section describes login, remembered username, automatic re-prompt and unusable-token rejection — 123-03 |
| 3.8 | bbj.formatter.javaPath section (scan: still accurate — confirm) | left on purpose | configuration.md's `bbj.formatter.javaPath` section is unchanged and still matches `formatter-java-resolver.ts`'s resolve/verify-before-spawn behaviour — confirmed this plan, no edit needed |
| 3.9 | composer commands and decompile commands undocumented, no composer page | fixed | commands.md's "Decompile Commands" section (123-03) and "Composer Commands" section linking to the new `documentation/docs/vscode/composers.md` page (123-06) |
| 3.10 | command titles | fixed | commands.md uses the real Command Palette titles ("Run As BBj Program", "Show the Active Config File", "Show Available Classpath Entries", etc.) throughout — 123-03 |
| 3.11 | Show the Active Config File location | fixed | commands.md's "Show the Active Config File" section describes the `bbj.configPath`/Workspace-Trust resolution and `{bbj.home}/cfg/config.bbx` fallback — 123-03 |
| 3.12 | the Java-on-PATH claim and compile's bbjcpl | fixed | commands.md's "Requirements" item 3 and "Compile Issues" section describe the formatter's Java resolution (`bbj.formatter.javaPath`, no PATH fallback on an invalid value) separately from compiling/running, which use BBj's own `bbjcpl`/`bbj` from `{bbj.home}/bin` — 123-03 |
| 3.13 | login username memory and auto re-prompt on the commands page | fixed | commands.md's "Login to Enterprise Manager" section cross-references configuration.md's remembered-username and automatic-re-prompt flow — 123-03 |
| 4.1 | IntelliJ composer actions, intentions and the "Assign result to" row | fixed | documentation/docs/intellij/composers.md documents all seven composer actions, five Alt+Enter intentions and an "Assign-to validation" section; commands.md's "Composer Actions" section links to it — 123-07 |
| 4.2 | IntelliJ token expiry -> automatic login and remembered username | fixed | documentation/docs/intellij/configuration.md's "EM Token Authentication" section and commands.md's "Login to Enterprise Manager" section describe the automatic re-prompt and remembered username — 123-04 |
| 4.3 | IntelliJ "BBj Compiler" section | fixed | documentation/docs/intellij/configuration.md's "## BBj Compiler" section (Compile output directory, Compiler check) — 123-04 |
| 4.4 | IntelliJ Host fallback | fixed | documentation/docs/intellij/configuration.md's "### Host" note: an empty field is substituted to `localhost` client-side, with no warning shown — 123-04 |
| 4.5 | IntelliJ Port auto-detect, Node.js 22, IntelliJ 2024.2+ (scan: still accurate — confirm) | left on purpose | documentation/docs/intellij/configuration.md's "### Port" section and index.md's Requirements ("IntelliJ IDEA 2024.2 or higher", "Node.js 22 or higher") are unchanged and confirmed accurate this plan |
| 5.1 | concepts page socket transport module | fixed | documentation/concepts/browser-editor.md's seam table and Phase-1 refactor list name `java-interop-connection.ts` (not `java-interop.ts`) — 123-05 |
| 6.1 | provider count and CodeLensProvider | fixed | CLAUDE.md's Completion section lists "eight further LSP feature providers" including `CodeLensProvider` (`BBjComposerCodeLensProvider`); re-verified this plan against `bbj-module.ts`'s 9-entry `lsp` group — 123-05 |
| 6.2 | validation modules | fixed | CLAUDE.md's Validation section lists `class-types.ts`, `check-cyclic-inheritance.ts`, `check-class-reference.ts`, `check-return-types.ts`, `check-constructor.ts` and `check-unknown-java-member.ts` alongside `check-classes.ts` — 123-05 |
| 6.3 | java-interop module split | fixed | CLAUDE.md's Java interop section describes `java-interop.ts` as a front over `java-interop-connection/-cache/-class-index/-classpath/-lock.ts` plus `java-peer-guard.ts` and `java-javadoc.ts` — 123-05 |
| 6.4 | JavadocProvider via DI | fixed | CLAUDE.md's DI Module Pattern lists `services.java.JavadocProvider — injected per services set; there is no static singleton` — 123-05 |
| 6.5 | Testing Pattern and createBBjTestServices | fixed | CLAUDE.md's Testing Pattern section makes `createBBjTestServices(EmptyFileSystem)` the default entry point for new tests — 123-05 |
| 6.6 | typecheck:test, PR gates, hygiene checkers | fixed | CLAUDE.md's Build & Test Commands lists `npm run typecheck:test`; the "CI gates" paragraph names `build.yml`'s gates and `workflow-hygiene.yml`'s three checker commands — 123-05 |
| 6.7 | CLAUDE.md items the scan marked still accurate (confirm) | left on purpose | the interop-harness line, npm install/build/watch/test, `test:bbj`, the IntelliJ fail-fast note, `test/test-helper.ts` and `example-files.test.ts` are all still present verbatim in the current CLAUDE.md — confirmed unchanged this plan |
| 7.1 | package.json settings missing from the docs | left on purpose | the 6 settings are now documented (see 3.6); the 20 `bbj.compiler.*` options (verified against `package.json`, not the 18 the scan said) stay covered only by the "Configure Compile Options" note in configuration.md on purpose |
| 7.2 | settings in the docs but not in package.json (confirm none) | left on purpose | the two-way node check against `package.json` and configuration.md prints "settings both ways ok" this plan — no doc-only setting exists |
| X1 | VS Code output channel is `BBj`, not "BBj Language Server" | fixed | getting-started.md and configuration.md consistently say 'Select "BBj" from the dropdown' — 123-03 |
| X2 | old command titles in VS Code configuration.md and features.md | fixed | features.md's Developer Commands tables and configuration.md use the real command titles — 123-03 |
| X3 | IntelliJ Compile BBj File has Alt+C and editor/Tools menu entries and no main-window button | fixed | documentation/docs/intellij/commands.md's "Compile BBj File" Access list names the editor context menu, Tools menu and `Alt+C`; no toolbar-button text remains in commands.md or features.md — 123-04 |
| X4 | IntelliJ empty Host becomes localhost with no warning (scan said a warning) | fixed | documentation/docs/intellij/configuration.md's "### Host" note says the plugin substitutes `localhost` before starting the language server, with no warning language — 123-04 |
| X5 | full checklist debug-run rows that name no real command, and a run example file that does not exist | fixed | both QA checklists use `examples/msgbox.bbj` and the real run commands; no "Run with Debug" or `examples/hello.bbj` remains anywhere — 123-02 |
| X6 | compile option count 20 vs 18 | left on purpose | same evidence as 7.1 — a node count against `package.json` confirms 20 `bbj.compiler.*` keys (excluding `bbj.compiler.trigger`) |
| X7 | BBjParserService missing from CLAUDE.md's DI list | fixed | CLAUDE.md's DI Module Pattern lists `services.compiler.BBjParserService — live parser diagnostics` — 123-05 |
| X8 | VS Code Configure Compile Options is a QuickPick and Open Enterprise Manager reads its URL from BBj.properties | fixed | commands.md's "Configure Compile Options" section describes the QuickPick, and "Open Enterprise Manager" describes the URL built from `com.basis.jetty.host`/`com.basis.jetty.port` in `{bbj.home}/cfg/BBj.properties` — 123-03 |
| X9 | IntelliJ config.bbx Path value rule | fixed | documentation/docs/intellij/configuration.md's "### config.bbx Path" Validation note (absolute path, leading `~` expanded, missing file flagged) — 123-04 |
| X10 | the VS Code extension does not run in Restricted Mode | fixed | documentation/docs/vscode/configuration.md's "Workspace Trust" note: "the extension does not run in Restricted Mode — VS Code never gates it there" — 123-03 |

## Sweeps

All five sweep commands from Task 3's `<verify>` block were run against the final tree and each
printed nothing (grep found no match, `git diff`/`git diff --name-only` found no offending line or
file):

1. **Old wrong strings, all documents** (`1.67`, `yarn`, `seven further`, `Run Interop Service`,
   `two main parts`, `bbj.em.(host|port|username|password)`, `EM host, port`, `Show config.bbx`,
   `Show Classpath Entries`, `Show BBj.properties`, `Run with Debug`, `Run BBj >`, `Java is
   available in PATH`, `examples/hello.bbj`, the two old re-authentication phrasings) across
   README.md, CLAUDE.md, both QA checklists, documentation/README.md, documentation/docs, and
   documentation/concepts — **clean**.
2. **Old wrong strings, VS Code guide only** (`Select "BBj Language Server"`, `(BBj Language
   Server)`) across `documentation/docs/vscode` — **clean**.
3. **Old wrong strings, IntelliJ commands/features only** (`toolbar`, case-insensitive) across
   `documentation/docs/intellij/commands.md` and `features.md` — **clean**.
4. **Planning identifiers on added doc lines since `8b53253d`** (plan/D-xx/CR-xx/WR-xx/requirement
   ids, `phase NN`, `v4.N`) across README.md, CLAUDE.md, QA, `.gitpod.yml`, `.vscode`,
   `documentation` — **clean**.
5. **Scope**: `git diff --name-only 8b53253d` lists exactly `.gitpod.yml`, `.vscode/launch.json`,
   `.vscode/tasks.json`, `README.md`, `CLAUDE.md`, both QA checklists, `documentation/README.md`,
   the ten `documentation/docs/{vscode,intellij}/*.md` files this phase touches,
   `documentation/concepts/browser-editor.md`, and files under `.planning/` — **no file outside the
   allowed set changed**.

No sweep found anything to fix — no doc edit was made in this plan beyond creating this SUMMARY.

## Task Commits

Task 1 (tracer) produced no commit: it only proved the build paths work (build outputs are
git-ignored, no source file changed). Task 2 created this SUMMARY.md but did not commit it
separately, per the plan's own instruction to finish and commit it in Task 3.

1. **Task 1 (tracer): docs and extension build clean end to end** — no commit (verification only;
   `npm ci`/`npm run build` in `documentation/` exited 0 with no `WARNING` line, both
   `composers.html` pages were built, and deleting then rebuilding `bbj-vscode/out/extension.cjs`
   via the "build bbj-vscode" npm script recreated it)
2. **Task 2: 45-row drift-scan cross-check table** — folded into the Task 3 commit below (SUMMARY.md
   content only, no separate commit)
3. **Task 3: old-string/planning-id/scope sweeps, all clean** — `docs(123): drift cross-check and
   final sweeps` (this commit)

## Files Created/Modified

- `.planning/phases/123-documentation-drift/123-08-SUMMARY.md` — this file (created)

No other document required a change: all 45 drift-scan items and planning-time extras were already
fixed by plans 123-01 through 123-07.

## Decisions Made

- All 45 drift-scan items and planning-time extras were confirmed already fixed by the prior seven
  plans; no new doc edit was needed in this plan.
- Confirmed programmatically (not just by re-reading prose) that the `bbj.compiler.*` intentionally
  undocumented settings number 20, not the 18 the scan said (items 7.1/X6), and that the settings
  documented in `configuration.md` match `package.json` exactly in both directions (item 7.2).

## Deviations from Plan

None - plan executed exactly as written. All three tasks' automated `<verify>` commands and
`<acceptance_criteria>` passed without needing any doc fix.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Every requirement this phase declared (`BUILD-01..03`, `QA-01..03`, `VSC-01..06`, `IJ-01..02`,
  `COMP-01`, `DEV-01..03`) is now ready to mark complete: this is the last plan declaring each of
  them, and every plan that shares an ID with it (123-01 through 123-07) already has its own
  SUMMARY.md.
- The docs site and the VS Code extension both build cleanly from the final tree with no warnings.
- No blockers or open items remain for Phase 123. The milestone is ready to ship.

---
*Phase: 123-documentation-drift*
*Completed: 2026-09-30*

## Self-Check: PASSED

- `.planning/phases/123-documentation-drift/123-08-SUMMARY.md` — FOUND (this file)
- Cross-check table row count: `45` (re-verified)
- Cross-check table status-value check: `0` invalid rows (re-verified)
- Settings two-way check: `settings both ways ok` (re-verified)
- All five Task 3 sweep commands re-run: all clean
- `git diff --name-only 8b53253d` re-run: lists only the files inside this plan's allowed scope
  plus `.planning/`
