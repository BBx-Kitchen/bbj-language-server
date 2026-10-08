---
phase: 261008-9ur-default-bbj-working-directory-to-the-pro
plan: 01
subsystem: language-server, run-commands
tags: [use-resolution, run-call, working-directory, vscode, intellij]
requires: []
provides:
  - program-path-resolution.ts (programWorkingDirectory, programPathCandidates, programPathBaseDirectories)
  - runWorkingDir (VS Code) and RunWorkingDirectory.forFile (IntelliJ)
affects: [bbj-scope, bbj-validator, bbj-document-builder, run-call-target, bbj-completion-provider, Commands.cjs, BbjRunGuiAction, BbjRunActionBase]
tech-stack:
  added: []
  patterns: ["one shared candidate builder for relative program paths: working directory, then PREFIX"]
key-files:
  created:
    - bbj-vscode/src/language/program-path-resolution.ts
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/RunWorkingDirectory.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/RunWorkingDirectoryTest.java
  modified:
    - bbj-vscode/src/language/bbj-scope.ts
    - bbj-vscode/src/language/bbj-validator.ts
    - bbj-vscode/src/language/bbj-document-builder.ts
    - bbj-vscode/src/language/run-call-target.ts
    - bbj-vscode/src/language/bbj-completion-provider.ts
    - bbj-vscode/src/language/bbj-ws-manager.ts
    - bbj-vscode/src/Commands/process-args.ts
    - bbj-vscode/src/Commands/Commands.cjs
    - bbj-vscode/test/use-project-root.test.ts
    - bbj-vscode/test/run-call-file-resolution.test.ts
    - bbj-vscode/test/run-call-navigation.test.ts
    - bbj-vscode/test/file-path-completion.test.ts
    - bbj-vscode/test/commands-cjs-harness.ts
    - bbj-vscode/test/commands-cjs-execution.test.ts
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunGuiAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
    - documentation/docs/vscode/commands.md
    - documentation/docs/intellij/commands.md
decisions:
  - "Working directory of a document = deepest workspace root containing it (segment match); own directory otherwise"
  - "RUN/CALL PREFIX candidates now go through containedPrefixCandidates like USE"
  - "addImportedBBjDocuments stays PREFIX-only (comment added)"
  - "BUI/DWC pass the program's absolute path; EM app name and bbj.web.apps lookup keep the base name"
metrics:
  tasks: 3
  commits: 3
  duration: single session
  completed: 2026-10-08
status: complete
actuals:
  tokens: 14500
  tasks: 3
  commits: 3
---

# Quick Task 261008-9ur: Default BBj working directory to the project root

The language server and both IDEs' run commands now agree on the BBj working directory. A relative `use ::path::` or RUN/CALL target is looked up in the working directory first, then in each PREFIX directory, and the program's own directory is no longer searched. VS Code and IntelliJ GUI, BUI and DWC runs all start BBj in the project root.

## Commits

| Task | Commit | Summary |
| ---- | ------ | ------- |
| 1 | b8652abe | Shared helper `program-path-resolution.ts`; USE scope, USE validator and USE revalidation switched to it. |
| 2 | f29be4fa | RUN/CALL resolution (validator, hover, definition) and file-path completion switched to it. |
| 3 | 8c56311d | VS Code `runWorkingDir` + `Commands.cjs`, IntelliJ `RunWorkingDirectory`, both docs. |

## Behaviour

- Workspace root R, `R/SomeClass.bbj`, `R/subdir/OtherClass.bbj`, `R/subdir/prog.bbj`: `use ::SomeClass.bbj::` links, `use ::OtherClass.bbj::` is flagged (still flagged after the full build, so the revalidation pass keeps it), and `use ::subdir/OtherClass.bbj::` links.
- A document under no workspace root, or in a server with no roots, still resolves against its own directory.
- Hover and go-to-definition on `RUN "helper.bbj"` next to the caller, under a root, no longer link and hover as unresolved. `CALL "app/helper.bbj::setUp"` links.
- Completion after `use ::` or `RUN "` lists the working directory (the workspace root containing the file) and the PREFIX directories, not the file's own directory.
- VS Code `run`, `runBUI`, `runDWC` use the workspace folder containing the file as `-WD` / working-dir argument. BUI/DWC pass the absolute program path; the runner's own `-WD` (tools directory) is unchanged.
- IntelliJ GUI, BUI and DWC use the project base path when the file lies inside it, otherwise the file's directory.

## Deviations from Plan

None. The plan was executed as written.

Two small judgement calls inside the plan's discretion:
- In `Commands.cjs` the web-run failure message keeps showing the file's base name (via `baseName`) rather than the now-absolute `programme`, so the message text does not change.
- Task 3's verify listed `gradlew -p …`; I ran `./gradlew test` from `bbj-intellij/`, which is the same build.

## Verification

- Targeted vitest files per task: all passed (Task 1: 114 tests, Task 2: 139 tests, Task 3: 146 passed + 1 skipped).
- `npm run build`, `npm run lint` (max-warnings 0), `npm run typecheck:test`: clean.
- `bbj-intellij ./gradlew test`: BUILD SUCCESSFUL, `RunWorkingDirectoryTest` 7 tests, 0 failures; the source guards pass.
- Whole suite (`--maxWorkers=2`): numFailedTests 0 (4665 passed, 30 pending). The only failing file is the known-baseline `test/functional/installed-extension-e2e.test.ts` load failure.
- Register grep on added lines in `bbj-vscode/src`, `bbj-vscode/test`, `bbj-intellij/src`: no planning IDs.
- `program-path-resolution` is imported in all five language-server files.

## Known Stubs

None.

## Threat Flags

None. No new endpoints, auth paths or schema. RUN/CALL PREFIX candidates now pass the same containment check as USE (mitigation T-9ur-01 applied); the working directory and program path remain single argv elements (T-9ur-02).

## Self-Check: PASSED

- Created files exist: program-path-resolution.ts, RunWorkingDirectory.java, RunWorkingDirectoryTest.java.
- Commits b8652abe, f29be4fa, 8c56311d are present in `git log`.
