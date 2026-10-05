---
phase: "128"
slug: "intellij-denum"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-04"
---

# Phase 128 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| IDE user -> action / banner | a click starts one request for the editor's own file | user intent (click) |
| IntelliJ plugin -> language server (JSON-RPC over stdio) | the request carries only a document URI; the answer comes back as JSON | file URI out, `DenumResult` in |
| language server -> IntelliJ document (workspace/applyEdit) | LSP4IJ applies the server's edit, not this plugin | text edit to an unsaved buffer |
| language server -> IntelliJ client (notifications) | `bbj/denumDiagnostics` carries server text derived from bbj-ls output; `bbj/showDenumDiagnostics` carries nothing | untrusted display text |
| client -> console view | printed text is read by the user and could imitate other log lines | display text |
| document text -> banner decision | the first 20 non-blank lines of an opened file decide whether the banner shows | file content (read only) |
| repository tree -> plugin zip / public repository | what is packaged is what users install; source and test text become public | build artefacts, source |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-128-01 | Tampering | `BbjDenumberAction.denumber` (file on disk) | medium | mitigate | No save on this path: `FileDocumentManager` is used only for `getFile` (lines 58, 74). `BbjDenumberActionSourceGuardTest` pins 0 `saveDocument(` and 0 `saveAllDocuments(` | closed |
| T-128-02 | Denial of service | IDE responsiveness (EDT) | medium | mitigate | `ActionUpdateThread.BGT` (line 51); `Task.Backgroundable` (line 86) with `assertIsNonDispatchThread()` (line 89) | closed |
| T-128-03 | Spoofing | "Denumber failed" balloon text | low | mitigate | `StringUtil.escapeXmlEntities(detail)` (line 154) | closed |
| T-128-04 | Denial of service | response parsing | low | mitigate | `DenumModels.edits` is an opaque `JsonElement`; pinned by `DenumModelsJsonBoundaryTest` | closed |
| T-128-05 | Elevation of privilege | request target | low | mitigate | The URI comes only from the editor's `VirtualFile` (`toNioPath().toUri()` / `getUrl()`, lines 91-111) | closed |
| T-128-06 | Denial of service | repeated clicks | low | accept | See Accepted Risks Log | closed |
| T-128-07 | Spoofing | console block (forged lines) | medium | mitigate | `DenumDiagnosticsPresenter.FLATTEN` = `[\p{Cc}\u2028\u2029]` (line 38); `DenumDiagnosticsPresenterTest` | closed |
| T-128-08 | Elevation of privilege | payload turned into a link, command or path | medium | mitigate | Plain `logToConsole` only in `BbjLanguageClient`; `BbjLanguageClientDenumSourceGuardTest` forbids hyperlink, link-info, filter and file-opening APIs | closed |
| T-128-09 | Denial of service | malformed or hostile payload | low | mitigate | The presenter tolerates a null payload, list, entry or field, a negative line and an unknown severity (lines 43-66); `DenumDiagnosticsPresenterTest` | closed |
| T-128-10 | Denial of service | very long diagnostics list | low | accept | See Accepted Risks Log | closed |
| T-128-11 | Tampering | reveal notification payload | low | mitigate | `showDenumDiagnostics(Object ignoredPayload)` never reads the parameter (line 174); pinned by the source guard | closed |
| T-128-12 | Denial of service | banner refresh storm on typing | low | mitigate | `DirtyFileCoalescer` with `REFRESH_DELAY_MS = 300`; `DirtyFileCoalescerTest`, `BbjLineNumberedBannerRefresherSourceGuardTest` | closed |
| T-128-13 | Denial of service | listener or alarm leak across project close | low | mitigate | The refresher `implements Disposable`; `project.isDisposed() \|\| !file.isValid()` guard (line 71) | closed |
| T-128-14 | Tampering | buffer changed without consent | medium | mitigate | A single `createActionLabel("Denumber", () -> BbjDenumberAction.denumber(project, file))` (line 53); the provider guard pins it | closed |
| T-128-15 | Denial of service | document read off the EDT without a lock | low | mitigate | `ReadAction.compute` in the provider (line 41) | closed |
| T-128-16 | Tampering | plugin zip contents | medium | mitigate | `cmp` of the bundled `main.cjs` plus a class and plugin.xml check on the shipped zip (128-04-SUMMARY); the zip was rebuilt after the review fixes and passed the UAT smoke test | closed |
| T-128-17 | Repudiation | planning identifiers in shipped source | low | mitigate | Register check over the lines the phase added under `bbj-intellij/src` (128-04-SUMMARY) | closed |
| T-128-18 | Tampering | scope creep into the language server | low | mitigate | Scope check (only `bbj-intellij/` and `.planning/`) and an unchanged allowlist test (128-04-SUMMARY) | closed |
| T-128-19 | Information disclosure | hand-check records | low | accept | See Accepted Risks Log | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-128-01 | T-128-06 | Each click sends one request. The server's in-flight guard answers overlapping requests with its own message, and the client has no queue or retry. In UAT a double click made at most one edit. | plan-time register (128-01) | 2026-10-04 |
| AR-128-02 | T-128-10 | The server bounds the list. The presenter is linear and prints in one batch, the same as VS Code's full log copy. | plan-time register (128-02) | 2026-10-04 |
| AR-128-03 | T-128-19 | The hand checks used scratch programs only. The pasted idea.log lines are filtered by grep. | plan-time register (128-04) | 2026-10-04 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-04 | 19 | 19 | 0 | orchestrator (L1 grep check; auditor skipped by the short-circuit rule: register written at plan time, ASVS 1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-04
