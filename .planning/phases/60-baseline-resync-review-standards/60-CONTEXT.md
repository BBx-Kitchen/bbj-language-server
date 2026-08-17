# Phase 60: Baseline Resync & Review Standards - Context

**Gathered:** 2026-08-17
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers **three planning artifacts and no production code changes**:

1. A resynced `.planning/PROJECT.md` whose Validated list, Context, Constraints, and Key Decisions
   reflect everything shipped in the drift window, not the state as of v3.9.
2. A `.planning/MILESTONES.md` entry covering the untracked v3.9 → 0.12.0 interval.
3. `.planning/reviews/INVENTORY.md` — the module inventory, dimension assignment, finding standard,
   and frozen issue snapshot that Phases 61-69 are contractually bound to.

No source file under `bbj-vscode/`, `bbj-intellij/`, `java-interop/`, or `.github/` is modified by
this phase. The only non-`.planning/` edits permitted are staleness banners (see D-13).

</domain>

<decisions>
## Implementation Decisions

### Baseline Range & Labelling

- **D-01:** The resync baseline is pinned to the **`v0.12.0` tag**, not `HEAD`. The authoritative
  range is `2194616..v0.12.0` = **exactly 153 commits** (verified via `git rev-list --count`). The
  four commits in `v0.12.0..HEAD` are excluded from the baseline: three are v4.0 planning docs
  (`9cc746a`, `110be82`, `e8f566e`) and one is an unreleased code fix,
  `a7e1b53 fix(#494): terminate the visibility hierarchy walk on cyclic inheritance`. That fix MUST
  be called out in PROJECT.md as in-flight/unreleased so Phase 61 does not re-report it as a finding.
  Rationale: `HEAD` sits on branch `issue494-cyclic-inheritance-hang` and advances with every v4.0
  planning commit — a moving endpoint reproduces exactly the drift this phase exists to eliminate.
  — **Reversibility:** costly — the pinned range is quoted by BASE-01/BASE-04 and by the coverage
  statements Phases 61-64 and 68 inherit; changing it later invalidates every reconstructed entry's
  release attribution.

- **D-02:** Entries reconstructed into PROJECT.md's Validated list are labelled **by release tag** —
  `— 0.9.0`, `— 0.10.0`, `— 0.11.0`, `— 0.12.0` — attributed by whichever tag first contains the
  entry's commit. This deliberately breaks the existing `— vN.M` GSD-milestone convention, because
  these capabilities never went through a GSD milestone and labelling them as if they had would be
  false. Four releases fall inside the window: v0.9.0 (2026-07-17), v0.10.0 (2026-07-18),
  v0.11.0 (2026-07-18), v0.12.0 (2026-07-19).

- **D-03:** Reconstruction granularity is **one entry per user-visible capability**, in the exact
  one-line style the existing Validated list uses, with issue numbers appended inline where the
  underlying commit references one — e.g. `✓ MSGBOX composer webview with live preview (#474) — 0.10.0`.
  Expected volume ~15-25 entries. Not one entry per `#NNN` reference (fragments single capabilities
  across rows — the composers alone span #474/#483) and not one block per release (breaks the flat
  format and makes BASE-01 coverage unverifiable claim by claim).

- **D-04:** MILESTONES.md gets **one entry with a per-release breakdown table inside it**. The entry
  is titled for the drift window (`2194616` → `v0.12.0`, 153 commits), satisfying roadmap criterion
  #3 verbatim, and contains a table of the four releases with dates, commit counts, and headline
  features. Not four separate entries — three of the four releases shipped within 48 hours of each
  other and would produce thin entries that overshoot the criterion.

- **D-05:** Phase 60 records a **full test/build baseline snapshot** into INVENTORY.md: the 4 failing
  test files, all 11 failing tests, all 79 skipped tests, `npm run lint` state, and
  `bbj-intellij/./gradlew build` state. Measured 2026-08-17: `4 test files failed | 46 passed (50)`,
  `11 failed | 796 passed | 79 skipped (886)`. For contrast MILESTONES.md records v3.9 as
  *511 passed, 4 skipped, 0 failures* — so the drift window added ~375 tests, 11 failures, and took
  skips from **4 → 79**.

