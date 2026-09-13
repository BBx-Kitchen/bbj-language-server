# Phase 84 — UI Review

**Audited:** 2026-09-06
**Baseline:** abstract 6-pillar standards (no UI-SPEC.md; surfaces are a VS Code extension and an IntelliJ/Swing plugin, not a web frontend)
**Screenshots:** not captured — no dev server/browser surface applies; audited by source reading of `extension.ts`, `setopts-composer-ui.ts`, `config-path-cache.ts`, `Commands.cjs`, `package.json` (VS Code), and `BbjLanguageClient.java`, `BbjRunActionBase.java`, `BbjRunBuiAction.java`, `BbjSettingsComponent.java`, `BbjSettingsLookups.java`, `BbjConfigFileType.java`, `bbj-config.svg`/`bbj-config_dark.svg`, `plugin.xml` (IntelliJ)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 2/4 | Terminology for the same concept splits three ways across the two hosts ("config file" / "config.bbx file" / "config.bbx Path:" / "BBj config file") and two nearly-duplicate "no config" error strings coexist in VS Code alone |
| 2. Visuals | 3/4 | Icon is a plain neutral gear (not a BBj-branded mark), correctly split light/dark, but is otherwise the only visual signal for a whole new file classification with no CodeLens/gutter equivalent on the IntelliJ side |
| 3. Color | 3/4 | No new hardcoded RGB was introduced in the reviewed files; the two SVG icons use flat grayscale strokes appropriate to IntelliJ's own file-icon convention, but the warning surfaces (balloon vs. `showWarningMessage`) carry no severity differentiation of their own beyond the platform default |
| 4. Typography | 4/4 | No new font/size/weight introduced anywhere in this phase's touched UI files |
| 5. Spacing | 4/4 | `BbjSettingsComponent`'s config field reuses the existing `addLabeledComponent` layout row exactly as every other settings field does; no arbitrary spacing added |
| 6. Experience Design | 3/4 | Loading/error/empty states are real and substantive (missing-file balloons, inline non-blocking validation, blank-path aborts), but the SETOPTS discoverability hint and the IntelliJ file-type change are asymmetric across hosts, exactly as the UAT already flagged |

**Overall: 19/24**

---

## Top 3 Priority Fixes

1. **Config-path terminology is inconsistent within a single host, not just across hosts** (`bbj-vscode/package.json:596` "the BBj config file" vs. `bbj-vscode/package.json:84` command title "Show the Active Config File" vs. `bbj-vscode/src/Commands/Commands.cjs:228`/`:238` "Config file not found"/"No config file is configured" vs. `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java:281` field label "config.bbx Path:") — a user reading the VS Code setting description, the command palette, an error toast, and the IntelliJ Settings dialog in one sitting sees four different names for one file, one of which ("config.bbx Path:") re-introduces the exact filename-specific wording D-10/D-08 explicitly removed elsewhere to stop implying a fixed name. Fix: standardize on "config file" (lowercase, no filename) everywhere a resolved/generic file is meant, and rename the IntelliJ label to "Config File Path:" or "Config Path:" to match the setting's own generic meaning.

