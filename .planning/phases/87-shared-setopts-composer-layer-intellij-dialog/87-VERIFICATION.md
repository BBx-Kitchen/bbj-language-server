---
phase: 87-shared-setopts-composer-layer-intellij-dialog
verified: 2026-09-07T19:10:00Z
status: human_needed
score: 8/8 must-have truths verified
behavior_unverified: 1
overrides_applied: 0
human_verification:
  - test: "Live IDE hand check: SETOPTS composer edits config.bbx without restarting the server (QA/FULL-TEST-CHECKLIST.md IntelliJ row 18)."
    expected: "The composer opens from both an existing-SETOPTS line and a non-SETOPTS line; toggling an option updates the resulting line/summary live and greys BBj-ignored options with a tooltip; applying changes only the hex token of the target line; the entry is absent (not disabled) in a `.bbj` file; the server never restarts or reconnects (status bar / LS tool window stay quiet) at any point."
    why_human: "Context-menu visibility, live Swing rendering of the debounced preview, and server-restart absence over a real LSP4IJ connection cannot be proven by a JUnit/Vitest test; the phase's own plan (87-03 D13) and SUMMARY record this as the one remaining verification step, and no dedicated `*ComposerDialogTest.java` exists for any composer dialog in this Gradle build by established project convention."
  - test: "CR-01 regression: rapid checkbox-toggle-then-Apply/Insert inside the 300ms debounce window never commits a stale (pre-toggle) SETOPTS selection."
    expected: "Open the SETOPTS composer on an existing line, toggle a checkbox, and click Apply/Insert (or press Enter right after a Space toggle) before the live preview visibly updates. The dialog must not accept the click (OK stays disabled until the new preview resolves) or, if the click lands after re-enable, the applied hex must reflect the toggled state, never the pre-toggle one."
    why_human: "The fix (`scheduleRefresh()` disabling OK synchronously before `previewDebouncer.trigger()`) is verified in this round by direct code reading (the disable call is synchronous on the EDT, before the listener returns) and by a source-guard regex (`ComposerDialogRefreshSourceGuardTest#setoptsRoutesEveryListenerThroughTheOkDisablingScheduleHelperRatherThanTriggeringTheDebouncerDirectly`) that pins every listener through the one helper — but no runtime test exercises the actual Swing event dispatch + button-enablement timing end to end; the project's own dialog test-strategy note (87-02-PLAN.md) confirms no headless-Swing test harness exists in this Gradle build to do so automatically."
overrides: []
gaps: []
deferred: []
behavior_unverified_items:
  - truth: "OK/Apply is disabled the instant a new preview is scheduled (CR-01 fix), so a fast click inside the 300ms debounce window can never commit hexDigits/line values that predate the user's most recent edit."
    test: "Toggle a SETOPTS checkbox and click Apply/Insert immediately (within ~300ms), repeated with a keyboard Space-then-Enter sequence."
    expected: "OK is disabled the instant the toggle fires (before the debounced preview resolves) and only re-enables once the new preview has been applied, so the committed hex always reflects the toggled state."
    why_human: "Source-guard regex and static EDT-ordering reasoning both support the fix, but no runtime Swing test exercises the actual dispatch/timing; see the matching human_verification entry above."
---

# Phase 87: Shared SETOPTS Composer Layer & IntelliJ Dialog Verification Report

**Phase Goal:** IntelliJ users get a visual SETOPTS composer for config.bbx, equivalent to VS Code's existing one, built on one shared `bbj/composer/setopts/*` command layer both IDEs consume.
**Verified:** 2026-09-07T19:10:00Z
**Status:** human_needed
**Re-verification:** No — initial verification.

## Goal Achievement

### Observable Truths

