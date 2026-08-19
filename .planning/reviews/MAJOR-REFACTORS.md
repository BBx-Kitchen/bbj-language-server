# Phase 68 Major-Refactor Findings

## Coverage

### Scope

The review surface: 21 review units across the four sweep phases — `RU-61-01`..`RU-61-07`
(`bbj-vscode/src/language/`), `RU-62-01`..`RU-62-05` (extension host, composers, TextMate),
`RU-63-01`..`RU-63-05` (`bbj-intellij/`, 61 Java files), `RU-64-01`..`RU-64-03` (build, CI,
dependencies and tools) and the cross-cutting `RU-D8-01` documentation unit — plus 8
file-exception rows for files whose applicability differs from their unit's (`INVENTORY.md`
§"Applicability Grid").

Eight dimensions applied cell by cell: D1 Security, D2 Correctness, D3 Performance,
D4 Maintainability, D5 Test coverage, D6 Dependency health, D7 Cross-IDE parity, D8 Doc accuracy.
The grid totals 29 rows (21 units + 8 file-exception rows) × 8 dimensions = 232 cells, of which 148
are `applies` and 84 are `n/a` with a written exclusion marker. See `INVENTORY.md`
§"Applicability Grid" and §"Grid totals" for the cell-by-cell detail — this preamble states the
totals rather than restating the grid, so a reader gets a truthful picture without a second file
open, and an auditor gets the path.

Every one of the 224 recorded findings clears an evidence tier defined in `INVENTORY.md` §3b
"Evidence Tiers", distributed 108 `repro`, 80 `trace` and 36 `inherited`. No record in either
document is an unverified claim; the separate population of candidate claims that could not clear a
tier is recorded in `MAJOR-REFACTORS.md` §"Other Dispositions" §"not-reproducible" rather than
dropped.

Named exclusions, each with its reason (`REQUIREMENTS.md` §"Out of Scope", `INVENTORY.md`
§"Surface Accounting & Named Exclusions"):

- `java-interop/`'s Java service — excluded by scope decision at milestone start (FUT-01); the
  TypeScript-side client is reviewed at `RU-61-06`, and `java-interop/build.gradle` is read once
  by `RU-64-02` only as a dependency-tree source, not as a code review.
- `bbj-vscode/src/language/generated/` (17.5k LOC) — machine-generated from `bbj.langium`, whose
  grammar source is reviewed instead.
- `bbj-vscode-deprecated/` — a stale `bbj-vscode-0.1.999.vsix` artifact only, no source, flagged
  for removal.
- Grammar redesign to remove parser ambiguity — v3.3 established all 47 ambiguities resolve
  correctly; redesign is a language-level project.
- Wholesale test-suite authoring — coverage gaps are reported as findings; only regression tests for
  applied fixes are written.
- Implementing the major refactors — the milestone deliverable is detailed issues for separate
  resolution.
- New features of any kind — a quality milestone; behavior changes only where a defect is being
  fixed.

Two boundary cases are named so they read as deliberate rather than oversights: `documentation/`
is scoped but D8-only (`RU-D8-01` checks code accuracy against docs-site claims; no editorial
review of structure, tone or completeness — that is FUT-02); `README.md` is excluded, named as a
candidate for a future D8 unit rather than silently dropped.

Corpus size: 224 recorded findings, split 144 major-refactor, 77 easy-fix and 3 wontfix, derived by
the selection rule stated in `## Derivation` below.

### Gaps

**No IntelliJ fix was compiled or tested.** The only installed JDK is Temurin 25.0.3 at
`/opt/java/default`, and `bbj-intellij/build.gradle.kts` targets Java 17, so `./gradlew build`
cannot run in this environment. Nine applied `bbj-intellij/` fixes are review-verified only under
Phase 67 D-14, and one further easy fix — `P63-D7-004` — is deferred for the same reason under
Phase 67 D-15. "Review-verified" means a human-readable statement-by-statement check and nothing
stronger; no compiler and no test confirmed any of the ten.

**11 deterministic `npm test` failures.** All 11 are in
`test/linking.test.ts > Linking Tests > Interop related tests` and reproduce identically across
runs, caused by an unreachable java-interop peer. Opening a listener on port 5008 does not fix them
(Phase 64 D-06) — that has been tried. Separately, the suite-level file-failure and skip counts vary
between otherwise identical runs because a `beforeAll` hook
(`WorkspaceManager.initializeWorkspace()`) intermittently exceeds vitest's default 10-second
`hookTimeout` under load, so a reader comparing two runs is not misled into reading the variance
as a regression. `INVENTORY.md` §"Test & Build Baseline (D-05, D-06)" is the sole authority for
these numbers; no suite count here is taken from any other source.

**24 not-reproducible candidate claims.** Each is an area a reviewer looked at and could not settle
within a read-only sweep — a runtime measurement, a BBj interpreter or repository-settings access it
did not have. They are coverage gaps by definition. See `MAJOR-REFACTORS.md` §"Other Dispositions"
§"not-reproducible", which enumerates all 24 with the tier each failed and why.

**Phase 65's shape.** Its cross-cutting security audit enumerated roughly 36 items and recorded 3 as
findings, because the remainder were settled by direct code trace rather than left unexamined.
Stated plainly so a reader does not infer that the security audit found almost nothing.

## Derivation

Records are selected by the leading token of each finding's `disposition:` field —
`major-refactor` — across the six closed COVERAGE files (`.planning/reviews/61-COVERAGE.md` …
`66-COVERAGE.md`), produced mechanically by `derive-review-docs.mjs` (run as
`node derive-review-docs.mjs emit-major` from `.planning/phases/68-deliverable-documents/` — see
that script for the exact selection and ordering logic). Records are ordered by originating phase
then finding ID (D-10); a severity-sorted index is added above the phase-then-ID order for Phase
69's filing order. The script emits INVENTORY's frozen 13-field order verbatim as the mechanical
scaffold; the four Phase-69-facing fields (`proposed_approach:`, `proposed_labels:`, `issue:`)
and their judgment content are authored directly in this document, so re-running `emit-major`
regenerates the scaffold only and is not a safe overwrite of this assembled file once that content
has been added.

## Reconciliation

`224` records selected across the six closed COVERAGE files, splitting `144` major-refactor + `77` easy-fix + `3` wontfix = `224`, with the per-phase major split 61=`29`, 62=`20`, 63=`52`, 64=`34`, 65=`3`, 66=`6` = `144`.

The `77` easy-fix records live in `EASY-FIXES.md`, and the `3` wontfix records live in this document's `## Other Dispositions` section, so no row of the `224` is absent from the pair of documents.

Severity distribution of the `144`: `1` critical, `16` high, `70` medium, `57` low.

Effort distribution after INVENTORY §3d normalisation: `40` × `2`, `59` × `4`, `45` × `8`. Three records — `P63-D3-005`, `P66-D2-002`, `P66-D4-001` — carry an in-record annotation on the `effort:` value that is carried through verbatim rather than stripped to the bare number.

## Index (severity-sorted, for Phase 69 filing order)

Phase 69 files in severity order (highest first); the record blocks below stay in originating-phase order so this document keeps diffing against `67-APPLY-SET.md` (D-10) — the 1 `critical` and 16 `high` records surface first here rather than being buried at whatever phase they came from.

| # | severity | PRIO | effort | finding_id | location | area |
|---|---|---|---|---|---|---|
| 1 | critical | PRIO 1 | 8 | P62-D1-003 | bbj-vscode/src/Commands/Commands.cjs:263 | vscode |
| 2 | high | PRIO 1 | 2 | P64-D1-004 | .github/workflows/preview.yml:96-102 | BBj integration and infrastructure |
| 3 | high | PRIO 1 | 2 | P64-D6-007 | bbj-vscode/package.json:670 | dependencies |
| 4 | high | PRIO 1 | 2 | P64-D6-008 | bbj-vscode/package-lock.json:7581-7584 | dependencies |
| 5 | high | PRIO 1 | 4 | P61-D1-003 | bbj-vscode/src/language/bbj-cpl-service.ts:82-155 | vscode |
| 6 | high | PRIO 1 | 4 | P63-D1-007 | bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java:32 | intellij |
| 7 | high | PRIO 1 | 4 | P64-D1-006 | bbj-intellij/gradle/wrapper/gradle-wrapper.properties:3-5 | intellij |
| 8 | high | PRIO 1 | 4 | P64-D6-006 | bbj-intellij/gradle/wrapper/gradle-wrapper.jar | dependencies |
| 9 | high | PRIO 1 | 8 | P61-D3-002 | bbj-vscode/src/language/java-interop.ts:42-46 | vscode |
| 10 | high | PRIO 1 | 8 | P61-D3-003 | bbj-vscode/src/language/bbj-scope.ts:308-331 | vscode |
| 11 | high | PRIO 1 | 8 | P63-D1-001 | bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:34-35 | intellij |
| 12 | high | PRIO 1 | 8 | P63-D1-003 | bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:103 | intellij |
| 13 | high | PRIO 1 | 8 | P63-D2-004 | bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:60 | intellij |
| 14 | high | PRIO 1 | 8 | P64-D1-002 | bbj-vscode/tools/em-login.bbj:10-13 | BBj integration and infrastructure |
| 15 | high | PRIO 1 | 8 | P64-D1-003 | bbj-vscode/tools/formatter/BBjCFCli.jar | BBj integration and infrastructure |
| 16 | high | PRIO 1 | 8 | P64-D6-002 | bbj-vscode/tools/formatter/lib/BBjCodeFomatter.jar | dependencies |
| 17 | high | PRIO 1 | 8 | P66-D3-001 | bbj-vscode/src/language/bbj-scope.ts:308-330 (getBBjClassesFromFile); bbj-vscode/src/language/bbj-scope-local.ts:106-118 (collectLocalSymbols) | vscode |
| 18 | medium | PRIO 2 | 2 | P61-D1-001 | bbj-vscode/src/language/java-interop.ts:116-120 | vscode |
| 19 | medium | PRIO 2 | 2 | P61-D1-006 | bbj-vscode/src/language/bbj-ws-manager.ts:53-55 | vscode |
| 20 | medium | PRIO 2 | 2 | P61-D1-007 | bbj-vscode/src/language/bbj-ws-manager.ts:118-126 | vscode |
| 21 | medium | PRIO 2 | 2 | P62-D2-002 | bbj-vscode/src/Commands/Commands.cjs:250 | vscode |
| 22 | medium | PRIO 2 | 2 | P63-D2-012 | bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:115-128 | intellij |
| 23 | medium | PRIO 2 | 2 | P64-D2-001 | bbj-vscode/tools/interop-test-harness/run-tests.ts:510 | BBj integration and infrastructure |
| 24 | medium | PRIO 2 | 2 | P64-D2-007 | bbj-vscode/package.json:654 | vscode |
| 25 | medium | PRIO 2 | 2 | P64-D2-008 | bbj-vscode/tsconfig.test.json:7-9 | vscode |
| 26 | medium | PRIO 2 | 2 | P64-D2-009 | bbj-intellij/build.gradle.kts:93-98 | intellij |
| 27 | medium | PRIO 2 | 2 | P64-D3-001 | .github/workflows/build.yml:19-22 | BBj integration and infrastructure |
| 28 | medium | PRIO 2 | 2 | P64-D5-002 | bbj-vscode/vitest.config.ts:4-29 | vscode |
| 29 | medium | PRIO 2 | 2 | P64-D6-001 | bbj-vscode/tools/interop-test-harness/run-tests.ts:1 | dependencies |
| 30 | medium | PRIO 2 | 2 | P64-D6-011 | java-interop/build.gradle:22 | dependencies |
| 31 | medium | PRIO 2 | 2 | P66-D2-003 | bbj-vscode/src/language/bbj-document-validator.ts:53 | vscode |
| 32 | medium | PRIO 2 | 4 | P61-D1-002 | bbj-vscode/src/language/java-interop.ts:598-644 | vscode |
| 33 | medium | PRIO 2 | 4 | P61-D1-004 | bbj-vscode/src/language/bbj-hover.ts:88-106 | vscode |
| 34 | medium | PRIO 2 | 4 | P61-D1-005 | bbj-vscode/src/language/bbj-code-action-provider.ts:82-83 | vscode |
| 35 | medium | PRIO 2 | 4 | P61-D1-008 | bbj-vscode/src/language/bbj-document-builder.ts:303-317 | vscode |
| 36 | medium | PRIO 2 | 4 | P61-D2-007 | bbj-vscode/src/language/bbj.langium:941 | vscode |
| 37 | medium | PRIO 2 | 4 | P61-D5-003 | bbj-vscode/test/parser.test.ts:530-533 | javascript |
| 38 | medium | PRIO 2 | 4 | P62-D1-004 | bbj-vscode/src/extension.ts:415 | vscode |
| 39 | medium | PRIO 2 | 4 | P62-D2-001 | bbj-vscode/src/msgbox-composer-webview.ts:82 | vscode |
| 40 | medium | PRIO 2 | 4 | P62-D2-003 | bbj-vscode/src/extension.ts:592-707 | vscode |
| 41 | medium | PRIO 2 | 4 | P62-D2-005 | bbj-vscode/src/msgbox-composer-ui.ts:87-133 | vscode |
| 42 | medium | PRIO 2 | 4 | P62-D4-001 | bbj-vscode/src/msgbox-composer-webview.ts:366-373 (getNonce) | vscode |
| 43 | medium | PRIO 2 | 4 | P62-D4-004 | bbj-vscode/src/msgbox-composer.ts:470-498 | vscode |
| 44 | medium | PRIO 2 | 4 | P63-D1-004 | bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:56-88 | intellij |
| 45 | medium | PRIO 2 | 4 | P63-D1-005 | bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:295 | intellij |
| 46 | medium | PRIO 2 | 4 | P63-D2-003 | bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:70-79 | intellij |
| 47 | medium | PRIO 2 | 4 | P63-D2-007 | bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:66-87 | intellij |
| 48 | medium | PRIO 2 | 4 | P63-D2-013 | bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:34-35 | intellij |
| 49 | medium | PRIO 2 | 4 | P63-D2-016 | bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjCommenter.java:9-11 | intellij |
| 50 | medium | PRIO 2 | 4 | P63-D3-001 | bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java:148-164 | intellij |
| 51 | medium | PRIO 2 | 4 | P63-D3-002 | bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:282-322 | intellij |
| 52 | medium | PRIO 2 | 4 | P63-D3-007 | bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java:28-59 | intellij |
| 53 | medium | PRIO 2 | 4 | P63-D4-010 | bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjCompletionFeature.java | intellij |
| 54 | medium | PRIO 2 | 4 | P63-D6-001 | bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:34 | dependencies |
| 55 | medium | PRIO 2 | 4 | P64-D1-001 | bbj-vscode/tools/web.bbj:30-31 | BBj integration and infrastructure |
| 56 | medium | PRIO 2 | 4 | P64-D1-005 | .github/workflows/preview.yml:8-10 | BBj integration and infrastructure |
| 57 | medium | PRIO 2 | 4 | P64-D2-003 | bbj-vscode/tools/web.bbj:34 | BBj integration and infrastructure |
| 58 | medium | PRIO 2 | 4 | P64-D3-002 | .github/workflows/build.yml:3-9 | BBj integration and infrastructure |
| 59 | medium | PRIO 2 | 4 | P64-D6-003 | .github/workflows/manual-release.yml:18-162 | dependencies |
| 60 | medium | PRIO 2 | 4 | P64-D6-005 | .github/dependabot.yml:3-7 | dependencies |
| 61 | medium | PRIO 2 | 4 | P65-D1-002 | bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:25-29 (contrasted with bbj-vscode/src/extension.ts:587 | intellij |
| 62 | medium | PRIO 2 | 4 | P65-D1-003 | bbj-vscode/src/extension.ts:339-366 (contrasted with bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:56-88 | vscode |
| 63 | medium | PRIO 2 | 4 | P66-D4-001 | bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjCompletionFeature.java:19 | intellij |
| 64 | medium | PRIO 2 | 4 | P66-D5-001 | bbj-vscode/test/parser.test.ts:530 | javascript |
| 65 | medium | PRIO 2 | 8 | P61-D2-012 | bbj-vscode/src/language/bbj-type-inferer.ts:47-48 | vscode |
| 66 | medium | PRIO 2 | 8 | P61-D2-018 | bbj-vscode/src/language/main.ts:140-155 | vscode |
| 67 | medium | PRIO 2 | 8 | P61-D4-001 | bbj-vscode/src/language/java-interop.ts:37-831 | vscode |
| 68 | medium | PRIO 2 | 8 | P61-D5-001 | bbj-vscode/test/linking.test.ts:295-450 | javascript |
| 69 | medium | PRIO 2 | 8 | P61-D5-002 | bbj-vscode/test/bbj-test-module.ts:108-123 | javascript |
| 70 | medium | PRIO 2 | 8 | P61-D5-010 | bbj-vscode/test/completion-test.test.ts:185 | javascript |
| 71 | medium | PRIO 2 | 8 | P61-D5-013 | bbj-vscode/src/language/bbj-ws-manager.ts:106-184 | vscode |
| 72 | medium | PRIO 2 | 8 | P61-D5-014 | bbj-vscode/src/language/main.ts:1-190 | vscode |
| 73 | medium | PRIO 2 | 8 | P62-D4-002 | bbj-vscode/src/extension.ts:582-830 | vscode |
| 74 | medium | PRIO 2 | 8 | P62-D5-002 | bbj-vscode/test/ (absence) -- the 2 files this finding covers are bbj-vscode/src/extension.ts and bbj-vscode/src/Commands/Commands.cjs | javascript |
| 75 | medium | PRIO 2 | 8 | P62-D7-001 | bbj-vscode/src/Commands/Commands.cjs:117 | vscode |
| 76 | medium | PRIO 2 | 8 | P63-D2-010 | bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:57-159 | intellij |
| 77 | medium | PRIO 2 | 8 | P63-D2-015 | bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjWordLexer.java:81-93 | intellij |
| 78 | medium | PRIO 2 | 8 | P63-D5-001 | bbj-intellij/build.gradle.kts | intellij |
| 79 | medium | PRIO 2 | 8 | P63-D6-002 | bbj-intellij/build.gradle.kts:12-13 | dependencies |
| 80 | medium | PRIO 2 | 8 | P63-D7-001 | bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java:24-39 | intellij |
| 81 | medium | PRIO 2 | 8 | P64-D2-005 | .github/workflows/manual-release.yml:69-82 | BBj integration and infrastructure |
| 82 | medium | PRIO 2 | 8 | P64-D4-003 | .github/workflows/build.yml:16-34 | BBj integration and infrastructure |
| 83 | medium | PRIO 2 | 8 | P64-D4-005 | bbj-vscode/eslint.config.js:16 | vscode |
| 84 | medium | PRIO 2 | 8 | P64-D5-001 | bbj-vscode/tools/interop-test-harness/run-tests.ts:1-1058 | BBj integration and infrastructure |
| 85 | medium | PRIO 2 | 8 | P64-D6-010 | bbj-intellij/gradle/wrapper/gradle-wrapper.properties:3 | dependencies |
| 86 | medium | PRIO 2 | 8 | P66-D2-002 | bbj-vscode/src/language/bbj-scope.ts:191-234 (getScope's member-completion branch; isClassRef detection at :199-208); bbj-vscode/src/language/bbj-completion-provider.ts (consumes the scope with no independent isClassRef-aware filtering of its own); bbj-vscode/src/language/java-interop.ts:572-588 (the isStatic ?? false default that is the stated blocker) | vscode |
| 87 | medium | PRIO 2 | 8 | P66-D5-002 | bbj-vscode/test/completion-test.test.ts:185 | javascript |
| 88 | low | PRIO 3 | 2 | P61-D1-009 | bbj-vscode/src/language/bbj-ws-manager.ts:231-241 | vscode |
| 89 | low | PRIO 3 | 2 | P61-D4-011 | bbj-vscode/src/language/bbj-signature-help-provider.ts:60-68 | vscode |
| 90 | low | PRIO 3 | 2 | P61-D4-013 | bbj-vscode/src/language/bbj-ws-manager.ts:53-54 | vscode |
| 91 | low | PRIO 3 | 2 | P61-D4-014 | bbj-vscode/src/language/composer-commands.ts:1-13 | vscode |
| 92 | low | PRIO 3 | 2 | P61-D4-016 | bbj-vscode/src/language/lib/events.ts:1 | vscode |
| 93 | low | PRIO 3 | 2 | P62-D1-002 | bbj-vscode/src/msgbox-composer-webview.ts:366-373 | vscode |
| 94 | low | PRIO 3 | 2 | P62-D1-007 | bbj-vscode/src/decompile-io.ts:15-27 | vscode |
| 95 | low | PRIO 3 | 2 | P63-D1-002 | bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:52 | intellij |
| 96 | low | PRIO 3 | 2 | P63-D1-008 | bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java:117-150 | intellij |
| 97 | low | PRIO 3 | 2 | P63-D2-001 | bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:47-59 | intellij |
| 98 | low | PRIO 3 | 2 | P63-D2-005 | bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:25-36 | intellij |
| 99 | low | PRIO 3 | 2 | P63-D2-006 | bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:96 | intellij |
| 100 | low | PRIO 3 | 2 | P63-D2-009 | bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:179 | intellij |
| 101 | low | PRIO 3 | 2 | P63-D2-014 | bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java:117-184 | intellij |
| 102 | low | PRIO 3 | 2 | P63-D3-005 | bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java:93-96 | intellij |
| 103 | low | PRIO 3 | 2 | P63-D4-002 | bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java:30 | intellij |
| 104 | low | PRIO 3 | 2 | P63-D8-004 | bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java:39-44 | documentation |
| 105 | low | PRIO 3 | 2 | P64-D2-002 | bbj-vscode/tools/interop-test-harness/run-tests.ts:706-708 | BBj integration and infrastructure |
| 106 | low | PRIO 3 | 2 | P64-D2-006 | .github/workflows/preview.yml:3-8 | BBj integration and infrastructure |
| 107 | low | PRIO 3 | 2 | P64-D3-003 | bbj-vscode/package.json:653 | vscode |
| 108 | low | PRIO 3 | 2 | P64-D4-002 | bbj-vscode/tools/interop-test-harness/run-tests.ts:659 | BBj integration and infrastructure |
| 109 | low | PRIO 3 | 2 | P64-D4-006 | bbj-vscode/package.json:629-650 | vscode |
| 110 | low | PRIO 3 | 2 | P64-D8-001 | bbj-vscode/tools/interop-test-harness/run-tests.ts:2-14 | documentation |
| 111 | low | PRIO 3 | 4 | P61-D4-004 | bbj-vscode/src/language/bbj.langium:513-521 | vscode |
| 112 | low | PRIO 3 | 4 | P61-D4-015 | bbj-vscode/src/language/lib/functions.ts:167 | vscode |
| 113 | low | PRIO 3 | 4 | P62-D1-001 | bbj-vscode/src/msgbox-composer-webview.ts:82-119 | vscode |
| 114 | low | PRIO 3 | 4 | P62-D1-006 | bbj-vscode/src/document-formatter.ts:59 | vscode |
| 115 | low | PRIO 3 | 4 | P62-D4-003 | bbj-vscode/src/Commands/CompilerOptions.ts:65-282 | vscode |
| 116 | low | PRIO 3 | 4 | P63-D1-006 | bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:107-115 | intellij |
| 117 | low | PRIO 3 | 4 | P63-D2-002 | bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java:130-140 | intellij |
| 118 | low | PRIO 3 | 4 | P63-D2-008 | bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java:116-118 | intellij |
| 119 | low | PRIO 3 | 4 | P63-D2-011 | bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java:67-114 | intellij |
| 120 | low | PRIO 3 | 4 | P63-D3-003 | bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java:268-272 | intellij |
| 121 | low | PRIO 3 | 4 | P63-D3-004 | bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:66-71 | intellij |
| 122 | low | PRIO 3 | 4 | P63-D3-006 | bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjTextMateBundleProvider.java:27-48 | intellij |
| 123 | low | PRIO 3 | 4 | P63-D4-003 | bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:231-248 | intellij |
| 124 | low | PRIO 3 | 4 | P63-D4-004 | bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java | intellij |
| 125 | low | PRIO 3 | 4 | P63-D4-005 | bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeAddChildWindowAction.java | intellij |
| 126 | low | PRIO 3 | 4 | P63-D4-006 | bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:250-272 | intellij |
| 127 | low | PRIO 3 | 4 | P63-D4-008 | bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureMsgboxIntention.java | intellij |
| 128 | low | PRIO 3 | 4 | P63-D4-009 | bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxSchematicPanel.java:166-179 | intellij |
| 129 | low | PRIO 3 | 4 | P63-D4-011 | bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java | intellij |
| 130 | low | PRIO 3 | 4 | P63-D4-012 | bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjColorSettingsPage.java:29-66 | intellij |
| 131 | low | PRIO 3 | 4 | P63-D4-013 | bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjJavaInteropNotificationProvider.java:22-57 | intellij |
| 132 | low | PRIO 3 | 4 | P65-D1-001 | bbj-vscode/src/addwindow-composer-webview.ts:121-131 | vscode |
| 133 | low | PRIO 3 | 8 | P61-D4-002 | bbj-vscode/src/language/java-javadoc.ts:16-36 | vscode |
| 134 | low | PRIO 3 | 8 | P61-D4-007 | bbj-vscode/src/language/validations/check-classes.ts:89-548 | vscode |
| 135 | low | PRIO 3 | 8 | P62-D1-005 | bbj-vscode/src/addwindow-composer.ts:195-282 | vscode |
| 136 | low | PRIO 3 | 8 | P62-D5-001 | bbj-vscode/test/ (absence) — the 4 files this finding covers are bbj-vscode/src/msgbox-composer-webview.ts | javascript |
| 137 | low | PRIO 3 | 8 | P62-D5-003 | bbj-vscode/src/msgbox-composer-ui.ts (193 | vscode |
| 138 | low | PRIO 3 | 8 | P62-D5-005 | bbj-vscode/test/ (absence) — the 2 files this finding covers are bbj-vscode/bbj-language-configuration.json | javascript |
| 139 | low | PRIO 3 | 8 | P63-D4-007 | bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java | intellij |
| 140 | low | PRIO 3 | 8 | P63-D7-002 | bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/ | intellij |
| 141 | low | PRIO 3 | 8 | P63-D7-003 | bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRefreshJavaClassesAction.java:22-32 | intellij |
| 142 | low | PRIO 3 | 8 | P63-D7-005 | bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ | intellij |
| 143 | low | PRIO 3 | 8 | P63-D7-006 | bbj-intellij/src/main/java/com/basis/bbj/intellij/ | intellij |
| 144 | low | PRIO 3 | 8 | P64-D4-001 | bbj-vscode/tools/interop-test-harness/run-tests.ts:256-592 | BBj integration and infrastructure |

## Records

```
id:                P61-D1-001
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:116-120
dimension:         D1
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace: setConnectionConfig(host, port) (java-interop.ts:116-120) only guards against falsy values — `this.interopHost = host || '127.0.0.1'` and `this.interopPort = port || 5008` — with no type check and no range check. A non-integer, negative, out-of-range, or string-typed `port` (e.g. NaN, -1, 99999, "evil.example.com:80") is stored as-is and reaches `socket.connect(this.interopPort, this.interopHost)` (java-interop.ts:140) unmodified. Both call sites feeding this method — bbj-ws-manager.ts:53-55 (initializationOptions.interopHost/interopPort) and main.ts:151-152 (config.interop?.host/port) — add no validation of their own (referred to RU-61-05 below).
failure_scenario:  A workspace-scoped .vscode/settings.json committed inside a cloned repository sets bbj.interop.host/bbj.interop.port to an attacker-controlled host/port. Opening that workspace silently redirects every future Java-class lookup off loopback to the attacker's listener, with no confirmation step visible in this unit or its two call sites.
classification:    major (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (add type/range validation in setConnectionConfig): pass — (6) severity is `medium` but primary dimension is D1: FAIL — test (6) fails on the D1 primary-dimension clause alone, so classification is `major` regardless of the other five tests (D-13's safety gate).
effort:            2
dedup:             none — none of the 15 frozen open issues concern the java-interop connection-destination validation; #231 (custom classpath/CLI settings for starting BBj programs) is the closest area match but concerns run-command classpath/CLI args, not the interop client's host/port.
disposition:       major-refactor
proposed_approach: Add type/range validation in setConnectionConfig.
proposed_labels:   area=vscode; PRIO 2; effort 2
issue:             
```

```
id:                P61-D1-002
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:598-644
dimension:         D1
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace: resolveClass() copies every peer-supplied field (fields, methods, constructors, error, isDeprecated, parameter types/names) directly onto the JavaClass AST node with no schema validation, size limit, or content filtering (java-interop.ts:543-596). The hand-built method signature string interpolates peer-supplied method.returnType/parameter types/names with no escaping (java-interop.ts:632-637), and the resulting DocumentationInfo.javadoc Markdown (java-interop.ts:638-643, tryParseJavaDoc at 896-905) carries no length bound. Both values are stored on the AST node returned to RU-61-04's hover/completion providers with no further sanitization in this unit.
failure_scenario:  A malicious or compromised peer on interopHost:interopPort returns a getClassInfo/getClassInfos response with an oversized or Markdown-control-character-laden method.returnType, parameter name, or a multi-megabyte doc string; the value flows unmodified into the IDE-rendered hover/completion markdown built from this unit's output.
classification:    major (1) touches ~2 files (validation helper alongside java-interop.ts): pass — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (validate/bound/escape before assignment): pass — (6) severity is `medium` but primary dimension is D1: FAIL — `major` regardless (D-13).
effort:            4
dedup:             none — no frozen open issue addresses peer-response validation on the java-interop channel.
disposition:       major-refactor
proposed_approach: Validate/bound/escape before assignment.
proposed_labels:   area=vscode; PRIO 2; effort 4
issue:             
```

```
id:                P61-D1-003
unit:              RU-61-03
location:          bbj-vscode/src/language/bbj-cpl-service.ts:82-155,228-235
dimension:         D1
secondary:         []
severity:          high
evidence_tier:     repro
evidence:          Line-by-line trace: compile() (bbj-cpl-service.ts:82-155) derives the spawned executable's path entirely from getBbjcplPath() (228-235), which computes path.join(this.wsManager.getBBjDir(), 'bin', binaryName) guarded only by a truthiness check on bbjHome (`if (!bbjHome) return undefined;`) — no check that the resolved path exists, is confined to any allowed directory, or is a genuine BBj installation. compile() (line 140) then spawns that derived path directly via spawn(bbjcplBin, ['-N', filePath]) with no further confirmation. bbjHome originates from BBjWorkspaceManager.getBBjDir(), fed by the bbj.home VS Code setting, which bbj-vscode/package.json:340-347 declares "scope": "window" — a workspace-scoped setting settable by a .vscode/settings.json committed inside a cloned repository, the same class of gap already recorded for interopHost/interopPort at P61-D1-001. A runnable reproduction was built and run in this sweep, substituting a controlled directory for bbjHome and confirming that compile() executes whatever program is present at <bbjHome>/bin/bbjcpl (or bbjcpl.exe on Windows) with the current document's file path as an argument — establishing that this is unconditional, unvalidated execution of a workspace-configured path, not a theoretical gap. Per D-12, the trigger sequence and reproduction script are not published in this record.
failure_scenario:  A workspace-scoped .vscode/settings.json committed inside a cloned repository sets bbj.home to a directory an attacker controls. Opening that workspace and triggering any BBjCPL compilation (on-save, under the default compilerTrigger: 'debounced') causes the language server to execute whatever program the attacker placed at <bbj.home>/bin/bbjcpl (or .exe on Windows), with the currently-edited file's path as an argument — full code execution in the language-server process, with no confirmation step visible in this unit's files.
classification:    major (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest, confirmed via the reproduction built in this sweep using the existing createMockServices pattern in test/cpl-service.test.ts: pass — (5) reviewer can name the exact edit (validate that the resolved bbjcpl path exists and is confined to an expected layout before spawning, or warn/gate on an unusual bbjHome): pass — (6) severity is `high`: FAIL — `major` regardless of the other five tests (D-13's safety gate).
effort:            4
dedup:             none — checked against #231 (Support Custom Classpath and Command Line Settings for starting BBj Programs), the closest area match — it requests ADDING configurable classpath/CLI args for RUN commands, not validating the bbjcpl binary path already spawned here; #466 and #90 (this unit's flagged plausible neighbours) do not concern process-spawn path validation either. No frozen open issue addresses bbjcpl binary-path validation.
disposition:       major-refactor
proposed_approach: Validate that the resolved bbjcpl path exists and is confined to an expected layout before spawning, or warn/gate on an unusual bbjHome.
proposed_labels:   area=vscode; PRIO 1; effort 4
issue:             
```

```
id:                P61-D1-004
unit:              RU-61-04
location:          bbj-vscode/src/language/bbj-hover.ts:88-106, bbj-vscode/src/language/bbj-completion-provider.ts:670-691
dimension:         D1
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace: bbj-hover.ts's getAstNodeHoverContent (88-106) reads documentation.docu, passes it through tryParseJavaDoc (line 91, defined 138-149) with no escaping or length bound, and returns it as part of a plain string. That string is the sole input to Langium's own AstNodeHoverProvider.getHoverContent (node_modules/langium/src/lsp/ hover-provider.ts:58-64), which wraps it unmodified into `Hover.contents = { kind: 'markdown', value: ... }` — sent to the client as LSP MarkupContent explicitly typed as Markdown. Separately, bbj-completion-provider.ts's createReferenceCompletionItem (670-691) builds `superImpl.documentation = { kind: 'markdown', value: parts.join('\n\n') }` from the same node.docu.javadoc field. Neither site escapes Markdown control characters (`[`, `]`, `(`, `)`, backtick, `!`) before interpolation.
failure_scenario:  A malicious or compromised java-interop peer (SEC-06, RU-61-06) returns a getClassInfo response whose javadoc text contains Markdown link/image syntax (e.g. `![x](https://evil.example/track.png)` or `[click here](https://evil. example/phish)`); hovering over, or viewing completion documentation for, any reference to that Java class renders the injected link/image inside the IDE's hover/completion popup. This settles RU-61-06's own not-reproducible disposition on this exact question: the renderer is confirmed configured for Markdown (not plaintext), so the weaker claim (markup CAN be interpreted) is now established with file:line evidence; the stronger claim (script/command execution) is explicitly NOT asserted — see Not-reproducible dispositions below.
classification:    major (1) touches 2 files (bbj-hover.ts, bbj-completion-provider.ts) to add a shared escaping step: FAIL — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (escape Markdown control characters in tryParseJavaDoc's output and in the javadoc/signature strings before they reach `documentation`/`contents`): pass — (6) severity `medium` but primary dimension is D1: FAIL — major regardless of the other five tests (D-13's safety gate).
effort:            4
dedup:             none — checked #108 (inlay hints, an unrelated feature request) and #475 (SETOPTS composer decode-hover feature request, a different subsystem/phase — RU-62-04) explicitly; neither concerns markdown-escaping of javadoc/hover content in this unit's providers.
disposition:       major-refactor
proposed_approach: Escape Markdown control characters in tryParseJavaDoc's output and in the javadoc/signature strings before they reach `documentation`/`contents`.
proposed_labels:   area=vscode; PRIO 2; effort 4
issue:             
```

```
id:                P61-D1-005
unit:              RU-61-04
location:          bbj-vscode/src/language/bbj-code-action-provider.ts:82-83, bbj-vscode/src/language/bbj-completion-provider.ts:99-113
dimension:         D1
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace: createUseAction (bbj-code-action-provider.ts:82-83) builds `TextEdit.insert(useInsertPosition(document), \`use ${fqn}\\n\`)` where `fqn` is a candidate returned by javaInterop.resolveClassCandidatesBySimpleName(simpleName) — sourced from either completeClassIndex (built from unvalidated peer `name`/`packageName` fields, java-interop.ts:340-346) or `javaClass.packageName`/`javaClass.name` (also unvalidated peer fields, per P61-D1-002). completeAutoImportClasses (bbj-completion-provider.ts:99-113) does the same via `additionalTextEdits: [TextEdit.insert(insertPosition, \`use ${fqn}\\n\`)]`. Neither call site validates fqn's format (e.g. a legal Java identifier sequence) before interpolating it into source text inserted into the user's own document. bbj-use-insert.ts's useInsertPosition only computes the insertion line; it performs no content validation of its own.
failure_scenario:  A malicious or compromised java-interop peer returns a class/package name containing embedded newlines or arbitrary BBj source text (e.g. "Foo\nRUN \"malicious.bbj\"") in a getClassInfo/getClassInfos response. The resulting `use` quick-fix (marked isPreferred: true for the top-ranked candidate, steering VS Code's Ctrl+. Auto Fix toward it) or auto-import completion item inserts that text verbatim into the user's source file when accepted, without any confirmation beyond the ordinary quick-fix/completion acceptance gesture.
classification:    major (1) touches 2 files (bbj-code-action-provider.ts, bbj-completion-provider.ts) to add validation, or bbj-use-insert.ts to centralize it: FAIL — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (validate fqn against a legal-identifier-sequence pattern before building the TextEdit, in both call sites or a shared helper): pass — (6) severity `medium` but primary dimension is D1: FAIL — major regardless (D-13's safety gate).
effort:            4
dedup:             none — checked #108 and #475 explicitly; neither concerns FQN validation on the missing-use quick-fix/auto-import insertion path.
disposition:       major-refactor
proposed_approach: Validate fqn against a legal-identifier-sequence pattern before building the TextEdit, in both call sites or a shared helper.
proposed_labels:   area=vscode; PRIO 2; effort 4
issue:             
```

```
id:                P61-D1-006
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-ws-manager.ts:53-55
dimension:         D1
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace: bbj-ws-manager.ts:53-55 reads `params.initializationOptions.interopHost || 'localhost'` and `params.initializationOptions.interopPort || 5008` — a falsy check only, identical in shape to main.ts:151-152's `config.interop?.host || 'localhost'` / `config.interop?.port || 5008` — before handing both to javaInterop.setConnectionConfig(). Neither call site adds type/range validation beyond what RU-61-06 already found missing inside setConnectionConfig itself (P61-D1-001); a non-integer, negative, out-of-range, or string-typed interopPort passes through both call sites unmodified.
failure_scenario:  A workspace-scoped .vscode/settings.json committed inside a cloned repository sets bbj.interop.host/bbj.interop.port to an attacker-controlled host/port, reachable via either the initial handshake (bbj-ws-manager.ts) or a later settings change (main.ts) — same failure shape as P61-D1-001, now confirmed at both of this unit's own call sites.
classification:    major (1) touches 1 file (validation can be centralized inside setConnectionConfig, java-interop.ts, without touching either call site): pass — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (add type/range validation in setConnectionConfig, or duplicate it at both call sites): pass — (6) severity `medium` but primary dimension is D1: FAIL — major regardless of the other five tests (D-13's safety gate).
effort:            2
dedup:             none — checked against #33 (multi-root breakage, unrelated mechanism), #231 (closest area match — requests configurable classpath/CLI args for RUN commands, not interop client host/port), #385, #485 and #486 — none address interop-destination validation.
disposition:       major-refactor
proposed_approach: Add type/range validation in setConnectionConfig, or duplicate it at both call sites.
proposed_labels:   area=vscode; PRIO 2; effort 2
issue:             
```

```
id:                P61-D1-007
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-ws-manager.ts:118-126
dimension:         D1
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace: when `this.configPath` is set (from initializationOptions.configPath or the didChangeConfiguration path), lines 120-121 do `const configUri = safeUri(this.configPath); const configContents = await this.fileSystemProvider.readFile(configUri);` with no check that the resolved path stays inside the workspace root — safeUri (bbj-ws-manager.ts: 266-268) accepts any `file://` URI or bare path unmodified. The read result is only scanned for a line starting with "PREFIX"; the rest of the file's content is discarded, but the read itself is unconditional and unbounded.
failure_scenario:  A workspace-scoped .vscode/settings.json committed inside a cloned repository sets bbj.configPath to an absolute path outside the workspace (e.g. a file under the user's home directory). Opening that workspace causes the language server to read that file's full contents into memory on every initializeWorkspace() call, with no confirmation step and no containment check visible in this unit's files.
classification:    major (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (resolve configPath relative to the workspace root and reject paths that escape it): pass — (6) severity `medium` but primary dimension is D1: FAIL — major regardless (D-13).
effort:            2
dedup:             #485 partial-overlap — #485 requests honoring a custom-named/located config file "everywhere"; that capability is already implemented here via configPath. This finding is about that implementation's missing path-containment check, not about adding the capability #485 requests.
disposition:       major-refactor
proposed_approach: Resolve configPath relative to the workspace root and reject paths that escape it.
proposed_labels:   area=vscode; PRIO 2; effort 2
issue:             
```

```
id:                P61-D1-008
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-document-builder.ts:303-317
dimension:         D1
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace: addImportedBBjDocuments collects `importPath` from each USE statement's untrusted bbjFilePath text (matched against bbj-scope.ts's `BBjPathPattern = /^::(.*)::$/`, which places no restriction on the captured group) and, for each configured prefixPath, computes `const prefixedPath = URI.file(resolve(prefixPath, importPath));` (bbj-document-builder.ts:306) then `fsProvider.readFile(prefixedPath)` (bbj-document-builder.ts:308) with no check that the resolved path stays under prefixPath. Reproduced directly (Node path.resolve, not a theoretical claim): `resolve('/home/user/project/lib', '../../../../etc/passwd')` => '/etc/passwd', and `resolve('/home/user/project/lib', '/etc/passwd')` => '/etc/passwd' — both `..`-traversal and an absolute importPath escape the PREFIX root entirely via Node's own path.resolve() semantics. Any file found at the resolved path is read, added to langiumDocuments, and indexed (bbj-document-builder.ts:326-330) — not merely probed.
failure_scenario:  A malicious or careless .bbj source file inside a PREFIX-resolved directory contains `use ::../../../../etc/passwd::SomeClass` (or an absolute-path variant). The next buildDocuments() cycle resolves that path outside the configured PREFIX root, reads whatever file exists there, and adds it to the workspace index as a parsed BBj document — an arbitrary local file read triggered purely by source-file content, independent of any workspace setting.
classification:    major (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (after resolve(), verify the result stays under prefixPath before calling readFile, e.g. via a relative()-based containment check): pass — (6) severity `medium` but primary dimension is D1: FAIL — major regardless (D-13).
effort:            4
dedup:             none — checked against #33, #231, #385, #485 and #486 — none concern USE-statement path traversal into PREFIX-resolved directories.
disposition:       major-refactor
proposed_approach: After resolve(), verify the result stays under prefixPath before calling readFile, e.g. via a relative()-based containment check.
proposed_labels:   area=vscode; PRIO 2; effort 4
issue:             
```

```
id:                P61-D1-009
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-ws-manager.ts:231-241
dimension:         D1
secondary:         [D2]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace: isExternalDocument() (bbj-ws-manager.ts:231-241, whose own in-code comment reads `// TODO check that document is part of the workspace folders`) tests `documentUri.fsPath.startsWith(URI.file(prefix).fsPath)` — a bare string prefix comparison with no path-segment boundary. Reproduced directly (Node): with prefix `/home/user/lib`, `'/home/user/library-secrets/File.bbj' .startsWith('/home/user/lib')` evaluates `true`, even though `library-secrets` is a sibling directory, not a descendant of the PREFIX directory.
failure_scenario:  A workspace happens to contain a directory whose name shares a PREFIX directory's path as a text prefix (e.g. PREFIX `/ws/lib` and an in-workspace directory `/ws/library-legacy`). Any document under that sibling directory is misclassified as an "external", PREFIX-resolved document — shouldValidate (bbj-document-builder.ts:50-59) then silently skips validation for it, and revalidateUseFilePathDiagnostics/shouldRelink treat it as read-only, even though it is a genuine in-workspace file that should be validated normally.
classification:    major (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (compare against `prefix + path.sep`, or use a proper relative()-based containment check): pass — (6) severity `low` but primary dimension is D1: FAIL — major regardless of the other five tests (D-13's safety gate).
effort:            2
dedup:             none — checked against #33 (multi-root breakage — a different mechanism, root-folder handling rather than prefix-string collision), #231, #385, #485 and #486 — none concern prefix-based document classification.
disposition:       major-refactor
proposed_approach: Compare against `prefix + path.sep`, or use a proper relative()-based containment check.
proposed_labels:   area=vscode; PRIO 3; effort 2
issue:             
```

```
id:                P61-D2-007
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj.langium:941
dimension:         D2
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Regex reproduction of the BBjFilePath terminal (`/::.*::/`, bbj.langium:941): for input `"::lib1::ClassA a; declare ::lib2::ClassB b"`, `"::lib1::ClassA a; declare ::lib2::ClassB b".match(/::.*::/)[0]` returns `"::lib1::ClassA a; declare ::lib2::"` — the greedy `.*` backtracks from the end of the line to the LAST `::` occurrence rather than the nearest one, consuming a second, independent `declare ::lib2::...` statement into the first token. `QualifiedBBjClassName` (bbj.langium:869-870, `BBjFilePath ID`) feeds `BBjTypeRef`/`Use`, both reachable inside a `;`-separated compound `Statement` (bbj.langium:22-23), so two BBjFilePath-qualified references can legally appear on one physical line.
failure_scenario:  A line containing two independent qualified-file-path class references joined by `;` — e.g. `declare ::lib1::ClassA a; declare ::lib2::ClassB b` — tokenizes the first BBjFilePath as spanning through the second declaration's opening `::`, corrupting the parse of both statements (the second `declare` loses its own file-path token, and the first's `ID` production is fed garbled trailing text).
classification:    major (1) touches 1 file: pass — (2) no public API/grammar/LSP change: FAIL — the fix edits the BBjFilePath terminal, a rule in bbj-vscode/src/language/bbj.langium — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (e.g. `/::[^:]*(:[^:][^:]*)*::/` or an explicit non-greedy/negated-character-class rewrite, verified against legitimate paths containing single colons): pass — (6) severity `medium`, dimension D2: pass — but test (2) already fails, so classification is `major` regardless of the other five tests (D-13's safety gate).
effort:            4
dedup:             none — no frozen open issue concerns BBjFilePath tokenization.
disposition:       major-refactor
proposed_approach: E.g. `/::[^:]*(:[^:][^:]*)*::/` or an explicit non-greedy/negated-character-class rewrite, verified against legitimate paths containing single colons.
proposed_labels:   area=vscode; PRIO 2; effort 4
issue:             
```

```
id:                P61-D2-012
unit:              RU-61-02
location:          bbj-vscode/src/language/bbj-type-inferer.ts:47-48,77-78
dimension:         D2
secondary:         [D4, D8]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace: `grep -rn findBestOverload bbj-vscode/src/` returns exactly one call site, `bbj-inlay-hint-provider.ts:65` — no other file, including `bbj-type-inferer.ts` and `bbj-linker.ts`, ever calls it. bbj-type-inferer.ts:47-48 (`isMethodDecl(reference) => getClass(reference.returnType)`) and :77-78 (`isMethodDecl(member) => getClass(member.returnType)`) both read the return type of whatever declaration the LINKER already picked, with no re-selection by the call's actual argument count/types. bbj-linker.ts:105-110's getCandidate does a first-match `scope.getElement(refInfo.reference.$refText, ...)` with the same no-re-selection behavior. bbj-overload-selector.ts's own header comment ("Call sites re-select among the sibling overloads by the call's shape", lines 10-12) states this generally, but only one of this codebase's several overload-sensitive call sites (hover, completion, type inference, linking) actually does so.
failure_scenario:  A BBj class or Java class with two same-named method overloads whose scope order (declaration order, or classpath-response order) yields the argument-shape-WRONG overload first: the linker links to that first-yielded declaration regardless of the call's real argument count/types (#478's original symptom, already fixed for bbj-inlay-hint-provider.ts's parameter hints), and bbj-type-inferer.ts propagates that same wrong declaration's return type unconditionally — an overload-sensitive call site can therefore be typed by the wrong overload's return type with nothing to correct it.
classification:    major (1) touches 1 file: FAIL — a real fix needs bbj-linker.ts's getCandidate (or bbj-type-inferer.ts) to consult bbj-overload-selector.ts, spanning at least two files — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (call findBestOverload from getCandidate/getType and re-derive identity/return-type from the winning candidate): pass — (6) severity medium, dimension D2 (not D1): pass — but test (1) already fails, so classification is `major`.
effort:            8
dedup:             none — checked #83 (no match), #90 (no match), #466 (sibling-type RETURN MISMATCH VALIDATION assumes the resolved overload is already correct and compares its declared type against a hierarchy — this finding is about resolving to the wrong overload in the first place, upstream of and unrelated to #466's validation mechanism, no overlap); no frozen issue names overload re-selection for linking/type-inference specifically.
disposition:       major-refactor
proposed_approach: Call findBestOverload from getCandidate/getType and re-derive identity/return-type from the winning candidate.
proposed_labels:   area=vscode; PRIO 2; effort 8
issue:             
```

```
id:                P61-D2-018
unit:              RU-61-05
location:          bbj-vscode/src/language/main.ts:140-155
dimension:         D2
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace: `this.settings` (bbj-ws-manager.ts:29) is assigned exactly once, inside initializeWorkspace() (bbj-ws-manager.ts:141) — grep confirms `this.settings =` appears nowhere else in this unit's files. main.ts's onDidChangeConfiguration handler calls `wsManager.setConfigPath(config.configPath || '')` (main.ts:143, 155), which only stores the new path on the `configPath` field (bbj-ws-manager.ts:243-245) for a FUTURE initializeWorkspace() call — no code path anywhere in this unit re-reads config.bbx/project.properties or recomputes `this.settings.prefixes` after startup.
failure_scenario:  A user edits config.bbx to add or change a PREFIX entry while the language server is running, then changes an unrelated bbj.* setting to trigger onDidChangeConfiguration (or explicitly changes bbj.configPath). The handler reloads the Java classpath and clears the interop cache, but `this.settings.prefixes` stays exactly as computed at startup — the new PREFIX has no effect until the window/server is fully restarted, matching #486's request to "watch config.bbx and re-apply PREFIX/USE changes without a manual restart".
classification:    major (1) touches 1 file: FAIL — closing this gap requires exposing a settings-reload entry point on BBjWorkspaceManager (bbj-ws-manager.ts) AND calling it from main.ts's onDidChangeConfiguration handler — 2 files — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (add a `reloadSettings()` method re-running the config.bbx/ project.properties read, call it from main.ts on relevant setting changes): pass — (6) severity `medium`, dimension D2 (not D1): pass — but test (1) already fails, so classification is `major`.
effort:            8
dedup:             #486 partial-overlap — #486 requests watching config.bbx and re-applying PREFIX/USE changes without a restart; this finding traces the exact missing call (settings.prefixes computed once in initializeWorkspace(), never recomputed by didChangeConfiguration) that implementing #486 would need to add.
disposition:       major-refactor
proposed_approach: Add a `reloadSettings()` method re-running the config.bbx/ project.properties read, call it from main.ts on relevant setting changes.
proposed_labels:   area=vscode; PRIO 2; effort 8
issue:             
```

```
id:                P61-D3-002
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:42-46, 798-820
dimension:         D3
secondary:         []
severity:          high
evidence_tier:     repro
evidence:          Line-by-line trace: resolveClassByName() acquires acquireLock (java-interop.ts:483, defined 798-820) before any network call, and every depth === 0 (top-level) call mints a brand-new lock token (`depth === 0 ? {} : ...`, java-interop.ts:482) rather than sharing one across distinct class names — so resolutions of different class names never re-enter, they queue strictly behind each other on the single lockQueue/lockHeld mutex (java-interop.ts:42-46). Against an unreachable peer, each queued resolution independently pays the full 10s createSocket() connect timeout (java-interop.ts:127-131) before failing and releasing the lock to the next. loadImplicitImports() (java-interop.ts:213-277) fires its per-class resolveClass() calls via Promise.all, but every one of them still serializes through this same lock.
failure_scenario:  With the peer unreachable, a document containing N distinct unresolved Java class references triggers N serialized ~10s connect-timeout attempts (~10xN seconds) before validation completes, rather than failing once and short-circuiting the rest; the same serialization governs the startup loadImplicitImports() preload across the 8 implicit packages' full member-type graph.
classification:    major (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (a peer-reachability circuit breaker that short-circuits further connect attempts after the first failure, reset on clearCache()): pass — (6) severity `high`: FAIL — `major` regardless of the other five tests (D-13's safety gate).
effort:            8
dedup:             none — none of the 15 frozen open issues concern java-interop connection-retry behavior; #232 (CPU stability in multi-project workspaces, routed to RU-61-02) is a different mechanism (scope walks, not connection serialization).
disposition:       major-refactor
proposed_approach: A peer-reachability circuit breaker that short-circuits further connect attempts after the first failure, reset on clearCache().
proposed_labels:   area=vscode; PRIO 1; effort 8
issue:             
```

```
id:                P61-D3-003
unit:              RU-61-02
location:          bbj-vscode/src/language/bbj-scope.ts:308-331
dimension:         D3
secondary:         []
severity:          high
evidence_tier:     repro
evidence:          Line-by-line trace, re-triaging routing-table item #232 (CPU stability in multi-project workspaces, DEBT-01) against the current code. (1) getBBjClassesFromFile (bbj-scope.ts:308-331) calls `this.indexManager.allElements(BbjClass.$type).filter(...)` — a full linear scan of every BbjClass in the entire workspace index across all loaded projects — on every `::file::Class`-qualified class reference and every `USE "::file::"` resolution (bbj-scope.ts:250, 342), with no per-file or per-request cache. (2) collectLocalSymbols (bbj-scope-local.ts:106-114) walks `AstUtils.streamAllContents(rootNode)` — the FULL, unpruned AST of every document — with a per-node `await interruptAndCheck(cancelToken)`, unlike bbj-linker.ts:47-58's link(), which already calls `treeIter.prune()` to skip external-document private-member subtrees; collectLocalSymbols has no equivalent isExternalDocument-aware pruning. Both mechanisms scale with total multi-project workspace size, not the referencing/active file's own size. Checked what documented mitigations are present: bbj-index-manager.ts:14-27's isAffected() override is a PRESENT, PARTIAL mitigation — it skips rebuilding external documents when only non-external URIs changed — but this only reduces rebuild frequency; it does not address either of the two request-time costs above, which remain ABSENT any mitigation.
failure_scenario:  A multi-project workspace with many external/referenced BbjClass documents loaded: every `::file::Class` scope resolution rescans the entire cross-project index, and every document load/rebuild walks its full AST including any external project's documents with no pruning — CPU cost scales with total multi-project workspace size rather than the active file's own size, consistent with #232's reported symptom.
classification:    major (1) touches 1 file: FAIL — a real fix needs both a cache in bbj-scope.ts and isExternalDocument-aware pruning in bbj-scope-local.ts, two files — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest (synthetic multi-document workspace fixture plus timing assertions, per RU-61-01's D3 benchmark precedent): pass — (5) reviewer can name the exact edit (cache getBBjClassesFromFile's per-file lookup keyed by bbjFilePath+doc URI; add isExternalDocument-based pruning to collectLocalSymbols mirroring bbj-linker.ts's treeIter.prune()): pass — (6) severity `high`: FAIL — `major` regardless of the other five tests (D-13's safety gate).
effort:            8
dedup:             none — #232 is not in the frozen 15-issue snapshot because it is not an open GitHub issue (already tracked as roadmap tech debt); names DEBT-01 as the owning requirement so Phase 66 re-triages against this current-code evidence rather than re-deriving it. Checked #83 (project-wide USE statements mechanism, no match — different feature request), #90 (opting files/regions out of linking, no match — this is a performance path, not an opt-out feature), #466 (sibling-type method return mismatches, no match — unrelated dimension) as this unit's plausible neighbours; none match.
disposition:       major-refactor
proposed_approach: Cache getBBjClassesFromFile's per-file lookup keyed by bbjFilePath+doc URI; add isExternalDocument-based pruning to collectLocalSymbols mirroring bbj-linker.ts's treeIter.prune().
proposed_labels:   area=vscode; PRIO 1; effort 8
issue:             
```

```
id:                P61-D4-001
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:37-831
dimension:         D4
secondary:         []
severity:          medium
evidence_tier:     trace
evidence:          Trace: the single class JavaInteropService (java-interop.ts:37-831, 955 lines total in the file) bundles at least 5 distinct responsibilities: connection lifecycle (connect/createSocket, 91-142), class resolution/caching (resolveClassByName/resolveClass/storeJavaClass, 430-755), the global resolution lock (acquireLock/drainLockQueue, 792-830), classpath/implicit-import loading (loadClasspath/ loadImplicitImports, 189-277), and the complete-class-index builder (ensureCompleteClassIndex/buildCompleteClassIndex, 283-348). No internal module boundary separates them.
failure_scenario:  n/a (D4 trace-tier finding — the code shape itself is the defect, not a runtime failure): a change to any one responsibility (e.g. the lock, or the class-index cache) risks touching unrelated state in the same class, and a new contributor cannot reason about one responsibility (e.g. connection lifecycle) without reading the whole 955-line file.
classification:    major (1) touches 1 file: FAIL — a responsibility split necessarily creates or touches more than one file — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (extract the lock and the complete-class-index builder into their own modules): pass — (6) severity `medium`, dimension D4: pass — but test (1) already fails, so classification is `major`.
effort:            8
dedup:             none
disposition:       major-refactor
proposed_approach: Extract the lock and the complete-class-index builder into their own modules.
proposed_labels:   area=vscode; PRIO 2; effort 8
issue:             
```

```
id:                P61-D4-002
unit:              RU-61-06
location:          bbj-vscode/src/language/java-javadoc.ts:16-36
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Trace: JavadocProvider (java-javadoc.ts:16-36) is a hard singleton — a private constructor plus a static `getInstance()` — rather than an injected DI service. test/bbj-test-module.ts:52-54 works around this by checking `isInitialized()` before calling `initialize()` a second time, instead of receiving a fresh instance per test, which is the pattern every other collaborator in this unit uses (JavaInteropService itself is constructor-injected via BBjServices).
failure_scenario:  n/a (D4 trace-tier finding): the singleton's module-level static state persists across the process lifetime (and across unrelated test files sharing the same vitest worker, unless carefully guarded by `isInitialized()` checks as the test double already does), making the provider harder to reset, mock, or run with two independent configurations in the same process than an injected service would be.
classification:    major (1) touches 1 file: FAIL — removing the singleton also touches bbj-module.ts's DI wiring — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (inject JavadocProvider via BBjServices instead of getInstance()): pass — (6) severity `low`, dimension D4: pass — but test (1) already fails, so classification is `major`.
effort:            8
dedup:             none
disposition:       major-refactor
proposed_approach: Inject JavadocProvider via BBjServices instead of getInstance().
proposed_labels:   area=vscode; PRIO 3; effort 8
issue:             
```

```
id:                P61-D4-004
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj.langium:513-521,614-617
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Trace: fragment WithChannelAndOptionsAndOutputItems (bbj.langium:513-521) and fragment WithChannelAndOptionsAndInputItems (bbj.langium:614-617) share the identical `'(' channelno=Expression? Options? (...)` opening shape and the identical bare-items-list closing alternative, differing only in OutputItem vs. InputItem and one extra alternative the Output variant carries (`RPAREN_NO_NL ENDLINE_PRINT_COMMA` with no items) that the Input variant lacks — already a visible drift between the two near-duplicates.
failure_scenario:  n/a (D4 trace-tier finding — the code shape itself is the defect, not a runtime failure): a future change to the shared channel/options/RPAREN opening shape (e.g. adding a new Options variant) must be applied by hand in both fragments, and the two are already inconsistent (the extra Output-only alternative), so a change is likely to be applied to only one.
classification:    major (1) touches 1 file: pass — (2) no public API/grammar/LSP change: FAIL — de-duplicating necessarily edits both fragments' rule text in bbj-vscode/src/language/bbj.langium — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (extract a shared `WithChannelAndOptionsAndItems<Item>`-style common prefix fragment, or a documented rationale for why the extra Output-only alternative must stay asymmetric): pass — (6) severity `low`, dimension D4: pass — but test (2) already fails, so classification is `major`.
effort:            4
dedup:             none
disposition:       major-refactor
proposed_approach: Extract a shared `WithChannelAndOptionsAndItems<Item>`-style common prefix fragment, or a documented rationale for why the extra Output-only alternative must stay asymmetric.
proposed_labels:   area=vscode; PRIO 3; effort 4
issue:             
```

```
id:                P61-D4-007
unit:              RU-61-03
location:          bbj-vscode/src/language/validations/check-classes.ts:89-548
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Trace: the single class ClassValidator (check-classes.ts:89-548, 460 of the file's 549 lines) bundles at least 4 distinct responsibilities with no internal module boundary: class-reference/visibility checking (checkClassReference/warnUnresolvableType/checkBBjClass/isSubFolderOf, 104-188), return-type and field-initializer literal/assignability checking, including a hand-maintained 11-entry FINAL_TYPE_ASSIGNABLE_TO supertype map (checkMethodReturn/checkReturnTypeAssignable/isAssignable/ bbjSupertypesReach/classFqn/classDisplayName/checkFieldInit/ literalTypeMismatch/simpleTypeName, 190-457), constructor validation (checkInstantiable/checkConstructorArguments/isArrayConstruction, 459-521), and cyclic-inheritance detection (checkCyclicInheritance, 523-547) — the same god-class shape already recorded for java-interop.ts at P61-D4-001 in RU-61-06. #466 (sibling-type method return mismatches via Java class hierarchy) partially overlaps this file's FINAL_TYPE_ASSIGNABLE_TO mechanism — the existing code already implements a conservative version of #466's request, limited to well-known FINAL Java types (String, the boxed numeric types, BigDecimal/BigInteger) — but this finding is about the class's responsibility count, not about extending that coverage, so no duplication with #466's feature request.
failure_scenario:  n/a (D4 trace-tier finding — the code shape itself is the defect, not a runtime failure): a future change to any one responsibility (e.g., extending FINAL_TYPE_ASSIGNABLE_TO per #466, or changing the cyclic-inheritance depth bound) risks touching unrelated state or logic in the same 460-line class, and a new contributor cannot reason about one responsibility (e.g., constructor-argument arity) without reading the whole class.
classification:    major (1) touches 1 file: FAIL — a responsibility split necessarily creates or touches more than one file — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest, using the existing class-validations-issues.test.ts/inheritance-cycle -validation.test.ts suites as a regression baseline: pass — (5) reviewer can name the exact edit (extract return-type/field-init checking and constructor validation into their own modules, mirroring how check-function-calls.ts and check-variable-scoping.ts are already separated from check-classes.ts): pass — (6) severity `low`, dimension D4: pass — but test (1) already fails, so classification is `major`.
effort:            8
dedup:             #466 partial-overlap — this finding's subject (the class's responsibility count) does not duplicate #466's request (extending sibling-type mismatch detection), but the FINAL_TYPE_ASSIGNABLE_TO mechanism this finding names is the code #466 would extend, so cross-referencing is useful when #466 is triaged. Checked against #90 also (this unit's other flagged plausible neighbour); no overlap.
disposition:       major-refactor
proposed_approach: Extract return-type/field-init checking and constructor validation into their own modules, mirroring how check-function-calls.ts and check-variable-scoping.ts are already separated from check-classes.ts.
proposed_labels:   area=vscode; PRIO 3; effort 8
issue:             
```

```
id:                P61-D4-011
unit:              RU-61-04
location:          bbj-vscode/src/language/bbj-signature-help-provider.ts:60-68, bbj-vscode/src/language/bbj-inlay-hint-provider.ts:93-101
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Trace: getFunctionReference is defined identically in both files — same 9-line body (`if (isSymbolRef(method)) return method.symbol; else if (isMemberCall(method)) return method.member; return undefined;`), same signature shape (`(callNode: MethodCall) => Reference<NamedElement> | undefined`), with no shared helper between them despite both files already importing shared logic from bbj-hover.ts (methodSignature).
failure_scenario:  n/a (D4 trace-tier finding — the code shape itself is the defect, not a runtime failure): a future change to how a MethodCall's callee reference is resolved (e.g. adding a third method-reference shape) must be applied in both files by hand, risking drift between signature help and inlay hints.
classification:    major (1) touches 1 file: FAIL — extracting a shared helper touches at least 3 files (both call sites plus the shared module they import it from, e.g. bbj-nodedescription-provider.ts, which already supplies both files' other MethodCall helpers) — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (extract getFunctionReference into bbj-nodedescription-provider.ts and update both call sites): pass — (6) severity `low`, dimension D4: pass — but test (1) already fails, so classification is `major` regardless of the other five tests.
effort:            2
dedup:             none
disposition:       major-refactor
proposed_approach: Extract getFunctionReference into bbj-nodedescription-provider.ts and update both call sites.
proposed_labels:   area=vscode; PRIO 3; effort 2
issue:             
```

```
id:                P61-D4-013
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-ws-manager.ts:53-54
dimension:         D4
secondary:         [D1]
severity:          low
evidence_tier:     trace
evidence:          Trace: bbj-ws-manager.ts:53-54 computes `params.initializationOptions.interopHost || 'localhost'` / `params.initializationOptions.interopPort || 5008`; main.ts:151-152 independently computes `config.interop?.host || 'localhost'` / `config.interop?.port || 5008` — the identical default literals ('localhost', 5008) recomputed at two call sites with no shared constant or helper, in addition to the shared unvalidated-falsy-check gap already recorded as `P61-D1-006`.
failure_scenario:  n/a (D4 trace-tier finding): if the default host/port ever needs to change (e.g. a new default interop port), both call sites must be updated in lockstep by hand; a partial update leaves the two paths silently disagreeing on the effective default.
classification:    major (1) touches 1 file: FAIL — removing the duplication by stripping the redundant defaulting from both call sites (letting setConnectionConfig own the default alone) touches both bbj-ws-manager.ts and main.ts — 2 files — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (pass interopHost/interopPort through unmodified at both call sites, relying solely on setConnectionConfig's own default): pass — (6) severity `low`, dimension D4 (not D1): pass — but test (1) already fails, so classification is `major`.
effort:            2
dedup:             none — checked against #231 (closest area match — requests configurable classpath/CLI args for RUN commands, not interop-default duplication), #33, #385, #485 and #486 — none address this duplication.
disposition:       major-refactor
proposed_approach: Pass interopHost/interopPort through unmodified at both call sites, relying solely on setConnectionConfig's own default.
proposed_labels:   area=vscode; PRIO 3; effort 2
issue:             
```

```
id:                P61-D4-014
unit:              RU-61-05
location:          bbj-vscode/src/language/composer-commands.ts:1-13
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Trace: composer-commands.ts's only non-`vscode-languageserver` imports are `../msgbox-composer.js`, `../addwindow-composer.js` and `../addchildwindow-composer.js` (composer-commands.ts:15-34) — all three live one directory up, in `src/`, not in `src/language/` alongside this file. The file touches no Langium grammar/scope/validation/LSP-provider service; its only interaction with `src/language/` is being imported once, by `main.ts:17`, to call `registerComposerRequests(connection)`.
failure_scenario:  n/a (D4 trace-tier finding — a placement/structure defect, not a runtime failure): a contributor looking for the composer request-handling layer inside `src/` (next to the composer domain modules it wraps) will not find it there; it is instead nested inside the Langium-pipeline-focused `src/language/` directory.
classification:    major (1) touches 1 file: FAIL — moving the file also updates the one import in main.ts (`./composer-commands.js` -> `../composer-commands.js`) — 2 files — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest (existing test/composer-commands.test.ts continues to pass after the move): pass — (5) reviewer can name the exact edit (move composer-commands.ts to src/, update main.ts's import path): pass — (6) severity `low`, dimension D4 (not D1): pass — but test (1) already fails, so classification is `major`.
effort:            2
dedup:             none — checked against #385 (requests launching the external Graffiti Composer tool — unrelated to this file's location in the source tree), #33, #231, #485 and #486 — none address module placement.
disposition:       major-refactor
proposed_approach: Move composer-commands.ts to src/, update main.ts's import path.
proposed_labels:   area=vscode; PRIO 3; effort 2
issue:             
```

```
id:                P61-D4-015
unit:              RU-61-07
location:          bbj-vscode/src/language/lib/functions.ts:167,192
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Programmatic diff of each .ts file (wrapper-stripped via sed -e '1d' -e '$d') against its .bbl sibling: events 2, functions 6, labels 9, variables 2 differing diff-output lines (see unit-row D4 cell for the per-pair breakdown; labels' 9 and the trailing-blank deltas on events/functions/variables are wrapper-shape artifacts, not content divergence). One real content divergence: functions.ts:167's DOCU synopsis for CVS reads `CVS(string,int{,chars}{,ERR=lineref})` vs functions.bbl:166's `CVS(string,int{,ERR=lineref})`; the executable declaration (functions.ts:192/functions.bbl:191) is identical in both. Consumer grep (bbj-vscode/src) confirms neither physical .bbl file is read by fs-provider.ts or bbj-ws-manager.ts — both consumers import the .ts-exported constants and construct the synthetic bbjlib:///*.bbl documents from that .ts content.
failure_scenario:  A maintainer edits one format (.ts or .bbl) without the other — as already happened to CVS's DOCU synopsis — and the drift is invisible to every consumer and every test, since neither runtime code path nor test/builtin-functions-library.test.ts reads the physical .bbl file.
classification:    major (1) touches >=2 files (a build-time generation step across 4 .bbl files, or their deletion, is the only remediation that removes the duplication risk rather than patching one instance of drift): FAIL — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (generate .bbl from .ts at build time, or delete the physical .bbl files): pass — (6) severity `low`, dimension D4 (not D1): pass — test (1) fails, so classification is `major` regardless of the other five.
effort:            4
dedup:             none — none of the 15 frozen open issues concern .ts/.bbl catalog duplication or drift.
disposition:       major-refactor
proposed_approach: Generate .bbl from .ts at build time, or delete the physical .bbl files.
proposed_labels:   area=vscode; PRIO 3; effort 4
issue:             
```

```
id:                P61-D4-016
unit:              RU-61-07
location:          bbj-vscode/src/language/lib/events.ts:1,735; functions.ts:1,996; labels.ts:1,66; variables.ts:1,87
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Structural read of all four .ts wrappers: events.ts closes with a bare `;` (no .trimLeft(), no leading blank line before `library`); functions.ts and labels.ts close with `.trimLeft();` and open with an extra leading blank line before `library` that .trimLeft() exists to strip; variables.ts closes with a bare backtick (no semicolon at all, valid only via ASI) and, like events.ts, has no leading blank line. bbj.langium's `hidden terminal WS: /\s+/;` is consumed by the parser regardless of position, so the leading blank line and the .trimLeft() call that removes it have no observable effect on parsing.
failure_scenario:  Not a runtime defect (WS is hidden, so all four parse identically) — a maintainability smell: .trimLeft() is dead defensive code in 2 of 4 files, present for no principled reason distinguishing them from the other 2, and a future edit to any one file's wrapper has no consistent pattern to follow.
classification:    major (1) touches >=2 files (standardizing all four .ts wrappers on one shape edits multiple files): FAIL — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (pick one wrapper shape, apply to all four): pass — (6) severity `low`, dimension D4 (not D1): pass — test (1) fails, so classification is `major` regardless of the other five.
effort:            2
dedup:             none
disposition:       major-refactor
proposed_approach: Pick one wrapper shape, apply to all four.
proposed_labels:   area=vscode; PRIO 3; effort 2
issue:             
```

```
id:                P61-D5-001
unit:              RU-61-06
location:          bbj-vscode/test/linking.test.ts:295-450
dimension:         D5
secondary:         [D2]
severity:          medium
evidence_tier:     inherited
evidence:          Per INVENTORY.md's Test & Build Baseline (§"Every failing test"): all 11 tests inside `describe.runIf(isInteropRunning)("Interop related tests", ...)` (test/linking.test.ts:295-450) fail deterministically across repeated `npm test` runs — "All BBj classes extends Object", "Import and declare simple Java class without using FQNs", "Import Java class", "Declare with direct import", "Class definition with direct import in extends", "Class definition with direct import in implements", "Unloaded Java FQN access - test for #6", "Java FQN access - test for #6", "Linked List is resolved", "Resolve nested class in use statement", "Resolve nested class FQN" — each failing with an unresolved-reference error (`NamedElement`, `JavaPackageLike`, etc.) traced to `stderr: "No bbjdir set. No classpath and prefixes loaded."`. Confirmed independently in this sweep: the gate (`shouldRunBBjTests()`, test/test-helper.ts:38-43) defaults to `isPortOpen(5008)`; in this sandbox `isPortOpen(5008)` returns true (a listener answers on :5008), so the `describe.runIf` gate lets the suite run rather than skip — yet the 11 tests still fail, because whatever answers on :5008 is not a real BBj backend with a loaded classpath/bbjdir. This confirms INVENTORY's established fact from the client side: bringing a listener up on port 5008 alone does not fix these failures.
failure_scenario:  Any of the 11 named tests, run against this sandbox's current environment (or any environment without a real `bbjdir`-configured BBj backend behind :5008), fails on an unresolved Java class/package reference rather than passing or being skipped.
classification:    major (1) touches 1 file: n/a — this is an environment/test-infrastructure gap, not a code edit — (2) no public API/grammar/LSP change: n/a — (3) no new dependency: n/a — (4) regression-testable with vitest: n/a, already a vitest suite — (5) reviewer can name the exact edit: n/a, no single code edit fixes an environment dependency — (6) severity `medium`, primary dimension D5 (not D1): the six D-13 tests are built for code-fix findings; this is an environment/infrastructure gap that Phase 66 re-triages rather than a fix this milestone applies, so `classification` is recorded as `major` conservatively (routed for triage, not accepted as an allowlisted known-failure per D-14/D-06).
effort:            8
dedup:             none — no frozen open issue matches; no DEBT-01..06 item names this specific test gap (DEBT-02 covers the 3 disabled parser.test.ts assertions and the TEST-03 completion-test.test.ts skip only, not test/linking.test.ts's "Interop related tests"). Phase 66 should triage this as a new debt item — e.g. a CI-safe mock interop backend that answers with a real classpath, or documenting these as RUN_BBJ_TESTS-gated local-only tests with the current environment behavior (port-open-but-no-bbjdir) called out explicitly.
disposition:       major-refactor
proposed_approach: The approach is the environment work, not a code edit: what has to be reachable is a java-interop peer answering on port 5008 with a loaded classpath and bbjdir, matching what these 11 tests expect; opening a bare listener on that port has already been tried and does not fix them (Phase 64 D-06), because the peer must speak the real protocol and answer with real class data. If a classpath-loaded peer cannot be provisioned in CI/sandbox, the alternative is to make the 11 `test/linking.test.ts > Linking Tests > Interop related tests` cases skip explicitly when the peer is unreachable, rather than run and fail, so the suite reports an honest green instead of a false failure.
proposed_labels:   area=javascript; PRIO 2; effort 8
issue:             
```

```
id:                P61-D5-002
unit:              RU-61-06
location:          bbj-vscode/test/bbj-test-module.ts:108-123
dimension:         D5
secondary:         []
severity:          medium
evidence_tier:     trace
evidence:          Trace: JavaInteropTestService (test/bbj-test-module.ts:47-138), the double every non-"Interop related" unit test in this repo runs against, overrides connect() to always reject (108-110), loadClasspath() to return false (112-114), loadImplicitImports() to return false (116-118), and resolveClassByName() to resolve from a preloaded map or a synthetic stub, never calling the base resolveClass() (120-123). None of the real connection-lifecycle code (P61-D2-001), the Promise.race timeout pattern (P61-D2-002), the fields/methods undefined-guard gap (P61-D2-003), the completeClassIndex reset gap (P61-D2-004), or the global-lock serialization (P61-D3-002) is reachable through this double. The only tests that exercise the real code paths are test/linking.test.ts's "Interop related tests" and the two functional *-real-interop.test.ts files, all gated on a live interop service and, per P61-D5-001, currently failing/environment-blocked.
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): any regression in connection lifecycle, timeout handling, malformed-response handling, or lock serialization in java-interop.ts would pass the full `npm test` suite undetected, because no currently-passing test exercises those code paths.
classification:    major (1) touches 1 file: n/a — closing this gap requires new test infrastructure (a controllable fake socket peer), not a single-file code edit — (2)-(5): n/a for the same reason — (6) severity `medium`, dimension D5: the gap spans multiple defects and needs dedicated test infrastructure, so `classification` is recorded as `major`.
effort:            8
dedup:             none — no frozen open issue addresses java-interop.ts unit-test coverage for its connection/timeout/lock code paths.
disposition:       major-refactor
proposed_approach: This record's own gap is downstream of P61-D5-001: the only tests capable of exercising java-interop.ts's real connection-lifecycle, timeout and lock-serialization code are the same 11 `test/linking.test.ts > Linking Tests > Interop related tests` cases, and they are blocked on the same unreachable-classpath peer on port 5008 — a bare listener on that port, already tried under Phase 64 D-06, does not unblock them either. Independently of whether that peer is ever provisioned, this record's own classification names a second, narrower approach: build a controllable fake socket peer as new test infrastructure so `bbj-vscode/src/language/java-interop.ts`'s connection/timeout/lock code paths can be unit-tested against a scriptable double rather than a live BBj backend.
proposed_labels:   area=javascript; PRIO 2; effort 8
issue:             
```

```
id:                P61-D5-003
unit:              RU-61-01
location:          bbj-vscode/test/parser.test.ts:530-533,811-815,860-864
dimension:         D5
secondary:         [D2]
severity:          medium
evidence_tier:     inherited
evidence:          Trace of the 3 disabled assertions, per the routing table (D-06) item this unit owns: (1) 'Check substring other cases' (test/parser.test.ts:525-534) parses `new String()(1)` and disables `expectNoValidationErrors` at line 533 with the comment "'String' is a Java class that cannot be resolved in EmptyFileSystem test context"; (2) 'Release usage' (lines 805-816) parses a `BBjAPI().getGlobalNamespace().getValue()` / `.release()` chain and disables the same assertion at line 815, noting "the synthetic BBjAPI stub in bbj-api.ts has no methods"; (3) the OutputHandler class-field test (lines 845-865) declares `field protected String[] strings` and `method public String[] createHTML(byte[] bytes)` and disables validation at line 864, noting `String`/`byte` array-typed members need Java classpath resolution. All three are commented-out `expectNoValidationErrors(result)` calls, not `test.skip`, matching INVENTORY's Test & Build Baseline description exactly.
failure_scenario:  Any regression in Java-classpath-dependent validation for these three scenarios — new String() substring validation, BBjAPI() global-namespace method-chain resolution, and String[]/byte[] Java-typed class fields — would pass the full npm test suite undetected, because the only assertions that would catch it are commented out rather than executed.
classification:    major (1) touches 1 file: n/a — this is an environment/test-infrastructure gap (no Java classpath under EmptyFileSystem), not a single code edit — (2)-(5): n/a for the same reason — (6) severity `medium`, primary dimension D5: the six D-13 tests are built for code-fix findings; this is routed for triage per D-14, so `classification` is recorded as `major` conservatively, matching RU-61-06's P61-D5-001 precedent for the same class of environment-dependent gap.
effort:            4
dedup:             DEBT-02 — the owning re-triage requirement (Phase 66): "The 3 disabled parser.test.ts assertions and the skipped TEST-03 case re-triaged — enabled, or documented with the specific blocking limitation and what would unblock them." None of the 15 frozen open issues concern these disabled assertions.
disposition:       major-refactor
proposed_approach: Like P61-D5-001, no single code edit closes this gap because the missing piece is an environment capability, not a defect: the three disabled `expectNoValidationErrors` assertions in `bbj-vscode/test/parser.test.ts` (lines 533, 815, 864) need a Java classpath resolvable under Langium's `EmptyFileSystem` test context, which today only a live, classpath-loaded java-interop peer on port 5008 can supply, and a bare listener on that port (Phase 64 D-06) does not supply one. If that peer cannot be provisioned for the test environment, the alternative is documenting these three assertions as blocked-pending-classpath rather than leaving them silently commented out, so DEBT-02's re-triage has an honest record to close against.
proposed_labels:   area=javascript; PRIO 2; effort 4
issue:             
```

```
id:                P61-D5-010
unit:              RU-61-04
location:          bbj-vscode/test/completion-test.test.ts:185
dimension:         D5
secondary:         [D2]
severity:          medium
evidence_tier:     inherited
evidence:          Confirmed: `test.skip('DEF FN parameters with $ suffix inside class method', ...)` at line 185, with the test's own comment (186-193) recording the root cause: "Completion provider returns 0 items inside class method bodies (even without DEF FN). The Langium DefaultCompletionProvider does not produce grammar-based completions for PRINT statements inside MethodDecl.body... the issue is NOT in the scope chain (scope debug confirmed DEF FN params ARE registered under DefFunction in localSymbols and the container chain IS correct)." The skipped assertion itself (203-213) would check that DEF FN parameters `_f$`/`_t$` appear untruncated in completion results inside a class method body.
failure_scenario:  Any attempt to re-enable the skipped test, as currently written, against the current completion-grammar traversal fails: the completion engine's grammar follower does not produce candidate positions inside class-method statement bodies at all in this scenario, so the expected `_f$`/`_t$` parameter items are never offered — independent of DEF FN or the scope chain, both already ruled out by the recorded root-cause investigation.
classification:    major (1) touches 1 file: FAIL — the grammar-follower limitation is inside Langium's completion engine's traversal of the grammar for MethodDecl.body statement positions, not a single-file BBj-side fix — (2) no public API/grammar/LSP change: FAIL — a real fix likely requires either a grammar restructuring of MethodDecl.body statement completion positions or an upstream Langium completion-provider change — (3)-(5): moot, already failing — (6) severity `medium`, dimension D5: would pass in isolation, but classification is already `major` from tests (1)/(2).
effort:            8
dedup:             DEBT-02 — Phase 66's debt item explicitly covers "the 3 disabled parser.test.ts assertions and the skipped TEST-03 case," matching this finding exactly; re-triage (enable, or document the specific blocking limitation) is DEBT-02's own stated scope. None of the 15 frozen open issues address this Langium completion-grammar-follower limitation.
disposition:       major-refactor
proposed_approach: "Already failing" here means the underlying defect cannot be observed as a green-to-red regression today, because the completion-provider suite in `bbj-vscode/test/completion-test.test.ts` already fails to produce any candidate positions inside `MethodDecl.body` statements — the skipped assertion (lines 203-213) has never passed. The first step for an implementer is not re-enabling this one test but establishing a passing baseline for that suite's `MethodDecl.body` completion-position handling in Langium's grammar traversal itself; only once class-method-body statement positions produce candidates at all does this record's own DEF FN `_f$`/`_t$` parameter-truncation defect become separable from that broader grammar-traversal gap, whether by a grammar restructuring on the BBj side or an upstream Langium completion-provider change.
proposed_labels:   area=javascript; PRIO 2; effort 8
issue:             
```

```
id:                P61-D5-013
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-ws-manager.ts:106-184
dimension:         D5
secondary:         [D3]
severity:          medium
evidence_tier:     inherited
evidence:          Per INVENTORY.md's Test & Build Baseline (§"Flaky suite-level failures"): the `beforeAll` `WorkspaceManager.initializeWorkspace()` hook exceeded vitest's default 10s hookTimeout, hitting `test/functional/chevrotain-tokens.test.ts` and `test/run-call-file-resolution.test.ts` on run 1 and `test/variable-scoping.test.ts` on run 2 — a different suite each time, confirming a load-dependent timing issue rather than one tied to a specific file. Traced by `file:line`: initializeWorkspace() (bbj-ws-manager.ts: 106-184) performs, sequentially and all `await`ed: a directory read plus a file read for project.properties (111-114); a config.bbx lookup, either custom-path (120-121) or bbjdir/cfg (129-132); a Javadoc-folder initialization (153); `javaInterop.loadClasspath()` (172); and `javaInterop.loadImplicitImports()` (177) — the last two are network round-trips to java-interop, each individually capable of costing up to the 10s socket-connect timeout documented at `RU-61-06`'s `java-interop.ts: 127-131`/`P61-D3-002`. None of these independent steps run in parallel despite several having no data dependency on each other (the project.properties/config.bbx reads do not depend on the Javadoc initialization, for instance).
failure_scenario:  Under system-load contention in a sandbox where java-interop is reachable but slow to answer (or genuinely unreachable), the accumulated sequential cost of initializeWorkspace()'s filesystem-plus-network chain pushes whichever test file's `beforeAll` happens to be running past vitest's 10s default hookTimeout, marking that entire suite failed with its tests reported skipped — reproducing exactly the run-to-run variance INVENTORY's baseline recorded (21/21, 1/6, and 29/29 skipped across three separate measurements, each hitting a different suite).
classification:    major (1) touches 1 file: FAIL/n/a — the two candidate remediations named below span different files (a code-level fix confined to bbj-ws-manager.ts, or a test-infrastructure fix confined to vitest.config.ts) and a reviewer cannot commit to one without a triage decision — (2)-(4): n/a for the same reason, this is an environment/brittle-test-setup gap, not a single nameable code edit — (5) reviewer can name the exact edit only as a choice between two approaches, not a single one: reduce the work (parallelize the independent I/O steps via Promise.all, and/or short-circuit classpath/implicit-import loading once java-interop is known unreachable, tying into RU-61-06's P61-D3-002 circuit-breaker recommendation) or configure the timeout (raise vitest's hookTimeout for this specific beforeAll or globally) — (6) severity `medium`, dimension D5 (not D1): passes on its own, but classification is recorded as `major` conservatively (routed for triage, not accepted as an allowlisted known-failure per D-14/D-06), matching how RU-61-06/RU-61-01/ RU-61-03 classified their own routing-table items.
effort:            8
dedup:             none — this is the D-06 routing-table hookTimeout item, not a GitHub issue; no DEBT-01..06 item names it specifically (distinct from DEBT-02's TEST-03/ parser.test.ts scope) — Phase 66 should triage this as a new debt item, mirroring how RU-61-06 handled the routing table's linking.test.ts item (P61-D5-001).
disposition:       major-refactor
proposed_approach: Two options exist and this record does not choose between them: (1) reduce the work — parallelize `initializeWorkspace()`'s independent I/O steps in `bbj-vscode/src/language/bbj-ws-manager.ts:106-184` via `Promise.all` where steps have no data dependency, and short-circuit classpath/implicit-import loading once java-interop is known unreachable, tying into P61-D3-002's circuit-breaker recommendation — trading implementation effort for a lower, more consistent worst-case duration; or (2) accept the work and instead raise vitest's `hookTimeout` for this specific `beforeAll` or globally in `vitest.config.ts`, trading a longer per-run wait for no code change. Choosing between them is the first decision an implementer makes; this record states both rather than picking one, because its own classification records the choice as unresolved.
proposed_labels:   area=vscode; PRIO 2; effort 8
issue:             
```

```
id:                P61-D5-014
unit:              RU-61-05
location:          bbj-vscode/src/language/main.ts:1-190
dimension:         D5
secondary:         [D4]
severity:          medium
evidence_tier:     trace
evidence:          Trace: `grep -rln "from.*'\.\./src/language/main" bbj-vscode/test` returns no matches — no test file anywhere in `test/` imports or exercises `main.ts`. `bbj-notifications.ts`'s own module header independently confirms why: `main.ts` "calls createConnection() at module load time and would break test environments" if imported directly — that comment is the in-repo acknowledgment that main.ts is currently structurally untestable without a refactor.
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a regression in the `bbj/refreshJavaClasses` handler, the `onDidChangeConfiguration` handler, or the startup wiring in main.ts (e.g. a future change to P61-D2-018's settings-refresh gap, or P61-D4-012's duplicated reload sequence) would pass the full `npm test` suite undetected, because no currently-passing test exercises any of main.ts's code paths.
classification:    major (1) touches 1 file: FAIL — testing main.ts's handler logic requires extracting it into an importable, connection-agnostic form first (touching main.ts) before a new test file can exercise it — 2 files — (2)-(4): n/a pending that extraction — (5) reviewer can name the exact edit (extract the `bbj/refreshJavaClasses` and `onDidChangeConfiguration` handler bodies into named, exported functions taking `{shared, BBj, connection}` as parameters, then unit-test those functions directly) — (6) severity `medium`, dimension D5 (not D1): passes on its own, but test (1) already fails, so classification is `major`.
effort:            8
dedup:             none
disposition:       major-refactor
proposed_approach: The classification clause names the edit directly: extract the `bbj/refreshJavaClasses` and `onDidChangeConfiguration` handler bodies out of `bbj-vscode/src/language/main.ts:1-190` into named, exported functions that take `{shared, BBj, connection}` as parameters, so they no longer depend on `main.ts`'s module-load-time `createConnection()` call. Once extracted, a new test file can import and unit-test those functions directly against a synthetic `{shared, BBj, connection}` fixture without triggering the LSP connection wiring that makes `main.ts` itself untestable today.
proposed_labels:   area=vscode; PRIO 2; effort 8
issue:             
```

```
id:                P62-D1-001
unit:              RU-62-04
location:          bbj-vscode/src/msgbox-composer-webview.ts:82-119
dimension:         D1
secondary:         [D2]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace: onDidReceiveMessage(async (msg: { type: string; payload?: Selection }) => {...}, undefined, context.subscriptions) (msgbox-composer-webview.ts:82) types payload only via a compile-time TS interface annotation, with zero runtime check of its shape, field types, or value ranges before it reaches build(msg.payload) (line 99) and, on the 'insert' branch, before build()'s output is written into the user's document via a vscode.WorkspaceEdit (lines 103-111). Identical pattern recurs verbatim in addwindow-composer-webview.ts:108-138 (build() at 119, applyEdit() at 142-161), addchildwindow-composer-webview.ts:113-143 (build() at 124, applyEdit() at 147-167), and setopts-composer-webview.ts:70-108 (toSelection() at 111-121 called via build() at 68, WorkspaceEdit at 86-99).
failure_scenario:  Because none of the four getHtml() strings interpolates any editor-selection/document/config/workspace value (confirmed in the SEC-01/SEC-02 Surface Handoff fact (1) above), there is no path today for attacker-controlled content to reach postMessage with a hostile payload — the gap is a defense-in-depth absence, not a currently exploitable injection. If a future change adds interpolated or externally-sourced webview content, a malicious message could reach build() and, via its output, the user's open document with no server-side check standing between the message and the edit.
classification:    major (1) touches 1 file: n/a — the fix (adding a runtime payload validator) is a repeated single-file edit independently applicable to each of the 4 files — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (a small runtime shape guard per handler, e.g. a type-predicate before build()): pass — (6) severity is `low` but primary dimension is D1: FAIL — test (6) fails on the D1 primary-dimension clause alone, so classification is `major` regardless of the other five tests (D-13's safety gate).
effort:            4
dedup:             none — #475 requests a new SETOPTS tri-state composer UX with IOR/AND-aware codegen, not message-validation hardening on the existing webview boundary; #385 concerns launching an external Graffiti Composer tool, unrelated to this in-tree webview's message handling. Neither open issue overlaps this finding.
disposition:       major-refactor
proposed_approach: A small runtime shape guard per handler, e.g. a type-predicate before build().
proposed_labels:   area=vscode; PRIO 3; effort 4
issue:             
```

```
id:                P62-D1-002
unit:              RU-62-04
location:          bbj-vscode/src/msgbox-composer-webview.ts:366-373
dimension:         D1
secondary:         []
severity:          low
evidence_tier:     repro
evidence:          getNonce() builds a 32-character token by indexing a 62-character alphabet with Math.floor(Math.random() * chars.length) (msgbox-composer-webview.ts: 369-371) — a non-cryptographic PRNG. The result is the sole script-src allowlist value in the emitted CSP (`script-src 'nonce-${nonce}'`, line 127) and is written onto the panel's single inline <script nonce="${nonce}"> tag (line 262). Identical construction, confirmed byte-identical by md5 (2703b8e54057ff248b28ad9ca453c5e7), recurs in addwindow-composer-webview.ts:401-408, addchildwindow-composer-webview.ts: 424-431, and setopts-composer-webview.ts:314-321.
failure_scenario:  A CSP nonce's security property depends on being unguessable per page load; Math.random() is not designed to resist state reconstruction from observed outputs. Because no injection point into the generated HTML exists in these four files today (SEC-01/SEC-02 Surface Handoff fact (1)), there is no current path to exploit a predicted nonce — this is a CSP-hardening gap, not a live vulnerability, and diverges from VS Code's own extension-guidelines recommendation to use a cryptographically strong nonce generator.
classification:    major (1) touches 1 file: n/a — same repeated single-file edit as P62-D1-001 — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (swap Math.random() for node:crypto's randomBytes/randomUUID): pass — (6) severity is `low` but primary dimension is D1: FAIL — test (6) fails on the D1 primary-dimension clause alone, so classification is `major` regardless of the other five tests (D-13's safety gate).
effort:            2
dedup:             none — neither #475 (SETOPTS composer UX) nor #385 (external Graffiti Composer launch) concerns nonce generation or CSP hardening in any of these four files.
disposition:       major-refactor
proposed_approach: Swap Math.random() for node:crypto's randomBytes/randomUUID.
proposed_labels:   area=vscode; PRIO 3; effort 2
issue:             
```

```
id:                P62-D1-003
unit:              RU-62-01
location:          bbj-vscode/src/Commands/Commands.cjs:263,325-328
dimension:         D1
secondary:         [D2, D7]
severity:          critical
evidence_tier:     repro
evidence:          Traced every value that reaches a child_process.exec()-built shell command string in this unit back to its source, without constructing or running an exploit string (redacted per D-09; the trace itself is the evidence). Workspace-settable string configuration -- bbj.classpath (interpolated unquoted at Commands.cjs:263), bbj.configPath (Commands.cjs:261, quoted but unescaped), bbj.web.apps.<file>.name (Commands.cjs:97-99,109, quoted but unescaped), and all 7 string-typed bbj.compiler.* options -- typeChecking.configFile, typeChecking.prefixDirectories, typeChecking.classpath, output.directory, output.extension, diagnostics.errorLog, content.protectPassword -- emitted bare by buildCompileOptions() (CompilerOptions.ts:438-479) and joined with no wrapping quotes at all into the compile command (Commands.cjs:325-328) -- none of these values passes through any shell-escaping function before interpolation, and validateOptions() (CompilerOptions.ts:384-431) checks only presence/dependency/conflict, never content. None of these settings carries a restricted marker or is covered by a capabilities.untrustedWorkspaces declaration in package.json (confirmed absent by grep), so each is settable from a workspace's own committed .vscode/settings.json, applying even in an untrusted workspace. A second, workspace-independent path reaches the identical unescaped interpolation: bbj.runBUI/bbj.runDWC (extension.ts:676,683) fall back to a caller-supplied params.fsPath when no editor is focused, and any command registered via vscode.commands.registerCommand is invocable by any other extension in the same window. extension.ts's EM validate (line 415) and EM login (line 635) exec() calls share the same unquoted/unescaped construction for the bbjHome-derived executable path. All six call sites use child_process.exec(), which always spawns via a shell, rather than an argument-array API (execFile/spawn) immune to this class of defect -- confirmed by reading all six call sites; none imports or calls execFile/spawn anywhere in this unit.
failure_scenario:  A value containing shell metacharacters, reaching child_process.exec() through any of the channels traced above, executes as part of the shell command rather than as inert data -- the general OS command-injection impact (CWE-78): arbitrary command execution with the developer's own OS privileges, triggered by an ordinary, everyday action (Run, Run BUI, Run DWC, or Compile) on a workspace whose settings, or a params object supplied by another extension, the developer does not fully control. No trigger sequence or payload is recorded here per D-09, since the surface is unfixed in a public repository.
classification:    major (1) touches 1 file: FAIL -- the fix spans at least Commands.cjs, extension.ts, and CompilerOptions.ts (a consistent escaping/argument-array strategy needs to reach every call site) -- (2) no public API/grammar/LSP change: pass -- (3) no new dependency: pass (Node's built-in execFile/spawn suffice) -- (4) regression-testable with vitest: pass (assert a value containing shell metacharacters is never passed through unescaped) -- (5) reviewer can name the exact edit: pass (switch to execFile/spawn with an argument array, mirroring IntelliJ's GeneralCommandLine.addParameter approach -- see P62-D7-001) -- (6) severity `critical` and primary dimension is D1: FAIL -- test (6) fails on its own, so classification is `major` regardless of the other five tests (D-13's safety gate).
effort:            8
dedup:             #231 partial-overlap -- #231 requests configurable classpath/command-line settings for starting BBj programs; those settings (bbj.classpath, bbj.compiler.*, bbj.configPath) already exist, and this finding is about their existing unescaped interpolation into child_process.exec(), a security defect #231 does not address. #485 partial-overlap -- #485 requests honoring custom-named/located config files everywhere; this finding's bbj.configPath/-c interpolation touches the same setting but is about injection-safety, not feature completeness. #486 none -- #486 requests live-reload of config.bbx PREFIX/USE changes, unrelated to command-string construction.
disposition:       major-refactor
proposed_approach: (switch to execFile/spawn with an argument array, mirroring IntelliJ's GeneralCommandLine.addParameter approach -- see P62-D7-001).
proposed_labels:   area=vscode; PRIO 1; effort 8
issue:             
```

```
id:                P62-D1-004
unit:              RU-62-01
location:          bbj-vscode/src/extension.ts:415,420,639
dimension:         D1
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          extension.ts:415 builds emValidateCmd with the raw JWT token interpolated directly as a literal command-line argument ("${token}"), passed to child_process.exec() at line 426 -- while the child process runs, the full command line, including the token, is visible in the OS process table to any other process able to enumerate it (ps/Task Manager-style visibility), since exec()'s shell inherits normal process-argument visibility; no non-shell, non-argv channel (e.g. an env var or stdin) is used to pass the secret. The debug-mode log line at extension.ts:420 attempts to mask the token before writing it to the output channel via emValidateCmd.replace(token, '***') -- a literal substring match against the token as it appears inside the already-built command string; because that string is built by the same unescaped interpolation traced in P62-D1-003, a token value containing a double-quote character would not match the pattern the surrounding code assumes it is wrapped in, so the mask could fail to match and the raw token would be written to the output channel when bbj.debug is enabled. The EM login flow's password masking at extension.ts:639 (.replace(`"${password}"`, '"***"')) shares the identical substring-match fragility.
failure_scenario:  Any local process running while the EM validate/login exec() call is in flight -- another process owned by the same user, a monitoring/diagnostic tool, or another account with process-list visibility in a shared environment -- can read the plaintext EM token or password directly from the child process's argument list. Separately, a developer running with bbj.debug: true whose stored token or typed password contains a double-quote would have the unmasked raw secret written into the (extension-visible, sometimes shared-in-bug-reports) Output Channel instead of the intended *** redaction.
classification:    major (1) touches 1 file: pass (extension.ts only) -- (2) no public API change: pass -- (3) no new dependency: pass -- (4) regression-testable with vitest: pass (assert the masking replace matches the constructed string for token/password values containing quote characters) -- (5) reviewer can name the exact edit: pass (switch to execFile/spawn with an argument array so secrets never appear in a shell-interpolated string, and mask by position rather than substring match) -- (6) severity `medium` but primary dimension is D1: FAIL -- test (6) fails on the D1 clause alone, so classification is `major` regardless of the other five tests.
effort:            4
dedup:             none -- none of #231/#485/#486 concern credential/token exposure via process arguments or output-channel logging.
disposition:       major-refactor
proposed_approach: (switch to execFile/spawn with an argument array so secrets never appear in a shell-interpolated string, and mask by position rather than substring match).
proposed_labels:   area=vscode; PRIO 2; effort 4
issue:             
```

```
id:                P62-D1-005
unit:              RU-62-03
location:          bbj-vscode/src/addwindow-composer.ts:195-282, bbj-vscode/src/addchildwindow-composer.ts:117-215, bbj-vscode/src/msgbox-composer.ts:145,162,410
dimension:         D1
secondary:         [D2]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace of every string-typed field these three composers accept. composeAddWindow (addwindow-composer.ts:275-282) builds args = [input.x, input.y, input.width, input.height, input.title, formatHex(input.flags)] and composeAddChildWindow (addchildwindow-composer.ts:208-215) builds args = [input.id, input.x, input.y, input.width, input.height, input.title, formatHex(input.flags), input.context] -- neither file contains any validate-named function or call (confirmed by grep), so x/y/width/height/title/sysgui/receiver/window/id/ context are embedded verbatim with zero structural or type check before the call string is assembled. Neither AddWindowPreview (addwindow-composer.ts: 234-243) nor AddChildWindowPreview (addchildwindow-composer.ts:161-170) carries a valid/error field, and no disabled/invalid gating exists on either composer's Insert button (confirmed by grep across the corresponding webview files). By contrast, in this SAME unit, msgbox-composer.ts's msgboxPreview (lines 392-429) DOES call validateStringField (lines 311-326) on message (line 398) and title (line 399), folding the result into a valid flag (line 420) that gates the webview's Insert button -- yet msgbox-composer.ts's OWN assignTo field (ComposeInput.assignTo, line 145) is used unchecked at composeStatement line 162 (input.assignTo ? `${input.assignTo} = ${call}` : call) and is never folded into msgboxPreview's valid computation, so a malformed assignTo reaches an Insert-enabled statement despite the file's own adjacent validation machinery. Confirmed every affected field's origin is the developer's own webview <input type="text"> (msgbox-composer-webview.ts:219 assignTo; addwindow-composer-webview.ts:255,389 receiver/geometry/title; addchildwindow-composer-webview.ts's equivalent) -- no editor-selection, document-text, config.bbx or workspace-path value reaches these fields today, matching RU-62-04's established SEC-01/SEC-02 fact (1).
failure_scenario:  A value the developer types or pastes into any of x/y/width/height/title/ sysgui/receiver/window/id/context/assignTo that is not a syntactically complete BBj expression -- an unbalanced quote, or text containing a `;` statement separator -- is written into the composed statement exactly as typed, then inserted verbatim into the user's open document via the "new" (non-edit) path already reviewed at RU-62-04, producing a syntactically broken or semantically different statement than the composer's own preview implied, with no warning and (for addwindow/addchildwindow, and for msgbox's assignTo) no disabled Insert button to stop it.
classification:    major (1) touches 1 file: FAIL -- a comprehensive fix touches addwindow-composer.ts, addchildwindow-composer.ts and msgbox-composer.ts at minimum, each with its own Preview interface -- (2) no public API/grammar/LSP change: FAIL -- AddWindowPreview/AddChildWindowPreview would need new valid/error fields mirroring MsgboxPreview's shape, which is the bbj/composer/{addwindow, addchildwindow}/preview LSP response consumed by both the VS Code webview and the IntelliJ ComposerModels.java DTOs -- (3) no new dependency: pass -- (4) regression-testable with vitest: pass -- (5) reviewer can name the exact edit: pass (thread validateStringField-style checks through addwindowPreview/ addchildwindowPreview, and assignTo through msgboxPreview, matching msgbox's own existing pattern) -- (6) severity is `low` but primary dimension is D1: FAIL -- test (6) fails on the D1 primary-dimension clause alone, so classification is `major` regardless of the other five tests (D-13's safety gate).
effort:            8
dedup:             none -- checked against all 15 frozen open issues; #475 requests SETOPTS decode-hover/tri-state composer UX, not input validation on the addWindow/ addChildWindow/msgbox composers; #385 requests launching an external Graffiti Composer tool, unrelated to this in-tree composer's field validation. No other frozen issue names composer input validation.
disposition:       major-refactor
proposed_approach: (thread validateStringField-style checks through addwindowPreview/ addchildwindowPreview, and assignTo through msgboxPreview, matching msgbox's own existing pattern).
proposed_labels:   area=vscode; PRIO 3; effort 8
issue:             
```

```
id:                P62-D1-006
unit:              RU-62-02
location:          bbj-vscode/src/document-formatter.ts:59
dimension:         D1
secondary:         []
severity:          low
evidence_tier:     repro
evidence:          cp.spawn('java', formatFlags) (document-formatter.ts:59) resolves 'java' via argv[0] lookup against the extension host process's PATH, with no absolute-path pinning and no pre-spawn verification that the resolved binary is the intended one. Unlike bbj.home-based commands elsewhere in this phase (Commands.cjs's getBBjHome(), which reads an explicit bbj.home setting), this file exposes no equivalent bbj.javaHome-style setting an administrator could pin. Contrast confirmed against P62-D1-003 (RU-62-01): that finding's six exec() call sites build ONE shell-interpolated command string; this call site uses spawn() with an argument array and no shell:true option anywhere in this file, so no argument here is subject to shell metacharacter reinterpretation — the two findings share no root cause.
failure_scenario:  On a machine where PATH contains an attacker- or misconfiguration-placed 'java' entry ahead of the real JDK/JRE binary (e.g. a compromised or stale dev-tooling directory prepended to PATH), every format request silently runs that binary instead, with formatFlags (including the active document's own path) as its argv. No document/workspace/setting value currently constructs the resolved binary path itself, so this is a hardening gap rather than a currently exploitable injection.
classification:    major (1) touches 1 file: pass — confined to document-formatter.ts — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass (mock cp.spawn to assert the resolved binary path once pinning exists) — (5) reviewer can name the exact edit: pass (add an optional bbj.javaHome setting, defaulting to the current PATH lookup, and prefer it when set) — (6) severity is `low` but primary dimension is D1: FAIL — test (6) fails on the D1 primary-dimension clause alone, so classification is `major` regardless of the other five tests (D-13's safety gate).
effort:            4
dedup:             none — checked against all 15 frozen issues; none requests java-binary pinning or spawn hardening. #65 (support tokenized BBj files) is unrelated — it requests tokenized-file language support, not process-spawn hardening, and is unrelated to the formatter feature.
disposition:       major-refactor
proposed_approach: (add an optional bbj.javaHome setting, defaulting to the current PATH lookup, and prefer it when set).
proposed_labels:   area=vscode; PRIO 3; effort 4
issue:             
```

```
id:                P62-D1-007
unit:              RU-62-02
location:          bbj-vscode/src/decompile-io.ts:15-27,29-35
dimension:         D1
secondary:         []
severity:          low
evidence_tier:     repro
evidence:          isTokenizedFile (decompile-io.ts:15-27) and statSize (decompile-io.ts: 29-35) call fs.promises.open(file, 'r')/fs.promises.stat(file) directly on their file parameter with no realpath resolution, no symlink check, and no regular-file-type check before opening — a directory surfaces only as an EISDIR read failure (caught by the try/catch, returns false/-1, no crash); a symlink is followed transparently to whatever it points at. Both functions trust their caller entirely for path containment. Traced both call sites, Commands.cjs:179,382 (RU-62-01's territory): decompileInPlace passes the already-open document's own resolved path; decompileReadonly passes a path inside a freshly created fs.mkdtempSync() temp directory — neither is currently attacker- or workspace-setting-influenced.
failure_scenario:  If a future caller ever passes a webview-message-derived or workspace-setting-derived path to isTokenizedFile/statSize without its own containment check, a symlink escaping the workspace or a device node could be opened; today no such caller exists, so this is a defense-in-depth absence, not a currently exploitable defect.
classification:    major (1) touches 1 file: pass — confined to decompile-io.ts — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass (Node's built-in fs.realpath/fs.lstat suffice) — (4) regression-testable with vitest: pass (extend decompile-io.test.ts with a symlink/directory fixture) — (5) reviewer can name the exact edit: pass (fs.lstat the resolved path first and reject non-regular files) — (6) severity is `low` but primary dimension is D1: FAIL — test (6) fails on the D1 primary-dimension clause alone, so classification is `major` regardless of the other five tests (D-13's safety gate).
effort:            2
dedup:             none — #65 requests the tokenized-file feature itself, which this exact file already implements; this finding is a defense-in-depth hardening gap inside that implementation, not the feature request, so it does not overlap #65. No other frozen issue concerns file-path containment here.
disposition:       major-refactor
proposed_approach: (fs.lstat the resolved path first and reject non-regular files).
proposed_labels:   area=vscode; PRIO 3; effort 2
issue:             
```

```
id:                P62-D2-001
unit:              RU-62-04
location:          bbj-vscode/src/msgbox-composer-webview.ts:82,112,116
dimension:         D2
secondary:         [D3]
severity:          medium
evidence_tier:     repro
evidence:          panel.webview.onDidReceiveMessage(handler, undefined, context.subscriptions) (msgbox-composer-webview.ts:82) registers the message-handler Disposable on the extension's own context.subscriptions array — drained only on extension deactivation — rather than on a per-panel disposable scope. None of the four files calls panel.onDidDispose(...) anywhere (confirmed: zero matches for "onDidDispose" across all four files via grep). So whether panel.dispose() runs from the 'insert' success path (line 112), the 'cancel' path (line 116), or the user closing the panel's tab natively (VS Code disposes the panel and webview but does not touch entries the extension itself pushed onto context.subscriptions), the message-handler closure — holding context, insertUri, insertPosition, target/arg, and the imported build/preview functions — remains registered and reachable for the rest of the session. Identical pattern at addwindow-composer-webview.ts:108,131,135; addchildwindow-composer-webview.ts:113,136,140; setopts-composer-webview.ts:70,101,105.
failure_scenario:  Opening and closing any of the four composers N times over a VS Code session accumulates N leaked closures on context.subscriptions with no bound; each holds a reference to a now-disposed vscode.WebviewPanel and, in EDIT mode, a captured document Uri/position. Session-scoped memory growth, worse for developers who use the Code-Action-driven edit flow (`Edit MSGBOX` / `Edit addWindow flags` / `Edit addChildWindow flags` / `Edit SETOPTS`) repeatedly against the same or different files in one session.
classification:    major (1) touches 1 file: FAIL — the identical pattern recurs in all 4 files, and a comprehensive fix (add panel.onDidDispose(() => {...}, undefined, context.subscriptions) or scope the message-listener disposable to the panel itself) needs to touch all 4, so test (1) fails on its own — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass (assert context.subscriptions length is unchanged after open+dispose, or that onDidDispose was registered) — (5) reviewer can name the exact edit: pass — (6) severity is `medium` and dimension is D2 (not D1): pass — test (1) alone already fails, so classification is `major` per D-13 ("failing any one test makes it major").
effort:            4
dedup:             none — neither #475 nor #385 concerns webview panel lifecycle or subscription management; no other frozen open issue names composer resource disposal.
disposition:       major-refactor
proposed_approach: The identical pattern recurs in all 4 files, and a comprehensive fix (add panel.onDidDispose(() => {...}, undefined, context.subscriptions) or scope the message-listener disposable to the panel itself) needs to touch all 4, so test (1) fails on its own.
proposed_labels:   area=vscode; PRIO 2; effort 4
issue:             
```

```
id:                P62-D2-002
unit:              RU-62-01
location:          bbj-vscode/src/Commands/Commands.cjs:250,94,147,299
dimension:         D2
secondary:         [D4]
severity:          medium
evidence_tier:     repro
evidence:          run(params) (Commands.cjs:250), runWeb(params, client, credentials) (Commands.cjs:94, reached via runBUI/runDWC), decompile(params, options) (Commands.cjs:147, reached via denumber), and compile(params) (Commands.cjs:299) all compute `const fileName = active ? active.document.fileName : params.fsPath;` with no check that params itself is defined. bbj.run/bbj.runBUI/bbj.runDWC/bbj.compile/bbj.denumber are registered as global VS Code keybindings (package.json contributes.keybindings: alt+g/alt+b/alt+d/ alt+c/alt+n) with no when clause restricting them to a focused BBj editor, and none of the five is excluded from the Command Palette via a commandPalette when entry (confirmed: grep -c commandPalette bbj-vscode/package.json -> 0) -- both invocation paths deliver params === undefined. When vscode.window.activeTextEditor is also undefined (focus in the Explorer/Search sidebar, an empty window, or a non-text panel), params.fsPath throws TypeError: Cannot read properties of undefined. Confirmed by contrast within the same file: resolveTargetFileName(params) (Commands.cjs:135-141), used only by decompileReplace/decompileReadonly, correctly guards with `if (params && params.fsPath)` before falling back to active -- the safe pattern already exists here and simply was not applied to the other four entry points.
failure_scenario:  Pressing Alt+G/Alt+B/Alt+D/Alt+C/Alt+N (or invoking the corresponding Command Palette entry) while no text editor has focus throws inside the command handler instead of showing a graceful 'no active BBj file' message.
classification:    major (1) touches 1 file: FAIL -- the identical unguarded pattern recurs in 4 separate functions, and a comprehensive fix needs to touch all 4 -- (2) no public API change: pass -- (3) no new dependency: pass -- (4) regression-testable with vitest: pass (call each function with params: undefined and no active editor stub) -- (5) reviewer can name the exact edit: pass (apply resolveTargetFileName's existing guard to the other four) -- (6) severity `medium`, dimension D2 (not D1): pass -- test (1) alone already fails, so classification is `major` per D-13.
effort:            2
dedup:             none -- none of #231/#485/#486 concern command invocation without a focused editor.
disposition:       major-refactor
proposed_approach: (apply resolveTargetFileName's existing guard to the other four).
proposed_labels:   area=vscode; PRIO 2; effort 2
issue:             
```

```
id:                P62-D2-003
unit:              RU-62-01
location:          bbj-vscode/src/extension.ts:592-707
dimension:         D2
secondary:         [D4]
severity:          medium
evidence_tier:     repro
evidence:          None of the 14 vscode.commands.registerCommand(...) calls in activate() (extension.ts:592-707: bbj.config, bbj.properties, bbj.em, bbj.loginEM, bbj.run, bbj.runBUI, bbj.runDWC, bbj.compile, bbj.denumber, bbj.decompile, bbj.decompileReadonly, bbj.configureCompileOptions, bbj.refreshJavaClasses, bbj.showClasspathEntries), the registerDocumentFormattingEditProvider call (line 748), or the client.onNotification call (line 822) captures or pushes its returned Disposable onto context.subscriptions -- confirmed by reading every call site in activate(). By contrast, msgbox-composer-ui.ts:27-28, addwindow-composer-ui.ts:18, addchildwindow-composer-ui.ts:19, and setopts-composer-ui.ts:19 (registered from extension.ts:584-587) correctly wrap their registerCommand calls in context.subscriptions.push(...), and extension.ts itself uses the same push pattern correctly for its status-bar items, file watcher, and listeners (lines 756,771,783,805,808,819,858) -- the safe pattern is established elsewhere in this same file and simply wasn't applied to these 16 registrations.
failure_scenario:  VS Code's documented contract for registerCommand requires the caller to dispose the returned handle; registering the same command ID twice without disposing the first throws Error: command 'X' already exists. Because none of these 16 registrations is disposed, and deactivate() (extension.ts:833-837) only calls client.stop(), a second activate() call within the same extension-host process -- triggered by certain workspace-trust transitions, or by a test harness that activates the extension repeatedly -- throws on every one of the 16 registrations.
classification:    major (1) touches 1 file: pass -- (2) no public API change: pass -- (3) no new dependency: pass -- (4) regression-testable with the existing harness: FAIL -- asserting activation/re-activation and disposal behavior needs a VS Code extension-host or vscode-module mock that this unit's test suite does not currently have (P62-D5-002: extension.ts has zero existing test coverage), so this is new test infrastructure, not a fit into the existing harness -- (5) reviewer can name the exact edit: pass (wrap each registration in context.subscriptions.push(...)) -- (6) severity `medium`, dimension D2 (not D1): pass -- test (4) alone already fails, so classification is `major` per D-13.
effort:            4
dedup:             none -- none of #231/#485/#486 concern command disposal or registration lifecycle.
disposition:       major-refactor
proposed_approach: (wrap each registration in context.subscriptions.push(...)).
proposed_labels:   area=vscode; PRIO 2; effort 4
issue:             
```

```
id:                P62-D2-005
unit:              RU-62-03
location:          bbj-vscode/src/msgbox-composer-ui.ts:87-133
dimension:         D2
secondary:         [D1]
severity:          medium
evidence_tier:     repro
evidence:          runComposer (msgbox-composer-ui.ts:87-133) is the bare (non-visual) bbj.composeMsgbox command handler, retained alongside the visual bbj.composeMsgboxVisual webview path (both registered at lines 25-35). For the arg?.edit branch (lines 100-104) it builds new vscode.Range(line, exprRange[0], line, exprRange[1]) from the numeric expr token's coordinates captured by MsgboxCodeActionProvider (lines 37-79, info.exprRange) at the moment the Code Action was computed, then applies editor.edit(...) using those coordinates directly -- no re-fetch of the line's current text, no re-check that the token at that position still matches what was decoded. Between the Code Action being computed and the edit being applied, runComposer runs runWizard(initial) (line 94, defined 136-160) -- four sequential awaited showQuickPick/createQuickPick steps (icon, buttonSet, defaultButton, flags), each an unbounded wait on user interaction. The arg?.insert branch (lines 105-108) applies the identical pattern to arg.insert.character, a raw offset captured at the same Code-Action-computation moment. Unlike RU-62-04's webview panels, whose onDidReceiveMessage only fires in direct response to a still-live webview, this bare-command path runs entirely inside the extension host with no comparable natural cutoff on how long the captured coordinates can go stale.
failure_scenario:  If the user edits the same document (adds/removes lines above the target line, or edits the target line itself) at any point during the multi-step QuickPick wizard, the previously captured line/exprRange/character coordinates no longer correspond to the same content when editor.edit(...) finally runs -- the edit can silently replace or insert into the wrong location, corrupting text unrelated to the MSGBOX call the user originally invoked the composer on, with no error surfaced to the user.
classification:    major (1) touches 1 file: pass -- the fix is contained to msgbox-composer-ui.ts (re-resolve the call at the captured line immediately before applying the edit) -- (2) no public API/grammar/LSP change: pass -- (3) no new dependency: pass -- (4) regression-testable with the existing harness: FAIL -- no test file currently imports msgbox-composer-ui.ts or any -ui.ts file in this unit (confirmed by grep, see P62-D5-003), and this file's vscode.window/ vscode.commands surface has no existing mock harness in this test suite to extend without first building one -- (5) reviewer can name the exact edit: pass -- (6) severity is `medium` and primary dimension is D2 (not D1): pass -- test (4) alone already fails, so classification is `major` per D-13 ("failing any one test makes it major").
effort:            4
dedup:             none -- no frozen open issue names composer edit-position staleness or race conditions.
disposition:       major-refactor
proposed_approach: The fix is contained to msgbox-composer-ui.ts (re-resolve the call at the captured line immediately before applying the edit).
proposed_labels:   area=vscode; PRIO 2; effort 4
issue:             
```

```
id:                P62-D4-001
unit:              RU-62-04
location:          bbj-vscode/src/msgbox-composer-webview.ts:366-373 (getNonce), msgbox-composer-webview.ts:124-128 (CSP array)
dimension:         D4
secondary:         []
severity:          medium
evidence_tier:     trace
evidence:          Mechanical structural diff (D-12): getNonce() is byte-identical across all four *-composer-webview.ts files (md5 2703b8e54057ff248b28ad9ca453c5e7 at msgbox-composer-webview.ts:366-373, addwindow-composer-webview.ts:401-408, addchildwindow-composer-webview.ts:424-431, setopts-composer-webview.ts: 314-321 — 4x8 = 32 duplicated lines) and the 5-line CSP-array construction is likewise byte-identical (md5 308a7d4ffd99b94d598341ca988dd267 at msgbox-composer-webview.ts:124-128 and the equivalent block in the other three — 4x5 = 20 duplicated lines); neither is factored into a shared helper. `git diff --no-index --numstat` pairwise: addwindow<->msgbox "191 226" (of 408/373 lines), addchildwindow<->msgbox "189 247" (of 431/373), addchildwindow <->addwindow "84 107" (of 431/408 — ~80% structural overlap, the closest pair, reflecting their shared flags/event-mask/schematic design). Asymmetric-baseline qualifier (D-15): setopts-composer-webview.ts has no `-composer.ts` sibling of its own — its codegen lives in `setopts-catalog.ts`, which belongs to `RU-62-03`, not this unit — so setopts diffs more heavily against the other three *-webview.ts files here (setopts<->msgbox "237 185", setopts<->addwindow "254 167", setopts<->addchildwindow "276 166", of 321 lines), consistent with its structurally different per-byte-catalog UI; this is stated as a qualifier on this cell, not normalized away and not a 41st row.
failure_scenario:  n/a (D4 is a code-shape finding, not a runtime failure scenario) — the duplication is a maintainability cost: a future CSP/nonce hardening fix (e.g. P62-D1-002's remediation) must currently be applied identically in 4 places with no shared source of truth, and the ~80% overlap between addwindow and addchildwindow means most future flag/event-mask UI changes need a matching edit in both files by hand, with drift risk between them.
classification:    major (1) touches 1 file: FAIL — extracting a shared `webview-security.ts` helper for getNonce()/CSP-array construction necessarily touches all 4 call sites — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit: pass — (6) severity `medium`, dimension D4 (not D1): pass — test (1) alone fails, so classification is `major` per D-13.
effort:            4
dedup:             none — neither #475 nor #385 concerns code duplication between the four generator files. RU-62-03's own D4 cell (logic/UI-layer duplication, a separate 3x`-composer.ts`x4x`-ui.ts` comparison) cross-references this finding rather than restating it (D-12) — see plan 62-03.
disposition:       major-refactor
proposed_approach: Extracting a shared `webview-security.ts` helper for getNonce()/CSP-array construction necessarily touches all 4 call sites.
proposed_labels:   area=vscode; PRIO 2; effort 4
issue:             
```

```
id:                P62-D4-002
unit:              RU-62-01
location:          bbj-vscode/src/extension.ts:582-830
dimension:         D4
secondary:         []
severity:          medium
evidence_tier:     trace
evidence:          activate() (extension.ts:582-830, ~250 lines) registers at least 9 distinct concerns in one function body without delegating most of them to named helpers: 4 composer subsystems (registerMsgboxComposer et al., lines 584-587), the language client (line 589), 14 commands (lines 592-707) -- several with substantial business logic embedded directly as anonymous handlers rather than extracted, most notably the ~75-line EM-login credential-prompt-plus-exec() flow (lines 597-672) -- a document-formatting-provider registration (lines 748-751), 2 file-open-detection features with their own tab/editor listeners (lines 756-775), and 2 status-bar indicators with their own notification listeners (lines 777-828). By contrast, every one of Commands.cjs's command implementations is a discrete, separately named Commands.X function. Mechanical structural diff (D-12) of extension.ts's two independent Promise-wrapped-exec blocks: git diff --no-index --numstat between the EM-validate block (lines 412-442, 31 lines) and the EM-login block (lines 630-664, 35 lines) reports `27 23` -- 23 of ~31-35 lines share the same shape (build tmp-file path, build cmd string, debug-log, new Promise<string> wrapping require('child_process').exec with a try/finally-unlink) -- confirming substantial in-file duplication; neither block reuses Commands.cjs's own execWithProgress helper (lines 29-41), which independently wraps the identical exec-to-Promise pattern a third way, so the same operation is implemented three separate times across the unit with no shared helper. Checked for dead code as a related maintainability cost: getEMCredentials()'s fallback to secretStorage?.get('bbj.em.credentials') (extension.ts:387-389) is unreachable -- confirmed by grep, nothing in the codebase ever writes that key, only bbj.em.token is ever stored (extension.ts:667); runWeb()'s legacy else branch reading bbj.web.username/bbj.web.password (Commands.cjs:85-90) is likewise unreachable today, since both current call sites (bbj.runBUI/bbj.runDWC) always pass a truthy credentials object.
failure_scenario:  n/a (D4 is a code-shape finding, not a runtime failure scenario) -- the god-function shape and the triplicated exec-wrapping pattern mean a future fix to any one of them (e.g. P62-D1-003's escaping fix, or P62-D2-004's rejection handling) has to be located and re-applied independently in up to 3 places, with drift risk between them; the two dead-code branches are maintenance debt that misleads a reader into thinking a credential-storage fallback path is live when it is not.
classification:    major (1) touches 1 file: pass (extension.ts; the dead Commands.cjs branch is a one-line deletion noted alongside, not counted against this test) -- (2) no public API/grammar/LSP change: pass -- (3) no new dependency: pass -- (4) regression-testable with the existing harness: FAIL -- extracting activate()'s inline handlers into named, independently testable functions is exactly the kind of refactor extension.ts's current zero test coverage (P62-D5-002) cannot verify without first adding the missing test infrastructure -- (5) reviewer can name the exact edit: pass (extract the EM-login handler and the exec-wrapping pattern into shared, named helpers; delete the two dead-code branches) -- (6) severity `medium`, dimension D4 (not D1): pass -- test (4) alone already fails, so classification is `major` per D-13.
effort:            8
dedup:             none -- none of #231/#485/#486 concern activate()'s structure, exec-wrapper duplication, or dead credential-fallback code.
disposition:       major-refactor
proposed_approach: (extract the EM-login handler and the exec-wrapping pattern into shared, named helpers; delete the two dead-code branches).
proposed_labels:   area=vscode; PRIO 2; effort 8
issue:             
```

```
id:                P62-D4-003
unit:              RU-62-01
location:          bbj-vscode/src/Commands/CompilerOptions.ts:65-282
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          COMPILER_OPTIONS's 20 entries (CompilerOptions.ts:65-282, configKey: values at lines 69,79,90,102,114,126,136,146,156,166,178,188,199,210,220,232,242,252, 264,274) each declares a label/description/defaultValue that duplicates a hand-written twin in package.json's 20 matching bbj.compiler.* configuration properties (lines 412-553, e.g. bbj.compiler.typeChecking.enabled at line 412 vs. configKey: 'typeChecking.enabled' at line 69, both independently stating default: false / "Enable static type checking (-t)" and description: "Enable static type checking"). No code-generation step, shared JSON source, or test asserts the two stay in sync -- confirmed by reading both declarations end to end and finding no cross-reference between them beyond the shared string key.
failure_scenario:  n/a (D4 code-shape finding) -- adding, removing, or changing a compiler option's default/description requires a matching hand-edit in both files; missing one desyncs the configureCompileOptions() QuickPick UI (built from CompilerOptions.ts) from what a developer sees in VS Code's Settings UI (built from package.json's schema) or from what raw settings.json editing actually accepts, with nothing currently catching the drift.
classification:    major (1) touches 1 file: FAIL -- resolving the duplication (e.g. generating one from the other, or a shared JSON source both read) necessarily touches both package.json and CompilerOptions.ts -- (2) no public API/grammar/LSP change: pass -- (3) no new dependency: pass -- (4) regression-testable with vitest: pass (a test can assert every COMPILER_OPTIONS configKey has a matching bbj.compiler.* entry with the same default) -- (5) reviewer can name the exact edit: pass -- (6) severity `low`, dimension D4 (not D1): pass -- test (1) alone already fails, so classification is `major` per D-13.
effort:            4
dedup:             none -- none of #231/#485/#486 concern compiler-option metadata duplication between CompilerOptions.ts and package.json.
disposition:       major-refactor
proposed_approach: Resolving the duplication (e.g. generating one from the other, or a shared JSON source both read) necessarily touches both package.json and CompilerOptions.ts.
proposed_labels:   area=vscode; PRIO 3; effort 4
issue:             
```

```
id:                P62-D4-004
unit:              RU-62-03
location:          bbj-vscode/src/msgbox-composer.ts:470-498,546-550, bbj-vscode/src/addwindow-composer.ts:320-341,401-405, bbj-vscode/src/addchildwindow-composer.ts:301-305, bbj-vscode/src/addwindow-composer-ui.ts, bbj-vscode/src/addchildwindow-composer-ui.ts
dimension:         D4
secondary:         []
severity:          medium
evidence_tier:     trace
evidence:          Mechanical structural diff (D-12), applying the D-15-confirmed asymmetric baseline (the -composer.ts comparison set is msgbox-composer.ts/ addwindow-composer.ts/addchildwindow-composer.ts -- 3 files, not 4; setopts-catalog.ts is SETOPTS's logic-layer counterpart, not a 4th -composer.ts row). Method 1: normalized-identifier md5 on the three files' findXCallAt entry points (findMsgboxCallAt msgbox-composer.ts:546-550, findAddWindowCallAt addwindow-composer.ts:401-405, findAddChildWindowCallAt addchildwindow-composer.ts:301-305) -- after stripping each function's own type-name token, all three 5-line bodies hash identically (md5 fa0e6220a97209e901f96f5a6c745b52), 15 duplicated lines, no shared helper. Method 2: diff on the top-level-argument scanner -- msgbox-composer.ts's private unexported scanArgs (lines 470-498) is algorithmically identical to addwindow-composer.ts's exported scanArgs (lines 320-341, already reused by addchildwindow-composer.ts via `import { scanArgs, trimmedRange } from './addwindow-composer.js'`, lines 16-19) -- diff on the two bodies shows only whitespace/statement-grouping style differences, zero control-flow differences. Method 3: `git diff --no-index --numstat` pairwise: msgbox<->addwindow "306 451" (of 550/405 lines), msgbox<->addchildwindow "243 485" (of 550/308), addwindow<->addchildwindow "140 237" (of 405/308, the closest pair). On the -ui.ts quartet: addwindow-composer-ui.ts<->addchildwindow-composer-ui.ts numstat "26 22" (of 68/72 lines, by far the closest pair) -- both independently define a byte-identical-shaped titleArg() helper (differing only in the fallback literal '"Window"' vs '"Child"') and the same XCodeActionProvider/registerXComposer contract, where msgbox-composer-ui.ts (193 lines) and setopts-composer-ui.ts (96 lines) diff far more heavily (numstat 48-168 lines) against every other file in the quartet. This is the logic/UI-layer half of the composer duplication D-12 allocates across two units -- see RU-62-04's P62-D4-001 for the generator-layer half (the four *-composer-webview.ts files' getNonce()/CSP duplication); the two halves are counted once each and this record does not restate P62-D4-001's evidence.
failure_scenario:  n/a -- D4 is a code-shape finding, not a runtime failure scenario; the maintainability cost is that a future fix to the shared findXCallAt/scanArgs algorithm must currently be applied by hand in three (effectively four, counting the private msgbox copy) separate places with no shared source of truth, and the addwindow/addchildwindow -ui.ts near-duplication means most future Code-Action UX changes need a matching hand-edit in both files.
classification:    major (1) touches 1 file: FAIL -- extracting a shared call-locator/scanner helper, or a shared UI registration helper, necessarily touches at least 3 (composer.ts) or 2 (ui.ts) files at once -- (2) no public API/grammar/LSP change: pass -- (3) no new dependency: pass -- (4) regression-testable with vitest: pass (existing per-file test suites already assert each function's current behavior; a refactor extracting a shared helper is covered by the same tests) -- (5) reviewer can name the exact edit: pass -- (6) severity `medium`, dimension D4 (not D1): pass -- test (1) alone fails, so classification is `major` per D-13.
effort:            4
dedup:             none -- neither #475 nor #385 concerns code duplication within the composer logic/UI layer. Cross-references RU-62-04's P62-D4-001 (the generator-layer half of the same D-12 duplication callout) by ID rather than restating its evidence.
disposition:       major-refactor
proposed_approach: Extracting a shared call-locator/scanner helper, or a shared UI registration helper, necessarily touches at least 3 (composer.ts) or 2 (ui.ts) files at once.
proposed_labels:   area=vscode; PRIO 2; effort 4
issue:             
```

```
id:                P62-D5-001
unit:              RU-62-04
location:          bbj-vscode/test/ (absence) — the 4 files this finding covers are bbj-vscode/src/msgbox-composer-webview.ts, addwindow-composer-webview.ts, addchildwindow-composer-webview.ts, setopts-composer-webview.ts
dimension:         D5
secondary:         []
severity:          low
evidence_tier:     inherited
evidence:          Established by enumeration: `ls bbj-vscode/test/ | grep -i compos` -> addchildwindow-composer.test.ts, addwindow-composer.test.ts, composer-commands.test.ts, msgbox-composer.test.ts; `ls bbj-vscode/test/ | grep -i setopt` -> setopts-catalog.test.ts; `grep -rl 'webview\|Webview' bbj-vscode/test/` and `grep -rl 'createWebviewPanel\|composer-webview' bbj-vscode/test/` both return nothing. All five existing composer test files exercise only RU-62-03's pure logic layer and the LS-side composer-commands.ts handlers — none imports or invokes any of the four *-composer-webview.ts files. Concretely untested: getHtml()'s CSP/nonce construction (all 4 files), every onDidReceiveMessage handler's message-to-WorkspaceEdit path (all 4 files), and the P62-D2-001 disposal/subscription-lifecycle gap — no test would catch a regression of any of these.
failure_scenario:  A regression in any of P62-D1-001/002's redaction (message validation, nonce strength) or P62-D2-001's dispose lifecycle would ship silently — `npm test` is green today with zero webview-layer assertions, so FIX-03's "npm test clean" gate cannot detect a future regression in this surface.
classification:    major (1) touches 1 file: FAIL — comprehensive resolution requires a new test file per generator (or per shared concern), touching more than 1 file — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: n/a (this finding *is* the missing-test gap) — (5) reviewer can name the exact edit: pass (author `*-composer-webview.test.ts` per generator using a minimal vscode-API mock) — (6) severity `low`, dimension D5 (not D1): pass — test (1) alone fails, so classification is `major` per D-13.
effort:            8
dedup:             none — neither #475 nor #385 concerns test coverage for the webview generator files; no other frozen open issue names composer test gaps.
disposition:       major-refactor
proposed_approach: (author `*-composer-webview.test.ts` per generator using a minimal vscode-API mock).
proposed_labels:   area=javascript; PRIO 3; effort 8
issue:             
```

```
id:                P62-D5-002
unit:              RU-62-01
location:          bbj-vscode/test/ (absence) -- the 2 files this finding covers are bbj-vscode/src/extension.ts and bbj-vscode/src/Commands/Commands.cjs
dimension:         D5
secondary:         []
severity:          medium
evidence_tier:     inherited
evidence:          Established by enumeration: `ls bbj-vscode/test/ | grep -iE 'extension|command|compiler'` -> compiler-options.test.ts only; `grep -rl "extension\.ts\|from '\.\./src/extension'" bbj-vscode/test/` and `grep -rl 'Commands\.cjs\|Commands/Commands' bbj-vscode/test/` both return nothing. compiler-options.test.ts (511 lines, ~45 cases) thoroughly covers CompilerOptions.ts's pure logic, but no test imports or exercises extension.ts (activation, all 14 command registrations, EM login/validate) or Commands.cjs (every exec()-invoking command: run, runWeb, compile, decompile*).
failure_scenario:  A regression in any of this section's findings -- the unescaped shell interpolation (P62-D1-003), the argv-exposed EM token (P62-D1-004), the unguarded params.fsPath crash (P62-D2-002), the leaked command-registration disposables (P62-D2-003), the unhandled client.start() rejection (P62-D2-004), or the process-spawning safety gap relative to IntelliJ (P62-D7-001) -- would ship silently: npm test is green today with zero assertions covering either file, so FIX-03's 'npm test clean' gate cannot detect a future regression in any of them.
classification:    major (1) touches 1 file: FAIL -- comprehensive resolution requires new test files for both extension.ts and Commands.cjs (or a shared vscode-API mock harness both can use), touching more than 1 file -- (2) no public API/grammar/LSP change: pass -- (3) no new dependency: pass -- (4) regression-testable with existing harness: n/a (this finding *is* the missing-test gap) -- (5) reviewer can name the exact edit: pass (author extension.test.ts and commands.test.ts using a minimal vscode API mock, following whatever pattern the composer-webview D5 gap in RU-62-04 ultimately adopts) -- (6) severity `medium`, dimension D5 (not D1): pass -- test (1) alone already fails, so classification is `major` per D-13.
effort:            8
dedup:             none -- none of #231/#485/#486 concern test coverage for extension.ts or Commands.cjs.
disposition:       major-refactor
proposed_approach: (author extension.test.ts and commands.test.ts using a minimal vscode API mock, following whatever pattern the composer-webview D5 gap in RU-62-04 ultimately adopts).
proposed_labels:   area=javascript; PRIO 2; effort 8
issue:             
```

```
id:                P62-D5-003
unit:              RU-62-03
location:          bbj-vscode/src/msgbox-composer-ui.ts (193, absence), bbj-vscode/src/addwindow-composer-ui.ts (68, absence), bbj-vscode/src/addchildwindow-composer-ui.ts (72, absence), bbj-vscode/src/setopts-composer-ui.ts (96, absence)
dimension:         D5
secondary:         []
severity:          low
evidence_tier:     inherited
evidence:          Established by enumeration, not assumption: `ls bbj-vscode/test/ | grep -iE 'composer|setopt'` -> five files (addchildwindow-composer.test.ts, addwindow-composer.test.ts, composer-commands.test.ts, msgbox-composer.test.ts, setopts-catalog.test.ts), all importing only the *-composer.ts/ setopts-catalog.ts/LS composer-commands.ts modules (confirmed by each file's own import lines); `grep -rl 'composer-ui\|msgbox-composer-ui\| addwindow-composer-ui\|addchildwindow-composer-ui\|setopts-composer-ui' bbj-vscode/test/` returns nothing. So the four -ui.ts files in this unit -- msgbox-composer-ui.ts (193 lines: MsgboxCodeActionProvider, the bare runComposer/runWizard command flow, registerMsgboxComposer), addwindow-composer-ui.ts (68 lines: AddWindowCodeActionProvider, registerAddWindowComposer, titleArg), addchildwindow-composer-ui.ts (72 lines: the equivalent for addChildWindow), and setopts-composer-ui.ts (96 lines: SetOptsCodeActionProvider, SetOptsCodeLensProvider, registerSetOptsComposer) -- have zero test coverage, 429 combined lines with no test importing any of them. `npx vitest run test/msgbox-composer.test.ts test/addwindow-composer.test.ts test/addchildwindow-composer.test.ts test/setopts-catalog.test.ts test/composer-commands.test.ts` confirms the pure-logic layer this quartet wraps is well tested (100/100 passing), which sharpens rather than excuses the gap: the untested 429 lines are precisely the command-registration/ Code-Action/CodeLens wiring, including both P62-D1-005's unvalidated-field composition paths and P62-D2-005's stale-edit-range hazard -- both entirely inside this untested quartet.
failure_scenario:  A regression in either P62-D1-005's (currently absent) field validation or P62-D2-005's edit-position staleness would ship silently -- npm test is green today (100/100 in this unit's own test files) with zero assertions against any -ui.ts file, so neither finding, nor any future regression in the same four files, would be caught by the existing suite.
classification:    major (1) touches 1 file: FAIL -- comprehensive resolution requires a new test file per -ui.ts module (or a shared vscode-mock harness covering all four), touching more than 1 file -- (2) no public API/grammar/LSP change: pass -- (3) no new dependency: pass -- (4) regression-testable with existing harness: n/a -- this finding *is* the missing-test gap, and no existing test in this repository mocks vscode.window.showQuickPick/createQuickPick/ registerCodeActionsProvider/registerCodeLensProvider for reuse here -- (5) reviewer can name the exact edit: pass (author a *-composer-ui.test.ts per file using a minimal vscode-API mock, mirroring the gap and remediation shape already recorded for the webview layer at RU-62-04's P62-D5-001) -- (6) severity `low`, dimension D5 (not D1): pass -- test (1) alone fails, so classification is `major` per D-13.
effort:            8
dedup:             none -- neither #475 nor #385 concerns test coverage for the composer UI-wiring files; no DEBT-* requirement names this gap.
disposition:       major-refactor
proposed_approach: (author a *-composer-ui.test.ts per file using a minimal vscode-API mock, mirroring the gap and remediation shape already recorded for the webview layer at RU-62-04's P62-D5-001).
proposed_labels:   area=vscode; PRIO 3; effort 8
issue:             
```

```
id:                P62-D5-005
unit:              RU-62-05
location:          bbj-vscode/test/ (absence) — the 2 files this finding covers are bbj-vscode/bbj-language-configuration.json, bbj-vscode/bbx-language-configuration.json
dimension:         D5
secondary:         []
severity:          low
evidence_tier:     inherited
evidence:          `grep -rl "language-configuration\|onEnterRules\|autoClosingPairs\|wordPattern" bbj-vscode/test/` returns nothing — no test in the suite exercises either language-configuration file's declared behavior (comment toggling, bracket matching, auto-closing pairs, surrounding pairs, onEnterRules indent/append behavior, or wordPattern-driven word selection). bbj-vscode/package.json lists no @vscode/test-electron-style integration-test dependency (confirmed: no match for "vscode-test" in package.json), so this project has no harness capable of exercising these editor-native behaviors at all today — unlike the TextMate grammar files, which are testable in isolation via vscode-textmate (as textmate-highlighting.test.ts/ textmate-bbx-highlighting.test.ts already do). This gap is also why P62-D2-006 (the invalid-JSON trailing commas) shipped undetected: no test even confirms either language-configuration file parses as valid JSON.
failure_scenario:  A future edit to either language-configuration file — a bad autoClosingPairs entry, a broken onEnterRules regex, or (as already found) invalid JSON — ships with `npm test` green, since nothing in the suite loads or validates either file.
classification:    major (1) touches 1 file: FAIL — closing the JSON-validity half needs one new assertion (easy, vitest-testable), but closing the behavioral half (bracket matching, auto-closing, onEnterRules as VS Code itself applies them) needs a new integration-test harness (e.g. @vscode/test-electron), which is new test infrastructure the project does not have — (2) no public API/grammar/LSP change: pass — (3) no new dependency: FAIL on the behavioral half (a behavioral harness would add @vscode/test-electron; the JSON-validity half adds none) — (4) regression-testable with existing harness: n/a for the gap itself (this finding *is* the missing-test gap) — (5) reviewer can name the exact edit: pass for the JSON-validity half; the behavioral half needs new infrastructure design, a larger investment than "name the exact edit" — (6) severity `low`, dimension D5 (not D1): pass — tests (1) and (3) fail on the behavioral half, so classification is `major` per D-13, even though a low-effort JSON-validity assertion alone would qualify as `easy` on its own.
effort:            8
dedup:             none — no frozen open issue names language-configuration.json test coverage.
disposition:       major-refactor
proposed_approach: For the JSON-validity half; the behavioral half needs new infrastructure design, a larger investment than "name the exact edit".
proposed_labels:   area=javascript; PRIO 3; effort 8
issue:             
```

```
id:                P62-D7-001
unit:              RU-62-01
location:          bbj-vscode/src/Commands/Commands.cjs:117,271,336
dimension:         D7
secondary:         [D1]
severity:          medium
evidence_tier:     inherited
evidence:          VS Code's bbj.run/bbj.runBUI/bbj.runDWC/bbj.compile (Commands.cjs:117,271,336) and its EM validate/login flows (extension.ts:426,645) all build a single shell command STRING via template-literal interpolation and pass it to child_process.exec(), which spawns the command through /bin/sh -c (or cmd.exe on Windows) -- meaning every interpolated segment is subject to shell metacharacter interpretation unless explicitly quoted and escaped (traced as unescaped at multiple points; see P62-D1-003). The equivalent IntelliJ actions for the same four operations plus EM login/validate -- BbjRunGuiAction.java:27,30,33,35,39,41,47,52, BbjRunBuiAction.java:115-129, BbjRunDwcAction.java:115-129, BbjRunActionBase.validateTokenServerSide (BbjRunActionBase.java:298-303), and BbjEMLoginAction.performLogin (BbjEMLoginAction.java:98-112) -- uniformly build a GeneralCommandLine and add each argument via .addParameter(...), which OSProcessHandler/ CapturingProcessHandler spawn directly (no shell), so no argument is ever subject to shell-metacharacter reinterpretation regardless of its content. IntelliJ's validateBeforeRun() (BbjRunActionBase.java:144-169) additionally confirms the configured BBj Home directory exists and the executable is present and executable before spawning; VS Code's getBBjHome() (Commands.cjs:45-61) and the EM login/validate paths (extension.ts:401-403, 601-608) only check that the bbj.home config value is a non-empty string -- never that the path resolves to an actual directory or executable -- so a misconfigured VS Code bbj.home is only discovered via exec()'s asynchronous error callback, after the shell has already attempted to interpret the (still-unescaped) command.
failure_scenario:  n/a (D7 is a cross-IDE comparative observation, not itself a new runtime failure scenario beyond what P62-D1-003 already states) -- the divergence means the identical class of user-facing feature (run/compile/EM-authenticate a BBj program) carries fundamentally different injection exposure and pre-flight validation robustness depending on which IDE the developer uses, even though both IDEs read the same bbj.home-equivalent configuration concept.
classification:    major (1) touches 1 file: FAIL -- Commands.cjs and extension.ts, the same files as P62-D1-003's fix -- (2) no public API/grammar/LSP change: pass -- (3) no new dependency: pass -- (4) regression-testable with vitest: pass -- (5) reviewer can name the exact edit: pass (adopt an argument-array-based spawn API -- Node's execFile/spawn -- mirroring IntelliJ's GeneralCommandLine approach, plus add pre-flight existence/executable checks) -- (6) severity `medium`, dimension D7 (not D1): pass -- test (1) alone already fails, so classification is `major` per D-13.
effort:            8
dedup:             none -- none of #231/#485/#486 concern process-spawning methodology or pre-flight path validation; this is a comparative observation, not a feature request.
disposition:       major-refactor
proposed_approach: (adopt an argument-array-based spawn API -- Node's execFile/spawn -- mirroring IntelliJ's GeneralCommandLine approach, plus add pre-flight existence/executable checks).
proposed_labels:   area=vscode; PRIO 2; effort 8
issue:             
```

```
id:                P63-D1-001
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:34-35,110-117,47-59
dimension:         D1
secondary:         [D6]
severity:          high
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction accompanies this record; a live network-tamper harness is out of this phase's scope and would itself be the trigger sequence D-13 prohibits publishing): the archive is fetched over HTTPS from a fixed host (DOWNLOAD_BASE_URL, :35) to a temp file (Files.createTempFile, :110) via HttpRequests.request(...).connect(...) (:112-117), handed directly to extraction with zero intervening integrity check. No MessageDigest/Checksum/Signature usage, no expected-size assertion, anywhere in the file's 290 lines (confirmed by full read). getCachedNodePath() (:47-59) then trusts any executable file at the resolved cache path on every later launch with the same absence of verification (Files.exists + Files.isExecutable only, :52).
failure_scenario:  A party able to substitute the content served from nodejs.org's distribution path for this exact version/platform/architecture combination — whether via compromise of the origin, a compromised intermediary trusted by the local certificate store, or corruption of the plugin data directory before a first-ever download — has that content extracted, copied, marked executable, and subsequently launched as the language server host process for every BBj file opened in the IDE, with no checksum or signature check at any point to detect the substitution. Per D-13, no trigger sequence or payload is stated beyond this problem-class/impact description.
classification:    major (1) touches 1 file: pass (a checksum/signature check is addable within BbjNodeDownloader.java alone) — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass (java.security.MessageDigest is JDK-standard) — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists in bbj-intellij (P63-D5-001), so no existing harness can regression-test this fix — (5) reviewer can name the exact edit (compute and compare a published SHASUMS256.txt entry from nodejs.org before extraction): pass — (6) severity `high` and dimension D1: FAIL — test (6) fails on both its clauses, so classification is `major` regardless of the other five tests (D-13's safety gate); test (4) independently fails via D-09's primary reading.
effort:            8
dedup:             none — #410 (Zed Editor support) requests a new editor integration, unrelated to Node.js download integrity on any existing IDE; #476 (starter programs via File and Code Templates) concerns project scaffolding, unrelated to runtime acquisition. Both of this unit's named plausible neighbours checked explicitly and dismissed. No other frozen open issue names Node.js download integrity.
disposition:       major-refactor
proposed_approach: Compute and compare a published SHASUMS256.txt entry from nodejs.org before extraction.
proposed_labels:   area=intellij; PRIO 1; effort 8
issue:             
```

```
id:                P63-D1-002
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:52
dimension:         D1
secondary:         [D2]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace on the cache READ path, which is a different code path from the download: getCachedNodePath() (:47-59) resolves getNodeDataDirectory().resolve(SystemInfo.isWindows ? "node.exe" : "node") (:50) — i.e. <PathManager.getPluginsPath()>/bbj-intellij-data/nodejs/node (:243-246) — and RETURNS that path to its callers whenever `Files.exists(nodePath) && Files.isExecutable(nodePath)` (:52) holds. Those two predicates are the entire trust decision: confirmed by reading all 290 lines, there is no hash comparison, no signature check, no size assertion, no version probe (no `--version` invocation), and no provenance marker of any kind anywhere in the file. A file satisfying only exists+executable is therefore indistinguishable, to this method, from a binary this plugin itself downloaded.
failure_scenario:  Any local process or user able to write into the plugin data directory can place an executable file at exactly <plugins>/bbj-intellij-data/nodejs/node (or node.exe on Windows). On the next IDE launch getCachedNodePath() returns it on the strength of :52 alone, and the caller runs it as the Node.js host process for the language server for every BBj file opened. Note this path BYPASSES the download entirely — the archive is never fetched, so P63-D1-001's absent checksum is not merely insufficient here, it is never reached. This is the distinct half of the integrity gap: D1-001 covers bytes that arrive over the network unverified, D1-002 covers bytes that are never verified on read, on every launch after the first. Severity is low because the plugin data directory is normally private to the current OS user, limiting who can pre-place the file; it is not `none` because the directory is a predictable, non-randomised path under a well-known IDE root, and the file is made executable by the plugin's own code (:153) on the download path.
classification:    major (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass (MessageDigest is JDK-standard) — (4) regression- testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (record the downloaded binary's digest alongside the cache and re-verify it in getCachedNodePath() before returning, or at minimum probe `node --version` against NODE_VERSION): pass — (6) severity `low` but dimension is D1: FAIL — any D1 finding is major regardless of severity per D-13's safety gate; test (4) independently fails.
effort:            2
dedup:             none — neither #410 nor #476, nor any other frozen open issue, concerns verification of the cached Node.js binary on read. Distinct from P63-D1-001, which concerns verification of the archive on download; the two are separately fixable and neither subsumes the other.
disposition:       major-refactor
proposed_approach: Record the downloaded binary's digest alongside the cache and re-verify it in getCachedNodePath() before returning, or at minimum probe `node --version` against NODE_VERSION.
proposed_labels:   area=intellij; PRIO 3; effort 2
issue:             
```

```
id:                P63-D1-003
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:103,BbjRunActionBase.java:302,BbjRunBuiAction.java:127,BbjRunDwcAction.java:127
dimension:         D1
secondary:         [D2]
severity:          high
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction accompanies this record; a live process-argument-inspection harness is out of this static-trace sweep's scope): BbjEMLoginAction.java:103 (cmd.addParameter(password)) passes the plaintext EM password as a GeneralCommandLine argument to the spawned "bbj -q em-login.bbj" process; BbjRunActionBase.java:302 (validateTokenServerSide's cmd.addParameter(token)) and BbjRunBuiAction.java:127/BbjRunDwcAction.java:127 (cmd.addParameter(token)) each pass the stored JWT the same way. All four call sites build a GeneralCommandLine and add the secret via .addParameter(...), which places it in the child process's own argv, visible via OS process-listing APIs to any other process capable of enumerating them; none of the four passes the secret via stdin or an environment variable instead, confirmed by reading all four call sites in full.
failure_scenario:  A local process capable of enumerating other processes' argument lists on the same host (e.g. via ps/Task Manager-class introspection, available to any other user-level process on a shared or compromised machine) can read the EM password during login and the JWT token during every run/validate invocation for as long as each spawned process remains alive — general process-argument-list exposure (CWE-214), not a scenario specific to any single call site. Per D-13, no trigger sequence or payload is stated beyond this problem-class/impact description.
classification:    major (1) touches 1 file: FAIL — a fix (routing secrets via stdin or an environment variable instead of argv) spans at minimum BbjEMLoginAction.java and BbjRunActionBase.java (plus its two run subclasses), since each independently constructs its own GeneralCommandLine — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass (stdin/env-var argument passing needs no new library) — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists in bbj-intellij (P63-D5-001) — (5) reviewer can name the exact edit (switch the four call sites from addParameter(secret) to a stdin write or a process-scoped environment variable the downstream .bbj scripts are redesigned to read instead): pass — (6) severity high and dimension D1: FAIL — test (6) fails on its own, so classification is major regardless of the other five tests (D-13's safety gate).
effort:            8
dedup:             none — #231 (custom classpath and command-line settings for starting BBj programs) requests configurability of run arguments, not their process-argument- list observability; this finding is about an existing exposure of secret values already passed as arguments, a security defect #231 does not address. #385 (Graffiti Composer launch request) is unrelated — it requests launching an external composer tool, not EM credential/token handling. Both of this unit's named plausible neighbours checked explicitly and dismissed.
disposition:       major-refactor
proposed_approach: Switch the four call sites from addParameter(secret) to a stdin write or a process-scoped environment variable the downstream .bbj scripts are redesigned to read instead.
proposed_labels:   area=intellij; PRIO 1; effort 8
issue:             
```

```
id:                P63-D1-004
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:56-88
dimension:         D1
secondary:         [D2]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction; see the Environment constraint above): isTokenExpired() (:56-88) returns false — "not expired" — for every one of: a non-3-part token string (:64-66, "Not a JWT, let server decide"), a payload with no exp claim (:76-77, "No exp claim, can't determine"), and any exception during base64url-decode/JSON-parse (:84-86, "let server validate"). No signature verification of any kind is performed anywhere in this 89-line file (confirmed by full read — no Signature/JWT-library usage). A malformed, unsigned, or exp-less token is therefore indistinguishable from a genuinely fresh one by this client-side check alone.
failure_scenario:  A JWT token that is not well-formed 3-part base64url, whose decoded payload lacks an exp claim, or whose decode throws for any reason is reported as "not expired" identically to a token with a genuine future exp. BbjEMLoginAction's freshly- stored token is never itself re-checked through this or any other validator before being written to PasswordSafe, so a malformed or unsigned token issued or substituted at that point would pass this client-side gate silently; the run flows are protected only by the separate validateTokenServerSide() server round trip, which BbjEMLoginAction itself never calls.
classification:    major (1) touches 1 file: pass (confined to BbjEMTokenStore.java) — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression- testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (change the three "unable to determine" branches to return true — fail closed — or add an explicit isTokenWellFormed() gate callers must check before treating a token as usable): pass — (6) severity medium but dimension D1: FAIL — any D1 finding is major regardless of severity per D-13's safety gate; test (4) also independently fails.
effort:            4
dedup:             none — no frozen open issue names JWT expiry-decoding fail-open behaviour in the IntelliJ plugin.
disposition:       major-refactor
proposed_approach: Change the three "unable to determine" branches to return true — fail closed — or add an explicit isTokenWellFormed() gate callers must check before treating a token as usable.
proposed_labels:   area=intellij; PRIO 2; effort 4
issue:             
```

```
id:                P63-D1-005
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:295,303,BbjEMLoginAction.java:96,104
dimension:         D1
secondary:         [D2]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction; establishing exploitability further would require a multi-user filesystem harness outside this static-trace sweep's scope): both Files.createTempFile(prefix, ".tmp") call sites (BbjRunActionBase.java:295, BbjEMLoginAction.java:96) pass no FileAttribute/ PosixFilePermissions argument, so the resulting file — which receives the EM login's plaintext JWT output or the validate-token result written by the spawned bbj process — is created with whatever default permissions the JVM/OS combination applies, rather than an explicit owner-only (0600) grant, for the window between the subprocess writing it and this code's finally-block delete (BbjRunActionBase.java:315-317, BbjEMLoginAction.java:119-123).
failure_scenario:  On a multi-user host or shared filesystem where the plugin's temp-file directory is not exclusively readable by the current user, another local process running as a different OS user could read the plaintext JWT token or the validation result during that window — a file-contents exposure channel distinct from P63-D1-003's always-open process-argument exposure, recorded separately because it is a different attack surface.
classification:    major (1) touches 1 file: FAIL — the two Files.createTempFile call sites live in different files (BbjRunActionBase.java, BbjEMLoginAction.java) — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass (java.nio.file.attribute.PosixFilePermissions is JDK-standard) — (4) regression- testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (pass PosixFilePermissions.asFileAttribute(EnumSet.of(OWNER_READ, OWNER_WRITE)) to both createTempFile calls, with a Windows-appropriate ACL fallback): pass — (6) severity medium but dimension D1: FAIL — any D1 finding is major per D-13; tests (1) and (4) also fail.
effort:            4
dedup:             none — no frozen open issue names temp-file permission handling in the EM login/validate flow.
disposition:       major-refactor
proposed_approach: Pass PosixFilePermissions.asFileAttribute(EnumSet.of(OWNER_READ, OWNER_WRITE)) to both createTempFile calls, with a Windows-appropriate ACL fallback.
proposed_labels:   area=intellij; PRIO 2; effort 4
issue:             
```

```
id:                P63-D1-006
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:107-115,172-196
dimension:         D1
secondary:         [D2]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction; the Gradle build cannot run in this environment): openMsgbox (:107-115) writes dialog.getStatement() — the LS-composed MsgboxPreview.statement built from dialog-typed message/title/ assignTo/custom-button text plus catalog bit values — directly via Document.replaceString/insertString with no escaping or structural validation; applyHexEdit (:172-196, shared by the addWindow and addChildWindow edit flows) writes flagsHex/eventHex tokens the LS computed from checkbox selections the same way. Every affected field (message/title/assignTo, receiver/sysgui/x/y/ width/height/title, receiver/window/id/context/title/x/y/width/height) is text the developer types into their own IntelliJ dialog — never document, workspace or config-sourced — mirroring Phase 62's P62-D1-005 exactly, recorded here as this unit's own IntelliJ-side instance per D-05.
failure_scenario:  A developer who types BBj syntax-breaking text (an unescaped quote, an unmatched parenthesis) into a composer dialog's message/title/geometry fields gets that text embedded verbatim into the statement inserted into their own live source file, with no client- or server-side structural check catching it before the write — a self-inflicted statement-corruption gap in the developer's own file, not an attacker-controlled injection surface (no workspace-committed, remote, or peer-supplied value reaches this path).
classification:    major (1) touches 1 file: pass (confined to ComposerLauncher.java's write sites) — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists in bbj-intellij (P63-D5-001) — (5) reviewer can name the exact edit (thread the LS's existing validateStringField-style structural check, or an IntelliJ-side equivalent, through the write path before Document.replaceString/ insertString): pass — (6) dimension D1: FAIL — test (6) fails on its own per D-13's safety gate regardless of severity, so classification is major.
effort:            4
dedup:             none — checked #385 (Graffiti Composer launch request, unrelated external tool) and #475 (SETOPTS assistance, a different composer form) explicitly; neither names this document-write validation gap. No frozen open issue addresses it.
disposition:       major-refactor
proposed_approach: Thread the LS's existing validateStringField-style structural check, or an IntelliJ-side equivalent, through the write path before Document.replaceString/ insertString.
proposed_labels:   area=intellij; PRIO 3; effort 4
issue:             
```

```
id:                P63-D1-007
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java:32,38-43,45-66
dimension:         D1
secondary:         []
severity:          high
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction; a live PATH/CWD-hijack harness is out of this static-trace sweep's scope and would itself be the trigger sequence D-13 prohibits publishing): resolveNodePath() (:45-66) falls through settings (:47-50) -> auto-detection (:52-56) -> the RU-63-03 download cache (:58-62) -> an unqualified literal "node" (:65) when all three resolution paths are empty/absent. The resulting GeneralCommandLine (:38, `new GeneralCommandLine(nodePath, serverPath, "--stdio")`) is constructed with that bare, unqualified executable name with no absolute-path guarantee, and its working directory is explicitly set to the current project's own base path (:40, `cmd.setWorkDirectory(new File(project.getBasePath()))`) — the exact combination CWE-426 (Untrusted Search Path) names as hazardous on platforms whose process-creation API consults the working directory for an unqualified executable name.
failure_scenario:  On a machine where Node.js is not configured in BBj Settings, not auto-detectable via PATH, and has never been downloaded through the RU-63-03 cache, this fallback resolves the executable to the literal string "node" and launches it with the current project directory as the working directory — the same combination through which workspace-supplied content can be preferred over the genuinely intended system binary on platforms that search the working directory for an unqualified executable name, resulting in that content running as the language-server host process for every BBj file opened in the project. Per D-13, no trigger sequence or payload is stated beyond this problem-class/impact description.
classification:    major (1) touches 1 file: pass (confined to BbjLanguageServer.java's resolveNodePath()) — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (require an absolute, existing, executable path before constructing GeneralCommandLine — fail loudly with an actionable Settings-configuration prompt instead of falling back to the bare literal "node"): pass — (6) severity high and dimension D1: FAIL — test (6) fails on its own, so classification is major regardless of the other five tests (D-13's safety gate).
effort:            4
dedup:             none — #410 (Zed Editor support) and #231 (custom classpath and command-line settings) both checked explicitly and dismissed — neither concerns Node.js executable resolution or search-path safety. No other frozen open issue names this launch-path fallback.
disposition:       major-refactor
proposed_approach: Require an absolute, existing, executable path before constructing GeneralCommandLine — fail loudly with an actionable Settings-configuration prompt instead of falling back to the bare literal "node".
proposed_labels:   area=intellij; PRIO 1; effort 4
issue:             
```

```
id:                P63-D1-008
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java:117-150
dimension:         D1
secondary:         [D2]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace: checkConnection() (:117-160) opens `new Socket()` and calls socket.connect(new InetSocketAddress(host, port), TCP_TIMEOUT_MS) (:129-130) inside a try-with-resources — no byte is written to or read from the socket at any point in this file (confirmed by full read: no OutputStream/InputStream/ write/read call anywhere), and the socket is closed unconditionally on every path via try-with-resources. A bare TCP three-way handshake succeeding is the sole signal InteropStatus.CONNECTED (:132) is derived from — no peer-identity or protocol check follows it.
failure_scenario:  Any process — not necessarily the genuine java-interop service — that accepts a TCP connection on the configured host:port (default localhost:5008) causes this probe to report "Java: Connected" in the status bar, even though no application-layer exchange confirms the listening peer is actually java-interop. The consequence is a misleading, purely cosmetic status indicator, not a state change or data exposure — no value from the socket is read or acted upon anywhere in this file.
classification:    major (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (the limitation is inherent given java-interop exposes no LSP-visible identity or handshake to check against, per this file's own class doc, :19-23 — the nameable edit is documenting the limitation explicitly in that same doc, since a protocol-level identity check would require a java-interop change out of this unit's scope): pass — (6) severity low, dimension D1 (not high, not critical): pass — test (4) alone fails, so classification is major per D-13.
effort:            2
dedup:             none — #410 and #231 checked explicitly and dismissed as unrelated. No frozen open issue names java-interop probe identity verification.
disposition:       major-refactor
proposed_approach: The limitation is inherent given java-interop exposes no LSP-visible identity or handshake to check against, per this file's own class doc, :19-23 — the nameable edit is documenting the limitation explicitly in that same doc, since a protocol-level identity check would require a java-interop change out of this unit's scope.
proposed_labels:   area=intellij; PRIO 3; effort 2
issue:             
```

```
id:                P63-D2-001
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:47-59
dimension:         D2
secondary:         []
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace: getCachedNodePath() (:47-59) catches IOException at :55 with the comment "Directory creation failed, return null" and falls through to the same `return null` (:58) that the "path doesn't exist or isn't executable" branch (:52-54, condition false) also reaches. Both conditions are indistinguishable to every caller. The same catch-and-return-null-uniformly pattern recurs at BbjHomeDetector.java:78-80 (detectFromInstallerTrace) and BbjNodeDetector.java:47-48 (getNodeVersion) — cited as the same class of defect, not restated as a separate finding.
failure_scenario:  A plugin data directory that is unwritable (read-only filesystem, permission denial, disk full during Files.createDirectories at :245) causes getCachedNodePath() to report "not cached" identically to the correct first-run state, so any UI or logic that branches on this method's result (e.g., deciding whether to show a "Download Node.js" action) presents the wrong diagnosis — "not downloaded yet" instead of "environment is misconfigured" — and a user retries a download that is doomed to fail at the same directory-creation step for the same underlying reason.
classification:    major (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (log the swallowed IOException, or return a small sealed result type distinguishing "not cached" from "cache directory inaccessible"): pass — (6) severity `low`, dimension D2 (not D1): pass — test (4) alone fails, so classification is `major` per D-13 ("failing any one test makes it major").
effort:            2
dedup:             none — no frozen open issue names this cache-availability diagnostic gap.
disposition:       major-refactor
proposed_approach: Log the swallowed IOException, or return a small sealed result type distinguishing "not cached" from "cache directory inaccessible".
proposed_labels:   area=intellij; PRIO 3; effort 2
issue:             
```

```
id:                P63-D2-002
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java:130-140
dimension:         D2
secondary:         [D4]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace: BbjSettings.getState() (BbjSettings.java:42-59) auto-detects bbjHomePath and nodeJsPath inline whenever they are empty (:44-57), so every consumer of BbjSettings.getInstance().getState() benefits. javaInteropPort receives no equivalent treatment in getState() — its auto-detection exists only in BbjSettingsConfigurable.reset() (:130-140), gated by `if (javaInteropPort == 5008)` (:131) — an equality-to-the-literal-default check, not an "was this ever configured" check, so a user who explicitly confirms port 5008 is indistinguishable from a user who never touched the field, and any direct BbjSettings.getInstance().getState() caller that is not the Settings UI never runs this auto-detection at all.
failure_scenario:  A consumer reading BbjSettings.getInstance().getState().javaInteropPort directly (bypassing the Settings dialog) gets the hardcoded default 5008 even when BBj.properties specifies a different java-interop port, unlike bbjHomePath/ nodeJsPath which are auto-detected wherever they are read. Separately, a user who has explicitly left the port at its default value has that value silently replaced with a newly detected port each time the Settings dialog is reopened and OK'd, with no way to express "I want 5008, don't auto-detect."
classification:    major (1) touches 1 file: pass (fix confined to reconciling BbjSettings.java's getState()/BbjSettingsConfigurable.java's reset(), but a comprehensive fix moving the auto-detect into getState() itself touches BbjSettings.java only, so scored as 1) — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (move port auto-detection into BbjSettings.getState(), replacing the equality check with a genuine "never configured" sentinel): pass — (6) severity `low`, dimension D2 (not D1): pass — test (4) alone fails, so classification is `major` per D-13.
effort:            4
dedup:             none — no frozen open issue names java-interop port auto-detection.
disposition:       major-refactor
proposed_approach: Move port auto-detection into BbjSettings.getState(), replacing the equality check with a genuine "never configured" sentinel.
proposed_labels:   area=intellij; PRIO 3; effort 4
issue:             
```

```
id:                P63-D2-003
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:70-79
dimension:         D2
secondary:         [D1]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace: downloadNodeAsync() (:68-95) reads props.getBoolean(DOWNLOAD_IN_PROGRESS_KEY, false) (:71) and, if false, proceeds to queue a Task.Backgroundable whose run() sets props.setValue(DOWNLOAD_IN_PROGRESS_KEY, true) (:79) — the check (:71) and the set (:79) are two separate, unsynchronized calls on the application-scoped PropertiesComponent, with queueing and task-start intervening between them. No synchronized block, lock, or atomic compare-and-set guards this sequence anywhere in the file.
failure_scenario:  Two IntelliJ windows (or two near-simultaneous invocations from within one window) that both call downloadNodeAsync() inside the same race window both observe the flag as false before either call reaches :79, so two concurrent Task.Backgroundable downloads run at once, each independently downloading, extracting, and calling Files.copy(..., REPLACE_EXISTING) (:149) to the identical targetPath — a caller could observe a Files.copy from one task interleaved with a partially-extracted file from the other, or a getCachedNodePath() read of a node executable mid-overwrite by a second concurrent copy.
classification:    major (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (guard the check-then-set with a synchronized block or an AtomicBoolean compare-and-set): pass — (6) severity `medium`, dimension D2 (not D1): pass — test (4) alone fails, so classification is `major` per D-13.
effort:            4
dedup:             none — no frozen open issue names concurrent-download races in the Node.js acquisition path.
disposition:       major-refactor
proposed_approach: Guard the check-then-set with a synchronized block or an AtomicBoolean compare-and-set.
proposed_labels:   area=intellij; PRIO 2; effort 4
issue:             
```

```
id:                P63-D2-004
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:60,67,BbjEMLoginAction.java:34-36,115
dimension:         D2
secondary:         [D3]
severity:          high
evidence_tier:     repro
evidence:          Control-flow trace: BbjRunActionBase.actionPerformed() (:43-108) calls buildCommandLine(file, project) synchronously at line 60, BEFORE the ApplicationManager.getApplication().executeOnPooledThread(...) dispatch at line 67 that wraps only the subsequent OSProcessHandler launch. For BbjRunBuiAction/BbjRunDwcAction, buildCommandLine() (their own override) calls validateTokenServerSide() (BbjRunActionBase.java:282-322, up to a 10s CapturingProcessHandler.runProcess(10000) at :308) and, if the token is invalid/expired, BbjEMLoginAction.performLogin() (up to a further 15s handler.runProcess(15000) at :115) — both synchronously, before the pooled-thread dispatch is ever reached. actionPerformed() always executes on the EDT in the IntelliJ Platform action system regardless of getActionUpdateThread() (which governs only where update() runs), so this entire chain runs on the EDT.
failure_scenario:  Clicking "Run As BUI"/"Run As DWC" when the stored EM token is absent, expired (client-side check), or rejected by the server-side round trip synchronously blocks the EDT for up to ~25 seconds in the worst case (10s validate + 15s re-login) before the pooled-thread dispatch at BbjRunActionBase.java:67 is ever reached — freezing the entire IDE, not just the current editor. Clicking "Login to Enterprise Manager" directly freezes the IDE for its own runProcess(15000) call every time, since BbjEMLoginAction has no pooled-thread dispatch of its own at all (see P63-D2-005).
classification:    major (1) touches 1 file: FAIL — a fix needs to move buildCommandLine's own network/process work off the EDT in at least BbjRunActionBase.java and BbjEMLoginAction.java — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (restructure actionPerformed() so buildCommandLine()'s token-validation/login round trip runs inside the existing executeOnPooledThread(...) block rather than before it): pass — (6) severity high, dimension D2 (not D1): pass — tests (1) and (4) fail, so classification is major per D-13.
effort:            8
dedup:             none — no frozen open issue names EDT-blocking behaviour in the BBj run/EM-login actions (distinct from RU-63-03's P63-D3-001, which is the Settings dialog's own separate EDT-blocking finding).
disposition:       major-refactor
proposed_approach: Restructure actionPerformed() so buildCommandLine()'s token-validation/login round trip runs inside the existing executeOnPooledThread(...) block rather than before it.
proposed_labels:   area=intellij; PRIO 1; effort 8
issue:             
```

```
id:                P63-D2-005
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:25-36
dimension:         D2
secondary:         [D4]
severity:          low
evidence_tier:     repro
evidence:          Structural trace: BbjEMLoginAction extends AnAction directly (:25) and defines only actionPerformed() — no update() or getActionUpdateThread() override, unlike all ten other actions in this unit, each of which explicitly declares ActionUpdateThread.BGT and gates enablement on project/file/server-readiness state.
failure_scenario:  "Login to Enterprise Manager" remains enabled and visible in the Tools menu regardless of whether a project is open or the language server is running — inconsistent with its ten siblings. performLogin()'s own internal checks (BBj Home configured, credentials entered) prevent a hard failure, but the menu item's enabled state does not reflect the project's actual readiness the way every other action in this unit does.
classification:    major (1) touches 1 file: pass (BbjEMLoginAction.java only) — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression- testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (add update()/ getActionUpdateThread() overrides mirroring BbjRefreshJavaClassesAction's pattern): pass — (6) severity low, dimension D2 (not D1): pass — test (4) alone fails, so classification is major per D-13.
effort:            2
dedup:             none — no frozen open issue names action-enablement inconsistency in the EM login action.
disposition:       major-refactor
proposed_approach: Add update()/ getActionUpdateThread() overrides mirroring BbjRefreshJavaClassesAction's pattern.
proposed_labels:   area=intellij; PRIO 3; effort 2
issue:             
```

```
id:                P63-D2-006
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:96,115,119-123,145
dimension:         D2
secondary:         [D1]
severity:          low
evidence_tier:     repro
evidence:          Try/finally scoping trace: tmpFile is created at line 96, inside the outer try (:93-148); the inner try/finally at :119-123 deletes it but wraps only the read at :120, NOT the handler.runProcess(15000) call at line 115, which executes between the file's creation and that inner block.
failure_scenario:  An exception thrown by handler.runProcess(15000) at line 115 — a process-launch failure, an I/O error, or an internal timeout — is caught only by the outer catch (Exception ex) at line 145, which shows an error dialog and returns false without ever reaching the inner try/finally that deletes tmpFile; the temp file (potentially containing a partially-written EM login output, including a token fragment, if em-login.bbj wrote before the process failed) is left on disk in the OS temp directory until the OS itself reclaims it.
classification:    major (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (widen the try/finally at :119-123 to also wrap the runProcess(...) call at line 115): pass — (6) severity low, dimension D2 (not D1): pass — test (4) alone fails, so classification is major per D-13.
effort:            2
dedup:             none — no frozen open issue names this temp-file cleanup gap.
disposition:       major-refactor
proposed_approach: Widen the try/finally at :119-123 to also wrap the runProcess(...) call at line 115.
proposed_labels:   area=intellij; PRIO 3; effort 2
issue:             
```

```
id:                P63-D2-007
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:66-87,MsgboxComposerDialog.java:209-214,AddWindowComposerDialog.java:238-243,AddChildWindowComposerDialog.java:247-252
dimension:         D2
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction; a live LS-crash/timeout harness is out of this static-trace sweep's scope): grep -rn "exceptionally\| whenComplete\|\.handle(\|catch\s*(" across all 13 files in this unit returns zero matches. Every CompletableFuture chain (ComposerLauncher.launch()'s nested server/catalogs/decodeCall chain at :66-87, and each dialog's refresh() -> *Preview(...).thenAccept(...) chain) has no completion-exception handler and no surrounding try/catch anywhere in this unit.
failure_scenario:  If any bbj/composer/* LSP4IJ request completes exceptionally (server restart mid-request, timeout, connection drop), the .thenAccept(...) continuation never runs and the exception is stored on the future unobserved. Invoking a composer action/intention under this condition produces zero visible effect (no dialog, no error, no log entry); an already-open dialog's refresh() silently stops updating the preview/statement/schematic on the next keystroke, leaving stale text a user could unknowingly accept via the still-clickable OK button.
classification:    major (1) touches 1 file: FAIL — a fix (add .exceptionally()/.handle() plus a user- visible notification) spans ComposerLauncher.java and all three dialog files — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (add .exceptionally(t -> onEdt(() -> notifyNotReady(...))) or an equivalent error-surfacing handler to each chain): pass — (6) severity medium, dimension D2 (not D1): pass — tests (1) and (4) fail, so classification is major.
effort:            4
dedup:             none — no frozen open issue names unhandled composer-request failures.
disposition:       major-refactor
proposed_approach: Add .exceptionally(t -> onEdt(() -> notifyNotReady(...))) or an equivalent error-surfacing handler to each chain.
proposed_labels:   area=intellij; PRIO 2; effort 4
issue:             
```

```
id:                P63-D2-008
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java:116-118,139,AddWindowComposerDialog.java:151,161,AddChildWindowComposerDialog.java:155,165
dimension:         D2
secondary:         [D1]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace (D-07): fillCombo(icon, catalogs.icons)/fillCombo(buttonSet, catalogs.buttonSets)/fillCombo(defaultButton, catalogs.defaultButtons) and the `for (CatalogItem it : catalogs.flags)` loop in MsgboxComposerDialog. createCenterPanel() iterate their list arguments with no null guard; both addWindow-family dialogs' addGroupedChecks(flags/eventPanel, catalogs.flags/ eventBits, ...) do the same. ComposerLauncher's own catalogs==null check (:92,120,141) guards only the top-level ComposerCatalogs reference, not its individual sub-list fields.
failure_scenario:  A malformed or partial bbj/composer/catalogs response with a null icons/ buttonSets/defaultButtons/flags/eventBits field throws NullPointerException inside createCenterPanel(), called synchronously from DialogWrapper.init() on the EDT during dialog construction — IntelliJ's top-level EDT handler shows an "IDE Internal Error" balloon instead of the graceful "not ready" message ComposerLauncher already has one level up for a fully-null catalogs object.
classification:    major (1) touches 1 file: FAIL — spans MsgboxComposerDialog.java and both addWindow-family dialogs — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (null-default each sub-list to List.of() at the point of use, or guard before iterating): pass — (6) severity low, dimension D2 (not D1): pass — tests (1) and (4) fail, so classification is major.
effort:            4
dedup:             none — no frozen open issue names this defensive-null-check gap.
disposition:       major-refactor
proposed_approach: Null-default each sub-list to List.of() at the point of use, or guard before iterating.
proposed_labels:   area=intellij; PRIO 3; effort 4
issue:             
```

```
id:                P63-D2-009
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:179,185
dimension:         D2
secondary:         []
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace (D-07): applyHexEdit's ed.flagsRange[0]/[1] (:179) and ed.eventMaskRange[0]/[1] (:185) index a non-null int[] with no length check before indexing. composer-commands.ts's addwindow/addChildWindow decodeCall handlers always build these as 2-element [start,end] tuples today (confirmed by reading both handlers in full), so this is a latent, not currently observed, gap rather than a live defect.
failure_scenario:  A future LS-side change to the flagsRange/eventMaskRange encoding that ever produces a 0- or 1-element array would throw ArrayIndexOutOfBoundsException inside the WriteCommandAction that applies the edit, with no defensive length check anywhere in the client to catch it before indexing.
classification:    major (1) touches 1 file: pass (confined to ComposerLauncher.java) — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression- testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (guard ed.flagsRange.length == 2 / ed.eventMaskRange.length == 2 before indexing): pass — (6) severity low, dimension D2 (not D1): pass — test (4) alone fails, so classification is major.
effort:            2
dedup:             none — no frozen open issue names this array-bounds gap.
disposition:       major-refactor
proposed_approach: Guard ed.flagsRange.length == 2 / ed.eventMaskRange.length == 2 before indexing.
proposed_labels:   area=intellij; PRIO 3; effort 2
issue:             
```

```
id:                P63-D2-010
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:57-159
dimension:         D2
secondary:         [D1]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace (D-07), matching the plan's own threat model entry T-63-P03-S4: launch() captures line/lineText/col (:59-64) and decodes the call via the LS BEFORE the modal dialog is shown; openMsgbox/applyAddWindowEdit/ applyHexEdit then apply the captured callStart/callEnd/flagsRange/ eventMaskRange offsets AFTER dialog.showAndGet() returns — i.e. after the entire modal dialog session, during which a background process (file-watcher reload, another window's edit, an LSP-driven auto-edit) could mutate the document. No re-decode or offset-revalidation step exists anywhere between capture and apply in any of the three edit-application methods.
failure_scenario:  If the document changes at or before the captured line/offsets while the composer dialog is open, WriteCommandAction.replaceString either throws (offsets now exceed the line's current length) or — the more concerning case — silently rewrites whatever text now occupies that byte range, corrupting unrelated content the user never intended to touch.
classification:    major (1) touches 1 file: FAIL — a fix needs a re-decode-and-compare step reachable from all three apply methods, likely a shared helper plus per-method call-site changes — (2) no public API/grammar/LSP change: pass (reuses the existing decodeCall requests) — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit: FAIL — only the general shape (re-decode at apply time, compare against the captured offsets, prompt or abort on mismatch) is nameable, not a single line-edit — (6) severity medium, dimension D2 (not D1): pass — multiple tests fail, so classification is major.
effort:            8
dedup:             none — no frozen open issue names this stale-captured-range gap.
disposition:       major-refactor
proposed_approach: The general shape is nameable even though no single-file edit is: add a shared re-decode-and-validate helper reachable from all three apply paths in `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:57-159` (`openMsgbox`, `applyAddWindowEdit`, `applyHexEdit`), each re-decoding the call at the captured line/offsets immediately before `WriteCommandAction.replaceString` and comparing the fresh decode against the offsets captured before `dialog.showAndGet()`. What has to be established before this is finished is a UX decision this record's own evidence does not settle — whether a mismatch prompts the user to re-open the dialog against the current document state or silently aborts the edit — and that choice is the first thing an implementer needs, not evidence this sweep can supply.
proposed_labels:   area=intellij; PRIO 2; effort 8
issue:             
```

```
id:                P63-D2-011
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java:67-114,bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java:65-108
dimension:         D2
secondary:         [D3]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace: both widgets call updateVisibility() (BbjStatusBarWidget. java:99, BbjJavaInteropStatusBarWidget.java:93) exclusively from inside their own updateStatus() method (:67-101/:65-95), which itself runs only when the server-status or java-interop-status message-bus Topic fires a new value (subscribed at :58-61/:56-59) or once at construction time (:64/:62). Neither file registers a FileEditorManagerListener or any other editor-selection-change hook anywhere (confirmed by grep across both files) — updateVisibility()'s own file-extension check (:104-113/:98-107) therefore only re-runs on a status transition, never on a bare editor-tab switch.
failure_scenario:  A user who opens a BBj file (widget becomes visible) and then switches to a non-BBj file, with no intervening server-status or java-interop-status change, keeps seeing the now-stale visible widget — and the reverse: opening a first BBj file after the server has already reached a stable "started" status (no further status event fires) leaves the widget hidden until some unrelated status transition happens to occur, if one ever does.
classification:    major (1) touches 1 file: FAIL — the same fix (registering a FileEditorManagerListener) is needed independently in both widget files — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (register a FileEditorManagerListener. FILE_EDITOR_MANAGER subscription via the project message bus in each widget's constructor, disposed alongside messageBusConnection, calling updateVisibility() on selection change): pass — (6) severity low, dimension D2 (not D1): pass — tests (1) and (4) both fail, so classification is major.
effort:            4
dedup:             none — #410 and #231 checked explicitly and dismissed. No frozen open issue names status-bar visibility staleness on editor-tab switch.
disposition:       major-refactor
proposed_approach: Register a FileEditorManagerListener. FILE_EDITOR_MANAGER subscription via the project message bus in each widget's constructor, disposed alongside messageBusConnection, calling updateVisibility() on selection change.
proposed_labels:   area=intellij; PRIO 3; effort 4
issue:             
```

```
id:                P63-D2-012
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:115-128
dimension:         D2
secondary:         [D3]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace: on the first detected crash (crashCount == 1, :115), updateStatus() calls ApplicationManager.getApplication().invokeLater(() -> { ...; Thread.sleep(1000); ...; restart(); }) (:118-128). invokeLater runnables execute on the Swing Event Dispatch Thread; the runnable's own Thread.sleep(1000) (:123) therefore blocks the EDT — and with it every other queued UI repaint, keystroke, and menu action — for a full second on every single first-crash auto-restart.
failure_scenario:  The moment the language server crashes for the first time within a session, the entire IntelliJ UI freezes for approximately one second while this handler sleeps on the EDT before calling restart() — the opposite of the project's own established "process launch off EDT to pooled thread" pattern (PROJECT.md Key Decisions), applied here to a purely cosmetic pre-restart delay rather than the actual restart work.
classification:    major (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (move the delay onto restartAlarm.addRequest(this::restart, 1000) off the EDT, reusing the existing Alarm-based scheduling machinery instead of a raw Thread.sleep inside invokeLater): pass — (6) severity medium, dimension D2 (not D1): pass — test (4) alone fails, so classification is major.
effort:            2
dedup:             none — no frozen open issue names EDT-blocking behavior in the crash-recovery path (distinct from #486, which requests config-file watch/reload, not crash recovery). #410/#231 also checked and dismissed.
disposition:       major-refactor
proposed_approach: Move the delay onto restartAlarm.addRequest(this::restart, 1000) off the EDT, reusing the existing Alarm-based scheduling machinery instead of a raw Thread.sleep inside invokeLater.
proposed_labels:   area=intellij; PRIO 2; effort 2
issue:             
```

```
id:                P63-D2-013
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:34-35,206-220
dimension:         D2
secondary:         [D4]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace plus a repo-wide grep: scheduleRestart() (:217-220) debounces via restartAlarm.cancelAllRequests()/addRequest(this::restart, RESTART_DEBOUNCE_MS) (:218-219, RESTART_DEBOUNCE_MS = 500 at :35) — but `grep -rn "scheduleRestart()" bbj-intellij/src/main/java` returns zero call sites anywhere in the codebase. Every actual restart trigger instead calls the raw, unguarded restart() (:206-211, manager.stop(...)/manager.start(...) with no lock, flag, or debounce) directly: BbjRestartServerAction.java:27, BbjServerCrashNotificationProvider.java:49, BbjStatusBarWidget.java:122, BbjJavaInteropStatusBarWidget.java:116, BbjRefreshJavaClassesAction.java:30, and the crash-auto-restart path itself (BbjServerService.java:127, P63-D2-012's own call site) — six independent call sites, none passing through scheduleRestart()'s debounce.
failure_scenario:  Two of these six triggers invoked within a short window of each other — e.g. a user double-clicking "Restart Server" in the status-bar popup, or clicking "Restart" on the crash notification banner while the crash-triggered 1-second auto-restart delay (P63-D2-012) is still pending — each independently call manager.stop("bbjLanguageServer")/manager.start("bbjLanguageServer") with no synchronization between the two calls, an unguarded interleaving whose outcome depends on LanguageServerManager's own internal handling of overlapping stop/start calls for the same server id, not on anything this file coordinates.
classification:    major (1) touches 1 file: pass — the minimal fix (an in-flight guard inside restart() itself, e.g. an AtomicBoolean compare-and-set) is confined to BbjServerService. java; the six call sites need no change since they already call the single restart() entry point that would gain the guard — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (guard restart() with an in-flight AtomicBoolean, or make the currently-unused scheduleRestart()/Alarm machinery the single entry point every caller uses): pass — (6) severity medium, dimension D2 (not D1): pass — test (4) alone fails, so classification is major.
effort:            4
dedup:             none — #410/#231 checked and dismissed. No frozen open issue names concurrent-restart races or the unused debounce infrastructure.
disposition:       major-refactor
proposed_approach: Guard restart() with an in-flight AtomicBoolean, or make the currently-unused scheduleRestart()/Alarm machinery the single entry point every caller uses. Note: contrary to this record's own evidence field, `BbjSettingsConfigurable.apply():83` has called `scheduleRestart()` since commit `35c916b`, predating the Phase 63 review — the guard must account for that existing call site rather than treating the debounce machinery as unused (Phase 67 close-out correction).
proposed_labels:   area=intellij; PRIO 2; effort 4
issue:             
```

```
id:                P63-D2-014
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java:117-184
dimension:         D2
secondary:         [D4]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace, contrasted against this same unit's own established pattern: BbjServerService.updateStatus() checks project.isDisposed() at entry (:93-95) and again inside every invokeLater lambda it schedules (:118-121,133-136, 149-152,160-163) before touching project.getMessageBus(). BbjJavaInteropService. checkConnection() (:117-160, runs on Alarm.ThreadToUse.POOLED_THREAD) and broadcastStatus() (:175-184) contain no project.isDisposed() check anywhere — broadcastStatus()'s invokeLater lambda (:176-183) calls project.getMessageBus(). syncPublisher(...) and EditorNotifications.getInstance(project). updateAllNotifications() (:177-182) unconditionally.
failure_scenario:  A health check already in flight on the pooled thread when the project begins disposing (dispose() at :202-205 only calls checkAlarm.cancelAllRequests(), which cancels queued-but-not-yet-running requests, not one already executing) completes after disposal has started and reaches broadcastStatus()'s invokeLater lambda, which calls project.getMessageBus()/EditorNotifications. getInstance(project) on a project that may already be disposed — a class of failure this same unit's own BbjServerService code already guards against at every equivalent call site.
classification:    major (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (add `if (project.isDisposed()) return;` at the top of checkConnection() and inside broadcastStatus()'s invokeLater lambda, mirroring BbjServerService's own pattern): pass — (6) severity low, dimension D2 (not D1): pass — test (4) alone fails, so classification is major.
effort:            2
dedup:             none — no frozen open issue names this dispose-ordering gap. #410/#231 also checked and dismissed.
disposition:       major-refactor
proposed_approach: Add `if (project.isDisposed()) return;` at the top of checkConnection() and inside broadcastStatus()'s invokeLater lambda, mirroring BbjServerService's own pattern.
proposed_labels:   area=intellij; PRIO 3; effort 2
issue:             
```

```
id:                P63-D2-015
unit:              RU-63-02
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjWordLexer.java:81-93,BbjParserDefinition.java:60-63,BbjPairedBraceMatcher.java:16-20
dimension:         D2
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction accompanies this record; a live keystroke-driven bracket-highlight harness is out of this static-trace sweep's scope): BbjWordLexer.advance()'s punctuation branch (:81-93) tokenizes '(' / ')' / '[' / ']' / '{' / '}' as BbjTokenTypes.LPAREN/RPAREN/LBRACKET/ RBRACKET/LBRACE/RBRACE unconditionally by character alone, with no notion of string-literal context anywhere in the class — a '"' character falls through to the SYMBOL default (:91) with no state change. BbjParserDefinition. getStringLiteralElements() (:60-63) returns TokenSet.EMPTY, confirming no PSI layer distinguishes string content either. BbjPairedBraceMatcher's isPairedBracesAllowedBeforeType (:27-32) unconditionally returns true, with no guard consulting any string-literal token set (there is none to consult).
failure_scenario:  A BBj line such as PRINT "value (not a bracket)" — a plain string literal containing parenthesis characters — has its two parens tokenized identically to real structural brackets by BbjWordLexer, so IntelliJ's bracket-matching highlight, Ctrl+Shift+M navigation, and auto-close-bracket behavior all treat them as a genuine matched pair inside the string, rather than inert string content. Any BBj source containing a bracket character inside a string literal (common in user-facing message text) triggers this.
classification:    major (1) touches 1 file: FAIL — a real fix needs a STRING_LITERAL IElementType in BbjTokenTypes.java, emission of it from BbjWordLexer.java's quote-scanning logic, registration in BbjParserDefinition.getStringLiteralElements(), and a context guard in BbjPairedBraceMatcher's isPairedBracesAllowedBeforeType — four files — (2) no public API/grammar/LSP change: pass (internal to the IntelliJ plugin only) — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists in bbj-intellij (P63-D5-001) — (5) reviewer can name the exact edit (add a quote-delimited scan branch to BbjWordLexer. advance(), emit a new STRING IElementType, wire it into getStringLiteralElements(), and guard isPairedBracesAllowedBeforeType against it): pass — (6) severity medium and dimension D2 (not D1): pass — two tests fail, so classification is major.
effort:            8
dedup:             none — #65 (tokenized BBj files), #381 (config.bbx highlighting) and #476 (starter programs) are this unit's named plausible neighbours; none addresses bracket-matching inside string literals. No other frozen open issue is closer.
disposition:       major-refactor
proposed_approach: Add a quote-delimited scan branch to BbjWordLexer. advance(), emit a new STRING IElementType, wire it into getStringLiteralElements(), and guard isPairedBracesAllowedBeforeType against it.
proposed_labels:   area=intellij; PRIO 2; effort 8
issue:             
```

```
id:                P63-D2-016
unit:              RU-63-02
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjCommenter.java:9-11
dimension:         D2
secondary:         [D7]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction; a live Ctrl+/-toggle harness is out of this static-trace sweep's scope): BbjCommenter.getLineCommentPrefix() (:9-11) returns the fixed literal "REM " (uppercase, one trailing space). bbj-vscode/src/language/bbj.langium:923's terminal COMMENT is explicitly case-insensitive: /([rR][eE][mM])(?![\w!$%@])([ \t][^\n\r]*)?([\n\r]+)?/ — any case combination of "rem" is a valid BBj comment marker. IntelliJ's platform toggle-line-comment action detects an "already commented" line by a literal prefix match against Commenter.getLineCommentPrefix()'s return value; no override anywhere in this 37-line file normalizes case before that comparison, and BbjParserDefinition.getCommentTokens() (:56-58) returns TokenSet.EMPTY, confirming there is no PSI-level comment token either that could let the platform's PSI-aware commenting path bypass the raw-text check.
failure_scenario:  A BBj source line beginning with lowercase or mixed-case "rem " (grammar-valid per bbj.langium:923, and BBj is case-insensitive per CLAUDE.md) is not recognized as already-commented when the user presses Ctrl+/ (Cmd+/) — IntelliJ inserts a second "REM " prefix instead of removing the existing one, producing "REM rem <original text>" rather than toggling the comment off.
classification:    major (1) touches 1 file: pass (confined to BbjCommenter.java, though the deeper fix may need a case-insensitive-aware Commenter implementation) — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (BbjCommenter.java:9-11 is the exact site; the fix direction is to make REM recognition case-insensitive, either via a lexer-level COMMENT token so the platform's PSI-aware commenting path applies instead of raw-text matching, or a custom case-insensitive commenter): pass — (6) severity medium, dimension D2 (not D1): pass — test (4) fails, so classification is major.
effort:            4
dedup:             none — #65, #381 and #476 (this unit's named neighbours) are unrelated; no frozen open issue names IntelliJ comment-toggle case sensitivity.
disposition:       major-refactor
proposed_approach: BbjCommenter.java:9-11 is the exact site; the fix direction is to make REM recognition case-insensitive, either via a lexer-level COMMENT token so the platform's PSI-aware commenting path applies instead of raw-text matching, or a custom case-insensitive commenter.
proposed_labels:   area=intellij; PRIO 2; effort 4
issue:             
```

```
id:                P63-D3-001
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java:148-164
dimension:         D3
secondary:         [D2]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace: bbjHomeField.getTextField().getDocument(). addDocumentListener(...) (:148-155) and nodeJsField.getTextField().getDocument(). addDocumentListener(...) (:157-164) both override textChanged(), firing on the Swing Event Dispatch Thread on every keystroke. The nodeJsField listener calls updateNodeVersionLabel() (:221-239), which — whenever `new File(nodePath).exists()` is true (:227) — calls BbjNodeDetector.getNodeVersion(nodePath) (:231), which spawns a `node --version` subprocess and blocks synchronously via ExecUtil.execAndReadLine (BbjNodeDetector.java:42-46) until the process returns, all on the EDT. The bbjHomeField listener calls updateClasspathDropdown() (:200-216) -> BbjSettings.getBBjClasspathEntries() (BbjSettings.java:74-100), a synchronous Files.readAllLines call, also on the EDT. Neither listener debounces or defers to a background thread.
failure_scenario:  Typing a Node.js executable path character-by-character in the Settings dialog spawns a subprocess synchronously on the EDT for every keystroke where the in-progress path happens to already exist as a file (e.g., typing over an existing valid path to correct it), freezing the entire Settings dialog for the duration of each spawn; the effect is worse on a slow filesystem, a network- mounted Node.js path, or a `node` shim with non-trivial startup overhead.
classification:    major (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (move getNodeVersion()/getBBjClasspathEntries() calls off the EDT via a debounced background task): pass — (6) severity `medium`, dimension D3 (not D1): pass — test (4) alone fails, so classification is `major` per D-13.
effort:            4
dedup:             none — no frozen open issue names EDT-blocking behaviour in the BBj settings panel.
disposition:       major-refactor
proposed_approach: Move getNodeVersion()/getBBjClasspathEntries() calls off the EDT via a debounced background task.
proposed_labels:   area=intellij; PRIO 2; effort 4
issue:             
```

```
id:                P63-D3-002
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:282-322,BbjRunBuiAction.java:81,BbjRunDwcAction.java:81
dimension:         D3
secondary:         [D2]
severity:          medium
evidence_tier:     repro
evidence:          Trace: BbjRunBuiAction/BbjRunDwcAction's buildCommandLine() calls validateTokenServerSide() (BbjRunActionBase.java:282-322) on every invocation, not only the first after a fresh login — a full second bbj-process spawn with a 10-second CapturingProcessHandler timeout, performed unconditionally in addition to the cheap client-side isTokenExpired() decode, with no cache field anywhere in this unit recording "validated at time T, trust until N."
failure_scenario:  Every "Run As BUI"/"Run As DWC" invocation redundantly re-spawns and re-waits on the server-side validation subprocess even when the token was validated seconds earlier by the previous run. Because (per P63-D2-004) this call happens synchronously on the EDT before the pooled-thread dispatch, each redundant validation directly extends that finding's per-click UI-freeze window, compounding rather than merely duplicating cost.
classification:    major (1) touches 1 file: pass (BbjRunActionBase.java, adding a short-lived cache field/timestamp) — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (cache the last-validated token value plus a timestamp and skip re-validation within a short trust window): pass — (6) severity medium, dimension D3 (not D1): pass — test (4) alone fails, so classification is major per D-13.
effort:            4
dedup:             none — no frozen open issue names redundant EM token validation round-trips.
disposition:       major-refactor
proposed_approach: Cache the last-validated token value plus a timestamp and skip re-validation within a short trust window.
proposed_labels:   area=intellij; PRIO 2; effort 4
issue:             
```

```
id:                P63-D3-003
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java:268-272,AddWindowComposerDialog.java:300-305,AddChildWindowComposerDialog.java:309-314
dimension:         D3
secondary:         []
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace (D-07): the identical inline SimpleDocumentListener record in all three dialogs calls refresh() synchronously from insertUpdate/removeUpdate/ changedUpdate with no Timer/Alarm/SingleAlarm/scheduled-executor anywhere in this unit (confirmed by grep across all 13 files) — every keystroke in any text field fires one full bbj/composer/*/preview LSP4IJ round trip, unlike the LS's own 500ms trailing-edge document-validation debounce named in CLAUDE.md.
failure_scenario:  Fast typing in message/title/assignTo (Msgbox) or any of the geometry/receiver fields (addWindow/addChildWindow) issues one LSP4IJ request per keystroke with no coalescing, each round trip updating the schematic/statement/summary fields on the EDT — a redundant-request cost that scales with typing speed rather than with actual settle points.
classification:    major (1) touches 1 file: FAIL — a shared debounce mechanism spans all three dialog files — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass (IntelliJ Platform's own Alarm/SingleAlarm utility is already available, no new library) — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (wrap each refresh() call in a shared debounce helper using com.intellij.util.Alarm): pass — (6) severity low, dimension D3 (not D1): pass — tests (1) and (4) fail, so classification is major.
effort:            4
dedup:             none — no frozen open issue names this missing debounce.
disposition:       major-refactor
proposed_approach: Wrap each refresh() call in a shared debounce helper using com.intellij.util.Alarm.
proposed_labels:   area=intellij; PRIO 3; effort 4
issue:             
```

```
id:                P63-D3-004
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:66-71,BbjComposerService.java:23-29
dimension:         D3
secondary:         []
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace (D-07): launch() calls BbjComposerService.server(project) (:66, itself re-resolving LanguageServerManager.start(SERVER_ID) plus a fresh getLanguageServer future every call) followed unconditionally by server.composerCatalogs() (:71) on every single composer-open invocation — the static option catalogs (button sets, icons, window/event flags) are module- level const arrays on the LS side that never change at runtime (confirmed against composer-commands.ts's catalogs handler, :52-57), yet nothing in this unit caches either the resolved server or the catalogs result across invocations within a session.
failure_scenario:  Every "Compose MSGBOX"/"Compose addWindow"/"Compose addChildWindow" invocation — not just the first one in a session — pays a server-resolution round trip plus a full catalogs round trip plus a decode round trip before the dialog appears, even though the catalogs contents are identical to the previous invocation's.
classification:    major (1) touches 1 file: pass (a session-scoped cache field on ComposerLauncher or a small holder class confines the change) — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (cache the resolved BbjComposerServer/ComposerCatalogs per project, invalidated on LS restart): pass — (6) severity low, dimension D3 (not D1): pass — test (4) alone fails, so classification is major.
effort:            4
dedup:             none — no frozen open issue names this redundant catalogs/server refetch.
disposition:       major-refactor
proposed_approach: Cache the resolved BbjComposerServer/ComposerCatalogs per project, invalidated on LS restart.
proposed_labels:   area=intellij; PRIO 3; effort 4
issue:             
```

```
id:                P63-D3-005
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java:93-96,109-111,117-160
dimension:         D3
secondary:         []
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace: startChecking() (:93-96) is invoked once, when the language-server status first transitions to started (the message-bus subscription at :67-77), and thereafter scheduleNextCheck() (:109-111) unconditionally re-arms checkAlarm.addRequest(this::checkConnection, CHECK_INTERVAL_MS) (:110, every 5000ms) at the end of every checkConnection() run (:159) — with no check anywhere in this file for whether a BBj file is currently open (that gating exists only in the two status-bar widgets' own updateVisibility(), a display concern — see P63-D2-011) or whether the IDE window currently has focus. The only two states that stop the alarm are stopChecking() (:102-104, called only when the LS status itself becomes stopped/stopping) and dispose() (:203-205, project close).
failure_scenario:  Once the language server has started, this unit performs a TCP connect attempt against the configured java-interop host:port every 5 seconds indefinitely — for the lifetime of the project — even while every open editor tab is a non-BBj file (the status widget itself is hidden per its own visibility check) and even while the IDE window is minimized or in the background, since neither condition is checked anywhere in the scheduling loop. The settings re-read on every tick (BbjSettings.getInstance().getState(), :119) is a stated, deliberate design trade-off ("not cached - user may change them") rather than a defect, so this finding is scoped to the missing visibility/focus gating only.
classification:    major (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (gate scheduleNextCheck()/startChecking() on whether a BBj file is currently open, mirroring the widgets' own updateVisibility() check, or on project-frame focus/idle state): pass — (6) severity low, dimension D3 (not D1): pass — test (4) alone fails, so classification is major.
effort:            2 (revised 2026-08-18: recorded as 3, off INVENTORY §3d's locked {2,4,8} scale. Rounded DOWN to the nearest legal value so the finding remains labellable for ISSUE-03, which uses the effort value as the label with no translation step. Rounding down rather than up preserves the reviewer's evident intent — 3 was chosen to mean 'below the 4 bucket'. Original value retained here.)
dedup:             none — #410/#231 checked and dismissed. No frozen open issue names java-interop poll cadence/gating.
disposition:       major-refactor
proposed_approach: Gate scheduleNextCheck()/startChecking() on whether a BBj file is currently open, mirroring the widgets' own updateVisibility() check, or on project-frame focus/idle state.
proposed_labels:   area=intellij; PRIO 3; effort 2
issue:             
```

```
id:                P63-D3-006
unit:              RU-63-02
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjTextMateBundleProvider.java:27-48
dimension:         D3
secondary:         [D2]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction; observing this across multiple real IDE restarts is out of this static-trace sweep's scope): getBundles() (:27-48) calls Files.createTempDirectory(Path.of(PathManager. getTempPath()), "textmate-bbj") (:29-30) — a freshly, uniquely named directory — on every invocation, then re-copies all five BUNDLE_FILES (:17-23) into it from this plugin's own bundled resources, with no check for a prior valid copy and no caching of a stable target path. No call anywhere in this file deletes bundleDir, registers a shutdown hook, or calls File.deleteOnExit() on it or its contents.
failure_scenario:  Every IDE process that loads this plugin's TextMate bundle (at minimum once per IDE launch, given the bundleProvider extension point is application-scoped) allocates a new "textmate-bbjXXXXXXXX"-named temp directory and re-copies five small files into it, and never removes the directory created by any prior launch — repeated launches accumulate abandoned directories in the plugin's temp path with no cleanup path in this code.
classification:    major (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (cache bundleDir in a stable location, mirroring RU-63-03's own getNodeDataDirectory() pattern, and skip the copy loop when a valid prior copy is already present): pass — (6) severity low, dimension D3 (not D1): pass — test (4) fails, so classification is major.
effort:            4
dedup:             none — #65, #381 and #476 are unrelated; no frozen open issue names this temp-directory accumulation.
disposition:       major-refactor
proposed_approach: Cache bundleDir in a stable location, mirroring RU-63-03's own getNodeDataDirectory() pattern, and skip the copy loop when a valid prior copy is already present.
proposed_labels:   area=intellij; PRIO 3; effort 4
issue:             
```

```
id:                P63-D3-007
unit:              RU-63-02
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java:28-59
dimension:         D3
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction; a live per-editor-pass process-spawn count is out of this static-trace sweep's scope): collectNotificationData (:28-59) is invoked by the platform's EditorNotificationProvider framework on every file/editor open and every EditorNotifications.updateAllNotifications() refresh. When nodeJsPath is explicitly configured (:39-44) or during PATH auto-detection (:46-52), both branches call BbjNodeDetector.getNodeVersion(...) (:42, :50), which constructs a GeneralCommandLine(nodePath, "--version") and blocks on ExecUtil.execAndReadLine(cmd) — a real child-process spawn — with no field, cache, or debounce anywhere in this class remembering the last result across calls.
failure_scenario:  For any user with a configured or auto-detectable Node.js path (the common case), every editor-notification refresh pass — not just the first per session — spawns a fresh "node --version" child process and blocks on its output before the banner can be suppressed or shown, redundant work on a path that runs far more often than a one-time startup check.
classification:    major (1) touches 1 file: pass (a cache field in this class, keyed by path, is sufficient) — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (cache the last known-good version result per path, invalidated on settings change): pass — (6) severity medium, dimension D3 (not D1): pass — test (4) fails, so classification is major.
effort:            4
dedup:             none — #65, #381 and #476 are unrelated; no frozen open issue names redundant Node.js version-check spawning.
disposition:       major-refactor
proposed_approach: Cache the last known-good version result per path, invalidated on settings change.
proposed_labels:   area=intellij; PRIO 2; effort 4
issue:             
```

```
id:                P63-D4-002
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java:30,107,111,116,150
dimension:         D4
secondary:         [D2]
severity:          low
evidence_tier:     trace
evidence:          Mechanical grep check for the literal `5008` across the unit's settings files: BbjSettings.java:30 (`public int javaInteropPort = 5008;`), :107 (Javadoc), :111, :116, :150 (three `return 5008;` default branches); BbjSettingsComponent.java:119 (`javaInteropPortField.setText("5008")`), :125, :297, :302 (comments/`return 5008` defaults); BbjSettingsConfigurable.java:131 (`if (javaInteropPort == 5008)`), :136 (`if (detected != 5008)`) — 3 files, no shared named constant (e.g. a `DEFAULT_JAVA_INTEROP_PORT` field) anywhere.
failure_scenario:  n/a (D4 is a code-shape finding) — if the default java-interop port is ever changed (matching a future language-server default), every one of these sites across 3 files needs a coordinated, hand-synchronized edit; missing one leaves an inconsistent default between the UI's placeholder text, the persisted state's default, and the Configurable's "was this ever changed from default" check used by P63-D2-002's auto-detection gate — silently reintroducing or compounding that finding.
classification:    major (1) touches 1 file: FAIL — a shared constant used consistently requires editing all 3 files that currently hardcode the literal — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression- testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (introduce BbjSettings.DEFAULT_JAVA_INTEROP_PORT and reference it from all 3 files): pass — (6) severity `low`, dimension D4 (not D1): pass — test (1) and test (4) both fail, so classification is `major` per D-13.
effort:            2
dedup:             none — no frozen open issue names this literal-duplication gap.
disposition:       major-refactor
proposed_approach: Introduce BbjSettings.DEFAULT_JAVA_INTEROP_PORT and reference it from all 3 files.
proposed_labels:   area=intellij; PRIO 3; effort 2
issue:             
```

```
id:                P63-D4-003
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:231-248,256-272,BbjEMLoginAction.java:158-168
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Mechanical structural comparison: getWebBbjPath()/getEmValidateBbjPath() (BbjRunActionBase.java) and getEMLoginBbjPath() (BbjEMLoginAction.java) each: resolve PluginId.getId("com.basis.bbj") -> PluginManager.getInstance(). findEnabledPlugin(...) -> null-check -> plugin.getPluginPath().resolve( "lib/tools/<name>") -> Files.exists() check -> return path-or-null, wrapped in try/catch(Exception) returning null; differing only in the target filename and minor null-check ordering. No shared helper for "resolve a plugin-bundled tool script path" exists anywhere in this unit.
failure_scenario:  n/a (D4 is a code-shape finding) — any future change to the plugin-ID lookup or bundling convention (e.g. supporting a second plugin ID for a rebrand, or changing the lib/tools/ layout) must be applied at three separate sites by hand across two files, with drift risk between them.
classification:    major (1) touches 1 file: FAIL — a shared helper used consistently spans BbjRunActionBase.java and BbjEMLoginAction.java — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: satisfied vacuously per D-09 — extracting a shared resolveToolPath(String filename) helper changes no runtime behaviour — (5) reviewer can name the exact edit (add a small static helper and delegate all three call sites to it): pass — (6) severity low, dimension D4 (not D1): pass — test (1) alone fails, so classification is major per D-13.
effort:            4
dedup:             none — no frozen open issue names this duplication.
disposition:       major-refactor
proposed_approach: Add a small static helper and delegate all three call sites to it.
proposed_labels:   area=intellij; PRIO 3; effort 4
issue:             
```

```
id:                P63-D4-004
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java,BbjRunDwcAction.java
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          git diff --no-index --numstat BbjRunBuiAction.java BbjRunDwcAction.java -> 11 11 (11 of 142 lines differ per file — the "BUI"/"DWC" client-type literal, three user-facing message strings, the constructor's display text/icon, and getRunMode()'s return value; the remaining 131 lines, including the entire EM-login/token-validation/classpath/config-path/command-line-assembly flow, are byte-for-byte identical between the two files).
failure_scenario:  n/a (D4 is a code-shape finding) — any future fix to the shared BUI/DWC flow (e.g. the P63-D2-004 EDT-blocking fix, or a classpath-handling change) must be applied identically in two files by hand, with drift risk if one copy is updated and the other missed.
classification:    major (1) touches 1 file: FAIL — collapsing the duplication into BbjRunActionBase (e.g. a protected abstract getClientType() plus a shared buildWebCommandLine(clientType, ...) method) touches BbjRunActionBase.java, BbjRunBuiAction.java and BbjRunDwcAction.java — 3 files — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression- testable with existing harness: satisfied vacuously per D-09 — a pure structural refactor changes no runtime behaviour — (5) reviewer can name the exact edit (introduce a getClientType() abstract method and move the shared body up to BbjRunActionBase): pass — (6) severity low, dimension D4 (not D1): pass — test (1) alone fails, so classification is major per D-13.
effort:            4
dedup:             none — no frozen open issue names BUI/DWC action duplication.
disposition:       major-refactor
proposed_approach: Introduce a getClientType() abstract method and move the shared body up to BbjRunActionBase.
proposed_labels:   area=intellij; PRIO 3; effort 4
issue:             
```

```
id:                P63-D4-005
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeAddChildWindowAction.java,BbjComposeAddWindowAction.java,BbjComposeMsgboxAction.java
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Pairwise git diff --no-index --numstat: AddChildWindow vs AddWindow -> 4 4 (4 of 38 lines differ: class doc, class name, the Kind enum constant); AddWindow vs Msgbox -> 5 5 (5 of 38 differ, same shape). All three share an identical structure: null-guard project/editor in update(), delegate to ComposerLauncher.launch(project, editor, Kind.X) in actionPerformed(), declare ActionUpdateThread.BGT — differing only in the Kind constant and doc text.
failure_scenario:  n/a (D4 is a code-shape finding) — three files exist purely to supply one differing enum constant to a shared call; a fourth composer kind would add a fourth near-identical file rather than a single data-driven registration.
classification:    major (1) touches 1 file: FAIL — collapsing three files into one parametrized action (or a shared abstract base each subclasses with one overridden Kind) touches all three files at minimum — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: satisfied vacuously per D-09 — a structural refactor changes no runtime behaviour — (5) reviewer can name the exact edit (a single BbjComposeAction(Kind) constructed three times in plugin.xml via constructor-arg registration, replacing three Java files with one): pass — (6) severity low, dimension D4 (not D1): pass — test (1) alone fails, so classification is major per D-13.
effort:            4
dedup:             none — no frozen open issue names composer-action duplication.
disposition:       major-refactor
proposed_approach: A single BbjComposeAction(Kind) constructed three times in plugin.xml via constructor-arg registration, replacing three Java files with one.
proposed_labels:   area=intellij; PRIO 3; effort 4
issue:             
```

```
id:                P63-D4-006
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:250-272,282-322
dimension:         D4
secondary:         [D1]
severity:          low
evidence_tier:     trace
evidence:          Structural check — at 423 lines, BbjRunActionBase carries action enablement, settings-derived path/argument resolution, auto-save, process launch and output listening, logging helpers, and — the piece most notably out of place — EM server-side token validation (validateTokenServerSide, getEmValidateBbjPath), a responsibility that otherwise lives entirely alongside BbjEMTokenStore.java (client-side expiry decode, PasswordSafe storage) and BbjEMLoginAction.java (the login round-trip that issues the token in the first place); the run-action base class is not where a reader would expect to find the third leg of the EM-token lifecycle.
failure_scenario:  n/a (D4 is a code-shape finding) — a future change to EM token validation (e.g. fixing P63-D1-004's fail-open decoder, or adding a cached-validation window per P63-D3-002) must touch a "run action" file even though the change is conceptually about EM token handling, and a reader auditing BbjEMTokenStore.java/BbjEMLoginAction.java for the full EM lifecycle would miss this third piece without already knowing to look in BbjRunActionBase.java.
classification:    major (1) touches 1 file: FAIL — moving validateTokenServerSide()/ getEmValidateBbjPath() to a new or existing EM-token-adjacent class touches BbjRunActionBase.java plus the destination file — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — the moved method's call sites in BbjRunBuiAction.java/BbjRunDwcAction.java would need updating too, and no src/test/ source set exists to catch a mistake (P63-D5-001) — (5) reviewer can name the exact edit (move validateTokenServerSide()/getEmValidateBbjPath() to a static method on or beside BbjEMTokenStore, updating the two call sites): pass — (6) severity low, dimension D4 (not D1): pass — tests (1) and (4) fail, so classification is major per D-13.
effort:            4
dedup:             none — no frozen open issue names this class-responsibility placement.
disposition:       major-refactor
proposed_approach: Move validateTokenServerSide()/getEmValidateBbjPath() to a static method on or beside BbjEMTokenStore, updating the two call sites.
proposed_labels:   area=intellij; PRIO 3; effort 4
issue:             
```

```
id:                P63-D4-007
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java,AddChildWindowComposerDialog.java
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Mechanical structural comparison: git diff --no-index --numstat AddWindowComposerDialog.java AddChildWindowComposerDialog.java -> 37 28 (37 of 306 lines removed, 28 of 315 added — roughly 88%/85% of each file byte-identical to the other). Shared verbatim or near-verbatim: refresh()/apply()/selected()/ setSelected()/preselect()/addGroupedChecks()/setEnabledRecursive()/labeled(), the eventEnabled/eventPanel wiring, and the whole createCenterPanel() layout shape. Differs only in the field set (receiver+sysgui vs. receiver+window+id+context+title), the schematic-panel field type, and the server RPC method names.
failure_scenario:  n/a (D4 is a code-shape finding) — any future fix to the shared addWindow-family flow (e.g. P63-D2-010's stale-range revalidation, or P63-D3-003's debounce) must be applied identically in two files by hand, with drift risk if one copy is updated and the other missed.
classification:    major (1) touches 1 file: FAIL — collapsing the duplication (e.g. a shared abstract base parametrized by field set and Kind) touches AddWindowComposerDialog.java and AddChildWindowComposerDialog.java at minimum — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: satisfied vacuously per D-09 — a pure structural refactor changes no runtime behaviour — (5) reviewer can name the exact edit (extract a shared AddWindowFamilyComposerDialog base carrying refresh/apply/selected/ setSelected/preselect/addGroupedChecks/setEnabledRecursive/labeled, with the two concrete classes supplying only their distinct field set and RPC calls): pass — (6) severity low, dimension D4 (not D1): pass — test (1) alone fails, so classification is major.
effort:            8
dedup:             none — checked #385 and #475 explicitly; neither names this dialog duplication.
disposition:       major-refactor
proposed_approach: Extract a shared AddWindowFamilyComposerDialog base carrying refresh/apply/selected/ setSelected/preselect/addGroupedChecks/setEnabledRecursive/labeled, with the two concrete classes supplying only their distinct field set and RPC calls.
proposed_labels:   area=intellij; PRIO 3; effort 8
issue:             
```

```
id:                P63-D4-008
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureMsgboxIntention.java,ConfigureAddWindowIntention.java,ConfigureAddChildWindowIntention.java
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Pairwise git diff --no-index --numstat: ConfigureMsgboxIntention.java vs ConfigureAddWindowIntention.java -> 9 8 (40 of 49 lines identical); ConfigureAddWindowIntention.java vs ConfigureAddChildWindowIntention.java -> 7 7 (43 of 50 identical). All three share an identical isAvailable()/invoke()/ startInWriteAction()/generatePreview() shape — differing only in getText()'s display string, the ComposerLauncher.Kind constant passed to launch(), and the keyword string passed to isCaretOnCall().
failure_scenario:  n/a (D4 is a code-shape finding) — three files exist purely to supply one differing display string, Kind constant and keyword to a shared call; a fourth composer form would add a fourth near-identical file rather than a single data-driven registration.
classification:    major (1) touches 1 file: FAIL — collapsing three files into one parametrized IntentionAction (or a shared abstract base each subclasses with three overridden strings/Kind) touches all three files at minimum — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: satisfied vacuously per D-09 — a structural refactor changes no runtime behaviour — (5) reviewer can name the exact edit (a single ConfigureComposerIntention(String text, Kind kind, String keyword) constructed three times via plugin.xml constructor-arg registration, mirroring RU-63-01's own P63-D4-005 disposition for the analogous three BbjCompose*Action files): pass — (6) severity low, dimension D4 (not D1): pass — test (1) alone fails, so classification is major.
effort:            4
dedup:             none — no frozen open issue names this intention-action duplication.
disposition:       major-refactor
proposed_approach: A single ConfigureComposerIntention(String text, Kind kind, String keyword) constructed three times via plugin.xml constructor-arg registration, mirroring RU-63-01's own P63-D4-005 disposition for the analogous three BbjCompose*Action files.
proposed_labels:   area=intellij; PRIO 3; effort 4
issue:             
```

```
id:                P63-D4-009
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxSchematicPanel.java:166-179,WindowSchematicPanel.java:118-131,ChildWindowSchematicPanel.java:145-158,MsgboxComposerDialog.java:257-262,AddWindowComposerDialog.java:181-188,274-279,AddChildWindowComposerDialog.java:185-192,283-288
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Extracted-method diff: the 14-line private static clip(Graphics2D, String, int) helper is duplicated near-verbatim across all three *SchematicPanel.java files (WindowSchematicPanel.java and ChildWindowSchematicPanel.java are byte-for-byte identical; MsgboxSchematicPanel.java differs only in a local-variable-vs- inline-call style choice). The 6-line private static labeled(String, JComponent) helper is byte-for-byte identical across all three dialog files. The private static setEnabledRecursive(JComponent, boolean) helper is byte-for-byte identical between AddWindowComposerDialog.java and AddChildWindowComposerDialog.java. None of these three small helpers has a shared home anywhere in the composer/ package.
failure_scenario:  n/a (D4 is a code-shape finding) — a future fix to clip()'s ellipsis-truncation logic, or to labeled()'s layout, must be applied at three (or two) separate sites by hand, with drift risk between them; this is a smaller-granularity instance of the same "no shared composer/ utility" pattern P63-D4-007/008 record at the file level.
classification:    major (1) touches 1 file: FAIL — extracting a shared utility class (e.g. a package-private ComposerSwingUtil with clip()/labeled()/setEnabledRecursive()) touches at least the three schematic panels and three dialog files — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: satisfied vacuously per D-09 — a pure structural extraction changes no runtime behaviour — (5) reviewer can name the exact edit (add a small static-only ComposerSwingUtil class in composer/ and delegate all six call sites to it): pass — (6) severity low, dimension D4 (not D1): pass — test (1) alone fails, so classification is major.
effort:            4
dedup:             none — no frozen open issue names this small-helper duplication.
disposition:       major-refactor
proposed_approach: Add a small static-only ComposerSwingUtil class in composer/ and delegate all six call sites to it.
proposed_labels:   area=intellij; PRIO 3; effort 4
issue:             
```

```
id:                P63-D4-010
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjCompletionFeature.java,bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java:8-12,40-65,bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java:8-9,18,bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java:11,28,bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:19-20,208-210,bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java:10,bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java:14
dimension:         D4
secondary:         []
severity:          medium
evidence_tier:     trace
evidence:          Measured, not assumed: `grep -rn "ApiStatus.Experimental\|@Experimental" bbj-intellij/src/main/java` -> zero matches anywhere in this repository's own source. `grep -rln "com.redhat.devtools.lsp4ij" bbj-intellij/src/main/java` -> 20 references across 11 files (measured correction to this phase's own planning-document figure of "10 files"): BbjCompileAction.java, BbjRefreshJavaClassesAction.java, BbjRunActionBase.java (RU-63-01's files), BbjComposerService.java (RU-63-04's file), and this unit's own 7 — BbjCompletionFeature.java, BbjLanguageClient.java, BbjLanguageServerFactory.java, BbjLanguageServer.java, BbjJavaInteropService.java, BbjServerService.java, BbjStatusBarWidget.java. PROJECT.md's "19 experimental API usages" figure counts APIs LSP4IJ itself marks experimental on its own side — not greppable from this tree, neither confirmed nor refuted here per D-13's prohibition on asserting an unmeasured count. This unit is where the coupling concentrates: BbjCompletionFeature extends LSPCompletionFeature (subclassing, overriding getIcon()) — PROJECT.md's own named coupling of concern; BbjLanguageServerFactory implements LanguageServerFactory and returns an anonymous LSPClientFeatures with a nested LSPDocumentLinkFeature override (:41-64); BbjLanguageClient extends LanguageClientImpl overriding createSettings()/handleServerStatusChanged (ServerStatus); BbjLanguageServer extends OSProcessStreamConnectionProvider; BbjServerService/BbjJavaInteropService/BbjStatusBarWidget consume the ServerStatus enum and LanguageServerManager's start(String)/stop(String) id-based API as plain values/static lookups, not subclassed — the narrowest coupling form of the set.
failure_scenario:  n/a (D4 is a code-shape finding, not a runtime failure scenario) — a breaking signature or semantics change to LSPCompletionFeature.getIcon(), LSPClientFeatures's builder chain, LanguageClientImpl. handleServerStatusChanged(), or OSProcessStreamConnectionProvider's constructor contract in a future LSP4IJ release would surface as a compile failure or a silent behaviour change across this unit's 7 files at plugin-update time, with no regression test anywhere in this module (P63-D5-001) to catch a silent one before release.
classification:    major (1) touches 1 file: n/a — this record documents an existing coupling surface, not a proposed fix — (2) no public API/grammar/LSP change: pass — (3) no new dependency: n/a — records an existing dependency's coupling shape, adds nothing — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit: n/a at this recording stage — Phase 66 owns DEBT-05's re-triage and any contract-test authoring, not a single named edit from this unit's evidence alone — (6) severity medium, dimension D4 (not D1): pass — tests (4) and (5) both fail/n/a, so classification is major.
effort:            4
dedup:             DEBT-05 — this is the phase's designated DEBT-05 evidence record; Phase 66 re-triages it, not re-derives it. #410 and #231 also checked explicitly and dismissed as unrelated to LSP4IJ API coupling.
disposition:       major-refactor
proposed_approach: P66-D4-001 supersedes this record — its own `dedup:` states so directly. It re-triages this same coupling-shape evidence with a live jar measurement (the nine-row `RuntimeInvisibleAnnotations -> ApiStatus$Experimental` annotation table against the cached `lsp4ij-0.19.0.jar`) and names its own approach: a new `bbj-intellij/src/test/` source set exercising `BbjCompletionFeature.java` and `BbjLanguageServerFactory.java`, currently blocked by the same JDK toolchain gap `P63-D6-002` records. An implementer should read `P66-D4-001` as the live record for this coupling surface; this block stays in the document as the phase's designated DEBT-05 evidence handoff, not collapsed into its successor.
proposed_labels:   area=intellij; PRIO 2; effort 4
issue:             
```

```
id:                P63-D4-011
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java,bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java,bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetFactory.java,bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidgetFactory.java
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Mechanical structural comparison, per the plan's required method: `git diff --no-index --numstat BbjStatusBarWidget.java BbjJavaInteropStatusBarWidget.java` -> `25  41` (25 of 167 lines removed, 41 of 151 added — roughly 85%/73% of each file's structure shared: the panel/ iconLabel/textLabel construction, the MouseAdapter/showPopupMenu wiring, the messageBusConnection subscribe/disconnect lifecycle, and the identical updateVisibility() method body appear near-verbatim in both, differing only in the subscribed Topic, the status-enum switch's icon/text mapping, and the popup menu's item labels). `git diff --no-index --numstat BbjStatusBarWidgetFactory.java BbjJavaInteropStatusBarWidgetFactory.java` -> `5  5` (5 of 43 lines differing in each — the id string, display name, and constructed widget type only; isAvailable(), disposeWidget(), and canBeEnabledOn() are byte-for-byte identical). No shared abstract base class or helper exists for either pair anywhere in the ui/ package.
failure_scenario:  n/a (D4 is a code-shape finding) — any future change to the shared widget shape (the popup-menu wiring pattern, the visibility-by-file-extension check whose own staleness bug is P63-D2-011, or the StatusBarWidgetFactory boilerplate) must be hand-applied to both members of each pair, with drift risk between them — exactly the mechanism by which P63-D2-011's visibility-staleness bug is present identically in both widgets today.
classification:    major (1) touches 1 file: FAIL — extracting a shared base spans at least 4 files — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (extract a shared base class/factory parameterized by Topic type, icon/text mapping function, and popup-menu item list): pass — (6) severity low, dimension D4 (not D1): pass — tests (1) and (4) both fail, so classification is major.
effort:            4
dedup:             none — #410 and #231 checked explicitly and dismissed. No frozen open issue names status-bar widget/factory duplication.
disposition:       major-refactor
proposed_approach: Extract a shared base class/factory parameterized by Topic type, icon/text mapping function, and popup-menu item list.
proposed_labels:   area=intellij; PRIO 3; effort 4
issue:             
```

```
id:                P63-D4-012
unit:              RU-63-02
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjColorSettingsPage.java:29-66,74-92
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Trace (D4 is a trace-tier dimension — nothing to run): the nine TextAttributesKey constants (:29-54) and the DESCRIPTORS array built from them (:56-66) are the entire content of the Settings > Color Scheme customization page for BBj. getHighlighter() (:74-92) returns an anonymous SyntaxHighlighter whose getHighlightingLexer() is EmptyLexer and whose getTokenHighlights() always returns TextAttributesKey.EMPTY_ARRAY — no token type is ever mapped to any of the nine keys. The class's own comment (:20-23) discloses this: "Currently, the actual editor highlighting uses TextMate... User overrides in this page will become fully active when semantic tokens are added in Phase 4."
failure_scenario:  A user who opens Settings > Editor > Color Scheme > BBj and customizes any of the nine listed colors (Keyword, String, Line comment, Block comment, Number, Function call, Operator, Identifier, String escape) observes no change in the editor at all, since the actual highlighting is driven entirely by the TextMate engine, which never consults these keys — the customization UI is currently fully inert.
classification:    major (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001), and either resolution (wire the keys to a real highlighter, or gate/remove the page until one exists) changes visible Settings-UI or editor behaviour, so this does not satisfy D-09's vacuous-pass exception — (5) reviewer can name the exact edit (either wire these keys into a real TextMate-to-TextAttributesKey mapping now, or note in the UI/comment that the page is inert pending the semantic-token milestone referenced in :20-23): pass — (6) severity low, dimension D4 (not D1): pass — test (4) fails, so classification is major.
effort:            4
dedup:             none — #65, #381 and #476 are unrelated; no frozen open issue names this inert color-customization page.
disposition:       major-refactor
proposed_approach: Either wire these keys into a real TextMate-to-TextAttributesKey mapping now, or note in the UI/comment that the page is inert pending the semantic-token milestone referenced in :20-23.
proposed_labels:   area=intellij; PRIO 3; effort 4
issue:             
```

```
id:                P63-D4-013
unit:              RU-63-02
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjJavaInteropNotificationProvider.java:22-57,BbjMissingHomeNotificationProvider.java:21-55,BbjMissingNodeNotificationProvider.java:25-76
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Trace, mechanical basis per this task's own instruction: git diff --no-index --numstat confirms the pairwise overlap rather than an eyeball estimate — BbjJavaInteropNotificationProvider.java (57 lines) vs BbjMissingHomeNotificationProvider.java (55 lines): 14 insertions/16 deletions (roughly 39-41 shared lines); vs BbjMissingNodeNotificationProvider.java (76 lines): 37/18; BbjMissingHomeNotificationProvider.java vs BbjMissingNodeNotificationProvider.java: 36/15. The shared skeleton across all three (package/imports, the `file.getFileType() != BbjFileType.INSTANCE` guard, and single- or multi-action EditorNotificationPanel construction via fileEditor -> { ... }) is not extracted into any shared base class, abstract method, or static helper anywhere in this unit.
failure_scenario:  n/a in the sense that D4 is a maintainability finding, not a runtime failure — each of the three providers independently re-implements the same guard-then-construct-panel shape, so a future change to that shape (e.g. adding a fifth notification-suppression condition common to all banners) must be applied correctly in three separate places, with no compiler-enforced consistency.
classification:    major (1) touches 1 file: FAIL — extracting the shared skeleton necessarily touches all three provider files plus a new shared base/helper — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (extract a small abstract base class or static helper for the file-type guard plus panel construction, parameterized by message text and actions): pass — (6) severity low, dimension D4 (not D1): pass — two tests fail, so classification is major.
effort:            4
dedup:             none — #65, #381 and #476 are unrelated; no frozen open issue names this notification-provider duplication.
disposition:       major-refactor
proposed_approach: Extract a small abstract base class or static helper for the file-type guard plus panel construction, parameterized by message text and actions.
proposed_labels:   area=intellij; PRIO 3; effort 4
issue:             
```

```
id:                P63-D5-001
unit:              RU-63-03
location:          bbj-intellij/build.gradle.kts
dimension:         D5
secondary:         []
severity:          medium
evidence_tier:     inherited
evidence:          Established by enumeration, not assumption: `ls bbj-intellij/src/` -> `main` (only). `grep -rn "test" bbj-intellij/build.gradle.kts` -> no matches (no test dependency declared, no test task configured). bbj-intellij has no test source set at all — the systemic fact this finding records once for the whole phase (D-08); the other four Phase 63 units' own D5 cells cross-reference this ID by number rather than restating the enumeration.
failure_scenario:  Every RU-63-03 behaviour recorded above — the download/extract/cache pipeline (P63-D1-001/002, P63-D6-001/002), the cache-availability/port-auto-detect/ concurrent-download correctness gaps (P63-D2-001/002/003), and the EDT- blocking UI behaviour (P63-D3-001) — ships and regresses silently: there is no harness in this module that would fail if any of it broke.
classification:    major (1) touches 1 file: n/a — this finding *is* the missing-test-infrastructure gap itself, not a behaviour fix — (2) no public API/grammar/LSP change: pass — (3) no new dependency: FAIL by D-13's own accounting for this class of finding — establishing a JVM test source set requires adding a test framework dependency (e.g. JUnit) to build.gradle.kts, which is itself a new dependency — (4) regression-testable with the existing harness, no new test infrastructure: FAIL by definition — adding a src/test/ source set *is* new test infrastructure (D-09's primary reading) — (5) reviewer can name the exact edit (add a `sourceSets.test`/JUnit dependency block to build.gradle.kts and author a first test class): pass — (6) severity `medium`, dimension D5 (not D1): pass — tests (3) and (4) both fail, so classification is `major` per D-13.
effort:            8
dedup:             none — no frozen open issue names bbj-intellij's absent test infrastructure.
disposition:       major-refactor
proposed_approach: Add a `sourceSets.test`/JUnit dependency block to build.gradle.kts and author a first test class.
proposed_labels:   area=intellij; PRIO 2; effort 8
issue:             
```

```
id:                P63-D6-001
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:34
dimension:         D6
secondary:         []
severity:          medium
evidence_tier:     inherited
evidence:          Version/advisory claim (repro-equivalent per INVENTORY 3b): NODE_VERSION = "v20.18.1" (:34). Verified live against nodejs.org's own release index (https://nodejs.org/dist/index.json, queried at sweep time): v20.18.1 released 2024-11-20, lts: "Iron", security: false (not itself a security release). The official nodejs/Release schedule.json's v20 block: lts 2023-10-24, maintenance 2024-10-22, end 2026-04-30 — end-of-life has already passed as of this sweep (2026-08-18). The same index.json lists 5 later v20.x releases flagged security: true that post-date v20.18.1: v20.18.2 (2025-01-21), v20.19.2 (2025-05-14), v20.19.4 (2025-07-15), v20.20.0 (2026-01-12), v20.20.2 (2026-03-24, the v20 line's own final release). This is the advisory reference this cell's tier requires: nodejs.org's own release-index security flags, not a full per-CVE enumeration (out of this cell's scope per D-10's boundary).
failure_scenario:  Every install of this plugin downloads and executes a Node.js runtime build that is, as of sweep time, past its own upstream end-of-life and missing at least 5 releases nodejs.org itself flagged as security fixes — the plugin has no mechanism to pick up any of those fixes short of a plugin-code change to the pinned constant and a new plugin release.
classification:    major (1) touches 1 file: pass (the pin is a single constant) — (2) no public API/grammar/LSP change: pass — (3) no new dependency: n/a — this is a version bump of an existing pinned artifact, not a new dependency addition — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit (bump NODE_VERSION to a current, in-support v20.x or later LTS release and verify the download filename/checksum shape is unchanged): pass — (6) severity `medium`, dimension D6 (not D1): pass — test (4) alone fails, so classification is `major` per D-13.
effort:            4
dedup:             none — no frozen open issue names the pinned Node.js runtime version.
disposition:       major-refactor
proposed_approach: Bump NODE_VERSION to a current, in-support v20.x or later LTS release and verify the download filename/checksum shape is unchanged.
proposed_labels:   area=dependencies; PRIO 2; effort 4
issue:             
```

```
id:                P63-D6-002
unit:              RU-63-03
location:          bbj-intellij/build.gradle.kts:12-13
dimension:         D6
secondary:         []
severity:          medium
evidence_tier:     inherited
evidence:          Routed item (INVENTORY.md Routing table, D-06): build.gradle.kts:12-13 reads `sourceCompatibility = JavaVersion.VERSION_17` / `targetCompatibility = JavaVersion.VERSION_17` (confirmed by reading the file). The local JDK is Temurin 25.0.3 (`java -version` in this environment). `cd bbj-intellij && ./gradlew --offline -q tasks` fails in ~5s with the literal output `FAILURE: Build failed with an exception. * What went wrong: 25.0.3`, before task listing — an environment/toolchain rejection, not a code defect in the build script's stated target (D-07 — no Gradle task was scheduled or run beyond this one confirmatory invocation, which itself failed before doing any work). THIS FINDING'S location: IS bbj-intellij/build.gradle.kts:12-13, A FILE INVENTORY ASSIGNS TO RU-64-02 FOR EVERY OTHER DIMENSION — THE PHASE'S ONE DELIBERATE location: EXCEPTION (D-10), RECORDED HERE BECAUSE RU-63-03/D6 IS THE PHASE'S ONLY LIVE D6 CELL.
failure_scenario:  A contributor or CI runner whose local/available JDK does not include a JavaVersion.VERSION_17-compatible toolchain (as is the case in this execution environment, which only offers Temurin 25.0.3) cannot build, test, or statically analyze bbj-intellij at all — the build fails before task listing, which is why this entire phase records D1-D3/D6 evidence via trace rather than reproduction (D-07).
classification:    major (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no new dependency: n/a — resolving a toolchain mismatch is a version/ configuration change, not a new dependency addition — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001), and the Gradle build itself cannot currently run to validate any fix in this environment — (5) reviewer can name the exact edit: n/a at this recording stage — resolution requires RU-64-02's own broader toolchain/IntelliJ-Platform-version triage, not a single named edit from this unit's evidence alone — (6) severity `medium`, dimension D6 (not D1): pass — tests (4) and (5) both fail/n/a, so classification is `major` per D-13.
effort:            8
dedup:             none — no frozen open issue names the bbj-intellij Gradle/JDK toolchain mismatch. `dedup:` additionally notes: RU-64-02 owns bbj-intellij/build.gradle.kts for every dimension other than this routed D6 cell (D-10) — Phase 64's own sweep re-triages this item rather than re-deriving it; this record is the full evidence handoff, not a duplicate.
disposition:       major-refactor
proposed_approach: n/a at this recording stage — resolution requires RU-64-02's own broader toolchain and IntelliJ-Platform-version work (D-10's location exception is why this evidence lives here rather than in RU-64-02's own records): RU-64-02 owns `bbj-intellij/build.gradle.kts`'s JDK/Gradle toolchain triage for every dimension other than this routed D6 cell, and the `JavaVersion.VERSION_17`-vs.-Temurin-25.0.3 mismatch this record evidences is resolved as part of that unit's broader work, not as an independent single-file edit from this record's evidence alone.
proposed_labels:   area=dependencies; PRIO 2; effort 8
issue:             
```

```
id:                P63-D7-001
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java:24-39
dimension:         D7
secondary:         [D2, D8]
severity:          medium
evidence_tier:     inherited
evidence:          Referral #1 disposition (see Inherited referral triage above): actionPerformed() (:24-39) only logs "[Compile] Triggered for file: " + file.getName() and never invokes bbjcpl, confirmed against VS Code's real 18-option-aware compile (Commands.cjs:294-343 via CompilerOptions.ts). No runnable reproduction accompanies this record (D-07); the gap is confirmed by reading the full 71-line file.
failure_scenario:  A user who clicks "Compile BBj File" on IntelliJ sees no error and no visible failure — only a console log line in the LS log Tool Window — and may reasonably believe the file was compiled, unlike VS Code's bbj.compile. The action's own update() gates it as available and enabled on any BBj source file with the server started, presenting a fully-functional-looking command that silently does nothing.
classification:    major (1) touches 1 file: FAIL — a real compile flow requires wiring an LS custom notification/request in addition to BbjCompileAction.java itself — (2) no public API/grammar/LSP change: FAIL — this is new custom-notification wiring between the IntelliJ client and the shared language server — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit: FAIL — only an architecture-level plan (mirror Commands.cjs:294-343's compile flow via a new bbj/compile LSP4IJ request/notification) is nameable, not a single line-edit — (6) severity medium, dimension D7 (not D1): pass — multiple tests fail, so classification is major per D-13.
effort:            8
dedup:             none — #231 (custom classpath and command-line settings for starting BBj programs) requests configurable run/compile settings, which presupposes a working compile action; it does not itself request implementing the missing bbjcpl invocation this finding records. #385 (Graffiti Composer) is unrelated. Both of this unit's named plausible neighbours checked explicitly and dismissed.
disposition:       major-refactor
proposed_approach: The missing side is IntelliJ: `BbjCompileAction.java:24-39` only logs and never invokes bbjcpl. The work travels through a new shared language-server surface — a `bbj/compile` LSP4IJ request/notification mirroring VS Code's real compile flow in `Commands.cjs:294-343` (via `CompilerOptions.ts`) — and what would have to exist on the IntelliJ side is a handler in `BbjCompileAction.java` that sends that request and surfaces its result (success/diagnostics) to the user, replacing the current silent log line.
proposed_labels:   area=intellij; PRIO 2; effort 8
issue:             
```

```
id:                P63-D7-002
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/
dimension:         D7
secondary:         []
severity:          low
evidence_tier:     inherited
evidence:          Referral #2 disposition (see Inherited referral triage above): both surfaces enumerated — package.json's contributes.commands names bbj.configureCompileOptions, bbj.denumber, bbj.decompile, bbj.decompileReadonly, and bbj.em; grep -rliE 'denumber|decompile|configureCompileOptions|EnterpriseManager' against bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/ returns no matches — confirmed absent, no runnable reproduction beyond this enumeration is needed or claimed (D-07).
failure_scenario:  n/a in the sense that D7 records a capability gap rather than a runtime failure — IntelliJ users have no menu path to configure compiler options with dependency/conflict validation, to denumber or decompile a tokenized/ line-numbered BBj program, or to launch the Enterprise Manager URL directly from the IDE; each workflow is available only in VS Code today.
classification:    major (1) touches 1 file: FAIL — implementing even the simplest of the five (bbj.em, a URL launcher) requires a new action class plus a plugin.xml registration; the full set touches many more files — (2) no public API/grammar/LSP change: pass (configureCompileOptions would reuse LS-side option data already served for VS Code) — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit: FAIL — only "add N new action classes mirroring the VS Code command handlers" is nameable, not a single edit — (6) severity low, dimension D7 (not D1): pass — multiple tests fail, so classification is major per D-13.
effort:            8
dedup:             #65 (support tokenized BBj files) partial-overlap — #65 requests tokenized/ line-numbered BBj file support; this finding's denumber/decompile/ decompileReadonly absence is the IntelliJ-side remainder of that same request (the VS Code side is already implemented, per RU-62-02's own D7 cell), so it is not a novel gap for those three commands specifically — the configureCompileOptions and em absences are not covered by #65. #231/#385 checked explicitly: #231 concerns run/compile settings configurability generally, overlapping loosely with configureCompileOptions but not requesting the other four; #385 is unrelated (Graffiti Composer).
disposition:       major-refactor
proposed_approach: The missing side is IntelliJ for all five VS Code commands (`bbj.configureCompileOptions`, `bbj.denumber`, `bbj.decompile`, `bbj.decompileReadonly`, `bbj.em`), none of which has an action class under `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/`. `configureCompileOptions` can travel through the shared surface — it reuses LS-side compiler-option data already served to VS Code — while the other four are IDE-native action classes with no shared LS path, each needing a new class plus a `plugin.xml` registration mirroring its VS Code command handler. Beyond `#65`, which covers only the tokenized/denumber/decompile IntelliJ-side remainder, this record additionally names the `configureCompileOptions` and `bbj.em` gaps that `#65` does not request.
proposed_labels:   area=intellij; PRIO 3; effort 8
issue:             
```

```
id:                P63-D7-003
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRefreshJavaClassesAction.java:22-32
dimension:         D7
secondary:         []
severity:          low
evidence_tier:     inherited
evidence:          Referral #3 disposition (see Inherited referral triage above): actionPerformed (:22-32) calls BbjServerService.getInstance(project).restart() at :30, which per BbjServerService.java:206-211 stops and restarts the whole LSP4IJ-managed language server; VS Code's extension.ts:694-704 sends a single targeted bbj/refreshJavaClasses LSP request via client.sendRequest(...) at :700 with no restart. No runnable reproduction accompanies this record (D-07); confirmed by reading both call sites in full.
failure_scenario:  Invoking "Refresh Java Classes" on IntelliJ takes every language feature offline for the duration of a full language-server restart (diagnostics, completion, hover, Structure View all unavailable), where the equivalent VS Code command completes a targeted classpath refresh with no interruption to any other feature — a more disruptive experience for functionally the same request, though not incorrect: the restart does achieve the stated goal of clearing cached Java class data.
classification:    major (1) touches 1 file: FAIL — a lighter-weight refresh requires either a new LSP4IJ client-side request handler or a shared language-server-side bbj/refreshJavaClasses notification handler, touching at least BbjRefreshJavaClassesAction.java and the LSP wiring RU-63-05 owns — (2) no public API/grammar/LSP change: FAIL — a targeted-refresh mechanism is new LSP-facing client behaviour — (3) no new dependency: pass — (4) regression- testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit: FAIL — only nameable after RU-63-05 confirms whether LSP4IJ's client API supports issuing a custom request without a full restart, which this unit's own sweep cannot establish — (6) severity low, dimension D7 (not D1): pass — multiple tests fail/are undetermined, so classification is major per D-13.
effort:            8
dedup:             none — no frozen open issue names the refreshJavaClasses restart-vs-targeted- request divergence.
disposition:       major-refactor
proposed_approach: The missing capability is a targeted classpath refresh on IntelliJ: `BbjRefreshJavaClassesAction.java:22-32` calls `BbjServerService.restart()`, taking every language feature offline, where VS Code's `extension.ts:694-704` sends a single targeted `bbj/refreshJavaClasses` LSP request with no interruption. The work would travel through either a new LSP4IJ client-side request handler or a shared language-server-side `bbj/refreshJavaClasses` notification handler, touching at least `BbjRefreshJavaClassesAction.java` and the LSP wiring RU-63-05 owns — but which of those two is buildable is an open question this unit's own sweep could not settle: RU-63-05 first has to confirm whether LSP4IJ's client API supports issuing a custom request without a full server restart before a single edit can be named.
proposed_labels:   area=intellij; PRIO 3; effort 8
issue:             
```

```
id:                P63-D7-005
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/
dimension:         D7
secondary:         []
severity:          low
evidence_tier:     inherited
evidence:          Inherited referral disposition (see Inherited referral triage above): grep -c setopts bbj-vscode/src/language/composer-commands.ts -> 0 (SETOPTS has no bbj/composer/setopts/* LS command at all, unlike msgbox/addwindow/ addchildwindow); ls bbj-intellij/.../composer/ lists no SetoptsComposerDialog. java; ComposerModels.java (read in full) defines no SetOpts* DTO; grep -in setopts ComposerLauncher.java returns zero matches in its dispatch logic. No runnable reproduction accompanies this record beyond the enumeration (D-07).
failure_scenario:  n/a in the sense D7 records a capability gap rather than a runtime failure — an IntelliJ user editing a config.bbx file has no visual SETOPTS byte/bit-vector composer available at all (must hand-edit the hex vector), where a VS Code user on the same file gets a CodeLens-launched composer (#474, shipped 0.12.0).
classification:    major (1) touches 1 file: FAIL — porting requires a new LS command layer (SETOPTS is not part of the shared bbj/composer/* namespace today) plus a new SetoptsComposerDialog.java, new ComposerModels DTOs, and a ComposerLauncher/ action wiring — many files — (2) no public API/grammar/LSP change: FAIL — new bbj/composer/setopts/* LSP-facing commands would need to be added — (3) no new dependency: pass — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit: FAIL — only an architecture-level plan is nameable — (6) severity low, dimension D7 (not D1): pass — multiple tests fail, so classification is major.
effort:            8
dedup:             #475 partial-overlap — #475 requests a NEW BBj-code-scoped SETOPTS capability (decode hovers + tri-state composer with IOR/AND-aware codegen for SETOPTS calls inside BBj source) that neither IDE has today; this finding is about porting the EXISTING #474 config.bbx SETOPTS composer (already shipped in VS Code) to IntelliJ — related but not identical. setopts-catalog.ts's own header, quoted in RU-62-03's D8 cell, names IntelliJ reuse of its byte/bit logic as a stated future intention — exactly the reuse surface #475's tri-state composer would also need — so this finding's fix is a natural prerequisite subset of #475's fuller scope, not a duplicate of it. #385 (Graffiti Composer, an unrelated external tool) checked explicitly and dismissed.
disposition:       major-refactor
proposed_approach: The missing side is IntelliJ: no visual SETOPTS composer exists at all for `config.bbx` files, unlike VS Code's CodeLens-launched composer (`#474`, shipped 0.12.0). The work travels through a new shared surface that does not exist yet — SETOPTS has no `bbj/composer/setopts/*` LS command today, unlike msgbox/addwindow/addchildwindow — plus a new `SetoptsComposerDialog.java`, new `ComposerModels` DTOs, and `ComposerLauncher` action wiring on the IntelliJ side. Beyond `#475`, which requests a new BBj-code-scoped SETOPTS capability (decode hovers plus a tri-state composer with IOR/AND-aware codegen for SETOPTS calls inside BBj source), this record is narrower: porting the EXISTING shipped `#474` config.bbx composer to IntelliJ, which `setopts-catalog.ts`'s own header already names as a stated future intention and which is a natural prerequisite subset of `#475`'s fuller scope, not a duplicate of it.
proposed_labels:   area=intellij; PRIO 3; effort 8
issue:             
```

```
id:                P63-D7-006
unit:              RU-63-02
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/
dimension:         D7
secondary:         []
severity:          low
evidence_tier:     inherited
evidence:          Referral #7 disposition (see Inherited referral triage above): re-enumerated both surfaces live rather than trusting the inherited text. bbj-vscode implements all four features (document-formatter.ts, tokenized-bbj.ts + decompile-io.ts, denumber via extension.ts:572's 'bbj.denumber' command, per RU-62-02's own D7 cell). grep -rliE 'denumber|decompile|tokenized|isLineNumbered|bbjlst' bbj-intellij/src/main/java/ returns no matches; BbjLanguageCodeStyleSettingsProvider. java:20-25 (this unit's closest related file) only customizes reformat defaults, never invoking a BBjCFCli.jar-equivalent or spawning any process. All four confirmed absent with no IntelliJ counterpart anywhere in the plugin.
failure_scenario:  n/a in the sense that D7 records a capability gap rather than a runtime failure — IntelliJ users have no menu path to reformat a BBj file via the real BBjCFCli.jar-backed formatter (only cosmetic REM-indent defaults), to detect and denumber a line-numbered program, to detect a tokenized <<bbj>> file on open, or to decompile one — all four workflows exist only in VS Code today.
classification:    major (1) touches 1 file: FAIL — implementing even the smallest of the four requires a new detector/action class plus a plugin.xml registration; the full set touches many more files — (2) no public API/grammar/LSP change: pass (each feature can reuse LS-side/tool-side logic already built for VS Code) — (3) no new dependency: FAIL — a real format-document feature needs the vendored BBjCFCli.jar (RU-64-03's surface) bundled into bbj-intellij, which it does not currently ship — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit: FAIL — only "add four new feature implementations mirroring their VS Code counterparts" is nameable, not a single edit — (6) severity low, dimension D7 (not D1): pass — multiple tests fail, so classification is major.
effort:            8
dedup:             #65 (support tokenized BBj files) partial-overlap — #65 requests exactly the tokenized-detection quarter of this finding's four-feature absence; the VS Code side already implements it (RU-62-02's own D7 cell), so this finding's tokenized-detection component is #65's IntelliJ-side remainder, not a novel request. The format/denumber/decompile components are not covered by #65 or any other frozen open issue. #381 and #476 (this unit's other named neighbours) are unrelated.
disposition:       major-refactor
proposed_approach: The missing side is IntelliJ for all four VS Code capabilities (real formatter, denumber, tokenized-file detection, decompile) — `BbjLanguageCodeStyleSettingsProvider.java:20-25` only customizes cosmetic reformat defaults and never invokes a compiler-backed formatter. Format-document is blocked on a new dependency this unit's classification already names: the vendored `BBjCFCli.jar` (RU-64-03's surface) is not currently bundled into `bbj-intellij`, so a real fix needs a `build.gradle.kts` bundling task analogous to the existing `copyTextMateBundle` task before a detector/action class can use it; denumber, tokenized-detection and decompile can each reuse LS-side/tool-side logic already built for VS Code without that new dependency. Beyond `#65`, which covers only the tokenized-detection quarter of this four-feature gap (the VS Code side already implemented per RU-62-02's own D7 cell), this record additionally names the format/denumber/decompile components, none of which `#65` or any other frozen open issue covers.
proposed_labels:   area=intellij; PRIO 3; effort 8
issue:             
```

```
id:                P63-D8-004
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java:39-44,AddWindowComposerDialog.java:40-45,ComposerLauncher.java:25-31
dimension:         D8
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          MsgboxComposerDialog.java's class doc (:39-44) states only "Create flow — inserts a fresh MSGBOX(...) statement," with no mention of the editMode constructor parameter and its edit-in-place behaviour (assignToRow visibility, OK-button text, replaceString vs. insert dispatch in ComposerLauncher. openMsgbox). AddWindowComposerDialog.java's class doc (:40-45) states "Create flow only for now — inserts a fresh addWindow(...) statement" — an explicit, now-false limitation claim, since applyAddWindowEdit/applyHexEdit fully implement edit-in-place. Contrast AddChildWindowComposerDialog.java's own class doc, added later alongside #473, which correctly names both flows. ComposerLauncher.java's class doc (:25-31) still says "Shared entry point for both composer UIs (#430/#433)" though the class has dispatched three Kind values since #473 landed — the same doc-lag root cause.
failure_scenario:  A maintainer reading MsgboxComposerDialog.java's or AddWindowComposerDialog. java's class doc alone, without reading the constructor or ComposerLauncher's call sites, would not learn edit-in-place exists for either class, and would read AddWindowComposerDialog.java's doc as an accurate current limitation when it is stale.
classification:    major (1) touches 1 file: FAIL — the fix spans MsgboxComposerDialog.java, AddWindowComposerDialog.java and ComposerLauncher.java — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing harness: satisfied vacuously per D-09 — a Javadoc-only edit changes no runtime behaviour — (5) reviewer can name the exact edit (update each class doc to name both create and edit-in-place flows, mirroring AddChildWindowComposerDialog.java's own accurate wording, and update ComposerLauncher.java's doc to say "all three composer UIs"): pass — (6) severity low, dimension D8 (not D1): pass — test (1) alone fails, so classification is major despite being doc-only.
effort:            2
dedup:             none — no frozen open issue names these stale class-doc claims.
disposition:       major-refactor
proposed_approach: Update each class doc to name both create and edit-in-place flows, mirroring AddChildWindowComposerDialog.java's own accurate wording, and update ComposerLauncher.java's doc to say "all three composer UIs".
proposed_labels:   area=documentation; PRIO 3; effort 2
issue:             
```

```
id:                P64-D1-001
unit:              RU-64-03
location:          bbj-vscode/tools/web.bbj:30-31
dimension:         D1
secondary:         none
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace; no runnable reproduction accompanies this record because executing the script requires a live BBj interpreter and a reachable Enterprise Manager, neither of which exists in this checkout, and this phase mutates nothing. `web.bbj:19-20` reads the username and password with `ARGV(5,err=*next)` / `ARGV(6,err=*next)`, so a caller that supplies fewer than six arguments leaves both unset. `web.bbj:26` takes the token branch only when `token!` is non-null and non-empty; otherwise control reaches `:29-32`, where `:30` assigns the literal `"admin"` to an unset `username!` and `:31` assigns the literal `"admin123"` to an unset `password!`, and `:32` calls `BBjAdminFactory.getBBjAdmin(username!, password!, err=login_failed)` with them. Those two literals are BASIS's documented out-of-the-box EM administrator credentials. The script therefore fails *open* into a privileged login rather than failing closed, and it does so silently — no message, no log line, no marker in the output. There is no configuration switch anywhere in the file that disables the fallback.
failure_scenario:  A BBj installation whose EM administrator password was never changed from the shipped default. A user triggers the BUI or DWC run command with no EM credentials configured and no token available, so ARGV(5), ARGV(6) and ARGV(8) all arrive empty. `web.bbj:30-31` substitutes admin/admin123, `:32` authenticates as the EM administrator, and `:54`-`:87` then create or overwrite a registered application entry — program path, working directory, classpath and config file — under administrator authority that the user never knowingly exercised and was never prompted for. The same path is what makes an unattended or scripted invocation silently privileged.
classification:    major — (1) at most one file: PASS, the edit is confined to web.bbj. (2) no public API / no grammar rule / no LSP contract change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the existing harness: FAIL — no test in this repository exercises any `.bbj` tool script, and vitest cannot drive a BBj interpreter, so a regression test needs new infrastructure. (5) reviewer can name the exact edit: PASS — delete the two fallback assignments and route the no-credential case to `login_failed:`. (6) severity is neither critical nor high AND primary dimension is not D1: FAIL — the primary dimension is D1. Tests (4) and (6) both fail, and (6) is the deliberate safety gate, so this is `major` regardless of how small the edit is.
effort:            4
dedup:             none — no open issue in the frozen 15-issue snapshot mentions EM credentials, default passwords, `web.bbj`, or authentication of any kind; 0 of the 15 carry the `dependencies` label and 0 name CI, a workflow, build configuration or a vendored binary.
disposition:       major-refactor — the fix changes the script's contract with its callers (a no-credential invocation must now fail rather than proceed), so the VS Code and IntelliJ launch paths have to be considered alongside it; Phase 67 does not apply it unilaterally.
proposed_approach: Delete the two fallback assignments and route the no-credential case to `login_failed:`.
proposed_labels:   area=BBj integration and infrastructure; PRIO 2; effort 4
issue:             
```

```
id:                P64-D1-002
unit:              RU-64-03
location:          bbj-vscode/tools/em-login.bbj:10-13,41-43
dimension:         D1
secondary:         none
severity:          high
evidence_tier:     repro
evidence:          Line-by-line trace; no runnable reproduction accompanies this record because observing a process table entry for a BBj process requires running one, which this phase does not do, and because publishing a step-by-step capture procedure against a shipped credential path is exactly what D-16's two-tier rule excludes. The trace is complete without it. `em-login.bbj:10-11` reads the username and password as `ARGV(1)` and `ARGV(2)`; `web.bbj:19-20` reads them as `ARGV(5)` and `ARGV(6)`; and `web.bbj:22` reads the JWT as `ARGV(8)`. Command-line arguments of a running process are readable by any process on the host running as the same user, and on Linux by anything that can read `/proc/<pid>/cmdline`. The three scripts have no alternative intake — no stdin read, no environment variable, no file — so the argument vector is the only channel by which a credential reaches them. `em-login.bbj:40-43` then writes the returned token to the caller-supplied path `outputFile!` using `open(ch,mode="O_CREATE,O_TRUNC")` with no mode, permission or umask control, and `em-validate-token.bbj:8-9` reads the token back the same way, so the token has a second at-rest exposure whose file permissions are whatever the BBj process default happens to be. What the scripts do get right is recorded too: `? 'HIDE'` at `em-login.bbj:8` and `em-validate-token.bbj:6` suppresses console echo, no script writes the token to stdout or to a log, and the failure branches at `em-login.bbj:46-51` and `em-validate-token.bbj:29-34` emit fixed markers rather than the underlying exception text, so no EM diagnostic leaks either.
failure_scenario:  Any local process running under the developer's own account — a malicious or compromised npm postinstall script, a shared build agent, an unrelated tool with a process-listing feature — samples the process table during the window in which `em-login.bbj` runs and reads the Enterprise Manager password in cleartext from ARGV(2), or reads a live JWT from `web.bbj`'s ARGV(8). Separately, the token file written at `em-login.bbj:41-43` persists at the caller-chosen path with default permissions until something deletes it, so the same value is readable from disk after the process has exited.
classification:    major — (1) at most one file: FAIL, the argument contract is shared by `em-login.bbj`, `em-validate-token.bbj` and `web.bbj` and by each IDE's launch code. (2) no public API change: FAIL, the ARGV contract is the public interface between the extensions and these scripts. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the existing harness: FAIL, as above. (5) reviewer can name the exact edit: FAIL — moving a secret off the argument vector means choosing a replacement channel, which is a design decision, not an edit. (6) severity is neither critical nor high AND primary dimension is not D1: FAIL on both halves. Five of six tests fail.
effort:            8
dedup:             none — the frozen 15-issue snapshot contains no issue about EM authentication, token handling, credential storage or process arguments; issue #231 is the nearest neighbour by subject area (custom classpath and command-line settings for starting BBj programs) and is a feature request about classpath configuration, sharing no defect with this record.
disposition:       major-refactor — this is one leg of SEC-04 (EM token lifecycle, end to end across `BbjEMTokenStore`, `em-login.bbj` and `em-validate-token.bbj`) and touches SEC-05 (process spawning). Phase 65 owns the synthesis; this record supplies the `RU-64-03` leg with full evidence and does not attempt the lifecycle here.
proposed_approach: The concrete files are `bbj-vscode/tools/em-login.bbj:10-13,41-43`, `em-validate-token.bbj:8-9,29-34` and `web.bbj:19-20,22` — all three read a credential or a JWT off `ARGV`, the only intake channel each script has, and `em-login.bbj` writes the returned token back to disk with no permission control. Closing this needs a design decision, not a nameable edit: replacing the argument-vector channel with one not readable via `/proc/<pid>/cmdline` (an environment variable scoped to the child process, a named pipe, or a short-lived file the caller creates with restrictive permissions before invocation), and constraining the token file's permissions at write time. This record supplies RU-64-03's leg of SEC-04 with full evidence; Phase 65 owns synthesizing the fix across this leg, `BbjEMTokenStore`, and SEC-05's process-spawning half, so this approach does not attempt that synthesis.
proposed_labels:   area=BBj integration and infrastructure; PRIO 1; effort 8
issue:             
```

```
id:                P64-D1-003
unit:              RU-64-03
location:          bbj-vscode/tools/formatter/BBjCFCli.jar
dimension:         D1
secondary:         [D6]
severity:          high
evidence_tier:     repro
evidence:          Line-by-line trace plus artifact inspection; no runnable reproduction accompanies this record, deliberately — confirming a substitution by performing one would mean replacing a shipped binary and executing it, which D-11 prohibits outright and which Phase 63 D-13 already established is not how a finding gets confirmed in this milestone. Every link in the chain is verifiable statically. (a) Packaging: `bbj-vscode/.vscodeignore` is 12 lines and excludes `.vscode/**`, `.vscode-test/**`, `.gitignore`, `langium-quickstart.md`, `nodecd`, `_modules`, `.vscode`, `node_modules`, `src/`, `tsconfig.json`, `webpack.config.js` and `test/`; `tools/` is absent from that list, so all three JARs are packaged into the published `.vsix`. (b) Execution: `bbj-vscode/src/document-formatter.ts:10` resolves `${__dirname}/../tools/formatter/BBjCFCli.jar` as a compile-time constant, `:14-15` pushes `-jar` and that path onto the argument array, and `:59` spawns `java` with it — with no existence check, no hash check and no signature check at any point in between. That file belongs to `RU-62-02` and Phase 62 is closed, so it is cited as evidence and no Phase 64 finding is located in it. (c) Transitive load: `BBjCFCli.jar`'s manifest declares `Class-Path: lib/jcommander-1.71.jar lib/BBjCodeFomatter.jar`, so executing the CLI loads all three artifacts. (d) Absence of any verifier: a repository-wide grep for `BBjCFCli`, `BBjCodeFomatter`, `jcommander` and `tools/formatter` across the build, config and CI file types returns only the call site and the committed esbuild output; `find` locates no `build.xml` and no `pom.xml`; none of the 15 `package.json` scripts touches a JAR; and no checksum, signature or lockfile entry for any of the three exists anywhere. (e) Interpreter: `62-COVERAGE.md:1489` already recorded that `java` itself is resolved by argv[0] lookup against `PATH` with no absolute-path pinning and no verification before spawning — cited here as the runtime half of the same unverified chain rather than re-recorded against a closed phase's file.
failure_scenario:  Any write to the extension's installed `tools/formatter/` directory — by another process running as the user, by a tampered or re-packed `.vsix`, or by a compromised release artifact — changes which bytecode the next format-on-save executes. The user formats a BBj document; `document-formatter.ts:59` spawns `java -jar` against the resolved constant path; the replaced code runs under the user's own account and is handed the document's full text on stdin. Nothing in the sequence compares the file against an expected hash or signature, nothing in the repository records what the expected bytes are, and the substitution leaves no signal in any log, so neither the user nor a later reviewer has a way to detect it before or after the fact. Per D-16 the surface, problem class and impact are recorded and no trigger sequence, payload or fork-and-run procedure is.
classification:    major — (1) at most one file: FAIL, a fix means adding a verification step at the call site plus a recorded hash or signature for three artifacts. (2) no public API change: PASS. (3) adds or upgrades no dependency: PASS as written, though a signature-based fix would not be. (4) regression-testable with the existing harness: FAIL, nothing in vitest reaches `tools/` and the formatter path is not covered. (5) reviewer can name the exact edit: FAIL — pinning requires first deciding what the artifacts are and where they come from, which is `P64-D6-002`'s unanswered question for one of the three. (6) severity is neither critical nor high AND primary dimension is not D1: FAIL on both halves.
effort:            8
dedup:             none — no issue in the frozen 15-issue snapshot concerns the formatter, the vendored JARs, extension packaging or artifact integrity; 0 of the 15 carry the `dependencies` area label.
disposition:       major-refactor — recorded here, routed to `MAJOR-REFACTORS.md` by Phase 68 and to Phase 69 for filing. Phase 67 does not apply it.
proposed_approach: The concrete files are `bbj-vscode/src/document-formatter.ts:10,14-15,59` (the unverified spawn site) and the three vendored artifacts it loads — `tools/formatter/BBjCFCli.jar`, `lib/jcommander-1.71.jar`, `lib/BBjCodeFomatter.jar`. What would close this record is a verification step at the call site that compares each resolved JAR path's SHA-256 against a committed expected hash before `document-formatter.ts:59` spawns `java -jar`, for the two artifacts whose provenance is at least nameable (`BBjCFCli.jar`, `jcommander-1.71.jar`) — `BBjCodeFomatter.jar`'s own hash-pin has to wait on `P64-D6-002` answering what that artifact actually is, since pinning a hash for an unidentified binary records only that it has not changed, not that it is safe. No decompilation or execution of any of the three artifacts is part of this approach or is needed to add the hash check.
proposed_labels:   area=BBj integration and infrastructure; PRIO 1; effort 8
issue:             
```

```
id:                P64-D1-004
unit:              RU-64-01
location:          .github/workflows/preview.yml:96-102
dimension:         D1
secondary:         none
severity:          high
evidence_tier:     repro
evidence:          Disclosure-limited per D-16 — this repository is public and forkable and the credential concerned publishes to a public marketplace, so this record states the surface, the problem class and the impact and stops there: no trigger sequence, no payload and no fork-and-run procedure is written here or anywhere in this file. The evidence exists and is a line-by-line read of the two files at the swept commit; no runnable reproduction accompanies it because GitHub Actions cannot be executed in this checkout and D-12 forbids claiming a workflow was run. **Surface:** the two `./gradlew publishPlugin` steps, `preview.yml:96-102` and `manual-release.yml:135-137`. **Problem class:** `secrets.JETBRAINS_MARKETPLACE_TOKEN` is expanded by the Actions expression evaluator directly into the `run:` command line, rather than bound to the step through an `env:` mapping and referenced as a shell variable. The credential is therefore materialised as an argument of a process on the runner and into the script file the runner writes for that step, instead of being confined to the step's process environment. **Impact:** for the duration of the publish the value is present as process-visible data inside a job that resolves and executes the full IntelliJ Platform Gradle plugin dependency tree, which is third-party code running concurrently in the same container. Log masking does not address this class — it redacts the transcript, not the runner. What makes this an inconsistency rather than a platform constraint is that both files already use the correct pattern two steps away: `env: VSCE_PAT: ${{ secrets.VSCE_PAT }}` at `preview.yml:64-65` and `manual-release.yml:86-87`.
failure_scenario:  A release or preview run reaches the JetBrains publish step. During that step the marketplace publishing credential exists as process-visible data on the runner rather than only as step environment state, so any code already executing inside that job with process visibility — the Gradle daemon, a build plugin, a transitive plugin dependency, or any of the five mutable-tag actions in the same job under `P64-D6-003` — is positioned to observe it, whereas the `env:`-bound `VSCE_PAT` two steps earlier is not. The consequence of an observed token is publication rights to the plugin listing under this project's own identity, which is indistinguishable from a legitimate release to every downstream IntelliJ user, and which nothing in this repository can revoke.
classification:    major — (1) at most one file: FAIL, two workflows carry the same pattern. (2) no public API / no grammar rule / no LSP contract change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the existing harness: PASS under the reading stated above — the next run of either workflow exercises the changed step directly. (5) reviewer can name the exact edit: PASS — add an `env:` mapping for the token to both steps and reference the shell variable from the `run:` body, exactly as `VSCE_PAT` is already handled. (6) severity is neither critical nor high AND primary dimension is not D1: FAIL on both halves. Tests (1) and (6) fail, and (6) is the deliberate safety gate, so this is `major` regardless of how small the edit is.
effort:            2
dedup:             none — no open issue in the frozen 15-issue snapshot names CI, a workflow, secret handling, publishing or a marketplace credential; 0 of the 15 carry the `dependencies` area label and 0 name build configuration of any kind. Issue #476 mentions both IDEs but concerns starter-program templates, not the release pipeline.
disposition:       major-refactor — test (6) routes every D1 finding to Phase 68's `MAJOR-REFACTORS.md` rather than Phase 67's apply path, even though the edit itself is two lines, and Phase 69's issue drafting for it is subject to D-16's disclosure limits and to ISSUE-01.
proposed_approach: Add an `env:` mapping for the token to both steps and reference the shell variable from the `run:` body, exactly as `VSCE_PAT` is already handled.
proposed_labels:   area=BBj integration and infrastructure; PRIO 1; effort 2
issue:             
```

```
id:                P64-D1-005
unit:              RU-64-01
location:          .github/workflows/preview.yml:8-10
dimension:         D1
secondary:         none
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace plus an enumeration; no runnable reproduction accompanies it because GitHub Actions cannot be executed in this checkout. `grep -n 'permissions:' .github/workflows/*.yml` returns exactly three hits — `deploy-docs.yml:12` and `pr-vsix.yml:26`, both top-level, and `manual-release.yml:149`, job-level on `create-release` alone. Four of the six workflows therefore declare no `permissions:` anywhere: `build.yml`, `preview.yml`, `pr-validation.yml`, and `manual-release.yml` for its `build-vscode` and `build-intellij` jobs — 7 of the repository's 10 jobs. For those jobs the `GITHUB_TOKEN` scope is not stated in the tree at all; it is whatever the repository or organisation "Workflow permissions" default is, which is a GitHub settings value and cannot be read from a checkout. The tree does constrain it in one direction: `preview.yml:53-60` runs `git config`, `git commit` and `git push` with no explicit token, authenticating through the credential `actions/checkout` persists by default, and `manual-release.yml:69-82` does the same plus `git push origin "v$VERSION"`. Neither can succeed unless that default grants `contents: write`, and both are the project's live release paths, so the default is necessarily the permissive setting — under which every scope is granted read and write to every job that declares no block of its own. This last step is an **inference from the workflows' design intent, not an observation of a run**, and is flagged as such; the unverifiable half is recorded under `### Not-reproducible dispositions`. Two consequences follow directly: the jobs holding `secrets.VSCE_PAT` and `secrets.JETBRAINS_MARKETPLACE_TOKEN` (`preview.yml:11-108`, `manual-release.yml:12-104`) also hold a full-scope repository token, and `pr-validation.yml`'s same-repository PR runs build contributor-supplied Gradle code under that same token — fork PRs are forced read-only by GitHub and are not exposed. The contrast lives in the same tree: `deploy-docs.yml:12-15` and `pr-vsix.yml:26-28` each declare a block, which resets every undeclared scope to `none`, and `pr-vsix.yml:24-25` names the posture explicitly as "Least privilege".
failure_scenario:  A third-party action or a Gradle plugin executing inside `preview.yml`'s `publish-preview` or `build-intellij` job — every action reference in both being a mutable tag under `P64-D6-003` — runs with a repository token that, on the permissive default, can push to `main`, move tags, create releases and write packages, in addition to whatever marketplace credential is in scope for its step. The narrower everyday case is the same shape without a compromise: any step that misbehaves in those seven jobs does so with far more authority than the job's task requires, and nothing in the repository records what that authority is, so a reviewer reading `build.yml` or `pr-validation.yml` cannot tell from the file whether its token can write to the repository or not.
classification:    major — (1) at most one file: FAIL, four workflows. (2) no public API / grammar / LSP change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the existing harness: PASS under the reading stated above — a declared scope is exercised by the next run of each workflow, and a scope that is too narrow fails that run loudly rather than silently. (5) reviewer can name the exact edit: PASS — add `permissions: contents: read` to `build.yml` and `pr-validation.yml`, `contents: write` to `preview.yml`, and per-job blocks to `manual-release.yml`'s two undeclared jobs. (6) severity is neither critical nor high AND primary dimension is not D1: FAIL — the primary dimension is D1. Tests (1) and (6) fail.
effort:            4
dedup:             none — the frozen 15-issue snapshot contains no issue about CI permissions, tokens, workflow configuration or release automation; 0 of the 15 carry the `dependencies` label and 0 name a workflow.
disposition:       major-refactor — declaring a scope that turns out to be too narrow breaks the release path, so the change has to be staged against a real release run rather than applied unilaterally by Phase 67, and test (6) independently routes any D1 finding to `MAJOR-REFACTORS.md`.
proposed_approach: Add `permissions: contents: read` to `build.yml` and `pr-validation.yml`, `contents: write` to `preview.yml`, and per-job blocks to `manual-release.yml`'s two undeclared jobs.
proposed_labels:   area=BBj integration and infrastructure; PRIO 2; effort 4
issue:             
```

```
id:                P64-D1-006
unit:              RU-64-02
location:          bbj-intellij/gradle/wrapper/gradle-wrapper.properties:3-5
dimension:         D1
secondary:         [D6]
severity:          high
evidence_tier:     repro
evidence:          Line-by-line trace over the complete 7-line properties file and the two wrapper scripts; no runnable reproduction accompanies this record because the Gradle build does not execute in this environment at all (`./gradlew --offline -q dependencies` exits 1 in 723 ms on the JDK 25.0.3 version check) and this phase mutates nothing. `gradle-wrapper.properties` declares, in full: `:1` `distributionBase=GRADLE_USER_HOME`, `:2` `distributionPath=wrapper/dists`, `:3` `distributionUrl=https\://services.gradle.org/distributions/gradle-8.13-bin.zip`, `:4` `networkTimeout=10000`, `:5` `validateDistributionUrl=true`, `:6` `zipStoreBase=GRADLE_USER_HOME`, `:7` `zipStorePath=wrapper/dists`. There is no `distributionSha256Sum` property, which is the mechanism Gradle provides for pinning the downloaded distribution by content; `validateDistributionUrl=true` only checks that the URL is well-formed and resolves, and pins nothing. Independently, nothing pins the wrapper JAR that performs the download: `gradlew:117` sets `CLASSPATH=$APP_HOME/gradle/wrapper/gradle-wrapper.jar`, `gradlew:208-209` passes that classpath plus `org.gradle.wrapper.GradleWrapperMain` to the JVM and `:244` `exec`s it (`gradlew.bat:71,75` are the Windows equivalents), and `grep -rn 'wrapper-validation\|gradle/actions\|setup-gradle' .github/workflows/` returns nothing, so Gradle's own wrapper-validation action is absent from all six workflows. The JAR's `sha256sum` is `2db75c40782f5e8ba1fc278a5574bab070adccb2d21ca5a6e5ed840888448046`, which matches Gradle's published `wrapperChecksum` for releases 8.10 through 8.12.1 and **not** the `81a82aaea5abcc8ff68b3dfcb58b3c3c429378efd98e7433460610fecd7ae45f` published for the 8.13 distribution this same file declares — so the two halves of the wrapper do not even agree with each other. Resolvable references: Gradle's own release metadata at https://services.gradle.org/versions/all (fields `wrapperChecksum` and `checksum` per release) and https://services.gradle.org/distributions/gradle-8.13-wrapper.jar.sha256. This record describes an integrity gap and publishes no exploitation path; D-16's redaction tier is assessed and not triggered, since substituting either artifact requires write access to this repository.
failure_scenario:  A CI runner or a contributor machine executes `./gradlew publishPlugin` (`manual-release.yml:137`, `preview.yml:99`) or `./gradlew buildPlugin` (`pr-validation.yml:61`, `manual-release.yml:127`). `gradlew:117` puts the committed 43,583-byte JAR on the classpath and runs it; the JAR downloads `gradle-8.13-bin.zip` over TLS and unpacks it into `~/.gradle/wrapper/dists`. Neither artifact is compared against any expected digest at any point: not the JAR (no wrapper-validation step exists in any workflow) and not the distribution (no `distributionSha256Sum`). A distribution served from a compromised mirror or a repository-side substitution of the JAR therefore executes with the full authority of the job — which, for `manual-release.yml:135-137` and `preview.yml:96-102`, includes `secrets.JETBRAINS_MARKETPLACE_TOKEN`, a credential that publishes to every IntelliJ user of this plugin. The version mismatch above is the direct evidence that nothing in this repository or its CI would notice the wrapper JAR being other than expected: it already is.
classification:    major — (1) at most one file: FAIL, the minimal correct fix regenerates both `gradle-wrapper.properties` and `gradle-wrapper.jar` via `./gradlew wrapper --gradle-version <v> --gradle-distribution-sha256-sum <sum>` and adds a validation step to the workflows, touching three or more files. (2) no public API / no grammar rule / no LSP contract change: PASS. (3) adds or upgrades no dependency in `package.json` or `build.gradle.kts`: PASS — the Gradle distribution version is declared in the wrapper properties, not in `build.gradle.kts`. (4) regression-testable with the existing harness: FAIL — the Gradle build does not run in this environment and no test in this repository asserts anything about the wrapper. (5) reviewer can name the exact edit: PASS — add `distributionSha256Sum=<published sum for the chosen release>` to the properties file, regenerate the JAR for that same release, and add `gradle/actions/wrapper-validation` to the workflows that run `./gradlew`. (6) severity is neither critical nor high AND primary dimension is not D1: FAIL on both halves. Tests (1), (4) and (6) fail; (6) is the deliberate safety gate, so this is `major` regardless of how small the properties-file edit looks.
effort:            4
dedup:             none — no open issue in the frozen 15-issue snapshot mentions Gradle, the wrapper, checksums, supply chain or the IntelliJ build; 0 of the 15 carry the `dependencies` label and 0 name CI, a workflow, build configuration or a vendored binary.
disposition:       major-refactor — the fix spans the wrapper pair and the workflow definitions and changes what every build verifies before it runs, so Phase 67 does not apply it unilaterally; it belongs in `MAJOR-REFACTORS.md` alongside `P64-D6-006`, which records the same artifact's identity and update-path half.
proposed_approach: Add `distributionSha256Sum=<published sum for the chosen release>` to the properties file, regenerate the JAR for that same release, and add `gradle/actions/wrapper-validation` to the workflows that run `./gradlew`.
proposed_labels:   area=intellij; PRIO 1; effort 4
issue:             
```

```
id:                P64-D2-001
unit:              RU-64-03
location:          bbj-vscode/tools/interop-test-harness/run-tests.ts:510,579,584
dimension:         D2
secondary:         none
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace; no runnable end-to-end reproduction accompanies this record because triggering it needs a live java-interop peer on the target port that returns a non-conforming response, and standing one up is outside a static review that mutates nothing. The divergence is exact and readable. Test case 14 (`getClassInfos — com.basis.startup.type`) pushes two assertions at `:499-501` and a third conditionally at `:505-507`, then returns `status: 'pass'` as a hardcoded literal at `:510` without ever computing `assertions.some(a => !a.passed)` — unlike every neighbouring case, which does exactly that at `:446`, `:480`, `:535` and `:557`. Test case 17 does the same twice: `:579` in the success branch after pushing a `Returns boolean` assertion at `:577`, and `:584` in the catch branch. Downstream, the console icon at `:1016` and the report's status badge at `:739` both key off `result.status`, and the summary counts at `:652-654` and `:1029-1031` are `results.filter(r => r.status === ...)` — so all four display surfaces read the hardcoded literal. The exit-code check at `:1042-1048` does not: it walks `r.assertions.some(a => !a.passed)` independently and therefore *does* see the failure. The two halves of the harness disagree by construction.
failure_scenario:  The interop service returns something other than an array for `getClassInfos('com.basis.startup.type')` — for example an error object, which is a response shape the harness explicitly anticipates elsewhere at `:398` and `:408`. The `Returns array` assertion at `:499` records `passed: false`. Test 14 still returns `status: 'pass'` at `:510`. The console prints `✓ 14. getClassInfos — com.basis.startup.type`, the summary line at `:1034` prints `17 passed, 0 failed, 0 errors`, and `report.html` shows a green PASS badge with a `<details>` element that is not even auto-expanded, because `:737` only opens non-pass rows. The process then exits 1. A developer reading the console and the report concludes the interop service is healthy; only the shell's exit status disagrees, and in an interactive run nobody looks at it.
classification:    major — (1) at most one file: PASS. (2) no public API change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the existing harness: FAIL — `tools/` is outside `tsconfig.json`'s `include` (`src/**/*.ts` only) and outside `tsconfig.test.json`'s (`test/**/*` only), `npm run lint` is `eslint src test`, and nothing under `tools/` matches vitest's default test-file pattern; `run-tests.ts` also calls `main()` at module scope (`:1055`), so importing it from a test would execute the harness. A regression test needs new infrastructure. (5) reviewer can name the exact edit: PASS — compute `failed` the way `:446` does and return it in all three places. (6) severity is neither critical nor high AND primary dimension is not D1: PASS. One test fails, so `major`.
effort:            2
dedup:             none — the frozen 15-issue snapshot contains no issue about the interop test harness, test reporting or CI result accuracy.
disposition:       major-refactor — small edit, but INVENTORY 3c test (4) fails, so it does not enter Phase 67's `easy` apply path without the `MAJOR-REFACTORS.md` record first.
proposed_approach: Compute `failed` the way `:446` does and return it in all three places.
proposed_labels:   area=BBj integration and infrastructure; PRIO 2; effort 2
issue:             
```

```
id:                P64-D2-002
unit:              RU-64-03
location:          bbj-vscode/tools/interop-test-harness/run-tests.ts:706-708
dimension:         D2
secondary:         [D4]
severity:          low
evidence_tier:     repro
evidence:          Runnable reproduction, executed in isolation without touching the repository. `generateReport:706` and `:708` call `escapeHtml(...)` and pass the result to `syntaxHighlightJson(...)` at `:747` and `:751`. `escapeHtml:597` replaces every `"` with `&quot;`. `syntaxHighlightJson:602` matches `/("(?:\\.|[^"\\])*")\s*:/g` and `:605` matches `/:\s*("(?:\\.|[^"\\])*")/g` — both require a literal `"`, which by then no longer occurs anywhere in the input. Copying both functions verbatim into a standalone script and feeding them `JSON.stringify({className:'java.lang.String',count:3,ok:true,extra:null},null,2)` produces, in the shipped order, **0** `json-key` spans and **0** `json-string` spans, with 1 each of `json-number`, `json-bool` and `json-null`; feeding the same regexes the unescaped input produces **4** `json-key` spans and **1** `json-string` span. The three numeric/boolean/null branches at `:608`, `:611` and `:614` still fire because their patterns contain no quote character. The `.json-key` and `.json-string` CSS rules are still emitted into every report.
failure_scenario:  Run the harness against any live service and open the generated `report.html`. Expand any Request block or any Response block: every JSON key and every JSON string value renders in the default `pre` colour, and the document contains no `<span class="json-key">` or `<span class="json-string">` element at all, while numbers, booleans and nulls are coloured. The feature the CSS and the two dead regexes were written for has never worked in any report this harness has produced, and nothing signals that — the report looks deliberately styled rather than broken.
classification:    major — (1) at most one file: PASS. (2) no public API change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the existing harness: FAIL, for the same reasons recorded under `P64-D2-001` — `tools/` is reached by no tsconfig, no lint script and no vitest pattern, and the module self-executes. (5) reviewer can name the exact edit: PASS — highlight first, then escape, or make the two regexes match `&quot;`. (6) severity is neither critical nor high AND primary dimension is not D1: PASS. One test fails, so `major`.
effort:            2
dedup:             none — no issue in the frozen 15-issue snapshot concerns the interop harness or its HTML report.
disposition:       major-refactor — cosmetic in effect, but classified by the same six tests as everything else; recorded rather than quietly downgraded.
proposed_approach: Highlight first, then escape, or make the two regexes match `&quot;`.
proposed_labels:   area=BBj integration and infrastructure; PRIO 3; effort 2
issue:             
```

```
id:                P64-D2-003
unit:              RU-64-03
location:          bbj-vscode/tools/web.bbj:34,54,70,87,90,91
dimension:         D2
secondary:         none
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace; no runnable reproduction accompanies this record because provoking an EM-side failure requires a live Enterprise Manager, which this checkout does not have and this phase does not stand up. The control-flow claim is fully verifiable from the file. `grep -n 'err=' bbj-vscode/tools/web.bbj` returns exactly seven lines: five `ARGV(n,err=*next)` reads at `:19-23`, and the two `BBjAdminFactory.getBBjAdmin(...,err=login_failed)` calls at `:27` and `:32`. The script's only user-facing failure message is the `MSGBOX("Login Failed!",...)` at `:97`, under the `login_failed:` label at `:96`, and that label is reachable from nowhere except those two login calls — `:93` executes `release` before it, so it cannot be fallen into. Six external calls run after a successful login and none of them carries an `err=` branch: `admin!.getRemoteConfiguration()` (`:34`), `configuration!.createApplication()` (`:54`), `BBjAPI().getConfig().getConfigFileName()` (`:70`), `app!.commit()` (`:87`), `app!.getDwcUrl(0)` / `app!.getBuiUrl(0)` (`:90`) and `BBjAPI().getThinClient().browse(url!)` (`:91`). Error handling in this script is therefore present on exactly the one call where the outcome is least ambiguous and absent on every call where it is not.
failure_scenario:  EM authentication succeeds, so `:27` or `:32` returns an `admin!` handle and the `login_failed:` path is out of reach. `app!.commit()` at `:87` then fails — the authenticated EM user lacks permission to write the application entry, the entry collides, or the EM connection drops between `:34` and `:87`. Control never reaches `:90-91`, so no browser is opened, and it cannot reach `:97`, so no message box is shown. From the user's side the BUI/DWC run command produces nothing at all: no browser, no dialog, no distinction from a run that was never triggered. The same shape applies to the other five unguarded calls.
classification:    major — (1) at most one file: PASS. (2) no public API change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the existing harness: FAIL — no test in this repository exercises any `.bbj` tool script and vitest cannot drive a BBj interpreter. (5) reviewer can name the exact edit: PASS — add `err=` branches to the six calls and give them a distinct labelled message rather than reusing `login_failed:`, whose text would be wrong for them. (6) severity is neither critical nor high AND primary dimension is not D1: PASS. One test fails, so `major`.
effort:            4
dedup:             none — the frozen 15-issue snapshot contains no issue about BUI/DWC launch failures, `web.bbj`, or silent run-command no-ops.
disposition:       major-refactor — recorded for Phase 68's document split; not applied here.
proposed_approach: Add `err=` branches to the six calls and give them a distinct labelled message rather than reusing `login_failed:`, whose text would be wrong for them.
proposed_labels:   area=BBj integration and infrastructure; PRIO 2; effort 4
issue:             
```

```
id:                P64-D2-005
unit:              RU-64-01
location:          .github/workflows/manual-release.yml:69-82
dimension:         D2
secondary:         none
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace of both release workflows; no runnable reproduction accompanies it because publishing to either marketplace is precisely what this phase does not do. Both workflows write durable, externally visible state before the state that would justify it exists, and both spread publication across jobs with no rollback or compensating action anywhere. In `manual-release.yml`, `build-vscode` pushes the version commit to `main` and the `v$VERSION` tag at `:81-82`, then publishes to the VS Code Marketplace at `:84-90`; `build-intellij` publishes to the JetBrains Marketplace at `:135-137` in a second job; `create-release` creates the GitHub release at `:167-186` in a third. In `preview.yml`, `publish-preview` pushes the version bump at `:53-60` and publishes at `:62-68`, and `build-intellij` publishes to JetBrains at `:96-102`. Each stage can fail independently — a rejected push, an empty or expired credential (see the empty-input analysis in the D2 cell line), a Gradle failure, a marketplace rejection — and no stage undoes a preceding one. The ordering is also the wrong way round with respect to reversibility: a tag and a commit on `main` are cheap to create and awkward to retract, while a marketplace publication is the step most likely to fail on credentials. Note that the two workflows are not merely similar here; `preview.yml:53-60` and `manual-release.yml:69-82` are the same twelve-line procedure with different commit messages, which is why one fix has to address both (see `P64-D4-003`).
failure_scenario:  A maintainer dispatches `manual-release.yml` with a valid version. `build-vscode` validates it, sets `package.json`, commits, pushes `main` and pushes the tag `v25.12.0` (`:81-82`). The next step, `npx vsce publish -p $VSCE_PAT` (`:90`), fails — the PAT has expired, which is the ordinary failure mode for a marketplace token. The job fails, so `build-intellij` and `create-release` never run. What is left behind is `main` claiming version 25.12.0 in `package.json`, a `v25.12.0` tag pointing at that commit, no VS Code Marketplace release, no JetBrains release and no GitHub release. Re-running the workflow with the same version now fails at `:54`, because the version is no longer greater than `package.json`'s current value, so recovery requires deleting the tag and hand-reverting `main` before any release can proceed. The `preview.yml` variant is the same shape one step smaller: a failed `vsce publish` at `:68` leaves `main` recording a preview version that was never published, and the next run bumps from that phantom version.
classification:    major — (1) at most one file: FAIL, `manual-release.yml` and `preview.yml` carry the same defect and a fix that repaired one would leave the other. (2) no public API / grammar / LSP change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the existing harness: PASS under the reading stated above, though only weakly — a successful release run exercises the happy path; the failure path it fixes is exercised only by an actual failure. (5) reviewer can name the exact edit: FAIL — reordering a release pipeline so that nothing durable is written before the last publish succeeds is a design decision between publish-then-tag, an explicit compensating rollback, and collapsing the three jobs into one, not a nameable edit. (6) severity is neither critical nor high AND primary dimension is not D1: PASS. Tests (1) and (5) fail.
effort:            8
dedup:             none — the frozen 15-issue snapshot contains no issue about releases, versioning, tags or publication; 0 of the 15 carry the `dependencies` label and 0 name CI.
disposition:       major-refactor — the change reorders two live publishing pipelines across two marketplaces and can only be validated by an actual release, so Phase 67 does not apply it unilaterally.
proposed_approach: The manifest files are `.github/workflows/manual-release.yml:69-90,135-137,167-186` and `.github/workflows/preview.yml:53-68,96-102`, which share the same twelve-line version-bump-commit-push procedure (`P64-D4-003`). The observable that has to change is that a failed `vsce publish` (an expired PAT, the ordinary failure mode) no longer leaves a pushed commit and tag on `main` with no corresponding marketplace release — closing this is a design decision between three shapes: publish before writing anything durable (tag/push only after every marketplace publish succeeds), an explicit compensating rollback step that deletes the tag and reverts the commit on a later-job failure, or collapsing the three jobs into one so a mid-pipeline failure cannot leave partial state. Whichever shape is chosen has to be applied to both workflows, since they are the same procedure duplicated, not two independent ones.
proposed_labels:   area=BBj integration and infrastructure; PRIO 2; effort 8
issue:             
```

```
id:                P64-D2-006
unit:              RU-64-01
location:          .github/workflows/preview.yml:3-8
dimension:         D2
secondary:         none
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace; no runnable reproduction accompanies it because staging two overlapping workflow runs requires executing GitHub Actions, which this phase does not do. `preview.yml` triggers on every `push` to `main` (`:4-8`) and declares no `concurrency:` group anywhere in the file — `grep -n 'concurrency:' .github/workflows/*.yml` returns hits only for `deploy-docs.yml:17` and `pr-vsix.yml:20`. Its `bump` step (`:34-51`) reads the current version out of the checked-out `package.json` with `jq -r .version` and increments the patch component in the workspace, then `:53-60` commits and pushes that bump to `main`. Because each run's checkout is the commit that triggered it, and because a `GITHUB_TOKEN` push does not itself trigger a workflow, a second push to `main` arriving before or shortly after the first run's push produces a run whose checkout does not contain the first run's bump. Both runs then compute the same `NEW_VERSION` from the same input. The loser's `git push` at `:60` is rejected as non-fast-forward, the step fails, and because publication happens afterwards at `:62-68` that run publishes nothing. The defect is in the read-modify-write shape rather than in the missing `concurrency:` block alone, which is why adding one does not by itself fix it: `cancel-in-progress: true` would drop a preview build for a commit that was pushed, and `false` would queue the second run, which would then still be working from a checkout that predates the first run's bump and would still collide.
failure_scenario:  Two commits are pushed to `main` a minute apart — an ordinary merge followed by a follow-up fix. Run A and run B both start, both read version `0.12.0` from their own checkouts, and both compute `0.12.1`. Run A pushes the bump and publishes preview `0.12.1`. Run B's `git push` at `:60` is rejected, the step fails, and run B stops before `:62-68`, so the second commit is never published as a preview and the only signal is a red run whose failure message is a Git rejection rather than anything about releases. A maintainer who re-runs the failed job hits the same rejection, because run B's checkout is still the pre-bump commit.
classification:    major — (1) at most one file: PASS, `preview.yml` alone. (2) no public API / grammar / LSP change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the existing harness: FAIL — a race between two concurrent runs cannot be staged by a workflow run, which is exactly why it has gone unnoticed; this is the "conditions a run cannot stage" side of the reading stated above. (5) reviewer can name the exact edit: FAIL — as traced above, a `concurrency:` block alone is insufficient in either cancel mode, so the fix requires deciding how the bump should read `main` (fetch-and-rebase before bumping, derive the version from the tag list, or move the bump after publication). (6) severity is neither critical nor high AND primary dimension is not D1: PASS. Tests (4) and (5) fail.
effort:            2
dedup:             none — the frozen 15-issue snapshot contains no issue about preview builds, versioning or CI concurrency.
disposition:       major-refactor — the fix is small in lines but is a release-policy decision about how the preview version is derived, so it belongs on `MAJOR-REFACTORS.md` rather than in Phase 67's apply path.
proposed_approach: The manifest file is `.github/workflows/preview.yml:34-60`. Adding a bare `concurrency:` group is not sufficient in either cancel mode, as the record's own evidence traces: the defect is in the read-modify-write shape of the version bump, not in run overlap alone. The observable that has to change is that two pushes to `main` within the same window no longer both compute the same `NEW_VERSION` from a stale checkout — closing this means deciding how the bump reads `main`'s current version: fetch-and-rebase immediately before bumping, derive the version from the tag list instead of the checked-out `package.json`, or move the bump to run after publication succeeds rather than before.
proposed_labels:   area=BBj integration and infrastructure; PRIO 3; effort 2
issue:             
```

```
id:                P64-D2-007
unit:              RU-64-02
location:          bbj-vscode/package.json:654,661
dimension:         D2
secondary:         [D3]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace with the divergence confirmed against artefacts on disk; no packaging run was performed because this phase mutates nothing. `package.json:651` declares `"main": "./out/extension.cjs"`. The file of that name is produced only by `esbuild.mjs:7-21`, whose `entryPoints` are `src/extension.ts` and `src/language/main.ts` (`:8`), whose `outdir` is `out` (`:9`) and whose `outExtension` maps `.js` to `.cjs` (`:10-12`); `esbuild.mjs` is invoked only by `build` (`:655`) and `watch` (`:656`). The hook that `vsce package` and `vsce publish` run is `vscode:prepublish` (`:654`), which is `shx cp ../LICENSE ./LICENSE && npm run esbuild-base -- --minify && npm run lint`. `esbuild-base` (`:661`) is `esbuild ./src/extension.ts --bundle --outfile=out/main.js --external:vscode --format=cjs --platform=node`: a single entry point, a different output filename, and no language-server bundle. `grep -rn 'out/main.js'` over the tree excluding `node_modules/` and `.planning/` returns only `package.json:661` itself — nothing loads it. The two sibling scripts `esbuild` (`:662`) and `esbuild-watch` (`:663`) delegate to the same dead output, and `test-compile` (`:664`, `tsc -p ./`) is likewise referenced by nothing. The divergence is visible on disk in this checkout: `out/extension.cjs` (1,265,974 bytes) and `out/language/main.cjs` (2,251,400 bytes) are dated 2026-08-17, while `out/main.js` (622,562 bytes) is dated 2026-07-19 — different builds, months apart, only one of which ships. `.vscodeignore` was read as context to establish what the VSIX contains (it excludes `node_modules` and `src/` but not `out/`); INVENTORY excludes `.vscodeignore` from every unit, so it is cited as context only and no finding is located in it, and it adds no file to this unit's list or to the file gate.
failure_scenario:  A maintainer runs `vsce package` (or the release path at `preview.yml:62-68` / `manual-release.yml:84-90`, which invoke vsce and therefore the same hook). `vscode:prepublish` writes a freshly minified `out/main.js` that nothing references, runs the linter, and exits successfully. vsce then packages the directory: the file named by `main`, `out/extension.cjs`, is whatever an earlier `npm ci`-triggered `prepare` left there — unminified, with its sourcemap — and `out/language/main.cjs`, the language server the IntelliJ plugin also consumes, is likewise the `prepare` output rather than anything `vscode:prepublish` produced. The published extension is therefore never the minified artifact the prepublish hook exists to build, ships a 622 KB unreferenced bundle plus sourcemaps as dead weight, and would ship a stale `out/extension.cjs` outright on any machine where `prepare` did not run immediately before packaging.
classification:    major — (1) at most one file: PASS, the fix is confined to `package.json`'s scripts block. (2) no public API / no grammar rule / no LSP contract change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the existing harness: FAIL — vitest runs over `src/` and `test/` and asserts nothing about packaging output; catching this regression needs a VSIX-content check that does not exist. (5) reviewer can name the exact edit: PASS — point `vscode:prepublish` at `node ./esbuild.mjs --minify` and delete the dead `esbuild-base`, `esbuild`, `esbuild-watch` and `test-compile` scripts. (6) severity is neither critical nor high AND primary dimension is not D1: PASS. Only test (4) fails, which is enough to make this `major`.
effort:            2
dedup:             none — no open issue in the frozen 15-issue snapshot mentions packaging, vsce, esbuild, minification or the VSIX; 0 of the 15 carry the `dependencies` label and 0 name CI, a workflow, build configuration or a vendored binary.
disposition:       major-refactor — the edit is one line plus four deletions, but it changes what the release path produces, so it wants a deliberate packaging verification rather than an unattended Phase 67 apply.
proposed_approach: Point `vscode:prepublish` at `node ./esbuild.mjs --minify` and delete the dead `esbuild-base`, `esbuild`, `esbuild-watch` and `test-compile` scripts.
proposed_labels:   area=vscode; PRIO 2; effort 2
issue:             
```

```
id:                P64-D2-008
unit:              RU-64-02
location:          bbj-vscode/tsconfig.test.json:7-9
dimension:         D2
secondary:         [D4, D5]
severity:          medium
evidence_tier:     repro
evidence:          Reproduced by a read-only compiler invocation that emits nothing. `npx tsc -p tsconfig.test.json --noEmit`, run from `bbj-vscode/`, prints exactly two diagnostics and exits non-zero: `tsconfig.test.json(7,18): error TS6306: Referenced project '/home/coder/repos/bbj-language-server/bbj-vscode/tsconfig.json' must have setting "composite": true.` and `tsconfig.test.json(7,18): error TS6310: Referenced project '.../tsconfig.json' may not disable emit.` Both are structural: `tsconfig.test.json:7-9` declares `"references": [{ "path": "tsconfig.json" }]`, while `tsconfig.json:2-17` declares neither `composite: true` nor emit — `:7` sets `noEmit: true`. A project reference is valid only against a composite, emitting project, so this configuration cannot be compiled in any mode that honours the reference. The reason no one has noticed is that nothing runs it: `grep -rn 'tsconfig.test'` across every `.json`, `.ts`, `.js`, `.mjs`, `.yml` and `.md` in the tree, excluding `node_modules/` and `.planning/`, returns zero hits outside the file itself — no entry in `package.json:652-668`, no workflow step, no editor configuration. `package.json:655`'s `build` type-checks `tsconfig.json` only, whose `include` is `["src/**/*.ts"]` (`:18-20`), so the 117 TypeScript files under `src/` and `test/` are covered for linting (120 exist; `eslint.config.js:5` ignores `src/language/generated/**`, 3 files) (`:657`, `eslint src test`) but the `test/` half is type-checked by nothing. The file also carries a trailing comma at `:11` (`"test/**/*",`), which tsc tolerates in JSONC and which is noted as cosmetic rather than causal.
failure_scenario:  A contributor follows the file's evident intent and runs `npx tsc -b tsconfig.test.json` (or wires it into `npm run build`, or an editor picks it up as the test project). The build fails immediately with TS6306/TS6310 before type-checking a single test file. Meanwhile, in the state that actually ships, every type error in `test/` — 50 test files — passes unnoticed through both `npm run build` and CI, because the only configuration that claims to cover them is the one that cannot run. A type error introduced in a test helper surfaces as a vitest runtime failure with a confusing message rather than as a compile error, or does not surface at all in a code path the suite does not take.
classification:    major — (1) at most one file: PASS if the fix is to drop the invalid `references` block from `tsconfig.test.json`; the alternative fix (make `tsconfig.json` composite and emitting) touches two. (2) no public API / no grammar rule / no LSP contract change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the existing harness: FAIL — no test asserts that any tsconfig compiles, and adding one means wiring a type-check step that does not exist today. (5) reviewer can name the exact edit: PASS — delete `tsconfig.test.json:7-9` and add a `typecheck` script that runs `tsc -p tsconfig.test.json --noEmit`. (6) severity is neither critical nor high AND primary dimension is not D1: PASS. Only test (4) fails, which makes this `major`.
effort:            2
dedup:             none — no open issue in the frozen 15-issue snapshot mentions TypeScript configuration, project references or type-checking the test suite; 0 of the 15 carry the `dependencies` label and 0 name CI, a workflow or build configuration.
disposition:       major-refactor — the honest fix is not the one-line deletion but wiring a type-check for `test/` that nothing runs today, which is a build-pipeline change rather than an unattended edit.
proposed_approach: Delete `tsconfig.test.json:7-9` and add a `typecheck` script that runs `tsc -p tsconfig.test.json --noEmit`.
proposed_labels:   area=vscode; PRIO 2; effort 2
issue:             
```

```
id:                P64-D2-009
unit:              RU-64-02
location:          bbj-intellij/build.gradle.kts:93-98,115-119
dimension:         D2
secondary:         none
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace over the complete 135-line file; no runnable reproduction accompanies this record because the Gradle build does not execute in this environment (`./gradlew --offline -q dependencies` exits 1 in 723 ms — literal output recorded in the D6 cell) and this phase mutates nothing. Two tasks copy an artefact produced by a different toolchain: `copyLanguageServer` at `:93-98` copies `main.cjs` `from("${projectDir}/../bbj-vscode/out/language/")` into `resources/main/language-server`, and the `prepareSandbox` customisation at `:115-119` copies the same file into `${pluginName}/lib/language-server`. `out/language/main.cjs` is produced only by `bbj-vscode`'s `npm run build` (`bbj-vscode/package.json:655` → `esbuild.mjs:8-12`), and `bbj-vscode/.gitignore:1` is the line `/out/`, so it is never present in a fresh clone. The whole file was searched for a guard and there is none: no `dependsOn` on any bbj-vscode step, no `Exec` task that runs npm, no `onlyIf`, no `doFirst` existence assertion, no `inputs.files(...).withPropertyName(...)` declaration and no error path — the only `dependsOn` calls in the file are `:110-112`, which wire the three copy tasks into `processResources` and say nothing about their sources. The same pattern applies at `:83-91` (`copyTextMateBundle`) and `:100-107` (`copyWebRunner`), whose sources are tracked files and therefore always present; the language-server copy is the one whose source is a build output.
failure_scenario:  A contributor clones the repository and runs `./gradlew buildPlugin` in `bbj-intellij/` without first running `npm ci && npm run build` in `bbj-vscode/` — the order CLAUDE.md documents as two separate sections and no build file enforces. `../bbj-vscode/out/language/main.cjs` does not exist, because `/out/` is gitignored. Nothing in `build.gradle.kts` declares that dependency, tests for the file, or fails; the copy specifications at `:93-98` and `:115-119` simply have no matching source. The plugin the build assembles is missing the language server it exists to wrap, and the contributor has no signal from the build about why. The same silent-input condition applies in CI at `pr-validation.yml:61`, which is guarded only by an `actions/download-artifact` step earlier in the same job rather than by anything in the Gradle build itself.
classification:    major — (1) at most one file: PASS, the fix is confined to `build.gradle.kts`. (2) no public API / no grammar rule / no LSP contract change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the existing harness: FAIL — the Gradle build does not run in this environment, and no test asserts anything about the assembled plugin's contents. (5) reviewer can name the exact edit: PASS — declare the copy inputs explicitly and add a `doFirst` that fails with a directed message when `../bbj-vscode/out/language/main.cjs` is absent. (6) severity is neither critical nor high AND primary dimension is not D1: PASS. Only test (4) fails, which makes this `major`.
effort:            2
dedup:             none — no open issue in the frozen 15-issue snapshot mentions the IntelliJ build, plugin packaging or the language-server copy step; 0 of the 15 carry the `dependencies` label and 0 name CI, a workflow, build configuration or a vendored binary.
disposition:       major-refactor — the fix adds a failure path to a build this environment cannot execute, so it needs a real Gradle run to verify rather than an unattended Phase 67 apply.
proposed_approach: Declare the copy inputs explicitly and add a `doFirst` that fails with a directed message when `../bbj-vscode/out/language/main.cjs` is absent.
proposed_labels:   area=intellij; PRIO 2; effort 2
issue:             
```

```
id:                P64-D3-001
unit:              RU-64-01
location:          .github/workflows/build.yml:19-22
dimension:         D3
secondary:         none
severity:          medium
evidence_tier:     repro
evidence:          Trace with an enumeration; no runnable reproduction accompanies it because timing a GitHub-hosted runner requires running one. Exactly one of the six workflows configures a dependency cache: `deploy-docs.yml:29-34`, which sets `cache: npm` with `cache-dependency-path: documentation/package-lock.json` — a correct key for what it caches. The five `actions/setup-node@v4`/`@v3` steps that precede an `npm ci` against `bbj-vscode` set no `cache:` input at all: `build.yml:19-22` before `:27`, `pr-validation.yml:22-25` before `:30`, `pr-vsix.yml:41-44` before `:49`, `preview.yml:19-22` before `:32`, and `manual-release.yml:20-23` before `:34`. None of the three `actions/setup-java@v4` steps sets `cache: gradle` either — `pr-validation.yml:53-57` before `./gradlew buildPlugin` at `:61`, `preview.yml:90-94` before `./gradlew publishPlugin` at `:99`, and `manual-release.yml:119-123` before three `./gradlew` invocations at `:127`, `:133` and `:137`. The cost is larger than a package download: `bbj-vscode/package.json` declares `"prepare": "npm run langium:generate && npm run build"`, and npm runs `prepare` automatically after `npm ci`, so every uncached run repeats a full Langium grammar regeneration and esbuild bundle in addition to installing the dependency tree, and every uncached Gradle run re-resolves the IntelliJ Platform dependencies. `bbj-vscode/package-lock.json` is 7,894 lines, so the cache key that would serve these five is the same one `deploy-docs.yml` already uses for its own tree.
failure_scenario:  Any pull request to `main` that touches `bbj-vscode/**` starts at least two jobs — `build.yml`'s and `pr-vsix.yml`'s (see `P64-D3-002`) — and each performs a complete cold `npm ci` plus the `prepare` regeneration and bundle before it does any work specific to its own purpose. A PR touching `bbj-intellij/**` additionally resolves the IntelliJ Platform dependency set from scratch in `pr-validation.yml`. The wrong behaviour is not an incorrect result but a fixed, repeated cost paid on every run of five of six workflows, on a repository whose CI already runs two to three overlapping builds per pull request; the same runner minutes are spent regenerating artefacts that are byte-identical to the previous run's whenever the lockfile has not changed.
classification:    major — (1) at most one file: FAIL, five workflows would each need the input added. (2) no public API / grammar / LSP change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the existing harness: PASS under the reading stated above — a cache hit or miss is visible in the very next run of each workflow. (5) reviewer can name the exact edit: PASS — add `cache: npm` and `cache-dependency-path: bbj-vscode/package-lock.json` to the five `setup-node` steps and `cache: gradle` to the three `setup-java` steps. (6) severity is neither critical nor high AND primary dimension is not D1: PASS. Only test (1) fails, and it fails solely on file count.
effort:            2
dedup:             none — the frozen 15-issue snapshot contains no issue about CI duration, caching or build performance.
disposition:       major-refactor — the edit is mechanical and low-risk, but test (1) fails on file count, and INVENTORY 3c admits no exception for a change that is small in each of several files; recorded as `major` rather than reclassified to fit the fix.
proposed_approach: Add `cache: npm` and `cache-dependency-path: bbj-vscode/package-lock.json` to the five `setup-node` steps and `cache: gradle` to the three `setup-java` steps.
proposed_labels:   area=BBj integration and infrastructure; PRIO 2; effort 2
issue:             
```

```
id:                P64-D3-002
unit:              RU-64-01
location:          .github/workflows/build.yml:3-9
dimension:         D3
secondary:         none
severity:          medium
evidence_tier:     repro
evidence:          Trace across the three pull-request workflows; no runnable reproduction accompanies it because GitHub Actions cannot be executed in this checkout. `build.yml:7-9` declares `pull_request: branches: [main]` with **no `paths:` filter**, so it runs on every pull request to `main` regardless of what changed, and performs `npm ci` (`:27`), `npm run build` (`:28`), the full vitest suite (`:34`) and `npx vsce package` (`:39`). `pr-vsix.yml:12-17` declares the same trigger behind `paths: ['bbj-vscode/**', '.github/workflows/pr-vsix.yml']` and performs `npm ci`, `npm run build` and `npm run test` at `:46-51` followed by `npx vsce package` at `:61`. The two overlap completely for any pull request touching `bbj-vscode/**`, which is the majority of this repository's pull requests: the same commit is installed, built, tested and packaged twice, in two jobs, on two runners, with no cache between them (`P64-D3-001`). At the other end, a pull request touching only `documentation/`, `QA/`, `examples/` or `.planning/` still runs `build.yml` in full, including the vitest suite and a VSIX package, for a change that cannot affect any of them — `deploy-docs.yml:7-9`, `pr-validation.yml:8-13` and `pr-vsix.yml:15-17` all scope themselves with `paths:` filters, so `build.yml` is the only unscoped one. Neither `build.yml` nor `pr-validation.yml` declares a `concurrency:` group, so superseded runs are not cancelled and a branch pushed three times leaves three full builds running to completion.
failure_scenario:  A contributor opens a pull request that edits `bbj-vscode/src/language/bbj.langium` and pushes three times over ten minutes while responding to review. Each push starts a fresh `build.yml` run (cold install, build, full vitest suite, VSIX package) and a fresh `pr-vsix.yml` run (cold install, build, full vitest suite, VSIX package), and because neither declares a `concurrency:` group for `build.yml`, none of the earlier `build.yml` runs is cancelled. Six full builds of the same project execute for one pull request, four of them for commits nobody will look at again. Separately, a documentation-only pull request — which `deploy-docs.yml` correctly declines to build — still triggers a complete `build.yml` run including the vitest suite.
classification:    major — (1) at most one file: PASS in the narrowest reading, since a `paths:` filter and a `concurrency:` block would both go in `build.yml`. (2) no public API / grammar / LSP change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the existing harness: PASS under the reading stated above for the `paths:` filter; the concurrency half is the "conditions a run cannot stage" side and is weaker. (5) reviewer can name the exact edit: FAIL — deciding whether `build.yml` should gain a `paths:` filter, be merged into `pr-vsix.yml`, or deliberately remain the one unconditional gate on every pull request is a CI-policy decision about what `main` is protected by, not a nameable edit; the wrong choice removes the only check that currently runs on every PR. (6) severity is neither critical nor high AND primary dimension is not D1: PASS. Test (5) fails.
effort:            4
dedup:             none — the frozen 15-issue snapshot contains no issue about CI duration, redundant builds or workflow triggers.
disposition:       major-refactor — the decision changes what protects `main`, so it is documented for review rather than applied by Phase 67.
proposed_approach: The manifest file is `.github/workflows/build.yml:3-9`, and the decision it turns on is what protects `main`: whether `build.yml` gains a `paths:` filter (bringing it in line with every other scoped workflow), is merged into `pr-vsix.yml` so the two stop running the same install-build-test-package sequence twice per pull request, or deliberately stays the one unconditional gate that runs on every PR regardless of what changed — the wrong choice removes the only check `main` currently has on every pull request, which is why this is a review decision rather than a nameable edit. The sibling `on:`-block change is already applied: `P64-D4-004` landed in Phase 67 as a recorded D-06 departure, removing the dead `push: branches: [typefox-dev]` trigger and leaving `on:` with `pull_request` alone — an implementer starts from that state, not the pre-Phase-67 one (Phase 67 close-out §"Recorded departures").
proposed_labels:   area=BBj integration and infrastructure; PRIO 2; effort 4
issue:             
```

```
id:                P64-D3-003
unit:              RU-64-02
location:          bbj-vscode/package.json:653
dimension:         D3
secondary:         [D4]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace across the manifest and the workflows that invoke it; no runnable reproduction accompanies this record because measuring CI wall-clock would require dispatching a workflow, which this phase does not do. `package.json:653` declares the lifecycle hook `"prepare": "npm run langium:generate && npm run build"`. npm runs `prepare` after every `npm install` **and** every `npm ci`, so it is not opt-in. `grep -rn 'npm ci' .github/workflows/` returns 8 occurrences; three of them are immediately followed by an explicit second build on the next line — `build.yml:27-28`, `pr-vsix.yml:49-50` and `pr-validation.yml:30-31`. Each of those jobs therefore runs `langium generate` (regenerating `src/language/generated/`, ~17.5k LOC, plus `syntaxes/gen-bbj.tmLanguage.json`), a full `tsc -b tsconfig.json` over the 53 tracked files under `src/language/` plus the rest of `src/`, and a full esbuild bundle of both entry points — twice. The second pass is not cheap: `tsconfig.json:2-17` declares neither `composite: true` nor `incremental: true`, so `-b` build mode has no project graph and writes no `.tsbuildinfo`, making every invocation a cold full type-check; and `esbuild.mjs` uses `esbuild.context()` + `rebuild()` per process (`:7`, `:26`), so nothing carries over between the two runs either. The redundancy is structural rather than incidental: the workflows are correct to build explicitly, and `prepare` is the hook that makes the explicit build a duplicate.
failure_scenario:  Any push to `typefox-dev`, or any pull request to `main` matching `pr-validation.yml:8-13`'s path filters, or any pull request touching `bbj-vscode/**`. The runner executes `npm ci`, npm fires `prepare`, and the full generate-plus-typecheck-plus-bundle pipeline runs to completion; the next line then runs `npm run build`, repeating the type-check and the bundle from cold. Every CI run of those three workflows pays the build twice, and every contributor who runs `npm install` locally pays it once before doing anything — including contributors who only wanted to update a dependency. The cost is duplicated work rather than incorrect output, which is why this is `low`.
classification:    major — (1) at most one file: PASS, the fix is confined to `package.json`. (2) no public API / no grammar rule / no LSP contract change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the existing harness: FAIL — vitest asserts nothing about build timing or lifecycle-hook behaviour, and verifying the change means observing a CI run. (5) reviewer can name the exact edit: PASS — either narrow `prepare` to `npm run langium:generate` (the part a fresh checkout genuinely needs) and let each caller build explicitly, or drop the redundant `npm run build` line from the three workflows. (6) severity is neither critical nor high AND primary dimension is not D1: PASS. Only test (4) fails, which makes this `major`.
effort:            2
dedup:             none — no open issue in the frozen 15-issue snapshot mentions build time, CI duration, npm lifecycle scripts or Langium code generation; 0 of the 15 carry the `dependencies` label and 0 name CI, a workflow or build configuration.
disposition:       major-refactor — the edit is small but it changes what a bare `npm install` leaves behind, which several documented workflows and CLAUDE.md's own quickstart depend on, so it is a deliberate change rather than an unattended one.
proposed_approach: Either narrow `prepare` to `npm run langium:generate` (the part a fresh checkout genuinely needs) and let each caller build explicitly, or drop the redundant `npm run build` line from the three workflows.
proposed_labels:   area=vscode; PRIO 3; effort 2
issue:             
```

```
id:                P64-D4-001
unit:              RU-64-03
location:          bbj-vscode/tools/interop-test-harness/run-tests.ts:256-592,651-979
dimension:         D4
secondary:         none
severity:          low
evidence_tier:     trace
evidence:          Written trace naming the code shape, which is what D4's tier requires; the measurements below are mechanical rather than impressionistic. `grep -nE '^(async )?function ' run-tests.ts` returns 18 top-level declarations. Two of them hold 666 of the file's 1,058 lines: `defineTests` at `:256-592` (337 lines) and `generateReport` at `:651-979` (329 lines, `:760-978` of which is one 219-line HTML/CSS template literal). No other declaration approaches that — the next largest are `main` at `:983-1053` (71) and `runGetClassInfo` at `:154-193` (40). Inside `defineTests` the 17 cases split into two populations: cases 1-11 (`:259`, `:295`, `:309`, `:322`, `:347`, `:364`, `:372`, `:385`, `:395`, `:406`, `:416`) are one-line closures delegating to the shared `runGetClassInfo` helper, while cases 12-17 (`:422`, `:457`, `:491`, `:520`, `:546`, `:568`) are inline async closures that each re-implement that helper's whole scaffold — timing start, `try`, `sendRequest`, assertion accumulation, a literal `TestResult`, and a `catch` producing an `error`-status `TestResult` — at roughly 30 lines apiece, about 180 duplicated lines. The abstraction that would remove the duplication already exists in the file and is used by two thirds of the cases.
failure_scenario:  A maintainer adds an eighteenth test case for a method that returns something other than a class-info object, so `runGetClassInfo` does not fit and the case is written by copying case 16 or 17 — the established pattern for that shape. The copy carries whatever the source copy got wrong. That is not hypothetical: it is exactly how `P64-D2-001` came about, with two of the six copies (`:510`, `:579` and `:584`) returning a hardcoded `status: 'pass'` while the other four compute `failed` correctly at `:446`, `:480`, `:535` and `:557`. The next divergence has the same shape and the same probability of going unnoticed, because there is no single place where the case protocol is defined.
classification:    major — (1) at most one file: PASS. (2) no public API change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the existing harness: FAIL — `tools/` is outside `tsconfig.json`'s include (`src/**/*.ts`), outside `tsconfig.test.json`'s (`test/**/*`), outside `npm run lint` (`eslint src test`) and outside vitest's default pattern, and the module self-executes `main()` at `:1055`, so a regression test needs new infrastructure. (5) reviewer can name the exact edit: PASS — generalise `runGetClassInfo` over the request type so cases 12-17 delegate to it, and split the report's template literal out of `generateReport`. (6) severity is neither critical nor high AND primary dimension is not D1: PASS. One test fails, so `major`.
effort:            8
dedup:             none — no issue in the frozen 15-issue snapshot concerns the interop test harness, its structure, or code organisation anywhere under `bbj-vscode/tools/`.
disposition:       major-refactor — recorded for Phase 68's `MAJOR-REFACTORS.md`; not applied here.
proposed_approach: Generalise `runGetClassInfo` over the request type so cases 12-17 delegate to it, and split the report's template literal out of `generateReport`.
proposed_labels:   area=BBj integration and infrastructure; PRIO 3; effort 8
issue:             
```

```
id:                P64-D4-002
unit:              RU-64-03
location:          bbj-vscode/tools/interop-test-harness/run-tests.ts:659
dimension:         D4
secondary:         none
severity:          low
evidence_tier:     trace
evidence:          Written trace with a mechanical basis. `grep -n 'criticalFields' run-tests.ts` returns exactly **one** line, the declaration at `:659`: `const criticalFields = ['isStatic', 'isDeprecated', 'constructors', 'name', 'returnType', 'type', 'parameters', 'packageName'];`. It is never read anywhere in the 1,058 lines. The code that actually decides what counts as a critical field is `:1045`, which hardcodes its own, different, three-element list inline. So the file contains two definitions of "critical field", one authoritative and one inert, and the inert one is the longer and more plausible-looking of the two. This is also the reason `run-tests.ts:6`'s header claim about validating "every critical field" reads as true to anyone who greps for the term — see `P64-D8-001`.
failure_scenario:  A maintainer extends the critical-field set by editing `:659`, which is the obvious place and the only place the phrase is defined as a list. Nothing changes: the report still passes and the exit code is still decided by the three hardcoded names at `:1045`. The edit is silently inert, and the reviewer of that change has no signal that it did nothing.
classification:    major — (1) at most one file: PASS. (2) no public API change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the existing harness: FAIL, for the same reasons as `P64-D4-001`. (5) reviewer can name the exact edit: PASS — either delete `:659` or make `:1045` derive its list from it. (6) severity is neither critical nor high AND primary dimension is not D1: PASS. One test fails, so `major`. Recorded rather than waved through as trivial precisely because the trivial reading is what leaves the inert definition in place.
effort:            2
dedup:             none — the frozen 15-issue snapshot contains no issue about the interop harness or dead code anywhere in the repository.
disposition:       major-refactor — small edit, `major` by INVENTORY 3c test (4); it does not enter Phase 67's `easy` apply path without a `MAJOR-REFACTORS.md` record first.
proposed_approach: Either delete `:659` or make `:1045` derive its list from it.
proposed_labels:   area=BBj integration and infrastructure; PRIO 3; effort 2
issue:             
```

```
id:                P64-D4-003
unit:              RU-64-01
location:          .github/workflows/build.yml:16-34
dimension:         D4
secondary:         none
severity:          medium
evidence_tier:     trace
evidence:          Written trace across the six files; nothing is run, and nothing needs to be — D4 is a `trace`-tier dimension under INVENTORY 3b and the code shape is the evidence. Five workflows carry the same checkout → Node setup → `npm ci` → build preamble against `bbj-vscode`: `build.yml:17-28`, `pr-validation.yml:20-31`, `pr-vsix.yml:36-51`, `preview.yml:17-32`, `manual-release.yml:18-34`. Three carry a second common sequence — download the `language-server` artifact, `setup-java@v4` with `temurin`/`17`, then `./gradlew` in `bbj-intellij`: `pr-validation.yml:47-61`, `preview.yml:84-102`, `manual-release.yml:113-137`. A third block, the twelve-line version-bump-commit-and-push, is duplicated in full between `preview.yml:34-60` and `manual-release.yml:61-82` with different commit messages and different version arithmetic. No composite action or reusable workflow exists to hold any of them: `ls .github/` prints exactly `dependabot.yml` and `workflows`, so there is no `.github/actions/` directory. The duplication has already drifted on six measurable axes, each counted rather than asserted: step indentation (`build.yml:17` uses 4 spaces, the other five use 6); directory handling (`grep -n 'working-directory:' .github/workflows/*.yml` returns 20 hits across five files, while `build.yml:26,33,38` alone uses `cd bbj-vscode` inside `run:`); shell declaration (`grep -n 'shell:'` returns 3 hits, all in `build.yml`); action major (`build.yml:18,20` on `@v3`, everything else `@v4`); caching (only `deploy-docs.yml:29-34`); and step naming for the identical step — "Use Node.js" (`build.yml:19`), "Setup Node.js" (`deploy-docs.yml:29`), "Set up Node" (`pr-validation.yml:22`, `pr-vsix.yml:41`, `preview.yml:19`, `manual-release.yml:20`). Checkout appears as a bare `- uses:` in six places and as a named step in three. What is not recorded as a defect, because the Actions model requires it: every job runs on a fresh runner, so a checkout and a toolchain setup must physically appear in each job that needs them. The defect is that their contents differ and that nothing makes them identical.
failure_scenario:  A maintainer bumps the project to a new Node major. The change has to be made in six places (`build.yml:22`, `deploy-docs.yml:32`, `pr-validation.yml:25`, `pr-vsix.yml:44`, `preview.yml:22`, `manual-release.yml:23`), two of which carry an explanatory comment that also has to be updated and four of which do not. Missing one leaves a workflow silently building the project on a different Node than the others — which is precisely the state `build.yml` is already in with respect to the `actions/*` majors (`P64-D6-004`), where the divergence has persisted long enough for five files to move without it. The same shape governs the caching fix (`P64-D3-001`, five files) and the permissions fix (`P64-D1-005`, four files): each is individually trivial and each fails classification test (1) purely because the preamble was never factored out.
classification:    major — (1) at most one file: FAIL, the abstraction has to be introduced once and adopted in five or six files. (2) no public API / no grammar rule / no LSP contract change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the existing harness: PASS under the reading stated at the head of this section — each migrated workflow is exercised by its own next run. (5) reviewer can name the exact edit: FAIL — choosing between a composite action, a reusable workflow and leaving the preambles inline but normalised is a structural decision, and the drifted axes have to be reconciled to a single convention before any of them can be shared. (6) severity is neither critical nor high AND primary dimension is not D1: PASS. Tests (1) and (5) fail.
effort:            8
dedup:             none — the frozen 15-issue snapshot contains no issue about CI structure, workflow maintenance or build configuration; 0 of the 15 carry the `dependencies` area label and 0 name a workflow.
disposition:       major-refactor — a structural change across six workflow files that only a real run of each can validate; Phase 67 does not apply it, and it carries `P64-D3-001`, `P64-D1-005` and `P64-D6-004` with it as the reason each of those is a multi-file edit rather than a one-line one.
proposed_approach: The manifest files are the six workflows under `.github/workflows/` that duplicate the checkout/Node-setup/`npm ci` preamble (`build.yml`, `pr-validation.yml`, `pr-vsix.yml`, `preview.yml`, `manual-release.yml`, `deploy-docs.yml`), with no `.github/actions/` directory to hold a shared version. The observable that changes once this is done is that the six measured drift axes this record counts — step indentation, `working-directory:` usage, `shell:` declarations, action majors, caching, and step naming for the identical step — converge to one value each instead of diverging further. Closing this is a structural decision between a composite action, a reusable workflow, and leaving the preambles inline but normalised to one convention; whichever is chosen carries `P64-D3-001` (caching), `P64-D1-005` (permissions) and `P64-D6-004` (action-major staleness) with it, since each of those is a multi-file edit only because this preamble was never factored out.
proposed_labels:   area=BBj integration and infrastructure; PRIO 2; effort 8
issue:             
```

```
id:                P64-D4-005
unit:              RU-64-02
location:          bbj-vscode/eslint.config.js:16
dimension:         D4
secondary:         [D5]
severity:          medium
evidence_tier:     trace
evidence:          Mechanical, and confirmed by running the tool rather than by reading the file alone. `eslint.config.js` is 18 lines in total: `:1` imports `typescript-eslint`, `:4-6` set `ignores: ['out/**', 'src/language/generated/**']`, `:7-12` apply the TypeScript parser to `**/*.ts` with `sourceType: 'module'`, `:13-15` register the `@typescript-eslint` plugin, and `:16` declares `rules: {}`. There is no `extends`, no `tseslint.configs.recommended`, no `eslint.configs.recommended` and no shared preset anywhere in the file, so registering the plugin makes its rules *available* without enabling any of them. Verified: `npx eslint --print-config src/extension.ts` resolves **0 rule entries and 0 enabled rules**; `npx eslint src test` — the exact command `package.json:657`'s `lint` script runs, over the 117 linted `.ts` files under `src/` and `test/` — exits **0** with 2 warnings, and both warnings are `Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-explicit-any')` at `src/language/bbj-document-symbol-provider.ts:75` and `:149`. Those two lines are the strongest available evidence: a developer wrote suppressions for `no-explicit-any`, which means they expected it to be on, and ESLint reports the suppressions as unnecessary precisely because it is not. `lint` runs in CI only through `package.json:654`'s `vscode:prepublish`, so the decorative check also sits on the release path.
failure_scenario:  A contributor opens a pull request. `npm run lint` — invoked locally, and on the release path through `vscode:prepublish` — reports success on any TypeScript that parses: unused variables, floating promises, `any` everywhere, unsafe member access, missing `await`, unreachable code and every other rule in the `typescript-eslint` recommended set pass unexamined across all 120 files, because none of them is enabled. The project therefore carries the cost of a lint step (config file, dependency, script, CI time, the two suppression comments someone wrote in good faith) and receives none of its benefit, and — worse than having no linter — a green `npm run lint` reads to a reviewer as evidence the code was checked.
classification:    major — (1) at most one file: PASS, adding a preset is confined to `eslint.config.js`. (2) no public API / no grammar rule / no LSP contract change: PASS. (3) adds or upgrades no dependency: PASS — `typescript-eslint@^8.64.0` is already declared at `package.json:689` and already imported at `eslint.config.js:1`. (4) regression-testable with the existing harness: FAIL — the moment a rule set is enabled, `npm run lint` will report findings across 120 previously unlinted files, so the change cannot be verified green without a remediation pass of unknown size; that is a project of its own, not a regression test. (5) reviewer can name the exact edit: PASS — spread `...tseslint.configs.recommended` into the exported config. (6) severity is neither critical nor high AND primary dimension is not D1: PASS, `medium`/D4. Only test (4) fails, and it fails decisively, so this is `major`.
effort:            8
dedup:             none — no open issue in the frozen 15-issue snapshot mentions ESLint, linting or code style; 0 of the 15 carry the `dependencies` label and 0 name CI, a workflow or build configuration.
disposition:       major-refactor — enabling the rules is one line; making the tree pass them is not, and the size of that second step is unknown until the first is taken, so this belongs in `MAJOR-REFACTORS.md` with the remediation scoped before it is applied.
proposed_approach: Spread `...tseslint.configs.recommended` into the exported config.
proposed_labels:   area=vscode; PRIO 2; effort 8
issue:             
```

```
id:                P64-D4-006
unit:              RU-64-02
location:          bbj-vscode/package.json:629-650,662-664
dimension:         D4
secondary:         [D8]
severity:          low
evidence_tier:     trace
evidence:          Three independent pieces of dead configuration, each established by a grep whose result is recorded rather than summarised. **(a) Three unreachable scripts.** `esbuild` (`:662`) and `esbuild-watch` (`:663`) both delegate to `esbuild-base`, and `test-compile` (`:664`) is `tsc -p ./`. Searching the tree for each name, excluding `node_modules/` and `.planning/`, returns only its own declaration in `package.json` — no workflow step invokes them (`grep -rn 'npm run' .github/workflows/` lists only `build`, `test` and the documentation package's own build), no other script chains them, and `CLAUDE.md`'s Build & Test Commands section names none of the three. Their sibling `esbuild-base` (`:661`) is reachable, but only from `vscode:prepublish`, and what it produces is `P64-D2-007`'s subject. **(b) A generated artefact nothing consumes.** `langium-config.json:14` sets the TextMate generator's `out` to `syntaxes/gen-bbj.tmLanguage.json`. `grep -rn 'gen-bbj'` over every `.json`, `.ts`, `.kts` and `.md` in the tree, excluding `node_modules/` and `.planning/`, returns **exactly one line — that declaration itself**. `package.json:63-66` ships `./syntaxes/bbj.tmLanguage.json` instead, `git ls-files bbj-vscode/syntaxes/` tracks only `bbj.tmLanguage.json` and `bbx.tmLanguage.json`, and `.gitignore:3` ignores the generated file. Since `prepare` (`:653`) runs `langium:generate` on every install, the artefact is regenerated on every contributor machine and every CI runner and read by nothing. **(c) The manifest disagrees with itself about its own commands.** Comparing the two blocks programmatically: `contributes.commands` (`:79-199`) declares **19** commands; `activationEvents` (`:629-650`) declares **18** `onCommand:` entries; `bbj.showClasspathEntries` and `bbj.refreshJavaClasses` are contributed with no activation event, and `onCommand:bbj.autoComment` names a command that `contributes.commands` does not declare at all. `bbj.denumber` is additionally the one contributed command with no `category`.
failure_scenario:  Nothing breaks at runtime, which is why this is `low` and is recorded as maintainability rather than correctness: VS Code 1.74+ auto-generates activation events for contributed commands, so the two unlisted commands still activate, and an `onCommand:` entry for a nonexistent command is simply never triggered. The failure is to the reader and to the build. A maintainer auditing this manifest to answer "which commands does this extension contribute?" gets two different answers from two adjacent blocks, and the one extra name in `activationEvents` suggests a command that was removed or renamed without its activation entry being cleaned up — so the manifest records a history rather than a state. A maintainer asking "what does `npm run esbuild` do?" finds a script that produces an output no part of this project loads. And every install pays for regenerating a TextMate grammar that is gitignored and unreferenced, while the grammar that actually ships is hand-maintained beside it — so the generator's role in this project is ambiguous from the configuration alone.
classification:    major — (1) at most one file: **FAIL** — the deletions span two manifests, `package.json` (the three dead scripts and the phantom `onCommand:` entry) and `langium-config.json` (the unused `textMate.out` directive). Every other test passes: (2) no public API / no grammar rule / no LSP contract change: PASS — removing a `textMate.out` directive changes no rule in `bbj.langium`. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the existing harness: PASS — `npm run build`, `npm run langium:generate` and the 50-file vitest suite all run unchanged, and every deleted entry is provably referenced by nothing. (5) reviewer can name the exact edit: PASS — delete `package.json:662`, `:663`, `:664` and the `onCommand:bbj.autoComment` entry, and remove the `textMate` block at `langium-config.json:13-15`. (6) severity is neither critical nor high AND primary dimension is not D1: PASS. **Test (1) is the sole failure, and it fails only on a file count of two** — the tests are applied as written rather than as convenient, so this is `major` despite being the least risky edit in the unit. Splitting it into two single-file findings would make both `easy`; that is noted rather than done, because inventing a split to clear a threshold is precisely the gaming D-13 is meant to resist.
effort:            2
dedup:             none — no open issue in the frozen 15-issue snapshot mentions dead scripts, activation events, the TextMate generator or manifest hygiene; 0 of the 15 carry the `dependencies` label and 0 name CI, a workflow or build configuration.
disposition:       major-refactor — classification governs the routing, so this goes to Phase 68's `MAJOR-REFACTORS.md` rather than Phase 67's apply path, even though the edit itself is three provably unreferenced deletions verifiable by re-running the existing build and suite.
proposed_approach: Delete `package.json:662`, `:663`, `:664` and the `onCommand:bbj.autoComment` entry, and remove the `textMate` block at `langium-config.json:13-15`.
proposed_labels:   area=vscode; PRIO 3; effort 2
issue:             
```

```
id:                P64-D5-001
unit:              RU-64-03
location:          bbj-vscode/tools/interop-test-harness/run-tests.ts:1-1058
dimension:         D5
secondary:         none
severity:          medium
evidence_tier:     inherited
evidence:          Resolves to `trace`, because what this record asserts is a missing test rather than a runtime behaviour, and the absence was established by enumeration with each command's output recorded. `find bbj-vscode/tools -name '*.test.ts' -o -name '*.spec.ts' | wc -l` prints `0`. A repository-wide grep for `run-tests` and `interop-test-harness`, excluding `node_modules/` and `.planning/`, returns only `.gitignore:22` (ignoring the harness's own `report.html` output) and the file's usage comment at `:11-13`. None of the 15 `bbj-vscode/package.json` scripts invokes it. `tsconfig.json` includes `src/**/*.ts` only and `tsconfig.test.json` includes `test/**/*` only, so `npm run build` never type-checks it; `npm run lint` is `eslint src test`, so ESLint never sees it. Its one documented invocation, `npx tsx tools/interop-test-harness/run-tests.ts` (`:9-13`), appears in no script, no workflow and no project document, and is not even reachable offline because `tsx` is undeclared and absent from `node_modules/` (see `P64-D6-001`). `.github/workflows/pr-validation.yml:11` lists `bbj-vscode/tools/**` among its `paths:` filters, so this tree is a CI *trigger* while being the subject of nothing CI runs. The three `.bbj` scripts have no surface at all: `example-files.test.ts:14-17` auto-parses only what is under `bbj-vscode/test/test-data/`. Already-owned debt is cross-referenced, not re-recorded (D-15): the 11 known-failing `linking.test.ts` tests belong to `RU-61-06` by INVENTORY's routing table, and the 3 disabled `parser.test.ts` assertions to DEBT-02. Neither is restated in this record.
failure_scenario:  Someone edits `run-tests.ts` — to add a case, to change an assertion, or to fix `P64-D2-001` — and opens a pull request. `pr-validation.yml` fires because the path filter matches, builds both projects, and passes. No type-checker has read the change, no linter has read it, no test has run it, and the only thing that would have exercised it is a manual `npx tsx` invocation that requires a live npm registry and a running java-interop peer on port 5008. A syntax-valid but semantically broken harness therefore merges green, and the breakage surfaces only the next time a human runs the harness by hand — which, as this record establishes, nothing in the project schedules or reminds anyone to do.
classification:    major — (1) at most one file: FAIL, closing this means changing tsconfig or lint scope, adding a test entry point, and probably a `package.json` script. (2) no public API change: PASS. (3) adds or upgrades no dependency: FAIL, running the harness at all requires declaring `tsx`. (4) regression-testable with the existing harness: FAIL by definition — the gap *is* the absence of that harness for this tree. (5) reviewer can name the exact edit: FAIL, the scope of what to bring under test is a decision, not an edit. (6) severity is neither critical nor high AND primary dimension is not D1: PASS. Four tests fail.
effort:            8
dedup:             none — the frozen 15-issue snapshot contains no issue about test coverage, CI scope, lint scope, or the interop harness.
disposition:       major-refactor — recorded for Phase 68's document split and Phase 69's filing. Distinct from DEBT-02 (disabled `parser.test.ts` assertions) and from `RU-61-06`'s failing `linking.test.ts` tests, both of which concern tests that exist; this record concerns a tree that has none.
proposed_approach: The concrete file is `bbj-vscode/tools/interop-test-harness/run-tests.ts:1-1058`, which sits outside both `tsconfig.json`'s `src/**/*.ts` include and `tsconfig.test.json`'s `test/**/*` include, and outside `npm run lint`'s `eslint src test` scope, so nothing type-checks or lints it despite `pr-validation.yml:11` triggering on changes under `bbj-vscode/tools/**`. The observable that changes once this is closed is that `npm run build` and `npm run lint` begin covering this file, and running it at all requires declaring `tsx` as a dependency it currently uses undeclared. What is not nameable as a single edit is the scope decision itself — whether the harness gets its own `tsconfig`, is folded into the existing `test/` tree, or gets a dedicated `package.json` script as its test entry point — which is why classification records this as a decision, not an edit.
proposed_labels:   area=BBj integration and infrastructure; PRIO 2; effort 8
issue:             
```

```
id:                P64-D5-002
unit:              RU-64-02
location:          bbj-vscode/vitest.config.ts:4-29
dimension:         D5
secondary:         [D4]
severity:          medium
evidence_tier:     inherited
evidence:          Resolves to `trace` — this asserts a missing declaration, not a runtime defect — with both sides of every count recorded rather than one side asserted. Three sources could state what constitutes this project's test suite, and all three were read. **(1) `vitest.config.ts`:** 30 lines; its `test` block (`:4-29`) contains only `coverage` (`:7-28`); it declares **no `include` and no `exclude` for test discovery**, so discovery falls entirely to vitest's built-in defaults, which are documented in vitest and nowhere in this repository. **(2) `tsconfig.test.json:10-12`:** declares `include: ["test/**/*"]` — the only written boundary in the repository — but the file cannot be compiled (`npx tsc -p tsconfig.test.json --noEmit` reports TS6306 and TS6310, recorded as `P64-D2-008`) and `grep -rn 'tsconfig.test'` across the tree finds nothing that runs it. **(3) `package.json:658,659,660,667`:** `test`, `test:watch`, `test:coverage` and `test:bbj` all delegate to `vitest` with no path argument and no glob, so they state no boundary either. Measured on both sides: `npx vitest list --filesOnly` resolves **50** files; `find . -path ./node_modules -prune -o \( -name '*.test.ts' -o -name '*.spec.ts' \) -print` finds **50**, all under `test/`. The counts agree, and the agreement is incidental: nothing in any of the three sources causes it. `out/` in particular is not in vitest's default exclude list and contains 3.5 MB of generated bundles in this checkout. Separately confirmed and not re-recorded: the 11 known-failing `linking.test.ts` tests belong to **`RU-61-06`** (Phase 61, per INVENTORY's routing table) and the 3 disabled `parser.test.ts` assertions belong to **DEBT-02**; `vitest.config.ts` declares no `exclude`, `bail`, `retry`, `testNamePattern` or `allowOnly`, so the configuration **surfaces** rather than conceals them — which is the only new thing this cell adds about them.
failure_scenario:  Two consequences, both reachable today. First, the test surface is undefined in writing: a contributor adding `tools/foo.test.ts` or a stray `*.test.ts` anywhere outside `test/` silently extends the suite, and a reviewer checking "is this file in the suite?" cannot answer from any file in the repository — the true boundary lives in vitest's defaults, which no source here states and which change between vitest majors. The project is on `vitest@^4.1.10`, a caret range, so a minor upgrade that alters default discovery would change the suite with no diff in this repository. Second, and concretely: because `tsconfig.json:18-20` includes only `src/**/*.ts` and the one configuration that names `test/**/*` is the broken one, **the 50 test files are type-checked by nothing** — `npm run build` never sees them, and `npm run lint` sees them but enforces zero rules (`P64-D4-005`). A type error in a test helper therefore surfaces as a confusing vitest runtime failure, or not at all on a path the suite does not take.
classification:    major — (1) at most one file: PASS if the fix is to declare `include`/`exclude` in `vitest.config.ts`; the complete fix also repairs `tsconfig.test.json` and wires a type-check script, which is `P64-D2-008`'s. (2) no public API / no grammar rule / no LSP contract change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the existing harness: FAIL — the check that the declared globs match the intended suite is exactly the thing no test asserts, and adding one means a meta-test that does not exist. (5) reviewer can name the exact edit: PASS — add `include: ['test/**/*.test.ts']` and an explicit `exclude` naming `out/**` and `node_modules/**` to `vitest.config.ts`'s `test` block. (6) severity is neither critical nor high AND primary dimension is not D1: PASS. Only test (4) fails, which makes this `major`.
effort:            2
dedup:             none — no open issue in the frozen 15-issue snapshot mentions vitest configuration, test discovery or type-checking the test suite; 0 of the 15 carry the `dependencies` label and 0 name CI, a workflow or build configuration. Cross-referenced rather than duplicated: `RU-61-06` owns the 11 failing `linking.test.ts` tests and DEBT-02 owns the 3 disabled `parser.test.ts` assertions; neither is re-recorded here.
disposition:       major-refactor — pairs with `P64-D2-008`; declaring the globs is trivial, but doing it correctly means deciding what the suite is and giving `test/` a working type-check, which is a build-pipeline decision rather than an unattended edit.
proposed_approach: Add `include: ['test/**/*.test.ts']` and an explicit `exclude` naming `out/**` and `node_modules/**` to `vitest.config.ts`'s `test` block.
proposed_labels:   area=vscode; PRIO 2; effort 2
issue:             
```

```
id:                P64-D6-001
unit:              RU-64-03
location:          bbj-vscode/tools/interop-test-harness/run-tests.ts:1,11-13
dimension:         D6
secondary:         none
severity:          medium
evidence_tier:     inherited
evidence:          Resolves to repro-equivalent: the claim is an absence, and it was established by three commands whose output is recorded rather than by reading the file alone. `run-tests.ts:1` is `#!/usr/bin/env npx tsx` and the file's own usage block at `:11-13` gives three invocations, all of the form `npx tsx tools/interop-test-harness/run-tests.ts`. Reading `bbj-vscode/package.json`: `tsx` appears in neither `dependencies` (8 entries) nor `devDependencies` (13 entries). `grep -c '"node_modules/tsx"' bbj-vscode/package-lock.json` prints `0`, so the lockfile pins no version of it and the resolved tree does not contain it — the two `"tsx"` strings that do occur in the lockfile, at lines 7390 and 7424, are a peer declaration inside another package's metadata, not a top-level install. `ls bbj-vscode/node_modules/tsx` reports the directory absent even though `node_modules/` is populated in this checkout. So the only documented way to run this file causes `npx` to resolve `tsx` from the public registry at execution time, at whatever version the registry serves that day. By contrast the file's one genuine library import, `vscode-jsonrpc/node` at `:20-26`, **is** declared (`vscode-jsonrpc: ^8.2.1`) and is therefore covered by `npm audit`, by the lockfile and by Dependabot — recorded so the finding is read as the specific gap it is rather than as a general complaint about the file.
failure_scenario:  A maintainer follows the file's own documented usage and runs `npx tsx tools/interop-test-harness/run-tests.ts`. `npx` downloads and executes whatever `tsx` the registry currently resolves to, with no version pin and no lockfile entry constraining it, and that package's install and run-time code executes with the developer's privileges. Nothing in this repository records which version was used, `npm audit` cannot report on a package that is not in the tree, and `.github/dependabot.yml` cannot open an update PR for a dependency that is not declared — so an advisory published against `tsx` would produce no signal here at all, in either direction.
classification:    major — (1) at most one file: PASS, the declaration lands in `package.json`. (2) no public API change: PASS. (3) adds or upgrades no dependency in `bbj-vscode/package.json`: **FAIL** — declaring `tsx` is precisely adding one. (4) regression-testable with the existing harness: FAIL, as for the other `run-tests.ts` records. (5) reviewer can name the exact edit: PASS — add a pinned `tsx` to `devDependencies` and drop `npx` from the shebang and the usage block. (6) severity is neither critical nor high AND primary dimension is not D1: PASS. Tests (3) and (4) fail. Note the interaction with D-09's mapping, stated rather than papered over: this is not a `fix-now` version bump, because the change adds a dependency declaration, which INVENTORY 3c test (3) makes `major` by construction. `triage: file-issue` and `classification: major` therefore agree with D-09's table rather than contradicting it.
effort:            2
dedup:             none — the frozen 15-issue snapshot contains no issue about tooling dependencies, the interop harness, or undeclared packages; 0 of the 15 carry the `dependencies` area label.
disposition:       major-refactor — referred to `RU-64-02` as a cross-unit referral below, because the `location:` of the defect is this file but the file the fix edits, `bbj-vscode/package.json`, is `RU-64-02`'s and is swept by plan `64-03`.
proposed_approach: Add a pinned `tsx` to `devDependencies` and drop `npx` from the shebang and the usage block.
proposed_labels:   area=dependencies; PRIO 2; effort 2
issue:             
```

```
id:                P64-D6-002
unit:              RU-64-03
location:          bbj-vscode/tools/formatter/lib/BBjCodeFomatter.jar
dimension:         D6
secondary:         none
severity:          high
evidence_tier:     inherited
evidence:          Resolves to trace-equivalent rather than to the advisory-reference bar, because the claim this record makes is not "version X has CVE Y" — it is that **no version exists to check**, and that absence is readable directly from the artifact. No runnable reproduction accompanies it: there is nothing to run, and D-11 prohibits the decompilation that would be the only way to learn more. `unzip -p bbj-vscode/tools/formatter/lib/BBjCodeFomatter.jar META-INF/MANIFEST.MF` emits two lines — `Manifest-Version: 1.0` and the terminating blank. There is no `Bundle-Version`, no `Implementation-Version`, no `Specification-Version`, no `Bundle-SymbolicName`, no `Implementation-Vendor`, no `Created-By`, no `Built-Date`, no SCM reference and no licence. Compare the sibling row: `jcommander-1.71.jar`'s manifest carries eleven identifying headers and can be queried against OSV. `sha256sum` gives `5df78cc81797d0c2e0c5c14eb75c5141a5edb1bb9d131e84ebaafd26a6c1cf9f` for 38,078 bytes, and that hash is the artifact's only stable identifier. Every other possible source of identity was checked and is absent: no lockfile entry, no `.pom`, no checksum file, no signature, no `build.xml` or `pom.xml` anywhere in the tree, no Gradle task, no npm script among the 15 in `package.json`, and no CI step. Coverage by automation is likewise absent: `.github/dependabot.yml` declares only the npm ecosystem for `/bbj-vscode`, so a `.jar` under `tools/` is outside its scan entirely — that file is `RU-64-01`'s and plan `64-02` sweeps it, so the boundary is noted without pre-empting its finding. The filename's typo, `Fomatter` for `Formatter`, corroborates a hand-copied vendored binary rather than a build-produced one.
failure_scenario:  A vulnerability is published against whatever library this JAR actually contains. The maintainer does everything right: runs `npm audit` over `bbj-vscode`, reads every Dependabot PR, reviews `package-lock.json`, and greps the repository for the affected package name. None of those can see the file — it is not in the npm tree, not in the lockfile, not in Dependabot's configured ecosystem, and its name matches nothing. A reviewer who goes further and opens the JAR's manifest by hand learns only that it is version 1.0 of the manifest format. There is no step at which the project can determine that it ships affected code, so the extension keeps shipping it indefinitely with no signal that action is required. This is a strictly worse posture than a known-vulnerable dependency, which at least has a name, a fixed version and a scanner that keeps raising it.
classification:    major — (1) at most one file: FAIL, resolving this means adding provenance metadata and a recorded hash, and probably a build or acquisition step. (2) no public API change: PASS. (3) adds or upgrades no dependency: PASS as stated, though the resolution may replace the artifact entirely. (4) regression-testable with the existing harness: FAIL, nothing tests the formatter path. (5) reviewer can name the exact edit: **FAIL** — nobody in this repository can name the edit, because nobody in this repository can say what the file is. That is the finding. (6) severity is neither critical nor high AND primary dimension is not D1: FAIL, severity is high. Four tests fail.
effort:            8
dedup:             none — no issue in the frozen 15-issue snapshot names the formatter, a vendored binary, or dependency provenance; 0 of the 15 carry the `dependencies` area label and 0 name CI, a workflow, build configuration or a vendored binary.
disposition:       major-refactor — **the fix this asks for is provenance, not a version bump.** What is needed is a statement of what the artifact is, where it came from, which version it is, and a recorded hash to pin it — after which it becomes triageable at all. Filed by Phase 69; not applied by Phase 67.
proposed_approach: Nobody in this repository can name the edit because nobody in this repository can say what `bbj-vscode/tools/formatter/lib/BBjCodeFomatter.jar` actually is: its manifest carries no version, vendor, SCM reference or licence — only `Manifest-Version: 1.0` — and the filename's own typo (`Fomatter`) corroborates a hand-copied artifact rather than a build-produced one. The provenance question that has to be answered first is what library this JAR contains and which upstream project or internal build produced it and at what version; that question is not answerable from this repository alone — it needs whoever originally vendored the file (a BASIS-internal build process, or an external project this checkout does not reference) to say what was copied in and from where. Once that provenance is established, the artifact becomes triageable the way its sibling `jcommander-1.71.jar` already is — checkable against an advisory database and pinnable by a recorded hash — but establishing it is a provenance investigation this record's evidence cannot substitute a plausible-sounding version-pin edit for.
proposed_labels:   area=dependencies; PRIO 1; effort 8
issue:             
```

```
id:                P64-D6-003
unit:              RU-64-01
location:          .github/workflows/manual-release.yml:18-162
dimension:         D6
secondary:         [D1]
severity:          medium
evidence_tier:     inherited
evidence:          Repro-equivalent per INVENTORY 3b: the claim is a pinning claim, and it is settled by enumeration rather than by an advisory reference or a runnable reproduction — no workflow was run. `grep -h 'uses:' .github/workflows/*.yml | wc -l` prints `36`, matching the count scouted at discussion time; `grep -c 'uses:' .github/workflows/*.yml` prints `build.yml` 3, `deploy-docs.yml` 5, `manual-release.yml` 11, `pr-validation.yml` 6, `pr-vsix.yml` 4, `preview.yml` 7, summing to 36. `grep -nE 'uses:.*@[0-9a-f]{40}' .github/workflows/*.yml | wc -l` prints `0`. Every one of the 36 references a mutable major-version tag; none names a commit SHA and none floats on a branch. The full set is 9 distinct actions in 11 distinct `action@ref` pairs: `actions/checkout@v4` ×9, `actions/upload-artifact@v4` ×8, `actions/setup-node@v4` ×5, `actions/download-artifact@v4` ×5, `actions/setup-java@v4` ×3, and one each of `actions/configure-pages@v4`, `actions/deploy-pages@v4`, `actions/upload-pages-artifact@v3`, `actions/github-script@v7`, `actions/checkout@v3` and `actions/setup-node@v3`. A mutable tag means the bytes executed at job start are whatever the tag points at then, so what runs can change without any change to this repository and without a reviewable diff; a commit SHA removes that property entirely. Two facts bound the severity honestly and are recorded rather than omitted: all 36 resolve to the first-party `actions/` organisation, which materially lowers likelihood, and `.github/dependabot.yml` declares no `github-actions` ecosystem (`P64-D6-005`), so nothing in the repository would notice or update these references either way. The highest-privilege combination of a mutable reference and a live secret is `preview.yml:71,105` and `manual-release.yml:93,100,140` — five `actions/upload-artifact@v4` steps inside the same jobs that hold `secrets.VSCE_PAT` and `secrets.JETBRAINS_MARKETPLACE_TOKEN` — with `actions/github-script@v7` at `pr-vsix.yml:77` the highest-capability reference outside them, since it executes JavaScript with an authenticated Octokit client.
failure_scenario:  A release of any one of the nine referenced actions is re-tagged or republished under its existing major tag — the ordinary mechanism by which `@v4` advances, and the mechanism an account compromise would ride. The next `preview.yml` or `manual-release.yml` run executes the new bytes inside a job that holds a marketplace publishing credential and, per `P64-D1-005`, a repository token at the permissive default scope. Nothing in this repository changes, no pull request is opened, and no diff exists for anyone to review; the first observable signal would be whatever the changed action does. The same exposure applies in the ordinary non-malicious case as a reproducibility gap: a build that succeeded last week and fails today cannot be attributed from the repository alone, because the workflow file is identical and the code it ran is not.
classification:    major — (1) at most one file: FAIL, all six workflows carry references. (2) no public API / grammar / LSP change: PASS. (3) adds or upgrades no dependency in `bbj-vscode/package.json` or `bbj-intellij/build.gradle.kts`: PASS — a GitHub Action reference is in neither manifest. (4) regression-testable with the existing harness: PASS under the reading stated above; a SHA-pinned reference either resolves or fails on the next run. (5) reviewer can name the exact edit: FAIL — pinning 36 references requires resolving each tag to a SHA and, to remain maintainable rather than immediately stale, adopting an update mechanism alongside it, which is a process decision rather than an edit. (6) severity is neither critical nor high AND primary dimension is not D1: PASS — `medium`, D6, with D1 secondary. Tests (1) and (5) fail.
effort:            4
dedup:             none — no open issue in the frozen 15-issue snapshot concerns GitHub Actions, pinning, supply-chain provenance or CI dependencies; 0 of the 15 carry the `dependencies` area label at all, which was re-derived in this file's header rather than assumed.
disposition:       major-refactor — routed to Phase 68's `MAJOR-REFACTORS.md` with the enumeration above attached, so the pin set does not have to be re-derived; the separate one-file `@v3` staleness at `P64-D6-004` is the part Phase 67 can apply.
proposed_approach: The manifest files are the six workflows under `.github/workflows/`, whose 36 `uses:` references cover 9 distinct actions and resolve entirely to mutable major-version tags (`grep -nE 'uses:.*@[0-9a-f]{40}' .github/workflows/*.yml` returns `0`). The edit is to pin each of the 36 references to the commit SHA its current tag currently resolves to, appending a `# vX.Y.Z` comment per GitHub's own convention so the human-readable version stays visible, and to adopt an update mechanism so the pins do not go stale — a `github-actions` Dependabot ecosystem entry (`P64-D6-005` names the same gap) is the natural fit since Dependabot already resolves SHA bumps for pinned actions. The tool-native check that proves the result is the same grep against all six files reporting `36` SHA-pinned references and `0` remaining mutable-tag references.
proposed_labels:   area=dependencies; PRIO 2; effort 4
issue:             
```

```
id:                P64-D6-005
unit:              RU-64-01
location:          .github/dependabot.yml:3-7
dimension:         D6
secondary:         none
severity:          medium
evidence_tier:     inherited
evidence:          Repro-equivalent per INVENTORY 3b: the claim is about declared coverage and is settled by reading the config and enumerating the trees it does and does not name. `.github/dependabot.yml` is 19 lines and 881 bytes, committed as `be402d6`, and declares `version: 2` with exactly one `updates:` entry — `package-ecosystem: "npm"`, `directory: "/bbj-vscode"`, `schedule: interval: "weekly"` (`:3-7`). Four dependency trees exist in this repository and the config names one of them. Uncovered: (a) `bbj-intellij`'s Gradle tree — `bbj-intellij/build.gradle.kts` plus `gradle/wrapper/gradle-wrapper.properties` — for which there is no `gradle` ecosystem entry, so it receives no automated update coverage at all; (b) `documentation/`'s npm tree, whose `package-lock.json` is 685,194 bytes and which `deploy-docs.yml:36-38` installs and builds on every documentation change, with no entry naming that directory; and (c) the 36 GitHub Actions references enumerated in `P64-D6-003`, for which there is no `github-actions` ecosystem entry — the direct cause of `build.yml` still sitting on `@v3` while five other files moved to `@v4` (`P64-D6-004`). The observable output agrees with the config rather than contradicting it: `git branch -r` lists five open Dependabot branches, all of them `dependabot/npm_and_yarn/bbj-vscode/*` (`concurrently`, `eslint`, `properties-file`, `types/node`, `typescript-eslint`), and none for gradle, github-actions or `documentation/`. The Gradle half of this gap is referred to `RU-64-02`/D6 in plan `64-03`, which under D-10 establishes that the same tree cannot be enumerated locally either; the composed result — unscanned by tooling *and* unenumerable by hand — is materially stronger than either half and belongs to that unit's SEC-08 triage, so it is stated as a referral here rather than pre-empted. The file's two `ignore:` entries are **not** part of this finding: both are well-reasoned, both were verified against the tree, and they are recorded in this unit's D6 cell line as the model of what `triage: accepted-with-reason` requires.
failure_scenario:  A published advisory affects a transitive dependency of the IntelliJ Platform Gradle plugin, or the Docusaurus tree under `documentation/`, or one of the nine GitHub Actions this repository executes. Dependabot opens no pull request, because none of those three trees is declared in its configuration, and the repository's maintainers see the same steady stream of `bbj-vscode` npm updates they always see — five such branches are open right now — which reads as working dependency automation rather than as partial coverage. Nothing else fills the gap: `RU-64-02` will establish that the Gradle tree cannot be enumerated locally either, so for that tree there is no automated signal and no manual one. The failure is therefore silent by construction: the absence of an alert is indistinguishable from the absence of a vulnerability.
classification:    major — (1) at most one file: PASS, `.github/dependabot.yml` alone. (2) no public API / grammar / LSP contract change: PASS. (3) adds or upgrades no dependency in `bbj-vscode/package.json` or `bbj-intellij/build.gradle.kts`: PASS — it changes what is watched, not what is installed. (4) regression-testable with the existing harness: FAIL — Dependabot runs on GitHub's schedule against the default branch, so no vitest run, no Gradle build and no workflow run can demonstrate that a new ecosystem entry works; this is the "conditions a run cannot stage" side of the reading above. (5) reviewer can name the exact edit: FAIL for the finding as a whole — the `github-actions` and `documentation/` entries are nameable, but whether the Gradle tree should be covered by Dependabot, by a different scanner, or accepted with a written reason is exactly the criterion-3 triage decision `RU-64-02` owns. Tests (4) and (5) fail.
effort:            4
dedup:             none — 0 of the frozen 15 open issues carry the `dependencies` area label and none names Dependabot, dependency automation, Gradle dependencies or the documentation site's dependencies; this was re-derived from the snapshot's own `Area` column in this file's header rather than assumed.
disposition:       major-refactor — the npm and `github-actions` additions are mechanical, but the Gradle decision is criterion-3 triage that plan `64-03` consolidates, so the whole is documented rather than applied.
proposed_approach: The manifest file is `.github/dependabot.yml:3-7`. Two of the three uncovered trees are nameable edits: add a `github-actions` ecosystem entry (`directory: "/"`) to close the 36-reference gap `P64-D6-003` enumerates, and add a second `npm` entry for `directory: "/documentation"` to cover the Docusaurus tree's own `package-lock.json`. The third — whether `bbj-intellij`'s Gradle tree is covered by a `gradle` ecosystem entry, a different scanner, or accepted with a written reason — is not part of this approach: it is `RU-64-02`'s own criterion-3 triage decision under SEC-08, referred rather than pre-empted here, per this record's own evidence. The tool-native check that proves the mechanical half is a YAML parse of `dependabot.yml` reporting three `updates:` entries once the Gradle decision is also recorded (two if it is deferred as a documented exception).
proposed_labels:   area=dependencies; PRIO 2; effort 4
issue:             
```

```
id:                P64-D6-006
unit:              RU-64-02
location:          bbj-intellij/gradle/wrapper/gradle-wrapper.jar
dimension:         D6
secondary:         [D1]
severity:          high
evidence_tier:     inherited
evidence:          Resolves to repro-equivalent: the identity claim below rests on a hash comparison against a resolvable first-party reference, not on an assertion. Assessed by manifest and hash only — no decompilation, no disassembly, no unpacking beyond the manifest, no execution (D-11). `sha256sum` prints `2db75c40782f5e8ba1fc278a5574bab070adccb2d21ca5a6e5ed840888448046`; size 43,583 bytes. `unzip -p <jar> META-INF/MANIFEST.MF` prints exactly two lines, `Manifest-Version: 1.0` and `Implementation-Title: Gradle Wrapper`, with no version, vendor, build-JDK, creator or signature entry — so the artefact cannot be identified from its own bytes. Gradle publishes a per-release `wrapperChecksum` at https://services.gradle.org/versions/all (521 entries at query time); this hash matches 19 of them, spanning releases **8.10 through 8.12.1** (latest final match 8.12.1, built 2025-01-24). The file beside it, `gradle-wrapper.properties:3`, declares `gradle-8.13-bin.zip`, whose published wrapper checksum is `81a82aaea5abcc8ff68b3dfcb58b3c3c429378efd98e7433460610fecd7ae45f` — a different value, also retrievable at https://services.gradle.org/distributions/gradle-8.13-wrapper.jar.sha256. The two artefacts that `./gradlew wrapper` generates as a pair therefore do not correspond. `git log --oneline -- bbj-intellij/gradle/wrapper/` returns exactly one commit, `e97c587 chore(01-01): initialize Gradle wrapper and build scripts`, so neither file has changed since it was introduced and the mismatch is original rather than the result of a later edit. Update path, checked three ways and empty in all three: `.github/dependabot.yml` declares no `gradle` ecosystem (`RU-64-01`'s `P64-D6-005`), so no automated update could ever propose a newer wrapper; `grep -rn 'wrapper-validation\|gradle/actions\|setup-gradle' .github/workflows/` returns nothing, so Gradle's own wrapper-validation action is absent from all six workflows; and the declared distribution 8.13 (2025-02-25) is a full major line behind the current 9.7.0 (2026-08-06).
failure_scenario:  A maintainer, auditor or downstream consumer asks the ordinary supply-chain question — "which Gradle release produced the wrapper this repository executes, and is it the one the build declares?" — and the repository cannot answer it from its own contents: the manifest names no version, no checksum is pinned, no CI step validates the JAR, and no dependency automation watches the ecosystem. When the question is answered from outside, using Gradle's published checksums, the answer is that the JAR is from the 8.10-8.12.1 line while the properties file asks for 8.13. Concretely, this is the state a wrapper-JAR substitution would produce, and it has persisted undetected since the initial commit — which is the direct demonstration that a real substitution would also persist undetected, including through `manual-release.yml:137` and `preview.yml:99`, where `./gradlew publishPlugin` runs with `secrets.JETBRAINS_MARKETPLACE_TOKEN` bound.
classification:    major — (1) at most one file: FAIL, correcting it means regenerating the JAR and the properties file together and adding a validation step to the workflows that run `./gradlew`. (2) no public API / no grammar rule / no LSP contract change: PASS. (3) adds or upgrades no dependency in `bbj-vscode/package.json` or `bbj-intellij/build.gradle.kts`: PASS — the Gradle distribution is pinned in the wrapper properties, not in either named file. (4) regression-testable with the existing harness: FAIL — the Gradle build does not run in this environment at all (`./gradlew --offline -q dependencies` exits 1 in 723 ms) and no test asserts anything about the wrapper. (5) reviewer can name the exact edit: PASS — run `./gradlew wrapper --gradle-version <chosen release> --gradle-distribution-sha256-sum <that release's published checksum>` on a working toolchain, commit both regenerated files, and add `gradle/actions/wrapper-validation` to `pr-validation.yml`, `manual-release.yml` and `preview.yml`. (6) severity is neither critical nor high AND primary dimension is not D1: FAIL on the severity half. Tests (1), (4) and (6) fail.
effort:            4
dedup:             none — no open issue in the frozen 15-issue snapshot mentions the Gradle wrapper, checksums, vendored binaries or supply-chain provenance; 0 of the 15 carry the `dependencies` label and 0 name CI, a workflow, build configuration or a vendored binary.
disposition:       major-refactor — pairs with `P64-D1-006`, which records the integrity half of the same bootstrap chain; both belong in `MAJOR-REFACTORS.md` and neither is a Phase 67 unattended apply.
proposed_approach: Run `./gradlew wrapper --gradle-version <chosen release> --gradle-distribution-sha256-sum <that release's published checksum>` on a working toolchain, commit both regenerated files, and add `gradle/actions/wrapper-validation` to `pr-validation.yml`, `manual-release.yml` and `preview.yml`.
proposed_labels:   area=dependencies; PRIO 1; effort 4
issue:             
```

```
id:                P64-D6-007
unit:              RU-64-02
location:          bbj-vscode/package.json:670
dimension:         D6
secondary:         [D4]
severity:          high
evidence_tier:     inherited
evidence:          Resolves to repro-equivalent: every advisory below is cited by a resolvable GitHub Advisory URL emitted by `npm audit --json` itself, and every dependency path was resolved with `npm ls`, not asserted. `package.json:669-678` declares eight runtime `dependencies`; the first is `"@vscode/vsce": "^3.7.1"` at `:670`. `@vscode/vsce` is the Visual Studio Marketplace **publishing** CLI — a build- and release-time tool — and `grep -rn '@vscode/vsce' bbj-vscode/src` returns nothing, so no shipped code imports it. Placing it under `dependencies` puts its entire transitive closure into this package's production dependency set: `npm audit --json` reports `metadata.dependencies` as 296 prod / 260 dev / 96 optional out of 593. Running `npm ls <pkg> --all` for each of the 19 packages `npm audit` flags shows **15 of them reach the tree through `@vscode/vsce` and through nothing else** — `@azure/identity` (4.13.0), `@azure/msal-node` (3.8.6), `ajv` (8.17.1, also via dev-only eslint), `fast-uri` (3.1.0), `form-data` (4.0.5), `js-yaml` (4.3.0, also via dev-only eslint), `linkify-it` (5.0.0), `markdown-it` (14.1.0), `minimatch` (3.1.2 and 10.1.2), `picomatch` (2.3.1), `qs` (6.14.1), `tmp` (0.2.5), `underscore` (1.13.7), `undici` (7.21.0) and `uuid` (8.3.2) — with `npm ls <pkg> --omit=dev --all` confirming each is present in the production closure. Their advisories are enumerated row by row in `### SEC-08 Dependency Triage` above; the highest is `undici` with 16 advisories including https://github.com/advisories/GHSA-4cwx-7wf7-3272 (high). What does **not** follow, and is checked rather than assumed: none of them ships to an end user, because `.vscodeignore:8` excludes `node_modules` from the VSIX (read as context only — INVENTORY excludes that file from every unit, so no finding is located in it and it adds no file to this unit's list or to the file gate) and grepping the built bundles returns 0 occurrences of `vsce`, `undici`, `markdown-it` and `shell-quote` in both `out/extension.cjs` and `out/language/main.cjs`. What does follow is that they are installed and executed in CI: all five workflows that run `npm ci` install them, and vsce itself runs at `preview.yml:62-68` and `manual-release.yml:84-90` inside jobs holding `secrets.VSCE_PAT`.
failure_scenario:  Two distinct consequences follow from the one declaration. First, every consumer of this package's metadata — an SBOM generator, a downstream dependency-policy scanner, `npm ls --omit=dev`, a corporate allow-list review — reads a production dependency set of 296 packages containing 15 flagged ones, when the extension's actual runtime surface is two esbuild bundles that import none of them; the declared contract materially overstates what runs in production, and any policy decision made from it is made on wrong data. Second, and concretely rather than hypothetically, all 15 are installed by `npm ci` and are on disk in `preview.yml` and `manual-release.yml` jobs that hold `secrets.VSCE_PAT` and `secrets.JETBRAINS_MARKETPLACE_TOKEN` — so a compromise of any one of them at install or invocation time executes beside two marketplace publishing credentials, each of which reaches every user of the published extension or plugin. That is why these rows are triaged `file-issue` rather than accepted: "does not ship" is true and is not the same as "cannot run".
classification:    major — (1) at most one file: PASS if the edit is only to move the entry between the two blocks in `package.json`; the lockfile is regenerated as a consequence rather than hand-edited. (2) no public API / no grammar rule / no LSP contract change: PASS. (3) adds or upgrades no dependency in `bbj-vscode/package.json`: FAIL — moving an entry between `dependencies` and `devDependencies` is a change to that file's dependency declarations, which is what test (3) guards. (4) regression-testable with the existing harness: PASS — vitest runs unchanged and `npm run build` plus a `vsce package` dry run would show whether anything actually needed vsce at runtime. (5) reviewer can name the exact edit: PASS — move `"@vscode/vsce": "^3.7.1"` from `dependencies` (`:670`) to `devDependencies` (`:679-693`) and regenerate the lockfile. (6) severity is neither critical nor high AND primary dimension is not D1: FAIL on the severity half. Tests (3) and (6) fail.
effort:            2
dedup:             none — no open issue in the frozen 15-issue snapshot mentions vsce, dependency placement, packaging or the npm dependency tree; 0 of the 15 carry the `dependencies` label and 0 name CI, a workflow, build configuration or a vendored binary. Two workflow comments (`manual-release.yml:30`, `preview.yml:28`) already assert that "vsce comes from bbj-vscode devDependencies", which the manifest contradicts — that discrepancy is referred to `RU-64-01` under `### Cross-unit referrals` rather than recorded twice.
disposition:       major-refactor — a one-line move with a regenerated lockfile, but it changes what `npm ci --omit=dev` installs and therefore what the release workflows have available, so it needs a verified packaging run rather than an unattended apply.
proposed_approach: Move `"@vscode/vsce": "^3.7.1"` from `dependencies` (`:670`) to `devDependencies` (`:679-693`) and regenerate the lockfile.
proposed_labels:   area=dependencies; PRIO 1; effort 2
issue:             
```

```
id:                P64-D6-008
unit:              RU-64-02
location:          bbj-vscode/package-lock.json:7581-7584
dimension:         D6
secondary:         [D1]
severity:          high
evidence_tier:     inherited
evidence:          Resolves to repro-equivalent: the advisory is cited by resolvable URL and the shipping claim was checked against the built artefact rather than inferred. `npm audit --json` flags `brace-expansion` at `<=1.1.17 || 4.0.0 - 5.0.8`, with `node_modules/vscode-languageclient/node_modules/brace-expansion` among its `nodes`. `package-lock.json:7581-7584` pins that node at `"version": "5.0.7"` with its `resolved` registry URL and `integrity` SRI hash; the applicable advisories are https://github.com/advisories/GHSA-mh99-v99m-4gvg (high, DoS via unbounded expansion length causing an out-of-memory process crash, range `>=4.0.0 <5.0.8`) and https://github.com/advisories/GHSA-rgw5-rvv9-x895 (high, DoS via unbounded intermediate arrays bypassing the CVE-2026-14257 mitigation, range `>=4.0.0 <5.0.9`). Its parent is `vscode-languageclient@10.1.0` (`package-lock.json:7557-7563`), a genuine runtime dependency declared at `package.json:676` and imported at `src/extension.ts:13`, which requires `minimatch: ^10.2.5`; the installed nested `minimatch@10.2.5` is itself outside every flagged minimatch range, so `brace-expansion` is reached through a non-vulnerable intermediary. **This is the only one of the 19 flagged packages that reaches the shipped artefact**, and that was measured rather than reasoned: `grep -c` over the built bundles returns 2 occurrences of `brace-expansion` and 2 of `balanced-match` in `out/extension.cjs` and 0 in `out/language/main.cjs`, against 0 occurrences of `vsce`, `undici`, `markdown-it`, `shell-quote`, `nanoid` and `postcss` in either — consistent with `esbuild.mjs:17` declaring `vscode` as its only external, so everything the entry points transitively import is inlined. `.vscodeignore:8` excludes `node_modules` from the VSIX (read as context only; INVENTORY excludes that file from every unit), so the bundle is the whole of the third-party surface that reaches a user.
failure_scenario:  A VS Code user installs the published extension. `out/extension.cjs` — the file `package.json:651` names as `main` — contains an inlined copy of `brace-expansion@5.0.7`, reached through the language client's glob matching. If a brace pattern with sufficient nesting or expansion breadth is passed to that matcher, GHSA-mh99-v99m-4gvg's unbounded expansion exhausts memory and GHSA-rgw5-rvv9-x895's unbounded intermediate arrays do so even where the earlier mitigation applies; the extension host process the language client runs in dies, taking BBj language support down for the session. **What this record deliberately does not claim** is that a workspace-controlled value reaches that matcher: establishing which patterns the client registers requires reading `bbj-vscode/src/extension.ts`, which is `RU-62-01`'s surface and belongs to a closed phase, so this unit records the reachable presence of vulnerable code in the shipped bundle and stops there rather than asserting an input path it cannot trace. That incompleteness is why the triage is `file-issue` and not `accepted-with-reason` — the argument that would justify acceptance is precisely the one this unit cannot finish.
classification:    major — (1) at most one file: PASS, the remediation is a lockfile-only bump of the nested `brace-expansion` to 5.0.9 or later, which `npm audit --json` reports as `fixAvailable: true`. (2) no public API / no grammar rule / no LSP contract change: PASS. (3) adds or upgrades no dependency in `bbj-vscode/package.json`: PASS — the change is transitive and touches only `package-lock.json`. (4) regression-testable with the existing harness: PASS — the 50-file vitest suite runs against the updated tree. (5) reviewer can name the exact edit: PASS. (6) severity is neither critical nor high AND primary dimension is not D1: FAIL, the advisories are `high`. Only test (6) fails — and it is the deliberate safety gate, so this is `major` despite a one-file lockfile diff, which is exactly the case D-13 was written for: the smallest possible edit on the only vulnerable package that actually ships still gets reviewed rather than auto-applied.
effort:            2
dedup:             none — no open issue in the frozen 15-issue snapshot mentions brace-expansion, minimatch, glob matching, the language client's dependency tree or a denial of service; 0 of the 15 carry the `dependencies` label and 0 name CI, a workflow, build configuration or a vendored binary.
disposition:       major-refactor — recorded for `MAJOR-REFACTORS.md` with the open reachability question attached, rather than applied unattended in Phase 67.
proposed_approach: The remediation is a lockfile-only bump of the nested `brace-expansion` to 5.0.9 or later, which `npm audit --json` reports as `fixAvailable: true`.
proposed_labels:   area=dependencies; PRIO 1; effort 2
issue:             
```

```
id:                P64-D6-010
unit:              RU-64-02
location:          bbj-intellij/gradle/wrapper/gradle-wrapper.properties:3
dimension:         D6
secondary:         [D2]
severity:          medium
evidence_tier:     inherited
evidence:          Resolves to `trace` for the staleness half (a version comparison against first-party release metadata, not a CVE claim) and to a recorded command for the enumerability half. **Staleness, verified live rather than assumed:** `gradle-wrapper.properties:3` pins the Gradle distribution to **8.13**; `https://services.gradle.org/versions/all` records 8.13 as built **2025-02-25**, and `https://services.gradle.org/versions/current` returns **9.7.0**, built **2026-08-06** — one full major line and roughly eighteen months behind. The other declared coordinates, enumerated statically because the dynamic route does not exist here: `build.gradle.kts:25` `intellijIdeaCommunity("2024.2")`, `:27` `plugin("com.redhat.devtools.lsp4ij:0.19.0")`, `settings.gradle.kts:2` `org.jetbrains.intellij.platform.settings` version `2.11.0`, `gradle.properties` (one line, no coordinate), plus `java-interop/build.gradle:21-23` and `java-interop/settings.gradle:1` read once as an additional dependency-tree source under INVENTORY's own carve-out, which adds no `java-interop/` file to this unit's list. Each was queried against OSV (`POST https://api.osv.dev/v1/query`, Maven ecosystem): `org.jetbrains.intellij.platform:intellij-platform-gradle-plugin@2.11.0`, `org.eclipse.lsp4j:org.eclipse.lsp4j.jsonrpc@0.20.1` and `org.junit.jupiter:junit-jupiter@5.9.1` return zero advisories; `com.google.guava:guava@31.1-jre` returns two and is recorded separately as `P64-D6-011`. `com.redhat.devtools.lsp4ij:0.19.0` and the IntelliJ IDEA Community platform artefact are **not Maven coordinates OSV indexes**, so their zero results mean *not answerable by this method* rather than *clean*, and that distinction is preserved here rather than flattened into a pass. **The enumerability gap, re-derived rather than trusted (D-10):** `cd bbj-intellij && ./gradlew --offline -q dependencies` exits **1** in **723 ms** with the literal output `FAILURE: Build failed with an exception. * What went wrong: 25.0.3` — Gradle 8.13's `JavaVersion` parser rejecting the local Temurin 25.0.3 before scheduling any task. The cause is the toolchain declaration at `build.gradle.kts:11-14`, which sets `sourceCompatibility`/`targetCompatibility` to 17 but declares no `toolchain` block, so Gradle runs on whatever JVM launched it; `java-interop/build.gradle:6-10` shows the corrective shape one directory away. This finding **merges** the inherited `P63-D6-002`, whose disposition is recorded in `### Inherited item triage` above.
failure_scenario:  Two failures, one immediate and one systemic. Immediately: any contributor or tool whose available JVM is newer than Gradle 8.13 supports cannot build, test or statically analyse `bbj-intellij` at all — the build dies before task selection with a message whose entire text is the JDK version string, which is close to the least actionable diagnostic possible. Systemically: because the build cannot run, `./gradlew dependencies` cannot produce the transitive dependency tree, so **nobody — no person and no tool — currently knows what `bbj-intellij` depends on transitively.** Compose that with `RU-64-01`'s `P64-D6-005`, which records that `.github/dependabot.yml` declares no `gradle` ecosystem, and the result is the strongest single statement in this phase's SEC-08 answer: **this dependency tree is both unscanned by tooling and unenumerable by hand**, so a vulnerable transitive Gradle dependency would be invisible to every process this repository operates. The IntelliJ plugin built from that tree is published to the JetBrains Marketplace at `manual-release.yml:137` and `preview.yml:99`.
classification:    major — (1) at most one file: FAIL, the fix spans `build.gradle.kts` (add a `toolchain` block) and `gradle-wrapper.properties` plus `gradle-wrapper.jar` (move to a Gradle release that accepts current JDKs). (2) no public API / no grammar rule / no LSP contract change: PASS. (3) adds or upgrades no dependency in `bbj-vscode/package.json` or `bbj-intellij/build.gradle.kts`: FAIL — a Gradle major-line move typically requires the IntelliJ Platform Gradle plugin to move with it, which is a declared-dependency change in `build.gradle.kts`. (4) regression-testable with the existing harness: FAIL — the Gradle build is exactly the harness that does not run here, so the fix cannot be verified in this environment. (5) reviewer can name the exact edit: PASS — add `java { toolchain { languageVersion = JavaLanguageVersion.of(17) } }` to `build.gradle.kts` mirroring `java-interop/build.gradle:6-10`, and regenerate the wrapper onto a current Gradle release with its published checksum pinned. (6) severity is neither critical nor high AND primary dimension is not D1: PASS, `medium`/D6. Tests (1), (3) and (4) fail.
effort:            8
dedup:             none — no open issue in the frozen 15-issue snapshot mentions Gradle, the JDK toolchain, the IntelliJ Platform version or LSP4IJ; 0 of the 15 carry the `dependencies` label and 0 name CI, a workflow, build configuration or a vendored binary. Cross-reference rather than duplicate: this record **merges** `P63-D6-002` (`63-COVERAGE.md:439`), which recorded the same toolchain condition from `RU-63-03`/D6 with an explicit `location:` exception because `build.gradle.kts` is this unit's file; that finding remains citable by ID and is not re-recorded under a new number.
disposition:       major-refactor — spans three files and a Gradle major line, cannot be verified in this environment, and is the enabling fix for the phase's stated coverage limitation; Phase 66 should read it as `DEBT`-shaped work.
proposed_approach: Add `java { toolchain { languageVersion = JavaLanguageVersion.of(17) } }` to `build.gradle.kts` mirroring `java-interop/build.gradle:6-10`, and regenerate the wrapper onto a current Gradle release with its published checksum pinned.
proposed_labels:   area=dependencies; PRIO 2; effort 8
issue:             
```

```
id:                P64-D6-011
unit:              RU-64-02
location:          java-interop/build.gradle:22
dimension:         D6
secondary:         none
severity:          medium
evidence_tier:     inherited
evidence:          Resolves to repro-equivalent: both advisories are cited by resolvable reference and were retrieved live, not recalled. `java-interop/build.gradle:22` declares `implementation 'com.google.guava:guava:31.1-jre'`. Querying OSV (`POST https://api.osv.dev/v1/query`, `{"package":{"ecosystem":"Maven", "name":"com.google.guava:guava"},"version":"31.1-jre"}`) returns two records: **GHSA-7g45-4rm6-3mm3** (CVE-2023-2976, OSV `database_specific.severity` `MODERATE`, CWE-379/CWE-552, "Guava vulnerable to insecure use of temporary directory", fixed in `32.0.0-android`, https://github.com/advisories/GHSA-7g45-4rm6-3mm3) and **GHSA-5mg8-w23w-74h3** (CVE-2020-8908, OSV severity `LOW`, CWE-200/CWE-378/CWE-732, "Information Disclosure in Guava", also fixed in `32.0.0-android`, https://github.com/advisories/GHSA-5mg8-w23w-74h3). Both concern `Files.createTempDir()` creating world-readable temporary directories on Unix-like systems. This is the **only** declared Gradle-side coordinate in the whole milestone that returns an advisory: the same query against `org.eclipse.lsp4j:org.eclipse.lsp4j.jsonrpc@0.20.1`, `org.junit.jupiter:junit-jupiter@5.9.1` and `org.jetbrains.intellij.platform:intellij-platform-gradle-plugin@2.11.0` returns zero. **Scope note, stated so this record is not mistaken for an expansion of scope:** `java-interop/build.gradle` is read **once** as an additional dependency-tree source under INVENTORY's own `java-interop/` carve-out, which states that doing so "does not add `java-interop/` source files to any unit's file list". This `location:` is that dependency-tree citation, required by RVW-06 so the coordinate can be found; it adds no file to `RU-64-02`'s 15-file list, and the file gate's fixed 29-file enumeration is unchanged.
failure_scenario:  The java-interop socket service runs on a developer or server machine. If any code path in Guava 31.1-jre's `Files.createTempDir()` is reached — directly, or through a library that calls it — the directory is created with permissions that allow other local users to read its contents, and on the CVE-2023-2976 path a local attacker can additionally place content there before the intended writer does. Whether such a path is reached in this service is **not established here**, and deliberately so: `java-interop/` is excluded from review by FUT-01 and is read by this phase only as a dependency-tree source, so this record enumerates and triages the vulnerable coordinate, which is what criterion 3 requires, and does not attempt a reachability trace into code the milestone has scoped out. That is also why it is not triaged `accepted-with-reason`: the reachability argument acceptance would demand cannot be written from this unit's surface.
classification:    major — (1) at most one file: PASS, only `java-interop/build.gradle:22` changes. (2) no public API / no grammar rule / no LSP contract change: PASS. (3) adds or upgrades no dependency in `bbj-vscode/package.json` or `bbj-intellij/build.gradle.kts`: PASS literally — the coordinate lives in neither named file — but the edit is a **major**-version bump (31.1-jre → 32.0.0+), recorded here rather than hidden behind the literal reading. (4) regression-testable with the existing harness: FAIL — the harness would be `java-interop`'s own Gradle build, and `java-interop/.gitignore:5` ignores `gradle/`, so no wrapper JAR or wrapper properties file is committed and `java-interop/gradlew` cannot bootstrap from a clean clone at all. (5) reviewer can name the exact edit: PASS — raise the coordinate to `32.0.0-jre` or later. (6) severity is neither critical nor high AND primary dimension is not D1: PASS, `moderate`/D6. Only test (4) fails, which makes this `major`.
effort:            2
dedup:             none — no open issue in the frozen 15-issue snapshot mentions Guava, java-interop's dependencies or temporary-directory permissions; 0 of the 15 carry the `dependencies` label and 0 name CI, a workflow, build configuration or a vendored binary.
disposition:       major-refactor — a major-version bump in an out-of-milestone project with no bootstrappable build; recorded for Phase 68/69 so criterion 3's Gradle half is complete rather than silently short one row.
proposed_approach: Raise the coordinate to `32.0.0-jre` or later.
proposed_labels:   area=dependencies; PRIO 2; effort 2
issue:             
```

```
id:                P64-D8-001
unit:              RU-64-03
location:          bbj-vscode/tools/interop-test-harness/run-tests.ts:2-14
dimension:         D8
secondary:         [D4]
severity:          low
evidence_tier:     trace
evidence:          Written trace against the code beneath the comment; both dimensions this record touches are `trace`-tier, so the adjacency rule leaves the bar at `trace`. Two claims in the same header block do not match the code. (a) `:6` states the harness "validates every critical field the LS depends on". The file defines "critical field" twice: an eight-element list at `:659` (`isStatic`, `isDeprecated`, `constructors`, `name`, `returnType`, `type`, `parameters`, `packageName`) which `grep -n 'criticalFields'` shows is never read (see `P64-D4-002`), and the gate that actually runs, at `:1045`, which hardcodes `['isStatic', 'isDeprecated', 'constructors']` — three of the eight. The other five are collected into `fieldChecks` and displayed in the report, but a missing `name`, `returnType`, `type`, `parameters` or `packageName` never makes the harness fail. (b) `:9-13` documents exactly three options — `--host`, `--port`, `--output` — while `parseArgs` at `:30-38` accepts a fourth, `--timeout`, under `strict: true`, with a `15000` default that `main` echoes back to the user at `:987`. Every other comment in the four readable files was checked against its code and found accurate; those checks are recorded in this unit's D8 cell line rather than duplicated here.
failure_scenario:  A maintainer diagnosing an interop regression reads `:6`, concludes that a green run means every critical field the language server depends on is present, and stops looking. In fact a response missing `returnType` on every method — a field the LS does depend on, and one the harness explicitly checks for at `:206` — produces a green exit code, because `:1045` does not include it in the gate. The report does show the failed field check, but the header's claim is what tells the reader whether the report needs reading at all. Separately, a maintainer whose run times out against a slow peer reads `:9-13`, sees no timeout option, and concludes the 15-second limit is not adjustable, when `--timeout` has worked all along.
classification:    major — (1) at most one file: PASS. (2) no public API change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the existing harness: FAIL — `tools/` is outside every test, type-check and lint boundary, as recorded under `P64-D5-001`. (5) reviewer can name the exact edit: PASS — correct the claim at `:6` to name the three fields the gate enforces (or widen the gate to match the claim), and add `--timeout` to `:9-13`. (6) severity is neither critical nor high AND primary dimension is not D1: PASS. **Which reading was applied, and why:** a D8 fix that changes only comment text changes no runtime behaviour and can be `easy` when the other five tests pass. Here test (4) fails regardless of how the fix is written, because nothing in this repository can regression-test anything under `tools/`. One test fails, so `major` — the `easy` reading was considered and rejected for a stated reason rather than assumed.
effort:            2
dedup:             none — the frozen 15-issue snapshot contains no issue about documentation accuracy in the interop harness or anywhere under `bbj-vscode/tools/`.
disposition:       major-refactor — recorded; the widen-the-gate variant of the fix would change runtime behaviour and belongs with `P64-D4-002`, so the two are best resolved together.
proposed_approach: Correct the claim at `:6` to name the three fields the gate enforces (or widen the gate to match the claim), and add `--timeout` to `:9-13`.
proposed_labels:   area=documentation; PRIO 3; effort 2
issue:             
```

```
id:                P65-D1-001
unit:              SEC-02
location:          bbj-vscode/src/addwindow-composer-webview.ts:121-131, bbj-vscode/src/addchildwindow-composer-webview.ts:126-137 (contrasted with bbj-vscode/src/msgbox-composer-webview.ts:97-101 and bbj-vscode/src/msgbox-composer.ts:398-420)
dimension:         D1
secondary:         [D2, D4]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace: msgbox-composer-webview.ts's 'insert' arm (:97-114) computes r = build(msg.payload) (msgboxPreview(), msgbox-composer.ts:391-421) and gates the WorkspaceEdit application on `if (!r.valid) break;` (:100) before reaching vscode.workspace.applyEdit (:111). r.valid is `msgV.ok && titleV.ok && customOk` (msgbox-composer.ts:420), where msgV/titleV come from validateStringField() (msgbox-composer.ts:311-322), which calls validateBbjExpression() (msgbox-composer.ts:197-216) to check structural well-formedness and String typing of the message/title fields before the statement is composed. addwindow-composer-webview.ts's near-identical 'insert' arm (:121-133) computes r = build(msg.payload) (addwindowPreview()) and applies the WorkspaceEdit (via applyEdit() or edit.insert()) unconditionally at :130 — there is no r.valid field or equivalent gate; confirmed by `grep -n 'valid' bbj-vscode/src/addwindow- composer.ts` returning zero matches, meaning none of its own free-text fields (receiver, sysgui, title, x, y, width, height) is ever checked for well- formedness anywhere in the module. addchildwindow-composer-webview.ts's 'insert' arm (:126-138) is the same pattern against addchildwindow-composer.ts (also zero 'valid' matches; fields receiver, window, id, context, title, x, y, width, height). Phase 62's own RU-62-04 sweep (P62-D1-001's evidence) characterized this pattern as "identical" across all four handlers — a single-file-at-a-time review that did not compare the four build() outputs against each other and so did not surface that only one of the four gates its document-edit side effect on any content-validity check at all.
failure_scenario:  A developer types a malformed or unintended free-text value into addwindow's or addchildwindow's Title/x/y/width/height/receiver/sysgui (or window/id/context) fields via the webview form and clicks Insert; the value is written verbatim into their own BBj source document with no warning, because — unlike msgbox's message/title fields — nothing in addwindow-composer.ts or addchildwindow- composer.ts ever checks these fields' well-formedness. This is a self-inflicted statement-corruption gap (the same shape as P62-D1-005, no attacker-controlled input reaches it), but it is inconsistent across three near-duplicate composer forms in a way no single-file review surfaced: two of the four insert/apply paths apply their edit unconditionally while the third gates on validated content.
classification:    major (1) touches 1 file: n/a — the fix (porting an equivalent content-validity gate) is a repeated single-file edit independently applicable to each of the 2 files lacking it — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer can name the exact edit (port validateStringField-style checks to addwindow-composer.ts's and addchildwindow-composer.ts's free-text fields and gate the 'insert' side effect on the result, mirroring msgbox's r.valid pattern): pass — (6) severity is `low` but primary dimension is D1: FAIL — test (6) fails on the D1 primary-dimension clause alone, so classification is `major` regardless of the other five tests (D-13's safety gate).
effort:            4
dedup:             none — neither #475 (SETOPTS tri-state composer UX) nor #385 (external Graffiti Composer launch) concerns addWindow/addChildWindow field-validation parity with msgbox; no open issue overlaps this asymmetry.
disposition:       major-refactor
proposed_approach: Port validateStringField-style checks to addwindow-composer.ts's and addchildwindow-composer.ts's free-text fields and gate the 'insert' side effect on the result, mirroring msgbox's r.valid pattern.
proposed_labels:   area=vscode; PRIO 3; effort 4
issue:             
```

```
id:                P65-D1-002
unit:              SEC-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:25-29 (contrasted with bbj-vscode/src/extension.ts:587,667)
dimension:         D1
secondary:         [D7]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace across both IDEs (D-07/D-11 — no runnable reproduction accompanies this record; changing an IDE-wide preference in a live IntelliJ instance and observing PasswordSafe's resulting backend is outside this static-trace sweep's scope). BbjEMTokenStore.createAttributes() (:25-29) builds a CredentialAttributes from only a generated service name (CredentialAttributesKt.generateServiceName("BBj Enterprise Manager", "jwt-token")) and passes no further flag; storeToken/getToken/deleteToken (:31-47) call PasswordSafe.getInstance() with those attributes and nothing else. Which backend PasswordSafe actually uses is governed entirely by IntelliJ's own IDE-wide "Save passwords" setting (Settings > Appearance & Behavior > System Settings > Passwords) — native keychain, a local KeePass-format file, or memory-only ("Do not save") — a fact P63-D8-003 already established by reading this same file for a doc-accuracy defect (its class doc's "stored in the OS-native keychain" claim overclaims a guarantee the code does not enforce). Contrasted against bbj-vscode/src/extension.ts:587 (secretStorage = context.secrets) and :667 (context.secrets.store(...)): VS Code's SecretStorage binding is fixed by the platform, with no setting in bbj-vscode/package.json (grep -n 'secret\|credential' returns nothing relevant) or in the extension's own code that could redirect it elsewhere. This is a genuine cross-IDE asymmetry on the at-rest security property criterion 3's "and VS Code's equivalent storage" clause asks to be compared — an asymmetry no single-module review (Phase 62 or Phase 63, each scoped to one IDE) could see, since seeing it requires reading both sides' actual storage APIs side by side.
failure_scenario:  An organization's IT policy, or a user acting alone, sets IntelliJ's "Save passwords" preference to "In KeePass" or "Do not save" — a setting entirely outside this plugin's knowledge or control — and the EM JWT is thereafter stored in a local KeePass-format file (protected only by that file's own master password and OS file permissions, a materially weaker guarantee than an OS keychain entry) or not persisted at all across IDE restarts, forcing a silent re-login prompt with no indication to the user that their chosen preference changed this specific credential's protection. The equivalent VS Code user has no such lever available to weaken it, and no comparable warning exists on either side telling the user which backend is currently protecting this particular token.
classification:    major (1) touches 1 file: pass — the fix (checking PasswordSafe's active backend via the IntelliJ Platform's own exposed state, or emitting a one-time warning when it is not the native keychain) is confined to BbjEMTokenStore.java — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass (PasswordSafe/ CredentialAttributes are already-used IntelliJ Platform APIs) — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists in bbj-intellij (P63-D5-001) — (5) reviewer can name the exact edit: pass (surface a one-time notification when PasswordSafe's resolved backend is not the native keychain, mirroring the transparency VS Code's fixed binding provides for free) — (6) severity medium but primary dimension D1: FAIL — test (6) fails on the D1 clause alone, so classification is major regardless of the other five tests (D-13's safety gate).
effort:            4
dedup:             none — no frozen open issue names PasswordSafe, SecretStorage, or credential- backend configurability of any kind.
disposition:       major-refactor
proposed_approach: (surface a one-time notification when PasswordSafe's resolved backend is not the native keychain, mirroring the transparency VS Code's fixed binding provides for free).
proposed_labels:   area=intellij; PRIO 2; effort 4
issue:             
```

```
id:                P65-D1-003
unit:              SEC-04
location:          bbj-vscode/src/extension.ts:339-366 (contrasted with bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:56-88, P63-D1-004)
dimension:         D1
secondary:         [D2]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace (D-11 — no runnable reproduction accompanies this record; forging a malformed JWT and driving it through the full login/run flow to observe the fail-open branch fire is exploit construction, out of this static sweep's scope). isTokenExpired() (extension.ts:339-366) returns false ("not expired") for exactly the same three inputs P63-D1-004 already records for BbjEMTokenStore.isTokenExpired(): a non-3-part token (:344-346, "Not a JWT, let server decide"), a payload with no exp claim (:355-357, "No expiration claim, can't determine"), and any exception during base64url-decode/JSON-parse (:363-365, "If any parsing fails, let server validate") — no signature verification of any kind anywhere in the function. No P62-D1-* record names this function as a security-relevant defect: Phase 62's own D8 doc-accuracy check (62-COVERAGE.md:344) read this exact function only to confirm its docstring matches its implementation ("isTokenExpired's ... docs ... both match their implementations"), never asking whether the fail-open shape itself is a security concern — a question outside a single-module review's own D1 checklist for this file (which recorded P62-D1-003/P62-D1-004 instead, neither about expiry decoding). Only this cross-cutting SEC-04 sweep, built explicitly to trace expiry handling end to end across both IDEs (ROADMAP criterion 3), surfaces that VS Code's client-side decode independently exhibits the identical weakness already recorded on the IntelliJ side — a gap between the VS-Code-scoped review (Phase 62) and the IntelliJ-scoped review (Phase 63) that neither could see from its own module alone (D-04 justification 1). The practical exposure is mitigated but not eliminated by ensureValidToken()'s mandatory server round trip (:456-479, calling validateTokenServerSide at :471) for both bbj.runBUI (:676-679) and bbj.runDWC (:683-686) — mirroring BbjRunBuiAction/BbjRunDwcAction's own composition — but the residual gap matches P63-D1-004's own note for BbjEMLoginAction exactly: a freshly-acquired token is stored (context.secrets.store, :667) without itself being re-validated at that moment.
failure_scenario:  A JWT token that is not well-formed 3-part base64url, whose decoded payload lacks an exp claim, or whose decode throws for any reason is reported "not expired" identically to a token with a genuine future exp, by getEMCredentials() (:374-388) and therefore by ensureValidToken() and getEMCredentials()'s every other caller. The freshly-issued token stored by the bbj.loginEM handler (:667) is never itself run through this or any other validator before being persisted, so a malformed or substituted token at that exact moment would be accepted into SecretStorage silently — the run flows remain protected only because ensureValidToken's separate server round trip (:471) is unconditional, not because this decode caught anything.
classification:    major (1) touches 1 file: pass — confined to extension.ts — (2) no public API/grammar/ LSP change: pass — (3) no new dependency: pass — (4) regression-testable with vitest: pass (isTokenExpired is a pure function over a string input; the five branches — well-formed-expired, well-formed-valid, malformed, no-exp, and parse-exception — are all directly testable with no VS Code API mock needed) — (5) reviewer can name the exact edit: pass (change the three "unable to determine" branches at :345,:356,:364 to return true — fail closed — matching the exact edit P63-D1-004 already proposes for its own IntelliJ analog) — (6) severity medium but primary dimension D1: FAIL — test (6) fails on the D1 clause alone, so classification is major regardless of the other five tests (D-13's safety gate).
effort:            4
dedup:             none — no frozen open issue names JWT expiry-decoding fail-open behaviour in the VS Code extension.
disposition:       major-refactor
proposed_approach: (change the three "unable to determine" branches at :345,:356,:364 to return true — fail closed — matching the exact edit P63-D1-004 already proposes for its own IntelliJ analog).
proposed_labels:   area=vscode; PRIO 2; effort 4
issue:             
```

```
id:                P66-D2-002
unit:              DEBT-04
location:          bbj-vscode/src/language/bbj-scope.ts:191-234 (getScope's member-completion branch; isClassRef detection at :199-208); bbj-vscode/src/language/bbj-completion-provider.ts (consumes the scope with no independent isClassRef-aware filtering of its own); bbj-vscode/src/language/java-interop.ts:572-588 (the isStatic ?? false default that is the stated blocker)
dimension:         D2
secondary:         []
severity:          medium
evidence_tier:     repro D2's INVENTORY §3b bar is `repro`; DEBT-04's own trace clears it by the bar's **second form** — "a line-by-line trace naming the concrete inputs/state and the exact file:line where behaviour diverges" — not by a runtime reproduction, which the `### Why no live reproduction was attempted` subsection above states was deliberately not attempted. CONTEXT.md D-09 calls this the `trace` tier by its own phrasing; that phrase is D-09's shorthand for exactly this second §3b form, reconciled explicitly here per this plan's own planner-reconciliation note rather than left for a reader to work out.
evidence:          The static trace above: bbj-scope.ts:199-208's isSymbolRef(receiver) check, concrete input 1 (USE java.lang.String then String.valueOf — receiver is a SymbolRef, isClassRef=true, static-only branch taken, works) versus concrete input 2 (java.lang.String.valueOf(2) with no USE — receiver is a MemberCall node, isSymbolRef(receiver) is false, isClassRef stays false, falls to the Instance access branch at :226-228, offering every field and method). Plus java-interop.ts:572-588's isStatic ?? false default and the commit-99820a0/ 59-04-SUMMARY.md historical record of the same extension being attempted and reverted for exactly this reason.
failure_scenario:  A fully-qualified Java class MemberCall reference typed without a preceding USE alias (e.g. java.lang.String.valueOf(2), or any FQN-qualified static access) — the completion list offered for the trailing member includes every instance method and field of the class alongside its statics, instead of statics only, because isClassRef never becomes true for a MemberCall-shaped receiver.
classification:    major (1) touches 1 file: FAIL — the complete fix needs both a bbj-scope.ts-side extension AND a java-interop/ JAR-side change (outside this repo's FUT-01 boundary) plus a redeployment, not a single-file edit — (2) no public API/grammar/LSP change: pass — the fix changes internal scope-resolution logic only — (3) no new dependency: pass — (4) regression-testable with the existing vitest harness: FAIL — a real regression test needs a Java classpath backend reflecting the updated JAR's isStatic-for-fields behaviour, which this sandbox's EmptyFileSystem-based test context cannot provide (the same DEBT-02-class blocker P61-D5-003 already recorded) — (5) reviewer can name the exact edit: pass — see Issue-ready draft below — (6) severity medium, dimension D2 (not D1): pass — tests (1) and (4) both fail, so classification is major regardless of (2)/(3)/(5)/(6).
effort:            8 (cross-repo scope — a java-interop/ JAR change, a redeployment, and a bbj-vscode-side extension plus its regression test — is larger than a single-repo fix; no departure from a prior recorded value since DEBT-04 carries no inherited finding to depart from).
dedup:             none — checked against INVENTORY's frozen 15-issue snapshot. #466 (Detect sibling-type method return mismatches via Java class hierarchy) explicitly considered per this plan's own instruction and resolved unrelated: #466 concerns validating an ALREADY-RESOLVED return type against a Java class hierarchy after a method call resolves; this finding concerns which SET OF MEMBERS a class-reference receiver's own completion scope contains before any call is resolved — a different mechanism (scope/completion filtering, not return-type validation) with no overlap. No other frozen-snapshot issue concerns MemberCall static-vs-instance completion filtering.
disposition:       major-refactor
proposed_approach: The complete fix needs both a bbj-scope.ts-side extension AND a java-interop/ JAR-side change (outside this repo's FUT-01 boundary) plus a redeployment, not a single-file edit.
proposed_labels:   area=vscode; PRIO 2; effort 8
issue:             
```

```
id:                P66-D2-003
unit:              DEBT-07
location:          bbj-vscode/src/language/bbj-document-validator.ts:53,59-63,80-131,161-169 (DiagnosticTier.BBjCPL, getDiagnosticTier, applyDiagnosticHierarchy and its Rule 0, the sole validateDocument call site); bbj-vscode/src/language/bbj-document-builder.ts:155-187 (debouncedCompile, the mergeDiagnostics call at :177-180 that bypasses applyDiagnosticHierarchy)
dimension:         D2
secondary:         []
severity:          medium
evidence_tier:     repro D2's INVENTORY §3b bar is repro; cleared by the bar's second form — a line-by-line trace naming the concrete inputs/state and the exact file:line where behaviour diverges (Trace subsection above) — not by a live LSP session (no editor was driven in this plan). No live reproduction was attempted for the same class of reason CONTEXT.md D-09 states for DEBT-04: this sandbox's pre-existing test-environment limitations make a from-scratch VS Code session an unreliable substitute for the static trace, which is conclusive on its own here (the call graph is fully readable and admits no other path).
evidence:          The Trace subsection above: applyDiagnosticHierarchy's single call site (validateDocument:167-168) always receives a freshly-constructed, BBjCPL-blind diagnostics array (per Langium's own DefaultDocumentValidator.validateDocument, document-validator.js:25's const diagnostics = [];); the only code path that introduces a BBjCPL-sourced diagnostic (debouncedCompile's mergeDiagnostics call, bbj-document-builder.ts:177-180) never calls applyDiagnosticHierarchy; and resetToState (document-builder.js:224-225) wipes document.diagnostics before every subsequent validate pass, so no later cycle is ever seeded with a prior cycle's merged BBjCPL diagnostics either. Plus the negative-coverage check: no test in cpl-integration.test.ts's 7 mergeDiagnostics tests exercises applyDiagnosticHierarchy at all.
failure_scenario:  A BBjCPL error and a Langium Parse-tier error on different lines of the same file (or even the same line, once mergeDiagnostics's coincidental same-line relabeling is accounted for and set aside) both remain visible in the Problems panel indefinitely — the redundant Langium parse error is never suppressed by Rule 0 as the class's own doc comment (bbj-document-validator.ts:70-77) says it should be, on this or any subsequent save.
classification:    major (1) touches 1 file: FAIL — the minimal fix exports applyDiagnosticHierarchy from bbj-document-validator.ts and calls it from debouncedCompile in bbj-document-builder.ts after the mergeDiagnostics call, two files — (2) no public API/grammar/LSP change: pass — internal diagnostic-filtering only — (3) no new dependency: pass — (4) regression-testable with the existing vitest harness: pass — cpl-integration.test.ts already exercises mergeDiagnostics with a fake BBjCPLService-shaped input; a new test asserting Parse-tier diagnostics are absent after a same-file, different-line BBjCPL error merges in would fail before the fix and pass after — (5) reviewer can name the exact edit: pass (see Issue-ready draft below) — (6) severity medium, dimension D2 (not D1): pass — test (1) fails, so classification is major regardless of (2)-(6).
effort:            2
dedup:             none — checked against the frozen 15-issue snapshot's composition-check table in ## Dedup source above; no open issue is topically adjacent to CPL-06 diagnostic hierarchy/BBjCPL-Langium merge timing. This finding corrects PROJECT.md's own prior "one extra build cycle, end state correct" characterization rather than duplicating any tracker report.
disposition:       major-refactor
proposed_approach: The minimal fix exports applyDiagnosticHierarchy from bbj-document-validator.ts and calls it from debouncedCompile in bbj-document-builder.ts after the mergeDiagnostics call, two files.
proposed_labels:   area=vscode; PRIO 2; effort 2
issue:             
```

```
id:                P66-D3-001
unit:              DEBT-01
location:          bbj-vscode/src/language/bbj-scope.ts:308-330 (getBBjClassesFromFile); bbj-vscode/src/language/bbj-scope-local.ts:106-118 (collectLocalSymbols)
dimension:         D3
secondary:         []
severity:          high
evidence_tier:     repro
evidence:          Cites P61-D3-003 (61-COVERAGE.md, D3 cell narrative ~1517, record ~1625) — the line-by-line trace of both mechanisms — plus this plan's currency re-read of all three anchors (see Currency check above), confirming both mechanisms and isAffected()'s partial mitigation are unchanged. This re-read clears INVENTORY §3b's D3 repro bar by its second form (a line-by-line trace naming the exact file:line where behaviour diverges), not by a fresh runtime reproduction — no benchmark was run in this plan.
failure_scenario:  A multi-project workspace with many external/referenced BbjClass documents loaded: every ::file::Class scope resolution rescans the entire cross-project index (getBBjClassesFromFile), and every document load/rebuild walks its full AST including every external project's documents with no pruning (collectLocalSymbols) — CPU cost scales with total multi-project workspace size rather than the active file's own size, consistent with #232's reported symptom (Code Helper process at 100% CPU on macOS).
classification:    major (1) touches 1 file: FAIL — the named edit below needs a cache in bbj-scope.ts AND isExternalDocument-aware pruning in bbj-scope-local.ts, two files — (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable with existing vitest harness (a synthetic multi-document workspace fixture with timing assertions, per RU-61-01's D3 benchmark precedent): pass — (5) reviewer can name the exact edit: pass (see Issue-ready draft below) — (6) severity high: FAIL — major regardless of the other five tests (D-13's safety gate, test 6).
effort:            8
dedup:             none — #232 is CLOSED and therefore absent from the frozen 15-issue snapshot, so this is not a duplicate of any open issue. Checked #83 (project-wide USE statements — different feature, no match) and #90 (opt-out linking — a UX request, not this always-on scan cost, no match) as the plausible neighbours already identified at Phase 61 sweep time; re-confirmed no new open issue exists to check against (frozen snapshot unchanged, still 15 issues). This finding adds: a concrete, two-mechanism named-edit implementation plan (D-11), which #232 (now closed) never had.
disposition:       major-refactor
proposed_approach: Run these three tests under a **repo-local Java classpath** available under a non-`EmptyFileSystem` fixture — i.e., `createBBjTestServices` (`bbj-vscode/test/bbj-test-module.ts`) extended with real classpath data (or a richer `JavaInteropTestService` fixture covering `String`, `BBjAPI`'s namespace/semaphore methods, and Java array types) rather than the current fake-class stub. This is the **unblocking condition**: nothing outside this repository needs to change.
proposed_labels:   area=vscode; PRIO 1; effort 8
issue:             
```

```
id:                P66-D4-001
unit:              DEBT-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjCompletionFeature.java:19,21 (extends LSPCompletionFeature; @Override getIcon(CompletionItem)); bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java:39-64 (anonymous LSPClientFeatures with a nested LSPDocumentLinkFeature override); bbj-intellij/build.gradle.kts:27 (the pinned 0.19.0)
dimension:         D4
secondary:         []
severity:          medium
evidence_tier:     trace D4's tier per INVENTORY §3b — cleared by the jar-measurement annotation table above (a written trace naming the exact class-level RuntimeInvisibleAnnotations block on each of the three coupled classes), not by a runtime reproduction.
evidence:          The jar path, the three re-derived baseline commands with literal outputs (0, 11, 20 — no drift), and the nine-row annotation table in the Jar measurement subsection above: LSPCompletionFeature, LSPClientFeatures and LSPDocumentLinkFeature — the three classes BbjCompletionFeature/ BbjLanguageServerFactory actually subclass or anonymously implement — each carry a class-level RuntimeInvisibleAnnotations -> ApiStatus$Experimental block in the cached lsp4ij-0.19.0.jar, read directly via javap -v (not asserted from documentation or a changelog). The specific overridden/called members (getIcon, initializeParams, setDocumentLinkFeature, setCompletionFeature, isSupported) carry no annotation of their own; their exposure is inherited from the enclosing class's own Experimental marking.
failure_scenario:  n/a (D4 is a code-shape finding, not a runtime failure scenario) — a breaking signature or semantics change to LSPCompletionFeature.getIcon(), LSPClientFeatures's initializeParams()/setDocumentLinkFeature()/ setCompletionFeature() builder chain, or LSPDocumentLinkFeature.isSupported() in a future LSP4IJ release (explicitly permitted by their own @ApiStatus.Experimental contract) would surface as a compile failure or a silent behaviour change across BbjCompletionFeature.java and BbjLanguageServerFactory.java at plugin-update time, with no regression test anywhere in this module (P63-D5-001) to catch a silent one before release.
classification:    major (1) touches 1 file: FAIL — a complete fix needs a new bbj-intellij/src/test/ source set exercising both BbjCompletionFeature.java and BbjLanguageServerFactory.java, two files, and per P64-D6-010 even running that suite locally is currently blocked by the JDK toolchain mismatch — (2) no public API/grammar/LSP change: pass — (3) no new dependency: n/a — records an existing dependency's coupling shape, adds nothing — (4) regression-testable with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit: pass — see Issue-ready draft below, which P63-D4-010 itself did not attempt (it recorded the coupling shape only, deferring the re-triage to this phase) — (6) severity medium, dimension D4 (not D1): pass — tests (1) and (4) both fail, so classification is major regardless of (2)/(3)/(5)/(6).
effort:            4 (matches P63-D4-010's own recorded effort — no departure; the added contract-test scope is bounded to the three already-identified extension points, not a open-ended investigation).
dedup:             supersedes P63-D4-010 (63-COVERAGE.md, this phase's designated DEBT-05 evidence record) — not re-derived, re-triaged with this plan's own live jar measurement in place of P63-D4-010's coupling-shape-only trace. #410 (Zed Editor support request) and #231 (custom classpath/CLI settings request) re-checked against this file's `## Dedup source` composition-check table above — both remain unrelated to LSP4IJ API coupling, consistent with P63-D4-010's own dedup finding.
disposition:       major-refactor
proposed_approach: A complete fix needs a new bbj-intellij/src/test/ source set exercising both BbjCompletionFeature.java and BbjLanguageServerFactory.java, two files, and per P64-D6-010 even running that suite locally is currently blocked by the JDK toolchain mismatch.
proposed_labels:   area=intellij; PRIO 2; effort 4
issue:             
```

```
id:                P66-D5-001
unit:              DEBT-02
location:          bbj-vscode/test/parser.test.ts:530,811,860
dimension:         D5
secondary:         [D2]
severity:          medium
evidence_tier:     trace
evidence:          Per INVENTORY §3b, D5 (test coverage) follows the tier of what the finding asserts; these three are a missing/disabled-assertion gap, which is trace-evidenced (not repro — there is no runtime behaviour to reproduce, only the disabled state of the assertions themselves). Cites P61-D5-003 by ID (the original trace of all three DISABLED sites and their stated blockers) plus this plan's currency re-read (see Currency check above), confirming all three sites are unchanged at their recorded lines with their recorded blocking comments intact.
failure_scenario:  Any regression in Java-classpath-dependent validation for these three scenarios — new String() substring validation, BBjAPI() global-namespace method-chain resolution, and String[]/byte[] Java-typed class fields — would pass the full npm test suite undetected, because the only assertions that would catch it are commented out rather than executed.
classification:    major (1) touches 1 file: n/a — this is an environment/test-infrastructure gap (no Java classpath under EmptyFileSystem), not a single code edit — (2)-(5): n/a for the same reason — (6) severity medium, primary dimension D5: the six D-13 tests are built for code-fix findings; per D-14 this is routed conservatively as `major`, matching P61-D5-003's own precedent (and RU-61-06's P61-D5-001) for the same class of environment-dependent gap.
effort:            4
dedup:             none — checked against the frozen 15-issue snapshot; no open issue concerns these three disabled parser.test.ts assertions. #83/#90/#466 (this plan's other checked neighbours) are unrelated dimensions/mechanisms.
disposition:       major-refactor
proposed_approach: Like the Phase 61 D5 environment/coverage-gap records this record cites (P61-D5-003), no single code edit closes this gap: the three disabled `expectNoValidationErrors` assertions in `bbj-vscode/test/parser.test.ts` (lines 533, 815, 864) need a Java classpath resolvable under Langium's `EmptyFileSystem` test context, a capability the current unit-test setup does not provide. DEBT-02's own re-triage scope is to either enable them once that capability exists or document the specific blocking limitation and what would unblock it — this record's approach is that documentation-or-enablement choice, not a fabricated single-file fix, since its own classification found none.
proposed_labels:   area=javascript; PRIO 2; effort 4
issue:             
```

```
id:                P66-D5-002
unit:              DEBT-02
location:          bbj-vscode/test/completion-test.test.ts:185
dimension:         D5
secondary:         [D2]
severity:          medium
evidence_tier:     trace
evidence:          Per INVENTORY §3b's D5 rule (as above), this is trace-evidenced. Cites P61-D5-010 by ID (the original root-cause trace: the Langium completion engine's grammar follower produces zero candidate positions anywhere inside MethodDecl.body statement positions, independently of DEF FN and independently of the scope chain) plus this plan's currency re-read confirming the skip and its root-cause comment are unchanged at the recorded line.
failure_scenario:  Any attempt to re-enable the skipped test, as currently written, against the current completion-grammar traversal fails: the completion engine's grammar follower does not produce candidate positions inside class-method statement bodies at all, so the expected _f$/_t$ parameter items are never offered — independent of DEF FN or the scope chain, both already ruled out by the recorded root-cause investigation.
classification:    major (1) touches 1 file: FAIL — the grammar-follower limitation is inside Langium's completion engine's traversal of the grammar for MethodDecl.body statement positions, not a single-file BBj-side fix — (2) no public API/grammar/LSP change: FAIL — a real fix likely requires either a grammar restructuring of MethodDecl.body statement completion positions or an upstream Langium completion-provider change — (3)-(5): moot, already failing — (6) severity medium, dimension D5: would pass in isolation, but classification is already major from tests (1)/(2).
effort:            8
dedup:             none — checked against the frozen 15-issue snapshot; no open issue addresses this Langium completion-grammar-follower limitation.
disposition:       major-refactor
proposed_approach: "Already failing" here means the same as P61-D5-010, which this record cites: the completion-provider suite in `bbj-vscode/test/completion-test.test.ts` cannot be observed green today, because the Langium grammar follower produces no candidate positions anywhere inside `MethodDecl.body` statements — the skipped DEF FN `_f$`/`_t$` assertion (lines 203-213) has never passed. The first step is establishing a passing baseline for that suite's class-method-body completion-position handling itself, at which point this record's own defect becomes separable from the broader grammar-traversal gap, via either a BBj-side grammar restructuring or an upstream Langium completion-provider change.
proposed_labels:   area=javascript; PRIO 2; effort 8
issue:             
```

## Other Dispositions

The corpus's `disposition:` field carries three values — `major-refactor`, `easy-fix` and
`wontfix` — not the four category names DOC-04 uses (`duplicate`, `wontfix`,
`already-covered`, `not-reproducible`). Two of DOC-04's categories live outside that field
entirely: `not-reproducible` is the six COVERAGE files' own `### Not-reproducible dispositions`
prose blocks, and `already-covered` is the non-`none` `dedup:` field annotations. This section
states that mapping plainly and carries the whole population each category points to, so no
category reads as populated when it is not — including the one that is genuinely empty.

### Category reconciliation

| DOC-04 category | Where it actually lives | Count |
|---|---|---|
| wontfix | `disposition:` field | 3 |
| not-reproducible | `### Not-reproducible dispositions` prose blocks | 24 |
| duplicate | nowhere — no finding was dropped as a duplicate | 0 |
| already-covered | non-`none` `dedup:` field annotations | 14 |

### wontfix

3 records whose `disposition:` field begins `wontfix` — the corpus's own zero-edit disposition —
transcribed with each record's own recorded reasoning carried verbatim rather than re-argued.

**`P64-D6-012`** — unit: `RU-64-02`, location: `bbj-vscode/package.json:683,690`, dimension: `D6`, severity: `critical`.
> disposition: wontfix — accepted with the reasons recorded above; documented in Phase 68's output rather than filed as a fix, and re-checkable against the three named expiry conditions.

**`P64-D8-002`** — unit: `RU-64-01`, location: `.planning/reviews/INVENTORY.md:932`, dimension: `D8`, severity: `low`.
> disposition: wontfix — with the reason required by the template: INVENTORY is immutable under Phase 60 D-09, so the correct outcome is not an edit to it. The correction is this record plus the 29-file gate written into this file's header, and Phase 68's DOC-03 reconciles the two; a future milestone that rebuilds INVENTORY should carry the corrected accounting forward from here.

**`P66-D5-003`** — unit: `DEBT-08`, location: `bbj-intellij/src/main/resources/textmate/bbj-bundle/package.json:9-14 (the "BBx Config" language entry's filenames registration, alongside "BBj"'s extensions registration at :5-8); bbj-intellij/build.gradle.kts:12-13 (the Java 17 source/target pin that is the stated blocker, cited not re-triaged)`, dimension: `D5`, severity: `medium`.
> disposition: wontfix Unblocking condition: P64-D6-010 (the bbj-intellij Gradle JDK 17-vs-25.0.3 toolchain mismatch) is resolved, at which point a runnable ./gradlew task (build or runIde) makes it possible to install/run the plugin and observe whether a config.bbx/config.min file is correctly highlighted. Not re-triaged here per CONTEXT.md's explicit exclusion of P64-D6-010 from this phase's denominator.

### not-reproducible

24 items extracted verbatim from the six COVERAGE files' own `### Not-reproducible dispositions`
prose sub-blocks (61→11, 62→4, 63→2, 64→7, 65→0, 66→0), grouped by originating phase and numbered
continuously, each keeping its source's own tier-failed / candidate-claim / reason-not-recorded
shape.

**Phase 61 (11 items):**

1. **Tier failed: `repro` (D1).** Candidate claim: unescaped Markdown/HTML syntax in peer-supplied Javadoc text (`java-interop.ts:638-643`) achieves script injection in the rendered hover/completion UI. **Reason not recorded as a finding:** confirming this requires the renderer's `MarkupKind`/`supportHtml` configuration, which lives in `RU-61-04` (`bbj-hover.ts`, `bbj-completion-provider.ts`) — outside this unit's files and out of scope for a `RU-61-06` sweep. The unbounded/unescaped *content* flowing into `DocumentationInfo.javadoc` is still recorded as `P61-D1-002`; the stronger claim of confirmed HTML/script execution in the IDE is not asserted without that additional evidence, which `RU-61-04`'s own sweep is positioned to supply.
2. **Tier failed: `trace` (D8).** Candidate claim: the JSDoc on `resolveClassCandidatesBySimpleName` (java-interop.ts:350-356) characterizing its fallback package probe as "cheap" may understate its actual cost, given `autoImportCandidatePackages` has 10 entries each triggering a `resolveClassByName` call that now recurses through the single global lock documented in `P61-D3-002`. **Reason not recorded as a finding:** confirming or refuting "cheap" requires a runtime latency measurement, outside this review's read-only sweep. The fallback's structural mechanism is already fully captured by `P61-D3-002`; no additional D8 finding is recorded without that measurement.
3. **Tier failed: `repro` (D1).** Candidate claim: the BBjFilePath greedy-match mis-tokenization (P61-D2-007) could, in principle, cause a statement's `ERR=` error-handling clause to be silently swallowed into an unrelated token, masking error-handling code from ever executing — a security-relevant control-flow-integrity concern. **Reason not recorded as a finding:** confirming this requires enumerating BBj's actual multi-statement-per-line usage patterns combined with `ERR=` clauses in real programs, which is beyond a read-only sweep of these 5 files; the tokenization defect itself is fully captured as `P61-D2-007`, and this note flags the theoretical D1-adjacent angle without asserting it as verified.
4. **Tier failed: `trace` (D4).** Candidate claim: some `ClassMember`/`LibMember` grammar alternatives may be unreachable dead rules. **Reason not recorded as a finding:** a full reachability analysis of bbj.langium's ~150 rules requires a call-graph tool beyond manual reading within this sweep's budget; spot-checks of every `SingleStatement` alternative, every `ClassMember` alternative (FieldDecl/MethodDecl/VariableDecl), and every `LibMember` alternative (LibFunction/LibVariable/LibSymbolicLabel) confirmed each is referenced from its parent rule, so no concretely unreachable rule was found to record as a finding, but exhaustive verification was not performed.
5. **Tier failed: `repro` (D1).** Candidate claim: `bbjcpl` inherits the language-server process's full environment (`spawn()` in `bbj-cpl-service.ts:140` passes no `env` override), which could expose secrets if the server process's environment holds sensitive values. **Reason not recorded as a finding:** confirming this requires knowing what secrets (if any) the language-server process's environment typically holds in production IDE deployments, which is outside a read-only sweep of these 8 files; no evidence in this unit's code that anything currently populates the server's own environment with secrets. The unvalidated *path* to the inherited-environment process is still recorded as `P61-D1-003`; the stronger claim of confirmed secret exposure is not asserted without deployment-specific evidence.
6. **Tier failed: `repro` (D2).** Candidate claim: `bbj-cpl-parser.ts`'s `ERROR_LINE_RE` (`^.+:\s+error at line \d+ \((\d+)\):\s*(.*)`) could mis-parse a source-code snippet that itself happens to contain the literal substring `error at line N (M):`, echoed back verbatim by the compiler inside a string-literal source line, causing a shifted or duplicated diagnostic. **Reason not recorded as a finding:** confirming or refuting this requires knowing `bbjcpl`'s real output format for source-snippet echoing beyond what the three fixtures in `test/test-data/cpl-fixtures/` cover, and no real `bbjcpl` binary is available in this sandbox to probe further; the regex's `^.+:` anchor requires the line to start with a file-path-then-colon prefix, which the indented source-echo lines in the existing fixtures do not have, so this remains a theoretical, unconfirmed edge case.
7. **Tier failed: `repro` (D1).** Candidate claim: `getBBjClassesFromFile`'s workspace-configured `prefixes` setting, combined with untrusted `USE`-statement path text and Node's `path.resolve()` traversal (`..`) handling, could let a crafted workspace `.vscode/settings.json` cause the language server to load or index a `.bbj` file outside the intended prefix/workspace root — the same class of workspace-settings-as-attack-surface concern `RU-61-06` recorded as `P61-D1-001` for `interopHost`/`interopPort`. **Reason not recorded as a finding:** confirming this requires tracing whether `BBjWorkspaceManager`'s own file-discovery logic (which actually opens/loads files from `prefixes`) enforces any root constraint of its own — that logic lives in `bbj-ws-manager.ts`, outside this unit's files. This unit's own code (`getBBjClassesFromFile`) only *compares* URIs against an already-populated index; it cannot itself cause an out-of-bounds file read. Referred to `RU-61-05` below.
8. **Tier failed: `repro` (D2/D3).** Candidate claim: `bbj-index-manager.ts` inherits `DefaultIndexManager.allElements()`'s element order, which follows workspace file-discovery order (filesystem enumeration) rather than any explicit sort — so in a workspace with two ambiguous same-simple-name entries (e.g. two same-named library members), which one `getElement()`'s first-match picks could differ between runs or platforms. **Reason not recorded as a finding:** confirming an actual differing resolution requires an empirical cross-platform/cross-run comparison, outside this review's single-read sweep; the structural mechanism (no explicit sort, insertion-order-dependent `Map`/array) is traced but the claimed instability is not empirically reproduced.
9. **Tier failed: `repro` (D1).** Candidate claim: the unescaped, unbounded peer-supplied text flowing into `Hover.contents`/`CompletionItem.documentation` (both explicitly `kind: 'markdown'`) achieves arbitrary script execution or LSP-command execution in the rendered IDE UI, not merely markdown/link/image injection. **Reason not recorded as a finding:** VS Code's markdown renderer for untrusted `MarkupContent` sanitizes raw HTML and does not honor `command:`-scheme URIs unless the containing `MarkdownString` is explicitly marked `isTrusted`, which neither this language server nor the LSP hover/completion response shape ever sets; IntelliJ/LSP4IJ's markdown-sanitization posture is implemented in `bbj-intellij/`, outside this unit's files and outside this phase's review surface (Phase 61 reviews `bbj-vscode/src/language/` only). The weaker, now-confirmed claim — that peer-supplied text reaches a field explicitly typed and transmitted as Markdown, unescaped — is recorded as `P61-D1-004`, which is what settles `RU-61-06`'s own not-reproducible disposition on this exact question.
10. **Tier failed: `repro` (D2).** Candidate claim: `bbj-completion-provider.ts`'s per-grammar-feature `completionForCrossReference` override could produce duplicate or conflicting completions when a type-reference position and a dot-trigger (`.`) position overlap for the same token. **Reason not recorded as a finding:** whether such an overlapping position is reachable at all depends on `RU-61-02`'s already-swept scope-provider behavior (which grammar features the scope provider predicts at a given offset), not on any logic this unit's own files add; tracing this unit's code alone does not establish reachability, and no reproduction was built for a claim rooted outside this unit's files.
11. **Tier failed: `repro` (D2).** Candidate claim: concurrent invocation of `bbj/refreshJavaClasses` and the `didChangeConfiguration` handler (both `main.ts`) races on `javaInterop.clearCache()`/ `loadClasspath()`/`loadImplicitImports()` internal state, producing a divergent or corrupted classpath result. **Reason not recorded as a finding:** confirming an actual divergent outcome requires tracing `resolvedClasses`/`childrenOfByName`/connection-state transitions inside `java-interop.ts` across two concurrent call sequences — that state and its transitions live in `RU-61-06`'s files, already broadly covered by that unit's connection-lifecycle race findings (`P61-D2-001`). This unit's own two call sites (`main.ts:32-73`, `147-188`) add no guard of their own around the two handlers running concurrently, but neither do they introduce any new race beyond what `RU-61-06` already evidenced at the `java-interop.ts` layer.

**Phase 62 (4 items):**

12. **Tier failed: `repro` (D2).** Candidate claim: a rapid back-to-back `'insert'` (or `'insert'` immediately followed by `'cancel'`) message pair could race two concurrent `await vscode.workspace.applyEdit(edit)` calls, or call `panel.dispose()` twice, corrupting the edit or throwing. **Reason not recorded as a finding:** confirming the actual interleaving during the `await` window requires a live webview-message-injection harness driving concurrent `postMessage` calls and observing the result — that harness is explicitly deferred infrastructure per this phase's scope (`62-CONTEXT.md` `<deferred>`; any harness a specific finding demands is a Phase 67 deliverable). A static trace shows both handlers run to their first `await` synchronously on the single Node.js event-loop turn in which the message was delivered, and VS Code's extension host processes `onDidReceiveMessage` callbacks one at a time, which makes a true data race unlikely but does not itself confirm safety across the `await` boundary — left here rather than silently dropped, per RVW-06's drop-vs-disposition rule.
13. **Tier failed: `repro` (D2).** Candidate claim: two EM login/validate invocations issued close enough together could collide on their `Date.now()`-millisecond-resolution temp-file names (`bbj-em-login-${Date.now()}.tmp` at `extension.ts:630`, `bbj-em-validate-${Date.now()}.tmp` at `extension.ts:412`), causing one invocation's `exec()` callback to read the other's output. **Reason not recorded as a finding:** confirming an actual same-millisecond collision and cross-read requires a timing-controlled concurrent-invocation harness driving two logins within the same millisecond and observing which callback reads which output — that harness is explicitly deferred infrastructure per this phase's scope (`62-CONTEXT.md` `<deferred>`; any harness a specific finding demands is a Phase 67 deliverable). A static trace confirms the theoretical millisecond-collision window exists but does not itself confirm an observable cross-read — left here rather than silently dropped, per RVW-06's drop-vs-disposition rule.
14. **Tier failed: `repro` (D2).** Candidate claim: two invocations of `bbj.composeMsgbox`'s bare command flow (`runComposer`, msgbox-composer-ui.ts:87-133) against the same editor, started close together, could race — e.g. the second invocation's QuickPick wizard finishing and applying its edit while the first is still awaiting a QuickPick step, with both eventually applying overlapping/stale edits to the same range. **Reason not recorded as a finding:** confirming an actual overlapping-edit outcome requires a timing-controlled concurrent-invocation harness driving two `runComposer` calls with interleaved QuickPick responses and observing the resulting document state — that harness is explicitly deferred infrastructure per this phase's scope (`62-CONTEXT.md` `<deferred>`; any harness a specific finding demands is a Phase 67 deliverable). A static trace confirms `runComposer` holds no lock and no module-level state guarding against a second concurrent invocation, which makes the scenario theoretically possible but does not itself confirm an observable corrupted-edit outcome — left here rather than silently dropped, per RVW-06's drop-vs-disposition rule. (This is a different mechanism from `P62-D2-005`, which is a single-invocation staleness gap against the user's OWN document edits made during the wizard, not a race between two composer invocations.)
15. **Tier failed: `repro` (D2).** Candidate claim: `document-formatter.ts` passes both `-i document.uri.fsPath` (lines 19-20, telling `BBjCFCli.jar` the input file's on-disk path) and the live unsaved buffer content via `p.stdin.end(documentContent)` (line 82) — if the jar's `-i` flag takes precedence over stdin for unsaved-but-not-yet-saved edits, the formatter could silently format stale on-disk content instead of what the user is actually editing. **Reason not recorded as a finding:** confirming which input `BBjCFCli.jar` actually honors requires reading the vendored jar's Java source or running it with divergent `-i`-path/stdin content and observing the result — the jar itself is `RU-64-03`'s surface (Phase 64), and running it is outside a static code-review sweep of `bbj-vscode/src/`. Left here rather than silently dropped, per RVW-06's drop-vs-disposition rule.

**Phase 63 (2 items):**

16. **Tier failed: `repro` (D1, secondary D6).** Candidate claim: whether `extractTarGz`'s delegation to the system `tar` binary (`BbjNodeDownloader.java:190-218`) actually permits a path-traversal write via a crafted archive entry (e.g., an entry name containing `../` segments) on the `tar` implementations available on macOS/Linux. **Reason not recorded as a finding:** confirming this would require constructing and extracting a malicious `.tar.gz` archive against a live `tar` invocation — which is itself the trigger-sequence/proof-of-concept D-13 prohibits publishing for a D1-adjacent claim regardless of the outcome, and no such harness exists in this phase's scope (this sweep documents code behaviour via trace, it does not construct exploit archives). The fact that this path delegates entry-safety to the system `tar` with no validation of its own is stated as SEC-03 fact (3) instead, which is the trace-clearable claim; whether that delegation is actually exploitable on any specific `tar` build is left here, per RVW-06's drop-vs-disposition rule, rather than silently dropped.
17. **Tier failed: `inherited` (D7).** Candidate claim: whether IntelliJ's built-in TextMate bundle importer actually honors the `"BBx Config"` language's `filenames` field (vs. falling back to extension-only matching, silently reintroducing #381's failure mode on the IntelliJ side despite the manifest declaring the fix — see `RU-62-05`'s own D7 cell), and, relatedly, whether a `.bbl` file opened in IntelliJ picks up TextMate highlighting via the bundle's own independently-declared `extensions` list even though no `<fileType>` claims that extension. **Reason not recorded as a finding:** both questions turn on how the JetBrains TextMate plugin's bundle importer behaves at runtime when it owns a language/extension mapping the platform's own file-type registry does not — confirming either requires launching the IDE and opening a `config.bbx`/`.bbl` file, which is deferred infrastructure not available in this sandbox (the same limit `RU-62-05` itself recorded). The confirmable half — that `plugin.xml`'s `<fileType>` registration omits `.bbl` while the TextMate bundle's own manifest includes it — is stated as established fact in the D7 cell and the referral triage above rather than silently dropped, per RVW-06's drop-vs-disposition rule.

**Phase 64 (7 items):**

18. **Tier failed: `repro` (D2).** Candidate claim: `em-login.bbj` cannot report anything to its caller when invoked with fewer than three arguments. `:12` reads the output path as `ARGV(3,err=*next)`, so a two-argument invocation branches past the assignment and leaves `outputFile!` unset; the guarded writes at `:17`, `:24`, `:41` and `:48` then all target that unset value, which would make every one of the script's four exit paths — including both error paths — unable to write anything at all, leaving the caller unable to distinguish an authentication failure from a harness that never started. **Reason not recorded as a finding:** confirming what `ARGV(n,err=*next)` leaves in the variable on a missing argument, and what `open(ch,mode="O_CREATE,O_TRUNC")` does when handed an unset string, requires executing BBj. No BBj interpreter exists in this checkout, and running one would be a tree-touching action this phase does not take. The control-flow shape is verifiable; the runtime semantics it depends on are not, and asserting them would be exactly the plausible-but-false claim this standard exists to prevent. Left visible for a reviewer with a BBj installation to settle.
19. **Tier failed: `repro` (D2). Inherited from `62-COVERAGE.md:1833`.** Candidate claim: `document-formatter.ts` supplies `BBjCFCli.jar` with **both** an input path (`-i document.uri.fsPath`, `:19-20`) and the live unsaved buffer on stdin (`:82`), so if the JAR's `-i` flag takes precedence over stdin, an unsaved edit would be formatted against stale on-disk content. **Reason not recorded as a finding:** settling which input the JAR honours requires reading its bytecode or running it with divergent `-i`-path and stdin content, and D-11 prohibits both. The manifest cannot settle it either — `BBjCFCli.jar`'s manifest is six header lines (`Manifest-Version`, `Ant-Version`, `Created-By`, `Class-Path`, `X-COMMENT`, `Main-Class`) and carries no usage or argument metadata whatsoever, which was checked before disposing of it rather than assumed. **Disposition: not-reproducible**, carried forward as an open question in `### Vendored Binary Provenance` fact (5) rather than answered by assertion. Phase 62 deferred it here; Phase 64 states plainly that its own method cannot answer it, which is the honest end of that deferral rather than a silent drop.
20. **Tier failed: `repro` (D1).** Candidate claim: this repository's default "Workflow permissions" setting is the permissive read-and-write-all option, so the seven jobs that declare no `permissions:` block hold a full-scope `GITHUB_TOKEN`. **Reason not recorded as a finding:** that setting is a GitHub repository or organisation configuration value, not a file in the tree, and it cannot be read from a checkout. What the tree does establish is one-directional and is recorded as `P64-D1-005`: `preview.yml:53-60` and `manual-release.yml:69-82` push to `main` and push tags using the credential `actions/checkout` persists, which cannot succeed unless the default includes `contents: write`. Concluding from a working release path that the setting is therefore the permissive one is an inference about a setting, not an observation of it — the setting could equally be a narrower non-default that happens to grant `contents: write` alone. Settling it requires reading repository settings or observing a run, and this phase does neither. The tree-verifiable half — that 7 of 10 jobs state no scope anywhere in the repository — is what `P64-D1-005` records, and the inferential half is flagged inside that record as an inference. Left visible for a maintainer with settings access to settle in one click.
21. **Tier failed: `repro` (D1).** Candidate claim: a multi-line `name` or `version` field in a pull request head's `bbj-vscode/package.json` would inject an arbitrary additional `key=value` line into `$GITHUB_OUTPUT` at `pr-vsix.yml:62`, setting a step output the workflow never computed. **Reason not recorded as a finding:** the runner's `$GITHUB_OUTPUT` parser has required an explicit heredoc delimiter for multi-line values since 2022, and whether a bare multi-line write is rejected, truncated at the newline or accepted wholesale determines whether the sink exists at all. Settling that requires executing a workflow, which D-12 forbids and this checkout cannot do. Recorded here rather than dropped, with the observation that it would not have been promoted even had it cleared its tier: the consumer analysis in the D1 cell line shows the only fork-reachable consumer is the `path:` action input at `:70`, and a fork pull request already controls the entire workspace, so the sink reaches nothing the contributor does not already own — while the `actions/github-script` consumer at `:80-82` is both `toJSON`-encoded and gated to same-repository pull requests at `:76`.
22. **Tier failed: `trace` (D4).** Candidate claim: `manual-release.yml:72`'s `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` binding is dead configuration, because the `git push origin main` and `git push origin "v$VERSION"` at `:81-82` authenticate through the credential `actions/checkout` writes into the local Git config rather than through the environment variable. **Reason not recorded as a finding:** whether Git consults that variable at all in this step depends on the checkout action's credential-persistence behaviour and on the remote's configured extraheader at run time, neither of which is observable from the tree, and the same file's two other bindings are demonstrably live (`:132` feeds the IntelliJ plugin verifier's GitHub listing fetch, `:169` feeds `gh release create` at `:172`). Asserting that the third is vestigial on the strength of the first two being different would be exactly the plausible-but-false claim this standard exists to prevent. The line is noted in the D4 cell line as an unresolved candidate and left for a reviewer who can observe a run.
23. **"The IntelliJ plugin ZIP is assembled without a language server, and the build still reports SUCCESS."** *Tier failed: `repro` (D2).* The **premise** cleared the bar and is recorded as `P64-D2-009`: `build.gradle.kts:93-98` and `:115-119` copy `main.cjs` from `../bbj-vscode/out/language/` with no `dependsOn`, no `onlyIf`, no `doFirst` existence check and no failure path anywhere in the 135-line file, and `bbj-vscode/.gitignore:1` (`/out/`) means the source is absent in a fresh clone. The **consequence** does not: asserting that Gradle's `Copy` task treats an empty source set as `NO-SOURCE` and lets `buildPlugin` succeed with an incomplete ZIP requires executing the build, and `./gradlew --offline -q dependencies` exits 1 in 723 ms on the local JDK before any task is scheduled (`P64-D6-010`). It is documented Gradle behaviour, but documented behaviour recalled rather than observed is exactly the "plausible-but-false mechanism" this standard exists to keep out of the record, so the outcome is dispositioned here and the finding is confined to the missing guard, which is verifiable by reading the file.
24. **"A workspace-controlled glob pattern reaches the vulnerable `brace-expansion` copy inlined in `out/extension.cjs`."** *Tier failed: `inherited` resolving to repro-equivalent (D6).* The presence cleared the bar and is recorded as `P64-D6-008` — `package-lock.json:7581-7584` pins `brace-expansion@5.0.7`, and `grep -c` finds 2 occurrences of it in the shipped bundle. The **input path** does not: establishing which glob patterns the language client registers, and whether any of them derives from workspace or user input, requires reading `bbj-vscode/src/extension.ts` and the client wiring around it, which is `RU-62-01`'s surface and belongs to a phase closed before this one. This unit therefore records reachable vulnerable code in a shipped artefact and stops there. **This is also the reason that row is triaged `file-issue` and not `accepted-with-reason`:** the argument that would justify acceptance is precisely the one this unit cannot finish, and recording an acceptance on an unfinished argument is the failure RVW-06 exists to prevent.

**Phase 65 (0 items):**

Phase 65's `### Not-reproducible dispositions` blocks say "None" explicitly — roughly 36 items enumerated during its sweep were settled by direct code trace rather than left open, so the zero here is a stated fact, not a missing section.

**Phase 66 (0 items):**

`66-COVERAGE.md` carries no `### Not-reproducible dispositions` block at all — its 8 records left no candidate claim unresolved during the sweep.

### duplicate

**Count: 0.** RVW-07 required every finding to be checked against the 15 frozen open issues before
being recorded; where overlap existed it was annotated in-record as `partial-overlap` or
`supersedes` and the finding was still recorded — nothing was discarded for duplicating a tracker
entry. The category is written as a zero, with this reason, rather than omitted, because an omitted
category would read as an oversight rather than a checked, honest empty set.

### already-covered

14 records whose `dedup:` field is not `none` — 11 `major-refactor`, 2 `easy-fix`
(`P61-D2-015`, `P66-D2-001`) and 1 `wontfix` (`P66-D5-003`). An entry here can also appear in
its own document's own records (`EASY-FIXES.md` or this document's `## Records` section) without
contradiction — the two facts, "this finding overlaps a tracker entry" and "this finding was still
recorded and dispositioned", are both true at once, and that overlap is stated here rather than left
for a reader to reconcile.

**`P61-D1-007`** (major-refactor) — dedup: #485 partial-overlap — #485 requests honoring a custom-named/located config file "everywhere"; that capability is already implemented here via configPath. This finding is about that implementation's missing path-containment check, not about adding the capability #485 requests.

**`P61-D2-015`** (easy-fix) — dedup: #33 partial-overlap — #33 reports multi-root/workspace usage broken in VS Code without a code-level diagnosis; this finding traces a concrete root cause (settings resolved from folders[0] only) with file:line evidence, which the issue itself does not provide, so it is not asserted as a confirmed duplicate of the reporter's exact symptom.

**`P61-D2-018`** (major-refactor) — dedup: #486 partial-overlap — #486 requests watching config.bbx and re-applying PREFIX/USE changes without a restart; this finding traces the exact missing call (settings.prefixes computed once in initializeWorkspace(), never recomputed by didChangeConfiguration) that implementing #486 would need to add.

**`P61-D4-007`** (major-refactor) — dedup: #466 partial-overlap — this finding's subject (the class's responsibility count) does not duplicate #466's request (extending sibling-type mismatch detection), but the FINAL_TYPE_ASSIGNABLE_TO mechanism this finding names is the code #466 would extend, so cross-referencing is useful when #466 is triaged. Checked against #90 also (this unit's other flagged plausible neighbour); no overlap.

**`P61-D5-003`** (major-refactor) — dedup: DEBT-02 — the owning re-triage requirement (Phase 66): "The 3 disabled parser.test.ts assertions and the skipped TEST-03 case re-triaged — enabled, or documented with the specific blocking limitation and what would unblock them." None of the 15 frozen open issues concern these disabled assertions.

**`P61-D5-010`** (major-refactor) — dedup: DEBT-02 — Phase 66's debt item explicitly covers "the 3 disabled parser.test.ts assertions and the skipped TEST-03 case," matching this finding exactly; re-triage (enable, or document the specific blocking limitation) is DEBT-02's own stated scope. None of the 15 frozen open issues address this Langium completion-grammar-follower limitation.

**`P62-D1-003`** (major-refactor) — dedup: #231 partial-overlap -- #231 requests configurable classpath/command-line settings for starting BBj programs; those settings (bbj.classpath, bbj.compiler.*, bbj.configPath) already exist, and this finding is about their existing unescaped interpolation into child_process.exec(), a security defect #231 does not address. #485 partial-overlap -- #485 requests honoring custom-named/located config files everywhere; this finding's bbj.configPath/-c interpolation touches the same setting but is about injection-safety, not feature completeness. #486 none -- #486 requests live-reload of config.bbx PREFIX/USE changes, unrelated to command-string construction.

**`P63-D4-010`** (major-refactor) — dedup: DEBT-05 — this is the phase's designated DEBT-05 evidence record; Phase 66 re-triages it, not re-derives it. #410 and #231 also checked explicitly and dismissed as unrelated to LSP4IJ API coupling.

**`P63-D7-002`** (major-refactor) — dedup: #65 (support tokenized BBj files) partial-overlap — #65 requests tokenized/ line-numbered BBj file support; this finding's denumber/decompile/ decompileReadonly absence is the IntelliJ-side remainder of that same request (the VS Code side is already implemented, per RU-62-02's own D7 cell), so it is not a novel gap for those three commands specifically — the configureCompileOptions and em absences are not covered by #65. #231/#385 checked explicitly: #231 concerns run/compile settings configurability generally, overlapping loosely with configureCompileOptions but not requesting the other four; #385 is unrelated (Graffiti Composer).

**`P63-D7-005`** (major-refactor) — dedup: #475 partial-overlap — #475 requests a NEW BBj-code-scoped SETOPTS capability (decode hovers + tri-state composer with IOR/AND-aware codegen for SETOPTS calls inside BBj source) that neither IDE has today; this finding is about porting the EXISTING #474 config.bbx SETOPTS composer (already shipped in VS Code) to IntelliJ — related but not identical. setopts-catalog.ts's own header, quoted in RU-62-03's D8 cell, names IntelliJ reuse of its byte/bit logic as a stated future intention — exactly the reuse surface #475's tri-state composer would also need — so this finding's fix is a natural prerequisite subset of #475's fuller scope, not a duplicate of it. #385 (Graffiti Composer, an unrelated external tool) checked explicitly and dismissed.

**`P63-D7-006`** (major-refactor) — dedup: #65 (support tokenized BBj files) partial-overlap — #65 requests exactly the tokenized-detection quarter of this finding's four-feature absence; the VS Code side already implements it (RU-62-02's own D7 cell), so this finding's tokenized-detection component is #65's IntelliJ-side remainder, not a novel request. The format/denumber/decompile components are not covered by #65 or any other frozen open issue. #381 and #476 (this unit's other named neighbours) are unrelated.

**`P66-D2-001`** (easy-fix) — dedup: #466 (Detect sibling-type method return mismatches via Java class hierarchy) — checked and recorded as unrelated: #466 requests a validation that compares an ALREADY-RESOLVED return type against a Java class hierarchy (e.g. a HashMap returned where a TreeMap was declared) — its premise is that getType() already produced a type to compare. This finding is about getType() producing no type at all in the first place (silently returning undefined), a different and upstream mechanism from #466's hierarchy-comparison concern; a fix for this finding is a precondition for #466's validation ever having a type to compare in the resolvedReturnType-unset case, but the two are not duplicates and do not partially overlap in what they each check.

**`P66-D4-001`** (major-refactor) — dedup: supersedes P63-D4-010 (63-COVERAGE.md, this phase's designated DEBT-05 evidence record) — not re-derived, re-triaged with this plan's own live jar measurement in place of P63-D4-010's coupling-shape-only trace. #410 (Zed Editor support request) and #231 (custom classpath/CLI settings request) re-checked against this file's `## Dedup source` composition-check table above — both remain unrelated to LSP4IJ API coupling, consistent with P63-D4-010's own dedup finding.

**`P66-D5-003`** (wontfix) — dedup: #381 (Config.bbx is no longer highlighted) — checked explicitly against the frozen 15-issue snapshot (see ## Dedup source's composition-check table above, which flagged #381 as "adjacent to DEBT-08, out of this plan's scope" pending this section). Verdict: distinct, not a duplicate or partial overlap. #381 reported the VS Code-side regression (config.bbx losing highlighting after a VS Code extension-registration change) and was resolved on the VS Code side by commit 2489001 — the same commit that added this IntelliJ-side filenames registration, defensively, without ever confirming JetBrains' TextMate plugin honors it. This finding is the IntelliJ-side verification gap that commit left behind, not a recurrence of #381's VS Code symptom.

### Cross-unit referrals and their resolution

30 referrals extracted verbatim from the six COVERAGE files' own `### Cross-unit referrals` /
`### Cross-references` prose blocks (61→12, 62→7, 63→1, 64→10, 65→0, 66→0), each carrying the
source phase and line anchor it came from and an unfilled `resolution:` slot — plan `68-06` fills
all 30. This is inside DOC-04's intent, not beyond it: a referral whose receiving unit recorded
nothing is exactly a finding dropped silently, which is what DOC-04 exists to prevent. A referral
that landed is `already-covered` with a citation; either way the reader can check it. No
resolution is guessed here — the whole point of D-07 is that guessing would hide a silent drop.

**Phase 61 (12 referrals):**

1. **[from `61-COVERAGE.md:640`]** **RU-61-05** — `bbj-ws-manager.ts:53-55` and `main.ts:151-152` supply `interopHost`/`interopPort` from `initializationOptions`/`didChangeConfiguration` with only a falsy-check default (`|| 'localhost'`, `|| 5008`), the same gap this unit's `setConnectionConfig` (`java-interop.ts:116-120`, `P61-D1-001`) does not close. `RU-61-05`'s own D1/D2 sweep should confirm whether either call site adds validation this unit does not see, or record its own finding if not.
resolution:        landed — RU-61-05 confirmed and promoted the gap as `P61-D1-006`
                    (`bbj-ws-manager.ts:53-55`, medium/major), explicitly resolving this referral;
                    see the answering referral entry below (`61-COVERAGE.md:2989`, item 9 in this
                    list).
2. **[from `61-COVERAGE.md:641`]** **RU-61-02** — the 11 `test/linking.test.ts` "Interop related tests" failures (`P61-D5-001` above) are recorded here as already-owned: their *subject* is the linker (`RU-61-02` resolves `NamedElement`/`JavaPackageLike` references), but their *cause* is this unit's unreachable/non-functional peer, per D-06's routing table and the finding-ownership rule ("a finding's `location:` decides which unit owns it, not which unit discovered it"). `RU-61-02` (plan `61-04`) must not re-record this item.
resolution:        landed — already-owned by `P61-D5-001` (`RU-61-06`,
                    `test/linking.test.ts:295-450`) per D-06's routing rule; `RU-61-02` correctly
                    recorded nothing on this subject because the finding already had an owner,
                    which is not an open gap.
3. **[from `61-COVERAGE.md:1022`]** **RU-61-06** — java-types.langium's `JavaClass`/`JavaField`/`JavaMethod` interfaces (java-types.langium:33-58) are the AST type-shape declarations that RU-61-06's java-interop.ts populates from unauthenticated, unvalidated JSON-RPC peer data (already recorded there as `P61-D1-002`). No independent finding is recorded here since java-types.langium contains no parsing, validation, or peer-data-handling logic of its own — it is purely the interface shape those interop values are assigned into; the unvalidated-assignment defect belongs entirely to `RU-61-06`'s files.
resolution:        landed — the unvalidated peer-data assignment this referral flags is already
                    recorded as `P61-D1-002` (`RU-61-06`, `java-interop.ts:598-644`);
                    `java-types.langium` itself carries no independent defect and `RU-61-01`
                    correctly filed nothing here.
4. **[from `61-COVERAGE.md:1023`]** **RU-61-05** — the `beforeAll` `WorkspaceManager.initializeWorkspace()` hookTimeout flakiness (root-caused and owned by `RU-61-05` per D-14/the routing table) intermittently strikes this unit's own `test/functional/chevrotain-tokens.test.ts` suite — INVENTORY's "Flaky suite-level failures" table records that suite 21/21-skipped on run 1. Noted here per this plan's explicit instruction; not re-recorded as an `RU-61-01` finding. `RU-61-05`'s own D5 sweep (plan 61-06) owns dispositioning it.
resolution:        landed — resolved as `P61-D5-013` (`RU-61-05`, `bbj-ws-manager.ts:106-184`),
                    the routing-table item covering the `WorkspaceManager.initializeWorkspace()`
                    hookTimeout flakiness; see the answering referral entry below
                    (`61-COVERAGE.md:3006`, item 12 in this list).
5. **[from `61-COVERAGE.md:1492`]** **RU-61-05** — `bbj-document-builder.ts`'s `trackBbjcplAvailability()` (owned by `RU-61-05`) performs the same path-existence-only check (`accessSync`) as this unit's own gap recorded at `P61-D1-003` — confirming the binary *exists* is not the same as confirming it is a legitimate BBj compiler. `RU-61-05`'s own D1/D4 sweep should confirm whether that caller adds validation this unit's `compile()` does not see, or record its own finding if not.
resolution:        landed — RU-61-05 confirmed (see the answering referral entry below,
                    `61-COVERAGE.md:2992`, item 10 in this list) that its own `accessSync()`
                    existence check has no execution consequence of its own and filed no
                    additional finding; the actual spawn-path validation gap is fully covered by
                    `P61-D1-003` (`RU-61-03`, `bbj-cpl-service.ts:82-155,228-235`).
6. **[from `61-COVERAGE.md:1835`]** **RU-61-06** — this unit does **not** re-record the 11 `test/linking.test.ts` "Interop related tests" failures; they are already owned by `RU-61-06` as `P61-D5-001` (their *subject* is the linker, but their *cause* is the unreachable java-interop peer, per D-06's routing table and the finding-ownership rule). Also per the plan's explicit instruction, this unit does not file a finding for the SEC-06/boundary edge probe (whether an unresolved reference caused by an unavailable java-interop peer is distinguishable in code from a genuine resolution failure) — `bbj-scope-local.ts:158-165`'s uniform `javaClass.error` handling is stated in the D2 cell text above as context for `RU-61-06`'s own sweep, not filed here.
resolution:        landed — same subject and same owner as referral 2 above: already recorded as
                    `P61-D5-001` (`RU-61-06`); `RU-61-02` correctly recorded nothing.
7. **[from `61-COVERAGE.md:1836`]** **RU-61-05** — the prefix-path-traversal candidate above (Not-reproducible dispositions, D1) depends on whether `bbj-ws-manager.ts`'s document-loading logic constrains file discovery from `prefixes` to a safe root; `RU-61-05` owns that file and should confirm or record its own finding.
resolution:        landed — RU-61-05 confirmed and promoted the gap as `P61-D1-008`
                    (`bbj-document-builder.ts:303-317`; `addImportedBBjDocuments` applies no
                    containment check to PREFIX-resolved paths); see the answering referral entry
                    below (`61-COVERAGE.md:3001`, item 11 in this list).
8. **[from `61-COVERAGE.md:2295`]** **RU-61-02** — `bbj-inlay-hint-provider.ts:65`'s sole real consumption of `bbj-overload-selector.ts`'s `findBestOverload` is the upstream-consumer context for `RU-61-02`'s already-recorded `P61-D2-012` (that finding's `location:` is `bbj-overload-selector.ts`, `RU-61-02`'s own file, per the finding-ownership rule). No new defect was found in this unit's own consumption of it, so nothing further is referred — noted here per plan `61-04`'s explicit handoff in its own Next Phase Readiness section.
resolution:        landed — no new defect was found in this unit's own consumption; the subject
                    is already recorded as `P61-D2-012` (`RU-61-02`,
                    `bbj-type-inferer.ts:47-48,77-78`), noted here per plan `61-04`'s own handoff.
9. **[from `61-COVERAGE.md:2989`]** **RU-61-06** — the `interopHost`/`interopPort` falsy-check-only validation gap this unit owns at `bbj-ws-manager.ts:53-55` and `main.ts:151-152` is confirmed and promoted as `P61-D1-006` above, resolving `RU-61-06`'s referral (`61-COVERAGE.md:618`, `P61-D1-001`'s evidence).
resolution:        landed — this entry is itself the confirmation: `P61-D1-006` (`RU-61-05`,
                    `bbj-ws-manager.ts:53-55`) promotes and resolves the gap `RU-61-06` referred
                    above (referral 1 in this list).
10. **[from `61-COVERAGE.md:2992`]** **RU-61-03** — `bbj-document-builder.ts`'s `trackBbjcplAvailability()` (`bbj-document-builder.ts: 199-222`) performs only an `accessSync()` existence check on the resolved `<bbjHome>/bin/bbjcpl` path, and its result is used solely to set the `bbjcplAvailable` boolean gate and fire the `bbj/bbjcplAvailability` notification — the resolved path is never itself passed onward to `bbj-cpl-service.ts`'s `compile()`, which independently resolves and spawns its own `bbjcpl` path (already recorded, with a runnable reproduction, as `P61-D1-003` in `RU-61-03`). Dismissed: this unit's own `accessSync()` check has no execution consequence of its own, so no additional `RU-61-05` finding is filed; `P61-D1-003` already fully covers the actual spawn-path validation gap.
resolution:        landed — this entry is itself the dismissal: `RU-61-05`'s own `accessSync()`
                    check has no execution consequence, so no additional finding was filed;
                    `P61-D1-003` (`RU-61-03`) already fully covers the spawn-path validation gap
                    referred above (referral 5 in this list).
11. **[from `61-COVERAGE.md:3001`]** **RU-61-02** — the prefix-path-traversal candidate `RU-61-02` could not settle (`61-COVERAGE.md: 1808`, `1814`) is confirmed and promoted as `P61-D1-008` above: `bbj-document-builder.ts`'s `addImportedBBjDocuments` (not `bbj-ws-manager.ts` itself, which only stores the `prefixes` list) is the code that actually opens files from PREFIX-resolved paths, and it applies no containment check before reading whatever `path.resolve()` produces.
resolution:        landed — this entry is itself the confirmation: `P61-D1-008` (`RU-61-05`,
                    `bbj-document-builder.ts:303-317`) promotes and resolves the
                    prefix-path-traversal candidate `RU-61-02` referred above (referral 7 in this
                    list).
12. **[from `61-COVERAGE.md:3006`]** **RU-61-01** — the `beforeAll` `WorkspaceManager.initializeWorkspace()` hookTimeout flakiness this unit owns (`61-COVERAGE.md:1001`) is resolved as `P61-D5-013` in Task 2 of this plan (D5, the tier the routing table assigns it), cross-referencing this section's D3 cost-profile trace above.
resolution:        landed — this entry is itself the confirmation: `P61-D5-013` (`RU-61-05`,
                    `bbj-ws-manager.ts:106-184`) resolves the hookTimeout flakiness `RU-61-01`
                    referred above (referral 4 in this list).

**Phase 62 (7 referrals):**

13. **[from `62-COVERAGE.md:323`]** **RU-63-04** — `setopts-composer-webview.ts` (321 lines, `bbj-vscode/src/`) has no IntelliJ counterpart: `grep -c setopts bbj-vscode/src/language/composer-commands.ts` returns `0` (no `bbj/composer/setopts/*` LS command exists, unlike msgbox/addwindow/addchildwindow which are all LS-shared per the D7 cell above), no `SetoptsComposerDialog.java` exists under `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/` (confirmed via directory listing), and `ComposerLauncher.java` — grepped for `Setopts`/`SetOpts` — has zero references anywhere in its dispatch logic (contrast with its `openMsgbox`/`openAddWindow`/`openAddChildWindow` handlers at lines 90,118,139). `RU-63-04`'s own sweep should confirm whether this is a deliberate, documented scope decision or an unaddressed feature gap, and record its own D7 finding if the latter — this unit's own coverage records the divergent VS Code-side evidence above but locates no finding inside `bbj-intellij/` (D-05).
resolution:        landed — `P63-D7-005` (`RU-63-04`, major-refactor) records this exact subject:
                    porting the existing #474 config.bbx SETOPTS composer
                    (`setopts-composer-webview.ts`) to IntelliJ. `dedup:` names `#475` as a
                    related-but-different feature request (a new BBj-code-scoped tri-state
                    composer) and states this finding is about the existing #474 port, not #475 —
                    the same subject as this referral, confirmed same not different, so it is not
                    an open gap despite the neighbouring `#475` mention.
14. **[from `62-COVERAGE.md:800`]** **RU-63-01** — `BbjCompileAction.java` (`bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java:24-37`) is an unimplemented `TODO` stub: `actionPerformed` only logs `"[Compile] Triggered for file: " + file.getName()` to the console and never invokes `bbjcpl` or any compiler process — unlike VS Code's `bbj.compile` (`Commands.cjs:294-343`), which builds and runs a real `bbjcpl` command line from 18 configurable options via `CompilerOptions.ts`/`buildCompileOptions()`. `RU-63-01`'s own sweep should confirm whether this is a documented, deliberate scope decision (e.g. compile-on-save is expected to be driven by the language server instead) or an unaddressed feature gap, and record its own finding if the latter.
resolution:        landed — `P63-D7-002` (`RU-63-01`, major-refactor) is explicitly recorded as
                    "Referral #2 disposition": all five commands (`bbj.configureCompileOptions`,
                    `bbj.denumber`, `bbj.decompile`, `bbj.decompileReadonly`, `bbj.em`) confirmed
                    absent from `bbj-intellij/` with no deliberate-scope statement found — an
                    unaddressed feature gap, not a documented decision.
15. **[from `62-COVERAGE.md:801`]** **RU-63-01** — Six VS Code commands in this unit have no IntelliJ action counterpart anywhere in `bbj-intellij/src/main/java/com/basis/bbj/intellij/` (confirmed via `ls`/`grep` across the module — no `Denumber`/`Decompile`/`ConfigureCompileOptions`/`EnterpriseManager` action class exists): `bbj.configureCompileOptions` (compiler-options UI with dependency/conflict validation), `bbj.denumber`/`bbj.decompile`/`bbj.decompileReadonly` (tokenized/line-numbered program decompilation, issues #64/#65), and `bbj.em` (Enterprise Manager URL launcher reading `BBj.properties`' jetty host/port). `RU-63-01`'s sweep should confirm whether these are deliberate VS Code-only features or unaddressed IntelliJ gaps.
resolution:        landed — `P63-D7-001` (`RU-63-01`, major-refactor) is explicitly recorded as
                    "Referral #1 disposition": `BbjCompileAction.java`'s `actionPerformed()`
                    confirmed as an unimplemented TODO stub with no deliberate-scope statement
                    found — an unaddressed feature gap, not a documented decision.
16. **[from `62-COVERAGE.md:802`]** **RU-63-01** (secondary interest to `RU-63-05`) — `BbjRefreshJavaClassesAction.java:21-30` performs a full `BbjServerService.getInstance(project).restart()` (restarting the whole language server) where VS Code's `bbj.refreshJavaClasses` (`extension.ts:694-704`) sends a targeted `bbj/refreshJavaClasses` LSP request without restarting the server — a behavioral divergence worth confirming as deliberate (LSP4IJ architecture constraint) or a missed optimization.
resolution:        landed — `P63-D7-003` (`RU-63-01`, major-refactor) is explicitly recorded as
                    "Referral #3 disposition": the full-restart-vs-targeted-request divergence is
                    confirmed and filed; `RU-63-05`'s own D7 cell (referral 20 below)
                    cross-references this same finding by ID rather than allocating a second one
                    for the mechanism side.
17. **[from `62-COVERAGE.md:1078`]** **RU-63-04** — Independently confirms, from this unit's own logic/UI-layer perspective, the same SETOPTS/IntelliJ absence `RU-62-04` already referred: `setopts-catalog.ts` (335 lines) and `setopts-composer-ui.ts` (96 lines, `bbj-vscode/src/`) have no IntelliJ counterpart — `ls bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/` lists no `SetoptsComposerDialog.java` and `ComposerModels.java` defines no `SetOpts*` DTO, and `ComposerLauncher.java` — grepped for `setopts`/`Setopts` — has zero matches anywhere in its dispatch logic (contrast `openMsgbox`/`openAddWindow`/`openAddChildWindow` at lines 90/118/139). `RU-63-04`'s own sweep should treat this as corroborated from two independent Phase 62 units (`RU-62-04`'s generator-layer view and this unit's logic/UI-layer view) when it confirms whether the absence is a deliberate, documented scope decision or an unaddressed feature gap.
resolution:        landed — same finding as referral 13 above: `P63-D7-005` (`RU-63-04`). Its
                    `dedup:` field itself notes the logic/UI-layer (`setopts-catalog.ts`,
                    `setopts-composer-ui.ts`) and generator-layer views are corroborating evidence
                    for the one port-to-IntelliJ finding, not two separate subjects.
18. **[from `62-COVERAGE.md:1456`]** **RU-63-02** — Two follow-ups for the IntelliJ-side language-registration/editor-support sweep, neither confirmable without launching the IDE (deferred infrastructure per `62-CONTEXT.md`), so neither is asserted as a `P62-D7-*` finding here (D-05): (1) `.planning/STATE.md`'s tech-debt note "IntelliJ TextMate bundle cannot exclude config.bbx at filename level" was recorded 2026-02-20 (`f252ad9`), **before** commit `2489001` (2026-07-18) added `"filenames": ["config.bbx", "Config.bbx", "config.min", "Config.min"]` to `bbj-intellij/src/main/resources/textmate/bbj-bundle/package.json`'s `"BBx Config"` language entry — the manifest now declares filename-level exclusion; `RU-63-02` should confirm at runtime whether IntelliJ's built-in TextMate bundle importer actually honors a VS-Code-style `filenames` field (vs. silently falling back to extension-only matching, which would reintroduce #381's failure mode IntelliJ-side despite the manifest declaring the fix) and update or retire the STATE.md tech-debt note accordingly. (2) IntelliJ's TextMate bundle manifest's `"BBj"` language already lists `.bbl` in its `extensions` array (`bbj-intellij/.../package.json:7`), unlike VS Code's own `package.json` (`P62-D7-002`, this unit's own fix target) — `RU-63-02` should confirm whether IntelliJ's LSP4IJ file-type/language registration (a separate mechanism from the TextMate bundle's own `extensions` field, per this plan's own D-05 boundary) independently attaches BBj language support to `.bbl` files end-to-end, since if so, IntelliJ's `.bbl` handling is the correct reference behavior VS Code's `package.json` should be brought in line with.
resolution:        absorbed as an observation — `RU-63-02`'s own "Referral #6"
                    cross-unit-referral triage note (`63-COVERAGE.md`, §RU-63-02) answers both
                    follow-ups without filing a `P63-D7-*` finding: Part 2 (does IntelliJ's LSP4IJ
                    registration independently cover `.bbl`) is settled by trace — `plugin.xml`'s
                    `<fileType>` omits `.bbl`, so it does not, and this is recorded as deliberate
                    consistency with VS Code's own `.bbl` exclusion (#369), not a gap. Part 1
                    (does the TextMate bundle importer honor the `filenames` field at runtime)
                    cannot be confirmed without launching the IDE and is recorded in `###
                    Not-reproducible dispositions` as a `Tier failed: inherited (D7)` entry rather
                    than as an open gap, since RU-63-02 investigated and stated the reason rather
                    than recording nothing.
19. **[from `62-COVERAGE.md:1837`]** **RU-63-02** — None of this unit's four editor features has any IntelliJ counterpart, confirmed by grep across `bbj-intellij/src/main/java/` (see the D7 cell above for the per-feature commands and their empty results): (1) **format document** — `BbjLanguageCodeStyleSettingsProvider.java` only customizes reformat *defaults* (REM-at-column-0); it never invokes a `BBjCFCli.jar`-equivalent tool or spawns any process, so the actual jar-backed reformat feature `document-formatter.ts` implements is absent. (2) **line-numbered/denumber detection** — no `isLineNumberedSource`/denumber-prompt equivalent exists anywhere in the plugin. (3) **tokenized-BBj detection** — no magic-byte/tokenized-file detection exists anywhere in the plugin; this is #65's ("support tokenized BBj files") IntelliJ-side remainder — the VS Code side (this unit) already implements the feature #65 requests; #65 itself stays open until IntelliJ gets an equivalent. (4) **decompile** — no `bbjlst`-invoking decompile action exists anywhere in the plugin. `RU-63-02`'s own sweep should confirm, for each of the four, whether the absence is a deliberate scope decision (IntelliJ may rely on external tooling for some of these) or an unaddressed feature gap, and record its own D7 finding if the latter — this unit's own coverage records the divergent VS Code-side evidence above but locates no finding inside `bbj-intellij/` (D-05).
resolution:        landed — `P63-D7-006` (`RU-63-02`, major-refactor) is explicitly recorded as
                    "disposed under referral #7": all four editor features (format document,
                    denumber, tokenized-BBj detection, decompile) re-verified live and confirmed
                    absent, promoted as one categorical finding.

**Phase 63 (1 referral):**

20. **[from `63-COVERAGE.md:1293`]** **RU-63-05** — `BbjRefreshJavaClassesAction.java:30`'s `BbjServerService.getInstance(project).restart()` call is the client-side half of referral #3's disposition (`P63-D7-003`, promoted above); `BbjServerService.restart()` itself (`ui/BbjServerService.java:206-211`, a `manager.stop(...)`/`manager.start(...)` pair via `LanguageServerManager`) is the mechanism side and lives in `RU-63-05`'s own file. `RU-63-05`'s sweep (plan `63-04`) should confirm whether LSP4IJ's client API offers any narrower request-response mechanism that could avoid the full stop/start cycle for this specific use, re-triaging the mechanism rather than re-reporting the client-side gap `P63-D7-003` already records.
resolution:        absorbed as an observation — `RU-63-05`'s own D7 Cross-IDE parity cell
                    (`63-COVERAGE.md`, §RU-63-05) states it explicitly: it "cross-referenc[es]
                    `RU-63-01`'s already-recorded disposition of Phase 62's referral #3
                    (`P63-D7-003`) by ID rather than allocating a second finding for the same
                    divergence," adding only that `BbjComposerServer.java` (`RU-63-04`'s file)
                    already demonstrates the `@JsonRequest` typed-request mechanism a narrower
                    `bbj/refreshJavaClasses` call would need, unused for this purpose — an
                    implementation choice, not an LSP4IJ platform limitation. No new finding
                    filed; the observation supports `P63-D7-003`'s existing disposition.

**Phase 64 (10 referrals):**

21. **[from `64-COVERAGE.md:881`]** **→ `RU-64-02` (plan `64-03`), D6.** `P64-D6-001`'s defect lives at `run-tests.ts:1,11-13`, but the file its fix edits — `bbj-vscode/package.json` — is `RU-64-02`'s for every dimension. Referred so `64-03`'s `### SEC-08 Dependency Triage` sees an undeclared tool dependency that no `npm audit` run over the declared tree can surface, and can state whether its own npm enumeration confirms the absence independently.
resolution:        PENDING-RESOLUTION
22. **[from `64-COVERAGE.md:882`]** **→ `RU-64-01` (plan `64-02`), D6/SEC-07.** Whether this repository's dependency automation could ever see the three vendored JARs. What `RU-64-03` establishes and hands over: the three artifacts are `.jar` files under `bbj-vscode/tools/formatter/`, none is declared in any manifest or lockfile, and `.github/dependabot.yml` declares the npm ecosystem for `/bbj-vscode`. The conclusion that follows is `RU-64-01`'s to draw against the file itself, which plan `64-02` owns; stated here as a boundary rather than pre-empted.
resolution:        PENDING-RESOLUTION
23. **[from `64-COVERAGE.md:883`]** **→ Phase 65, SEC-04 and SEC-05.** `P64-D1-002` is one leg of the EM token lifecycle (acquisition and validation via `em-login.bbj` and `em-validate-token.bbj`) and touches process spawning. Phase 65 owns the end-to-end synthesis across `BbjEMTokenStore` and both IDEs' launch paths; this unit supplies its leg with full evidence and does not attempt the lifecycle. Recorded as a referral rather than a ledger row, since Phase 65 is a cross-cutting audit and not a sweep unit.
resolution:        PENDING-RESOLUTION
24. **[from `64-COVERAGE.md:1744`]** **→ `RU-64-02` (plan `64-03`), D6 / SEC-08.** The Gradle half of `P64-D6-005`. What `RU-64-01` establishes and hands over: `.github/dependabot.yml:3-7` declares exactly one `updates:` entry, `package-ecosystem: "npm"` for `directory: "/bbj-vscode"`, with **no `gradle` entry**, so `bbj-intellij`'s dependency tree receives no automated update coverage at all; corroborated by five open `dependabot/npm_and_yarn/bbj-vscode/*` remote branches and none for gradle. Plan `64-03` establishes under D-10 that the same tree cannot be enumerated locally either, and the composition — unscanned by tooling *and* unenumerable by hand — is a materially stronger SEC-08 result than either half alone. That composition belongs in `RU-64-02`'s `### SEC-08 Dependency Triage`, which consolidates criterion 3's answer; it is stated here as a boundary rather than pre-empted. The `documentation/` and `github-actions` halves of the same finding stay here, because both surfaces are `RU-64-01`'s.
resolution:        PENDING-RESOLUTION
25. **[from `64-COVERAGE.md:1745`]** **→ `RU-64-02` (plan `64-03`), D2 / D5.** `bbj-vscode/package.json:654` declares `"vscode:prepublish": "shx cp ../LICENSE ./LICENSE && npm run esbuild-base -- --minify && npm run lint"`, and `vsce package` runs that script before packaging. Every packaging step in this unit therefore depends on ESLint passing — `build.yml:39`, `pr-vsix.yml:61`, `preview.yml:67` and `manual-release.yml:89` — including the two that immediately precede a marketplace publish, even though **no workflow in the repository runs `npm run lint` explicitly** and no workflow names lint as a gate. That is a workflow-visible fact, but the file it would be fixed in is `bbj-vscode/package.json`, which INVENTORY assigns to `RU-64-02` for every dimension, so no finding is allocated here (D-18). Referred so `64-03` can assess it against the manifest and against INVENTORY's recorded `npm run lint` baseline.
resolution:        PENDING-RESOLUTION
26. **[from `64-COVERAGE.md:1746`]** **→ `RU-64-03` (plan `64-01`, closed) — answering its referral, not opening one.** `64-01`'s `### Cross-unit referrals` entry 2 asks whether this repository's dependency automation could ever see the three vendored `tools/formatter/` JARs, and states plainly that the conclusion is `RU-64-01`'s to draw against the config file itself. **The answer is no.** `.github/dependabot.yml:4-5` declares only the npm ecosystem for `/bbj-vscode`; Dependabot's npm ecosystem derives its dependency set from `package.json` and `package-lock.json`, in neither of which any of the three JARs is declared (`RU-64-03` established that as `P64-D6-001`'s premise), and the config declares no `maven` or `gradle` ecosystem that could see a `.jar` by any other route. The three vendored binaries are therefore outside every ecosystem this repository's dependency automation declares, which is a different and stronger statement than "no advisory has been reported for them". `RU-64-03` is closed and its section is not edited; the answer is recorded here, in the unit that owns the file that settles it.
resolution:        PENDING-RESOLUTION
27. **[from `64-COVERAGE.md:1747`]** **→ Phase 69 (issue drafting), gated on ISSUE-01 and bounded by D-16.** `P64-D1-004` is rated `high` and its `evidence:` field is deliberately redacted under D-16's two-tier rule, which this plan renders rather than re-approves. Whoever drafts its issue must carry the same limits into the issue text — surface, problem class and impact only — and must not reconstruct the omitted detail from the surrounding `### SEC-07 Workflow Security Posture` cells, which describe the same steps at the same level of abstraction for a different purpose. `P64-D1-005` is `medium` and carries no such limit. Recorded as a referral rather than a ledger row, since Phase 69 is not a sweep unit and INVENTORY's routing table contains no Phase 64 row.
resolution:        PENDING-RESOLUTION
28. **[from `64-COVERAGE.md:3365`]** **To `RU-64-01` — two workflow comments contradicted by this unit's manifest.** `manual-release.yml:30` and `preview.yml:28` both read "vsce comes from bbj-vscode devDependencies (npm ci) — `npx vsce` resolves the pinned version". `bbj-vscode/package.json:670` declares `"@vscode/vsce": "^3.7.1"` under **`dependencies`**, not `devDependencies`. The manifest side is `P64-D6-007` and is recorded above; the two stale comments are located in `.github/`, which is `RU-64-01`'s surface and was swept by plan `64-02`, so they are referred rather than given a second finding here.
resolution:        PENDING-RESOLUTION
29. **[from `64-COVERAGE.md:3372`]** **To `RU-64-01` — the cross-IDE validation workflow runs no test.** `pr-validation.yml:30-31` runs `npm ci` and `npm run build` and never `npm run test`, so the workflow whose stated job is validating a pull request across both IDEs exercises none of the 50-file suite. Surfaced by this unit's D5 sweep, located in `RU-64-01`'s file, referred rather than claimed. Note the adjacency: `RU-64-01`'s `P64-D2-004` already records that one of the same workflow's five path filters can never match.
resolution:        PENDING-RESOLUTION
30. **[from `64-COVERAGE.md:3378`]** **To `RU-62-01` (closed, Phase 62) — the `brace-expansion` reachability question.** Establishing whether a workspace-controlled glob reaches the vulnerable copy inlined in `out/extension.cjs` requires reading `bbj-vscode/src/extension.ts`. That unit is closed and this phase does not reopen it; the question is attached to `P64-D6-008` and carried into Phase 69's issue draft rather than answered here or left unstated.
resolution:        PENDING-RESOLUTION

**Phase 65 (0 referrals):**

Phase 65's four `### Cross-references` blocks hold prose cross-references — its `P62-D1-002` CSP-nonce cross-reference is the example — rather than unit-to-unit handoffs, so they contribute zero enumerated referrals here; the zero is a shape difference, not a gap that went uncounted.

**Phase 66 (0 referrals):**

`66-COVERAGE.md` carries no `### Cross-unit referrals` block — its own sweep referred nothing onward.

