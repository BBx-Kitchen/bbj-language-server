# Phase 66: Known Debt Re-triage - Pattern Map

**Mapped:** 2026-08-19
**Files analyzed:** 3 (all `.planning/` prose artifacts — **zero source files**, per CONTEXT.md D-01)
**Analogs found:** 3 / 3

**This phase modifies zero TypeScript/Java/Kotlin source.** All artifacts are markdown planning
documents. `bbj-vscode/`, `bbj-intellij/`, `java-interop/` files listed below are **read-only
evidence anchors** the finding records cite — never edit targets.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `.planning/reviews/66-COVERAGE.md` (CREATE) | planning-doc / verdict record | batch (triage over a closed enumeration) | `.planning/reviews/65-COVERAGE.md` | exact (same structural-break precedent: no INVENTORY grid, self-constructed closed denominator, §F/§G boundary-evidence shape) |
| `.planning/REQUIREMENTS.md` (MODIFY — add DEBT-07/DEBT-08) | planning-doc / requirement ledger | CRUD (append rows) | same file, existing `DEBT-01..06` bullets + coverage-matrix rows | exact (in-file precedent, not cross-file) |
| `.planning/PROJECT.md` §"Known tech debt" (MODIFY — rewrite 8 bullets) | planning-doc / status list | transform (rewrite in place) | same file, existing bullet list (lines ~249-257) | exact (in-file precedent) |

## Pattern Assignments

### `.planning/reviews/66-COVERAGE.md` (CREATE)

**Primary analog:** `.planning/reviews/65-COVERAGE.md` — the direct structural precedent (D-12): it
also constructed its own closed denominator without an INVENTORY grid, and its §F/§G
boundary-evidence sections are what D-15 gate 4 copies.

**Secondary analogs:** `.planning/reviews/63-COVERAGE.md`, `.planning/reviews/64-COVERAGE.md` (per-dimension
finding-record assembly and close-out inheritance tables); `.planning/reviews/INVENTORY.md` (the frozen
finding-record format itself — required fields, evidence tiers, `dedup:`, `disposition:` vocabulary,
the `{2,4,8}` effort scale).

**Top-level section shape to copy from 65-COVERAGE.md** (`grep -n "^## " reviews/65-COVERAGE.md`):
```
## The structural break — stated plainly, and evidenced rather than asserted
## Two recording-shape resolutions the structural break forces
## Finding-ID namespace
## Dedup source
## The synthesis rule (D-04) — the organising rule of this whole file
## The evidence rule (D-11) — the governing rule of this phase
## The disclosure rule (D-14), inherited unchanged
## The scope fence (D-15)
## Surface Enumeration Register
  ### SEC-01 ... ### SEC-05 (per-surface subsections)
## Inherited Findings Ledger
## Stopping Rule & Write Contract
## SEC-01 ... ## SEC-05 (full sections: Enumeration / Verdicts / Findings / Not-reproducible dispositions / Cross-references / Surface closure)
## Phase 65 Close-Out
  ### A. Surface gate
  ### B. Criterion gate
  ### C. Requirement gate
  ### D. Finding accounting
  ### E. Inherited-item accounting (D-04)
  ### F. Scope-fidelity note (D-15)
  ### G. Closing confirmations
```
Phase 66 renames the analogous headers to its own vocabulary: `## Surface Enumeration Register`
becomes the **8-row debt denominator** (D-04); `## SEC-01`..`## SEC-05` per-surface sections become
per-`DEBT-NN` item sections; `## Phase 65 Close-Out` becomes `## Phase 66 Close-Out` with D-15's
four gates (Denominator / Criterion / Requirement / Boundary) replacing 65's (Surface / Criterion /
Requirement / Finding accounting).

