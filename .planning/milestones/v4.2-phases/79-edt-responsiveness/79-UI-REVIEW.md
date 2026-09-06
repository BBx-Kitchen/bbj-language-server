# Phase 79 — UI Review

**Audited:** 2026-09-04
**Baseline:** Abstract 6-pillar standards, adapted for a Java/Swing IntelliJ Platform plugin (no HTML/CSS, no UI-SPEC.md for this phase)
**Screenshots:** not captured — this is an IntelliJ plugin (Swing/IntelliJ Platform UI), not a web frontend; no dev server exists at localhost. Audit is code-only, reading `BbjSettingsComponent.java`, `BbjSettingsConfigurable.java`, the notification providers, and the status-bar widgets directly.

Two pillars (Color, Typography) do not meaningfully apply to Swing components rendered through the IntelliJ Platform LaF — there is no stylesheet or Tailwind-equivalent token system in this codebase. Those pillars are scored against **platform-default adherence** (does the code use `JBLabel`/`JBUI`/platform components correctly, or does it fight the platform with hardcoded fonts/colors/pixel values) rather than against a design system that doesn't exist here.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 2/4 | Inconsistent terminology and node-version copy; some messages assume technical context the user doesn't have |
| 2. Visuals | 3/4 | Clear panel-per-section structure via `TitledSeparator`, but crash/notification actions have no visual severity differentiation beyond icon color |
| 3. Color | 3/4 | Fully platform-default (`EditorNotificationPanel.Status.Error/Warning`, `NotificationType`) — appropriate reliance on the IDE's own color system, no hardcoded values found |
| 4. Typography | 3/4 | Platform-default fonts/JBLabel throughout; no hardcoded font sizes found, but no visual weight differentiation between the pending "Checking…" state and settled results |
| 5. Spacing | 3/4 | `FormBuilder` produces standard IntelliJ Settings-page spacing; acceptable platform default, no arbitrary spacing found |
| 6. Experience Design | 2/4 | New debounced/async flow has real gaps: no visible error state for a failed lookup, disabled combo box gives no reason why, WR-03's flush is a documented regression risk still pending human verification |

**Overall: 16/24**

---

## Top 3 Priority Fixes

1. **The disabled classpath combo box gives no reason it's disabled, and results in a dead-end state on lookup failure.** User impact: when `BbjSettingsLookups.lookupHome` finds an invalid BBj home, `applyHomeLookup` (BbjSettingsComponent.java:252-256) resets the combo to `List.of("(set BBj home first)")` even if the home field is *not* empty — the placeholder text is factually wrong once a (invalid) path has been typed, and the only feedback that anything is wrong is a `ComponentValidator` red-underline error on a different field. A user staring at the classpath dropdown alone has no idea why it's stuck in a "set BBj home first" state when they've already set it (just incorrectly). Concrete fix: give the combo a distinct placeholder for "home path set but invalid" vs. "home path empty," e.g. `"(fix BBj home path above)"` vs `"(set BBj home first)"`.

2. **WR-03's flush-before-read reintroduces synchronous EDT filesystem I/O on Apply/OK, and the human-verification step this shipped with was never closed out.** User impact: clicking Apply/OK within the ~300ms debounce window after typing a new BBj home re-triggers a blocking `BbjSettingsLookups.lookupHome(...)` call directly on the EDT (`BbjSettingsComponent.java:333-338`, called from `BbjSettingsConfigurable.apply()`), which is exactly the class of bug this phase exists to eliminate, just narrowed to one call site instead of every keystroke. The 79-REVIEW-FIX.md explicitly flags this fix as "requires human verification" and no artifact in this phase's directory records that verification happening. Concrete fix: either complete and record the manual verification pass (type new home, click Apply immediately, confirm persisted classpath matches), or replace the synchronous flush with a disabled-Apply-button approach while a lookup is pending, closing the EDT gap entirely instead of narrowing it.

3. **No error/failure state exists for a lookup that raises an exception, only for "not found"/"invalid" results.** User impact: `applyNodeLookup` and `applyHomeLookup` (BbjSettingsComponent.java:249-287) handle `exists()`/`valid()`/`meetsMinimum()` booleans from a successful lookup, but nothing in the reviewed code shows what happens if `BbjSettingsLookups.lookupNode`/`lookupHome` throws (e.g., a permissions error reading `cfg/`, or an `IOException` spawning `node --version`) inside the debounced background task. If the debounced task's `Runnable` throws, the field is left showing "Checking Node.js version…" indefinitely with no way for the user to know the lookup failed rather than being slow. Concrete fix: wrap the background lookup call in `KeystrokeDebouncer`/`AlarmScheduler`'s execution path with a try/catch that posts a distinct "Lookup failed: {message}" state back to the EDT, so pending state never gets stuck forever.

