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
