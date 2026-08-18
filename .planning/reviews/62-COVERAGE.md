# Phase 62 Coverage — bbj-vscode/src/ (outside language/), syntaxes/, language-configuration JSONs (RVW-02, RVW-03, SEC-01, SEC-02)

**Swept tree:** branch `v4.0-stability-and-quality` at commit `67a0600e95f032954fb13c38c26d0250601f87d3` — recorded once for the whole phase (D-15); not re-anchored per plan, so every plan in this file describes the same tree.

**Governing standard:** `.planning/reviews/INVENTORY.md` — the single immutable contract for Phases 61-69. Not edited by this phase.

**Dedup source:** INVENTORY's Frozen Open-Issue Snapshot (15 issues, queried 2026-08-17 via `gh issue list --state open --limit 60`). Phase 69 re-queries the tracker live immediately before filing, so this snapshot is not re-verified live at sweep time.

**Slice size:** 5 unit rows × 8 dimensions = **40 cells** (**35** `applies`, **5** `n/a`).

**Recording shape:** inherited unchanged from `.planning/reviews/61-COVERAGE.md` (Phase 62 D-03) — no new format checkpoint is spent re-deriving it. Phase 62 adds exactly two shape elements beyond that frozen shape: `### SEC-01/SEC-02 Surface Handoff` under `RU-62-04` (D-08), structurally mirroring `61-COVERAGE.md`'s `### SEC-06 Trust Boundary`; and live D7 cells whose IntelliJ-side observations route through the `Cross-unit referrals` subsection (D-05) rather than being asserted as local findings, since Phase 61 had no worked D7 example (D7 was `n/a` for every Phase 61 unit).

## Applicability Grid — Phase 62 slice

Cells below record applicability exactly as INVENTORY's grid states it (this table does not change as plans execute); the recorded pass/fail verdict for each live dimension lives in the matching unit's own `### Cells` block further down, so a coverage claim stays adjacent to its evidence (D-09) rather than being flattened into this summary table.

| Unit | D1 Security | D2 Correctness | D3 Performance | D4 Maintainability | D5 Test coverage | D6 Dependency health | D7 Cross-IDE parity | D8 Doc accuracy |
|---|---|---|---|---|---|---|---|---|
| `RU-62-04` | applies | applies | applies | applies | applies | n/a — R-D6-CENTRAL | applies | applies |
| `RU-62-01` | applies | applies | applies | applies | applies | n/a — R-D6-CENTRAL | applies | applies |
| `RU-62-03` | applies | applies | applies | applies | applies | n/a — R-D6-CENTRAL | applies | applies |
| `RU-62-05` | applies | applies | applies | applies | applies | n/a — R-D6-CENTRAL | applies | applies |
| `RU-62-02` | applies | applies | applies | applies | applies | n/a — R-D6-CENTRAL | applies | applies |

**No file-exception rows.** Phase 62 has none: `setopts-composer-webview.ts`'s D4 asymmetric baseline is recorded inside INVENTORY's `RU-62-04` block as a qualifier on the existing `applies` D4 cell, not as a separate grid row — adding one would break the D-14 cell-total gate below. Unlike Phase 61 (where D7 was `n/a — R-D7-SHARED-LS` for every unit), **D7 is live for all five units here** — the single largest new obligation this phase carries relative to Phase 61.

## D-14 Cell-Total Gate

Expected totals for this phase's slice of INVENTORY's Applicability Grid: **35 `applies`, 5 `n/a`, 40 total** (5 unit rows × 8 dimensions, no file-exception rows).

Re-derived directly from `.planning/reviews/INVENTORY.md` rather than restated, by the following awk pass over the five `RU-62-0[1-5]` grid rows:

```bash
awk '/^\| `RU-62-0[1-5]` \|/ {a+=gsub(/applies/,"applies"); n+=gsub(/n\/a/,"n\/a")} END{print a, n, a+n}' .planning/reviews/INVENTORY.md
```

**Output:** `35 5 40`

This matches the stated totals. Per D-14: if this re-derivation ever disagrees with the stated totals, that disagreement is itself a defect to surface, not a number to quietly adopt. Plan `62-05` re-runs this gate, together with the 22-file tree enumeration, as the phase's closing check.

## Stopping Rule & Write Contract

**Stopping rule.** A unit's sweep is complete when: (i) each of its 7 live `applies` cells carries a verdict (`pass`/`fail`) plus a written line naming the concrete checks applied; (ii) every file in the unit's file list is named at least once inside that unit's own section — in a check line or in a finding's `location:` — so coverage is file-granular, not merely unit-granular; and (iii) every candidate claim raised during the sweep is either promoted to a finding record clearing its evidence tier, or written under that unit's `Not-reproducible dispositions` subsection with its reason. Once (i)-(iii) hold, the unit is done and no further reading is licensed. This three-part rule is Phase 61's rendered shape, carried forward unchanged and adjusted only for this phase's 7 live dimensions (D7 is live here, unlike Phase 61's 6).

**Write contract.** Plans `62-02`..`62-05` each fill exactly one unit section below and touch nothing else — no fragment files, no assembly plan, no whole-file rewrite, and no rewording of a carried-forward `n/a` reason (D-03). Ordering across this shared file is enforced structurally by the wave dependency chain (D-04), not by an assumption about executor behavior: one plan per wave, waves 1-5, each plan's `depends_on` naming its predecessor in D-02's risk-rank order (`RU-62-04` → `RU-62-01` → `RU-62-03` → `RU-62-05` → `RU-62-02`).

**Placeholder.** Every not-yet-recorded live-dimension cell line ends with the single lowercase word `pending`. This is mechanically checkable at every wave.

**D-03: no new format checkpoint.** Phase 61's D-05 checkpoint already approved this recording shape (`61-COVERAGE.md`'s `### Cells` line format, the `n/a` verbatim carry-forward presentation, the 13-field fenced finding-record shape, and the per-unit sub-blocks). Phase 62 inherits it directly rather than re-litigating it; the two additions named in the header above (`### SEC-01/SEC-02 Surface Handoff`, D7 cells routing IntelliJ-side observations through the `Cross-unit referrals` subsection) are defined by this plan's own action text (D-05, D-08), not discovered at a checkpoint.

**D-09 checkpoint: approved.** The public-repo disclosure rendering in `## RU-62-04` below — its two `critical`/`high`-eligible D1 records (`P62-D1-001`, `P62-D1-002`) and its `### SEC-01/SEC-02 Surface Handoff` — was reviewed against D-09's two-tier rule and **approved as written, with no revisions** (plan `62-01` Task 3, `checkpoint:decision`, option `approve`). Rationale recorded with the approval: none of the 5 `RU-62-04` findings is rated `critical` or `high` — both D1 findings (`P62-D1-001`, `P62-D1-002`) are rated `low`, and the two `medium` findings (`P62-D2-001`, `P62-D4-001`) are not D1-primary — so D-09's redaction tier is not actually triggered by this unit; every finding falls under D-09's "everything else: full concrete detail" branch, which is what was written. Both D1 findings are hardening gaps recorded alongside an explicit no-current-injection-path conclusion (`### SEC-01/SEC-02 Surface Handoff` fact (1): no editor-selection, document-text, `config.bbx`, workspace-path or catalog value reaches any of the four `getHtml()` strings), so nothing published here is exploitable, and the `file:line` anchors are precisely what Phase 67 needs to apply the fixes. Per D-03 this approved shape is now frozen: plans `62-02`..`62-05` copy it unchanged and apply the same disclosure tier to their own D1 records.

## Exclusion reasons carried forward

Each block below is copied verbatim from `.planning/reviews/INVENTORY.md` §"Exclusion reasons" — not reworded, not re-derived.

**R-D6-CENTRAL** (5 cells in this slice — one `D6` cell per unit row):

> "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."

**Identity check:** 5 = 5, matching the 5 `n/a` cells in this slice.

No `R-D7-SHARED-LS` block applies here: D7 is live for all five Phase 62 units (unlike Phase 61, where the language-server binary was shared code with no second implementation to compare against). No `.bbl`-style exclusion markers exist in this phase — Phase 62 has no data-catalog files.

## RU-62-04 — Composer webview HTML generators

**Files (4 / 1,533 LOC):**
- `bbj-vscode/src/msgbox-composer-webview.ts` (373)
- `bbj-vscode/src/addwindow-composer-webview.ts` (408)
- `bbj-vscode/src/addchildwindow-composer-webview.ts` (431)
- `bbj-vscode/src/setopts-composer-webview.ts` (321)

**Risk rank:** 1 of 5 Phase 62 units — the largest LOC in the phase and the entire SEC-01 attack surface (webview HTML generation); `bbj-vscode/package.json` declares no `customEditors` contribution (confirmed: `grep -c 'customEditors' bbj-vscode/package.json` → `0`), so these four modules are the complete HTML-generation surface with no fifth generator.
**Sweep method (D-08):** full read.
**Owning plan:** 62-01 (this plan) — Task 1 (D1, D2, D3, D7, tier `repro`/repro-equivalent) and Task 2 (D4, D5, D8, tier `trace`).

### Cells
- D1 Security — fail — Checked, per generator, every value interpolated into the returned HTML string and its origin: `getHtml(webview)` in all four files takes only `webview` as a parameter and interpolates exactly two values into the template — a freshly generated `nonce` and `webview.cspSource` (both self-generated/VS-Code-supplied, never editor-selection/document-text/config.bbx/workspace-path data); no form field, catalog value, or message payload reaches the HTML string itself (confirmed by reading all four `getHtml()` bodies in full — msgbox-composer-webview.ts:122-364, addwindow-composer-webview.ts:163-399, addchildwindow-composer-webview.ts:169-422, setopts-composer-webview.ts:133-312 — form values only reach the DOM later via `postMessage` + `.value`/`.textContent` assignment, one `innerHTML` exception at setopts-composer-webview.ts:240 using only the static `BYTE_GROUPS` catalog constant from setopts-catalog.ts:35, not user/document input). Checked the `Content-Security-Policy` each file emits via its `<meta http-equiv="Content-Security-Policy" content="${csp}">` tag (`default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'`, byte-identical across all four — msgbox-composer-webview.ts:124-128, addwindow-composer-webview.ts:165-169, addchildwindow-composer-webview.ts:171-175, setopts-composer-webview.ts:135-139) — restrictive (`default-src 'none'` blocks img/connect/frame by default) but `style-src` grants `'unsafe-inline'`. Checked nonce freshness and application: `getNonce()` is called once per `getHtml()` invocation (once per panel open, not reused) and applied to the panel's single `<script nonce="${nonce}">` tag, but is built from `Math.random()` (msgbox-composer-webview.ts:366-373, byte-identical in the other three at addwindow-composer-webview.ts:401-408, addchildwindow-composer-webview.ts:424-431, setopts-composer-webview.ts:314-321) — not a CSP-appropriate CSPRNG. Checked panel options: all four set `{ enableScripts: true, retainContextWhenHidden: true }` with no `localResourceRoots` override (default applies; none of the four loads a local resource via `asWebviewUri`, so this is inert). Checked every `onDidReceiveMessage` handler (msgbox-composer-webview.ts:82, addwindow-composer-webview.ts:108, addchildwindow-composer-webview.ts:113, setopts-composer-webview.ts:70): none performs runtime shape/type/range validation on `msg.payload` before passing it to `build()` and, on the insert/apply path, into a `vscode.WorkspaceEdit` applied to the user's document. Checked whether `setopts-composer-webview.ts`'s hex round-trip can be driven to emit invalid output: `parseVector()` (setopts-catalog.ts:133-140) rejects non-hex and over-length input outright (regex-gated, returns `undefined`) and `setRawTail()` (setopts-catalog.ts:213-220) no-ops on a rejected parse, so a malformed `rawTail` cannot corrupt the vector. 2 findings recorded: P62-D1-001, P62-D1-002.
- D2 Correctness & error handling — fail — Checked the three D-11-mandated concurrency checks by name. (1) Message-after-disposal: `panel.dispose()` synchronously tears down the webview in all four files (msgbox-composer-webview.ts:112,116; addwindow-composer-webview.ts:131,135; addchildwindow-composer-webview.ts:136,140; setopts-composer-webview.ts:101,105), and every `postMessage` call in these files originates from inside the same `onDidReceiveMessage` callback in direct response to a webview-originated message, which cannot arrive once the webview is torn down — no reproducible after-disposal message-processing defect found. (2) Second instance opened while the first is live: no module-level registry/singleton exists in any of the four files — each `openXxxComposerPanel()` call creates an independent `vscode.window.createWebviewPanel(...)` with its own closure over `insertUri`/`insertPosition`/`target`, so two simultaneously open panels of the same composer type share no mutable state and cannot race on the same disposable; confirmed safe by tracing all four `open*Panel()` functions in full. (3) `onDidDispose` release completeness: **none of the four files registers `panel.onDidDispose(...)` at all** (confirmed: zero matches for `onDidDispose` across all four files) — see P62-D2-001 below. Checked absent/empty/malformed initial state: all four provide safe defaults (`arg?.initial ?? {...}` in msgbox-composer-webview.ts:64-67; `{...DEFAULT_INITIAL, ...(arg?.initial ?? {})}` in addwindow-composer-webview.ts:89 and addchildwindow-composer-webview.ts:94; `initialSelection(original)` returns an all-empty `PanelSelection` when `original` is `undefined` in setopts-composer-webview.ts:123-131) — no defect. Checked `await vscode.workspace.applyEdit(edit)` in every insert/apply handler for an unhandled-rejection risk — `applyEdit` resolves to a boolean and does not reject under the code paths reachable here (no attacker-influenced `Uri.parse` input — `target`/`arg` are server-computed, not webview-payload-derived). 1 finding recorded: P62-D2-001.
- D3 Performance & resource use — pass — Checked whether the full HTML string is rebuilt on every state change or only at panel creation: `panel.webview.html = getHtml(panel.webview)` is assigned exactly once, immediately after `createWebviewPanel`, in all four files (msgbox-composer-webview.ts:76, addwindow-composer-webview.ts:98, addchildwindow-composer-webview.ts:103, setopts-composer-webview.ts:66) — the `'change'` handler only sends a small `preview` payload via `postMessage`, never re-renders `.html`. Checked whether any message handler recomputes an unbounded structure per keystroke: the `'change'` handlers call the shared preview functions (`msgboxPreview`/`addwindowPreview`/`addchildwindowPreview`/`setoptsPreview`) over option catalogs of at most ~70 static entries with no nested loop over document or workspace content — no quadratic or unbounded cost found. Checked the cost of the largest generated markup body (`addchildwindow-composer-webview.ts` at 431 lines, including its static `<style>` block) relative to how often it is regenerated — once per panel open, never per keystroke — negligible. Checked whether panels/listeners/disposables accumulate across repeated open/close cycles: they do, but the mechanism (unreleased `context.subscriptions` entries) is the same root cause as P62-D2-001, recorded there as a D2-primary/D3-secondary finding rather than duplicated here — no separate D3-primary finding. 0 findings recorded.
- D4 Maintainability & code smells — fail — Ran a programmatic structural diff across the four generators, per D-12 (mechanical, not eyeball): `git diff --no-index --numstat` pairwise between the four `*-composer-webview.ts` files, plus a same-body md5 check on the two smallest fully-shared functions. `getNonce()` is **byte-identical** across all four files (`sed -n '/^function getNonce/,/^}/p' <file> | md5sum` → `2703b8e54057ff248b28ad9ca453c5e7` in every one of the four), and the 5-line CSP-array construction (`const csp = [...]`) is likewise **byte-identical** across all four (md5 `308a7d4ffd99b94d598341ca988dd267` in every file) — neither is extracted into a shared helper module; both are copy-pasted verbatim four times (32 and 20 duplicated lines respectively). Pairwise `git diff --no-index --numstat`: addwindow-composer-webview.ts↔msgbox-composer-webview.ts `191 226` (of 408/373 lines — roughly half the shorter file is unchanged relative to the other); addchildwindow-composer-webview.ts↔msgbox-composer-webview.ts `189 247` (of 431/373 lines); addchildwindow-composer-webview.ts↔addwindow-composer-webview.ts `84 107` (of 431/408 lines — only 84 of addchildwindow's 431 lines need removing to reach addwindow's shape, ~80% structural overlap between those two, reflecting their shared flags/event-mask/schematic-preview design). Applying the D-15-confirmed asymmetric baseline: `setopts-composer-webview.ts` has **no `-composer.ts` sibling** — its codegen logic lives in `setopts-catalog.ts`, which belongs to `RU-62-03`, not this unit — so its own `-composer.ts`-comparison baseline (relevant to `RU-62-03`'s own D4 cell) is 3 files, not 4; against the other three `*-webview.ts` files here it diffs more (setopts↔msgbox `237 185`, setopts↔addwindow `254 167`, setopts↔addchildwindow `276 166`, of 321 lines), consistent with its structurally different per-byte-catalog UI. Beyond duplication: checked whether any generator's HTML-emitting function has crossed into god-function territory (no — `getHtml()` is a single large but flat template-literal return in each file, not branching logic); whether dead branches or unreferenced markup exist (none found); and whether the four files agree on a single panel-creation/disposal convention (three of four agree; all four omit `onDidDispose`, see P62-D2-001). 1 finding recorded: P62-D4-001.
- D5 Test coverage gaps — fail — Established by enumeration, not assumption: `ls bbj-vscode/test/ | grep -i compos` → `addchildwindow-composer.test.ts`, `addwindow-composer.test.ts`, `composer-commands.test.ts`, `msgbox-composer.test.ts`; `ls bbj-vscode/test/ | grep -i setopt` → `setopts-catalog.test.ts`; `grep -rl 'webview\|Webview' bbj-vscode/test/` and `grep -rl 'createWebviewPanel\|composer-webview' bbj-vscode/test/` both return **nothing**. So all five existing composer test files exercise only `RU-62-03`'s pure logic layer (`msgbox-composer.ts`, `addwindow-composer.ts`, `addchildwindow-composer.ts`, `setopts-catalog.ts`) and the LS-side `composer-commands.ts` handlers — **none of the four `*-composer-webview.ts` files is imported or exercised by any currently-passing test.** Concretely untested: `getHtml()`'s CSP/nonce construction in all four files, every `onDidReceiveMessage` handler's message-to-edit path, and the disposal/subscription-lifecycle gap (P62-D2-001) — no test would have caught it or would catch a regression of it. 1 finding recorded: P62-D5-001.
- D6 Dependency health — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- D7 Cross-IDE parity — pass — The parity question here is equivalence of the generated BBj code, not of the UI toolkit (VS Code webview vs. IntelliJ native Swing). Checked, for msgbox/addwindow/addchildwindow, whether a divergent codegen path exists to compare: it does not — `bbj-vscode/src/language/composer-commands.ts:69,129,167` registers `bbj/composer/{msgbox,addwindow,addchildwindow}/preview` as thin wrappers directly around the same `msgboxPreview`/`addwindowPreview`/`addchildwindowPreview` functions these four VS Code webview files call locally (msgbox-composer-webview.ts:80, addwindow-composer-webview.ts:102, addchildwindow-composer-webview.ts:107); `MsgboxComposerDialog.java:209` (`server.msgboxPreview(new MsgboxPreviewParams(input))`), `AddWindowComposerDialog.java:238`, and `AddChildWindowComposerDialog.java:247` call those exact same LS handlers over LSP4IJ — confirmed by `ComposerModels.java:1-14`'s own doc comment ("The BBj-side TypeScript is the single source of truth for the flag/hex arithmetic (#433); these classes only carry the JSON across LSP4IJ") and by its DTOs mirroring the TS param/result shapes field-for-field (e.g. `MsgboxPreviewInput` vs. VS Code's `Selection`). Catalogs (`bbj/composer/catalogs`, composer-commands.ts:53-57) are likewise LS-served to both IDEs. So for three of the four generators there is no second, divergent BBj-codegen implementation to compare — a shared single source of truth, not a coincidental match. Checked SETOPTS separately: `grep -c setopts bbj-vscode/src/language/composer-commands.ts` → `0` (no `bbj/composer/setopts/*` LS command exists), and no `SetoptsComposerDialog.java` exists under `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/` (confirmed via `ls`), and `ComposerLauncher.java` (grepped for `Setopts`/`SetOpts`) has zero references — SETOPTS has no IntelliJ counterpart at all. This is a genuine, IntelliJ-side parity divergence, not a VS Code-side defect, so per D-05 it is **not** recorded as a `P62-D7-*` finding here; see the Cross-unit referrals subsection below, addressed to `RU-63-04`. 0 findings recorded.
- D8 Comment & doc accuracy — pass — Checked every file-level and function-level comment in all four generators against the code just read, including every claim about escaping/validation/single-source-of-truth: msgbox-composer-webview.ts:1-13's "no flag math / button labels are duplicated here" and "Single source of truth: ... which the IntelliJ client reaches over the LS (#433)" — accurate, confirmed by the D7 trace above; addwindow-composer-webview.ts:1-14 and addchildwindow-composer-webview.ts:1-15 carry the identical claim, equally accurate; setopts-composer-webview.ts:1-14's claim that the round-trip is "lossless (unknown bits, unmodeled bytes and the original digit count all survive)" — accurate, confirmed by `SetOptsVector.digitCount` being preserved through `parseVector`/`encodeVector`/`setRawTail` (setopts-catalog.ts:120-131,145-146,213-220). Checked `addchildwindow-composer-webview.ts:151-154`'s comment on apply-order safety for `flagsRange`/`eventMaskRange` edits — the comment itself already notes "VS Code applies WorkspaceEdit entries per range, so distinct positions are safe in either order," which the code's actual apply order (event mask first, then flags) does not contradict. Checked `CLAUDE.md`'s §Repository Structure and §Architecture against these four files: `CLAUDE.md` makes no positive claim about the composer webview subsystems at all (confirmed: no mention of `msgbox-composer-webview.ts`/`addwindow-composer-webview.ts`/`addchildwindow-composer-webview.ts`/`setopts-composer-webview.ts` anywhere in `CLAUDE.md`) — its silence is noted as a candidate D8 observation per this plan's own instruction, not promoted to a finding, since no positive claim it does make is contradicted by these four files. 0 findings recorded.

