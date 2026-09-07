# Requirements: BBj Language Server — v4.3 Polish & Quality

**Defined:** 2026-09-06
**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Milestone rule (from GitHub milestone #5):** a BBj developer at the keyboard can notice the
difference. Scope is exactly the 23 issues assigned to that milestone; two of them (#475, #485)
are split into two requirements each because their own text tiers them.

## v1 Requirements

Committed scope. Each maps to exactly one roadmap phase.

### Composer discoverability & coverage

- [ ] **DISC-01**: User sees a persistent, clickable cue on every line where a composer applies (MSGBOX, addWindow, addChildWindow, CVS, SETOPTS) in both VS Code and IntelliJ, without placing the caret or opening a context menu (#650)
- [ ] **DISC-02**: User is offered the MSGBOX composer when the options argument is an expression; a sum of constant Java static fields or integer literals pre-fills the composer, any other expression opens it in compose-and-replace mode (#648)
- [ ] **DISC-03**: User can compose a CVS() call visually in both IDEs from the documented bit operations (1, 2, 4, 8, 16, 32, 64, 128; applied in ascending order) with the version-gated `chars` parameter, and can edit an existing literal-mask CVS() call in place (#649)
- [ ] **DISC-04**: User editing config.bbx in IntelliJ gets a visual SETOPTS composer equivalent to VS Code's existing one, served by a shared `bbj/composer/setopts/*` command layer that both IDEs use (#633)
- [ ] **DISC-05**: User hovering a `SETOPTS` literal, or an `IOR`/`AND` line against an OPTS-derived variable in BBj code, sees which options that line sets or clears, with AND masks shown as the logical cleared bits (#475, decode tier)
- [ ] **DISC-06**: User can generate a SETOPTS read-modify-write block from a tri-state Set/Clear/Leave form, and can edit in place an absolute `SETOPTS` literal or a canonical `var$=OPTS … SETOPTS var$` block; any other shape gets hover decode only, no edit action (#475, composer tiers)
- [ ] **DISC-07**: User's malformed free-text in addWindow or addChildWindow composer fields is rejected before the insert is applied, with validity carried in the shared preview payload so both IDEs gate the same way (#623)
- [ ] **DISC-08**: User's edits to the document during the MSGBOX QuickPick wizard never corrupt unrelated text: the target call is re-resolved immediately before the edit and the edit aborts on mismatch (#532)
- [ ] **DISC-09**: User can open and close any of the four VS Code composers repeatedly without leaking message-handler listeners (#530)
- [ ] **DISC-10**: User typing quickly in an IntelliJ composer dialog gets one preview round trip per settle point rather than one per keystroke (#611)
- [ ] **DISC-11**: User opening a composer a second time in an IntelliJ session pays no server-resolution or catalog round trip; the cache is invalidated on language-server restart (#612)

### Config changes without restart

- [x] **CFG-01**: User's configured config file, of any name and location, is honored by every consumer of the config path: PREFIX and project-wide USE resolution, run and compile commands, and the SETOPTS composer, in both IDEs (#485)
- [x] **CFG-02**: User opening the configured config file sees it treated as a config file (highlighting, composer, tooling) regardless of its filename, in both IDEs (#485)
- [x] **CFG-03**: User's change to the resolved config file (PREFIX, project-wide USE) takes effect without a manual restart, through a debounced reload with a non-blocking status signal, and the composer's own writes to that file cannot trigger a reload loop (#486)
- [x] **CFG-04**: User's Refresh Java Classes on IntelliJ completes without taking diagnostics, completion, hover or Structure View offline (#632)
- [ ] **CFG-05**: User's java-interop port is auto-detected for every reader of the settings, not only the Settings dialog, and an explicitly confirmed port 5008 is never silently overwritten (#608)

### Responsiveness & hangs

- [ ] **RESP-01**: User's scope resolution and symbol collection cost no longer scales with total workspace size, proven by a timing test on a synthetic multi-document workspace (#505)
- [ ] **RESP-02**: User with an unreachable java-interop peer waits about one connect timeout in total, not one per unresolved class; the breaker resets on cache clear or Refresh Java Classes (#504)
- [ ] **RESP-03**: User never gets a 30-second stall or a stub class for a class that genuinely resolves, caused by LRU eviction during that class's own cyclic resolution (#497)
- [ ] **RESP-04**: User's concurrent completion requests on different documents each honor their own cancellation token (#498)
- [ ] **RESP-05**: User's decompile completes promptly on coarse-mtime filesystems and never spins the 20-second timeout on output that is already fresh (#500)
- [ ] **RESP-06**: User's format request never applies content computed from an earlier in-flight request over interim edits (#499)
- [ ] **RESP-07**: User invoking Run, Compile, Decompile or Denumber with no editor focused sees a graceful "no active BBj file" message instead of an error (#512)
- [ ] **RESP-08**: User's VS Code extension survives a second activation in the same host: every command, provider and notification registration is disposed (#531)
- [ ] **RESP-09**: User sees the IntelliJ status-bar widgets show and hide on a bare editor-tab switch, not only on a server-status change (#610)

## v2 Requirements

The GitHub milestone's stretch tier. Tracked but not in this roadmap.

### Diagnostics & completion accuracy

- **ACC-01**: BBjCPL diagnostics suppress redundant Langium parse-tier errors on merge (#522)
- **ACC-02**: Completion offers candidates inside class method bodies, including DEF FN parameters (#561, #578)
- **ACC-03**: Fully-qualified Java static member access offers only static members (#577)
- **ACC-04**: Type inference selects the correct overload's return type for the call's argument shape (#556)
- **ACC-05**: Two `::file::Class` references on one line parse correctly (#527)
- **ACC-06**: USE-statement path resolution stays inside the configured PREFIX root (#526)
- **ACC-07**: Sibling-type method return mismatches are detected via the Java class hierarchy (#466)

### IntelliJ parity users notice

- **IJP-01**: Formatter, denumber, tokenized-file detection and decompile actions on IntelliJ (#634, #631)
- **IJP-02**: Color Scheme page keys drive the highlighter (#621)
- **IJP-03**: java-interop health probe uses a protocol handshake, not a bare TCP connect (#587)
- **IJP-04**: Login to Enterprise Manager action has `update()`/`getActionUpdateThread()` (#589)

### Onboarding & docs

- **DOC-01**: Curated starter programs via File > New in both IDEs (#476)
- **DOC-02**: Graffiti Composer launch from VS Code (#385)
- **DOC-03**: Composer class docs and interop harness header reflect current behavior (#595, #601)
- **DOC-04**: Inlay hints follow-up (#108)

## Out of Scope

Explicitly excluded by the milestone's own description. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Pure refactors (#615-#622, #630, #625, #624, #580-#583, #602, #606) | No keyboard-visible difference; parked for a separate hygiene milestone |
| CI/dependency hygiene (#545, #547, #549-#551, #572, #573, #597, #598, #501, #502, #507, #520, #521) | Same rule; separate hygiene milestone |
| Test-coverage gaps (#555, #528, #559, #560, #562, #563, #565, #575, #574, #516, #519, #627-#629) | Same rule; separate hygiene milestone |
| Input-validation hardening (#523, #524, #525, #529, #566, #584, #585, #604, #607, #609) | Same rule; separate hygiene milestone |
| Decode-and-edit for every SETOPTS-in-code shape | The effective options vector is a runtime value; only the two statically safe shapes in DISC-06 can be edited soundly (#475's own design) |
| General expression evaluation for MSGBOX/CVS options | Would produce wrong previews for variables and method calls; DISC-02 recognizes only constant sums and otherwise composes blind |
| A native IntelliJ `LineMarkerProvider` per composer | The plugin has no BBj PSI; the cue must come through the language server (research anti-feature) |
| Tagged release and advisory publication (PROC-03), `WINDOWS.md` entry 1, live Windows Node auto-install check | Maintainer-owned, not GSD phases |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DISC-01 | Phase 89 | Pending |
| DISC-02 | Phase 89 | Pending |
| DISC-03 | Phase 89 | Pending |
| DISC-04 | Phase 87 | Pending |
| DISC-05 | Phase 88 | Pending |
| DISC-06 | Phase 88 | Pending |
| DISC-07 | Phase 90 | Pending |
| DISC-08 | Phase 90 | Pending |
| DISC-09 | Phase 90 | Pending |
| DISC-10 | Phase 90 | Pending |
| DISC-11 | Phase 90 | Pending |
| CFG-01 | Phase 84 | Complete |
| CFG-02 | Phase 84 | Complete |
| CFG-03 | Phase 85 | Complete |
| CFG-04 | Phase 86 | Complete |
| CFG-05 | Phase 86 | Pending |
| RESP-01 | Phase 91 | Pending |
| RESP-02 | Phase 91 | Pending |
| RESP-03 | Phase 91 | Pending |
| RESP-04 | Phase 91 | Pending |
| RESP-05 | Phase 92 | Pending |
| RESP-06 | Phase 92 | Pending |
| RESP-07 | Phase 92 | Pending |
| RESP-08 | Phase 92 | Pending |
| RESP-09 | Phase 92 | Pending |

**Coverage:**

- v1 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-06*
*Last updated: 2026-09-06 after roadmap creation — 25/25 requirements mapped to Phases 84-92*
