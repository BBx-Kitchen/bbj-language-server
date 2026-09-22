---
schema_version: 1
open_count: 2
waived_count: 0
fixed_count: 2
total_count: 4
last_updated: 2026-09-22T07:48:53.498Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 70 | unmet-truth |  |  | Phase 70 truth 4 unmet: a CI hygiene guardrail needs breadth hardening plus regression fixtures. Detail is embargoed under PROC-01 — see 70-VERIFICATION.md gap 2 and 70-REVIEW.md (CR-01..CR-04) in the phase directory (off public main). Accepted as unmet by explicit human decision 2026-08-21; deferred, not waived. | open |  | 2026-08-21T09:44:03.777Z |  |
| 2 | 89 | deviation | bbj-vscode/src/language/main.ts |  | Plan 89-01 Task 2: connection.languages.codeLens.refresh() does not exist in this vscode-languageserver version; used connection.sendRequest(CodeLensRefreshRequest.type) instead (same wire behaviour). | fixed |  | 2026-09-12T07:23:30.542Z | 2026-09-12T07:52:09.102Z |
| 3 | 96 | unmet-truth |  |  | PLAT-06's Windows attestation failed -- auto-install produces a working node.exe and .sha256 sidecar, but the language server does not start afterward on Windows; two root causes (Node floor pin, version-cache null poisoning) were found and fixed during the attestation, one blocker remains unresolved; diagnosis is blocked by finding 7 (Node-path diagnostics use java.util.logging and never reach idea.log). | fixed |  | 2026-09-20T05:21:55.886Z | 2026-09-20T08:35:33.376Z |
| 4 | 101 | deviation | bbj-ls:src/main/java/bbj/interop/BbjPrefixAlgorithm.java |  | BbjPrefixAlgorithm.findProgram is never invoked by BBj's parser through getProgramFactory+loadSourceProgram+doJSONSerialization for a bare USE/CALL reference, under either typeChecking(false) (D-05, locked) or typeChecking(true) (tested); resolution needs a class-loading pipeline this call sequence never reaches, so D-08's missing-reference-becomes-BBj-error guarantee is unobserved via this endpoint as built | open |  | 2026-09-22T07:48:53.498Z |  |

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
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "89",
    "file": "bbj-vscode/src/language/main.ts",
    "line": null,
    "description": "Plan 89-01 Task 2: connection.languages.codeLens.refresh() does not exist in this vscode-languageserver version; used connection.sendRequest(CodeLensRefreshRequest.type) instead (same wire behaviour).",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-12T07:23:30.542Z",
    "resolved_at": "2026-09-12T07:52:09.102Z"
  },
  {
    "id": 3,
    "kind": "unmet-truth",
    "phase": "96",
    "file": "",
    "line": null,
    "description": "PLAT-06's Windows attestation failed -- auto-install produces a working node.exe and .sha256 sidecar, but the language server does not start afterward on Windows; two root causes (Node floor pin, version-cache null poisoning) were found and fixed during the attestation, one blocker remains unresolved; diagnosis is blocked by finding 7 (Node-path diagnostics use java.util.logging and never reach idea.log).",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-20T05:21:55.886Z",
    "resolved_at": "2026-09-20T08:35:33.376Z"
  },
  {
    "id": 4,
    "kind": "deviation",
    "phase": "101",
    "file": "bbj-ls:src/main/java/bbj/interop/BbjPrefixAlgorithm.java",
    "line": null,
    "description": "BbjPrefixAlgorithm.findProgram is never invoked by BBj's parser through getProgramFactory+loadSourceProgram+doJSONSerialization for a bare USE/CALL reference, under either typeChecking(false) (D-05, locked) or typeChecking(true) (tested); resolution needs a class-loading pipeline this call sequence never reaches, so D-08's missing-reference-becomes-BBj-error guarantee is unobserved via this endpoint as built",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-22T07:48:53.498Z",
    "resolved_at": null
  }
]
````
