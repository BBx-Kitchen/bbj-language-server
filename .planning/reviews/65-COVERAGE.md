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
2. **The D-14 disclosure marker.** The disclosure rule above states the required marker `Disclosure-limited per D-14` literally, because a rule that does not name its own marker cannot be followed — and this very paragraph, explaining that fact, necessarily quotes it again. The consequence is arithmetic and must be stated precisely rather than approximated: **an unanchored count of that phrase over the whole file is inflated by every line of this document's own prose that quotes it for illustration** (the rule statement above, and this hazard-explanation paragraph itself, together contribute a **fixed, non-zero, growable-by-future-prose baseline** that has no relationship to the number of `critical`/`high` findings actually recorded). An unanchored count can therefore never validly equal the `critical`/`high` count except by accident. The auditable comparison is therefore the **anchored** one — the number of `critical`/`high` `severity:` lines must equal the number of `evidence:` lines opening with the marker:

   ```bash
   grep -cE '^severity:[[:space:]]+(critical|high)' .planning/reviews/65-COVERAGE.md
   grep -cE '^evidence:[[:space:]]+Disclosure-limited per D-14' .planning/reviews/65-COVERAGE.md
   ```

   These two must be **equal**. This is strictly stronger than the unanchored form: it verifies that the marker sits in the `evidence:` field of a redacted record, rather than merely appearing somewhere in the file. **All three plans use the anchored form**; a plan whose gate uses the unanchored comparison must expect a non-zero, prose-driven baseline mismatch and resolve it here — by substituting the anchored comparison for the unanchored one — rather than by deleting the rule statement, trimming this hazard explanation, or inventing a `high` finding to balance the arithmetic.

### Record constraints that hold across every finding in this file

Every recorded finding uses INVENTORY's 13-field template verbatim, one field per line, inside a fenced block, in the template's exact order — `id`, `unit`, `location`, `dimension`, `secondary`, `severity`, `evidence_tier`, `evidence`, `failure_scenario`, `classification`, `effort`, `dedup`, `disposition` — with `unit:` a surface ID, `dimension:` `D1`, `evidence_tier:` `repro`, `classification:` `major` with all six INVENTORY 3c tests recorded pass/fail inline, `effort:` on `{2,4,8}`, `dedup:` never blank and checked against the frozen 15, and **no `triage:` field anywhere**. Every `location:` is a repository-relative `path:line` anchor: **no credential, EM token, password, session value or absolute developer-machine path is written into any field of any record.**

No finding is located in `java-interop/` (FUT-01), `bbj-vscode/src/language/generated/` (machine-generated), `bbj-vscode-deprecated/`, `CLAUDE.md`, `bbj-vscode/VERBs.md` or anything under `documentation/` — the first three are out of scope for the milestone and the last three are `RU-D8-01`'s surface, still the milestone's one unrecorded grid row and not Phase 65's to close.

## SEC-01 — Webview HTML generation & CSP posture

**Requirement (SEC-01, REQUIREMENTS.md:44):** *Webview HTML generation audited for injection — every interpolated value into composer markup and the `setopts-composer-webview.ts` markup (scoped to the `bbx-config` language ID by `setopts-composer-ui.ts`) is escaped or provably safe, and CSP posture is documented.*

**ROADMAP criterion discharged:** **criterion 1** — *Every interpolated value in composer markup and the `setopts-composer-webview.ts` markup (scoped to the `bbx-config` language ID by `setopts-composer-ui.ts`) is confirmed escaped/safe or flagged, and CSP posture is documented.*

### Enumeration

Re-derived at Task 2 execution time, self-contained for a reader who starts here rather than at the header. Leg 1:

```bash
grep -rln 'getHtml\|webview.html' bbj-vscode/src --include=*.ts | sort
```

**Literal output:** `bbj-vscode/src/addchildwindow-composer-webview.ts`, `bbj-vscode/src/addwindow-composer-webview.ts`, `bbj-vscode/src/msgbox-composer-webview.ts`, `bbj-vscode/src/setopts-composer-webview.ts` — **4 generators, no drift from `## Surface Enumeration Register`.**

Leg 2:

```bash
G4=$(grep -rln 'getHtml\|webview.html' bbj-vscode/src --include=*.ts | sort)
grep -nE '\$\{|innerHTML|outerHTML|insertAdjacentHTML|document\.write' $G4 | wc -l
```

**Literal output: `32`, no drift.** Denominator unchanged: 4 + 32 = 36 enumerated items.

**D-05 test against the whole enumerated surface.** `62-COVERAGE.md`'s `### SEC-01/SEC-02 Surface Handoff` fact (1) (lines 87-96) concludes that across all four generators exactly two values reach the returned HTML string — `nonce` and `webview.cspSource` — plus one `innerHTML` exception at `setopts-composer-webview.ts:240` whose only externally-varying input is the static `BYTE_GROUPS` catalog. Reading every one of the 36 enumerated lines individually below **confirms this conclusion holds across the whole surface, not merely as a summary**: every `${...}` interpolation into an HTML string resolves to `nonce` or `cspSource`; every `innerHTML` assignment other than `setopts-composer-webview.ts:240` is a constant empty string; every other `${...}` candidate the leg-2 pattern over-captured is a `vscode.WorkspaceEdit` document-edit interpolation, not an HTML/DOM sink. **No disagreement with the Surface Handoff was found.**

### Verdicts

- [SEC-01][generator] bbj-vscode/src/addchildwindow-composer-webview.ts — pass — `getHtml()` (:169-422) interpolates only `${webview.cspSource}` (:173) and `${nonce}` (:174, :180, :311) into the returned HTML string; both are VS-Code-internal/self-generated values, never editor-selection, document-text, `config.bbx`, workspace-path, or catalog data; the file's two `innerHTML` sinks (:326, :407) each assign only a constant empty string; panel options are `{ enableScripts: true, retainContextWhenHidden: true }` with no `localResourceRoots` override and no `asWebviewUri` call (confirmed by grep, zero matches).
- [SEC-01][generator] bbj-vscode/src/addwindow-composer-webview.ts — pass — `getHtml()` (:163-399) interpolates only `${webview.cspSource}` (:167) and `${nonce}` (:168, :174, :291); same VS-Code-internal/self-generated-only sourcing as the other three generators; the file's four `innerHTML` sinks (:306, :372, :376, :382) each assign only a constant empty string; panel options `{ enableScripts: true, retainContextWhenHidden: true }`, no `localResourceRoots`, no `asWebviewUri`.
- [SEC-01][generator] bbj-vscode/src/msgbox-composer-webview.ts — pass — `getHtml()` (:122-364) interpolates only `${webview.cspSource}` (:126) and `${nonce}` (:127, :133, :262); same VS-Code-internal/self-generated-only sourcing as the other three generators; the file's two `innerHTML` sinks (:268, :342) each assign only a constant empty string; panel options `{ enableScripts: true, retainContextWhenHidden: true }`, no `localResourceRoots`, no `asWebviewUri`.
- [SEC-01][generator] bbj-vscode/src/setopts-composer-webview.ts — pass — `getHtml()` (:133-312) interpolates only `${webview.cspSource}` (:137) and `${nonce}` (:138, :144, :220); the file's one genuine content-bearing `innerHTML` sink (:240) interpolates only the static `BYTE_GROUPS` catalog (`setopts-catalog.ts:35-43`), never document/workspace/message data; panel options `{ enableScripts: true, retainContextWhenHidden: true }`, no `localResourceRoots`, no `asWebviewUri`.
- [SEC-01][candidate] bbj-vscode/src/addchildwindow-composer-webview.ts:159 — n/a — `, ${r.eventHex}` is interpolated into a `vscode.WorkspaceEdit` insert applied to the user's own BBj document inside `applyEdit()` (:147-167), not into any HTML string returned by `getHtml()` or written into the webview DOM — a document-edit interpolation, not an HTML-rendering sink.
- [SEC-01][candidate] bbj-vscode/src/addchildwindow-composer-webview.ts:165 — n/a — `, ${r.flagsHex}` is likewise a `vscode.WorkspaceEdit` insert into the user's BBj document inside `applyEdit()`, not an HTML interpolation or DOM sink.
- [SEC-01][candidate] bbj-vscode/src/addchildwindow-composer-webview.ts:173 — pass — `${webview.cspSource}` interpolates VS Code's own per-webview origin string into the `style-src` CSP directive — an opaque, VS-Code-internal value, never document/workspace/catalog-derived, byte-identical directive text confirmed across all four generators by md5 (`308a7d4ffd99b94d598341ca988dd267`).
- [SEC-01][candidate] bbj-vscode/src/addchildwindow-composer-webview.ts:174 — pass — `${nonce}` interpolates the locally-generated 32-character alnum nonce (`getNonce()`, :424-431, byte-identical across all four files, confirmed by md5 `2703b8e54057ff248b28ad9ca453c5e7`) into the `script-src 'nonce-…'` directive; the fixed `A-Za-z0-9` charset contains no character capable of breaking out of the directive string.
- [SEC-01][candidate] bbj-vscode/src/addchildwindow-composer-webview.ts:180 — pass — `${csp}` interpolates the already-assembled CSP directive string, built only from the two safe values above, into the `<meta http-equiv="Content-Security-Policy" content="…">` attribute; no externally-sourced value reaches it at any point in the chain.
- [SEC-01][candidate] bbj-vscode/src/addchildwindow-composer-webview.ts:311 — pass — `${nonce}` is written onto the panel's single inline `<script nonce="…">` tag; the same alnum-only nonce as the CSP directive, safe against attribute breakout, and required by this file's own `script-src 'nonce-…'` binding for the script to execute at all.
- [SEC-01][candidate] bbj-vscode/src/addchildwindow-composer-webview.ts:326 — n/a — `container.innerHTML = '';` assigns a constant empty string, clearing prior checkbox children before `renderChecks()` repopulates them via safe `createElement`/`textContent` calls; no interpolated or externally-sourced value reaches this sink.
- [SEC-01][candidate] bbj-vscode/src/addchildwindow-composer-webview.ts:407 — n/a — `badges.innerHTML = '';` likewise assigns a constant empty string before the badge list is rebuilt with `createElement`/`textContent` in `drawMock()`; no interpolated value reaches this sink.
- [SEC-01][candidate] bbj-vscode/src/addwindow-composer-webview.ts:149 — n/a — `, ${r.flagsHex}` is a `vscode.WorkspaceEdit` insert into the user's BBj document inside `applyEdit()` (:142-161), not an HTML interpolation or DOM sink.
- [SEC-01][candidate] bbj-vscode/src/addwindow-composer-webview.ts:158 — n/a — `, ${r.eventHex}` is likewise a document-edit insert inside `applyEdit()`, not an HTML/DOM sink.
- [SEC-01][candidate] bbj-vscode/src/addwindow-composer-webview.ts:167 — pass — `${webview.cspSource}` in the `style-src` directive: the same VS-Code-internal opaque origin string as the other three generators, never document/workspace/catalog-derived, byte-identical directive text confirmed by md5.
- [SEC-01][candidate] bbj-vscode/src/addwindow-composer-webview.ts:168 — pass — `${nonce}` in the `script-src 'nonce-…'` directive: the same fixed alnum-charset nonce as the other three generators, byte-identical `getNonce()` confirmed by md5, safe against directive-string breakout.
- [SEC-01][candidate] bbj-vscode/src/addwindow-composer-webview.ts:174 — pass — `${csp}` in the CSP `<meta>` tag's `content` attribute: assembled only from the two safe values above; no externally-sourced value reaches it.
- [SEC-01][candidate] bbj-vscode/src/addwindow-composer-webview.ts:291 — pass — `${nonce}` on the inline `<script nonce="…">` tag: the same alnum-only nonce as the CSP directive, safe against attribute breakout, required for the script to execute under this file's own `script-src` binding.
- [SEC-01][candidate] bbj-vscode/src/addwindow-composer-webview.ts:306 — n/a — `container.innerHTML = '';` assigns a constant empty string before `renderChecks()` repopulates the flag-group checkboxes via `createElement`/`textContent`; no interpolated value reaches this sink.
- [SEC-01][candidate] bbj-vscode/src/addwindow-composer-webview.ts:372 — n/a — `btns.innerHTML = '';` assigns a constant empty string before the title-bar button glyphs are rebuilt with `createElement`/`textContent` in `drawMock()`; no interpolated value reaches this sink.
- [SEC-01][candidate] bbj-vscode/src/addwindow-composer-webview.ts:376 — n/a — `body.innerHTML = '';` likewise clears to a constant empty string before `drawMock()` rebuilds the window-body state markers with `createElement`; no interpolated value reaches this sink.
- [SEC-01][candidate] bbj-vscode/src/addwindow-composer-webview.ts:382 — n/a — `badges.innerHTML = '';` clears to a constant empty string before the badge list is rebuilt with `createElement`/`textContent`; no interpolated value reaches this sink.
- [SEC-01][candidate] bbj-vscode/src/msgbox-composer-webview.ts:126 — pass — `${webview.cspSource}` in the `style-src` directive: the same VS-Code-internal opaque origin string as the other three generators, byte-identical directive text confirmed by md5.
- [SEC-01][candidate] bbj-vscode/src/msgbox-composer-webview.ts:127 — pass — `${nonce}` in the `script-src 'nonce-…'` directive: the same fixed alnum-charset nonce as the other three generators, byte-identical `getNonce()` confirmed by md5, safe against directive-string breakout.
- [SEC-01][candidate] bbj-vscode/src/msgbox-composer-webview.ts:133 — pass — `${csp}` in the CSP `<meta>` tag's `content` attribute: assembled only from the two safe values above; no externally-sourced value reaches it.
- [SEC-01][candidate] bbj-vscode/src/msgbox-composer-webview.ts:262 — pass — `${nonce}` on the inline `<script nonce="…">` tag: the same alnum-only nonce as the CSP directive, safe against attribute breakout, required for the script to execute under this file's own `script-src` binding.
- [SEC-01][candidate] bbj-vscode/src/msgbox-composer-webview.ts:268 — n/a — `sel.innerHTML = '';` in `fillSelect()` assigns a constant empty string before the `<select>`'s `<option>` children are rebuilt via `createElement`/`textContent`; no interpolated value reaches this sink.
- [SEC-01][candidate] bbj-vscode/src/msgbox-composer-webview.ts:342 — n/a — `mb.innerHTML = '';` (`mock-buttons`) clears to a constant empty string before the schematic-preview button spans are rebuilt with `createElement`/`textContent`; no interpolated value reaches this sink.
- [SEC-01][candidate] bbj-vscode/src/setopts-composer-webview.ts:95 — n/a — ` ${r.hexDigits}` is interpolated into a `vscode.WorkspaceEdit` insert applied to the user's `config.bbx` document inside the `'apply'` handler (:84-103), not into any HTML string or webview DOM sink.
- [SEC-01][candidate] bbj-vscode/src/setopts-composer-webview.ts:98 — n/a — `${r.line}\n` is likewise a `vscode.WorkspaceEdit` insert into the user's `config.bbx` document for the NEW-statement path, not an HTML/DOM sink.
- [SEC-01][candidate] bbj-vscode/src/setopts-composer-webview.ts:126 — n/a — `${b.byte}:${b.mask}` builds a plain JS identifier string (e.g. `"3:2"`) placed in the `initial.checked` array sent via `postMessage`; the client only compares it with `.includes()` to set a checkbox's boolean `.checked` property (:286-288) — never concatenated into markup. The underlying `original` vector this is filtered from can originate from `target.originalHex` (`config.bbx` document text), but that document-derived value still never reaches an HTML string or DOM sink through this path, so this does not disagree with `62-COVERAGE.md`'s Surface Handoff conclusion (D-05).
- [SEC-01][candidate] bbj-vscode/src/setopts-composer-webview.ts:137 — pass — `${webview.cspSource}` in the `style-src` directive: the same VS-Code-internal opaque origin string as the other three generators, byte-identical directive text confirmed by md5.
- [SEC-01][candidate] bbj-vscode/src/setopts-composer-webview.ts:138 — pass — `${nonce}` in the `script-src 'nonce-…'` directive: the same fixed alnum-charset nonce as the other three generators, byte-identical `getNonce()` confirmed by md5, safe against directive-string breakout.
- [SEC-01][candidate] bbj-vscode/src/setopts-composer-webview.ts:144 — pass — `${csp}` in the CSP `<meta>` tag's `content` attribute: assembled only from the two safe values above; no externally-sourced value reaches it.
- [SEC-01][candidate] bbj-vscode/src/setopts-composer-webview.ts:220 — pass — `${nonce}` on the inline `<script nonce="…">` tag: the same alnum-only nonce as the CSP directive, safe against attribute breakout, required for the script to execute under this file's own `script-src` binding.
- [SEC-01][candidate] bbj-vscode/src/setopts-composer-webview.ts:240 — pass — `legend.innerHTML = 'Byte ' + byteNo + ' <span class="byte-no">— ' + groups[byteNo] + '</span>';` is a genuine `innerHTML` sink with interpolated content, but both `byteNo` and `groups[byteNo]` are drawn exclusively from the developer-authored `BYTE_GROUPS` catalog constant (`setopts-catalog.ts:35-43`, 7 fixed literal strings keyed by 7 fixed numeric keys); no editor-selection, document-text, `config.bbx`, workspace-path, or message-supplied value ever reaches this sink — confirmed by tracing `renderCatalog(m.catalog, m.groups)`'s only call site (:284-285), which passes the static `SETOPTS_BITS`/`BYTE_GROUPS` catalog exports unchanged.