---

## Detailed Findings

### Pillar 1: Copywriting (2/4)

- Terminology drifts across surfaces for the same underlying concept. The Settings dialog's transient label reads `"Checking Node.js version…"` (BbjSettingsComponent.java:207) while the settled states read `"Detected: {version}"`, `"Could not detect Node.js version"`, and `"Version too old (minimum: 18), detected: {version}"` (lines 279-283) — three different sentence shapes for what is conceptually one status line. A single consistent template (e.g., always `"Node.js: {status}"`) would read better as a status field.
- `"Version too old (minimum: 18), detected: {version}"` (line 281) omits units/context — a user unfamiliar with Node.js won't know "18" refers to a major version number without already knowing Node's release-numbering convention. Compare to the validator's fuller phrasing two lines earlier and elsewhere: `"Node.js version 18 or higher is required"` (line 110) — the two messages describing the same failure condition in the same file use different wording and structure.
- The crash-notification editor banner text is appropriately plain: `"BBj Language Server has crashed. Language features are unavailable."` (BbjServerCrashNotificationProvider.java:45) — clear, no jargon, states impact. This is a genuine strength.
- The balloon after two crashes reads `"BBj Language Server crashed unexpectedly"` / `"The server crashed twice and has been stopped. Check the log for details."` (BbjServerService.java:176-177) — good, tells the user what happened and what to do.
- `BbjMissingNodeNotificationProvider`'s banner `"Node.js 18+ is required to run the BBj language server"` (line 64) is clear and consistent with the Settings dialog's phrasing style, unlike the two Settings-dialog messages noted above disagreeing with each other.
- The download-progress `ProgressIndicator` text strings (`"Downloading Node.js {version}..."`, `"Verifying Node.js archive..."`, `"Extracting Node.js binary..."`, `"Installing Node.js to plugin directory..."` — BbjNodeDownloader.java:84,130,139,147,154) are a genuinely good progressive-disclosure sequence: each phase is named, present-tense, and matches the increasing `setFraction` value. This is the strongest copy in the phase's surfaces.
- No generic "OK"/"Cancel"/"Submit" labels found in the audited files — actions use specific verbs (`"Restart Server"`, `"Show Log"`, `"Download Node.js"`, `"Configure Node.js Path"`, `"Install Node.js Manually"`).

### Pillar 2: Visuals (3/4)

- `BbjSettingsComponent`'s `FormBuilder` layout groups related fields under six `TitledSeparator`s ("BBj Environment", "Node.js Runtime", "Classpath", "Language Server", "Java Interop", "Enterprise Manager", "Run Commands") — a clear, scannable hierarchy appropriate for a Settings page (lines 215-241).
- The pending-lookup state has no distinct visual treatment beyond text change — the "Checking Node.js version…" label uses the same `JBLabel` styling as the settled "Detected: …" result (no italic, no muted color, no spinner/progress icon). A user glancing at the field mid-lookup cannot visually distinguish "still working" from "this is the final answer" without reading the text carefully. Given the phase's whole purpose is making this async, a stronger in-progress visual cue (e.g., `AnimatedIcon.Default()` next to the label, following IntelliJ Platform convention for in-flight operations) would better communicate the new asynchronous behavior to users who are used to instant validation.
- The crash-notification banner and the missing-Node banner both correctly use `EditorNotificationPanel.Status.Error` / `.Warning` to differentiate severity — an appropriate use of the platform's built-in visual hierarchy rather than inventing custom severity indicators.
- Icon-only affordances: none of the audited action labels are icon-only (`createActionLabel` always takes a text label) — no aria-label-equivalent concern here, unlike a typical icon-button web audit.

### Pillar 3: Color (3/4 — platform-default baseline)

