---
gsd_state_version: 1.0
milestone: v4.7
milestone_name: Audit Hygiene Burn-down (Phases 110-122) — IN PROGRESS
current_phase: 118
current_phase_name: Small Dedup & Drift Guards
status: executing
stopped_at: Completed 118-02-PLAN.md
last_updated: "2026-09-28T21:03:52.743Z"
last_activity: 2026-09-28
last_activity_desc: Phase 118 execution started
state_head: 01bad0026fcbdb4a44281d0fa80dcf65799d54db
progress:
  total_phases: 13
  completed_phases: 7
  total_plans: 58
  completed_plans: 57
  percent: 54
---

# Project State: BBj Language Server

**Last Updated:** 2026-09-28 (Phase 116 complete — verification 4/4, 4/4 requirements; next Phase 117)

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-27)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** Phase 118 — Small Dedup & Drift Guards

---

## Current Position

Phase: 118 (Small Dedup & Drift Guards) — EXECUTING
Plan: 3 of 3
Status: Ready to execute
Last activity: 2026-09-28 — Phase 118 execution started

Progress: [█████░░░░░] 54% (6/13 phases)

### v4.7 milestone map

| Phase | Name | Requirements | Issues (Closes) |
|-------|------|--------------|-----------------|
| 110 | Workspace Settings & Filesystem Trust | SEC-01, SEC-02, SEC-06..09, REF-02 | #509 #510 #511 #526 #579 #585 #605 #581 |
| 111 | Java Class Data from the Interop Peer | SEC-03..05, FIX-02, FIX-03 | #523 #524 #525 #676 (+ todo) |
| 112 | EM Login & Web Launch Fail Closed | SEC-12..14, TEST-09 | #546 #548 #553 #565 |
| 113 | Composer Webview Hardening & Consolidation | SEC-10, SEC-11, TEST-10, REF-03, REF-07, REF-08, DOC-01 | #604 #626 #628 #582 #533 #534 #595 |
| 114 | Lint, Type-Check & Test-Suite Gates | TEST-01..03, TEST-07, TEST-11, FIX-04 | #574 #516 #519 #562 #629 (+ todo) |
| 115 | Honest Interop Test Harness | HARN-01..06, DEP-03 | #514 #575 #596 #599 #601 #635 #520 |
| 116 | Java-Interop Test Coverage | TEST-04..06, TEST-08 | #528 #559 #560 #563 |
| 117 | Dependency Hygiene & Dependabot Coverage | DEP-01, DEP-02, DEP-04, DEP-05, CI-04 | #501 #507 #521 #551 |
| 118 | Small Dedup & Drift Guards | REF-01, REF-04..06 | #580 #583 #603 #606 |
| 119 | Grammar — DECLARE File Paths & Shared Channel Opening | FIX-01, REF-13 | #527 #602 |
| 120 | ClassValidator & activate() Splits | REF-10, REF-11 | #625 #564 |
| 121 | Java Interop Service Decomposition | REF-09, REF-12 | #624 #558 |
| 122 | Release & CI Pipeline Hardening | CI-01..03, CI-05..09 | #547 #549 #550 #518 #573 #515 #598 #600 |

Ordering: security first (110-113), then the test gates (114-116) before the large refactors
(119-121, with the `JavaInteropService` split last among them), and the publish pipeline (122)
last, because every push to `main` publishes previews to both marketplaces.

## Performance Metrics

### Cumulative

**Started:** 2026-02-01
**Milestones shipped:** 23
**Phases completed:** 107
**Plans completed:** 418
**Days elapsed:** 238
**Velocity:** ~1.5 plans/day (lifetime); v4.6 ran at ~8 plans/day over its 3 days

Per-plan duration tables for phases 72-109 are archived with their phase artifacts under
`.planning/milestones/v4.2-phases/` through `v4.6-phases/`.

### Recent History

**v4.6 (Shipped: 2026-09-26):**

- Duration: 3 days (2026-09-24 → 2026-09-26)
- Phases: 4 (106-109)
- Plans: 25 (60 tasks)
- Key: user-facing bug burn-down. `on-save` really waits for a save in both IDEs and keeps the last save's compiler errors visible; one error per finding on the bbjcpl fallback; the live parse gets its own connection first; single-line IF false alarms and the use-before-assignment crash fixed; unknown Java members on resolved classes are Errors; IntelliJ detects a crashed server via LSP4IJ's unexpected-stop hook; completion fixes for FQN statics, overloads, method bodies and Java class resolution. Audit `tech_debt` with no gaps; override closeout (2 artifacts acknowledged). On `main` via PR #699 (merged 2026-09-26).

**v4.5 (Shipped: 2026-09-24):**

