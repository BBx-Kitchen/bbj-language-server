# Phase 6: Distribution - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Cross-platform packaging and bundling of the BBj IntelliJ plugin. The plugin ZIP must include the language server bundle, be installable from disk on a fresh IntelliJ instance, and work identically to the development sandbox on macOS, Windows, and Linux. Prepare metadata for future JetBrains Marketplace publishing without actually publishing.

</domain>

<decisions>
## Implementation Decisions

### Node.js dependency strategy
- Download Node.js on first use if not found on the system
- Prefer system Node.js if installed and version is compatible; only download if missing or too old
- Store downloaded Node.js binary in IntelliJ's plugin data directory (clean uninstall removes it)
- Runtime platform detection to determine which Node.js binary to download

### Language server bundling
- Build language server (main.cjs) during Gradle plugin build — triggers npm/esbuild as part of build
- Single universal ZIP for all platforms (no per-platform ZIPs)
- Follow standard IntelliJ plugin directory layout inside the ZIP

### Installation & update experience
- Marketplace-ready only — set up all metadata, vendor info, descriptions so publishing is one command later, but don't actually publish
- Vendor name: "BASIS International Ltd."
- Plugin description and changelog in separate HTML files (Marketplace best practice)
- Welcome notification on first launch — one-time balloon with quick links to settings and documentation

### Cross-platform concerns
- Target IntelliJ IDEA 2024.2+ only (Community + Ultimate)
- IntelliJ IDEA only — no explicit support for other JetBrains IDEs (WebStorm, PyCharm, etc.)
- Manual testing only for cross-platform verification (no CI matrix)
- Runtime OS detection for Node.js download (aligns with single universal ZIP)

### Claude's Discretion
- Minimum Node.js version requirement (based on what LS actually needs)
- TextMate grammar bundling approach (current copy-at-build-time vs alternative)
- Exact directory structure within plugin ZIP
- Node.js download source URL and verification approach
- Welcome notification content and links

</decisions>

<specifics>
## Specific Ideas

- Prepare for JetBrains Marketplace publishing — structure everything so a future `publishPlugin` command just works
- Node.js download should be non-blocking — user can still browse code while it downloads

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-distribution*
*Context gathered: 2026-02-01*
