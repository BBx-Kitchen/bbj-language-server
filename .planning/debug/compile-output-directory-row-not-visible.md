---
status: diagnosed
trigger: "compile-output-directory-row-not-visible: After installing the freshly built IntelliJ plugin zip (bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip, built from HEAD 537546ec), the user opened Settings > Languages & Frameworks > BBj and reports the \"BBj Compiler\" section / \"Compile output directory:\" row is NOT visible. Phase 81 plan 81-04 (PARITY-01, GitHub issue #571) claims to have added this row to the BBj settings configurable."
created: 2026-09-05T00:00:00Z
updated: 2026-09-05T00:00:00Z
audit_acknowledged:
  milestone: v4.2
  at: 2026-09-06
  status: diagnosed
---

## Current Focus

hypothesis: All 5 investigation-hint hypotheses (stale artifact / wrong configurable / conditional row / component not added to layout / stale-installed-version) are eliminated by direct evidence. Remaining leading candidate: a runtime exception during `BbjSettingsComponent`'s constructor at the one genuinely novel line 81-04 introduced — `((JBTextField) compilerOutputDirectoryField.getTextField()).getEmptyText().setText(...)` — which, if it throws, would abort the whole constructor before the single FormBuilder chain that builds `mainPanel` ever runs (since that chain is the last statement in the constructor, executed after every field including this one is constructed).
test: N/A further in this environment — no live IntelliJ GUI available to reproduce. Needs idea.log inspection from the user's actual test session, and clarification of whether the REST of the BBj settings page (BBj home, Node.js Runtime, Classpath, etc.) rendered normally or was also blank/broken.
expecting: If idea.log shows a ClassCastException/other exception naming BbjSettingsComponent at the time Settings > BBj was opened, and the user confirms the WHOLE page was blank (not just the compiler row), this hypothesis is confirmed. If the rest of the page rendered fine (BBj home/Node.js/etc. all visible) with only the compiler row missing, this hypothesis is FALSIFIED (a full-constructor exception cannot produce a partial-row omission), and the mechanism must be something not yet found — re-open investigation focused on IDE-side Configurable caching/instance reuse across restarts, or an IDE build too old for FormBuilder API used here.
next_action: Hand off to caller (find_root_cause_only mode) — investigation exhausted the evidence available without a live IntelliJ IDE session; report INVESTIGATION INCONCLUSIVE with the discriminating test spelled out.

## Symptoms

expected: Settings > Languages & Frameworks > BBj shows a "BBj Compiler" section containing a "Compile output directory:" row with a folder chooser and hint text while empty; the value persists across Apply/reopen; Apply restarts the language server; Reset restores the saved value.
actual: User reported verbatim: "not visible". The settings page opens but no such section/row is shown.
errors: None reported
reproduction: Test 3 in .planning/phases/81-feature-parity-and-correctness/81-UAT.md. Install the plugin zip, open Settings > Languages & Frameworks > BBj.
started: Discovered during UAT of phase 81, 2026-09-05, immediately after building the plugin with `npm run build` in bbj-vscode then `./gradlew buildPlugin` in bbj-intellij (many tasks UP-TO-DATE: :jar, :instrumentedJar, :composedJar; only :prepareSandbox, :prepareJarSearchableOptions, :prepareTest, :test, :verifyLanguageServerBundle, :buildPlugin executed).

## Eliminated

- hypothesis: "H1 — Stale build artifact: the plugin jar inside bbj-intellij-0.1.0.zip predates the 81-04 source commits and lacks the compiler-output-directory settings code."
  evidence: "git log shows the two commits touching BbjSettingsComponent.java/BbjSettingsConfigurable.java (f27bbe0e feat, 2f1ba31e chore) committed at 2026-09-05T11:10:18Z and 11:28:54Z. The zip (bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip) and its inner bbj-intellij-0.1.0.jar are timestamped 2026-09-05 13:21 in `unzip -l` — after both commits. Unzipping the jar and running `strings` on BbjSettingsComponent.class / BbjSettingsConfigurable.class shows the literals `compilerOutputDirectoryField`, `BBj Compiler`, `Compile output directory:`, `getCompilerOutputDirectory`, `setCompilerOutputDirectory`, `compilerOutputDirectory` present in the actual compiled bytecode shipped in the zip the user installed."
  timestamp: 2026-09-05T00:10:00Z
- hypothesis: "H2 — The row exists but is wired into a different Configurable/settings page than Languages & Frameworks > BBj."
  evidence: "plugin.xml (both in source and re-extracted from inside the shipped jar) registers exactly one `<applicationConfigurable parentId=\"language\" instance=\"com.basis.bbj.intellij.BbjSettingsConfigurable\" id=\"com.basis.bbj.intellij.BbjSettingsConfigurable\" displayName=\"BBj\"/>` — parentId=\"language\" is the standard Languages & Frameworks group, matching the page the user opened and unchanged by 81-04 (it registered the same Configurable class other, working fields already use)."
  timestamp: 2026-09-05T00:11:00Z
