# Phase 65: Cross-Cutting Security Audit - Context

**Gathered:** 2026-08-18
**Status:** Ready for planning
**Mode:** `--auto` — every gray area below was auto-resolved to its recommended option. See
`65-DISCUSSION-LOG.md` for the per-question audit trail.

<domain>
## Phase Boundary

This phase delivers **one planning artifact and no production code changes**:

`.planning/reviews/65-COVERAGE.md` — an end-to-end audit of the four security concerns that
inherently span multiple modules and therefore could not be answered by any single-module review:

| Req | Concern | Owning criterion |
|---|---|---|
| SEC-01 | Webview HTML injection + CSP posture | ROADMAP criterion 1 |
| SEC-02 | Webview → extension message trust | criterion 2 |
| SEC-04 | EM token lifecycle end to end | criterion 3 |
| SEC-05 | Process-spawn argument/command injection | criterion 4 |

**Phase 65 is a synthesis phase, not a fifth sweep.** Phases 61-64 recorded **30 D1 findings**
(9 + 7 + 8 + 6) across the same code this phase re-reads. Its value is not in finding a 31st by
re-walking those files — it is in answering the four questions that require looking at *several*
modules at once, which no `RU-*` unit was scoped to do.

**No source file is modified.** Phase 66 re-triages DEBT, Phase 67 is the only phase that applies
fixes, Phase 68 assembles the deliverable documents, Phase 69 files issues (ISSUE-01 is a hard
gate there). Phase 65 does not edit `INVENTORY.md` (Phase 60 D-09, immutable) and does not reopen
`61`/`62`/`63`/`64-COVERAGE.md` — all four are closed and verified.

### The structural break from Phases 61-64

**INVENTORY defines no `RU-65-*` units.** Verified: `grep -c 'RU-65' INVENTORY.md` → `0`. There
are no grid rows, no applicability cells, no `n/a` carry-forwards, no cell gate and no file gate
for this phase. Every completeness mechanism that made Phases 61-64 mechanically verifiable is
**absent here**, and that is the single most important thing this discussion resolves.

Phases 61-64 could prove completeness because INVENTORY handed them a closed denominator. Phase 65
must **construct its own** — otherwise "audited end to end" is an assertion no reader can check,
which is exactly the failure mode the milestone's gates exist to prevent (D-01, D-02).

</domain>

<decisions>
## Implementation Decisions

Decision IDs are **phase-local** (`D-01`..`D-16` of Phase 65). Phase 60-64's `D-nn` IDs are
separate namespaces; where one is meant it is written as "Phase 6N D-nn".

### Completeness Without a Grid

- **D-01:** **The grid is replaced by four closed surface enumerations, one per requirement.**
  Each requirement gets an enumerated denominator, derived live by a recorded command, and **every
  enumerated item carries a verdict**. This is the same auditable shape as the cell grid, keyed on
  security surfaces instead of INVENTORY rows. A reader must be able to re-run the enumeration
  command, get the same denominator, and check every item against a verdict.

  — **Reversibility:** costly — the enumerations become Phase 68's evidence that SEC-01/02/04/05
  were actually discharged; changing the denominator shape later means re-deriving every verdict.

