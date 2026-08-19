# Phase 68 Easy-Fix Findings

## Derivation

Records are selected by the leading token of each finding's `disposition:` field — `easy-fix` —
across the six closed COVERAGE files (`.planning/reviews/61-COVERAGE.md` … `66-COVERAGE.md`),
produced mechanically by `derive-review-docs.mjs` (run as `node derive-review-docs.mjs emit-easy`
from `.planning/phases/68-deliverable-documents/` — see that script for the exact selection and
ordering logic). Records are ordered by originating phase then finding ID (D-10). The script emits
the mechanical scaffold — `row:`, `finding_id:`, `unit:`, `location:`, `dimension:`,
`severity:`, `effort:` and the full `failure_scenario:` — while judgment content is authored
directly in this document, so re-running `emit-easy` regenerates the scaffold only and is not a
safe overwrite of this assembled file once that content has been added.

## Rows

```
row:               1
finding_id:        P61-D2-001
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:91-108
dimension:         D2
severity:          medium
effort:            4
failure_scenario:  (a) Two Java-class lookups fire in the same tick while disconnected — each opens its own socket, one is leaked. (b) The peer is killed mid-session — every subsequent resolveClassByName call reuses the dead connection object and its requests hang or reject with no recovery until clearCache() is called explicitly.
```

```
row:               2
finding_id:        P61-D2-002
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:176-181
dimension:         D2
severity:          medium
effort:            2
failure_scenario:  A slow peer answers a getClassInfo request just after the 10s timeout has already rejected the race; the late-settling sendRequest(...) promise then rejects with no handler, surfacing as an unhandledRejection at the process level.
```

```
row:               3
finding_id:        P61-D2-003
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:576-585
dimension:         D2
severity:          medium
effort:            2
failure_scenario:  A malformed or malicious getClassInfo response with a missing/null fields or methods array throws an uncaught TypeError: Cannot read properties of undefined synchronously inside resolveClass(), propagating out of the resolution chain uncaught.
```

```
row:               4
finding_id:        P61-D2-004
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:761-790
dimension:         D2
severity:          low
effort:            2
failure_scenario:  The classpath is reloaded via main.ts's didChangeConfiguration path (clearCache() then loadClasspath()); the stale completeClassIndex built for the previous classpath survives and continues to answer resolveClassCandidatesBySimpleName/findClassCandidatesByPrefix auto-import suggestions with FQNs from the old classpath instead of the new one.
```

