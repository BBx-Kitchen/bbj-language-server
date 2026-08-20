# Debt Register: BBj Language Server

Cross-cutting debt that outlived the milestone it was created in. Items here are
**deferred by decision, not forgotten** — each is meant to be addressed in a
dedicated task rather than smuggled into unrelated work.

**Opened:** 2026-08-20
**Status:** open — awaiting a dedicated cleanup task

---

## 1. Outstanding UAT / verification items (16 items across 10 files)

All ten files live in **archived** milestones (v3.0 → v3.9), so no active phase is
blocked. `/gsd-audit-uat` surfaces them on every `/gsd-progress` run, which is why
they are recorded here instead.

| Milestone | Phase | File | Type / status | Items |
|-----------|-------|------|---------------|-------|
| v3.9 | 59 | `59-UAT.md` | uat / passed | 1× skipped_unresolved |
| v3.7 | 50 | `50-VERIFICATION.md` | verification / human_needed | 2× human_uat |
| v3.3 | 36 | `36-UAT.md` | uat / complete | 1× skipped_unresolved |
| v3.2 | 34 | `34-UAT.md` | uat / diagnosed | 2× unknown |
| v3.2 | 34 | `34-final-UAT.md` | uat / diagnosed | 1× unknown |
| v3.2 | 34 | `34-re-UAT.md` | uat / diagnosed | 1× skipped_unresolved, 1× unknown |
| v3.1 | 29 | `29-UAT.md` | uat / diagnosed | 2× unknown |
| v3.1 | 30 | `30-UAT.md` | uat / diagnosed | 1× unknown |
| v3.0 | 24 | `24-UAT.md` | uat / diagnosed | 1× unknown |
| v3.0 | 25 | `25-UAT.md` | uat / diagnosed | 1× server_blocked, 2× unknown |

Paths are under `.planning/milestones/<version>-phases/<phase-dir>/`.

**Three distinct categories, needing different treatment:**

- **`human_uat` (2 items, phase 50)** — genuinely require a human at a keyboard
  watching the Problems panel while editing a BBj file. Cannot be automated away;
  either run them or formally waive them.
- **`skipped_unresolved` (3 items)** — skipped for a *stated* reason that may now
  be stale. Two examples: phase 59's deprecated-class strikethrough was skipped
  because "classes never appear in completion lists correctly", and phase 36's
  quiet-startup check was skipped pending phase 37's logger migration. Phase 37
  shipped, so at least one of these is probably re-testable now.
- **`unknown` (10 items) + `server_blocked` (1)** — the largest group and the least
  understood. `unknown` means the audit could not classify the recorded result, so
  these need reading before they can be triaged. Do not assume they are failures;
  do not assume they are passes.

**Why it was deferred:** the items span six archived milestones and three different
resolution paths. Triaging them properly is its own task with its own judgment calls,
and doing it inline would have derailed the security work it surfaced during.

**How to address:** `/gsd-audit-uat` for the full cross-phase report, then decide
per item: retest, fix, or formally waive. The `unknown` group needs a read-through
first — classify before deciding.

---

## 2. Orphan phase directory `68-deliverable-documents` — RESOLVED 2026-08-20

Moved out of `.planning/phases/` into the local `.planning/milestones/v4.0-phases/` archive,
where it belongs as a v4.0 phase artifact. It is deliberately **untracked**: the pre-push hook
embargoes every `.planning/milestones/v4.0*` path, and that policy was respected rather than
bypassed. The file remains on disk with the rest of the embargoed v4.0 tree.

Scanned clean of advisory detail before the move (it is a pattern map describing markdown
artifact structure, not code or findings).

---

## 3. `MILESTONES.md` duplicated sections — RESOLVED 2026-08-20

The file carried two concatenated histories: a newest-first block and an oldest-first block,
overlapping on v3.3 and v3.4.

Deduplicated by comparing the copies rather than deleting blindly — they were **not** identical:
- v3.3's second copy was a strict superset (added a "What's next" line) → kept.
- v3.4's second copy was a stub whose "43 phases, 86 plans" figures were cumulative project
  totals mislabelled as that milestone's own → discarded, detailed copy kept.

Now 17 sections, one per shipped milestone, ordered newest-first. Matches the 17-milestone
total in ROADMAP.md.

---

## 4. Planning records stopped six months before the code did

Recorded for context rather than as an action item: planning tracked through v3.9
(2026-02-21), then 159 commits landed over the following six months — releases
0.9.0 through 0.12.0 — with no phase or plan artifacts. That gap is now closed by a
retroactive **v4.0 Stability & Quality** entry in `MILESTONES.md`, which is explicit
about being reconstructed from git rather than planned through GSD.

The consequence to be aware of: v4.0 has **no** REQUIREMENTS, ROADMAP, phase or plan
artifacts under `.planning/milestones/`, unlike every milestone before it. Milestone
audits and any tooling that walks `<version>-phases/` will find nothing for v4.0.
That is accurate, not a bug to fix.

---

## 5. Test-harness readiness gate false-positives on port 5008

`shouldRunBBjTests()` (`bbj-vscode/test/test-helper.ts:37-43`) falls back to a bare TCP
connect against :5008. BBjServices binds that port without speaking the interop JSON-RPC
protocol, so on any machine with BBj installed the gate reports "ready", enables the
interop-dependent tests, and 11 of them fail resolving `java.util.Map` / `Map.Entry`.

- Green under `RUN_BBJ_TESTS=0` (23 passed, 19 skipped); red on auto-detect (11 failed).
- Pre-existing: reproduced identically at `291cd23`.
- **CI is green only because CI has no BBj and skips these tests** — so CI green is not
  evidence that this interop coverage passes anywhere.
- Starting `java-interop` (`./gradlew run`, documented to serve :5008) will collide with
  BBjServices on that port.

**How to address:** replace the connect check with a real protocol handshake (resolve a
known class, short timeout), and confirm every interop test applies the gate at suite level
— `linking.test.ts`'s `describe` is currently unconditional. Full analysis was filed in
`tmp_human_review/06-test-harness-port-5008.md` (untracked; delete after triage).