### CSP Posture

**Directive set, per generator, checked by reading each `getHtml()` body in full and confirmed byte-identical by md5 (`308a7d4ffd99b94d598341ca988dd267` over the `const csp = [...]` array literal in all four files):**

```
default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'
```

Present verbatim in `msgbox-composer-webview.ts:124-128`, `addwindow-composer-webview.ts:165-169`, `addchildwindow-composer-webview.ts:171-175`, `setopts-composer-webview.ts:135-139`. `default-src 'none'` blocks image/connect/frame/font/media loads by default (none of the four generators needs any of those, checked by grepping each file for `<img`, `fetch(`, `<iframe`, `@font-face` — zero matches). `style-src` grants `'unsafe-inline'` (needed for the inline `<style>` block each file emits) plus the webview's own origin. `script-src` allows **only** the single nonce'd inline `<script>` tag each file emits — no `'unsafe-inline'` for scripts, no external script source — checked by grepping each file for `<script src=` and `http` inside the `<script>` block, zero matches beyond the one nonce'd tag.

**Nonce, per generator, checked by reading `getNonce()` in each file and confirming byte-identical implementation by md5 (`2703b8e54057ff248b28ad9ca453c5e7`):** a fresh 32-character nonce is generated **once per `getHtml()` call** (i.e. once per panel open) by indexing a 62-character `A-Za-z0-9` alphabet with `Math.floor(Math.random() * chars.length)`. The nonce is bound into `script-src 'nonce-${nonce}'` and onto the single inline `<script nonce="${nonce}">` tag in the same file — checked line-by-line above at every `[SEC-01][candidate]` verdict naming `${nonce}`. **`Math.random()` is a non-cryptographic PRNG; this weakness is already recorded as `P62-D1-002` (cross-referenced below, not re-recorded) and does not create a live injection path today because — per the enumeration above — no editor-selection/document/config.bbx/workspace/message value ever reaches any of the four HTML strings for a predicted nonce to matter against.**

**Panel options, per generator, checked by reading each `createWebviewPanel()` call:** all four pass `{ enableScripts: true, retainContextWhenHidden: true }` (`msgbox-composer-webview.ts:74`, `addwindow-composer-webview.ts:96`, `addchildwindow-composer-webview.ts:101`, `setopts-composer-webview.ts:64`) — checked identical by direct grep, shown above. `localResourceRoots` is **not set** in any of the four (checked: `grep -n "localResourceRoots" <all four files>` returns zero matches), leaving it at VS Code's default; this is inert because none of the four calls `asWebviewUri` (checked: `grep -n "asWebviewUri" <all four files>` also returns zero matches) — none loads a local resource through the webview at all.

**Cross-generator comparison, stated explicitly per D-12: all four generators agree on every element of the CSP posture — directive set, nonce mechanism, panel options, and the absence of `localResourceRoots`/`asWebviewUri` — with the check (grep + md5) that established each agreement named above.** This is a checked-and-clean positive result, not an unchecked one, and it is the CSP-half of the same 4/4 symmetry the register's byte-equality check established for the file lists themselves. `P62-D1-002` (nonce drawn from `Math.random()`, a CSP-hardening gap rather than a live vulnerability since no injection point exists) is cross-referenced here as the owner of the nonce-source question rather than re-recorded — see `### Cross-references`.

### Findings

None. Every claim raised while sweeping SEC-01 resolved cleanly to `pass` or `n/a` with a concrete, checkable reason (see `### Verdicts` above); no claim required promotion to a `P65-D1-nnn` record. `62-COVERAGE.md`'s Surface Handoff conclusion (D-05) was tested against the whole 36-item enumerated surface, not merely summarized, and held without exception — the two findings it already owns (`P62-D1-001` for SEC-02's runtime-validation gap, `P62-D1-002` for the CSP nonce source) remain the correct owners and are cross-referenced rather than duplicated, per D-04.

### Not-reproducible dispositions

None. No candidate's safety turned on a value's provenance that required constructing an unconfirmable input — every one of the 36 enumerated items was resolved by a direct code trace (see `### Verdicts`), so no item was routed here under D-11.

### Cross-references

**`P62-D1-002`** (`bbj-vscode/src/msgbox-composer-webview.ts:366-373`, low severity, byte-identical `getNonce()` recurring in the other three files) — establishes that the CSP nonce is drawn from `Math.random()`, a non-cryptographic PRNG, which is a CSP-hardening gap rather than a live vulnerability today. **This sweep confirms it**: `### CSP Posture` above states the nonce mechanism as part of the documented posture (per-render generation, `script-src` binding, byte-identical across all four generators) and cross-references `P62-D1-002` for the nonce-source weakness itself, exactly as D-04 requires — the posture is fully answered and the finding is not re-recorded. This is the only ledger row naming SEC-01 (1 of 30; see `## Inherited Findings Ledger`'s distribution table).

### Surface closure

**Four-part stopping rule, discharged part by part:**

(i) **Every enumerated item carries a verdict, no placeholder remains.** Within this section, `grep -cE '^- \[SEC-01\]\[[a-z-]+\] .* — pending$'` prints `0`; every one of the 36 `[SEC-01]` lines above carries `pass` or `n/a`.

(ii) **Every `pass` names concrete checks with `file:line` anchors; every `n/a` carries a written exclusion reason.** No `fail` or `undetermined` verdict was needed — every candidate resolved cleanly (see (iii)).

(iii) **Every candidate claim raised during the sweep was either promoted to a finding or written under `### Not-reproducible dispositions`.** None needed either path: all 36 items resolved directly via code trace, with `### Findings` and `### Not-reproducible dispositions` both correctly empty rather than silently skipped.

(iv) **Every ledger row whose Surfaces column names SEC-01 carries a written cross-reference.** The one such row, `P62-D1-002`, is cross-referenced in `### Cross-references` above and in `### CSP Posture`. Zero inherited items were dropped.

**Live-derived denominator vs. D-02 baseline:** the live leg-1 command reproduces exactly **4** generators, agreeing with D-02's baseline of 4 with **no drift** (re-confirmed in `### Enumeration` above). Leg 2's live candidate count is **32**, matching `## Surface Enumeration Register`'s recorded value exactly (D-02 set no baseline for leg 2, so there is nothing to drift from). The 4/4 generator/handler symmetry recorded in the register (byte-identical sorted file lists) is unaffected by this sweep — SEC-01's four generator files are the same four files SEC-02 will sweep as handlers.

**SEC-01 is closed.**

## SEC-02 — Webview → extension message trust

**Requirement (SEC-02, REQUIREMENTS.md:45):** *Webview → extension message handling audited — messages from webview content are validated for shape and value range before acting on them.*

**ROADMAP criterion discharged:** **criterion 2** — *Every webview→extension message handler validates message shape and value range before acting, with any gaps flagged.*

### Enumeration

Re-derived at Task 3 execution time. Leg 1:

```bash
grep -rn 'onDidReceiveMessage' bbj-vscode/src --include=*.ts
```

**Literal output: the same 4 lines recorded in the register — 4 handlers, no drift.** Leg 2:

```bash
H4=$(grep -rln 'onDidReceiveMessage' bbj-vscode/src --include=*.ts | sort)
for f in $H4; do sed -n '/onDidReceiveMessage/,/^    });/p' "$f" | grep -cE "case '"; done
```

**Literal output: `4 4 4 4` — 16 case arms, no drift.** Denominator unchanged: 4 + 16 = 20 enumerated items. The 4/4 symmetry with SEC-01 is the register's finding: these are the same four files that generate the HTML (byte-identical sorted file lists, confirmed there by `md5`).

**Leg 3 — the `default:`-arm distribution (D-13) — re-derived, and a drift from Task 1's recorded value found and corrected.** Re-running the register's exact leg-3 command:

```bash
for f in $H4; do printf '%s %s\n' "$f" "$(sed -n '/onDidReceiveMessage/,/^    });/p' "$f" | grep -c 'default:')"; done
```

**Literal output: `addchildwindow-composer-webview.ts 1`, `addwindow-composer-webview.ts 1`, `msgbox-composer-webview.ts 0`, `setopts-composer-webview.ts 0`** — reproducing the register's recorded `1/1/0/0` exactly; no drift **in this command's output**.

**But the command's own scoping is imprecise, and re-verifying it against the actual code shows the "1" results are false positives.** The sed range `/onDidReceiveMessage/,/^    });/p` is intended to bound the handler body, but its end-pattern `^    });` (four-space indent) never occurs after the `onDidReceiveMessage(async (msg...` opening line in **any** of the four files — each file instead closes the call as `}, undefined, context.subscriptions);` (msgbox-composer-webview.ts:119, addwindow-composer-webview.ts:138, addchildwindow-composer-webview.ts:143, setopts-composer-webview.ts:108), which does not match `^    });`. Confirmed directly:

```bash
for f in $H4; do grep -n '^    });' "$f" || echo "$f: no match"; done
```

For `addwindow-composer-webview.ts` and `addchildwindow-composer-webview.ts`, an *earlier* `^    });` line exists in the file (closing an unrelated call before `onDidReceiveMessage` — `addwindow-composer-webview.ts:106`, `addchildwindow-composer-webview.ts:111`), which `sed`'s forward-only range cannot match once the start pattern has already fired; for `msgbox-composer-webview.ts` and `setopts-composer-webview.ts` no such line exists anywhere. **In all four files the window therefore runs to end-of-file, not to the end of the handler**, silently scanning through each generator's client-side HTML/CSS/JS. The one substring `default:` that this over-long window happens to catch in two of the four files is `<label class="toggle-line"><input type="checkbox" id="event-enabled"> Configure event mask (default: unset)</label>` (addwindow-composer-webview.ts:272, addchildwindow-composer-webview.ts:292) — an HTML label's parenthetical UI text, **not a `switch` `default:` case arm**.

**Precisely scoping each file's own `switch (msg.type) { … }` block** (from the `switch` line to its own matching closing `}` at the switch's indentation, confirmed by direct inspection of all four handler bodies at their `[SEC-02][handler]`/`[SEC-02][case]` line ranges in `### Verdicts` below) shows **zero** `default:` case arms in **all four** files — `msgbox-composer-webview.ts:83-118`, `addwindow-composer-webview.ts:109-137`, `addchildwindow-composer-webview.ts:114-142`, `setopts-composer-webview.ts:71-107` each contain exactly the four `case '…'` arms already counted by leg 2 and no `default:` arm.

