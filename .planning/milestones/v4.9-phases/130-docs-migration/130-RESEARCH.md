# Phase 130: Docs & Migration - Research

**Researched:** 2026-10-04
**Domain:** Documentation-only phase (Docusaurus 3.10.2 user guides, Markdown QA checklists, a Markdown release-notes draft, one Gradle `changeNotes` HTML block) describing the Phase 124-129 formatter and DENUM migration
**Confidence:** HIGH (message texts, settings and file facts were read from source this session; old-versus-new output was reproduced live; IntelliJ balloon rendering of server messages rests on the Phase 129 evaluation record, not a new run)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Carried forward (not re-asked)
- **IntelliJ verdict is `supported`** (129-VERDICT.md): whole-file, range and on-save formatting are on.
  Known issues: `eolCharacter` CRLF stops formatting entirely in IntelliJ, with no message (lsp4ij
  #381); Actions on Save saves twice; format-on-save is IntelliJ's own Actions on Save, not a BBj
  setting (W4). The settings page has a Formatter section with all 15 controls, a restart note and
  the `eol_note` text.
- **Hard cut-over**: formatting and DENUM need BBj 26.03+ and a running BBjServices; no jar fallback,
  no local Java. Decompile still uses bbjlst `-l` (127 D-08).
- **DENUM edits the open buffer and leaves it unsaved**, never writing to disk (126 D-10/D-14, 127 D-02,
  deferred to this note by 127). The VS Code open-file prompt button is now "Denumber" (127 D-05).
  VS Code shows DENUM diagnostics in the Problems view; IntelliJ writes them to the BBj Language Server
  console (128 D-05). IntelliJ has a Denumber action (Tools menu + editor context menu, no shortcut)
  and a line-numbered-file banner with a [Denumber] button (128 D-01, D-08..D-10).
- **Settings**: `bbj.formatter.javaPath` was removed from the schema (127 D-10).
  `splitSingleLineIF` → `splitSingleLineIf` is migrated once, per scope, on activation (127 D-09).
  `indentWidth` defaults to 2. VS Code applies changes on the next format; IntelliJ applies them
  after the server restart on Apply (129 D-11).

#### Migration note (MIG-02)
- **D-01:** The migration note lives **in the release notes only**, not as a docs page. It is a
  **Markdown draft at `.planning/phases/130-docs-migration/130-RELEASE-NOTES.md`** that the user
  pastes into the GitHub release body at release time. `manual-release.yml` is not changed (it keeps
  `--generate-notes` plus the Installation block).
- **D-02:** In addition, **IntelliJ `changeNotes`** in `bbj-intellij/build.gradle.kts` gets a short
  entry for this release that replaces the stale "0.1.0 - Initial Release" block. It shows on the
  JetBrains Marketplace, so it must be short HTML with the headline changes and no tables.
- **D-03:** Note scope: (a) the **output differences** from the old formatter (MIG-02 list: labels,
  blank lines, IF closers, line endings, the fixed `--single-line-if` crash #507, plus the rest of the
  table in `.planning/research/FEATURES.md` "Old versus new output"); (b) **DENUM changes** (buffer
  edit, left unsaved, needs BBjServices, prompt button renamed, Decompile unchanged); (c) the
  **requirements change** (BBj 26.03+, running BBjServices, no offline formatting); (d) **settings
  changes** (javaPath removed, splitSingleLineIF renamed and auto-migrated, 11 new settings,
  indentWidth default 2); (e) **commit-first advice** and a prominent large-first-diff warning near the
  top.
- **D-04:** Output differences are written as the **visibility-ordered table** (reworded for users,
  each row naming the setting that brings the old style back where one exists), plus **short BBj
  before/after snippets** for the three High items: labels, blank lines and IF closers.

#### Guide structure (MIG-01)
- **D-05:** Add a **new `formatting.md` page to each guide** (`documentation/docs/vscode/formatting.md`,
  `documentation/docs/intellij/formatting.md`). Each covers Format Document / Reformat Code, Format
  Selection, format-on-save, DENUM, requirements, the message table (D-07) and a short "Changes from
  the old formatter" blurb (D-08). `features.md` in each guide keeps only a short "Code Formatting"
  teaser that links to the new page (VS Code's current 4-option list is replaced).
- **D-06:** The **settings reference is per guide and shaped by the IDE**. VS Code: `configuration.md`
  "Formatter Settings" lists all 15 `bbj.formatter.*` keys with type, values and default, and the
  deprecated `splitSingleLineIF` alias; the sample JSON block is updated. IntelliJ: a table of the
  Formatter section's controls (label, values, default) on the IntelliJ formatting page, plus the
  restart note. Descriptions are paraphrased once (source: `bbj-vscode/package.json` and
  `FormatterSettingTexts.java`) and reused in both guides.
- **D-07:** Each guide gets a **message table** (message in short form → meaning → what to do, for
  example start BBjServices, upgrade BBj or fix the setting) covering the format and DENUM outcomes. The
  wording comes from the server code, never invented.
- **D-08:** The **"Changes from the old formatter" blurb** in each formatting page is two or three
  sentences (output differs, expect a large first diff, commit first) and links to the GitHub
  Releases page. The guides do not repeat the full list.
- **D-09:** **Stale text is rewritten in place** in VS Code's pages: delete the `bbj.formatter.javaPath`
  section, its sample-JSON line and the machine-scope note in `configuration.md`. Rewrite the
  "Denumber BBj Program" entry in `commands.md` (and the open-file prompt description) to the
  `bbj/denum` behaviour. **Keep** the Decompile entries, which still use bbjlst. Fix the
  `commands.md` troubleshooting line that mentions `javaPath`. Success-criterion gate: no guide
  mentions the formatter jar / `BBjCFCli`, `bbj.formatter.javaPath`, or bbjlst denumbering.
- **D-10:** The IntelliJ guide documents format-on-save **step by step**: Settings → Tools → Actions on
  Save → Reformat code, plus one sentence saying there is no BBj-specific switch. It also documents
  the Denumber action, the banner and where DENUM diagnostics appear (BBj Language Server console).
  The IntelliJ `commands.md` gets the Denumber action.

#### Known-issue prominence
- **D-11:** The IntelliJ CRLF limitation is a **Docusaurus `:::warning` admonition on the IntelliJ
  formatting page next to the Line ending setting**. It uses the verdict's `eol_note` text and links to
  lsp4ij #381. There is no separate known-issues section or troubleshooting page.
- **D-12:** The **BBj 26.03 + running BBjServices requirement** goes into the existing prerequisite
  bullets in `index.md` and `getting-started.md` of both guides (extend "BBj 26.03 or higher for
  live compiler diagnostics" to cover formatting and DENUM), plus a **`:::info` box at the top of each
  formatting page**: no formatting or DENUM without BBjServices.
- **D-13:** The **large first-format diff warning** is prominent in the release-notes draft (top
  section, with the commit-first advice) and appears as one sentence in the guide blurb (D-08). No extra
  admonition in the guides.

#### QA checklists (MIG-03)
- **D-14:** **Smoke checklist: 2 rows per IDE (4 rows).** Per IDE: (1) Format Document / Reformat Code
  on a sample file changes it and Undo restores it; (2) Denumber on a line-numbered sample leaves a
  dirty buffer without line numbers.
- **D-15:** **Full checklist: mirrored baseline rows in both IDE sections.** Format document, format
  selection, format on save (VS Code `editor.formatOnSave`; IntelliJ Actions on Save), Denumber
  (command/action plus open-file prompt/banner), and the error rows (D-16). The **only IntelliJ-only
  extra is a CRLF row**: with Line ending = CRLF, Reformat does nothing and shows no message (expected,
  known issue); with KEEP, a CRLF file formats and stays CRLF. Rows for the settings page, the double
  save and empty didChange are not added.
- **D-16:** **Error rows cover one representative case per condition a tester can create**: BBjServices
  stopped, an invalid setting (VS Code settings.json), DENUM on a mixed-numbered and on an unnumbered
  file, and formatting a line-numbered file (the Denumber offer). BBj < 26.03, timeout and too-large
  get no row.
- **D-17:** **Full-checklist row 25 ("Formatter Java path") is replaced** by a VS Code settings row:
  change a formatter setting (e.g. `indentWidth` 4), format, and the output follows without a restart.
  An old `splitSingleLineIF` value in settings.json moves to `splitSingleLineIf` on activation.

### Claude's Discretion
- Exact prose, table layout, sidebar positions of the new `formatting.md` pages, and the
  `changeNotes` wording.
- How the before/after snippets are produced. They must be **real formatter output**, not written by
  hand: new output from a live `formatProgram` on :5008 (or the interop harness), old output from the
  vendored jar in git history or the bbj-ls formatter CHANGELOG examples. This follows the standing
  "evidence comes from real runs" rule.
- Expected-result wording in QA rows; sample files from `examples/` or `bbj-vscode/test/test-data/`.
- Whether the docs build (`documentation/` `npm run build`) is run as the link/MDX check. Recommended,
  since the new pages and admonitions must render.

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope.

Reviewed Todos (not folded): Signature-help/snippet peer-name escaping, Windows IntelliJ Node download progress, lsp4j 1.0 in bbj-ls, vscode-jsonrpc 9, vitest 5, nested Java classes from bbj-ls, skipping syntax checks on line-numbered programs. All matched on generic keywords only; none is documentation work.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MIG-01 | Both user guides describe formatting, Format Selection, DENUM, the 15 settings, the BBj 26.03 requirement and the IntelliJ verdict | Section A (verbatim message texts), Section B (15-setting table with IntelliJ labels), Section C (docs inventory with keep/rewrite/delete and sidebar slots), Section F (the docs build and the grep gates) |
| MIG-02 | A migration note lists the output differences from the old formatter (labels, blank lines, IF closers, line endings, the fixed `--single-line-if` crash #507) and warns about the large first-format diff | Section E (real old-versus-new output reproduced live, with a re-runnable recipe), the CORRECTION on IF closers and on `indentWidth`, Section G (`changeNotes` and the release-notes channel) |
| MIG-03 | The QA smoke and full checklists cover format, Format Selection, format-on-save, DENUM and the error messages in both IDEs | Section D (checklist structure, row numbering, sample files, IntelliJ action-enablement trap), Section A "how a tester triggers it" column |
</phase_requirements>

## Summary

This phase writes about code that already shipped, so almost every fact the planner needs is a verbatim string or a table row that already exists in source. The research harvested those strings (Section A: 40 messages, quoted byte for byte with file and line), the 15 settings with both IDEs' labels (Section B), a line-level inventory of every stale or missing spot in the 12 guide pages (Section C), the exact structure of both QA checklists (Section D), a live reproduction of old versus new formatter output (Section E), and the `changeNotes`/test constraints (Section G). The Docusaurus site is 3.10.2 with `onBrokenLinks: 'throw'`; a baseline build passes in about 5 seconds, so it is a cheap and reliable MDX/link gate. No test reads `documentation/docs` or `QA/`; the only tests that read neighbouring files are `formatter-removal.test.ts` (reads `bbj-vscode/README.md` and `bbj-intellij/build.gradle.kts`) and `Lsp4ijVersionPinTest` (reads `build.gradle.kts`), and both constrain only a few strings.

Four findings contradict or sharpen CONTEXT and must reach the planner. (1) **IF closers:** the research table in FEATURES.md says the old formatter "rewrote every closer to FI"; that is the Eclipse plug-in's default, not what the vendored CLI jar VS Code actually ran. Run live, the jar left existing `FI`/`ENDIF` as written. The verified, user-visible IF-closer differences are different (a closer followed by `; rem` was not recognised and the rest of the file stayed mis-indented; a closer the formatter *adds* when splitting a single-line IF is now `FI`, was `ENDIF`). (2) **`indentWidth` default 2 is not a change** for VS Code: the old extension schema already defaulted to 2 (git history, `cbedc828^`); bbj-ls's own default is 4, but both IDEs always send 2. (3) **#507** on GitHub is titled "vendored formatter JAR carries no version, vendor or provenance metadata ...", not the crash; the crash was found during that issue's debug session. Keep "#507" as the requirement words it, but do not write a closing keyword. (4) **The IntelliJ Denumber action is greyed out unless the file looks line-numbered** (first 20 non-blank lines all numbered, at least 3), so "DENUM on an unnumbered file" cannot be triggered from the IntelliJ action; the QA row must expect a disabled action there.

**Primary recommendation:** Build every user-visible string from Section A and every setting row from Section B (both quote source verbatim), produce the three before/after snippets by re-running the Section E recipe against live `:5008` and the git-history jar and pasting the output unedited, append new QA rows after the existing ones (so no existing row number moves) while replacing VS Code full-checklist row 25 in place, and gate the phase with the Section F grep set plus `npm --prefix /home/coder/repos/bbj-language-server/documentation run build`.

## Project Constraints (from CLAUDE.md)

- Use `Grep`/`Glob`/`Read` first; the `Grep` tool is not registered in this environment, so use bash `grep` with absolute, scoped paths (memory: grep-tool-unavailable-use-bash-grep). No `cd … && grep/find/cat/sed/head/tail`; no blind recursive scans; never read `.env*`, `*.pem`, `*.key`; stage with `git add <exact path>` only, never `-A` or `.`.
- Every shell path absolute and complete; `cd` is acceptable only in front of a build tool (`cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run …`).
- vitest must run with cwd `bbj-vscode` (memory: vitest-cwd-relative-fixtures).
- Never edit generated files; not relevant here (no grammar change).
- Docs are published to https://BBx-Kitchen.github.io/bbj-language-server/ by `.github/workflows/deploy-docs.yml` on push to `main` touching `documentation/**`; the PR workflow does not build the docs, so a broken link only fails after merge unless the planner runs the build locally.
- Memory carry-overs that bite this phase: `gsd_run query commit` writes the subject only, so add `Co-Authored-By` trailers with plain git (gsd-commit-helper-omits-trailers); no planning ids (`D-NN`, `NNN-NN`, `MIG-0N`) in the files this phase edits (register-check rule); squash-merge concatenates commit bodies, so do not put `Closes #507`/`Closes #381` in any commit body (squash-merge-commit-bodies-close-issues); commit docs on the existing branch `gsd/v4.9-bbj-ls-denum-format`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Formatting (whole file and range) | bbj-ls `formatProgram` inside BBjServices (the engine) | Shared language server (`bbj-format-service.ts`) turns the answer into minimal line edits and the user messages | Hard cut-over: no jar, no local Java; BBjServices must be running |
| DENUM | bbj-ls `denumProgram` | Shared language server applies the edit as one versioned `workspace/applyEdit` and words every outcome | `bbj/denum` request, so neither IDE carries denumbering logic |
| Message display | Shared language server decides text, severity and buttons | VS Code shows toasts; IntelliJ shows LSP4IJ "BBj Language Server" balloons | The docs describe the text once and name the surface per IDE |
| Format-on-save trigger | IDE (VS Code `editor.formatOnSave`; IntelliJ Settings, Tools, Actions on Save, Reformat code) | none | No BBj-specific switch in either IDE; the server cannot tell a save from Format Document |
| DENUM entry points | IDE client (VS Code command `bbj.denumber`, Alt+N, menus, open prompt; IntelliJ action, banner) | Shared language server | IntelliJ enablement and banner use a client-side line-number heuristic |
| DENUM diagnostics list | VS Code client (Problems view plus BBj output channel) | IntelliJ client (BBj Language Server console only) | `bbj/denumDiagnostics` notification placed per host |
| Documentation and QA | `documentation/` Docusaurus site, `QA/` Markdown | `.planning/phases/130-docs-migration/130-RELEASE-NOTES.md` (release body draft), `bbj-intellij/build.gradle.kts` `changeNotes` (Marketplace) | Pure content; no runtime code changes |

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Docusaurus (`@docusaurus/core`, `preset-classic`) | 3.10.2 [VERIFIED: /home/coder/repos/bbj-language-server/documentation/package.json:18-20 `"@docusaurus/core": "3.10.2"`] | Builds the user guides | Already the site generator; docs sidebar is `autogenerated` from the folder (sidebars.ts:4 `docsSidebar: [{type: 'autogenerated', dirName: '.'}]`) |
| Markdown tables with `<br>`-separated steps | n/a | QA checklists | Existing format: `| # | Feature | Steps | Expected | Pass/Fail |` |
| Gradle Kotlin DSL `changeNotes = """…""".trimIndent()` | n/a | IntelliJ Marketplace change notes | Existing block at `bbj-intellij/build.gradle.kts:65-78` |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `tsx` (in `bbj-vscode/node_modules/.bin/tsx`) | present [VERIFIED: ls of the path] | Run a throwaway script that calls the language server's own `JavaInteropService.formatProgram`/`denumProgram` against live `:5008` | Producing real "new" output (Section E) |
| Temurin Java 25 (`/opt/java/default/bin/java`) | 25.0.4.1 [VERIFIED: `java -version`] | Run the old `BBjCFCli.jar` from git history | Producing real "old" output (Section E) |
| `gh` CLI | present [VERIFIED: gh api calls succeeded] | Confirm issue numbers and titles | Checking `#381`, `#507` before linking |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `formatting.md` at `sidebar_position: 7` | Position 6 and bump `composers.md` to 7 in both guides | Position 6 reads better (Formatting before Composers) but edits two more files; position 7 touches nothing else. Recommendation: 7 (minimal change; v4.3 "keep lean" precedent) |
| One `####` heading with JSON snippet per formatter key in `configuration.md` | One grouped table | 15 per-key headings with snippets would run ~200 lines; a table (key, type, values, default, description) grouped by the `order` ranges in package.json is shorter. Recommendation: table, plus the deprecated alias row |
| Interop harness (`npm run interop-harness`) for new output | Scratch `tsx` script through `JavaInteropService` | The harness has no `formatProgram` case (no match in `bbj-vscode/tools/interop-test-harness`), so it cannot produce output. The script is the working path |

**Installation:** none. No package is installed by this phase.

**Version verification:** Docusaurus version read from `documentation/package.json`; baseline build ran successfully with it (Section F).

## Package Legitimacy Audit

No external packages are installed or recommended by this phase (docs, Markdown, a Gradle string). The `tsx` and Java used for evidence are already present in the repo or on the host.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
 User action                  IDE client                     Shared language server                 BBjServices (bbj-ls)
 -----------                  ----------                     ----------------------                 --------------------
 Format Document / Reformat -> textDocument/formatting  ----> bbj-formatting-handler (open buffer) -> formatProgram(text, 15 settings)
 Format Selection           -> textDocument/rangeFormatting -> same service, canonicalName "#range:" -> formatProgram(+range)
 Format on save (IDE switch)-> same request, no trigger info -> same service                        -> same
                                                                  |  ok            -> minimal line edits -> applied as ONE undo step
                                                                  |  denum-needed  -> offer (warn, buttons Denumber / Denumber and Format)
                                                                  |  failure kinds -> one Warning (deduped), buffer unchanged
 Denumber (cmd / action / --> bbj/denum {uri}  --------------> bbj-denum-service.execute ---------> denumProgram(text)  (or formatProgram+allowDenum)
 prompt button / banner)                                         |  ok -> workspace/applyEdit (buffer left UNSAVED) + message "Denumbered."
                                                                 |  diagnostics -> bbj/denumDiagnostics -> VS Code: Problems + BBj output;
                                                                 |                                         IntelliJ: BBj Language Server console
                                                                 |  failure -> one Warning, buffer unchanged
 Settings change            -> VS Code: configuration push (next format) | IntelliJ: Apply restarts the server (initializationOptions.formatter)
```

### Recommended file layout for this phase
```
documentation/docs/vscode/    index.md  getting-started.md  features.md  configuration.md  commands.md  formatting.md (NEW, sidebar_position 7)
documentation/docs/intellij/  index.md  getting-started.md  features.md  configuration.md  commands.md  formatting.md (NEW, sidebar_position 7)
QA/                           SMOKE-TEST-CHECKLIST.md  FULL-TEST-CHECKLIST.md
.planning/phases/130-docs-migration/130-RELEASE-NOTES.md   (NEW, release-body draft; not published by docs build)
bbj-intellij/build.gradle.kts                              (changeNotes block only)
```
Optional but recommended (see Open Questions): `documentation/docs/intellij/configuration.md` (the settings page gained a Formatter section the page never mentions) and the root `README.md` line 91.

### Pattern 1: Page front matter
**What:** every guide page starts with `sidebar_position` and `title`; folders carry `_category_.json`. Index pages add `slug`.
**Example:**
```markdown
---
sidebar_position: 7
title: Formatting
---
```
Source for the convention: all 12 existing guide pages (front matter read this session; positions in Section C).

### Pattern 2: Admonitions
Docusaurus fenced admonitions already appear in the repo [VERIFIED: /home/coder/repos/bbj-language-server/documentation/docs/vscode/configuration.md:433 `:::note` … line 437 `:::`]. Use `:::info` for the BBjServices requirement (D-12) and `:::warning` for the IntelliJ CRLF limitation (D-11). Both are standard Docusaurus admonition names [CITED: docusaurus.io/docs/markdown-features/admonitions].
```markdown
:::warning
In IntelliJ, Line ending CRLF stops formatting entirely: the IDE refuses the formatter's edit and the file stays unchanged, without a message (an LSP4IJ limitation, [lsp4ij issue #381](https://github.com/redhat-developer/lsp4ij/issues/381)); LF does not change a file's line endings either, so leave it at KEEP.
:::
```
The verdict text is `eol_note` [VERIFIED: /home/coder/repos/bbj-language-server/.planning/phases/129-intellij-verdict/129-VERDICT.md:20]; `gh api` confirmed lsp4ij #381 exists and is open, titled "When the line ending is CRLF, it cannot be formatted."

### Pattern 3: Cross-links
Existing pages link with relative `.md` paths and anchors, e.g. `[Opening Programs](./configuration.md#opening-programs)` (vscode/commands.md:93). Index quick-link tables use `vscode/getting-started` style (no `./`, no `.md`). Keep both styles where they already are. With `onBrokenLinks: 'throw'` [VERIFIED: documentation/docusaurus.config.ts:22 `onBrokenLinks: 'throw',`], a mistyped target fails the build; broken anchors only warn by default [ASSUMED: Docusaurus 3 default `onBrokenAnchors: 'warn'`], so verify anchors by eye or by grepping the built HTML.

### Anti-Patterns to Avoid
- **Raw angle brackets or braces outside code spans in `.md`:** Docusaurus 3 parses `.md` as MDX, so `bbj.formatter.<key>` or `{bbj.home}` outside backticks breaks the build. Always wrap in backticks (existing pages already write `{bbj.home}` inside backticks).
- **Writing before/after snippets by hand:** CONTEXT requires real output (Section E).
- **Describing the formatter jar, `bbj.formatter.javaPath`, `BBjCFCli` or bbjlst denumbering anywhere in `documentation/docs/`:** success criterion 1.
- **Putting planning ids (`D-04`, `MIG-02`, `129-VERDICT`) into guides, QA or `build.gradle.kts`:** register-check rule from project memory.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Message wording | Paraphrased or "improved" messages | Section A strings, quoted verbatim; guides may shorten only the "meaning/what to do" columns | D-07: "wording comes from the server code, never invented"; testers compare screen text to the checklist |
| Setting descriptions | New prose per setting | package.json `description`/`markdownDescription`/`enumDescriptions` (Section B), which IntelliJ already mirrors and a contract test keeps in sync | One source; `FormatterSettingTextsContractTest` fails if IntelliJ drifts from package.json |
| Old/new formatter output | Hand-typed examples | The Section E recipe (git-history jar + live `formatProgram`) | Standing rule: evidence comes from real runs |
| Docs link/MDX check | Eyeballing | `npm --prefix …/documentation run build` | `onBrokenLinks: 'throw'`; 5 s baseline |
| Sidebar ordering | Editing `sidebars.ts` | `sidebar_position` front matter | Sidebar is autogenerated from the folder |
| Release-body plumbing | A new workflow step | The user pastes the draft into the GitHub release body (D-01); `manual-release.yml` stays unchanged | Locked decision |

**Key insight:** every sentence the user will compare against the product already exists in source. The work is selection, grouping and reading-order, not authoring.

## Section A - Exact user-visible message texts

Surface: VS Code shows server messages as toast notifications (Warning unless stated). IntelliJ shows them as LSP4IJ balloons titled `BBj Language Server`, with the same buttons [CITED: .planning/phases/129-intellij-verdict/129-EVALUATION.md line 208, case C4a: "the screenshot shows the Warning balloon `BBj Language Server` with both buttons"]. All server texts are in `bbj-vscode/src/language/`. Quotes are verbatim.

### A1. Format outcomes (`bbj-format-service.ts`)

| Condition | Message text (verbatim) | Source | IDE | How a tester triggers it |
|-----------|------------------------|--------|-----|--------------------------|
| Connected BBjServices has no formatter (BBj < 26.03) | `BBj formatting requires BBj 26.03 or later. The connected BBjServices does not provide it.` | bbj-format-service.ts:30-31; shown once per connection (lines 289-293) | both | Needs an old BBj; D-16 gives it no row |
| Format ran past its deadline | `BBj formatting timed out. The file was not changed; try again.` | :34 | both | Not reproducible on demand; no row |
| File over the size limit | `This file is too large for BBj formatting. The file was not changed.` | :37 | both | Not reproducible cheaply; no row |
| Protected program | `This BBj program is protected and cannot be formatted.` | :40 | both | Needs a protected program; no row |
| Engine failed or unusable answer | `The BBj formatter could not process this file. The file was not changed. See the BBj output for details.` | :43-44 | both | No row |
| Formatting service unavailable | `The BBj formatting service is not available right now. The file was not changed; try again later.` | :47-48 | both | No row |
| Invalid settings (peer rejects values) | `Invalid BBj formatter settings: bbj.formatter.indentWidth: must be between 0 and 16, was 99; bbj.formatter.indentCharacter: unknown value "BANANA"; allowed: SPACE, TAB. The file was not changed.` Button: `Open Settings`. Template at :68-79: `Invalid BBj formatter settings: ${parts.join('; ')}. The file was not changed.`; up to 5 problems then `and N more`; with no problems: `Invalid BBj formatter settings. The file was not changed.` | :53-79; the per-key texts after the colon were captured live from :5008 on 2026-10-04 (`{"setting":"indentWidth","message":"must be between 0 and 16, was 99"}`, `{"setting":"indentCharacter","message":"unknown value \"BANANA\"; allowed: SPACE, TAB"}`) | VS Code (IntelliJ controls cannot hold invalid values) | In `settings.json` set `"bbj.formatter.indentWidth": 99` and `"bbj.formatter.indentCharacter": "BANANA"`, then Format Document. `Open Settings` opens the Settings UI filtered to `bbj.formatter` (extension.ts:652-653 and format-settings-notification.ts:32 `FORMATTER_SETTINGS_QUERY = 'bbj.formatter'`). In IntelliJ the same button opens the BBj settings page (BbjLanguageClient.openFormatterSettings, line 223) |
| Format Document on a line-numbered file | `This file has line numbers, so it cannot be formatted as it is. Denumber it, or denumber and format it in one step.` Buttons `Denumber`, `Denumber and Format`. Not deduplicated: raised on every request, including format-on-save | bbj-denum-service.ts:106-107, 100, 103; format-service :321-345 | both | Open a line-numbered sample (Section D) and run Format Document / Reformat Code. Recorded on IntelliJ build 242 (129 C4a) |
| Format Selection on a line-numbered file | `Formatting a selection needs a file without line numbers. Denumber the file first.` Button `Denumber` | bbj-denum-service.ts:110-111 | both | Select two lines of the numbered sample, Format Selection / Reformat Code (129 C4b) |
| Format Document on a file that MIXES numbered and unnumbered lines | Same offer as the line above (the engine answers `denum-needed` for any numbering; captured live: `DENUM needed: the source is a line-numbered program (first numbered line 1); DENUM it first or set allowDenum`). The mixed-numbering message appears only after pressing Denumber (A2) | live probe 2026-10-04 on :5008 | both | Format the mixed sample, then click Denumber |
| BBjServices not running | **No formatting message of its own** (log line only). The shared connection may show `Failed to connect to the Java interop service. Check that BBj Services is running and the interop host/port settings are correct. (<detail>)` (Error) | format-service :293-296, :396-399 ("The interop client has already reported that the service is not reachable"); bbj-notifications.ts:289-295; 125 CONTEXT D-04 | both | Stop BBjServices, run Format; expect the file unchanged and no formatting-specific toast. Whether the shared-connection error toast appears on a format-only action was not observed; the QA row must say "file unchanged" and not require the toast [ASSUMED] |
| Tokenized (`<<bbj>>`) buffer | Silent: format returns no edits, no message | format-service :206-209 | both | n/a |

### A2. DENUM outcomes (`bbj-denum-service.ts`, `denum-command.ts`)

| Condition | Message text (verbatim) | Source | IDE | How a tester triggers it |
|-----------|------------------------|--------|-----|--------------------------|
| Success, no diagnostics | `Denumbered.` (Information) | :36 | both | Denumber a line-numbered file |
| Success with diagnostics | `Denumbered.` followed by tallies, e.g. `Denumbered. 2 errors, 1 warning.` (kinds `error`, `warning`, `note`, zero counts omitted); button `Show`; Warning when any error, else Information | :121-136, :374-388, :114 | both | Needs a program for which DENUM reports diagnostics; no row |
| File has no line numbers | `This file has no line numbers. Nothing to denumber.` (Information) | :39, :336 | **VS Code only in practice** | VS Code: run Denumber BBj Program on an unnumbered file. IntelliJ: the Denumber action is greyed out on such a file (BbjDenumberAction.update, lines 65-67), so this message is not reachable from the action |
| Denumber and Format success | `Denumbered and formatted.` | :91 | both | Format a numbered file, click `Denumber and Format` |
| Denumber and Format on an unnumbered file | `This file has no line numbers. It was formatted.` | :42 | both | Rare; no row |
| Mixed numbering | `Mixed line numbering at line 3. The file was not changed.` with button `Go to Line` (no line: `Mixed line numbering in this file. The file was not changed.`). Line 3 captured live for a file whose third line is unnumbered | bbj-format-service.ts:82-86, :60; live probe: `mixed line numbering: line 3 has no line number` | both | VS Code: run the command on the mixed sample. IntelliJ: see Section D trap (action enabled only if the first 20 non-blank lines are all numbered); or format the mixed file and click `Denumber` in the offer |
| BBjServices not reachable | `BBjServices is not reachable. The file was not changed.` | :71 | both | Stop BBjServices, run Denumber |
| Server lacks DENUM (BBj < 26.03) | `Denumbering requires BBj 26.03 or later. The connected BBjServices does not provide it.` | :67-68 | both | No row |
| Timeout | `Denumbering timed out. The file was not changed; try again.` | :74 | both | No row |
| Too large | `This file is too large to denumber. The file was not changed.` | :77 | both | No row |
| Protected | `This BBj program is protected and cannot be denumbered.` | :80 | both | No row |
| Parser could not read the text | `Denumbering failed. The file was not changed. If it contains characters BBj cannot represent, remove them and try again.` | :83-84 | both | No row |
| Generic failure | `Denumbering failed. The file was not changed. See the BBj output for details.` | :45 | both | No row |
| Denum service unavailable | `The BBj denumbering service is not available right now. The file was not changed; try again later.` | :87-88 | both | No row |
| Tokenized program | `This is a tokenized BBj program, not source text. Decompile it first, then denumber the source.` | :48-49 | both | Run Denumber on a tokenized file |
| Not an open BBj file | `Open the BBj file in the editor first; denumbering works on the open editor text.` | :52-53 | both (rare) | n/a |
| Buffer changed during the run | `The file changed while it was being denumbered. Nothing was changed; run Denumber again.` | :56-57 | both | Race; no row |
| Editor refused the edit | `The editor did not accept the denumbered text. Nothing was changed; run Denumber again.` | :60-61 | both | No row |
| Already running | `Denumbering is already running for this file.` | :64 | both | Double-click quickly; no row |
| Combined run, formatting-side failures | Reuse the format texts above (timeout, too large, engine failed, service unavailable, invalid settings with `Open Settings`) | :461-490 | both | No row |

### A3. Client-worded messages and prompts

| What | Text (verbatim) | Source | IDE |
|------|-----------------|--------|-----|
| No active BBj file when the command runs with nothing to target | `No active BBj file. Open or select a BBj file and try again.` (Warning) | Commands/target-resolution.ts:31 | VS Code |
| Command request rejected / file could not be opened | `Denumber failed: ${error message}` (Error) | denumber-command.ts:50-52 | VS Code |
| Open-file prompt for a line-numbered program | `"<file name>" is a line-numbered BBj program. Denumber it for editing, or open it read-only?` Buttons `Denumber`, `Open Read-only`. Controlled by `bbj.denumber.promptOnOpen` (default true), `file` scheme only, once per document per session | open-file-prompts.ts:92-97, :85 | VS Code |
| Editor banner | `This is a line-numbered BBj program. Denumber it for editing.` with one link `Denumber`; no dismiss, no setting; disappears after the edit lands, returns after Undo | BbjLineNumberedNotificationProvider.java:31, 53 | IntelliJ |
| Transport failure notification | Group `BBj Language Server`, title `Denumber failed`, type ERROR, body one of: `the BBj language server is not running`, `no answer from the BBj language server within 60 seconds`, `interrupted`, `the BBj language server was stopped or restarted`, or the exception's own message | BbjDenumberAction.java:106, 117-118, 121, 126, 152-155; timeout constant :47 `DENUM_TIMEOUT_SECONDS = 60` | IntelliJ |
| Progress task | `Denumbering <file name>…` | BbjDenumberAction.java:86 | IntelliJ |
| Settings migration log line | `Moved bbj.formatter.splitSingleLineIF to bbj.formatter.splitSingleLineIf in the user settings.` (also `… workspace settings.` / `user and workspace settings.`), written to the `BBj` output channel | settings-migration.ts:43-44, 109-111; extension.ts:478 passes `log: appendOutputLine` | VS Code |
| DENUM diagnostics list | Header `Denumber diagnostics for <path>:` then one line per entry `  line 7 (original 0070) WARNING: <message>` (`no location` when line is 0). VS Code also places them as Problems with source `BBj Denumber` (collection `bbj-denum`); IntelliJ prints them to the `BBj Language Server` console only; `Show` reveals the Problems view (VS Code) or the console (IntelliJ) | denum-diagnostics-output.ts:53-69, 144-154; extension.ts:711-727; DenumDiagnosticsPresenter.java:50, 70-74; BbjLanguageClient.java:179-196 | both |

### A4. Behaviour facts the message tables and QA rows depend on
- **The client-side "looks line-numbered" heuristic** (VS Code open prompt, IntelliJ banner, IntelliJ action enablement) is: every one of the first 20 non-blank lines is `digits + space/tab + a statement character`, and at least 3 such lines [VERIFIED: bbj-vscode/src/line-numbering.ts:30-47, quoted: `const maxLinesToInspect = 20;` `const minLinesToDecide = 3;` `// A numbered program is uniform: a single unnumbered statement rejects it.`; Java port LineNumbering.java:8-9 `MAX_LINES_TO_INSPECT = 20`, `MIN_LINES_TO_DECIDE = 3`]. A 2-line sample never triggers the prompt, banner or enabled action.
- **IntelliJ action enablement:** visible on BBj program file types, enabled only when the buffer looks line-numbered [VERIFIED: BbjDenumberAction.java:65-67 `e.getPresentation().setVisible(true); e.getPresentation().setEnabled(LineNumbering.isLineNumberedSource(`]. The server decides the real outcome, so a heuristic mismatch is harmless.
- **VS Code command** `bbj.denumber`, title `Denumber BBj Program`, Alt+N, editor context menu, editor title bar button, Explorer context menu [VERIFIED: bbj-vscode/package.json:157-165, 229-232, 256-260, 318-322, 345-349]; no `category`, so it appears in the Command Palette without the `BBj:` prefix (docs already say so, commands.md:10).
- **IntelliJ action** id `bbj.denumber`, text `Denumber BBj Program`, Tools menu and editor context menu after Compile, no shortcut [VERIFIED: plugin.xml:127-133].
- **DENUM turns referenced line numbers into labels.** Live result on :5008: `0010 PRINT "Hello"` / `0020 GOSUB 0100` / `0030 END` / `0100 PRINT "Sub"` / `0110 RETURN` became `PRINT "Hello"` / `GOSUB L100` / `END` / `L100: PRINT "Sub"` / `RETURN`. An unreferenced numbered file loses its numbers completely. The existing commands.md Before/After example shows no labels; add one sentence so users are not surprised [VERIFIED: live denumProgram probe 2026-10-04].
- **Format-on-save offers Denumber on every save of a numbered file** (the request carries no trigger and the offer is not deduplicated) [VERIFIED: bbj-format-service.ts:321-329 comment].
- **Selection formatting** snaps to whole statements and lines; only those lines change [CITED: 129-EVALUATION.md W3, line 257].
- **Only `bbj`-language open documents are formatted**; config files and tokenized `<<bbj>>` buffers return no edits [VERIFIED: bbj-formatting-handler.ts:48-52, bbj-format-service.ts:206-209].
- **Undo:** the denumber edit is one editor change labelled `Denumber`; formatting is one change; the file on disk is untouched until the user saves [VERIFIED: bbj-denum-service.ts:94 `DENUMBER_EDIT_LABEL = 'Denumber'`; denum-command.ts:11-15 comment "the file on disk is never written: the buffer is left dirty and the editor's own undo restores it"].

## Section B - The 15 formatter settings

Keys, types, values, defaults and descriptions [VERIFIED: bbj-vscode/package.json:410-578, with the `FORMATTER_DEFAULTS` object read at bbj-vscode/src/language/bbj-format-settings.ts:52-68 agreeing]; IntelliJ labels [VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java:151-167, 379-393]; IntelliJ tooltips equal the VS Code text with markup removed [VERIFIED: FormatterSettingTexts.java:38-84]. Scope of every key is `window` (workspace-overridable). The IntelliJ page is `Settings > Languages & Frameworks > BBj`, section `Formatter` [VERIFIED: plugin.xml:252-257 `parentId="language"` … `displayName="BBj"`; BbjSettingsComponent.java:378 `new TitledSeparator("Formatter")`].

Grouping follows package.json's `order` values (1-3, 10-13, 20-26, 30).

| # | VS Code key (`bbj.formatter.`) | Type and values | Default | Description (paraphrase source: package.json) | IntelliJ control label |
|---|-----|-----|-----|-----|-----|
| 1 | `indentWidth` | integer 0-16 | `2` | Number of indent characters per block level, from 0 to 16. | `Indent width:` (spinner) |
| 2 | `indentCharacter` | `SPACE`, `TAB` | `SPACE` | Character used for indentation. | `Indent character:` |
| 3 | `indentLabelBlocks` | boolean | `false` | Indent the statements between a subroutine label and its closing RETURN by one level. | `Indent label blocks` |
| 4 | `keywordsToUppercase` | boolean | `false` | Write BBj keywords in upper case. Wins over `ifKeywordCase`. | `Keywords in upper case` |
| 5 | `ifClosingKeyword` | `KEEP`, `FI`, `ENDIF` | `KEEP` | Keyword that closes a block IF. `KEEP` leaves every existing `FI` or `ENDIF` as written; a closer the formatter adds uses `FI`. (`FI`: close every block IF with FI. `ENDIF`: close every block IF with ENDIF.) | `IF closing keyword:` |
| 6 | `ifKeywordCase` | `KEEP`, `MATCH_IF`, `LOWER_CASE`, `UPPER_CASE` | `KEEP` | Case of `ELSE`, `FI` and `ENDIF`. `KEEP` leaves existing keywords as written; added ones copy the case of their `IF`. `keywordsToUppercase` always wins. (`MATCH_IF` copies the opening IF's case; `LOWER_CASE`/`UPPER_CASE` force it.) | `IF keyword case:` |
| 7 | `splitSingleLineIf` | boolean | `false` | Split a single-line IF statement across several lines. | `Split single-line IF` |
| 8 | `removeLineContinuation` | boolean | `false` | Remove line-continuation characters. | `Remove line continuation` |
| 9 | `splitInlineComments` | boolean | `false` | Move in-line comments onto their own line. | `Move in-line comments to their own line` |
| 10 | `splitInlineLabelComment` | boolean | `false` | Move a label's in-line comment onto its own line. | `Move label comments to their own line` |
| 11 | `collapseMultiLine` | boolean | `false` | Collapse consecutive blank lines into one. | `Collapse blank lines` |
| 12 | `blankLineAfterReturn` | boolean | `false` | Put exactly one blank line after a subroutine's closing RETURN. | `Blank line after RETURN` |
| 13 | `parameterLayout` | `KEEP_INITIAL_LAYOUT`, `NO_BLANK`, `BEFORE_COMMA`, `AFTER_COMMA`, `BEFORE_AND_AFTER_COMMA` | `KEEP_INITIAL_LAYOUT` | Spacing around the commas between method parameters. (Keep as written; no blank around the commas; one blank before each comma; one blank after each comma; one blank before and after each comma.) | `Parameter layout:` |
| 14 | `operatorSpacing` | `KEEP`, `SPACED` | `KEEP` | Spacing around binary operators. `SPACED`: exactly one blank on each side; unary signs, exponents, strings and comments stay as written. | `Operator spacing:` |
| 15 | `eolCharacter` | `KEEP`, `LF`, `CRLF` | `KEEP` | Line ending of the formatted file. `KEEP` uses the file's most frequent line ending. | `Line ending:` |

Deprecated alias (VS Code only): `bbj.formatter.splitSingleLineIF`, type `["boolean","null"]`, default `null`, message "Renamed to bbj.formatter.splitSingleLineIf. A value set here is moved there automatically." [VERIFIED: package.json:579-589]. The migration moves a boolean value once per scope (user always; workspace only when trusted), writes the new key and removes the old one, and skips a scope where the new key is already set [VERIFIED: settings-migration.ts:56-70, 86-117].

IntelliJ notes (verbatim, for the formatting page):
- Restart note: `These settings apply after the language server restarts. Apply restarts it automatically. In IntelliJ, Line ending CRLF stops formatting entirely: the IDE refuses the formatter's edit and the file stays unchanged, without a message (an LSP4IJ limitation, lsp4ij issue #381); LF does not change a file's line endings either, so leave it at KEEP.` [VERIFIED: FormatterSettingTexts.java:24-28].
- On the same page under the section: `To format on save, turn on Reformat code under Settings | Tools | Actions on Save.` [VERIFIED: FormatterSettingTexts.java:31-32]. The page already carries the hint, so the guide step list (D-10) repeats it, it is not new information.
- IntelliJ apply behaviour: Apply stores the values and schedules a debounced server restart [VERIFIED: BbjSettingsConfigurable.java:92-104]. VS Code applies the next format without a restart [CITED: 130-CONTEXT carried-forward decisions].

## Section C - Current docs inventory (keep / rewrite / delete)

Docusaurus 3.10.2. Existing `sidebar_position`: both guides `index` 1, `getting-started` 2, `features` 3, `configuration` 4, `commands` 5, `composers` 6 [VERIFIED: grep of front matter in all 12 pages]. `_category_.json`: VS Code Guide position 1, IntelliJ Guide position 2, both `link: doc index`. New `formatting.md`: `sidebar_position: 7` in each guide (recommendation). Also add a Formatting row to each `index.md` Quick Links table (vscode/index.md:23-29, intellij/index.md:23-29). The footer in `docusaurus.config.ts` lists Getting Started, Features, Configuration and Commands only; adding Formatting there is optional and not required.

Grep over `documentation/docs` for format/formatter/javaPath/BBjCFCli/jar/denumber/bbjlst/decompile returned these files: `vscode/commands.md`, `vscode/configuration.md`, `vscode/features.md`, `intellij/commands.md`, `intellij/configuration.md`, `intellij/features.md`. The last three IntelliJ hits are unrelated words ("information", "JARs"); the IntelliJ guide contains no formatting or DENUM text at all.

### VS Code guide

| File:lines | Current content | Class | Action |
|------------|-----------------|-------|--------|
| `vscode/index.md:23-29` | Quick Links table (5 rows) | add | Add `[Formatting](vscode/formatting)` row |
| `vscode/index.md:35-37` | `**BBj** 26.03 or higher for live compiler diagnostics (an earlier BBj keeps the save-time compiler check)`; `**BBjServices** running locally` | rewrite | Extend the 26.03 bullet to formatting and Denumber (D-12) |
| `vscode/index.md:19` | "Built-in commands to run, compile, and manage BBj programs" | optional | Could mention formatting; not required |
| `vscode/getting-started.md:16-19` | Same 26.03 bullet plus `**BBjServices** running locally (required for full functionality)` | rewrite | Same extension (D-12) |
| `vscode/features.md:105-114` | `## Code Formatting` with a 4-option list and "Format the document with `Shift+Alt+F` or configure format-on-save." | rewrite | Replace with a 2-3 sentence teaser linking `./formatting.md`; do not hard-code the Linux shortcut (see Pitfall 7) |
| `vscode/features.md:128-131` | Build Commands table incl. `Denumber BBj Program | Alt+N | Remove line numbers from program` | keep | Still true |
| `vscode/configuration.md:148-176` | Opening Programs: `bbj.decompile.promptOnOpen` (keep) and `bbj.denumber.promptOnOpen` (L165-176: "prompt to denumber it (replacing the file with editable source) or open it read-only") | keep / rewrite | Keep decompile entry; rewrite the denumber description: the prompt offers `Denumber` (edits the open buffer, left unsaved) or `Open Read-only` |
| `vscode/configuration.md:270-333` | `### Formatter Settings`: 4 keys (`indentWidth` "Number of spaces for indentation.", `removeLineContinuation`, `keywordsToUppercase`, `splitSingleLineIF`) and the `bbj.formatter.javaPath` section (L320-333, "Deprecated and no longer used … machine-scoped") | rewrite + delete | Replace with the 15-key table (Section B) plus the deprecated alias row and a link to `formatting.md`; **delete the javaPath section entirely** (L320-333) |
| `vscode/configuration.md:335-364` | Complete Settings Example; L358-362 list 4 formatter keys and `"bbj.formatter.javaPath": ""` | rewrite | Remove the javaPath line; list the 15 keys with defaults (the note at L337 says "every setting except the bbj.compiler.*") |
| `vscode/configuration.md:379-383` | "Workspace settings override user settings, with two exceptions: `bbj.formatter.javaPath` is machine-scoped … and a workspace-scoped `bbj.configPath` is ignored …" | rewrite | Becomes one exception (`bbj.configPath` while untrusted); remove the `#bbjformatterjavapath` link (it would otherwise break) |
| `vscode/commands.md:69-93` | `### Denumber BBj Program (Alt+N)`: "Removes line numbers from a BBj program." Before/After; L91-93 "(denumber and replace, or open read-only)" | rewrite | Describe `bbj/denum` behaviour: edits the open buffer, leaves it unsaved, Undo restores, needs BBjServices 26.03+, referenced numbers become labels, prompt buttons `Denumber` / `Open Read-only`, diagnostics in the Problems view |
| `vscode/commands.md:95-115` | Decompile Commands (`bbjlst`) | **keep** | Decompile still uses bbjlst `-l` |
| `vscode/commands.md:249-259` | `## Requirements` item 3: "**Formatting** runs through the BBj language server and BBjServices (BBj 26.03 or later); it does not use `bbj.formatter.javaPath`. Compiling and running programs do not need Java …" | rewrite | CONTEXT calls this "the troubleshooting line"; it is actually Requirements item 3. Remove the javaPath clause; add Denumber to the same sentence |
| `vscode/commands.md:206, 224, 231, 235` | Keyboard summary, editor context menu, Explorer, title bar | keep | Still true |
| `vscode/commands.md:261-287` Troubleshooting | No formatting entry | add (optional) | One short "Formatting or Denumber does nothing" entry pointing at BBjServices and the message table |
| `vscode/formatting.md` | none | new | Format Document, Format Selection, format-on-save (`editor.formatOnSave`), Denumber, `:::info` box, message table, "Changes from the old formatter" blurb with Releases link |

### IntelliJ guide

| File:lines | Current content | Class | Action |
|------------|-----------------|-------|--------|
| `intellij/index.md:23-29` | Quick Links table | add | Add `[Formatting](intellij/formatting)` |
| `intellij/index.md:35-37` | 26.03 bullet (same wording) | rewrite | D-12 |
| `intellij/getting-started.md:16-19` | 26.03 bullet | rewrite | D-12 |
| `intellij/features.md` | No formatting or Denumber content. Quick-reference table L153-158; `## Editor Banners` L216-225 lists four banners | add | Add a short `## Code Formatting` teaser linking `./formatting.md`; add the line-numbered banner (`This is a line-numbered BBj program. Denumber it for editing.`) to the Editor Banners list; optionally add a Denumber row to the quick-reference table |
| `intellij/commands.md` | No Denumber action. Compile section L65-85; Tools menu L93-96; Editor Context Menu L169-178; Requirements L195-204 | add | New `### Denumber BBj Program` entry after Compile: Action ID `bbj.denumber`, Access `Tools > Denumber BBj Program` and the editor context menu, no shortcut, enabled only on a line-numbered BBj program, edits the open buffer and leaves it unsaved, diagnostics in the BBj Language Server console, banner `Denumber` link. Add it to the context-menu list and the "Requirements for Commands" list |
| `intellij/configuration.md` | `Accessing Settings` says "All BBj plugin settings are located on this single application-level settings page" but no Formatter section exists (headings: BBj Environment, BBj Compiler, Node.js Runtime, Classpath, Language Server, Java Interop, Enterprise Manager, Run Settings) | add (recommended, not in CONTEXT's file list) | A short `## Formatter` section between BBj Compiler and Node.js Runtime that points to `formatting.md` for the controls, avoids the page contradicting itself |
| `intellij/formatting.md` | none | new | Reformat Code (whole file), Reformat selection, format-on-save step by step (`Settings > Tools > Actions on Save > Reformat code`, one sentence "no BBj-specific switch", plus the known Actions on Save double-save note), Denumber action/banner/console, controls table (Section B IntelliJ labels), restart note, `:::warning` CRLF admonition, `:::info` BBjServices box, message table, blurb |

No `bbjlst`-denumber, `BBjCFCli`, jar or `javaPath` text exists in the IntelliJ guide today. The only `javaPath` mentions anywhere in the guides are the three VS Code spots above (configuration.md L320-333, L362, L380; commands.md L255-256).

Other places that describe the old state (outside the two guide folders): root `README.md:91-92` ("**In VS Code:** code formatting (indent width, keyword case, line continuations, single-line IF), Denumber (`Alt+N`), and decompiling tokenized programs.") is now inaccurate (both IDEs format and denumber); `bbj-vscode/README.md:13` is already correct. See Open Question 3.

## Section D - QA checklists

### D1. Structure [VERIFIED: read both files in full]

**Smoke** (`QA/SMOKE-TEST-CHECKLIST.md`): header, `## Smoke Test` table `| # | Feature | Steps | Expected | Pass/Fail |`, 10 rows numbered 1-10 (1-5 VS Code basics, 6 IntelliJ basic, 7 Run VS Code, 8 Run IntelliJ, 9 LS exits, 10 no runaway CPU), `## Test Run Result` (two checkboxes `[ ] **PASS**`, `[ ] **FAIL**`, no counts), `## Test Information`. Result cell is `[ ]`. Steps use `1. … <br>2. …`.

**Full** (`QA/FULL-TEST-CHECKLIST.md`): sections with their own numbering: `VS Code - LSP Features` rows 1-28 (L27-54; **row 25 is `Formatter Java path` at L51**), `IntelliJ IDEA - LSP Features` rows 1-33 (L62-94), `VS Code - Run Commands` 1-3, `IntelliJ IDEA - Run Commands` 1-3, `Enterprise Manager Integration` 1-6, `Language Server Process Lifecycle` 1-6, then `## Test Run Result` (two checkboxes, no counts) and `## Test Information`. Cross-references to row numbers exist only inside the IntelliJ section (row 20, row 18, "row 2's" in EM) [VERIFIED: grep]; none points at VS Code row 25.

**Consequences:** there are no totals or counts to update anywhere (no "28 tests" text; `QA/TESTING-GUIDE.md` has no row numbers and no counts, only generic time estimates "5-10 minutes" and "30-45 minutes"). Appending new rows after the last row of each section moves no existing number. Replace VS Code row 25 in place (D-17). `QA/test-runs/2026-09-20-smoke-test-PASS.md` is a historical copy; do not edit it.

### D2. Recommended rows (planner may tune wording)

Smoke: append rows 11-14 (VS Code format, VS Code Denumber, IntelliJ format, IntelliJ Denumber). Full VS Code section: replace 25; append 29+. Full IntelliJ section: append 34+.

| Where | Row idea | Verified expectation |
|-------|----------|----------------------|
| Smoke 11 / 13 | Open `examples/bbj-classes.bbj` (63 lines, unindented), Format Document (VS Code) / Reformat Code (IntelliJ), then Undo | File gains indentation (60 of 63 lines change with defaults: live probe 2026-10-04), one Undo restores the original [VERIFIED: live formatProgram on this file]. Example file is already used by full-checklist row 1 |
| Smoke 12 / 14 | Create a file with three numbered lines (see sample below), run Denumber | Line numbers disappear, the editor shows the file as modified (unsaved), message `Denumbered.`; on disk unchanged until saved |
| Full VS Code 25 (replaced) | Set `bbj.formatter.indentWidth` to 4, format `examples/bbj-classes.bbj`; then put `"bbj.formatter.splitSingleLineIF": true` in user `settings.json`, reload the window | Output indents 4 spaces with no restart; after activation the old key is gone and `"bbj.formatter.splitSingleLineIf": true` is present, and the `BBj` output channel has `Moved bbj.formatter.splitSingleLineIF to bbj.formatter.splitSingleLineIf in the user settings.` |
| Full VS Code 29-37, IntelliJ 34-42 (mirrored) | Format document; format selection (select one METHOD, only those lines change); format on save (`editor.formatOnSave` / Actions on Save with scope Whole file); Denumber command/action; open-file prompt (VS Code) / banner (IntelliJ); error rows | See Section A "how a tester triggers" |
| IntelliJ extra | CRLF row (D-15): create a CRLF file, set `Line ending` to CRLF, Apply, Reformat Code: nothing happens, no message; set KEEP, Apply, Reformat: formats and the file stays CRLF | Per 129 C6a/C6b [CITED: 129-VERDICT.md:47-51] |

**Sample files.** `examples/` contains no line-numbered file, and the only numbered fixture in the repo, `bbj-vscode/test/test-data/conformance/line-numbered-class.bbj`, does not qualify (numbers on their own lines, REM header lines, so the "every line numbered" heuristic rejects it). Embed samples in the row text (existing rows already say "Create new file `test.bbj`, type …"). Verified live on :5008:

```
0010 PRINT "Hello"
0020 PRINT "World"
0030 END
```
Denumbered result: `PRINT "Hello"` / `PRINT "World"` / `END`. For a label demonstration use five lines `0010 PRINT "Hello"`, `0020 GOSUB 0100`, `0030 END`, `0100 PRINT "Sub"`, `0110 RETURN`, which becomes `PRINT "Hello"` / `GOSUB L100` / `END` / `L100: PRINT "Sub"` / `RETURN`. A mixed sample: `0010 PRINT 1`, `0020 PRINT 2`, `PRINT 3` (captured: `mixed line numbering: line 3 has no line number`).

**IntelliJ trap for the error rows (D-16):**
- *Unnumbered file:* the Denumber action is greyed out and no banner shows, so the expected result is "action disabled", not the `Nothing to denumber` message.
- *Mixed file:* the 3-line mixed sample is not "line-numbered" for the client (an unnumbered line is within the first 20), so the action is disabled and no banner shows. Either use Reformat Code on it (the server offers Denumber; click it, then expect `Mixed line numbering at line 3. The file was not changed.`), or build a sample with 20+ numbered lines followed by one unnumbered line.
- *Numbered sample must have at least 3 numbered lines*, else neither the VS Code open prompt nor the IntelliJ banner/action reacts.

Other tester notes: format-on-save of a numbered file shows the Denumber offer again on each save; the VS Code open prompt appears once per document per session and `bbj.denumber.promptOnOpen` turns it off; the `BBjServices stopped` row should assert "file unchanged" for format and `BBjServices is not reachable. The file was not changed.` for Denumber (see Section A, [ASSUMED] caveat). Stopping the shared BBjServices in this dev container needs SIGTERM plus a restart (project memory), so that row is a human-environment step, not something this research ran.

## Section E - Old-versus-new output evidence (D-04)

### E1. Where the old formatter is
The jar the extension ran is retrievable. Commits `06c81df9` ("remove the jar verifier and the vendored formatter files") and `aed5c171` ("remove the jar-launching formatter module") delete it; the parent of `06c81df9` still has `bbj-vscode/tools/formatter/BBjCFCli.jar`, `lib/BBjCodeFomatter.jar`, `lib/jcommander-1.71.jar` [VERIFIED: `git log --diff-filter=D --name-only` and `git ls-tree` output]. The old extension called `java -jar BBjCFCli.jar -p -i <file> -w <indentWidth> [--keywords-uppercase] [--remove-line-continue] [--single-line-if]` with the document on stdin [VERIFIED: `git show aed5c171^:bbj-vscode/src/document-formatter.ts` lines 48-63, 194]. Java 25 runs the jar fine.

### E2. Where the new formatter is
`:5008` is up now (`ss` shows a java process listening; TCP connect succeeded). The language server's own client calls it: `createBBjServices(NodeFileSystem).BBj.java.JavaInteropService`, `setConnectionConfig('127.0.0.1', 5008)`, `formatProgram({text, version, settings})` [VERIFIED: pattern from bbj-vscode/test/functional/program-live.test.ts:177-200]. Pass `normalizeFormatterSettings(undefined)` as `settings` so the extension's defaults apply (indentWidth 2, not bbj-ls's 4). The interop harness cannot do this (no `formatProgram` case in `bbj-vscode/tools/interop-test-harness`).

### E3. Recipe (re-run at write time; paste output unedited)
Scratch files go in the session scratchpad, never the repo. Old jar:
```bash
SP=/path/to/scratchpad
mkdir -p $SP/oldfmt/lib
for f in BBjCFCli.jar lib/BBjCodeFomatter.jar lib/jcommander-1.71.jar; do
  git -C /home/coder/repos/bbj-language-server show 06c81df9^:bbj-vscode/tools/formatter/$f > $SP/oldfmt/$f
done
/opt/java/default/bin/java -jar $SP/oldfmt/BBjCFCli.jar -p -i $SP/labels.bbj -w 2 < $SP/labels.bbj
```
New formatter (script `newfmt.mts`, run with the repo's tsx):
```ts
import * as fs from 'node:fs';
const BV = '/home/coder/repos/bbj-language-server/bbj-vscode';
const { createBBjServices } = await import(`${BV}/src/language/bbj-module.ts`);
const { NodeFileSystem } = await import(`${BV}/node_modules/langium/lib/node/index.js`);
const { normalizeFormatterSettings } = await import(`${BV}/src/language/bbj-format-settings.ts`);
const text = fs.readFileSync(process.argv[2], 'utf8');
const interop = createBBjServices(NodeFileSystem).BBj.java.JavaInteropService;
interop.setConnectionConfig('127.0.0.1', 5008);
const outcome = await interop.formatProgram({ text, version: 'evidence-1',
    settings: normalizeFormatterSettings(JSON.parse(process.env.FMT_SETTINGS ?? '{}')) });
if (outcome.kind === 'ok' && outcome.result.scope === 'document') process.stdout.write(outcome.result.text);
else console.error('outcome', JSON.stringify(outcome));
process.exit(0);
```
```bash
cd /home/coder/repos/bbj-language-server/bbj-vscode && ./node_modules/.bin/tsx $SP/newfmt.mts $SP/labels.bbj
FMT_SETTINGS='{"splitSingleLineIf":true}' ./node_modules/.bin/tsx $SP/newfmt.mts $SP/crash.bbj
```
(The script ran from the session scratchpad on 2026-10-04 with no repo edits; run it from `bbj-vscode` as shown.)

### E4. Captured evidence (2026-10-04, input identical for both engines, extension defaults)

Input `labels.bbj` (written flat, no indentation):
```
class public Demo
method public void run()
print "start"
goto one
one:
print "one"
goto two
two:
print "two"
goto three
three:
print "three"
if a=1 then
print "x"
endif; rem done
if a=2 then
print "y"
FI
methodend
classend
```
Old jar (`-w 2`): indentation drifts one level deeper after every label; a blank line is inserted before each label and before the first block `IF`; `endif; rem done` is not recognised as a closer, so the second `if` and everything after it stays one level too deep; a blank line follows the class header and precedes `methodend`:
```
class public Demo

  method public void run()
    print "start"
    goto one

    one:
      print "one"
      goto two

    two:
      print "two"
      goto three

    three:
      print "three"

      if a=1 then
        print "x"
        endif; rem done

        if a=2 then
          print "y"
        FI
  methodend

classend
```
New (live `formatProgram`, defaults):
```
class public Demo
  method public void run()
    print "start"
    goto one
    one:
    print "one"
    goto two
    two:
    print "two"
    goto three
    three:
    print "three"
    if a=1 then
      print "x"
    endif; rem done
    if a=2 then
      print "y"
    FI
  methodend
classend
```
This single pair covers all three High items. Smaller pairs for the note:
- **Blank lines** (`demo.bbj`: a subroutine file with one blank line you wrote before `first:`). Old output inserts a blank after the `declare`, around the block `IF`, after `release`, before `return`; new output keeps exactly the one blank line the author wrote before `first:` plus the one before `second:`.
- **IF closer that the formatter adds** (`if a=1 then print "x"` with `splitSingleLineIf` on). Old jar: `if a=1 then` / `  print "x"` / `endif`. New default: `fi`. With `ifClosingKeyword` = `ENDIF` the new output is `endif` again [VERIFIED live].
- **Line endings:** a CRLF file (`for i=0 to 1`, `print i`, `next`) comes back from the old jar with LF only (`\n`), from the new formatter with `\r\n` preserved [VERIFIED: `od -c` of both outputs].
- **Crash fixed:** `printf 'if (a=1)\nx=1\nendif\n'` with `--single-line-if` (the old `splitSingleLineIF`) makes the old jar die with `java.lang.StringIndexOutOfBoundsException: Index 18 out of bounds for length 18`; the new formatter with `splitSingleLineIf` returns `if (a=1)` / `  x=1` / `endif` [VERIFIED live; message also appears in the bbj-ls CHANGELOG at the `split-if-no-crash` entry].
- `indentLabelBlocks` brings back an indented subroutine body only between a label and its `RETURN` (verified on a `first:` … `return` pair: body indented two spaces); it does not reproduce the old unbounded drift, which has no setting.

### E5. CORRECTIONS to CONTEXT / FEATURES.md (planner must apply)
1. **IF closers.** FEATURES.md "Old versus new output" (High row 3) and bbj-ls CHANGELOG settings table say the old formatter "rewrote every closer to FI and matched the IF's case". That describes the Eclipse plug-in default (`ifClosingKeyword` default FI). The CLI jar VS Code actually ran, called with its default flags, **kept** existing `endif`, `ENDIF` and `fi` as written (live run on `closers.bbj`: all three unchanged). So tell VS Code users the true differences: closers the formatter adds on split are `FI` (were `ENDIF`), a closer followed by `; rem` is now recognised, and `ifClosingKeyword`/`ifKeywordCase` now exist. Do not claim "existing closers are no longer rewritten".
2. **`indentWidth`.** Not a change for VS Code: `git show cbedc828^:bbj-vscode/package.json` shows `"bbj.formatter.indentWidth": { "type": "number", "default": 2 ...}`. bbj-ls itself defaults to 4, but the extension and IntelliJ send 2 [VERIFIED: bbj-format-settings.ts:48-51 comment "`indentWidth`, which is 2 here (bbj-ls itself defaults to 4)"]. Word D-03(d) as "indentWidth stays 2", and add that the range is now checked (0-16; the old schema had no bounds).
3. **#507.** The GitHub issue is titled "dependencies: vendored formatter JAR carries no version, vendor or provenance metadata, so no advisory database can be checked against it" (state closed) [VERIFIED: gh api]. PROJECT.md says the jar's `--single-line-if` crash "(#507) is resolved by v4.9's move off the jar", so the crash was found during that issue's debug session. Keep the requirement's `#507` text but phrase it neutrally ("tracked under #507") and never use a closing keyword.
4. **IntelliJ users never had the old formatter.** The migration note's output-difference table is for VS Code users; IntelliJ users get formatting for the first time.

## Section F - Verification surface (feeds Validation Architecture)

- **Docs build:** `npm --prefix /home/coder/repos/bbj-language-server/documentation run build` writes `documentation/build` and `.docusaurus` (both gitignored per `documentation/.gitignore`). Baseline run on Node v24.20.0 with `--out-dir` to the scratchpad succeeded in about 5 s ("Generated static files"), emitting only a non-critical CWD warning. `onBrokenLinks: 'throw'` makes a bad internal link fail it. CI builds docs only on push to `main` [VERIFIED: .github/workflows/deploy-docs.yml:3-10, 37-39], so a local run is the only pre-merge gate.
- **Existing doc-drift guards:** none read `documentation/docs/` or `QA/`. A grep of `bbj-vscode/test` and `bbj-vscode/tools` for `documentation/docs`, `QA/`, `SMOKE-TEST`, `FULL-TEST` returned nothing, and the same grep over `bbj-intellij/src` returned nothing. `bbj-vscode/test/formatter-removal.test.ts` (13 tests, baseline green this session) constrains only: `bbj-vscode/README.md` must not contain `BBjCodeFormatter` (line 62-65), and `bbj-intellij/build.gradle.kts` must not contain `tools/formatter` (lines 121-124). `Lsp4ijVersionPinTest` reads `build.gradle.kts` and uses the first occurrence of `com.redhat.devtools.lsp4ij:` (Lsp4ijVersionPinTest.java:39, 52), so never write that string in `changeNotes`.
- **Source-guard tests that read other files** (`*SourceGuardTest`) read Java/XML sources, not docs; the changeNotes edit does not touch them.

## Section G - IntelliJ `changeNotes`, release notes and version

- **Current block** [VERIFIED: bbj-intellij/build.gradle.kts:65-78]: `changeNotes = """` … `<h3>0.1.0 - Initial Release</h3>` followed by a `<ul>` of nine `<li>` items … `""".trimIndent()`. Replace the whole string content.
- **Version source:** `version = providers.gradleProperty("version").getOrElse("0.1.0")` (line 9); real builds inject `-Pversion=…` (preview.yml:142, 153, 257; manual-release.yml:155, 161, 235). `gradle.properties` holds only `org.gradle.jvmargs`. The release version is unknown at write time, and VS Code's `package.json` is `0.16.13` while the workflow bumps it at release. **Do not put a version number in the new heading**; use a descriptive `<h3>` (for example "Formatting and Denumber now run on the BBj language server").
- **Content rules:** short HTML, `<h3>`, `<ul>`/`<li>`, no tables (D-02). Do not include `tools/formatter` or `com.redhat.devtools.lsp4ij:`.
- **Validation:** no test or Gradle task in the repo parses `changeNotes` HTML [VERIFIED: grep for `changeNotes` in both test trees returned nothing]. Whether the JetBrains Plugin Verifier (`verifyPlugin`, run only in the release workflow) warns on malformed notes is [ASSUMED]; keep the HTML trivially well formed. Local check: `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` (requires `bbj-vscode/out/language/main.cjs` for packaging tasks, not for `test`) [ASSUMED for the `test`-only path; `buildPlugin` depends on `test` per build.gradle.kts:48-50 and fails fast without the bundle per CLAUDE.md].
- **Release notes draft:** `.planning/phases/130-docs-migration/130-RELEASE-NOTES.md`. `manual-release.yml` builds the body with `gh release create … --generate-notes --notes "## Installation …"` [VERIFIED: manual-release.yml:297-318]; the user pastes the draft at release time. Order per CONTEXT specifics: large-first-diff warning and commit-first advice, difference table, before/after snippets, DENUM changes, requirements, settings changes.

## Common Pitfalls

### Pitfall 1: MDX parse failures from `<`, `{` outside code spans
**What goes wrong:** the docs build fails with an MDX error on a line such as ``bbj.formatter.<key>`` written without backticks or a `{bbj.home}` in plain text.
**Why:** Docusaurus 3 parses `.md` through MDX. **Avoid:** backticks around every placeholder. **Detect:** the build, run after every page.

### Pitfall 2: Dangling links to deleted anchors
`vscode/configuration.md:380` links `#bbjformatterjavapath`; deleting the javaPath section without rewriting the paragraph makes the build fail (broken links throw; anchors may only warn). **Avoid:** rewrite L379-383 in the same edit as the deletion.

### Pitfall 3: Writing the IF-closer story from FEATURES.md
See E5-1. The old CLI jar kept existing closers; the table row would misinform VS Code users. **Detect:** reproduce with `closers.bbj` before writing the row.

### Pitfall 4: QA rows a tester cannot execute in IntelliJ
See D2: Denumber is greyed on unnumbered or early-mixed files; samples with fewer than 3 numbered lines trigger nothing; format-on-save re-offers Denumber on every save. Write the expected result per IDE.

### Pitfall 5: Treating the format-with-BBjServices-stopped message as a formatting message
Formatting deliberately shows nothing of its own when interop is down; the visible text (if any) comes from the shared connection. Assert "file unchanged" for format and use Denumber for the explicit `BBjServices is not reachable.` text.

### Pitfall 6: Renumbering QA rows
Inserting rows mid-section shifts "row 20"/"row 18" references in the IntelliJ section and invalidates the dated copies testers keep. Append; replace row 25 in place.

### Pitfall 7: Hard-coding shortcuts that differ per platform
The current guide says `Shift+Alt+F` for Format Document. VS Code's built-in default is Shift+Alt+F on Windows, Shift+Option+F on macOS and Ctrl+Shift+I on Linux [ASSUMED: training knowledge, not checked this session]. Prefer command names ("Format Document", "Format Selection") and say "or your keybinding". IntelliJ Reformat Code is Ctrl+Alt+L / Cmd+Opt+L [ASSUMED].

### Pitfall 8: Closing keywords in commit bodies
The release-notes draft and docs will mention #507 and lsp4ij #381. Squash-merge concatenates commit bodies; any `Closes`/`Fixes` keyword would close an issue early (project memory). Use plain "see".

### Pitfall 9: Planning ids in shipped text
`D-NN`, `MIG-0N`, `129-VERDICT` must not appear in guides, QA rows, release notes or `build.gradle.kts`. A grep gate catches it (Section Validation).

## Code Examples

### QA row shape (copy the existing style)
```markdown
| 29 | Format document | 1. Open `examples/bbj-classes.bbj`<br>2. Run Format Document from the Command Palette or the editor context menu<br>3. Press Undo once | Step 2: the whole file is indented and nothing else about it changes; no message appears. Step 3: one Undo restores the original text | [ ] |
```
Existing rows end with `| [ ] |`, use backticks for literals and `<br>` between numbered steps [VERIFIED: QA/FULL-TEST-CHECKLIST.md rows 1-28].

### Guide page skeleton
```markdown
---
sidebar_position: 7
title: Formatting
---

# Formatting and Denumber

:::info
Formatting and Denumber need BBj 26.03 or later and a running BBjServices.
:::
```
(Source: Pattern 1 and 2 above; wording of the box is the planner's.)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| VS Code spawned a vendored `BBjCFCli.jar` with a local `java` (`bbj.formatter.javaPath`) | Server formats through bbj-ls `formatProgram` in BBjServices | v4.9 Phases 125/127 | Needs BBj 26.03+ and a running BBjServices; no offline formatting; faster (no JVM spawn) |
| Denumber ran `bbjlst` and replaced the file on disk | `bbj/denum` edits the open buffer, leaves it unsaved, shows the outcome | Phases 126/127 | Undo works; no disk write; needs BBjServices |
| IntelliJ had no formatter and no Denumber | LSP formatting (verdict `supported`), Denumber action, banner | Phases 128/129 | CRLF limitation (lsp4ij #381) |

**Deprecated/outdated:** `bbj.formatter.javaPath` (removed from the schema), `bbj.formatter.splitSingleLineIF` (deprecated alias, auto-migrated), the "denumber and replace" wording in VS Code docs.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Formatting with BBjServices stopped shows no formatting-specific message; the shared-connection `Failed to connect to the Java interop service…` error may or may not appear on a format-only action | Section A1, D2 | A QA row that requires or forbids the toast would be wrong; keep the row at "file unchanged" |
| A2 | VS Code default Format Document shortcut on Linux is Ctrl+Shift+I; IntelliJ Reformat Code is Ctrl+Alt+L / Cmd+Opt+L | Pitfall 7 | A wrong shortcut in the guide; avoid by naming commands |
| A3 | Docusaurus 3 default `onBrokenAnchors` is `warn` | Pattern 3 | A broken anchor might fail rather than warn; either way the build run catches it |
| A4 | `./gradlew test` in `bbj-intellij` runs without the built language-server bundle | Section G | The planner may need to build `bbj-vscode` first, as CLAUDE.md says for `build`/`buildPlugin` |
| A5 | The JetBrains Plugin Verifier does not reject plain `<h3>`/`<ul>` change notes | Section G | Low; the existing block already uses the same tags |
| A6 | IntelliJ shows plain `window/showMessage` (not only `showMessageRequest`) as a `BBj Language Server` balloon | Section A header | Wording of the IntelliJ column in the message table; the evidence (129-EVALUATION) covers `showMessageRequest` with and without buttons |

## Open Questions

1. **Reword D-03(a) IF closers and D-03(d) `indentWidth`?**
   - What we know: E5 shows the old jar kept closers and the extension's `indentWidth` default was already 2.
   - What's unclear: whether the user wants the note to keep the FEATURES.md framing for the Eclipse-plug-in audience.
   - Recommendation: write the verified VS Code-user differences (E5-1, E5-2); mention the plug-in framing nowhere.
2. **How to cite #507.**
   - What we know: the issue title is about jar provenance; the crash is attributed to it in PROJECT.md.
   - Recommendation: "(tracked under #507)", no closing keyword; one-line confirm with the user at plan check.
3. **Touch the root `README.md` (line 91) and IntelliJ `configuration.md`, optionally `description.html`?**
   - What we know: root README says formatting and Denumber are VS Code-only; IntelliJ `configuration.md` says all settings are on one page yet has no Formatter section; `description.html` feature list omits formatting. None is in CONTEXT's file list.
   - Recommendation: include the two small edits (README line, `## Formatter` pointer) since they would otherwise contradict the new guides; leave `description.html` (Marketplace text) alone unless the user asks. If out of scope, record it as a follow-up.
4. **Sidebar slot.** Recommendation 7 (no renumbering). Position 6 plus bumping `composers.md` is the alternative.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| BBjServices on `:5008` (bbj-ls with `formatProgram`/`denumProgram`) | Live "new" output (E3), DENUM message capture | yes | listening, answered format and denum calls 2026-10-04 | bbj-ls CHANGELOG examples (paired before/after) |
| Java (Temurin) | Running the old `BBjCFCli.jar` | yes | 25.0.4.1 | none needed |
| Old jar in git history | Old output | yes | commit `06c81df9^` | CHANGELOG "Before (Eclipse plug-in)" blocks |
| `tsx` | New-output script | yes | in `bbj-vscode/node_modules/.bin` | none |
| Node + docs `node_modules` | Docs build | yes | Node v24.20.0; docs deps installed (779 entries) | none |
| `gh` | Issue checks | yes | authenticated | `git log` only |
| Real IntelliJ / VS Code UIs | Executing the new QA rows | not exercised here | n/a | The QA rows are written for humans; verification is the checklist run at release, not this phase |

**Missing dependencies with no fallback:** none for the writing work.

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json`, so this section applies.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | No unit tests are added. Verification is grep gates, the Docusaurus build, and the existing vitest/JUnit guard suites |
| Config file | `documentation/docusaurus.config.ts` (`onBrokenLinks: 'throw'`); `bbj-vscode/vitest` defaults |
| Quick run command | `npm --prefix /home/coder/repos/bbj-language-server/documentation run build` |
| Full suite command | the quick command plus the grep gates below plus `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/formatter-removal.test.ts` |

### Phase Requirements → Verification Map
| Req ID | Behavior | Check Type | Command (all paths absolute) | Exists? |
|--------|----------|-----------|------------------------------|---------|
| MIG-01 | No guide describes the jar, javaPath or bbjlst denumbering | grep gate (expect no output) | `grep -rn -i -E "javaPath\|BBjCFCli\|BBjCodeFormatter\|formatter jar" /home/coder/repos/bbj-language-server/documentation/docs --include=*.md` | gate to run |
| MIG-01 | bbjlst appears only in Decompile contexts | grep review (every hit must be a Decompile line) | `grep -rn -i "bbjlst" /home/coder/repos/bbj-language-server/documentation/docs --include=*.md` | gate to run |
| MIG-01 | Stale "replace" wording for Denumber gone | grep gate (expect no output) | `grep -rn -i -E "denumber and replace\|replacing the file with editable" /home/coder/repos/bbj-language-server/documentation/docs --include=*.md` | gate to run |
| MIG-01 | The 26.03 requirement reaches all four prerequisite spots | grep count (each file must mention formatting or Denumber on the 26.03 bullet) | `grep -n -i "26.03" /home/coder/repos/bbj-language-server/documentation/docs/vscode/index.md /home/coder/repos/bbj-language-server/documentation/docs/vscode/getting-started.md /home/coder/repos/bbj-language-server/documentation/docs/intellij/index.md /home/coder/repos/bbj-language-server/documentation/docs/intellij/getting-started.md` | gate to run |
| MIG-01 | VS Code configuration page lists all 15 keys | script: compare package.json keys to the page | `node -e "const p=require('/home/coder/repos/bbj-language-server/bbj-vscode/package.json');const keys=Object.keys([p.contributes.configuration].flat()[0].properties).filter(k=>k.startsWith('bbj.formatter.'));const t=require('fs').readFileSync('/home/coder/repos/bbj-language-server/documentation/docs/vscode/configuration.md','utf8');const miss=keys.filter(k=>!t.includes(k));console.log(keys.length,'keys; missing:',miss)"` (expect 16 keys including the alias, `missing: []`) | gate to run |
| MIG-01 | IntelliJ page carries the CRLF admonition and the IntelliJ labels | grep | `grep -n -E "^:::(warning\|info)\|issues/381\|Line ending" /home/coder/repos/bbj-language-server/documentation/docs/intellij/formatting.md` | after Wave |
| MIG-01 | New pages exist and render, links resolve | docs build | `npm --prefix /home/coder/repos/bbj-language-server/documentation run build` (must print "Generated static files") | baseline green |
| MIG-02 | Release-notes draft exists with the required items | grep | `grep -c -i -E "first format\|commit\|labels\|blank line\|FI\|ENDIF\|line ending\|single-line-if\|#507\|26.03" /home/coder/repos/bbj-language-server/.planning/phases/130-docs-migration/130-RELEASE-NOTES.md` plus a human read | after Wave |
| MIG-02 | Snippets are real output | re-run the Section E recipe and diff against the pasted blocks | `diff` the saved tool output against the note's code blocks | after Wave |
| MIG-02 | `changeNotes` no longer says 0.1.0 and avoids guarded strings | grep | `grep -n -E "0\.1\.0 - Initial\|tools/formatter" /home/coder/repos/bbj-language-server/bbj-intellij/build.gradle.kts` (expect no output) | gate to run |
| MIG-03 | Smoke has 14 rows and full row 25 no longer mentions javaPath | grep | `grep -c -E "^\| [0-9]+ \|" /home/coder/repos/bbj-language-server/QA/SMOKE-TEST-CHECKLIST.md` (10 plus 4 new) and `grep -n "javaPath" /home/coder/repos/bbj-language-server/QA/FULL-TEST-CHECKLIST.md` (expect none) | gate to run |
| MIG-03 | Both IDEs and all required topics covered | grep review | `grep -n -i -E "format selection\|formatOnSave\|Actions on Save\|Denumber\|BBjServices" /home/coder/repos/bbj-language-server/QA/FULL-TEST-CHECKLIST.md` | after Wave |
| all | No planning ids leaked into shipped text | grep gate (expect no output) | `grep -rn -E "\bD-[0-9]{2}\b\|\bMIG-0[0-9]\b\|\b12[4-9]-[0-9]{2}\b\|\b130-[0-9]{2}\b" /home/coder/repos/bbj-language-server/documentation/docs /home/coder/repos/bbj-language-server/QA/SMOKE-TEST-CHECKLIST.md /home/coder/repos/bbj-language-server/QA/FULL-TEST-CHECKLIST.md --include=*.md` | gate to run |
| all | Existing guard tests unaffected | vitest | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/formatter-removal.test.ts` (13 passed at baseline) | green at baseline |

### Sampling Rate
- **Per task commit:** the relevant grep gate and, for any `documentation/` edit, the docs build (5 s).
- **Per wave merge:** all grep gates plus the docs build.
- **Phase gate:** full set above green, plus a human read of the three QA-row families against Section A.

### Wave 0 Gaps
- [ ] Save the evidence inputs and raw tool outputs next to the release notes (for example `130-FORMAT-EVIDENCE.md`) so the "real output" claim is checkable later.
- None for test infrastructure: no new test files are needed.

## Security Domain

> `security_enforcement` is not set to `false` in `.planning/config.json`, so this section is included. This is a documentation-only phase; the surface is small.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a (no auth change; Enterprise Manager login text is untouched) |
| V3 Session Management | no | n/a |
| V4 Access Control | no | n/a |
| V5 Input Validation | marginal | Docs and `changeNotes` are static, author-controlled text; no user input reaches them. Keep `changeNotes` plain HTML with no script, no remote resources |
| V6 Cryptography | no | n/a |

### Known Threat Patterns for this phase
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Leaking internal paths, tokens or host names in examples or evidence files | Information disclosure | Use `examples/` file names and invented data; do not paste real paths, EM credentials or log lines with secrets into docs, QA or release notes; the scratch scripts use only loopback `127.0.0.1:5008` |
| MDX/HTML injection via pasted tool output | Tampering | Put pasted formatter output in fenced code blocks only |
| Documentation that tells users to weaken settings (for example disabling Workspace Trust) | Elevation | Not applicable; the docs only restate existing settings |

## Sources

### Primary (HIGH confidence, read this session)
- `/home/coder/repos/bbj-language-server/bbj-vscode/src/language/bbj-format-service.ts`, `bbj-denum-service.ts`, `denum-command.ts`, `denum-notifications.ts`, `bbj-formatting-handler.ts`, `bbj-format-settings.ts`, `format-settings-notification.ts`, `bbj-notifications.ts`, `java-interop-program-lane.ts`
- `/home/coder/repos/bbj-language-server/bbj-vscode/src/extension.ts` (lines 455-780), `denumber-command.ts`, `open-file-prompts.ts`, `denum-diagnostics-output.ts`, `line-numbering.ts`, `settings-migration.ts`
- `/home/coder/repos/bbj-language-server/bbj-vscode/package.json` (commands, menus, configuration)
- `/home/coder/repos/bbj-language-server/bbj-intellij/src/main/java/com/basis/bbj/intellij/` `FormatterSettingTexts.java`, `BbjSettingsComponent.java`, `BbjSettingsConfigurable.java`, `actions/BbjDenumberAction.java`, `BbjLineNumberedNotificationProvider.java`, `denum/DenumDiagnosticsPresenter.java`, `denum/LineNumbering.java`, `lsp/FormatterInitOptions.java`, `lsp/BbjLanguageClient.java`; `src/main/resources/META-INF/plugin.xml`, `description.html`; `build.gradle.kts`
- `/home/coder/repos/bbj-language-server/documentation/` package.json, docusaurus.config.ts, sidebars.ts, every guide page named in Section C; `.github/workflows/deploy-docs.yml`, `manual-release.yml`
- `/home/coder/repos/bbj-language-server/QA/` both checklists and TESTING-GUIDE.md
- `.planning/phases/129-intellij-verdict/129-VERDICT.md`, `129-EVALUATION.md` (cases C4a, C4b, C6b, W3, E1-E3), `125-CONTEXT.md` (D-01..D-06), `.planning/research/FEATURES.md`, `/home/coder/repos/bbj-ls/bbj-ls-formatter/CHANGELOG.md`
- Live runs on 2026-10-04: old jar (Java 25) and live `formatProgram`/`denumProgram` on `:5008`; docs build baseline; `formatter-removal.test.ts` baseline; `gh api` for issues #381 and #507
- Git history: commits `06c81df9`, `aed5c171`, `cbedc828`

### Secondary (MEDIUM confidence)
- Docusaurus admonition names `note`, `tip`, `info`, `warning`, `danger` [CITED: docusaurus.io/docs/markdown-features/admonitions]; consistent with the `:::note` already in the repo

### Tertiary (LOW confidence, flagged in the Assumptions Log)
- Platform shortcuts, Docusaurus anchor default, `./gradlew test` without the bundle, Plugin Verifier on change notes

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - the toolchain is fixed and a baseline build ran
- Message texts and settings: HIGH - read from source with line numbers; peer wording captured live
- Docs inventory: HIGH - every page read; line numbers current as of this session's HEAD
- Old-versus-new evidence: HIGH for what was run; the recipe is re-runnable; one framing correction (E5)
- IntelliJ balloon rendering of every message kind: MEDIUM - covered by the Phase 129 evaluation for the offer and the info message, not re-run
- Pitfalls: HIGH

**Research date:** 2026-10-04
**Valid until:** about 2026-11-03 for the facts above (the guides and checklists are edited by this phase, so re-read line numbers before editing; the message strings change only if Phases 124-129 are reopened)
