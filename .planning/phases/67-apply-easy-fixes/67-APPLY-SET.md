# Phase 67 Apply Set

## Derivation

Rows come from selecting every record whose `disposition:` field begins `easy-fix` across the six
closed COVERAGE files (`.planning/reviews/61-COVERAGE.md` … `66-COVERAGE.md`), produced
mechanically by `derive-apply-set.mjs` (run as `node derive-apply-set.mjs` from this directory —
see that script for the exact selection/ordering logic). Rows are ordered by originating phase then
finding ID. This file is Phase 67's closed denominator per D-01 — every exclusion is argued in
writing here, no row is silently absent.

Per D-04, `P61-D2-011` and `P66-D2-001` name the identical location and the identical edit and are
applied and committed once — but each keeps its own row (one row per selected record; the 77-record
selection maps to 77 rows), and both rows are closed against the same commit pair.

## Reconciliation

Two derived counts, and the arithmetic connecting them:

- **77 records → 74 applied records → 73 distinct edits.** 77 rows selected; minus 2 excluded
  (`P64-D8-003`, `P64-D8-004`, D-03) minus 1 deferred (`P63-D7-004`, D-15) leaves 74 records this
  phase applies. Of those 74, the D-04 merge (`P61-D2-011` + `P66-D2-001`) is one edit closing two
  records, so 74 records land as 73 distinct edits (73 = 74 − 1).