2. **Two structurally distinct "no config path" error messages exist side by side in the same file with no cross-reference** (`bbj-vscode/src/Commands/Commands.cjs:27` `NO_CONFIG_PATH_MESSAGE` — "No config file could be resolved for this run. Set the ... or configure bbj.home ..." — vs. `Commands.cjs:227-228` `openConfigFile`'s own inline string — "No config file is configured. Set the ... bbj.configPath ... setting to choose one.") — one names two possible remedies (`bbj.configPath` or `bbj.home`), the other names only one (`bbj.configPath`) even though the same fallback-to-home-default logic applies to both call sites. A user who hits the weaker message and follows its single instruction may still get nothing if the real problem is `bbj.home`. Fix: route both callers through the same shared message constant.

3. **The SETOPTS discoverability hint and file-type change have no IntelliJ-side counterpart**, confirmed by the UAT's own Test 2/Test 3 notes (`84-UAT.md` lines 19-27) — VS Code's `argForActiveEditor()` (`bbj-vscode/src/setopts-composer-ui.ts:63-80`) tells a user opening the wrong config file which one is actually active, and gets a CodeLens/Code Action to compose SETOPTS lines; IntelliJ gets the file-type/icon/highlighting treatment (this phase) but no equivalent "you're editing the wrong file" signal and no SETOPTS affordance at all (deferred to Phase 87). A tester unaware of this split will file it as a bug. Fix: either add a one-line note to the IntelliJ Settings dialog or config-file balloon path pointing at the still-active file when the open one differs (mirroring the VS Code hint's wording), or explicitly call out the gap in end-user release notes for this phase so it isn't rediscovered as a defect.

---

## Detailed Findings

### Pillar 1: Copywriting (2/4)

- The VS Code setting description (`package.json:596`) is genuinely good copywriting: it states the resolver's actual rules (absolute-only, tilde expansion, stated default) rather than vague prose — a real improvement matching D-11's decision text almost verbatim.
- The renamed command title "Show the Active Config File" (`package.json:84`) correctly drops the old filename promise per D-10 — good.
- But the same phase reintroduces filename-specific language on the IntelliJ side: `BbjSettingsComponent.java:281`'s `addLabeledComponent(new JBLabel("config.bbx Path:"), ...)` is the literal regression D-08/D-10 were written to prevent (a fixed filename implied where none is guaranteed) — the field's own placeholder text one line above it, `"{BBj Home}/cfg/config.bbx (default)"` (line 154), correctly frames `config.bbx` as only the *default*, but the label contradicts that framing.
- `ConfigPaths`/`config-path-resolver.ts` unify "config file" as the term of art in code comments and most user strings, but three different literal phrasings reach the user for the identical missing-file condition: VS Code's `"BBj config file not found or unreadable: ..."` (`extension.ts:888`, this phase), IntelliJ's `"BBj config file not found"` title + `"No prefixes were loaded from: ..."` body (`BbjLanguageClient.java:88-89`), and `Commands.cjs`'s own `"Config file not found: ${configPath}"` (`Commands.cjs:238`). None is wrong on its own, but a user working across both IDEs, or reading two VS Code error paths in one session, will notice they don't match word-for-word despite describing the same event — a missed opportunity to share one string constant across hosts (already the pattern used for `NO_CONFIG_PATH_MESSAGE` within a single host, just not extended further).
- `BbjSettingsComponent.java:173`'s inline validation string "File not found: " + path is terse and accurate but doesn't say what happens next (the D-15 contract is "Apply is still allowed" — a first-time user seeing a red/orange marker next to a field with no further explanation may assume Apply is blocked, since that is the more common IntelliJ validator convention for a hard error look).
- `argForActiveEditor`'s hint text ("This isn't the active config file — BBj tooling reads: ${activeConfigPath}") is exactly the wording style D-08 asked for and is the standout string in this phase — specific, names the actual path, and does not block the user's current action.

### Pillar 2: Visuals (3/4)

- The new file icon (`bbj-config.svg`/`bbj-config_dark.svg`) is a generic gear/settings glyph, not the BBj product mark used elsewhere in the plugin (`BbjIcons` for run/compile actions use branded icons per the `82-UI-REVIEW.md` precedent's icon conventions) — a reasonable choice for a "configuration" file conceptually, but it means a config file is visually indistinguishable, at a glance, from any other tool's generic settings-file icon in a multi-language project tree. Not a defect per se (IntelliJ's own bundled file types frequently use a gear for config), but worth flagging since the VS Code side (`package.json:55-58`) reuses this exact same gear pair, so the choice is at least consistent across both hosts.
- Light/dark variants are both present and correctly reference platform-appropriate stroke colors (`#6E6E6E` light / `#AFB1B3` dark) rather than a single hardcoded color reused for both themes — good theme-awareness for the one new visual asset this phase ships.
- Visual hierarchy gap: VS Code gets a CodeLens (`$(settings-gear) Configure SETOPTS (...)`, `setopts-composer-ui.ts:100`) as a persistent, always-visible affordance on every SETOPTS line; IntelliJ's config-file treatment is icon + highlighting only, with no equivalent inline action surfaced in the editor gutter or margin. This isn't a defect of this phase (the composer itself is Phase 87's scope) but it does mean the two IDEs' *config file* editing experience looks meaningfully different in a side-by-side screenshot, which the UAT's Test 3 note (tester expected a link that doesn't exist) already surfaced as user-facing confusion.

### Pillar 3: Color (3/4)

- No new hardcoded hex/RGB literal was introduced in any Java/TS/JS file reviewed for this phase — errors and warnings route through platform APIs (`vscode.window.showWarningMessage`/`showErrorMessage`, IntelliJ's `NotificationType.WARNING`, `ValidationInfo`), all of which are theme-aware by construction.
- The two SVG icons hardcode a stroke color per file (`#6E6E6E`/`#AFB1B3`) rather than using a `JBColor`-style indirection, but this is the correct and only mechanism for a static SVG icon resource under IntelliJ's icon system — not a defect, just noted since Phase 82's review flagged the analogous Swing-label case as a real defect; this is a different, correctly-handled mechanism.
- No 60/30/10 concern applies here — this phase adds no new dominant-color surface (no new panel, no new dashboard), only icons and standard-severity notifications.

### Pillar 4: Typography (4/4)

- No `Font` construction, no custom point size, and no new Tailwind-equivalent styling class was introduced by any file this phase touched. `JBLabel`/`JBTextField` and VS Code's built-in notification/CodeLens rendering are used as-is throughout.

### Pillar 5: Spacing (4/4)

- `BbjSettingsComponent`'s new config-path validator and its label reuse the pre-existing `addLabeledComponent(...)` row exactly as every other settings field in the same panel — no new layout container, no arbitrary pixel/point spacing added.
- The CodeLens/Code Action additions in `setopts-composer-ui.ts` don't touch layout at all — they're host-rendered inline decorations with no custom spacing surface for this codebase to get wrong.

### Pillar 6: Experience Design (3/4)

- Real, substantive coverage added by this phase: a missing/unreadable config file now warns once per distinct path per session on both hosts (`shouldWarnOnce`/`config-path-cache.ts:75`, `BbjConfigPathService.shouldWarnOnce`), a blank config path aborts BUI/DWC runs with a named remedy instead of silently registering an unusable path with EM (`BbjRunActionBase` call sites in `BbjRunBuiAction.java`/`BbjRunDwcAction.java` via `getConfigPath().isBlank()` at `BbjRunActionBase.java:534-536`), and the IntelliJ Settings dialog validates the config path inline without ever blocking Apply — exactly the D-13/D-15 contract, and confirmed passing in `84-UAT.md` (tests 6, 8).
- The asymmetric discoverability gap between hosts (Priority Fix #3) is a real interaction-design shortfall that the UAT itself surfaced unprompted (Test 2's Command-Palette-only-hint note, Test 3's "tester expected a SETOPTS editor link" note) — both are accepted-as-designed per the UAT, but from a pure experience-design standpoint a user moving between VS Code and IntelliJ, or between the CodeLens/Code-Action and Command-Palette entry points within VS Code itself, gets a materially different level of help for the identical situation.
- The "no live language server" case is not separately handled by any of the strings reviewed: `NO_CONFIG_PATH_MESSAGE` and its IntelliJ analogues assume the resolver has had a chance to answer and simply says "no path could be resolved," without distinguishing "the server hasn't started yet" from "the server answered and there's genuinely nothing configured." A user running a command immediately after opening VS Code (before the server's first push arrives) gets the same message as a user who genuinely never configured anything, which is technically correct (D-02's explicit-setting-only fallback covers it) but offers no diagnostic hint that waiting a moment might change the outcome.

---

## Files Audited

- `bbj-vscode/src/setopts-composer-ui.ts`
- `bbj-vscode/src/config-path-cache.ts`
- `bbj-vscode/src/extension.ts` (activation, notification listener, association triggers section, ~lines 860-926)
- `bbj-vscode/src/Commands/Commands.cjs` (top-of-file constants, `openConfigFile`, run/web-run error paths)
- `bbj-vscode/package.json` (`bbj.configPath` description, `bbj.config` command title, `bbx-config` language contribution and icon)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java` / `BbjRunDwcAction.java` (grepped for blank-path guard)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsLookups.java` (referenced via SUMMARY.md coverage, not independently re-read line-by-line)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjConfigFileType.java`
- `bbj-intellij/src/main/resources/icons/bbj-config.svg`, `bbj-config_dark.svg`
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` (fileType, fileTypeOverrider, editorHighlighterProvider entries)
- `.planning/phases/84-config-path-resolution-discoverability-foundation/84-CONTEXT.md`, `84-UAT.md`, `84-01-SUMMARY.md` … `84-06-SUMMARY.md`

Not independently re-read (evidence taken from SUMMARY.md coverage tables and grep, consistent with the audited files' patterns): `BbjConfigPathService.java`, `ConfigPaths.java`, `config-path-resolver.ts`, `process-args.ts`, `compiler-options.ts`.
