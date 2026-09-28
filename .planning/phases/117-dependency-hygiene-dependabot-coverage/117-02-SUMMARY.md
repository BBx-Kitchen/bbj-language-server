---
phase: 117-dependency-hygiene-dependabot-coverage
plan: "02"
subsystem: infra
tags: [dependabot, ci, github-actions, npm, langium, dependency-hygiene]

requires: []
provides:
  - "Dependabot ignore rule holding langium and langium-cli at the 4.4.x line only (versions [\"4.4.x\"])"
  - "Dependabot github-actions entry (directory /) grouped into one weekly PR"
  - "Dependabot npm /documentation entry grouped on @docusaurus/*"
affects: [122-release-ci-pipeline-hardening]

actuals:
  tokens: 8500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Dependabot ignore versions range (npm semver, e.g. \"4.4.x\") to hold one regressed release line while letting patches and later majors/minors through"
    - "Dependabot groups: block (patterns list) to fold a dependency tree's related-package updates into one PR"

key-files:
  created: []
  modified:
    - .github/dependabot.yml

key-decisions:
  - "langium and langium-cli 4.4.x are ignored via versions: [\"4.4.x\"] (npm semver range), not a bare dependency-name rule or update-types major/minor block — proven by a semver satisfies check against 4.4.0/4.4.9 (matched) and 4.3.1/4.5.0 (not matched)"
  - "github-actions entry uses directory \"/\" with one groups block (patterns [\"*\"]) so every action bump lands in a single weekly PR, limiting the extra preview publishes preview.yml's unfiltered push trigger would otherwise cause"
  - "npm /documentation entry groups only @docusaurus/* (not react/clsx/etc.) since those are the packages pinned to one exact version (3.9.2) that must move together"

patterns-established:
  - "A future composite action under .github/actions/ needs its own Dependabot directory entry — the github-actions entry with directory \"/\" covers .github/workflows only"

requirements-completed: [CI-04]

coverage:
  - id: D1
    description: "dependabot.yml holds langium and langium-cli at 4.3 by ignoring only the 4.4.x version line, with the reason and PRs #682/#684 recorded in a comment"
    requirement: CI-04
    verification:
      - kind: other
        ref: "node: YAML-parsed langium/langium-cli ignore-rule + semver-range structure check (Task 1 verify 1)"
        status: pass
      - kind: other
        ref: "bash: diff-shape check against phase base deaa7de2 — cites #682 and #684, no line removed (Task 1 verify 2)"
        status: pass
    human_judgment: false
  - id: D2
    description: "dependabot.yml watches all four dependency trees (npm /bbj-vscode, gradle /bbj-intellij, github-actions /, npm /documentation) weekly, with github-actions and Docusaurus grouped into single PRs, and the langium hold from D1 still intact"
    requirement: CI-04
    verification:
      - kind: other
        ref: "node: YAML-parsed four-entry order/schedule/group structure check (Task 2 verify 1)"
        status: pass
      - kind: other
        ref: "bash: diff-shape check against phase base deaa7de2 — no line removed, no planning id added (Task 2 verify 2)"
        status: pass
    human_judgment: true
    rationale: "Confirmation that GitHub actually registers and lists the two new entries under Insights > Dependency graph > Dependabot requires a merge to main (VALIDATION.md manual-only row) — not reproducible by this executor"

duration: 10min
completed: 2026-09-28
status: complete
---

# Phase 117 Plan 02: Dependabot langium hold and full dependency-tree coverage Summary

**`.github/dependabot.yml` now watches all four dependency trees (bbj-vscode npm, bbj-intellij Gradle, github-actions, documentation npm) weekly, with grouped PRs for actions and Docusaurus, and ignores only the langium/langium-cli 4.4.x line that PRs #682/#684 declined.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-09-28 (session start, after 117-01 completed)
- **Completed:** 2026-09-28
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- The `/bbj-vscode` npm entry's `ignore:` list now holds `langium` and `langium-cli` at exactly the `4.4.x` line (`versions: ["4.4.x"]`), matching 4.4.0/4.4.9 and not matching 4.3.1/4.5.0 (proven by a semver `satisfies` check), with a comment explaining the parse-recovery slowdown, the lost DEF FN completion, and citing PR #682 and PR #684
- A new `github-actions` entry (`directory: "/"`) watches the actions used by workflows under `.github/workflows`, grouped into one weekly PR via `groups: { github-actions: { patterns: ["*"] } }`
- A new `npm` entry for `directory: "/documentation"` watches the Docusaurus site's dependencies, grouped on `@docusaurus/*` via `groups: { docusaurus: { patterns: ["@docusaurus/*"] } }` since those packages are pinned to the exact version 3.9.2 and must move together
- All four entries (`npm:/bbj-vscode`, `gradle:/bbj-intellij`, `github-actions:/`, `npm:/documentation`) use `schedule.interval: "weekly"`; the existing chevrotain, typescript and gradle entries are byte-for-byte unchanged (confirmed by a zero-removed-lines diff against the phase base commit `deaa7de2`)

## Task Commits

1. **Task 1: Dependabot holds langium and langium-cli at 4.3 by ignoring only the 4.4.x line** - `666aa430` (ci)
2. **Task 2: Dependabot watches GitHub Actions and the /documentation npm tree, weekly and grouped** - `4596ffb9` (ci)

**Plan metadata:** committed together with this SUMMARY

## Files Created/Modified

- `.github/dependabot.yml` - two new `ignore:` rules on the existing `/bbj-vscode` entry (langium, langium-cli at `4.4.x`), plus two new `updates:` entries (`github-actions` at `/`, `npm` at `/documentation`), each with its own weekly schedule and prose comment in the existing style

## Decisions Made

- Used `versions: ["4.4.x"]` (npm semver range syntax) rather than a bare `dependency-name` rule or an `update-types` major/minor block, per D-11 — this is the only shape that matches exactly the regressed 4.4.0-4.4.9 line while still letting 4.3.x security patches and a later 4.5 release through
- Grouped the `github-actions` entry's updates into a single weekly PR (`patterns: ["*"]`) rather than leaving it ungrouped, because `preview.yml` has no path filter and publishes both marketplace previews on every push to `main`; grouping caps the extra publish frequency this new entry introduces to at most one per week
- Grouped the `/documentation` entry on `@docusaurus/*` only (not the whole tree) since `react`/`react-dom`/`clsx`/`prism-react-renderer` are independent and can be bumped on their own schedule; only the `@docusaurus/*` packages are pinned to one exact version and need to move as a set

## Deviations from Plan

None - plan executed exactly as written. Both tasks' automated `<verify>` blocks and every `<acceptance_criteria>` line passed on the first attempt.

---

**Total deviations:** 0
**Impact on plan:** None.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Requirement CI-04 is complete: `dependabot.yml` watches every dependency tree the repository ships or builds from (npm `/bbj-vscode`, gradle `/bbj-intellij`, `github-actions` `/`, npm `/documentation`), and the langium/langium-cli 4.4.x hold is in place with the two motivating PRs cited.
- Requirement DEP-05 is **NOT** marked complete here — it is shared with plan 117-05 (the external langium repro under `/home/coder/repos/tmp/`), which has not run yet. Only this plan's Dependabot half of DEP-05 (the ignore rule, per D-11) is done; the requirement itself stays open until 117-05 also finishes.
- **Accepted, pre-existing tradeoff (per Task 2 acceptance criteria):** `preview.yml` has no `paths:` filter, so a merged docs-only Dependabot PR against `/documentation` still triggers a full VS Code + IntelliJ preview publish to both marketplaces, exactly like any other push to `main`. This is unchanged by this plan; grouping the new entries into single weekly PRs keeps the added publish frequency to at most two extra pushes per week. Path-filtering `preview.yml` is out of scope (Phase 122).
- **Accepted, pre-existing scope note:** the `github-actions` entry with `directory: "/"` covers actions referenced by workflow files under `.github/workflows` only. A later composite action placed under `.github/actions/` would need its own `github-actions` Dependabot entry with that directory.
- Manual verification still needed after merge (not reproducible by this executor): the repository's Insights → Dependency graph → Dependabot tab should list the new `github-actions` and `/documentation` entries alongside the existing two. Recorded as a manual-only row in this phase's VALIDATION.md.
- Ready for the next plan in Phase 117 (DEP-02, DEP-04, or DEP-05's external repro half).

---
*Phase: 117-dependency-hygiene-dependabot-coverage*
*Completed: 2026-09-28*

## Self-Check: PASSED

- `.github/dependabot.yml` found on disk, contains four `package-ecosystem:` entries
- Task commit `666aa430` found in git log
- Task commit `4596ffb9` found in git log
