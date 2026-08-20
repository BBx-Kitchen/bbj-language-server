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

## 2. Orphan phase directory: `68-deliverable-documents`

`.planning/phases/68-deliverable-documents/` contains a single 19KB
`68-PATTERNS.md` (dated 2026-08-19) with **no corresponding ROADMAP entry** —
ROADMAP phases stop at 59, and phases 60–67 do not exist anywhere in planning.

Notes:
- The whole `.planning/phases/` tree is **untracked** in git (no `.gitignore` rule —
  it simply was never committed). Completed phases are archived into
  `.planning/milestones/<version>-phases/` on milestone close, so `phases/` is
  transient scratch space. This directory is what got left behind.
- `68-PATTERNS.md` is a `gsd-pattern-mapper` artifact — a codebase pattern analysis
  produced *before* planning. Its content may still be useful; it is the dangling
  phase number that is the problem.

**Why it was deferred:** deleting it risks discarding real analysis; keeping it as-is
leaves `/gsd-progress` reporting a phase that does not exist. Deciding which needs
someone to actually read the file.

**How to address:** read `68-PATTERNS.md`, then either fold its content into the
codebase docs (`.planning/codebase/`) and delete the directory, or give phase 68 a
real ROADMAP entry if the work it maps is still intended.

---

## 3. `MILESTONES.md` has duplicated milestone sections

`v3.3 Output & Diagnostic Cleanup` and `v3.4 0.8.0 Issue Closure` each appear
**twice** in `.planning/MILESTONES.md` — at lines 30 and 327 (v3.3), and lines 3 and
356 (v3.4). The file also runs newest-first for its first block and then oldest-first
for a second block, so it reads as two concatenated histories.

Low severity — cosmetic, no tooling reads it for routing. But it makes the file
untrustworthy as a changelog, and any future append lands in an ambiguous place.

**How to address:** de-duplicate and settle on one ordering. Mechanical, but verify
the two copies of each section actually agree before deleting either.

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
