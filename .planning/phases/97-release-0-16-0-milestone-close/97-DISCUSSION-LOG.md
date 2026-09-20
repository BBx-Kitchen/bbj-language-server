# Phase 97: Release 0.16.0 & Milestone Close - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-20
**Phase:** 97-Release 0.16.0 & Milestone Close
**Areas discussed:** Folded todos, Landing 93-96 on main, Release run & failure plan, Post-publish smoke & 'live', Closing the 21 issues

---

## Folded todos

| Option | Description | Selected |
|--------|-------------|----------|
| Fold none (Recommended) | Release phase stays pure release work; all six remain pending. | |
| Crash-detection gap (major) | Move the status feed to `LSPClientFeatures#handleServerStatusChanged`; real code + guards + hand UAT. | ✓ |
| 3 small IntelliJ log fixes | No-op `bbj/bbjcplAvailability` handler, `setIndeterminate(false)` before `setFraction`, stale previous-status log line. | ✓ |
| 2 test-housekeeping todos | Close out the gradle-wrapper-hygiene todo; update live-interop tests for the getAllClassNames backend. | ✓ |

**User's choice:** Fold all six.
**Notes:** The first (multi-select) answer ticked "Fold none" together with all three groups. A single-select follow-up ("Fold none" / "Fold all six" / "Small ones only") resolved it: **Fold all six**. This puts a code wave ahead of the release.

---

## Landing 93-96 on main

### PR shape

| Option | Description | Selected |
|--------|-------------|----------|
| One PR, whole branch (Recommended) | Whole lineage incl. planning docs, register-checked per commit; one merge, one preview publish. | ✓ |
| Code PR now, todo PR after | 93-96 soaks in preview while the todo work continues; two merges. | |
| Filtered code-only PR | The #651 / gsd-pr-branch precedent; planning docs pushed separately. | |
| Per-phase PRs | Five PRs, five preview publishes. | |

**User's choice:** One PR, whole branch.

### Preview soak

| Option | Description | Selected |
|--------|-------------|----------|
| Gate: green Preview run + hand check (Recommended) | Preview run green and the maintainer installs the preview build in both IDEs; no calendar wait. | ✓ |
| Gate: green Preview run only | No hand install of the preview. | |
| Soak for a fixed period | Leave the preview live for a set number of days. | |

**User's choice:** Gate: green Preview run + hand check.

### WINDOWS.md entry 1

| Option | Description | Selected |
|--------|-------------|----------|
| Bypass /gsd-ship (Recommended) | Plain `git push` + `gh pr create`; the entry stays open — "deferred, not waived". | ✓ |
| Waive it with a reason | `windows waive 1 "<reason>"`; contradicts the 2026-08-21 wording. | |
| Fix it in this phase | Embargoed guardrail hardening inside a release phase. | |

**User's choice:** Bypass /gsd-ship.

### Crash-detection UAT bar

| Option | Description | Selected |
|--------|-------------|----------|
| Tests + hand UAT on your usual IDE (Recommended) | Seam tests, source guard, LSP4IJ canary, plus a hand UAT; no Windows re-attestation. | ✓ |
| Also re-attest on Windows | Adds a Windows run. | |
| Tests only | No hand UAT before release. | |
| Escape hatch if it balloons | Pull it back out to its own phase if the rework grows. | |

**User's choice:** Tests + hand UAT on the usual IDE.
**Notes:** The escape-hatch option was not chosen; a larger-than-expected rework is surfaced to the maintainer rather than decided silently.

---

## Release run & failure plan

### Publish order

| Option | Description | Selected |
|--------|-------------|----------|
| Serialize: IntelliJ first, then VS Code (Recommended) | `publish-vscode` gains `needs: publish-intellij`; a JetBrains failure leaves nothing public. | |
| Keep parallel + written runbook | No workflow change; pre-written reconciliation runbook. | ✓ |
| Serialize: VS Code first | Opposite order; recreates the 0.15.0 shape on a JetBrains failure. | |

**User's choice:** Keep parallel + written runbook.
**Notes:** Chosen against the recommendation. The runbook must account for the artifacts' 1-day retention.

### Dispatch

| Option | Description | Selected |
|--------|-------------|----------|
| You, in the Actions UI (Recommended) | Blocking-human checkpoint after Claude's precondition check; Claude watches with `gh`. | ✓ |
| Me, via gh workflow run, after your go | Claude dispatches after an explicit go. | |

**User's choice:** Maintainer dispatches in the Actions UI.

### Failure rule

| Option | Description | Selected |
|--------|-------------|----------|
| Tiered by where it failed (Recommended) | verify → fix + re-dispatch; one publish → runbook, never bump the version; tag/release → by hand; every manual step a human checkpoint. | ✓ |
| Any failure stops the phase | No pre-authorized recovery path. | |
| Tiered, but I may re-dispatch retries | Claude may re-run one transient failure where nothing has published. | |

**User's choice:** Tiered by where it failed (no autonomous retries).