- **D-02:** **The four denominators, measured at discussion time.** The phase **re-derives** each
  one live rather than trusting these numbers; they are recorded here so a drift is visible rather
  than silently absorbed:

  | Surface | Denominator | How measured |
  |---|---|---|
  | SEC-01 | **4** webview HTML generators, plus every interpolation site within them | `grep -rln 'getHtml\|webview.html' bbj-vscode/src --include=*.ts` |
  | SEC-02 | **4** `onDidReceiveMessage` handlers, one per composer webview | `grep -rn 'onDidReceiveMessage' bbj-vscode/src --include=*.ts` |
  | SEC-04 | **4 lifecycle stages** (acquisition, storage at rest, exposure via args/logs, expiry) × **7 sites** — `extension.ts` (VS Code `SecretStorage`), `BbjEMTokenStore.java`, `BbjEMLoginAction.java`, `BbjRunBuiAction.java`, `BbjRunDwcAction.java`, `em-login.bbj`, `em-validate-token.bbj` | `grep -rl 'EMToken\|emToken\|EM_TOKEN\|em\.token'` over `bbj-vscode/src` + `bbj-intellij/src` (→ 5) **+ the 2 `.bbj` scripts** |
  | SEC-05 | see the correction below — **no single grep yields a stable denominator** | two-stage refinement, owned by `65-03` |

  **Two corrections to this table, found during planning and verified — the plans hold the
  authoritative derivations:**

  1. **SEC-04's command as first written was wrong, though its number was right.**
     `grep -rl 'EMToken\|emToken\|EM_TOKEN'` returns only the **4 IntelliJ** files;
     `bbj-vscode/src/extension.ts` matches it **zero** times, because the VS Code side uses the
     storage key `'bbj.em.token'` and none of those three tokens. (It was originally located by a
     wider grep that happened to include `em-login`.) Adding `\|em\.token` yields 5 source files,
     plus the 2 `.bbj` scripts = the **7** sites recorded above. A denominator whose stated command
     does not reproduce it is exactly the drift D-02 exists to prevent, so the corrected pattern is
     the one the phase runs.

  2. **SEC-05's "27" does not reproduce from any single grep and is demoted to a comparison
     baseline.** A naive pattern returns **18** VS Code lines of which **7** are
     `RegExp.prototype.exec` noise, plus 8 IntelliJ instantiations and 3 `.bbj` scripts. Rather
     than pick a number, `65-03` uses a **two-stage refinement with arithmetic closure**: every raw
     candidate becomes exactly one line, resolved either to a verdict or to `n/a` with a written
     exclusion reason, plus explicit `[extra]` lines so the denominator can drift **upward and be
     seen to**. The 27 is reported as a comparison with its cause, never as the gate. This is
     strictly better than a fixed count: it cannot silently exclude a spawn site, which is the one
     thing criterion 4 must not allow.

  The 4/4 symmetry on SEC-01 and SEC-02 is not a coincidence to gloss over — the same four
  composer webviews generate the HTML *and* receive the messages, which is why D-06 pairs them.

- **D-03:** **The deliverable is named `.planning/reviews/65-COVERAGE.md`** despite holding
  surfaces rather than grid rows. Phase 68's DOC-03 concatenation walks `6N-COVERAGE.md`; renaming
  it to something more literally accurate would break that walk for a cosmetic gain. The header
  states plainly that this file's completeness construct differs from its four predecessors', so
  no reader expects a cell gate and concludes one is missing.

### Synthesis Discipline — The Thing That Makes This Phase Worth Running

- **D-04:** **The 30 inherited D1 findings are inputs, and Phase 65 cross-references them by ID —
  it never re-records them.** A new `P65-*` finding is justified **only** when the cross-cutting
  view shows something no single-module review could have seen: a gap that exists *between* two
  modules, an asymmetry between the two IDEs on the same concern, or a chain in which two
  individually-acceptable behaviours compose into an unacceptable one.

  A `P65-*` finding whose evidence sits entirely inside one already-reviewed file, saying what a
  `P6{1,2,3,4}-D1-*` record already says, is a duplicate — record it as
  `disposition: duplicate` naming the owning ID, per INVENTORY's disposition vocabulary
  (line 154). This is the discipline that keeps Phase 68's `MAJOR-REFACTORS.md` from listing the
  same defect twice under two IDs.

- **D-05:** **Phase 62 already answered a large part of SEC-01, and Phase 65 verifies rather than
  rediscovers.** `62-COVERAGE.md`'s `### SEC-01/SEC-02 Surface Handoff` fact (1) concludes that
  **no editor-selection, document-text, `config.bbx`, workspace-path or catalog value reaches any
  of the four `getHtml()` strings** — i.e. no current injection path, hardening gaps only. Phase
  65's job on criterion 1 is to **test that conclusion against the whole surface** and extend it
  to the interpolation sites Phase 62 did not enumerate one by one.

  **If Phase 65 disagrees with it, the disagreement is a finding recorded here**, with the
  reproduction that settles it — not a silent correction, and not an edit to `62-COVERAGE.md`
  (closed and verified). Phase 63's experience is the precedent: a wrong security conclusion is
  worth more as a documented withdrawal than as a quiet deletion.

