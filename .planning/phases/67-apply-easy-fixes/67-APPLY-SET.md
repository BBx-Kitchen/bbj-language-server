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
| 1 | P61-D2-001 | pending | pending |
| 2 | P61-D2-002 | pending | pending |
| 3 | P61-D2-003 | pending | pending |
| 4 | P61-D2-004 | pending | pending |
| 5 | P61-D2-005 | pending | pending |
| 6 | P61-D2-006 | pending | pending |
| 7 | P61-D2-008 | pending | pending |
| 8 | P61-D2-009 | pending | pending |
| 9 | P61-D2-010 | pending | pending |
| 10 | P61-D2-011 | applied | 382a068 (red) + 32faeff (green) |
| 11 | P61-D2-013 | pending | pending |
| 12 | P61-D2-014 | pending | pending |
| 13 | P61-D2-015 | pending | pending |
| 14 | P61-D2-016 | pending | pending |
| 15 | P61-D2-017 | pending | pending |
| 16 | P61-D2-019 | pending | pending |
| 17 | P61-D3-001 | pending | pending |
| 18 | P61-D3-004 | pending | pending |
| 19 | P61-D3-005 | pending | pending |
| 20 | P61-D4-003 | pending | pending |
| 21 | P61-D4-005 | pending | pending |
| 22 | P61-D4-006 | pending | pending |
| 23 | P61-D4-008 | pending | pending |
| 24 | P61-D4-009 | pending | pending |
| 25 | P61-D4-010 | pending | pending |
| 26 | P61-D4-012 | pending | pending |
| 27 | P61-D5-004 | pending | pending |
| 28 | P61-D5-005 | pending | pending |
| 29 | P61-D5-006 | pending | pending |
| 30 | P61-D5-007 | pending | pending |
| 31 | P61-D5-008 | pending | pending |
| 32 | P61-D5-009 | applied | 2b121ee |
| 33 | P61-D5-011 | pending | pending |
| 34 | P61-D5-012 | pending | pending |
| 35 | P61-D5-015 | pending | pending |
| 36 | P61-D5-016 | pending | pending |
| 37 | P61-D5-017 | pending | pending |
| 38 | P61-D8-001 | pending | pending |
| 39 | P61-D8-002 | pending | pending |
| 40 | P61-D8-003 | pending | pending |
| 41 | P61-D8-004 | pending | pending |
| 42 | P61-D8-005 | pending | pending |
| 43 | P61-D8-006 | pending | pending |
| 44 | P61-D8-007 | pending | pending |
| 45 | P62-D2-004 | pending | pending |
| 46 | P62-D2-006 | pending | pending |
| 47 | P62-D2-007 | pending | pending |
| 48 | P62-D2-008 | pending | pending |
| 49 | P62-D2-009 | pending | pending |
| 50 | P62-D2-010 | pending | pending |
| 51 | P62-D2-011 | pending | pending |
| 52 | P62-D3-001 | pending | pending |
| 53 | P62-D4-005 | pending | pending |
| 54 | P62-D5-004 | pending | pending |
| 55 | P62-D5-006 | pending | pending |
| 56 | P62-D7-002 | pending | pending |
| 57 | P62-D8-001 | pending | pending |
| 58 | P62-D8-002 | pending | pending |
| 59 | P63-D4-001 | pending | pending |
| 60 | P63-D4-014 | pending | pending |
| 61 | P63-D7-004 | deferred | none — deferred, no JDK 17 available |
| 62 | P63-D8-001 | pending | pending |
| 63 | P63-D8-002 | pending | pending |
| 64 | P63-D8-003 | pending | pending |
| 65 | P63-D8-005 | pending | pending |
| 66 | P63-D8-006 | pending | pending |
| 67 | P63-D8-007 | pending | pending |
| 68 | P63-D8-008 | pending | pending |
| 69 | P64-D2-004 | pending | pending |
| 70 | P64-D4-004 | pending | pending |
| 71 | P64-D6-004 | pending | pending |
| 72 | P64-D6-009 | pending | pending |
| 73 | P64-D6-013 | pending | pending |
| 74 | P64-D8-003 | excluded | none — excluded |
| 75 | P64-D8-004 | excluded | none — excluded |
| 76 | P64-D8-005 | pending | pending |
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
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  (a) Two Java-class lookups fire in the same tick while disconnected — each opens its own socket, one is leaked. (b) The peer is killed mid-session — every subsequent resolveClassByName call reuses the dead connection object
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
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
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  A slow peer answers a getClassInfo request just after the 10s timeout has already rejected the race; the late-settling sendRequest(...) promise then rejects with no handler, surfacing as an unhandledRejection at the process
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               3
finding_id:        P61-D2-003
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:576-585
dimension:         D2
severity:          medium
effort:            2
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  A malformed or malicious getClassInfo response with a missing/null fields or methods array throws an uncaught TypeError: Cannot read properties of undefined synchronously inside resolveClass(), propagating out of the
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
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
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  The classpath is reloaded via main.ts's didChangeConfiguration path (clearCache() then loadClasspath()); the stale completeClassIndex built for the previous classpath survives and continues to answer
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
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
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  A BBj source string literal containing a doubled-quote escape (e.g. `"He said ""hi"""`) parses without error, but StringLiteral.value retains the literal `""` sequence instead of the single embedded `"` the language's own
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               6
finding_id:        P61-D2-006
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj-lexer.ts:11-34
dimension:         D2
severity:          medium
effort:            4
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  A .bbj file containing mixed line endings (at least one \r\n line and at least one bare \n line — plausible when a repository lacks .gitattributes EOL normalization, or a file is edited across Windows/Unix tooling) is
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               7
finding_id:        P61-D2-008
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj-token-builder.ts:67-71
dimension:         D2
severity:          low
effort:            2
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  If any of the 14 hardcoded terminal names passed to spliceToken becomes absent from `tokens` — e.g. a future grammar edit renames or removes RPAREN_NL — findIndex returns -1 and `tokens.splice(-1, 1)` silently
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               8
finding_id:        P61-D2-009
unit:              RU-61-03
location:          bbj-vscode/src/language/bbj-cpl-parser.ts:40-46
dimension:         D2
severity:          low
effort:            2
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  bbjcpl emits (or a future compiler version emits, or a malformed/truncated compiler invocation produces) an error line reporting physical line 0, or a line number exceeding the LSP client's document's actual line count;
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
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
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  Any BBj program containing a class/method whose body assigns and then reads a local variable, where an unrelated Program-scope (or enclosing-method-scope) variable happens to share the same case-insensitive
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
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
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  A user types quickly inside a type-reference position; the editor cancels an earlier completion request as a newer one supersedes it (standard LSP behavior on rapid keystrokes). The cancelled request's
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               12
finding_id:        P61-D2-014
unit:              RU-61-04
location:          bbj-vscode/src/language/bbj-document-symbol-provider.ts:155,173-182
dimension:         D2
severity:          low
effort:            2
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  In a document with parser errors under LARGE_FILE_THRESHOLD (triggering the deep-walk fallback, line 52), two distinct named nodes that happen to start at the identical line/character produce only one outline entry instead of two;
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               13
finding_id:        P61-D2-015
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-ws-manager.ts:106-141
dimension:         D2
severity:          medium
effort:            4
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  A multi-root VS Code workspace has folder A (with project.properties defining PREFIX/classpath) and folder B (a second root, e.g. a shared library project with its own project.properties). If folder A is listed
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               14
finding_id:        P61-D2-016
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-ws-manager.ts:179-182
dimension:         D2
severity:          medium
effort:            2
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  A malformed project.properties file, or an unexpected synchronous throw inside parseSettings()/collectPrefixes(), causes initializeWorkspace() to exit its try block early. `this.settings` is left undefined or
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               15
finding_id:        P61-D2-017
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-document-builder.ts:155-190
dimension:         D2
severity:          medium
effort:            2
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  `cplService.compile(key)` (or `notifyDocumentPhase`) rejects — e.g. an unexpected error inside BBjCPLService's process-spawn/parse path. The async setTimeout callback's returned promise rejects with no attached handler,
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               16
finding_id:        P61-D2-019
unit:              RU-61-07
location:          bbj-vscode/src/language/lib/events.ts:57,528,62,533
dimension:         D2
severity:          low
effort:            2
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  A reference to ON_MOUSE_ENTER or ON_MOUSE_EXIT always resolves to the first declaration (line 57/62); the second declaration's distinct DOCU text is permanently unreachable by linking. Completion's getAllElements()
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               17
finding_id:        P61-D3-001
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:40-48
dimension:         D3
severity:          low
effort:            4
verdict:           pending
test_required:     yes (D-11 D3)
fail_before:       TBD
failure_scenario:  A long-running editor session against a large/varied classpath (many `use`d packages over time) grows these maps without bound, increasing steady-state memory usage monotonically until the server is restarted.
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               18
finding_id:        P61-D3-004
unit:              RU-61-04
location:          bbj-vscode/src/language/bbj-completion-provider.ts:90-116
dimension:         D3
severity:          medium
effort:            4
verdict:           pending
test_required:     yes (D-11 D3)
fail_before:       TBD
failure_scenario:  Typing a Java class name prefix character-by-character inside a type reference (e.g. "H", "Ha", "Has", "Hash", "HashM", "HashMa", "HashMap") in a workspace with a large classpath re-runs the full completeClassIndex/
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               19
finding_id:        P61-D3-005
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-document-builder.ts:359-411
dimension:         D3
severity:          medium
effort:            4
verdict:           pending
test_required:     yes (D-11 D3)
fail_before:       TBD
failure_scenario:  A workspace with a large indexed class count and several documents each carrying multiple unresolved USE-file diagnostics triggers, on every incremental rebuild touching those documents, one full pass over the entire
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               20
finding_id:        P61-D4-003
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:175-314
dimension:         D4
severity:          low
effort:            4
verdict:           pending
test_required:     no (D-11 D4)
fail_before:       TBD
failure_scenario:  n/a (D4 trace-tier finding): a change to the shared connect+send+catch shape (e.g. adding a retry, or the circuit breaker recommended by P61-D3-002) must be applied in up to 4 places by hand, risking drift
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               21
finding_id:        P61-D4-005
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj-token-builder.ts:7-64
dimension:         D4
severity:          low
effort:            4
verdict:           pending
test_required:     no (D-11 D4)
fail_before:       TBD
failure_scenario:  n/a (D4 trace-tier finding — the code shape itself is the defect, not a runtime failure): a future change to token priority ordering (the spliceToken block) risks an accidental edit inside the unrelated
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               22
finding_id:        P61-D4-006
unit:              RU-61-03
location:          bbj-vscode/src/language/bbj-validator.ts:266-311
dimension:         D4
severity:          low
effort:            2
verdict:           pending
test_required:     no (D-11 D4)
fail_before:       TBD
failure_scenario:  n/a (D4 trace-tier finding — the code shape itself is the defect, not a runtime failure): ~46 lines of dead, unreachable code sit alongside the working implementation with an almost-identical name and shape; a future
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               23
finding_id:        P61-D4-008
unit:              RU-61-02
location:          bbj-vscode/src/language/bbj-linker.ts:155-212
dimension:         D4
severity:          low
effort:            2
verdict:           pending
test_required:     no (D-11 D4)
fail_before:       TBD
failure_scenario:  n/a (D4 trace-tier finding — the code shape itself is the defect, not a runtime failure): a change to the workspace-root resolution strategy (e.g. supporting multi-root workspaces properly instead of always
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               24
finding_id:        P61-D4-009
unit:              RU-61-02
location:          bbj-vscode/src/language/assertions.ts:1-4
dimension:         D4
severity:          low
effort:            2
verdict:           pending
test_required:     no (D-11 D4)
fail_before:       TBD
failure_scenario:  n/a (D4 trace-tier finding — dead code, not a runtime failure): the module ships in the bundle with no consumer; a future contributor cannot tell from the code alone whether it is vestigial or intentionally kept for future use.
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               25
finding_id:        P61-D4-010
unit:              RU-61-04
location:          bbj-vscode/src/language/bbj-document-symbol-provider.ts:75,149
dimension:         D4
severity:          low
effort:            1
verdict:           pending
test_required:     no (D-11 D4)
fail_before:       TBD
failure_scenario:  n/a (D4 trace-tier finding — the lint warning itself is the defect, not a runtime failure): the directives no longer suppress anything, adding noise to `npm run lint`'s output and masking whether a future, genuinely-needed
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             effort recorded as `1` in the source record — an off-scale value outside INVENTORY §3d's locked {2,4,8} effort scale. Carried through unchanged per this phase's off-scale handling instruction; not re-rounded to `2`. (The source record itself carries no additional inline annotation beyond the raw `effort: 1` value.) This is the same edit D-10 identifies as clearing both of npm run lint's pre-existing warnings.
```

```
row:               26
finding_id:        P61-D4-012
unit:              RU-61-05
location:          bbj-vscode/src/language/main.ts:32-73,147-188
dimension:         D4
severity:          medium
effort:            4
verdict:           pending
test_required:     no (D-11 D4)
fail_before:       TBD
failure_scenario:  n/a (D4 trace-tier finding — the code shape itself is the defect, not a runtime failure): a future change to this reload-and-revalidate sequence (e.g. adding a new step, or fixing P61-D2-016/P61-D2-018) must be applied by
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               27
finding_id:        P61-D5-004
unit:              RU-61-01
location:          bbj-vscode/test/example-files.test.ts:16-20
dimension:         D5
severity:          low
effort:            2
verdict:           pending
test_required:     test-is-the-fix (D-13)
fail_before:       TBD
failure_scenario:  A future .bbj file added to test/test-data/ that fails to lex or parse would NOT fail this test, silently defeating the regression-test guarantee CLAUDE.md's Testing Pattern section states: "Every .bbj file in
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               28
finding_id:        P61-D5-005
unit:              RU-61-03
location:          bbj-vscode/test/cpl-service.test.ts:1-133
dimension:         D5
severity:          medium
effort:            2
verdict:           pending
test_required:     test-is-the-fix (D-13)
fail_before:       TBD
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a future change to getBbjcplPath()/compile()'s path-validation behavior (e.g. a fix for P61-D1-003) has no existing regression test to confirm it
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               29
finding_id:        P61-D5-006
unit:              RU-61-03
location:          bbj-vscode/src/language/validations/line-break-validation.ts:294-318
dimension:         D5
severity:          low
effort:            2
verdict:           pending
test_required:     test-is-the-fix (D-13)
fail_before:       TBD
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a regression in hasLinebreakBefore/hasLinebreakAfter's CRLF or final-line handling would pass the full npm test suite undetected, because no test
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               30
finding_id:        P61-D5-007
unit:              RU-61-02
location:          bbj-vscode/src/language/bbj-overload-selector.ts:32-52
dimension:         D5
severity:          medium
effort:            2
verdict:           pending
test_required:     test-is-the-fix (D-13)
fail_before:       TBD
failure_scenario:  n/a (D5 trace-tier finding — missing test, not a runtime failure): a future change to the tie-break comparison (e.g. `>` to `>=` on line 46) would silently flip which overload wins ties with no test catching the regression.
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               31
finding_id:        P61-D5-008
unit:              RU-61-02
location:          bbj-vscode/src/language/bbj-scope.ts:253-292
dimension:         D5
severity:          medium
effort:            2
verdict:           pending
test_required:     test-is-the-fix (D-13)
fail_before:       TBD
failure_scenario:  n/a (D5 trace-tier finding — missing test, not a runtime failure): a future change to the local-vs-member scope nesting order in this branch would go undetected by the existing test suite.
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
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
verdict:           pending
test_required:     test-is-the-fix (D-13)
fail_before:       TBD
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a regression in the active-parameter calculation (getActiveParameter), the rendered signature label, or the markdown documentation block would pass the
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               34
finding_id:        P61-D5-012
unit:              RU-61-04
location:          bbj-vscode/src/language/bbj-hover.ts:55-109
dimension:         D5
severity:          medium
effort:            2
verdict:           pending
test_required:     test-is-the-fix (D-13)
fail_before:       TBD
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a regression in inherited-field detection (e.g. always reporting "inherited"), the Javadoc-provider integration, or the error-degrade path silently
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               35
finding_id:        P61-D5-015
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-notifications.ts:1-53
dimension:         D5
severity:          low
effort:            2
verdict:           pending
test_required:     test-is-the-fix (D-13)
fail_before:       TBD
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a regression in the dedup guard (e.g. always sending, or never sending after the first call) would pass `npm test` undetected.
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               36
finding_id:        P61-D5-016
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-document-builder.ts:90-222
dimension:         D5
severity:          medium
effort:            4
verdict:           pending
test_required:     test-is-the-fix (D-13)
fail_before:       TBD
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a regression in the debounce timing, the lazy-availability-check's once-only guard, or the trigger-mode dispatch (P61-D2-017's unhandled-
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               37
finding_id:        P61-D5-017
unit:              RU-61-07
location:          bbj-vscode/test/builtin-functions-library.test.ts
dimension:         D5
severity:          medium
effort:            4
verdict:           pending
test_required:     test-is-the-fix (D-13)
fail_before:       TBD
failure_scenario:  A malformed entry added to labels.ts, variables.ts or events.ts (e.g. a name colliding with a reserved keyword, breaking the LibSymbolicLabel/ LibVariable/LibEventType parse) silently disables completion/hover for
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               38
finding_id:        P61-D8-001
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:757-760
dimension:         D8
severity:          low
effort:            2
verdict:           pending
test_required:     no (D-11 D8)
fail_before:       TBD
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a runtime failure): a reader of clearCache()'s doc comment reasonably concludes calling it leaves no stale cached state, which is false for the
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               39
finding_id:        P61-D8-002
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj.langium:948
dimension:         D8
severity:          low
effort:            2
verdict:           pending
test_required:     no (D-11 D8)
fail_before:       TBD
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a runtime failure): a reader of this comment reasonably concludes escaped double-quotes are already normalized in the parsed AST value, which is
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               40
finding_id:        P61-D8-003
unit:              RU-61-03
location:          CLAUDE.md:34
dimension:         D8
severity:          low
effort:            2
verdict:           pending
test_required:     no (D-11 D8)
fail_before:       TBD
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a runtime failure): a reader of CLAUDE.md's Architecture section forms an incomplete picture of the validation surface, unaware that
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               41
finding_id:        P61-D8-004
unit:              RU-61-03
location:          bbj-vscode/src/language/bbj-cpl-service.ts:48-49,203-207
dimension:         D8
severity:          low
effort:            2
verdict:           pending
test_required:     no (D-11 D8)
fail_before:       TBD
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a runtime failure): a reader of compile()'s class-level comment could wrongly conclude BBjCPL diagnostics are not yet surfaced to users (they are, via
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               42
finding_id:        P61-D8-005
unit:              RU-61-04
location:          CLAUDE.md (repo root) §Architecture → Langium Pipeline → Key services, "Completion" bullet
dimension:         D8
severity:          low
effort:            1
verdict:           pending
test_required:     no (D-11 D8)
fail_before:       TBD
failure_scenario:  n/a (D8 trace-tier finding — a documentation-completeness defect, not a runtime failure): a reader of CLAUDE.md's architecture overview reasonably concludes Completion is the only custom LSP feature provider of note in this
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             effort recorded as `1` in the source record — an off-scale value outside INVENTORY §3d's locked {2,4,8} effort scale. Carried through unchanged per this phase's off-scale handling instruction; not re-rounded to `2`. (The source record itself carries no additional inline annotation beyond the raw `effort: 1` value.)
```

```
row:               43
finding_id:        P61-D8-006
unit:              RU-61-05
location:          bbj-vscode/src/language/bbj-ws-manager.ts:180
dimension:         D8
severity:          low
effort:            2
verdict:           pending
test_required:     no (D-11 D8)
fail_before:       TBD
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a runtime failure): a reader of this comment reasonably concludes that any exception caught here has no consequence, which is false — it silently leaves setup
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               44
finding_id:        P61-D8-007
unit:              RU-61-07
location:          bbj-vscode/test/builtin-functions-library.test.ts:9-14
dimension:         D8
severity:          low
effort:            2
verdict:           pending
test_required:     no (D-11 D8)
fail_before:       TBD
failure_scenario:  A reader of this test's comment reasonably concludes the physical lib/functions.bbl file is validated by CI; it is not — a syntax error introduced only into the physical file would pass this test undetected.
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               45
finding_id:        P62-D2-004
unit:              RU-62-01
location:          bbj-vscode/src/extension.ts:892
dimension:         D2
severity:          low
effort:            2
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  If the language-server process fails to spawn, client.start()'s rejection is never observed anywhere in this file, producing an unhandled promise rejection in the extension host with no dedicated user-facing message explaining that the
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               46
finding_id:        P62-D2-006
unit:              RU-62-05
location:          bbj-vscode/bbj-language-configuration.json:54-55,100-101
dimension:         D2
severity:          low
effort:            2
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  Any tool that treats bbj-language-configuration.json as strict JSON — a schema validator, a build-time lint step, a future automated consumer, or simply JSON.parse called directly as this review's own acceptance check
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               47
finding_id:        P62-D2-007
unit:              RU-62-05
location:          bbj-vscode/syntaxes/bbj.tmLanguage.json:18-25,27-35,68-72
dimension:         D2
severity:          medium
effort:            2
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  Any BBj string literal containing plain text — the overwhelming majority of "..."/'...' usage in real BBj source — is rendered by a theme's constant.character.escape color (typically distinct from, and often more
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               48
finding_id:        P62-D2-008
unit:              RU-62-05
location:          bbj-vscode/syntaxes/bbj.tmLanguage.json:41-50
dimension:         D2
severity:          low
effort:            2
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  A bare REM on its own line — a valid, complete no-op comment statement per the language server's own lexer, and a real developer idiom for marking an intentionally blank line — is rendered as plain, unscoped code by the editor
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               49
finding_id:        P62-D2-009
unit:              RU-62-05
location:          bbj-vscode/syntaxes/bbj.tmLanguage.json:15
dimension:         D2
severity:          low
effort:            2
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  IOL=/LEN= — BBj's I/O-list-length and record-length options, always written with a value attached (IOL=5, LEN=80) — never receive keyword highlighting in that form, the only form that occurs in real code; the pattern only fires
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               50
finding_id:        P62-D2-010
unit:              RU-62-02
location:          bbj-vscode/src/document-formatter.ts:63-67
dimension:         D2
severity:          medium
effort:            2
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  If cp.spawn('java', formatFlags) (line 59) emits 'error' with any code other than 'ENOENT' (a permissions error on the java binary being the most realistic case, e.g. after a botched local JDK reinstall), the
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
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
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  If a prior decompileInPlace attempt against the same file already left a stale <input>.lst on disk (e.g. the extension crashed or the user closed VS Code between the exec() completing and the rename step), and
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               52
finding_id:        P62-D3-001
unit:              RU-62-02
location:          bbj-vscode/src/document-formatter.ts:9-50,52-84
dimension:         D3
severity:          low
effort:            4
verdict:           pending
test_required:     yes (D-11 D3)
fail_before:       TBD
failure_scenario:  Saving several open BBj documents together (VS Code's "Save All", or format-on-save firing while a manual format request from the same document is still in flight) spawns one independent JVM per request
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
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
verdict:           pending
test_required:     no (D-11 D4)
fail_before:       TBD
failure_scenario:  n/a (D4 is a code-shape finding, not a runtime failure scenario) — if the magic-byte sequence were ever revised (e.g. a future tokenized-file format version), a fix applied to only one of the two constants inside
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               54
finding_id:        P62-D5-004
unit:              RU-62-05
location:          bbj-vscode/test/textmate-highlighting.test.ts (absence of 3 assertions) — covers bbj-vscode/syntaxes/bbj.tmLanguage.json
dimension:         D5
severity:          low
effort:            4
verdict:           pending
test_required:     test-is-the-fix (D-13)
fail_before:       TBD
failure_scenario:  A future edit to bbj.tmLanguage.json's string or keyword patterns can reintroduce or worsen any of these three defects (or a similar one) with `npm test` green throughout, since the existing 2 tests do not assert
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               55
finding_id:        P62-D5-006
unit:              RU-62-02
location:          bbj-vscode/src/document-formatter.ts (whole file; no test counterpart)
dimension:         D5
severity:          low
effort:            4
verdict:           pending
test_required:     test-is-the-fix (D-13)
fail_before:       TBD
failure_scenario:  A regression in the exit-code handling, the P62-D2-010 hang path, or the P62-D3-001 concurrent-spawn behavior would ship silently — `npm test` staying green today provides no signal about any of them, since no test
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               56
finding_id:        P62-D7-002
unit:              RU-62-05
location:          bbj-vscode/package.json:30-35
dimension:         D7
severity:          medium
effort:            2
verdict:           pending
test_required:     yes (D-11 D7)
fail_before:       TBD
failure_scenario:  A user who opens one of this project's own lib/*.bbl builtin-catalog files (or any .bbl file in a BBj project using custom builtin libraries) directly in VS Code sees plain, unscoped text with no bracket matching, no comment
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               57
finding_id:        P62-D8-001
unit:              RU-62-05
location:          CLAUDE.md:90-92
dimension:         D8
severity:          low
effort:            2
verdict:           pending
test_required:     no (D-11 D8)
fail_before:       TBD
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a runtime failure): a reader of CLAUDE.md reasonably concludes only bbj.tmLanguage.json is IDE-shared, and could edit bbx.tmLanguage.json or
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               58
finding_id:        P62-D8-002
unit:              RU-62-02
location:          bbj-vscode/src/document-formatter.ts:5-6,29-30,88-96
dimension:         D8
severity:          low
effort:            2
verdict:           pending
test_required:     no (D-11 D8)
fail_before:       TBD
failure_scenario:  n/a (D8 is a comment-accuracy finding) — the map, its onDidChangeTextDocument writer (lines 88-91), and its onDidCloseTextDocument cleanup (lines 94-96) add a per-keystroke write
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               59
finding_id:        P63-D4-001
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:50,103,125,136-139,148,152,97-165
dimension:         D4
severity:          low
effort:            4
verdict:           pending
test_required:     no (D-11 D4)
fail_before:       TBD
failure_scenario:  n/a (D4 is a code-shape finding, not a runtime failure scenario) — the duplication is a maintainability cost: any future platform-specific fix (e.g. a sixth OS/architecture combination, or hardening one branch without the
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               60
finding_id:        P63-D4-014
unit:              RU-63-02
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjIcons.java:14
dimension:         D4
severity:          low
effort:            2
verdict:           pending
test_required:     no (D-11 D4)
fail_before:       TBD
failure_scenario:  n/a in the sense that D4 records dead code, not a runtime failure — the bbj-config.svg/bbj-config_dark.svg resource pair is bundled into every plugin build and referenced by nothing, a small but genuine maintenance/packaging-size
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
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
user_facing:       n/a — deferred, not applied
verification:      none — no JDK 17 on this machine, so no Gradle test can run (D-15)
commit:            none — deferred, no JDK 17 available
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
verdict:           pending
test_required:     no (D-11 D8)
fail_before:       TBD
failure_scenario:  n/a (D8 is a doc-accuracy finding) — a caller relying on the Javadoc's implied read-only contract (e.g. calling this method speculatively/defensively, assuming it cannot fail due to a write) is not warned that this "getter" can
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
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
verdict:           pending
test_required:     no (D-11 D8)
fail_before:       TBD
failure_scenario:  n/a (D8 is a doc-accuracy finding) — a future maintainer skimming the class Javadoc or a user reading the action's tooltip text ("Compile the current BBj file") receives no signal that this is unimplemented, unlike the honest inline
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
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
verdict:           pending
test_required:     no (D-11 D8)
fail_before:       TBD
failure_scenario:  n/a (D8 is a doc-accuracy finding) — a reader relying on the Javadoc's specific "OS-native keychain" claim to reason about at-rest exposure or persistence- across-restart would be wrong on any install where the user has selected KeePass
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
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
verdict:           pending
test_required:     no (D-11 D8)
fail_before:       TBD
failure_scenario:  A maintainer relying on the class doc's "mirroring" claim to assume Java's DTOs are a complete field-for-field reflection of the TS-side types would be wrong by exactly the two dormant fields P63-D7-004 records — not a functional bug today,
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
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
verdict:           pending
test_required:     no (D-11 D8)
fail_before:       TBD
failure_scenario:  A developer who opens this tool window expecting to see the language server's own diagnostic stdout/stderr output — the exact promise the class doc and the window's own initial message ("BBj Language Server log initialized") make —
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
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
verdict:           pending
test_required:     no (D-11 D8)
fail_before:       TBD
failure_scenario:  A reader of this class's own doc reasonably assumes rapid repeated restart triggers are already deduplicated somewhere in this class, when in fact — per P63-D2-013 — none of the six real trigger paths goes through that debouncing at
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               68
finding_id:        P63-D8-008
unit:              RU-63-02
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjColorSettingsPage.java:117-120
dimension:         D8
severity:          low
effort:            2
verdict:           pending
test_required:     no (D-11 D8)
fail_before:       TBD
failure_scenario:  n/a (D8 is a doc-accuracy finding) — a developer who copies the Settings > Color Scheme demo pane's block-comment syntax as a template for a real BBj documentation comment writes an invalid delimiter that the grammar's own DOCU
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               69
finding_id:        P64-D2-004
unit:              RU-64-01
location:          .github/workflows/pr-validation.yml:8-13
dimension:         D2
severity:          medium
effort:            2
verdict:           pending
test_required:     yes (D-11 D2)
fail_before:       TBD
failure_scenario:  A pull request edits `bbj-vscode/src/language/bbj-module.ts`, or any of the other 52 tracked files under `src/language/`, and nothing else. The `paths:` filter at `:8-13` matches none of the changed files, so `pr-validation.yml` is skipped
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               70
finding_id:        P64-D4-004
unit:              RU-64-01
location:          .github/workflows/build.yml:4-6
dimension:         D4
severity:          low
effort:            2
verdict:           pending
test_required:     no (D-11 D4)
fail_before:       TBD
failure_scenario:  A contributor reads `build.yml:3-9` and concludes that pushes to a development branch are built by CI, and pushes work to a long-lived branch expecting it to be validated; nothing runs, and the absence of a check reads as "CI is not configured
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             Record's own disposition asks for it to be applied "alongside the P64-D3-002 decision about build.yml's paths: filter rather than before it, since both edit the same on: block." P64-D3-002 is major-refactor and out of scope for this phase, so the sequencing could not be honoured. The easy/major classification stays the single routing rule; the reviewer's "alongside" note does not override it, and is not quietly dropped either — recorded per D-06.
```

```
row:               71
finding_id:        P64-D6-004
unit:              RU-64-01
location:          .github/workflows/build.yml:18-20
dimension:         D6
severity:          low
effort:            2
verdict:           pending
test_required:     tool-native check (D-14)
fail_before:       TBD
failure_scenario:  A contributor reads `build.yml` to copy the standard checkout-and-setup preamble into a new workflow — the preamble being duplicated across five files already, `P64-D4-003` — and copies the `@v3` pair, propagating the stale reference. More
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               72
finding_id:        P64-D6-009
unit:              RU-64-02
location:          bbj-vscode/package-lock.json:3
dimension:         D6
severity:          low
effort:            2
verdict:           pending
test_required:     tool-native check (D-14)
fail_before:       TBD
failure_scenario:  A release engineer, an SBOM generator, or a reproducibility audit reads the lockfile to establish what version of `bbj-lang` a given dependency graph belongs to — the ordinary reason to read a lockfile's root entry rather than the manifest
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
```

```
row:               73
finding_id:        P64-D6-013
unit:              RU-64-02
location:          bbj-vscode/package-lock.json:2172
dimension:         D6
severity:          medium
effort:            2
verdict:           pending
test_required:     tool-native check (D-14)
fail_before:       TBD
failure_scenario:  Each of the six is a denial-of-service or bounds-check defect reachable only through `@vscode/vsce`'s own code paths, which execute during packaging and publishing — `preview.yml:62-68` and `manual-release.yml:84-90`, both inside jobs
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
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
verdict:           pending
test_required:     no (D-11 D8)
fail_before:       TBD
failure_scenario:  A contributor or reviewer reads `vitest.config.ts` to answer "does this project guard against coverage regressions?" and the file answers yes, in two consecutive comment lines, with concrete numbers beside them. The true answer is that no
fix_applied:       TBD
user_facing:       TBD
verification:      TBD
commit:            pending
notes:             
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
