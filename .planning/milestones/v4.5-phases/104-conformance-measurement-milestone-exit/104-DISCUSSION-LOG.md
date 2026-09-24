# Phase 104: Conformance Measurement & Milestone Exit - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-23
**Phase:** 104-conformance-measurement-milestone-exit
**Areas discussed:** Harness endpoint mode, Final tree & test gate, Where the record lives, Corpus repo housekeeping

---

## Todo cross-reference

| Option | Description | Selected |
|--------|-------------|----------|
| Fold none | Keep the phase lean; the linking-test question is handled under the test gate | ✓ |
| Fold linking interop todo | Fix or re-baseline the 11 linking.test.ts interop failures | |
| Fold single-line IF todo | Fix the IF-shaped A2 files although the gate is met | |

**User's choice:** Fold none

---

## Harness endpoint mode

| Option | Description | Selected |
|--------|-------------|----------|
| Flag in run.mjs/worker.mts | `--endpoint host:port`; promotes the 103 probe path into the worker | ✓ |
| Separate script | Standalone endpoint script with its own report | |

| Option | Description | Selected |
|--------|-------------|----------|
| Every file | All 11,898 accepted + 1,210 rejects go to the endpoint | ✓ |
| Rejects + flagged accepted only | ~1,241 calls, like the probe | |

| Option | Description | Selected |
|--------|-------------|----------|
| Report both, gate A/A2 on raw | Raw Langium A/A2 (baseline-comparable) + reconciled view; B gated reconciled | ✓ |
| Gate everything on reconciled | A/A2/B all as the user sees them | |

| Option | Description | Selected |
|--------|-------------|----------|
| Fall back per file, count it | Product-like fallback; the gate run needs 0 failures | ✓ |
| Abort the run | Any failure stops the run; nothing is written to history | |

---

## Final tree & test gate

| Option | Description | Selected |
|--------|-------------|----------|
| Branch HEAD, last | PR #691 branch after all 104 commits; corpus build unchanged | ✓ |
| After merge to main | Merge first, then measure | |

| Option | Description | Selected |
|--------|-------------|----------|
| 0 new failures vs base | Named env-drift failures must match origin/main; interop-down run and Gradle exactly 0 | ✓ |
| Only interop-down run | CI-equivalent run + Gradle | |
| Literally zero, interop up | Needs the linking todo fixed | |

| Option | Description | Selected |
|--------|-------------|----------|
| Build both, no hand UAT | VSIX + IntelliJ zip as a smoke check | ✓ |
| Build + short UAT in both IDEs | Live-diagnostic smoke with the endpoint present | |
| Neither | Tests only | |

| Option | Description | Selected |
|--------|-------------|----------|
| Push + update PR body | Exit numbers into the PR #691 description; closing-keyword scan; merge stays with the user | ✓ |
| Push only | | |
| Don't touch it | | |

---

## Where the record lives

| Option | Description | Selected |
|--------|-------------|----------|
| README next to regression files | `bbj-vscode/test/test-data/conformance/README.md`, not on the public docs site | ✓ |
| CLAUDE.md + README | Also a line in CLAUDE.md | |
| Public docs site page | Would publicly mention a private corpus | |

| Option | Description | Selected |
|--------|-------------|----------|
| 104-CONFORMANCE.md + PROJECT pointer | Gate table + residual groups in own words; ids stay in the corpus repo | ✓ |
| Also one todo per residual group | | |
| Also a seed | | |

| Option | Description | Selected |
|--------|-------------|----------|
| File a todo, don't fix | checkUseBeforeAssignment exception from the 103 run | ✓ |
| Fix it in 104 | | |
| Only note it | | |

---

## Corpus repo housekeeping

| Option | Description | Selected |
|--------|-------------|----------|
| Harness + README + final results | Commit by exact path; eval/ untouched; no remote, so no push | ✓ |
| Harness + README only | | |
| Nothing | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep untracked, delete probe | snapshots/ gitignored; probe deleted once the flag reproduces it | ✓ |
| Keep everything as-is | | |
| Commit snapshots | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Same file, tagged | history.jsonl `endpoint` field; the closing measurement records both runs | ✓ |
| Endpoint run only | | |

---

## Claude's Discretion

- Endpoint-mode concurrency (sharded connections vs sequential): reliability first.
- Always validating in endpoint mode; fake-interop mode keeps its rule.
- Field names and REPORT.md layout for the raw/reconciled columns and the disagreement row.
- Duplicating vs importing the failure-kind classifier (no new exports only for the harness).
- Plan split.

## Deferred Ideas

- checkUseBeforeAssignment exception → pending todo (not fixed in 104).