- hypothesis: "H3 — The row is added conditionally and the condition is false in the user's IDE."
  evidence: "Read BbjSettingsComponent.java in full: `compilerOutputDirectoryField` construction (lines 90-101) and its `.addComponent(new TitledSeparator(\"BBj Compiler\")).addLabeledComponent(...)` insertion into the FormBuilder chain (lines 234-235) are both unconditional — no `if`, no feature flag, no null-check gating them. Same for BbjSettingsConfigurable's isModified/apply/reset wiring (lines 56, 79, 154-155) — plain unconditional statements mirroring configPath's pattern exactly."
  timestamp: 2026-09-05T00:12:00Z
- hypothesis: "H4 — The panel is built but the row's component is never added to the returned layout."
  evidence: "The single FormBuilder chain in BbjSettingsComponent's constructor (lines 229-258) explicitly includes `.addComponent(new TitledSeparator(\"BBj Compiler\"))` followed by `.addLabeledComponent(new JBLabel(\"Compile output directory:\"), compilerOutputDirectoryField, 1, false)` between the \"BBj Environment\" and \"Node.js Runtime\" sections, and `.getPanel()` is called on this same chain to produce `mainPanel`, which `getPanel()` returns to the Configurable. The compiled class's constant pool (proven via the H1 strings dump) contains these exact literals, confirming this is live code, not dead/unreachable code."
  timestamp: 2026-09-05T00:13:00Z
- hypothesis: "H5 — The user's IDE kept a previously-installed older plugin loaded because the version string (hardcoded fallback \"0.1.0\", never overridden — bbj-intellij/gradle.properties has never defined a `version` property in the project's entire git history) didn't change, so 'Install Plugin from Disk' silently no-op'd."
  evidence: "This predicts ALL new 81-phase behavior would be invisible, not just the settings row. But 81-UAT.md test 1 (bracket inertness inside strings/rem comments, PARITY-02/#568) and test 2 (case-insensitive REM toggle round trip, PARITY-03/#540) both result: pass in the SAME live-IDE session against the SAME rebuilt plugin used for test 3. Those are also brand-new behaviors added in this exact build (81-02, 81-03). If the IDE were still running a pre-81 plugin, those editor-level features would have failed too. Since they passed, the freshly built jar's new code WAS loaded and active — H5 is contradicted, not just unconfirmed."
  timestamp: 2026-09-05T00:14:00Z

## Evidence

- timestamp: 2026-09-05T00:05:00Z
  checked: "git log on BbjSettingsComponent.java, BbjSettingsConfigurable.java, BbjSettings.java, lsp/BbjLanguageServerFactory.java, lsp/CompilerInitOptions.java"
  found: "Last commits: 2f1ba31e (chore, 11:28:54Z), f27bbe0e (feat 81-04, 11:10:18Z), both well before HEAD 537546ec (13:30:56Z, a later UAT-session docs commit) and before the reported plugin-zip build."
  implication: "HEAD genuinely contains the 81-04 feature; the reported 'built from HEAD 537546ec' claim is consistent with the source tree."
- timestamp: 2026-09-05T00:15:00Z
  checked: "bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip contents (unzip -l) and its inner jar's plugin.xml"
  found: "zip built 2026-09-05 13:21. Inner bbj-intellij-0.1.0-searchableOptions.jar is stale (dated 2026-09-04 06:10, one day+ older than the main jar/zip) and its p-com.basis.bbj-searchableOptions.json contains ONLY ActionManager-sourced entries (action names/descriptions) — zero Configurable/settings-UI-label entries for ANY BBj setting (not just the new one; BBj home, Node.js path, etc. are also absent from this index). This appears to be a pre-existing gap in buildSearchableOptions coverage for this plugin's Configurable, unrelated to 81-04, and irrelevant to direct Settings-tree navigation (only affects the Settings search box)."
  implication: "Confirms the zip is a genuine fresh build (H1 eliminated) and surfaces a minor, likely pre-existing, unrelated side-issue (stale/incomplete searchableOptions index) that is not the reported symptom's mechanism since the user navigated directly via Languages & Frameworks tree, not via search."