**Close-out gate structure to copy** (`.planning/reviews/65-COVERAGE.md:1444-1533`, `### A. Surface gate`):
```markdown
## Phase 65 Close-Out

Every gate below was re-run at execution time and its literal output recorded; none is restated from
`65-CONTEXT.md`, from a surface section, or from an earlier plan (D-16). Where a live re-derivation
disagreed with a figure already in this file, the disagreement would be surfaced here as a defect
rather than reconciled by editing the section; none did.

### A. Surface gate

**Part 1 — all four denominators, re-derived live, each command with its literal output.**

​```bash
# SEC-01 leg 1 — generators
grep -rln 'getHtml\|webview.html' bbj-vscode/src --include=*.ts | wc -l
​```
**`4`**
```
Phase 66's `### A` (its **Denominator gate**, D-15 gate 1) reruns the D-04 command instead:
```bash
sed -n '/^\*\*Known tech debt:/,/^## /p' .planning/PROJECT.md | grep -c '^- '
```
with the literal output printed, and every row shown to carry a verdict — same "re-run live, print
literal output, never restate from CONTEXT" discipline as 65-COVERAGE's `### A`.

**Criterion gate structure to copy** (`.planning/reviews/65-COVERAGE.md:1533-1557`, `### B. Criterion gate`):
```markdown
### B. Criterion gate

1. **criterion 1.** *Every interpolated value in composer markup ... is confirmed escaped/safe or
   flagged, and CSP posture is documented* — discharged by `## SEC-01`'s `### Verdicts` (36/36
   items, 21 `pass`/15 `n/a`, zero `fail`/`undetermined`) ... **Met.**
2. **criterion 2.** ... **Met.**
```
Phase 66's `### B` answers each of ROADMAP's 5 success criteria **Met / Partially Met / Not Met**,
naming the section that discharges it — same per-criterion citation-plus-verdict shape.

**Requirement gate structure to copy** (`.planning/reviews/65-COVERAGE.md:1591-1612`, `### C. Requirement gate`):
```markdown
### C. Requirement gate

| Requirement | Status | Evidence |
|---|---|---|
| **SEC-01** | Complete | `## SEC-01` closed 36/36 items (65-01), `### CSP Posture` documented, criterion 1 Met above |
```
Phase 66's `### C` uses the identical table shape for `DEBT-01`..`DEBT-08`, each marked complete or
explicitly not, with the evidence named.

