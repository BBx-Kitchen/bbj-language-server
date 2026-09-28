# Phase 119: Grammar — DECLARE File Paths & Shared Channel Opening - Context

**Gathered:** 2026-09-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Two grammar-only changes in `bbj-vscode/src/language/bbj.langium`, one regeneration, one
before/after parse comparison:

- **FIX-01 (#527):** the `BBjFilePath` terminal (`bbj.langium:1038`, `/::.*::/`) is greedy. On a
  line with two file-path-qualified references it matches through to the last `::` on the line, so
  `declare ::lib1::ClassA a; declare ::lib2::ClassB b` becomes one bad token. The terminal feeds
  `QualifiedBBjClassName` (`:945`) → `BBjTypeRef` (`:889`) → `QualifiedClass` (`:928`) and also the
  `use` statement (`:343`). No lexer code in `bbj-lexer.ts` touches this token.
- **REF-13 (#602):** `WithChannelAndOptionsAndOutputItems` (`:574`) and
  `WithChannelAndOptionsAndInputItems` (`:675`) both open with
  `'(' channelno=Expression? Options?`. That opening becomes one shared rule.

Every other parse outcome stays unchanged. No new syntax is accepted, and nothing currently
accepted is rejected, except the fix for the #527 misparse itself.

</domain>

<decisions>
## Implementation Decisions

### Shared channel opening (REF-13, #602)
- **D-01:** Extract **only the opening** into a new fragment, e.g.
  `fragment ChannelAndOptions: '(' channelno=Expression? Options?`, and call it from both
  `WithChannelAndOptionsAndOutputItems` and `WithChannelAndOptionsAndInputItems`. The RPAREN/items
  tails stay in each variant. The generated AST types stay exactly as they are
  (`items: OutputItem[]` on the print side, `InputItem[]` on the read side, same `channelno` and
  `options` properties). The regenerated `generated/ast.ts` shows no type change, and the plan
  checks that.
- **D-02:** Do **not** use one guard-parameterized fragment (`<Output>`/`<!Output>`) for both
  variants, and do not share the bare-items closing alternative. Sharing the item-typed tail
  needs guards and risks widening `items` to `OutputItem | InputItem` on both statement types.
- **D-03:** The Output-only alternatives stay on Output only: `RPAREN_NO_NL ENDLINE_PRINT_COMMA`
  and the bare `ENDLINE_PRINT_COMMA`. A grammar comment next to the fragments explains why: PRINT
  and WRITE take a trailing comma that suppresses the line end, and READ/INPUT/EXTRACT/FIND have no
  such form. This comment is the "documented rationale" half of #602's acceptance criteria. Input
  does not gain these alternatives, because that would change parse outcomes (criterion 3).

### File-path token (FIX-01, #527)
- **D-04:** Replace the terminal with the non-greedy `/::.*?::/`. It stops at the nearest closing
  `::` and still allows single colons inside the path, such as a Windows drive letter. A path can't
  contain `::`, since `::` ends the token. The negated-class form proposed in #527 is not used.
- **D-05:** **Fix the regex even if the base-commit test already passes.** The roadmap says to
  start with a test on the phase base. If `declare ::lib1::ClassA a; declare ::lib2::ClassB b`
  turns out not to misparse there, keep that test as the regression file, but still make the
  terminal non-greedy, because the greedy `.*` is a latent bug for other one-line shapes. Record
  the base result (pass or fail) in the SUMMARY.
- **D-06:** Regression file under `bbj-vscode/test/test-data/`, which `example-files.test.ts`
  requires to parse with zero lexer/parser errors. It covers:
  - the #527 line: `declare ::lib1::ClassA a; declare ::lib2::ClassB b`
  - two `use` statements on one line: `use ::a.bbj::A; use ::b.bbj::B`
  - single-colon paths that must stay one token, e.g. `declare ::C:\lib\x.bbj::ClassA a`
  - other `QualifiedClass` sites on one line with two different file paths, e.g.
    `declare ::a::A x; x! = new ::b::B()`, and a CLASS whose EXTENDS and IMPLEMENTS use different
    file paths
- **D-07:** A **targeted vitest** also asserts what #527's acceptance criteria ask for. The #527
  line produces two `VariableDecl`s, each `BBjTypeRef` carries its own file-path text
  (`::lib1::ClassA` and `::lib2::ClassB`), and neither has a validation error.
- **D-08:** The targeted test supplies **real lib files**: lib1/lib2 `.bbj` documents that define
  `ClassA`/`ClassB` in the test workspace, so both references resolve and "no validation errors" is
  an honest assertion, with no linking-error filtering. Parsing uses `parseHelper`/the in-memory
  pattern, not `DocumentBuilder.build`, which triggers CPL and interop on :5008 (see memory
  "Test parsing: parseHelper not DocumentBuilder.build"). Follow how existing file-path tests (for
  example `test/file-path-completion.test.ts`, the `bbj-scope.ts` `getBBjClassesFromFile` path
  resolution) set up a multi-document workspace.

### Evidence & closing
- **D-09:** "No changed parse outcome" (criterion 3) means **per-file error sets**. For every
  `.bbj` file under `examples/` and `bbj-vscode/test/test-data/`, compare the lexer and parser
  error messages and positions on the phase base against the phase head. Any per-file difference
  must be explained. The only expected differences are the files that exercise the #527 shape.
  Run the private conformance corpus the same way, comparing file sets, not totals: snapshot
  `details.json` to `/home/coder/repos/bbj-corpus/conformance/snapshots/` before each full run
  (never under `conformance/work/`, which the run deletes).
- **D-10:** The probe is a throwaway script, either in the scratchpad or as a temporary
  `bbj-vscode/test/` probe that is deleted afterwards. Nothing new is committed for it. The
  file-set comparison and the corpus result go in the plan SUMMARY and the phase VERIFICATION.
- **D-11:** Both issues close through `Closes #527` / `Closes #602` lines in the milestone PR,
  because milestone PR table rows alone don't close issues. The closing note for #602 cites the
  shared opening fragment (D-01) and the documented asymmetry (D-03).

### Claude's Discretion
- The name of the new fragment and where it sits in `bbj.langium`.
- File names for the regression `.bbj` and the targeted test, the exact single-colon path
  examples, and the plan split (FIX-01 and REF-13 can share one `langium:generate` and one probe
  run, as the roadmap grouping intends).
- Whether the probe runs through vitest with `--disable-console-intercept` or through a node/tsx
  script.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` §"Phase 119: Grammar — DECLARE File Paths & Shared Channel Opening"
  gives the goal, 3 success criteria and the planning notes (test on base first, lexer
  lookbehind anchoring, Node 22 for `langium:generate`).
- `.planning/REQUIREMENTS.md` defines FIX-01 and REF-13.
- GitHub issues #527 (greedy `BBjFilePath`) and #602 (duplicated fragment opening) on
  BBx-Kitchen/bbj-language-server hold the acceptance criteria quoted in the decisions above.

### Grammar and consumers
- `bbj-vscode/src/language/bbj.langium` has `BBjFilePath` (`:1038`), `QualifiedBBjClassName`
  (`:945`), `BBjTypeRef` (`:889`), `QualifiedClass` (`:928`), `use` (`:343`), `VariableDecl`
  (`:348`), `WithChannelAndOptionsAndOutputItems` (`:574`) and
  `WithChannelAndOptionsAndInputItems` (`:675`).
- `bbj-vscode/src/language/bbj-scope.ts` has `BBjPathPattern` (`:61`, `/^::(.*)::$/`), which must
  still strip the token correctly, and `getBBjClassesFromFile` (`:330`).
- `bbj-vscode/src/language/bbj-document-builder.ts:1103` uses `BBjPathPattern` on `use` paths.
- `bbj-vscode/src/language/generated/` is regenerated only, never edited by hand.

### Tests
- `bbj-vscode/test/example-files.test.ts` runs the zero-error check over every
  `test/test-data/*.bbj`.
- `bbj-vscode/test/file-path-completion.test.ts` is an existing file-path test, a pattern
  reference.

No external specs. Requirements are fully captured in the decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `parseHelper` / `validationHelper` from `langium/test` together with `createBBjServices` or
  `createBBjTestServices` form the standard parse/validate test setup.
- `test/test-helper.ts` provides `initializeWorkspace()`, `findFirst()` and `findByIndex()`.

### Established Patterns
- `npm run build` does not regenerate the grammar. Run `npm run langium:generate` on Node 22,
  because Node 24 breaks it.
- The Chevrotain ambiguity warnings from generation already exist and are harmless.
- Whole-suite gate: `numFailedTests: 0` plus targeted-file runs. Run vitest with cwd `bbj-vscode`.
- A v4.5 lesson: an all-green suite can hide token-level regressions. Only a before/after parse
  probe found the `TABLE_DATA` one. This phase changes no lookbehind, but the D-09 probe is the
  guard.

### Integration Points
- The `BBjFilePath` token text flows through `BBjPathPattern` into file resolution
  (`bbj-scope.ts`, `bbj-document-builder.ts`). The non-greedy token must still produce
  `::path::` text that the anchored pattern accepts.

</code_context>

<specifics>
## Specific Ideas

- The #527 reproduction line is verbatim `declare ::lib1::ClassA a; declare ::lib2::ClassB b`.
- The asymmetry comment (D-03) states the semantic reason, the trailing comma that suppresses the
  line end on output, rather than only "kept for compatibility".

</specifics>

<deferred>
## Deferred Ideas

None. The discussion stayed within the phase scope.

### Reviewed Todos (not folded)
- `2026-09-26-intellij-interop-initoptions-key-mismatch.md`: IntelliJ interop settings key
  mismatch. Keyword match only, unrelated to the grammar.
- `2026-09-26-signature-help-and-snippet-peer-name-escaping.md`: escaping of peer-supplied Java
  names. Keyword match only, a security/LSP concern and not grammar.
- `2026-09-27-windows-intellij-node-download-progress-check.md`: manual Windows re-check.
  Keyword match only.

</deferred>

---

*Phase: 119-grammar-declare-file-paths-shared-channel-opening*
*Context gathered: 2026-09-28*
