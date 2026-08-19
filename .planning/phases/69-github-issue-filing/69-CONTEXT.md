# Phase 69: GitHub Issue Filing - Context

**Gathered:** 2026-08-19
**Status:** Ready for planning
**Mode:** interactive `discuss` — the user selected all eight gray areas and answered each. Where an
answer is recorded as Claude's discretion it says so explicitly and is **correctable**: the planner
follows it unless the user says otherwise.

<domain>
## Phase Boundary

This phase **writes to the GitHub tracker and to one planning file, and does nothing else.** It is
the only phase in v4.0 permitted to mutate the tracker (Phase 66 D-02, Phase 68 D-12), and that
permission opens only after the user has explicitly approved a drafted list (ISSUE-01).

It delivers:

1. **A drafted, reviewable filing list** (ISSUE-01) — every issue body and every advisory body,
   rendered in full, committed, and approved before a single tracker write happens.
2. **135 public GitHub issues** (ISSUE-02, ISSUE-03) — self-contained, each carrying an area label,
   a `PRIO 1|2|3` label and an effort `2|4|8` label from the repository's existing label set.
3. **9 private draft security advisories** (D-02) — the D1-primary `critical`/`high` records, kept
   off the public tracker.
4. **A dedup pass against the live tracker** (ISSUE-04) — open *and* closed, run immediately before
   filing, not against the frozen snapshot alone.
5. **144 filled `issue:` slots in `MAJOR-REFACTORS.md`** (ISSUE-05) — every documented finding
   traceable to exactly one tracker entry.

### The corpus, measured

Derived live at context-gathering time from `.planning/reviews/MAJOR-REFACTORS.md` by parsing the
144 record blocks in `## Records`:

| Cut | Distribution |
|---|---|
| Records | **144**, and **all 144 `issue:` slots are empty** — nothing has been filed |
| Severity | 1 `critical`, 16 `high`, 70 `medium`, 57 `low` |
| PRIO (from `proposed_labels:`) | 17 × `PRIO 1`, 70 × `PRIO 2`, 57 × `PRIO 3` |
| Area (from `proposed_labels:`) | `vscode` 53, `intellij` 53, `BBj integration and infrastructure` 16, `dependencies` 11, `javascript` 9, `documentation` 2 |
| `dedup:` | **133 read `none`**; **11 carry a real annotation** (`#485`, `#486`, `#466`, `#231`, `#65` ×2, `#475`, `DEBT-02` ×2, `DEBT-05`, and one `supersedes`) |
| D1 involvement | **33 D1-primary** (1 `critical`, 8 `high`, 14 `medium`, 10 `low`) plus **11 more carrying D1 as a secondary dimension** |

**Every one of the 144 `proposed_labels:` values matches the exact shape
`area=<X>; PRIO <1\|2\|3>; effort <2\|4\|8>`** — verified mechanically across all 144 blocks. The
label triad is therefore extractable without judgement. See D-09 for why this matters and why
`effort:` must not be used as the label source.

### The tracker, measured

`gh issue list --state open --limit 50` at context-gathering time returns **19 open issues**, not the
frozen 15. Four were opened mid-milestone: **#497** (java-interop LRU eviction), **#498** (completion
`activeCancelToken` singleton), **#499** (formatter in-flight promise), **#500** (decompile `.lst`
freshness gate). Grepped against the corpus — **none of the 144 records matches any of the four.**
That is the expected result, not a licence to skip the re-query (D-06).

Environment confirmed live: `gh` 2.96.0, authenticated as `StephanWald`, scopes `gist`/`read:org`/
`repo`/`workflow`; `admin: true` on `BBx-Kitchen/bbj-language-server`; the repository is **public**;
`GET /repos/.../security-advisories` returns `0` (reachable, none existing); there is **no
`SECURITY.md`** and **no `.github/ISSUE_TEMPLATE/`**.

### What this phase does NOT do