- **D-06:** **Three plans, mapping to the natural surface groupings rather than one-per-requirement:**

  1. `65-01` → **SEC-01 + SEC-02** — the same four composer webviews, HTML out and messages in.
     Splitting them would mean two plans reading the same four files. Also creates the skeleton.
  2. `65-02` → **SEC-04** — EM token lifecycle across both IDEs and the two `.bbj` scripts.
  3. `65-03` → **SEC-05** — every process-spawn site across both IDEs and the `.bbj` scripts,
     denominator refined live per D-02 correction 2, **plus the phase close-out**.

- **D-07:** **SEC-04 and SEC-05 overlap on exactly one thing, and ownership is assigned up front:**
  the EM token appearing as a process argument (`P63-D1-003`) is *both* a token-lifecycle exposure
  and a process-spawn concern. **`65-02` owns it** as the lifecycle question ("is the token exposed
  via process args or logs?" is criterion 3's own wording); `65-03` cross-references by ID. Without
  this the two plans would each record it and the phase would ship a duplicate.

### Recording Shape

- **D-08:** **The frozen recording shape is inherited unchanged** (Phase 61 D-05 → 62 D-03 → 63
  D-03 → 64 D-05): the fenced finding record with its required fields, the evidence tiers, the
  dedup check against the frozen 15-issue snapshot, the easy-vs-major rule. **No new format
  checkpoint** — a fifth re-approval of an unchanged shape is not worth an interruption.

  Finding IDs are **`P65-D1-nnn`** — D1 throughout, because all four requirements are security
  concerns and D1 is the security dimension. A `P65-D2-*` or similar must not appear: if a finding
  is really about correctness rather than security, it belongs to the module-owning phase, not
  here (D-04).

- **D-09:** **`effort` values must land on INVENTORY §3d's `{2,4,8}` scale.** Stated explicitly
  because Phase 63 shipped three off-scale values (`3`, `1`, `1`) that were unlabellable for
  ISSUE-03 and needed a post-hoc correction at verification time. Do not repeat it.

- **D-10:** **Phase 64's `triage:` field does NOT apply here.** That vocabulary
  (`fix-now`/`file-issue`/`accepted-with-reason`) was introduced for SEC-08's dependency triage
  and is required only on D6 dependency findings. Phase 65 findings carry `classification:`
  (`easy` | `major`) and `disposition:` only. Adding an inapplicable field would make Phase 68's
  assembly ambiguous about which findings the triage buckets cover.

### Evidence — The Governing Rule of This Phase

- **D-11:** **Do not assert a mechanism; show it, or dispose of it as not-reproducible.** This is
  the phase's most important rule and it is written from a concrete failure: Phase 63's
  `P63-D1-002` claimed `Files.copy` follows a symlink and overwrites the link's referent. It is
  false — `LinkOption.NOFOLLOW_LINKS` governs the *source* of a copy, not the target — and it
  survived an entire sweep, its own unit closure and the close-out, and was caught only at
  verification, one phase before Phase 69 would have filed it as a public vulnerability report
  against `bbj-intellij`.

  Every Phase 65 finding is a security claim in a public repository, and this file feeds Phase 69
  unmodified. So: a finding needs a reproduction or a line-by-line trace naming concrete
  inputs/state and the exact `file:line` where behaviour diverges (INVENTORY's `repro` tier). If
  confirming it would require constructing an exploit, record a **not-reproducible disposition**
  with what *is* established — Phase 63's `extractTarGz` and Phase 64's `$GITHUB_OUTPUT` surface
  are both worked precedents for doing this correctly.

- **D-12:** **Positive results are recorded explicitly, not omitted.** Criterion 1 requires CSP
  posture to be *documented* — which means a clean result must be stated as a checked-and-clean
  result, distinguishable from an unchecked one. Verified at discussion time: **all four**
  generators set a `Content-Security-Policy` meta tag with a per-render `nonce` and
  `script-src 'nonce-…'`, and all four open their panel with
  `{ enableScripts: true, retainContextWhenHidden: true }`. That symmetry is a genuine finding-free
  result and the phase says so. (Phase 64 D-12's `pull_request_target` treatment is the precedent.)

- **D-13:** **A TypeScript type annotation is not runtime validation, and the audit must not
  accept one as evidence for criterion 2.** The handlers are typed
  `async (msg: { type: string; payload?: Selection }) => …` and then `switch (msg.type)`. That
  annotation is erased at compile time; the value arriving from the webview is whatever
  `postMessage` sent. Criterion 2 asks whether each handler **validates message shape and value
  range before acting** — so the question per handler is what runtime check exists between receipt
  and the first side effect, and "it's typed" is not an answer. Where no such check exists, that
  is the finding; where the switch's own `default` branch is the de-facto guard, say so precisely.

### Disclosure

- **D-14:** **The two-tier disclosure rule is inherited (Phase 61 D-12 → 62 D-09 → 63 D-13 → 64
  D-16), and this is the most exposed phase in the milestone.** It is the security synthesis
  itself, in a public forkable repository, and its findings are the ones Phase 69 drafts into
  public issues. For any finding rated `critical` or `high`: record **surface, problem class, and
  impact**; no trigger sequence, no payload, no working procedure. Open every such redacted
  `evidence:` field with the literal marker `Disclosure-limited per D-14`. Lower severities record
  normally, with the `file:line` anchors Phase 67 needs.

  **No user checkpoint is spent re-approving this** — the rendered shape was approved at Phase 62
  D-09 and carried unchanged three times since.

  — **Reversibility:** one-way — git history retains over-disclosure permanently, and this
  repository is public.

### Scope Fences & Completion

- **D-15:** **Phase 65 fixes nothing, files nothing, re-triages nothing.** No source file is
  modified (Phase 67 applies). No GitHub issue is filed or drafted (Phase 69, gated on ISSUE-01).
  No `DEBT-*` item is re-triaged (Phase 66). `INVENTORY.md` and the four closed coverage files are
  not edited — drift found in any of them is recorded as a finding here, following Phase 64
  D-08/D-19's precedent.

- **D-16:** **Completion gates, re-derived live in `65-03`'s close-out:**

  1. **Surface gate** — all four denominators re-derived by their recorded commands, each printed
     with its literal output, and every enumerated item shown to carry a verdict. A denominator
     that drifts from D-02's table is reported as a drift with its cause, not silently adopted.
  2. **Criterion gate** — each of ROADMAP's five success criteria answered **Met / Partially Met /
     Not Met** with the section that discharges it named. Criterion 5 (every finding carries
     `file:line`, dimension, verified failure scenario, and a dedup check) is asserted with counts.
  3. **Requirement gate** — SEC-01, SEC-02, SEC-04, SEC-05 each marked complete or explicitly not,
     with the evidence named. These four are the last open `SEC-*` requirements in the milestone;
     SEC-03/06/07/08 closed inside Phases 61-64.

  The close-out also states what each downstream phase inherits (66, 67, 68, 69), following the
  inheritance-table pattern every prior sweep used.

### Claude's Discretion

Auto mode resolved every gray area. Left to the planner and executing agents:

- Task boundaries within each plan (the two-task evidence-tier split is the default).
- Whether SEC-04's lifecycle is rendered as a stage×site matrix or as a per-stage narrative,
  provided every one of the 7 sites is addressed at every one of the 4 stages.
- Ordering of the SEC-05 spawn candidates, provided every one resolves to a verdict or to an
  `n/a` with a written exclusion reason (D-02 correction 2).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone contract — read first

- `.planning/reviews/INVENTORY.md` — the Phase 60 review standard: evidence tiers, the finding
  record's required fields, the disposition vocabulary (**line 154**, incl. `duplicate` which D-04
  relies on), the finding-ID scheme, the easy-vs-major rule, the `{2,4,8}` effort scale (§3d), and
  the frozen 15-issue snapshot every finding is deduped against. **Immutable** (Phase 60 D-09);
  note it defines **no `RU-65-*` units** — see D-01.
- `.planning/ROADMAP.md` §"Phase 65: Cross-Cutting Security Audit" — the goal and 5 success criteria.
- `.planning/REQUIREMENTS.md` — SEC-01 (line 44), SEC-02 (45), SEC-04 (47), SEC-05 (48) verbatim,
  plus RVW-06 (verified failure scenario) and RVW-07 (dedup) as the standard every finding meets.

### Inherited findings — the synthesis inputs (D-04)

- `.planning/reviews/62-COVERAGE.md` — **`### SEC-01/SEC-02 Surface Handoff`** (the SEC-01 baseline
  D-05 tests) and all 7 `P62-D1-*` records: `P62-D1-001`/`002` (`msgbox-composer-webview.ts:82-119`,
  `:366-373`), `P62-D1-003` (**critical** — `Commands.cjs:263,325-328`), `P62-D1-004`
  (`extension.ts:415,420,639`), `P62-D1-005` (`addwindow-composer.ts:195-282`), `P62-D1-006`
  (`document-formatter.ts:59`), `P62-D1-007` (`decompile-io.ts:15-27,29-35`).
- `.planning/reviews/63-COVERAGE.md` — `RU-63-01`'s `P63-D1-003`/`004`/`005` as the IntelliJ half of
  the SEC-04/SEC-05 synthesis. Its close-out states **SEC-03 is closed and nothing on it flows
  here**. Also the corrected `P63-D1-002` and its `corrected_claim` field — the worked example
  behind D-11.
- `.planning/reviews/61-COVERAGE.md` — 9 `P61-D1-*` records incl. the java-interop trust boundary.
- `.planning/reviews/64-COVERAGE.md` — 6 `P64-D1-*` records incl. the `gradle-wrapper.jar` checksum
  mismatch and the workflow-credential findings; its close-out inheritance table.

### Worked precedent — the shape to copy

- `.planning/phases/64-build-ci-dependency-review/64-CONTEXT.md` — the decision-document shape.
- `.planning/reviews/64-COVERAGE.md` — the per-cell record format, a `### SEC-*` posture subsection,
  the not-reproducible disposition form, and a close-out with gates re-derived live.
- `.planning/phases/63-intellij-plugin-review/63-VERIFICATION.md` — what a verifier checks, and the
  `P63-D1-002` withdrawal that D-11 is written from.

### Code under audit

**SEC-01 + SEC-02 (`65-01`) — 4 files:** `bbj-vscode/src/msgbox-composer-webview.ts` (373),
`addwindow-composer-webview.ts` (408), `addchildwindow-composer-webview.ts` (431),
`setopts-composer-webview.ts` (321). Their UI/logic siblings (`*-composer.ts`,
`setopts-composer-ui.ts`, `setopts-catalog.ts`) are read as context.

**SEC-04 (`65-02`) — 7 sites:** `bbj-vscode/src/extension.ts` (`context.secrets` at `:473`, `:667`;
credentials helper at `:371`), `bbj-intellij/.../actions/BbjEMTokenStore.java`,
`BbjEMLoginAction.java`, `BbjRunBuiAction.java`, `BbjRunDwcAction.java`,
`bbj-vscode/tools/em-login.bbj`, `bbj-vscode/tools/em-validate-token.bbj`.

**SEC-05 (`65-03`) — denominator refined live, not fixed (D-02 correction 2):** VS Code `Commands/Commands.cjs` (5), `extension.ts` (4),
`language/bbj-cpl-service.ts` (3), `setopts-catalog.ts` (2), `msgbox-composer.ts` (2),
`document-formatter.ts` (2), `addwindow-composer.ts` (2) and the remainder; IntelliJ
`BbjRunActionBase.java` (4), `BbjNodeDetector.java` (3), `BbjRunGuiAction`/`BbjRunDwcAction`/
`BbjRunBuiAction` (3 each), `lsp/BbjLanguageServer.java` (2), `BbjEMLoginAction.java` (2); plus
`tools/web.bbj`, `em-login.bbj`, `em-validate-token.bbj`.

### Out of scope

`java-interop/` (FUT-01), `src/language/generated/` (machine-generated),
`bbj-vscode-deprecated/`, and `CLAUDE.md`/`VERBs.md`/`documentation/` (`RU-D8-01`'s surface — still
the milestone's one unrecorded row and **not** Phase 65's to close).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **The finding-record format and evidence tiers**, four times proven — nothing is being designed.
- **The frozen 15-issue snapshot** in INVENTORY is the dedup input, keeping verdicts comparable
  with all four sweeps.
- **30 D1 findings already carry `file:line` and verified failure scenarios** — the synthesis
  starts from evidence, not from a blank sweep.
- **`### SEC-03 Integrity Posture` (63) and `### SEC-07 Workflow Security Posture` (64)** are the
  structural models for this phase's four per-requirement sections.

### Established Patterns

- **Audit phases record; they never fix.** Four phases, zero source files modified.
- **Gates are re-derived live, never asserted** — D-16 keeps this with surface denominators.
- **A limitation is stated, not hidden** (Phase 63 D-07, Phase 64 D-10).
- **Positive results are recorded** so checked-and-clean is distinguishable from unchecked
  (Phase 64 D-12).
- **Cross-reference by ID rather than re-record** (Phase 62 D-14, Phase 64 D-15) — D-04 makes this
  the organising rule of the whole phase rather than an occasional courtesy.

### Verified at discussion time

| Fact | Finding |
|---|---|
| `grep -c 'RU-65' INVENTORY.md` | **0** — no units, no grid, no gate (D-01) |
| Webview HTML generators | **4** (D-02) |
| `onDidReceiveMessage` handlers | **4**, one per generator (D-02) |
| CSP + nonce across all 4 generators | **present in all 4** — symmetric, a positive result (D-12) |
| Webview panel options | all 4 use `{ enableScripts: true, retainContextWhenHidden: true }` |
| Handler signature | `(msg: { type: string; payload?: Selection })` then `switch (msg.type)` — compile-time only (D-13) |
| VS Code EM token storage | `context.secrets.store('bbj.em.token', …)` `extension.ts:667`, delete `:473` — a real VS Code half exists for criterion 3 |
| Spawn sites | **no stable single-grep denominator** — 18 raw VS Code lines (7 are `RegExp.exec` noise) + 8 IntelliJ + 3 `.bbj`; `65-03` refines in two stages with upward drift visible (D-02 correction 2) |
| Inherited D1 findings | **30** = 9 + 7 + 8 + 6 (D-04) |

### Integration Points

- **Phase 66** inherits any finding whose `dedup:` names a `DEBT-*` requirement.
- **Phase 67** inherits the `classification: easy` set. Expect it to be small: the four sweeps
  yielded 76 easy of 213, and cross-cutting findings skew structural.
- **Phase 68** concatenates this file for DOC-03 and needs D-16's criterion/requirement gates to
  write its coverage statement. Phase 64's close-out already fixed the denominator: **147 of
  INVENTORY's 148** `applies`, remainder `RU-D8-01`/D8, plus 8 cells beyond the grid — Phase 65
  adds *surfaces*, not grid cells, and must not blend into that figure.
- **Phase 69** consumes every `dedup:` verdict, gated on ISSUE-01, and is the reason D-11 and D-14
  are written as hard rules rather than preferences.

</code_context>

<specifics>
## Specific Ideas

- **The single most valuable output of this phase is probably an asymmetry, not a new defect.**
  Both IDEs implement run/compile and EM login against the same BBj tooling, and Phases 62 and 63
  reviewed them separately by construction. Where one IDE guards something the other does not is
  precisely the finding no `RU-*` unit could produce — D-04's justification for a new `P65-*` ID
  should usually read like that.

- **`P62-D1-003` is rated critical and is the milestone's highest-severity open finding**
  (unescaped `child_process.exec()` interpolation across `Commands.cjs` and `extension.ts`). It is
  already owned by Phase 62, so SEC-05's job is not to re-find it but to establish whether the
  *other 25* spawn sites share its shape — and to say so either way.

- **Criterion 3 says "and VS Code's equivalent storage", which exists.** `context.secrets` is VS
  Code's `SecretStorage` (OS keychain-backed), while IntelliJ has `BbjEMTokenStore`. Comparing
  their at-rest guarantees is a genuine cross-cutting question and is squarely criterion 3's.

- **The `.bbj` tool scripts are in SEC-04 and SEC-05 but were only lightly reached by Phase 64**,
  whose `RU-64-03` swept them for build/CI concerns. Their credential handling is this phase's.

</specifics>

<deferred>
## Deferred Ideas

- **Applying any Phase 65 finding** — Phase 67 only.
- **Filing any of it as a GitHub issue** — Phase 69, gated on ISSUE-01.
- **Re-triaging `DEBT-*` items** — Phase 66.
- **Reviewing `RU-D8-01`** (`CLAUDE.md`, `VERBs.md`, `documentation/`) — owned by no phase; still
  the milestone's one unrecorded grid row.
- **Adding runtime message-shape validation** (a schema validator at the four webview handlers) —
  a real improvement this phase will likely motivate, but a new capability. Recorded as a finding
  here, implemented in Phase 67 if `easy`, otherwise a future milestone.
- **Introducing a CSP nonce test or a webview security regression suite** — new capability, not a
  review finding.

</deferred>

---

*Phase: 65-cross-cutting-security-audit*
*Context gathered: 2026-08-18*
