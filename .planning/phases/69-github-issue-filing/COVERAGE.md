# API Coverage — GitHub Issues + Security Advisories

> Full coverage by default. Opt-outs are explicit, reasoned decisions.

Phase 69 drives the GitHub Issues API and the GitHub Repository Security Advisories API through the `gh`
CLI: 135 public issue creates, 9 private draft advisory creates, one open-and-closed dedup re-query, and
label and issue read-backs for verification. The deterministic detector returned no signal over the phase
scope, which is a detector miss rather than an absence of integration — this matrix is recorded because
the integration is real, and it is the subtraction record for everything the phase could have driven and
does not.

| capability | decision | reason |
|---|---|---|
| auth status / repo view (preflight) | INTEGRATE | |
| label list | INTEGRATE | |
| issue list / search — open and closed, the D-07 dedup re-query | INTEGRATE | |
| issue create | INTEGRATE | |
| issue view — title, body and label read-back verification | INTEGRATE | |
| security advisories list (GET) | INTEGRATE | |
| security advisories create (POST, draft) | INTEGRATE | |
| label create | OPT-OUT | D-09: all twelve label values the phase applies already exist in the repository; ISSUE-03 requires drawing from the existing set, so nothing is created |
| security advisory publish / request CVE | OPT-OUT | D-01 files drafts only; publishing is a coordinated-disclosure decision outside this phase's boundary |
| issue edit | OPT-OUT | nothing filed is amended in-phase; a wrong body is corrected in the draft before the ISSUE-01 gate, not on the tracker afterwards |
| issue comment | OPT-OUT | D-11 bodies are fully self-contained; no cross-reference or traceability comments are filed |
| issue close | OPT-OUT | no filed issue is resolved in-phase — implementing the 144 refactors is FUT-04 |
| issue transfer / lock / pin | OPT-OUT | tracker organisation, not required by any ISSUE-0n requirement |
| milestone create / assign | OPT-OUT | deferred in `69-CONTEXT.md` — a tracker-organisation decision for after the filing lands |
| project board add | OPT-OUT | deferred in `69-CONTEXT.md` for the same reason |
| assignee / reviewer assignment | OPT-OUT | the corpus carries no assignee field and re-triage is barred by the phase boundary |
| issue type labels (`bug` / `enhancement`) | OPT-OUT | deferred in `69-CONTEXT.md`: would require 144 per-finding judgement calls the corpus has no field for |
| batch label (`v4.0-review`) | OPT-OUT | deferred in `69-CONTEXT.md`: the developer chose the ISSUE-03 triad only |
| repository security policy (`SECURITY.md`) | OPT-OUT | deferred in `69-CONTEXT.md`: a repository source change belonging to its own phase, explicitly outside this phase's write boundary |

**Produced at plan time** by `gsd-planner` for phase 69, so the matrix exists before the first plan runs
and the `api-coverage` seal-time gate reads a decided surface rather than an inferred one.
