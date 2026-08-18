# Phase 65 Coverage — the four cross-cutting security concerns (SEC-01, SEC-02, SEC-04, SEC-05)

**Swept tree:** branch `v4.0-stability-and-quality` at commit `1750ad749d55c3e88d74be3ac2d561d37e8170d0` — obtained by running `git rev-parse HEAD` at execution time and recorded **once for the whole phase**, never re-anchored per plan. HEAD advances with every v4.0 planning commit, including the commit that landed these three plans, so plans `65-02` and `65-03` describe this same tree rather than whatever HEAD has become by the time they run.

**Governing standard:** `.planning/reviews/INVENTORY.md` — the single immutable contract for Phases 61-69 (Phase 60 D-09). **Not edited by this phase**, and neither are `61-COVERAGE.md`, `62-COVERAGE.md`, `63-COVERAGE.md` or `64-COVERAGE.md`, all four of which are closed and verified. Drift found in any of the five is recorded here as a finding, never as an edit to them (D-15).

## The structural break — stated plainly, and evidenced rather than asserted

**This file's completeness construct differs from its four predecessors'.** INVENTORY defines no `RU-65-*` review units, so there is no applicability grid, no applicability cell, no `n/a` carry-forward, no cell gate and no file gate here. Every completeness mechanism that made Phases 61-64 mechanically verifiable is absent for Phase 65. Evidence, run at execution time rather than quoted from the discussion:

```bash
grep -c 'RU-65' .planning/reviews/INVENTORY.md
```

**Literal output: `0`.**

**The replacement (D-01), in one sentence:** the grid is replaced by **four closed surface enumerations**, one per requirement, each with a denominator **derived live by a recorded command** and **a verdict on every enumerated item** — the same auditable shape as the cell grid, keyed on security surfaces instead of INVENTORY rows, so that a reader can re-run each enumeration command, get the same denominator, and check every enumerated item against a verdict.

Phases 61-64 could prove completeness because INVENTORY handed them a closed denominator; Phase 65 constructs its own. This is said here plainly so that no reader expects a cell gate and concludes one is missing (D-01, D-03). The file keeps the name `65-COVERAGE.md` despite holding surfaces rather than grid rows, because Phase 68's DOC-03 concatenation walks `6N-COVERAGE.md` and renaming it for cosmetic accuracy would break that walk (D-03).

**All four denominators are closed before any surface is swept.** Plan `65-01` derives all four and writes one placeholder line for every enumerated item of all four, in `## Surface Enumeration Register` and in each surface's `### Verdicts` block, *before* sweeping anything. That ordering is the point: a denominator that can be widened or narrowed after the fact to fit what a sweep found proves nothing.

## Two recording-shape resolutions the structural break forces

Both are stated here so that neither reads as an omission:

1. **The required `unit:` field carries the surface ID.** INVENTORY's finding-record template requires `unit:` to name an `RU-{phase}-{seq}`. Phase 65 has no such unit to name, so `unit:` carries the **surface ID** — `SEC-01`, `SEC-02`, `SEC-04` or `SEC-05` — which is the denominator the record belongs to under D-01. No record in this file carries an `RU-` token in that field.
2. **Phase 64's `triage:` field is absent by decision, not by oversight.** That vocabulary (`fix-now` / `file-issue` / `accepted-with-reason`) was introduced for SEC-08's dependency triage and is required only on D6 dependency findings. Phase 65 records carry `classification:` and `disposition:` only. Adding an inapplicable field would make Phase 68's assembly ambiguous about which findings the triage buckets cover (D-08, D-10).

## Finding-ID namespace

Finding IDs are **`P65-D1-nnn`**, zero-padded to three digits, allocated **monotonically in discovery order across the whole phase** (all three plans share one sequence). **D1 throughout**: all four requirements are security concerns and D1 is the security dimension. A claim that is really about correctness rather than security belongs to the module-owning phase, not here (D-08, D-04). **No other dimension digit is allocated anywhere in this phase**, and INVENTORY's reserved template phase namespace (`P00-*`) is never allocated by any sweep phase, including this one.

**The classification consequence, stated as arithmetic rather than as a preference.** INVENTORY 3c test (6) makes a finding `major` whenever its severity is `critical` or `high` **or** its primary dimension is D1. Every `P65-*` finding is D1-primary by the rule above. Therefore **every record in this file is `classification: major`**, and Phase 67 inherits none of them as an apply candidate — they route through `MAJOR-REFACTORS.md` instead. This is said here rather than left for Phase 67 to discover by counting.

**Effort scale:** INVENTORY §3d's three values, `2` | `4` | `8`, and nothing else. Stated explicitly because Phase 63 shipped three off-scale values (`3`, `1`, `1`) that were unlabellable for ISSUE-03 and needed a post-hoc correction at verification time (D-09).

## Dedup source

INVENTORY's **Frozen Open-Issue Snapshot** — 15 issues, queried 2026-08-17 via `gh issue list --state open --limit 60`. Phase 69 re-queries the tracker live immediately before filing, catching anything opened mid-milestone, so this snapshot is not re-verified live at sweep time.

Checked here rather than assumed, by reading the snapshot's own `Area` column and its title/summary text:

- **0 of the 15** report a security defect of any kind. All 15 are feature requests, questions or non-security regression reports.
- **0 of the 15** mention credential, token, secret or password handling. A keyword grep over the 15 rows for `token|credential|secret|password|EM |injection|XSS|CSP|sanitiz|escap|vulnerab|security` returns exactly **1** line, and it is **#65 "support tokenized BBj files"** — a request for language support for *tokenized* (compiled) `.bbj` sources, which is not a credential concern at all.
- **0 of the 15** mention webview→extension message handling, message validation, or message shape.
- **3 of the 15** are topically adjacent to a Phase 65 surface without being security reports: **#231** (configurable classpath and command-line settings for starting BBj programs — SEC-05's spawn-argument surface), **#385** (launching the external Graffiti Composer from VS Code — again a spawn surface), and **#475** (SETOPTS hover decoding plus a tri-state composer — the feature request that produced `setopts-composer-webview.ts`, SEC-01's and SEC-02's surface).
- **0 of the 15** carry the repository's `dependencies` area label.

That composition is why most `dedup:` verdicts in this file resolve to `none` or to a `partial-overlap` against one of those three: the tracker has no open security issue anywhere near this phase's four surfaces, and a `none` here is a derived result rather than a shrug.

## The synthesis rule (D-04) — the organising rule of this whole file

The **30 inherited D1 findings** recorded by Phases 61-64 (9 + 7 + 8 + 6) are **inputs**. This phase cross-references them **by ID** and **never re-records them**.

A new `P65-*` ID is justified **only** when the cross-cutting view shows something no single-module review could have seen:

1. a gap that exists **between** two modules;
2. an **asymmetry** between the two IDEs — or between near-duplicate modules within one IDE — on the same concern;
3. a **chain** in which two individually-acceptable behaviours compose into an unacceptable one.

Anything whose evidence sits entirely inside one already-reviewed file, saying what a `P61`/`P62`/`P63`/`P64-D1-*` record already says, is recorded with `disposition: duplicate` naming the owning ID, per INVENTORY's disposition vocabulary (INVENTORY line 154). Every new record must state **which of the three** justifies it.

**Why this is a hard rule rather than a courtesy:** it is what keeps Phase 68's `MAJOR-REFACTORS.md` from listing one defect twice under two IDs, and it is what makes this phase a synthesis rather than a fifth sweep of the same files.

## The evidence rule (D-11) — the governing rule of this phase

**Do not assert a mechanism. Show it, or dispose of it as not-reproducible.**

A finding needs a reproduction, **or** a line-by-line trace naming concrete inputs/state and the exact `file:line` where behaviour diverges — INVENTORY's `repro` tier, which D1 carries. A bare assertion is not a finding. If confirming a claim would require constructing an exploit, it is recorded under that surface's `### Not-reproducible dispositions` with **what is established and what is not**, rather than promoted on the strength of plausibility.

