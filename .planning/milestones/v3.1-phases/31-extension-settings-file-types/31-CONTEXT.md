# Phase 31: Extension Settings & File Types - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

.bbx files get full BBj treatment (same as .bbj). BBj extension settings become configurable: interop host/port, EM URL/auth. EM authentication uses JWT via a BBj login stub instead of plaintext passwords. Both VS Code and IntelliJ.

</domain>

<decisions>
## Implementation Decisions

### .bbx file handling
- .bbx files behave 100% identically to .bbj — same icon, same diagnostics, same completion, same run commands
- Only adding .bbx — no other new extensions
- Same BBj icon for .bbx (no distinct variant)
- Support in both VS Code and IntelliJ

### Settings scope & UX
- Settings support both workspace-level and user-level, with workspace overriding user defaults
- Configurable settings: BBj Home, classpath (existing), interop host/port (new), EM URL and auth token (new)
- Changing settings takes effect immediately (hot reload) — no server restart required
- IntelliJ: add new settings fields to the existing Languages & Frameworks > BBj page (same page, no sub-sections)

### Remote interop connection
- Use case: shared team servers AND remote dev environments (SSH, containers, CI)
- Plain TCP connection — no SSL/TLS (rely on network-level security like VPN/SSH tunnels)
- Default to localhost:5008 when no settings configured — works out of the box for local dev
- Retry connection periodically when remote server is unreachable, notify user of connection status

### EM authentication
- BBj Admin API provides JWT — develop a BBj stub program (similar to DWC launcher) that shows a user login dialog and returns the JWT
- JWT storage: Claude's discretion — use the most appropriate secure storage for each IDE (VS Code SecretStorage, IntelliJ CredentialStore, etc.)
- Login trigger: both explicit command ("BBj: Login to EM" / menu action) AND auto-prompt on first EM access if not logged in
- Token expiry: re-prompt the BBj login dialog to get a fresh JWT (no silent refresh)

### Claude's Discretion
- JWT secure storage implementation per IDE
- Retry interval and backoff strategy for remote interop connection
- Settings validation approach (on save vs on use)
- Hot reload implementation details

</decisions>

<specifics>
## Specific Ideas

- The BBj login stub is similar to the existing DWC web.bbj launcher — a small BBj program that runs locally, shows a dialog, and returns a result
- BBj Admin API has a way to fetch a JWT — researcher should investigate the exact API endpoint and flow

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 31-extension-settings-file-types*
*Context gathered: 2026-02-07*