```
row:               5
finding_id:        P61-D2-005
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj-value-converter.ts:14
dimension:         D2
severity:          medium
effort:            2
failure_scenario:  A BBj source string literal containing a doubled-quote escape (e.g. `"He said ""hi"""`) parses without error, but StringLiteral.value retains the literal `""` sequence instead of the single embedded `"` the language's own escape convention specifies, so every consumer of `.value` — including RU-61-03's bbj-validator.ts:419 file-path resolution (`let cleanPath = fileid.value`), which would mis-resolve a path containing an escaped quote — sees a semantically wrong string.
```

```
row:               6
finding_id:        P61-D2-006
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj-lexer.ts:11-34
dimension:         D2
severity:          medium
effort:            4
failure_scenario:  A .bbj file containing mixed line endings (at least one \r\n line and at least one bare \n line — plausible when a repository lacks .gitattributes EOL normalization, or a file is edited across Windows/Unix tooling) is retokenized by BbjLexer.tokenize; prepareLineSplitter's uniform-EOL normalization changes the transformed text's length relative to the original document text. Every token offset computed against the transformed text from the first drifted line onward no longer matches the corresponding offset in the original document text that the LSP layer maps positions against, so diagnostics, hover, completion and go-to-definition ranges are silently shifted for the remainder of the file.
```

```
row:               7
finding_id:        P61-D2-008
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj-token-builder.ts:67-71
dimension:         D2
severity:          low
effort:            2
failure_scenario:  If any of the 14 hardcoded terminal names passed to spliceToken becomes absent from `tokens` — e.g. a future grammar edit renames or removes RPAREN_NL — findIndex returns -1 and `tokens.splice(-1, 1)` silently removes and re-splices the unrelated LAST token in the vocabulary array instead of raising an error, corrupting Chevrotain's token-priority ordering with no diagnostic message; the failure would surface later as a confusing, hard-to-trace lexer misbehavior rather than at the point of the misconfiguration.
```

```
row:               8
finding_id:        P61-D2-009
unit:              RU-61-03
location:          bbj-vscode/src/language/bbj-cpl-parser.ts:40-46
dimension:         D2
severity:          low
effort:            2
failure_scenario:  bbjcpl emits (or a future compiler version emits, or a malformed/truncated compiler invocation produces) an error line reporting physical line 0, or a line number exceeding the LSP client's document's actual line count; parseBbjcplOutput returns a Diagnostic with a negative range.start.line, outside the LSP Position contract (zero-based, non-negative), which can be rejected, clamped unpredictably, or cause a client-side rendering exception instead of surfacing the intended compiler error.
```

```
row:               9
finding_id:        P61-D2-010
unit:              RU-61-03
location:          bbj-vscode/src/language/validations/check-variable-scoping.ts:205-220
dimension:         D2
severity:          medium
effort:            4
failure_scenario:  Any BBj program containing a class/method whose body assigns and then reads a local variable, where an unrelated Program-scope (or enclosing-method-scope) variable happens to share the same case-insensitive name and is assigned later in document order, produces a spurious "used before assignment" Hint on the method-local variable's perfectly valid read — a false positive traceable to the outer scope's traversal reaching into a nested scope it was documented not to enter. The same un-pruned traversal is also a redundant full-subtree AST walk (secondary D3): every Program-level validation pass additionally re-walks the body of every nested MethodDecl that the MethodDecl's own separate validation pass already walks in full.
```

```
row:               10
finding_id:        P61-D2-011
unit:              RU-61-02
location:          bbj-vscode/src/language/bbj-type-inferer.ts:75-76
dimension:         D2
severity:          medium
effort:            4
failure_scenario:  Any static or instance Java method call whose JavaMethod.resolvedReturnType has not (yet, or ever) been populated — a resolution race, a partially resolved class, or any future code path that constructs/updates a JavaMethod outside java-interop.ts's own resolveClass() Phase 2 — causes bbj-type-inferer.ts to silently return no type for that call site, with no diagnostic explaining why. This matches DEBT-03's documented symptom (`String.valueOf(2)` assigns no type).
```

```
row:               11
finding_id:        P61-D2-013
unit:              RU-61-04
location:          bbj-vscode/src/language/bbj-completion-provider.ts:154-200
dimension:         D2
severity:          medium
effort:            4
failure_scenario:  A user types quickly inside a type-reference position; the editor cancels an earlier completion request as a newer one supersedes it (standard LSP behavior on rapid keystrokes). The cancelled request's completeAutoImportClasses call is not interrupted — it continues running (including its java-interop round trip) to completion, wasting CPU and java-interop's single global resolution lock queue (RU-61-06) on a result that is discarded on arrival.
```

```
row:               12
finding_id:        P61-D2-014
unit:              RU-61-04
location:          bbj-vscode/src/language/bbj-document-symbol-provider.ts:155,173-182
dimension:         D2
severity:          low
effort:            2
failure_scenario:  In a document with parser errors under LARGE_FILE_THRESHOLD (triggering the deep-walk fallback, line 52), two distinct named nodes that happen to start at the identical line/character produce only one outline entry instead of two; the second node's symbol is dropped from recovery with no indication to the user that anything is missing from the outline.
```

```
row:               13
finding_id:        P61-D2-015
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-ws-manager.ts:106-141
dimension:         D2
severity:          medium
effort:            4
failure_scenario:  A multi-root VS Code workspace has folder A (with project.properties defining PREFIX/classpath) and folder B (a second root, e.g. a shared library project with its own project.properties). If folder A is listed first, folder B's PREFIX/classpath settings are never read; if folder B is listed first, folder A's settings are ignored instead — either way, one root's Java classpath/PREFIX configuration is silently dropped, matching #33's report that VS Code multi-root workspaces "don't work".
```

```
row:               14
finding_id:        P61-D2-016
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-ws-manager.ts:179-182
dimension:         D2
severity:          medium
effort:            2
failure_scenario:  A malformed project.properties file, or an unexpected synchronous throw inside parseSettings()/collectPrefixes(), causes initializeWorkspace() to exit its try block early. `this.settings` is left undefined or partially-populated; later calls to getSettings() (consumed by bbj-document-builder.ts and main.ts) silently receive that partial/undefined state, with no signal to the user beyond a raw console.error line — no logger.error, no connection.window.showErrorMessage.
```

```
row:               15
finding_id:        P61-D2-017
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-document-builder.ts:155-190
dimension:         D2
severity:          medium
effort:            2
failure_scenario:  `cplService.compile(key)` (or `notifyDocumentPhase`) rejects — e.g. an unexpected error inside BBjCPLService's process-spawn/parse path. The async setTimeout callback's returned promise rejects with no attached handler, surfacing as an unhandledRejection at the Node process level rather than being caught and logged in-context.
```

```
row:               16
finding_id:        P61-D2-019
unit:              RU-61-07
location:          bbj-vscode/src/language/lib/events.ts:57,528,62,533
dimension:         D2
severity:          low
effort:            2
failure_scenario:  A reference to ON_MOUSE_ENTER or ON_MOUSE_EXIT always resolves to the first declaration (line 57/62); the second declaration's distinct DOCU text is permanently unreachable by linking. Completion's getAllElements() has no dedup, so a user completing an ON_MOUSE_ENTER/ON_MOUSE_EXIT handler sees the same label offered twice, indistinguishable except by which duplicate's hover text happens to be shown.
```

```
row:               17
finding_id:        P61-D3-001
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:40-48
dimension:         D3
severity:          low
effort:            4
failure_scenario:  A long-running editor session against a large/varied classpath (many `use`d packages over time) grows these maps without bound, increasing steady-state memory usage monotonically until the server is restarted.
```

```
row:               18
finding_id:        P61-D3-004
unit:              RU-61-04
location:          bbj-vscode/src/language/bbj-completion-provider.ts:90-116
dimension:         D3
severity:          medium
effort:            4
failure_scenario:  Typing a Java class name prefix character-by-character inside a type reference (e.g. "H", "Ha", "Has", "Hash", "HashM", "HashMa", "HashMap") in a workspace with a large classpath re-runs the full completeClassIndex/ resolvedClasses scan on every keystroke from the second character onward; against an unresponsive java-interop peer, the same keystrokes each risk stalling the completion popup for the connect-timeout window.
```

```
row:               19
finding_id:        P61-D3-005
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-document-builder.ts:359-411
dimension:         D3
severity:          medium
effort:            4
failure_scenario:  A workspace with a large indexed class count and several documents each carrying multiple unresolved USE-file diagnostics triggers, on every incremental rebuild touching those documents, one full pass over the entire workspace's BbjClass index per unresolved diagnostic — cost scales with total indexed classes × unresolved diagnostics per rebuild, not with the size of the file(s) actually being edited.
```

```
row:               20
finding_id:        P61-D4-003
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:175-314
dimension:         D4
severity:          low
effort:            4
failure_scenario:  n/a (D4 trace-tier finding): a change to the shared connect+send+catch shape (e.g. adding a retry, or the circuit breaker recommended by P61-D3-002) must be applied in up to 4 places by hand, risking drift between them.
```

```
row:               21
finding_id:        P61-D4-005
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj-token-builder.ts:7-64
dimension:         D4
severity:          low
effort:            4
failure_scenario:  n/a (D4 trace-tier finding — the code shape itself is the defect, not a runtime failure): a future change to token priority ordering (the spliceToken block) risks an accidental edit inside the unrelated ID-category-wiring block, since both operate on the same local `tokens` variable with no named boundary between them.
```

```
row:               22
finding_id:        P61-D4-006
unit:              RU-61-03
location:          bbj-vscode/src/language/bbj-validator.ts:266-311
dimension:         D4
severity:          low
effort:            2
failure_scenario:  n/a (D4 trace-tier finding — the code shape itself is the defect, not a runtime failure): ~46 lines of dead, unreachable code sit alongside the working implementation with an almost-identical name and shape; a future contributor fixing a visibility-check bug in check-classes.ts's checkClassReference has no signal that bbj-validator.ts's same-named method is inert, and could plausibly "fix" the wrong one.
```

```
row:               23
finding_id:        P61-D4-008
unit:              RU-61-02
location:          bbj-vscode/src/language/bbj-linker.ts:155-212
dimension:         D4
severity:          low
effort:            2
failure_scenario:  n/a (D4 trace-tier finding — the code shape itself is the defect, not a runtime failure): a change to the workspace-root resolution strategy (e.g. supporting multi-root workspaces properly instead of always `workspaceFolders[0]`) must be applied by hand in two places, risking drift.
```

```
row:               24
finding_id:        P61-D4-009
unit:              RU-61-02
location:          bbj-vscode/src/language/assertions.ts:1-4
dimension:         D4
severity:          low
effort:            2
failure_scenario:  n/a (D4 trace-tier finding — dead code, not a runtime failure): the module ships in the bundle with no consumer; a future contributor cannot tell from the code alone whether it is vestigial or intentionally kept for future use.
```

```
row:               25
finding_id:        P61-D4-010
unit:              RU-61-04
location:          bbj-vscode/src/language/bbj-document-symbol-provider.ts:75,149
dimension:         D4
severity:          low
effort:            1
failure_scenario:  n/a (D4 trace-tier finding — the lint warning itself is the defect, not a runtime failure): the directives no longer suppress anything, adding noise to `npm run lint`'s output and masking whether a future, genuinely-needed eslint-disable nearby is intentional or another unused leftover.
```

```
row:               26
finding_id:        P61-D4-012
unit:              RU-61-05
location:          bbj-vscode/src/language/main.ts:32-73,147-188
dimension:         D4
severity:          medium
effort:            4
failure_scenario:  n/a (D4 trace-tier finding — the code shape itself is the defect, not a runtime failure): a future change to this reload-and-revalidate sequence (e.g. adding a new step, or fixing P61-D2-016/P61-D2-018) must be applied by hand in both handlers, risking the two call sites drifting out of sync.
```

```
row:               27
finding_id:        P61-D5-004
unit:              RU-61-01
location:          bbj-vscode/test/example-files.test.ts:16-20
dimension:         D5
severity:          low
effort:            2
failure_scenario:  A future .bbj file added to test/test-data/ that fails to lex or parse would NOT fail this test, silently defeating the regression-test guarantee CLAUDE.md's Testing Pattern section states: "Every .bbj file in test/test-data/ is automatically parsed by example-files.test.ts and must produce zero lexer/parser errors."
```

```
row:               28
finding_id:        P61-D5-005
unit:              RU-61-03
location:          bbj-vscode/test/cpl-service.test.ts:1-133
dimension:         D5
severity:          medium
effort:            2
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a future change to getBbjcplPath()/compile()'s path-validation behavior (e.g. a fix for P61-D1-003) has no existing regression test to confirm it actually rejects an untrusted bbjHome, or to prevent a future regression from silently reopening the gap.
```

```
row:               29
finding_id:        P61-D5-006
unit:              RU-61-03
location:          bbj-vscode/src/language/validations/line-break-validation.ts:294-318
dimension:         D5
severity:          low
effort:            2
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a regression in hasLinebreakBefore/hasLinebreakAfter's CRLF or final-line handling would pass the full npm test suite undetected, because no test exercises either case for this file's checks.
```

```
row:               30
finding_id:        P61-D5-007
unit:              RU-61-02
location:          bbj-vscode/src/language/bbj-overload-selector.ts:32-52
dimension:         D5
severity:          medium
effort:            2
failure_scenario:  n/a (D5 trace-tier finding — missing test, not a runtime failure): a future change to the tie-break comparison (e.g. `>` to `>=` on line 46) would silently flip which overload wins ties with no test catching the regression.
```

```
row:               31
finding_id:        P61-D5-008
unit:              RU-61-02
location:          bbj-vscode/src/language/bbj-scope.ts:253-292
dimension:         D5
severity:          medium
effort:            2
failure_scenario:  n/a (D5 trace-tier finding — missing test, not a runtime failure): a future change to the local-vs-member scope nesting order in this branch would go undetected by the existing test suite.
```

```
row:               32
finding_id:        P61-D5-009
unit:              RU-61-02
location:          bbj-vscode/src/language/bbj-type-inferer.ts:73-78
dimension:         D5
severity:          medium
effort:            2
failure_scenario:  n/a (D5 trace-tier finding — missing test, not a runtime failure): a fix to P61-D2-011 without an accompanying regression test would leave this specific gap open independently — the underlying bug and the missing test are two distinct defects that both need closing.
```

```
row:               33
finding_id:        P61-D5-011
unit:              RU-61-04
location:          bbj-vscode/src/language/bbj-signature-help-provider.ts:17-118
dimension:         D5
severity:          medium
effort:            2
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a regression in the active-parameter calculation (getActiveParameter), the rendered signature label, or the markdown documentation block would pass the full `npm test` suite undetected, because no currently-passing test exercises provideSignatureHelp/getSignatureFromElement against a real method call.
```

```
row:               34
finding_id:        P61-D5-012
unit:              RU-61-04
location:          bbj-vscode/src/language/bbj-hover.ts:55-109
dimension:         D5
severity:          medium
effort:            2
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a regression in inherited-field detection (e.g. always reporting "inherited"), the Javadoc-provider integration, or the error-degrade path silently swallowing a real hover computation error would pass the full `npm test` suite undetected.
```

```
row:               35
finding_id:        P61-D5-015
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-notifications.ts:1-53
dimension:         D5
severity:          low
effort:            2
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a regression in the dedup guard (e.g. always sending, or never sending after the first call) would pass `npm test` undetected.
```

```
row:               36
finding_id:        P61-D5-016
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-document-builder.ts:90-222
dimension:         D5
severity:          medium
effort:            4
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a regression in the debounce timing, the lazy-availability-check's once-only guard, or the trigger-mode dispatch (P61-D2-017's unhandled- rejection gap included) would pass `npm test` undetected.
```

```
row:               37
finding_id:        P61-D5-017
unit:              RU-61-07
location:          bbj-vscode/test/builtin-functions-library.test.ts
dimension:         D5
severity:          medium
effort:            4
failure_scenario:  A malformed entry added to labels.ts, variables.ts or events.ts (e.g. a name colliding with a reserved keyword, breaking the LibSymbolicLabel/ LibVariable/LibEventType parse) silently disables completion/hover for that entry with no regression test catching it, unlike functions.ts. The CVS docstring drift (P61-D4-015) demonstrates .ts/.bbl content can already diverge with nothing noticing.
```

```
row:               38
finding_id:        P61-D8-001
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:757-760
dimension:         D8
severity:          low
effort:            2
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a runtime failure): a reader of clearCache()'s doc comment reasonably concludes calling it leaves no stale cached state, which is false for the complete class index.
```

```
row:               39
finding_id:        P61-D8-002
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj.langium:948
dimension:         D8
severity:          low
effort:            2
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a runtime failure): a reader of this comment reasonably concludes escaped double-quotes are already normalized in the parsed AST value, which is false.
```

```
row:               40
finding_id:        P61-D8-003
unit:              RU-61-03
location:          CLAUDE.md:34
dimension:         D8
severity:          low
effort:            2
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a runtime failure): a reader of CLAUDE.md's Architecture section forms an incomplete picture of the validation surface, unaware that builtin-function-call argument/arity/return-type checking is a fourth, separate validations/ module.
```

```
row:               41
finding_id:        P61-D8-004
unit:              RU-61-03
location:          bbj-vscode/src/language/bbj-cpl-service.ts:48-49,203-207
dimension:         D8
severity:          low
effort:            2
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a runtime failure): a reader of compile()'s class-level comment could wrongly conclude BBjCPL diagnostics are not yet surfaced to users (they are, via the debounced on-save path in bbj-document-builder.ts), and a reader of setTimeout()'s comment could wrongly assume the compile timeout is configurable from VS Code settings today, when no such wiring exists.
```

```
row:               42
finding_id:        P61-D8-005
unit:              RU-61-04
location:          CLAUDE.md (repo root) §Architecture → Langium Pipeline → Key services, "Completion" bullet
dimension:         D8
severity:          low
effort:            1
failure_scenario:  n/a (D8 trace-tier finding — a documentation-completeness defect, not a runtime failure): a reader of CLAUDE.md's architecture overview reasonably concludes Completion is the only custom LSP feature provider of note in this codebase, when ten others exist and are equally part of the "Langium Pipeline" section's own subject matter.
```

```
row:               43
finding_id:        P61-D8-006
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-ws-manager.ts:180
dimension:         D8
severity:          low
effort:            2
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a runtime failure): a reader of this comment reasonably concludes that any exception caught here has no consequence, which is false — it silently leaves setup half-completed.
```

```
row:               44
finding_id:        P61-D8-007
unit:              RU-61-07
location:          bbj-vscode/test/builtin-functions-library.test.ts:9-14
dimension:         D8
severity:          low
effort:            2
failure_scenario:  A reader of this test's comment reasonably concludes the physical lib/functions.bbl file is validated by CI; it is not — a syntax error introduced only into the physical file would pass this test undetected.
```

```
row:               45
finding_id:        P62-D2-004
unit:              RU-62-01
location:          bbj-vscode/src/extension.ts:892
dimension:         D2
severity:          low
effort:            2
failure_scenario:  If the language-server process fails to spawn, client.start()'s rejection is never observed anywhere in this file, producing an unhandled promise rejection in the extension host with no dedicated user-facing message explaining that the server didn't start, while every command remains registered as if it had.
```

```
row:               46
finding_id:        P62-D2-006
unit:              RU-62-05
location:          bbj-vscode/bbj-language-configuration.json:54-55,100-101
dimension:         D2
severity:          low
effort:            2
failure_scenario:  Any tool that treats bbj-language-configuration.json as strict JSON — a schema validator, a build-time lint step, a future automated consumer, or simply JSON.parse called directly as this review's own acceptance check does — throws a SyntaxError and fails to load the file; only VS Code's own lenient in-process parser currently tolerates it, so the defect is invisible in the shipped extension today but is not portable to any other consumer.
```

```
row:               47
finding_id:        P62-D2-007
unit:              RU-62-05
location:          bbj-vscode/syntaxes/bbj.tmLanguage.json:18-25,27-35,68-72
dimension:         D2
severity:          medium
effort:            2
failure_scenario:  Any BBj string literal containing plain text — the overwhelming majority of "..."/'...' usage in real BBj source — is rendered by a theme's constant.character.escape color (typically distinct from, and often more attention-drawing than, its string color) for every character, not just the quote delimiters. Visible on virtually every line containing a string literal in any .bbj file, e.g. `PRINT "Hello, World!"`'s entire "Hello, World!" renders in the escape-sequence color instead of the string color.
```

```
row:               48
finding_id:        P62-D2-008
unit:              RU-62-05
location:          bbj-vscode/syntaxes/bbj.tmLanguage.json:41-50
dimension:         D2
severity:          low
effort:            2
failure_scenario:  A bare REM on its own line — a valid, complete no-op comment statement per the language server's own lexer, and a real developer idiom for marking an intentionally blank line — is rendered as plain, unscoped code by the editor instead of a comment.
```

```
row:               49
finding_id:        P62-D2-009
unit:              RU-62-05
location:          bbj-vscode/syntaxes/bbj.tmLanguage.json:15
dimension:         D2
severity:          low
effort:            2
failure_scenario:  IOL=/LEN= — BBj's I/O-list-length and record-length options, always written with a value attached (IOL=5, LEN=80) — never receive keyword highlighting in that form, the only form that occurs in real code; the pattern only fires on the unrealistic IOL=/LEN= with nothing after it.
```

```
row:               50
finding_id:        P62-D2-010
unit:              RU-62-02
location:          bbj-vscode/src/document-formatter.ts:63-67
dimension:         D2
severity:          medium
effort:            2
failure_scenario:  If cp.spawn('java', formatFlags) (line 59) emits 'error' with any code other than 'ENOENT' (a permissions error on the java binary being the most realistic case, e.g. after a botched local JDK reinstall), the runFormatter Promise never settles: the format request awaiting it (provideDocumentFormattingEdits's .then(...) at line 32) hangs indefinitely, with no error message, no timeout, and no way for the user to tell the formatter is stuck versus merely slow.
```

```
row:               51
finding_id:        P62-D2-011
unit:              RU-62-02
location:          bbj-vscode/src/decompile-io.ts:69-82
dimension:         D2
severity:          low
effort:            4
failure_scenario:  If a prior decompileInPlace attempt against the same file already left a stale <input>.lst on disk (e.g. the extension crashed or the user closed VS Code between the exec() completing and the rename step), and a subsequent retry's fresh bbjlst output happens to settle at the same byte size as the stale file, the first two 150ms-spaced polls can both observe that stale size before the new write has begun, causing waitForDecompileOutput to resolve immediately with the STALE .lst's content rather than the fresh run's output — the user would see outdated decompiled source with no error.
```

```
row:               52
finding_id:        P62-D3-001
unit:              RU-62-02
location:          bbj-vscode/src/document-formatter.ts:9-50,52-84
dimension:         D3
severity:          low
effort:            4
failure_scenario:  Saving several open BBj documents together (VS Code's "Save All", or format-on-save firing while a manual format request from the same document is still in flight) spawns one independent JVM per request with no upper bound on concurrency — on a machine with several BBj files open, this can transiently spawn several concurrent JVMs, each with the ~750ms+ startup cost the code's own warning threshold already flags, worsening perceived editor responsiveness during a bulk save.
```

```
row:               53
finding_id:        P62-D4-005
unit:              RU-62-02
location:          bbj-vscode/src/decompile-io.ts:10,bbj-vscode/src/tokenized-bbj.ts:17
dimension:         D4
severity:          low
effort:            2
failure_scenario:  n/a (D4 is a code-shape finding, not a runtime failure scenario) — if the magic-byte sequence were ever revised (e.g. a future tokenized-file format version), a fix applied to only one of the two constants inside this unit would silently desynchronize isTokenizedBBjHeader and isTokenizedFile, causing the two detection paths (extension.ts's tab-open prompt vs. Commands.cjs's decompile/denumber flow) to disagree about whether the same file is tokenized.
```

```
row:               54
finding_id:        P62-D5-004
unit:              RU-62-05
location:          bbj-vscode/test/textmate-highlighting.test.ts (absence of 3 assertions) — covers bbj-vscode/syntaxes/bbj.tmLanguage.json
dimension:         D5
severity:          low
effort:            4
failure_scenario:  A future edit to bbj.tmLanguage.json's string or keyword patterns can reintroduce or worsen any of these three defects (or a similar one) with `npm test` green throughout, since the existing 2 tests do not assert string-content scope purity, bare-REM recognition, or the IOL=/LEN= value-attached form.
```

```
row:               55
finding_id:        P62-D5-006
unit:              RU-62-02
location:          bbj-vscode/src/document-formatter.ts (whole file; no test counterpart)
dimension:         D5
severity:          low
effort:            4
failure_scenario:  A regression in the exit-code handling, the P62-D2-010 hang path, or the P62-D3-001 concurrent-spawn behavior would ship silently — `npm test` staying green today provides no signal about any of them, since no test imports this file at all.
```

```
row:               56
finding_id:        P62-D7-002
unit:              RU-62-05
location:          bbj-vscode/package.json:30-35
dimension:         D7
severity:          medium
effort:            2
failure_scenario:  A user who opens one of this project's own lib/*.bbl builtin-catalog files (or any .bbl file in a BBj project using custom builtin libraries) directly in VS Code sees plain, unscoped text with no bracket matching, no comment toggling, and no language-server diagnostics/completions in that editor tab — while the identical file, opened in IntelliJ, gets full "BBj" TextMate highlighting per the IntelliJ manifest's .bbl entry.
```

```
row:               57
finding_id:        P62-D8-001
unit:              RU-62-05
location:          CLAUDE.md:90-92
dimension:         D8
severity:          low
effort:            2
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a runtime failure): a reader of CLAUDE.md reasonably concludes only bbj.tmLanguage.json is IDE-shared, and could edit bbx.tmLanguage.json or either *-language-configuration.json file believing it is VS Code-only, missing that the same edit reaches IntelliJ via copyTextMateBundle.
```

```
row:               58
finding_id:        P62-D8-002
unit:              RU-62-02
location:          bbj-vscode/src/document-formatter.ts:5-6,29-30,88-96
dimension:         D8
severity:          low
effort:            2
failure_scenario:  n/a (D8 is a comment-accuracy finding) — the map, its onDidChangeTextDocument writer (lines 88-91), and its onDidCloseTextDocument cleanup (lines 94-96) add a per-keystroke write and 9 of this file's 96 lines for no confirmed behavioral difference, while the comment's inaccurate framing would mislead a future maintainer into believing the map is load-bearing.
```

```
row:               59
finding_id:        P63-D4-001
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:50,103,125,136-139,148,152,97-165
dimension:         D4
severity:          low
effort:            4
failure_scenario:  n/a (D4 is a code-shape finding, not a runtime failure scenario) — the duplication is a maintainability cost: any future platform-specific fix (e.g. a sixth OS/architecture combination, or hardening one branch without the others) must be applied at up to 5 separate sites by hand, with drift risk between them; the god-function shape makes downloadAndExtractNode harder to review, test in isolation, or partially reuse (e.g. resolving just the extracted-binary path without also downloading).
```

```
row:               60
finding_id:        P63-D4-014
unit:              RU-63-02
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjIcons.java:14
dimension:         D4
severity:          low
effort:            2
failure_scenario:  n/a in the sense that D4 records dead code, not a runtime failure — the bbj-config.svg/bbj-config_dark.svg resource pair is bundled into every plugin build and referenced by nothing, a small but genuine maintenance/packaging-size cost with no corresponding functionality.
```

```
row:               61
finding_id:        P63-D7-004
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java:18-23,75-84
dimension:         D7
severity:          low
effort:            2
failure_scenario:  Currently zero observable impact — both IDEs display the raw numeric expr in their summary line regardless of useConstants, and the actually-inserted statement text is correct on both sides. The latent risk is that a future change to either webview's or dialog's display code to surface exprText/ constant would work silently on the VS Code side and silently do nothing on the IntelliJ side, since Gson would drop the field with no compile-time or runtime error — "a silent shape drift the compiler cannot catch."
```

```
row:               62
finding_id:        P63-D8-001
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:42-45
dimension:         D8
severity:          low
effort:            2
failure_scenario:  n/a (D8 is a doc-accuracy finding) — a caller relying on the Javadoc's implied read-only contract (e.g. calling this method speculatively/defensively, assuming it cannot fail due to a write) is not warned that this "getter" can also fail for write-related reasons (permission, read-only filesystem, disk full) — which is exactly the ambiguity P63-D2-001 records as a correctness gap; this finding is the doc-accuracy half of that same code shape.
```

```
row:               63
finding_id:        P63-D8-002
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java:14-17,20-22
dimension:         D8
severity:          low
effort:            2
failure_scenario:  n/a (D8 is a doc-accuracy finding) — a future maintainer skimming the class Javadoc or a user reading the action's tooltip text ("Compile the current BBj file") receives no signal that this is unimplemented, unlike the honest inline TODO comment.
```

```
row:               64
finding_id:        P63-D8-003
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:15-18
dimension:         D8
severity:          low
effort:            2
failure_scenario:  n/a (D8 is a doc-accuracy finding) — a reader relying on the Javadoc's specific "OS-native keychain" claim to reason about at-rest exposure or persistence- across-restart would be wrong on any install where the user has selected KeePass or "Do not save," neither of which this class detects or accounts for.
```

```
row:               65
finding_id:        P63-D8-005
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java:1-14
dimension:         D8
severity:          low
effort:            2
failure_scenario:  A maintainer relying on the class doc's "mirroring" claim to assume Java's DTOs are a complete field-for-field reflection of the TS-side types would be wrong by exactly the two dormant fields P63-D7-004 records — not a functional bug today, since neither field is currently consumed by any UI, but a doc-accuracy gap that would mislead a reviewer checking DTO completeness by reading the comment alone instead of diffing the two sides.
```

```
row:               66
finding_id:        P63-D8-006
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerLogToolWindowFactory.java:14-17,20-41
dimension:         D8
severity:          low
effort:            2 (revised 2026-08-18: recorded as 1, off INVENTORY §3d's locked {2,4,8} scale. Rounded DOWN to the nearest legal value so the finding remains labellable for ISSUE-03, which uses the effort value as the label with no translation step. Rounding down rather than up preserves the reviewer's evident intent — 1 was chosen to mean 'below the 4 bucket'. Original value retained here.)
failure_scenario:  A developer who opens this tool window expecting to see the language server's own diagnostic stdout/stderr output — the exact promise the class doc and the window's own initial message ("BBj Language Server log initialized") make — sees only the small set of status-transition strings this unit's code happens to log, never the server process's own console output, reducing the window's diagnostic value below what its documentation promises.
```

```
row:               67
finding_id:        P63-D8-007
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:24-28
dimension:         D8
severity:          low
effort:            2 (revised 2026-08-18: recorded as 1, off INVENTORY §3d's locked {2,4,8} scale. Rounded DOWN to the nearest legal value so the finding remains labellable for ISSUE-03, which uses the effort value as the label with no translation step. Rounding down rather than up preserves the reviewer's evident intent — 1 was chosen to mean 'below the 4 bucket'. Original value retained here.)
failure_scenario:  A reader of this class's own doc reasonably assumes rapid repeated restart triggers are already deduplicated somewhere in this class, when in fact — per P63-D2-013 — none of the six real trigger paths goes through that debouncing at all.
```

```
row:               68
finding_id:        P63-D8-008
unit:              RU-63-02
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjColorSettingsPage.java:117-120
dimension:         D8
severity:          low
effort:            2
failure_scenario:  n/a (D8 is a doc-accuracy finding) — a developer who copies the Settings > Color Scheme demo pane's block-comment syntax as a template for a real BBj documentation comment writes an invalid delimiter that the grammar's own DOCU terminal will not recognize as a documentation comment.
```

```
row:               69
finding_id:        P64-D2-004
unit:              RU-64-01
location:          .github/workflows/pr-validation.yml:8-13
dimension:         D2
severity:          medium
effort:            2
failure_scenario:  A pull request edits `bbj-vscode/src/language/bbj-module.ts`, or any of the other 52 tracked files under `src/language/`, and nothing else. The `paths:` filter at `:8-13` matches none of the changed files, so `pr-validation.yml` is skipped entirely and the pull request shows no IntelliJ check at all — not a failing check, an absent one, which reads to a reviewer as "not applicable" rather than "not run". `build.yml` runs and passes, because it builds and tests only `bbj-vscode`. The change merges to `main`, and the first time the IntelliJ side is exercised is `preview.yml`'s `build-intellij` job, which runs after `publish-preview` has already published the VS Code preview to the Marketplace — so the break surfaces after publication instead of before merge.
```

```
row:               70
finding_id:        P64-D4-004
unit:              RU-64-01
location:          .github/workflows/build.yml:4-6
dimension:         D4
severity:          low
effort:            2
failure_scenario:  A contributor reads `build.yml:3-9` and concludes that pushes to a development branch are built by CI, and pushes work to a long-lived branch expecting it to be validated; nothing runs, and the absence of a check reads as "CI is not configured for this branch" only if they already know `typefox-dev` is gone. The dual of the same confusion is a maintainer auditing which events can reach a workflow that runs `npx vsce package` — the answer they must reach is "pull requests to `main`, and nothing else", and the file does not say that.
```

```
row:               71
finding_id:        P64-D6-004
unit:              RU-64-01
location:          .github/workflows/build.yml:18-20
dimension:         D6
severity:          low
effort:            2
failure_scenario:  A contributor reads `build.yml` to copy the standard checkout-and-setup preamble into a new workflow — the preamble being duplicated across five files already, `P64-D4-003` — and copies the `@v3` pair, propagating the stale reference. More directly: the `@v3` and `@v4` majors of these actions differ in defaults and in the runtime they execute under, so `build.yml`'s job is not running the same checkout-and-setup behaviour as the other five workflows even though the five files read as though it were, and any divergence between `build.yml`'s result and `pr-vsix.yml`'s for the same commit has a cause that is invisible in the diff.
```

```
row:               72
finding_id:        P64-D6-009
unit:              RU-64-02
location:          bbj-vscode/package-lock.json:3
dimension:         D6
severity:          low
effort:            2
failure_scenario:  A release engineer, an SBOM generator, or a reproducibility audit reads the lockfile to establish what version of `bbj-lang` a given dependency graph belongs to — the ordinary reason to read a lockfile's root entry rather than the manifest — and gets `0.11.0` for a tree that is `0.12.0`. Any artefact keyed on that value (a generated SBOM, a provenance attestation, a release-note diff between two lockfiles) records the wrong version, and the error is silent because nothing in `npm ci`'s sync check compares the root `version` field. It also means the committed lockfile is not byte-identical to the one `npm install` would produce from the current manifest, so the next dependency change will carry an unrelated version-line diff that obscures the real one in review.
```

```
row:               73
finding_id:        P64-D6-013
unit:              RU-64-02
location:          bbj-vscode/package-lock.json:2172
dimension:         D6
severity:          medium
effort:            2
failure_scenario:  Each of the six is a denial-of-service or bounds-check defect reachable only through `@vscode/vsce`'s own code paths, which execute during packaging and publishing — `preview.yml:62-68` and `manual-release.yml:84-90`, both inside jobs holding `secrets.VSCE_PAT`. A malformed input reaching `ajv`'s `$data` handling, `markdown-it`'s smartquotes rule (vsce renders the extension README through markdown-it), `qs.stringify`, or `uuid`'s buffer path stalls or crashes the publishing job. The practical consequence is a failed or hung release rather than a compromised one — which is why these six are `moderate` and separable from the eleven `file-issue` rows, and why leaving them unfixed is a slow accumulation rather than an acute exposure.
```

```
row:               74
finding_id:        P64-D8-003
unit:              RU-64-02
location:          .planning/reviews/INVENTORY.md:938
dimension:         D8
severity:          low
effort:            2
failure_scenario:  A later reader — Phase 68 assembling DOC-03, or anyone re-deriving this milestone's scope — reads line 938 and concludes that no installed package tree existed when Phase 64 ran, and therefore that this phase's SEC-08 answer must have been produced from the lockfile alone by hand. It was not: `npm audit` in this plan queried the installed 385-package tree directly, and its 19-vulnerability result is an enumeration of *that* tree. The stale parenthetical would lead a reader to under-rate the evidence behind criterion 3, or to re-run the audit expecting it to fail. **The exclusion itself still stands and this record says so explicitly, so that nothing here reads as licence to review `node_modules/`:** Phase 64 reviewed no installed package source, and dependency health was assessed from the manifest and lockfile exactly as that row directs. Only the stated reason is stale, not the decision.
```

```
row:               75
finding_id:        P64-D8-004
unit:              RU-64-02
location:          .planning/reviews/INVENTORY.md:964
dimension:         D8
severity:          medium
effort:            2
failure_scenario:  Without this record and D-20's adoption, the milestone's SEC-08 claim — "every npm and Gradle dependency with a known vulnerability, enumerated and triaged" — would rest on an unexamined 43,583-byte third-party executable that runs on every build and in every CI job that invokes Gradle, three of which hold `secrets.JETBRAINS_MARKETPLACE_TOKEN`. The gap is not theoretical: sweeping the file directly is what surfaced `P64-D1-006` (no `distributionSha256Sum`, no wrapper validation in any workflow) and `P64-D6-006` (the committed JAR's hash identifies Gradle 8.10-8.12.1 while its own properties file declares 8.13) — neither of which is visible from the two text files INVENTORY does assign. **The drift record and the adoption are two distinct facts and neither cancels the other:** INVENTORY still fails to name a file plainly in scope, *and* Phase 64 has adopted it into `RU-64-02` under **D-20** with its own file-exception row, swept by manifest and hash in this plan's Tasks 1 and 2. The adoption's arithmetic, stated at the point of the record: it moves **rows 7 → 8, cells 56 → 64, files 28 → 29** — the one adoption in this phase that moves **both** gates, where D-19's `.github/dependabot.yml` moved only the file gate. The governing principle in one sentence, because it is what a later reader needs in order to judge the counts: **the gate follows the scope, not the other way round** — a count that excludes a real in-scope executable is simply a wrong count, so the gate moved to fit the surface rather than the surface being trimmed to fit the gate.
```

```
row:               76
finding_id:        P64-D8-005
unit:              RU-64-02
location:          bbj-vscode/vitest.config.ts:25-26
dimension:         D8
severity:          low
effort:            2
failure_scenario:  A contributor or reviewer reads `vitest.config.ts` to answer "does this project guard against coverage regressions?" and the file answers yes, in two consecutive comment lines, with concrete numbers beside them. The true answer is that no automated run has ever evaluated those numbers: a pull request that deletes half the test suite passes `build.yml` and `pr-vsix.yml` unchanged, because those workflows run `npm run test`, which does not collect coverage. The comment therefore creates a false sense of an enforced floor, which is worse than silence — a reviewer who has read it is *less* likely to check coverage manually than one who has not.
```

```
row:               77
finding_id:        P66-D2-001
unit:              DEBT-03
location:          bbj-vscode/src/language/bbj-type-inferer.ts:75-76
dimension:         D2
severity:          medium
effort:            4
failure_scenario:  Any static or instance Java method call whose JavaMethod.resolvedReturnType has not (yet, or ever) been populated — a resolution race, a partially resolved class, or any future code path constructing/updating a JavaMethod outside java-interop.ts's own resolveClass() Phase 2 — causes bbj-type-inferer.ts to silently return no type for that call site, with no diagnostic explaining why. Matches DEBT-03's documented symptom (String.valueOf(2) assigns no type to the target variable).
```