**The precedent this rule is written from, named explicitly.** Phase 63's `P63-D1-002` claimed that `Files.copy` follows a symlink and overwrites the link's referent. **That is false** — `LinkOption.NOFOLLOW_LINKS` governs the *source* of a copy, not the target — and the claim survived an entire sweep, its own unit closure and the phase close-out. It was caught only at verification, **one phase before Phase 69 would have filed it as a public vulnerability report** against `bbj-intellij`. Every finding in this file is a security claim in a public repository, and this file feeds Phase 69 unmodified.

## The disclosure rule (D-14), inherited unchanged

For any finding rated `critical` or `high`: record **surface, problem class and impact only**. No trigger sequence, no payload, no working procedure, no step-by-step exploitation recipe. Every such redacted `evidence:` field **opens with the literal marker** `Disclosure-limited per D-14`, so that the redaction is auditable rather than indistinguishable from thin evidence. Lower severities record normally, with the `file:line` anchors Phase 67 needs.

**Why this phase is the most exposed in the milestone:** it is the security synthesis itself, in a public and forkable repository whose git history preserves an over-disclosure permanently even after a later edit, the surfaces in play carry Enterprise Manager credentials, and these records are the ones Phase 69 drafts into public issues. No user checkpoint is spent re-approving the rendered shape — it was approved at Phase 62 D-09 and carried unchanged through Phases 63 and 64.

## The scope fence (D-15)

This phase **fixes nothing, files nothing and re-triages nothing**. No source file is modified anywhere (Phase 67 applies fixes). No GitHub issue is filed or drafted (Phase 69, gated on ISSUE-01). No `DEBT-*` item is re-triaged (Phase 66). `INVENTORY.md` and the four closed coverage files are not edited.

**Note for Phase 68, stated here because it governs how every count in this file must be read: Phase 65 adds *surfaces*, not grid cells.** INVENTORY's 148-`applies` denominator and Phase 64's close-out position of **147 of 148** are unchanged by this file and must not be blended into. The four enumerations below are a separate, self-contained completeness construct.

## Surface Enumeration Register

Four sub-blocks, one per requirement, in the order `SEC-01`, `SEC-02`, `SEC-04`, `SEC-05`. Each records the requirement's own wording from `.planning/REQUIREMENTS.md`, the **derivation command run at execution time with its literal output**, the resulting denominator, and the **D-02 baseline with an explicit drift statement**. The baselines are recorded so that a drift is *visible* rather than silently absorbed; where the live derivation disagrees with one, the disagreement is written up **with its cause** rather than quietly adopted.

**One environment fact governs every command in this file and is recorded once here.** All derivations were run with **GNU grep (`/usr/bin/grep`, `grep (GNU grep) 3.x`)**, invoked as `command grep` to bypass an interactive shell wrapper that aliases `grep` to `ugrep`. The two agree on every count in this register (checked pair by pair), but GNU grep's multi-file output order is deterministic while the wrapper's is not, so **GNU grep is the authoritative tool for this file** and every enumerated line below is written in GNU grep's own output order. A reader re-running these commands in an interactive shell may see the same lines in a different order; the counts, which are what the gates compare, are identical.

### SEC-01 — webview HTML generators and their interpolation/DOM-sink sites

**Requirement (REQUIREMENTS.md:44, verbatim):** *Webview HTML generation audited for injection — every interpolated value into composer markup and the `setopts-composer-webview.ts` markup (scoped to the `bbx-config` language ID by `setopts-composer-ui.ts`) is escaped or provably safe, and CSP posture is documented.*

**Leg 1 — the generators.** Command:

```bash
grep -rln 'getHtml\|webview.html' bbj-vscode/src --include=*.ts | sort
```

**Literal output:**

```
bbj-vscode/src/addchildwindow-composer-webview.ts
bbj-vscode/src/addwindow-composer-webview.ts
bbj-vscode/src/msgbox-composer-webview.ts
bbj-vscode/src/setopts-composer-webview.ts
```

**Denominator, leg 1: 4 generators.** **D-02 baseline: 4. No drift.**

**Leg 2 — every interpolation-or-DOM-sink candidate within those generators.** Command:

```bash
G4=$(grep -rln 'getHtml\|webview.html' bbj-vscode/src --include=*.ts | sort)
grep -nE '\$\{|innerHTML|outerHTML|insertAdjacentHTML|document\.write' $G4
```

**Literal output — 32 lines, printed here as `path:line` anchors in the command's own order** (the full matched text of each is reproduced in `## SEC-01`'s `### Enumeration`):

```
bbj-vscode/src/addchildwindow-composer-webview.ts:159, :165, :173, :174, :180, :311, :326, :407
bbj-vscode/src/addwindow-composer-webview.ts:149, :158, :167, :168, :174, :291, :306, :372, :376, :382
bbj-vscode/src/msgbox-composer-webview.ts:126, :127, :133, :262, :268, :342
bbj-vscode/src/setopts-composer-webview.ts:95, :98, :126, :137, :138, :144, :220, :240
```

**Denominator, leg 2: 32 candidates** (8 + 10 + 6 + 8). **D-02 baseline: none stated** — D-02's table says "plus every interpolation site within them" without fixing a number, so 32 is this phase's first recorded value for it and there is nothing to drift from. It is a **candidate** set, deliberately over-capturing: leg 2's pattern matches every `${...}` template interpolation in the file, including interpolations into `WorkspaceEdit` document text and into the CSP string itself, which are not HTML-rendering sinks. The sweep resolves each candidate to a verdict or to `n/a` with a written exclusion reason; **no candidate is deleted**.

**SEC-01 enumerated-item total: 4 + 32 = 36.**

### SEC-02 — webview → extension message handlers and their case arms

**Requirement (REQUIREMENTS.md:45, verbatim):** *Webview → extension message handling audited — messages from webview content are validated for shape and value range before acting on them.*

**Leg 1 — the handlers.** Command:

```bash
grep -rn 'onDidReceiveMessage' bbj-vscode/src --include=*.ts
```

**Literal output:**

```
bbj-vscode/src/addchildwindow-composer-webview.ts:113:    panel.webview.onDidReceiveMessage(async (msg: { type: string; payload?: Selection }) => {
bbj-vscode/src/addwindow-composer-webview.ts:108:    panel.webview.onDidReceiveMessage(async (msg: { type: string; payload?: Selection }) => {
bbj-vscode/src/msgbox-composer-webview.ts:82:    panel.webview.onDidReceiveMessage(async (msg: { type: string; payload?: Selection }) => {
bbj-vscode/src/setopts-composer-webview.ts:70:    panel.webview.onDidReceiveMessage(async (msg: { type: string; payload?: PanelSelection }) => {
```

**Denominator, leg 1: 4 handlers.** **D-02 baseline: 4, one per composer webview. No drift.**

**Leg 2 — the case arms inside those handlers.** Command:

```bash
H4=$(grep -rln 'onDidReceiveMessage' bbj-vscode/src --include=*.ts | sort)
for f in $H4; do sed -n '/onDidReceiveMessage/,/^    });/p' "$f" | grep -cE "case '"; done
```

**Literal output:**

```
4
4
4
4
```

**Denominator, leg 2: 16 case arms** (4 per handler, uniform). Their absolute line anchors, derived by re-running the same `sed` window and mapping the relative match offsets back onto the file, are `addchildwindow-composer-webview.ts:115,123,126,139`; `addwindow-composer-webview.ts:110,118,121,134`; `msgbox-composer-webview.ts:84,92,97,115`; `setopts-composer-webview.ts:72,81,84,104`.

**Leg 3 — the `default:`-arm distribution across those handlers (D-13).** Command:

```bash
for f in $H4; do printf '%s %s\n' "$f" "$(sed -n '/onDidReceiveMessage/,/^    });/p' "$f" | grep -c 'default:')"; done
```

**Literal output:**

```
bbj-vscode/src/addchildwindow-composer-webview.ts 1
bbj-vscode/src/addwindow-composer-webview.ts 1
bbj-vscode/src/msgbox-composer-webview.ts 0
bbj-vscode/src/setopts-composer-webview.ts 0
```

