# Phase 3: Settings & Runtime - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Configuration UI for BBj environment settings (BBj home, classpath selection) and Node.js detection/validation. Users can configure the plugin so the language server knows where BBj lives and has a Node.js runtime to execute. Language server process management itself is Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Settings page layout
- Single scrollable page with section headers (not tabs)
- Located at Preferences > Languages & Frameworks > BBj
- Sections: BBj Environment, Node.js Runtime, Classpath

### BBj home path
- Auto-detect from `~/BASIS/Install.properties` (`BBjDirectory` or `BASISInstallDirectory` key), then common locations (`/usr/local/bbx`, `C:\bbx`)
- Text field + folder browse button, pre-filled with detected path, user can override
- Inline validation — green checkmark or red warning as user types/browses
- Validated by checking `cfg/BBj.properties` exists inside the directory
- **Hard requirement** — editor banner on BBj files when BBj home is not set or invalid, with link to open settings

### Node.js runtime
- **Required dependency** for now (bundling deferred to Phase 6 distribution decision)
- Auto-detect from system PATH, show detected version in settings
- Text field + browse button for manual override (covers nvm users, non-standard installs)
- Inline validation of path and version
- Enforce minimum Node.js version (researcher to determine what the language server requires)
- Detection triggered on first BBj file open (not IDE startup)
- **Editor banner** when Node.js not found or version too old, with two actions: "Configure Node.js path" (opens settings) and "Install Node.js" (opens nodejs.org)

### Classpath selection
- **Not a JAR table** — classpath entries are named configurations from `BBj.properties`
- Read `basis.classpath.*` keys from `<bbj_home>/cfg/BBj.properties`
- Dropdown/combo box on the settings page listing available named entries (e.g., `bbj_default`, `addon`, `barista`)
- Empty/default as fallback when no selection made
- Dropdown populates dynamically when BBj home changes
- Dropdown disabled with hint text when BBj home is not set

### Settings persistence & scope
- Application-level (global) settings, not per-project
- Independent from VS Code extension settings — no shared config
- Settings passed to language server via LSP initialization params (same contract as VS Code extension)
- Settings changes auto-restart the language server (no manual prompt needed)

### Claude's Discretion
- Exact section ordering on the settings page
- Field spacing and typography
- How to display detected Node.js version (label, tooltip, etc.)
- Error message wording for validation failures
- Whether to add a "Test Connection" or "Validate" button

</decisions>

<specifics>
## Specific Ideas

- BBj home detection via installer trace: `~/BASIS/Install.properties` contains `BBjDirectory` and `BASISInstallDirectory` keys pointing to the install location
- Classpath model matches VS Code extension's `bbj.classpath` setting — a single named entry, not a list of JARs
- VS Code extension reads classpath names via `getBBjClasspathEntries()` in `extension.ts` — parses `basis.classpath.*` lines from `BBj.properties`
- Editor banners for both missing BBj home AND missing Node.js (two separate hard requirements)
- Node.js bundling is planned for the future ("we see ourselves doing a complete bundle in the end") but not this phase

</specifics>

<deferred>
## Deferred Ideas

- Node.js runtime bundling in plugin — Phase 6 distribution decision
- Cross-editor shared configuration (VS Code + IntelliJ reading same config) — future consideration
- Per-project settings override — not needed for alpha, revisit if multiple BBj installs become common

</deferred>

---

*Phase: 03-settings-runtime*
*Context gathered: 2026-02-01*