- **No source change.** Phase 67 was the only apply phase (Phase 66 D-01, Phase 67 D-01).
- **No re-triage.** `INVENTORY.md` §3c routed every record and Phase 68 transcribed the verdict.
  This phase lifts `proposed_approach:`, `failure_scenario:` and `proposed_labels:` as written; it
  does not revise a classification, a severity, an effort or a label.
- **No new finding.** The denominator is 144. If drafting surfaces something the sweeps missed, it
  is a discrepancy in the phase close-out, not a 145th issue.
- **No write to `INVENTORY.md` or any `6N-COVERAGE.md`.** Immutable (Phase 60 D-09, Phase 67).
- **No write to `EASY-FIXES.md`.** Its 77 rows are closed; only `MAJOR-REFACTORS.md`'s `issue:`
  slots are touched.
- **No implementation of any refactor.** `FUT-04`, out of scope for this milestone.
- **No `SECURITY.md`, no new labels, no issue template, no milestone or project-board creation.**

</domain>

<decisions>
## Implementation Decisions

Decision IDs are **phase-local** (`D-01`..`D-16`). Phase 60–68's `D-nn` IDs are separate namespaces;
where one is meant it is written as "Phase 6N D-nn".

### The Split: Public Issues vs Private Advisories

- **D-01: The corpus splits 135 public issues + 9 private draft security advisories.** The
  repository is public and 33 records are D1-primary, of which nine are `critical` or `high` and
  describe unfixed, exploitable-today paths. The user's decision is that those nine do not go on the
  public tracker.

  The nine, in `## Index` order:

  | # | id | severity | location |
  |---|---|---|---|
  | 1 | `P62-D1-003` | critical | `bbj-vscode/src/Commands/Commands.cjs:263,325-328` |
  | 2 | `P64-D1-004` | high | `.github/workflows/preview.yml:96-102` |
  | 5 | `P61-D1-003` | high | `bbj-vscode/src/language/bbj-cpl-service.ts:82-155,228-235` |
  | 6 | `P63-D1-007` | high | `bbj-intellij/.../lsp/BbjLanguageServer.java:32` |
  | 7 | `P64-D1-006` | high | `bbj-intellij/gradle/wrapper/gradle-wrapper.properties:3-5` |
  | 11 | `P63-D1-001` | high | `bbj-intellij/.../BbjNodeDownloader.java:34-35` |
  | 12 | `P63-D1-003` | high | `bbj-intellij/.../actions/BbjEMLoginAction.java:103` |
  | 14 | `P64-D1-002` | high | `bbj-vscode/tools/em-login.bbj:10-13,41-43` |
  | 15 | `P64-D1-003` | high | `bbj-vscode/tools/formatter/BBjCFCli.jar` |

  Created as **draft** advisories via `gh api /repos/BBx-Kitchen/bbj-language-server/security-advisories`
  (admin confirmed, endpoint confirmed reachable). Draft advisories are private and deletable.

  — **Reversibility:** reversible for the advisories themselves (a draft advisory can be deleted);
  **one-way** for anything filed publicly — see D-03.

