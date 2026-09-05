---
status: diagnosed
trigger: "compile-error-response-message-could-not-be-parsed: In the IntelliJ plugin, Tools > Compile BBj File works for a valid file, but a file with a syntax error produces `Failed to compile xxx.bbj org.eclipse.lsp4j.jsonrpc.MessageIssueException: Message could not be parsed.` instead of the expected error balloon listing `line:col message`."
created: 2026-09-05T00:00:00Z
updated: 2026-09-05T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — `parseBbjcplOutput` (bbj-cpl-parser.ts) sets every diagnostic's `range.end.character` to `Number.MAX_SAFE_INTEGER` (9007199254740991). LSP4J's `org.eclipse.lsp4j.Position.character` is a Java primitive `int` (max 2147483647). Gson — which LSP4J's `MessageJsonHandler` uses internally to deserialize JSON-RPC response bodies against the declared `CompletableFuture<CompileResult>` type — cannot fit 9007199254740991 into an `int` field (`JsonReader.nextInt()` throws `NumberFormatException: Expected an int but was 9007199254740991 ...`, wrapped by Gson as a parse failure). LSP4J catches this during message parsing and raises `MessageIssueException: Message could not be parsed.` before `BbjCompileAction`/`CompileResultPresenter` ever sees the response. This only happens when `diagnostics` is non-empty, i.e. only on the `compile-errors` path — matching the reported symptom exactly (success path always sends `diagnostics: []`, so no `Position` object is ever serialized on that path).
test: Read bbj-cpl-parser.ts (source of the value), javap'd org.eclipse.lsp4j.Position (0.21.1, the version bundled by LSP4IJ 0.19.0 and used by bbj-intellij), confirmed `character`/`line` are `int`-typed getters/setters, and read CompileResultPresenter.renderOne() to confirm the end position is never even used by the rendering code that would eventually run — the payload fails during deserialization, before any application logic executes.
expecting: n/a — root cause confirmed, mode is find_root_cause_only.
next_action: none — return ROOT CAUSE FOUND to caller for a fix plan.

## Symptoms

expected: A syntax error shows an error balloon whose body lists the compiler's errors as `line:col message`, with the same text in the language-server console.
actual: User reported verbatim: "it works, but the error message when a syntax error is in the source file is not useful: Failed to compile xxx.bbj org.eclipse.lsp4j.jsonrpc.MessageIssueException: Message could not be parsed."
errors: org.eclipse.lsp4j.jsonrpc.MessageIssueException: Message could not be parsed.
reproduction: Test 4 in .planning/phases/81-feature-parity-and-correctness/81-UAT.md — configure BBj home + compile output directory, run Tools > Compile BBj File on a .bbj file with a syntax error. Happy path (valid file) works.
started: Discovered during UAT of phase 81 on 2026-09-05, plugin built from HEAD (commits feat(81-04) f27bbe0e and feat(81-05) a5a423bb added this feature).

## Eliminated

- hypothesis: Field-name/shape mismatch between TS `CompileResult` and Java `CompileModels.CompileResult` (e.g. `errors` vs `diagnostics`, wrong DTO field names).
  evidence: Field-for-field comparison of compile-command.ts's `CompileResult` (success, diagnostics, reason, message, file) against CompileModels.java's `CompileResult` (same five fields, same names/order) shows an exact match. `BbjComposerServer.compile()` declares `CompletableFuture<CompileResult>` (not `Object` or a raw type), so LSP4J deserializes against the correct declared generic type.
  timestamp: 2026-09-05
- hypothesis: `reason` enum value unrecognized by the Java side causing a parse/dispatch failure.
  evidence: `CompileResultPresenter.present()` has an explicit `default` branch (and a `reason == null` branch) that renders a fallback title rather than throwing — an unrecognized reason string cannot itself abort JSON-RPC message parsing, since `reason` is a plain `String` field on both sides, always a valid JSON string.
  timestamp: 2026-09-05
- hypothesis: The failure path rejects the promise with a `ResponseError` carrying a non-standard `data` payload that LSP4J can't parse as a JSON-RPC error response.
  evidence: `createCompileHandler` in compile-command.ts never throws or rejects on any of the nine failure reasons — every branch (including `compile-errors`) returns a normally resolved `CompileResult` object via a plain `return { ... }`, which `connection.onRequest`/LSP4J then serializes as a normal JSON-RPC *result*, not a JSON-RPC *error*. The failure is a value-shape problem in the result payload, not an error-response problem.
  timestamp: 2026-09-05

## Evidence

