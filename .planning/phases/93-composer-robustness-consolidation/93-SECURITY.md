---
phase: "93"
slug: "composer-robustness-consolidation"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-18"
---

# Phase 93 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Register origin: `register_authored_at_plan_time: true` — all nine plans (93-01 … 93-09) carried a
`<threat_model>` block. Verification depth: ASVS L1 (grep-depth), blocking on `high`. Because
`threats_open: 0` with a plan-time register at L1, the short-circuit rule in
`secure-phase.md` § 3 applied: no auditor subagent was spawned.

**Threat-ID collisions:** plans 93-01, 93-06 and 93-09 were authored in parallel and independently
reused ids `T-93-13` … `T-93-16`. Entries below are disambiguated by originating plan (`p01`, `p06`,
`p09`). `T-93-SC` (supply chain) was carried identically by all nine plans and is recorded once.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| language server → IDE host (JSON-RPC `bbj/composer/*`) | an untrusted-shape response crosses into both the IntelliJ and VS Code hosts | preview verdicts, catalogs, edit ranges, line numbers |
| language server → `ComposerLauncher` write paths | untrusted-shape `int[]` ranges and `int` line numbers cross into document offset arithmetic | offset/line integers |
| language server preview response → composer dialog labels | server-supplied reason and per-field error text is rendered into Swing labels | display strings (truncated to 80 chars) |
| composer dialog OK → developer's source file | an accepted selection becomes a `WriteCommandAction` mutating live source on the EDT | composed BBj statements / hex tokens |
| editor caret, lightbulb popup, context menu → `ComposerLauncher` | user-initiated launch crosses from platform UI into the composer flow | launch intent, caret position |
| `plugin.xml` action registration → action instance | the platform instantiates each action by class name with a no-arg constructor | action id ↔ composer kind binding |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-93-01 (p05) | Denial of Service (local) | six `ComposerLauncher.open*` methods | high | mitigate | `ComposerCatalogsCheck` null-checks every sub-list before dialog construction; malformed payload renders the not-ready notice instead of an EDT `NullPointerException` | closed |
| T-93-02 (p05) | Denial of Service (local) | `MsgboxComposerDialog.fillCombo` | medium | mitigate | All four MSGBOX sub-lists required by the gate; per-sub-list unit case pins each | closed |
| T-93-03 (p05) | Repudiation | malformed-catalogs reporting | low | mitigate | Refusal reuses `ComposerNotices.notReady` (`ComposerNotices.java:46`) — actionable message, not silence | closed |
| T-93-04 (p02) | Tampering | SETOPTS write path | high | mitigate | One validity rule, server-side, rendered by both hosts; the divergent second Java rule deleted | closed |
| T-93-05 (p02) | Tampering | `SetoptsPreview` / composeTriState JSON boundary | high | mitigate | Java `boolean valid` defaults `false` (fail-closed) at 5 sites in `ComposerModels.java`; no-key envelope case pinned by `ComposerModelsJsonBoundaryTest` | closed |
| T-93-06 (p02) | Information Disclosure | `rawTailError` message | low | accept | Fixed literal describing the hex rule; echoes no user input and no path | closed |
| T-93-07 (p03) | Denial of Service (local) | `applyHexEdit`, `openSetopts`, `openSetoptsInCodeAbsolute` | high | mitigate | `ComposerEditRanges.isUsable` length-checks every server-supplied range before the write command; 6 call sites in `ComposerLauncher` | closed |
| T-93-08 (p03) | Tampering | `openSetoptsInCodeAbsolute` write | high | mitigate | Null + length check added before `StaleEditGuard` is built; previously unguarded | closed |
| T-93-09 (p04) | Denial of Service (local) | `generatePreview` | medium | mitigate | Inline `IntentionPreviewInfo.Html` retained on the base, so the popup never enters the description-resource fallback where #433's crash lived | closed |
| T-93-10 (p04) | Elevation of Privilege | `startInWriteAction` | medium | mitigate | `public final boolean startInWriteAction()` returning `false` (`ComposerIntentionBase.java:36`) — no subclass can opt a modal dialog into a write action | closed |
| T-93-11 (p04) | Spoofing | lightbulb entry identity | low | mitigate | All five class names and `<className>` registrations unchanged; guard asserts `plugin.xml` names the base zero times | closed |
| T-93-12 (p03) | Repudiation | malformed-edit reporting | low | mitigate | Abort renders the named `MALFORMED_EDIT` notice (`ComposerNotices.java:72`) rather than failing silently | closed |
| T-93-13 (p01) | Spoofing | stalled-preview label | medium | mitigate | `ComposerSwingHelpers.previewUnavailable` sets `errorForeground()`, so a stale/failed preview is visibly distinct from a current one | closed |
| T-93-13 (p09) | Denial of Service (local) | `openSetoptsInCodeAbsolute`, `openSetoptsInCodeChain` | high | mitigate | `isUsableLine` / `isUsableLineRegion` bound every server-supplied line against the live `getLineCount()` before the write command | closed |
| T-93-14 (p01) | Tampering | per-dialog OK gating | high | mitigate | `setOKActionEnabled(false)` stays in each dialog's own wrapper; exactly-three count per dialog pinned by `ComposerDialogRefreshSourceGuardTest` | closed |
| T-93-14 (p09) | Tampering | the chain replacement region | high | mitigate | Out-of-range or descending region aborts rather than being clamped; `isUsableLineRegion` rejects `endLine < startLine` (`ComposerEditRanges.java:54`) | closed |
| T-93-15 (p01) | Information Disclosure | reason text rendered into a label | low | accept | `ComposerNotices.shortReason` already collapses and truncates to 80 chars; this phase changed colour, not content | closed |
| T-93-15 (p09) | Repudiation | malformed-line reporting | low | mitigate | Each abort renders `ComposerNotices.malformedEdit(...)` | closed |
| T-93-16 (p06) | Tampering | OK-gating discipline across the base/subclass split | high | mitigate | Three OK disables and the sequence-counter checks pinned across base and subclass with explicit totals by `AddWindowFamilyComposerDialogBaseSourceGuardTest` | closed |
| T-93-16 (p09) | Denial of Service (local) | boundary value `endLine == lineCount` | high | mitigate | Upper bound is strict `line < lineCount` (`ComposerEditRanges.java:35`), not the review sketch's `> lineCount` which would have left the boundary crashing while appearing guarded | closed |
| T-93-17 (p06) | Tampering | subclass `apply` validation gate | high | mitigate | `setOKActionEnabled(p.valid)` present on all five verdict-gated dialogs; per-field error reads stay in the subclass, swept by `ComposerFieldValidationSourceGuardTest` | closed |
| T-93-18 (p06) | Denial of Service (local) | debounce seam | medium | mitigate | `new Alarm(` forbidden outside `AlarmScheduler`; single 300ms `PreviewDebouncer` pinned on the base | closed |
| T-93-19 (p07) | Spoofing | action-id to kind mapping | high | mitigate | Kind is a compile-time constant per subclass; base guarded against `ActionManager.getId(` — a mistyped id is a compile error, not a wrong composer | closed |
| T-93-20 (p07) | Elevation of Privilege | availability scoping | medium | mitigate | `setEnabledAndVisible` has exactly one call site, on `BbjComposeActionBase:52`; `setEnabled(` is zero across all seven composer action files | closed |
| T-93-21 (p07) | Tampering | action-side parsing | medium | mitigate | Base and all six subclasses swept for zero Java-side SETOPTS keyword matching, CVS mask parsing and integer parsing — decode stays authoritative on the language server | closed |
| T-93-22 (p07) | Denial of Service (local) | `getActionUpdateThread` | medium | mitigate | `public final @NotNull ActionUpdateThread getActionUpdateThread()` returning `BGT` (`BbjComposeActionBase.java:66`) — availability computation cannot move onto the EDT | closed |
| T-93-23 (p08) | Tampering | `SetoptsComposerDialog` OK gate | high | mitigate | OK gated on the server's `valid` verdict (`SetoptsComposerDialog.java:286`) instead of enabled unconditionally | closed |
| T-93-24 (p08) | Tampering | duplicated client-side hex rule | high | mitigate | Java rule deleted, not kept in sync; `"0-9 or A-F"` confirmed absent from `bbj-intellij/src/main` — it survives only as the server literal in `setopts-catalog.ts:384` and a deserialization assertion in test | closed |
| T-93-25 (p08) | Tampering | `SetoptsTriStateComposerDialog` OK gate | high | mitigate | Tri-state dialog gates on a fail-closed verdict; a malformed or partial composeTriState response leaves Apply disabled | closed |
| T-93-26 (p08) | Denial of Service (local) | write-path validation | medium | accept | Deliberately no second gate at `ComposerLauncher`'s write path — it would re-run a server round trip on/near the EDT inside a write command (forbidden by the off-EDT convention) or re-implement the rule in Java (the duplication this phase deletes). Residual risk covered by the dialog-side verdict across all six dialogs plus the launcher's existing empty-value guards | closed |
| T-93-SC (all plans) | Tampering | npm/pip/cargo installs | high | mitigate | Phase adds zero packages. No phase-93 commit touches `bbj-intellij/build.gradle.kts` or `bbj-vscode/package.json`; the only commits that do are Dependabot bumps and phases 88/89. `93-RESEARCH.md`'s Package Legitimacy Audit records the phase as adding no external packages at all | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-93-01 | T-93-15 (p01) | Server-supplied stall reason is rendered into a Swing label; `ComposerNotices.shortReason` already collapses and truncates it to 80 characters. Plan 93-01 changed the colour of this text, not its content or provenance. | plan 93-01 threat model | 2026-09-18 |
| R-93-02 | T-93-06 (p02) | `rawTailError` is a fixed literal describing the hex rule. It echoes no user input and no filesystem path, so there is nothing to disclose. | plan 93-02 threat model | 2026-09-18 |
| R-93-03 | T-93-26 (p08) | No second validation gate at the launcher write path: it would require a server round trip on or near the EDT inside a write command (forbidden by the standing off-EDT convention) or a re-implemented Java rule (the exact duplication phase 93 removes). Residual risk is covered by the dialog-side verdict across all six dialogs plus the launcher's existing empty-value guards. | plan 93-08 threat model | 2026-09-18 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-18 | 31 | 31 | 0 | /gsd-secure-phase 93 (orchestrator, ASVS L1 short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-18