**The distribution is NOT uniform: 2 of the 4 handlers have a `default:` arm and 2 do not.** This is recorded in the register rather than only in the sweep because a non-uniform distribution across four near-duplicate handlers is exactly the **asymmetry** D-04 names as a legitimate basis for a new `P65-*` ID, and because D-13 requires the case where the `switch`'s own `default` branch is the de-facto guard to be stated precisely rather than glossed. `## SEC-02`'s `### Runtime Validation Posture` states what each of the two `default:` arms actually does and what the two handlers lacking one do with an unrecognised `type`. The distribution is **derived, not assumed** — leg 3 is the derivation and the block above is its literal output. **D-02 records no baseline for this leg**, so there is nothing to drift from.

**SEC-02 enumerated-item total: 4 + 16 = 20.**

### The 4/4 symmetry between SEC-01 and SEC-02, asserted mechanically rather than narrated

D-02 states that the same four composer webviews generate the HTML *and* receive the messages, and that this is "not a coincidence to gloss over". That claim is tested here by **string equality of the two sorted file lists**, not by reading them and agreeing:

```bash
G4=$(grep -rln 'getHtml\|webview.html' bbj-vscode/src --include=*.ts | sort)
H4=$(grep -rln 'onDidReceiveMessage' bbj-vscode/src --include=*.ts | sort)
if [ "$G4" = "$H4" ]; then echo IDENTICAL; else echo DIFFERENT; fi
printf '%s\n' "$G4" | md5sum
printf '%s\n' "$H4" | md5sum
```

**Literal output:**

```
IDENTICAL
7febe665237daaa4ef9135041e4860ec  -
7febe665237daaa4ef9135041e4860ec  -
```

**The two sorted lists are byte-identical.** Every file that generates webview HTML also receives webview messages, and no file does one without the other. **What it means:** SEC-01 and SEC-02 are the HTML-out and messages-in halves of one four-file surface, which is why D-06 pairs them into plan `65-01` instead of having two plans read the same four files, and why a divergence between the four files on either half is a cross-file asymmetry rather than a per-file defect.

### SEC-04 — EM token lifecycle sites × lifecycle stages

**Requirement (REQUIREMENTS.md:47, verbatim):** *EM token lifecycle audited end to end — acquisition, storage at rest, exposure via process arguments or logs, and expiry handling across `BbjEMTokenStore`, `em-login.bbj`, `em-validate-token.bbj`.*

**Command:**

```bash
{ grep -rln 'EMToken\|emToken\|EM_TOKEN\|em\.token' bbj-vscode/src bbj-intellij/src; \
  ls bbj-vscode/tools/em-login.bbj bbj-vscode/tools/em-validate-token.bbj; } | sort -u
```

**Literal output:**

```
bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java
bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java
bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java
bbj-vscode/src/extension.ts
bbj-vscode/tools/em-login.bbj
bbj-vscode/tools/em-validate-token.bbj
```

**Denominator: 7 sites × 4 lifecycle stages = 28 enumerated items.** The four stages are the four ROADMAP criterion 3 names, and they are the only four: **`acquisition`**, **`at-rest`** (storage at rest), **`exposure`** (via process arguments or logs) and **`expiry`**. Every one of the 7 sites is addressed at every one of the 4 stages, so the section holds four lines for each site.

**D-02 baseline: 7 sites (5 source files + the 2 `.bbj` scripts). No drift** — the live derivation reproduces the baseline exactly, including `bbj-vscode/src/extension.ts`, which appears only because D-02 correction 1 added `\|em\.token` to the pattern. That correction is confirmed here rather than trusted: the VS Code side stores under the key `'bbj.em.token'` and matches none of `EMToken`, `emToken` or `EM_TOKEN`, so the pattern as first written in the discussion would have returned only the 4 IntelliJ files and the stated denominator of 7 would not have reproduced from its own stated command. The corrected pattern is the one this phase runs.

### SEC-05 — process-spawn argument and command-injection candidates

**Requirement (REQUIREMENTS.md:48, verbatim):** *Process spawning audited for argument and command injection across every run/compile path in both IDEs, including user-controlled paths, classpath values, and config.bbx settings.*

**Commands (three legs):**

```bash
# leg 1 — VS Code
grep -rnE 'child_process|spawn\(|spawnSync\(|execSync\(|execFile\(|exec\(' bbj-vscode/src --include=*.ts --include=*.cjs | grep -v '/generated/'
# leg 2 — IntelliJ
grep -rnE 'new GeneralCommandLine|new ProcessBuilder|Runtime\.getRuntime' bbj-intellij/src
# leg 3 — the BBj tool scripts
ls bbj-vscode/tools/*.bbj
```

**Literal counts: leg 1 = `25`, leg 2 = `8`, leg 3 = `3`.** Anchors, in each command's own output order:

```
leg 1: addchildwindow-composer.ts:286; Commands/Commands.cjs:3,25,31,117,271;
       language/bbj-completion-provider.ts:797; language/bbj-inlay-hint-provider.ts:143;
       language/bbj-cpl-service.ts:1,41,140; language/bbj-cpl-parser.ts:36;
       language/bbj-scope-local.ts:89; addwindow-composer.ts:121,385;
       msgbox-composer.ts:510,529; extension.ts:425,426,644,645;
       setopts-catalog.ts:261,267; document-formatter.ts:2,59      (all under bbj-vscode/src/)
leg 2: actions/BbjRunActionBase.java:298; actions/BbjRunBuiAction.java:115;
       actions/BbjEMLoginAction.java:98; actions/BbjRunDwcAction.java:115;
       actions/BbjRunGuiAction.java:27; lsp/BbjLanguageServer.java:38;
       BbjNodeDownloader.java:192; BbjNodeDetector.java:42
       (all under bbj-intellij/src/main/java/com/basis/bbj/intellij/)
leg 3: bbj-vscode/tools/em-login.bbj; bbj-vscode/tools/em-validate-token.bbj; bbj-vscode/tools/web.bbj
```

**Denominator: 25 + 8 + 3 = 36 raw candidates.**

**D-02 baseline: `27`, already demoted by D-02 correction 2 to a comparison baseline rather than a gate, because no single grep reproduces it. Live value 36 — a drift of +9, reported here with its cause rather than quietly adopted.** The cause is that the plan's leg-1 pattern is **wider** than the "naive pattern" measured at discussion time: D-02 correction 2 records 18 raw VS Code lines (of which 7 are `RegExp.prototype.exec` noise) plus 8 IntelliJ plus 3 scripts, i.e. 29 under its own decomposition; the leg-1 pattern actually run here additionally matches bare `child_process` import/require lines and the `execFile(` / `spawnSync(` / `execSync(` forms, and it captures 11 rather than 7 `.exec(` lines. Decomposed mechanically:

```bash
RAW=$(grep -rnE 'child_process|spawn\(|spawnSync\(|execSync\(|execFile\(|exec\(' bbj-vscode/src --include=*.ts --include=*.cjs | grep -v '/generated/')
printf '%s\n' "$RAW" | wc -l                                                  # 25
printf '%s\n' "$RAW" | grep -c 'child_process'                                # 6
printf '%s\n' "$RAW" | grep -v 'child_process' | grep -c '\.exec('            # 11
printf '%s\n' "$RAW" | grep -v 'child_process' | grep -v '\.exec(' | wc -l    # 8
```

**Literal outputs: `25`, `6`, `11`, `8`** — so leg 1's 25 lines are 6 `child_process` import/require/comment lines, 11 lines whose `exec(` is a `RegExp.prototype.exec` call on a non-`child_process` line, and 8 remaining lines (7 real spawn invocations plus one prose comment at `language/bbj-cpl-service.ts:41`). **That decomposition is recorded as the cause of the drift and explicitly not as verdicts** — assigning a verdict or an `n/a` to any of the 36 is plan `65-03`'s work, and this block must not be read as pre-empting it.

**The two-stage shape the SEC-05 sweep will use, because the raw greps deliberately over-capture:**

- **Stage 1** is the raw candidate set enumerated above — 36 lines, closed now, before anything is swept.
- **Stage 2** resolves **each** candidate either to a real process-spawn site carrying a verdict, or to `n/a` with a written exclusion reason on the same line (an import or `require` declaration, a comment, a `RegExp.prototype.exec` call, and so on).
- **No candidate is ever deleted, merged or silently narrowed.** The arithmetic must close: every raw candidate line becomes exactly one enumerated line, so the refinement is auditable rather than only its survivors being visible.
- **Any real spawn site the raw greps did not reach is added as an `[extra]` line carrying a verdict**, so the denominator can drift **upward and be seen to have drifted**. An enumeration that can only shrink is not a denominator.

