# Requirements: BBj Language Server

**Defined:** 2026-09-24
**Milestone:** v4.6 User-Facing Bug Burn-down
**Core Value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.

**Scope rule:** fix what BBj developers notice; keep each fix minimal and ship soon. No new features.

## v1 Requirements

### Compiler trigger (#696)

- [x] **TRIG-01**: With `bbj.compiler.trigger` set to `on-save`, typing in a BBj file starts no live parse and no bbjcpl run; the language server's own validation keeps running as before
- [ ] **TRIG-02**: With `on-save`, saving a BBj file runs exactly one compiler check of the saved text, without debounce — the live parse first, bbjcpl when the live parse is unavailable — in both VS Code and IntelliJ
- [x] **TRIG-03**: With `on-save`, opening a BBj file runs one compiler check, so a freshly opened file shows its compiler errors before the first save
- [x] **TRIG-04**: With `on-save`, the compiler errors from the last check stay visible while the user types, until the next save replaces them; they are not dropped or shown on the wrong line by the diagnostic reconciliation
- [x] **TRIG-05**: `debounced` (still the default) and `off` behave exactly as before
- [ ] **TRIG-06**: IntelliJ users can choose `debounced`, `on-save` or `off` in the plugin settings, and the language server uses the chosen value from startup and after a change
- [x] **TRIG-07**: The VS Code setting description and both IDE feature docs describe the three modes as implemented and recommend `on-save` (instead of `off`) for large workspaces

### Validation accuracy

- [ ] **VAL-01**: Single-line `IF`/`ELSE`/end-of-`IF` forms that BBj's compiler accepts (the files re-flagged at the v4.5 phase 98 close) get no "This statement needs to start in a new line" error, while a genuinely misplaced `ELSE` or `FI` with no open `IF` on the line is still reported
- [ ] **VAL-02**: The use-before-assignment check keeps checking the rest of a file when it meets a reference that has no symbol, instead of throwing and silently skipping the file

### Diagnostics

- [x] **DIAG-01**: When the live parse is unavailable and bbjcpl reports an error, a redundant language-server parse error for the same finding is suppressed, as the diagnostic hierarchy already does on the live-parse path (#522)

### IntelliJ server lifecycle

- [ ] **LIFE-01**: When the language-server process dies or its connection drops, the IntelliJ plugin recognizes it as a crash (logged and reflected in the server status), instead of it going unnoticed
- [ ] **LIFE-02**: The server status transition log line shows the real previous status (not one two transitions old); lands together with LIFE-01

### Completion and type inference

- [ ] **COMP-01**: Completion after a fully-qualified Java class reference typed without `USE` (e.g. `java.lang.String.`) offers only static members, as it already does after a `USE`d class name (#577)
- [ ] **COMP-02**: A call to an overloaded BBj or Java method gets the return type of the overload that matches the call's arguments, so completion and checks on the result use the right type (#556)
- [ ] **COMP-03**: Completion works inside class method bodies; how far the gap reaches is measured first, and every position found broken is fixed or recorded with its reason (#561)

### Java interop

- [ ] **JINT-01**: Primitive types, `void` and array types are never sent to the java-interop backend as class lookups (#660)
- [ ] **JINT-02**: A nested Java class is resolved once, whether it is named `Outer.Inner` or `Outer$Inner` (#659)
- [ ] **JINT-03**: The live parse no longer waits on the shared interop connection or its circuit breaker before using its own connection

## Future Requirements

Deferred; tracked but not in this roadmap.

- The PRIO 2/3 audit issues of 2026-08-20 (internal quality, CI, test coverage, dependency hygiene)
- Remaining IntelliJ parity items (#634, #631)
- v4.5 residual review warnings (98, 99, 100, 104) and the verdict state never cleared for deleted files (103 WR-01)
- Phase 97 review follow-ups (Node.js download progress without `Content-Length`, comment-unaware source guards)

## Out of Scope

| Feature | Reason |
|---------|--------|
| New features (semantic tokens #677, PREFIX decorations #664, starter programs #476, ...) | Milestone is bug fixes only; release soon |
| `bbj-ls` message quality (#693, #694) | Belongs to the `bbj-ls` repository, not this one |
| Extensionless USE target crash (#688) | Already fixed separately in PR #698 |
| Changing the default compiler trigger | `debounced` gives live errors while typing, the point of v4.5; `on-save` is the documented choice for large workspaces |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TRIG-01 | Phase 106 | Complete |
| TRIG-02 | Phase 106 | Pending |
| TRIG-03 | Phase 106 | Complete |
| TRIG-04 | Phase 106 | Complete |
| TRIG-05 | Phase 106 | Complete |
| TRIG-06 | Phase 106 | Pending |
| TRIG-07 | Phase 106 | Complete |
| VAL-01 | Phase 107 | Pending |
| VAL-02 | Phase 107 | Pending |
| DIAG-01 | Phase 106 | Complete |
| LIFE-01 | Phase 108 | Pending |
| LIFE-02 | Phase 108 | Pending |
| COMP-01 | Phase 109 | Pending |
| COMP-02 | Phase 109 | Pending |
| COMP-03 | Phase 109 | Pending |
| JINT-01 | Phase 109 | Pending |
| JINT-02 | Phase 109 | Pending |
| JINT-03 | Phase 106 | Pending |

**Coverage:**

- v1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

Per phase: Phase 106 — 9 (TRIG-01..07, DIAG-01, JINT-03); Phase 107 — 2 (VAL-01, VAL-02);
Phase 108 — 2 (LIFE-01, LIFE-02); Phase 109 — 5 (COMP-01..03, JINT-01, JINT-02).

---
*Requirements defined: 2026-09-24*
*Last updated: 2026-09-24 after roadmap creation (traceability filled, 18/18 mapped)*