- **30 records require a regression test → 29 red-test commits.** D-11's table states 30 fixes
  require a regression test, counted as *records*: D2 (25) + D3 (4) + D7 (1) = 30. Counted as
  *edits* this is **29 red-test commits**, because the D-04 merge folds two of those 30 records'
  regression-test obligations into one red commit (`P61-D2-011`'s own D2 test requirement and
  `P66-D2-001`'s own D2 test requirement are satisfied by the single red commit `382a068`). The two
  numbers (30 vs 29) differ for exactly this reason, stated rather than silently picking one: **73
  edits + 29 red commits = 102 code commits**, the phase's estimated total commit count (plus this
  file's own `docs(...)` ledger commits, which are not code commits).

## Index

| # | finding_id | verdict | commit |
|---|---|---|---|
| 1 | P61-D2-001 | applied | 38fe1d1 (red) + 59dc2be (green) |
| 2 | P61-D2-002 | applied | 7ae80a2 (test) + b0696aa (fix) |
| 3 | P61-D2-003 | applied | 2770752 (red) + 4c92662 (green) |
| 4 | P61-D2-004 | applied | e82f9c2 (red) + 557ab62 (green) |
| 5 | P61-D2-005 | applied | 1b619cc (red) + 4db8169 (green) |
| 6 | P61-D2-006 | applied | 112c9bb (red) + e57b15a (green) |
| 7 | P61-D2-008 | applied | 83375d4 (red) + 664670f (green) |
| 8 | P61-D2-009 | applied | 5528665 (red) + 7b6eff9 (green) |
| 9 | P61-D2-010 | applied | 869a330 (red) + b83d3e8 (green) |
| 10 | P61-D2-011 | applied | 382a068 (red) + 32faeff (green) |
| 11 | P61-D2-013 | applied | 1b85860 (red) + eb7d843 (green) |
| 12 | P61-D2-014 | applied | 6b8c2db (red) + 84373a6 (green) |
| 13 | P61-D2-015 | applied | c6bef67 (red) + 1f5e824 (green) |
| 14 | P61-D2-016 | applied | d0b1666 (red) + c47da5c (green) |
| 15 | P61-D2-017 | applied | 26576ae (red) + 38dea2e (green) |
| 16 | P61-D2-019 | applied | d1e86e6 (red) + 3b18ac9 (green) |
| 17 | P61-D3-001 | applied | 7a4448d (red) + 6d7be38 (green) |
| 18 | P61-D3-004 | applied | a1a90cd (red) + 0aaece2 (green) |
| 19 | P61-D3-005 | applied | fc9cf79 (red) + 6b32823 (green) |
| 20 | P61-D4-003 | applied | 8c9028c |
| 21 | P61-D4-005 | applied | 6be6639 |
| 22 | P61-D4-006 | applied | 906ca51 |
| 23 | P61-D4-008 | applied | 7d03fc0 |
| 24 | P61-D4-009 | applied | 8d166cc |
| 25 | P61-D4-010 | applied | 91f8329 |
| 26 | P61-D4-012 | applied | 76ccb8b |
| 27 | P61-D5-004 | applied | 6af46c8 |
| 28 | P61-D5-005 | applied | 500001d |
| 29 | P61-D5-006 | applied | d080471 |
| 30 | P61-D5-007 | applied | 64c9d1e |
| 31 | P61-D5-008 | applied | 1b8e786 |
| 32 | P61-D5-009 | applied | 2b121ee |
| 33 | P61-D5-011 | applied | e0acbbf |
| 34 | P61-D5-012 | applied | 42b8881 |
| 35 | P61-D5-015 | applied | 540232c |
| 36 | P61-D5-016 | applied | 5db3ac9 (test) |
| 37 | P61-D5-017 | applied | f3ba5c5 |
| 38 | P61-D8-001 | no-op | none — comment already accurate after P61-D2-004's fix (557ab62) |
| 39 | P61-D8-002 | no-op | none — resolved by P61-D2-005's fix (4db8169) |
| 40 | P61-D8-003 | applied | 69435df |
| 41 | P61-D8-004 | applied | 2c497ec |
| 42 | P61-D8-005 | applied | fe4d8a0 |
| 43 | P61-D8-006 | no-op | none — resolved by P61-D2-016's fix (c47da5c) |
| 44 | P61-D8-007 | applied | 40d3af1 |
| 45 | P62-D2-004 | applied | 7729e06 (test) + 36de32d (fix) |
| 46 | P62-D2-006 | applied | 295c7a6 (test) + 8c49e2f (fix) |
| 47 | P62-D2-007 | applied | 3a32cef (test) + 4c7b973 (fix) |
| 48 | P62-D2-008 | applied | 5026129 (test) + b30fc6c (fix) |
| 49 | P62-D2-009 | applied | eb81320 (test) + 283cdd3 (fix) |
| 50 | P62-D2-010 | applied | c10e7a9 (red) + c05fd57 (green) |
| 51 | P62-D2-011 | applied | 57c8ada (red) + 73aadc8 (test-timing fix) + 806acb5 (green) |
| 52 | P62-D3-001 | applied | 0a8a14b (red) + a425924 (green) |
| 53 | P62-D4-005 | applied | e6fc4fe |
| 54 | P62-D5-004 | no-op | none — the three named assertions were landed as P62-D2-007/008/009's regression tests |
| 55 | P62-D5-006 | applied | 4afa828 |
| 56 | P62-D7-002 | applied | 906c07b (test) + bee185d (fix) |
| 57 | P62-D8-001 | applied | 2fa0264 |
| 58 | P62-D8-002 | applied | b8dd31a |
| 59 | P63-D4-001 | applied | 7816c7d |
| 60 | P63-D4-014 | applied | 2cf09a6 |
| 61 | P63-D7-004 | deferred | none — deferred per D-15 |
| 62 | P63-D8-001 | applied | 281f62c |
| 63 | P63-D8-002 | applied | 40da059 |
| 64 | P63-D8-003 | applied | b57d98b |
| 65 | P63-D8-005 | applied | 6ca6c49 |
| 66 | P63-D8-006 | applied | 46a8d8c |
| 67 | P63-D8-007 | applied | 18d5cc0 |
| 68 | P63-D8-008 | applied | 97a2e6b |
| 69 | P64-D2-004 | applied | d6e0dee (fix) |
| 70 | P64-D4-004 | applied | b816116 (chore) |
| 71 | P64-D6-004 | applied | ad3dfa7 (chore) |
| 72 | P64-D6-009 | applied | e2ebb11 (chore) |
| 73 | P64-D6-013 | applied | 14560eb (chore) |
| 74 | P64-D8-003 | excluded | none — excluded |
| 75 | P64-D8-004 | excluded | none — excluded |
| 76 | P64-D8-005 | applied | 8713493 (docs) |
| 77 | P66-D2-001 | applied | 382a068 (red) + 32faeff (green) |

## Rows

```
row:               1
finding_id:        P61-D2-001
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:91-108
dimension:         D2
severity:          medium
effort:            4
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at 38fe1d1
failure_scenario:  (a) Two Java-class lookups fire in the same tick while disconnected — each opens its own socket, one is leaked. (b) The peer is killed mid-session — every subsequent resolveClassByName call reuses the dead connection object and its requests hang or reject with no recovery until clearCache() is called explicitly.
fix_applied:       Added an in-flight connectingPromise field so concurrent same-tick connect() callers share one createSocket() invocation and receive the identical MessageConnection. Registered onClose/onError listeners on the established connection that clear this.connection, so a dropped peer forces the next connect() call to reconnect instead of returning the dead reference.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/java-interop-service.test.ts test/method-return-java-type.test.ts
commit:            38fe1d1 (red) + 59dc2be (green)
notes:             
```

```
row:               2
finding_id:        P61-D2-002
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:176-181
dimension:         D2
severity:          medium
effort:            2
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       inapplicable — empirically verified (against the real vscode-jsonrpc SocketMessageReader/Writer + createMessageConnection, not just a hand-rolled repro) that Promise.race([sendRequest(...), timeoutPromise]) already attaches a rejection handler to both array entries synchronously per the Promise.race spec, so a losing branch's later rejection is never unhandled — with or without an extra .catch(). No failing-before state could be produced; see the test commit's own comment and 67-02-SUMMARY.md.
failure_scenario:  A slow peer answers a getClassInfo request just after the 10s timeout has already rejected the race; the late-settling sendRequest(...) promise then rejects with no handler, surfacing as an unhandledRejection at the process level.
fix_applied:       getRawClass() now stores the sendRequest() promise in a variable and attaches a defensive no-op .catch() to it before racing it against the 10s timeout, per the record's exact-edit instruction. The rejection still propagates to the caller via Promise.race. Applied as a harmless, reviewer-blessed defensive change even though empirical testing (see fail_before) found it does not alter observable behaviour for this specific mechanism.
user_facing:       no
verification:      cd bbj-vscode && npm run build && npx vitest run test/java-interop-service.test.ts test/method-return-java-type.test.ts
commit:            7ae80a2 (test) + b0696aa (fix)
notes:             D-04-style override of the D2 default red-before-green expectation, argued here: rigorous reproduction against the real jsonrpc library (not just Node's native Promise.race) found the claimed mechanism does not produce an unhandled rejection under real Node/V8 promise semantics, so a red commit would have been fabricated. The fix is still applied verbatim per the record's classification test (5).
```

```
row:               3
finding_id:        P61-D2-003
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:576-585
dimension:         D2
severity:          medium
effort:            2
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at 2770752
failure_scenario:  A malformed or malicious getClassInfo response with a missing/null fields or methods array throws an uncaught TypeError: Cannot read properties of undefined synchronously inside resolveClass(), propagating out of the resolution chain uncaught.
fix_applied:       Added javaClass.fields ??= [] and javaClass.methods ??= [] in resolveClass()'s Phase 1, alongside the existing classes/constructors defensive defaults, before the loops that iterate them.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/java-interop-service.test.ts test/method-return-java-type.test.ts
commit:            2770752 (red) + 4c92662 (green)
notes:             
```

```
row:               4
finding_id:        P61-D2-004
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:761-790
dimension:         D2
severity:          low
effort:            2
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at e82f9c2
failure_scenario:  The classpath is reloaded via main.ts's didChangeConfiguration path (clearCache() then loadClasspath()); the stale completeClassIndex built for the previous classpath survives and continues to answer resolveClassCandidatesBySimpleName/findClassCandidatesByPrefix auto-import suggestions with FQNs from the old classpath instead of the new one.
fix_applied:       clearCache() now calls this.clearCompleteClassIndex(), so completeClassIndex/completeIndexResolved are reset alongside the rest of the cached state, and the index is rebuilt against the new classpath on next use.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/java-interop-service.test.ts test/method-return-java-type.test.ts
commit:            e82f9c2 (red) + 557ab62 (green)
notes:             
```

```
row:               5
finding_id:        P61-D2-005
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj-value-converter.ts:14
dimension:         D2
severity:          medium
effort:            2
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at 1b619cc — `npx vitest run test/value-converter.test.ts` failed 1/3: `expected 'He said ""hi""' to be 'He said "hi"'` (the doubled-quote case), confirming the converter left the doubled quotes uncollapsed
failure_scenario:  A BBj source string literal containing a doubled-quote escape (e.g. `"He said ""hi"""`) parses without error, but StringLiteral.value retains the literal `""` sequence instead of the single embedded `"` the language's own escape convention specifies, so every consumer of `.value` sees a semantically wrong string.
fix_applied:       BBjValueConverter's STRING_LITERAL case now applies `.replace(/""/g, '"')` after slicing off the outer quote delimiters, matching bbj.langium:948's own documented doubled-quote escape contract. No other rule's conversion changed.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/value-converter.test.ts test/lexer.test.ts test/cpl-parser.test.ts test/parser.test.ts test/example-files.test.ts — build succeeds, all 5 suites pass (234 passed, 1 pre-existing skip)
commit:            1b619cc (red) + 4db8169 (green)
notes:             New dedicated test/value-converter.test.ts created per plan instruction, rather than extending test/parser.test.ts (which carries the 3 DEBT-02-tracked disabled assertions).
```

```
row:               6
finding_id:        P61-D2-006
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj-lexer.ts:11-34
dimension:         D2
severity:          medium
effort:            4
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at 112c9bb — `npx vitest run test/lexer.test.ts` failed 1/6: mixed-CRLF/LF token offsets `[0, 9, 18]` did not equal `[0, 9, 17]`, confirming the global-eol join shifted the offset of every token after the first drifted line
failure_scenario:  A .bbj file containing mixed line endings (at least one \r\n line and at least one bare \n line — plausible when a repository lacks .gitattributes EOL normalization, or a file is edited across Windows/Unix tooling) is retokenized by BbjLexer.tokenize; prepareLineSplitter's uniform-EOL normalization changes the transformed text's length relative to the original document text, shifting every downstream token offset and therefore every diagnostic/hover/completion/go-to-definition range for the remainder of the file.
fix_applied:       Branch taken: track and re-emit each line's own original EOL. prepareLineSplitter now captures each line's original delimiter via a capturing split (`text.split(/(\r\n|\r|\n)/)`) and re-joins each line with its own captured delimiter instead of the single globally-detected `eol`; the final line still falls back to the detected `eol` (unchanged from prior behavior) so single-EOL-style files and files with no trailing newline tokenize byte-for-byte identically to before. The continuation-line splicing logic is untouched and stays length-preserving (proved algebraically: padding cancels the stripped ':' characters exactly).
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/value-converter.test.ts test/lexer.test.ts test/cpl-parser.test.ts test/parser.test.ts test/example-files.test.ts — build succeeds, all 5 suites pass (234 passed, 1 pre-existing skip)
commit:            112c9bb (red) + e57b15a (green)
notes:             Branch taken: per-line original EOL tracking (not the reject/normalize-before-parse alternative). `git show --stat e57b15a` touches only bbj-vscode/src/language/bbj-lexer.ts.
```

```
row:               7
finding_id:        P61-D2-008
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj-token-builder.ts:67-71
dimension:         D2
severity:          low
effort:            2
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at 83375d4 — `npx vitest run test/lexer.test.ts` failed: `expect(() => tokenBuilder.spliceToken(tokens, 'MISSING_TOKEN')).toThrow()` — spliceToken did not throw; `tokens.splice(-1, 1)` silently removed the last element ('THIRD') instead
failure_scenario:  If any of the 14 hardcoded terminal names passed to spliceToken becomes absent from `tokens` — e.g. a future grammar edit renames or removes RPAREN_NL — findIndex returns -1 and `tokens.splice(-1, 1)` silently removes and re-splices the unrelated LAST token in the vocabulary array instead of raising an error, corrupting Chevrotain's token-priority ordering with no diagnostic message; the failure would surface later as a confusing, hard-to-trace lexer misbehavior rather than at the point of the misconfiguration.
fix_applied:       spliceToken (bbj-token-builder.ts) now throws an Error naming the missing token before calling tokens.splice(nextTokenIndex, 1) when findIndex returns -1, instead of letting the splice silently remove and reorder the last token. No change to the 14 call sites or their argument names.
user_facing:       no
verification:      cd bbj-vscode && npm run build && npx vitest run test/lexer.test.ts test/parser.test.ts test/example-files.test.ts — build succeeds, all 3 suites pass (225 passed, 1 pre-existing skip), confirming all 14 hardcoded terminal names still resolve against the real grammar's token vocabulary
commit:            83375d4 (red) + 664670f (green)
notes:             Tested directly against the private spliceToken method (constructed a minimal 3-token array missing the sought name) rather than via a full grammar build, since triggering the -1 branch through the real 14-name call sequence would require breaking the grammar itself.
```

```
row:               8
finding_id:        P61-D2-009
unit:              RU-61-03
location:          bbj-vscode/src/language/bbj-cpl-parser.ts:40-46
dimension:         D2
severity:          low
effort:            2
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at 5528665 — `npx vitest run test/cpl-parser.test.ts` failed 1/10: `expected -1 to be 0` for a diagnostic reporting physical line 0
failure_scenario:  bbjcpl emits (or a future compiler version emits, or a malformed/truncated compiler invocation produces) an error line reporting physical line 0, or a line number exceeding the LSP client's document's actual line count; parseBbjcplOutput returns a Diagnostic with a negative range.start.line, outside the LSP Position contract (zero-based, non-negative), which can be rejected, clamped unpredictably, or cause a client-side rendering exception.
fix_applied:       bbj-cpl-parser.ts now computes `physicalLine = Math.max(0, parseInt(match[1], 10) - 1)`, clamping at zero instead of letting it go negative. A diagnostic on line 5 still maps to 4, unchanged.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/value-converter.test.ts test/lexer.test.ts test/cpl-parser.test.ts test/parser.test.ts test/example-files.test.ts — build succeeds, all 5 suites pass (234 passed, 1 pre-existing skip)
commit:            5528665 (red) + 7b6eff9 (green)
notes:             
```

```
row:               9
finding_id:        P61-D2-010
unit:              RU-61-03
location:          bbj-vscode/src/language/validations/check-variable-scoping.ts:205-220
dimension:         D2
severity:          medium
effort:            4
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at 869a330 — `npx vitest run test/variable-scoping.test.ts` failed 1/30: a class method's own correctly-ordered `x = 1` / `PRINT x` produced a spurious `'x' used before assignment (first assigned at line 9)` hint because a later program-scope `x = 99` existed
failure_scenario:  Any BBj program containing a class/method whose body assigns and then reads a local variable, where an unrelated Program-scope (or enclosing-method-scope) variable happens to share the same case-insensitive name and is assigned later in document order, produces a spurious "used before assignment" Hint on the method-local variable's perfectly valid read — a false positive traceable to the outer scope's traversal reaching into a nested scope it was documented not to enter.
fix_applied:       Branch taken: use the TreeStream iterator's `prune()` method directly (obtained via `.iterator()`, since `prune()` is only reachable on the iterator object, not through the for...of sugar). Pass 2's loop now calls `contentsIterator.prune()` for excluded MethodDecl/BbjClass/DefFunction subtrees instead of a bare `continue`, so no node inside an excluded subtree is visited.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/variable-scoping.test.ts test/builtin-functions-library.test.ts test/validation.test.ts — build succeeds, all 3 suites pass (76 passed)
commit:            869a330 (red) + b83d3e8 (green)
notes:             Branch taken: prune() over a manual recursive walk (smaller edit, no duplicated traversal logic). test/variable-scoping.test.ts pass count: 29 passing pre-fix (existing) + 1 failing (new) = 30 total pre-fix; 30/30 passing post-fix — no diagnostic set regression. `git show --stat b83d3e8` touches only check-variable-scoping.ts.
```

```
row:               10
finding_id:        P61-D2-011
unit:              RU-61-02
location:          bbj-vscode/src/language/bbj-type-inferer.ts:75-76
dimension:         D2
severity:          medium
effort:            4
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at 382a068 — `npx vitest run test/method-return-java-type.test.ts` failed 1/12: `expected [] to deeply equal [ Array(1) ]` (zero incompatible-type diagnostics found where one was expected), confirming getType() returned undefined for the unresolved-return-type call site
failure_scenario:  Any static or instance Java method call whose JavaMethod.resolvedReturnType has not (yet, or ever) been populated — a resolution race, a partially resolved class, or any future code path constructing/updating a JavaMethod outside java-interop.ts's own resolveClass() Phase 2 — causes bbj-type-inferer.ts to silently return no type for that call site, with no diagnostic explaining why. This matches DEBT-03's documented symptom (String.valueOf(2) assigns no type).
fix_applied:       In getTypeInternal's isJavaMethod branch (bbj-type-inferer.ts:75-76), fall back to `this.javaInterop.getResolvedClass(member.returnType)` when `member.resolvedReturnType?.ref` is undefined — resolving the always-present raw returnType string through the same class-resolution path the inferer already uses for a named Java type. No new export, no wider refactor.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/method-return-java-type.test.ts test/linking.test.ts — build succeeds, method-return-java-type.test.ts 12/12 pass, linking.test.ts's 11 failures are the pre-existing deterministic gate-set failures (unreachable java-interop peer), unrelated to and unchanged by this fix
commit:            382a068 (red) + 32faeff (green)
notes:             D-04 merge — this row and the P66-D2-001 row name the identical location and the identical edit; applied and committed once as a red/green pair citing both IDs, with both rows closed against that same commit pair. Reconciled as 2 records → 1 distinct edit in this file's Reconciliation section.
```

```
row:               11
finding_id:        P61-D2-013
unit:              RU-61-04
location:          bbj-vscode/src/language/bbj-completion-provider.ts:154-200
dimension:         D2
severity:          medium
effort:            4
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at 1b85860 — `npx vitest run test/completion-test.test.ts` failed 3/3 new cases: a pre-cancelled token still returned field-completion items, still called FileSystemProvider.readDirectory, and still called JavaInteropService.findClassCandidatesByPrefix
failure_scenario:  A user types quickly inside a type-reference position; the editor cancels an earlier completion request as a newer one supersedes it (standard LSP behavior on rapid keystrokes). The cancelled request's completeAutoImportClasses call is not interrupted — it continues running (including its java-interop round trip) to completion, wasting CPU and java-interop's single global resolution lock queue (RU-61-06) on a result that is discarded on arrival. getFieldCompletion and getFilePathCompletion have the identical gap: neither ever receives or checks the cancellation token.
fix_applied:       getCompletion (bbj-completion-provider.ts) now stores the request's cancelToken on a new activeCancelToken instance field and threads it as a direct parameter into getFieldCompletion and getFilePathCompletion. completeAutoImportClasses gained a cancelToken parameter too, supplied via activeCancelToken from completionForCrossReference (whose own signature is fixed by the base provider's interface and cannot carry the token directly). Each of the three methods checks cancelToken?.isCancellationRequested before starting work and again after its own await boundary, returning early on a pre-cancelled token; completeAutoImportClasses also forwards the token into JavaInteropService.findClassCandidatesByPrefix's own pre-existing (previously unused) token parameter.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/completion-test.test.ts test/file-path-completion.test.ts — build succeeds, both suites pass (77 passed, 1 pre-existing skip)
commit:            1b85860 (red) + eb7d843 (green)
notes:             grep -c 'isCancellationRequested' bbj-vscode/src/language/bbj-completion-provider.ts = 6, above the acceptance floor of 3.
```

```
row:               12
finding_id:        P61-D2-014
unit:              RU-61-04
location:          bbj-vscode/src/language/bbj-document-symbol-provider.ts:155,173-182
dimension:         D2
severity:          low
effort:            2
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at 6b8c2db — `npx vitest run test/document-symbol.test.ts` failed: `expect(positions.size).toBe(2)` — two DocumentSymbols sharing the same range.start but different range.end collapsed into 1 tracked position, not 2
failure_scenario:  In a document with parser errors under LARGE_FILE_THRESHOLD (triggering the deep-walk fallback, line 52), two distinct named nodes that happen to start at the identical line/character produce only one outline entry instead of two; the second node's symbol is dropped from recovery with no indication to the user that anything is missing from the outline.
fix_applied:       collectPositions and applyDeepWalkFallback's own position check (bbj-document-symbol-provider.ts) now key on both range.start AND range.end via a new shared private encodeRangeKey(range) helper (returns a string `${startLine}:${startChar}-${endLine}:${endChar}`), replacing the old `line * 100_000 + character` start-only numeric key in both places. The Set element type changed from number to string accordingly.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/document-symbol.test.ts — build succeeds, all 7 cases pass
commit:            6b8c2db (red) + 84373a6 (green)
notes:             Tested directly against the private collectPositions method with two synthetic DocumentSymbol objects sharing range.start, rather than a real BBj parse-error snippet — constructing a genuine BBj source that reproduces the exact same-start/different-end AST collision deterministically would depend on Chevrotain error-recovery internals that are not a stable contract to build a test against.
```

```
row:               13
finding_id:        P61-D2-015
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-ws-manager.ts:106-141
dimension:         D2
severity:          medium
effort:            4
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at c6bef67 — AssertionError: expected [ '/prefix-a/' ] to include '/prefix-b/'
failure_scenario:  A multi-root VS Code workspace has folder A (with project.properties defining PREFIX/classpath) and folder B (a second root, e.g. a shared library project with its own project.properties). If folder A is listed first, folder B's PREFIX/classpath settings are never read; if folder B is listed first, folder A's settings are ignored instead — either way, one root's Java classpath/PREFIX configuration is silently dropped, matching #33's report that VS Code multi-root workspaces "don't work".
fix_applied:       initializeWorkspace() previously read project.properties from folders[0] only and assigned this.settings from that single read. Restructured to loop over every workspace folder, read each one's project.properties, run each through parseSettings() (still passing the same shared config.bbx-derived prefixfromconfig, which is not per-folder), and push each folder's resulting prefixes/classpath into two accumulator arrays; this.settings is then assigned once from the merged arrays. The single-folder case is provably unchanged — with one folder, the loop's single iteration produces the exact same parseSettings() call and result the old code produced directly — and the zero-folder case still calls parseSettings("", undefined) exactly as before.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/ws-manager.test.ts test/use-project-root.test.ts test/imports.test.ts
commit:            c6bef67 (red) + 1f5e824 (green)
notes:             T-67-03-05 in this plan's threat model records the elevation-of-privilege angle (classpath merged from a second, less-trusted folder) as accepted risk, not mitigated — merging all folders is the documented intent of a multi-root workspace and is what this finding requires.
```

```
row:               14
finding_id:        P61-D2-016
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-ws-manager.ts:179-182
dimension:         D2
severity:          medium
effort:            2
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at d0b1666 — AssertionError: expected "error" to be called at least once
failure_scenario:  A malformed project.properties file, or an unexpected synchronous throw inside parseSettings()/collectPrefixes(), causes initializeWorkspace() to exit its try block early. this.settings is left undefined or partially-populated; later calls to getSettings() (consumed by bbj-document-builder.ts and main.ts) silently receive that partial/undefined state, with no signal to the user beyond a raw console.error line — no logger.error, no connection.window.showErrorMessage.
fix_applied:       Removed the misleading `// all fine` comment and the bare console.error(e) call. The catch block now reads `logger.error(\`Workspace initialization failed: ${e}\`)`, so any exception thrown during setup (settings/javadoc/classpath/implicit-import) reaches the language server's own logger instead of a raw, easy-to-miss console line. Chose logger.error alone over bbj-notifications.ts's client-notification path: bbj-ws-manager.ts does not already import bbj-notifications.ts, and the finding's own test-5 clause accepts logger.error as sufficient.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/ws-manager.test.ts test/use-project-root.test.ts test/imports.test.ts
commit:            d0b1666 (red) + c47da5c (green)
notes:             This same commit's comment removal also resolves P61-D8-006 (row 43, closed no-op against this commit) — the misleading "all fine" comment its record complains about is the exact comment this fix deletes.
```

```
row:               15
finding_id:        P61-D2-017
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-document-builder.ts:155-190
dimension:         D2
severity:          medium
effort:            2
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at 26576ae — AssertionError: expected "error" to be called at least once, plus an actual unhandled promise rejection ("Error: cpl compile boom") reported by vitest for the same run
failure_scenario:  cplService.compile(key) (or notifyDocumentPhase) rejects — e.g. an unexpected error inside BBjCPLService's process-spawn/parse path. The async setTimeout callback's returned promise rejects with no attached handler, surfacing as an unhandledRejection at the Node process level rather than being caught and logged in-context.
fix_applied:       Wrapped the entire debouncedCompile() setTimeout callback body (diagnostic clearing, BBjCPLService resolution, compile(), diagnostic merging, notifyDocumentPhase()) in a try/catch. On failure, logs `logger.error(\`BBjCPL debounced compile failed for ${key}: ${e}\`)` and returns, so one bad compile no longer escapes as an unhandled rejection and the rest of the build continues.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/document-builder.test.ts test/lazy-prefix-loading.test.ts
commit:            26576ae (red) + 38dea2e (green)
notes:             The red commit's test run is the direct evidence for T-67-03-03 in this plan's threat model (an unhandled callback throw aborting/destabilizing the document build).
```

```
row:               16
finding_id:        P61-D2-019
unit:              RU-61-07
location:          bbj-vscode/src/language/lib/events.ts:57,528,62,533
dimension:         D2
severity:          low
effort:            2
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at d1e86e6 — `npx vitest run test/builtin-functions-library.test.ts` failed 1/3: found duplicate event names `ON_MOUSE_ENTER, ON_MOUSE_EXIT`
failure_scenario:  A reference to ON_MOUSE_ENTER or ON_MOUSE_EXIT always resolves to the first declaration (line 57/62); the second declaration's distinct DOCU text is permanently unreachable by linking. Completion's getAllElements() has no dedup, so a user completing an ON_MOUSE_ENTER/ON_MOUSE_EXIT handler sees the same label offered twice, indistinguishable except by which duplicate's hover text happens to be shown.
fix_applied:       Branch taken: merge (the two declarations differ in DOCU text only — "Window Mouse Enter"/"Window Mouse Exit" vs "Mouse Enter Event"/"Mouse Exit Event" — so both phrasings are preserved as a union, e.g. "Window Mouse Enter / Mouse Enter Event", in the kept line-57/62 declaration). The duplicate eventtype block at lines 525-533 is removed. events.bbl (the physical catalog mirror) is unchanged — confirmed dead per Phase 61 Plan 07 (RU-61-07): not read by any runtime consumer or test, only the .ts-exported string is used.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/variable-scoping.test.ts test/builtin-functions-library.test.ts test/validation.test.ts — build succeeds, all 3 suites pass (76 passed)
commit:            d1e86e6 (red) + 3b18ac9 (green)
notes:             Red test added to test/builtin-functions-library.test.ts directly (not a new test/events-library.test.ts) — that file's existing harness (createBBjServices + initializeWorkspace) already loads the bbjlib:///events.bbl document via the same WorkspaceManager.loadAdditionalDocuments path that loads functions.bbl, so it reaches lib/events.ts's content. `git show --stat 3b18ac9` touches only lib/events.ts.
```

```
row:               17
finding_id:        P61-D3-001
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:40-48
dimension:         D3
severity:          low
effort:            4
verdict:           applied
test_required:     yes (D-11 D3)
fail_before:       observed at 7a4448d
failure_scenario:  A long-running editor session against a large/varied classpath (many `use`d packages over time) grows these maps without bound, increasing steady-state memory usage monotonically until the server is restarted.
fix_applied:       Added LruMap<K,V> (a Map wrapper evicting the least-recently-used entry once a size cap is exceeded) and bound _resolvedClasses to it via the new named constant RESOLVED_CLASSES_CACHE_LIMIT (5000, a discretionary choice — no number is named by the finding record; large enough for a typical project's resolved classpath while still bounding steady-state growth). childrenOfByName and _pendingResolutions were left unbounded: the record's own location (40-48) and test-5 clause name only _resolvedClasses as the exact edit, and both other maps are transient/short-lived by construction (_pendingResolutions entries are deleted in resolveClassByName's finally block; childrenOfByName grows proportionally to _resolvedClasses's own distinct-package count, not independently).
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/java-interop-service.test.ts test/method-return-java-type.test.ts test/imports.test.ts
commit:            7a4448d (red) + 6d7be38 (green)
notes:             Cap value (5000) is a discretionary choice, named as a constant per the plan's own instruction; the test file imports the constant from source rather than duplicating the literal, so the two can never drift.
```

```
row:               18
finding_id:        P61-D3-004
unit:              RU-61-04
location:          bbj-vscode/src/language/bbj-completion-provider.ts:90-116
dimension:         D3
severity:          medium
effort:            4
verdict:           applied
test_required:     yes (D-11 D3)
fail_before:       observed at a1a90cd — `npx vitest run test/completion-test.test.ts` failed: `expect(findSpy).toHaveBeenCalledTimes(1)` — two completion requests for the identical prefix called findClassCandidatesByPrefix 4 times (Langium's own completion engine invokes completionForCrossReference more than once per cross-reference feature at a single offset, so even one request alone produced 2 calls)
failure_scenario:  Typing a Java class name prefix character-by-character inside a type reference (e.g. "H", "Ha", "Has", "Hash", "HashM", "HashMa", "HashMap") in a workspace with a large classpath re-runs the full completeClassIndex/resolvedClasses scan on every keystroke from the second character onward; against an unresponsive java-interop peer, the same keystrokes each risk stalling the completion popup for the connect-timeout window.
fix_applied:       completeAutoImportClasses (bbj-completion-provider.ts) now routes findClassCandidatesByPrefix through a new findClassCandidatesByPrefixCached helper, backed by a new autoImportPrefixCache instance field (Map<string, {promise, cachedAt}>) keyed on the lowercased prefix. The cache stores the in-flight Promise itself, not just its resolved value — Langium's completion engine awaits every matched grammar feature concurrently via Promise.all, so two completeAutoImportClasses calls for the same prefix within one request can both reach the cache before either resolves; sharing the in-flight promise dedupes that race as well as ordinary sequential repeats. Bounded by a 20-entry LRU-style size cap and a 2000ms TTL. Not document-scoped — cache key is the prefix alone, argued safe in this row's notes below (T-67-04-04).
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/completion-test.test.ts test/file-path-completion.test.ts — build succeeds, both suites pass (77 passed, 1 pre-existing skip); the P61-D3-004 test asserts both the reduced call count (1, not 4) and result-set equality between the first (uncached) and second (cached) completion's offered labels
commit:            a1a90cd (red) + 0aaece2 (green)
notes:             Invalidation trigger (D-11): a 2000ms TTL per cache entry plus a 20-entry LRU-style size cap — no explicit event-driven invalidation (e.g. on JavaInteropService.clearCache()) was wired, since that would require touching java-interop.ts / main.ts outside this task's file scope. The TTL bounds staleness against the class index growing mid-session to at most 2s, which self-heals on the next keystroke for that prefix; a cache with no invalidation story at all would have been the exact stale-completion bug T-67-04-02 warns against. Cache key is the lowercased prefix only, not per-document (T-67-04-04): findClassCandidatesByPrefix's result depends solely on JavaInteropService's workspace-wide class index, which every document shares, so a hit computed for one document's prefix is exactly the answer another document's identical prefix would compute — not a cross-document data leak.
```

```
row:               19
finding_id:        P61-D3-005
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-document-builder.ts:359-411
dimension:         D3
severity:          medium
effort:            4
verdict:           applied
test_required:     yes (D-11 D3)
fail_before:       observed at fc9cf79 — AssertionError: expected 4 to be less than or equal to 1
failure_scenario:  A workspace with a large indexed class count and several documents each carrying multiple unresolved USE-file diagnostics triggers, on every incremental rebuild touching those documents, one full pass over the entire workspace's BbjClass index per unresolved diagnostic — cost scales with total indexed classes x unresolved diagnostics per rebuild, not with the size of the file(s) actually being edited.
fix_applied:       revalidateUseFilePathDiagnostics() called indexManager.allElements(BbjClass.$type) inside the per-diagnostic .some() filter callback — once per unresolved-USE diagnostic in the batch. Now builds a `Map<string, AstNodeDescription>` (normalized lowercase fsPath -> the BbjClass description) once per call, before the per-document loop, and the per-diagnostic check becomes a Map.has() lookup against that same Map. Result equivalence is structural: both the old and new checks compare the same normalized/lowercased fsPath values for equality, just against a Set-backed Map instead of a fresh linear scan.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/document-builder.test.ts test/lazy-prefix-loading.test.ts
commit:            fc9cf79 (red) + 6b32823 (green)
notes:             This is the direct fix for T-67-03-01 in this plan's threat model (denial-of-service via the per-lookup allElements() rescan); the regression test asserts both the bounded call count and result equivalence, per that threat's stated mitigation.
```

```
row:               20
finding_id:        P61-D4-003
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:175-314
dimension:         D4
severity:          low
effort:            4
verdict:           applied
test_required:     no (D-11 D4)
fail_before:       inapplicable — D4 trace-tier finding, no regression test per D-11
failure_scenario:  n/a (D4 trace-tier finding): a change to the shared connect+send+catch shape (e.g. adding a retry, or the circuit breaker recommended by P61-D3-002) must be applied in up to 4 places by hand, risking drift between them.
fix_applied:       Extracted a private sendRequestSafe<P,R>(request, params, fallback, token) helper implementing the shared connect+send+catch(log,return-fallback) shape, and routed loadClasspath() through it. getRawClass (timeout race, no fallback-value semantics), loadImplicitImports (multiple nested per-package requests with per-item processing), and ensureCompleteClassIndex (METHOD_NOT_FOUND-specific latch plus success-path side effects) each carry logic beyond the plain shape and were intentionally left unrouted rather than force-fit, to avoid a behaviour-changing refactor beyond what the record's exact-edit clause asks for.
user_facing:       no
verification:      cd bbj-vscode && npm run build && npx vitest run test/java-interop-service.test.ts test/method-return-java-type.test.ts test/imports.test.ts
commit:            8c9028c
notes:             Only 1 of the 4 call sites named in the record's location range was routed through the new helper; the acceptance criterion (at least one call site) is met. The other 3 sites' reasons for exclusion are documented in the helper's own doc comment in source.
```

```
row:               21
finding_id:        P61-D4-005
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj-token-builder.ts:7-64
dimension:         D4
severity:          low
effort:            4
verdict:           applied
test_required:     no (D-11 D4)
fail_before:       inapplicable — D4 trace-tier finding, no regression test per D-11
failure_scenario:  n/a (D4 trace-tier finding — the code shape itself is the defect, not a runtime failure): a future change to token priority ordering (the spliceToken block) risks an accidental edit inside the unrelated ID-category-wiring block, since both operate on the same local `tokens` variable with no named boundary between them.
fix_applied:       Extracted the 14 hardcoded spliceToken calls (lines 21-34 of the pre-fix buildTokens) into a new private reorderTokenPriorities(tokens) method, called once from buildTokens in their place. Behaviour-preserving: same 14 custom token names, same call order, same spliceToken implementation — only the grouping changed. Per this plan's own exact-edit scope, only reorderTokenPriorities was extracted; the record's evidence text also names a second wireIdCategories(tokens, terminalTokens) extraction for the ID/LONGER_ALT wiring block, which this plan's task text did not include and which was left in buildTokens unchanged.
user_facing:       no
verification:      cd bbj-vscode && npm run build && npx vitest run test/lexer.test.ts test/parser.test.ts test/example-files.test.ts — build succeeds, all 3 suites pass (225 passed, 1 pre-existing skip), confirming tokenization is unchanged after the extraction
commit:            6be6639
notes:             grep -c 'reorderTokenPriorities' bbj-vscode/src/language/bbj-token-builder.ts = 2 (definition + one call site).
```

```
row:               22
finding_id:        P61-D4-006
unit:              RU-61-03
location:          bbj-vscode/src/language/bbj-validator.ts:266-311
dimension:         D4
severity:          low
effort:            2
verdict:           applied
test_required:     no (D-11 D4)
fail_before:       inapplicable — D-11 classifies this dimension as no-behaviour-change, so there is no failing state to observe
failure_scenario:  n/a (D4 trace-tier finding — the code shape itself is the defect, not a runtime failure): ~46 lines of dead, unreachable code sit alongside the working implementation with an almost-identical name and shape; a future
fix_applied:       Deleted BBjValidator.checkClassReference (266-303) and its private isSubFolderOf helper (305-311). Confirmed both are dead: registerValidationChecks() never registers checkClassReference as a check, and check-classes.ts's registerClassChecks() uses its own separately-instantiated ClassValidator (a different class) whose own checkClassReference (check-classes.ts:112) is the copy actually called at every real site (Use, BbjClass extends/implements, ConstructorCall, MethodDecl, FieldDecl, ParameterDecl, VariableDecl). The two copies are equivalent in the visibility-check logic they share; check-classes.ts's copy is strictly more complete (adds warnUnresolvableType for #438), confirming it — not the dead copy — as the intended implementation, so the branch taken is delete, not wire-up. Also removed the imports (dirname, isAbsolute, relative, Reference, DiagnosticInfo) that became unused as a result.
user_facing:       no
verification:      cd bbj-vscode && npm run build && npm run lint && npx vitest run test/linking.test.ts test/imports.test.ts test/unresolvable-type.test.ts test/validation.test.ts test/classes.test.ts — build and lint both exit 0 (lint zero warnings); Test Files 1 failed | 4 passed (5), Tests 11 failed | 137 passed | 1 skipped (149)
commit:            906ca51
notes:             This plan's own pre-edit `npm test` capture step was not re-run as a separate command immediately before this first edit; 67-BASELINE.md's phase-start capture (the same 11 named test/linking.test.ts Interop-related-tests failures, captured before any Phase 67 plan touched bbj-validator.ts) is the equivalent "before" reference. Each of Task 1's four edits was verified via the targeted vitest set immediately after landing and returned the same 11 failures / 137 passed / 1 skipped every time; Task 3's full three-run `npm test` delta below (`### Plan 67-06 delta`) independently confirms the identical 11-name set with zero regression across the whole plan. checkClassReference was `public`, so its call sites were also grepped across bbj-intellij's Kotlin/Java sources (n/a — TypeScript-only symbol) and test/ (zero hits) before deleting.
```

```
row:               23
finding_id:        P61-D4-008
unit:              RU-61-02
location:          bbj-vscode/src/language/bbj-linker.ts:155-212
dimension:         D4
severity:          low
effort:            2
verdict:           applied
test_required:     no (D-11 D4)
fail_before:       inapplicable — D-11 classifies this dimension as no-behaviour-change, so there is no failing state to observe
failure_scenario:  n/a (D4 trace-tier finding — the code shape itself is the defect, not a runtime failure): a change to the workspace-root resolution strategy (e.g. supporting multi-root workspaces properly instead of always
fix_applied:       getSourceLocation and getSourceLocationForNode duplicated the same workspace-root resolution and relative-path/line formatting shape. Extracted private resolveWorkspaceRoot(documentUri) (first workspace folder's fsPath, falling back to dirname(documentUri.fsPath)) and formatSourceLocation(uri, line) (`<relative-path>[:<line>]`, line 0 omits the suffix), and routed both call sites through them. Behaviour-preserving by construction: both original functions built the identical `${relativePath}${lineInfo}` / `line > 0 ? ... : relativePath` shape from the identical workspace-root logic, now expressed once.
user_facing:       no
verification:      cd bbj-vscode && npm run build && npm run lint && npx vitest run test/linking.test.ts test/imports.test.ts test/unresolvable-type.test.ts — build/lint exit 0; Test Files 1 failed | 2 passed (3), Tests 11 failed | 57 passed | 1 skipped (69), the same 11 named test/linking.test.ts failures whose messages embed these exact location strings (e.g. `[in 38.bbj:2]`, `[in 38.bbj:3]`) — byte-identical to pre-extraction output
commit:            7d03fc0
notes:             grep -c 'formatSourceLocation' bbj-vscode/src/language/bbj-linker.ts = 3 (declaration + 2 call sites), satisfying the acceptance criterion.
```

```
row:               24
finding_id:        P61-D4-009
unit:              RU-61-02
location:          bbj-vscode/src/language/assertions.ts:1-4
dimension:         D4
severity:          low
effort:            2
verdict:           applied
test_required:     no (D-11 D4)
fail_before:       inapplicable — D-11 classifies this dimension as no-behaviour-change, so there is no failing state to observe
failure_scenario:  n/a (D4 trace-tier finding — dead code, not a runtime failure): the module ships in the bundle with no consumer; a future contributor cannot tell from the code alone whether it is vestigial or intentionally kept for future use.
fix_applied:       Deleted bbj-vscode/src/language/assertions.ts (the 4-line assertTrue helper) after re-confirming zero consumers at HEAD: `grep -rn 'assertions.js|assertTrue' bbj-vscode/src bbj-vscode/test` returned only the file's own definition line, matching Phase 61's original zero-consumer finding.
user_facing:       no
verification:      cd bbj-vscode && npm run build && npm run lint — both exit 0 (lint zero warnings); `grep -rn 'assertions.js' bbj-vscode/src bbj-vscode/test` returns no hits post-deletion
commit:            8d166cc
notes:             `git show --stat 8d166cc` touches only bbj-vscode/src/language/assertions.ts, a pure deletion (5 lines removed, no other file).
```

```
row:               25
finding_id:        P61-D4-010
unit:              RU-61-04
location:          bbj-vscode/src/language/bbj-document-symbol-provider.ts:75,149
dimension:         D4
severity:          low
effort:            1
verdict:           applied
test_required:     no (D-11 D4)
fail_before:       inapplicable — D4 trace-tier finding, no regression test per D-11; `npm run lint` itself is the regression check
failure_scenario:  n/a (D4 trace-tier finding — the lint warning itself is the defect, not a runtime failure): the directives no longer suppress anything, adding noise to `npm run lint`'s output and masking whether a future, genuinely-needed eslint-disable nearby is intentional or another unused leftover.
fix_applied:       Deleted the two `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments at bbj-document-symbol-provider.ts:75 (getSymbol's error-recovery `(astNode as any).name` read) and :149 (applyDeepWalkFallback's deep-walk `(node as any).name` read). Neither `as any` read actually trips that rule (confirmed by the baseline's own "Unused eslint-disable directive" warning text), so both directives were pure noise.
user_facing:       no
verification:      cd bbj-vscode && npm run lint — exits 0 with zero warnings (previously: exit 0, 2 warnings)
commit:            91f8329
notes:             effort recorded as `1` in the source record — an off-scale value outside INVENTORY §3d's locked {2,4,8} effort scale. Carried through unchanged per this phase's off-scale handling instruction; not re-rounded to `2`. (The source record itself carries no additional inline annotation beyond the raw `effort: 1` value.) This is the same edit D-10 identifies as clearing both of npm run lint's pre-existing warnings — confirmed: `git show --stat 91f8329` touches only bbj-vscode/src/language/bbj-document-symbol-provider.ts, 2 lines deleted, no other file.
```

```
row:               26
finding_id:        P61-D4-012
unit:              RU-61-05
location:          bbj-vscode/src/language/main.ts:32-73,147-188
dimension:         D4
severity:          medium
effort:            4
verdict:           applied
test_required:     no (D-11 D4)
fail_before:       inapplicable — D-11 classifies this dimension as no-behaviour-change, so there is no failing state to observe
failure_scenario:  n/a (D4 trace-tier finding — the code shape itself is the defect, not a runtime failure): a future change to this reload-and-revalidate sequence (e.g. adding a new step, or fixing P61-D2-016/P61-D2-018) must be applied by
fix_applied:       The bbj/refreshJavaClasses request handler and the onDidChangeConfiguration handler duplicated the same clear-cache/reload-classpath/reload-implicit-imports/re-validate-open-documents/refresh-inlay-hints/notify sequence. Extracted a private async reloadJavaClassesAndRevalidate() and routed both handlers through it; each handler keeps its own distinct wrapping (the request handler's try/catch returns true/false and calls showErrorMessage on failure, the config-change handler's try/catch only logs — both preserved unchanged, only the shared middle sequence moved).
user_facing:       no
verification:      cd bbj-vscode && npm run build && npm run lint — build exits 0 and produces out/language/main.cjs (the single binary both IDEs consume, confirmed via `ls -la out/language/main.cjs`); lint exits 0 with zero warnings
commit:            76ccb8b
notes:             `grep -c 'reloadJavaClassesAndRevalidate' bbj-vscode/src/language/main.ts` = 3 (declaration + 2 call sites), satisfying the acceptance criterion. main.ts compiles into out/language/main.cjs, so npm run build (not vitest alone) is the required gate on this commit per the plan's own instruction.
```

```
row:               27
finding_id:        P61-D5-004
unit:              RU-61-01
location:          bbj-vscode/test/example-files.test.ts:16-20
dimension:         D5
severity:          low
effort:            2
verdict:           applied
test_required:     test-is-the-fix (D-13)
fail_before:       inapplicable — a D5 row adds a missing test against code that already works, so no red state is producible (D-13)
failure_scenario:  A future .bbj file added to test/test-data/ that fails to lex or parse would NOT fail this test, silently defeating the regression-test guarantee CLAUDE.md's Testing Pattern section states: "Every .bbj file in
fix_applied:       Replaced the fire-and-forget `.forEach(async file => ...)` with a `for...of` loop that awaits each parse and asserts sequentially, so a lexer/parser error in any test/test-data/*.bbj file now fails the test instead of becoming an unhandled rejection the resolved promise swallowed. No source change.
user_facing:       no
verification:      cd bbj-vscode && npx vitest run test/example-files.test.ts — 1/1 pass
commit:            6af46c8
notes:             anti-vacuous: blast-radius check performed per the plan's own <behavior> clause — added a deliberately malformed .bbj file to test/test-data/ locally, ran the fixed test, observed it fail with a lexer error ("expected [ { offset: 63, line: 3, ... } ] to be empty"), deleted the fixture, confirmed the test passed again (1/1). The fixed test also passed cleanly against the existing, already-committed test-data/ fixtures on the first run — no pre-existing parse defect was uncovered, so there is nothing to carry forward to Phase 68. `git status --porcelain bbj-vscode/test/test-data/` is empty at HEAD.
```

```
row:               28
finding_id:        P61-D5-005
unit:              RU-61-03
location:          bbj-vscode/test/cpl-service.test.ts:1-133
dimension:         D5
severity:          medium
effort:            2
verdict:           applied
test_required:     test-is-the-fix (D-13)
fail_before:       inapplicable — a D5 row adds a missing test against code that already works, so no red state is producible (D-13)
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a future change to getBbjcplPath()/compile()'s path-validation behavior (e.g. a fix for P61-D1-003) has no existing regression test to confirm it
fix_applied:       Branch taken: the record's test-5 clause offers two branches — assert the spawn is rejected once P61-D1-003 is fixed, or document the current unvalidated behaviour explicitly. P61-D1-003 is classified major-refactor by INVENTORY §3c test 6 and routes to Phase 68, so the "assert rejection" branch is unavailable in this phase; took the "document current behaviour" branch. Added a new controlled fixture, test/test-data/cpl-fixture-bbjhome/bin/bbjcpl (a shell script this repo owns, never an external path or writable temp dir per threat T-67-07-02), and a test in cpl-service.test.ts pointing bbjHome at it and asserting compile() spawns and trusts the substitute binary unvalidated — pinning that getBbjcplPath() applies no signature/checksum/path validation today. No source change.
user_facing:       no
verification:      cd bbj-vscode && npx vitest run test/cpl-service.test.ts — 9/9 pass
commit:            500001d
notes:             names P61-D1-003 as the finding that will change this behaviour, per the record's own branch-choice instruction. anti-vacuous: getBbjcplPath() temporarily forced to `return undefined` locally (simulating a P61-D1-003 validation rejection), ran the test, observed it fail ("expected [] to have a length of 1 but got +0"), reverted, confirmed the test passed again (9/9).
```

```
row:               29
finding_id:        P61-D5-006
unit:              RU-61-03
location:          bbj-vscode/src/language/validations/line-break-validation.ts:294-318
dimension:         D5
severity:          low
effort:            2
verdict:           applied
test_required:     test-is-the-fix (D-13)
fail_before:       inapplicable — a D5 row adds a missing test against code that already works, so no red state is producible (D-13)
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a regression in hasLinebreakBefore/hasLinebreakAfter's CRLF or final-line handling would pass the full npm test suite undetected, because no test
fix_applied:       New file bbj-vscode/test/line-break-validation.test.ts (Shared Pattern A), covering CRLF line endings, a missing trailing newline at EOF, and both combined, asserting no spurious "needs to start in a new line" diagnostic in any case. `test/validation.test.ts` is shared by several plans' targets, so a dedicated file keeps this row's diff attributable, per the plan's own instruction. No source change.
user_facing:       no
verification:      cd bbj-vscode && npx vitest run test/line-break-validation.test.ts — 3/3 pass
commit:            d080471
notes:             anti-vacuous: lineStartRegex temporarily broken to `/^NEVERMATCH$/` locally, ran the test, observed 2/3 fail ("expected [ {...}, {...} ] to have a length of +0 but got 2"), reverted, confirmed 3/3 passed again.
```

```
row:               30
finding_id:        P61-D5-007
unit:              RU-61-02
location:          bbj-vscode/src/language/bbj-overload-selector.ts:32-52
dimension:         D5
severity:          medium
effort:            2
verdict:           applied
test_required:     test-is-the-fix (D-13)
fail_before:       inapplicable — a D5 row adds a missing test against code that already works, so no red state is producible (D-13)
failure_scenario:  n/a (D5 trace-tier finding — missing test, not a runtime failure): a future change to the tie-break comparison (e.g. `>` to `>=` on line 46) would silently flip which overload wins ties with no test catching the regression.
fix_applied:       New file bbj-vscode/test/overload-selector.test.ts, driving findBestOverload directly (its one production call site is bbj-inlay-hint-provider.ts:65) against two real MethodDecl overloads of foo() parsed from a live class, both scoring identically against an unknown-typed argument — an exact tie — asserting the linked declaration (passed first) wins over the equally-scored sibling. No source change.
user_facing:       no
verification:      cd bbj-vscode && npx vitest run test/overload-selector.test.ts — 1/1 pass
commit:            64c9d1e
notes:             anti-vacuous: the tie comparison temporarily changed from `score > bestScore` to `score >= bestScore` locally, ran the test, observed it fail (expected the linked String overload, received the sibling Object overload), reverted, confirmed the test passed again.
```

```
row:               31
finding_id:        P61-D5-008
unit:              RU-61-02
location:          bbj-vscode/src/language/bbj-scope.ts:253-292
dimension:         D5
severity:          medium
effort:            2
verdict:           applied
test_required:     test-is-the-fix (D-13)
fail_before:       inapplicable — a D5 row adds a missing test against code that already works, so no red state is producible (D-13)
failure_scenario:  n/a (D5 trace-tier finding — missing test, not a runtime failure): a future change to the local-vs-member scope nesting order in this branch would go undetected by the existing test suite.
fix_applied:       Added a P61-D5-008 describe block to the existing test/variable-scoping.test.ts (the established home for scoping assertions, per the plan). Declares a class field and a same-named DECLAREd local in one method, then confirms a plain reference to the name resolves to the local VariableDecl, not the FieldDecl. No source change.
user_facing:       no
verification:      cd bbj-vscode && npx vitest run test/variable-scoping.test.ts — 31/31 pass
commit:            1b8e786
notes:             isVariableDecl's $type union also matches FieldDecl/ArrayDecl/ParameterDecl, so the test narrows to node.$type === 'VariableDecl' to distinguish the local from the field — documented inline. anti-vacuous: local-scope registration for DECLARE statements temporarily disabled locally (bbj-scope-local.ts's addToScope call gated behind `&& false`), ran the test, observed it fail (the reference resolved to undefined instead of the local), reverted, confirmed 31/31 passed again.
```

```
row:               32
finding_id:        P61-D5-009
unit:              RU-61-02
location:          bbj-vscode/src/language/bbj-type-inferer.ts:73-78
dimension:         D5
severity:          medium
effort:            2
verdict:           applied
test_required:     test-is-the-fix (D-13)
fail_before:       inapplicable — a D5 row adds a missing test against code that already works, so no red state is producible (D-13)
failure_scenario:  n/a (D5 trace-tier finding — missing test, not a runtime failure): a fix to P61-D2-011 without an accompanying regression test would leave this specific gap open independently — the underlying bug and the missing test are two
fix_applied:       Added a committed test asserting the inferred type of a static Java method call (String.valueOf(2) infers to java.lang.String) via the type inferer service directly — distinct from P61-D2-011/P66-D2-001's diagnostic-message assertion. No source change; the test-is-the-fix per D-13.
user_facing:       no
verification:      cd bbj-vscode && npx vitest run test/method-return-java-type.test.ts — 13/13 pass
commit:            2b121ee
notes:             
```

```
row:               33
finding_id:        P61-D5-011
unit:              RU-61-04
location:          bbj-vscode/src/language/bbj-signature-help-provider.ts:17-118
dimension:         D5
severity:          medium
effort:            2
verdict:           applied
test_required:     test-is-the-fix (D-13)
fail_before:       inapplicable — a D5 row adds a missing test against code that already works, so no red state is producible (D-13)
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a regression in the active-parameter calculation (getActiveParameter), the rendered signature label, or the markdown documentation block would pass the
fix_applied:       Added a "Signature help (P61-D5-011)" describe block to the EXISTING test/functional/lsp-features.test.ts — that file already existed, so per the record's own escape clause no new test/signature-help.test.ts was created. Calls provideSignatureHelp on a real MethodCall (a class method call via `#add(1, 2)`), asserting the returned label, parameter labels, markdown documentation content, and activeParameter for both the first- and second-argument cursor positions. No source change.
user_facing:       no
verification:      cd bbj-vscode && npx vitest run test/functional/lsp-features.test.ts — 19/19 pass
commit:            e0acbbf
notes:             home decision: test/functional/lsp-features.test.ts used (not a new file) because it already existed at plan-execution time — recorded per the plan's own instruction. anti-vacuous: getActiveParameter() temporarily hardcoded to `return 0;` locally, ran the test, observed it fail (expected activeParameter 1, received 0), reverted, confirmed 19/19 passed again.
```

```
row:               34
finding_id:        P61-D5-012
unit:              RU-61-04
location:          bbj-vscode/src/language/bbj-hover.ts:55-109
dimension:         D5
severity:          medium
effort:            2
verdict:           applied
test_required:     test-is-the-fix (D-13)
fail_before:       inapplicable — a D5 row adds a missing test against code that already works, so no red state is producible (D-13)
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a regression in inherited-field detection (e.g. always reporting "inherited"), the Javadoc-provider integration, or the error-degrade path silently
fix_applied:       Added three cases to the existing test/hover.test.ts, calling getHoverContent directly: (1) a documented BBj class member (REM /** */ doc comment) renders as markdown; (2) an inherited field is marked "inherited from Base" — empirically found this branch only fires when the hovered field's own CST node is itself the receiver of an outer MemberCall (a chained access like `d!.x.y`, not a direct one-hop `d!.x`), and the field must itself be BbjClass-typed for isBbjClass(receiverType) to hold, both documented inline in the test; (3) a mocked typeInferer.getType throw during hover computation degrades to undefined instead of rejecting, per the outer try/catch (with a passing baseline call proving the mock is what changes the outcome). No source change.
user_facing:       no
verification:      cd bbj-vscode && npx vitest run test/hover.test.ts — 7/7 pass
commit:            42b8881
notes:             discovered during test construction (not a new finding, just documented so a future reader doesn't assume a simple one-hop repro works): the inherited-field check's `referenceNode.$container` test only matches nested/chained member access, not the more intuitive direct one-hop case — recorded inline in the test's own comment, no ledger action taken since the code's documented/observed behaviour is what the test pins. anti-vacuous: all three cases broken and reverted independently (comment lookup replaced with `undefined`, the inheritance `if` condition forced `false`, and the outer try/catch removed) — each observed RED, then reverted; 7/7 passed again after each revert.
```

```
row:               35
finding_id:        P61-D5-015
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-notifications.ts:1-53
dimension:         D5
severity:          low
effort:            2
verdict:           applied
test_required:     test-is-the-fix (D-13)
fail_before:       inapplicable — a D5 row adds a missing test against code that already works, so no red state is producible (D-13)
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a regression in the dedup guard (e.g. always sending, or never sending after the first call) would pass `npm test` undetected.
fix_applied:       New file bbj-vscode/test/notifications.test.ts, mocking a Connection-shaped object and asserting: notifyBbjcplAvailability/notifyJavaConnectionError are no-ops before initNotifications() is called; notifyBbjcplAvailability only sends when the available value actually changes (dedup guard); notifyJavaConnectionError interpolates the error detail into its window/showMessage call. Each test resets the module registry and dynamically re-imports (`vi.resetModules()`), isolating each test from the module's own singleton state (_connection, bbjcplAvailableState). No source change.
user_facing:       no
verification:      cd bbj-vscode && npx vitest run test/notifications.test.ts — 3/3 pass
commit:            540232c
notes:             anti-vacuous: two independent breaks performed and reverted — (1) the dedup guard's `if (bbjcplAvailableState !== available)` forced to `if (true)`, observed the dedup test fail (expected 1 call, got 3), reverted; (2) the null-check `_connection?.sendNotification` changed to a non-null assertion `_connection!.sendNotification`, observed the no-op-before-init test fail with a TypeError, reverted. 3/3 passed again after each revert.
```

```
row:               36
finding_id:        P61-D5-016
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-document-builder.ts:90-222
dimension:         D5
severity:          medium
effort:            4
verdict:           applied
test_required:     test-is-the-fix (D-13)
fail_before:       inapplicable — a D5 row adds a missing test against code that already works, so no red state is producible (D-13)
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a regression in the debounce timing, the lazy-availability-check's once-only guard, or the trigger-mode dispatch (P61-D2-017's unhandled-rejection gap included) would pass npm test undetected.
fix_applied:       Added two direct assertions against a BBjDocumentBuilder constructed with a mocked ServiceRegistry (BBjCPLService.compile as a vi.fn()) and mocked TextDocuments, reusing the same harness the P61-D2-017/P61-D3-005 tests in this same file build: (1) trackBbjcplAvailability() called twice only calls the (mocked) notifyBbjcplAvailability once, proving the bbjcplAvailable !== undefined once-only guard; (2) debouncedCompile() called three times rapidly for the same document, then the 500ms debounce window advanced once via vitest fake timers, only calls compile() once, proving the clearTimeout-on-resave trailing-edge debounce. Both assertions passed immediately against the unmodified implementation — no source change, per D-13.
user_facing:       no
verification:      cd bbj-vscode && npm run build && npx vitest run test/document-builder.test.ts test/lazy-prefix-loading.test.ts
commit:            5db3ac9 (test)
notes:             D-13 test-is-the-fix: both assertions passed on the first run against the existing implementation, confirming the trigger/debounce/availability-detection logic already behaves correctly — the gap this record closes is purely the missing direct test coverage.
```

```
row:               37
finding_id:        P61-D5-017
unit:              RU-61-07
location:          bbj-vscode/test/builtin-functions-library.test.ts
dimension:         D5
severity:          medium
effort:            4
verdict:           applied
test_required:     test-is-the-fix (D-13)
fail_before:       inapplicable — a D5 row adds a missing test against code that already works, so no red state is producible (D-13)
failure_scenario:  A malformed entry added to labels.ts, variables.ts or events.ts (e.g. a name colliding with a reserved keyword, breaking the LibSymbolicLabel/ LibVariable/LibEventType parse) silently disables completion/hover for
fix_applied:       New file bbj-vscode/test/builtin-library-members.test.ts mirroring builtin-functions-library.test.ts's shape: parse-guard + named-entry assertions for labels.ts/variables.ts/events.ts's virtual documents. Also added the record's named .ts-vs-.bbl content-equivalence assertion for all three: the physical lib/*.bbl file is parsed independently and its UNIQUE declared name set (not raw count) compared against the .ts-derived virtual document actually served to the language server. Unique-set comparison specifically so the never-read events.bbl's pre-P61-D2-019 duplicate ON_MOUSE_ENTER/ON_MOUSE_EXIT leftovers (that fix, landed in plan 67-05, correctly only touched the consumed events.ts file, leaving the dead .bbl sibling untouched — out of that fix's scope) are not mistaken for new drift. Functions.ts/.bbl was NOT included (already covered by builtin-functions-library.test.ts and P61-D8-007's comment fix in this same task). No source change.
user_facing:       no
verification:      cd bbj-vscode && npx vitest run test/builtin-library-members.test.ts — 9/9 pass
commit:            f3ba5c5
notes:             labels.ts/labels.bbl and variables.ts/variables.bbl are trim-content-identical (only leading/trailing whitespace differs); events.ts/events.bbl diverge in raw entry count (146 vs 144) due to the pre-P61-D2-019 duplicate leftover described above — the unique-name-set equivalence still holds (144 unique names in both). anti-vacuous: performed against all three catalogs — renamed `*PROCEED` in labels.ts (known-labels test failed), renamed `ON_MOUSE_ENTER` to `ON_MOUSE_ENTER_RENAMED` in events.ts (equivalence test failed with a real diff), each reverted and reconfirmed 9/9 green.
```

```
row:               38
finding_id:        P61-D8-001
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:757-760
dimension:         D8
severity:          low
effort:            2
verdict:           no-op
test_required:     no (D-11 D8)
fail_before:       inapplicable — D8 trace-tier finding, documentation-accuracy only
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a runtime failure): a reader of clearCache()'s doc comment reasonably concludes calling it leaves no stale cached state, which is false for the complete class index.
fix_applied:       No code change. The record's test-5 clause offers two resolutions: fix the comment, "or fix the code per P61-D2-004 so the comment becomes true." P61-D2-004 landed in this same plan (commit 557ab62), and clearCache() now does clear the complete class index — so the doc comment's "Clears all cached Java class data..." claim is accurate as written. Re-read against the post-fix clearCache() body and confirmed true; no edit needed.
user_facing:       no
verification:      review-only — read clearCache()'s doc comment (java-interop.ts:867-869) against its post-P61-D2-004 body (java-interop.ts:870+); no compile, no test ran (D-14)
commit:            none — resolved via P61-D2-004's fix (557ab62), per the record's own "or fix the code" clause
notes:             Genuine no-op per the record's own escape clause, not a re-triage: the record explicitly names "fix the code per P61-D2-004" as one of its two valid resolutions, and P61-D2-004 (this same plan) took that path.
```

```
row:               39
finding_id:        P61-D8-002
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj.langium:948
dimension:         D8
severity:          low
effort:            2
verdict:           no-op
test_required:     no (D-11 D8)
fail_before:       inapplicable — D-11 classifies this dimension as no-behaviour-change, so there is no failing state to observe
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a runtime failure): a reader of this comment reasonably concludes escaped double-quotes are already normalized in the parsed AST value, which is
fix_applied:       No edit. The record's own escape clause offers two resolutions: fix the comment, or fix the code per P61-D2-005 so the comment becomes true. P61-D2-005 landed in plan 67-05 (commit 4db8169): BBjValueConverter's STRING_LITERAL case now does `input.slice(1, -1).replace(/""/g, '"')`, un-escaping doubled quotes. Line 948's comment reads `// "" escapse " inside a string. Also \ as a plain non escape char. Handled in BBjValueConverter` — both clauses checked against the post-P61-D2-005 converter: the doubled-quote un-escape now genuinely happens there, and no backslash handling exists anywhere in runConverter, so backslash remains a plain non-escape char exactly as the comment states. The comment is accurate as written; taking this branch.
user_facing:       no
verification:      review-only — read bbj.langium:948 against bbj-value-converter.ts's post-P61-D2-005 STRING_LITERAL case; no compile needed for the disposition itself (D-14). Ran `cd bbj-vscode && npm run langium:generate && git status --porcelain src/language/generated/` anyway (this plan's own gate, T-67-06-01) — 0 lines of diff, confirming no grammar-rule change occurred (there was none to begin with, since no edit was made)
commit:            none — resolved by P61-D2-005's fix (4db8169), per this record's own "or fix the code" clause
notes:             Genuine no-op per the record's own escape clause, not a re-triage: the record explicitly names "fix the code per P61-D2-005" as one of its two valid resolutions, and P61-D2-005 (plan 67-05, prior to this plan) took that path. Mirrors the P61-D8-001/P61-D8-006 no-op precedent from plans 67-02/67-03.
```

```
row:               40
finding_id:        P61-D8-003
unit:              RU-61-03
location:          CLAUDE.md:34
dimension:         D8
severity:          low
effort:            2
verdict:           applied
test_required:     no (D-11 D8)
fail_before:       inapplicable — D-11 classifies this dimension as no-behaviour-change, so there is no failing state to observe
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a runtime failure): a reader of CLAUDE.md's Architecture section forms an incomplete picture of the validation surface, unaware that
fix_applied:       CLAUDE.md's Architecture "Validation" bullet (now at line 54 — CLAUDE.md's own line numbers have drifted since the record was written, current content re-located by grep) named bbj-validator.ts, bbj-document-validator.ts, check-classes.ts, check-variable-scoping.ts and line-break-validation.ts but omitted validations/check-function-calls.ts, which exists (confirmed via `ls bbj-vscode/src/language/validations/`). Added `validations/check-function-calls.ts` to the list.
user_facing:       no
verification:      `grep -c 'validations/check-function-calls.ts' CLAUDE.md` = 1; `ls bbj-vscode/src/language/validations/check-function-calls.ts` succeeds — file exists on disk
commit:            69435df
notes:             `git show --stat 69435df` touches only CLAUDE.md, one line changed.
```

```
row:               41
finding_id:        P61-D8-004
unit:              RU-61-03
location:          bbj-vscode/src/language/bbj-cpl-service.ts:48-49,203-207
dimension:         D8
severity:          low
effort:            2
verdict:           applied
test_required:     no (D-11 D8)
fail_before:       inapplicable — D-11 classifies this dimension as no-behaviour-change, so there is no failing state to observe
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a runtime failure): a reader of compile()'s class-level comment could wrongly conclude BBjCPL diagnostics are not yet surfaced to users (they are, via
fix_applied:       Two comments corrected: (1) the class-level comment (48-49) claimed the buildDocuments() wiring was future work ("Phase 53 will wire this into buildDocuments() via: ..."); bbj-document-builder.ts:173 confirms the wiring already exists (`langServices.compiler.BBjCPLService.compile(key)` inside the debounced compile step) — corrected to state the integration is complete and name the actual call site. (2) setTimeout()'s doc comment (203-207) claimed it is "Called by Phase 53 from VS Code settings wiring"; `grep -rn '.setTimeout(' bbj-vscode/src` finds zero call sites anywhere — corrected to state it is currently unused. Per the record's own branch choice, wiring a settings path would be a behaviour change and is out of scope for a D8 comment-only fix; took the comment branch, recorded here.
user_facing:       no
verification:      cd bbj-vscode && npm run build && npm run lint — both exit 0 (lint zero warnings); review-only confirmation that bbj-document-builder.ts:173 calls compile() and that no .setTimeout( call site exists in src/ (D-14, no test required for a comment-only D8 fix)
commit:            2c497ec
notes:             `git show --stat 2c497ec` touches only bbj-cpl-service.ts, 4 insertions/2 deletions (both comment blocks).
```

```
row:               42
finding_id:        P61-D8-005
unit:              RU-61-04
location:          CLAUDE.md (repo root) §Architecture → Langium Pipeline → Key services, "Completion" bullet
dimension:         D8
severity:          low
effort:            1
verdict:           applied
test_required:     no (D-11 D8)
fail_before:       inapplicable — D-11 classifies this dimension as no-behaviour-change, so there is no failing state to observe
failure_scenario:  n/a (D8 trace-tier finding — a documentation-completeness defect, not a runtime failure): a reader of CLAUDE.md's architecture overview reasonably concludes Completion is the only custom LSP feature provider of note in this
fix_applied:       Extended the existing Completion bullet (did not add a separate bullet) to name the other LSP feature providers registered in bbj-vscode/src/language/bbj-module.ts's BBjModule `lsp` service group: DocumentSymbolProvider, DefinitionProvider, HoverProvider, SemanticTokenProvider, SignatureHelp, InlayHintProvider, CodeActionProvider — read from bbj-module.ts directly rather than reused from the finding record. The record's own text estimated "ten" other files (also counting the `documentation`-group CommentProvider and the bbj-use-insert.ts helper module, neither of which is a distinct `lsp`-group provider, plus BBjSharedModule's separately-registered NodeKindProvider, which lives in the shared services module rather than BBjModule's own lsp group); the actual count of BBjModule's own lsp-group providers besides Completion is 7 — recorded as found, not re-asserted as "ten".
user_facing:       no
verification:      `grep -c '<provider>' bbj-vscode/src/language/bbj-module.ts` for each of the 7 named providers (DocumentSymbolProvider, DefinitionProvider, HoverProvider, SemanticTokenProvider, SignatureHelp, InlayHintProvider, CodeActionProvider) returns 2 each (import + registration) — all 7 confirmed present
commit:            fe4d8a0
notes:             effort recorded as `1` in the source record — an off-scale value outside INVENTORY §3d's locked {2,4,8} effort scale. Carried through unchanged per this phase's off-scale handling instruction; not re-rounded to `2`. (The source record itself carries no additional inline annotation beyond the raw `effort: 1` value.) `git show --stat fe4d8a0` touches only CLAUDE.md, one line changed. Discrepancy from the record's "ten" estimate recorded above under fix_applied, per this plan's own instruction not to re-round or silently overwrite a wrong count.
```

```
row:               43
finding_id:        P61-D8-006
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-ws-manager.ts:180
dimension:         D8
severity:          low
effort:            2
verdict:           no-op
test_required:     no (D-11 D8)
fail_before:       inapplicable — D8 trace-tier finding, documentation-accuracy only
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a runtime failure): a reader of this comment reasonably concludes that any exception caught here has no consequence, which is false — it silently leaves setup half-completed.
fix_applied:       No separate code change. The record's test-5 clause offers two resolutions: "remove/replace the misleading comment, or fix the underlying handling per P61-D2-016 so the comment becomes true." P61-D2-016 landed in this same plan (commit c47da5c) and its own fix deleted the misleading `// all fine` comment at bbj-ws-manager.ts:180 as part of routing the catch through logger.error — re-read against the post-fix catch block and confirmed the comment is gone entirely (not just corrected), so there is no remaining misleading clause to edit.
user_facing:       no
verification:      review-only — read the catch block at bbj-ws-manager.ts:179-184 (post-P61-D2-016) and confirmed no misleading comment remains; no compile, no test ran beyond what P61-D2-016's own verification already covers (D-14)
commit:            none — resolved by P61-D2-016's fix (c47da5c), per this record's own alternative resolution
notes:             Genuine no-op per the record's own escape clause, not a re-triage: the record explicitly names "fix the underlying handling per P61-D2-016" as one of its two valid resolutions, and P61-D2-016 (this same plan, same file) took that path and removed the comment outright.
```

```
row:               44
finding_id:        P61-D8-007
unit:              RU-61-07
location:          bbj-vscode/test/builtin-functions-library.test.ts:9-14
dimension:         D8
severity:          low
effort:            2
verdict:           applied
test_required:     no (D-11 D8)
fail_before:       inapplicable — D-11 classifies this dimension as no-behaviour-change, so there is no failing state to observe
failure_scenario:  A reader of this test's comment reasonably concludes the physical lib/functions.bbl file is validated by CI; it is not — a syntax error introduced only into the physical file would pass this test undetected.
fix_applied:       Corrected the header comment to state explicitly that it guards the .ts-derived virtual document served at the synthetic `bbjlib:///functions.bbl` URI (bbj-ws-manager.ts's loadAdditionalDocuments), built from `builtinFunctions` in lib/functions.ts — and that it does NOT read or guard the physical lib/functions.bbl file on disk, which no production code path reads either. Points to builtin-library-members.test.ts's P61-D5-017 equivalence test (this same task, committed just before this row) as what actually compares the .ts and physical .bbl content.
user_facing:       no
verification:      cd bbj-vscode && npx vitest run test/builtin-functions-library.test.ts — 3/3 pass (comment-only change, no assertion touched)
commit:            40d3af1
notes:             `git show --stat 40d3af1` touches only test/builtin-functions-library.test.ts, comment lines only.
```

```
row:               45
finding_id:        P62-D2-004
unit:              RU-62-01
location:          bbj-vscode/src/extension.ts:892
dimension:         D2
severity:          low
effort:            2
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at 7729e06 — `npx vitest run test/extension-activation.test.ts` fails: "expected \"vi.fn()\" to be called at least once" — a mock LanguageClient whose start() rejects produces no observed showErrorMessage call, confirming the rejection went unobserved.
failure_scenario:  If the language-server process fails to spawn, client.start()'s rejection is never observed anywhere in this file, producing an unhandled promise rejection in the extension host with no dedicated user-facing message explaining that the server didn't start, while every command remains registered as if it had.
fix_applied:       Attached a .catch() to client.start() in startLanguageClient() logging via console.error (the file's established error-narrowing idiom: error instanceof Error ? error.message : String(error)) and surfacing via vscode.window.showErrorMessage("BBj language server did not start: ...") — the same reporting path this file already uses for every other user-facing failure. A successful start() continues to activate exactly as before.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/extension-activation.test.ts test/language-configuration.test.ts test/composer-commands.test.ts — build succeeds, 3/3 test files pass; npm run lint exits 0 with zero warnings
commit:            7729e06 (test) + 36de32d (fix)
notes:             `git show --stat 36de32d` touches only bbj-vscode/src/extension.ts.
```

```
row:               46
finding_id:        P62-D2-006
unit:              RU-62-05
location:          bbj-vscode/bbj-language-configuration.json:54-55,100-101
dimension:         D2
severity:          low
effort:            2
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at 295c7a6 — `npx vitest run test/language-configuration.test.ts` fails: `SyntaxError: Unexpected token ']', ..."   },\n    ],\n    "su"... is not valid JSON`, confirming JSON.parse throws pre-fix.
failure_scenario:  Any tool that treats bbj-language-configuration.json as strict JSON — a schema validator, a build-time lint step, a future automated consumer, or simply JSON.parse called directly as this review's own acceptance check does — throws a SyntaxError and fails to load the file; only VS Code's own lenient in-process parser currently tolerates it.
fix_applied:       Removed the comma after the last autoClosingPairs element (the "rem /**" object, at the line the record calls 54) and the comma after onEnterRules' closing bracket, before the file's final closing brace (the record's 100-101). Pre-fix entry counts recorded and confirmed unchanged post-fix: comments=1, brackets=3, autoClosingPairs=7, surroundingPairs=5, onEnterRules=3.
user_facing:       yes
verification:      cd bbj-vscode && node -e "JSON.parse(require('fs').readFileSync('bbj-language-configuration.json','utf8'))" exits 0; npx vitest run test/language-configuration.test.ts (2/2 pass)
commit:            295c7a6 (test) + 8c49e2f (fix)
notes:             bbj-intellij/build.gradle.kts's copyTextMateBundle task copies this file byte-identically into the IntelliJ plugin bundle — this reaches both IDEs with no Java-side edit.
```

```
row:               47
finding_id:        P62-D2-007
unit:              RU-62-05
location:          bbj-vscode/syntaxes/bbj.tmLanguage.json:18-25,27-35,68-72
dimension:         D2
severity:          medium
effort:            2
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at 3a32cef — `npx vitest run test/textmate-highlighting.test.ts` fails: "h must not carry the escape scope: expected true to be false" — every character of a string's content carries constant.character.escape.bbj alongside string.quoted.double.bbj. Pre-fix both string.quoted.* patterns arrays held 1 entry each (the #string-character-escape include).
failure_scenario:  Any BBj string literal containing plain text — the overwhelming majority of "..."/'...' usage in real BBj source — is rendered by a theme's constant.character.escape color (typically distinct from, and often more attention-drawing than, its string color) for every character, not just the quote delimiters.
fix_applied:       Removed the {"include": "#string-character-escape"} entry from both string.quoted.double.bbj and string.quoted.single.bbj patterns arrays (both now 0 entries), and dropped the now-unused string-character-escape repository rule entirely.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/textmate-highlighting.test.ts test/textmate-bbx-highlighting.test.ts (17/17 pass); node -e confirms both string.quoted.* patterns arrays are length 0 (down from 1,1); grammar still parses as strict JSON
commit:            3a32cef (test) + 4c7b973 (fix)
notes:             The [rR][eE][mM] case-insensitive character-class idiom is untouched by this fix (it touches only the string rules).
```

```
row:               48
finding_id:        P62-D2-008
unit:              RU-62-05
location:          bbj-vscode/syntaxes/bbj.tmLanguage.json:41-50
dimension:         D2
severity:          low
effort:            2
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at 5026129 — `npx vitest run test/textmate-highlighting.test.ts` fails: "bare REM is comment-scoped: expected false to be true" — a line containing only `REM` tokenizes as plain source.bbj with no comment scope. Pre-fix begin pattern: "[rR][eE][mM][ \\t]".
failure_scenario:  A bare REM on its own line — a valid, complete no-op comment statement per the language server's own lexer, and a real developer idiom for marking an intentionally blank line — is rendered as plain, unscoped code by the editor instead of a comment.
fix_applied:       Changed the comments repository rule's begin pattern from "[rR][eE][mM][ \\t]" to "[rR][eE][mM]([ \\t]|(?=$))" — trailing whitespace is now optional, matched via a zero-width end-of-line lookahead when absent. beginCaptures.1 (punctuation.whitespace.comment.leading.bbj), previously inert since the pre-fix pattern had no capturing group at all, now applies to the space/tab branch for real and captures nothing on the zero-width bare-REM branch. REMARK/REM15 etc. remain unscoped.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/textmate-highlighting.test.ts test/textmate-bbx-highlighting.test.ts (17/17 pass); manual tokenization confirms REM / REM this is a comment / REMARK = 1 all scope as before the finding, plus the new bare-REM case
commit:            5026129 (test) + b30fc6c (fix)
notes:             The [rR][eE][mM] case-insensitive character-class idiom is preserved.
```

```
row:               49
finding_id:        P62-D2-009
unit:              RU-62-05
location:          bbj-vscode/syntaxes/bbj.tmLanguage.json:15
dimension:         D2
severity:          low
effort:            2
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at eb81320 — `npx vitest run test/textmate-highlighting.test.ts` fails: "IOL= token present: expected undefined to be defined" — `IOL=5` and `LEN=10` produce no keyword.control.bbj token at all, the value-attached text merging into an unscoped blob. Pre-fix match tail: \\b([iI][oO][lL]=|[lL][eE][nN]=)\\B.
failure_scenario:  IOL=/LEN= — BBj's I/O-list-length and record-length options, always written with a value attached (IOL=5, LEN=80) — never receive keyword highlighting in that form, the only form that occurs in real code; the pattern only fires on the unrealistic IOL=/LEN= with nothing after it.
fix_applied:       Branch taken: dropped the trailing \B assertion after the IOL=/LEN= alternation entirely, rather than replacing it with a (?=\d) lookahead — a value-only lookahead would have regressed the previously-working space/end-of-line-terminated form (confirmed via live tokenization before choosing this branch). The preceding long keyword alternation is untouched.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/textmate-highlighting.test.ts test/textmate-bbx-highlighting.test.ts (17/17 pass)
commit:            eb81320 (test) + 283cdd3 (fix)
notes:             The [rR][eE][mM] idiom elsewhere in the file is untouched by this fix.
```

```
row:               50
finding_id:        P62-D2-010
unit:              RU-62-02
location:          bbj-vscode/src/document-formatter.ts:63-67
dimension:         D2
severity:          medium
effort:            2
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at c10e7a9 — `npx vitest run test/document-formatter.test.ts` times out after 5000ms ("Test timed out in 5000ms") on the P62-D2-010 case: the format promise never settles when the mocked spawn emits a non-ENOENT 'error' event.
failure_scenario:  If cp.spawn('java', formatFlags) (line 59) emits 'error' with any code other than 'ENOENT' (a permissions error on the java binary being the most realistic case, e.g. after a botched local JDK reinstall), the runFormatter Promise never settles: the format request awaiting it hangs indefinitely, with no error message, no timeout, and no way for the user to tell the formatter is stuck versus merely slow.
fix_applied:       Added an else branch to the spawn 'error' handler that calls reject(err) for any error code other than ENOENT, so every spawn-level error now settles the promise instead of only the ENOENT case.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/document-formatter.test.ts (8/8 pass, includes the P62-D2-010 case with an explicit 5000ms test timeout so a regression would fail cleanly rather than hang the suite)
commit:            c10e7a9 (red) + c05fd57 (green)
notes:             
```

```
row:               51
finding_id:        P62-D2-011
unit:              RU-62-02
location:          bbj-vscode/src/decompile-io.ts:69-82
dimension:         D2
severity:          low
effort:            4
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at 57c8ada — `npx vitest run test/decompile-io.test.ts` fails: "expected 'print \"stale\"\n' to be 'print \"fresh\"\n'" — a stale .lst of matching size is returned before the fresh write ever happens.
failure_scenario:  If a prior decompileInPlace attempt against the same file already left a stale <input>.lst on disk (e.g. the extension crashed or the user closed VS Code between the exec() completing and the rename step), and a subsequent retry's fresh bbjlst output happens to settle at the same byte size as the stale file, the first two 150ms-spaced polls can both observe that stale size before the new write has begun, causing waitForDecompileOutput to resolve immediately with the STALE .lst's content rather than the fresh run's output — the user would see outdated decompiled source with no error.
fix_applied:       Replaced the size-only statSize helper with statSizeAndMtime and captured a call-start timestamp (callStartMs) at function entry; resolution now requires both the size to settle across two polls AND the file's mtimeMs to be at or after callStartMs, so a stale .lst written before the call started can never satisfy the gate even if its size coincidentally matches.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/decompile-io.test.ts test/tokenized-bbj.test.ts (15/15 pass, 3 consecutive runs, including the stale-.lst-of-matching-size case)
commit:            57c8ada (red) + 73aadc8 (test-timing fix, see notes) + 806acb5 (green)
notes:             The red test's original 45ms fresh-write delay produced a flaky false pass after the fix landed: the stale .lst was written in the same tick as the wait call, so its mtime could round to at-or-after the call-start timestamp, satisfying the new mtime gate for the wrong reason. Commit 73aadc8 adds a real 100ms gap before starting the wait so the stale write's mtime is unambiguously earlier — documented as a Rule 1 auto-fix (own test bug found while verifying the green fix), not a change to the finding's scope.
```

```
row:               52
finding_id:        P62-D3-001
unit:              RU-62-02
location:          bbj-vscode/src/document-formatter.ts:9-50,52-84
dimension:         D3
severity:          low
effort:            4
verdict:           applied
test_required:     yes (D-11 D3)
fail_before:       observed at 0a8a14b — `npx vitest run test/document-formatter.test.ts` fails: "expected \"vi.fn()\" to be called 1 times, but got 2 times" — two concurrent format requests for the same document URI spawn two independent processes.
failure_scenario:  Saving several open BBj documents together (VS Code's "Save All", or format-on-save firing while a manual format request from the same document is still in flight) spawns one independent JVM per request with no upper bound on concurrency — on a machine with several BBj files open, this can transiently spawn several concurrent JVMs, each with the ~750ms+ startup cost the code's own warning threshold already flags, worsening perceived editor responsiveness during a bulk save.
fix_applied:       Added a module-level Map<string, Promise<string>> (inFlightFormats) keyed by document URI. provideDocumentFormattingEdits now checks the map before spawning: a concurrent request for the same URI reuses the in-flight promise; the entry is deleted once the promise settles on both the resolve and reject paths, so a later request for the same URI still spawns a fresh process.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/document-formatter.test.ts (8/8 pass, including same-URI dedup, different-URI non-dedup, and resolve/reject cleanup cases)
commit:            0a8a14b (red) + a425924 (green)
notes:             
```

```
row:               53
finding_id:        P62-D4-005
unit:              RU-62-02
location:          bbj-vscode/src/decompile-io.ts:10,bbj-vscode/src/tokenized-bbj.ts:17
dimension:         D4
severity:          low
effort:            2
verdict:           applied
test_required:     no (D-11 D4)
fail_before:       inapplicable — D-11 classifies D4 as no-behaviour-change, so there is no failing state to observe
failure_scenario:  n/a (D4 is a code-shape finding, not a runtime failure scenario) — if the magic-byte sequence were ever revised (e.g. a future tokenized-file format version), a fix applied to only one of the two constants inside this unit would silently desynchronize isTokenizedBBjHeader and isTokenizedFile, causing the two detection paths to disagree about whether the same file is tokenized.
fix_applied:       Imported TOKENIZED_BBJ_MAGIC from ./tokenized-bbj.js and wrapped it with Buffer.from(...) in place of decompile-io.ts's own hand-typed local const. tokenized-bbj.ts is unchanged — it remains the single source of truth for the magic byte sequence.
user_facing:       no
verification:      cd bbj-vscode && npm run build && npx vitest run test/decompile-io.test.ts test/tokenized-bbj.test.ts (15/15 pass, both files' existing cases continue to pass unchanged); git diff --stat for commit e6fc4fe touches only bbj-vscode/src/decompile-io.ts
commit:            e6fc4fe
notes:             tokenized-bbj.ts confirmed untouched by this commit (git diff --stat bbj-vscode/src/tokenized-bbj.ts is empty for e6fc4fe), matching the record's own test-5 clause that the edit stays inside decompile-io.ts.
```

```
row:               54
finding_id:        P62-D5-004
unit:              RU-62-05
location:          bbj-vscode/test/textmate-highlighting.test.ts (absence of 3 assertions) — covers bbj-vscode/syntaxes/bbj.tmLanguage.json
dimension:         D5
severity:          low
effort:            4
verdict:           no-op
test_required:     test-is-the-fix (D-13)
fail_before:       inapplicable — D5 test-coverage-gap record, no code red state applies
failure_scenario:  A future edit to bbj.tmLanguage.json's string or keyword patterns can reintroduce or worsen any of these three defects (or a similar one) with `npm test` green throughout, since the existing 2 tests do not assert string-content scope purity, bare-REM recognition, or the IOL=/LEN= value-attached form.
fix_applied:       No-op per the record's own escape clause. The record's test-5 clause names exactly three missing assertions: string-content scope purity, bare-REM recognition, and IOL=/LEN= with a value attached. All three were landed verbatim as the regression tests for P62-D2-007, P62-D2-008 and P62-D2-009 in this same plan (test/textmate-highlighting.test.ts, same file the record names) — no fourth assertion is missing, so no delta commit is needed.
user_facing:       yes
verification:      cd bbj-vscode && npx vitest run test/textmate-highlighting.test.ts — the three named assertions are present and passing (17 total tests in the two textmate files)
commit:            none — the three assertions this record names were landed as the regression tests for P62-D2-007 3a32cef, P62-D2-008 5026129, P62-D2-009 eb81320
notes:             Closed by cross-reference per the record's own test-5 clause ("all three missing assertions belong in the single existing textmate-highlighting.test.ts"); nothing beyond those three assertions was requested.
```

```
row:               55
finding_id:        P62-D5-006
unit:              RU-62-02
location:          bbj-vscode/src/document-formatter.ts (whole file; no test counterpart)
dimension:         D5
severity:          low
effort:            4
verdict:           applied
test_required:     test-is-the-fix (D-13)
fail_before:       inapplicable — D5 test-coverage gaps land as one commit per D-13; the test passes the moment it is written, no red state is possible
failure_scenario:  A regression in the exit-code handling, the P62-D2-010 hang path, or the P62-D3-001 concurrent-spawn behavior would ship silently — `npm test` staying green today provides no signal about any of them, since no test imports document-formatter.ts at all.
fix_applied:       Authored bbj-vscode/test/document-formatter.test.ts, mocking vscode and child_process.spawn. Covers all four required cases: ENOENT, a non-zero process exit, a non-ENOENT spawn error, and the unsaved-content-map fallback taking precedence over document.getText(). The non-ENOENT-error case is the same test already committed for P62-D2-010 — deliberately not duplicated here, only the remaining three new cases were added.
user_facing:       no
verification:      cd bbj-vscode && npm run build && npx vitest run test/document-formatter.test.ts (8/8 pass); grep -c "vi.mock" test/document-formatter.test.ts returns 2 (vscode and child_process)
commit:            4afa828
notes:             Overlap with P62-D2-010: the "non-ENOENT spawn error" case this row's coverage requirement names is the exact test P62-D2-010 already committed (test/document-formatter.test.ts's first test, commit c10e7a9) — recorded here rather than re-asserted, per this row's own classification test (1) noting the file needs only ONE new test file, unlike the phase's other D5 findings.
```

```
row:               56
finding_id:        P62-D7-002
unit:              RU-62-05
location:          bbj-vscode/package.json:30-35
dimension:         D7
severity:          medium
effort:            2
verdict:           applied
test_required:     yes (D-11 D7)
fail_before:       Red commit 906c07b's `lists .bbl among its extensions` assertion failed with
                    `AssertionError: expected [ '.bbj', '.bbjt', '.src', '.bbx' ] to include '.bbl'` —
                    observed directly via `npx vitest run test/language-configuration.test.ts` before
                    the fix commit.
failure_scenario:  A user who opens one of this project's own lib/*.bbl builtin-catalog files (or any .bbl file in a BBj project using custom builtin libraries) directly in VS Code sees plain, unscoped text with no bracket matching, no comment
fix_applied:       Added ".bbl" to bbj-vscode/package.json's "bbj" language contribution's
                    "extensions" array (:30-35), matching bbj.tmLanguage.json's own fileTypes field
                    and the IntelliJ TextMate bundle's extensions list. Test added to
                    bbj-vscode/test/language-configuration.test.ts asserting the extensions array
                    contains .bbl and that every pre-existing extension is still listed.
user_facing:       yes — .bbl files now resolve to the bbj language id, TextMate grammar and
                    language-configuration behavior in VS Code, matching IntelliJ's existing behavior
verification:      cd bbj-vscode && npx vitest run test/language-configuration.test.ts (4/4 pass);
                    `node -e "const p=require('./package.json');const l=p.contributes.languages.find(x=>x.id==='bbj');console.log(l.extensions.includes('.bbl'))"` prints true
commit:            906c07b (test, red) + bee185d (fix, green)
notes:              no CI run occurred — verified locally via vitest and the direct package.json
                    read above.
```

```
row:               57
finding_id:        P62-D8-001
unit:              RU-62-05
location:          CLAUDE.md:90-92
dimension:         D8
severity:          low
effort:            2
verdict:           applied
test_required:     no (D-11 D8)
fail_before:       inapplicable — D-11 classifies this dimension as no-behaviour-change, so there is no failing state to observe
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a runtime failure): a reader of CLAUDE.md reasonably concludes only bbj.tmLanguage.json is IDE-shared, and could edit bbx.tmLanguage.json or
fix_applied:       CLAUDE.md's §IDE Integration TextMate bullet named only `syntaxes/bbj.tmLanguage.json`. Identified the actual shared set from bbj-intellij/build.gradle.kts's copyTextMateBundle task (lines 83-88), which includes exactly four files: syntaxes/bbj.tmLanguage.json, syntaxes/bbx.tmLanguage.json, bbj-language-configuration.json, bbx-language-configuration.json — cross-checked against bbj-vscode/package.json's contributes.grammars (bbj.tmLanguage.json, bbx.tmLanguage.json) and contributes.languages' configuration fields (bbj-language-configuration.json, bbx-language-configuration.json), and confirmed all four exist on disk. Rewrote the bullet to name all four and the copyTextMateBundle task that shares them.
user_facing:       no
verification:      CLAUDE.md's TextMate bullet names four distinct file paths; `ls syntaxes/bbj.tmLanguage.json syntaxes/bbx.tmLanguage.json bbj-language-configuration.json bbx-language-configuration.json` (from bbj-vscode/) succeeds for all four
commit:            2fa0264
notes:             `git show --stat 2fa0264` touches only CLAUDE.md, one line changed. This is the same four-file set 62-COVERAGE.md's own RU-62-04 evidence names (P62-D8-001's originating record), independently re-derived here from bbj-intellij/build.gradle.kts rather than trusted from the record's prose.
```

```
row:               58
finding_id:        P62-D8-002
unit:              RU-62-02
location:          bbj-vscode/src/document-formatter.ts:5-6,29-30,88-96
dimension:         D8
severity:          low
effort:            2
verdict:           applied
test_required:     no (D-11 D8)
fail_before:       inapplicable — D-11 classifies D8 as no-behaviour-change, so there is no failing state to observe
failure_scenario:  n/a (D8 is a comment-accuracy finding) — the map, its onDidChangeTextDocument writer (lines 88-91), and its onDidCloseTextDocument cleanup (lines 94-96) add a per-keystroke write and 9 of this file's 96 lines for no confirmed behavioral difference, while the comment's inaccurate framing would mislead a future maintainer into believing the map is load-bearing.
fix_applied:       Corrected the three comments at unsavedContentMap's declaration, its use-site fallback, and the two listeners: they now state that document.getText() always returns VS Code's live in-memory buffer (never a disk read), so the map's tracked value and document.getText() are the same content for the document object provideDocumentFormattingEdits receives. Took the comment-correction branch, not the map-removal branch (see notes).
user_facing:       no
verification:      cd bbj-vscode && npm run build && npx vitest run test/document-formatter.test.ts (8/8 pass, unchanged); git show --stat b8dd31a touches only bbj-vscode/src/document-formatter.ts
commit:            b8dd31a
notes:             The record's test-5 clause offers two branches: correct the comment, or remove unsavedContentMap and its two listeners in favour of calling document.getText() directly. Removing the map is a behaviour change (however small) and is outside a D8 easy fix's no-behaviour-change scope, so the comment-correction branch was taken.
```

```
row:               59
finding_id:        P63-D4-001
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:50,103,125,136-139,148,152,97-165
dimension:         D4
severity:          low
effort:            4
verdict:           applied
test_required:     no (D-11 D4)
fail_before:       inapplicable — D-11 D4 no-behaviour-change default, no regression test required
failure_scenario:  n/a (D4 is a code-shape finding, not a runtime failure scenario) — the duplication is a maintainability cost: any future platform-specific fix (e.g. a sixth OS/architecture combination, or hardening one branch without the others) must be applied at up to 5 separate sites by hand, with drift risk between them; the god-function shape makes downloadAndExtractNode harder to review, test in isolation, or partially reuse (e.g. resolving just the extracted-binary path without also downloading).
fix_applied:       Added a private `Platform` enum (WINDOWS/UNIX) with `current()`, `archiveExtension()` and `nodeExecutableName()` members, replacing the five repeated `SystemInfo.isWindows` decision sites (including getCachedNodePath's :50). Split downloadAndExtractNode into buildDownloadUrl/download/extract/install/cleanup private methods invoked in the original order.
user_facing:       no — internal refactor of BbjNodeDownloader; no plugin-visible behaviour, UI text, or icon changes
verification:      review-only — no compile, no test ran (D-14). Statement-by-statement ordering trace (this row carries more behavioural risk than the other eight per the plan's own flagged-assumption #1):
                    1. platform=getPlatformName()/arch=getArchitecture()/fileName/extension/downloadUrl construction — moved into buildDownloadUrl(Platform), called once at the top of downloadAndExtractNode; the reconstructed `fileName` (String.substring on downloadUrl between the last '/' and the extension suffix) is algebraically identical to the original literal fileName since downloadUrl = BASE+VERSION+"/"+fileName+extension by construction — same statements, same order, same values.
                    2. indicator.setText/setFraction(0.1) — unchanged position, immediately after step 1, same as original.
                    3. tempFile = Files.createTempFile(...) — same statement, same extension value (now via platform.archiveExtension(), semantically identical to the original isWindows-conditional expression for every platform branch).
                    4. outer try { download(...) } — same HttpRequests.request(...).productNameAsUserAgent().connect(saveToFile) call, moved into download() unchanged, still inside the same try block position.
                    5. setFraction(0.7)/setText("Extracting...") — unchanged position.
                    6. tempExtractDir = createTempDirectory(...) — unchanged position, still inside the outer try, before the inner try.
                    7. inner try { extract(...) } — same if(isWindows)/else branch dispatch to extractZip/extractTarGz, now via platform==Platform.WINDOWS, same order, same arguments.
                    8. setFraction(0.9)/setText("Installing...") — unchanged position, still inside inner try, after extract() returns.
                    9. install(...) — same extractedNode path-resolution if/else, same Files.exists guard + throw, same getNodeDataDirectory()/targetPath/Files.copy(REPLACE_EXISTING)/conditional setExecutable(true) statements, in the same order.
                    10. setFraction(1.0) — unchanged position, after install() returns, still inside inner try, before its finally.
                    11. inner finally { cleanup(tempExtractDir) } — same deleteDirectory(tempExtractDir.toFile()) call, unchanged position — runs on every path the inner try can exit, including exceptions thrown by extract()/install(), identical to before.
                    12. outer finally { Files.deleteIfExists(tempFile) } — unchanged position, runs on every path the outer try can exit (including an exception propagating out of the inner try/finally), identical to before.
                    URL-form check (T-67-11-02): downloadUrl = DOWNLOAD_BASE_URL+NODE_VERSION+"/"+"node-"+NODE_VERSION+"-"+platformName+"-"+arch+extension is unchanged for every platform×arch branch (darwin/linux/win × arm64/x64) since buildDownloadUrl computes it with the exact same concatenation and the exact same extension mapping (WINDOWS→".zip", else ".tar.gz") as the original inline code.
                    Divergence from D-14: D-14 characterises this row as "cannot change bytecode behaviour," but a five-way method split plus a new Platform helper is a control-flow restructuring, not a rename or comment edit — recorded here per the plan's flagged-assumption #1 rather than adjusted silently. The trace above is the mitigation; no compiler or test confirms it in this environment.
commit:            7816c7d
notes:             getPlatformName()/getArchitecture() are now each called twice (once inside buildDownloadUrl, once again for the indicator.setText progress message) instead of once — both are pure/deterministic (SystemInfo/CpuArch checks with no side effects), so this is a minor redundancy, not a behaviour change. getCachedNodePath's own isWindows branch (BbjNodeDownloader.java:50) was also routed through Platform.current().nodeExecutableName() for consistency, reducing the duplication the finding's evidence names at that exact site.
```

```
row:               60
finding_id:        P63-D4-014
unit:              RU-63-02
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjIcons.java:14
dimension:         D4
severity:          low
effort:            2
verdict:           applied
test_required:     no (D-11 D4)
fail_before:       inapplicable — D-11 D4 no-behaviour-change default, no regression test required
failure_scenario:  n/a in the sense that D4 records dead code, not a runtime failure — the bbj-config.svg/bbj-config_dark.svg resource pair is bundled into every plugin build and referenced by nothing, a small but genuine maintenance/packaging-size cost with no corresponding functionality.
fix_applied:       Deleted the BbjIcons.CONFIG constant (BbjIcons.java:14) and its two backing resource files, bbj-intellij/src/main/resources/icons/bbj-config.svg and bbj-config_dark.svg. Pre-deletion check: `grep -rn 'CONFIG\|bbj-config' bbj-intellij/src/` returned only the declaration itself; `grep -n 'icon\|CONFIG' bbj-intellij/src/main/resources/META-INF/plugin.xml` named no CONFIG/bbj-config reference — no surviving reference, so the deletion is unconditional, not a reasoned partial.
user_facing:       no — CONFIG was never referenced by any action, tool window, or plugin.xml entry, so no icon that a user could ever see is removed; only dead code/resources are removed
verification:      review-only — no compile, no test ran (D-14). Post-commit checks: `test ! -f bbj-config.svg && test ! -f bbj-config_dark.svg` → ICONS_REMOVED; `grep -rn 'bbj-config' bbj-intellij/src/` → no hits (exit 1); `git ls-files bbj-intellij/src/main/resources/icons/ | wc -l` → 16, exactly two fewer than the pre-deletion count of 18; brace-balance check on all tracked bbj-intellij Java files → no UNBALANCED line.
commit:            2cf09a6
notes:             
```

```
row:               61
finding_id:        P63-D7-004
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java:18-23,75-84
dimension:         D7
severity:          low
effort:            2
verdict:           deferred
test_required:     yes (D-11 D7)
fail_before:       inapplicable — deferred, not applied (D-15)
failure_scenario:  Currently zero observable impact — both IDEs display the raw numeric expr in their summary line regardless of useConstants, and the actually-inserted statement text is correct on both sides. The latent risk is that a future
fix_applied:       not applied — deferred
user_facing:       no — deferred, not applied (no edit made)
verification:      review-only — no compile, no test ran (D-14); no JDK 17 on this machine, so no Gradle test can run either (D-15)
commit:            none — deferred per D-15
notes:             Deferred per D-15: D-11 requires a regression test for D7; no Gradle test can run in this environment (no JDK 17 — only Temurin 25.0.3 is installed). Rather than apply it untested or reclassify it, it is held. The test that would prove it once a supported JDK exists: a Gradle/Java unit test (or, absent Gradle test infra here, a manual round-trip) constructing a MsgboxPreview/CatalogItem JSON payload carrying exprText/constant and asserting Gson deserializes both fields onto ComposerModels.java's DTOs without silent drop. Applies unchanged once a JDK 17 is available. The only easy-fix record excluded for a reason this phase originates (D-03's two exclusions are on the reviewer's own recorded reason).
```

```
row:               62
finding_id:        P63-D8-001
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:42-45
dimension:         D8
severity:          low
effort:            2
verdict:           applied
test_required:     no (D-11 D8)
fail_before:       inapplicable — D-11 D8 no-behaviour-change default, no regression test required
failure_scenario:  n/a (D8 is a doc-accuracy finding) — a caller relying on the Javadoc's implied read-only contract (e.g. calling this method speculatively/defensively, assuming it cannot fail due to a write) is not warned that this "getter" can also fail for write-related reasons (permission, read-only filesystem, disk full) — which is exactly the ambiguity P63-D2-001 records as a correctness gap; this finding is the doc-accuracy half of that same code shape.
fix_applied:       Added one sentence to getCachedNodePath()'s Javadoc noting it creates the plugin's Node.js data directory (via getNodeDataDirectory()'s Files.createDirectories) as a side effect if it does not already exist.
user_facing:       no — Javadoc-only edit
verification:      review-only — no compile, no test ran (D-14). Comment-only proof (`git show <sha> -U0 -- BbjNodeDownloader.java | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)'`):
                    + * Note: as a side effect, this creates the plugin's Node.js data directory
                    + * if it does not already exist.
                    Both printed lines begin `*` — comment-only confirmed.
commit:            281f62c
notes:             
```

```
row:               63
finding_id:        P63-D8-002
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java:14-17,20-22
dimension:         D8
severity:          low
effort:            2
verdict:           applied
test_required:     no (D-11 D8)
fail_before:       inapplicable — D-11 D8 no-behaviour-change default, no regression test required
failure_scenario:  n/a (D8 is a doc-accuracy finding) — a future maintainer skimming the class Javadoc or a user reading the action's tooltip text ("Compile the current BBj file") receives no signal that this is unimplemented, unlike the honest inline TODO comment.
fix_applied:       Appended a "Not yet implemented — see referral P63-D7-001" sentence to the class Javadoc, naming that actionPerformed() currently only logs a message and does not send a compile command to the language server (confirmed by reading actionPerformed()'s body, lines 24-39). Took the Javadoc branch, not the constructor's description-string branch, to avoid a user-visible tooltip-text change.
user_facing:       no — class Javadoc only; the action's displayed name/description text ("Compile BBj File" / "Compile the current BBj file") is unchanged
verification:      review-only — no compile, no test ran (D-14). Comment-only proof:
                    + * Not yet implemented — see referral P63-D7-001; actionPerformed() currently only logs that
                    + * compile was triggered and does not send a compile command to the language server.
                    Both printed lines begin `*` — comment-only confirmed.
commit:            40da059
notes:             
```

```
row:               64
finding_id:        P63-D8-003
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:15-18
dimension:         D8
severity:          low
effort:            2
verdict:           applied
test_required:     no (D-11 D8)
fail_before:       inapplicable — D-11 D8 no-behaviour-change default, no regression test required
failure_scenario:  n/a (D8 is a doc-accuracy finding) — a reader relying on the Javadoc's specific "OS-native keychain" claim to reason about at-rest exposure or persistence-across-restart would be wrong on any install where the user has selected KeePass or "Do not save," neither of which this class detects or accounts for.
fix_applied:       Softened the class Javadoc's "stored in the OS-native keychain" claim to "stored via IntelliJ's PasswordSafe, backed by whichever credential store the user has configured (a native keychain, KeePass, or none)" — matches PasswordSafe.getInstance().set(...) (:34) exactly, without overstating the replacement guarantee either.
user_facing:       no — Javadoc-only edit
verification:      review-only — no compile, no test ran (D-14). Comment-only proof:
                    - * Tokens are keyed by a service name, stored in the OS-native keychain.
                    + * Tokens are keyed by a service name and stored via IntelliJ's PasswordSafe, backed by
                    + * whichever credential store the user has configured (a native keychain, KeePass, or none).
                    All three printed lines begin `*` — comment-only confirmed.
commit:            b57d98b
notes:             
```

```
row:               65
finding_id:        P63-D8-005
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java:1-14
dimension:         D8
severity:          low
effort:            2
verdict:           applied
test_required:     no (D-11 D8)
fail_before:       inapplicable — D-11 D8 no-behaviour-change default, no regression test required
failure_scenario:  A maintainer relying on the class doc's "mirroring" claim to assume Java's DTOs are a complete field-for-field reflection of the TS-side types would be wrong by exactly the two dormant fields P63-D7-004 records — not a functional bug today, since neither field is currently consumed by any UI, but a doc-accuracy gap that would mislead a reviewer checking DTO completeness by reading the comment alone instead of diffing the two sides.
fix_applied:       Softened "mirroring" to "carrying ... relevant to the IntelliJ dialogs" and added a one-line note naming the two intentionally-unused TS-side optional fields (MsgboxPreview.exprText, msgbox CatalogItem.constant) that P63-D7-004 traced. Took both branches the record offers rather than choosing one, since neither alone fully removed the overstatement. P63-D7-004 itself is deferred per D-15 — no field added; verified via `git diff <plan-start>..HEAD -- ComposerModels.java`, which shows comment-line changes only (see row 61 and this row's verification).
user_facing:       no — class comment only, no field/method change
verification:      review-only — no compile, no test ran (D-14). Comment-only proof (single-commit diff):
                    - * Gson-serializable data objects mirroring the language server's {@code bbj/composer/*} request
                    - * params and results (see {@code bbj-vscode/src/language/composer-commands.ts}). The BBj-side
                    - * TypeScript is the single source of truth for the flag/hex arithmetic (#433); these classes only
                    - * carry the JSON across LSP4IJ. Field names must match the JSON keys exactly.
                    + * Gson-serializable data objects carrying the language server's {@code bbj/composer/*} request
                    + * params and results relevant to the IntelliJ dialogs (see
                    + * {@code bbj-vscode/src/language/composer-commands.ts}). The BBj-side TypeScript is the single
                    + * source of truth for the flag/hex arithmetic (#433); these classes only carry the JSON across
                    + * LSP4IJ. Field names must match the JSON keys exactly.
                    + *
                    + * Note: two TypeScript-side optional fields are intentionally not mirrored here —
                    + * {@code MsgboxPreview.exprText} and msgbox {@code CatalogItem.constant} — since neither is
                    + * currently consumed by either IDE's UI; Gson silently drops them on deserialization.
                    All printed lines begin `*` — comment-only confirmed. `git diff --stat HEAD~4..HEAD -- ComposerModels.java` (run from Task 3) additionally confirms this is the only ComposerModels.java touch across the whole plan's 4-commit window ending at this plan's HEAD.
commit:            6ca6c49
notes:             
```

```
row:               66
finding_id:        P63-D8-006
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerLogToolWindowFactory.java:14-17,20-41
dimension:         D8
severity:          low
effort:            2 (revised 2026-08-18: recorded as 1, off INVENTORY §3d's locked {2,4,8} scale. Rounded DOWN to the nearest legal value so the finding remains labellable for ISSUE-03, which uses the effort value as the label with no translation step. Rounding down rather than up preserves the reviewer's evident intent — 1 was chosen to mean 'below the 4 bucket'. Original value retained here.)
verdict:           applied
test_required:     no (D-11 D8)
fail_before:       inapplicable — D-11 D8 no-behaviour-change default, no regression test required
failure_scenario:  A developer who opens this tool window expecting to see the language server's own diagnostic stdout/stderr output — the exact promise the class doc and the window's own initial message ("BBj Language Server log initialized") make — sees only the small set of status-transition strings this unit's code happens to log, never the server process's own console output, reducing the window's diagnostic value below what its documentation promises.
fix_applied:       Corrected the class Javadoc to describe what the window actually shows — curated status-transition messages logged via BbjServerService#logToConsole (server status changes, auto-restart, crash notifications) — rather than raw server stdout/stderr, which createToolWindowContent() never attaches to. Took the Javadoc-correction branch; the record's own behaviour-changing alternative (wiring the process's real stdout/stderr into the console) is out of this easy-fix's scope per the record itself.
user_facing:       no — Javadoc-only edit; the console's actual displayed content is unchanged
verification:      review-only — no compile, no test ran (D-14). Comment-only proof:
                    - * Creates a console view that displays real-time server stdout/stderr.
                    + * Creates a console view that displays curated status-transition messages logged via
                    + * {@link BbjServerService#logToConsole} (e.g. server status changes, auto-restart, crash
                    + * notifications) — not the raw stdout/stderr of the spawned language server process itself,
                    + * which this window does not attach to.
                    All printed lines begin `*` — comment-only confirmed.
commit:            46a8d8c
notes:             
```

```
row:               67
finding_id:        P63-D8-007
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:24-28
dimension:         D8
severity:          low
effort:            2 (revised 2026-08-18: recorded as 1, off INVENTORY §3d's locked {2,4,8} scale. Rounded DOWN to the nearest legal value so the finding remains labellable for ISSUE-03, which uses the effort value as the label with no translation step. Rounding down rather than up preserves the reviewer's evident intent — 1 was chosen to mean 'below the 4 bucket'. Original value retained here.)
verdict:           applied
test_required:     no (D-11 D8)
fail_before:       inapplicable — D-11 D8 no-behaviour-change default, no regression test required
failure_scenario:  A reader of this class's own doc reasonably assumes rapid repeated restart triggers are already deduplicated somewhere in this class, when in fact — per P63-D2-013 — none of the six real trigger paths goes through that debouncing at all.
fix_applied:       DEVIATION FROM PLAN, recorded per this row's own must_haves obligation to verify every corrected Javadoc claim against the code as read: the plan instructed removing the "debounced restart scheduling" claim outright, on the premise (inherited from P63-D2-013's evidence) that scheduleRestart() has "zero call sites anywhere in the codebase." Verification found this premise false — `grep -rn "\.restart()\|scheduleRestart()" bbj-intellij/src/main/java/` shows exactly one scheduleRestart() call site, BbjSettingsConfigurable.apply():83, present since v1.2 (commit 35c916b, `git log -S scheduleRestart`), predating the Phase 63 review. Applied a corrected-not-removed edit instead: the class doc now names the one real debounced path (settings-apply) and the six direct-restart() bypass sites P63-D2-013 itself enumerated (manual restart action, crash notification, both status bar widgets, refresh Java classes, crash auto-restart), which remains accurate. This is a documented divergence, not a silent adjustment.
user_facing:       no — Javadoc-only edit
verification:      review-only — no compile, no test ran (D-14). Comment-only proof:
                    - * Centralizes server start/stop/restart operations, debounced restart scheduling,
                    - * crash recovery with auto-restart logic, and status broadcast to UI components.
                    + * Centralizes server start/stop/restart operations, crash recovery with auto-restart logic,
                    + * and status broadcast to UI components. {@link #scheduleRestart()} offers a debounced restart
                    + * path, but only the settings-apply flow ({@code BbjSettingsConfigurable#apply()}) uses it — the
                    + * other restart triggers (manual restart action, crash notification, status bar widgets, refresh
                    + * Java classes, crash auto-restart) call {@link #restart()} directly with no debounce.
                    All printed lines begin `*` — comment-only confirmed.
commit:            18d5cc0
notes:             P63-D2-013's own evidence text is inaccurate on this one point (the "zero call sites" claim) even though its broader conclusion — most restart triggers bypass the debounce — remains correct and independently reverified above. Not raised as a new finding since P63-D2-013 is already a filed major-refactor record and this is a narrow evidence correction within its own scope, not a new defect; flagged here so the phase-close reviewer sees it rather than re-deriving it.
```

```
row:               68
finding_id:        P63-D8-008
unit:              RU-63-02
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjColorSettingsPage.java:117-120
dimension:         D8
severity:          low
effort:            2
verdict:           applied
test_required:     no (D-11 D8)
fail_before:       inapplicable — D-11 D8 no-behaviour-change default, no regression test required
failure_scenario:  n/a (D8 is a doc-accuracy finding) — a developer who copies the Settings > Color Scheme demo pane's block-comment syntax as a template for a real BBj documentation comment writes an invalid delimiter that the grammar's own DOCU terminal will not recognize as a documentation comment.
fix_applied:       Changed the block-comment opener in getDemoText()'s sample from "/@" to "/@@" at line 117, matching bbj.langium:953's DOCU terminal (`/\/@@[\s\S]*?@\//`) and bbj.tmLanguage.json's comment.block.bbj rule, both verified by reading. Confirmed against both files before editing.
user_facing:       yes — this text renders in the visible preview pane of Settings > Editor > Color Scheme > BBj
verification:      review-only — no compile, no test ran (D-14). `git show -U0` output:
                    -                <bc>/@
                    +                <bc>/@@
                    CAVEAT (recorded rather than glossed): unlike the other eight rows in this plan, this edit is inside getDemoText()'s Java text-block String literal — sample data representing BBj source, not a Java-source comment. The changed line's content after the leading +/- ("                <bc>/@") does not begin with `*`, `/**`, `*/` or `//`, so the phase_conventions mechanical comment-only-proof syntax check does not literally pass here, even though the edit is confined to exactly one character of demo-text data and changes no Java code semantics. Read-verified instead: the diff touches only this one line inside the getDemoText() text block; getHighlighter() (the method actually driving live highlighting) is unaffected, per P63-D4-012's existing finding that getHighlighter() is a no-op.
commit:            97a2e6b
notes:             The plan's Task 2 acceptance criteria requires the comment-only proof for this row alongside the other three D8 commits in that task; this row's own nature (data content, not Java comment syntax) makes that specific check inapplicable as literally worded. Recorded as a plan-convention discrepancy per this phase's established practice (see row 59's D-14 divergence) rather than fabricating a passing proof.
```

```
row:               69
finding_id:        P64-D2-004
unit:              RU-64-01
location:          .github/workflows/pr-validation.yml:8-13
dimension:         D2
severity:          medium
effort:            2
verdict:           applied
test_required:     yes (D-11 D2) — overridden per D-16: a GitHub Actions workflow cannot carry a
                    vitest regression test in this repository, so D-16's tool-native check (the
                    js-yaml parse plus the two `git ls-files` counts below) stands in its place.
fail_before:       Before the edit, `bbj-vscode/out/language/**` matched zero tracked files
                    (`git ls-files bbj-vscode/out | wc -l` → 0), so no pull request touching
                    `src/language/` could ever trigger `pr-validation.yml`.
failure_scenario:  A pull request edits `bbj-vscode/src/language/bbj-module.ts`, or any of the other 52 tracked files under `src/language/`, and nothing else. The `paths:` filter at `:8-13` matches none of the changed files, so `pr-validation.yml` is skipped
fix_applied:       Replaced the glob `'bbj-vscode/out/language/**'` at `:10` with
                    `'bbj-vscode/src/language/**'`, the 52 tracked files `out/language/main.cjs` is
                    actually built from (recount: `git ls-files bbj-vscode/src/language | wc -l`
                    reports 52, not the record's estimated 53 — recorded here as the actual measured
                    count rather than silently carrying the record's figure forward).
user_facing:       no — CI-surface only
verification:      YAML parse via js-yaml: `pr-validation.yml`'s `on.pull_request.paths` now
                    contains `bbj-vscode/src/language/**`; `git ls-files bbj-vscode/out | wc -l` = 0,
                    `git ls-files bbj-vscode/src/language | wc -l` = 52. no CI run occurred — no
                    GitHub Actions run is possible in this environment. Confirmed `pr-validation.yml`
                    references no `secrets.*` (T-67-10-02): `grep -n secret .github/workflows/pr-validation.yml`
                    returns nothing, so the widened trigger surface reaches no secret-holding job.
commit:            d6e0dee (fix)
notes:              D-11→D-16 override argued above: D2 nominally requires a red/green regression
                    test, but no vitest test can exercise a GitHub Actions trigger filter in this
                    environment, so D-16's YAML-parse-plus-file-count check is the strongest
                    verification this artefact type admits, and that is exactly what ran.
```

```
row:               70
finding_id:        P64-D4-004
unit:              RU-64-01
location:          .github/workflows/build.yml:4-6
dimension:         D4
severity:          low
effort:            2
verdict:           applied
test_required:     no (D-11 D4) — D-16's tool-native check (YAML parse) applies since D4 is
                    no-regression-test by default and this is a workflow file
fail_before:       Before the edit, `build.yml`'s `on:` block declared two triggers, `push` (to the
                    nonexistent `typefox-dev` branch) and `pull_request`; `git branch -a | grep -i
                    typefox` returned nothing, confirming the `push` trigger was dead.
failure_scenario:  A contributor reads `build.yml:3-9` and concludes that pushes to a development branch are built by CI, and pushes work to a long-lived branch expecting it to be validated; nothing runs, and the absence of a check reads as "CI is not configured
fix_applied:       Deleted `build.yml:4-6` (the `push:` trigger and its `branches: [typefox-dev]`
                    list), leaving `on:` with the `pull_request` trigger only.
user_facing:       no — CI-surface only
verification:      YAML parse via js-yaml: `build.yml`'s `on` block now has exactly one key,
                    `pull_request`. no CI run occurred — no GitHub Actions run is possible in this
                    environment.
commit:            b816116 (chore)
notes:              Record's own disposition asks for it to be applied "alongside the P64-D3-002 decision about build.yml's paths: filter rather than before it, since both edit the same on: block." P64-D3-002 is major-refactor and out of scope for this phase, so the sequencing could not be honoured. The easy/major classification stays the single routing rule; the reviewer's "alongside" note does not override it, and is not quietly dropped either — recorded per D-06.
```

```
row:               71
finding_id:        P64-D6-004
unit:              RU-64-01
location:          .github/workflows/build.yml:18-20
dimension:         D6
severity:          low
effort:            2
verdict:           applied
test_required:     tool-native check (D-14)
fail_before:       Before the edit, `build.yml:18` and `:20` referenced `actions/checkout@v3` and
                    `actions/setup-node@v3`, the only `@v3` references anywhere in `.github/workflows/`
                    — every other workflow, and `build.yml`'s own `actions/upload-artifact@v4` at
                    `:41`, was already on `@v4`.
failure_scenario:  A contributor reads `build.yml` to copy the standard checkout-and-setup preamble into a new workflow — the preamble being duplicated across five files already, `P64-D4-003` — and copies the `@v3` pair, propagating the stale reference. More
fix_applied:       Changed `@v3` to `@v4` on the `actions/checkout` and `actions/setup-node`
                    references (post-`P64-D4-004` line numbers, matched by action name).
                    `actions/upload-artifact@v4` at `:41` left untouched — already correct.
user_facing:       no — CI-surface only
verification:      YAML parse via js-yaml over `build.yml`'s `jobs.*.steps[].uses` prints
                    `["actions/checkout@v4","actions/setup-node@v4","actions/upload-artifact@v4"]` —
                    all three action references now on `@v4`, none on `@v3`. No `actionlint` binary
                    is present on this machine (`command -v actionlint` returns nothing), so the
                    js-yaml parse is the strongest check available. no CI run occurred.
commit:            ad3dfa7 (chore)
notes:              tool-native check per D-16 — no CI run occurred.
```

```
row:               72
finding_id:        P64-D6-009
unit:              RU-64-02
location:          bbj-vscode/package-lock.json:3
dimension:         D6
severity:          low
effort:            2
verdict:           applied
test_required:     tool-native check (D-14)
fail_before:       Before the edit, `package-lock.json:3`'s root `version` and `packages[""].version`
                    both read `0.11.0` while `package.json:3` read `0.12.0`
                    (`node -e "const l=require('./package-lock.json');console.log(l.version)"` → `0.11.0`).
failure_scenario:  A release engineer, an SBOM generator, or a reproducibility audit reads the
                    lockfile to establish what version of `bbj-lang` a given dependency graph belongs
                    to — the ordinary reason to read a lockfile's root entry rather than the manifest
                    — and gets `0.11.0` for a tree that is `0.12.0`. Any artefact keyed on that value
                    (a generated SBOM, a provenance attestation, a release-note diff between two
                    lockfiles) records the wrong version, and the error is silent because nothing in
                    `npm ci`'s sync check compares the root `version` field. It also means the
                    committed lockfile is not byte-identical to the one `npm install` would produce
                    from the current manifest, so the next dependency change will carry an unrelated
                    version-line diff that obscures the real one in review.
fix_applied:       Ran `npm install --package-lock-only` in `bbj-vscode/`; the resulting diff is
                    confined to the two `version` lines (`git diff --stat package-lock.json` → 1 file
                    changed, 2 insertions, 2 deletions). The 593-entry dependency graph is unchanged.
user_facing:       no — metadata only
verification:      `node -e "const l=require('./package-lock.json');console.log(l.version,
                    l.packages[''].version, Object.keys(l.packages).filter(k=>k.startsWith('node_modules/')).length)"`
                    prints `0.12.0 0.12.0 593` — both version fields now match the manifest and the
                    node_modules entry count is unchanged. `git diff bbj-vscode/package.json` empty.
                    no CI run occurred; `cd bbj-vscode && npm ci` exits 0 with this lockfile.
commit:            e2ebb11 (chore)
notes:              tool-native check per D-16 — no CI run occurred. Ordered before P64-D6-013 per
                    the plan's own sequencing so the two lockfile edits do not merge into one diff.
```

```
row:               73
finding_id:        P64-D6-013
unit:              RU-64-02
location:          bbj-vscode/package-lock.json:2172
dimension:         D6
severity:          medium
effort:            2
verdict:           applied
test_required:     tool-native check (D-14)
fail_before:       Before the edit, `npm audit --json` in `bbj-vscode/` reported 19 vulnerabilities
                    (7 moderate, 11 high, 1 critical), including the six named here (`ajv@8.17.1`,
                    `markdown-it@14.1.0`, `qs@6.14.1`, `uuid@8.3.2`, `@azure/msal-node@3.8.6`,
                    `@azure/identity@4.13.0`), each with `fixAvailable: true`.
failure_scenario:  Each of the six is a denial-of-service or bounds-check defect reachable only through `@vscode/vsce`'s own code paths, which execute during packaging and publishing — `preview.yml:62-68` and `manual-release.yml:84-90`, both inside jobs
fix_applied:       Task 2's blocking human checkpoint was approved: the human responded verbatim
                    "approved" after verifying all six packages against npmjs.com per the checkpoint's
                    four-point check. No Package Legitimacy Audit table exists for this project
                    (research disabled), so all six were treated as [ASSUMED]→verified by human review
                    against npmjs.com per the checkpoint's fallback policy, as its own acceptance
                    criteria require recording here.

                    Before applying, `npm audit fix --package-lock-only --dry-run --json` was run and
                    its `add`/`change`/`remove` arrays were all EMPTY (zero changes) even though the
                    `audit.vulnerabilities.*.fixAvailable` flags for all six named packages read
                    `true` — the dry run reported no work to do, a discrepancy from the live command's
                    actual behavior recorded below rather than silently glossed over.

                    Ran `npm audit fix --package-lock-only` (no `--force`) in `bbj-vscode/`. This did
                    NOT stop at a narrow update of the six named packages: it re-resolved and
                    committed a substantially wider slice of the dependency graph — `git diff --stat`
                    shows 154 insertions/172 deletions across `package-lock.json`, closing every one
                    of the 19 pre-existing advisories, not only the six moderate ones this record
                    names. Notably `@azure/msal-node` moved from `3.8.6` to `5.6.0` (a major-version
                    jump) and pulled in a new `@azure/msal-browser@5.19.0` peer — a bigger move than a
                    same-major transitive bump, but still entirely within npm's own semver-compatible
                    resolution (no `--force` used, and `package.json` is provably untouched, so no
                    declared dependency range changed to permit it — the wider resolution came from
                    npm's ordinary graph-consistency solving, not from a forced override).
                    `node_modules/` entry count moved 593 → 590 (a net decrease of 3, consistent with
                    deduplication as the graph re-settled, not an addition of new unresolved branches).
user_facing:       no — dependency-tree only; none of the six is a declared dependency of
                    `bbj-vscode/package.json`
verification:      `git diff bbj-vscode/package.json` is empty — the manifest is provably unchanged.
                    `cd bbj-vscode && npm ci` exits 0 against the new lockfile. `npm audit` after the
                    fix reports 0 vulnerabilities (down from 19), and no advisory that was absent
                    before is present after — the must_haves backstop truth is satisfied for exactly
                    this reason. Baseline-delta run (see `### Plan 67-10 delta` in `67-BASELINE.md`):
                    `npm run build` and `npm run lint` both exit 0 (lint zero warnings); `npm test`'s
                    failing-test NAME set is identical to the phase-start 11-name gate set (all in
                    `test/linking.test.ts`'s Interop related tests, traced to the unreachable
                    java-interop peer — unrelated to this dependency change). no CI run occurred — no
                    GitHub Actions run is possible in this environment.
commit:            14560eb (chore)
notes:              Human checkpoint response, verbatim: "approved". T-67-10-SC's mitigation
                    (blocking human checkpoint before any lockfile-mutating command) discharged as
                    designed. Recorded honestly per FIX-03's transparency prohibition: the actual
                    `npm audit fix --package-lock-only` outcome in this environment (npm 11.16.0)
                    went beyond the six-package, moderate-only remediation this record's own
                    classification test (5) names — it closed the entire 19-advisory audit surface in
                    one lockfile-only pass. This is recorded as a positive but larger-than-predicted
                    outcome, not claimed as the narrower scope the record originally described; the
                    scope actually applied is exactly and only what `npm audit fix --package-lock-only`
                    (no `--force`) produced, with `package.json` provably untouched throughout.
```

```
row:               74
finding_id:        P64-D8-003
unit:              RU-64-02
location:          .planning/reviews/INVENTORY.md:938
dimension:         D8
severity:          low
effort:            2
verdict:           excluded
test_required:     no (D-11 D8)
fail_before:       n/a — excluded, not applied
failure_scenario:  A later reader — Phase 68 assembling DOC-03, or anyone re-deriving this milestone's scope — reads line 938 and concludes that no installed package tree existed when Phase 64 ran, and therefore that this phase's SEC-08 answer must
fix_applied:       not applied
user_facing:       no
verification:      none — not applied
commit:            none — excluded
notes:             Record's own disposition: "a one-parenthetical correction. It is not applied by this phase: INVENTORY is immutable for v4.0 (Phase 60 D-09), so the record exists so that a post-milestone edit, or the next milestone's inventory, starts from the true state rather than from this one." — excluded — INVENTORY immutable (Phase 60 D-09), per D-03.
```

```
row:               75
finding_id:        P64-D8-004
unit:              RU-64-02
location:          .planning/reviews/INVENTORY.md:964
dimension:         D8
severity:          medium
effort:            2
verdict:           excluded
test_required:     no (D-11 D8)
fail_before:       n/a — excluded, not applied
failure_scenario:  Without this record and D-20's adoption, the milestone's SEC-08 claim — "every npm and Gradle dependency with a known vulnerability, enumerated and triaged" — would rest on an unexamined 43,583-byte third-party executable that runs on every
fix_applied:       not applied
user_facing:       no
verification:      none — not applied
commit:            none — excluded
notes:             Record's own disposition: "a two-row addition plus a totals adjustment, not applied by this phase because INVENTORY is immutable for v4.0 (Phase 60 D-09). Recorded so the next milestone's inventory starts from the true surface, and so Phase 68's DOC-03 can see why this phase reports 8 cells of coverage outside INVENTORY's 232-cell grid." — excluded — INVENTORY immutable (Phase 60 D-09), per D-03.
```

```
row:               76
finding_id:        P64-D8-005
unit:              RU-64-02
location:          bbj-vscode/vitest.config.ts:25-26
dimension:         D8
severity:          low
effort:            2
verdict:           applied
test_required:     no (D-11 D8) — comment-only, no behaviour change
fail_before:       inapplicable — D-11 classifies D8 as no-behaviour-change, so there is no failing
                    state to observe; the defect is the comment's claim itself, confirmed true before
                    the edit by `grep -rn 'test:coverage\|--coverage' .github/workflows/` returning
                    nothing while the old comment read "Fail build if coverage drops below thresholds".
failure_scenario:  A contributor or reviewer reads `vitest.config.ts` to answer "does this project guard against coverage regressions?" and the file answers yes, in two consecutive comment lines, with concrete numbers beside them. The true answer is that no
fix_applied:       Corrected the two comment lines at `vitest.config.ts:25-26` to state the
                    thresholds apply only to `npm run test:coverage`, which nothing currently
                    automates — no threshold value changed. `enabled: false` at `:8` (coverage off by
                    default) is unchanged.
user_facing:       no — documentation/comment only
verification:      `grep -rn 'test:coverage' .github/workflows/` returns no hits;
                    `bbj-vscode/vitest.config.ts` still contains `enabled: false`; `git show --stat
                    8713493` touches only `vitest.config.ts`, comment lines only, no threshold number
                    changed. no CI run occurred.
commit:            8713493 (docs)
notes:              D8 no-behaviour-change default applies as-is — no override needed.
```

```
row:               77
finding_id:        P66-D2-001
unit:              DEBT-03
location:          bbj-vscode/src/language/bbj-type-inferer.ts:75-76
dimension:         D2
severity:          medium
effort:            4
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at 382a068 — identical red observation as the P61-D2-011 row; this record re-verifies the same reproduction against current, byte-for-byte-unchanged code rather than a distinct one
failure_scenario:  Any static or instance Java method call whose JavaMethod.resolvedReturnType has not (yet, or ever) been populated — a resolution race, a partially resolved class, or any future code path constructing/updating a JavaMethod outside java-interop.ts's own resolveClass() Phase 2 — causes bbj-type-inferer.ts to silently return no type for that call site, with no diagnostic explaining why. Matches DEBT-03's documented symptom (String.valueOf(2) assigns no type to the target variable).
fix_applied:       Same edit as the P61-D2-011 row — one fallback in getTypeInternal's isJavaMethod branch, one commit pair, citing both finding IDs.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run test/method-return-java-type.test.ts test/linking.test.ts — same result as the P61-D2-011 row; see that row's verification for the full command output summary.
commit:            382a068 (red) + 32faeff (green)
notes:             D-04 merge — see the P61-D2-011 row for the shared edit and shared commit pair. P66-D2-001 is Phase 66's DEBT-03 re-triage citing P61-D2-011 by ID as the original reproduction; neither record was rewritten to fit the merge.
```

## Close-out

Closed at plan 67-12. `git rev-parse HEAD` at the time this audit ran: `533572b` (plan 67-12's own
Task 1 commit, `docs(67): record the phase-close baseline delta and the FIX-03 verdict`), itself
built on `56d6e85` (plan 67-11's last commit) — see `67-BASELINE.md`'s `close_commit`.

**Index/Rows reconciliation performed first (T-67-12-04-adjacent, not itself a threat register
item):** the Index table above had **seven** rows still reading `pending | pending` — the six the
orchestrator named (`P62-D2-010`, `P62-D3-001`, `P62-D5-006`, `P62-D8-002`, `P62-D2-011`,
`P64-D4-005`) plus a seventh the same drift produced, `P62-D4-005` (row 53), whose Rows-section
verdict was `applied` (commit `e6fc4fe`) while its Index entry still read `pending`. All seven are
corrected above to match their Rows-section verdict and commit. A row-by-row Index-vs-Rows diff run
against the corrected file (comparing all 77 `finding_id` → `verdict` pairs in both sections)
returns zero mismatches — the drift is fully reconciled, not just the six originally named.

**Row completeness gap found and fixed during this audit:** ten rows —
`P63-D4-001`, `P63-D4-014`, `P63-D8-001`, `P63-D8-002`, `P63-D8-003`, `P63-D8-005`, `P63-D8-006`,
`P63-D8-007`, `P63-D8-008` (plan 67-11's IntelliJ rows) and `P64-D6-009` (plan 67-10's lockfile
version-field row) — had no `failure_scenario:` field at all (the field was omitted entirely, not
left `TBD`, so the earlier `TBD`/`pending` grep did not catch it). Each was populated from the
originating record's own `failure_scenario:` text in `63-COVERAGE.md`/`64-COVERAGE.md`, quoted in
full. A field-completeness scan re-run after the fix over all 77 rows for `failure_scenario`,
`fix_applied`, `user_facing`, `verdict` and `test_required` returns zero empty fields. This is a
Rule 2 auto-fix (missing critical ledger content the plan's own acceptance criteria requires), not
a re-litigation of any row's verdict, commit, or fix — no `fix_applied`, `commit`, `user_facing` or
`verdict` field was touched.

### Denominator

**77 rows in.**

- **2 excluded**, on the reviewer's own recorded reason (D-03): `P64-D8-003`
  (`.planning/reviews/INVENTORY.md:938`) and `P64-D8-004` (`INVENTORY.md:964`) — both state in their
  own disposition text that INVENTORY is immutable for v4.0 (Phase 60 D-09).
- **1 deferred** (D-15): `P63-D7-004` — a D7 cross-IDE parity fix needing a Gradle regression test
  that cannot run without a JDK 17.
- **74 applied records** (77 − 2 − 1), composed of **70 rows with verdict `applied`** and
  **4 rows with verdict `no-op`**:
  - `P61-D8-001` — no commit of its own; resolved by `P61-D2-004`'s fix (`557ab62`).
  - `P61-D8-002` — no commit of its own; resolved by `P61-D2-005`'s fix (`4db8169`).
  - `P61-D8-006` — no commit of its own; resolved by `P61-D2-016`'s fix (`c47da5c`).
  - `P62-D5-004` — no commit of its own; the three assertions it names were landed as
    `P62-D2-007`/`P62-D2-008`/`P62-D2-009`'s own regression tests (`3a32cef`, `5026129`, `eb81320`).
- **73 distinct edits** (74 − 1): the D-04 merge (`P61-D2-011` + `P66-D2-001`) is one edit closing
  two records, applied and committed once (`382a068` red + `32faeff` green), so 74 records land as
  73 distinct edits.

Arithmetic: **77 records → 74 applied records (70 applied + 4 no-op) → 73 distinct edits.**

### Commit reconciliation

**Projected: 73 edits + 29 red-test commits = 102 code commits** (per `67-01-PLAN.md`'s D-12
estimate, restated in this file's own `## Reconciliation` section above).

**Actual, measured two ways:**

1. **From the ledger's own `commit:` fields** (mechanical extraction, all 77 rows): **98 unique
   commit shas**. Broken down: **29 unique shas labeled `(red)`/`(test)`** and **29 unique shas
   labeled `(green)`/`(fix)`** — exactly matching the 29 red-test-commit projection — plus **40
   further single/other shas** covering every D4/D5/D6/D8-alone edit that needed no test pair, and
   `P62-D2-011`'s one extra test-timing-fix commit (`73aadc8`, see that row's own `notes:`). Every
   one of the 98 resolves via `git cat-file -e` (checked individually, zero failures) and every
   `test_required: yes` row's red/test sha is confirmed an ancestor of its green/fix sha via
   `git merge-base --is-ancestor` (checked individually, zero failures).

   **The difference from the projection (102 − 98 = 4) is exactly the four no-op rows.** Each
   no-op row (`P61-D8-001`, `P61-D8-002`, `P61-D8-006`, `P62-D5-004`) is one of the 73 distinct
   edits the projection counted as needing a commit of its own, but each instead resolves by
   citing a commit already counted under a different row — so each subtracts exactly one commit
   from the naive per-edit total. `102 − 4 = 98`, matching the measured count exactly. Expected,
   not an error, per this row's own acceptance note.

2. **From git history directly:** `git log <start_commit>..HEAD --format=%s` (`start_commit` =
   `47bb785817d3e2949ed1ca9ba8363542cc7bde64`, per `67-BASELINE.md`) returns **135 subjects total**
   as of this audit's own HEAD. Of these, **99 name a finding ID** and **36 are plan-level
   `docs(67)`/`docs(67-NN)` commits** with no finding ID (baseline captures, ledger derivation,
   plan summaries, this close-out). **Zero subjects lack both** a finding-ID reference and a
   `67`/`67-NN` doc scope. The 99-vs-98 difference is exactly one commit: `e7f8239`
   (`docs(P61-D2-011,P66-D2-001): close apply-set rows`) cites both finding IDs in its subject —
   satisfying FIX-01's traceability intent — but is plan 67-01's own ledger-housekeeping commit,
   not one of the 73 edits' `commit:` field values, so it does not appear in the ledger-side count.

Both counts reconcile exactly with no unexplained remainder.

### FIX-01 verdict

**Discharged.** FIX-01 ("Each easy fix is low-risk and contained, and lands as its own atomic
commit referencing its finding ID") holds under the D-12 reading stated explicitly in
`67-CONTEXT.md`: **a red/green commit pair is the atomic unit for a behaviour-changing fix**, and
the D-04 merged commit pair closes two rows (`P61-D2-011` + `P66-D2-001`) citing both IDs in one
pair — this is one change that happens to close two records of the same defect, not a FIX-01
violation. Every commit referenced by the ledger resolves to a real commit (`git cat-file -e`,
zero failures across all 98). The commit-trace check above found zero commit subjects, across the
phase's full 135-commit span, that lack both a finding-ID reference and a `67`/`67-NN` doc scope —
so every code commit is traceable to the finding it closes.

**`REQUIREMENTS.md`'s FIX-01 text is not edited** by this task or any other in this phase.

### FIX-02 verdict

**Discharged, with the two documented exceptions D-11/D-13/D-16 already account for.** FIX-02
("Each behavior-changing fix ships with a regression test that fails before the fix and passes
after") is measured against D-11's classification: **30 records** (D2: 25, D3: 4, D7: 1 — all
counted only within the 74 applied records; the deferred D7 row `P63-D7-004` also carries
`test_required: yes` but is not applied, so it sits outside this 30) are classified
behaviour-changing and require a regression test. These 30 records realize as **29 red-test
commits**, because the D-04 merge folds `P61-D2-011`'s and `P66-D2-001`'s own D2 test obligations
into the single shared red commit `382a068`.

- **28 of the 29** carry an observed red state (`fail_before: observed at <sha>`, individually
  confirmed as ancestors of their green commit above).
- **1 of the 29** (`P61-D2-002`) carries `fail_before: inapplicable`, with reason recorded in the
  row's own `notes:`: rigorous reproduction against the real `vscode-jsonrpc` library (not a
  hand-rolled repro) found the claimed unhandled-rejection mechanism does not occur under real
  Node/V8 promise semantics, so no red state could be produced honestly. The fix is still applied
  verbatim per the record's own classification test, and this is argued as a D-04-style override
  in that row, not a silent skip.

Separately, D-13's own regression-test category — **13 D5 test-coverage-gap records** — record
`test_required: test-is-the-fix (D-13)` and `fail_before: inapplicable — a D5 row adds a missing
test against code that already works, so no red state is producible (D-13)` by construction; each
of the 13 rows' `notes:` records an anti-vacuous check (a deliberate local break, observed failure,
then revert) as the substitute evidence a literal red commit cannot provide. And **3 D6
dependency/workflow records** (`P64-D6-004`, `P64-D6-009`, `P64-D6-013`) plus **1 D2 workflow
record** (`P64-D2-004`, the genuine D-11→D-16 override — see `### Recorded departures`) record
`tool-native check (D-14)` / an explicit D-16 override in place of a vitest `fail_before`, because
no vitest test can exercise a GitHub Actions trigger filter or a lockfile version field — the
strongest check each artefact type admits, per D-16, ran in each case.

### FIX-04 verdict

**FIX-04 is not literally true at the end of Phase 67.** `.planning/reviews/EASY-FIXES.md` does
not exist — confirmed (`test ! -f .planning/reviews/EASY-FIXES.md` succeeds) — and is Phase 68's
DOC-01 deliverable, not something this phase is scoped to write (Claude's Discretion,
`67-CONTEXT.md`).

**What Phase 67 did instead:** every one of the 77 rows in this ledger carries the exact fields
DOC-01 requires — finding ID (`finding_id:`), `file:line` (`location:`), dimension
(`dimension:`), a verified failure scenario (`failure_scenario:` — now populated for all 77 rows
after this close-out's row-completeness fix), the fix applied (`fix_applied:`), and the commit
hash (`commit:`) — plus a `user_facing:` flag DOC-01 does not strictly require but that Phase 68
can use to prioritize which rows are user-visible behaviour changes versus internal-only edits.
**29 rows carry `user_facing: yes`.** Phase 68 assembles `EASY-FIXES.md` by lifting these fields
directly; nothing needs to be re-derived from source or from the COVERAGE files.

**`.planning/reviews/EASY-FIXES.md` and `MAJOR-REFACTORS.md` are deliberately not created by this
phase** — confirmed both absent, and `git status --porcelain .planning/reviews/` is empty (no
COVERAGE file and not INVENTORY.md was touched by this phase).

### Recorded departures

- **D-06 departure — `P64-D4-004` applied without its paired `P64-D3-002`.** The record's own
  disposition asked for it to be applied "alongside" `P64-D3-002`'s `build.yml` `paths:` filter
  decision; `P64-D3-002` is `major-refactor` and routes to Phase 68, so the sequencing could not be
  honoured. The easy/major classification stayed the single routing rule; the reviewer's aside is
  recorded, not silently dropped (row 70's own `notes:`).

- **The genuine D-11→D-16 override is `P64-D2-004` alone**, not three rows. D2's default (D-11)
  requires a vitest regression test; no vitest test can exercise a GitHub Actions `paths:` filter,
  so D-16's YAML-parse-plus-`git ls-files`-count check substitutes, argued explicitly in that row.
  `P64-D6-004` (D6) and `P64-D4-004` (D4) are not overrides in the same sense — D6's own D-11
  default is already "tool-native check," and D4's own D-11 default is already "no test required" —
  D-16 there only specifies which concrete check applies to a workflow-file artefact, not a
  departure from what D-11 already said.

- **Off-scale `effort:` values carried through unrounded, not silently re-scaled to
  INVENTORY §3d's `{2,4,8}` set:** `P61-D4-010` and `P61-D8-005` (`effort: 1`, no inline "rounded
  down" annotation found in either source record despite the plan text asserting one exists — the
  discrepancy is recorded in each row's own `notes:` rather than a fabricated quote); `P63-D8-006`
  and `P63-D8-007` (`effort: 2 (revised 2026-08-18: recorded as 1, off INVENTORY §3d's locked
  {2,4,8} scale...)` — rounded down from the source's raw `1` for ISSUE-03 labelling purposes, with
  the original value retained in the annotation).

- **`P61-D2-002`'s empirically-falsified failure claim.** Its evidence field claimed
  `Promise.race`'s losing branch leaks an unhandled rejection; empirical testing against the real
  `vscode-jsonrpc` library (not a hand-rolled repro) found this does not hold under real Node/V8
  promise semantics — no red state could be honestly produced. The fix was still applied verbatim
  per the record's own classification test, and `fail_before` is recorded `inapplicable` with the
  reason, argued as a D-04-style override in that row rather than silently forcing a fabricated red
  commit. **This is a finding-record accuracy issue Phase 68's `EASY-FIXES.md` inherits if it lifts
  the row's evidence uncritically — flagged here so it does not.**

- **`P63-D8-007`'s corrected-not-removed Javadoc, and the upstream finding-record error it
  exposes.** The plan instructed removing a "debounced restart scheduling" doc claim outright, on
  the premise (inherited from `P63-D2-013`'s own evidence) that `scheduleRestart()` has "zero call
  sites anywhere in the codebase." Verification found this premise **false**:
  `BbjSettingsConfigurable.apply():83` has called it since v1.2 (commit `35c916b`), predating the
  Phase 63 review entirely. The row applied a corrected edit instead of a removal, and the
  divergence is recorded in the row's own `fix_applied:` and `notes:`. **`P63-D2-013` is a filed
  major-refactor record Phase 68 documents in `MAJOR-REFACTORS.md` — this evidence error is flagged
  here so Phase 68 does not restate the "zero call sites" claim as fact.** Not raised as a new
  finding: `P63-D2-013`'s broader conclusion (most restart triggers bypass the debounce) remains
  correct and independently reverified in the row.

- **`P64-D6-013`'s actual scope exceeded its record's stated six-package remediation.** The record
  named six moderate-severity packages; the approved `npm audit fix --package-lock-only` (no
  `--force`) actually closed **all 19** pre-existing advisories (7 moderate, 11 high, 1 critical),
  including a major-version jump on `@azure/msal-node` (3.8.6 → 5.6.0) that pulled in a new
  `@azure/msal-browser` peer. `package.json` is provably untouched (`git diff bbj-vscode/package.json`
  empty), so the wider resolution came from npm's own graph-consistency solving under the approved
  command, not from a forced override or a broader edit than what was approved at the blocking
  human checkpoint. Recorded in the row's own `fix_applied:`/`notes:` as a positive but
  larger-than-predicted outcome. **Phase 68's `EASY-FIXES.md` should record the actual 19-advisory
  scope, not the record's original 6-package estimate, if it lifts this row.**

- **`P63-D4-001`'s D-14 divergence.** D-14 characterizes all nine applied IntelliJ rows as unable
  to change bytecode behaviour (comment/doc or naming-only edits); `P63-D4-001`'s five-way method
  split plus a new `Platform` helper enum is a genuine control-flow restructuring, not a rename or
  comment edit. Recorded per the plan's own flagged-assumption #1 — a statement-by-statement
  ordering trace is the row's own mitigation (its `verification:` field), since no compiler or test
  confirms it in this environment.

- **`P63-D8-008`'s comment-only-proof-check inapplicable caveat.** Unlike the other eight IntelliJ
  D8 rows, this edit is inside a Java text-block *string literal* (demo sample data), not Java
  comment syntax, so the phase's mechanical "diff line begins with `*`/`//`" comment-only proof
  does not literally apply. Read-verified instead, per the row's own `notes:`.

- **`P61-D5-004`'s blast-radius check surfaced no defect to carry forward.** The added regression
  test passed cleanly against the existing, already-committed `test/test-data/` fixtures on first
  run — no pre-existing parse defect was uncovered. Nothing routes to Phase 68 from this row.

- **Row-completeness fix applied during this close-out audit** (see the callout above the
  `### Denominator` heading): ten rows were missing their `failure_scenario:` field entirely and
  the Index table had seven (not six) rows drifted from their Rows-section verdict. Both are
  corrected in this same commit, sourced from the originating COVERAGE.md records and the Rows
  section itself respectively — no verdict, commit, or fix content was altered.