**SEC-05 enumerated-item total: 36 (before any `[extra]` line).**

### Register totals

| Surface | Legs | Enumerated items | D-02 baseline | Drift |
|---|---|---|---|---|
| SEC-01 | 4 generators + 32 candidates | **36** | 4 generators; no number for candidates | none on leg 1; leg 1 of its kind for leg 2 |
| SEC-02 | 4 handlers + 16 case arms | **20** | 4 handlers; no number for arms | none on leg 1; `default:` distribution 2-of-4, no baseline |
| SEC-04 | 7 sites × 4 stages | **28** | 7 sites × 4 stages | none |
| SEC-05 | 25 + 8 + 3 raw candidates | **36** | 27, already demoted to a comparison | **+9, cause recorded above** |
| **Total** | | **120** | | |

## Inherited Findings Ledger

The D-04 cross-reference source: **one row per inherited D1 finding** across `61-COVERAGE.md`, `62-COVERAGE.md`, `63-COVERAGE.md` and `64-COVERAGE.md`. Derived live rather than transcribed. Commands:

```bash
for c in 61 62 63 64; do grep -A5 -E "^id:[[:space:]]+P$c-D1-" .planning/reviews/$c-COVERAGE.md \
  | grep -E '^id:|^location:|^severity:'; done
for c in 61 62 63 64; do printf '%s ' "$(grep -cE "^id:[[:space:]]+P$c-D1-" .planning/reviews/$c-COVERAGE.md)"; done; echo
```

**Literal output of the second command: `9 7 8 6`.** **Row count = 9 + 7 + 8 + 6 = 30**, stated as the live sum of the four per-file counts rather than as a number carried from `65-CONTEXT.md` or from anywhere else. The first command's output supplies every row's `location:` and `severity:` verbatim; those values are transcribed into the table below without alteration.

**Convention for the Surfaces column, stated so the column is auditable rather than impressionistic.** A surface is named **only** where the row's evidence anchors on that surface's enumerated items, or directly constrains a verdict on them. Mere topical adjacency — the same *shape* of defect reached through a different code path — is written in the clause instead of in the column, so that the stopping rule's part (iv) obliges a cross-reference exactly where one is owed. A row bearing on **none** of the four says so with `—`, because a ledger that lists only convenient rows is not a ledger.

| ID | Phase | `location:` | `severity:` | Surfaces | What it establishes for this phase |
|---|---|---|---|---|---|
| P61-D1-001 | 61 | `bbj-vscode/src/language/java-interop.ts:116-120` | medium | — | Workspace-settings-supplied `interopHost`/`interopPort` guarded by a falsy check only — the falsy-guard-instead-of-validation shape that recurs across this codebase, but on the SEC-06 socket surface, which is closed. |
| P61-D1-002 | 61 | `bbj-vscode/src/language/java-interop.ts:598-644` | medium | — | Peer-supplied fields copied onto AST nodes with no schema validation — an untrusted-value-into-a-rendering-context analogue on the SEC-06 surface, not on any of the four. |
| P61-D1-003 | 61 | `bbj-vscode/src/language/bbj-cpl-service.ts:82-155,228-235` | high | SEC-05 | The BBjCPL compile spawn: the executable path is derived entirely from `bbj.home` with only a truthiness guard, so it is an enumerated SEC-05 spawn site with a known owner. |
| P61-D1-004 | 61 | `bbj-vscode/src/language/bbj-hover.ts:88-106, bbj-vscode/src/language/bbj-completion-provider.ts:670-691` | medium | — | Peer-supplied documentation reaches LSP hover markdown unescaped and unbounded — the nearest analogue to SEC-01 *outside* SEC-01's enumerated surface, since hover markdown is not one of the four webview generators. |
| P61-D1-005 | 61 | `bbj-vscode/src/language/bbj-code-action-provider.ts:82-83, bbj-vscode/src/language/bbj-completion-provider.ts:99-113` | medium | — | An unvalidated peer-supplied FQN is written into the user's document via `TextEdit.insert` — the same document-edit-from-untrusted-value shape as SEC-02's blast radius, but reached from the interop peer rather than from a webview message. |
| P61-D1-006 | 61 | `bbj-vscode/src/language/bbj-ws-manager.ts:53-55` | medium | — | `initializationOptions.interopHost`/`interopPort` guarded by a falsy check only — the second instance of the same shape as P61-D1-001, on the same closed surface. |
| P61-D1-007 | 61 | `bbj-vscode/src/language/bbj-ws-manager.ts:118-126` | medium | SEC-05 | The configured `configPath` is read with no workspace-containment check, so a `config.bbx` at an attacker-influenced path is loaded — the upstream half of SEC-05's explicit "config.bbx settings" injection leg. |
| P61-D1-008 | 61 | `bbj-vscode/src/language/bbj-document-builder.ts:303-317` | medium | — | `USE`-statement text drives PREFIX path resolution with no containment check — a file-**read** path traversal, not a spawn or a webview sink. |
| P61-D1-009 | 61 | `bbj-vscode/src/language/bbj-ws-manager.ts:231-241` | low | — | Workspace membership tested by bare string-prefix comparison with no path-segment boundary — a containment-check defect on the closed language-server surface. |
| P62-D1-001 | 62 | `bbj-vscode/src/msgbox-composer-webview.ts:82-119` | low | SEC-02 | **The owner of the no-runtime-validation claim at the four handlers.** The `payload` is typed only by a compile-time TypeScript annotation and reaches `build()` with zero runtime shape, type or range check. SEC-02 tests this against every handler and every arm rather than rediscovering it. |
| P62-D1-002 | 62 | `bbj-vscode/src/msgbox-composer-webview.ts:366-373` | low | SEC-01 | **The owner of the nonce-source question.** `getNonce()` draws from `Math.random()`, a non-cryptographic PRNG, and its output is the sole `script-src` allowlist value. `### CSP Posture` states the nonce mechanism as part of the documented posture and cross-references this ID rather than re-recording it. |
| P62-D1-003 | 62 | `bbj-vscode/src/Commands/Commands.cjs:263,325-328` | critical | SEC-05 | The milestone's highest-severity open finding: workspace-settable strings interpolated unquoted into a `child_process.exec()` shell command. SEC-05's job is to establish whether the other enumerated spawn sites share its shape — **either way**. |
| P62-D1-004 | 62 | `bbj-vscode/src/extension.ts:415,420,639` | medium | SEC-04, SEC-05 | The raw JWT is interpolated as a literal command-line argument and is therefore visible in the OS process table. This is the token-as-process-argument overlap; **`65-02`/SEC-04 owns it** (D-07) and `65-03`/SEC-05 cross-references it. |
| P62-D1-005 | 62 | `bbj-vscode/src/addwindow-composer.ts:195-282, bbj-vscode/src/addchildwindow-composer.ts:117-215, bbj-vscode/src/msgbox-composer.ts:145,162,410` | low | SEC-02 | What an unchecked webview payload field actually reaches: the composer `build()` layer emits BBj syntax built from unescaped string fields. This bounds SEC-02's per-arm "first side effect" answers. |
| P62-D1-006 | 62 | `bbj-vscode/src/document-formatter.ts:59` | low | SEC-05 | `cp.spawn('java', …)` resolves `java` from `PATH` with no absolute-path pinning — an enumerated SEC-05 candidate with a known owner, and the contrast case against the `bbj.home`-pinned commands. |
| P62-D1-007 | 62 | `bbj-vscode/src/decompile-io.ts:15-27,29-35` | low | SEC-02 | Its own failure scenario is conditioned on a **webview-message-derived** path reaching `fs.promises.open`/`stat` with no realpath, symlink or file-type check — a chain SEC-02 must state is or is not currently reachable. |
| P63-D1-001 | 63 | `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:34-35,110-117,47-59` | high | — | Node.js archive integrity on download — SEC-03's surface, closed in Phase 63, with nothing flowing here as open work. |
| P63-D1-002 | 63 | `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:52` | low | SEC-05 | The **corrected** record (see the evidence rule above): on the cache *read* path an attacker-placed binary at the cached `node` path is returned to callers and subsequently spawned. Bears on SEC-05 as the provenance of a spawned executable. |
| P63-D1-003 | 63 | `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:103,BbjRunActionBase.java:302,BbjRunBuiAction.java:127,BbjRunDwcAction.java:127` | high | SEC-04, SEC-05 | The IntelliJ half of the token/password-as-process-argument exposure, at four sites. **`65-02`/SEC-04 owns it** (D-07); `65-03`/SEC-05 cross-references. |
| P63-D1-004 | 63 | `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:56-88` | medium | SEC-04 | `isTokenExpired()` fails **open** — returns "not expired" for a malformed token, a payload with no `exp`, and any exception. This is SEC-04's expiry stage on the IntelliJ side. |
| P63-D1-005 | 63 | `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:295,BbjEMLoginAction.java:96,104` | medium | SEC-04 | Temp files created with no explicit permission attributes on the path that carries the token — SEC-04's at-rest stage for the transient copy. |
| P63-D1-006 | 63 | `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:107-115,172-196` | low | SEC-02 | The IntelliJ composer writes a composed statement straight into the document with no validation — **the cross-IDE comparison point** for SEC-02's handler question, and the kind of asymmetry D-04 prizes. |
| P63-D1-007 | 63 | `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java:32,38-43,45-66` | high | SEC-05 | `resolveNodePath()` falls through settings → auto-detection → download cache → an unqualified name, and the result is spawned — an enumerated SEC-05 site (leg 2, `:38`) with a known owner. |
| P63-D1-008 | 63 | `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java:117-150` | low | — | A TCP connect with no protocol handshake is treated as liveness — the SEC-06 socket surface, closed. |
| P64-D1-001 | 64 | `bbj-vscode/tools/web.bbj:30-31` | medium | SEC-04 | A hardcoded EM administrator credential fallback that fails **open** into a privileged login — SEC-04's acquisition stage in a `.bbj` tool script. |
| P64-D1-002 | 64 | `bbj-vscode/tools/em-login.bbj:10-13,41-43` | high | SEC-04 | The raw JWT is written to a caller-supplied path — SEC-04's at-rest and exposure stages in a `.bbj` tool script. |
| P64-D1-003 | 64 | `bbj-vscode/tools/formatter/BBjCFCli.jar` | high | SEC-05 | Three unpinned vendored JARs are executed with no existence, hash or signature check — the executed-artifact provenance half of SEC-05, distinct from its argument-construction half. |
| P64-D1-004 | 64 | `.github/workflows/preview.yml:96-102` | high | — | A CI publish-credential exposure, recorded disclosure-limited under Phase 64 D-16. SEC-07's surface, closed; no CI component is in Phase 65's scope. |
| P64-D1-005 | 64 | `.github/workflows/preview.yml:8-10` | medium | — | `GITHUB_TOKEN` permission scope in a workflow — SEC-07's surface, closed. |
| P64-D1-006 | 64 | `bbj-intellij/gradle/wrapper/gradle-wrapper.properties:3-5` | high | — | Gradle wrapper distribution integrity — SEC-08/D6's surface, closed. |

