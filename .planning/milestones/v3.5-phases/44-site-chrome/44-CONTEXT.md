# Phase 44: Site Chrome for Dual-IDE Support - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Update documentation site chrome (title, tagline, navbar, footer, landing page) and restructure docs URL paths so VS Code and IntelliJ are presented as equal first-class citizens. Remove Developer Guide from navigation and files. Move VS Code user guide pages to new URL structure.

</domain>

<decisions>
## Implementation Decisions

### Tagline & branding
- Site title changes from "BBj Language Server" to "BBj Language Support"
- Navbar title also updates to "BBj Language Support" (matches site title)
- Tagline becomes IDE-neutral — focuses on what it does, not which IDEs (e.g. "Language intelligence for BBj development")
- Layout meta description matches the new tagline (IDE-neutral, not SEO-optimized with IDE names)

### Landing page layout
- Hero has three buttons: "Get Started" + "VS Code Marketplace" + "JetBrains Marketplace"
- "Get Started" links to a getting started page; marketplace buttons link to respective stores
- Feature cards mention both IDEs where relevant (say "VS Code or IntelliJ" not just "VS Code")
- Developer Commands card updated to reflect current commands (remove decompile reference, match actual v3.x commands: run as GUI/BUI/DWC, refresh Java classes)

### Navbar & footer links
- Navbar right side: GitHub | VS Code Marketplace | JetBrains Marketplace (side by side)
- Developer Guide removed from navbar entirely
- Footer restructured to three columns: VS Code Guide | IntelliJ Guide | Resources
- Each IDE footer column links to its guide pages (getting-started, features, configuration, commands)
- Resources column keeps BBj Documentation + GitHub, adds JetBrains Marketplace alongside VS Code Marketplace
- Developer Guide removed from footer AND actual files/directory deleted (full removal in this phase, not deferred to Phase 47)

### User Guide restructuring
- Navbar gets two separate items: "VS Code Guide" and "IntelliJ Guide" (replaces single "User Guide")
- URL structure: /docs/vscode/* and /docs/intellij/* (IDE-prefixed, clean separation)
- Existing VS Code pages move from /docs/user-guide/* to /docs/vscode/* in this phase
- Sidebar updated to reflect new paths

### Claude's Discretion
- IntelliJ placeholder pages: whether to create stub pages with "Coming soon" or just the directory (whatever makes the nav/build work cleanly)
- Exact tagline wording (IDE-neutral focus decided, specific phrasing up to Claude)
- Button styling and arrangement on hero (equal prominence required)

</decisions>

<specifics>
## Specific Ideas

- Tagline should focus on capability, not IDE names — "Language intelligence for BBj development" style
- Hero buttons: marketplace buttons should have equal visual weight (same size, style, prominence)
- Feature cards should say "VS Code or IntelliJ" not "your IDE" — be explicit about both

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 44-site-chrome*
*Context gathered: 2026-02-09*
