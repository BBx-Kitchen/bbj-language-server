---
phase: 110-workspace-settings-filesystem-trust
plan: 02
subsystem: language-server
tags: [langium, path-containment, use-statement, security, scope-provider, validator]

# Dependency graph
requires:
  - phase: 110-workspace-settings-filesystem-trust
    provides: "110-01's interop-config.ts (injectable-module shape precedent); no functional dependency"
provides:
  - "path-containment.ts: isPathInside(root, candidate, platform?) and containedPrefixCandidates(prefixes, usePath, platform?), the only PREFIX-membership decision in the repository"
  - "Every PREFIX candidate reaching fsProvider.readFile, the scope provider's index lookup, or the USE-file validator's Searched list is first filtered through containedPrefixCandidates"
  - "isExternalDocument() decides membership on path segments instead of a raw string prefix"
affects: []

# Actuals (#2632)
actuals:
  tokens: 6785
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plain, Langium-free path helper (path-containment.ts) mirroring config-path-resolver.ts's samePath platform-branch style, narrowed to win32-only case-insensitivity per D-10"
    - "containedPrefixCandidates centralizes 'resolve against each prefix, keep only the contained ones' so every one of the four call sites (document builder, scope provider, validator, revalidation) shares one filter instead of four ad-hoc resolve() maps"

key-files:
  created:
    - bbj-vscode/src/language/path-containment.ts
    - bbj-vscode/test/path-containment.test.ts
    - bbj-vscode/test/use-path-containment.test.ts
  modified:
    - bbj-vscode/src/language/bbj-document-builder.ts
    - bbj-vscode/src/language/bbj-scope.ts
    - bbj-vscode/src/language/bbj-validator.ts
    - bbj-vscode/src/language/bbj-ws-manager.ts

key-decisions:
  - "Followed D-10..D-15 exactly as written: containment is lexical (no realpath), Windows-only case-insensitivity (not darwin, unlike samePath), document-relative and workspace-root candidates left untouched, empty prefixes still skipped in isExternalDocument"
  - "The plan's own <behavior> text for Task 2 describes 'gets a linking error for Outside' alongside the 'could not be resolved' diagnostic; in practice the existing diagnostic hierarchy (Rule 2 in bbj-document-validator.ts) downgrades a redundant LinkingError to Warning and then suppresses it once an Error-severity diagnostic exists for the same statement — this is pre-existing, unrelated-to-this-plan behavior. The test instead asserts directly on the Use statement's own `bbjClass` cross-reference (`.ref` is `undefined`), which is hierarchy-independent and a strictly stronger proof that the escaping candidate never linked"

patterns-established:
  - "isPathInside/containedPrefixCandidates take an explicit platform parameter (default process.platform) so cross-platform behavior (win32 vs POSIX) is unit-testable without process.platform mocking, matching bbj-home-layout.ts's resolveBbjBinary precedent"

requirements-completed: [SEC-06, SEC-07]