- timestamp: 2026-09-05
  checked: bbj-vscode/src/language/bbj-cpl-parser.ts lines 45-61 (parseBbjcplOutput)
  found: |
    Every parsed diagnostic's range is built as:
      const range: Range = {
          start: { line: physicalLine, character: 0 },
          end:   { line: physicalLine, character: Number.MAX_SAFE_INTEGER },
      };
    `Number.MAX_SAFE_INTEGER` = 9007199254740991. This value is used verbatim as the JSON-RPC wire value for `range.end.character` in every diagnostic bbjcpl reports (the whole-line-highlight convention — bbjcpl doesn't give column info, so the range spans line-start to "end of line" using MAX_SAFE_INTEGER as a stand-in for "very large").
  implication: This numeric literal is only emitted when there is at least one diagnostic — i.e. only on the `compile-errors` result (`reason: 'compile-errors', diagnostics: run.diagnostics`) in compile-command.ts. The success path always returns `diagnostics: []`, so it never serializes a `Position` object and therefore never hits this value.
- timestamp: 2026-09-05
  checked: `javap` output for org.eclipse.lsp4j.Position and org.eclipse.lsp4j.Diagnostic from org.eclipse.lsp4j-0.21.1.jar (the version LSP4IJ 0.19.0 bundles; same version resolved into bbj-intellij's build/idea-sandbox)
  found: |
    public class org.eclipse.lsp4j.Position {
      public int getLine();
      public void setLine(int);
      public int getCharacter();
      public void setCharacter(int);
      ...
    }
    `Diagnostic.getRange()` returns `org.eclipse.lsp4j.Range` (start/end `Position`), confirming CompileModels.CompileResult's reuse of `org.eclipse.lsp4j.Diagnostic` verbatim (per 81-05-SUMMARY.md's key-decisions) pulls this `int`-typed `Position.character` field into the deserialization path.
  implication: `9007199254740991` cannot be represented in a Java `int` (max `2147483647`, ~23x smaller). Gson (which LSP4J's `MessageJsonHandler` uses internally, via `GsonBuilder`+`TypeAdapterFactory` reflection, to deserialize the JSON-RPC response body into the method's declared return type) hits `TypeAdapters.INTEGER`'s `read()`, which calls `JsonReader.nextInt()`. That method's own implementation, when the value doesn't losslessly cast to `int`, throws `NumberFormatException: Expected an int but was 9007199254740991 at path $.result.diagnostics[0].range.end.character`. Gson surfaces this as a parse failure; LSP4J's message-parsing layer (`MessageJsonHandler.parseMessage`) catches it and LSP4J raises `MessageIssueException: Message could not be parsed.` — exactly the exception class and message text the user reported — before the response ever reaches `BbjCompileAction`'s `CompletableFuture` completion handler.
- timestamp: 2026-09-05
  checked: bbj-intellij/src/main/java/com/basis/bbj/intellij/compile/CompileResultPresenter.java `renderOne()` (lines 149-157)
  found: `renderOne` reads only `range.getStart().getLine()` and `range.getStart().getCharacter()` to build the `line:col message` string. `range.getEnd()` is never read anywhere in CompileResultPresenter.
  implication: The oversized `end.character` value is completely unused by any application logic on the Java side — it exists purely as a "highlight to end of line" convention useful to LSP editor clients that read `range.end` for squiggle length, but is dead weight for this presenter's `start`-only rendering. This makes it a pure protocol defect: a field that breaks deserialization for a value nothing downstream even consumes.
- timestamp: 2026-09-05
  checked: bbj-vscode/test/compile-request.test.ts `parsedCompilerErrorsComeBackAsDiagnosticsNotAsRawText` (lines 158-172) — the only test covering the `compile-errors` result shape
  found: The test asserts `result.diagnostics).toHaveLength(1)` and `result.diagnostics[0].source).toBe('BBjCPL')` only. It never inspects `range`, `range.end`, or `range.end.character`, and never round-trips the result through `JSON.stringify`/a Gson-equivalent int-range check.
  implication: No existing test (TS or Java) exercises the actual cross-language JSON contract for the `compile-errors` diagnostics payload's numeric ranges — the CompileResultPresenterTest (Java) tests use hand-built `Diagnostic`/`Range`/`Position` Java objects directly (never through JSON deserialization), and the TS test never serializes to JSON. The gap between "TS unit tests pass" and "Java unit tests pass" while the live JSON-RPC round trip fails is explained entirely by this untested boundary.
- timestamp: 2026-09-05
  checked: bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java lines 59-66
  found: |
    @JsonRequest("bbj/compile")
    CompletableFuture<CompileResult> compile(CompileParams params);
  implication: The declared generic type is correct and specific (not `Object`/raw), ruling out a "wrong declared type" hypothesis — LSP4J is deserializing against exactly the right DTO graph; the failure is purely a value-range violation within that (correctly-typed) graph.

## Resolution

root_cause: "bbj-cpl-parser.ts's parseBbjcplOutput() sets every syntax-error diagnostic's range.end.character to Number.MAX_SAFE_INTEGER (9007199254740991) as an 'end of line' stand-in. org.eclipse.lsp4j.Position.character is a Java primitive int (max 2147483647). When the IntelliJ plugin's bbj/compile response contains at least one diagnostic (the compile-errors reason — exactly the syntax-error case the user hit), LSP4J's Gson-based MessageJsonHandler cannot deserialize that oversized numeric literal into the int field, throws a NumberFormatException/JsonSyntaxException internally, and LSP4J surfaces this as MessageIssueException: Message could not be parsed — before CompileResultPresenter (which only reads range.start, never range.end) ever runs. The success path never serializes a Position at all (diagnostics: []), which is why the happy path works and only the syntax-error path breaks."
fix: ""
verification: ""
files_changed: []