**The corrected fact, stated precisely per D-13: the distribution is uniformly zero-of-four, not the register's `1/1/0/0`.** This is a drift **within the phase** (Task 1's committed register vs. Task 3's re-verification), written up per plan instruction rather than silently adopted. It does **not** independently justify a new `P65-D1-nnn` finding under D-04: a uniform absence across all four near-duplicate handlers is not an asymmetry, and the message `type` space is not attacker-influenced (SEC-01's enumeration confirmed each `getHtml()` string emits exactly one bundled, nonce-locked, CSP-restricted `<script>` — no external script source is ever permitted — so `msg.type` values sent via `postMessage` originate only from that same bundled script, never from document/workspace/attacker content). `### Runtime Validation Posture` states, per handler, what an unrecognised `type` actually does (silently falls through the `switch` with no `case` executed and no error) now that the true mechanism is established.

### Verdicts

- [SEC-02][handler] bbj-vscode/src/addchildwindow-composer-webview.ts:113 — fail — P62-D1-001 (payload typed only by a compile-time TS annotation, zero runtime shape/type/range check before any arm's first side effect); confirmed no `default:` case arm exists (:114-142, corrected leg-3 derivation above) — an unrecognised `type` silently falls through with no action; blast radius is `vscode.workspace.applyEdit` via the `'insert'` arm (:126-138). Per `P65-D1-001` (new finding below), this handler's `'insert'` arm applies its edit with no content-validity gate on its own free-text fields (`receiver`, `window`, `id`, `context`, `title`, `x`, `y`, `width`, `height`) — unlike `msgbox-composer-webview.ts`'s analogous arm.
- [SEC-02][handler] bbj-vscode/src/addwindow-composer-webview.ts:108 — fail — P62-D1-001 (same compile-time-only typing, zero runtime check); confirmed no `default:` case arm (:109-137, corrected leg-3 derivation above) — unrecognised `type` silently falls through; blast radius `vscode.workspace.applyEdit` via `'insert'` (:121-133). Per `P65-D1-001`, this handler's `'insert'` arm likewise applies unconditionally with no content-validity gate on `receiver`, `sysgui`, `title`, `x`, `y`, `width`, `height`.
- [SEC-02][handler] bbj-vscode/src/msgbox-composer-webview.ts:82 — fail — P62-D1-001 (the payload's raw shape/field types/ranges are never checked before `build(msg.payload)` at :99); confirmed no `default:` case arm (:83-118, corrected leg-3 derivation above) — unrecognised `type` silently falls through; blast radius `vscode.workspace.applyEdit` via `'insert'` (:97-114). This is the one handler of the four whose `'insert'` arm gates the edit on a content-validity result (`r.valid`, :100) — see `P65-D1-001` below, of which this handler is the reference/positive side.
- [SEC-02][handler] bbj-vscode/src/setopts-composer-webview.ts:70 — fail — P62-D1-001 (payload's checked-bit ids and `maskComma`/`maskDot`/`rawTail` fields are never type/range-checked server-side before `build(msg.payload)` at :86); confirmed no `default:` case arm (:71-107, corrected leg-3 derivation above) — unrecognised `type` silently falls through; blast radius `vscode.workspace.applyEdit` via `'apply'` (:84-103). Not implicated in `P65-D1-001`'s asymmetry: SETOPTS composes a byte vector, not a BBj-expression statement, so it has no comparable "valid expression" concept for msgbox's gate to be absent from.
- [SEC-02][case] bbj-vscode/src/addchildwindow-composer-webview.ts:115 — n/a — `'ready'` arm reads no `msg.payload` field; its only action is `panel.webview.postMessage({ type: 'init', editMode, catalogs: { flags: CHILD_WINDOW_FLAGS, eventBits: CHILD_EVENT_MASK_BITS }, initial })` (:116-121) — extension-owned catalog/initial data only.
- [SEC-02][case] bbj-vscode/src/addchildwindow-composer-webview.ts:123 — fail — P62-D1-001; `'change'` arm's only guard on `msg.payload` is the truthy check `if (msg.payload)` (:124) before `build(msg.payload)`; no field-level type/range check on any of `flags[]`, `eventMask[]`, `receiver`, `window`, `id`, `context`, `x`, `y`, `width`, `height`, `title`; first side effect is `panel.webview.postMessage({ type: 'preview', ...build(msg.payload) })`, not a document edit.
- [SEC-02][case] bbj-vscode/src/addchildwindow-composer-webview.ts:126 — fail — P65-D1-001 (new finding: this arm applies `vscode.workspace.applyEdit` (:135) unconditionally after `build(msg.payload)` — no `r.valid`-equivalent gate exists anywhere in `addchildwindow-composer.ts`, confirmed by `grep -n 'valid' bbj-vscode/src/addchildwindow-composer.ts` returning zero matches — unlike `msgbox-composer-webview.ts:97` below); also duplicates P62-D1-001's baseline no-raw-shape-check claim on the same fields as the `'change'` arm above.
- [SEC-02][case] bbj-vscode/src/addchildwindow-composer-webview.ts:139 — n/a — `'cancel'` arm reads no `msg.payload` field; its only action is `panel.dispose()` (:140).
- [SEC-02][case] bbj-vscode/src/addwindow-composer-webview.ts:110 — n/a — `'ready'` arm reads no `msg.payload` field; its only action is `panel.webview.postMessage({ type: 'init', editMode, catalogs: { flags: WINDOW_FLAGS, eventBits: EVENT_MASK_BITS }, initial })` (:111-116) — extension-owned catalog/initial data only.
- [SEC-02][case] bbj-vscode/src/addwindow-composer-webview.ts:118 — fail — P62-D1-001; `'change'` arm's only guard is `if (msg.payload) panel.webview.postMessage({ type: 'preview', ...build(msg.payload) })` (:119) — same truthy-only pattern, no field-level check on `flags[]`, `eventMaskEnabled`, `eventMask[]`, `receiver`, `sysgui`, `x`, `y`, `width`, `height`, `title`; first side effect is a `postMessage`, not a document edit.
- [SEC-02][case] bbj-vscode/src/addwindow-composer-webview.ts:121 — fail — P65-D1-001 (new finding: this arm applies `vscode.workspace.applyEdit` (:130) unconditionally after `build(msg.payload)` — `grep -n 'valid' bbj-vscode/src/addwindow-composer.ts` returns zero matches, so `receiver`, `sysgui`, `title`, `x`, `y`, `width`, `height` are never checked for well-formedness anywhere in the module — unlike `msgbox-composer-webview.ts:97` below); also duplicates P62-D1-001's baseline claim.
- [SEC-02][case] bbj-vscode/src/addwindow-composer-webview.ts:134 — n/a — `'cancel'` arm reads no `msg.payload` field; its only action is `panel.dispose()` (:135).
- [SEC-02][case] bbj-vscode/src/msgbox-composer-webview.ts:84 — n/a — `'ready'` arm reads no `msg.payload` field; its only action is `panel.webview.postMessage({ type: 'init', editMode, catalogs: { buttonSets: BUTTON_SETS, icons: ICONS, defaultButtons: DEFAULT_BUTTONS, flags: FLAGS }, initial })` (:85-90) — extension-owned catalog/initial data only.
- [SEC-02][case] bbj-vscode/src/msgbox-composer-webview.ts:92 — fail — P62-D1-001; `'change'` arm's only guard is `if (msg.payload) { panel.webview.postMessage({ type: 'preview', ...build(msg.payload) }); }` (:93-95) — truthy-only, no field-level check on `buttonSet`, `icon`, `defaultButton`, `flags[]`, `customButtons[]`, `assignTo`, `useConstants` before `build()`; first side effect is a `postMessage`, not a document edit.
- [SEC-02][case] bbj-vscode/src/msgbox-composer-webview.ts:97 — fail — P62-D1-001 (the raw `payload` — `buttonSet`, `icon`, `defaultButton`, `flags[]`, `customButtons[]`, `assignTo`, `useConstants` — is never type/range-checked before `build()` is called at :99); this is, however, the one arm of the four analogous `'insert'`/`'apply'` arms that gates its `vscode.workspace.applyEdit` (:111) on `if (!r.valid) break;` (:100), where `r.valid = msgV.ok && titleV.ok && customOk` (`msgbox-composer.ts:420`) and `msgV`/`titleV` come from `validateStringField()` (`msgbox-composer.ts:311-322`), which calls `validateBbjExpression()` (`msgbox-composer.ts:197-216`) to check structural well-formedness and String typing of `message`/`title` before the statement is composed — see `P65-D1-001` below, of which this arm is the reference/positive side.
- [SEC-02][case] bbj-vscode/src/msgbox-composer-webview.ts:115 — n/a — `'cancel'` arm reads no `msg.payload` field; its only action is `panel.dispose()` (:116).
- [SEC-02][case] bbj-vscode/src/setopts-composer-webview.ts:72 — n/a — `'ready'` arm reads no `msg.payload` field; its only action is `panel.webview.postMessage({ type: 'init', editMode, catalog: SETOPTS_BITS, groups: BYTE_GROUPS, initial: initialSelection(original) })` (:73-79) — extension-owned catalog/initial data only.
- [SEC-02][case] bbj-vscode/src/setopts-composer-webview.ts:81 — fail — P62-D1-001; `'change'` arm's only guard is `if (msg.payload) panel.webview.postMessage({ type: 'preview', ...build(msg.payload) })` (:82) — truthy-only, no field-level check on `checked[]`, `maskComma`, `maskDot`, `rawTail` before `build()`; first side effect is a `postMessage`, not a document edit.
- [SEC-02][case] bbj-vscode/src/setopts-composer-webview.ts:84 — fail — P62-D1-001; `'apply'` arm's only guard is `if (!msg.payload) break;` (:85) before `build(msg.payload)` (:86) and an unconditional `vscode.workspace.applyEdit` (:100) — no field-level check on `checked[]`, `maskComma`, `maskDot`, or `rawTail` server-side (`rawTail` is charset-filtered client-side in the webview script to `[0-9A-Fa-f]` only, never re-validated on the extension side). Not implicated in `P65-D1-001`: SETOPTS has no comparable "valid expression" concept to lack.
- [SEC-02][case] bbj-vscode/src/setopts-composer-webview.ts:104 — n/a — `'cancel'` arm reads no `msg.payload` field; its only action is `panel.dispose()` (:105).

### Runtime Validation Posture

**Stated up front, per D-13: all four handlers are typed `async (msg: { type: string; payload?: <Shape> }) => …`. That TypeScript annotation is erased at compile time; the value arriving from the webview is whatever `postMessage` sent, and the annotation is refused as evidence of validation here.** The only question that matters for criterion 2 is what *runtime* check sits between message receipt and the first side effect.

**Per handler (all four, checked by reading the full handler body — see `### Verdicts` for the `file:line` trace):**

1. **What runtime check sits between receipt and the first side effect. If none, say none.** **None**, in all four. Every arm's only gate on `msg.payload` before acting is a bare truthy check (`if (msg.payload)` / `if (!msg.payload) break;`) — never a check of `payload`'s shape, its fields' types, or any field's value range. `msgbox-composer-webview.ts`'s `'insert'` arm additionally gates on `r.valid` (a *content*-validity result computed *inside* `build()`, after the payload has already been passed in unchecked) — this is evidence about the arm's *first side effect* (see point 4), not a receipt-time payload check, so it does not change this answer.
2. **Whether the `switch` has a `default` branch, and if so what it does.** **None of the four has one** — see `### Enumeration`'s corrected leg-3 derivation above, which shows the register's `1/1/0/0` was a sed-range false positive matching unrelated HTML text, and that precise scoping of each `switch (msg.type) { … }` block finds zero `default:` arms in all four. **The distribution is uniform: an unrecognised `type` silently falls through every one of the four handlers with no `case` executed, no `postMessage` reply, and no error** — not glossed, stated precisely per D-13. This is uniform rather than asymmetric, and (per `### Enumeration`) the `type` value space is not attacker-influenced (SEC-01 confirmed each webview loads only one bundled, nonce-locked, CSP-restricted inline script — no external script source is ever permitted), so the uniform silent-fallthrough does not on its own justify a new `P65-*` finding.
3. **Whether the payload's fields are checked for type, shape or value range before being read.** **No**, in all four, for every field of every arm's payload — `flags[]`/`eventMask[]`/`receiver`/`window`/`id`/`context`/`x`/`y`/`width`/`height`/`title` (addwindow, addchildwindow), `buttonSet`/`icon`/`defaultButton`/`flags[]`/`customButtons[]`/`message`/`title`/`assignTo`/`useConstants` (msgbox), `checked[]`/`maskComma`/`maskDot`/`rawTail` (setopts). This is `P62-D1-001`'s claim, confirmed here against every one of the 16 case arms individually rather than at handler-summary level — see `### Verdicts`.
4. **What the first side effect actually is, and therefore what an unchecked field can reach.** Two shapes recur across all four handlers: (a) the `'ready'` arm's first side effect is always a `postMessage` of extension-owned catalog/initial data — no payload field is read at all; (b) the `'change'` arm's first side effect is always a `postMessage` of `build(msg.payload)`'s output back into the webview's own DOM (written with safe `.value=`/`.textContent=` per SEC-01's enumeration, not `innerHTML`); (c) the `'insert'`/`'apply'` arm's first side effect is always `vscode.workspace.applyEdit` on the user's currently open document (or `config.bbx` for setopts) — the one sink through which an unchecked field reaches something consequential, matching `P62-D1-005`'s characterization; (d) the `'cancel'` arm's first side effect is always `panel.dispose()`, reading no payload field.

**Cross-handler comparison, stated explicitly (D-12/D-04).** On points 1-3 above, **all four handlers agree** — this is a positive symmetric result on its own terms (no handler is *worse* than the others on raw payload-shape checking), recorded as such rather than left implicit. **On point 4's `'insert'`/`'apply'` arm, the four *diverge*: `msgbox-composer-webview.ts`'s arm alone gates the document-edit side effect on a content-validity result (`r.valid`, sourced from `validateStringField()`/`validateBbjExpression()` over its `message`/`title` fields); `addwindow-composer-webview.ts`'s and `addchildwindow-composer-webview.ts`'s arms apply their edit unconditionally, with no equivalent gate anywhere in their respective `-composer.ts` modules (confirmed by grep, zero `'valid'` matches in either); `setopts-composer-webview.ts`'s arm has no comparable "valid expression" concept to be missing, since it composes a byte vector rather than BBj-expression text.** This is exactly the asymmetry D-04 exists to surface — a divergence between near-duplicate modules that Phase 62's single-file-at-a-time review characterized as "identical" (`P62-D1-001`'s evidence: "Identical pattern recurs verbatim in...") without comparing the four `build()` outputs against each other closely enough to see it. Recorded as **`P65-D1-001`** below.

**What a runtime shape validator would have to cover, as an observation about the gap rather than a proposal (a new capability is out of this phase's scope):** per-arm, a validator would need to check `flags`/`eventMask` are arrays of in-range integers, `receiver`/`sysgui`/`window`/`id`/`context`/`x`/`y`/`width`/`height`/`title`/`message`/`assignTo`/`customButtons` are strings within a bounded length, `buttonSet`/`icon`/`defaultButton` are integers within their catalog's valid value set, `useConstants`/`eventMaskEnabled` are booleans, and `checked`/`maskComma`/`maskDot`/`rawTail` match SETOPTS' own byte/character-set constraints — the concrete field set every one of the 16 case-arm verdicts above names individually.

### Findings

```
id:                P65-D1-001
unit:              SEC-02
location:          bbj-vscode/src/addwindow-composer-webview.ts:121-131, bbj-vscode/src/addchildwindow-composer-webview.ts:126-137 (contrasted with bbj-vscode/src/msgbox-composer-webview.ts:97-101 and bbj-vscode/src/msgbox-composer.ts:398-420)
dimension:         D1
secondary:         [D2, D4]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace: msgbox-composer-webview.ts's 'insert' arm (:97-114) computes
                    r = build(msg.payload) (msgboxPreview(), msgbox-composer.ts:391-421) and gates
                    the WorkspaceEdit application on `if (!r.valid) break;` (:100) before reaching
                    vscode.workspace.applyEdit (:111). r.valid is `msgV.ok && titleV.ok && customOk`
                    (msgbox-composer.ts:420), where msgV/titleV come from validateStringField()
                    (msgbox-composer.ts:311-322), which calls validateBbjExpression()
                    (msgbox-composer.ts:197-216) to check structural well-formedness and String
                    typing of the message/title fields before the statement is composed.
                    addwindow-composer-webview.ts's near-identical 'insert' arm (:121-133) computes
                    r = build(msg.payload) (addwindowPreview()) and applies the WorkspaceEdit (via
                    applyEdit() or edit.insert()) unconditionally at :130 — there is no r.valid field
                    or equivalent gate; confirmed by `grep -n 'valid' bbj-vscode/src/addwindow-
                    composer.ts` returning zero matches, meaning none of its own free-text fields
                    (receiver, sysgui, title, x, y, width, height) is ever checked for well-
                    formedness anywhere in the module. addchildwindow-composer-webview.ts's 'insert'
                    arm (:126-138) is the same pattern against addchildwindow-composer.ts (also zero
                    'valid' matches; fields receiver, window, id, context, title, x, y, width,
                    height). Phase 62's own RU-62-04 sweep (P62-D1-001's evidence) characterized this
                    pattern as "identical" across all four handlers — a single-file-at-a-time review
                    that did not compare the four build() outputs against each other and so did not
                    surface that only one of the four gates its document-edit side effect on any
                    content-validity check at all.
failure_scenario:  A developer types a malformed or unintended free-text value into addwindow's or
                    addchildwindow's Title/x/y/width/height/receiver/sysgui (or window/id/context)
                    fields via the webview form and clicks Insert; the value is written verbatim
                    into their own BBj source document with no warning, because — unlike msgbox's
                    message/title fields — nothing in addwindow-composer.ts or addchildwindow-
                    composer.ts ever checks these fields' well-formedness. This is a self-inflicted
                    statement-corruption gap (the same shape as P62-D1-005, no attacker-controlled
                    input reaches it), but it is inconsistent across three near-duplicate composer
                    forms in a way no single-file review surfaced: two of the four insert/apply
                    paths apply their edit unconditionally while the third gates on validated
                    content.
classification:    major
                    (1) touches 1 file: n/a — the fix (porting an equivalent content-validity gate)
                    is a repeated single-file edit independently applicable to each of the 2 files
                    lacking it — (2) no public API/grammar/LSP change: pass — (3) no new dependency:
                    pass — (4) regression-testable with vitest: pass — (5) reviewer can name the
                    exact edit (port validateStringField-style checks to addwindow-composer.ts's and
                    addchildwindow-composer.ts's free-text fields and gate the 'insert' side effect
                    on the result, mirroring msgbox's r.valid pattern): pass — (6) severity is `low`
                    but primary dimension is D1: FAIL — test (6) fails on the D1 primary-dimension
                    clause alone, so classification is `major` regardless of the other five tests
                    (D-13's safety gate).
effort:            4
dedup:             none — neither #475 (SETOPTS tri-state composer UX) nor #385 (external Graffiti
                    Composer launch) concerns addWindow/addChildWindow field-validation parity with
                    msgbox; no open issue overlaps this asymmetry.
disposition:       major-refactor
```

### Not-reproducible dispositions

None. Every claim raised while sweeping SEC-02 — including the leg-3 `default:`-arm re-derivation drift — was settled by a direct code trace with concrete `file:line` citations (see `### Enumeration` and `### Verdicts`); no claim required constructing an unconfirmable exploit.

### Cross-references

**`P62-D1-001`** (`bbj-vscode/src/msgbox-composer-webview.ts:82-119`, low severity, identical pattern recurring in the other three files) — the owner of the no-runtime-validation claim at the four handlers. **Confirmed** against every one of the 16 case arms individually (not merely at handler-summary level): every arm's only guard on `payload` is a truthy check, with zero field-level type/shape/range validation anywhere before `build()`. This sweep also **extends** it: `P62-D1-001`'s own evidence text described the pattern as "identical" across all four files, which this sweep shows is true for the *raw-payload-check* absence but not for what happens *after* `build()` — see `P65-D1-001`.

**`P62-D1-005`** (`bbj-vscode/src/addwindow-composer.ts:195-282`, `addchildwindow-composer.ts:117-215`, `msgbox-composer.ts:145,162,410`, low severity) — establishes what an unchecked payload field reaches: the composer `build()` layer emitting BBj syntax from unescaped string fields. **Confirmed and extended**: this sweep's `P65-D1-001` shows that reach is not uniform either — `addwindow`/`addchildwindow`'s free-text fields reach the document edit with zero gate of any kind, while `msgbox`'s reach it behind a content-validity gate that happens to not cover every field `P62-D1-005` names (`assignTo`, `customButtons` are validated for string-ness but not further bounded).

**`P62-D1-007`** (`bbj-vscode/src/decompile-io.ts:15-27,29-35`, low severity) — its own failure scenario is explicitly conditioned on "a webview-message-derived path reaching `fs.promises.open`/`stat`", asking SEC-02 to state whether that chain is currently reachable. **Not reachable from any of the four enumerated handlers**: `decompile-io.ts` is invoked only from `bbj-vscode/src/Commands/Commands.cjs` (confirmed by `grep -rln "decompile-io" bbj-vscode/src --include=*.ts`), not from any of the 20 `[SEC-02]` verdicts above — none of the four handlers' arms passes payload data to `decompile-io.ts` or to `Commands.cjs`'s decompile path. This sweep **confirms** the finding's own conditional framing (the chain does not currently exist) rather than extending or disagreeing with it.

**`P63-D1-006`** (`bbj-intellij/.../composer/ComposerLauncher.java:107-115,172-196`, low severity) — the cross-IDE comparison point: the IntelliJ composer writes a composed statement into the document with no validation, paralleling the VS Code side. **Confirmed for 3 of the 4 VS Code composers, with a nuance this sweep adds**: `addwindow`/`addchildwindow`/`setopts`'s VS Code composers indeed apply with zero validation, matching the IntelliJ side exactly. `msgbox`'s VS Code composer does not — it is the one composer, on either IDE, that gates its document-write on any content-validity result. The cross-IDE parity point (`RU-63-04`'s and this file's own concern) therefore holds for three of the four VS Code forms and is not weakened by this correction.

### Surface closure

**Four-part stopping rule, discharged part by part:**

(i) **Every enumerated item carries a verdict, no placeholder remains.** `grep -cE '^- \[SEC-02\]\[[a-z-]+\] .* — pending$'` prints `0` within this section; all 20 `[SEC-02]` lines above carry `fail` or `n/a`.

(ii) **Every `fail` names a discharging ID (`P62-D1-001` or `P65-D1-001`), and every `n/a` carries a written exclusion reason.** No `pass` or `undetermined` verdict was needed at this surface — every arm either genuinely lacks a runtime check (fail) or reads no payload field at all (n/a).

(iii) **Every candidate claim raised was either promoted to a finding or written under `### Not-reproducible dispositions`.** One claim was promoted: `P65-D1-001`, the msgbox/addwindow/addchildwindow content-validity asymmetry. `### Not-reproducible dispositions` is correctly empty — nothing required an unconfirmable exploit.

(iv) **Every ledger row whose Surfaces column names SEC-02 carries a written cross-reference.** All four such rows — `P62-D1-001`, `P62-D1-005`, `P62-D1-007`, `P63-D1-006` — are cross-referenced in `### Cross-references` above. Zero inherited items were dropped.

**Live-derived denominator vs. D-02 baseline:** leg 1 reproduces exactly **4** handlers, agreeing with D-02's baseline of 4 with **no drift**. Leg 2's live case-arm count is **16**, matching the register exactly (D-02 set no baseline for this leg). Leg 3's `default:`-arm distribution **drifted from the register's recorded `1/1/0/0` to the corrected, precisely-scoped `0/0/0/0`** — written up above with its cause (a `sed`-range end-pattern that never matches, causing the window to run past the handler into unrelated HTML text) rather than silently adopted, per the stopping rule's evidence discipline.

**SEC-02 is closed.**

## SEC-04 — EM token lifecycle end to end

**Requirement (SEC-04, REQUIREMENTS.md:47):** *EM token lifecycle audited end to end — acquisition, storage at rest, exposure via process arguments or logs, and expiry handling across `BbjEMTokenStore`, `em-login.bbj`, `em-validate-token.bbj`.*

**ROADMAP criterion discharged:** **criterion 3** — *The EM token lifecycle — acquisition, storage at rest, exposure via process args/logs, expiry — is traced end to end across `BbjEMTokenStore`, `em-login.bbj`, `em-validate-token.bbj`, and VS Code's equivalent storage.*

**Owned by plan `65-02` (wave 2).** Per D-07 this surface **owns the token-as-process-argument question outright**; `65-03`/SEC-05 cross-references it by ID rather than duplicating it.

### Enumeration

Re-derived at Task 1 execution time, self-contained for a reader who starts here rather than at the
header. Command (identical to `## Surface Enumeration Register`'s SEC-04 block):

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

**7 sites, no drift from `## Surface Enumeration Register`'s D-02 baseline of 7** — re-confirmed live
at this task's own execution time rather than trusted from the header.

**Stage set — the four ROADMAP criterion 3 names, and the only four:** `acquisition`, `at-rest`
(storage at rest), `exposure` (via process arguments or logs), `expiry`. **Denominator: 7 sites × 4
stages = 28 enumerated items**, matching the 28 placeholder lines `65-01` stubbed below — four per
site, no gaps.

### Verdicts

- [SEC-04][acquisition] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java — pass — `performLogin()` (:44-152) is the acquisition site: prompts for the EM username (`Messages.showInputDialog`, :56-63, defaulting to `"admin"`) and password (`Messages.showPasswordDialog`, :65-69) directly from the user, resolves `em-login.bbj` from the plugin bundle (:72-79), spawns it via `GeneralCommandLine`/`CapturingProcessHandler` (:98-115, 15s timeout) and reads the raw JWT back from the process's temp-file output (:118-123). A `stdout.startsWith("ERROR:")` failure (:125-128) surfaces the script's own error text via a dialog rather than storing anything, and an empty result (:130-136) is a distinct failure rather than a silent pass-through. Nothing is trusted unchecked: the `bbjHome`/executable check (:46-53, :88-91) and the `em-login.bbj` path resolution (:73-78) both fail closed with a dialog before any process is spawned.
- [SEC-04][at-rest] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java — fail — `P63-D1-005`. The freshly-returned JWT is written to `Files.createTempFile("bbj-em-login-", ".tmp")` (:96) with no `FileAttribute`/POSIX-permission argument, so the file receiving the plaintext token is created with whatever default permissions the JVM/OS applies rather than an explicit owner-only grant, for the window between the spawned process writing it and the `finally`-block delete (:119-123). This is `P63-D1-005`'s own citation of this exact call site; not re-recorded here.
- [SEC-04][exposure] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java — fail — `P63-D1-003`. Process arguments: `cmd.addParameter(password)` (:102-103) places the plaintext EM password into the spawned `em-login.bbj` process's argv, visible to any other process on the host able to enumerate it — this is the password leg of the process-argument-exposure question `65-02`/SEC-04 owns for the whole phase (D-07), discharged here by `P63-D1-003`. Logs: no log/console write of the raw password anywhere in this 169-line file (checked by full read — `Messages.showErrorDialog` surfaces only `ex.getMessage()` or the script's own `"ERROR:..."` text, never the credential itself) — clean on this sub-question. Filesystem: the temp file this site creates (`Files.createTempFile`, :96) is filled by the same shared `em-login.bbj` script VS Code also spawns (confirmed: `bbj-intellij/build.gradle.kts:103-104,125-126` copies `bbj-vscode/tools/em-login.bbj` into the plugin bundle verbatim), whose own `:41-42` write has no permission control (`P64-D1-002`); the JVM-side temp file's own missing permission attributes are the separate at-rest exposure `P63-D1-005` already records. Both cross-referenced, neither re-recorded.
- [SEC-04][expiry] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java — fail — `P63-D1-004`. This site performs no expiry check of its own: the token it just obtained is stored via `BbjEMTokenStore.storeToken(stdout)` (:139) with no call to `isTokenExpired()` or `validateTokenServerSide()` first — exactly the gap `P63-D1-004`'s own evidence names ("`BbjEMLoginAction`'s freshly-stored token is never itself re-checked... before being written to `PasswordSafe`"). Cross-referenced, not re-recorded.
- [SEC-04][acquisition] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java — n/a — this file is a pure storage/decode utility (`storeToken`/`getToken`/`deleteToken`/`isTokenExpired`, :31-88) with no credential prompt and no process spawn of its own; acquisition happens in `BbjEMLoginAction.performLogin()` (:44-152), which calls `storeToken(stdout)` (:139) only after the token already exists.
- [SEC-04][at-rest] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java — fail — `P65-D1-002` (new finding below). `storeToken`/`getToken`/`deleteToken` (:31-47) delegate to `PasswordSafe.getInstance()`, keyed by `CredentialAttributesKt.generateServiceName("BBj Enterprise Manager", "jwt-token")` (:26-28) with no additional `CredentialAttributes` flag — a real improvement over a hand-rolled store, but `PasswordSafe`'s actual backend is the IDE-wide, user-configurable "Save passwords" setting (native keychain / KeePass file / memory-only, per `P63-D8-003`'s own confirmed reading of this exact setting), and nothing in this file pins or checks which backend is active. Contrasted against VS Code's fixed `SecretStorage` binding in the at-rest comparison below; the divergence is `P65-D1-002`.
- [SEC-04][exposure] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java — n/a — this file has no argv-construction, log-write or file-write of its own anywhere in its 89 lines (confirmed by full read); it only calls `PasswordSafe.getInstance()`, whose internal implementation is outside this file's/this sweep's traced code — n/a across all three exposure sub-questions.
- [SEC-04][expiry] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java — fail — `P63-D1-004`. `isTokenExpired()` (:56-88) returns `false` ("not expired") for a non-3-part token (:64-66), a payload with no `exp` claim (:76-77), and any decode exception (:84-86), with no signature verification anywhere in the file — `P63-D1-004`'s own citation of this exact function; not re-recorded here.
- [SEC-04][acquisition] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java — n/a — `buildCommandLine()` (:26-135) reads an already-stored token via `BbjEMTokenStore.getToken()` (:54) and, when absent, delegates acquisition to `BbjEMLoginAction.performLogin(project)` (:63, :95) rather than acquiring one itself; this site never prompts for credentials or spawns `em-login.bbj` directly.
- [SEC-04][at-rest] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java — n/a — this site reads the token via `BbjEMTokenStore.getToken()` (:54) but persists nothing of its own; the one temp file its own call chain creates (`BbjRunActionBase.validateTokenServerSide`'s `Files.createTempFile("bbj-em-validate-", ".tmp")`, `BbjRunActionBase.java:295`) is written to only by `em-validate-token.bbj`, which writes the fixed marker `"VALID"`/`"INVALID"` (`em-validate-token.bbj:23-27,30-34`) rather than the token value itself — unlike `BbjEMLoginAction.java`'s temp file, no secret reaches this particular file. The token's own at-rest treatment is `BbjEMTokenStore.java`'s, above.
- [SEC-04][exposure] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java — fail — `P63-D1-003`. Process arguments: `cmd.addParameter(token)` (:127) places the raw JWT into the spawned `bbj` process's argv — the token-bearing leg of the D-07 ownership question, discharged by `P63-D1-003` and cross-referenced for `65-03`/SEC-05 by ID (see `### Cross-references`). Logs: `logError`/`logInfo` (`BbjRunActionBase.java`) take only fixed diagnostic strings, never the token itself (checked by grep across all four run-action files for a logging call passing `token`) — clean on this sub-question. Filesystem: n/a — see the at-rest verdict above; the shared `validateTokenServerSide` temp file (`BbjRunActionBase.java:295`) carries only the `VALID`/`INVALID` marker, never the token.
- [SEC-04][expiry] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java — pass — this site composes the fail-open client decode with an unconditional server round trip: `BbjEMTokenStore.isTokenExpired(token)` (:75) is checked first (fast path), but regardless of its answer, `!validateTokenServerSide(project, token)` (:81, `BbjRunActionBase.java:280-321`, a real EM round trip with a 10s timeout) is also required to pass before the token is used; either check failing calls `BbjEMTokenStore.deleteToken()` (:76, :82) and re-prompts login (:87-104). A malformed/garbage token that `isTokenExpired()` wrongly calls "not expired" is therefore still rejected here, because the server round trip is authoritative and unconditional for this site's own use of the token — the underlying decode weakness is `P63-D1-004`'s, cross-referenced, but does not compromise this site's own expiry handling.
- [SEC-04][acquisition] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java — n/a — byte-for-byte the same delegation pattern as `BbjRunBuiAction.java` (confirmed by `diff`: the two files differ only in the `"BUI"`/`"DWC"` literal and user-facing strings); acquisition is delegated to `BbjEMLoginAction.performLogin()` identically, never acquired directly by this file.
- [SEC-04][at-rest] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java — n/a — identical reasoning to `BbjRunBuiAction.java`: no persistence of its own, and the shared `validateTokenServerSide` temp file it triggers (`BbjRunActionBase.java:295`) carries only the non-secret `VALID`/`INVALID` marker written by `em-validate-token.bbj`, never the token itself.
- [SEC-04][exposure] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java — fail — `P63-D1-003`, identical reasoning to `BbjRunBuiAction.java` (byte-for-byte identical `cmd.addParameter(token)` construction at :127; `diff` confirms the two files differ only in the `"BUI"`/`"DWC"` literal).
- [SEC-04][expiry] bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java — pass — identical composition to `BbjRunBuiAction.java` (byte-for-byte identical client-decode-then-server-round-trip sequence at :75-104): the mandatory, unconditional `validateTokenServerSide` call is what makes this site's own expiry handling correct despite `isTokenExpired()`'s underlying fail-open decode (`P63-D1-004`, cross-referenced).
- [SEC-04][acquisition] bbj-vscode/src/extension.ts — pass — the `bbj.loginEM` command handler (:597-671) is the acquisition site: prompts for the EM username via `showInputBox` (:611-616, defaulting to `"admin"`) and password via a masked `showInputBox` (:618-623, `password: true`), execs `em-login.bbj` (:626-646) with a 15s timeout, and reads the raw JWT back from the temp file the script wrote (:653,:658). An `output.startsWith('ERROR:')` result from the script itself (:654-656) is rejected rather than stored, surfaced by the outer `catch` as `showErrorMessage` (:670); a `password === undefined` cancellation (:623) aborts before any process is spawned. Nothing here is trusted unchecked: `bbjHome` is validated before any path is built (:601-608).
- [SEC-04][at-rest] bbj-vscode/src/extension.ts — pass — `context.secrets.store('bbj.em.token', result)` (:667) persists the token via VS Code's `SecretStorage` API (`secretStorage = context.secrets`, :587), with `context.secrets.delete('bbj.em.token')` called on both the client-side-expired path (:381) and the server-side-rejected path (:473) — deletion symmetric with storage on both invalidation routes. `SecretStorage`'s backend is fixed by the VS Code platform itself, and `bbj-vscode/package.json` contributes no setting of its own that could redirect it elsewhere (checked: `grep -n 'secret\|credential' package.json` returns nothing relevant beyond an unrelated `protectPassword` compiler option). One unreachable branch noted for completeness, not as a finding: `getEMCredentials()` (:374-388) also reads a `'bbj.em.credentials'` fallback key, but nothing anywhere in this codebase ever calls `.store('bbj.em.credentials', ...)` (confirmed: `grep -rn "bbj.em.credentials"` returns only this one read) — dead code, not a persisted secret. See the at-rest comparison below for the asymmetry this contrasts against.
- [SEC-04][exposure] bbj-vscode/src/extension.ts — fail — `P62-D1-004`. Process arguments: `emValidateCmd` (:415) and `emLoginCmd` (:635) interpolate the raw JWT and the plaintext password respectively as literal shell-command-string arguments passed to `child_process.exec()` (:426, :645) — argv-visible to any process able to enumerate the OS process table; the token leg (:415) is the process-argument-exposure question `65-02`/SEC-04 owns for the whole phase (D-07), and `65-03`/SEC-05 cross-references it rather than re-recording it. Logs: the debug-mode masking at :420/:639 (`emValidateCmd.replace(token, '***')` / `emLoginCmd.replace(`"${password}"`, '"***"')`) is `P62-D1-004`'s own documented fragility — a token or password containing a literal double-quote could break the substring match and leak the raw value into the output channel when `bbj.debug` is set; not re-recorded. Filesystem: this file's own code never writes the secret to a file directly (only argv); the JWT does reach a file, but only inside the process it spawns (`em-login.bbj:41-42`) — cross-ref `P64-D1-002`, the chain this site's spawn creates and the same shared script `BbjEMLoginAction.java` also spawns.
- [SEC-04][expiry] bbj-vscode/src/extension.ts — fail — `P65-D1-003` (new finding below). `isTokenExpired()` (:339-366) fails open in the identical three ways `P63-D1-004` records for the IntelliJ side: a non-3-part token (:344-346) returns `false`, a payload with no `exp` claim (:355-357) returns `false`, and any parse exception (:363-365) returns `false` — no signature verification anywhere in the function. Unlike a bare decode-only site, this weakness is mitigated for the two currently-used run paths: `ensureValidToken()` (:456-479) always follows the client decode with a mandatory `validateTokenServerSide()` round trip (:471) before either `bbj.runBUI` (:676-679) or `bbj.runDWC` (:683-686) proceeds, deleting and re-prompting on rejection (:473-478) — exactly mirroring `BbjRunBuiAction`/`BbjRunDwcAction`'s own composition. The residual gap matches `BbjEMLoginAction.java`'s exactly: a freshly-acquired token is stored via `context.secrets.store` (:667) without itself being re-validated at that moment. No `P62-D1-*` record names this function as a security concern — Phase 62's own D8 check (`62-COVERAGE.md:344`) read it only for doc-accuracy, never for its fail-open security shape.
- [SEC-04][acquisition] bbj-vscode/tools/em-login.bbj — pass — the actual authentication call: `token! = BBjAdminFactory.getAuthToken(host!, username!, password!, 0, payload!, err=authFailed)` (:39) is the acquisition itself, given `username!`/`password!` read from `ARGV(1)`/`ARGV(2)` (:10-11). A missing username or password is checked explicitly (:15-28) and routes to a written `"ERROR:..."` result rather than calling `getAuthToken` with a null credential, and an authentication failure (`err=authFailed`, :46-51) writes a distinct `"ERROR:Authentication failed..."` marker rather than any partial or default token.
- [SEC-04][at-rest] bbj-vscode/tools/em-login.bbj — fail — `P64-D1-002`. `open(ch,mode="O_CREATE,O_TRUNC")outputFile!` / `write(ch)token!` (:41-42) writes the raw JWT to the caller-supplied path with no mode, permission or umask control — `P64-D1-002`'s own citation of these exact lines; not re-recorded here.
- [SEC-04][exposure] bbj-vscode/tools/em-login.bbj — fail — `P64-D1-002`. Process arguments: this script does not itself spawn a further process (its only external call is the in-process `BBjAdminFactory.getAuthToken` API, :39) — it is the *receiving* end of the argv exposure both IDEs' launchers create (`P62-D1-004` for VS Code's `exec()`, `P63-D1-003` for IntelliJ's `GeneralCommandLine`), not a new spawn site of its own. Logs: `? 'HIDE'` (:8) suppresses console echo; no `write(ch)` call anywhere in the file emits `username!`/`password!`/`token!` to stdout or to any log — clean, per `P64-D1-002`'s own confirmed reading. Filesystem: `open(ch,mode="O_CREATE,O_TRUNC")outputFile!` / `write(ch)token!` (:41-42) writes the raw JWT to the caller-supplied path with no permission control — `P64-D1-002`'s own citation of these exact lines, the reason this site's overall verdict is `fail`.
- [SEC-04][expiry] bbj-vscode/tools/em-login.bbj — n/a — this script has no expiry-checking responsibility of any kind; it authenticates and returns a fresh token (:39) with no reference to an existing token's validity anywhere in its 51 lines. Expiry is decided by the IDE-side decode functions (`extension.ts:339-366`, `BbjEMTokenStore.java:56-88`) and by `em-validate-token.bbj`'s server-side round trip, not here.
- [SEC-04][acquisition] bbj-vscode/tools/em-validate-token.bbj — n/a — this script validates an already-acquired token passed in via `ARGV(1)` (:8); it contains no credential prompt and no `getAuthToken`-style acquisition call anywhere in its 34 lines (confirmed by full read) — acquisition happens upstream, in `em-login.bbj` (or the IDE-side login command that invokes it).
- [SEC-04][at-rest] bbj-vscode/tools/em-validate-token.bbj — n/a — this script never persists the token it receives; every `write(ch)` call site (`:14`, `:25`, `:32`) writes only a fixed validation-outcome marker (`"ERROR:..."`, `"VALID"` or `"INVALID"`), never `token!` itself (confirmed by reading all three `write(ch)` call sites in the file) — the token's at-rest exposure is confined to `em-login.bbj`'s write, not duplicated here.
- [SEC-04][exposure] bbj-vscode/tools/em-validate-token.bbj — pass — this script introduces no new exposure of its own: process arguments — like `em-login.bbj`, it spawns no further process (its only external call is the in-process `BBjAdminFactory.getBBjAdmin`, :22); it is the receiving end of the calling IDE's own argv exposure (`P62-D1-004`/`P63-D1-003`), not a second spawn site. Logs: `? 'HIDE'` (:6) suppresses console echo, and every `write(ch)` call site (:14, :25, :32) emits only the fixed `"VALID"`/`"INVALID"`/`"INVALID"` marker, never `token!` itself (confirmed by reading all three). Filesystem: for the same reason, no secret reaches disk from this script — a precision worth stating against `P64-D1-002`'s own prose, which describes `:8-9` as reading the token "the same way" (i.e. via `ARGV`, the same argument channel `em-login.bbj` itself reads from, not a second file-based read) — the token's actual filesystem exposure remains confined to `em-login.bbj`'s write alone, not duplicated here.
- [SEC-04][expiry] bbj-vscode/tools/em-validate-token.bbj — pass — this is the authoritative server-side mechanism both client-side decoders defer to: `BBjAdminFactory.getBBjAdmin(token!, err=token_invalid)` (:22) attempts an actual admin connection using the token, rather than decoding any claim locally — a token EM itself no longer honors (expired, revoked, or malformed) reaches `token_invalid:` (:29-34) and is reported `"INVALID"` regardless of what either IDE's own `isTokenExpired()` concluded. This is the mechanism `validateTokenServerSide()` on both sides (`extension.ts:396-450`, `BbjRunActionBase.java:280-321`) spawns to get an authoritative answer.


**The two-IDE at-rest comparison — ROADMAP criterion 3's own question.**

1. **What each side actually uses.** VS Code — `context.secrets` (`vscode.ExtensionContext.secrets`,
   VS Code's `SecretStorage` API), assigned to the module-level `secretStorage` at
   `extension.ts:587` and exercised at `:667` (store), `:381`/`:473` (delete). IntelliJ —
   `PasswordSafe.getInstance()` (`BbjEMTokenStore.java:31-47`), the platform's shared
   credential-storage service.
2. **What each is backed by.** Both are, by design, delegated to an OS-native-credential-store —
   VS Code's `SecretStorage` is documented to use the platform keychain (Keychain Access on macOS,
   Credential Manager on Windows, a libsecret-backed keyring on Linux) with no per-extension
   override point, and IntelliJ's `PasswordSafe` defaults to the same class of native-keychain
   backing. **This much is a genuine parity**, checked here by reading both call sites' actual APIs
   rather than assumed: neither file implements its own encryption or its own flat-file store; both
   delegate to a platform service whose sole job is exactly this (D-12).
3. **Where they diverge — the security property that matters.** IntelliJ's `PasswordSafe` backend
   is **not fixed**: it is IntelliJ's own IDE-wide, user-facing "Save passwords" setting (Settings >
   Appearance & Behavior > System Settings > Passwords), with three options — native keychain, a
   local KeePass-format file, or memory-only ("Do not save") — and `BbjEMTokenStore.createAttributes()`
   (`:25-29`) passes no flag that pins, requests or even checks which of the three is active;
   `P63-D8-003` already established this by reading the same file for a doc-accuracy defect (its
   class doc's "stored in the OS-native keychain" claim overclaims a guarantee the code does not
   enforce). VS Code's `SecretStorage`, by contrast, exposes **no equivalent user-facing or
   extension-facing choice** — no setting in `bbj-vscode/package.json` (checked in the at-rest
   verdict above) or in the VS Code Secret Storage API itself lets a user or this extension redirect
   storage to a weaker backend; the binding is fixed by the platform. Deletion is symmetric with
   storage on both sides (VS Code: `:381`/`:473` delete on invalidation, matching `:667`'s store;
   IntelliJ: `deleteToken()` at `:44-47`, called from `BbjRunBuiAction`/`BbjRunDwcAction` at
   `:76`/`:82` on invalidation, matching `storeToken()` at `BbjEMLoginAction.java:139`). Neither side
   has a path that persists the token anywhere else at rest — VS Code's only other reference to the
   token is the transient temp file at `:648`,`:653`,`:658,660` (deleted immediately after read,
   covered under `exposure`); IntelliJ's is the transient temp file at `BbjEMLoginAction.java:96`
   (`P63-D1-005`).
4. **Verdict on the comparison.** **The mechanism choice agrees** — both delegate to a platform
   credential service rather than a hand-rolled store — and is recorded as a positive result with
   the check that established it: reading both call sites' actual API surface, not their doc
   comments. **The guarantee they provide diverges**: VS Code's binding is invariant; IntelliJ's is
   user-selectable down to a local file or memory-only with no code-level pin or warning. This is the
   asymmetry `P65-D1-002` records below — an asymmetry between the two IDEs on the same at-rest
   concern, visible only by putting both sides' actual storage APIs side by side rather than reading
   either in isolation (D-04 justification 2).


**The two-IDE expiry comparison — criterion 3's "end to end" clause.**

1. **What each side actually does.** Both sides run the identical two-step sequence: a fast,
   client-side JWT `exp`-claim decode (`extension.ts:339-366` / `BbjEMTokenStore.java:56-88`) that
   fails open on anything it cannot cleanly parse, followed — for every currently-used run path on
   both sides — by a mandatory, unconditional server round trip through the one shared script,
   `em-validate-token.bbj`, which asks EM itself whether the token is still honored
   (`validateTokenServerSide()`, `extension.ts:396-450` and `BbjRunActionBase.java:280-321`).
2. **What each mechanism can and cannot detect.** The client decode can only catch a **well-formed**
   JWT with a legible `exp` claim that has already passed; it cannot catch a malformed token, a
   token with no `exp` claim, or a revoked-but-not-yet-expired token — all three fall through to
   "not expired" on both sides, identically (`P63-D1-004` / `P65-D1-003`). The server round trip has
   the opposite shape: it detects revocation and any EM-side invalidation a client-side decode could
   never see, at the cost of a real network round trip (10s timeout on both sides) on every single
   run, not only the first after login.
3. **What each does with an input it cannot classify.** Identically: treat it as "not expired" and
   defer to the server round trip. Neither side special-cases an ambiguous input by failing closed
   at the decode step.
4. **The combined end-to-end position.** A stale token run through either IDE reaches the same
   outcome: the client decode alone is not authoritative and would wrongly wave through a malformed
   or `exp`-less token, but the always-subsequent, unconditional call to the shared
   `em-validate-token.bbj` script is the actual authority for both IDEs' run flows, and it correctly
   rejects anything EM itself no longer honors. **Agreement is recorded as a positive result with
   the checks that established it (D-12):** the identical decode shape (line-by-line trace above),
   the identical mandatory-backstop composition (`BbjRunBuiAction`/`BbjRunDwcAction:75-104` vs.
   `ensureValidToken:456-479`), and the identical residual gap on both sides — a freshly-acquired
   token is stored without being re-validated at that moment (`BbjEMLoginAction.java`, cross-ref
   `P63-D1-004`; `extension.ts`, `P65-D1-003`). **No divergence was found** between the two IDEs on
   this stage; the weakness that exists is shared, not asymmetric, and each side's instance is
   recorded under its own owning finding rather than treated as a comparison finding in its own
   right.

### Lifecycle Matrix

Stage columns in ROADMAP criterion 3's own order. Every filled cell's token matches its
corresponding `### Verdicts` line above — the matrix is a **view** of the verdicts, never a second
record of them; re-checked cell-for-cell against `### Verdicts` before closing the surface.

| Site | Acquisition | At-rest | Exposure | Expiry |
|---|---|---|---|---|
| `BbjEMLoginAction.java` | pass | fail (`P63-D1-005`) | fail (`P63-D1-003`) | fail (`P63-D1-004`) |
| `BbjEMTokenStore.java` | n/a | fail (`P65-D1-002`) | n/a | fail (`P63-D1-004`) |
| `BbjRunBuiAction.java` | n/a | n/a | fail (`P63-D1-003`) | pass |
| `BbjRunDwcAction.java` | n/a | n/a | fail (`P63-D1-003`) | pass |
| `extension.ts` | pass | pass | fail (`P62-D1-004`) | fail (`P65-D1-003`) |
| `em-login.bbj` | pass | fail (`P64-D1-002`) | fail (`P64-D1-002`) | n/a |
| `em-validate-token.bbj` | n/a | n/a | pass | pass |

**At-rest comparison summary (`SecretStorage` vs. `BbjEMTokenStore`/`PasswordSafe`):** mechanism
agreement (both platform-delegated to native-keychain-class storage), guarantee divergence (VS
Code's binding is fixed, IntelliJ's is user-configurable down to a KeePass file or memory-only) —
full comparison above SEC-04's `### Verdicts`; the divergence is `P65-D1-002`.

**Expiry comparison summary (client-side JWT decode vs. server-side round trip):** both sides run
the identical fail-open decode followed by the identical mandatory server round trip through the one
shared `em-validate-token.bbj` script — full comparison above; agreement recorded per D-12, no
divergence found, and each side's residual "freshly-issued token not re-checked" gap is recorded
under its own owning finding (`P63-D1-004` for IntelliJ, `P65-D1-003` for VS Code).

### Findings

```
id:                P65-D1-002
unit:              SEC-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:25-29
                   (contrasted with bbj-vscode/src/extension.ts:587,667)
dimension:         D1
secondary:         [D7]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace across both IDEs (D-07/D-11 — no runnable reproduction
                    accompanies this record; changing an IDE-wide preference in a live IntelliJ
                    instance and observing PasswordSafe's resulting backend is outside this
                    static-trace sweep's scope). BbjEMTokenStore.createAttributes() (:25-29) builds a
                    CredentialAttributes from only a generated service name
                    (CredentialAttributesKt.generateServiceName("BBj Enterprise Manager",
                    "jwt-token")) and passes no further flag; storeToken/getToken/deleteToken (:31-47)
                    call PasswordSafe.getInstance() with those attributes and nothing else. Which
                    backend PasswordSafe actually uses is governed entirely by IntelliJ's own
                    IDE-wide "Save passwords" setting (Settings > Appearance & Behavior > System
                    Settings > Passwords) — native keychain, a local KeePass-format file, or
                    memory-only ("Do not save") — a fact P63-D8-003 already established by reading
                    this same file for a doc-accuracy defect (its class doc's "stored in the
                    OS-native keychain" claim overclaims a guarantee the code does not enforce).
                    Contrasted against bbj-vscode/src/extension.ts:587 (secretStorage =
                    context.secrets) and :667 (context.secrets.store(...)): VS Code's SecretStorage
                    binding is fixed by the platform, with no setting in bbj-vscode/package.json
                    (grep -n 'secret\|credential' returns nothing relevant) or in the extension's own
                    code that could redirect it elsewhere. This is a genuine cross-IDE asymmetry on
                    the at-rest security property criterion 3's "and VS Code's equivalent storage"
                    clause asks to be compared — an asymmetry no single-module review (Phase 62 or
                    Phase 63, each scoped to one IDE) could see, since seeing it requires reading both
                    sides' actual storage APIs side by side.
failure_scenario:  An organization's IT policy, or a user acting alone, sets IntelliJ's "Save
                    passwords" preference to "In KeePass" or "Do not save" — a setting entirely
                    outside this plugin's knowledge or control — and the EM JWT is thereafter stored
                    in a local KeePass-format file (protected only by that file's own master
                    password and OS file permissions, a materially weaker guarantee than an OS
                    keychain entry) or not persisted at all across IDE restarts, forcing a silent
                    re-login prompt with no indication to the user that their chosen preference
                    changed this specific credential's protection. The equivalent VS Code user has no
                    such lever available to weaken it, and no comparable warning exists on either
                    side telling the user which backend is currently protecting this particular
                    token.
classification:    major
                    (1) touches 1 file: pass — the fix (checking PasswordSafe's active backend via
                    the IntelliJ Platform's own exposed state, or emitting a one-time warning when it
                    is not the native keychain) is confined to BbjEMTokenStore.java — (2) no public
                    API/grammar/LSP change: pass — (3) no new dependency: pass (PasswordSafe/
                    CredentialAttributes are already-used IntelliJ Platform APIs) — (4)
                    regression-testable with existing harness: FAIL — no src/test/ source set exists
                    in bbj-intellij (P63-D5-001) — (5) reviewer can name the exact edit: pass (surface
                    a one-time notification when PasswordSafe's resolved backend is not the native
                    keychain, mirroring the transparency VS Code's fixed binding provides for free) —
                    (6) severity medium but primary dimension D1: FAIL — test (6) fails on the D1
                    clause alone, so classification is major regardless of the other five tests
                    (D-13's safety gate).
effort:            4
dedup:             none — no frozen open issue names PasswordSafe, SecretStorage, or credential-
                    backend configurability of any kind.
disposition:       major-refactor
```


```
id:                P65-D1-003
unit:              SEC-04
location:          bbj-vscode/src/extension.ts:339-366 (contrasted with
                   bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:56-88,
                   P63-D1-004)
dimension:         D1
secondary:         [D2]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace (D-11 — no runnable reproduction accompanies this record;
                    forging a malformed JWT and driving it through the full login/run flow to
                    observe the fail-open branch fire is exploit construction, out of this static
                    sweep's scope). isTokenExpired() (extension.ts:339-366) returns false ("not
                    expired") for exactly the same three inputs P63-D1-004 already records for
                    BbjEMTokenStore.isTokenExpired(): a non-3-part token (:344-346, "Not a JWT, let
                    server decide"), a payload with no exp claim (:355-357, "No expiration claim,
                    can't determine"), and any exception during base64url-decode/JSON-parse
                    (:363-365, "If any parsing fails, let server validate") — no signature
                    verification of any kind anywhere in the function. No P62-D1-* record names this
                    function as a security-relevant defect: Phase 62's own D8 doc-accuracy check
                    (62-COVERAGE.md:344) read this exact function only to confirm its docstring
                    matches its implementation ("isTokenExpired's ... docs ... both match their
                    implementations"), never asking whether the fail-open shape itself is a security
                    concern — a question outside a single-module review's own D1 checklist for this
                    file (which recorded P62-D1-003/P62-D1-004 instead, neither about expiry
                    decoding). Only this cross-cutting SEC-04 sweep, built explicitly to trace expiry
                    handling end to end across both IDEs (ROADMAP criterion 3), surfaces that VS
                    Code's client-side decode independently exhibits the identical weakness already
                    recorded on the IntelliJ side — a gap between the VS-Code-scoped review (Phase
                    62) and the IntelliJ-scoped review (Phase 63) that neither could see from its own
                    module alone (D-04 justification 1). The practical exposure is mitigated but not
                    eliminated by ensureValidToken()'s mandatory server round trip (:456-479, calling
                    validateTokenServerSide at :471) for both bbj.runBUI (:676-679) and bbj.runDWC
                    (:683-686) — mirroring BbjRunBuiAction/BbjRunDwcAction's own composition — but the
                    residual gap matches P63-D1-004's own note for BbjEMLoginAction exactly: a
                    freshly-acquired token is stored (context.secrets.store, :667) without itself
                    being re-validated at that moment.
failure_scenario:  A JWT token that is not well-formed 3-part base64url, whose decoded payload lacks
                    an exp claim, or whose decode throws for any reason is reported "not expired"
                    identically to a token with a genuine future exp, by getEMCredentials() (:374-388)
                    and therefore by ensureValidToken() and getEMCredentials()'s every other caller.
                    The freshly-issued token stored by the bbj.loginEM handler (:667) is never itself
                    run through this or any other validator before being persisted, so a malformed or
                    substituted token at that exact moment would be accepted into SecretStorage
                    silently — the run flows remain protected only because ensureValidToken's separate
                    server round trip (:471) is unconditional, not because this decode caught anything.
classification:    major
                    (1) touches 1 file: pass — confined to extension.ts — (2) no public API/grammar/
                    LSP change: pass — (3) no new dependency: pass — (4) regression-testable with
                    vitest: pass (isTokenExpired is a pure function over a string input; the five
                    branches — well-formed-expired, well-formed-valid, malformed, no-exp, and
                    parse-exception — are all directly testable with no VS Code API mock needed) —
                    (5) reviewer can name the exact edit: pass (change the three "unable to determine"
                    branches at :345,:356,:364 to return true — fail closed — matching the exact edit
                    P63-D1-004 already proposes for its own IntelliJ analog) — (6) severity medium but
                    primary dimension D1: FAIL — test (6) fails on the D1 clause alone, so
                    classification is major regardless of the other five tests (D-13's safety gate).
effort:            4
dedup:             none — no frozen open issue names JWT expiry-decoding fail-open behaviour in the
                    VS Code extension.
disposition:       major-refactor
```


### Not-reproducible dispositions

None. Every claim raised while sweeping SEC-04 — including the at-rest and expiry comparisons — was
settled by a direct code trace with concrete `file:line` citations (see `### Verdicts`, the at-rest
comparison and the expiry comparison above); no claim required constructing an unconfirmable exploit
(capturing another process's live argument list, racing `BbjEMLoginAction.java`'s/`em-login.bbj`'s
temp-file permission window, forging or replaying a JWT, or changing a live IntelliJ "Save
passwords" preference and observing `PasswordSafe`'s resulting backend). Where a reproduction was
genuinely out of this static sweep's own scope, each finding's own `evidence:` field says so
explicitly (`P65-D1-002`, `P65-D1-003`, per D-11) rather than promoting the claim on plausibility.

### Cross-references

**`P62-D1-004`** (`bbj-vscode/src/extension.ts:415,420,639`, medium severity) — establishes
`extension.ts`'s process-argument exposure of both the JWT (`:415`) and the login password (`:635`,
which this record's own evidence also traces) and the log-masking fragility at `:420`/`:639`.
**Confirmed and extended**: this sweep's `extension.ts` exposure verdict cites it directly for both
secrets and adds the filesystem half `P62-D1-004` does not itself cover — the JWT reaching a file
via the spawned `em-login.bbj` (`P64-D1-002`), the chain this site's own spawn creates.

**`P63-D1-003`** (four IntelliJ call sites, high severity) — establishes the IntelliJ half of the
token/password-as-process-argument exposure. **Confirmed against each of its four sites
individually** (`BbjEMLoginAction.java`'s password leg; `BbjRunActionBase.java`'s, `BbjRunBuiAction`'s
and `BbjRunDwcAction`'s token leg) rather than at summary level. **This is the record `65-03`/SEC-05
cross-references for the token-as-process-argument question SEC-04 owns outright per D-07** — see
the explicit handoff line below.

**`P63-D1-004`** (`BbjEMTokenStore.java:56-88`, medium severity) — establishes the IntelliJ-side
fail-open JWT decode. **Confirmed** for its own file, unmodified, and **extended**: this sweep shows
the identical decode shape independently present in `extension.ts`'s `isTokenExpired` — recorded as
the new `P65-D1-003` (a different file, outside a single-module review's own scope) rather than
folded into this ID, per D-04's rule against re-recording under a re-used owner.

**`P63-D1-005`** (`BbjRunActionBase.java:295`, `BbjEMLoginAction.java:96`, medium severity) —
establishes the IntelliJ temp-file permission gap. **Confirmed** for `BbjEMLoginAction.java`'s
citation exactly, cited unmodified in this sweep's at-rest and exposure verdicts for that site; this
sweep additionally notes (in the at-rest verdicts for `BbjRunBuiAction.java`/`BbjRunDwcAction.java`)
that the record's *other* cited call site (`BbjRunActionBase.java:295`) carries only the non-secret
`VALID`/`INVALID` marker, not the token itself — a precision on scope, not a disagreement with the
permission-gap finding, which remains valid and unmodified at both call sites.

**`P64-D1-001`** (`bbj-vscode/tools/web.bbj:30-31`, medium severity) — the hardcoded EM
administrator credential fallback. **Not one of SEC-04's 7 enumerated sites**: `web.bbj` is not
matched by the register's own derivation command (`grep -rl 'EMToken\|emToken\|EM_TOKEN\|em\.token'`
— confirmed by re-running it, `web.bbj` is absent from the output). It is topically part of the same
EM-login flow the enumerated sites belong to, so it is cross-referenced here as **context establishing
nothing further for SEC-04's own enumerated surface** — no `[SEC-04]` line discharges it, and none
should, since it was never enumerated.

**`P64-D1-002`** (`bbj-vscode/tools/em-login.bbj:10-13,41-43`, high severity) — establishes the
plaintext-JWT-to-file write and the shared ARGV-intake shape across `em-login.bbj`, `web.bbj` and
`em-validate-token.bbj`. **Confirmed** for `em-login.bbj`'s write at `:41-43`, cited unmodified in
this sweep's at-rest and exposure verdicts for that site. This sweep also states a precision (in
`em-validate-token.bbj`'s exposure verdict): the record's own prose describing
`em-validate-token.bbj:8-9` as reading the token "the same way" is accurate for the ARGV-channel
claim (both lines are `ARGV(...)` reads, confirmed by direct read) but is stated more precisely as
such here, since a literal reading of "reads the token back" could suggest a second file-based read
that does not exist — `em-validate-token.bbj` never writes the token to disk at all (see its at-rest
and exposure verdicts). This precision changes no severity, classification or disposition of
`P64-D1-002`, which remains the correct, unmodified owner of the filesystem-write finding.

**D-07 handoff to `65-03`/SEC-05.** The token-as-process-argument question is answered, once, in this
surface: the `[SEC-04][exposure]` lines for `BbjRunBuiAction.java`, `BbjRunDwcAction.java` (token leg,
discharged by `P63-D1-003`) and `extension.ts` (token leg, discharged by `P62-D1-004`), plus
`BbjEMLoginAction.java`'s password leg (`P63-D1-003`) and `em-login.bbj`'s receiving-end exposure
(`P64-D1-002`). `65-03`/SEC-05 cross-references these five verdict lines and their two discharging IDs
by ID rather than re-recording them, per D-07.

### Surface closure

**Four-part stopping rule, discharged part by part.**

(i) **Every enumerated item carries a verdict, no placeholder remains.** Within this section,
`grep -cE '^- \[SEC-04\]\[[a-z-]+\] .* — pending$'` prints `0`; all 28 `[SEC-04]` lines above carry
`pass`, `fail` or `n/a` (no `undetermined` was needed anywhere on this surface).

(ii) **Every `pass` names concrete checks with `file:line` anchors; every `fail` names a discharging
ID, new (`P65-D1-002`, `P65-D1-003`) or inherited (`P62-D1-004`, `P63-D1-003`, `P63-D1-004`,
`P63-D1-005`, `P64-D1-002`); every `n/a` carries a written reason naming where the stage happens
instead.** No `undetermined` verdict was needed — every candidate resolved cleanly to one of the
other three (see (iii)).

(iii) **Every candidate claim raised during the sweep was either promoted to a finding or written
under `### Not-reproducible dispositions`.** Two claims were promoted: `P65-D1-002` (the at-rest
`SecretStorage`/`PasswordSafe` backend-guarantee asymmetry) and `P65-D1-003` (VS Code's independently
fail-open `isTokenExpired`). `### Not-reproducible dispositions` is correctly empty — nothing on this
surface required constructing an unconfirmable exploit.

(iv) **Every ledger row whose Surfaces column names SEC-04 carries a written cross-reference.** All
six such rows — `P62-D1-004`, `P63-D1-003`, `P63-D1-004`, `P63-D1-005`, `P64-D1-001`, `P64-D1-002` —
are cross-referenced in `### Cross-references` above; `P64-D1-001` explicitly as context establishing
nothing further, since `web.bbj` is not one of this surface's 7 enumerated sites. Zero inherited
items were dropped.

**Live-derived denominator vs. D-02 baseline.** The live derivation command
(`{ grep -rln 'EMToken\|emToken\|EM_TOKEN\|em\.token' bbj-vscode/src bbj-intellij/src; ls
bbj-vscode/tools/em-login.bbj bbj-vscode/tools/em-validate-token.bbj; } | sort -u`) reproduces exactly
**7 sites**, agreeing with D-02's baseline of 7 with **no drift** (re-confirmed live at this task's
own execution time, in `### Enumeration` above). The 28-item enumeration (7 sites × 4 stages) is
fully resolved with no placeholder line remaining.

**What SEC-04 hands to `65-03` and to the close-out's requirement gate.** ROADMAP criterion 3 is
discharged: the EM token lifecycle is traced end to end across `BbjEMTokenStore`, `em-login.bbj`,
`em-validate-token.bbj` and VS Code's `SecretStorage`, with the two comparisons criterion 3 explicitly
names — at-rest (`SecretStorage` vs. `PasswordSafe`) and expiry (client decode vs. server round trip)
— each answered as a comparison, one yielding a genuine asymmetry (`P65-D1-002`) and the other a
genuine agreement (D-12, no divergence). The token-as-process-argument question is settled once, with
its owning verdict lines and discharging IDs named above for `65-03`/SEC-05 to cross-reference under
D-07. Three new findings in total (`P65-D1-001` carried in from `65-01`'s SEC-02 sweep is unaffected
by this section; `P65-D1-002` and `P65-D1-003` are this section's own), continuing the phase's
`P65-D1-nnn` sequence monotonically; the next allocation in this phase is `P65-D1-004`.

**SEC-04 is closed.**

## SEC-05 — Process-spawn argument & command injection

**Requirement (SEC-05, REQUIREMENTS.md:48):** *Process spawning audited for argument and command injection across every run/compile path in both IDEs, including user-controlled paths, classpath values, and config.bbx settings.*

**ROADMAP criterion discharged:** **criterion 4** — *Every run/compile process-spawn path in both IDEs is checked for argument/command injection via user-controlled paths, classpath values, or config.bbx settings.*

**Owned by plan `65-03` (wave 3)**, which also writes `## Phase 65 Close-Out`. Per D-07 the token-as-process-argument question belongs to SEC-04; this surface cross-references it by ID.

### Enumeration

Re-derived at this task's own execution time, self-contained for a reader who starts here rather
than at the header. Three legs (identical commands to `## Surface Enumeration Register`'s SEC-05
block):

```bash
# leg 1 — VS Code
grep -rnE 'child_process|spawn\(|spawnSync\(|execSync\(|execFile\(|exec\(' bbj-vscode/src --include=*.ts --include=*.cjs | grep -v '/generated/'
# leg 2 — IntelliJ
grep -rnE 'new GeneralCommandLine|new ProcessBuilder|Runtime\.getRuntime' bbj-intellij/src
# leg 3 — the BBj tool scripts
ls bbj-vscode/tools/*.bbj
```

**Literal counts, re-confirmed live: leg 1 = `25`, leg 2 = `8`, leg 3 = `3`. Denominator: 25 + 8 + 3
= 36 raw candidates — no drift from `## Surface Enumeration Register`'s own live count.**

**D-02 baseline: `27`, already demoted by D-02 correction 2 to a comparison baseline rather than a
gate, because no single grep reproduces it. Live value 36 — a drift of +9, carried forward from the
register with its cause rather than re-derived here: the leg-1 pattern actually run is wider than
the "naive pattern" measured at discussion time (18 raw VS Code lines, of which 7 were counted as
`RegExp.prototype.exec` noise) — this task's own decomposition below independently confirms the
register's arithmetic (6 `child_process` import/comment lines + 11 `RegExp.prototype.exec` lines +
8 real-construction-or-comment lines = 25) rather than trusting it.**

**The two-stage refinement shape, applied now.** Stage 1 is the 36-line raw candidate set the
register closed before any surface was swept. This task now executes stage 2, resolving **every** candidate
either to a real process-spawn site carrying a verdict or to `n/a` with a written exclusion reason
on the same line. **No candidate is deleted, merged or silently narrowed** — every one of the 36
raw candidate lines becomes exactly one enumerated line below, so the refinement is auditable rather
than only its survivors being visible.

**Broader-pattern check for missed spawn APIs, run now rather than assumed.** An additional sweep
for spawn-adjacent surface the three legs' patterns could miss —
`createTerminal|sendText|executeTask|shellExecution|ShellExecution` on the VS Code side and
`ExecUtil\.` on the IntelliJ side (already inside leg 2's IntelliJ file set) — returns **no line
outside the 36 already enumerated** (checked by re-running the widened patterns over
`bbj-vscode/src` and `bbj-intellij/src` and diffing the result against the three legs' own output).
**Zero `[SEC-05][extra]` lines are added.** This is stated as a checked-and-clean result, not an
omission (D-12): the denominator can drift upward, and this task confirms — by running the wider
search rather than skipping it — that it does not need to here.

**Task 1's own leg (VS Code, 25 candidates) is resolved below.** Task 2 resolves the IntelliJ leg
(8 candidates) and the tool-script leg (3 candidates), writes the cross-IDE comparison, and closes
the surface.

### Verdicts
- [SEC-05][candidate] bbj-vscode/src/addchildwindow-composer.ts:286 — n/a — `re.exec(line)` inside `findAddChildWindowCalls`, matching `/addchildwindow\s*\(/gi` against the current line's text to locate `addChildWindow(...)` calls for the composer's own hover/decode UI — `RegExp.prototype.exec`, not `child_process`; no process is spawned anywhere in this file (confirmed by full read).
- [SEC-05][candidate] bbj-vscode/src/Commands/Commands.cjs:3 — n/a — `const { exec } = require("child_process");`, the module-level import binding the Node.js `child_process` API into scope; it invokes nothing itself.
- [SEC-05][candidate] bbj-vscode/src/Commands/Commands.cjs:25 — n/a — a JSDoc comment line ("Helper function to wrap child_process.exec() in a Promise for use with withProgress") documenting the `execWithProgress` helper defined immediately below; matched only because it quotes `child_process.exec()` for illustration, not because it calls anything.
- [SEC-05][candidate] bbj-vscode/src/Commands/Commands.cjs:31 — fail — P62-D1-003. Shell/argv: **shell** — `exec(cmd, ...)` inside the `execWithProgress` helper hands a single pre-built string to `child_process.exec()`, which always spawns via `/bin/sh -c`/`cmd.exe`. Origins: this is the one sink both `compile`'s `await execWithProgress(cmd)` (:336, `cmd` built at :328 from `home` (`bbj.home`) plus `buildCompileOptions()`'s 7 string-typed `bbj.compiler.*` settings plus `fileName`, none escaped) and `decompileReadonly`'s `await execWithProgress(\`${bbjlstBin(home)} -l "${tmpInput}"\`)` (:379, `home` from `bbj.home`, `tmpInput` built from the user's open file's own basename inside a fresh `fs.mkdtempSync` temp dir) route through — a filename containing an embedded `"` would break `tmpInput`'s own quoting the same unescaped way P62-D1-003 traces for `bbj.classpath`. Effect: shell-metacharacter reinterpretation of any of these values, up to arbitrary command execution (CWE-78) — same problem class as P62-D1-003. Shares P62-D1-003's shape: **yes** — P62-D1-003's own evidence states it checked "all six call sites" of `child_process.exec()` in this unit and found none escaped; this is one of the six (its `compile` invocation is the record's own cited `Commands.cjs:325-328`), and `decompileReadonly`'s invocation of the identical sink is traced here as sharing the same unescaped-shell-string construction, not re-recorded as a new finding.
- [SEC-05][candidate] bbj-vscode/src/Commands/Commands.cjs:117 — fail — P62-D1-003. Shell/argv: **shell** — `exec(cmd, ...)` (:117, inside `runWeb`, the BUI/DWC-run handler) hands the single pre-built string `cmd` (:109, interpolating `bbj`, `webRunnerWorkingDir`, `client`, `name`, `programme`, `workingDir`, `username`, `password`, `sscp`, `token`, `configPath` — all inside double quotes, none escaped) to `child_process.exec()`. Origins: `bbj` from `bbj.home`; `sscp` from `bbj.classpath`; `name` from `bbj.web.apps.<file>.name` when configured — P62-D1-003's own cited "`bbj.web.apps.<file>.name` (Commands.cjs:97-99,109, quoted but unescaped)"; `configPath` from `bbj.configPath`; `username`/`password`/`token` from EM credentials; `workingDir`/`programme` from the active file's own path. Effect: shell-metacharacter reinterpretation of any of ten interpolated segments, up to arbitrary command execution (CWE-78) — the same unescaped-shell-string construction, applied to the widest value set of the three Commands.cjs sinks. Shares P62-D1-003's shape: **yes** — P62-D1-003's own cited call site.
- [SEC-05][candidate] bbj-vscode/src/Commands/Commands.cjs:271 — fail — P62-D1-003. Shell/argv: **shell** — `exec(cmd, ...)` (:271, inside `runCommand`, the GUI-run handler) hands the single pre-built string `cmd` (:263, `` `"${bbj}" -q ${sscp} ${configArg}-WD"${workingDir}" "${fileName}"` ``) to `child_process.exec()`. Origins: `bbj` from `getBBjHome()` (`bbj.home`, truthiness-only check); `sscp` is `bbj.classpath` — this exact segment is P62-D1-003's own cited "interpolated unquoted at Commands.cjs:263" quote; `configArg` wraps `bbj.configPath` in double quotes but does not escape it; `workingDir`/`fileName` derive from the active editor's own file path. Effect: shell-metacharacter reinterpretation of `bbj.classpath` (unquoted — the strongest instance of this construction) or `bbj.configPath`, up to arbitrary command execution (CWE-78) sourced from a workspace-committed setting — P62-D1-003's own primary illustration. Shares P62-D1-003's shape: **yes** — this is the literal call site P62-D1-003's `location:` field cites (`Commands.cjs:263`).
- [SEC-05][candidate] bbj-vscode/src/language/bbj-completion-provider.ts:797 — n/a — `/^\s*(run|call)(?=\s|")/i.exec(beforeCursor)` inside `parseRunCallFilePathContext`, matching the RUN/CALL keyword at the start of the current line for file-path completion — `RegExp.prototype.exec` on editor text, not a process spawn.
- [SEC-05][candidate] bbj-vscode/src/language/bbj-inlay-hint-provider.ts:143 — n/a — `/^#?([a-zA-Z_][a-zA-Z0-9_]*)[!$%]?$/.exec(argumentText.trim())` inside `matchesParameterName`, matching an argument's text against an identifier shape to suppress a redundant inlay hint — `RegExp.prototype.exec`, not a process spawn.
- [SEC-05][candidate] bbj-vscode/src/language/bbj-cpl-service.ts:1 — n/a — `import { spawn } from 'child_process';`, the module-level import binding Node's `spawn` into scope; it invokes nothing itself.
- [SEC-05][candidate] bbj-vscode/src/language/bbj-cpl-service.ts:41 — n/a — a JSDoc comment line ("Uses spawn() (not exec()) for streaming stdout/stderr") documenting the `compile()` method's own design decisions; matched only because it names `spawn()`/`exec()` for illustration, not because it calls anything.
- [SEC-05][candidate] bbj-vscode/src/language/bbj-cpl-service.ts:140 — fail — P61-D1-003. Shell/argv: **argv** — `proc = spawn(bbjcplBin, ['-N', filePath])` (:140) passes the executable and each argument as separate array elements to Node's `spawn()`, which execs directly with no shell involved. Origins: `bbjcplBin` comes from `getBbjcplPath()` (:228-234), `path.join(this.wsManager.getBBjDir(), 'bin', binaryName)` — `bbj.home` gated only by a truthiness check (P61-D1-003's own citation, `:228-235`), never that the path resolves to a real, executable file; `filePath` is the document path passed in by the caller. Effect: since this is `spawn()` with an argument array, no shell-metacharacter class of injection applies to either value regardless of content — the exposure P61-D1-003 already records is an unvalidated-executable-path concern (a misconfigured or attacker-influenced `bbj.home` selects what gets spawned), not an argument-injection one. Shares P62-D1-003's shape: **no** — argv construction, not a shell string; the underlying gap is P61-D1-003's own, cross-referenced rather than re-recorded.
- [SEC-05][candidate] bbj-vscode/src/language/bbj-cpl-parser.ts:36 — n/a — `ERROR_LINE_RE.exec(line)` inside `parseBbjcplOutput`, matching one line of `bbjcpl`'s own stderr text against the compiler's fixed diagnostic-line pattern to build an LSP `Diagnostic` — `RegExp.prototype.exec` on already-captured process output, not a process spawn.
- [SEC-05][candidate] bbj-vscode/src/language/bbj-scope-local.ts:89 — n/a — `classPattern.exec(text)` inside the local-symbols scope computation, matching a `class` declaration pattern against the document's own raw text as a parser-recovery fallback — `RegExp.prototype.exec` on document text, not a process spawn.
- [SEC-05][candidate] bbj-vscode/src/addwindow-composer.ts:121 — n/a — `/^\$([0-9A-Fa-f]*)\$$/.exec(token.trim())` inside `parseHexLiteral`, matching a `$HHHHHHHH$` hex-literal token for the addWindow composer's flag decoding — `RegExp.prototype.exec`, not a process spawn.
- [SEC-05][candidate] bbj-vscode/src/addwindow-composer.ts:385 — n/a — `re.exec(line)` inside `findAddWindowCalls`, matching `/addwindow\s*\(/gi` against the current line's text to locate `addWindow(...)` calls — `RegExp.prototype.exec`, not a process spawn.
- [SEC-05][candidate] bbj-vscode/src/msgbox-composer.ts:510 — n/a — `/^(\s*)(\d+)\s*$/.exec(line.slice(a, b))` inside `buildCallInfo`, matching a plain-integer second argument of a `MSGBOX(...)` call for the composer's reconfigurable-expression detection — `RegExp.prototype.exec`, not a process spawn.
- [SEC-05][candidate] bbj-vscode/src/msgbox-composer.ts:529 — n/a — `re.exec(line)` inside `findMsgboxCalls`, matching `/msgbox\s*\(/gi` against the current line's text to locate `MSGBOX(...)` calls — `RegExp.prototype.exec`, not a process spawn.
- [SEC-05][candidate] bbj-vscode/src/extension.ts:425 — n/a — `const { exec } = require('child_process');`, a local import binding inside `validateTokenServerSide` immediately before its own spawn call; it invokes nothing itself.
- [SEC-05][candidate] bbj-vscode/src/extension.ts:426 — fail — P62-D1-003, P62-D1-004 (D-07 cross-reference — SEC-04 owns the token-as-process-argument question outright; not re-recorded here). Shell/argv: **shell** — `exec(emValidateCmd, { timeout: 10000 }, ...)` (:426) hands the single pre-built string `emValidateCmd` (:414, `` `"${bbj}" -q "${emValidatePath}" - "${token}" "${tmpFile}"` ``) to `child_process.exec()`. Origins: `bbj` from `bbj.home` (truthiness-only check, :397-399); `emValidatePath` from `context.asAbsolutePath(...)`, extension-internal; `token` is the raw JWT read from `getEMCredentials()`; `tmpFile` extension-internal. None of the four double-quoted segments is escaped before interpolation — the identical construction P62-D1-003 traces for this exact call site (its own `location:` cites `extension.ts:415,420,639`, the sibling EM-login call this candidate's construction mirrors). Effect: shell-metacharacter reinterpretation of `token` (or of any of the other three) reaching an executed shell command (CWE-78); separately, `token` reaching this process's own argv is the D-07 exposure question SEC-04 already owns (`P62-D1-004`). Shares P62-D1-003's shape: **yes** — one of P62-D1-003's own cited six call sites.
- [SEC-05][candidate] bbj-vscode/src/extension.ts:644 — n/a — `const { exec } = require('child_process');`, a local import binding inside the `bbj.loginEM` command handler immediately before its own spawn call; it invokes nothing itself.
- [SEC-05][candidate] bbj-vscode/src/extension.ts:645 — fail — P62-D1-003, P62-D1-004 (D-07 cross-reference — SEC-04 owns the token-as-process-argument question outright; not re-recorded here). Shell/argv: **shell** — `exec(emLoginCmd, { timeout: 15000 }, ...)` (:645) hands the single pre-built string `emLoginCmd` (:635, `` `"${bbj}" -q "${emLoginPath}" - "${username}" "${password}" "${tmpFile}" "${infoString}"` ``) to `child_process.exec()`. Origins: `bbj` from `bbj.home` (truthiness-only check, :599-601); `emLoginPath`/`tmpFile` extension-internal; `username`/`password` typed by the user into `showInputBox` prompts moments earlier; `infoString` built from `process.platform`/`os.userInfo().username`. None of the six double-quoted segments is escaped before interpolation — this is P62-D1-003's own cited `extension.ts:...,639` sibling of the validate call above. Effect: shell-metacharacter reinterpretation of `password` (typed by the user, but transiting an unescaped shell string) or of any other segment, up to arbitrary command execution (CWE-78); separately, `password` reaching this process's own argv is the D-07 password leg SEC-04 already owns (`P63-D1-003` covers the IntelliJ password leg; this VS Code password leg is `P62-D1-004`'s own citation of `extension.ts:635`). Shares P62-D1-003's shape: **yes** — one of P62-D1-003's own cited six call sites.
- [SEC-05][candidate] bbj-vscode/src/setopts-catalog.ts:261 — n/a — `/^\s*SETOPTS(?=\s|$)/i.exec(line)` inside `parseSetOptsLine`, matching the `SETOPTS` keyword at the start of a `config.bbx` line for the SETOPTS composer's own hover/decode support — `RegExp.prototype.exec` on document text, not a process spawn.
- [SEC-05][candidate] bbj-vscode/src/setopts-catalog.ts:267 — n/a — `/^[ \t]+([^ \t]+)[ \t]*$/.exec(rest)` inside `parseSetOptsLine`, matching the hex-vector token following the `SETOPTS` keyword — `RegExp.prototype.exec` on document text, not a process spawn.
- [SEC-05][candidate] bbj-vscode/src/document-formatter.ts:2 — n/a — `import * as cp from 'child_process';`, the module-level import binding Node's `child_process` API into scope; it invokes nothing itself.
- [SEC-05][candidate] bbj-vscode/src/document-formatter.ts:59 — fail — P62-D1-006, P64-D1-003. Shell/argv: **argv** — `const p = cp.spawn('java', formatFlags)` (:59) passes the literal string `'java'` as the executable and `formatFlags` (an array built by successive `args.push(...)`) as separate argv elements — no shell involved. Origins: `formatFlags` is built entirely from `jarPath` (`${__dirname}/../tools/formatter/BBjCFCli.jar`, extension-internal), the literal flags `-jar`/`-p`/`-i`/`-w`, `document.uri.fsPath` (the file being formatted) and `config.indentWidth`/three boolean settings coerced to fixed literal flag strings — no value here is interpolated into a shell string, so no argument-injection class applies. Effect: since `'java'` is an unqualified name, it resolves via the OS's own `PATH` search rather than an absolute, pinned interpreter — the exact gap `P62-D1-006` already records for this line; separately, the JAR this spawn executes (`BBjCFCli.jar`) is one of the three unpinned, unverified vendored JARs `P64-D1-003` records — cross-referenced rather than re-recorded, since `P64-D1-003`'s own note distinguishes the executed-artifact-provenance half of SEC-05 from this construction's argument half. Shares P62-D1-003's shape: **no** — argv construction, not a shell string; the two known gaps here (unpinned interpreter, unpinned JAR) are provenance concerns, not argument-injection ones.
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