- **D-06:** The 11 failures and the 4→79 skip jump are **routed into Phases 61-64 as pre-identified
  findings** (D5 test-coverage, D2 correctness), triaged alongside everything else rather than
  accepted as a known-failing allowlist. This is what makes FIX-03 (`npm test` clean in Phase 67)
  reachable at all — today it is unsatisfiable. Note for the researcher: at least one failure is
  `test/linking.test.ts > Linking Tests > Interop related tests > Resolve nested class FQN`, failing
  on unresolved `Map`/`Entry`/`getValue` references, which may be environmental (needs a live
  java-interop peer on :5008) rather than a code defect — the snapshot must distinguish
  environment-dependent failures from genuine ones.

### Inventory Granularity

- **D-07:** The D1-D8 recording unit is **per review unit (~15-20 units), with per-file exception
  rows**. Files are grouped into coherent units (e.g. *scope & linking* = `bbj-scope.ts`,
  `bbj-scope-local.ts`, `bbj-linker.ts`); each unit carries one pass/fail per applicable dimension.
  Any file that produces a finding, or that needs a deliberate not-applicable, gets its own row.
  This yields ~160 cells rather than the ~1,040 a literal per-file × 8 grid would demand, while
  still naming every in-scope file so coverage stays auditable. Rationale: most per-file cells would
  be mechanical `n/a` (D6 dependency health and D7 cross-IDE parity are meaningless for
  `lib/labels.ts`), and D3/D4/D7 findings surface at subsystem level, not file level.
  — **Reversibility:** costly — Phases 61-65 and Phase 68's DOC-03 coverage statement are all shaped
  by this unit; changing it after any sweep runs forces those sweeps to be re-recorded.