### SEC-01/SEC-02 Surface Handoff

**(1) What reaches the generated HTML.** Across all four generators, `getHtml(webview)` interpolates exactly two values into the returned HTML string: a freshly generated `nonce` (self-generated by `getNonce()`, not derived from any external input) and `webview.cspSource` (a VS-Code-internal, per-webview origin string, not attacker- or document-influenced). Confirmed by reading all four `getHtml()` bodies in full: msgbox-composer-webview.ts:122-364, addwindow-composer-webview.ts:163-399, addchildwindow-composer-webview.ts:169-422, setopts-composer-webview.ts:133-312. **No editor-selection, document-text, `config.bbx` content, workspace-path, or catalog value ever reaches the HTML string returned by any of the four `getHtml()` functions.** Those values instead reach the *webview's DOM* — after load, via `postMessage` — and are written in with safe, non-HTML-parsing DOM APIs: `.value =` (e.g. msgbox-composer-webview.ts:304-306, addwindow-composer-webview.ts:346-349, addchildwindow-composer-webview.ts:368-373, setopts-composer-webview.ts:289-291) and `.textContent =` (e.g. addwindow-composer-webview.ts:319, addchildwindow-composer-webview.ts:340). The one exception is a single `innerHTML` assignment at setopts-composer-webview.ts:240 (`legend.innerHTML = 'Byte ' + byteNo + ' <span class="byte-no">— ' + groups[byteNo] + '</span>';`), whose only externally-varying input, `groups[byteNo]`, is a value drawn from the static `BYTE_GROUPS` catalog constant (`setopts-catalog.ts:35`), never from document/workspace/message content — confirmed not a sink for untrusted data.

**(2) CSP posture, per webview.** All four files emit the identical directive set: `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'` (msgbox-composer-webview.ts:124-128, addwindow-composer-webview.ts:165-169, addchildwindow-composer-webview.ts:171-175, setopts-composer-webview.ts:135-139 — byte-identical text, confirmed by md5). `default-src 'none'` blocks image/connect/frame/font/media loads by default (none of the four generators needs any of those). `style-src` grants `'unsafe-inline'` (needed for the inline `<style>` block each file emits) alongside the webview's own origin. `script-src` allows only the single nonce'd inline `<script>` tag each file emits — no `'unsafe-inline'` for scripts, no external script source. The nonce is generated fresh per `getHtml()` call (once per panel open) via `getNonce()` (msgbox-composer-webview.ts:366-373, byte-identical in all four — `2703b8e54057ff248b28ad9ca453c5e7`), which draws from `Math.random()` rather than a CSP-appropriate CSPRNG — stated as a fact here; recorded as a finding at (1) below (`P62-D1-002`) because it is a hardening gap independent of whether an injection point currently exists. `webview.options` sets `{ enableScripts: true, retainContextWhenHidden: true }` in all four (no `localResourceRoots` override; inert, since none of the four loads a local resource via `asWebviewUri`).

**(3) Message handlers and their validation.** Every `onDidReceiveMessage` handler — msgbox-composer-webview.ts:82 (`'ready' | 'change' | 'insert' | 'cancel'`), addwindow-composer-webview.ts:108 (`'ready' | 'change' | 'insert' | 'cancel'`), addchildwindow-composer-webview.ts:113 (same four types), setopts-composer-webview.ts:70 (`'ready' | 'change' | 'apply' | 'cancel'`) — accepts a `{ type: string; payload?: <Shape> }` message typed only at compile time via a TypeScript interface annotation. **None performs a runtime shape, type, or value-range check on any field of `payload` before acting on it.** On `'change'`, the raw payload flows straight into `build()` (the shared preview logic in `RU-62-03`). On `'insert'`/`'apply'`, `build()`'s output (a BBj statement or hex string) is written into the user's live document via `vscode.WorkspaceEdit` (msgbox-composer-webview.ts:103-111, addwindow-composer-webview.ts:124-130 via `applyEdit()`, addchildwindow-composer-webview.ts:129-135 via `applyEdit()`, setopts-composer-webview.ts:86-99) — no handler validates `flags` is actually a numeric array, that string fields are strings, or bounds any numeric field. Recorded as `P62-D1-001`.

**(4) Blast radius through the extension host.** Through the handlers above, a message can reach: the user's currently open BBj document, via `vscode.workspace.applyEdit` (an insertion at a captured cursor position, or a replacement of a captured call/token range) — the only sink reached by any of the four files. None of the four spawns a process, reads/writes the filesystem directly, executes a VS Code command with message-supplied data, or stores a setting. The blast radius is therefore confined to text edits in the user's own open document; it does not reach the filesystem, a spawned process, or the IDE host process beyond that document edit.

`bbj-intellij/` was read only as far as the D7 comparison in this section and in the `### Cells` D7 line required (`ComposerModels.java`, `MsgboxComposerDialog.java` in full; `AddWindowComposerDialog.java`/`AddChildWindowComposerDialog.java`/`ComposerLauncher.java` grepped for the emitted-code construction only); no finding is located there (D-05).

### Findings

```
id:                P62-D1-001
unit:              RU-62-04
location:          bbj-vscode/src/msgbox-composer-webview.ts:82-119
dimension:         D1
secondary:         [D2]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace: onDidReceiveMessage(async (msg: { type: string;
                    payload?: Selection }) => {...}, undefined, context.subscriptions)
                    (msgbox-composer-webview.ts:82) types payload only via a compile-time TS
                    interface annotation, with zero runtime check of its shape, field types, or
                    value ranges before it reaches build(msg.payload) (line 99) and, on the
                    'insert' branch, before build()'s output is written into the user's document
                    via a vscode.WorkspaceEdit (lines 103-111). Identical pattern recurs verbatim
                    in addwindow-composer-webview.ts:108-138 (build() at 119, applyEdit() at
                    142-161), addchildwindow-composer-webview.ts:113-143 (build() at 124,
                    applyEdit() at 147-167), and setopts-composer-webview.ts:70-108
                    (toSelection() at 111-121 called via build() at 68, WorkspaceEdit at 86-99).
failure_scenario:  Because none of the four getHtml() strings interpolates any
                    editor-selection/document/config/workspace value (confirmed in the
                    SEC-01/SEC-02 Surface Handoff fact (1) above), there is no path today for
                    attacker-controlled content to reach postMessage with a hostile payload — the
                    gap is a defense-in-depth absence, not a currently exploitable injection. If a
                    future change adds interpolated or externally-sourced webview content, a
                    malicious message could reach build() and, via its output, the user's open
                    document with no server-side check standing between the message and the edit.
classification:    major
                    (1) touches 1 file: n/a — the fix (adding a runtime payload validator) is a
                    repeated single-file edit independently applicable to each of the 4 files —
                    (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass —
                    (4) regression-testable with vitest: pass — (5) reviewer can name the exact
                    edit (a small runtime shape guard per handler, e.g. a type-predicate before
                    build()): pass — (6) severity is `low` but primary dimension is D1: FAIL —
                    test (6) fails on the D1 primary-dimension clause alone, so classification is
                    `major` regardless of the other five tests (D-13's safety gate).
effort:            4
dedup:             none — #475 requests a new SETOPTS tri-state composer UX with IOR/AND-aware
                    codegen, not message-validation hardening on the existing webview boundary;
                    #385 concerns launching an external Graffiti Composer tool, unrelated to this
                    in-tree webview's message handling. Neither open issue overlaps this finding.
disposition:       major-refactor
```

```
id:                P62-D1-002
unit:              RU-62-04
location:          bbj-vscode/src/msgbox-composer-webview.ts:366-373
dimension:         D1
secondary:         []
severity:          low
evidence_tier:     repro
evidence:          getNonce() builds a 32-character token by indexing a 62-character alphabet
                    with Math.floor(Math.random() * chars.length) (msgbox-composer-webview.ts:
                    369-371) — a non-cryptographic PRNG. The result is the sole script-src
                    allowlist value in the emitted CSP (`script-src 'nonce-${nonce}'`, line 127)
                    and is written onto the panel's single inline <script nonce="${nonce}"> tag
                    (line 262). Identical construction, confirmed byte-identical by md5
                    (2703b8e54057ff248b28ad9ca453c5e7), recurs in
                    addwindow-composer-webview.ts:401-408, addchildwindow-composer-webview.ts:
                    424-431, and setopts-composer-webview.ts:314-321.
failure_scenario:  A CSP nonce's security property depends on being unguessable per page load;
                    Math.random() is not designed to resist state reconstruction from observed
                    outputs. Because no injection point into the generated HTML exists in these
                    four files today (SEC-01/SEC-02 Surface Handoff fact (1)), there is no current
                    path to exploit a predicted nonce — this is a CSP-hardening gap, not a live
                    vulnerability, and diverges from VS Code's own extension-guidelines
                    recommendation to use a cryptographically strong nonce generator.
classification:    major
                    (1) touches 1 file: n/a — same repeated single-file edit as P62-D1-001 —
                    (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass —
                    (4) regression-testable with vitest: pass — (5) reviewer can name the exact
                    edit (swap Math.random() for node:crypto's randomBytes/randomUUID): pass —
                    (6) severity is `low` but primary dimension is D1: FAIL — test (6) fails on
                    the D1 primary-dimension clause alone, so classification is `major`
                    regardless of the other five tests (D-13's safety gate).
effort:            2
dedup:             none — neither #475 (SETOPTS composer UX) nor #385 (external Graffiti Composer
                    launch) concerns nonce generation or CSP hardening in any of these four files.
disposition:       major-refactor
```