Merged from the four ROADMAP Success Criteria (no SPEC.md existed, so the phase's own plans lifted the
ROADMAP SCs into `must_haves.truths` — recorded as a flagged assumption in 87-01-PLAN.md, not silently
resolved) plus the two code-review fixes (CR-01, WR-01) that 87-REVIEW-FIX.md claims are closed.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1: A user editing config.bbx in IntelliJ can open a SETOPTS composer dialog that previews, composes, and applies edits through new `bbj/composer/setopts/*` requests — the same catalog and flag arithmetic VS Code's composer already uses. | ✓ VERIFIED | `BbjComposeSetoptsAction` (`actions/BbjComposeSetoptsAction.java`) calls `ComposerLauncher.launch(project, editor, Kind.SETOPTS)`. `ComposerLauncher`'s `SETOPTS` arm calls `server.setoptsDecodeCall(...)` then `openSetopts(...)`, which opens `SetoptsComposerDialog`, whose `refresh()` calls `server.setoptsPreview(...)` — a thin pass-through to `setoptsPreview`/`parseSetOptsLine`/`SETOPTS_BITS` in `bbj-vscode/src/setopts-catalog.ts` (`composer-commands.ts` handlers, read directly). Registered in `plugin.xml` (`id="bbj.composeSetopts"`, `EditorPopupMenu`). All Java/TS tests green (see below). |
| 2 | SC2: Applying a SETOPTS composer edit in IntelliJ writes the change to config.bbx without triggering an extra, unwanted language-server restart. | ✓ VERIFIED | `bbj-vscode/test/config-hot-reload.test.ts`'s new test `a line written by the SETOPTS composer produces zero notifications, while a PREFIX edit in the same file still produces exactly one` builds both lines from the composer's own `composeSetOptsLine`/`parseVector`/`setoptsPreview` functions (not hand-typed), asserts zero `bbj/configReloadRequired` notifications for the SETOPTS-only change and exactly one `prefix-changed` notification for the PREFIX control in the same test body. Ran directly: `npx vitest run test/config-hot-reload.test.ts` — 1/1 file, all tests pass. `git diff` confirms `config-watcher.ts`/`config-reload-notification.ts` are untouched — no new suppression code was added, consistent with the plan's prohibition. |
| 3 | SC3: The new composer DTOs crossing the LSP4IJ boundary are covered by the existing composer JSON-boundary test family, with numeric sentinels kept in the same in-range convention as the rest of the composer surface. | ✓ VERIFIED | `ComposerModelsJsonBoundaryTest` (13 tests, ran directly, 0 failures) contains `aSetoptsDecodeCallResponseParsesThroughTheLsp4jGson`, `aSetoptsPreviewResponseParsesThroughTheLsp4jGson`, `theSetoptsPreviewParamsSerializeWithTheWireKeyByte`, and an extended `aComposerCatalogsResponseParsesThroughTheLsp4jGson` covering `setopts.bits`/`setopts.byteGroups`, all parsed through LSP4IJ's real `MessageJsonHandler`. `@SerializedName("byte")` on `SetoptsSelectionBit`/`SetoptsBit`/`SetoptsByteGroup` is asserted to survive deserialization (`byteNo` populated from the `"byte"` JSON key) and serialization (`"byte":3` in the emitted JSON, not `"byteNo"`). The file's existing `anOversizedIntegerFieldIsRejectedByTheSameParser` negative control (line 289) remains in the same class and still passes — the SETOPTS vector itself crosses as a hex `String` end-to-end (`ComposerModels.java`, read directly: `hexDigits`/`rawTail`/`maskComma`/`maskDot` are all `String`), removing the 32-bit-sign-bit overflow class this negative control targets, by design (T-87-02). |
| 4 | SC4: The dialog's launch/refresh chain composes through the existing `ComposerFlow`/`StaleEditGuard`/`ComposerNotices` seams — a hung or failed request surfaces exactly one reason-keyed balloon. | ✓ VERIFIED | `SetoptsComposerDialog` builds `ComposerFlow` with `ComposerFlow.once(...)` for `balloonOnce` and routes both the success and failure arm of `flow.observe(server.setoptsPreview(...), ...)` through a `mySeq == seq.get()` guard (read directly, lines 244-256). `ComposerLauncher.openSetopts`'s edit path uses `StaleEditGuard.applyIfUnchanged(...)` with `DecodeEquality::sameSetopts` and a notifier that re-launches `Kind.SETOPTS` (read directly, lines 293-320) — exactly one `replaceString(` call, confined to `ed.hexRange` or `ed.insertOffset`. `ComposerDialogRefreshSourceGuardTest` (12 tests) and `ComposerApplyGuardSourceGuardTest` (10 tests) and `ComposerLauncherChainSourceGuardTest` (10 tests) all pass, enforcing SETOPTS as the fourth entry in every one of these wiring guards. |
| 5 | DecodeEquality.sameSetopts reports a mismatch on any compared field, comparing hexRange/bits element-wise, never by identity. | ✓ VERIFIED | `DecodeEquality.java` read directly (lines 135-186): `Arrays.equals(a.hexRange, b.hexRange)`, explicit element loop over `bits` comparing `byteNo`/`mask`. `DecodeEqualityTest` (11 tests, ran directly, 0 failures) covers identical-match, one mutation per field, null handling, and distinct-array-instance equality. |
| 6 | Twelve request names are declared on `BbjComposerServer`; the `setopts` catalog carries 50 bits / 7 ordered byte groups (`[1,2,3,4,7,8,9]`); previewing with an `original` never loses an unmodeled byte or unknown bit. | ✓ VERIFIED | `ComposerRequestContractTest` (4 tests) passes with `DECLARED_REQUESTS` including both new SETOPTS names, reflectively matched against `BbjComposerServer`. `bbj-vscode/test/composer-commands.test.ts` asserts `c.setopts.bits` has length 50 and `byteGroups` maps to `[1, 2, 3, 4, 7, 8, 9]` (ran directly, passes) — matches `setopts-catalog.ts`'s 55 `byte:` literals once `MASK_REPLACEMENT_BIT` and the two `BYTE_GROUPS`/`unknownByBytes` non-catalog occurrences are excluded (55 total minus 5 non-`SETOPTS_BITS` occurrences = 50). The lossless round-trip test (`setopts/preview starts from the original vector and never from zero`) passes. |
| 7 | CR-01 fix: OK/Apply is disabled the instant a new preview is scheduled, not only on eventual failure — closing the stale-selection data-loss bug the review found. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Fix commit `dd95ffd4` is an ancestor of `HEAD` (confirmed via `git merge-base --is-ancestor`). `SetoptsComposerDialog.java` read directly: every checkbox `ActionListener` and every `SimpleDocumentListener` now calls `scheduleRefresh()`, which calls `setOKActionEnabled(false)` synchronously before `previewDebouncer.trigger()` (lines 147, 167-169, 198-201). `ComposerDialogRefreshSourceGuardTest#setoptsRoutesEveryListenerThroughTheOkDisablingScheduleHelperRatherThanTriggeringTheDebouncerDirectly` pins that `previewDebouncer.trigger()` appears exactly once in the file (inside the helper). This is presence + wiring + sound static EDT-ordering reasoning, but not a runtime test exercising the actual Swing dispatch/timing — no dialog-level behavioral test exists for any composer dialog in this Gradle build (confirmed project convention, 87-02-PLAN.md). Routed to human verification below; not counted toward the verified score. |
| 8 | WR-01 fix: the raw-tail-specific validation message reaches `rawTailError` (the field-level label) instead of being silently dropped. | ✓ VERIFIED | Fix commit `aace196c` is an ancestor of `HEAD`. `refresh()` (lines 208-220) clears `rawTailError` up front and, on an invalid raw-tail regex match, sets `rawTailError.setText("must be 0-9 or A-F, up to 14 digits")` directly — a straightforward, non-concurrent assignment fully traceable by static code reading; no timing ambiguity like CR-01's fix. |