**Ledger row distribution across the four surfaces**, so each plan knows its cross-reference obligation up front: **SEC-01 → 1 row** (`P62-D1-002`); **SEC-02 → 4 rows** (`P62-D1-001`, `P62-D1-005`, `P62-D1-007`, `P63-D1-006`); **SEC-04 → 6 rows** (`P62-D1-004`, `P63-D1-003`, `P63-D1-004`, `P63-D1-005`, `P64-D1-001`, `P64-D1-002`); **SEC-05 → 9 rows** (`P61-D1-003`, `P61-D1-007`, `P62-D1-003`, `P62-D1-004`, `P62-D1-006`, `P63-D1-002`, `P63-D1-003`, `P63-D1-007`, `P64-D1-003`); **no surface → 12 rows**. Two rows (`P62-D1-004`, `P63-D1-003`) name two surfaces each, which is why 1 + 4 + 6 + 9 + 12 = 32 counts those two twice against a row total of 30.

### The five inheritance facts, each re-confirmed now rather than restated

1. **`62-COVERAGE.md`'s close-out inheritance table has a Phase 65 row.** Confirmed by reading it (`62-COVERAGE.md:2066-2078`): *"Phase 65 | `### SEC-01/SEC-02 Surface Handoff` (`RU-62-04`) and every `P62-D1-*` record (7 across the phase) for the SEC-01/SEC-02/SEC-05 synthesis"*. The handoff's four facts are the SEC-01 and SEC-02 baseline that D-05 requires this phase to **test against the whole enumerated surface**, not to rediscover.
2. **`63-COVERAGE.md`'s close-out inheritance table has a Phase 65 row.** Confirmed by reading it (`63-COVERAGE.md:3220-3232`): *"Phase 65 | `RU-63-01`'s D1 records (`P63-D1-003`/`004`/`005`) as the IntelliJ half of the SEC-04/SEC-05 synthesis, plus the fact that SEC-03 is already closed — nothing on SEC-03 flows to Phase 65 as open work"*.
3. **`64-COVERAGE.md`'s close-out inheritance table has a Phase 65 row, and it states that nothing flows as open work by design.** Confirmed by reading it (`64-COVERAGE.md:3858-3872`): SEC-07 and SEC-08 both close in Phase 64, so Phase 65's scope carries no CI and no dependency component; as *context* rather than open work it names `P64-D1-001`, `P64-D1-002`, `P64-D1-003` and `62-COVERAGE.md:1489`'s `PATH`-resolved `java` interpreter.
4. **`61-COVERAGE.md` has no downstream-inheritance table at all.** Evidenced rather than asserted:

   ```bash
   grep -c 'Phase 65' .planning/reviews/61-COVERAGE.md
   ```

   **Literal output: `0`** (the command exits 1, as `grep -c` does on a zero count). The file mentions Phase 65 nowhere, and its `## Phase 61 Close-Out` carries no "what each downstream phase inherits" table of any kind — its nine `P61-D1-*` records are therefore inherited by this phase through the ledger above rather than through a handoff addressed to it.
5. **INVENTORY's routing table (D-06) has no Phase 65 row.** Evidenced:

   ```bash
   sed -n '1188,1196p' .planning/reviews/INVENTORY.md | grep -c 'Phase 65'
   ```

   **Literal output: `0`.** All six routed items target Phase 61 (five) or Phase 63 (one). No pre-identified finding is routed into this phase for triage, which is consistent with Phase 65 being a synthesis over already-recorded findings rather than a sweep with its own routed inbox.

## Stopping Rule & Write Contract

**Stopping rule (four parts).** A **surface's** sweep is complete when all four hold:

(i) **every enumerated item of that surface carries a verdict** — exactly one of `pass`, `fail`, `undetermined`, `n/a` — and **no placeholder line remains** in its section;
(ii) every `pass` carries a **written line naming the concrete checks applied**, phrased against that requirement's own REQUIREMENTS.md wording and never a bare verdict; every `fail` **names the finding ID that discharges it**, which may be a new `P65-D1-nnn` **or** an inherited owner ID from the ledger above; every `undetermined` **names its `### Not-reproducible dispositions` entry**; every `n/a` carries a **written exclusion reason** on the same line;
(iii) every candidate claim raised during the sweep is **either** promoted to a finding record clearing INVENTORY's `repro` tier for D1, **or** written under that surface's `### Not-reproducible dispositions` with its reason — visible rather than silently dropped (RVW-06);
(iv) every ledger row whose Surfaces column names that surface carries a **written cross-reference** in that surface's `### Cross-references`, or an explicit statement that it establishes nothing further for that surface.

**Zero inherited items may be silently dropped.** Once (i)-(iv) hold the surface is done and no further reading is licensed.

**Write contract.** Three plans append to this one file: `65-01` writes the whole skeleton, all four enumerations and `## SEC-01` + `## SEC-02`; `65-02` writes `## SEC-04`; `65-03` writes `## SEC-05` and `## Phase 65 Close-Out`. **A plan writes only into its own surface sections** — no fragment files, no assembly plan, no whole-file rewrite, no rewording of another plan's verdict line, and no edit to a denominator once it is closed. Ordering across this shared file is enforced **structurally by the wave dependency chain (D-06), not by an assumption about executor behaviour**: one plan per wave, waves 1-3, each plan's `depends_on` naming its predecessor.