coverage:
  - id: D1
    description: "One plain module (no Langium/editor imports) decides PREFIX containment lexically via path.relative semantics, case-insensitive on Windows only; no second hand-rolled startsWith containment check exists anywhere in the repository"
    requirement: SEC-06
    verification:
      - kind: unit
        ref: "test/path-containment.test.ts#isPathInside (10 cases incl. /libs/foo2 vs /libs/foo, trailing separator, .. escape, ..x non-escape, win32 case-insensitivity, sibling, drive letter)"
        status: pass
      - kind: unit
        ref: "test/path-containment.test.ts#containedPrefixCandidates (relative escape, in-root relative, absolute in-root, absolute outside)"
        status: pass
      - kind: other
        ref: "grep -c realpath bbj-vscode/src/language/path-containment.ts -> 0; grep -rn \"startsWith(URI.file\" bbj-vscode/src -> empty"
        status: pass
    human_judgment: false
  - id: D2
    description: "addImportedBBjDocuments reads a USE candidate only when it lies inside the PREFIX root it was resolved against; an escaping candidate (.. escape, absolute-outside, or a transitive escape from an already-loaded PREFIX file) is never opened and resolution continues with the next prefix; the existing 'could not be resolved' diagnostic and its text are unchanged"
    requirement: SEC-06
    verification:
      - kind: integration
        ref: "test/use-path-containment.test.ts#the document builder reads only contained PREFIX candidates (issue #526) > a relative escape, an absolute-outside path and a transitive escape are never opened; in-root imports still load"
        status: pass
      - kind: integration
        ref: "test/lazy-prefix-loading.test.ts, test/document-builder.test.ts (regression, unchanged assertions)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The scope provider's PREFIX-derived candidates, the USE-file validator's PREFIX group, and the post-import revalidation all filter through the same containedPrefixCandidates; the document-relative and workspace-root candidate groups (#378) are unchanged; a path that escapes every PREFIX root is reported as not resolved instead of resolving through the escaping candidate"
    requirement: SEC-06
    verification:
      - kind: integration
        ref: "test/use-path-containment.test.ts#scope and validation ignore PREFIX candidates outside their root (issue #526) (escaping/in-root/document-relative cases)"
        status: pass
      - kind: integration
        ref: "test/use-project-root.test.ts, test/classes.test.ts, test/imports.test.ts, test/extensionless-use-target.test.ts (regression, classes.test.ts diff-empty against HEAD)"
        status: pass
    human_judgment: false
  - id: D4
    description: "isExternalDocument() decides PREFIX membership with isPathInside instead of a raw fsPath.startsWith(prefix) string check: a document under /libs/foo2/ is not treated as inside the prefix /libs/foo, while an in-prefix document and the prefix directory itself still are, and empty prefixes are still skipped"
    requirement: SEC-07
    verification:
      - kind: unit
        ref: "test/path-containment.test.ts#isExternalDocument decides PREFIX membership on path segments (issue #579) (7 cases incl. sibling directory, trailing separator, empty prefix, uninitialized settings)"
        status: pass
      - kind: integration
        ref: "test/ws-manager.test.ts (regression, unchanged assertions)"
        status: pass
    human_judgment: false

duration: 13min
completed: 2026-09-26
status: complete
---

# Phase 110 Plan 02: PREFIX Path Containment Summary

**One `path-containment.ts` helper (`isPathInside`/`containedPrefixCandidates`) now gates every PREFIX-root decision — the document builder's `readFile`, the scope provider's and validator's candidate lists, and `isExternalDocument()`'s membership test — so a `USE ::../../x::` or an absolute path can no longer read or resolve a file outside every configured PREFIX root (issue #526), and a sibling directory sharing a name prefix like `/libs/foo2` is no longer misclassified as inside `/libs/foo` (issue #579).**

## Performance

- **Duration:** 13 min
- **Started:** 2026-09-26T12:30:00Z
- **Completed:** 2026-09-26T12:43:24Z
- **Tasks:** 3
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments
- `path-containment.ts` exports `isPathInside(root, candidate, platform?)` — resolves both paths with the platform's own `path.resolve` (Windows semantics only for `platform === 'win32'`), compares case-insensitively on Windows only, and decides containment from `path.relative(root, candidate)` (empty, or not absolute/not `..`/not `..`+sep) — and `containedPrefixCandidates(prefixes, usePath, platform?)`, which resolves a USE path against each prefix in order and keeps only the candidates `isPathInside` accepts
- `addImportedBBjDocuments` (the document builder) now iterates `containedPrefixCandidates` instead of the raw prefix list: a `../` escape, an absolute path outside every root, and a transitive escape from an already-loaded PREFIX file are all skipped without a `fsProvider.readFile` call, proven by a spy `FileSystemProvider` asserting on the recorded read targets (not only on the resulting documents)
- `getBBjClassesFromFile` (scope provider), the USE-file validator's candidate build, and `revalidateUseFilePathDiagnostics` all replace their `prefixes.map(prefixPath => URI.file(resolve(prefixPath, path)))` line with `containedPrefixCandidates(...).map(p => URI.file(p))` — the document-relative and workspace-root (#378) candidate groups are byte-for-byte unchanged
- `isExternalDocument()` in `bbj-ws-manager.ts` replaces its `fsPath.startsWith(URI.file(prefix).fsPath)` string check with `isPathInside(URI.file(prefix).fsPath, documentUri.fsPath)` — the one hand-rolled `startsWith` containment check in the repository (confirmed absent afterward via `grep -rn "startsWith(URI.file" src`)
- `resolve` is no longer imported in `bbj-document-builder.ts`, `bbj-scope.ts`, or `bbj-validator.ts` — every prefix-resolution call site in those three files now goes exclusively through the shared helper

## Task Commits

Each task was committed atomically:

1. **Task 1: A USE path that escapes its PREFIX root reads no file, end to end through the document builder** - `a972628c` (feat)
2. **Task 2: Scope lookup and USE validation ignore PREFIX candidates that escape their root** - `b845f637` (feat)
3. **Task 3: isExternalDocument() decides PREFIX membership on path segments** - `3ecc414f` (fix)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified
- `bbj-vscode/src/language/path-containment.ts` - the single PREFIX-containment decision (new)
- `bbj-vscode/src/language/bbj-document-builder.ts` - `addImportedBBjDocuments` and `revalidateUseFilePathDiagnostics` filter through `containedPrefixCandidates`
- `bbj-vscode/src/language/bbj-scope.ts` - `getBBjClassesFromFile`'s PREFIX candidate group filtered
- `bbj-vscode/src/language/bbj-validator.ts` - the USE-file check's PREFIX candidate group filtered
- `bbj-vscode/src/language/bbj-ws-manager.ts` - `isExternalDocument()` uses `isPathInside`
- `bbj-vscode/test/path-containment.test.ts` - direct unit coverage for `isPathInside`/`containedPrefixCandidates`/`isExternalDocument` (new)
- `bbj-vscode/test/use-path-containment.test.ts` - spy-`FileSystemProvider` builder test and scope/validator escape tests (new)

## Decisions Made
- Followed D-10 through D-15 exactly as CONTEXT.md specified — no deviations from the locked decisions.
- Adjusted the Task 2 test's linking-failure assertion (see key-decisions above): the plan's `<behavior>` text describes both a linking error and a "could not be resolved" diagnostic appearing together, but the repository's existing diagnostic hierarchy (a pre-existing rule, unrelated to this plan) downgrades and then suppresses the redundant LinkingError once an Error-severity diagnostic exists for the same statement. The test proves the escape non-resolution directly against the Use statement's `bbjClass.ref` instead, which is a stronger, hierarchy-independent signal than filtering `document.diagnostics` for a diagnostic that the existing (unmodified) hierarchy logic legitimately drops.

## Deviations from Plan

None - plan executed exactly as written. The Task 2 test-assertion adjustment above is documented as a Decision, not a deviation: it changes how the test proves the same invariant, not the plan's specified production behavior (D-11/D-12's "no new diagnostic text" and "existing diagnostic applies unchanged" both hold; confirmed by the printed diagnostic message and its Searched list).

