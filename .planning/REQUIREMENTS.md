# Requirements: BBj Language Server — v4.1 Security Advisory Remediation

**Defined:** 2026-08-20
**Core Value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.

## Disclosure notice — read before editing this file

Every requirement below is stated **opaquely**: it names an advisory by GHSA id and asserts an
outcome, and deliberately describes **no flaw mechanism, no affected file, and no exploitation
path**.

This is not vagueness. This repository is public; these eight advisories are unpublished
drafts; and a requirement that describes the flaw publishes the flaw. Each advisory has its own
temporary private fork, and the real requirement detail — findings, affected call sites, fix
design, tests — lives **inside that fork**.

**When adding to this file, keep that shape.** Do not "improve" a requirement by explaining what
is wrong. Once an advisory is published and its fix released, its detail may be backfilled here.

**This applies to research too, and it is stricter than it first appears.** Remediation research
for these advisories is deliberately **not** tracked under `.planning/research/` — see
`.git/info/exclude`. "Framed as forward-looking best practice" is *not* sufficient
sanitisation: naming a file plus the control to add to it ("add `X` to `path/y`") states that
the control is absent, which is the advisory. Concrete, file-level remediation guidance for an
unfixed advisory can only live inside that advisory's private fork.

## v4.1 Requirements

Each requirement is complete when the advisory's fix is implemented in its private fork,
reviewed, verified, merged to `main`, and released — after which the advisory can be published.

### Security Remediation

- [ ] **SEC-01**: GHSA-89r9-2pw4-mc7f is remediated, verified, and its fix merged
- [x] **SEC-02**: GHSA-5f22-gqrx-xr22 is remediated, verified, and its fix merged
- [ ] **SEC-03**: GHSA-c4hw-5j83-cx5h is remediated, verified, and its fix merged
- [ ] **SEC-04**: GHSA-5vrp-fj75-pm5q is remediated, verified, and its fix merged
- [ ] **SEC-05**: GHSA-9gv3-gr6g-c4rj is remediated, verified, and its fix merged
- [ ] **SEC-06**: GHSA-33x9-cpwv-xcv2 is remediated, verified, and its fix merged
- [ ] **SEC-07**: GHSA-xxp5-vv2w-42q8 is remediated, verified, and its fix merged
- [ ] **SEC-08**: GHSA-h43f-jcjr-2g4j is remediated, verified, and its fix merged

### Process

- [ ] **PROC-01**: Each advisory's fix is developed in its own temporary private fork and merged via that fork's PR, so no unfixed surface is described on public `main`
- [ ] **PROC-02**: Every fix carries an automated regression test that fails against the pre-fix code, proving the test is not vacuous
- [ ] **PROC-03**: Each advisory is published only after its fix is released, and is assigned a CVE where severity warrants

## Out of Scope

| Item | Reason |
|------|--------|
| GHSA-p5f3-9456-9pcx | Already remediated and merged in v4.1 via PR #637 (`cf01570`); publication pending release |
| Backfilling flaw detail into public planning artifacts | Deferred until each advisory is published — see the disclosure notice above |
| Retroactive Nyquist validation of v4.0 phases 60-69 | v4.0 debt, tracked in `.planning/DEBT.md`, not this milestone |
| WR-01..WR-06 concurrency warnings | Already tracked as issues #497-#500; two were fixed in-phase |
| The `shouldRunBBjTests()` readiness-gate defect | Test-harness debt, tracked in `.planning/DEBT.md` |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 70 | Pending |
| SEC-02 | Phase 71 | Complete |
| SEC-03 | Phase 72 | Pending |
| SEC-04 | Phase 73 | Pending |
| SEC-05 | Phase 74 | Pending |
| SEC-06 | Phase 75 | Pending |
| SEC-07 | Phase 76 | Pending |
| SEC-08 | Phase 77 | Pending |
| PROC-01 | Phases 70-77 | In progress (1/8 phases) |
| PROC-02 | Phases 70-77 | In progress (1/8 phases) |
| PROC-03 | Phases 70-77 | In progress (1/8 phases) |

**Coverage:**

- v4.1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-20*