**Boundary-evidence block to copy verbatim in shape** (`.planning/reviews/65-COVERAGE.md:1738-1790`, `### F. Scope-fidelity note`):
```bash
git log --oneline -- .planning/reviews/INVENTORY.md | head -1
git status --porcelain .planning/reviews/INVENTORY.md .planning/reviews/61-COVERAGE.md .planning/reviews/62-COVERAGE.md .planning/reviews/63-COVERAGE.md .planning/reviews/64-COVERAGE.md
git status --porcelain bbj-vscode bbj-intellij java-interop .github
```
followed by the literal output narrated in prose:
> **`1dcab8b docs(60-04): ...`, nothing, nothing.** `INVENTORY.md`'s most recent commit remains
> Phase 60's; none of the five immutable records carries an uncommitted change; no reviewed tree was
> mutated by any of this phase's three plans. No source file was modified anywhere, no GitHub issue
> was opened or drafted (ISSUE-01 is Phase 69's gate)...

This is **exactly** D-15 gate 4's shape: `git status --porcelain bbj-vscode bbj-intellij java-interop
.github` prints nothing, `git status --porcelain` over `INVENTORY.md` and the five closed
`6N-COVERAGE.md` files prints nothing, and no tracker write occurred.

**Closing confirmations + downstream inheritance table to copy** (`.planning/reviews/65-COVERAGE.md:1790-1838`, `### G. Closing confirmations`):
```markdown
### G. Closing confirmations

- **ISSUE-01 not triggered.** No GitHub issue was opened, commented on, or drafted by any of this
  phase's three plans. ...
- **`INVENTORY.md` not edited.** ...
- **No source file modified and no working-tree mutation of any kind.**
  `git status --porcelain bbj-vscode bbj-intellij java-interop .github` prints nothing (§F above)...

**Downstream inheritance — what each later phase consumes from this file.**

| Phase | Inherits from Phase 65 |
|---|---|
| **Phase 66** | Every finding whose `dedup:` names a `DEBT-*` requirement — **none does; all 3 resolve to `none`** (§D above) — so Phase 66 inherits nothing from this phase's dedup path. |
```
Phase 66's close-out states what Phase 67, 68, 69 each inherit — same table shape, one row per
downstream phase.

---

**Finding-record template to copy verbatim** (`.planning/reviews/INVENTORY.md:118-155`, `## Finding
Record Template`):
```
id:                <P{phase}-D{dimension}-{seq}> — required, see 3a
unit:              <RU-{phase}-{seq}> — required, the review unit this finding belongs to
location:           path:line — required (RVW-06, DOC-01, DOC-02, ISSUE-02)
dimension:         <D1..D8> — required, the primary dimension
secondary:         [<D1..D8>, ...] — optional, other dimensions this finding also violates
severity:          <critical|high|medium|low> — required
evidence_tier:     <repro|trace|inherited> — required, per 3b, the stricter tier if `secondary` is set
evidence:          <the reproduction, or the line-by-line trace> — required
failure_scenario:  <inputs/state -> wrong behaviour> — required
classification:    <easy|major> — required, with the six D-13 tests recorded pass/fail
effort:            <2|4|8> — required
dedup:             <none | #NNN duplicate | #NNN partial-overlap — <what this adds>> — required, never blank, checked against the Frozen Open-Issue Snapshot above
disposition:       <easy-fix|major-refactor|duplicate|wontfix|already-covered|not-reproducible> — required; a reason is required for the last four
```
Note: Phase 66's records do **not** carry any extra field beyond this template — D-06 states no new
field is introduced (the Phase 64 `triage:`-field-not-carried precedent).

**Disposition vocabulary, verbatim** (`.planning/reviews/INVENTORY.md:154`):
```
disposition:       <easy-fix|major-refactor|duplicate|wontfix|already-covered|not-reproducible> — required; a reason is required for the last four
```

**8-vs-6 debt drift, verbatim** (`.planning/reviews/INVENTORY.md:1220`, the row PROJECT.md | §Current
Milestone "Known tech debt" list):
```
| PROJECT.md | §Current Milestone "Known tech debt" list | 8 bullet items under "Known tech debt" | REQUIREMENTS.md's carried-debt enumeration (DEBT-01..DEBT-06) has **6** items, not 8 — two PROJECT.md bullets (`CPL-06 hierarchy suppression timing nuance`, `IntelliJ TextMate bundle cannot exclude config.bbx by filename`) are not represented as a `DEBT-*` requirement and must either be folded into an existing DEBT item or added as a new one before DEBT-06 ("every carried debt item ends this milestone... none remain recorded only as prose in PROJECT.md") can be satisfied | `grep -c '^- \[ \] \*\*DEBT-' .planning/REQUIREMENTS.md` | `6` |
```

**One complete example `P6N-Dn-nnn` finding record with every field populated**
(`.planning/reviews/63-COVERAGE.md:~2255-2286`, `P63-D4-010` — this is DEBT-05's own designated
evidence record, directly inherited per CONTEXT.md D-08/D-10):
```
classification:    major
                    (1) touches 1 file: n/a — this record documents an existing coupling surface,
                    not a proposed fix — (2) no public API/grammar/LSP change: pass — (3) no new
                    dependency: n/a — records an existing dependency's coupling shape, adds nothing
                    — (4) regression-testable with existing harness: FAIL — no src/test/ source set
                    exists (P63-D5-001) — (5) reviewer can name the exact edit: n/a at this
                    recording stage — Phase 66 owns DEBT-05's re-triage and any contract-test
                    authoring, not a single named edit from this unit's evidence alone — (6)
                    severity medium, dimension D4 (not D1): pass — tests (4) and (5) both fail/n/a,
                    so classification is major.
effort:            4
dedup:             DEBT-05 — this is the phase's designated DEBT-05 evidence record; Phase 66
                    re-triages it, not re-derives it. #410 and #231 also checked explicitly and
                    dismissed as unrelated to LSP4IJ API coupling.
disposition:       major-refactor
```
Also see the fully-annotated template example at `.planning/reviews/INVENTORY.md:227-255`
(`P00-D1-001`, reserved illustration-only phase) showing every field with commentary — use this as
the field-by-field reference, `P63-D4-010` as the real populated-record reference.

---

### `.planning/REQUIREMENTS.md` (MODIFY)

**Analog:** the file's own existing `DEBT-*` bullets and coverage-matrix rows.

**Bullet formatting to copy** (`.planning/REQUIREMENTS.md:55-60`, `### Debt Re-triage` section):
```markdown
### Debt Re-triage

- [ ] **DEBT-01**: CPU stability in multi-project workspaces (#232) re-triaged against current code — mitigation implemented, or issue updated with a concrete implementation plan
- [ ] **DEBT-02**: The 3 disabled `parser.test.ts` assertions and the skipped TEST-03 case re-triaged — enabled, or documented with the specific blocking limitation and what would unblock them
- [ ] **DEBT-05**: LSP4IJ experimental API usage (19 sites) and `BbjCompletionFeature` coupling re-triaged — current risk assessed against the installed LSP4IJ version
- [ ] **DEBT-06**: Every carried debt item ends this milestone either fixed or represented by a GitHub issue — none remain recorded only as prose in PROJECT.md
```
New `DEBT-07`/`DEBT-08` bullets append after `DEBT-06` in this identical `- [ ] **DEBT-NN**: <text>`
shape, sourced from CONTEXT.md D-05's table (CPL-06 timing nuance → DEBT-07; IntelliJ TextMate
bundle registration → DEBT-08).

