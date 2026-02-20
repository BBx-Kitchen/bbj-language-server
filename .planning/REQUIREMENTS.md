# Requirements: BBj Language Server

**Defined:** 2026-02-20
**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

## v3.8 Requirements

Requirements for test & debt cleanup milestone. Each maps to roadmap phases.

### Test Failures

- [ ] **TEST-01**: `classes.test.ts` private class error message expectation updated to match `(declared in ...)` format
- [ ] **TEST-02**: `classes.test.ts` protected class error message expectation updated to match `(declared in ...)` format
- [ ] **TEST-03**: `completion-test.test.ts` DEF FN parameters with `$` suffix complete correctly inside class methods
- [ ] **TEST-04**: `imports.test.ts` USE referencing file with no classes produces file-path error diagnostic
- [ ] **TEST-05**: `validation.test.ts` private instance member access flagged cross-file
- [ ] **TEST-06**: `validation.test.ts` private static member access flagged cross-file

### Test Hardening

- [ ] **HARD-01**: 9 commented-out `expectNoValidationErrors()` assertions uncommented and passing in `parser.test.ts`

### Dead Code

- [ ] **DEAD-01**: MethodCall CAST branch removed from `bbj-type-inferer.ts`
- [ ] **DEAD-02**: `checkCastTypeResolvable` for MethodCall removed from `bbj-validator.ts` (method + registration)

### Production FIXMEs

- [ ] **FIX-01**: `bbj-linker.ts:74` — Receiver ref resolution FIXME resolved or documented as intentional
- [ ] **FIX-02**: `bbj-scope.ts:209` — Orphaned AST instances hack resolved or documented as intentional
- [ ] **FIX-03**: `java-javadoc.ts:54` — Javadoc re-trigger FIXME resolved
- [ ] **FIX-04**: `InteropService.java:166` — Inner class name handling FIXME resolved

### Actionable TODOs

- [ ] **TODO-01**: `bbj-completion-provider.ts:144` — Add documentation to completion item description
- [ ] **TODO-02**: `java-interop.ts:78` — Send error message to the client on connection failure

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Architectural TODOs

- **ARCH-01**: `bbj-scope.ts:450` — Inspect USE inside classes
- **ARCH-02**: `bbj-scope-local.ts:221` — Move super getter/setter to ScopeProvider
- **ARCH-03**: `bbj-ws-manager.ts:15` — Extend FileSystemAccess or add additional service
- **ARCH-04**: `bbj-ws-manager.ts:221` — Check that document is part of workspace folders

### Feature TODOs

- **FEAT-01**: `bbj-completion-provider.ts:132` — Load param names for Java methods from Javadoc
- **FEAT-02**: `java-interop.ts:407` — Check types of parameters

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Parser test flakiness TODO | Non-blocking, test infrastructure concern |
| Matrix operations TODO | Feature-level grammar work |
| Test-only TODOs (remove `/@@@/`, etc.) | Non-blocking, cosmetic |
| CPU stability mitigations (#232) | Separate milestone — significant architectural work |
| BBjCPL deferred items (-t flag, pipe mode, range correlation) | Separate milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEST-01 | — | Pending |
| TEST-02 | — | Pending |
| TEST-03 | — | Pending |
| TEST-04 | — | Pending |
| TEST-05 | — | Pending |
| TEST-06 | — | Pending |
| HARD-01 | — | Pending |
| DEAD-01 | — | Pending |
| DEAD-02 | — | Pending |
| FIX-01 | — | Pending |
| FIX-02 | — | Pending |
| FIX-03 | — | Pending |
| FIX-04 | — | Pending |
| TODO-01 | — | Pending |
| TODO-02 | — | Pending |

**Coverage:**
- v3.8 requirements: 15 total
- Mapped to phases: 0
- Unmapped: 15

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-20 after initial definition*