## Issues Encountered

Two hook-contention false alarms during verification, both matching the project's documented `initializeWorkspace` beforeAll-timeout pattern: `test/use-project-root.test.ts` and `test/classes.test.ts` (Task 2 verify set) and `test/lazy-prefix-loading.test.ts` (Task 3 verify set and the plan-level combined run) each timed out with a 10s `beforeAll` hook error when run alongside other Langium-workspace-initializing suites, but passed cleanly (0 failures) when run in isolation. Confirmed as contention, not a regression, per the standing project decision (numFailedTests:0 substitutes for the identity-delta gate).

The whole-suite regression gate (`RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2`, cwd `bbj-vscode`) reported 3 failed test *files* but 0 failed *tests* (2813 passed, 157 skipped). Two (`test/setopts-code-scanner.test.ts`, `test/validation-function-calls.test.ts`) are the same `beforeAll`/`initializeWorkspace` hook-contention pattern, unrelated to this plan's files (neither touches USE-path resolution or PREFIX handling). The third, `test/functional/installed-extension-e2e.test.ts > installed extension e2e: SETOPTS-in-code (#475)`, is the project's documented pre-existing failure on the phase base — confirmed via `git diff c591cfe8 HEAD -- bbj-vscode/test/functional/installed-extension-e2e.test.ts` returning empty (byte-identical to the phase base) and this plan's five changed source files not intersecting the SETOPTS/composer code path. This plan's own targeted verification commands (all three tasks' `<verify>` blocks) passed with 0 failures, and `npx tsc -p tsconfig.json` was clean after every task.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- SEC-06 and SEC-07 are complete; issues #526 and #579 are addressed in code — closing keywords go in the milestone PR, not in these commits.
- `path-containment.ts` is a disjoint new module from 110-01's `interop-config.ts`, 110-03's decompile probes, 110-04's formatter resolver, and 110-05's Workspace Trust gate — no coordination needed with the rest of Phase 110.
- No blockers for the remaining Phase 110 verification.

---
*Phase: 110-workspace-settings-filesystem-trust*
*Completed: 2026-09-26*

## Self-Check: PASSED
