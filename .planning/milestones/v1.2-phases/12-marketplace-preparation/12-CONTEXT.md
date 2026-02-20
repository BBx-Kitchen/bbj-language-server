# Phase 12: Marketplace Preparation - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Plugin meets all JetBrains Marketplace approval criteria and is ready for first publication. Includes icon assets, plugin.xml metadata, license, and plugin verifier compliance. No new features — only packaging and presentation.

</domain>

<decisions>
## Implementation Decisions

### Plugin branding
- Use the same icon as the VS Code BBj extension (download from VS Code Marketplace listing)
- Resize to 40x40 and 80x80 as required by JetBrains Marketplace
- Vendor: BASIS International Ltd. with URL https://basis.cloud
- No adaptation or differentiation from VS Code icon — same branding across IDEs

### Marketplace listing copy
- Match the tone and structure of the VS Code extension's Marketplace listing
- No screenshots for initial submission — text description only, screenshots can be added later
- Mention that the plugin is powered by the same language server as the VS Code extension (shared backend credibility)
- Feature list: Claude determines the honest set by comparing what's implemented vs VS Code listing

### Licensing
- MIT License (matches VS Code extension)
- Copyright holder: BASIS International Ltd.
- LICENSE file included in plugin distribution — no EULA dialog on installation
- Include NOTICES/THIRD-PARTY file acknowledging LSP4IJ and other dependency licenses

### Change notes & versioning
- First Marketplace release version: 0.1.0
- Initial change notes: feature list format (syntax highlighting, diagnostics, completions, run commands)
- Target IntelliJ 2024.1+ only (recent versions)
- Listed as Free (no freemium, no paid tiers)
- Support both IntelliJ Community and Ultimate editions

### Claude's Discretion
- Exact wording of plugin description (following VS Code listing tone)
- Which features to highlight based on what's actually implemented vs VS Code feature set
- Change notes formatting and level of detail
- NOTICES file structure and which dependencies to list
- Plugin verifier fix approach (whatever is needed to hit zero errors)

</decisions>

<specifics>
## Specific Ideas

- Icon source: https://basis-intl.gallerycdn.vsassets.io/extensions/basis-intl/bbj-lang/0.6.6/1769936694287/Microsoft.VisualStudio.Services.Icons.Default
- VS Code Marketplace listing for reference: https://marketplace.visualstudio.com/items?itemName=basis-intl.bbj-lang
- VS Code extension repo (for LICENSE reference): https://github.com/BBx-Kitchen/bbj-language-server

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-marketplace-preparation*
*Context gathered: 2026-02-02*
