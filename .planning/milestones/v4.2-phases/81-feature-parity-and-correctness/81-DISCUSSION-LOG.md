# Phase 81: Feature Parity and Correctness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-05
**Phase:** 81-feature-parity-and-correctness
**Areas discussed:** Compile semantics and options, Compile result surfacing, String and comment lexing scope, REM toggle mechanics

---

## Pending todos matched by keyword

| Option | Description | Selected |
|--------|-------------|----------|
| Neither | Both unrelated to #571/#568/#540; stay as reviewed-but-deferred | ✓ |
| EM Config "--" sentinel fix | Run-action bug in getConfigPathArg / Commands.cjs | |
| Live-interop getAllClassNames test drift | Vitest drift against upgraded :5008 backend | |

**User's choice:** Neither

---

## Compile semantics and options

| Option | Description | Selected |
|--------|-------------|----------|
| Real compile, VS Code parity | bbj/compile runs bbjcpl without -N, honouring options; BBjCPLService gains an options-aware entry point beside the -N path | ✓ |
| Validate only (-N) | Reuse BBjCPLService.compile as-is; nothing written | |
| Validate by default, real compile via flag | Request carries validateOnly; IntelliJ sends true until options exist | |

| Option | Description | Selected |
|--------|-------------|----------|
| LS reads its bbj.compiler.* config | Move option table / builder / validator into the LS; one table for both IDEs | ✓ |
| Request params carry explicit options list | {uri, options[]}; IntelliJ passes empty list | |
| No options at all | Fixed argv | |

| Option | Description | Selected |
|--------|-------------|----------|
| Leave VS Code untouched | Milestone scope is IntelliJ; note migration as deferred | ✓ |
| Migrate VS Code now | Both IDEs call bbj/compile | |

| Option | Description | Selected |
|--------|-------------|----------|
| Always save the current document first | Compile reflects what the user sees | ✓ |
| Honor autoSaveBeforeRun | Reuse run-action setting | |
| Never save | Compile what is on disk | |

| Option | Description | Selected |
|--------|-------------|----------|
| No guard, same as VS Code | Parity; no confirmation | |
| Confirm once before an in-place compile | Yes/no dialog when options would replace the source | |
| Refuse in-place; require an output directory | Error unless -d or -N in effect | ✓ |

**User's choice:** Real compile; LS-side option config; VS Code untouched; always save first; refuse in-place.
**Notes:** Refusing in-place conflicted with IntelliJ having no compiler settings; reconciled in the next area.

---

## Compile result surfacing

| Option | Description | Selected |
|--------|-------------|----------|
| One IntelliJ setting: compile output directory | Single field in BbjSettings, forwarded as bbj.compiler.output.directory | ✓ |
| LS falls back to validate-only (-N) | No output dir → -N with "validated only" message | |
| LS defaults to a fixed output location | e.g. compiled/ beside the source | |

| Option | Description | Selected |
|--------|-------------|----------|
| Balloon notification, VS Code style | Info on success, error with bbjcpl messages on failure; also logged to LS console | ✓ |
| Balloon plus jump-to-error | Clickable diagnostics | |
| Console tool window only | No balloons | |

| Option | Description | Selected |
|--------|-------------|----------|
| Return only; editor squiggles stay with background path | No double reporting | ✓ |
| Return and publish | Merge into published diagnostics | |

| Option | Description | Selected |
|--------|-------------|----------|
| Background task with progress, error balloon on failure | Task.Backgroundable off EDT; cause-naming balloon with Open Settings | ✓ |
| Silent run, balloon only at the end | No progress indicator | |

| Option | Description | Selected |
|--------|-------------|----------|
| In the language server | bbj/compile rejects with structured error; one rule for every client | ✓ |
| In the IntelliJ action | Action checks its own setting before sending | |

**User's choice:** One output-directory setting; VS Code-style balloons; return-only diagnostics; background task with progress; guard in the LS.

---

## String and comment lexing scope

| Option | Description | Selected |
|--------|-------------|----------|
| STRING and REM COMMENT | Double-quoted strings with "" escapes plus word-bounded rem-to-EOL comments; COMMENT registered in getCommentTokens() | ✓ |
| STRING only | Literal minimum for #568 | |
| STRING, COMMENT and MNEMONIC | Also 'quoted' mnemonics (no bracket impact) | |

| Option | Description | Selected |
|--------|-------------|----------|
| String runs to end of line | BBj strings cannot span lines | ✓ |
| String runs to end of file | Classic lexer behaviour | |

**User's choice:** STRING and COMMENT; unterminated string ends at end of line.

---

## REM toggle mechanics

| Option | Description | Selected |
|--------|-------------|----------|
| SelfManagingCommenter over a plain-Java seam | Plugin decides commented-ness and stripping; rules in a JUnit-tested seam | ✓ |
| Lexer COMMENT token only | Keep plain Commenter; platform still compares literal prefix | |

| Option | Description | Selected |
|--------|-------------|----------|
| REM | Uppercase, as today and as VS Code inserts | ✓ |
| rem | Lowercase | |
| Match the file's dominant style | Follow majority case | |

| Option | Description | Selected |
|--------|-------------|----------|
| Word-bounded rem; strip prefix plus one space | remark/rem15/rem$ are code; "REM foo" round-trips to "foo" | ✓ |
| Word-bounded rem; strip prefix only | Leaves following whitespace | |
| Any line starting with rem, no boundary check | Would corrupt "remark = 1" | |

**User's choice:** SelfManagingCommenter + seam; insert REM; word-bounded recognition, strip prefix plus one space.

---

## Wrap-up

| Option | Description | Selected |
|--------|-------------|----------|
| I'm ready for context | Write CONTEXT.md | ✓ |
| Explore more gray areas | Request shape, shared option module, timeout, plan split | |

## Claude's Discretion

- bbj/compile DTO field names, explicit-compile timeout, interaction with the abort-on-resave map
- Location/name of the re-homed compiler-option module; whether CompilerOptions.ts imports it now
- Settings-dialog placement of the output-directory field
- Seam class names, test file placement, source-guard scoping, plan split

## Deferred Ideas

- Migrate VS Code's bbj.compile to the shared bbj/compile request
- Jump-to-error links in the compile failure balloon
- Full compiler-option UI in IntelliJ (PAR-V2-04)
- MNEMONIC token in the IntelliJ lexer
- Reviewed, not folded: EM Config "--" sentinel todo; live-interop getAllClassNames test-drift todo