**Coverage-matrix row formatting to copy** (`.planning/REQUIREMENTS.md:137-142`):
```markdown
| DEBT-01 | Phase 66 | Pending |
| DEBT-02 | Phase 66 | Pending |
| DEBT-03 | Phase 66 | Pending |
| DEBT-04 | Phase 66 | Pending |
| DEBT-05 | Phase 66 | Pending |
| DEBT-06 | Phase 66 | Pending |
```
`DEBT-07 | Phase 66 | Pending` and `DEBT-08 | Phase 66 | Pending` append in the identical
`| ID | Phase N | Status |` pipe-table row shape.

---

### `.planning/PROJECT.md` §"Known tech debt" (MODIFY)

**Analog:** the file's own current bullet list.

**Current literal bullet formatting to copy/rewrite** (`.planning/PROJECT.md:249-257`):
```markdown
**Known tech debt:** (checked against the tree and against `.planning/REQUIREMENTS.md`'s DEBT-01..DEBT-06 on 2026-08-17; none resolved — all 8 survive. REQUIREMENTS.md's carried-debt enumeration has 6 items, not 8: the two items marked "not yet mapped" below are not represented as a DEBT-* requirement — see `.planning/reviews/INVENTORY.md` §"D-15 Correction Log".)
- BbjCompletionFeature still extends LSPCompletionFeature (`bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjCompletionFeature.java`), API that may change across LSP4IJ versions — DEBT-05
- CPU stability mitigations documented but not yet implemented (#232) — DEBT-01
- CPL-06 hierarchy suppression takes one extra build cycle after BBjCPL merge (timing nuance, end state correct) — not yet mapped to a DEBT-NN item
- TEST-03 (DEF FN completion inside class methods) skipped — Langium grammar follower limitation — DEBT-02
- 3 parser.test.ts assertions DISABLED — require Java classpath unavailable in EmptyFileSystem test environment — DEBT-02
- IntelliJ TextMate bundle: filename-based `config.bbx`/`config.min` registration was added to the bundle (`2489001`, #381, in `2194616..v0.12.0`) mirroring the VS Code approach, but whether JetBrains' TextMate plugin actually honors `filenames` (vs. `extensions`) is unverified in this sandbox (`./gradlew build` fails on a local JDK toolchain mismatch, not a code defect) — not yet mapped to a DEBT-NN item
- FQN path static-only filtering deferred — USE alias path works; MemberCall isClassRef requires JAR redeployment — DEBT-04
- Static method return type inference gap — String.valueOf(2) does not assign type to target variable — DEBT-03
```
Per D-13, each surviving bullet is rewritten to append its `P66-*` finding ID and disposition after
its existing `— DEBT-NN` suffix (e.g. `... — DEBT-01, P66-D3-001, major-refactor (drafted #NNN,
pending Phase 69 filing)`); items resolved/not-reproducible are struck (`~~bullet text~~ — resolved,
see P66-Dn-nnn`) rather than deleted. The two "not yet mapped" bullets gain their new `DEBT-07`/
`DEBT-08` suffix in place of "not yet mapped to a DEBT-NN item". The header parenthetical is also
rewritten to point at `66-COVERAGE.md` rather than the 2026-08-17 survival check.

