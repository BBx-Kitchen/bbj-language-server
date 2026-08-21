---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-08-21T09:44:03.777Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 70 | unmet-truth |  |  | Phase 70 truth 4 unmet: a CI hygiene guardrail needs breadth hardening plus regression fixtures. Detail is embargoed under PROC-01 — see 70-VERIFICATION.md gap 2 and 70-REVIEW.md (CR-01..CR-04) in the phase directory (off public main). Accepted as unmet by explicit human decision 2026-08-21; deferred, not waived. | open |  | 2026-08-21T09:44:03.777Z |  |

````json
[
  {
    "id": 1,
    "kind": "unmet-truth",
    "phase": "70",
    "file": "",
    "line": null,
    "description": "Phase 70 truth 4 unmet: a CI hygiene guardrail needs breadth hardening plus regression fixtures. Detail is embargoed under PROC-01 — see 70-VERIFICATION.md gap 2 and 70-REVIEW.md (CR-01..CR-04) in the phase directory (off public main). Accepted as unmet by explicit human decision 2026-08-21; deferred, not waived.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T09:44:03.777Z",
    "resolved_at": null
  }
]
````
