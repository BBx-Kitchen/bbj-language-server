---
phase: 123-documentation-drift
plan: 05
subsystem: docs
tags: [claude-md, developer-docs, docusaurus, architecture]

# Dependency graph
requires: []
provides:
  - CLAUDE.md Architecture section naming the real nine-entry lsp provider group, every
    validations/ module, the split java-interop modules and JavadocProvider/BBjParserService DI
    entries
  - CLAUDE.md Testing Pattern showing createBBjTestServices(EmptyFileSystem) as the default
  - CLAUDE.md CI gates paragraph naming build.yml and workflow-hygiene.yml checks
  - documentation/concepts/browser-editor.md naming java-interop-connection.ts for the socket seam
affects: []

actuals:
  tokens: 2554
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - CLAUDE.md
    - documentation/concepts/browser-editor.md

key-decisions:
  - "Verified against bbj-module.ts that the lsp service group has exactly nine entries (CompletionProvider plus eight further, including CodeLensProvider); wrote 'eight further', matching the code over the drift scan's stale count."
  - "Described each validations/ module and each split java-interop-*.ts module from its own header comment rather than the drift scan's summary, per the plan's code-wins rule."

patterns-established: []

requirements-completed: [DEV-01, DEV-02, DEV-03]

coverage:
  - id: D1
    description: "documentation/concepts/browser-editor.md names java-interop-connection.ts (not java-interop.ts) as the module holding the socket transport, in both the seam table and the Phase-1 refactor list"
    requirement: "DEV-03"
    verification:
      - kind: other
        ref: "grep -c java-interop-connection.ts documentation/concepts/browser-editor.md (returns 2)"
        status: pass
    human_judgment: false
  - id: D2
    description: "CLAUDE.md Architecture names every provider in bbj-module.ts's lsp group, every validations/ module, the split java-interop module set, and JavadocProvider/BBjParserService as DI services"
    requirement: "DEV-01"
    verification:
      - kind: other
        ref: "node architecture-check.js in Task 2 verify block (prints 'architecture ok')"
        status: pass
    human_judgment: false
  - id: D3
    description: "CLAUDE.md's testing pattern shows createBBjTestServices(EmptyFileSystem) as the default for new tests, and the command list/CI-gates paragraph names typecheck:test, build.yml and workflow-hygiene.yml's three checkers"
    requirement: "DEV-02"
    verification:
      - kind: other
        ref: "grep checks in Task 3 verify block (7 CI-gate hits, Testing Pattern example calls createBBjTestServices(EmptyFileSystem))"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-09-30
status: complete
---

# Phase 123 Plan 05: Developer Docs Architecture, Testing Pattern and CI Gates Summary

**CLAUDE.md's Architecture section now names the real nine-entry lsp provider group, all ten `validations/` modules, the five split `java-interop-*.ts` modules plus `java-peer-guard.ts`/`java-javadoc.ts`, `createBBjTestServices(EmptyFileSystem)` as the default test entry point, and both CI workflows' gates; the concepts page points at `java-interop-connection.ts` for the socket transport.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-30T09:46:00Z
- **Completed:** 2026-09-30T10:11:00Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- `documentation/concepts/browser-editor.md`'s seam table and Phase-1 refactor list now name `java-interop-connection.ts` (the `JavaInteropConnection` class that actually owns the `net.Socket`), not the `java-interop.ts` front class
- CLAUDE.md's Architecture section lists all nine `lsp` service group providers (`CompletionProvider` plus eight further, including the previously undocumented `CodeLensProvider`), every module in `validations/` with a one-line description drawn from its own header comment, the java-interop module split (`java-interop.ts` front over `java-interop-connection.ts`/`java-interop-cache.ts`/`java-interop-class-index.ts`/`java-interop-classpath.ts`/`java-interop-lock.ts`, plus `java-peer-guard.ts` and `java-javadoc.ts`), and `bbj-parser-service.ts` next to the CPL integration files
- CLAUDE.md's DI Module Pattern list now includes `services.java.JavadocProvider` (injected, no static singleton) and `services.compiler.BBjParserService`
- CLAUDE.md's Testing Pattern makes `createBBjTestServices(EmptyFileSystem)` the default example, explains its hermetic fakes, and keeps `createBBjServices` as the production-only escape hatch
- CLAUDE.md's Build & Test Commands gained `npm run typecheck:test` and a new "CI gates" paragraph naming `build.yml`'s four gates and `workflow-hygiene.yml`'s three checker commands

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): concepts page names java-interop-connection.ts for the socket transport** - `43af711c` (docs)
2. **Task 2: CLAUDE.md architecture — eight further providers, validation modules, java-interop split, DI groups** - `198672cf` (docs)
3. **Task 3: CLAUDE.md testing pattern and CI gates** - `6aee2914` (docs)

**Plan metadata:** (this commit)

## Files Created/Modified
- `documentation/concepts/browser-editor.md` - seam table + refactor list now name java-interop-connection.ts
- `CLAUDE.md` - Architecture, DI Module Pattern, Testing Pattern and Build & Test Commands sections rewritten to match the code

## Decisions Made
- Verified the `lsp` group's exact provider count against `bbj-module.ts` (9 entries) before writing "eight further", rather than trusting the drift scan's count
- Took each `validations/` and `java-interop-*.ts` module's description from its own header comment, per the plan's "code wins over the scan" rule; no counts (file counts, class counts) were written into prose

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
CLAUDE.md and the concepts page are back in sync with the code. Ready for `123-06-PLAN.md`.

---
*Phase: 123-documentation-drift*
*Completed: 2026-09-30*

## Self-Check: PASSED

- `CLAUDE.md` exists: FOUND
- `documentation/concepts/browser-editor.md` exists: FOUND
- Commit `43af711c` found in git log: FOUND
- Commit `198672cf` found in git log: FOUND
- Commit `6aee2914` found in git log: FOUND
- All Task 1-3 acceptance criteria re-verified and passing (see verify output above)
- Plan-level verification: `git diff --name-only 8b53253d -- CLAUDE.md documentation/concepts/` lists exactly the two files of this plan