```
id:                P62-D2-001
unit:              RU-62-04
location:          bbj-vscode/src/msgbox-composer-webview.ts:82,112,116
secondary:         [D3]
dimension:         D2
severity:          medium
evidence_tier:     repro
evidence:          panel.webview.onDidReceiveMessage(handler, undefined, context.subscriptions)
                    (msgbox-composer-webview.ts:82) registers the message-handler Disposable on
                    the extension's own context.subscriptions array — drained only on extension
                    deactivation — rather than on a per-panel disposable scope. None of the four
                    files calls panel.onDidDispose(...) anywhere (confirmed: zero matches for
                    "onDidDispose" across all four files via grep). So whether panel.dispose()
                    runs from the 'insert' success path (line 112), the 'cancel' path (line 116),
                    or the user closing the panel's tab natively (VS Code disposes the panel and
                    webview but does not touch entries the extension itself pushed onto
                    context.subscriptions), the message-handler closure — holding context,
                    insertUri, insertPosition, target/arg, and the imported build/preview
                    functions — remains registered and reachable for the rest of the session.
                    Identical pattern at addwindow-composer-webview.ts:108,131,135;
                    addchildwindow-composer-webview.ts:113,136,140;
                    setopts-composer-webview.ts:70,101,105.
failure_scenario:  Opening and closing any of the four composers N times over a VS Code session
                    accumulates N leaked closures on context.subscriptions with no bound; each
                    holds a reference to a now-disposed vscode.WebviewPanel and, in EDIT mode, a
                    captured document Uri/position. Session-scoped memory growth, worse for
                    developers who use the Code-Action-driven edit flow (`Edit MSGBOX` /
                    `Edit addWindow flags` / `Edit addChildWindow flags` / `Edit SETOPTS`)
                    repeatedly against the same or different files in one session.
classification:    major
                    (1) touches 1 file: FAIL — the identical pattern recurs in all 4 files, and a
                    comprehensive fix (add panel.onDidDispose(() => {...}, undefined,
                    context.subscriptions) or scope the message-listener disposable to the panel
                    itself) needs to touch all 4, so test (1) fails on its own —
                    (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass —
                    (4) regression-testable with vitest: pass (assert context.subscriptions length
                    is unchanged after open+dispose, or that onDidDispose was registered) —
                    (5) reviewer can name the exact edit: pass — (6) severity is `medium` and
                    dimension is D2 (not D1): pass — test (1) alone already fails, so
                    classification is `major` per D-13 ("failing any one test makes it major").
effort:            4
dedup:             none — neither #475 nor #385 concerns webview panel lifecycle or subscription
                    management; no other frozen open issue names composer resource disposal.
disposition:       major-refactor
```

```
id:                P62-D4-001
unit:              RU-62-04
location:          bbj-vscode/src/msgbox-composer-webview.ts:366-373 (getNonce), msgbox-composer-webview.ts:124-128 (CSP array)
secondary:         []
dimension:         D4
severity:          medium
evidence_tier:     trace
evidence:          Mechanical structural diff (D-12): getNonce() is byte-identical across all
                    four *-composer-webview.ts files (md5 2703b8e54057ff248b28ad9ca453c5e7 at
                    msgbox-composer-webview.ts:366-373, addwindow-composer-webview.ts:401-408,
                    addchildwindow-composer-webview.ts:424-431, setopts-composer-webview.ts:
                    314-321 — 4x8 = 32 duplicated lines) and the 5-line CSP-array construction is
                    likewise byte-identical (md5 308a7d4ffd99b94d598341ca988dd267 at
                    msgbox-composer-webview.ts:124-128 and the equivalent block in the other
                    three — 4x5 = 20 duplicated lines); neither is factored into a shared helper.
                    `git diff --no-index --numstat` pairwise: addwindow<->msgbox "191 226" (of
                    408/373 lines), addchildwindow<->msgbox "189 247" (of 431/373), addchildwindow
                    <->addwindow "84 107" (of 431/408 — ~80% structural overlap, the closest
                    pair, reflecting their shared flags/event-mask/schematic design).
                    Asymmetric-baseline qualifier (D-15): setopts-composer-webview.ts has no
                    `-composer.ts` sibling of its own — its codegen lives in `setopts-catalog.ts`,
                    which belongs to `RU-62-03`, not this unit — so setopts diffs more heavily
                    against the other three *-webview.ts files here (setopts<->msgbox "237 185",
                    setopts<->addwindow "254 167", setopts<->addchildwindow "276 166", of 321
                    lines), consistent with its structurally different per-byte-catalog UI; this
                    is stated as a qualifier on this cell, not normalized away and not a 41st row.
failure_scenario:  n/a (D4 is a code-shape finding, not a runtime failure scenario) — the
                    duplication is a maintainability cost: a future CSP/nonce hardening fix (e.g.
                    P62-D1-002's remediation) must currently be applied identically in 4 places
                    with no shared source of truth, and the ~80% overlap between addwindow and
                    addchildwindow means most future flag/event-mask UI changes need a matching
                    edit in both files by hand, with drift risk between them.
classification:    major
                    (1) touches 1 file: FAIL — extracting a shared `webview-security.ts` helper
                    for getNonce()/CSP-array construction necessarily touches all 4 call sites —
                    (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass —
                    (4) regression-testable with vitest: pass — (5) reviewer can name the exact
                    edit: pass — (6) severity `medium`, dimension D4 (not D1): pass — test (1)
                    alone fails, so classification is `major` per D-13.
effort:            4
dedup:             none — neither #475 nor #385 concerns code duplication between the four
                    generator files. RU-62-03's own D4 cell (logic/UI-layer duplication, a
                    separate 3x`-composer.ts`x4x`-ui.ts` comparison) cross-references this finding
                    rather than restating it (D-12) — see plan 62-03.
disposition:       major-refactor
```

```
id:                P62-D5-001
unit:              RU-62-04
location:          bbj-vscode/test/ (absence) — the 4 files this finding covers are bbj-vscode/src/msgbox-composer-webview.ts, addwindow-composer-webview.ts, addchildwindow-composer-webview.ts, setopts-composer-webview.ts
secondary:         []
dimension:         D5
severity:          low
evidence_tier:     inherited
evidence:          Established by enumeration: `ls bbj-vscode/test/ | grep -i compos` ->
                    addchildwindow-composer.test.ts, addwindow-composer.test.ts,
                    composer-commands.test.ts, msgbox-composer.test.ts; `ls bbj-vscode/test/ |
                    grep -i setopt` -> setopts-catalog.test.ts; `grep -rl 'webview\|Webview'
                    bbj-vscode/test/` and `grep -rl 'createWebviewPanel\|composer-webview'
                    bbj-vscode/test/` both return nothing. All five existing composer test files
                    exercise only RU-62-03's pure logic layer and the LS-side composer-commands.ts
                    handlers — none imports or invokes any of the four *-composer-webview.ts
                    files. Concretely untested: getHtml()'s CSP/nonce construction (all 4 files),
                    every onDidReceiveMessage handler's message-to-WorkspaceEdit path (all 4
                    files), and the P62-D2-001 disposal/subscription-lifecycle gap — no test would
                    catch a regression of any of these.
failure_scenario:  A regression in any of P62-D1-001/002's redaction (message validation, nonce
                    strength) or P62-D2-001's dispose lifecycle would ship silently — `npm test`
                    is green today with zero webview-layer assertions, so FIX-03's "npm test
                    clean" gate cannot detect a future regression in this surface.
classification:    major
                    (1) touches 1 file: FAIL — comprehensive resolution requires a new test file
                    per generator (or per shared concern), touching more than 1 file —
                    (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass —
                    (4) regression-testable with existing harness: n/a (this finding *is* the
                    missing-test gap) — (5) reviewer can name the exact edit: pass (author
                    `*-composer-webview.test.ts` per generator using a minimal vscode-API mock) —
                    (6) severity `low`, dimension D5 (not D1): pass — test (1) alone fails, so
                    classification is `major` per D-13.
effort:            8
dedup:             none — neither #475 nor #385 concerns test coverage for the webview generator
                    files; no other frozen open issue names composer test gaps.
disposition:       major-refactor
```

### Not-reproducible dispositions

- **Tier failed: `repro` (D2).** Candidate claim: a rapid back-to-back `'insert'` (or `'insert'` immediately followed by `'cancel'`) message pair could race two concurrent `await vscode.workspace.applyEdit(edit)` calls, or call `panel.dispose()` twice, corrupting the edit or throwing. **Reason not recorded as a finding:** confirming the actual interleaving during the `await` window requires a live webview-message-injection harness driving concurrent `postMessage` calls and observing the result — that harness is explicitly deferred infrastructure per this phase's scope (`62-CONTEXT.md` `<deferred>`; any harness a specific finding demands is a Phase 67 deliverable). A static trace shows both handlers run to their first `await` synchronously on the single Node.js event-loop turn in which the message was delivered, and VS Code's extension host processes `onDidReceiveMessage` callbacks one at a time, which makes a true data race unlikely but does not itself confirm safety across the `await` boundary — left here rather than silently dropped, per RVW-06's drop-vs-disposition rule.

### Cross-unit referrals

- **RU-63-04** — `setopts-composer-webview.ts` (321 lines, `bbj-vscode/src/`) has no IntelliJ counterpart: `grep -c setopts bbj-vscode/src/language/composer-commands.ts` returns `0` (no `bbj/composer/setopts/*` LS command exists, unlike msgbox/addwindow/addchildwindow which are all LS-shared per the D7 cell above), no `SetoptsComposerDialog.java` exists under `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/` (confirmed via directory listing), and `ComposerLauncher.java` — grepped for `Setopts`/`SetOpts` — has zero references anywhere in its dispatch logic (contrast with its `openMsgbox`/`openAddWindow`/`openAddChildWindow` handlers at lines 90,118,139). `RU-63-04`'s own sweep should confirm whether this is a deliberate, documented scope decision or an unaddressed feature gap, and record its own D7 finding if the latter — this unit's own coverage records the divergent VS Code-side evidence above but locates no finding inside `bbj-intellij/` (D-05).

## RU-62-01 — Extension host & commands

**Files (3 / 1,805 LOC):**
- `bbj-vscode/src/extension.ts` (894)
- `bbj-vscode/src/Commands/CompilerOptions.ts` (506)
- `bbj-vscode/src/Commands/Commands.cjs` (405)

**Risk rank:** 2 of 5 Phase 62 units — the extension activation entry point; every command, composer launch and editor feature in this phase is wired through `extension.ts`.
**Sweep method (D-08):** full read.
**Owning plan:** 62-02.