- Duration: 4 days (2026-09-20 → 2026-09-23 phase work, closed 2026-09-24)
- Phases: 8 (98-105; 105 added mid-milestone for #692)
- Plans: 44 (124 tasks)
- Key: compiler conformance. A 168 → 9, A2 267 → 22 and B 658 → 31 of 1,210 with the new `bbj-ls` `parseProgram` endpoint feeding live compiler diagnostics, one set of errors via verdict reconciliation, and large-workspace live diagnostics in 5-6 s. Audit `tech_debt` with no gaps; override closeout (3 artifacts acknowledged). Code on `main` via PR #691 (merged 2026-09-24).

**v4.4 (Shipped: 2026-09-20):**

- Duration: 7 days (roadmap 2026-09-17, phase work 4 days)
- Phases: 5 (93-97)
- Plans: 36 (101 tasks)
- Key: all 21 GitHub milestone #7 IntelliJ issues closed — eleven behaviour fixes (composer EDT guards and server-verdict OK gating, honest java-interop status, EM login cleanup and enablement, cached TextMate bundle, one Node.js decision engine attested on real Windows) and ten consolidations; shipped as release 0.16.0 through the verify-before-publish gate; a crash-detection rework was reverted before release; override closeout, no milestone audit (6 artifacts acknowledged). IntelliJ JUnit 865 → 1,101.

**v4.3 (Shipped: 2026-09-13):**

- Duration: 8 days
- Phases: 9 (84-92)
- Plans: 70 (174 tasks)
- Key: all 23 GitHub milestone #5 issues fixed in code — config path honored everywhere with hot-reload, IntelliJ targeted Java refresh and port auto-detect, composer cues in both IDEs plus SETOPTS-in-code and CVS() composers, composer robustness on both hosts, language-server responsiveness, host-side hygiene; milestone audit `tech_debt` with no gaps; override closeout (21 artifacts acknowledged). All phases now on `origin/main`.

**v4.2 (Shipped: 2026-09-06):**

- Duration: 3 days
- Phases: 6 (78-83)
- Plans: 25 (74 tasks)
- Key: Every open PRIO 1/2 IntelliJ issue (22) closed in code — EDT responsiveness, fail-closed EM token handling with owner-only temp files on Windows, `bbj/compile` on the shared language server, composer stale-edit guard, JDK 17 toolchain and pinned wrapper, IntelliJ JUnit suite 96 → 504; landed on `origin/main` via PR #651

Per-plan metrics for phases 98-109 are in the phase SUMMARYs under `.planning/milestones/v4.5-phases/` and `v4.6-phases/`.
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 110 P01 | 9min | 2 tasks | 5 files |
| Phase 110 P03 | 7min | 2 tasks | 2 files |
| Phase 110 P04 | 8min | 3 tasks | 7 files |
| Phase 110 P05 | 14min | 3 tasks | 9 files |
| Phase 110 P02 | 13min | 3 tasks | 7 files |
| Phase 111 P01 | 45min | 3 tasks | 3 files |
| Phase 111 P02 | 14min | 2 tasks | 2 files |
| Phase 111 P03 | 20min | 3 tasks | 4 files |
| Phase 111 P04 | 21min | 2 tasks | 3 files |
| Phase 111 P05 | 12min | 2 tasks | 5 files |
| Phase 111 P06 | 27min | 2 tasks | 4 files |
| Phase 111 P07 | 15min | 2 tasks | 5 files |
| Phase 112 P01 | 14min | 2 tasks | 2 files |
| Phase 112 P02 | 14min | 2 tasks | 4 files |
| Phase 112 P04 | 26min | 3 tasks | 7 files |
| Phase 112 P03 | 16min | 2 tasks | 7 files |
| Phase 113 P01 | 18min | 3 tasks | 3 files |
| Phase 113 P02 | 38min | 3 tasks | 9 files |
| Phase 113 P03 | 22min | 3 tasks | 7 files |
| Phase 113 P04 | 18min | 2 tasks | 5 files |
| Phase 113 P05 | 12min | 2 tasks | 6 files |
| Phase 113 P06 | 39min | 2 tasks | 6 files |
| Phase 113 P07 | 17min | 3 tasks | 9 files |
| Phase 113 P08 | 24min | 2 tasks | 5 files |
| Phase 114 P01 | 13min | 2 tasks | 6 files |
| Phase 114 P03 | 16min | 2 tasks | 4 files |
| Phase 114 P02 | 41min | 3 tasks | 31 files |
| Phase 114 P05 | 22min | 3 tasks | 10 files |
| Phase 114 P06 | 18min | 3 tasks | 15 files |
| Phase 114 P07 | 27min | 3 tasks | 7 files |
| Phase 114 P04 | 24min | 2 tasks | 1 files |
| Phase 114 P08 | 13min | 2 tasks | 10 files |
| Phase 114 P09 | 16min | 2 tasks | 16 files |
| Phase 114 P10 | 12min | 2 tasks | 6 files |
| Phase 114 P11 | 20min | 2 tasks | 17 files |
| Phase 114 P12 | 15min | 2 tasks | 25 files |
| Phase 114 P13 | 21min | 3 tasks | 6 files |
| Phase 115 P01 | 12min | 2 tasks | 4 files |
| Phase 115 P02 | 11min | 2 tasks | 1 files |
| Phase 115 P03 | 22min | 3 tasks | 1 files |
| Phase 115 P04 | 16min | 3 tasks | 7 files |
| Phase 115 P05 | 12min | 2 tasks | 4 files |
| Phase 115 P06 | 22 min | 3 tasks | 4 files |
| Phase 116 P01 | ~20min | 3 tasks | 3 files |
| Phase 116 P02 | ~30min | 2 tasks | 8 files |
| Phase 116 P03 | 20min | 2 tasks | 3 files |
| Phase 116 P04 | ~20min | 2 tasks | 5 files |
| Phase 116 P05 | 25min | 2 tasks | 4 files |
| Phase 116 P06 | ~10min | 2 tasks | 2 files |
| Phase 117 P01 | 8min | 2 tasks | 2 files |
| Phase 117 P02 | 10min | 2 tasks | 1 files |
| Phase 117 P03 | 9min | 2 tasks | 3 files |
| Phase 117 P04 | 12min | 2 tasks | 2 files |
| Phase 117 P06 | 33min | 3 tasks | 1 files |
| Phase 118 P01 | 8min | 3 tasks | 9 files |
| Phase 118 P02 | 21min | 2 tasks | 2 files |

## Accumulated Context

### Active Constraints

- **v4.7:** the milestone PR carries one `Closes #N` line per issue (61 issues across Phases 110-122); an issue table does not close issues. Before the squash merge, scan the branch's commit bodies for closing keywords.
- **v4.7:** Phase 122 changes `preview.yml`, `manual-release.yml` and `vscode:prepublish`, which publish to both marketplaces on every push to `main`. The publish workflows cannot be run from the branch without publishing: check them statically, run packaging only up to the publish step, and watch the first preview run after the merge.
- **v4.7:** do not install or run langium 4.4 inside `bbj-vscode`; the DEP-05 upstream repro lives outside this repository.
- **v4.7:** "unchanged behaviour" in the refactor phases (113's consolidation, 118-121) means the existing suites pass without assertion changes, compared against the phase base when in doubt.
- **v4.5:** the conformance corpus and harness stay outside this repository (private `bbj-corpus`, `conformance/run.mjs --ls <this repo>`), are run locally at phase boundaries and never in CI. CI protection comes from synthetic regression files under `bbj-vscode/test/test-data/` (CONF-01). v4.7 Phase 119 (grammar) uses it.
- **v4.5:** no proprietary BBj source text enters this public repository — planning files, tests and regression files describe behaviour and use word lists only.
- **v4.5:** Phase 101 changes the separate `bbj-ls` repository (Java, runs inside BBjServices on port 5008, BASIS GitLab, ships with BBj 26.03+). Both extensions must keep working unchanged against an older BBj whose `bbj-ls` lacks the endpoint (PSRV-04), decided by a once-per-connection probe, not a version-string comparison.
- **v4.5:** no hand-written strict checks are added to the Langium grammar (bare expression statements, reserved words, block balance) — BBj's parser decides those contextually; they are deferred as STRICT-01/02.
- Disclosure constraint: no v4.1 planning artifact on `main` may describe a flaw mechanism, affected file, or exploitation path for any of the 8 unpublished advisories — opaque GHSA-id-only references only. Remediation research (`SECRETS-AND-EXEC.md`, `SUPPLY-CHAIN.md`) stays untracked via `.git/info/exclude`.
- New work lands via a branch cut from `origin/main` plus a pull request, with a per-commit register check of the source diff for planning identifiers (plan/D-xx/C-xx/COMP/CR-xx tokens) before push.
- Anything both IDEs need stays a host-neutral language-server request — no reimplementation on the IntelliJ side.
- No live IntelliJ UI test coverage exists in CI. Verification pattern is plain-Java seams under plain JUnit 5, whole-file source guards for IDE-only wiring, and hand UAT in a running IDE per phase — build both distributables first, and again from the final tree after code-review fixes.
- bbj-notifications.ts isolation module must be preserved — importing main.ts from shared services crashes tests

### Decisions

Full decision log in PROJECT.md's Key Decisions table; per-phase decision detail for phases 70-109
is archived with the phase directories (v4.1 embargoed off `main`; v4.2-v4.6 tracked). Standing
decisions:

- [v4.1, standing]: No CVE is requested for any advisory during implementation; CVE and severity are decided by the maintainer at publication time (a deliberate PROC-03 departure).
- [v4.1, standing]: Whole-suite regression gate is project-wide `numFailedTests: 0` plus deterministic targeted-file runs, not a failing-suite identity delta (DEBT.md item 5).
- [v4.4, standing]: IntelliJ consolidations ship as an abstract base plus thin no-arg subclasses, never a runtime-keyed "data-driven" single class — every per-kind difference stays compile-time checked.
- [v4.4, standing]: A runtime status or lifecycle sequence used as UAT evidence must come from a real `idea.log`, not a hand-derived trace (the Phase 97 crash-detection rework was approved on a wrong trace and reverted).
- [v4.4, standing]: IntelliJ whole-suite gates run with `--rerun-tasks` (or `cleanTest test`); a plain `test` can report UP-TO-DATE and mask a stale green.
- [v4.4, standing]: Before a squash merge, scan the branch's commit bodies for closing keywords — PR #679's squash closed #621/#594 early.
- [v4.5, standing]: new diagnostics from the compiler's parser are errors, like the compiler's own; invalid code is decided by BBj's parser, not hand-written strict checks.
- [v4.5]: PR #691 carried phases 98-105 and merged to `main` as one piece on 2026-09-24.
- [v4.6, standing]: an LSP4IJ unexpected-stop hook is the only IntelliJ crash signal; the status sequence alone cannot tell a crash from a stop.
- [v4.6]: PR #699 (`gsd/v4.6-user-facing-bug-burndown`) carried phases 106-109 and merged to `main` as one piece on 2026-09-26.
- [v4.7 roadmap]: #559's own diagnosis is superseded by the 2026-09-20 todo (the hermetic test double lacks the classes; the describe block never reaches :5008); TEST-05 follows the todo.
- [v4.7 roadmap]: #511 is fixed by gating only a workspace-scoped `bbj.configPath` behind VS Code Workspace Trust; `configPath` stays deliberately un-anchored to the workspace folder for system-wide config files.
- [v4.7 roadmap]: all workflow and packaging-script changes (CI-01..03, CI-05..09) are one late phase (122) so each workflow file is rewritten once; DEP-01 and CI-04 land earlier in Phase 117 because they do not change what a publish run does.
- [Phase 110]: 110-01: interop host/port validated through one shared module (interop-config.ts); default host consolidated to 'localhost' everywhere
- [Phase 110]: 110-03: isTokenizedFile and statSize both lstat-first and reject non-regular files; O_NOFOLLOW/O_NONBLOCK requested where the platform defines them, with an explicit typeof-number check to avoid silent Windows coercion — Closes issue #585: a symlink, directory or FIFO placed at the decompile probe path could redirect the read or block the extension host
- [Phase 110]: 110-04: bbj.formatter.javaPath (scope: machine) resolved/verified by formatter-java-resolver.ts before every spawn; a set value never falls back to PATH, an empty value is resolved by the module's own checked PATH walk — Closes issue #605: the formatter spawned a bare java from PATH with no check
- [Phase 110]: 110-05: bbj.configPath's workspace-scoped value is gated behind Workspace Trust in the VS Code client (effectiveConfigPath); initializationOptions, the settings push/pull, and the client's own config-association fallback all read through it; configPath itself stays un-anchored
- [Phase 110]: 110-02: One plain path-containment.ts module (isPathInside/containedPrefixCandidates) decides every PREFIX-membership check lexically via path.relative, Windows-only case-insensitive; the document builder, scope provider, USE-file validator, revalidation and isExternalDocument() all filter through it, closing issues #526 and #579.
- [Phase 110 UAT]: G-110-1 (formatter no-op with `javaPath` empty) is a pre-existing crash in the vendored formatter jar under `--single-line-if` on block IFs, only logged; deferred out of the phase. The user is considering moving the formatter into bbj-ls behind RPC and MCP (many Bugzilla formatter bugs).
- [Phase 111]: 111-01: java-peer-guard.ts is the single owner of Java-interop peer data bounds (length limits, truncateText, sanitizeJavaClassDto); resolveClass() guards its entry against an unusable class name and sanitizes before storeJavaClass(); Phase 2 bounds javadoc/real-name with one combined warn line per class — SEC-03 (#523): resolveClass() copied peer fields onto the AST unchecked
- [Phase 111]: 111-02: javaMemberAccess flag on LinkingErrorData plus a second applyDiagnosticHierarchy Rule 2 exemption keeps an unresolved Java member Warning on an uncertain receiver visible next to an unrelated Error; javaMemberLinkingMessage replaces the 'NamedElement' wording, no new dedup code needed (Phase 107's dropShadowedMemberLinkingDiagnostics already covers the certain-receiver case)
- [Phase 111]: 111-03: escapeMarkdown/toFenceSafeLine in java-peer-guard.ts applied once at hover's and completion's render boundary, neutralizing Markdown link/image syntax and fenced-code break-out in Java documentation (SEC-04, #524); the less-than sign is deliberately left unescaped (2026-09-26 user decision) so javadoc HTML tags stay readable
- [Phase 111]: 111-04: isKnownJavaPackage(qualifiedName) on JavaInteropService answers from the in-memory package tree only (never sends a request); tryResolveJavaReference in bbj-scope-local.ts returns before any class request when the name is already a known package, covering the USE branch, its $ fallback, the qualified JavaTypeRef branch and the MemberCall FQN preload alike — addresses issue #676: "Java class java.io has no container" log line
- [Phase 111]: 111-04: storeJavaClass's leaf step keeps an existing JavaPackage intact on a colliding class name (defence in depth): the class lands on the classpath fallback instead of overwriting the package; the "has no container" console.error stays for any other genuinely unexpected missing container, not downgraded as the fix
- [Phase 111]: 111-05: isJavaQualifiedName in java-peer-guard.ts gates both createUseAction and completeAutoImportClasses before either builds a use TextEdit; filtering happens before ranking/indexing so the preferred flag naturally moves to the next valid candidate when the top-ranked one is dropped (SEC-05, #525)
- [Phase 111]: 111-06: Phase 1 method/constructor parameters defaulted to [] beside the existing fields/methods defaults, closing the absent-parameters Phase 2 crash (SEC-03 gap 1) — Mirrors the javaClass.fields ??= [] precedent already in resolveClass Phase 1
- [Phase 111 UAT]: G-111-2 — the installed javadoc ends each member with a BASIS `[Docs](https://documentation.basis.cloud/...)` link that SEC-04 escaping turned into literal text. 111-07: escapeJavadocMarkdown keeps exactly one trailing link of that shape clickable (label Docs, https, host documentation.basis.cloud, restricted path); everything else stays escaped. IntelliJ/LSP4IJ shows raw javadoc HTML literally, so leaving `<` unescaped holds.
- [Phase 111]: 111-06: boundedJavadocName truncates hover's javadoc-file MethodDoc fallback name and each parameter name at MAX_JAVA_IDENTIFIER_LENGTH, falling back to the node's own bounded name on a non-string value (SEC-04/D-02 gap 2) — Closes the one D-02 hover path left unbounded; mirrors the interop path's realName bound
- [Phase 112]: 112-01: web.bbj requires a username; admin123 kept only for username! = "admin" with an empty password; one shared report_failure reporter (MSGBOX + release 1) backs the login-rejection path and every EM step after login, each with its own err= label
- [Phase 112]: 112-02: complete port of bbj-intellij's JwtValidity.check into src/em-token-validity.ts (strict base64url decode, Number.isSafeInteger overflow guard); getEMCredentials deletes bbj.em.token and re-prompts for any token it cannot positively decode as unexpired
- [Phase 112]: 112-04: Commands.cjs loaded and executed under vitest via a node:module registerHooks harness (issue #565); runWeb's legacy settings credentials fallback removed (SEC-12 Commands.cjs half); a pre-existing openEnterpriseManager PropertiesReader argument-shape bug (broken EM URL, never exercisable before this harness) fixed as a Rule 1 deviation
- [Phase 112]: 112-03: both IDE EM login prompts pre-fill the last successfully used username via a plain seam (em-username-memory.ts / EmUsernameMemory.java) over context.globalState / PropertiesComponent, remembered only after the token is stored
- [Phase 113]: 113-01: three new *-composer-ui.ts test files execute addWindow, addChildWindow and SETOPTS composer registration, Code Action providers and commands unmocked, pinning labels/ranges/preserved bits as literals ahead of the plan 05-08 consolidation — Closes issue #628 (TEST-10): every prior test file replaced these register functions with vi.fn(), so their CodeActionProvider classes and command callbacks had never executed under test
- [Phase 113]: 113-02: webview-message-guard.ts (isPlainObject/isString/isBoolean/isFiniteInt/isStringArray/isIntArray/isOneOf/isPanelMessage) guards all six composer webviews inline as the handler's first statement; tristate guard runs before its sender() round-trip; config.bbx apply's pre-existing missing value-validity break left untouched (deferred, Open Question 1)
- [Phase 113]: 113-03: assignToError joins ComposerModels.MsgboxPreview/CvsPreview and both dialogs render it via labeledWithError; CVS prefills s$; AddWindowComposerDialog/ComposerLauncher class docs now describe edit-in-place and all six composer kinds — IntelliJ half of SEC-11 (issue #626) plus DOC-01 (issue #595); SEC-11 stays open until plan 04's shared LS-side validation lands
- [Phase 113]: 113-04: validateAssignTo(text, resultType) in msgbox-composer.ts is the one shared validator; msgboxPreview/cvsPreview both apply the same shown-field rule (editMode !== true && assignTo present) to compute assignToError and fold it into valid; CVS prefills s$
- [Phase 113]: 113-05: composer-commands.ts moved from src/language/ to bbj-vscode/src/composer-commands.ts (REF-03); five internal imports rewritten to relative-local, main.ts/test/IntelliJ contract-test/model-doc references updated to match — Per D-13: the composer request layer sits next to the composer modules it re-exposes, stays language-server code bundled into main.cjs, with unchanged behaviour
- [Phase 113]: 113-06: composer-call-scanner.ts is the one place scanArgs/trimmedRange and the name-parameterised call locator (findCalls/findCallAt) live; CVS's stricter identifier/dot boundary is preserved via an explicit notAfterIdentifierOrDot option rather than folding it into one shared plain regex template
- [Phase 113]: 113-07: buildComposerCsp(webview) in webview-csp.ts is the single owner of the composer webview CSP array and nonce; all six panels call it in getHtml, byte-identical output, closing REF-07 (#533)
- [Phase 113]: 113-08: windowPanelArgAt(spec, uri, line, lineText, character) is the one shared Code Action helper; each composer's addXPanelArgAt is a one-line call with its own spec; requireFlagsSlot stays a per-kind spec option (true for addChildWindow, false for addWindow), never unified in either direction
- [Phase 114]: 114-01: vitest.config.ts declares test.include ['test/**/*.test.ts'] and test.exclude ['out/**', 'node_modules/**'] (D-11), verified byte-identical to the 159-file pre-change discovered set via vitest list --filesOnly
- [Phase 114]: 114-01: baseline/suite-digest.mjs plus base-sha.txt, files-before.txt, suite-before.txt captured from the untouched phase base tree; every later 114-xx plan compares its D-07/D-10/D-11 behaviour-neutrality claims against them
- [Phase 114]: 114-03: progressReporter(indicator) extracted as a package-visible static factory calling setIndeterminate(false) before every setText/setFraction; Proxy-based recording-fake test replaces the substring guard — The substring guard could not detect the real bug (indicator reset between chunks by the platform's saveToFile); only a fake invoked 2+ times with an interleaved reset proves it
- [Phase 114]: 114-03: bbjcplAvailability guard is reflective (getMethod + JsonNotification annotation value + ServiceEndpoints.getSupportedMethods), replacing a comment-blind text-scanning guard — A commented-out annotation or a changed parameter type still passed the old text-count/brace-scan guard; the reflective check mirrors exactly what LSP4IJ itself checks at registration
- [Phase 114]: 114-02: 28 un-gated test files (production createBBjServices + initializeWorkspace, not gated on shouldRunBBjTests) moved to createBBjTestServices; hookTimeoutSuites=0 across all whole-suite runs, confirming the real Java-interop socket round trip was the hook-timeout cost — D-08/D-09: harness-only fix, no src/ change; no offline fallback needed, every migrated test passes on the double
- [Phase 114]: 114-05: eslint.config.js spreads tseslint.configs.recommended unwrapped (reaching .cjs too) plus D-01/D-02 overrides; prefer-const autofix landed in 7 files leaving exactly the 51-finding hand-fix list; a new disable-directive guard test rejects file-wide/reason-less lint suppressions
- [Phase 114]: 114-06: 32 src lint findings from 114-05 fixed by hand (20 no-explicit-any via real/structural types, 9 unused names via optional catch bindings/underscore params, 3 small CST/const/param fixes); npx eslint src --max-warnings 0 is clean, build green — lineBreakMap typed LineBreakConfig<AstNode>[] with per-entry casts on the four helper-built configs, not a union of concrete configs (which broke checkLineBreaks' generic dispatch call); readSimpleName narrows to string|undefined in java-javadoc.ts (feeds .split) but stays unknown in bbj-hover.ts (only template-interpolated)
- [Phase 114]: 114-07: tsconfig.test.json repaired (extends, noEmit, rootDir ".", noImplicitAny false commented) behind a new typecheck:test script; baseline/typecheck-before.txt committed (399 errors, 76 files, grouped by owning plan); bbj-comment-provider.ts's two comment arrays typed explicitly (string | undefined)[] since evolving-array-type inference for a bare const [] only fires when noImplicitAny is on, and the relaxed test config turned this src file's inferred type into never[]
- [Phase 114]: 114-07: bbj-test-module.ts's fake Java AST objects rebuilt via typed makeMethod/makeField/makeParameter factories — fixing the $type discriminant (object -> .$type string) unmasked that deprecated/isStatic were silently missing on every method/field object; the factories set both explicitly plus $container on every parameter once its owning method exists
- [Phase 114]: 114-07: commands-cjs-harness.ts's CommandsModule/ConfigPathCacheModule interfaces typed with the tests' own call shapes (setResolvedConfigPath narrowed to {path, exists} rather than the full production ResolvedConfigPathResult); fakeVscode/fakeProcessRunner fakes given real parameter lists so mock.calls tuples type-check, closing the largest single test-tree error concentration (399 -> 300 errors) with no assertion changes
- [Phase 114]: 114-04: WireRecordingInteropService overrides the protected wrapSocket seam to judge issue447's live capability from the wire and force the real fallback, replacing the tautological hasCompleteClassIndex assertion — RESEARCH Open Question 1, option b: reuses the existing test seam already used by fake-interop-peer.ts, exercises the real MethodNotFound detection instead of bypassing it, and needs zero src/ changes
- [Phase 114]: 114-08: lint plan C closed the remaining 18+2 test-file lint findings and their overlapping type errors in one pass across ten files (NormalizedTextDocuments<TextDocument> generics, Diagnostic.getMessageString, createRequire(import.meta.url) loader, namespace Node-builtin imports, JavadocProviderUnderTest's forwarded lazyLoad param, rounded-out in-memory FileSystemProvider fakes) — npm run lint now exits 0 for the whole tree
- [Phase 114]: 114-09: config-reload-host.test.ts's Mock-shaped fake target type is declared standalone, not intersected with RestartTarget (intersecting a shared property name across an interface and an object-literal type combines both declared types, producing an unsatisfiable target); overrides is retyped to match
- [Phase 114]: 114-09: logger.test.ts's debug=false case wraps the literal in Boolean(false), not a : boolean annotation alone -- TS control-flow analysis narrows a never-reassigned const to its own literal type at use sites regardless of an explicit widening annotation
- [Phase 114]: 114-10: the six largest string|MarkupContent message-reading test files (line-break-validation, line-break-single-line-if, parser-keyword-statements, unresolvable-type, classes, variable-scoping) now read diagnostic text through Diagnostic.getMessageString(d); variable-scoping.test.ts's one always-true SymbolRef/FieldDecl comparison was dropped as a documented vacuous clause, predicate unchanged in what it selects
- [Phase 114]: 114-11: parser.test.ts's and imports.test.ts's apparent AST-narrowing/document-typing errors were collateral damage from a missing relative-import .js suffix, not missing isXxx()/isBbjDocument guards -- fixing the import restored the existing guards' narrowing with no new guard code — Under node16/nodenext module resolution an extensionless relative import still error-reports with a 'did you mean .js' hint but does not resolve for type-checking, so the imported guard functions typed as implicit any and lost all narrowing power
- [Phase 114]: 114-12: 13 default-import files (+ orchestrator-assigned eslint-disable-directives.test.ts) use namespace fs/os/path/crypto imports matching src's esModuleInterop-false convention; 9 suffix-only files gain .js; both composer UI tests' hoisted FakeRange constructor is overloaded to accept both vscode.Range forms (4 numbers, or 2 Positions with trailing undefined), matching production's own new vscode.Range(pos, pos) call sites -- npm run typecheck:test now exits 0 for the whole test tree
- [Phase 114]: 114-13: id: build plus steps.build.outcome gates Lint and Type-check test tree independently after Build in build.yml; Test's if: success() || failure() stays unchanged so it still reports when a gate fails
- [Phase 114]: 114-13: the Windows IntelliJ download-progress re-check (approved on Linux only) is filed as a new opportunistic pending todo rather than reopening or blocking the phase
- [Phase 115]: Human approved tsx 4.23.15 verbatim at the blocking-human legitimacy checkpoint before install (D-15)
- [Phase 115]: Installed tsx with --save-exact --ignore-scripts so bbj-vscode's own prepare script does not run under local Node 24 during the devDependency install
- [Phase 115]: 115-02: runRequest is the one generic scaffold every case runs through; deriveStatus (present && typeMatch, every assertion passed) alone derives status; isPeerErrorReply excludes vscode-jsonrpc's four transport codes so only a genuine peer error reply can satisfy case 17's acceptsPeerError opt-in; connect() disposes on socket close
- [Phase 115]: 115-02: case 12's field checks on the first returned class now count toward its status through the shared scaffold (an intentional tightening vs. the old inline wrapper, which discarded fieldChecks); cases 9/10/13/14 keep their tautological assertions until the next plan (D-21 ordering)
- [Phase 115]: 115-03: One CRITICAL_FIELDS list drives the gate/report/exit code (evaluateGate); cases 9/10/13/14 now each report one real disjunction assertion; case 10 opts into the scaffold's acceptsPeerError path like case 17; the JSON highlighter highlights before escaping so keys/strings colour correctly
- [Phase 115]: 115-04: side-effect-free types.ts/scaffold.ts/cases.ts/gate.ts plus a thin run-tests.ts CLI; a real loopback net.createServer + vscode-jsonrpc fake peer drives all 17 cases, the #514 regression and every D-19 mutation through 26 CI tests with no :5008 dependency — D-12/D-17/D-18/D-19: module split and CI coverage were the third step in D-21's ordering, after the scaffold and case/gate fixes landed in 115-02/03
- [Phase 115]: 115-05: generateReport's argument order is (results, matrixRows, verdict, host, port, generatedAt?) per the plan's stated signature; the one run-tests.ts call site was updated to match
- [Phase 115]: 115-05: toJsonText is exported from report.ts (beyond the plan's stated export list) so the value-to-JSON-text helper's undefined-to-'null' behavior could be tested directly
- [Phase 116]: unusedLoopbackPort() reuses startLoopbackPeer() (bind-then-close) instead of a second hand-rolled net.createServer, so loopback-jsonrpc-peer.ts has exactly one listen(0, '127.0.0.1') call site
- [Phase 116]: 116-01: interop-harness-fake-peer.ts's startFakePeer is now a thin four-entry handler-map adapter over the shared startLoopbackPeer; a toFakePeerContext() helper narrows the richer LoopbackPeerContext down to the harness's own drop()-only FakePeerContext
- [Phase 116]: 116-01: Task 3's resolution-lock concurrency assertion was settled by a throwaway probe (run once, deleted before commit) confirming distinct-class-name lookups serialize on the wire one at a time, in call order (max in-flight 1)
- [Phase 116]: 116-02: registerRefreshJavaClassesRequest/registerConfigurationChangeHandler(connection, deps) extraction moved both main.ts LSP handlers out behaviour-neutrally; one shared ReloadJavaClassesDeps closure feeds both, logger.info stays a direct call while setLogLevel is a dep
- [Phase 116]: 116-02: three pre-existing whole-file source-guard tests (config-hot-reload-wiring, config-path-resolution, interop-config) grepped main.ts's literal text and broke when the handler move relocated their target call sites; repointed at configuration-change-handler.ts with counts preserved
- [Phase 116]: 116-03: makeMethod gained a trailing opts.isStatic parameter (matching makeField's shape) instead of a second static-method helper — keeps one method-building function for every fixture class
- [Phase 116]: 116-03: the #505 scope-cost-regression signature-type test's fixture types moved from java.util.List/java.util.Map to java.util.Collection/java.util.SortedMap — the completed interop fixture now preloads List and Map, so the test needs distinct unpreloaded classes to keep its original assertion strength
- [Phase 116]: 116-04: the JAVA_PRIMITIVE_TYPE_NAMES src fix is narrow — a new bbj-scope-local.ts processNode branch (SimpleTypeRef primitive) and a bbj-scope.ts resolveClassScopeByName offer (primitive-only, ahead of the unchanged global scope); every other name, including capitalized classes like Byte, is unaffected
- [Phase 116]: 116-04: 'Array type ref' uses methodret #strings (not the null() fallback the plan allowed); it validated cleanly on the first attempt
- [Phase 116]: 116-05: suppress-object-receiver-warning chosen for the java.lang.Object receiver Warning (Task 1's blocking-human checkpoint, resolved by the human at plan time); processLinkingErrors now skips a member reached through an exactly-java.lang.Object receiver, and 'Release usage' (TEST-04's last disabled assertion) asserts expectNoValidationErrors and passes
- [Phase 116]: 116-06: isInteropPeerAnswering replaces isPortOpen; shouldRunBBjTests() gates on a real getClassInfo answer for java.lang.Object over a 3000ms probe
- [Phase 116]: 116-06: Both whole-suite runs (RUN_BBJ_TESTS=0 and =1) reported numFailedTests 0 on first measurement; no failure needed dispositioning, TEST-05 complete
- [Phase 117]: 117-01: regenerated package-lock.json with --package-lock-only --ignore-scripts (not plain npm install/ci), avoiding the Node 24 langium-generate prepare-script break while moving vsce to devDependencies
- [Phase 117]: 117-02: langium/langium-cli held via versions: ["4.4.x"] npm semver range (not bare dependency-name or update-types), proven by semver satisfies checks against 4.4.0/4.4.9 (matched) and 4.3.1/4.5.0 (not matched)
- [Phase 117]: 117-02: github-actions Dependabot entry groups all actions into one weekly PR (patterns ["*"]) since preview.yml has no path filter and every push to main publishes previews
- [Phase 117]: 117-03: bom.json's purl is asserted self-consistent (pkg:maven/${group}/${name}@${version}) and the pin's relativePath is asserted to equal lib/${name}-${version}.jar, so the SBOM, the purl and the vendored filename cannot silently drift apart — Near-zero-cost extension of the drift-guard assertion block, catching a coordinate/filename mismatch the plan's literal ask did not require but the same test naturally covers
- [Phase 117]: 117-04: Guava bumped from 31.1-jre to 33.7.1-jre (D-05) with an optional argv port added to SocketServiceApp (D-12) for the live D-06 smoke test; before/after harness comparison proved byte-identical results
- [Phase 117]: 117-05: Toy and structurally-faithful bbj-subset grammars (72-alt Statement, 7-level Expression chain, real MemberCall call loop) did not reproduce either langium 4.4 regression (parse-recovery slowdown, lost DEF FN completion params) via raw LangiumParser.parse() or full parseHelper pipeline; harness version isolation (chevrotain 12.0.0/13.2.0) confirmed sound; plan halted, DEP-05 repro half left open pending human decision
- [Phase 117]: 117-06: langium 4.4.0 slowdown + DEF FN completion loss both reproduce with the real bbj-vscode server (git-archive sibling copies, each with its own langium-cli generate); ladder strips to 59 parser rules, minimal/ deliverable runs in ~4s; chevrotain-allstar transitive-dep drift (0.4.4 vs pinned 0.4.3) found and pinned to keep the 4.3.1 baseline faithful; DEP-05 complete, ISSUE-DRAFT.md not filed
- [Phase 118]: 118-01: rewrote each lib/*.bbl from its .ts export's evaluated value via a throwaway tsx script (never hand-copied), unified all four catalog wrappers to one closing shape, and added bbl-catalog-drift.test.ts as the byte-exact guard
- [Phase 118]: 118-02: two-directional package.json-vs-COMPILER_OPTIONS drift test (compiler-options-package-json-drift.test.ts), NOT_BBJCPL_FLAGS allow-list for bbj.compiler.trigger self-checked against both sides; zero data edits needed, both a parser-keyword-statements timing flake and installed-extension-e2e's stale-bundle failure confirmed pre-existing against the phase base commit

### Tech Debt

- CPU stability mitigations documented but not yet implemented (#232)
- LSP4IJ experimental API usages remain (expected, requires LSP4IJ to stabilize); fenced since Phase 83
- BbjCompletionFeature depends on LSPCompletionFeature API that may change
- IntelliJ TextMate bundle cannot exclude config.bbx at filename level (adjacent to PLAT-01)
- Static method return type inference gap — String.valueOf(2) does not assign type
- v4.6: 107 A2 accepted on a file-set reading; 108 final UAT ran on the pre-review-fix build; 109-REVIEW IN-01..05 open (full list in `milestones/v4.6-MILESTONE-AUDIT.md`)
- v4.6 Phase 106 review debt (106-REVIEW.md): CR-01 a pending debounced compiler check still runs and publishes after switching the trigger to `off` (pre-existing); WR-01 the bbjcpl fallback branch suppresses Langium warnings before merging the kept BBjCPL error
- v4.7 Phase 114 review (114-REVIEW.md, advisory): WR-01 the formatter's ENOENT branch in `document-formatter.ts` rejects exactly like the other branch (pre-existing dead code); IN-01 `readSimpleName` duplicated in `bbj-hover.ts` and `java-javadoc.ts` with different return types. `installed-extension-e2e` still counts as a failed suite with 0 failed assertions (stale installed bundle, pre-existing)
- v4.5: verdict state never cleared for deleted files (103 WR-01); open review warnings in 98/99/100/104; no SECURITY.md for 101 and 104 (full list in `milestones/v4.5-MILESTONE-AUDIT.md`)

### Pending Todos

4 pending in `.planning/todos/pending/`:

- `2026-09-27-windows-intellij-node-download-progress-check` — repeat the IntelliJ Node.js download progress check on Windows the next time Windows is used for testing (Linux passed in Phase 114; opportunistic, not blocking)
- `2026-09-20-linking-interop-failures-survive-class-warmup` — root cause found (hermetic test double), not fixed → TEST-05, Phase 116
- `2026-09-26-intellij-interop-initoptions-key-mismatch` — IntelliJ sends javaInteropHost/Port, the server reads interopHost/Port (found in Phase 110; unscheduled)
- `2026-09-26-signature-help-and-snippet-peer-name-escaping` — transferred threat T-111-15: peer names in the signature-help fence and completion snippet placeholders (unscheduled)

Closed in v4.7: `2026-09-24-unknown-java-member-linking-warning-extras` (FIX-03, Phase 111), `2026-09-20-phase-97-code-review-follow-ups` (FIX-04, Phase 114).
Closed in v4.6: lost-connection crash detection and the stale previous-status log line (Phase 108), the live parse waiting on the shared breaker (Phase 106), and the use-before-assignment crash (Phase 107).

### Blockers/Concerns

- **9 advisory fixes merged and released, not yet published.** The tagged release publication was waiting for exists (`v0.16.0`, 2026-09-20). Per-advisory severity/CVE decisions are the maintainer's; post-release checklist in MILESTONES.md under v4.1.

- **`WINDOWS.md` entry 1 open** (Phase 70 guardrail breadth, accepted as unmet 2026-08-21). With `workflow.windows_enforce` on, this blocks `/gsd-ship` until fixed or explicitly waived. Entry 3 (Phase 96 Windows attestation) is fixed.

- **0.15.0 stays half-released** (VS Code only) — deliberately not reconciled (SEED-002); 0.16.0 is on both marketplaces. `manual-release.yml`'s two publish jobs still run in parallel; the by-hand runbook is `milestones/v4.4-phases/97-release-0-16-0-milestone-close/97-RECONCILIATION-RUNBOOK.md`.

- **Test-harness false positive.** `shouldRunBBjTests()` (`test/test-helper.ts`) gates on a bare TCP connect to :5008, so with BBjServices up 11 `linking.test.ts` interop tests switch on and fail. The issue447 capability test was rewritten backend-agnostic in 97-03, so the local baseline is 11 (re-measured 2026-09-23 at the Phase 105 close); green with `RUN_BBJ_TESTS=0`. Tracked in `.planning/DEBT.md`. v4.7 Phase 116 (TEST-05) removes this allowance.

- **v4.7 human gates.** DEP-02 (#507, Phase 117) needs the maintainer to name the library and version behind the vendored formatter JAR (lead found 2026-09-26: it is BASIS's `com.basis.bbjutilities.bbjcodeformatter`; a 2024 build ships in the BDT plugin under `/opt/bbx/BDTStudio/plugins/` and still has the `--single-line-if` crash). DEP-05's upstream langium report may only be filed with the maintainer's approval. FIX-01 (#527, Phase 119) may already be effectively fixed per the tests research; Phase 119 starts by testing it on the phase base.

- **Advisory review follow-ups still open:** `89-REVIEW` WR-01 (VS Code composer primary button always says "Insert"); `90-SECURITY` T-90-11 (`ComposerHandleCache` has no source guard forbidding a static map); `86-05-REVIEW` WR-02 (no exception handling around the bounded restart wait); `97-REVIEW` WR-01..WR-04 closed by FIX-04 in Phase 114. The `79-REVIEW` IN-02, `83-REVIEW` WR-02/WR-04 and `82-UI-REVIEW` colour items were retired by v4.4 phases 93, 94 and 96.

- **No release since 0.16.0.** v4.5 is on `main` via PR #691 (merged 2026-09-24) and v4.6 via PR #699 (merged 2026-09-26); both still need a release. The `bbj-ls` endpoint MR (`feat/689-parse-program-endpoint`, BASIS GitLab) is opened by hand.
- Full inventory of items needing a human decision: `tmp_human_review/` (untracked).
- 117-05 halted: langium 4.4.0 regression repro (DEP-05) not reproduced despite toy + bbj-subset fallback grammars; human decision needed (accept negative result / invest in larger-scale grammar / port custom lexer split) before DEP-05 can close

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|

Rows through 2026-09-17 are archived with their directories under `.planning/milestones/v4.4-quick/` (see its README).

---

### Roadmap Evolution

- v4.7 roadmap created 2026-09-26: Phases 110-122 for 63 requirements (61 GitHub issues plus three carried-over todos). REF-02 folded into 110, FIX-02/03 into 111, TEST-09 into 112, TEST-10/DOC-01 into 113, FIX-04 into 114, DEP-03 into 115, TEST-08 into 116, DEP-01/CI-04 into 117, FIX-01 into 119, REF-09 into 121.
- v4.6 archived 2026-09-26 (Phases 106-109).
- v4.6 roadmap created 2026-09-24: Phases 106-109 for 18 requirements (DIAG-01 and JINT-03 folded into 106, JINT-01/02 into 109).
- v4.5 archived 2026-09-24 (Phases 98-105).
- Phase 105 added: Live diagnostics responsiveness on large workspaces (issue #692) — live-parse timer is armed inside buildDocuments, behind Langium's FIFO WorkspaceLock; observed in both IDEs during phase 102 UAT

## Session Continuity

Last session: 2026-09-28T21:03:52.058Z
Stopped at: Completed 118-02-PLAN.md
Resume file: None

Next: `/gsd-discuss-phase 115` (no 115 context yet), or `/gsd-plan-phase 115`.
The `bbj-ls` hardening follow-up is tracked separately in `bbj-ls` and is not a GSD step here.

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| uat_gaps | 108/108-UAT-ARTIFACTS.md | unknown (raw idea.log evidence record, not a UAT script; 0 pending scenarios) | 2026-09-26 | v4.6 |
| todos | 2026-09-24-unknown-java-member-linking-warning-extras.md | (presence-only) | 2026-09-26 | v4.6 |
| todos | 2026-09-23-live-parse-waits-on-shared-connection-breaker.md | (presence-only) | 2026-09-24 | v4.5 |
| todos | 2026-09-23-use-before-assignment-check-throws-on-a-reference-without-a-symbol.md | (presence-only) | 2026-09-24 | v4.5 |
| deferred_items | 99/deferred-items.md: installed-extension e2e SETOPTS-in-code (#475) fails with "No document found" (stale installed bundle, not a regression) | acknowledged | 2026-09-24 | v4.5 |
| debug_sessions | g-96-2-too-old-node-no-download-offer | diagnosed (G-96-2 fixed by 96-08, maintainer pass 2026-09-20) | 2026-09-20 | v4.4 |
| uat_gaps | 97/97-UAT-ARTIFACTS.md | unknown (suite-gate and artifact-hash record, not a UAT script; 0 pending scenarios) | 2026-09-20 | v4.4 |
| todos | 2026-09-20-linking-interop-failures-survive-class-warmup.md | (presence-only) | 2026-09-20 | v4.4 |
| todos | 2026-09-20-lost-language-server-connection-is-invisible-to-crash-detection.md | (presence-only) | 2026-09-20 | v4.4 |
| todos | 2026-09-20-phase-97-code-review-follow-ups.md | (presence-only) | 2026-09-20 | v4.4 |
| todos | 2026-09-20-status-transition-log-prints-a-stale-previous-status.md | (presence-only) | 2026-09-20 | v4.4 |
| debug_sessions | g-88-1-hover-no-decode | diagnosed (G-88-1 resolved in Phase 88) | 2026-09-13 | v4.3 |
| debug_sessions | g-88-2-composer-never-activates | diagnosed (G-88-2 resolved in Phase 88) | 2026-09-13 | v4.3 |
| debug_sessions | g-88-2-docker-pull-hang | diagnosed (resolved per 88-UAT) | 2026-09-13 | v4.3 |
| debug_sessions | g-88-3-composer-mask-literal-quoting | diagnosed (G-88-3 resolved in Phase 88) | 2026-09-13 | v4.3 |
| debug_sessions | g-89-3-cvs-composer-unfinished-call | diagnosed (G-89-3 fixed by 89-14..16) | 2026-09-13 | v4.3 |
| debug_sessions | refresh-stream-closed | diagnosed (G-86-1 fixed by 86-05) | 2026-09-13 | v4.3 |
| quick_tasks | 1-fix-duplicate-bbj-output-channels-create | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 2-fix-em-login-bbj-not-found-in-intellij-p | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 3-fix-duplicate-bbj-output-channel-ensure- | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 4-fix-intellij-bui-dwc-passing-dash-as-con | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 5-fix-em-token-expiration-jwt-expiry-check | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 6-fix-em-login-bbj-and-em-validate-token-b | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 7-add-client-info-string-to-em-auth-token- | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 8-fix-documentation-links-add-jetbrains-ma | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 9-automate-jetbrains-marketplace-publishin | missing | 2026-09-13 | v4.3 |
| quick_tasks | 10-fix-intellij-maintoolbar-group-registrat | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 11-enhance-em-auth-token-info-string-change | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 12-use-actual-jetbrains-ide-product-name-in | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 13-fix-intellij-multi-instance-language-ser | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 14-fix-manual-release-workflow-pass-version | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 260329-oqw-pr-383-return-undefined-instead-of-empty | unknown | 2026-09-13 | v4.3 |
| debug_sessions | compile-diagnostic-getmessage-nosuchmethoderror | diagnosed (fixed by 81-07) | 2026-09-06 | v4.2 |
| debug_sessions | compile-error-response-message-could-not-be-parsed | diagnosed (fixed by 81-06) | 2026-09-06 | v4.2 |
| debug_sessions | compile-output-directory-row-not-visible | diagnosed (fixed by 81-04) | 2026-09-06 | v4.2 |
| debug_sessions | composer-intention-description-missing | diagnosed (fixed by 82-04) | 2026-09-06 | v4.2 |
| debug_sessions | windows-owner-only-tmp-error18 | diagnosed (fixed by 80-05) | 2026-09-06 | v4.2 |
| todos | 2026-09-05-gradle-wrapper-hygiene-fixture-declares-stale-gradle-version.md | (presence-only) | 2026-09-06 | v4.2 |
| todos | 2026-09-06-configured-node-path-suppresses-cached-download-fallback.md | promoted to PLAT-05 (v4.4 Phase 96) | 2026-09-06 | v4.2 |
| todos | 2026-09-06-live-windows-check-for-node-auto-install-failure.md | promoted to PLAT-06 (v4.4 Phase 96) | 2026-09-06 | v4.2 |
| debug_sessions | constructor-completion | diagnosed | 2026-09-03 | v4.1 |
| debug_sessions | deprecated-strikethrough | diagnosed | 2026-09-03 | v4.1 |
| debug_sessions | prefix-diagnostic-reconciliation | diagnosed | 2026-09-03 | v4.1 |
| debug_sessions | prefix-reconciliation-final | diagnosed | 2026-09-03 | v4.1 |
| debug_sessions | use-import-static-completion | diagnosed | 2026-09-03 | v4.1 |
| todos | 2026-08-22-strip-em-config-sentinel-in-getconfigpatharg-and-commands-cj.md | (presence-only) | 2026-09-03 | v4.1 |
| todos | 2026-09-03-update-live-interop-tests-for-getallclassnames-backend.md | (presence-only) | 2026-09-03 | v4.1 |
| uat_gaps | 59/59-UAT.md (archived v3.9) | passed | 2026-09-03 | v4.1 |
| uat_gaps | 34/34-UAT.md (archived v3.2) | diagnosed | 2026-09-03 | v4.1 |
| uat_gaps | 34/34-final-UAT.md (archived v3.2) | diagnosed | 2026-09-03 | v4.1 |
| uat_gaps | 34/34-re-UAT.md (archived v3.2) | diagnosed | 2026-09-03 | v4.1 |
| uat_gaps | 29/29-UAT.md (archived v3.1) | diagnosed | 2026-09-03 | v4.1 |
| uat_gaps | 30/30-UAT.md (archived v3.1) | diagnosed | 2026-09-03 | v4.1 |
| uat_gaps | 24/24-UAT.md (archived v3.0) | diagnosed | 2026-09-03 | v4.1 |
| uat_gaps | 25/25-UAT.md (archived v3.0) | diagnosed | 2026-09-03 | v4.1 |
| verification_gaps | 50/50-VERIFICATION.md (archived v3.7) | human_needed | 2026-09-03 | v4.1 |
| verification_gaps | 46/46-VERIFICATION.md (archived v3.5) | gaps_found | 2026-09-03 | v4.1 |
| verification_gaps | 17/17-VERIFICATION.md (archived v2.0) | gaps_found | 2026-09-03 | v4.1 |
| verification_gaps | 11/11-VERIFICATION.md (archived v1.2) | human_needed | 2026-09-03 | v4.1 |
| verification_gaps | 10/10-VERIFICATION.md (archived v1.1) | gaps_found | 2026-09-03 | v4.1 |

## Milestone History

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v1.0 Internal Alpha | 1-6 | 19 | 2026-02-01 |
| v1.1 Polish & Run Commands | 7-10 | 6 | 2026-02-02 |
| v1.2 Run Fixes & Marketplace | 11-13 | 5 | 2026-02-02 |
| v2.0 Langium 4 Upgrade | 14-20 | 11 | 2026-02-04 |
| v2.1 Feature Gap Analysis | N/A | N/A | 2026-02-04 |
| v2.2 IntelliJ Build & Release Automation | 21-23 | 3 | 2026-02-05 |
| v3.0 Improving BBj Language Support | 24-27 | 11 | 2026-02-06 |
| v3.1 PRIO 1+2 Issue Burndown | 28-31 | 13 | 2026-02-07 |
| v3.2 Bug Fix Release | 32-34 | 10 | 2026-02-08 |
| v3.3 Output & Diagnostic Cleanup | 35-39 | 6 | 2026-02-08 |
| v3.4 0.8.0 Issue Closure | 40-43 | 4 | 2026-02-08 |
| v3.5 Documentation for 0.8.0 Release | 44-47 | 7 | 2026-02-09 |
| v3.6 IntelliJ Platform API Compatibility | 48-49 | 2 | 2026-02-10 |
| v3.7 Diagnostic Quality & BBjCPL Integration | 50-53 | 7 | 2026-02-20 |
| v3.8 Test & Debt Cleanup | 54-56 | 7 | 2026-02-20 |
| v3.9 Quick Wins | 57-59 | 8 | 2026-02-21 |
| v4.0 Stability and Quality | 60-69 | 62 | 2026-08-20 |
| v4.1 Security Advisory Remediation | 70-77 | 37 | 2026-09-03 |
| v4.2 IntelliJ Burn-down | 78-83 | 25 | 2026-09-06 |
| v4.3 Polish & Quality | 84-92 | 70 | 2026-09-13 |
| v4.4 IntelliJ Focus | 93-97 | 36 | 2026-09-20 |
| v4.5 Compiler Conformance | 98-105 | 44 | 2026-09-24 |
| v4.6 User-Facing Bug Burn-down | 106-109 | 25 | 2026-09-26 |

See: `.planning/MILESTONES.md`

---

*State updated: 2026-09-27 after Phase 112. Per-plan metrics and per-phase decision
detail for phases 70-109 live with their archived phase artifacts; this file is a digest again.*

## Operator Next Steps

- Discuss Phase 115 with `/gsd-discuss-phase 115`, then plan it