- timestamp: 2026-09-05T00:16:00Z
  checked: "build.gradle.kts version handling and bbj-intellij/gradle.properties git history"
  found: "`version = providers.gradleProperty(\"version\").getOrElse(\"0.1.0\")`; gradle.properties has exactly one commit in its entire history (e97c5870, initial Gradle wrapper setup) which only ever added `org.gradle.jvmargs`. No commit has ever set a `version` property. Every local build of this plugin, across the project's entire history, has therefore produced plugin version \"0.1.0\"."
  implication: "Confirms the version-collision mechanism in H5 is structurally always present (not new to this build) — but per the Eliminated section, prior/same-session UAT evidence (tests 1 & 2 passing) shows this collision does not actually block IntelliJ from loading fresh plugin code in this user's workflow, so it is not the operative cause here."
- timestamp: 2026-09-05T00:17:00Z
  checked: "BbjSettingsComponent.java diff for what 81-04 changed vs. the pre-existing, already-proven-working bbjHomeField/nodeJsField TextFieldWithBrowseButton patterns"
  found: "compilerOutputDirectoryField is constructed identically to bbjHomeField (same TextFieldWithBrowseButton() no-arg ctor, same FileChooserDescriptorFactory.createSingleFolderDescriptor() pattern, same TextBrowseFolderListener wiring) EXCEPT for one extra line with no precedent anywhere else in the file: `((JBTextField) compilerOutputDirectoryField.getTextField()).getEmptyText().setText(...)`. 81-04-SUMMARY.md's own 'Process Note' flags this as a cast the executing agent had to add, verified only via `javap` disassembly against the intellijIdeaCommunity(\"2024.2\") SDK jar used to compile (bbj-intellij/build.gradle.kts pins this exact SDK version for compileClasspath), not against any other IDE build. plugin.xml declares `sinceBuild=\"242\"` and `untilBuild = provider { null }` (unbounded upper compatibility)."
  implication: "This is the single genuinely novel runtime-type assumption 81-04 introduced into BbjSettingsComponent, and it sits inside the same constructor that later builds and returns `mainPanel` via the one FormBuilder chain at the end of the constructor. If this cast throws in the user's actual (possibly much newer than 2024.2, given untilBuild is unbounded) IDE, the whole constructor aborts before the FormBuilder chain runs, and createComponent() would fail for the ENTIRE BBj settings page (not just this one row)."
- timestamp: 2026-09-05T00:18:00Z
  checked: "Public documentation/source behavior of com.intellij.openapi.ui.TextFieldWithBrowseButton (web search of JetBrains/intellij-community source)"
  found: "TextFieldWithBrowseButton's no-arg constructor has long created an internal `ExtendableTextField(10)` (which extends JBTextField) specifically to prevent infinite resize in grid-box layouts; the class's own internal logic also explicitly checks `instanceof JBTextField` and branches (adds undo/redo actions only when true) rather than assuming it — indicating IntelliJ's own authors don't treat the JBTextField-ness as an unconditional invariant across all constructor overloads/versions, even though the no-arg constructor path has stably produced a JBTextField-derived field for a long time."
  implication: "Weakens confidence that this specific cast is the actual failure mechanism (the no-arg ctor -> ExtendableTextField behavior is stable and well-documented across many IDE versions), while not fully ruling it out — cannot be resolved further without either a live IDE session/idea.log from the user's actual environment, or knowing the user's exact IntelliJ build number, neither of which is available in this environment."

## Resolution

root_cause: "Not conclusively identified. All 5 hint hypotheses (H1-H5) are eliminated by direct evidence (build artifact is fresh and contains the feature in both source and compiled bytecode; Configurable registration is correct and unchanged; the row is added unconditionally; the FormBuilder chain explicitly includes it; and the 'stale old plugin still loaded' theory is contradicted by sibling 81-phase editor features passing in the same live-IDE session against the same rebuild). The leading remaining candidate — a runtime exception at the one novel line 81-04 added (`(JBTextField) compilerOutputDirectoryField.getTextField()` cast, verified only against the compile-time 2024.2 SDK, plugin declares an unbounded untilBuild) aborting the whole BbjSettingsComponent constructor before the FormBuilder panel is built — is plausible but only weakly supported: IntelliJ's own TextFieldWithBrowseButton no-arg constructor has stably produced a JBTextField-derived field for many platform versions, and this hypothesis predicts the ENTIRE settings page fails to render, which is a stronger symptom than the reported 'this one row is not visible' framing implies (though that framing came from the debug task's paraphrase, not a verified direct user quote about the rest of the page)."
fix: ""
verification: ""
files_changed: []

## Resolution (2026-09-05T14:04:41Z)

User re-tested: the row IS visible. Root cause was environmental, not code: IntelliJ auto-updated the BBj plugin from the Marketplace during the UAT session, replacing the locally installed build (same version string 0.1.0). Gap G-81-3 withdrawn. Follow-up idea captured in 81-UAT.md Deferred Follow-Ups: give interim/local builds a version that always sorts above Marketplace releases.