**The enumerated-line grammar, frozen by `65-01` and used by all three plans:**

```
- [SURFACE][kind] <anchor> — <verdict> — <written line>
- [SURFACE][kind] <anchor> — pending
```

`<verdict>` is exactly one of `pass`, `fail`, `undetermined`, `n/a`. `<kind>` is one of `generator`, `candidate`, `handler`, `case`, `acquisition`, `at-rest`, `exposure`, `expiry`, or `extra` for a site the enumeration command did not reach. The second form is the **placeholder** every enumerated item is stubbed as in `65-01`, and it must reach **zero** only at the close-out. If a plan is interrupted mid-append, every unswept enumerated line still carries the placeholder token and remaining work stays mechanically countable at every wave.

### Two self-reference hazards in this file's own gates, named because both would otherwise silently invalidate them

This section is a **write contract**, so it necessarily *names* the tokens the gates *count*. That makes every gate in this phase vulnerable to being satisfied or broken by this paragraph rather than by the record. Both instances are named, and the anchored form of each gate is stated, so that all three plans measure the same thing:

1. **The placeholder token.** The grammar block above prints the placeholder form literally. Every placeholder gate is therefore anchored on the **line shape** `^- \[SEC-0[1245]\]\[[a-z-]+\] .* — pending$` and not on a bare substring count of the word. The grammar block uses the literal `[SURFACE][kind]` rather than a real surface ID precisely so that it cannot match. A gate counting the token anywhere in the file would be invalidated by this very section — the defect Phase 64's close-out ran into and had to explain away in prose.
2. **The D-14 disclosure marker.** The disclosure rule above states the required marker `Disclosure-limited per D-14` literally, because a rule that does not name its own marker cannot be followed. The consequence is arithmetic and must be stated: **an unanchored count of that phrase over the whole file is permanently one greater than the number of `critical`/`high` findings**, because the rule statement itself contributes one line. The auditable comparison is therefore the **anchored** one — the number of `critical`/`high` `severity:` lines must equal the number of `evidence:` lines opening with the marker:

   ```bash
   grep -cE '^severity:[[:space:]]+(critical|high)' .planning/reviews/65-COVERAGE.md
   grep -cE '^evidence:[[:space:]]+Disclosure-limited per D-14' .planning/reviews/65-COVERAGE.md
   ```

   These two must be **equal**. This is strictly stronger than the unanchored form: it verifies that the marker sits in the `evidence:` field of a redacted record, rather than merely appearing somewhere in the file. **All three plans use the anchored form**; a plan whose gate uses the unanchored comparison must expect the off-by-one and resolve it here rather than by deleting the rule statement or by inventing a `high` finding to balance the arithmetic.

### Record constraints that hold across every finding in this file

Every recorded finding uses INVENTORY's 13-field template verbatim, one field per line, inside a fenced block, in the template's exact order — `id`, `unit`, `location`, `dimension`, `secondary`, `severity`, `evidence_tier`, `evidence`, `failure_scenario`, `classification`, `effort`, `dedup`, `disposition` — with `unit:` a surface ID, `dimension:` `D1`, `evidence_tier:` `repro`, `classification:` `major` with all six INVENTORY 3c tests recorded pass/fail inline, `effort:` on `{2,4,8}`, `dedup:` never blank and checked against the frozen 15, and **no `triage:` field anywhere**. Every `location:` is a repository-relative `path:line` anchor: **no credential, EM token, password, session value or absolute developer-machine path is written into any field of any record.**

No finding is located in `java-interop/` (FUT-01), `bbj-vscode/src/language/generated/` (machine-generated), `bbj-vscode-deprecated/`, `CLAUDE.md`, `bbj-vscode/VERBs.md` or anything under `documentation/` — the first three are out of scope for the milestone and the last three are `RU-D8-01`'s surface, still the milestone's one unrecorded grid row and not Phase 65's to close.

## SEC-01 — Webview HTML generation & CSP posture

**Requirement (SEC-01, REQUIREMENTS.md:44):** *Webview HTML generation audited for injection — every interpolated value into composer markup and the `setopts-composer-webview.ts` markup (scoped to the `bbx-config` language ID by `setopts-composer-ui.ts`) is escaped or provably safe, and CSP posture is documented.*

**ROADMAP criterion discharged:** **criterion 1** — *Every interpolated value in composer markup and the `setopts-composer-webview.ts` markup (scoped to the `bbx-config` language ID by `setopts-composer-ui.ts`) is confirmed escaped/safe or flagged, and CSP posture is documented.*

### Enumeration

*Filled by plan `65-01`, Task 2. Denominator from `## Surface Enumeration Register`: 4 generators + 32 interpolation-or-DOM-sink candidates = 36 enumerated items.*

### Verdicts

- [SEC-01][generator] bbj-vscode/src/addchildwindow-composer-webview.ts — pending
- [SEC-01][generator] bbj-vscode/src/addwindow-composer-webview.ts — pending
- [SEC-01][generator] bbj-vscode/src/msgbox-composer-webview.ts — pending
- [SEC-01][generator] bbj-vscode/src/setopts-composer-webview.ts — pending
- [SEC-01][candidate] bbj-vscode/src/addchildwindow-composer-webview.ts:159 — pending
- [SEC-01][candidate] bbj-vscode/src/addchildwindow-composer-webview.ts:165 — pending
- [SEC-01][candidate] bbj-vscode/src/addchildwindow-composer-webview.ts:173 — pending
- [SEC-01][candidate] bbj-vscode/src/addchildwindow-composer-webview.ts:174 — pending
- [SEC-01][candidate] bbj-vscode/src/addchildwindow-composer-webview.ts:180 — pending
- [SEC-01][candidate] bbj-vscode/src/addchildwindow-composer-webview.ts:311 — pending
- [SEC-01][candidate] bbj-vscode/src/addchildwindow-composer-webview.ts:326 — pending
- [SEC-01][candidate] bbj-vscode/src/addchildwindow-composer-webview.ts:407 — pending
- [SEC-01][candidate] bbj-vscode/src/addwindow-composer-webview.ts:149 — pending
- [SEC-01][candidate] bbj-vscode/src/addwindow-composer-webview.ts:158 — pending
- [SEC-01][candidate] bbj-vscode/src/addwindow-composer-webview.ts:167 — pending
- [SEC-01][candidate] bbj-vscode/src/addwindow-composer-webview.ts:168 — pending
- [SEC-01][candidate] bbj-vscode/src/addwindow-composer-webview.ts:174 — pending
- [SEC-01][candidate] bbj-vscode/src/addwindow-composer-webview.ts:291 — pending
- [SEC-01][candidate] bbj-vscode/src/addwindow-composer-webview.ts:306 — pending
- [SEC-01][candidate] bbj-vscode/src/addwindow-composer-webview.ts:372 — pending
- [SEC-01][candidate] bbj-vscode/src/addwindow-composer-webview.ts:376 — pending
- [SEC-01][candidate] bbj-vscode/src/addwindow-composer-webview.ts:382 — pending
- [SEC-01][candidate] bbj-vscode/src/msgbox-composer-webview.ts:126 — pending
- [SEC-01][candidate] bbj-vscode/src/msgbox-composer-webview.ts:127 — pending
- [SEC-01][candidate] bbj-vscode/src/msgbox-composer-webview.ts:133 — pending
- [SEC-01][candidate] bbj-vscode/src/msgbox-composer-webview.ts:262 — pending
- [SEC-01][candidate] bbj-vscode/src/msgbox-composer-webview.ts:268 — pending
- [SEC-01][candidate] bbj-vscode/src/msgbox-composer-webview.ts:342 — pending
- [SEC-01][candidate] bbj-vscode/src/setopts-composer-webview.ts:95 — pending
- [SEC-01][candidate] bbj-vscode/src/setopts-composer-webview.ts:98 — pending
- [SEC-01][candidate] bbj-vscode/src/setopts-composer-webview.ts:126 — pending
- [SEC-01][candidate] bbj-vscode/src/setopts-composer-webview.ts:137 — pending
- [SEC-01][candidate] bbj-vscode/src/setopts-composer-webview.ts:138 — pending
- [SEC-01][candidate] bbj-vscode/src/setopts-composer-webview.ts:144 — pending
- [SEC-01][candidate] bbj-vscode/src/setopts-composer-webview.ts:220 — pending
- [SEC-01][candidate] bbj-vscode/src/setopts-composer-webview.ts:240 — pending

