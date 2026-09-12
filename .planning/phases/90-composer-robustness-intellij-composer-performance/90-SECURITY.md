---
phase: "90"
slug: "composer-robustness-intellij-composer-performance"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
block_on: high
register_authored_at_plan_time: true
created: "2026-09-12"
---

# Phase 90 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| document text at open → document text at write | The user or another extension can edit the document while a MSGBOX wizard, panel or dialog is open | BBj source text and call spans (user code) |
| command argument → editor write | `bbj.composeMsgbox` accepts an arbitrary `edit`/`insert` argument | line numbers, `exprRange`, insert offsets |
| webview message → extension edit | Composer panels post `insert` payloads the extension turns into a `WorkspaceEdit`; the webview is not the authority | composer selections, free-text field values |
| typed field text → user source | addWindow/addChildWindow free text is composed verbatim into the user's BBj file | free text (unvalidated user input) |
| language-server verdict → IntelliJ OK action / dialog mode | The server's `valid` / `incomplete` / `edit` flags decide whether a dialog may write and how | preview/decode DTOs over LSP (Gson) |
| server lifecycle → cached proxy | A language-server restart replaces the process while a proxy may still be cached | `BbjComposerServer` proxy, catalog futures |
| dialog input → language server | Each preview request crosses to the shared server | preview requests |
| panel lifetime → extension context lifetime | A per-panel subscription registered on the extension-wide context outlives the panel | message-handler subscriptions |
| rebuilt artifact → tester install / evidence → closure claim | A stale VSIX or zip would make UAT or phase closure test old behaviour | VSIX, plugin zip, bundled `main.cjs` |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-90-01 | Tampering | `runComposer` edit/insert after the document changed during the QuickPick wizard | high | mitigate | `captureComposeArgTarget` (`msgbox-composer-ui.ts:148`) at open; span-exact `msgboxCallStillMatches` re-check before `editor.edit` aborts with `MSGBOX_STALE_CALL_TEXT` (`msgbox-composer-ui.ts:211`); #532 regression tests in `msgbox-composer-ui.test.ts` | closed |
| T-90-02 | Tampering | completing-mode panel `insert` after the unfinished call grew | high | mitigate | `msgboxCallStillMatches` slice-compares and re-locates via `findMsgboxCalls` (`msgbox-composer-webview.ts:81-85`); tests "a same-prefix but grown unterminated call is refused" (`:239`) and "a grown call refuses the write" (`:417`) | closed |
| T-90-03 | Tampering | palette / context-menu compose-new nesting a statement inside an existing call | medium | mitigate | `runComposeMsgboxVisualCommand` (`msgbox-composer-ui.ts:62`) decodes the cursor first; tests for unfinished, decodable and undecodable calls (`msgbox-composer-ui.test.ts:182,214,647`) | closed |
| T-90-04 | Tampering | command argument whose `exprRange`/insert offset no longer describes the document | medium | mitigate | consistency check at open on `exprRange`, `exprValue`, `optionInsertOffset` (`msgbox-composer-ui.ts:152-161`); mismatch shows the stale warning and opens no wizard (`:179,:184`) | closed |
| T-90-05 | Tampering | crafted `insert` payload from the MSGBOX webview with an invalid message | low | mitigate | `if (!r.valid) break;` first in the handler (`msgbox-composer-webview.ts:154`) | closed |
| T-90-06 | Tampering | crafted addWindow/addChildWindow `insert` payload bypassing the disabled button | high | mitigate | extension recomputes the preview and guards `if (!r.valid) break;` (`addwindow-composer-webview.ts:130`, `addchildwindow-composer-webview.ts:135`); `window-composer-validation-ui.test.ts` posts malformed inserts | closed |
| T-90-07 | Tampering | malformed free text written into the user's source | medium | mitigate | shared per-field validators plus `validateNumericField` (`addwindow-composer.ts:269`) applied server-side in the preview | closed |
| T-90-08 | Denial of Service | over-strict validation blocking legitimate object expressions | low | mitigate | structural-only rules; tests with `sysgui!.getAvailableContext()`, `win!.getParent()` (`addchildwindow-composer.test.ts:65,206-208`) | closed |
| T-90-09 | Spoofing | cached `BbjComposerServer` proxy surviving a language-server restart | high | mitigate | `BbjComposerService` subscribes `BbjServerStatusListener.TOPIC → handles.invalidate()` (`BbjComposerService.java:29`); identity-checked clear `serverFuture == future` (`ComposerHandleCache.java:49`); `ComposerHandleCacheTest` stale-completion cases (10/10 green) | closed |
| T-90-10 | Denial of Service | null or exceptional proxy/catalog future cached and failing every later open | medium | mitigate | only non-null, non-exceptional results are kept (`ComposerHandleCache.java:45`); `ComposerFlow` clears the cache on launch failure (`ComposerFlow.java:95`); null-not-kept tests (`ComposerHandleCacheTest.java:129,200`) | closed |
| T-90-11 | Tampering | cross-project leakage of cached handles | medium | mitigate | cache is an instance field of a `projectService` (`BbjComposerService.java:24,27`; `plugin.xml:274`); no `static` in `ComposerHandleCache.java`. Note: no source guard test pinning "no static map" was found — the control is structural only | closed |
| T-90-12 | Elevation of Privilege | new LSP4IJ API coupling escaping the import allowlist | low | mitigate | untyped listener lambda; `Lsp4ijImportAllowlistTest` 6/6 green | closed |
| T-90-13 | Tampering | OK accepting a statement from a superseded selection during the debounce window | high | mitigate | `scheduleRefresh()` disables OK, advances `seq`, then triggers the debouncer (`MsgboxComposerDialog.java:254-256`, `AddWindowComposerDialog.java:260-262`, `AddChildWindowComposerDialog.java:270-272`); `ComposerDialogRefreshSourceGuardTest` 15/15 green incl. the sequence-advance case | closed |
| T-90-14 | Denial of Service | one preview request per keystroke loading the shared server | medium | mitigate | `PreviewDebouncer` over the shared `AlarmScheduler`; zero `new Alarm(` in composer dialogs; `PreviewDebouncerTest` 7/7 green | closed |
| T-90-15 | Denial of Service | message-handler subscriptions accumulating across panel open/close | medium | mitigate | `registerPanelMessageHandler` disposes on `panel.onDidDispose` (`webview-panel-lifecycle.ts:21`); used by all six panel modules; zero direct `onDidReceiveMessage(` outside the helper; source-discovered `webview-panel-lifecycle.test.ts` green | closed |
| T-90-16 | Tampering | disposed panel's handler still applying an edit | low | mitigate | subscription disposed with the panel (as T-90-15); handler staleness and `valid` guards unchanged | closed |
| T-90-17 | Tampering | IntelliJ addWindow/addChildWindow OK enabled for a malformed statement | high | mitigate | `setOKActionEnabled(p.valid)` (`AddWindowComposerDialog.java:323`, `AddChildWindowComposerDialog.java:337`); zero `setOKActionEnabled(true)` remaining | closed |
| T-90-18 | Tampering | plugin/server version skew where the server omits `valid` | low | accept | Java `boolean valid` defaults to false → OK stays disabled (fail closed); bundled server matches plugin. See Accepted Risks | closed |
| T-90-19 | Tampering | COMPLETE_CALL write after the unfinished call grew or changed | high | mitigate | single MSGBOX `applyIfUnchanged` (`ComposerLauncher.java:321`) compares with `sameMsgbox`, which includes `incomplete` (`DecodeEquality.java:66`); modification stamp re-checked inside the write command (`StaleEditGuard.java:72`); `DecodeEqualityTest` 28/28 green | closed |
| T-90-20 | Tampering | completion path writing through `insertAtCaret` or a second unguarded write site | high | mitigate | `openMsgbox`-scoped source guard asserts exactly one `applyIfUnchanged(` and one `replaceString(` (`ComposerApplyGuardSourceGuardTest.java:180-198`) | closed |
| T-90-21 | Tampering | plugin/server version skew in which the plugin ignores `incomplete` | low | accept | older plugin opens `Configure MSGBOX` and writes through the same guard, which fails closed on any change. See Accepted Risks | closed |
| T-90-22 | Repudiation | phase closed on source tests while the installed bundle ships old behaviour | medium | mitigate | installed-bundle IPC e2e assertions (`test/functional/installed-extension-e2e.test.ts`), `clean buildPlugin` + `main.cjs` listing and sha256 digests recorded in `90-08-SUMMARY.md:106-117` | closed |
| T-90-23 | Tampering | UAT run against artifacts built before code-review fixes | low | mitigate | UAT 2026-09-12 ran on VSIX and plugin zip rebuilt from HEAD (post de49f489); bundled `main.cjs` proven byte-identical to the fresh build with `cmp` | closed |
| T-90-SC | Tampering | npm/pip/cargo installs | low | accept | no dependency manifest (`package.json`, `package-lock.json`, `build.gradle.kts`, `libs.versions.toml`) changed across the phase span `cd8021a0~1..HEAD`. See Accepted Risks | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-90-01 | T-90-18 | Server omitting `valid` deserializes to `false`, so OK stays disabled — fails closed; the plugin always bundles the matching server | plan-time disposition (90-06-PLAN) | 2026-09-12 |
| AR-90-02 | T-90-21 | An older plugin ignoring `incomplete` still writes only through the stale-edit guard, which refuses any change | plan-time disposition (90-07-PLAN) | 2026-09-12 |
| AR-90-03 | T-90-SC | No new dependency; verified by an empty manifest diff over the phase span | plan-time disposition (90-01..08-PLAN) | 2026-09-12 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-12 | 24 | 24 | 0 | /gsd-secure-phase (orchestrator, ASVS L1 grep-depth; auditor skipped per short-circuit rule) |

## Security Audit 2026-09-12

| Metric | Count |
|--------|-------|
| Threats found | 24 |
| Closed | 24 |
| Open | 0 |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-12