## Shared Patterns

### Finding-record discipline (applies to every `P66-*` record in 66-COVERAGE.md)
**Source:** `.planning/reviews/INVENTORY.md:118-160` (template), `:61-116` (§3a-3d: ID scheme,
evidence tiers, easy/major test, `{2,4,8}` effort scale).
**Apply to:** every DEBT-01..08 item's finding record in `66-COVERAGE.md`.
No new field, no off-scale effort value (Phase 63's `3`/`1`/`1` mistake, called out explicitly as
what not to repeat).

### Close-out gate structure (Surface/Denominator → Criterion → Requirement → Boundary)
**Source:** `.planning/reviews/65-COVERAGE.md:1444-1838` (`## Phase 65 Close-Out`, sections A/B/C/F/G).
**Apply to:** `66-COVERAGE.md`'s close-out section (plan `66-03`), per D-15's four gates.

### git status --porcelain boundary-evidence block
**Source:** `.planning/reviews/65-COVERAGE.md:1770-1775` (the three-command block: log on
INVENTORY.md, porcelain on the five closed COVERAGE files, porcelain on the four protected trees).
**Apply to:** `66-COVERAGE.md`'s Boundary gate (D-15 gate 4), reproduced with `git status --porcelain
bbj-vscode bbj-intellij java-interop .github` and `git status --porcelain` over `INVENTORY.md` and
the five closed `6N-COVERAGE.md` files.

### Downstream inheritance table
**Source:** `.planning/reviews/65-COVERAGE.md:1836-1838+` (`| Phase | Inherits from Phase 65 |` table).
**Apply to:** `66-COVERAGE.md`'s close-out, one row each for Phase 67, 68, 69.

## No Analog Found

None — all three files (66-COVERAGE.md, REQUIREMENTS.md edit, PROJECT.md edit) have strong,
directly-cited in-repo analogs.

## Read-only evidence anchors (not modification targets)

These `bbj-vscode/` and `bbj-intellij/` paths are cited as `location:`/evidence in finding records
but are **never edited** by this phase (D-01):
- `bbj-vscode/src/language/bbj-scope.ts:308-331`, `:199-213`
- `bbj-vscode/src/language/bbj-scope-local.ts:106-114`
- `bbj-vscode/src/language/bbj-index-manager.ts:14-27`
- `bbj-vscode/src/language/bbj-linker.ts:47-58`
- `bbj-vscode/src/language/bbj-completion-provider.ts`
- `bbj-vscode/test/parser.test.ts:530,811,860`
- `bbj-vscode/test/completion-test.test.ts:185`
- `bbj-intellij/build.gradle.kts:12-13,27`
- the 11 LSP4IJ-referencing files under `bbj-intellij/src/main/java` (enumerated in CONTEXT.md canonical refs)

## Metadata

**Analog search scope:** `.planning/reviews/*.md`, `.planning/REQUIREMENTS.md`, `.planning/PROJECT.md`
**Files scanned:** `INVENTORY.md`, `61-COVERAGE.md` (referenced, not deep-read), `63-COVERAGE.md`,
`64-COVERAGE.md` (referenced), `65-COVERAGE.md`, `REQUIREMENTS.md`, `PROJECT.md`
**Pattern extraction date:** 2026-08-19