### Cells
- D1 Security — fail — Checked every `child_process.exec()` call site in the unit and traced each interpolated command-string segment back to its origin: `Commands.cjs`'s `run()` (classpath `sscp` at line 263, entirely unquoted), `runWeb()` (line 109, `bbj.web.apps.<file>.name` and EM credentials quoted-but-unescaped), `compile()` (line 328, `buildCompileOptions()`'s 7-flag output joined bare with no wrapping quotes at all), `decompileInPlace`/`decompileReadonly` (home-derived `bbjlstBin()`), and `extension.ts`'s EM validate (line 415) and EM login (line 635) `exec()` calls — none applies shell-escaping or content validation to any interpolated value, and `CompilerOptions.ts`'s `validateOptions()` (lines 384-431) only checks option presence/dependency/conflict, never the shell-safety of a string/number value's content, before `buildCompileOptions()` (lines 438-479) emits it bare into a would-be command line. Checked reachability: `bbj.home`, `bbj.classpath`, `bbj.configPath`, `bbj.web.apps`, and all 7 string-typed `bbj.compiler.*` options are declared `"scope": "window"` with no `restricted`/`capabilities.untrustedWorkspaces` marker anywhere in `package.json` (confirmed: `grep -c untrustedWorkspaces bbj-vscode/package.json` → `0`), so a workspace's own committed `.vscode/settings.json` can set every one of them, including in an untrusted workspace. Also checked the caller-supplied `params` surface: `bbj.runBUI`/`bbj.runDWC` (extension.ts:676,683) fall back to `params.fsPath` when no editor is focused, and any registered VS Code command is globally invocable by any other extension in the same window via `vscode.commands.executeCommand`, widening the same unescaped-interpolation surface beyond workspace settings alone. Also checked EM token/credential handling per the plan's own checklist: the raw JWT is interpolated as a literal `exec()` argument (extension.ts:415) rather than passed through a non-shell API, and the debug-mode masking that redacts it before writing to the output channel (extension.ts:420,639) is a naive substring match against the same unescaped string, sharing the identical fragility. 2 findings recorded: P62-D1-003, P62-D1-004.
- D2 Correctness & error handling — fail — Checked whether `activate()` (extension.ts:582-830) can partially fail and leave commands registered against a client that never started: `client.start()` (line 892) is called without `await` or `.catch()`, so its rejection is unhandled while all 14 `registerCommand` calls (lines 592-707) proceed regardless of whether the language-server process actually started; `bbj.refreshJavaClasses`'s own guard (`if (!client)`, line 695) only checks that the variable was assigned, not that the client is ready. Checked whether every async `registerCommand` handler handles its own rejections: `bbj.loginEM` (line 597) and `bbj.refreshJavaClasses` (line 694) both wrap their awaited work in `try`/`catch`; `bbj.runBUI`/`bbj.runDWC` (lines 676,683) call `ensureValidToken(context)` unguarded, but its only unguarded internal throw path (`JSON.parse` on a `bbj.em.credentials` SecretStorage value, extension.ts:388) is unreachable in practice — confirmed by grep, nothing in the codebase ever writes that key, only `bbj.em.token` is ever stored (extension.ts:667). Checked whether disposables are pushed onto `context.subscriptions` or leaked: none of the 14 `registerCommand` calls, the `registerDocumentFormattingEditProvider` call (line 748), or the `client.onNotification` call (line 822) captures/pushes its returned `Disposable` — contrast with `msgbox-composer-ui.ts:27-28`/`addwindow-composer-ui.ts:18`/`addchildwindow-composer-ui.ts:19`/`setopts-composer-ui.ts:19`, which correctly push theirs via the same `context.subscriptions.push(...)` pattern used elsewhere in this same file for the status-bar items and listeners (lines 756,771,783,805,808,819,858). Checked what each command does when no workspace folder is open, no editor is focused, or `bbj.home` is missing: `getBBjHome()` (Commands.cjs:45-61) and the EM handlers correctly show an error and return early when `bbj.home` is empty, but `run()`, `runWeb()`, `decompile()`, and `compile()` (Commands.cjs:250,94,147,299) dereference `params.fsPath` with no check that `params` itself is defined when no editor is focused — while `resolveTargetFileName()` (Commands.cjs:135-141), used only by `decompileReplace`/`decompileReadonly`, already guards with `if (params && params.fsPath)`. Checked whether `exec` callbacks distinguish exit-code failure from spawn failure: `runWeb`/`run`'s bare-callback `exec()` (Commands.cjs:117,271) and `execWithProgress`'s promise wrapper (lines 29-41) both surface `err`/`stderr` uniformly via `showErrorMessage`, not distinguishing a nonexistent binary from a nonzero exit — acceptable, since both cases correctly inform the user rather than silently failing. Checked `stripSentinel` (Commands.cjs:18) against an absent/empty/malformed classpath: it returns `''` for `null`/`undefined`/`'--'` and passes through any other string — correct, no defect. Checked `CompilerOptions.ts`'s `validateOptions`/`buildCompileOptions` against an out-of-range or wrong-typed value: neither performs range/type coercion beyond the declared TypeScript type — a `number`-typed option set via a raw `settings.json` edit to a non-numeric string flows through `getOptionValue` unchanged and is interpolated as `${option.flag}${value}` (CompilerOptions.ts:473) with no `parseInt`/`isNaN` guard on this path (only the interactive `promptForValue` in extension.ts:132-136 validates numeric input) — a real but low-impact gap folded into the D1 finding's evidence rather than raised separately, since it shares the same unescaped-value-into-command-line root cause. 3 findings recorded: P62-D2-002, P62-D2-003, P62-D2-004.
- D3 Performance & resource use — pass — Checked what `activate()` (extension.ts:582-830) does synchronously before the extension becomes usable: it registers 4 composer subsystems, 14 commands, 1 formatting provider, and a handful of listeners/status-bar items — all cheap, synchronous VS Code API calls with no filesystem or process work on the activation path itself; `startLanguageClient()` (line 840) constructs the `LanguageClient` and calls `client.start()` without blocking. Checked whether any command re-reads `config.bbx`/`BBj.properties` on every invocation rather than caching: `getBBjClasspathEntries()` (extension.ts:36-68, used only by the rarely-invoked `bbj.showClasspathEntries`) and `Commands.cjs`'s `openEnterpriseManager()` (`PropertiesReader`, line 229) both re-read `BBj.properties` fresh on each invocation — acceptable, since both are discrete, user-initiated commands, not hot-path or per-keystroke operations, and `BBj.properties` is small. Checked whether repeated command invocations accumulate output channels, watchers, listeners, or child processes: each `run`/`runWeb`/`compile` invocation spawns exactly one `exec()` child process whose callback self-completes with no retained reference or listener left attached; the activation-time disposable-registration gap found under D2 (P62-D2-003) is a one-time re-activation-lifecycle issue, not a per-invocation accumulation, so it is not double-counted here. Checked whether `CompilerOptions.ts`'s option model is rebuilt per UI interaction: `COMPILER_OPTIONS` (line 65) is a module-level `const` built once; `getOptionsGrouped()` (lines 485-495) rebuilds only an 18-entry `Map` from it on each `configureCompileOptions()` invocation — a rare, user-initiated, negligible-cost operation. 0 findings recorded.
- D4 Maintainability & code smells — fail — Checked the size and responsibility count of `extension.ts` (894 lines): `activate()` (lines 582-830, ~250 lines) registers at least 9 distinct concerns in one function body without delegating most of them to named helpers: 4 composer subsystems (`registerMsgboxComposer` et al., lines 584-587), the language client (line 589), 14 commands (lines 592-707) — several with substantial business logic embedded directly as anonymous handlers rather than extracted, most notably the ~75-line EM-login credential-prompt-plus-`exec()` flow (lines 597-672) — a document-formatting-provider registration (lines 748-751), 2 file-open-detection features with their own tab/editor listeners (lines 756-775), and 2 status-bar indicators with their own notification listeners (lines 777-828). By contrast, every one of `Commands.cjs`'s command implementations is a discrete, separately named `Commands.X` function. **D-13 scope-fidelity note:** `Commands/Commands.cjs` is swept in full in this cell and every other cell of this unit despite not appearing in ROADMAP's Phase 62 success criteria — the grid is the contract and the criteria are a subset of it. Checked whether `Commands.cjs` being CommonJS while the rest of `bbj-vscode/src/` is TypeScript ESM is deliberate: `package.json` declares `"type": "module"`, and the `.cjs` extension is the standard Node.js mechanism to opt a single file out of that default and keep `require()`/`module.exports` syntax working regardless — a deliberate interop technique, not an unmigrated remnant, though it remains the one file in this unit mixing two module systems. Checked the exec-plus-callback shape for repetition: `extension.ts`'s EM-validate (lines 412-442) and EM-login (lines 630-664) blocks each independently build a `new Promise<string>` wrapping `require('child_process').exec` plus a create-tmpfile/read-tmpfile/`try`/`finally`-unlink lifecycle — a mechanical structural diff of the two blocks (`git diff --no-index --numstat`) shows `27 23` (of 31/35 total lines) — 23 lines share the same shape, confirming substantial in-file duplication — and neither reuses `Commands.cjs`'s own `execWithProgress` helper (lines 29-41), which independently wraps the identical `exec`-to-Promise pattern a third, unshared way. Checked whether option definitions are duplicated between `CompilerOptions.ts` and `package.json`: `COMPILER_OPTIONS`'s 20 entries (`CompilerOptions.ts`, `configKey:` at lines 69-274) each has a hand-maintained twin in `package.json`'s 20 matching `bbj.compiler.*` configuration properties (lines 412-553) — same `configKey`, independently declared `default`/`description` text in both places, with no code-generation step or single source of truth linking them. Checked for dead code: `getEMCredentials()`'s fallback to `secretStorage?.get('bbj.em.credentials')` (`extension.ts:387-389`) is unreachable — confirmed by grep, nothing anywhere in the codebase ever writes that key, only `bbj.em.token` is ever stored (`extension.ts:667`); `runWeb()`'s legacy `else` branch reading `bbj.web.username`/`bbj.web.password` (`Commands.cjs:85-90`) is similarly unreachable today, since both current call sites (`bbj.runBUI`/`bbj.runDWC`, `extension.ts:676,683`) always pass a truthy `credentials` object after `ensureValidToken()`. Checked whether the three files agree on one error-surfacing convention: yes — all consistently use `vscode.window.show{Error,Warning,Information}Message`, and `CompilerOptions.ts` appropriately stays presentation-free, returning `ValidationResult` objects for its two callers to display — no inconsistency found on this specific check. 2 findings recorded: P62-D4-002, P62-D4-003.
- D5 Test coverage gaps — fail — Established by enumeration, not assumption: `ls bbj-vscode/test/ | grep -iE 'extension|command|compiler'` -> `compiler-options.test.ts` only; `grep -rl "extension\.ts\|from '\.\./src/extension'" bbj-vscode/test/` -> nothing; `grep -rl 'Commands\.cjs\|Commands/Commands' bbj-vscode/test/` -> nothing. `CompilerOptions.ts` is thoroughly tested — `compiler-options.test.ts` (511 lines) exercises `buildCompileOptions`, `validateOptions`, `getOptionsGrouped`, `OPTION_GROUP_ORDER`, and the `COMPILER_OPTIONS` constant across ~45 cases including all 20 options, conflict/dependency detection, and grouping — but `extension.ts` (894 lines: activation, all 14 command registrations, the EM login/validate flows, the tokenized/line-numbered file prompts, both status-bar indicators) and `Commands.cjs` (405 lines: every `run`/`compile`/`decompile` `exec()`-invoking command) have **zero** test coverage — no test imports either file. Concretely untested: every P62-D1/P62-D2/P62-D7 finding recorded in this section — the unescaped shell interpolation (P62-D1-003), the argv-exposed EM token (P62-D1-004), the unguarded `params.fsPath` crash (P62-D2-002), the leaked command-registration disposables (P62-D2-003), the unhandled `client.start()` rejection (P62-D2-004), and the process-spawning safety gap relative to IntelliJ (P62-D7-001) — none would be caught by a regression run, so `npm test` staying green provides no signal about any of them. 1 finding recorded: P62-D5-002.
- D6 Dependency health — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- D7 Cross-IDE parity — fail — Enumerated the VS Code command surface from `package.json`'s `contributes.commands` (18 entries) and `extension.ts`'s `registerCommand` calls, then set it against IntelliJ's `actions/` package (`RU-63-01`): both IDEs implement Run-as-GUI/BUI/DWC and EM login/validate via a spawned `bbj`/`bbjcpl` process reading the same `bbj.home`-equivalent setting and the same `web.bbj`/`em-login.bbj`/`em-validate-token.bbj` run tools, but the two sides differ categorically in *how* they spawn: VS Code's `Commands.cjs` (`run` line 263, `runWeb` line 109, `compile` line 328) and `extension.ts` (EM validate line 415, EM login line 635) all build ONE shell-interpolated command STRING and pass it to `child_process.exec()`, which spawns via `/bin/sh -c`/`cmd.exe`, subjecting every interpolated segment to shell-metacharacter reinterpretation (traced as unescaped at every one of these sites — see P62-D1-003); IntelliJ's equivalents — `BbjRunGuiAction.java:27-52`, `BbjRunBuiAction.java:115-129`, `BbjRunDwcAction.java:115-129`, `BbjRunActionBase.validateTokenServerSide` (`BbjRunActionBase.java:282-322`), and `BbjEMLoginAction.performLogin` (`BbjEMLoginAction.java:94-152`) — uniformly build a `GeneralCommandLine` and add each argument via `.addParameter(...)`, spawned directly by `OSProcessHandler`/`CapturingProcessHandler` with no shell involved, so no argument is ever subject to metacharacter reinterpretation. Also checked pre-flight validation: IntelliJ's `validateBeforeRun()` (`BbjRunActionBase.java:144-169`) confirms BBj Home is configured, exists as a directory, and the executable is present before spawning; VS Code's `getBBjHome()` (Commands.cjs:45-61) and the EM handlers (extension.ts:401-403,601-608) only check that the setting is a non-empty string, discovering a bad path only via `exec()`'s asynchronous error callback. This categorical safety-methodology divergence is a VS Code-side defect, so it is recorded as `P62-D7-001` with `location:` inside `bbj-vscode/`, citing `BbjRunActionBase.java`/`BbjRunGuiAction.java`/`BbjRunBuiAction.java`/`BbjRunDwcAction.java`/`BbjEMLoginAction.java` as the comparison side only. Separately checked `BbjCompileAction.java` — the IntelliJ counterpart to `bbj.compile` — and found it is an unimplemented `TODO` stub that only logs "[Compile] Triggered" and never invokes `bbjcpl` at all, unlike VS Code's real 18-option-aware compile; this and three other command-surface gaps (`bbj.configureCompileOptions`, `bbj.denumber`/`bbj.decompile`/`bbj.decompileReadonly`, `bbj.em`) are IntelliJ-side absences, not VS Code defects, so per D-05 they are recorded as `### Cross-unit referrals` addressed to `RU-63-01` rather than as findings here. 1 finding recorded: P62-D7-001.
- D8 Comment & doc accuracy — pass — Checked every JSDoc block in `Commands.cjs` and `CompilerOptions.ts` against the implementation just read, including any claim of validation/escaping: `stripSentinel`'s doc (`Commands.cjs:12-18`, "Strips the EM Config sentinel value '--' ... Treat it as empty") matches its one-line implementation exactly; `resolveTargetFileName`'s doc (`Commands.cjs:129-134`) accurately describes the `params`-preferred/`active`-fallback resolution it performs — and, read against P62-D2-002, actually demonstrates the author understood the "`params` may be undefined" hazard well enough to guard against it here, making its absence in `run`/`runWeb`/`decompile`/`compile` an inconsistency rather than an oversight born of ignorance; the `runWeb` config-path comment (`Commands.cjs:104-107`, citing issue #382) matches the code's actual fallback-to-installation-default behavior; `validateOptions`'s JSDoc (`CompilerOptions.ts:372-383`) accurately scopes itself to dependency/conflict checking only and makes no claim about validating value content, so it does not over-claim a safety property it doesn't provide; `isTokenExpired`'s and `ensureValidToken`'s docs (`extension.ts:336-339,452-455`) both match their implementations. Checked `CLAUDE.md`'s §Repository Structure, §Build & Test Commands, and §IDE Integration claims against this unit's code: the Build & Test Commands list (`npm test`, `npm run lint`, etc.) matches `package.json`'s actual scripts; the IDE Integration claim that both IDEs share the run tools `web.bbj`/`em-login.bbj` is accurate for the files this unit touches (both are referenced from `Commands.cjs`/`extension.ts` exactly as claimed); `CLAUDE.md` makes no positive claim about `extension.ts`'s activation structure, `Commands.cjs`'s command implementations, or `CompilerOptions.ts` specifically, so its silence on those particulars is noted but not promoted to a finding, consistent with `RU-62-04`'s own precedent. 0 findings recorded.

### Findings

```
id:                P62-D1-003
unit:              RU-62-01
location:          bbj-vscode/src/Commands/Commands.cjs:263,325-328
dimension:         D1
secondary:         [D2, D7]
severity:          critical
evidence_tier:     repro
evidence:          Traced every value that reaches a child_process.exec()-built shell command
                    string in this unit back to its source, without constructing or running an
                    exploit string (redacted per D-09; the trace itself is the evidence).
                    Workspace-settable string configuration -- bbj.classpath (interpolated
                    unquoted at Commands.cjs:263), bbj.configPath (Commands.cjs:261, quoted but
                    unescaped), bbj.web.apps.<file>.name (Commands.cjs:97-99,109, quoted but
                    unescaped), and all 7 string-typed bbj.compiler.* options --
                    typeChecking.configFile, typeChecking.prefixDirectories,
                    typeChecking.classpath, output.directory, output.extension,
                    diagnostics.errorLog, content.protectPassword -- emitted bare by
                    buildCompileOptions() (CompilerOptions.ts:438-479) and joined with no wrapping
                    quotes at all into the compile command (Commands.cjs:325-328) -- none of these
                    values passes through any shell-escaping function before interpolation, and
                    validateOptions() (CompilerOptions.ts:384-431) checks only
                    presence/dependency/conflict, never content. None of these settings carries a
                    restricted marker or is covered by a capabilities.untrustedWorkspaces
                    declaration in package.json (confirmed absent by grep), so each is settable
                    from a workspace's own committed .vscode/settings.json, applying even in an
                    untrusted workspace. A second, workspace-independent path reaches the identical
                    unescaped interpolation: bbj.runBUI/bbj.runDWC (extension.ts:676,683) fall back
                    to a caller-supplied params.fsPath when no editor is focused, and any command
                    registered via vscode.commands.registerCommand is invocable by any other
                    extension in the same window. extension.ts's EM validate (line 415) and EM
                    login (line 635) exec() calls share the same unquoted/unescaped construction
                    for the bbjHome-derived executable path. All six call sites use
                    child_process.exec(), which always spawns via a shell, rather than an
                    argument-array API (execFile/spawn) immune to this class of defect -- confirmed
                    by reading all six call sites; none imports or calls execFile/spawn anywhere in
                    this unit.
failure_scenario:  A value containing shell metacharacters, reaching child_process.exec() through
                    any of the channels traced above, executes as part of the shell command rather
                    than as inert data -- the general OS command-injection impact (CWE-78):
                    arbitrary command execution with the developer's own OS privileges, triggered
                    by an ordinary, everyday action (Run, Run BUI, Run DWC, or Compile) on a
                    workspace whose settings, or a params object supplied by another extension, the
                    developer does not fully control. No trigger sequence or payload is recorded
                    here per D-09, since the surface is unfixed in a public repository.
classification:    major
                    (1) touches 1 file: FAIL -- the fix spans at least Commands.cjs, extension.ts,
                    and CompilerOptions.ts (a consistent escaping/argument-array strategy needs to
                    reach every call site) -- (2) no public API/grammar/LSP change: pass -- (3) no
                    new dependency: pass (Node's built-in execFile/spawn suffice) -- (4)
                    regression-testable with vitest: pass (assert a value containing shell
                    metacharacters is never passed through unescaped) -- (5) reviewer can name the
                    exact edit: pass (switch to execFile/spawn with an argument array, mirroring
                    IntelliJ's GeneralCommandLine.addParameter approach -- see P62-D7-001) -- (6)
                    severity `critical` and primary dimension is D1: FAIL -- test (6) fails on its
                    own, so classification is `major` regardless of the other five tests (D-13's
                    safety gate).
effort:            8
dedup:             #231 partial-overlap -- #231 requests configurable classpath/command-line
                    settings for starting BBj programs; those settings (bbj.classpath,
                    bbj.compiler.*, bbj.configPath) already exist, and this finding is about their
                    existing unescaped interpolation into child_process.exec(), a security defect
                    #231 does not address. #485 partial-overlap -- #485 requests honoring
                    custom-named/located config files everywhere; this finding's
                    bbj.configPath/-c interpolation touches the same setting but is about
                    injection-safety, not feature completeness. #486 none -- #486 requests
                    live-reload of config.bbx PREFIX/USE changes, unrelated to command-string
                    construction.
disposition:       major-refactor
```

```
id:                P62-D1-004
unit:              RU-62-01
location:          bbj-vscode/src/extension.ts:415,420,639
dimension:         D1
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          extension.ts:415 builds emValidateCmd with the raw JWT token interpolated
                    directly as a literal command-line argument ("${token}"), passed to
                    child_process.exec() at line 426 -- while the child process runs, the full
                    command line, including the token, is visible in the OS process table to any
                    other process able to enumerate it (ps/Task Manager-style visibility), since
                    exec()'s shell inherits normal process-argument visibility; no non-shell,
                    non-argv channel (e.g. an env var or stdin) is used to pass the secret. The
                    debug-mode log line at extension.ts:420 attempts to mask the token before
                    writing it to the output channel via emValidateCmd.replace(token, '***') -- a
                    literal substring match against the token as it appears inside the already-built
                    command string; because that string is built by the same unescaped interpolation
                    traced in P62-D1-003, a token value containing a double-quote character would
                    not match the pattern the surrounding code assumes it is wrapped in, so the mask
                    could fail to match and the raw token would be written to the output channel
                    when bbj.debug is enabled. The EM login flow's password masking at
                    extension.ts:639 (.replace(`"${password}"`, '"***"')) shares the identical
                    substring-match fragility.
failure_scenario:  Any local process running while the EM validate/login exec() call is in flight
                    -- another process owned by the same user, a monitoring/diagnostic tool, or
                    another account with process-list visibility in a shared environment -- can
                    read the plaintext EM token or password directly from the child process's
                    argument list. Separately, a developer running with bbj.debug: true whose stored
                    token or typed password contains a double-quote would have the unmasked raw
                    secret written into the (extension-visible, sometimes shared-in-bug-reports)
                    Output Channel instead of the intended *** redaction.
classification:    major
                    (1) touches 1 file: pass (extension.ts only) -- (2) no public API change: pass
                    -- (3) no new dependency: pass -- (4) regression-testable with vitest: pass
                    (assert the masking replace matches the constructed string for token/password
                    values containing quote characters) -- (5) reviewer can name the exact edit:
                    pass (switch to execFile/spawn with an argument array so secrets never appear
                    in a shell-interpolated string, and mask by position rather than substring
                    match) -- (6) severity `medium` but primary dimension is D1: FAIL -- test (6)
                    fails on the D1 clause alone, so classification is `major` regardless of the
                    other five tests.
effort:            4
dedup:             none -- none of #231/#485/#486 concern credential/token exposure via process
                    arguments or output-channel logging.
disposition:       major-refactor
```

```
id:                P62-D2-002
unit:              RU-62-01
location:          bbj-vscode/src/Commands/Commands.cjs:250,94,147,299
dimension:         D2
secondary:         [D4]
severity:          medium
evidence_tier:     repro
evidence:          run(params) (Commands.cjs:250), runWeb(params, client, credentials)
                    (Commands.cjs:94, reached via runBUI/runDWC), decompile(params, options)
                    (Commands.cjs:147, reached via denumber), and compile(params) (Commands.cjs:299)
                    all compute `const fileName = active ? active.document.fileName :
                    params.fsPath;` with no check that params itself is defined.
                    bbj.run/bbj.runBUI/bbj.runDWC/bbj.compile/bbj.denumber are registered as global
                    VS Code keybindings (package.json contributes.keybindings: alt+g/alt+b/alt+d/
                    alt+c/alt+n) with no when clause restricting them to a focused BBj editor, and
                    none of the five is excluded from the Command Palette via a commandPalette when
                    entry (confirmed: grep -c commandPalette bbj-vscode/package.json -> 0) -- both
                    invocation paths deliver params === undefined. When
                    vscode.window.activeTextEditor is also undefined (focus in the
                    Explorer/Search sidebar, an empty window, or a non-text panel), params.fsPath
                    throws TypeError: Cannot read properties of undefined. Confirmed by contrast
                    within the same file: resolveTargetFileName(params) (Commands.cjs:135-141),
                    used only by decompileReplace/decompileReadonly, correctly guards with `if
                    (params && params.fsPath)` before falling back to active -- the safe pattern
                    already exists here and simply was not applied to the other four entry points.
failure_scenario:  Pressing Alt+G/Alt+B/Alt+D/Alt+C/Alt+N (or invoking the corresponding Command
                    Palette entry) while no text editor has focus throws inside the command handler
                    instead of showing a graceful 'no active BBj file' message.
classification:    major
                    (1) touches 1 file: FAIL -- the identical unguarded pattern recurs in 4
                    separate functions, and a comprehensive fix needs to touch all 4 -- (2) no
                    public API change: pass -- (3) no new dependency: pass -- (4)
                    regression-testable with vitest: pass (call each function with params:
                    undefined and no active editor stub) -- (5) reviewer can name the exact edit:
                    pass (apply resolveTargetFileName's existing guard to the other four) -- (6)
                    severity `medium`, dimension D2 (not D1): pass -- test (1) alone already fails,
                    so classification is `major` per D-13.
effort:            2
dedup:             none -- none of #231/#485/#486 concern command invocation without a focused
                    editor.
disposition:       major-refactor
```

```
id:                P62-D2-003
unit:              RU-62-01
location:          bbj-vscode/src/extension.ts:592-707
dimension:         D2
secondary:         [D4]
severity:          medium
evidence_tier:     repro
evidence:          None of the 14 vscode.commands.registerCommand(...) calls in activate()
                    (extension.ts:592-707: bbj.config, bbj.properties, bbj.em, bbj.loginEM,
                    bbj.run, bbj.runBUI, bbj.runDWC, bbj.compile, bbj.denumber, bbj.decompile,
                    bbj.decompileReadonly, bbj.configureCompileOptions, bbj.refreshJavaClasses,
                    bbj.showClasspathEntries), the registerDocumentFormattingEditProvider call
                    (line 748), or the client.onNotification call (line 822) captures or pushes its
                    returned Disposable onto context.subscriptions -- confirmed by reading every
                    call site in activate(). By contrast, msgbox-composer-ui.ts:27-28,
                    addwindow-composer-ui.ts:18, addchildwindow-composer-ui.ts:19, and
                    setopts-composer-ui.ts:19 (registered from extension.ts:584-587) correctly wrap
                    their registerCommand calls in context.subscriptions.push(...), and
                    extension.ts itself uses the same push pattern correctly for its status-bar
                    items, file watcher, and listeners (lines 756,771,783,805,808,819,858) -- the
                    safe pattern is established elsewhere in this same file and simply wasn't
                    applied to these 16 registrations.
failure_scenario:  VS Code's documented contract for registerCommand requires the caller to
                    dispose the returned handle; registering the same command ID twice without
                    disposing the first throws Error: command 'X' already exists. Because none of
                    these 16 registrations is disposed, and deactivate() (extension.ts:833-837)
                    only calls client.stop(), a second activate() call within the same
                    extension-host process -- triggered by certain workspace-trust transitions, or
                    by a test harness that activates the extension repeatedly -- throws on every
                    one of the 16 registrations.
classification:    major
                    (1) touches 1 file: pass -- (2) no public API change: pass -- (3) no new
                    dependency: pass -- (4) regression-testable with the existing harness: FAIL --
                    asserting activation/re-activation and disposal behavior needs a VS Code
                    extension-host or vscode-module mock that this unit's test suite does not
                    currently have (P62-D5-002: extension.ts has zero existing test coverage), so
                    this is new test infrastructure, not a fit into the existing harness -- (5)
                    reviewer can name the exact edit: pass (wrap each registration in
                    context.subscriptions.push(...)) -- (6) severity `medium`, dimension D2 (not
                    D1): pass -- test (4) alone already fails, so classification is `major` per
                    D-13.
effort:            4
dedup:             none -- none of #231/#485/#486 concern command disposal or registration
                    lifecycle.
disposition:       major-refactor
```

```
id:                P62-D2-004
unit:              RU-62-01
location:          bbj-vscode/src/extension.ts:892
dimension:         D2
secondary:         []
severity:          low
evidence_tier:     repro
evidence:          startLanguageClient() calls client.start() (extension.ts:892) without awaiting
                    it or attaching a .catch(). LanguageClient.start() (vscode-languageclient)
                    returns a Promise<void> that rejects if the server module fails to spawn (e.g.
                    a corrupted out/language/main.cjs bundle, or an incompatible Node.js runtime).
                    activate() proceeds synchronously to register all 14 commands
                    (extension.ts:592-707) regardless of whether this promise has settled.
                    bbj.refreshJavaClasses's handler (extension.ts:694-704) guards only `if
                    (!client)` -- checking that the variable was assigned (it always is,
                    synchronously, at line 589 right after `new LanguageClient(...)`), not whether
                    the underlying process actually started -- so it can call
                    client.sendRequest(...) against a client whose start() promise is still
                    pending or has already rejected (though its own try/catch at least surfaces
                    that specific failure to the user).
failure_scenario:  If the language-server process fails to spawn, client.start()'s rejection is
                    never observed anywhere in this file, producing an unhandled promise rejection
                    in the extension host with no dedicated user-facing message explaining that the
                    server didn't start, while every command remains registered as if it had.
classification:    easy
                    (1) touches 1 file: pass -- (2) no public API/grammar/LSP change: pass -- (3)
                    no new dependency: pass -- (4) regression-testable with vitest: pass (a mock
                    LanguageClient whose start() rejects, asserting the rejection is observed) --
                    (5) reviewer can name the exact edit: pass (attach .catch() to log/surface the
                    failure, e.g. via outputChannel/showErrorMessage) -- (6) severity `low` and
                    primary dimension is D2 (not D1): pass -- all six tests pass, so this finding
                    is `easy` per D-13, unlike the D1-tainted findings above.
effort:            2
dedup:             none -- none of #231/#485/#486 concern language-client startup error handling.
disposition:       easy-fix
```

```
id:                P62-D7-001
unit:              RU-62-01
location:          bbj-vscode/src/Commands/Commands.cjs:117,271,336
dimension:         D7
secondary:         [D1]
severity:          medium
evidence_tier:     inherited
evidence:          VS Code's bbj.run/bbj.runBUI/bbj.runDWC/bbj.compile (Commands.cjs:117,271,336)
                    and its EM validate/login flows (extension.ts:426,645) all build a single
                    shell command STRING via template-literal interpolation and pass it to
                    child_process.exec(), which spawns the command through /bin/sh -c (or cmd.exe
                    on Windows) -- meaning every interpolated segment is subject to shell
                    metacharacter interpretation unless explicitly quoted and escaped (traced as
                    unescaped at multiple points; see P62-D1-003). The equivalent IntelliJ actions
                    for the same four operations plus EM login/validate --
                    BbjRunGuiAction.java:27,30,33,35,39,41,47,52, BbjRunBuiAction.java:115-129,
                    BbjRunDwcAction.java:115-129, BbjRunActionBase.validateTokenServerSide
                    (BbjRunActionBase.java:298-303), and BbjEMLoginAction.performLogin
                    (BbjEMLoginAction.java:98-112) -- uniformly build a GeneralCommandLine and add
                    each argument via .addParameter(...), which OSProcessHandler/
                    CapturingProcessHandler spawn directly (no shell), so no argument is ever
                    subject to shell-metacharacter reinterpretation regardless of its content.
                    IntelliJ's validateBeforeRun() (BbjRunActionBase.java:144-169) additionally
                    confirms the configured BBj Home directory exists and the executable is
                    present and executable before spawning; VS Code's getBBjHome()
                    (Commands.cjs:45-61) and the EM login/validate paths (extension.ts:401-403,
                    601-608) only check that the bbj.home config value is a non-empty string --
                    never that the path resolves to an actual directory or executable -- so a
                    misconfigured VS Code bbj.home is only discovered via exec()'s asynchronous
                    error callback, after the shell has already attempted to interpret the
                    (still-unescaped) command.
failure_scenario:  n/a (D7 is a cross-IDE comparative observation, not itself a new runtime
                    failure scenario beyond what P62-D1-003 already states) -- the divergence
                    means the identical class of user-facing feature (run/compile/EM-authenticate
                    a BBj program) carries fundamentally different injection exposure and
                    pre-flight validation robustness depending on which IDE the developer uses,
                    even though both IDEs read the same bbj.home-equivalent configuration concept.
classification:    major
                    (1) touches 1 file: FAIL -- Commands.cjs and extension.ts, the same files as
                    P62-D1-003's fix -- (2) no public API/grammar/LSP change: pass -- (3) no new
                    dependency: pass -- (4) regression-testable with vitest: pass -- (5) reviewer
                    can name the exact edit: pass (adopt an argument-array-based spawn API --
                    Node's execFile/spawn -- mirroring IntelliJ's GeneralCommandLine approach, plus
                    add pre-flight existence/executable checks) -- (6) severity `medium`,
                    dimension D7 (not D1): pass -- test (1) alone already fails, so classification
                    is `major` per D-13.
effort:            8
dedup:             none -- none of #231/#485/#486 concern process-spawning methodology or
                    pre-flight path validation; this is a comparative observation, not a feature
                    request.
disposition:       major-refactor
```

```
id:                P62-D4-002
unit:              RU-62-01
location:          bbj-vscode/src/extension.ts:582-830
dimension:         D4
secondary:         []
severity:          medium
evidence_tier:     trace
evidence:          activate() (extension.ts:582-830, ~250 lines) registers at least 9 distinct
                    concerns in one function body without delegating most of them to named
                    helpers: 4 composer subsystems (registerMsgboxComposer et al., lines 584-587),
                    the language client (line 589), 14 commands (lines 592-707) -- several with
                    substantial business logic embedded directly as anonymous handlers rather than
                    extracted, most notably the ~75-line EM-login credential-prompt-plus-exec()
                    flow (lines 597-672) -- a document-formatting-provider registration (lines
                    748-751), 2 file-open-detection features with their own tab/editor listeners
                    (lines 756-775), and 2 status-bar indicators with their own notification
                    listeners (lines 777-828). By contrast, every one of Commands.cjs's command
                    implementations is a discrete, separately named Commands.X function. Mechanical
                    structural diff (D-12) of extension.ts's two independent Promise-wrapped-exec
                    blocks: git diff --no-index --numstat between the EM-validate block (lines
                    412-442, 31 lines) and the EM-login block (lines 630-664, 35 lines) reports
                    `27 23` -- 23 of ~31-35 lines share the same shape (build tmp-file path, build
                    cmd string, debug-log, new Promise<string> wrapping
                    require('child_process').exec with a try/finally-unlink) -- confirming
                    substantial in-file duplication; neither block reuses Commands.cjs's own
                    execWithProgress helper (lines 29-41), which independently wraps the identical
                    exec-to-Promise pattern a third way, so the same operation is implemented three
                    separate times across the unit with no shared helper. Checked for dead code as
                    a related maintainability cost: getEMCredentials()'s fallback to
                    secretStorage?.get('bbj.em.credentials') (extension.ts:387-389) is unreachable
                    -- confirmed by grep, nothing in the codebase ever writes that key, only
                    bbj.em.token is ever stored (extension.ts:667); runWeb()'s legacy else branch
                    reading bbj.web.username/bbj.web.password (Commands.cjs:85-90) is likewise
                    unreachable today, since both current call sites (bbj.runBUI/bbj.runDWC)
                    always pass a truthy credentials object.
failure_scenario:  n/a (D4 is a code-shape finding, not a runtime failure scenario) -- the
                    god-function shape and the triplicated exec-wrapping pattern mean a future fix
                    to any one of them (e.g. P62-D1-003's escaping fix, or P62-D2-004's rejection
                    handling) has to be located and re-applied independently in up to 3 places,
                    with drift risk between them; the two dead-code branches are maintenance debt
                    that misleads a reader into thinking a credential-storage fallback path is live
                    when it is not.
classification:    major
                    (1) touches 1 file: pass (extension.ts; the dead Commands.cjs branch is a
                    one-line deletion noted alongside, not counted against this test) -- (2) no
                    public API/grammar/LSP change: pass -- (3) no new dependency: pass -- (4)
                    regression-testable with the existing harness: FAIL -- extracting activate()'s
                    inline handlers into named, independently testable functions is exactly the
                    kind of refactor extension.ts's current zero test coverage (P62-D5-002) cannot
                    verify without first adding the missing test infrastructure -- (5) reviewer can
                    name the exact edit: pass (extract the EM-login handler and the exec-wrapping
                    pattern into shared, named helpers; delete the two dead-code branches) -- (6)
                    severity `medium`, dimension D4 (not D1): pass -- test (4) alone already fails,
                    so classification is `major` per D-13.
effort:            8
dedup:             none -- none of #231/#485/#486 concern activate()'s structure, exec-wrapper
                    duplication, or dead credential-fallback code.
disposition:       major-refactor
```

```
id:                P62-D4-003
unit:              RU-62-01
location:          bbj-vscode/src/Commands/CompilerOptions.ts:65-282
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          COMPILER_OPTIONS's 20 entries (CompilerOptions.ts:65-282, configKey: values at
                    lines 69,79,90,102,114,126,136,146,156,166,178,188,199,210,220,232,242,252,
                    264,274) each declares a label/description/defaultValue that duplicates a
                    hand-written twin in package.json's 20 matching bbj.compiler.* configuration
                    properties (lines 412-553, e.g. bbj.compiler.typeChecking.enabled at line 412
                    vs. configKey: 'typeChecking.enabled' at line 69, both independently stating
                    default: false / "Enable static type checking (-t)" and description: "Enable
                    static type checking"). No code-generation step, shared JSON source, or test
                    asserts the two stay in sync -- confirmed by reading both declarations end to
                    end and finding no cross-reference between them beyond the shared string key.
failure_scenario:  n/a (D4 code-shape finding) -- adding, removing, or changing a compiler
                    option's default/description requires a matching hand-edit in both files;
                    missing one desyncs the configureCompileOptions() QuickPick UI (built from
                    CompilerOptions.ts) from what a developer sees in VS Code's Settings UI (built
                    from package.json's schema) or from what raw settings.json editing actually
                    accepts, with nothing currently catching the drift.
classification:    major
                    (1) touches 1 file: FAIL -- resolving the duplication (e.g. generating one from
                    the other, or a shared JSON source both read) necessarily touches both
                    package.json and CompilerOptions.ts -- (2) no public API/grammar/LSP change:
                    pass -- (3) no new dependency: pass -- (4) regression-testable with vitest:
                    pass (a test can assert every COMPILER_OPTIONS configKey has a matching
                    bbj.compiler.* entry with the same default) -- (5) reviewer can name the exact
                    edit: pass -- (6) severity `low`, dimension D4 (not D1): pass -- test (1) alone
                    already fails, so classification is `major` per D-13.
effort:            4
dedup:             none -- none of #231/#485/#486 concern compiler-option metadata duplication
                    between CompilerOptions.ts and package.json.
disposition:       major-refactor
```

```
id:                P62-D5-002
unit:              RU-62-01
location:          bbj-vscode/test/ (absence) -- the 2 files this finding covers are
                    bbj-vscode/src/extension.ts and bbj-vscode/src/Commands/Commands.cjs
dimension:         D5
secondary:         []
severity:          medium
evidence_tier:     inherited
evidence:          Established by enumeration: `ls bbj-vscode/test/ | grep -iE
                    'extension|command|compiler'` -> compiler-options.test.ts only; `grep -rl
                    "extension\.ts\|from '\.\./src/extension'" bbj-vscode/test/` and `grep -rl
                    'Commands\.cjs\|Commands/Commands' bbj-vscode/test/` both return nothing.
                    compiler-options.test.ts (511 lines, ~45 cases) thoroughly covers
                    CompilerOptions.ts's pure logic, but no test imports or exercises extension.ts
                    (activation, all 14 command registrations, EM login/validate) or Commands.cjs
                    (every exec()-invoking command: run, runWeb, compile, decompile*).
failure_scenario:  A regression in any of this section's findings -- the unescaped shell
                    interpolation (P62-D1-003), the argv-exposed EM token (P62-D1-004), the
                    unguarded params.fsPath crash (P62-D2-002), the leaked command-registration
                    disposables (P62-D2-003), the unhandled client.start() rejection (P62-D2-004),
                    or the process-spawning safety gap relative to IntelliJ (P62-D7-001) -- would
                    ship silently: npm test is green today with zero assertions covering either
                    file, so FIX-03's 'npm test clean' gate cannot detect a future regression in
                    any of them.
classification:    major
                    (1) touches 1 file: FAIL -- comprehensive resolution requires new test files
                    for both extension.ts and Commands.cjs (or a shared vscode-API mock harness
                    both can use), touching more than 1 file -- (2) no public API/grammar/LSP
                    change: pass -- (3) no new dependency: pass -- (4) regression-testable with
                    existing harness: n/a (this finding *is* the missing-test gap) -- (5) reviewer
                    can name the exact edit: pass (author extension.test.ts and commands.test.ts
                    using a minimal vscode API mock, following whatever pattern the
                    composer-webview D5 gap in RU-62-04 ultimately adopts) -- (6) severity
                    `medium`, dimension D5 (not D1): pass -- test (1) alone already fails, so
                    classification is `major` per D-13.
effort:            8
dedup:             none -- none of #231/#485/#486 concern test coverage for extension.ts or
                    Commands.cjs.
disposition:       major-refactor
```

### Not-reproducible dispositions

- **Tier failed: `repro` (D2).** Candidate claim: two EM login/validate invocations issued close enough together could collide on their `Date.now()`-millisecond-resolution temp-file names (`bbj-em-login-${Date.now()}.tmp` at `extension.ts:630`, `bbj-em-validate-${Date.now()}.tmp` at `extension.ts:412`), causing one invocation's `exec()` callback to read the other's output. **Reason not recorded as a finding:** confirming an actual same-millisecond collision and cross-read requires a timing-controlled concurrent-invocation harness driving two logins within the same millisecond and observing which callback reads which output — that harness is explicitly deferred infrastructure per this phase's scope (`62-CONTEXT.md` `<deferred>`; any harness a specific finding demands is a Phase 67 deliverable). A static trace confirms the theoretical millisecond-collision window exists but does not itself confirm an observable cross-read — left here rather than silently dropped, per RVW-06's drop-vs-disposition rule.

### Cross-unit referrals

- **RU-63-01** — `BbjCompileAction.java` (`bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java:24-37`) is an unimplemented `TODO` stub: `actionPerformed` only logs `"[Compile] Triggered for file: " + file.getName()` to the console and never invokes `bbjcpl` or any compiler process — unlike VS Code's `bbj.compile` (`Commands.cjs:294-343`), which builds and runs a real `bbjcpl` command line from 18 configurable options via `CompilerOptions.ts`/`buildCompileOptions()`. `RU-63-01`'s own sweep should confirm whether this is a documented, deliberate scope decision (e.g. compile-on-save is expected to be driven by the language server instead) or an unaddressed feature gap, and record its own finding if the latter.
- **RU-63-01** — Six VS Code commands in this unit have no IntelliJ action counterpart anywhere in `bbj-intellij/src/main/java/com/basis/bbj/intellij/` (confirmed via `ls`/`grep` across the module — no `Denumber`/`Decompile`/`ConfigureCompileOptions`/`EnterpriseManager` action class exists): `bbj.configureCompileOptions` (compiler-options UI with dependency/conflict validation), `bbj.denumber`/`bbj.decompile`/`bbj.decompileReadonly` (tokenized/line-numbered program decompilation, issues #64/#65), and `bbj.em` (Enterprise Manager URL launcher reading `BBj.properties`' jetty host/port). `RU-63-01`'s sweep should confirm whether these are deliberate VS Code-only features or unaddressed IntelliJ gaps.
- **RU-63-01** (secondary interest to `RU-63-05`) — `BbjRefreshJavaClassesAction.java:21-30` performs a full `BbjServerService.getInstance(project).restart()` (restarting the whole language server) where VS Code's `bbj.refreshJavaClasses` (`extension.ts:694-704`) sends a targeted `bbj/refreshJavaClasses` LSP request without restarting the server — a behavioral divergence worth confirming as deliberate (LSP4IJ architecture constraint) or a missed optimization.

## RU-62-03 — Composer logic & UI layer

**Files (8 / 2,027 LOC):**
- `bbj-vscode/src/msgbox-composer.ts` (550)
- `bbj-vscode/src/addwindow-composer.ts` (405)
- `bbj-vscode/src/addchildwindow-composer.ts` (308)
- `bbj-vscode/src/msgbox-composer-ui.ts` (193)
- `bbj-vscode/src/addwindow-composer-ui.ts` (68)
- `bbj-vscode/src/addchildwindow-composer-ui.ts` (72)
- `bbj-vscode/src/setopts-composer-ui.ts` (96)
- `bbj-vscode/src/setopts-catalog.ts` (335)

**Risk rank:** 3 of 5 Phase 62 units — this is the logic that assembles the values `RU-62-04`'s generators interpolate into webview HTML; a D-15-confirmed asymmetry applies here too — SETOPTS has no `-composer.ts` file, only `-ui.ts` plus the shared `setopts-catalog.ts`, so this unit's D4 duplication assessment runs against 3 `-composer.ts` files (msgbox/addwindow/addchildwindow), not 4.
**Sweep method (D-08):** full read.
**Owning plan:** 62-03.

### Cells
- D1 Security — fail — Traced the value-origin direction opposite to `RU-62-04`'s, per this unit's own charter: for msgbox-composer.ts, `message`/`title` ARE validated via `validateStringField` (msgbox-composer.ts:311-326) before `composeStatement` (lines 148-163) and the webview's Insert button is gated on the resulting `valid` flag (`msgboxPreview`, line 420) — but `assignTo` (`ComposeInput.assignTo`, line 145; used unchecked at `composeStatement` line 162, `input.assignTo ? \`${input.assignTo} = ${call}\` : call`) is never passed through `validateStringField` or folded into `valid`, so a malformed `assignTo` reaches an Insert-enabled statement even in the one composer that validates its other free-text fields. Checked addwindow-composer.ts's `composeAddWindow` (lines 275-282, `args = [input.x, input.y, input.width, input.height, input.title, formatHex(input.flags)]`) and addchildwindow-composer.ts's `composeAddChildWindow` (lines 208-215, `args = [input.id, input.x, input.y, input.width, input.height, input.title, formatHex(input.flags), input.context]`): neither file contains any `validate`-named function or call (confirmed by grep), so `x`/`y`/`width`/`height`/`title`/`sysgui`/`receiver`/`window`/`id`/`context` are embedded verbatim with zero structural or type check, and neither `AddWindowPreview` nor `AddChildWindowPreview` (addwindow-composer.ts:234-243, addchildwindow-composer.ts:161-170) carries a `valid`/error field at all — confirmed by `grep`, no `disabled`/`invalid` gating exists anywhere in the corresponding webview files' Insert-button wiring either. Checked `setopts-composer-ui.ts`/`setopts-catalog.ts`'s config.bbx-sourced input by contrast: `parseSetOptsLine`/`parseVector` are regex-gated and length-bounded (`MAX_BYTES * 2` = 32, setopts-catalog.ts:135), `setMaskChar` truncates to a single char code (line 201), and `setoptsPreview`'s `rawTail` is validated via `/^[0-9A-Fa-f]*$/` (line 323) before `setRawTail` re-validates via `parseVector` — a malformed or forged SETOPTS payload cannot corrupt or unboundedly grow the vector, unlike the addwindow/addchildwindow surface. Checked all 8 files for process/filesystem/command-execution surface: `grep` for `child_process`/`exec(`/`spawn(`/`readFile`/`writeFile` matches only `RegExp.prototype.exec()` call sites (regex matching, confirmed by reading each hit) — no such surface exists in this unit. Every affected field is text the developer types into the composer's own webview form (matching `RU-62-04`'s established fact that no editor/document/config/workspace value reaches these composers today), so this is a self-inflicted statement-corruption gap rather than an attacker-controlled injection. 1 finding recorded: P62-D1-005.
- D2 Correctness & error handling — fail — Boundary-checked msgbox-composer.ts's `composeStatement`/`msgboxPreview` at no-option/all-options/zero-value/max-length boundaries: covered by the existing 24-case `msgbox-composer.test.ts` plus `composer-commands.test.ts`'s LS pass-through tests; `npx vitest run test/msgbox-composer.test.ts test/addwindow-composer.test.ts test/addchildwindow-composer.test.ts test/setopts-catalog.test.ts test/composer-commands.test.ts` confirms all 100 existing tests for this unit's pure-logic layer pass. Ran `setopts-catalog.ts`'s two-pass D2 value-correctness protocol against the BASIS SETOPTS documentation its own header cites by URL (both fetched live, `https://documentation.basis.cloud/BASISHelp/WebHelp/commands/setopts_verb.htm` and `.../bbj-commands/setopts_verb_bbj.htm`, HTTP 200): **structural pass, exhaustive** — all 50 `SETOPTS_BITS` entries (8+8+8+8+7+7+4 across bytes 1/2/3/4/7/8/9) have a `byte` in the documented set `{1,2,3,4,7,8,9}`, a single-power-of-two `mask` (confirmed via `grep -oE 'mask: 0x[0-9A-Fa-f]+' | sort | uniq -c`, only 0x01/0x02/0x04/0x08/0x10/0x20/0x40/0x80 occur), no duplicate `(byte, mask)` pair, and a non-empty `label`; of the 12 entries marked `bbj: 'ignored'`, exactly the 4 that carry `bbjDetail` (lines 70, 78, 90, 91) are precisely the 4 whose BASIS "BBj Meaning" column gives more than the bare phrase "Ignored in BBj." — verified against the fetched `setopts_verb_bbj.htm` line-for-line for all 12 — so the `bbjDetail`-presence pattern is a faithful mirror of source-doc richness, not a completeness gap. **Value pass, stratified sample** — sampled the first and last declared entry per byte group (14 entries: byte1 0x80/0x01, byte2 0x80/0x01, byte3 0x80/0x01, byte4 0x80/0x01, byte7 0x80/0x01, byte8 0x80/0x02, byte9 0x80/0x10) against the fetched `setopts_verb.htm`: all 14 labels/details matched the BASIS text verbatim or as an accurate paraphrase, with zero mismatches. Traced msgbox-composer-ui.ts's bare `runComposer` command flow (lines 87-133) for a document-edit-staleness hazard: both the `arg?.edit` branch (lines 100-104, replacing `exprRange` coordinates) and the `arg?.insert` branch (lines 105-108, inserting at a captured `character` offset) apply `editor.edit(...)` using line/character coordinates captured by the Code Action *before* `runWizard` (line 94) runs four sequential `await`ed QuickPick steps (lines 136-160) — no re-fetch of the line's current text and no re-validation that the captured token/position still matches. Checked `await` rejection risk across all 8 files: the only `await`s are `showQuickPick`/`createQuickPick`/`showInputBox` in msgbox-composer-ui.ts, which resolve to `undefined` on cancel rather than reject; no other file performs an `await`. Checked `setopts-catalog.ts`'s hex/vector round-trip at the boundaries: short (odd-length "ABCDE" -> pads to "ABCDE0", `encodeVector` truncates back to 5 digits, round-trips exactly), over-long (>32 hex digits rejected outright by `parseVector`, line 135), non-hex (regex-rejected), and all-zero (`"00000000"` round-trips exactly) — all four boundaries verified lossless, including the reserved byte ranges the header describes as pass-through. 1 finding recorded: P62-D2-005 (msgbox-composer.ts's `assignTo` gap is folded into `P62-D1-005` as a D2-secondary aspect of the same unvalidated-field pattern, not double-counted here).
- D3 Performance & resource use — pass — Checked every catalog in this unit (`BUTTON_SETS`/`ICONS`/`DEFAULT_BUTTONS`/`FLAGS` in msgbox-composer.ts, `WINDOW_FLAGS`/`EVENT_MASK_BITS` in addwindow-composer.ts, `CHILD_WINDOW_FLAGS` in addchildwindow-composer.ts, `SETOPTS_BITS`/`BYTE_GROUPS` in setopts-catalog.ts): every one is a module-level `const` array built once at load, never reconstructed inside a function. Checked whether `msgboxPreview`/`addwindowPreview`/`addchildwindowPreview`/`setoptsPreview` — the four functions `RU-62-04`'s webviews call on every `'change'` message (i.e. every keystroke) — recompute unboundedly: each runs only fixed-size `.filter()`/`.reduce()`/`.map()` passes over catalogs of at most ~51 entries (setopts-catalog.ts) or ~26 (`WINDOW_FLAGS`), plus O(message-length) checks in `validateBbjExpression`/`resolvesToString`, with no loop over document or workspace content and no quadratic nesting. Checked the cost of `setopts-catalog.ts`'s hex/vector conversions relative to call frequency: bounded to at most 16 bytes (`MAX_BYTES`) per call, invoked once per preview recompute — negligible. Checked whether msgbox-composer.ts at 550 lines performs any work at module-load time beyond defining catalogs/functions: it does not — no top-level side effect runs before a function is invoked. Checked whether any of the 8 files retains a `vscode.TextEditor`/`TextDocument`/`WebviewPanel` reference beyond a single call: none does — the sole `vscode.window.activeTextEditor` read (msgbox-composer-ui.ts:88) is local to `runComposer`, never stored on module or object state. 0 findings recorded.
- D4 Maintainability & code smells — fail — Ran a programmatic structural diff (D-12), applying the D-15-confirmed asymmetric baseline (the `-composer.ts` comparison set is msgbox-composer.ts/addwindow-composer.ts/addchildwindow-composer.ts — 3 files, not 4; setopts-catalog.ts is SETOPTS's logic-layer counterpart, not a 4th `-composer.ts` row). Method 1 — normalized-identifier md5 on the three files' `findXCallAt` entry points (`findMsgboxCallAt` msgbox-composer.ts:546-550, `findAddWindowCallAt` addwindow-composer.ts:401-405, `findAddChildWindowCallAt` addchildwindow-composer.ts:301-305): after stripping each function's own type-name token, all three 5-line bodies hash identically (md5 `fa0e6220a97209e901f96f5a6c745b52`) — the same `.filter(...).reduce(...)` algorithm written out three times, 15 lines, no shared helper. Method 2 — `diff` on the top-level-argument scanner: msgbox-composer.ts's private unexported `scanArgs` (lines 470-498) is algorithmically identical to addwindow-composer.ts's exported `scanArgs` (lines 320-341, itself already reused by addchildwindow-composer.ts via `import { scanArgs, trimmedRange } from './addwindow-composer.js'`, lines 16-19) — `diff` on the two bodies shows only whitespace/statement-grouping style differences, zero control-flow differences. Method 3 — `git diff --no-index --numstat` pairwise: msgbox<->addwindow `306 451` (of 550/405 lines), msgbox<->addchildwindow `243 485` (of 550/308), addwindow<->addchildwindow `140 237` (of 405/308 — the closest pair, matching their shared hex-mask design). On the `-ui.ts` quartet: addwindow-composer-ui.ts<->addchildwindow-composer-ui.ts numstat `26 22` (of 68/72 lines — by far the closest pair) — both independently define a byte-identical-shaped `titleArg()` helper (differing only in the fallback literal `'"Window"'` vs `'"Child"'`) and the same `XCodeActionProvider`/`registerXComposer` contract, where msgbox-composer-ui.ts (193 lines: a QuickPick wizard plus a second legacy bare-command entry point) and setopts-composer-ui.ts (96 lines: `CodeLensProvider` + config.bbx line parsing) diff far more heavily (numstat 48-168 lines) against every other file in the quartet and each other — the four `-ui.ts` files do not share one register/open contract. **This is the logic/UI-layer half of the composer duplication D-12 allocates across two units — see `RU-62-04`'s `P62-D4-001` for the generator-layer half (the four `*-composer-webview.ts` files' `getNonce()`/CSP duplication); the two halves are counted once each and this record does not restate `P62-D4-001`'s evidence.** 1 finding recorded: P62-D4-004.
- D5 Test coverage gaps — fail — Established by enumeration: `ls bbj-vscode/test/ | grep -iE 'composer|setopt'` -> `addchildwindow-composer.test.ts`, `addwindow-composer.test.ts`, `composer-commands.test.ts`, `msgbox-composer.test.ts`, `setopts-catalog.test.ts` — five files, all importing only the `*-composer.ts`/`setopts-catalog.ts`/LS `composer-commands.ts` modules; `grep -rl 'composer-ui\|msgbox-composer-ui\|addwindow-composer-ui\|addchildwindow-composer-ui\|setopts-composer-ui' bbj-vscode/test/` returns nothing. So the four `-ui.ts` files in this unit — msgbox-composer-ui.ts (193 lines), addwindow-composer-ui.ts (68 lines), addchildwindow-composer-ui.ts (72 lines), setopts-composer-ui.ts (96 lines) — have **zero** test coverage, 429 combined lines with no test importing any of them. `npx vitest run` against the five existing composer test files confirms the pure-logic layer this quartet wraps is well tested (100/100 passing), which sharpens rather than excuses the gap: the untested 429 lines are precisely the command-registration/Code-Action/CodeLens wiring, including both `P62-D1-005`'s unvalidated-field composition paths and `P62-D2-005`'s stale-edit-range hazard — both entirely inside this untested quartet. 1 finding recorded: P62-D5-003.
- D6 Dependency health — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- D7 Cross-IDE parity — pass — For msgbox/addwindow/addchildwindow, confirmed both IDEs consume the exact functions this unit defines over the shared language server rather than a second, divergent codegen: `ComposerModels.java` (`bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java`, read in full, 245 lines) mirrors this unit's `MsgboxPreviewInput`/`MsgboxPreview`, `AddWindowPreviewInput`/`AddWindowPreview`, `AddChildWindowPreviewInput`/`AddChildWindowPreview` field-for-field as Gson DTOs — notably `ComposerModels.java`'s `AddWindowPreview` has no `valid`/error field, exactly matching this unit's own interface (addwindow-composer.ts:234-243), confirming `P62-D1-005`'s validation gap is symmetric across both IDEs, not VS Code-only. `AddWindowComposerDialog.java` (grepped for the emitted-code construction) calls `server.addWindowPreview(new AddWindowPreviewParams(input))` (line 238) and applies `p.statement` (line 247) with no additional client-side validation; `AddChildWindowComposerDialog.java` calls `server.addChildWindowPreview(...)` (line 247) identically; `MsgboxComposerDialog.java` (read in full) follows the same pattern for `msgboxPreview` — all three go over LSP4IJ to the same `bbj/composer/*/preview` LS handlers this unit's functions back (`composer-commands.ts`), so there is no second BBj-codegen implementation to compare on the IntelliJ side — a shared single source of truth, matching `RU-62-04`'s own D7 finding for the generator layer. Checked SETOPTS separately, per this unit's own D-15-confirmed asymmetry: `ls bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/` lists `AddChildWindowComposerDialog.java`, `AddWindowComposerDialog.java`, `BbjComposerServer.java`, `BbjComposerService.java`, `ComposerLauncher.java`, `ComposerModels.java`, `MsgboxComposerDialog.java` — no `SetoptsComposerDialog.java`, and `ComposerModels.java` defines no `SetOpts*` DTO; `grep -in setopts` against `ComposerLauncher.java` returns zero matches (contrast its `openMsgbox`/`openAddWindow`/`openAddChildWindow` dispatch at lines 90/118/139). This confirms, from this unit's own logic/UI-layer perspective, the same absence `RU-62-04` already recorded for `setopts-catalog.ts`/`setopts-composer-ui.ts`: SETOPTS has no IntelliJ counterpart at all. This is a genuine, IntelliJ-side divergence, not a VS Code-side defect, so per D-05 it is **not** recorded as a `P62-D7-*` finding here; see Cross-unit referrals below. 0 findings recorded.
- D8 Comment & doc accuracy — pass — Verified all four of setopts-catalog.ts's header claims (lines 1-17) against the code and against Task 1's D2 evidence: (1) "the config.bbx string is absolute and stateless — no OPTS query, no IOR/AND" — accurate; contrasted against the BASIS SETOPTS-verb docs' own IOR()/AND() examples for the runtime verb (which read OPTS before mutating), confirming the header's distinction between the config.bbx line and BBj-code SETOPTS is correct; (2) "Bytes 5–6 are data..., bytes 10–16 are reserved/application use and pass through as raw hex" — `MASK_COMMA_BYTE`/`MASK_DOT_BYTE` (lines 46-47) and `FIRST_RAW_BYTE = 10`/`MAX_BYTES = 16` (lines 51-52) match; (3) "NO vscode dependency" — confirmed by grep across all four "no vscode dependency"-claiming files (msgbox-composer.ts, addwindow-composer.ts, addchildwindow-composer.ts, setopts-catalog.ts): zero matches for `from 'vscode'`/`require('vscode')` in any of the four; (4) "reusable by the IntelliJ client and by the BBj-code SETOPTS composer (#475) later" — a forward-looking claim ("later"), not contradicted by the current absence of a SETOPTS IntelliJ dialog (the D7 cell above). Checked every JSDoc block across the other seven files for a claim that a value is escaped/validated/safe, to test against Task 1's D1 trace: addwindow-composer.ts's and addchildwindow-composer.ts's own comments make no escaping/validation claim at all (their two "safe"/"escape" hits — "sign bit safe" at addwindow-composer.ts:99 about integer overflow, and `""` escapes at addwindow-composer.ts:317 about *parsing* an existing call — claim nothing about output safety), so neither's silence on validation contradicts `P62-D1-005`; msgbox-composer.ts's `validateStringField` doc (lines 306-310) accurately scopes itself to "message / title / custom button" and does not claim to cover `assignTo`, an honest scope statement that happens to match the exact gap `P62-D1-005` records. Checked `CLAUDE.md` against this unit: it makes no positive claim about any of this unit's 8 files (confirmed: no filename from this unit appears anywhere in `CLAUDE.md`), so its silence is noted, consistent with `RU-62-04`'s and `RU-62-01`'s own precedent, and not promoted to a finding. 0 findings recorded.

### Findings

```
id:                P62-D1-005
unit:              RU-62-03
location:          bbj-vscode/src/addwindow-composer.ts:195-282, bbj-vscode/src/addchildwindow-composer.ts:117-215, bbj-vscode/src/msgbox-composer.ts:145,162,410
dimension:         D1
secondary:         [D2]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace of every string-typed field these three composers accept.
                    composeAddWindow (addwindow-composer.ts:275-282) builds
                    args = [input.x, input.y, input.width, input.height, input.title,
                    formatHex(input.flags)] and composeAddChildWindow
                    (addchildwindow-composer.ts:208-215) builds args = [input.id, input.x,
                    input.y, input.width, input.height, input.title, formatHex(input.flags),
                    input.context] -- neither file contains any validate-named function or call
                    (confirmed by grep), so x/y/width/height/title/sysgui/receiver/window/id/
                    context are embedded verbatim with zero structural or type check before the
                    call string is assembled. Neither AddWindowPreview (addwindow-composer.ts:
                    234-243) nor AddChildWindowPreview (addchildwindow-composer.ts:161-170)
                    carries a valid/error field, and no disabled/invalid gating exists on either
                    composer's Insert button (confirmed by grep across the corresponding webview
                    files). By contrast, in this SAME unit, msgbox-composer.ts's msgboxPreview
                    (lines 392-429) DOES call validateStringField (lines 311-326) on message
                    (line 398) and title (line 399), folding the result into a valid flag
                    (line 420) that gates the webview's Insert button -- yet msgbox-composer.ts's
                    OWN assignTo field (ComposeInput.assignTo, line 145) is used unchecked at
                    composeStatement line 162 (input.assignTo ? `${input.assignTo} = ${call}` :
                    call) and is never folded into msgboxPreview's valid computation, so a
                    malformed assignTo reaches an Insert-enabled statement despite the file's own
                    adjacent validation machinery. Confirmed every affected field's origin is the
                    developer's own webview <input type="text"> (msgbox-composer-webview.ts:219
                    assignTo; addwindow-composer-webview.ts:255,389 receiver/geometry/title;
                    addchildwindow-composer-webview.ts's equivalent) -- no editor-selection,
                    document-text, config.bbx or workspace-path value reaches these fields today,
                    matching RU-62-04's established SEC-01/SEC-02 fact (1).
failure_scenario:  A value the developer types or pastes into any of x/y/width/height/title/
                    sysgui/receiver/window/id/context/assignTo that is not a syntactically
                    complete BBj expression -- an unbalanced quote, or text containing a `;`
                    statement separator -- is written into the composed statement exactly as
                    typed, then inserted verbatim into the user's open document via the "new"
                    (non-edit) path already reviewed at RU-62-04, producing a syntactically
                    broken or semantically different statement than the composer's own preview
                    implied, with no warning and (for addwindow/addchildwindow, and for msgbox's
                    assignTo) no disabled Insert button to stop it.
classification:    major
                    (1) touches 1 file: FAIL -- a comprehensive fix touches addwindow-composer.ts,
                    addchildwindow-composer.ts and msgbox-composer.ts at minimum, each with its
                    own Preview interface -- (2) no public API/grammar/LSP change: FAIL --
                    AddWindowPreview/AddChildWindowPreview would need new valid/error fields
                    mirroring MsgboxPreview's shape, which is the bbj/composer/{addwindow,
                    addchildwindow}/preview LSP response consumed by both the VS Code webview and
                    the IntelliJ ComposerModels.java DTOs -- (3) no new dependency: pass -- (4)
                    regression-testable with vitest: pass -- (5) reviewer can name the exact edit:
                    pass (thread validateStringField-style checks through addwindowPreview/
                    addchildwindowPreview, and assignTo through msgboxPreview, matching msgbox's
                    own existing pattern) -- (6) severity is `low` but primary dimension is D1:
                    FAIL -- test (6) fails on the D1 primary-dimension clause alone, so
                    classification is `major` regardless of the other five tests (D-13's safety
                    gate).
effort:            8
dedup:             none -- checked against all 15 frozen open issues; #475 requests SETOPTS
                    decode-hover/tri-state composer UX, not input validation on the addWindow/
                    addChildWindow/msgbox composers; #385 requests launching an external Graffiti
                    Composer tool, unrelated to this in-tree composer's field validation. No other
                    frozen issue names composer input validation.
disposition:       major-refactor
```

```
id:                P62-D2-005
unit:              RU-62-03
location:          bbj-vscode/src/msgbox-composer-ui.ts:87-133
dimension:         D2
secondary:         [D1]
severity:          medium
evidence_tier:     repro
evidence:          runComposer (msgbox-composer-ui.ts:87-133) is the bare (non-visual)
                    bbj.composeMsgbox command handler, retained alongside the visual
                    bbj.composeMsgboxVisual webview path (both registered at lines 25-35). For
                    the arg?.edit branch (lines 100-104) it builds
                    new vscode.Range(line, exprRange[0], line, exprRange[1]) from the numeric
                    expr token's coordinates captured by MsgboxCodeActionProvider
                    (lines 37-79, info.exprRange) at the moment the Code Action was computed,
                    then applies editor.edit(...) using those coordinates directly -- no re-fetch
                    of the line's current text, no re-check that the token at that position still
                    matches what was decoded. Between the Code Action being computed and the edit
                    being applied, runComposer runs runWizard(initial) (line 94, defined
                    136-160) -- four sequential awaited showQuickPick/createQuickPick steps
                    (icon, buttonSet, defaultButton, flags), each an unbounded wait on user
                    interaction. The arg?.insert branch (lines 105-108) applies the identical
                    pattern to arg.insert.character, a raw offset captured at the same
                    Code-Action-computation moment. Unlike RU-62-04's webview panels, whose
                    onDidReceiveMessage only fires in direct response to a still-live webview,
                    this bare-command path runs entirely inside the extension host with no
                    comparable natural cutoff on how long the captured coordinates can go stale.
failure_scenario:  If the user edits the same document (adds/removes lines above the target
                    line, or edits the target line itself) at any point during the multi-step
                    QuickPick wizard, the previously captured line/exprRange/character
                    coordinates no longer correspond to the same content when editor.edit(...)
                    finally runs -- the edit can silently replace or insert into the wrong
                    location, corrupting text unrelated to the MSGBOX call the user originally
                    invoked the composer on, with no error surfaced to the user.
classification:    major
                    (1) touches 1 file: pass -- the fix is contained to msgbox-composer-ui.ts
                    (re-resolve the call at the captured line immediately before applying the
                    edit) -- (2) no public API/grammar/LSP change: pass -- (3) no new dependency:
                    pass -- (4) regression-testable with the existing harness: FAIL -- no test
                    file currently imports msgbox-composer-ui.ts or any -ui.ts file in this unit
                    (confirmed by grep, see P62-D5-003), and this file's vscode.window/
                    vscode.commands surface has no existing mock harness in this test suite to
                    extend without first building one -- (5) reviewer can name the exact edit:
                    pass -- (6) severity is `medium` and primary dimension is D2 (not D1): pass --
                    test (4) alone already fails, so classification is `major` per D-13 ("failing
                    any one test makes it major").
effort:            4
dedup:             none -- no frozen open issue names composer edit-position staleness or race
                    conditions.
disposition:       major-refactor
```

```
id:                P62-D4-004
unit:              RU-62-03
location:          bbj-vscode/src/msgbox-composer.ts:470-498,546-550, bbj-vscode/src/addwindow-composer.ts:320-341,401-405, bbj-vscode/src/addchildwindow-composer.ts:301-305, bbj-vscode/src/addwindow-composer-ui.ts, bbj-vscode/src/addchildwindow-composer-ui.ts
dimension:         D4
secondary:         []
severity:          medium
evidence_tier:     trace
evidence:          Mechanical structural diff (D-12), applying the D-15-confirmed asymmetric
                    baseline (the -composer.ts comparison set is msgbox-composer.ts/
                    addwindow-composer.ts/addchildwindow-composer.ts -- 3 files, not 4;
                    setopts-catalog.ts is SETOPTS's logic-layer counterpart, not a 4th
                    -composer.ts row). Method 1: normalized-identifier md5 on the three files'
                    findXCallAt entry points (findMsgboxCallAt msgbox-composer.ts:546-550,
                    findAddWindowCallAt addwindow-composer.ts:401-405,
                    findAddChildWindowCallAt addchildwindow-composer.ts:301-305) -- after
                    stripping each function's own type-name token, all three 5-line bodies hash
                    identically (md5 fa0e6220a97209e901f96f5a6c745b52), 15 duplicated lines, no
                    shared helper. Method 2: diff on the top-level-argument scanner --
                    msgbox-composer.ts's private unexported scanArgs (lines 470-498) is
                    algorithmically identical to addwindow-composer.ts's exported scanArgs
                    (lines 320-341, already reused by addchildwindow-composer.ts via
                    `import { scanArgs, trimmedRange } from './addwindow-composer.js'`, lines
                    16-19) -- diff on the two bodies shows only whitespace/statement-grouping
                    style differences, zero control-flow differences. Method 3:
                    `git diff --no-index --numstat` pairwise: msgbox<->addwindow "306 451" (of
                    550/405 lines), msgbox<->addchildwindow "243 485" (of 550/308),
                    addwindow<->addchildwindow "140 237" (of 405/308, the closest pair). On the
                    -ui.ts quartet: addwindow-composer-ui.ts<->addchildwindow-composer-ui.ts
                    numstat "26 22" (of 68/72 lines, by far the closest pair) -- both
                    independently define a byte-identical-shaped titleArg() helper (differing
                    only in the fallback literal '"Window"' vs '"Child"') and the same
                    XCodeActionProvider/registerXComposer contract, where msgbox-composer-ui.ts
                    (193 lines) and setopts-composer-ui.ts (96 lines) diff far more heavily
                    (numstat 48-168 lines) against every other file in the quartet. This is the
                    logic/UI-layer half of the composer duplication D-12 allocates across two
                    units -- see RU-62-04's P62-D4-001 for the generator-layer half (the four
                    *-composer-webview.ts files' getNonce()/CSP duplication); the two halves are
                    counted once each and this record does not restate P62-D4-001's evidence.
failure_scenario:  n/a -- D4 is a code-shape finding, not a runtime failure scenario; the
                    maintainability cost is that a future fix to the shared findXCallAt/scanArgs
                    algorithm must currently be applied by hand in three (effectively four,
                    counting the private msgbox copy) separate places with no shared source of
                    truth, and the addwindow/addchildwindow -ui.ts near-duplication means most
                    future Code-Action UX changes need a matching hand-edit in both files.
classification:    major
                    (1) touches 1 file: FAIL -- extracting a shared call-locator/scanner helper,
                    or a shared UI registration helper, necessarily touches at least 3
                    (composer.ts) or 2 (ui.ts) files at once -- (2) no public API/grammar/LSP
                    change: pass -- (3) no new dependency: pass -- (4) regression-testable with
                    vitest: pass (existing per-file test suites already assert each function's
                    current behavior; a refactor extracting a shared helper is covered by the
                    same tests) -- (5) reviewer can name the exact edit: pass -- (6) severity
                    `medium`, dimension D4 (not D1): pass -- test (1) alone fails, so
                    classification is `major` per D-13.
effort:            4
dedup:             none -- neither #475 nor #385 concerns code duplication within the composer
                    logic/UI layer. Cross-references RU-62-04's P62-D4-001 (the generator-layer
                    half of the same D-12 duplication callout) by ID rather than restating its
                    evidence.
disposition:       major-refactor
```

```
id:                P62-D5-003
unit:              RU-62-03
location:          bbj-vscode/src/msgbox-composer-ui.ts (193, absence), bbj-vscode/src/addwindow-composer-ui.ts (68, absence), bbj-vscode/src/addchildwindow-composer-ui.ts (72, absence), bbj-vscode/src/setopts-composer-ui.ts (96, absence)
dimension:         D5
secondary:         []
severity:          low
evidence_tier:     inherited
evidence:          Established by enumeration, not assumption:
                    `ls bbj-vscode/test/ | grep -iE 'composer|setopt'` -> five files
                    (addchildwindow-composer.test.ts, addwindow-composer.test.ts,
                    composer-commands.test.ts, msgbox-composer.test.ts,
                    setopts-catalog.test.ts), all importing only the *-composer.ts/
                    setopts-catalog.ts/LS composer-commands.ts modules (confirmed by each
                    file's own import lines); `grep -rl 'composer-ui\|msgbox-composer-ui\|
                    addwindow-composer-ui\|addchildwindow-composer-ui\|setopts-composer-ui'
                    bbj-vscode/test/` returns nothing. So the four -ui.ts files in this unit --
                    msgbox-composer-ui.ts (193 lines: MsgboxCodeActionProvider, the bare
                    runComposer/runWizard command flow, registerMsgboxComposer),
                    addwindow-composer-ui.ts (68 lines: AddWindowCodeActionProvider,
                    registerAddWindowComposer, titleArg), addchildwindow-composer-ui.ts
                    (72 lines: the equivalent for addChildWindow), and setopts-composer-ui.ts
                    (96 lines: SetOptsCodeActionProvider, SetOptsCodeLensProvider,
                    registerSetOptsComposer) -- have zero test coverage, 429 combined lines with
                    no test importing any of them. `npx vitest run
                    test/msgbox-composer.test.ts test/addwindow-composer.test.ts
                    test/addchildwindow-composer.test.ts test/setopts-catalog.test.ts
                    test/composer-commands.test.ts` confirms the pure-logic layer this quartet
                    wraps is well tested (100/100 passing), which sharpens rather than excuses
                    the gap: the untested 429 lines are precisely the command-registration/
                    Code-Action/CodeLens wiring, including both P62-D1-005's unvalidated-field
                    composition paths and P62-D2-005's stale-edit-range hazard -- both entirely
                    inside this untested quartet.
failure_scenario:  A regression in either P62-D1-005's (currently absent) field validation or
                    P62-D2-005's edit-position staleness would ship silently -- npm test is green
                    today (100/100 in this unit's own test files) with zero assertions against
                    any -ui.ts file, so neither finding, nor any future regression in the same
                    four files, would be caught by the existing suite.
classification:    major
                    (1) touches 1 file: FAIL -- comprehensive resolution requires a new test file
                    per -ui.ts module (or a shared vscode-mock harness covering all four),
                    touching more than 1 file -- (2) no public API/grammar/LSP change: pass --
                    (3) no new dependency: pass -- (4) regression-testable with existing harness:
                    n/a -- this finding *is* the missing-test gap, and no existing test in this
                    repository mocks vscode.window.showQuickPick/createQuickPick/
                    registerCodeActionsProvider/registerCodeLensProvider for reuse here -- (5)
                    reviewer can name the exact edit: pass (author a *-composer-ui.test.ts per
                    file using a minimal vscode-API mock, mirroring the gap and remediation shape
                    already recorded for the webview layer at RU-62-04's P62-D5-001) -- (6)
                    severity `low`, dimension D5 (not D1): pass -- test (1) alone fails, so
                    classification is `major` per D-13.
effort:            8
dedup:             none -- neither #475 nor #385 concerns test coverage for the composer
                    UI-wiring files; no DEBT-* requirement names this gap.
disposition:       major-refactor
```

### Not-reproducible dispositions

- **Tier failed: `repro` (D2).** Candidate claim: two invocations of `bbj.composeMsgbox`'s bare command flow (`runComposer`, msgbox-composer-ui.ts:87-133) against the same editor, started close together, could race — e.g. the second invocation's QuickPick wizard finishing and applying its edit while the first is still awaiting a QuickPick step, with both eventually applying overlapping/stale edits to the same range. **Reason not recorded as a finding:** confirming an actual overlapping-edit outcome requires a timing-controlled concurrent-invocation harness driving two `runComposer` calls with interleaved QuickPick responses and observing the resulting document state — that harness is explicitly deferred infrastructure per this phase's scope (`62-CONTEXT.md` `<deferred>`; any harness a specific finding demands is a Phase 67 deliverable). A static trace confirms `runComposer` holds no lock and no module-level state guarding against a second concurrent invocation, which makes the scenario theoretically possible but does not itself confirm an observable corrupted-edit outcome — left here rather than silently dropped, per RVW-06's drop-vs-disposition rule. (This is a different mechanism from `P62-D2-005`, which is a single-invocation staleness gap against the user's OWN document edits made during the wizard, not a race between two composer invocations.)

### Cross-unit referrals

- **RU-63-04** — Independently confirms, from this unit's own logic/UI-layer perspective, the same SETOPTS/IntelliJ absence `RU-62-04` already referred: `setopts-catalog.ts` (335 lines) and `setopts-composer-ui.ts` (96 lines, `bbj-vscode/src/`) have no IntelliJ counterpart — `ls bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/` lists no `SetoptsComposerDialog.java` and `ComposerModels.java` defines no `SetOpts*` DTO, and `ComposerLauncher.java` — grepped for `setopts`/`Setopts` — has zero matches anywhere in its dispatch logic (contrast `openMsgbox`/`openAddWindow`/`openAddChildWindow` at lines 90/118/139). `RU-63-04`'s own sweep should treat this as corroborated from two independent Phase 62 units (`RU-62-04`'s generator-layer view and this unit's logic/UI-layer view) when it confirms whether the absence is a deliberate, documented scope decision or an unaddressed feature gap.

## RU-62-05 — TextMate grammar & language configuration

**Files (3 / 256 LOC):**
- `bbj-vscode/syntaxes/bbj.tmLanguage.json` (74)
- `bbj-vscode/bbj-language-configuration.json` (100)
- `bbj-vscode/bbx-language-configuration.json` (82)

**Risk rank:** 4 of 5 Phase 62 units — assigned to Phase 62 per D-10 because the TextMate grammar is the highlighting source shared by VS Code and the IntelliJ TextMate bundle, making it a genuine D7 cross-IDE parity surface; regression #381 (config.bbx highlighting lost) is exactly this surface's failure mode.
**Sweep method (D-08):** mechanical diff + full read of both contribution manifests.
**Owning plan:** 62-04.

### Cells
- D1 Security — pending
- D2 Correctness & error handling — pending
- D3 Performance & resource use — pending
- D4 Maintainability & code smells — pending
- D5 Test coverage gaps — pending
- D6 Dependency health — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- D7 Cross-IDE parity — pending
- D8 Comment & doc accuracy — pending

### Findings

_(none recorded)_

### Not-reproducible dispositions

_(none recorded)_

### Cross-unit referrals

_(none recorded)_

## RU-62-02 — Editor feature modules

**Files (4 / 268 LOC):**
- `bbj-vscode/src/document-formatter.ts` (96)
- `bbj-vscode/src/line-numbering.ts` (49)
- `bbj-vscode/src/tokenized-bbj.ts` (39)
- `bbj-vscode/src/decompile-io.ts` (84)

**Risk rank:** 5 of 5 Phase 62 units — four small, independent editor-feature modules with the narrowest individual blast radius in the phase.
**Sweep method (D-08):** full read.
**Owning plan:** 62-05.

### Cells
- D1 Security — pending
- D2 Correctness & error handling — pending
- D3 Performance & resource use — pending
- D4 Maintainability & code smells — pending
- D5 Test coverage gaps — pending
- D6 Dependency health — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- D7 Cross-IDE parity — pending
- D8 Comment & doc accuracy — pending

### Findings

_(none recorded)_

### Not-reproducible dispositions

_(none recorded)_

### Cross-unit referrals

_(none recorded)_

## Phase 62 Close-Out

_(recorded by plan 62-05)_
</content>