- No hardcoded hex/RGB colors found in any of the seven audited files (`BbjSettingsComponent.java`, `BbjServerCrashNotificationProvider.java`, `BbjMissingNodeNotificationProvider.java`, `BbjServerService.java`, `BbjNodeDownloader.java`). Severity is expressed exclusively through platform enums: `EditorNotificationPanel.Status.Error`, `.Warning`, `NotificationType.ERROR`, `.WARNING`, `.INFORMATION`. This is the correct pattern for an IntelliJ plugin — it inherits the user's active theme (light/dark/high-contrast) automatically instead of the plugin re-implementing color logic.
- Scored 3 rather than 4 only because the phase introduces no new severity/state surface that could have tested this further (e.g., the "lookup failed" gap noted in Pillar 6 also means there's no color-coded failure state to evaluate) — nothing to dock, but nothing to distinguish as exceptional either.

### Pillar 4: Typography (3/4 — platform-default baseline)

- All labels use `JBLabel`/`JBTextField`, IntelliJ's DPI-aware, theme-aware label components — no `new JLabel(...)` or raw AWT/Swing font-setting calls found in the audited files. No hardcoded `Font` objects, point sizes, or `setFont()` calls.
- As noted under Visuals, the one place typography could carry information the copy alone cannot (distinguishing pending vs. settled states) is not used — everything renders at the same weight/style. This is a missed opportunity rather than a defect, hence 3 not 4.

### Pillar 5: Spacing (3/4 — platform-default baseline)

- `FormBuilder.createFormBuilder()...addLabeledComponent(..., 1, false)` (BbjSettingsComponent.java:215-241) delegates all vertical/horizontal spacing to IntelliJ's standard forms layout, which itself uses `JBUI.scale(...)`-based DPI-aware spacing internally. No arbitrary pixel offsets, no manual `setBorder(new EmptyBorder(...))` calls, no magic-number insets found in the audited files.
- Nothing found to elevate this above the platform-default baseline (no manual grid alignment refinements, no custom spacing constants introduced by this phase), so scored at 3, not 4.

### Pillar 6: Experience Design (2/4)

This is the pillar phase 79 most directly targets (EDT responsiveness is fundamentally an experience-design concern — don't freeze the UI), and it's also where the most substantive gaps remain:

- **Loading state exists but is incomplete.** The debounced Node/home lookups correctly show a pending indicator (`"Checking Node.js version…"`, disabled classpath combo) while work runs off the EDT — this is the phase's core deliverable and it's present and correctly wired per the SUMMARY files' test coverage (`KeystrokeDebouncerTest`, `BbjSettingsComponentSourceGuardTest`).
- **No failure/error path for the lookup itself**, as detailed in Priority Fix #3 above — only domain-level "not found"/"invalid" results are handled, not lookup exceptions. If `BbjSettingsLookups.lookupNode`/`lookupHome` throws, the pending state (Priority Fix #3) is never resolved, leaving the UI stuck.
- **The disabled-combo placeholder text is misleading post-lookup**, as detailed in Priority Fix #1 — "(set BBj home first)" persists even when a home path has been entered but is invalid, actively misinforming the user about the state of the system.
- **The WR-03 flush-before-read fix is a known, documented, unresolved regression risk** (Priority Fix #2) — the 79-REVIEW-FIX.md itself flags "A developer should confirm this tradeoff is acceptable and, ideally, exercise the actual IntelliJ Settings dialog manually," and no follow-up artifact in this phase directory shows that happened. Shipping a fix whose own fix-report says "this needs human eyes" without recording that the human eyes looked is an experience-design process gap, not just a code gap.
- **Confirmation for destructive/disruptive actions:** the crash-notification "Restart" action and the download-success "Restart Language Server" action both fire immediately with no confirmation — reasonable for a restart (low-risk, reversible), so not penalized here.
- **Coalescing/debounce behavior itself is well covered** by `RestartGateTest`'s new concurrency test (WR-01 fix) and `DownloadGuardTest`'s 8-thread race test — the underlying mechanics this phase set out to fix are solid; the deductions above are about the user-facing edges of that mechanism (what happens when a lookup fails, what the disabled state communicates) rather than the concurrency engineering itself.

---

## Registry Safety

Not applicable — this is a Java/Gradle IntelliJ plugin project with no `components.json`/shadcn registry. Skipped per audit instructions.

---

## Files Audited

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProvider.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java`
- `.planning/phases/79-edt-responsiveness/79-01-SUMMARY.md`
- `.planning/phases/79-edt-responsiveness/79-02-SUMMARY.md`
- `.planning/phases/79-edt-responsiveness/79-03-SUMMARY.md`
- `.planning/phases/79-edt-responsiveness/79-01-PLAN.md` (referenced via CONTEXT/SUMMARY; not separately re-read in full)
- `.planning/phases/79-edt-responsiveness/79-CONTEXT.md`
- `.planning/phases/79-edt-responsiveness/79-REVIEW-FIX.md`

---
*Phase: 79-edt-responsiveness*
*Reviewed: 2026-09-04*