### CSP Posture

*Filled by plan `65-01`, Task 2. Records, per generator and with the check that established each, the D-12 positive result: the directive set as emitted, whether a nonce is generated per render and how, whether `script-src` is bound to that nonce, whether any script source outside the nonce is permitted, the panel options passed at creation, and whether `localResourceRoots` is set. Then the cross-generator comparison, stated explicitly, so a checked-and-clean generator is distinguishable from an unchecked one.*

### Findings

*Filled by plan `65-01`, Task 2.*

### Not-reproducible dispositions

*Filled by plan `65-01`, Task 2.*

### Cross-references

*Filled by plan `65-01`, Task 2. Ledger rows naming SEC-01: `P62-D1-002` (1 row).*

### Surface closure

*Filled by plan `65-01`, Task 2. States the four-part stopping rule discharged part by part, each with the count or command that evidences it, plus whether the live-derived denominator agreed with D-02's baseline of four generators.*

## SEC-02 — Webview → extension message trust

**Requirement (SEC-02, REQUIREMENTS.md:45):** *Webview → extension message handling audited — messages from webview content are validated for shape and value range before acting on them.*

**ROADMAP criterion discharged:** **criterion 2** — *Every webview→extension message handler validates message shape and value range before acting, with any gaps flagged.*

### Enumeration

*Filled by plan `65-01`, Task 3. Denominator from `## Surface Enumeration Register`: 4 handlers + 16 case arms = 20 enumerated items, with the `default:`-arm distribution derived as 1/1/0/0.*

### Verdicts

- [SEC-02][handler] bbj-vscode/src/addchildwindow-composer-webview.ts:113 — pending
- [SEC-02][handler] bbj-vscode/src/addwindow-composer-webview.ts:108 — pending
- [SEC-02][handler] bbj-vscode/src/msgbox-composer-webview.ts:82 — pending
- [SEC-02][handler] bbj-vscode/src/setopts-composer-webview.ts:70 — pending
- [SEC-02][case] bbj-vscode/src/addchildwindow-composer-webview.ts:115 — pending
- [SEC-02][case] bbj-vscode/src/addchildwindow-composer-webview.ts:123 — pending
- [SEC-02][case] bbj-vscode/src/addchildwindow-composer-webview.ts:126 — pending
- [SEC-02][case] bbj-vscode/src/addchildwindow-composer-webview.ts:139 — pending
- [SEC-02][case] bbj-vscode/src/addwindow-composer-webview.ts:110 — pending
- [SEC-02][case] bbj-vscode/src/addwindow-composer-webview.ts:118 — pending
- [SEC-02][case] bbj-vscode/src/addwindow-composer-webview.ts:121 — pending
- [SEC-02][case] bbj-vscode/src/addwindow-composer-webview.ts:134 — pending
- [SEC-02][case] bbj-vscode/src/msgbox-composer-webview.ts:84 — pending
- [SEC-02][case] bbj-vscode/src/msgbox-composer-webview.ts:92 — pending
- [SEC-02][case] bbj-vscode/src/msgbox-composer-webview.ts:97 — pending
- [SEC-02][case] bbj-vscode/src/msgbox-composer-webview.ts:115 — pending
- [SEC-02][case] bbj-vscode/src/setopts-composer-webview.ts:72 — pending
- [SEC-02][case] bbj-vscode/src/setopts-composer-webview.ts:81 — pending
- [SEC-02][case] bbj-vscode/src/setopts-composer-webview.ts:84 — pending
- [SEC-02][case] bbj-vscode/src/setopts-composer-webview.ts:104 — pending

### Runtime Validation Posture

*Filled by plan `65-01`, Task 3. States up front that the handlers are typed with a TypeScript annotation, that the annotation is erased at compile time, and that it is refused as evidence of validation (D-13). Then answers, per handler: what runtime check sits between message receipt and the first side effect; whether the `switch` has a `default` branch and what it does, with the per-handler derivation command and its literal output recorded; whether payload fields are checked for type, shape or value range before being read; and what the first side effect actually is. Then the cross-handler comparison, stated explicitly.*

### Findings

*Filled by plan `65-01`, Task 3.*

### Not-reproducible dispositions

*Filled by plan `65-01`, Task 3.*

### Cross-references

*Filled by plan `65-01`, Task 3. Ledger rows naming SEC-02: `P62-D1-001`, `P62-D1-005`, `P62-D1-007`, `P63-D1-006` (4 rows).*

### Surface closure

*Filled by plan `65-01`, Task 3. States the four-part stopping rule discharged part by part, plus whether the live denominator agreed with D-02's baseline of four handlers.*

## SEC-04 — EM token lifecycle end to end

**Requirement (SEC-04, REQUIREMENTS.md:47):** *EM token lifecycle audited end to end — acquisition, storage at rest, exposure via process arguments or logs, and expiry handling across `BbjEMTokenStore`, `em-login.bbj`, `em-validate-token.bbj`.*

**ROADMAP criterion discharged:** **criterion 3** — *The EM token lifecycle — acquisition, storage at rest, exposure via process args/logs, expiry — is traced end to end across `BbjEMTokenStore`, `em-login.bbj`, `em-validate-token.bbj`, and VS Code's equivalent storage.*

**Owned by plan `65-02` (wave 2).** Per D-07 this surface **owns the token-as-process-argument question outright**; `65-03`/SEC-05 cross-references it by ID rather than duplicating it.

### Enumeration

*Filled by plan `65-02`. Denominator from `## Surface Enumeration Register`: 7 sites × 4 lifecycle stages = 28 enumerated items.*

### Verdicts

- [SEC-04][acquisition] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java — pending
- [SEC-04][at-rest] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java — pending
- [SEC-04][exposure] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java — pending
- [SEC-04][expiry] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java — pending
- [SEC-04][acquisition] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java — pending
- [SEC-04][at-rest] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java — pending
- [SEC-04][exposure] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java — pending
- [SEC-04][expiry] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java — pending
- [SEC-04][acquisition] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java — pending
- [SEC-04][at-rest] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java — pending
- [SEC-04][exposure] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java — pending
- [SEC-04][expiry] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java — pending
- [SEC-04][acquisition] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java — pending
- [SEC-04][at-rest] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java — pending
- [SEC-04][exposure] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java — pending
- [SEC-04][expiry] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java — pending
- [SEC-04][acquisition] bbj-vscode/src/extension.ts — pending
- [SEC-04][at-rest] bbj-vscode/src/extension.ts — pending
- [SEC-04][exposure] bbj-vscode/src/extension.ts — pending
- [SEC-04][expiry] bbj-vscode/src/extension.ts — pending
- [SEC-04][acquisition] bbj-vscode/tools/em-login.bbj — pending
- [SEC-04][at-rest] bbj-vscode/tools/em-login.bbj — pending
- [SEC-04][exposure] bbj-vscode/tools/em-login.bbj — pending
- [SEC-04][expiry] bbj-vscode/tools/em-login.bbj — pending
- [SEC-04][acquisition] bbj-vscode/tools/em-validate-token.bbj — pending
- [SEC-04][at-rest] bbj-vscode/tools/em-validate-token.bbj — pending
- [SEC-04][exposure] bbj-vscode/tools/em-validate-token.bbj — pending
- [SEC-04][expiry] bbj-vscode/tools/em-validate-token.bbj — pending

### Lifecycle Matrix

*Filled by plan `65-02`. The stage × site matrix, with the `SecretStorage` versus `BbjEMTokenStore` at-rest comparison and the client-parse versus server-round-trip expiry comparison each written as comparisons.*

### Findings

*Filled by plan `65-02`.*

### Not-reproducible dispositions

*Filled by plan `65-02`.*

### Cross-references

