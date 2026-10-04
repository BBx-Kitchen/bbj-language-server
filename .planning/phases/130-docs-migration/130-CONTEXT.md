# Phase 130: Docs & Migration - Context

**Gathered:** 2026-10-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Written material only, describing what Phases 124-129 shipped. This phase delivers:

- the VS Code and IntelliJ user guides (`documentation/docs/vscode/`, `documentation/docs/intellij/`)
  covering formatting, Format Selection, format-on-save, DENUM, the 15 settings, the BBj 26.03
  requirement and the IntelliJ verdict (MIG-01)
- a migration note for the release, drafted as release notes (MIG-02)
- the QA smoke and full checklists (`QA/`) for both IDEs (MIG-03)

The only code-adjacent change is the IntelliJ `changeNotes` text in `bbj-intellij/build.gradle.kts`.
No language-server, extension or plugin behaviour changes.

</domain>

<decisions>
## Implementation Decisions

### Carried forward (not re-asked)
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

### Migration note (MIG-02)
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

### Guide structure (MIG-01)
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

### Known-issue prominence
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

### QA checklists (MIG-03)
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and scope
- `.planning/REQUIREMENTS.md` §"Docs & migration (MIG)" — MIG-01..03
- `.planning/ROADMAP.md` §"Phase 130: Docs & Migration" — goal and the 3 success criteria

### What shipped (source of truth for the docs)
- `.planning/phases/129-intellij-verdict/129-VERDICT.md` — verdict `supported`, known issues, `eol_note` text
- `.planning/phases/129-intellij-verdict/129-EVALUATION.md` — per-case IntelliJ behaviour (Reformat, selection, Actions on Save, CRLF)
- `.planning/phases/127-vs-code-cut-over/127-CONTEXT.md` — VS Code Denumber/prompt/settings migration decisions
- `.planning/phases/128-intellij-denum/128-CONTEXT.md` — IntelliJ Denumber action, banner, console diagnostics
- `.planning/phases/126-ls-denum/` and `.planning/phases/125-ls-formatting/` CONTEXT/SUMMARY files — message cadence, DENUM outcomes, format-path Denumber offer
- `bbj-vscode/package.json` — the 15 `bbj.formatter.*` keys, defaults, enum descriptions, `bbj.denumber.promptOnOpen`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/FormatterSettingTexts.java` and `BbjSettingsComponent.java` — IntelliJ Formatter section labels, tooltips, restart note
- `bbj-vscode/src/language/bbj-format-service.ts`, `bbj-formatting-handler.ts`, `bbj-denum-service.ts`, `denum-command.ts`, `format-settings-notification.ts` — exact user-visible message texts for the message tables (D-07)

### Migration note sources
- `.planning/research/FEATURES.md` §"Old versus new output (what users will notice)" — the visibility-ordered difference table (derived from `/home/coder/repos/bbj-ls/bbj-ls-formatter/CHANGELOG.md`)
- `/home/coder/repos/bbj-ls/bbj-ls-formatter/CHANGELOG.md` — primary source for output differences (sibling repo)
- `.github/workflows/manual-release.yml` — how the GitHub release body is built (not changed)
- `bbj-intellij/build.gradle.kts` — `changeNotes` block to replace (D-02)

### Files changed
- `documentation/docs/vscode/{index,getting-started,features,commands,configuration}.md` + new `formatting.md`
- `documentation/docs/intellij/{index,getting-started,features,commands}.md` + new `formatting.md`
- `QA/SMOKE-TEST-CHECKLIST.md`, `QA/FULL-TEST-CHECKLIST.md`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.planning/research/FEATURES.md` difference table: already ordered by visibility, with settings named.
- `129-VERDICT.md` `eol_note`: ready-made CRLF warning text, already used on the IntelliJ settings page.
- `bbj-vscode/package.json` `markdownDescription`/`enumDescriptions`: paraphrased setting texts (127 D-11).

### Established Patterns
- Docusaurus pages use front matter `sidebar_position` + `title`. Each guide is a folder with
  `_category_.json`. Prerequisite bullets already say "BBj 26.03 or higher for live compiler
  diagnostics" in both guides' `index.md` and `getting-started.md`.
- QA checklists are Markdown tables: `| # | Test | Steps (<br>-separated) | Expected | Result |`. The
  full checklist has separate "VS Code - LSP Features" and "IntelliJ IDEA - LSP Features" sections.

### Current state found while scouting
- The IntelliJ guide has no mention of formatting or DENUM.
- VS Code `configuration.md` still documents `bbj.formatter.javaPath` (deprecated entry, sample JSON,
  machine-scope note) and only 4 formatter keys. `features.md` lists 4 options. `commands.md` lines
  ~69-92 and ~255 describe the Denumber/format paths and mention javaPath.
- `QA/FULL-TEST-CHECKLIST.md` row 25 tests `bbj.formatter.javaPath`.
- IntelliJ `changeNotes` is a stale "0.1.0 - Initial Release" block.

### Integration Points
- Docs deploy via `.github/workflows/deploy-docs.yml`. Run the `documentation/` build to catch broken links/MDX.

</code_context>

<specifics>
## Specific Ideas

- The release-notes draft opens with the large-first-diff warning and the commit-first advice, then the
  difference table, then the before/after snippets, then DENUM, requirements and settings changes.
- The IntelliJ format-on-save path is spelled out because users looked for it on the BBj settings page
  (verdict W4).

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

### Reviewed Todos (not folded)
- Signature-help/snippet peer-name escaping, Windows IntelliJ Node download progress, lsp4j 1.0 in
  bbj-ls, vscode-jsonrpc 9, vitest 5, nested Java classes from bbj-ls, skipping syntax checks on
  line-numbered programs. All matched on generic keywords only; none is documentation work.

</deferred>

---

*Phase: 130-docs-migration*
*Context gathered: 2026-10-04*