- **D-08:** **Phase 60 pre-assigns which of D1-D8 apply to each review unit**, with a written reason
  recorded for every exclusion (e.g. *"`lib/*.bbl` builtin catalogs: D6/D7 n/a — no dependencies, no
  IDE-specific behaviour"*). Review phases may not silently skip a dimension. Rationale: pushing the
  n/a judgement into four separate phases guarantees inconsistent application, and an inconsistent
  `n/a` is indistinguishable from an overlooked dimension. DOC-03's coverage statement then derives
  mechanically from the inventory.

- **D-09:** `.planning/reviews/INVENTORY.md` is written **once, as an immutable contract**. Each
  review phase writes its own `.planning/reviews/{NN}-COVERAGE.md` filling in its slice of the grid;
  Phase 68 assembles DOC-03 from the set. No phase edits INVENTORY.md. Rationale: Phases 61, 62, 63,
  64 all depend only on Phase 60, so they may run concurrently and would collide on a shared file —
  and a mutable inventory lets a phase quietly edit the standard it is being held to.

- **D-10:** Every repository surface gets **either a phase assignment or a named exclusion with a
  reason** — nothing is left unaccounted for. Specifically resolved in this discussion:
  - `bbj-vscode/tools/formatter/BBjCFCli.jar`, `tools/formatter/lib/BBjCodeFomatter.jar`,
    `tools/formatter/lib/jcommander-1.71.jar` → **Phase 64** (D6 / SEC-08). Three vendored,
    unpinned, unscanned third-party JARs ship inside the extension; `jcommander-1.71` is notably old.
    Named nowhere in RVW-01..05 today.
  - `bbj-vscode/tools/interop-test-harness/run-tests.ts` → **Phase 64**.
  - `bbj-vscode/syntaxes/bbj.tmLanguage.json` → **Phase 62** (it is the highlighting source shared by
    both VS Code and the IntelliJ TextMate bundle, making it a genuine D7 cross-IDE parity surface).
  - `documentation/` → **D8 only** (docs-site claims contradicted by code); no editorial review —
    that is FUT-02.
  - `QA/`, `examples/`, `bbj-vscode/snippets/` → **named exclusions with stated reasons**.
  - `bbj-vscode/eslint.config.js`, `vitest.config.ts`, `esbuild.mjs`, `langium-config.json` →
    **Phase 64** with the build/CI surface.

### Finding Standard

- **D-11:** Finding IDs use the **`P{phase}-D{dimension}-{seq}`** scheme — e.g. `P61-D2-003`. Reading
  the ID in a commit message or issue title identifies the sweep and the violated dimension with no
  lookup, and Phases 61-64 can allocate IDs independently with zero collision risk (a global `F-001`
  counter cannot, since those phases may run concurrently). A finding spanning two dimensions
  declares one **primary** dimension for its ID and lists the secondary in its record.
  — **Reversibility:** one-way — IDs are embedded in FIX-01 commit messages, in EASY-FIXES.md /
  MAJOR-REFACTORS.md, and in filed GitHub issue bodies via ISSUE-05; renumbering after Phase 67
  commits or Phase 69 filings would require rewriting git history and editing live tracker issues.

- **D-12:** The RVW-06 verification bar is **tiered by severity**:
  - **D4 (maintainability) and D8 (comment/doc accuracy)** — a written trace is sufficient; the
    defect *is* the code shape or the stale text, and there is nothing to run.
  - **D1 (security), D2 (correctness), D3 (performance)** — require either a runnable reproduction,
    or a line-by-line trace naming the concrete inputs/state and the exact line where behaviour
    diverges. A bare assertion is not a finding.
  - **D5, D6, D7** — follow the tier of whatever they assert; a missing test is trace-evidenced, a
    CVE claim needs the advisory reference.
  Findings that cannot clear their tier are dropped, per RVW-06, not filed. Rationale: uniform
  trace-only lets plausible-but-wrong D1/D2 claims reach a public GitHub issue (ISSUE-02 puts the
  failure scenario in front of an external reader); uniform runnable-repro is unfollowable for a
  third of dimensions and would roughly double the cost of four sweep phases.

- **D-13:** The **easy-vs-major classification rule is defined in Phase 60**, with concrete
  measurable tests rather than guidance. Working definition to be finalised in the inventory —
  *easy* requires all of: touches ≤1 file; no public API, grammar, or LSP contract change; no new
  dependency; regression-testable with the existing harness; and the reviewer can name the exact
  edit. Anything failing any test is *major*. Rationale: this closes a real gap — Phases 67 and 68
  split on this classification but no roadmap success criterion currently defines it, so without
  this it would be discovered mid-Phase-67 across an already-inconsistent queue.

- **D-14:** RVW-07 dedup uses a **frozen snapshot plus a live re-check at filing time**. Phase 60
  snapshots all **15** currently-open GitHub issues (number, title, labels, area, one-line summary)
  into INVENTORY.md as the authoritative dedup list for every review phase — reproducible, and
  matching the "15 issues open at milestone start" wording used in four success criteria. Phase 69
  then re-queries the tracker immediately before filing, catching anything opened mid-milestone.
  Open-issue count verified as 15 via `gh issue list` on 2026-08-17.

### Correcting Stale Planning Numbers

- **D-15:** Phase 60 **amends `.planning/ROADMAP.md` and `.planning/REQUIREMENTS.md` in place**, and
  logs every correction with its evidence in INVENTORY.md. This is a deliberate mid-milestone edit to
  an approved roadmap, accepted because several Phase 61-64 success criteria quote these figures
  verbatim and are otherwise unsatisfiable — a phase verifier would fail on a document error rather
  than a real gap. Corrections established during this discussion (all verified against the tree at
  `e8f566e`):

  | Document claim | Verified reality |
  |---|---|
  | "154 commits" `2194616` → HEAD | **153** commits `2194616..v0.12.0` |
  | `src/language/` = "39 files" | **~49** hand-written: 37 top-level `.ts` + 2 `.langium` + 4 `validations/` + 6 `lib/*.ts`, plus 4 `.bbl` catalogs |
  | "All 13 webview composer files … each split across `-composer`/`-ui`/`-webview`" | **11** composer files + `setopts-catalog.ts`. SETOPTS has **no** `-composer.ts` — only `-ui` and `-webview` |
  | "the bbx-config editor" listed as a shipped subsystem | **No such editor exists.** `bbx-config` is a *language ID* registered for `config.bbx`/`config.min`; SEC-01's "bbx-config-editor markup" is `setopts-composer-webview.ts`, scoped to that language ID by `setopts-composer-ui.ts` |

  Files in `src/language/` absent from the 2026-02-01 maps and from the roadmap's enumeration:
  `bbj-code-action-provider.ts`, `bbj-inlay-hint-provider.ts`, `bbj-overload-selector.ts`,
  `bbj-use-insert.ts`, `composer-commands.ts`, `bbj-definition-provider.ts`,
  `bbj-document-symbol-provider.ts`, `logger.ts`, `validations/check-function-calls.ts`,
  `lib/fs-provider.ts`, `lib/bbj-api.ts`.
  — **Reversibility:** costly — once Phases 61-64 are planned against the corrected criteria,
  reverting the roadmap text would desynchronise their success criteria from their coverage files.

- **D-16:** The seven `.planning/codebase/*.md` maps are **marked superseded, not regenerated**. Each
  gets a dated staleness banner naming what is known-wrong, and INVENTORY.md is declared the
  authority on scope, structure, and file counts for this milestone. The maps remain readable as
  historical context. Rationale: all seven are dated 2026-02-01 — they predate `bbj-intellij/`
  entirely, still cite Langium 3.2.1 (actual: 4.1.3), and CONCERNS.md lists FIXMEs already resolved
  in v3.8, which is an active trap: a Phase 61-64 reviewer trusting it would re-report resolved debt
  as a fresh finding. Regenerating them is redundant when Phases 61-64 are about to read every one of
  those files directly. **This is the only permitted edit outside `.planning/`-owned content** and is
  additive (banner only).

- **D-17:** PROJECT.md is updated by **appending new rows and correcting only what is now false** —
  not rewritten, and not fully re-audited. The ~110-row Key Decisions table gains rows reconstructed
  from the 153-commit range (composer architecture, inlay hints, document formatter, line numbering,
  overload selection, code actions); existing rows are edited only where demonstrably wrong today.
  Known-false items to fix: Context still claims *"Test suite fully green (511 passed, 4 skipped)"*,
  and the Known-tech-debt list carries FIXMEs resolved in v3.8. The drift note itself is **retained**
  as evidence of how this milestone arose. Rationale: a full re-audit of 110 decision rows is a
  review sweep in its own right and duplicates what Phases 61-64 do against the code.

### Claude's Discretion

- Exact drawing of the ~15-20 review-unit boundaries within each module (D-07) — not discussed;
  planner and researcher decide, constrained by D-07 and D-08.
- The finding record's precise field list, severity scale, and effort units (DOC-02 requires an
  effort estimate; ISSUE-03 requires `2`/`4`/`8` effort labels — these should align).
