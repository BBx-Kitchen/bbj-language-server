# Requirements: BBj Language Server — v4.4 IntelliJ Focus

**Defined:** 2026-09-17
**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Source:** GitHub milestone #7 "v4.4 IntelliJ Focus" (21 open issues, all `PRIO 3` + `intellij`),
plus two pending Node.js todos carried since v4.2 and the 0.16.0 release.

**Shape of this milestone.** Eleven of the 21 issues describe a real failure scenario; the other
ten are explicitly code-shape findings ("n/a — D4 is a code-shape finding") that must change no
observable behaviour. Requirements below are grouped by the subsystem whose files they touch, so
that a behaviour fix and the consolidation covering the same files can land together rather than
forcing those files to be edited and hand-UAT'd twice.

## v4.4 Requirements

### Composer

- [x] **COMP-03**: A malformed or partial `bbj/composer/catalogs` response opens the composer with the same graceful "not ready" message a fully-null response already gets, instead of an "IDE Internal Error" balloon from an EDT `NullPointerException` (#609)
- [x] **COMP-04**: Text typed into a composer dialog that would break BBj statement syntax is rejected or escaped before it is written into the developer's live source file (#607)
- [x] **COMP-05**: `applyHexEdit` fails gracefully rather than throwing `ArrayIndexOutOfBoundsException` when `flagsRange`/`eventMaskRange` do not carry exactly two elements (#591)
- [x] **COMP-06**: The addWindow and addChildWindow composer dialogs share one base, so a fix to the shared addWindow-family flow is written once instead of hand-applied to two files (#630)
- [x] **COMP-07**: `clip`, `labeled` and `setEnabledRecursive` exist exactly once in a shared home rather than duplicated across the schematic panels and dialogs (#619)
- [x] **COMP-08**: The three `Configure*Intention` classes become one data-driven registration parameterised by display string, `Kind` and keyword (#618)
- [x] **COMP-09**: The three composer-launch actions become one data-driven registration parameterised by `Kind` (#616)

### Enterprise Manager and Run Actions

- [ ] **EM-01**: An EM login temp file is deleted even when the process launch that precedes the cleanup block throws, so no partially-written login output (possibly containing a token fragment) is left on disk (#590)
- [ ] **EM-02**: "Login to Enterprise Manager" gates its enablement on project and server-readiness state and declares `ActionUpdateThread.BGT`, matching its ten sibling actions (#589)
- [ ] **EM-03**: EM server-side token validation lives alongside the rest of the EM-token lifecycle, not inside the run-action base class (#617)
- [ ] **EM-04**: `BbjRunBuiAction` and `BbjRunDwcAction` share the run flow through the base class, differing only in their BUI/DWC-specific literals (#615)
- [x] **EM-05**: Plugin-bundled tool script paths (`web.bbj`, `em-validate.bbj`, `em-login.bbj`) resolve through one shared helper instead of three near-identical methods across two files (#614)

### java-interop Status and Settings

- [ ] **IOP-01**: A java-interop health check already in flight when project disposal begins never calls `project.getMessageBus()` or `EditorNotifications` on a disposed project, matching the guard its sibling service already applies everywhere (#592)
- [ ] **IOP-02**: The java-interop status poll stops re-arming while no BBj file is open or the IDE window lacks focus, instead of probing every 5 seconds for the lifetime of the project (#593)
- [ ] **IOP-03**: The status bar reports "Java: Connected" only when the listening peer is confirmed to be java-interop, not merely because a TCP handshake succeeded (#587)
- [ ] **IOP-04**: The default java-interop port has exactly one named constant, so the UI placeholder, the persisted default and the "changed from default" check cannot drift apart (#594)
- [ ] **IOP-05**: The two status-bar widgets and their factories share a base, so a change to the widget shape is written once (#620)

### Platform Integration and Node.js

- [ ] **PLAT-01**: The TextMate bundle provider reuses a cached directory across IDE launches instead of allocating a fresh temp directory and re-copying its five files every time, and abandoned directories are cleaned up (#613)
- [ ] **PLAT-02**: Customizing a colour under Settings › Editor › Color Scheme › BBj visibly changes editor highlighting — or the inert page is removed so it cannot mislead (#621)
- [ ] **PLAT-03**: The three editor notification providers share one base carrying the file-type guard and panel construction (#622)
- [ ] **PLAT-04**: "Node.js not yet downloaded" and "Node.js cache directory inaccessible" are distinguishable to every caller, so the user is shown the right diagnosis instead of being pointed at a download that will fail the same way again (#588)
- [ ] **PLAT-05**: A configured-but-unusable Node.js path consults the cached download before the plugin gives up and shows the "Node.js required" banner — with the product decision recorded either way (todo `2026-09-06-configured-node-path-suppresses-cached-download-fallback`)
- [ ] **PLAT-06**: Node.js auto-install is attested by hand on a real Windows machine with no Node.js configured, closing the major-severity gap that no Linux-hosted test can exercise (todo `2026-09-06-live-windows-check-for-node-auto-install-failure`)

### Release

- [ ] **REL-01**: Release 0.16.0 is published to both the VS Code Marketplace and JetBrains Marketplace through SEED-002's single verification gate, with no half-released version and no orphaned tag
- [ ] **REL-02**: All 21 issues on GitHub milestone #7 are closed and the milestone itself is closed

## Future Requirements

Acknowledged but deferred — not in this roadmap.

### Diagnostics and Completion Accuracy

- **#522, #561/#578, #577, #556, #527, #526, #466**: the v4.3 stretch tier, untouched

### Remaining IntelliJ Parity

- **#634, #631**: parity items users notice, not covered by milestone #7

### Onboarding and Documentation

- **#476, #385, #595, #601, #108 follow-up**: docs and onboarding
- **#666**: SETOPTS block discoverability UX — filed during v4.3 Phase 88, wants its own UX review
- **#659-#662**: the UAT-log defects surfaced during v4.3 Phase 85

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Native IntelliJ parser/lexer rewrite | LSP4IJ approach reuses the existing language server — standing project constraint |
| Reimplementing any of these fixes on the IntelliJ side that belong in the shared LS | Standing constraint: features both IDEs need are host-neutral language-server requests |
| CI/dependency hygiene and v4.3's own tech debt | A separate hygiene milestone; mixing it in would dilute the IntelliJ focus |
| Live IntelliJ UI test coverage in CI | Structural gap recorded since v4.1; closing it is its own project, not a side effect of these 21 issues |
| Advisory publication (PROC-03) | Maintainer-owned; the 0.16.0 release is a candidate trigger but the publication decision is not a GSD phase |
| Reconciling the half-released 0.15.0 across the two marketplaces | Explicitly settled in SEED-002: the next version simply ships; no repair attempted |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| COMP-03 | Phase 93 | Complete |
| COMP-04 | Phase 93 | Complete |
| COMP-05 | Phase 93 | Complete |
| COMP-06 | Phase 93 | Complete |
| COMP-07 | Phase 93 | Complete |
| COMP-08 | Phase 93 | Complete |
| COMP-09 | Phase 93 | Complete |
| EM-01 | Phase 94 | Pending |
| EM-02 | Phase 94 | Pending |
| EM-03 | Phase 94 | Pending |
| EM-04 | Phase 94 | Pending |
| EM-05 | Phase 94 | Complete |
| IOP-01 | Phase 95 | Pending |
| IOP-02 | Phase 95 | Pending |
| IOP-03 | Phase 95 | Pending |
| IOP-04 | Phase 95 | Pending |
| IOP-05 | Phase 95 | Pending |
| PLAT-01 | Phase 96 | Pending |
| PLAT-02 | Phase 96 | Pending |
| PLAT-03 | Phase 96 | Pending |
| PLAT-04 | Phase 96 | Pending |
| PLAT-05 | Phase 96 | Pending |
| PLAT-06 | Phase 96 | Pending |
| REL-01 | Phase 97 | Pending |
| REL-02 | Phase 97 | Pending |

**Coverage:**

- v4.4 requirements: 25 total
- Mapped to phases: 25 ✓
- Unmapped: 0
- Duplicated across phases: 0

Phase boundaries follow the subsystem grouping above: Phase 93 Composer (7), Phase 94 Enterprise
Manager and Run Actions (5), Phase 95 java-interop Status and Settings (5), Phase 96 Platform
Integration and Node.js (6), Phase 97 Release (2). Full phase detail, per-phase success criteria
and the fix-versus-consolidation ordering rule are in `.planning/ROADMAP.md`.

---
*Requirements defined: 2026-09-17*
*Last updated: 2026-09-17 after v4.4 roadmap creation — all 25 requirements mapped to Phases 93-97*
