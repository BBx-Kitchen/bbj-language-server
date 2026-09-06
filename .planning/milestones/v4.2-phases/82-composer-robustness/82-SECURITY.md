---
phase: "82"
slug: "composer-robustness"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-05"
register_authored_at_plan_time: true
---

# Phase 82 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time in the four PLAN.md `<threat_model>` blocks (T-82-01 … T-82-26 plus the per-plan supply-chain row T-82-SC); verified after execution by `/gsd-secure-phase 82` at ASVS L1 (grep-depth mitigation presence against the merged source on `main` at `46afa69e`, plus the green IntelliJ module that runs every named test: 44 classes, 408/408, re-run with `--rerun` on 2026-09-05). No SUMMARY carried a `## Threat Flags` entry. The phase touched only `bbj-intellij/`.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| IntelliJ composer → language server | Caret line text and column cross into the `bbj/composer/*` custom LSP requests (launch decode, per-keystroke preview, pre-write re-decode) over the LSP4IJ proxy | source line text, column |
| language server → dialog UI | The preview payload drives the statement text, summaries, schematic and the OK button's enabled state | preview payload |
| language server → IDE balloon / console | Server-side failures and throwable text are rendered in a notification balloon and mirrored to the language-server console | failure text |
| user editor state → composer chain | Line index, line text, column and the document modification stamp captured on the EDT before a modal dialog are used to compute a write after arbitrary time has passed | editor snapshot |
| composer → document model | The write command mutates the user's source file at computed offsets | source edits |
| plugin descriptor → plugin classloader | The IDE resolves `intentionDescriptions/<Class>/` from a `plugin.xml` registration; an unresolvable path throws `PluginException` | resource path |
| plugin resources → IDE HTML renderer | `description.html`, before/after templates and the inline preview string render inside the IDE's own HTML surfaces | static HTML |
| build → shipped artifact | Resources must survive `processResources` and `jar` as directory entries plus files | packaged resources |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-82-01 | Repudiation | `ComposerLauncher.launch()` chain | high | mitigate | One composed chain in `ComposerFlow.launch` ending in a single terminal `handle(` (`ComposerFlow.java:89`); no `thenAccept` remains in `ComposerLauncher.java`; `ComposerLauncherChainSourceGuardTest` 10/10, `ComposerFlowTest` 14/14 | closed |
| T-82-02 | Denial of service | a composer request that never completes | medium | mitigate | Whole launch chain bounded by `LAUNCH_TIMEOUT_MILLIS = 30_000` via `chain.orTimeout(...)` (`ComposerFlow.java:28,88`); after review fix `cd9f306b` the deadline is one per launch rather than per stage, applied to the derived chain so the proxy's own future is never force-completed; timeout renders `REQUEST_FAILED` | closed |
| T-82-03 | Denial of service | the EDT | high | mitigate | Chain stays on the LSP4IJ futures; only the success continuation goes through `runOnEdt` (`ComposerFlow.java:84`); no `.get()`/`.join()` on any future in the composer package (only `AtomicInteger.get()`) | closed |
| T-82-04 | Information disclosure | throwable text rendered in a balloon and the LS console | low | accept | See AR-82-01 | closed |
| T-82-05 | Tampering | two competing failure-surfacing paths (modal plus balloon) | medium | mitigate | 0 occurrences of `Messages.`/`showInfoMessage` in `ComposerLauncher.java`; all not-ready paths render via `ComposerNoticeRenderer.render` (lines 99, 157, 178); source guard asserts the absence | closed |
| T-82-06 | Spoofing | a notice attributed to the wrong composer | low | mitigate | Single private `labelOf(Kind)` mapping (`ComposerLauncher.java:88`) used by every launch, not-ready and guard call site; `ComposerNoticesTest` 9/9 | closed |
| T-82-07 | Tampering | OK accepted while the previewed statement is stale | high | mitigate | Each dialog calls `setOKActionEnabled(false)` on open and on failure, re-enabling only on a successful preview (`MsgboxComposerDialog.java:100,244,255`; `AddWindow…:111,273,284`; `AddChildWindow…:113,282,293`); `ComposerDialogRefreshSourceGuardTest` 11/11 | closed |
| T-82-08 | Repudiation | a refresh failure that reports nothing | high | mitigate | `ComposerFlow.observe` terminates every refresh with one `handle(` (`ComposerFlow.java:121`); throwable, timeout and null all reach the failure callback that writes the in-dialog label; `ComposerFlowTest` tests 8–10 | closed |
| T-82-09 | Denial of service | a balloon storm during a server restart | medium | mitigate | `ComposerFlow.once` wraps the notifier with `AtomicBoolean.compareAndSet(false, true)` (`ComposerFlow.java:140-143`); each dialog builds its own `balloonOnce` per session (`MsgboxComposerDialog.java:89`); tests 12–13 | closed |
| T-82-10 | Denial of service | a preview request that never completes leaving OK disabled forever | medium | mitigate | `REFRESH_TIMEOUT_MILLIS = 10_000` applied to a `copy()` of the proxy future (`ComposerFlow.java:31,150`); elapsed wait takes the failure path; next successful keystroke restores OK | closed |
| T-82-11 | Tampering | a stale response overwriting a newer one | high | mitigate | `mySeq == seq.get()` checked in both callbacks before touching UI or notifier in all three dialogs (`Msgbox…:222-230`, `AddWindow…:251-259`, `AddChildWindow…:260-268`); `ComposerFlowTest` test 11 | closed |
| T-82-12 | Denial of service | the EDT | high | mitigate | Both callbacks dispatched through `invokeLater(runnable, ModalityState.any())` in all three dialogs (`Msgbox…:91`, `AddWindow…:102`, `AddChildWindow…:104`); no blocking wait added | closed |
| T-82-13 | Information disclosure | failure detail shown in a dialog label and a balloon | low | accept | See AR-82-02 | closed |
| T-82-14 | Tampering | applying captured offsets to text that changed while the dialog was open | critical | mitigate | Every apply path goes through `StaleEditGuard.applyIfUnchanged` (`StaleEditGuard.java:76`; call sites `ComposerLauncher.java:121,192,205`) which re-decodes the live line and writes only on a full field-wise match via `DecodeEquality.same*` with `Arrays.equals` on ranges (`DecodeEquality.java:39,79,91,104-106`); `StaleEditGuardTest` 11/11, `DecodeEqualityTest` 7/7, `ComposerApplyGuardSourceGuardTest` 10/10 | closed |
| T-82-15 | Tampering | the window between the re-decode completing and the write starting | high | mitigate | `snapshotStamp = view.modificationStamp()` (`StaleEditGuard.java:86`) re-checked as the first statement inside `runWriteCommand` (line 98-99); review fix `d9f44ece` anchored the guard on the real `WriteCommandAction.runWriteCommandAction` call site (`ComposerLauncher.java:117,231`) | closed |
| T-82-16 | Tampering | an operation order that lets an earlier rewrite shift a later range | high | mitigate | `ops.sort(Comparator.comparingInt((Op o) -> o.start).reversed())` (`ComposerLauncher.java:252`); source guard pins the comparator; `StaleEditGuardTest` test 10 | closed |
| T-82-17 | Repudiation | an aborted edit that reports nothing | high | mitigate | Every abort path notifies: pre-flight stale (`StaleEditGuard.java:81`), throwable → `requestFailed` (93-94), mismatch/null → `staleDocument` (96), changed stamp (100); no silent return | closed |
| T-82-18 | Denial of service | a re-decode that never completes after OK | medium | mitigate | `REDECODE_TIMEOUT_MILLIS = 10_000` on a `copy()` of the proxy future (`StaleEditGuard.java:27,89-90`); timeout renders `REQUEST_FAILED` and applies nothing (test 6) | closed |
| T-82-19 | Elevation of privilege | a remedy action that re-runs an edit without the user asking | low | mitigate | The `Reopen composer` `NotificationAction` only runs the injected `reopen` runnable (`ComposerNoticeRenderer.java:46-50`), which is `() -> launch(project, editor, kind)` (`ComposerLauncher.java:70,119,233`): a fresh launch against the current document, never a re-apply | closed |
| T-82-20 | Information disclosure | the aborted-edit balloon naming the user's source | low | accept | See AR-82-03 | closed |
| T-82-21 | Denial of service | lightbulb preview computation for a registered intention | medium | mitigate | All three intentions return `new IntentionPreviewInfo.Html(...)` (`ConfigureMsgboxIntention.java:48`, `ConfigureAddWindowIntention.java:49`, `ConfigureAddChildWindowIntention.java:49`) and each ships `intentionDescriptions/<Class>/{description.html,before,after}` under `src/main/resources`; `ComposerIntentionPreviewSourceGuardTest` 5/5, `IntentionDescriptionResourcesTest` 5/5; confirmed live in UAT round 2 test 1 | closed |
| T-82-22 | Repudiation | a future intention registered without a description directory | medium | mitigate | `IntentionDescriptionResourcesTest` enumerates `<intentionAction>` from `plugin.xml` (`IntentionDescriptionResourcesTest.java:92-102`) rather than a hard-coded list | closed |
| T-82-23 | Tampering | HTML rendered in the intention preview and description | low | mitigate | Preview content is a compile-time string literal with no interpolation (`ConfigureMsgboxIntention.java:48-50` and siblings); description/templates are static repository files | closed |
| T-82-24 | Tampering | XML parsing of `plugin.xml` inside the new test | low | mitigate | `DocumentBuilderFactory` hardened: `disallow-doctype-decl`, external general/parameter entities off, `setXIncludeAware(false)`, `setExpandEntityReferences(false)` (`IntentionDescriptionResourcesTest.java:62-67`) | closed |
| T-82-25 | Information disclosure | description text and templates rendered in the IDE | low | accept | See AR-82-04 | closed |
| T-82-26 | Tampering | resources silently absent from the packaged plugin | medium | mitigate | `build/libs/bbj-intellij-0.1.0.jar` carries `intentionDescriptions/` plus the three class directories as directory entries and all nine files (inspected 2026-09-05) | closed |
| T-82-SC | Tampering | npm/pip/cargo installs | low | accept | See AR-82-05 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-82-01 | T-82-04 | The text is the local language server's own failure describing the user's own file; Phase 81 already renders equivalent text in the same notification group and console, so no new boundary is crossed. ASVS L1 local boundary | plan 82-01 threat model | 2026-09-05 |
| AR-82-02 | T-82-13 | The dialog label and balloon carry the local server's one-line failure about the user's own selection, the same text the 82-01 balloon path already shows. ASVS L1 local boundary | plan 82-02 threat model | 2026-09-05 |
| AR-82-03 | T-82-20 | The stale-edit balloon names the composer kind and states nothing changed; it echoes no line content | plan 82-03 threat model | 2026-09-05 |
| AR-82-04 | T-82-25 | The shipped description text and BBj template snippets are generic, authored in this repository, and embed no user code, path, host or credential | plan 82-04 threat model | 2026-09-05 |
| AR-82-05 | T-82-SC | No package-manager install task exists in this phase; `git diff a93ea794..HEAD` over `bbj-intellij/build.gradle.kts`, the Gradle wrapper, `bbj-vscode/package*.json` and `java-interop/build.gradle` is empty, so no dependency was added or upgraded | plans 82-01..04 threat models | 2026-09-05 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-05 | 27 | 27 | 0 | /gsd-secure-phase 82 (orchestrator, L1 grep-depth short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-05