- How DOC-04 dispositions (duplicate / wontfix / already-covered / not-reproducible) are captured at
  sweep time versus assembled in Phase 68.
- Whether INVENTORY.md carries LOC and a risk ranking per unit to order the sweeps.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone contract — authoritative, read first
- `.planning/REQUIREMENTS.md` — the 38 v4.0 requirements (BASE-01..04, RVW-01..07, SEC-01..08,
  DEBT-01..06, FIX-01..04, DOC-01..04, ISSUE-01..05), the **D1-D8 review dimensions table**
  (locked — not re-litigated in this phase), the Out of Scope table, and the traceability matrix.
  Phase 60 owns BASE-01, BASE-02, BASE-03, BASE-04, RVW-06, RVW-07.
- `.planning/ROADMAP.md` §"Phase 60: Baseline Resync & Review Standards" — the five success criteria.
  Also §Phases 61-69, whose success criteria this phase writes the standard for **and amends per D-15**.

### Artifacts this phase rewrites or creates
- `.planning/PROJECT.md` — Validated list (BASE-01, per D-02/D-03), Context / Constraints /
  Key Decisions (BASE-02, per D-17), and the ⚠ Planning-drift note dated 2026-08-17 that this phase
  resolves. Note its drift note names a "bbx-config editor" that does not exist (D-15).
- `.planning/MILESTONES.md` — needs the `2194616` → `v0.12.0` entry (BASE-04, per D-04). Its v3.9
  entry is the source of the *511 passed, 4 skipped, 0 failures* baseline referenced in D-05.
- `.planning/reviews/INVENTORY.md` — **does not yet exist**; `.planning/reviews/` is not yet created.
  This is the phase's primary deliverable (BASE-03, RVW-06, RVW-07).
- `.planning/STATE.md` — Active Constraints and Decisions sections carry the v4.0 scope locks.

### Superseded but consulted — banner these per D-16
- `.planning/codebase/STRUCTURE.md` — 2026-02-01. Directory tree, naming conventions, "where to add
  new code". Omits `bbj-intellij/` entirely; file counts wrong.
- `.planning/codebase/CONCERNS.md` — 2026-02-01. **Highest re-report risk**: lists FIXMEs resolved in
  v3.8 and cites Langium 3.2.1.
- `.planning/codebase/ARCHITECTURE.md`, `CONVENTIONS.md`, `INTEGRATIONS.md`, `STACK.md`,
  `TESTING.md` — same date, same staleness.

### Code-truth references for the inventory
- `CLAUDE.md` (repo root) — build/test commands, Langium pipeline, DI module pattern, testing
  pattern, AST type constants. Doubles as a **D8 target**: its claims are checkable against code.
- `bbj-vscode/VERBs.md` — BBj verb implementation status; relevant to D5/D8 coverage claims.
- `bbj-vscode/package.json` — `contributes` (19 commands, `bbx-config` language registration at
  lines ~43-68, `configurationDefaults`); the version field reads `0.12.0`.