*Filled by plan `65-02`. Ledger rows naming SEC-04: `P62-D1-004`, `P63-D1-003`, `P63-D1-004`, `P63-D1-005`, `P64-D1-001`, `P64-D1-002` (6 rows).*

### Surface closure

*Filled by plan `65-02`.*

## SEC-05 — Process-spawn argument & command injection

**Requirement (SEC-05, REQUIREMENTS.md:48):** *Process spawning audited for argument and command injection across every run/compile path in both IDEs, including user-controlled paths, classpath values, and config.bbx settings.*

**ROADMAP criterion discharged:** **criterion 4** — *Every run/compile process-spawn path in both IDEs is checked for argument/command injection via user-controlled paths, classpath values, or config.bbx settings.*

**Owned by plan `65-03` (wave 3)**, which also writes `## Phase 65 Close-Out`. Per D-07 the token-as-process-argument question belongs to SEC-04; this surface cross-references it by ID.

### Enumeration

*Filled by plan `65-03`. Denominator from `## Surface Enumeration Register`: 36 raw candidates (25 VS Code + 8 IntelliJ + 3 tool scripts), refined in two stages, with `[extra]` lines for any real spawn site the greps did not reach.*

### Verdicts

- [SEC-05][candidate] bbj-vscode/src/addchildwindow-composer.ts:286 — pending
- [SEC-05][candidate] bbj-vscode/src/Commands/Commands.cjs:3 — pending
- [SEC-05][candidate] bbj-vscode/src/Commands/Commands.cjs:25 — pending
- [SEC-05][candidate] bbj-vscode/src/Commands/Commands.cjs:31 — pending
- [SEC-05][candidate] bbj-vscode/src/Commands/Commands.cjs:117 — pending
- [SEC-05][candidate] bbj-vscode/src/Commands/Commands.cjs:271 — pending
- [SEC-05][candidate] bbj-vscode/src/language/bbj-completion-provider.ts:797 — pending
- [SEC-05][candidate] bbj-vscode/src/language/bbj-inlay-hint-provider.ts:143 — pending
- [SEC-05][candidate] bbj-vscode/src/language/bbj-cpl-service.ts:1 — pending
- [SEC-05][candidate] bbj-vscode/src/language/bbj-cpl-service.ts:41 — pending
- [SEC-05][candidate] bbj-vscode/src/language/bbj-cpl-service.ts:140 — pending
- [SEC-05][candidate] bbj-vscode/src/language/bbj-cpl-parser.ts:36 — pending
- [SEC-05][candidate] bbj-vscode/src/language/bbj-scope-local.ts:89 — pending
- [SEC-05][candidate] bbj-vscode/src/addwindow-composer.ts:121 — pending
- [SEC-05][candidate] bbj-vscode/src/addwindow-composer.ts:385 — pending
- [SEC-05][candidate] bbj-vscode/src/msgbox-composer.ts:510 — pending
- [SEC-05][candidate] bbj-vscode/src/msgbox-composer.ts:529 — pending
- [SEC-05][candidate] bbj-vscode/src/extension.ts:425 — pending
- [SEC-05][candidate] bbj-vscode/src/extension.ts:426 — pending
- [SEC-05][candidate] bbj-vscode/src/extension.ts:644 — pending
- [SEC-05][candidate] bbj-vscode/src/extension.ts:645 — pending
- [SEC-05][candidate] bbj-vscode/src/setopts-catalog.ts:261 — pending
- [SEC-05][candidate] bbj-vscode/src/setopts-catalog.ts:267 — pending
- [SEC-05][candidate] bbj-vscode/src/document-formatter.ts:2 — pending
- [SEC-05][candidate] bbj-vscode/src/document-formatter.ts:59 — pending
- [SEC-05][candidate] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:298 — pending
- [SEC-05][candidate] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java:115 — pending
- [SEC-05][candidate] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:98 — pending
- [SEC-05][candidate] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java:115 — pending
- [SEC-05][candidate] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunGuiAction.java:27 — pending
- [SEC-05][candidate] bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java:38 — pending
- [SEC-05][candidate] bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:192 — pending
- [SEC-05][candidate] bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDetector.java:42 — pending
- [SEC-05][candidate] bbj-vscode/tools/em-login.bbj — pending
- [SEC-05][candidate] bbj-vscode/tools/em-validate-token.bbj — pending
- [SEC-05][candidate] bbj-vscode/tools/web.bbj — pending

### Findings

*Filled by plan `65-03`.*

### Not-reproducible dispositions

*Filled by plan `65-03`.*

### Cross-references

*Filled by plan `65-03`. Ledger rows naming SEC-05: `P61-D1-003`, `P61-D1-007`, `P62-D1-003`, `P62-D1-004`, `P62-D1-006`, `P63-D1-002`, `P63-D1-003`, `P63-D1-007`, `P64-D1-003` (9 rows).*

### Surface closure

*Filled by plan `65-03`.*

## Phase 65 Close-Out

Stubbed by plan `65-01`; **filled by plan `65-03`**, which re-derives every gate live at its own execution time rather than restating any number from this file's header or register (D-16).

**A. Surface gate** — will carry all four denominators re-derived by their recorded commands, each printed with its literal output, and every one of the 120 enumerated items shown to carry a verdict with zero placeholder lines remaining. A denominator that drifts from `## Surface Enumeration Register` will be reported as a drift with its cause, not silently adopted.

**B. Criterion gate** — will answer each of ROADMAP's five Phase 65 success criteria **Met / Partially Met / Not Met**, naming the section that discharges it. The five, verbatim:

1. *Every interpolated value in composer markup and the `setopts-composer-webview.ts` markup (scoped to the `bbx-config` language ID by `setopts-composer-ui.ts`) is confirmed escaped/safe or flagged, and CSP posture is documented* — discharged by `## SEC-01`'s `### Verdicts` and `### CSP Posture`.
2. *Every webview→extension message handler validates message shape and value range before acting, with any gaps flagged* — discharged by `## SEC-02`'s `### Verdicts` and `### Runtime Validation Posture`.
3. *The EM token lifecycle — acquisition, storage at rest, exposure via process args/logs, expiry — is traced end to end across `BbjEMTokenStore`, `em-login.bbj`, `em-validate-token.bbj`, and VS Code's equivalent storage* — discharged by `## SEC-04`'s `### Verdicts` and `### Lifecycle Matrix`.
4. *Every run/compile process-spawn path in both IDEs is checked for argument/command injection via user-controlled paths, classpath values, or config.bbx settings* — discharged by `## SEC-05`'s `### Verdicts`.
5. *Every recorded finding carries `file:line`, dimension, and a verified failure scenario per the Phase 60 standard, and has been checked against the 15 open GitHub issues for duplication* — asserted with counts over the recorded fields.

**C. Requirement gate** — will mark each of **SEC-01**, **SEC-02**, **SEC-04** and **SEC-05** complete or explicitly not complete, with the evidence named. These four are the last open `SEC-*` requirements in the milestone; SEC-03, SEC-06, SEC-07 and SEC-08 closed inside Phases 61-64.

**D. Finding accounting** — will carry the phase's `P65-D1-nnn` allocation in discovery order, the severity distribution, the confirmation that every record is `classification: major` and none is `easy`, the `effort` distribution on `{2,4,8}`, the `dedup:` distribution against the frozen 15, and the anchored disclosure-marker identity from `## Stopping Rule & Write Contract`.

**E. Inherited-item accounting** — will show all 30 ledger rows dispositioned: every row whose Surfaces column names a surface cross-referenced in that surface's `### Cross-references`, every row naming none stated as such, and zero inherited items silently dropped.

**F. Scope-fidelity note** — will confirm that no source file was modified, no issue filed or drafted, no `DEBT-*` item re-triaged, and neither `INVENTORY.md` nor any of the four closed coverage files edited, evidenced by `git status --porcelain` over the reviewed trees and the five immutable records. It will also restate for Phase 68 that **Phase 65 adds surfaces, not grid cells**, leaving INVENTORY's 148-`applies` denominator and Phase 64's 147-of-148 position untouched.

**G. Closing confirmations** — will carry the D-11 evidence audit re-reading every `evidence:` field in this file against the show-the-mechanism rule, and the downstream-inheritance table stating what Phases 66, 67, 68 and 69 each inherit from this file.
