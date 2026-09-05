# Phase 81 — UI Review

**Audited:** 2026-09-05
**Baseline:** Abstract 6-pillar standards, adapted for a Java/Swing IntelliJ Platform plugin plus a TypeScript language server (no UI-SPEC.md for this phase; follows Phase 79/80's adaptation convention)
**Screenshots:** not captured — this is an IntelliJ plugin (Swing/IntelliJ Platform UI) plus an LSP server with no dev server at localhost. Audit is code-only, reading `BbjSettingsComponent.java`, `BbjCompileAction.java`, `CompileResultPresenter.java`, `BbjPairedBraceMatcher.java`, `BbjWordLexer.java`/`BbjStringCommentScanner.java`, `BbjCommenter.java`/`RemToggleSeam.java`, and `compile-command.ts`/`bbj-cpl-service.ts` directly.

This phase's user-facing surface is wider than Phase 80's: one new settings row, nine distinct balloon-copy branches (one success + eight failure reasons), a progress-task title, a console-mirroring path, and two purely-behavioral editor fixes (bracket inertness, REM toggle) that have no new strings at all. Where a pillar is governed entirely by IntelliJ platform chrome (balloon rendering, dialog chrome, `FormBuilder` layout defaults), this review scores the code's adherence to platform convention and to Phase 81's own internal consistency (D-10's "reason, not prose" contract) rather than inventing pixel findings this codebase does not control.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 2/4 | Four of nine failure-reason balloons render with an empty body because `compile-command.ts`'s `run.failure` branch never sets `message`, silently contradicting `CompileResultPresenter`'s own doc comment that every reason gets a body |
| 2. Visuals | 3/4 | Correct severity split (INFORMATION success / ERROR failure) and correct conditional "Open Settings" action, but the balloon offers no way to tell a `compile-errors` failure (many diagnostics) apart from a one-line `bbjcpl-error` failure except by reading the body text |
| 3. Color | 4/4 | Exclusively platform enums (`NotificationType.ERROR`/`INFORMATION`); no hardcoded colors in any of the audited files |
| 4. Typography | 4/4 | No custom fonts/sizes anywhere; the one new settings row reuses `JBLabel`/`TextFieldWithBrowseButton` exactly like the pre-existing BBj-home row |
| 5. Spacing | 3/4 | New "BBj Compiler" `FormBuilder` section matches the file's own established row pattern exactly, but its placement between "BBj Environment" and "Node.js Runtime" is asserted only by SUMMARY prose, not by any test, so a later edit can silently reorder it |
| 6. Experience Design | 2/4 | Empty-body balloons for four failure reasons (see Copywriting), a fixed-length success/failure clause vocabulary with no line-count guard for very long diagnostic lists, and three human-UAT items (live bracket inertness, live settings dialog, live balloon/console text) are explicitly deferred and unverified at review time |

**Overall: 18/24**

---

## Top 3 Priority Fixes

1. **Four of the eight compile-failure balloons render with an empty body, even though `CompileResultPresenter`'s own doc comment promises otherwise.** User impact: `compile-command.ts:130` returns `{ success: false, diagnostics: [], reason: run.failure, file: filePath }` for the four reasons that originate as `CompileRun.failure` (`bbj-home-not-configured`, `bbjcpl-not-found`, `compile-timeout`, `spawn-failed`) — no `message` field is ever set on this branch (`bbj-cpl-service.ts`'s `CompileRun` interface at line 51 has no message-bearing field for `failure` either). `CompileResultPresenter.present()` (`CompileResultPresenter.java:63-99`) dutifully calls `body = orEmpty(message)` for all four, which resolves to `""`. The user sees only the title ("Failed to compile \"foo.bbj\": BBj home is not configured") with a blank balloon body — for `bbjcpl-not-found` and `spawn-failed` in particular, a body naming the resolved (or unresolved) binary path would materially help diagnosis, and the class's own javadoc ("the four reasons a setting can fix append a short clause naming the cause") implies a body was intended. Concrete fix: have the language server's `run.failure` branch populate `message` with a sentence describing the specific cause (e.g. `"BBj home is not set in the plugin settings, or BBj.properties was not found under {home}/cfg/"` for `bbj-home-not-configured`), verified by extending `compile-request.test.ts`'s existing refusal-reason tests to assert a non-empty `message` on all four `run.failure`-derived paths.

2. **The `compile-errors` and `bbjcpl-error` balloon titles are stripped of their own explanatory clause (`titleTail = ""`, `CompileResultPresenter.java:81` and `:86`), so a user skimming just the notification title sees only `Failed to compile "foo.bbj"` with no hint whether the cause was a syntax error in their code or a compiler crash.** User impact: every other reason gets a distinguishing title clause (": BBj home is not configured", ": the compiler options are invalid", etc.) but the two most common real-world failure modes — an actual compile error and an unparseable bbjcpl crash — get the least differentiated title, forcing the user to expand/read the balloon body (which for a large file might be many `line:col` lines) just to learn "this is your code, not your setup." Concrete fix: give `compile-errors` a title tail like `": N compile error(s)"` (count from `diagnostics.size()`) and `bbjcpl-error` a tail like `": the compiler reported an error"`, matching the specificity Phase 79/80's own copy bar established (name what happened, not just that something failed).

3. **The `compilerOutputDirectoryField`'s empty-text hint ("Required for \"Compile BBj File\" to run") is the only signal that this field is mandatory, and it disappears the instant the user clicks into the field or types anything — including a value they later delete back to blank while the field still has focus.** User impact: a user who focuses the field, types a path, then clears it back to empty while it's still focused sees no hint text (Swing's `EmptyText` typically only shows on an unfocused-and-empty component, though this is JBTextField's default and not overridden here) and no inline validation the way `bbjHomeField`/`nodeJsField` get via `ComponentValidator` (`BbjSettingsComponent.java:73-88`, `:112-130`) — both of those fields get a live red-underline `ValidationInfo` when their value is wrong; the compiler output field gets none, by explicit design ("no listener, no debounced lookup, no validator", line 91-93), deferring the entire "this is empty and required" signal to whatever balloon `output-directory-required` produces at compile time, minutes later. Concrete fix: at minimum, add a lightweight `ComponentValidator` mirroring the two existing ones that flags (not necessarily as an error, since the field is legitimately optional if the user only ever wants validate-only-style behavior once that's exposed) a blank value the same way the hint text already communicates it — or accept the current design but note it plainly in the settings dialog's javadoc as an intentional low-urgency gap, since D-05 in CONTEXT.md deliberately keeps this field simple and defers to the compile-time balloon.

---

## Detailed Findings

### Pillar 1: Copywriting (2/4)

- **Success balloon** (`CompileResultPresenter.java:47`, `Compiled "<file>"`): matches VS Code's own wording (`bbj-vscode`'s `Successfully compiled "<file>"` is actually slightly more verbose — IntelliJ's is terser but not worse; both are clear and specific). No complaint.
- **Four `run.failure`-derived reasons render an empty body** (Priority Fix #1) — `bbj-home-not-configured`, `bbjcpl-not-found`, `compile-timeout`, `spawn-failed` all get `body = orEmpty(message)` where `message` is never populated by the server. This is a genuine regression relative to the presenter's own stated design intent ("the four reasons a setting can fix append a short clause naming the cause") — two of these four (`bbj-home-not-configured`, `bbjcpl-not-found`) are also two of the four `offerSettings: true` reasons, meaning the most actionable balloons (the ones with a working "Open Settings" button) are also the ones with the least explanatory text.
- **`compile-errors`/`bbjcpl-error` titles carry no distinguishing clause** (Priority Fix #2) — every other failure reason's title names the cause; these two, which cover the two most common real-world failure paths (a syntax error in the user's own code, and an unparseable bbjcpl crash), do not.
- **`invalid-file-uri` clause** ("the file location is invalid") is honest but slightly generic for something that in practice should never be user-visible (it fires only for a non-`file://` URI, which the IntelliJ action always constructs from a `VirtualFile`) — low priority, not scored down further, since this is effectively a defensive/unreachable-in-practice branch.
- **The `default`/`reason == null` branch** (`CompileResultPresenter.java:54-57, 105-109`) correctly names the unrecognized reason value verbatim (`": " + reason`) rather than silently looking like success — this is a real strength, directly matching D-10's "no result shape can silently look like a success" requirement, and mirrors Phase 80's own well-reviewed `UNKNOWN`-backend handling instinct.
- **Server-side refusal messages** (`compile-command.ts:98,110,121`) are specific and instructive (`'Set the "bbj.compiler.output.directory" setting (or enable validate-only) before compiling.'`) — genuinely good copy, but this message only reaches `output-directory-required` and `invalid-options`, not the four `run.failure` reasons (the same gap as Priority Fix #1, visible from the server side too).
- No generic "OK"/"Submit"/"Click Here" labels anywhere in the audited files; the "Open Settings" notification action name is specific and consistent with Phase 80's own "Open Password Settings" precedent.
- **REM toggle and bracket-matching fixes carry zero new user-visible strings** (by design — these are silent behavioral corrections), so they don't move this pillar's score in either direction; scoring here is driven entirely by the compile balloon surface.

### Pillar 2: Visuals (3/4)

- Correct severity choice: `NotificationType.INFORMATION` for success, `NotificationType.ERROR` for every failure (`BbjCompileAction.java:135`) — appropriately harsher than Phase 80's `WARNING` choice, matching that a failed compile is a hard stop, not a soft caveat.
- The conditional "Open Settings" action (`BbjCompileAction.java:136-144`) is correctly gated on `presentation.offerSettings`, appearing only for the four settings-fixable reasons — good interaction design, directly reusing Phase 80's balloon-action pattern.
- **No visual distinction between a `compile-errors` failure (potentially dozens of `line:col message` lines) and a one-line `bbjcpl-error` failure** — both render through the identical `NotificationType.ERROR` balloon shape with no line-count-aware truncation, scroll affordance, or "N more errors" summarization; a file with 200 syntax errors would dump 200 lines into a single balloon body. This is a real gap Phase 79/80's audits didn't have to consider (their balloons were always one or two lines).
- The progress task title (`"Compiling " + fileName + "…"`) is clear and consistent with the balloon's own file-naming convention.
- Console mirroring (`BbjCompileAction.java:147-152`) duplicates the balloon's error text into the LS console verbatim rather than reformatting for a log context (e.g., no timestamp, no severity prefix) — acceptable, since `BbjServerService.logToConsole` presumably already timestamps, but not verified in this review (file not read).

### Pillar 3: Color (4/4)

- Zero hardcoded hex/RGB/`Color` values across `BbjCompileAction.java`, `CompileResultPresenter.java`, `BbjSettingsComponent.java`, `BbjPairedBraceMatcher.java`, `BbjCommenter.java`. Severity expressed exclusively through `NotificationType` enum values — correctly inherits IDE theme.
- No new color-bearing surface (e.g., a custom diagnostic-severity icon) was introduced; the diagnostics rendered in the balloon body are plain text, not colored spans. Scored at the ceiling — nothing to fault, same reasoning Phase 80 applied.

### Pillar 4: Typography (4/4)

- No `Font`, no point size, no custom `JLabel` styling anywhere in the five audited production files. The one new settings row (`compilerOutputDirectoryField`) is built with `TextFieldWithBrowseButton`/`JBLabel` exactly like the pre-existing `bbjHomeField` row two lines above it in `FormBuilder`'s chain (`BbjSettingsComponent.java:230-235`) — a genuine consistency strength, avoiding the kind of drift Phase 79 flagged in its own settings-dialog audit.
- The balloon/console text is entirely platform-rendered (`Notification`, `ConsoleViewContentType.ERROR_OUTPUT`) with zero custom typography code.

### Pillar 5: Spacing (3/4)

- The new "BBj Compiler" `TitledSeparator` + `addLabeledComponent` pair (`BbjSettingsComponent.java:234-235`) is byte-for-byte structurally identical to every other section in the same `FormBuilder` chain — same `1, false` label-alignment arguments, same nesting depth. No spacing regression.
- **The section's placement (between "BBj Environment" and "Node.js Runtime") is documented only in 81-04-SUMMARY.md's prose** ("closest to BBj home and config.bbx path") **and is not pinned by any test** — `CompilerOutputDirectorySourceGuardTest` (per the SUMMARY's own D3 coverage) asserts the row exists and offers a directory chooser, but nothing in the described coverage asserts *where* in the form it sits relative to the other `TitledSeparator`s. A future edit could silently relocate it to the bottom of the dialog, after "Run Commands," without failing any test — a minor but real regression risk for a form that already has seven sections.
- No arbitrary/magic spacing values (`[Npx]`-style) exist in this Swing codebase's vocabulary — not applicable, scored on `FormBuilder` consistency instead per the Phase 80 adaptation convention.

### Pillar 6: Experience Design (2/4)

- **Loading state:** correctly implemented — `Task.Backgroundable` with a titled progress indicator (`"Compiling <file>…"`), off the EDT, per Phase 79's own convention (`assertIsNonDispatchThread()` as the first statement). Good.
- **Error states exist for all nine outcomes, but four render with an empty body** (Priority Fix #1) — the same content-completeness gap scored under Copywriting recurs here as an experience gap: a user hitting `bbj-home-not-configured` gets a title-only balloon and must already know to click "Open Settings" on faith, with no in-balloon confirmation of what's actually missing.
- **No confirmation needed for the compile action itself** — compiling is non-destructive to source (the D-05 guard specifically exists to prevent an in-place overwrite of the source file), and the "Open Settings" balloon action is low-risk and reversible; correctly un-confirmed.
- **The unconditional pre-compile save** (`BbjCompileAction.java:65-71`) has no user-visible indication that a save just happened — for a user who explicitly avoids auto-save and is mid-edit on a file they don't want persisted yet, "Compile BBj File" silently writes their buffer to disk with no warning. This is called out as an explicit, deliberate design decision in the SUMMARY (D-04, "independent of autoSaveBeforeRun") and matches VS Code parity, so it is not scored as a defect on its own — but it is exactly the kind of silent side effect the Experience Design pillar exists to catch, and there is no console line, no toast, nothing marking that the save occurred, only the compile result.
- **Three human-UAT items are honestly flagged as unverified at review time** (81-02's D5: live bracket inertness in an editor; 81-04's D7: live settings dialog behavior including the hint text's actual visibility and the folder chooser; 81-05's D7: live balloon/console round trip including the diagnostics rendering, "Open Settings" action target, and IDE responsiveness during a large-file compile) — this is good process transparency matching Phase 79/80's own practice, but it does mean this review's Pillars 2 and 6 findings about visual balloon shape and empty-body severity are based on static code reading, not a confirmed on-screen rendering.
- **The `compile-timeout` reason has no visible retry affordance** — unlike the four settings-fixable reasons, a timeout offers no "Retry" action, only a plain error balloon; for a large file that legitimately needs more than 45s client-side / 30s server-side, the user's only recourse is re-invoking the whole action from the toolbar/menu — acceptable but worth noting as a missed low-cost affordance.

---

## Registry Safety

Not applicable — this is a Java/Gradle IntelliJ plugin plus a TypeScript language server with no `components.json`/shadcn registry. Skipped per audit instructions.

---

## Files Audited

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/compile/CompileResultPresenter.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjPairedBraceMatcher.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjCommenter.java`
- `bbj-vscode/src/language/compile-command.ts`
- `bbj-vscode/src/language/bbj-cpl-service.ts` (CompileRun interface and compile()'s failure-reason surface)
- `.planning/phases/81-feature-parity-and-correctness/81-01-SUMMARY.md` through `81-05-SUMMARY.md`
- `.planning/phases/81-feature-parity-and-correctness/81-01-PLAN.md` through `81-05-PLAN.md` (referenced, not fully re-read — summaries and source were treated as the authoritative record of what shipped)
- `.planning/phases/81-feature-parity-and-correctness/81-CONTEXT.md`
- `.planning/phases/80-em-token-security/80-UI-REVIEW.md` (baseline/convention reference)

---
*Phase: 81-feature-parity-and-correctness*
*Reviewed: 2026-09-05*