- `.github/workflows/` — 6 workflows confirmed: `build.yml`, `deploy-docs.yml`, `manual-release.yml`,
  `preview.yml`, `pr-validation.yml`, `pr-vsix.yml`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Verified module counts** (measured 2026-08-17 at `e8f566e`) — the inventory can start from these
  rather than re-deriving them: `src/language/` 37 top-level `.ts` + 2 `.langium` + 4 `validations/`
  + 6 `lib/*.ts` + 4 `lib/*.bbl`; `src/` outside `language/` 19 files; `bbj-intellij/src` 61 Java
  files; 6 GitHub workflows; 3 `tools/*.bbj` scripts (+ 3 vendored JARs + 1 harness `.ts`).
- **Composer LOC**, already measured: `msgbox-composer.ts` 550, `addwindow-composer.ts` 405,
  `addchildwindow-composer.ts` 308, the four `-webview.ts` files 373/408/431/321,
  `setopts-catalog.ts` 335 — 3,560 lines total. Useful for risk-ranking the Phase 62 sweep.
- **Existing Validated-list format** in PROJECT.md is a strict one-line-per-capability convention with
  `(#issue)` and `— vN.M` suffixes; D-02/D-03 extend it rather than inventing a new shape.
- **`gh` CLI is authenticated** and working in this environment — the 15-issue snapshot (D-14) can be
  produced directly.

### Established Patterns
- `.planning/reviews/` does not exist yet — INVENTORY.md, and later EASY-FIXES.md /
  MAJOR-REFACTORS.md (DOC-01/DOC-02) and the per-phase `{NN}-COVERAGE.md` files (D-09), all land there.
- The four webview composers are **not symmetric**: msgbox/addwindow/addchildwindow follow
  `-composer` / `-ui` / `-webview`; SETOPTS has only `-ui` / `-webview` plus a shared
  `setopts-catalog.ts`. Any inventory template assuming a uniform triple is wrong (D-15).
- All four `*-composer-webview.ts` files generate HTML — they are the entire SEC-01 surface. There are
  **no** `customEditors` contributions in `package.json`, so the webview surface is exactly these four.

### Integration Points
- Phases 61, 62, 63, 64 and 66 all depend on Phase 60 alone, so they can run concurrently — this
  drove D-09 (per-phase coverage files, immutable inventory) and D-11 (collision-free IDs).
- Phase 67 consumes the easy-vs-major rule (D-13) and the finding IDs (D-11); Phase 68 consumes the
  dimension assignment (D-08) to write DOC-03; Phase 69 consumes the frozen issue snapshot (D-14).
- Current branch is `issue494-cyclic-inheritance-hang`, not `main` — the planner should confirm where
  v4.0 work lands before committing.

</code_context>

<specifics>
## Specific Ideas

- The finding ID format was specified concretely as `P61-D2-003` — phase, dimension, zero-padded
  sequence.
- The staleness banner (D-16) should *name what is known-wrong* in each map, not merely say "may be
  outdated" — the point is stopping a reviewer from re-reporting v3.8-resolved debt.
- Every D-15 correction must be logged **with its evidence** in INVENTORY.md, not silently applied —
  a reader should be able to see what the roadmap claimed and why it was changed.
- The `a7e1b53 fix(#494)` in-flight fix must be explicitly visible so Phase 61 does not report the
  cyclic-inheritance hang as a live finding.

</specifics>

<deferred>
## Deferred Ideas

- **Regenerating the seven `.planning/codebase/*.md` maps** — considered and rejected for this phase
  (D-16). If they are wanted current, that is its own task after v4.0 ships, when Phases 61-64 will
  have produced far better material than a fresh mapping pass would.
- **Editorial review of `documentation/`** — already `FUT-02`; only D8 code-accuracy checks are in
  scope (D-10).
- **`java-interop/` Java service review** — already `FUT-01` and an explicit Out-of-Scope entry; the
  TypeScript client `java-interop.ts` remains in Phase 61's scope.
- **Two gray areas raised but not explored** (user was ready for context): how the ~15-20 review-unit
  boundaries are actually drawn and whether the inventory carries LOC/risk ranking to order sweeps;
  and the exact finding record template — fields, severity scale, effort units, and how DOC-04
  dispositions are captured at sweep time. Both are recorded under Claude's Discretion above and are
  the planner's to resolve.

</deferred>

---

*Phase: 60-Baseline Resync & Review Standards*
*Context gathered: 2026-08-17*