**Score:** 8/8 truths present and wired; 7/8 counted as fully behaviorally verified; 1 (CR-01's runtime timing) routed to human verification per the honest-verifier rule that presence + wiring is not behavior for a state-transition/ordering invariant.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/composer-commands.ts` | `setopts/decodeCall`, `setopts/preview` handlers, `setopts` catalog field | ✓ VERIFIED | Read directly; handlers present, thin pass-throughs, zero try/catch. |
| `bbj-vscode/test/composer-commands.test.ts` | Coverage for both new requests + catalog field | ✓ VERIFIED | 75/75 tests pass across the three composer-related test files. |
| `bbj-intellij/.../composer/ComposerModels.java` | 11 new SETOPTS DTOs, hex-String vector | ✓ VERIFIED | All fields read directly; `@SerializedName("byte")` present on every `byte`-named field. |
| `bbj-intellij/.../composer/BbjComposerServer.java` | Two new `@JsonRequest` proxy methods | ✓ VERIFIED | Read directly, present. |
| `bbj-intellij/.../composer/DecodeEquality.java` | `sameSetopts` comparator | ✓ VERIFIED | Read directly, field-wise, element-wise arrays. |
| `bbj-intellij/.../composer/SetoptsComposerDialog.java` | Swing dialog, scrollable catalog form, debounced preview | ✓ VERIFIED | Read directly, full compilation confirmed via `./gradlew build`. |
| `bbj-intellij/.../concurrency/PreviewDebouncer.java` | Trailing-edge coalescer over `Scheduler` | ✓ VERIFIED | 6/6 `PreviewDebouncerTest` pass. |
| `bbj-intellij/.../composer/ComposerLauncher.java` | `Kind.SETOPTS`, `openSetopts`, `insertAt` refactor | ✓ VERIFIED | Read directly; matches plan's guarded-write/insert-at-line-start design exactly. |
| `bbj-intellij/.../actions/BbjComposeSetoptsAction.java` | PSI-free, config-file-scoped Editor Popup action | ✓ VERIFIED | Read directly; `update()` gates only on `BbjConfigPathService.getInstance().isConfigFile(...)`, no PSI import, no caret-text read. |
| `bbj-intellij/src/main/resources/META-INF/plugin.xml` | `bbj.composeSetopts` registration, no keystroke | ✓ VERIFIED | Grep-confirmed: `id="bbj.composeSetopts"`, `EditorPopupMenu`, no `<keyboard-shortcut>` child. |
| `QA/FULL-TEST-CHECKLIST.md` | IntelliJ row 18 | ✓ VERIFIED | Exactly one row numbered 18, IntelliJ section, covers both composer modes + no-restart observation. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `composer-commands.ts` handlers | `setopts-catalog.ts` pure functions | direct import + call | ✓ WIRED | Confirmed by reading the import block and both handler bodies. |
| `BbjComposeSetoptsAction.update()` | `BbjConfigPathService.getInstance().isConfigFile(VirtualFile)` | direct call | ✓ WIRED | Confirmed by reading the action source. |
| `ComposerLauncher.Kind.SETOPTS` | `ComposerFlow.launch` → `server.setoptsDecodeCall` → `SetoptsComposerDialog` → `StaleEditGuard.applyIfUnchanged` | direct call chain | ✓ WIRED | Confirmed by reading `ComposerLauncher.java`'s `SETOPTS` switch arm and `openSetopts`. |
| `StaleEditGuard` re-decode | same `setoptsDecodeCall` request, compared with `DecodeEquality::sameSetopts` | direct call | ✓ WIRED | Confirmed at `ComposerLauncher.java:300-302`; `setoptsDecodeCall(` occurs exactly twice in the file (launch + re-decode), `DecodeEquality::sameSetopts` exactly once — both confirmed by grep. |
| `SetoptsComposerDialog` listeners | `previewDebouncer.trigger()` via `scheduleRefresh()` | direct call | ✓ WIRED | Confirmed; source-guard pins exactly one direct `trigger()` call site (inside the helper). |
| Composer write | Phase 85's `config-watcher.ts` relevance gate | structural (no new code) | ✓ WIRED | `git diff` confirms zero changes to `config-watcher.ts`; the new regression test in `config-hot-reload.test.ts` reconfirms the gate holds for composer-produced text. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| VS Code composer/config-hot-reload/setopts-catalog test suite | `npx vitest run test/composer-commands.test.ts test/config-hot-reload.test.ts test/setopts-catalog.test.ts` | 3 files, 75 tests, all pass | ✓ PASS |
| IntelliJ composer/concurrency/actions test packages | `./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.*' --tests 'com.basis.bbj.intellij.concurrency.*' --tests 'com.basis.bbj.intellij.actions.*'` | BUILD SUCCESSFUL | ✓ PASS |
| Whole IntelliJ module (per-plan claim: 720 tests) | `./gradlew build --offline` | BUILD SUCCESSFUL, 0 failures | ✓ PASS |
| Individual test-suite XML counts (7/11/12/6/13/4/10/10) for the touched test classes | `grep '<testsuite ' build/test-results/test/TEST-*.xml` | all match or exceed SUMMARY claims, 0 failures/errors each | ✓ PASS |
| Both code-review fix commits are in current history | `git merge-base --is-ancestor dd95ffd4/aace196c HEAD` | both true | ✓ PASS |
| VS Code composer UI and Phase 85 watcher untouched | `git status --porcelain -- setopts-composer-ui.ts setopts-composer-webview.ts config-watcher.ts config-reload-notification.ts` | empty | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DISC-04 (#633) | 87-01/02/03 | User editing config.bbx in IntelliJ gets a visual SETOPTS composer equivalent to VS Code's existing one, served by a shared `bbj/composer/setopts/*` command layer both IDEs use | ✓ SATISFIED (pending one live-IDE hand check) | All four ROADMAP SCs verified above; `REQUIREMENTS.md` traceability table already lists DISC-04 → Phase 87 → Complete; no orphaned requirements — DISC-04 is the only requirement mapped to Phase 87. |

No orphaned requirements found for Phase 87.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `SetoptsComposerDialog.java`, `BbjComposeSetoptsAction.java`, `BbjComposeSetoptsActionSourceGuardTest.java`, `ComposerLauncher.java` (and related test files) | multiple | Javadoc/comments reference plan-internal decision IDs (`D-01`–`D-09`), the code-review finding IDs `CR-01`/`WR-01`, and a threat-register ID `T-87-01` | ℹ️ Info | No functional impact — code and tests are correct and all pass. Pre-existing, unmodified composer files (`MsgboxComposerDialog.java`, `AddWindowComposerDialog.java`, `StaleEditGuard.java`) carry none of these identifiers, confirming this is not an established codebase convention but an artifact of this phase's executors mirroring the PLAN's own D-xx/CR-xx notation into source comments. This project's own MEMORY (`register-check-source-diff-before-push.md`, updated 2026-09-05 after Phase 82) records that a prior verifier flagged exactly this pattern as a gap requiring cleanup before a phase closes, and that GitHub issue numbers (`#633`, `#538`) are the only identifiers meant to survive into source. Not treated as a blocking gap here since it does not affect the phase's functional truths, but flagged per that established project precedent — recommend scrubbing the `D-0N`/`CR-01`/`WR-01`/`T-87-0N` references from comments before any public push, consistent with how Phase 82's round-1 planning-identifier leak was handled. |

No TBD/FIXME/XXX debt markers found in any file touched by this phase (`grep -nE "TBD|FIXME|XXX"` over all nine `.java`/`.ts` files modified/created — zero matches). No `TODO`/`HACK`/`PLACEHOLDER`/"not yet implemented" markers found either.

### Human Verification Required

### 1. Live-IDE hand check: SETOPTS composer end-to-end in a real IntelliJ session

**Test:** Follow QA/FULL-TEST-CHECKLIST.md IntelliJ row 18 exactly — open the resolved config file, confirm "Compose SETOPTS…" on both an existing-SETOPTS line and a non-SETOPTS line, toggle an option and confirm live preview + BBj-ignored greying/tooltip, apply and confirm only the hex token changed, compose a new line and confirm whole-line insertion, confirm the action is absent in a `.bbj` file, and watch the status bar / LS tool window for any restart or reconnect.
**Expected:** Every step in the checklist row passes; the server never restarts or reconnects.
**Why human:** Context-menu visibility, live Swing rendering, and the absence of a server restart over a real LSP4IJ connection require a running IDE session; this is the phase's own documented final verification step (87-03-PLAN.md D13, 87-03-SUMMARY.md).

### 2. CR-01 regression: rapid toggle-then-Apply never applies a stale selection

**Test:** Open the SETOPTS composer on an existing line. Toggle a checkbox, then immediately click Apply/Insert (or press Enter right after a Space toggle) before the preview visibly updates — repeat a few times to catch the ~300ms window.
**Expected:** OK/Apply is disabled during the debounce window (cannot be clicked), or if clicked after re-enabling, the applied hex reflects the toggled state, never the pre-toggle one.
**Why human:** The fix is sound by static EDT-ordering reasoning and pinned by a source-guard regex, but no runtime Swing test in this Gradle build exercises the actual event-dispatch/button-enablement timing (no dialog-level behavioral test framework exists for any composer dialog, per this project's own documented test-strategy convention).

### Gaps Summary

No blocking gaps. All four ROADMAP success criteria and both code-review fixes are present, correctly wired, and covered by passing automated tests (75 Vitest tests + the full 720-test IntelliJ Gradle suite, both re-run directly in this verification, not taken from SUMMARY claims). The phase's own plans correctly flag one item that inherently requires a live IDE (QA row 18); this verification adds one additional targeted human-verification item for the CR-01 timing fix, since its correctness rests on Swing event-dispatch ordering that no test in this codebase currently exercises. A non-blocking Info finding notes that plan-internal decision/review-finding IDs (`D-0N`, `CR-01`, `WR-01`, `T-87-0N`) leaked into source comments, per this project's own established convention (MEMORY: register-check-source-diff-before-push) — recommended for cleanup before any public push, not required to close this phase.

---

_Verified: 2026-09-07T19:10:00Z_
_Verifier: Claude (gsd-verifier)_