### Release notes

| Option | Description | Selected |
|--------|-------------|----------|
| Curated summary, edited in after (Recommended) | Workflow creates the release untouched; Claude drafts, maintainer approves, `gh release edit`. | ✓ |
| Leave auto-generated | `--generate-notes` output is the body. | |
| Rich PR description instead | Summary lives in the landing PR. | |

**User's choice:** Curated summary, edited in after approval.

---

## Post-publish smoke & 'live'

### Meaning of "live"

| Option | Description | Selected |
|--------|-------------|----------|
| When JetBrains approves; phase waits (Recommended) | Phase pauses until the listing shows 0.16.0; smoke and closure after that. | |
| Upload accepted = live | A green `publish-intellij` counts; IntelliJ smoke from the Release zip; no review-queue wait. | ✓ |
| Split the close | Close issues early; keep only the JetBrains marketplace-install smoke trailing. | |

**User's choice:** Upload accepted = live.
**Notes:** Chosen against the recommendation. Overrides ROADMAP criterion 3's "install from their marketplaces" wording for the JetBrains side only; to be stated explicitly in VERIFICATION.md.

### Smoke run

| Option | Description | Selected |
|--------|-------------|----------|
| You, by hand, both IDEs (Recommended) | Clean profile of each IDE on the usual machine; Claude records the verdict. | ✓ |
| Split: I do VS Code, you do IntelliJ | Claude drives VS Code via Playwright in the dev container. | |
| You, plus a Windows pass | Adds an IntelliJ pass on Windows. | |

**User's choice:** Maintainer, by hand, both IDEs.

### Smoke fails

| Option | Description | Selected |
|--------|-------------|----------|
| Severity decides; you call it (Recommended) | Blocking → fix to preview, stable in 0.17.0, milestone stays open; non-blocking → issue, 0.16.0 stands. | ✓ |
| Any defect blocks the close | Milestone open until a clean x.y.0. | |
| File and close regardless | Smoke is informational. | |

**User's choice:** Severity decides; maintainer classifies.

### Artifact identity

| Option | Description | Selected |
|--------|-------------|----------|
| sha256 of Release assets, tied to the smoke (Recommended) | Hashes + run id + commit SHA; verdict recorded against them. | ✓ |
| Also compare the Marketplace VSIX | Download the VSIX back and compare. | |
| Job graph is proof enough | No hashes. | |

**User's choice:** sha256 of Release assets, tied to the smoke.

---

## Closing the 21 issues

### Timing

| Option | Description | Selected |
|--------|-------------|----------|
| After 0.16.0 is released and smoked (Recommended) | No `Fixes #` keywords in the PR; one closing pass after the smoke verdict. | ✓ |
| At PR merge, via 'Fixes #' keywords | GitHub closes on merge, days before the stable release. | |
| After the release run, before the smoke | Close on a green run and tag. | |

**User's choice:** After release and smoke.

### Who closes

| Option | Description | Selected |
|--------|-------------|----------|
| I draft all 21, you approve, I post (Recommended) | One review file, one approval gate, then `gh issue close` one at a time and close milestone #7. | ✓ |
| I draft, you post | Nothing outward-facing done by Claude. | |
| Approve only the six deviating ones | Template for 15, individual review for six. | |

**User's choice:** Claude drafts all 21, maintainer approves, Claude posts.

### Comment shape

| Option | Description | Selected |
|--------|-------------|----------|
| Version + what changed + commit; reasoning where it deviates (Recommended) | Two to four sentences; six deviating issues explain what was done instead and why; no planning identifiers. | ✓ |
| Minimal one-liner | "Fixed in 0.16.0 — link." | |
| Detailed, with test evidence | Adds test/guard names. | |

**User's choice:** Version + what changed + commit; reasoning where it deviates.

### Trace for folded todos

| Option | Description | Selected |
|--------|-------------|----------|
| Release notes + PR body only (Recommended) | No new issues; milestone #7 stays at 21. | ✓ |
| File an issue for the crash-detection gap | One public issue outside milestone #7. | |
| File issues for all, add to milestone #7 | Milestone grows to 27; criterion 4 amended. | |

**User's choice:** Release notes + PR body only.

---

## Claude's Discretion

- Merge method for the landing PR and which SHA(s) the closing comments cite.
- Branch naming and whether the todo work continues on the current branch or a `gsd/phase-97-…` branch cut from its HEAD.
- Wording and file names of the runbook, precondition checklist and closing-comment review file.
- Plan/wave split (human checkpoints are fixed).
- No-op handler vs surfacing for `bbj/bbjcplAvailability` — prefer the no-op.

## Deferred Ideas

- Serializing the two publish jobs (declined for 0.16.0).
- Raising `retention-days` on the release artifacts.
- Confirming the JetBrains listing once its review clears (not a phase gate).
- Surfacing BBjCPL availability in the IntelliJ UI.
- Windows re-attestation of the crash-detection rework.