- **D-02: The line is drawn at D1-primary `critical`/`high`, and the rule is stated mechanically.**
  "No D1-primary `critical` or `high` record is filed publicly." The four `high` dependency findings
  — `P64-D6-002`, `P64-D6-006`, `P64-D6-007`, `P64-D6-008`, two of which carry D1 as a *secondary*
  dimension — **stay public**, because they concern already-published CVEs in third-party packages;
  privatizing our tracking of a public CVE protects nothing and makes it harder to fix.

  *(Claude's discretion — the user deferred this boundary. Correctable.)*

- **D-03: The 24 `medium`/`low` D1 records file exactly like every other record, but are grouped in
  the approval draft.** No difference in body template, labels, order, or batch. The draft groups
  all 33 D1 records under one heading so the security surface is visible as a single block at the
  moment of approval — the one decision the user actually has to make about them.

- **D-04: Filing publicly is treated as one-way and the plan says so.** A GitHub issue on a public
  repository is indexed, emailed to watchers, and mirrored by third parties within minutes. Closing
  or deleting it afterwards does not retract it. Every gate in this phase exists because of that
  asymmetry, and no step may be reordered to file before approving.

  — **Reversibility:** **one-way** — public issue creation on a public repository cannot be undone;
  deletion removes the page, not the notification, the index entry, or any mirror.

### The Approval Gate (ISSUE-01)

- **D-05: The approval artifact is one committed `69-ISSUE-DRAFT.md` holding every rendered body,
  and the filing consumes that file rather than re-rendering.** All 135 issue bodies and all 9
  advisory bodies appear in full, in filing order, with their titles and labels. The user reads and
  may edit it in place; approval is given against that file; the filing step then reads the approved
  file as its source.

  The point of "consumes rather than re-renders" is that **approval and execution cannot diverge**.
  A second render from `MAJOR-REFACTORS.md` could differ from what was read — a template fix, a
  stray whitespace normalisation — and ISSUE-01's guarantee would be about a document nobody filed.

  The draft is committed before approval so the diff is reviewable and the approved state is
  recoverable. **Committing the draft is not filing** — it writes nothing to the tracker.

  — **Reversibility:** reversible — a planning file until the moment it is executed against.

- **D-06: One gate covers both issues and advisories.** A single approval releases the whole run.
  Draft advisories are private and deletable, so a separate gate for them would double the review
  burden on a corpus the user reads in one sitting without buying proportional control.

  *(Claude's discretion — correctable.)*

### Dedup (ISSUE-04)

- **D-07: The pre-filing re-query covers open AND closed issues, and any hit halts for the user.**
  `INVENTORY.md` §"Frozen Open-Issue Snapshot" explicitly promises that "Phase 69 re-queries the
  tracker immediately before filing, catching anything opened mid-milestone" — this discharges that
  promise and widens it.

  Closed issues are included because Phase 67 applied 70 fixes and the sweeps ran across three days;
  a finding somebody else already fixed and closed would otherwise be filed as stale, and the
  milestone's own dedup criterion would be met only against a subset of reality.

  **On a hit the run stops and surfaces the candidate to the user.** It is not auto-skipped (which
  would silently drop a finding from the 144 denominator) and not auto-filed with a cross-reference
  (which would hand the user dedup cleanup after the fact, on a public tracker). The single-approval
  posture is the reason: an unanticipated overlap is exactly the kind of thing the approval gate
  exists to route to a human.

- **D-08: The 11 `dedup:`-annotated records are filed with their annotation carried into the body,
  not skipped.** Every one is `partial-overlap` or `supersedes` — none is a plain duplicate. Phase 68
  established that **no finding anywhere in the corpus was dropped as a duplicate** (`## Other
  Dispositions` §`duplicate` = 0). The annotation names what the finding adds beyond the existing
  issue, and that text goes into the issue body so a triager reading the tracker sees the
  relationship without opening a review document.

### Issue Content (ISSUE-02, ISSUE-03)

- **D-09: Labels come from `proposed_labels:` and never from `effort:` or `severity:`.** All 144
  `proposed_labels:` values match `area=<X>; PRIO <N>; effort <N>` exactly, so the triad parses
  mechanically. **Three records — `P63-D3-005`, `P66-D2-002`, `P66-D4-001` — carry prose-laden
  `effort:` fields** (a rounding annotation, a cross-repo-scope note, a no-departure note) that are
  not valid label values; their `proposed_labels:` are already clean (`effort 2`, `effort 8`,
  `effort 4`). Reading the label from `effort:` would produce three malformed `gh` calls.

  **Every label needed already exists in the repository.** Verified against `gh label list`:
  `vscode`, `intellij`, `dependencies`, `javascript`, `documentation`,
  `BBj integration and infrastructure`, `PRIO 1`, `PRIO 2`, `PRIO 3`, `2`, `4`, `8`. **Nothing is
  created**, which is what ISSUE-03's "from the repository's existing label set" requires.

- **D-10: Titles are `<area>: <problem>`; the finding ID lives in the body.** For example
  `vscode: bbjcpl binary path from workspace-settable bbj.home is spawned without validation`. This
  matches the shape of #497–#500 — the four issues opened mid-milestone — so the tracker stays
  internally consistent, and an outside reader is not confronted with 135 titles prefixed by an
  internal review ID that means nothing to them.

- **D-11: Bodies are fully self-contained with no link into `.planning/`.** Problem statement,
  `file:line` evidence, verified failure scenario, proposed approach, acceptance criteria — all
  inline. `failure_scenario:` and `proposed_approach:` are lifted **verbatim**, which is precisely
  what Phase 68 D-09 wrote them to support; paraphrasing them would defeat that design. The finding
  ID appears as one body line for traceability. No pointer to `MAJOR-REFACTORS.md`, whose path is
  branch-scoped today and will move when `v4.0-stability-and-quality` merges to `main`.

- **D-12: Acceptance criteria are derived per issue from `proposed_approach:` + `failure_scenario:`,
  because the corpus has no such field.** ISSUE-02 names five body elements; four map to existing
  fields (`location:` → evidence, `failure_scenario:`, `proposed_approach:`, plus the problem
  statement). **Acceptance criteria is the one element with no source field**, and inventing it is
  the only authoring judgement this phase makes.

  The derivation rule, so it is uniform across 144 issues and not re-invented per record: **state
  the observable condition under which `failure_scenario:` no longer occurs, plus whatever
  regression coverage `proposed_approach:` implies.** It restates the finding's own two fields as a
  testable end state — it does not add scope, propose a design, or commit to an implementation.

  *(Claude's discretion — the derivation rule is Claude's; correctable.)*

### Execution

- **D-13: Filing runs inline via `gh`, staged as 17-then-127, with a run ledger.** The user chose
  inline `gh` calls over a committed script. Wave 1 is the 17 `critical`/`high` records — 9 draft
  advisories plus 8 public issues — then **stop**, so a body-template error is caught after 17
  entries rather than replicated 144 times. The user eyeballs the tracker; the run then releases the
  remaining 127.

  **The pause is a checkpoint inside the approved run, not a second approval gate.** ISSUE-01 is
  discharged once, at D-05.

- **D-14: Inline filing has no built-in idempotency, so the ledger and a title-match resume check
  are load-bearing, not optional.** This is the one cost of choosing inline over a script, and it is
  recorded rather than glossed: a context reset, a crash, or a rate-limit rejection mid-run can
  otherwise double-file into a public tracker — the single most painful failure mode this phase has
  (D-04).

  Two mechanisms, both mandatory:
  1. **`69-FILING-LEDGER.md`** — one row per created entry (`finding_id`, issue number or GHSA ID,
     timestamp), appended **immediately after each create, before the next one is attempted**. It is
     the crash-safe record and the source for the D-16 write-back.
  2. **Resume check** — before creating anything, re-read the ledger *and* re-query the tracker,
     matching on the deterministic D-10 title. A finding present in either is skipped. Because
     titles are derived deterministically from the approved draft, this check is reliable even if
     the ledger itself was lost.

  Pacing: a short delay between creates to stay clear of GitHub's content-creation secondary rate
  limits. 135 creates is well inside the hourly allowance but can trip the per-minute one.

  *(Claude's discretion — the specific mechanisms are Claude's; the requirement that inline filing
  be resumable is not. Correctable.)*

### Traceability (ISSUE-05) and Requirement Honesty

- **D-15: A GHSA ID goes into the same `issue:` slot for the nine advisory records.** Written as
  e.g. `GHSA-xxxx-xxxx-xxxx (draft advisory)`. No new field is added, so Phase 68's frozen field set
  is not reopened and `derive-review-docs.mjs` — which would not emit an unknown field — stays
  consistent with the document. Every one of the 144 records still resolves to exactly one tracker
  entry, which is what ISSUE-05 is for.

  *(Claude's discretion — correctable.)*

- **D-16: The write-back happens once at the end, from the ledger, in a single commit.** The ledger
  is already the crash-safe record (D-14), so the document write-back does not need to be
  incremental; 144 separate edits to a 578 KB file would produce an unreadable history for no
  additional safety. If the write-back itself fails it is re-runnable from the ledger.

  **The regeneration hazard is respected, not worked around.** Phase 68's close-out records that
  `derive-review-docs.mjs` overwrites `MAJOR-REFACTORS.md` wholesale with always-empty `issue:`
  fields and refuses to emit when any `issue:` is non-empty unless `--force` is passed. This phase
  **does not run the script at all** and does not pass `--force`. The write-back is a targeted edit
  of 144 `issue:` lines, nothing else.

  — **Reversibility:** **costly** — once written, `MAJOR-REFACTORS.md` can no longer be regenerated
  from its own derivation script without manually preserving all 144 values first. This is the
  hazard Phase 68 D-09 rated `costly` in advance; this phase is the event it was predicting.

- **D-17: Requirement gaps for the nine advisories are stated as a written carve-out in the
  close-out; `REQUIREMENTS.md` text is not edited.** GitHub advisories carry no labels, so ISSUE-03's
  triad cannot be applied to them; severity and effort are recorded in the advisory body and remain
  in `MAJOR-REFACTORS.md`. The close-out names the requirement, names the nine records, and states
  what is and is not true of them.

  This follows the honesty pattern this project already uses — Phase 66 D-02, Phase 67 D-07/D-14,
  Phase 68 D-08/D-11: say what is true at phase end, name the shortfall and its cause, never restate
  a requirement's wording as if it had been met, and never reword a requirement after the fact.

  *(Claude's discretion — correctable.)*

### Claude's Discretion

Recorded so planning is not blocked. All are **correctable** — follow them unless the user says
otherwise.

- **The advisory boundary (D-02), the single gate (D-06), the acceptance-criteria derivation rule
  (D-12), the resume mechanisms (D-14), the GHSA-in-`issue:` convention (D-15), and the carve-out
  form (D-17).** Each is marked at its own decision above.

- **Plan and wave grouping.** Plan 1: render `69-ISSUE-DRAFT.md` (all 144 bodies + labels + titles)
  and run the D-07 dedup re-query, recording its result in the draft — no tracker writes. Plan 2:
  the ISSUE-01 approval checkpoint. Plan 3: wave 1 filing (9 advisories + 8 issues) and the pause.
  Plan 4: wave 2 filing (127 issues). Plan 5: the D-16 write-back, the D-17 close-out, and the
  write-boundary check. Rendering 144 bodies is the largest job and may warrant splitting by
  originating phase, as Phase 68 split its 144 record blocks.

- **Commit message shape** stays `<type>(<scope>): <what changed>` with `docs(69):` for this phase's
  commits, matching Phase 68's `docs(68):` convention.

- **A write-boundary check at phase close**, mirroring Phase 68 D-12: `git status --porcelain
  .planning/reviews/` should show exactly one modified file — `MAJOR-REFACTORS.md` — and nothing
  under `bbj-vscode/`, `bbj-intellij/`, `java-interop/`, `documentation/` or `examples/`. Cheap,
  checkable, and recorded in the close-out.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The input — the only document this phase files from

- `.planning/reviews/MAJOR-REFACTORS.md` — **the entire input.** 144 record blocks in `## Records`,
  each with `id:`, `location:`, `dimension:`, `severity:`, `evidence:`, `failure_scenario:`,
  `effort:`, `dedup:`, `proposed_approach:`, `proposed_labels:` and an **empty `issue:` slot**.
- `.planning/reviews/MAJOR-REFACTORS.md` §"Index (severity-sorted, for Phase 69 filing order)" —
  **the filing order.** 144 rows sorted severity → PRIO → effort. Rows 1–17 are the wave-1 cut
  (D-13); of those, nine route to advisories (D-01) and eight file publicly (D-02).
- `.planning/reviews/MAJOR-REFACTORS.md` §"Close-out" §"Phase 69 handoff" — states field by field
  what each of ISSUE-02/03/04/05 reads from this document. Read before drafting any body.
- `.planning/reviews/MAJOR-REFACTORS.md` §"Close-out" §"Regeneration hazard" — **why
  `derive-review-docs.mjs` must not be run by this phase and `--force` must not be passed** (D-16).
- `.planning/reviews/MAJOR-REFACTORS.md` §"Other Dispositions" §"duplicate" — establishes that the
  `duplicate` count across the whole corpus is **0**, which is why D-08 files the 11 annotated
  records rather than skipping them.

### The dedup baseline

- `.planning/reviews/INVENTORY.md` §"Frozen Open-Issue Snapshot" — the 15 issues open at milestone
  start, with titles, labels and one-line summaries. **Contains the explicit promise that "Phase 69
  re-queries the tracker immediately before filing"** — D-07 discharges it.
- `.planning/reviews/INVENTORY.md` §3d "Severity and effort scales" — the `{2,4,8}` effort scale and
  the `severity` → `PRIO 1|2|3` mapping that every `proposed_labels:` value was built from. Read to
  verify a label, never to re-derive one (D-09).

### Records carrying instructions addressed to this phase by name

- `.planning/reviews/64-COVERAGE.md:1747` §"Cross-unit referrals" entry 4 — **addressed to "Phase 69
  (issue drafting), gated on ISSUE-01 and bounded by D-16"**. `P64-D1-004`'s `evidence:` is
  deliberately redacted under Phase 64's two-tier rule; whoever drafts its body must carry the same
  limits — surface, problem class and impact only — and **must not reconstruct the omitted detail
  from the surrounding `### SEC-07 Workflow Security Posture` cells**, which describe the same steps
  at the same abstraction for a different purpose. `P64-D1-005` is `medium` and carries no such
  limit. (`P64-D1-004` routes to a private advisory under D-01, which lowers but does not remove the
  pressure — honour the record's own instruction either way.)
- `.planning/reviews/64-COVERAGE.md:3378` §"Cross-unit referrals" entry 3 — the `brace-expansion`
  reachability question is **"attached to `P64-D6-008` and carried into Phase 69's issue draft rather
  than answered here"**. Whether a workspace-controlled glob reaches the vulnerable copy inlined in
  `out/extension.cjs` is unresolved; `P64-D6-008`'s issue body must state the open question rather
  than drop it or assert an answer. `P64-D6-008` files **publicly** under D-02.

### Phase boundaries this phase must respect

- `.planning/phases/66-known-debt-re-triage/66-CONTEXT.md` §D-02 — zero tracker writes before this
  phase's ISSUE-01 approval gate. This phase is the one that opens it.
- `.planning/phases/68-deliverable-documents/68-CONTEXT.md` §D-09 — why the `issue:` slot exists and
  why the field set was frozen before this phase ran (the basis for D-15).
- `.planning/phases/68-deliverable-documents/68-CONTEXT.md` §D-12 — the write-boundary discipline
  this phase mirrors in its own close-out.
- `.planning/phases/67-apply-easy-fixes/67-APPLY-SET.md` — the 77 easy-fix rows. **Read-only, and
  not a source for any issue**; consult only to confirm a finding was already fixed if the D-07
  dedup pass raises the question.

### Requirements

- `.planning/REQUIREMENTS.md` lines 80–84 — `ISSUE-01`..`ISSUE-05`, and lines 155–159, the coverage
  matrix rows this phase moves from `Pending`. **No requirement text is edited by this phase**
  (D-17).

### Repository facts verified at context-gathering time

- `gh label list` — the existing label set. All twelve labels this phase applies already exist;
  **nothing is created** (D-09).
- `.github/` — contains `dependabot.yml` and `workflows/` only. **No `ISSUE_TEMPLATE/`**, so issue
  bodies follow no repository template and D-11's structure is the whole contract.
- `CLAUDE.md` (repo root) — build/test commands and architecture. Orientation only; this phase
  changes no code and runs no build.

</canonical_refs>

<code_context>
## Existing Code Insights

This phase writes GitHub issues and edits one Markdown file. It touches no application source, runs
no build, and executes no test. The "reusable assets" are planning artifacts and CLI facts.

### Reusable assets

- **`MAJOR-REFACTORS.md`'s record blocks are already issue-shaped.** Phase 68 D-09 wrote
  `failure_scenario:` and `proposed_approach:` explicitly so each would stand alone in a GitHub issue
  body without the review documents open. Drafting is **transcription plus one derived field**
  (D-12), not authoring.
- **`proposed_labels:` is machine-parseable across all 144 records** — verified, exact shape,
  zero exceptions. `gh issue create --label` arguments come straight out of it.
- **`## Index`'s severity ordering is the filing order**, already computed. No sort is needed and
  none should be re-derived.
- **`67-APPLY-SET.md` and `derive-apply-set.mjs`** demonstrate the ledger pattern this phase reuses
  in `69-FILING-LEDGER.md` (D-14) — a row appended per unit of work, so completeness is provable
  against the corpus rather than by summing plans.

### Established patterns

- **The single-approval-gate pattern.** Phase 66 D-02 froze tracker writes for the whole milestone
  precisely so this phase could open them once, deliberately, behind a human decision. Any plan step
  that writes to the tracker before the D-05 approval violates the milestone's central constraint.
- **The derived-denominator pattern** (Phases 65–68): state the selection rule, state the count,
  argue every exclusion in writing, let a reader re-run it. This phase's denominator is
  144 = 135 public + 9 advisories, and the close-out shows that arithmetic.
- **The honesty pattern for partially-met requirements** (Phase 66 D-02, Phase 67 D-07/D-14,
  Phase 68 D-08/D-11) — the basis for D-17.
- **Phase-local decision IDs.** `D-nn` is namespaced per phase; cross-phase references are written
  "Phase 6N D-nn".
- **`.planning/` files are the only write target in v4.0**, Phase 67 excepted. This phase extends
  that to the GitHub tracker — the second and last deliberate exception, and only after approval.

### Integration points

- **`MAJOR-REFACTORS.md` ← this phase (write).** The 144 `issue:` slots, one commit, at the end
  (D-16). The only file in the tree this phase modifies.
- **The GitHub tracker ← this phase (write).** 135 issues + 9 draft advisories. `gh issue create`
  and `gh api .../security-advisories`. Verified reachable and authorised.
- **The GitHub tracker → this phase (read).** The D-07 dedup re-query, open and closed, before any
  write. Reading the tracker was always permitted, including during Phase 68.

### Environment facts that will otherwise be misdiagnosed

- **`gh` is authenticated as `StephanWald` with `admin: true`** on the repository, and the
  `security-advisories` endpoint returns `0` — so both D-01 routes are live. Advisory creation needs
  admin; this token has it.
- **The repository is public and `.planning/` is tracked (647 files) on a branch that is already
  pushed to `origin`.** The review evidence is therefore already publicly readable. This is context
  for D-01, **not** an argument against it — an issue is far more visible and searchable than a file
  in a planning directory, and the user's decision stands.
- **`bc` is not installed** on this machine — arithmetic in shell steps must use `node -e`, `awk`, or
  shell built-ins. This bit Phase 68's count derivation.
- **No JDK 17** (only Temurin 25.0.3) and **java-interop on port 5008 is unreachable**, causing 11
  deterministic `npm test` failures. Neither blocks this phase — it runs no build and no test — but
  do not treat either as a new problem discovered here.

</code_context>

<specifics>
## Specific Ideas

- **`P66-D4-001` says it `supersedes P63-D4-010`, and both are among the 144.** Filing both as-is
  would put two issues on the tracker for one item. This is a **routing question the plan must
  settle explicitly before drafting** — not a re-triage (which D-domain forbids), but a decision
  about how a `supersedes` relationship is expressed in two issue bodies, or whether the superseded
  record's `issue:` slot points at the superseding record's issue number. Whatever is chosen, it is
  recorded; silently filing two issues, or silently filing one, are both wrong.

- **Three records carry prose inside `effort:`** — `P63-D3-005`, `P66-D2-002`, `P66-D4-001`. Their
  `proposed_labels:` are clean. Read labels only from `proposed_labels:` (D-09).

- **#497–#500 were opened mid-milestone and match nothing in the corpus.** Verified by grep at
  context-gathering time. Record the check in the draft's dedup section so the D-07 re-query has a
  stated baseline rather than starting cold.

- **`P64-D1-004`'s redaction instruction comes from the record's own referral**, not from this
  discussion. Honour the record's wording rather than re-arguing the redaction — the same discipline
  Phase 68 `<specifics>` applied to `P64-D6-012`.

- **Two records are `area=documentation`.** The `documentation` label exists in the repository's set
  (`Improvements or additions to documentation`). No special handling; noted so nobody treats it as
  a missing label.

- **Wave 1 is 17 records but only 8 public issues.** The pause after wave 1 gives the user eight
  issue bodies plus nine advisory drafts to sanity-check the template against. If the template is
  wrong, it is wrong on 17 entries, not 144.

</specifics>

<deferred>
## Deferred Ideas

- **Adding a `SECURITY.md` and a private vulnerability-reporting channel** — the repository has
  neither, and D-01's advisory route makes the gap visible. A repository source change; belongs in
  its own phase or the backlog. Explicitly excluded from this phase's write boundary.
- **Creating a `v4.0-review` batch label** so the 144 entries are findable and bulk-manageable as a
  set. The user chose the ISSUE-03 triad only. Worth revisiting once the tracker holds 154 open
  issues.
- **Adding `bug`/`enhancement` type labels per issue** — would require 144 per-finding judgement
  calls the corpus carries no field for, and re-triage is barred. Deferred.
- **Assigning the filed issues to a GitHub milestone or project board** — not required by any
  ISSUE-0n requirement; a tracker-organisation decision for after the filing lands.
- **A committed filing script with built-in idempotency** — the user chose inline `gh` calls. If the
  inline run proves fragile in practice, the script is the fallback, and D-14's ledger is already
  the state it would need.
- **Implementing any of the 144 major refactors** — `FUT-04`, each in its own milestone or PR. The
  explicit milestone intent is detailed issues for separate resolution.
- **Settling the 24 not-reproducible claims and the 5 open-gap referrals** Phase 68 recorded — each
  needs a runtime measurement, a BBj interpreter, or repository-settings access. Recording them was
  Phase 68's job; settling them is not this milestone's. The one exception is the `P64-D6-008`
  reachability question, which is carried into that issue's body as an open question (see
  `<canonical_refs>`).
- **Provisioning a JDK 17** so the nine review-verified-only IntelliJ fixes can be compiled and
  tested. Environment provisioning; would close the largest gap the Phase 68 coverage preamble
  declares.

</deferred>

---

*Phase: 69-github-issue-filing*
*Context gathered: 2026-08-19*
