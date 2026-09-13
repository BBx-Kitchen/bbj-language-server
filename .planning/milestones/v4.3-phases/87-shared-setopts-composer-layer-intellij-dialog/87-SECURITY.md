---
phase: "87"
slug: "shared-setopts-composer-layer-intellij-dialog"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-13"
---

# Phase 87 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| IntelliJ plugin → language server (LSP4IJ JSON-RPC) | Request params built from dialog state are deserialized by the server; responses are deserialized by lsp4j's Gson into the SETOPTS DTOs | One config.bbx line, a SETOPTS selection, hex strings — user's own local data, low sensitivity |
| Language server → `setopts-catalog.ts` | Handler params reach pure domain functions that compute the hex string a host later writes into config.bbx | Hex vector / selection — integrity-relevant |
| User keyboard input → dialog field state | Free-text mask characters and raw hex digits enter the composer and, via the preview, end up in the written hex string | Untrusted free text — integrity-relevant |
| Dialog → value the launcher writes | `getHexDigits()` / `getLine()` are the only values leaving the dialog | Hex digits / composed line — integrity-relevant |
| Editor context menu → composer launch | The action decides, from file identity alone, whether the composer may open against the document | File identity (VirtualFile) |
| Dialog result → config.bbx on disk | The only point in the phase where bytes are written to a file the whole BBj toolchain reads | Config text — integrity-relevant |
| Composer write → Phase 85 config watcher | A composer write is indistinguishable, at filesystem level, from an external edit | File-change events |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-87-01 | Tampering | `bbj/composer/setopts/preview` handler | medium | mitigate | `composer-commands.ts:239-240` passes `p.original` through `parseVector` into `setoptsPreview`, so unmodeled bytes and unknown bits survive; pinned by `composer-commands.test.ts:229` "setopts/preview starts from the original vector and never from zero" (green 2026-09-13) | closed |
| T-87-02 | Tampering | SETOPTS DTOs at the LSP4IJ boundary | medium | mitigate | Vector fields are `String` end-to-end (`ComposerModels.java` `hexDigits`/`rawTail`/`maskComma`/`maskDot`, lines 373-387, 418, 465); `ComposerModelsJsonBoundaryTest#aSetoptsDecodeCallResponseParsesThroughTheLsp4jGson` plus the retained `#anOversizedIntegerFieldIsRejectedByTheSameParser` negative control | closed |
| T-87-03 | Tampering | `@SerializedName("byte")` on SETOPTS DTOs | medium | mitigate | Annotation present on every `byteNo` field (`ComposerModels.java:327, 338, 354, 412`); both directions pinned by `ComposerModelsJsonBoundaryTest#theSetoptsPreviewParamsSerializeWithTheWireKeyByte` and the response-parse tests | closed |
| T-87-04 | Denial of Service | new requests on the shared proxy interface | low | accept | See accepted risk AR-87-01 | closed |
| T-87-05 | Information Disclosure | handler params/results | low | accept | See accepted risk AR-87-02 | closed |
| T-87-06 | Tampering | raw-hex-tail and mask-character fields | medium | mitigate | `SetoptsComposerDialog.java:213-225` validates the raw tail (`[0-9A-Fa-f]{0,14}`) and single printable-ASCII mask chars (`:268`, 0x20..0x7E) and returns through `previewUnavailable(...)` (which disables OK, `:279`) before any `server.setoptsPreview(` request (`:246`) | closed |
| T-87-07 | Tampering | `SetoptsPreviewParams.original` | medium | mitigate | Sole construction site `SetoptsComposerDialog.java:243` `new SetoptsPreviewParams(originalHex, selection)` | closed |
| T-87-08 | Tampering | `getHexDigits()` / `getLine()` | medium | mitigate | Initialized to `""` (`:76-77`), written only on the successful-preview path (`:283-284`) immediately before `setOKActionEnabled(true)` (`:291`); OK disabled at construction (`:104`), on every schedule (`:199`) and on failure (`:279`) | closed |
| T-87-09 | Denial of Service | preview round trips | low | mitigate | `PreviewDebouncer` coalesces bursts (`SetoptsComposerDialog.java:93`, `PreviewDebouncerTest` green); every request bounded by `ComposerFlow.REFRESH_TIMEOUT_MILLIS` (`:92`, `:246`) | closed |
| T-87-10 | Repudiation | failure surfacing | low | mitigate | `ComposerFlow.once(...)` single-balloon gate (`SetoptsComposerDialog.java:88`); failure arm renders a reason via `previewUnavailable(ComposerNotices.shortReason(...))` (`:254`) | closed |
| T-87-11 | Tampering | edit-in-place write in `openSetopts` | medium | mitigate | `ComposerLauncher.java:492-494` `guard.applyIfUnchanged(... DecodeEquality::sameSetopts ...)`; single guarded write pinned by `ComposerApplyGuardSourceGuardTest` (green) | closed |
| T-87-12 | Tampering | compose-new insertion | medium | mitigate | `ComposerLauncher.java:514` `insertAt(project, editor, dialog.getLine() + "\n", "Compose SETOPTS", true)` — `atLineStart=true` inserts at the caret line's start | closed |
| T-87-13 | Tampering | action availability | medium | mitigate | `BbjComposeSetoptsAction.java:48-49` `setEnabledAndVisible(... BbjConfigPathService.getInstance().isConfigFile(file))`; pinned by `BbjComposeSetoptsActionSourceGuardTest` (green) | closed |
| T-87-14 | Denial of Service | composer write vs. the config watcher | medium | mitigate | Regression pair `config-hot-reload.test.ts:262` (SETOPTS composer write → zero notifications; PREFIX edit → exactly one), green 2026-09-13; no suppression code added to `config-watcher.ts` | closed |
| T-87-15 | Repudiation | failed or hung launch | low | mitigate | SETOPTS arm composes through `flow.launch(` (`ComposerLauncher.java:207`); pinned by `ComposerLauncherChainSourceGuardTest` (green) | closed |
| T-87-SC | Tampering | npm/gradle installs | low | accept | See accepted risk AR-87-03 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-87-01 | T-87-04 | Both SETOPTS handlers are pure, allocation-bounded computations over one line of text; the client bounds every call with `ComposerFlow`'s existing timeouts | Plan-time threat model (87-01), confirmed by secure-phase audit | 2026-09-13 |
| AR-87-02 | T-87-05 | Params carry one line of the user's own config file within the user's own session; nothing is logged or transmitted beyond the existing local LSP channel | Plan-time threat model (87-01), confirmed by secure-phase audit | 2026-09-13 |
| AR-87-03 | T-87-SC | Phase adds no dependency to `package.json` or `build.gradle.kts` (87-RESEARCH.md Package Legitimacy Audit; reconfirmed in all three SUMMARYs) | Plan-time threat model (87-01/02/03), confirmed by secure-phase audit | 2026-09-13 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-13 | 16 | 16 | 0 | /gsd-secure-phase orchestrator (ASVS L1 grep-depth; register authored at plan time, auditor skipped per short-circuit rule) |

## Security Audit 2026-09-13
| Metric | Count |
|--------|-------|
| Threats found | 16 |
| Closed | 16 |
| Open | 0 |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-13
