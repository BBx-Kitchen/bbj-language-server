---
phase: 88-setopts-in-code-hovers-tri-state-composer
plan: 04
subsystem: ui
tags: [intellij, lsp4j, gson, json-rpc, setopts, composer]

# Dependency graph
requires:
  - phase: 88-setopts-in-code-hovers-tri-state-composer
    provides: "88-03's setopts-in-code-request.ts (bbj/composer/setopts/decodeInCode, .../composeTriState) and setopts-catalog.ts's SetOptsTriStateEntry/SetOptsTriStateSelection wire shapes this plan's Java DTOs mirror field-for-field"
provides:
  - "ComposerModels' eight new SETOPTS-in-code DTO classes (SetoptsInCodeDecodeParams/Result, SetoptsInCodeAbsoluteEdit, SetoptsInCodeChainEdit, SetoptsTriStateEntry, SetoptsTriStateSelection, SetoptsComposeTriStateParams/Result)"
  - "BbjComposerServer.setoptsDecodeInCode/setoptsComposeTriState declared on the single server interface, pinned against setopts-in-code-request.ts by ComposerRequestContractTest (fourteen names)"
  - "DecodeEquality.sameSetoptsInCode — the stale-edit comparator plan 88-05's dialog will call, field-wise over found/editable/mode/reason/summary/absolute/chain/initial, order-sensitive on the tri-state entries list"
affects: [88-05 (IntelliJ tri-state dialog consumes setoptsDecodeInCode/setoptsComposeTriState and sameSetoptsInCode), 88-06 (VS Code tri-state UI, no IntelliJ dependency)]

# Actuals (#2632)
actuals:
  tokens: 8334
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "New DTO family joins the existing single-interface/single-comparator/single-boundary-test conventions established by SetoptsBit/SetoptsSelectionBit/DecodeEquality.sameSetopts/ComposerModelsJsonBoundaryTest rather than introducing a parallel structure"

key-files:
  created: []
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/DecodeEquality.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java

key-decisions:
  - "SetoptsTriStateEntry.byteNo is remapped to the wire key `byte` via @SerializedName, exactly matching the SetoptsBit/SetoptsSelectionBit/SetoptsUnknownBits convention already established for every other byte-numbered field in this file."
  - "state ('set'/'clear'/'leave') stays a plain Java String, never an enum, per the plan's own explicit instruction, so a value the server adds later parses rather than throws at the boundary."
  - "FakeComposerServer (ComposerFlowTest, a pre-existing test double implementing BbjComposerServer) needed two new UnsupportedOperationException overrides once the interface grew two abstract methods — a Rule 3 blocking-issue auto-fix, not part of the plan's own file list, required purely to keep the module compiling."
  - "DecodeEquality's javadoc-embedded literal mentions of the string @SerializedName(\"byte\") were phrased around the annotation on the new SetoptsTriStateEntry class (rather than repeating the literal in prose) so the acceptance criterion's exact grep count (7: six pre-existing + one new) held without adding an eighth incidental match."

patterns-established: []

requirements-completed: []

coverage:
  - id: D1
    description: "bbj/composer/setopts/decodeInCode and .../composeTriState are declared once on the single BbjComposerServer interface and pinned against the language server's own TypeScript source (setopts-in-code-request.ts) by ComposerRequestContractTest, whose DECLARED_REQUESTS set grew from twelve to fourteen names"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java (all 4 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every new SETOPTS-in-code DTO round-trips through LSP4IJ's own MessageJsonHandler with the wire key `byte` preserved via @SerializedName, in both the response direction (decodeInCode populated + all-optionals-omitted, composeTriState) and the request direction (composeTriState params never leak byteNo)"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java (4 new tests: aPopulatedDecodeInCodeResponseParsesThroughTheLsp4jGson, aNotFoundDecodeInCodeResponseWithEveryOptionalFieldOmittedParsesWithoutFailing, aComposeTriStateResponseParsesThroughTheLsp4jGson, theSetoptsComposeTriStateParamsSerializeWithTheWireKeyByte)"
        status: pass
    human_judgment: false
  - id: D3
    description: "DecodeEquality.sameSetoptsInCode compares found/editable/mode/reason, both edit payloads and the whole tri-state selection field-wise, with int[] ranges compared element-wise via Arrays.equals and never by reference identity — one named mismatch test per compared field"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java (changingAnySingleComparedSetoptsInCodeFieldBreaksTheMatch, setoptsInCodeAbsoluteHexRangeIsComparedElementWiseRatherThanByIdentity)"
        status: pass
    human_judgment: false
  - id: D4
    description: "EDGE/DISC-06/empty: a found:false/mode:none decode result and a tri-state selection with an empty or omitted entries array both parse to usable objects rather than throwing, and sameSetoptsInCode treats two such results as equal"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java#aNotFoundDecodeInCodeResponseWithEveryOptionalFieldOmittedParsesWithoutFailing; bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java#setoptsInCodeNullInitialOnBothSidesAndEmptyEntriesOnBothSidesCompareEqual"
        status: pass
    human_judgment: false
  - id: D5
    description: "EDGE/DISC-06/ordering: sameSetoptsInCode compares the tri-state entries list element-wise in order, so two selections carrying the same options in a different order are NOT reported equal"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java#reorderedTriStateEntriesAreNotEqualEvenThoughTheSetOfOptionsIsTheSame"
        status: pass
    human_judgment: false
  - id: D6
    description: "D-04: an editable:false decode result carries no chain payload and no initial, so nothing on the IntelliJ side can construct an edit from it"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java#aNotFoundDecodeInCodeResponseWithEveryOptionalFieldOmittedParsesWithoutFailing (asserts chain and initial both null)"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-09-07
status: complete
---

# Phase 88 Plan 04: SETOPTS-in-Code Wire Plumbing (IntelliJ DTOs, Server Interface, Comparator) Summary

**IntelliJ's `BbjComposerServer` gains `setoptsDecodeInCode`/`setoptsComposeTriState`, an eight-class DTO family mirroring `setopts-in-code-request.ts` field-for-field, and `DecodeEquality.sameSetoptsInCode` — pure wire plumbing with no dialog yet, every new surface pinned by a contract test, a JSON-boundary round trip, and a field-wise equality test.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3
- **Files modified:** 7 (6 planned + 1 pre-existing test double fixed for compilation)

## Accomplishments
- `ComposerModels.java` gained eight new SETOPTS-in-code classes (`SetoptsInCodeDecodeParams/Result`, `SetoptsInCodeAbsoluteEdit`, `SetoptsInCodeChainEdit`, `SetoptsTriStateEntry`, `SetoptsTriStateSelection`, `SetoptsComposeTriStateParams/Result`), verified field-for-field against `bbj-vscode/src/language/setopts-in-code-request.ts` and `bbj-vscode/src/setopts-catalog.ts` (see field comparison below) — the only remapping is `byteNo` → wire key `byte` via `@SerializedName`, the same convention `SetoptsBit`/`SetoptsSelectionBit`/`SetoptsUnknownBits` already use
- `BbjComposerServer` declares `setoptsDecodeInCode`/`setoptsComposeTriState` as the thirteenth/fourteenth `@JsonRequest` methods on the single server interface (no second interface introduced); `ComposerRequestContractTest` now reads `setopts-in-code-request.ts` as a fifth source, grows `DECLARED_REQUESTS` to fourteen names, and allowlists `decodeInCode`/`composeTriState` as the camelCase exception
- `DecodeEquality.sameSetoptsInCode` compares `found`, `editable`, `mode`, `reason`, `summary`, the whole `absolute` payload (`int[] hexRange` via `Arrays.equals`), the whole `chain` payload, and the tri-state `initial` selection element-wise and in order — a reordered selection fails the guard closed rather than being treated as harmless
- `ComposerModelsJsonBoundaryTest` gained four new round trips through LSP4IJ's own `MessageJsonHandler`: a populated `decodeInCode` response, a `found:false/editable:false/mode:'none'` response with every optional field omitted (proving D-04's no-`chain`/no-`initial` invariant survives the wire), a `composeTriState` response, and a request-direction assertion that `composeTriState` params emit `"byte":` and never `byteNo`
- `DecodeEqualityTest` gained one named mismatch test per compared field (15 mutators across `found`/`editable`/`mode`/`reason`/`summary`/both edit payloads/tri-state entry fields), plus null-handling, empty/omitted-`initial`, and the explicit reordered-entries "must NOT match" case

## Task Commits

Each task was committed atomically:

1. **Task 1: SETOPTS-in-code DTO family in `ComposerModels`** - `de4ff6f4` (feat)
2. **Task 2: Server interface methods and the cross-language request contract** - `bc8c966d` (feat)
3. **Task 3: `sameSetoptsInCode` comparator and the JSON boundary round trips** - `9f704746` (feat)

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java` - Eight new SETOPTS-in-code DTO classes appended to the existing SETOPTS block
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java` - Two new `@JsonRequest` methods (`setoptsDecodeInCode`, `setoptsComposeTriState`) after `setoptsPreview`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/DecodeEquality.java` - `sameSetoptsInCode` plus three private helpers (`sameSetoptsInCodeAbsolute`, `sameSetoptsInCodeChain`, `sameSetoptsTriStateSelection`/`sameSetoptsTriStateEntries`); class javadoc extended to name `SetoptsInCodeDecodeResult`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java` - Fifth source constant, fourteen-name `DECLARED_REQUESTS`, both new camelCase segments allowlisted, both textual-read assertions extended
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java` - Four new round-trip tests for the SETOPTS-in-code family
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java` - `baseSetoptsInCode`/`copyOfSetoptsInCode` fixtures and seven new test methods covering every behavior bullet
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java` - `FakeComposerServer` (a pre-existing `BbjComposerServer` test double) gained the two new required overrides so the module keeps compiling (Rule 3 auto-fix, not in the plan's file list)

## Field-by-Field DTO Comparison (Task 1 acceptance criterion)

| Java (`ComposerModels.java`) | TypeScript source | Fields match |
|---|---|---|
| `SetoptsInCodeDecodeParams` | `SetOptsInCodeDecodeParams` (setopts-in-code-request.ts) | `uri`, `line`, `character` — exact |
| `SetoptsInCodeAbsoluteEdit` | `SetOptsInCodeAbsoluteEdit` | `line`, `hexRange`, `hexDigits` — exact (TS tuple `[number,number]` ↔ Java `int[]`) |
| `SetoptsInCodeChainEdit` | `SetOptsInCodeChainEdit` | `variableName`, `startLine`, `endLine`, `indent` — exact |
| `SetoptsInCodeDecodeResult` | `SetOptsInCodeDecodeResult` | `found`, `editable`, `mode`, `reason`, `summary`, `absolute`, `chain`, `initial` — exact (TS `?` optionals ↔ Java nullable fields) |
| `SetoptsComposeTriStateParams` | `SetOptsComposeTriStateParams` | `selection`, `variable`, `indent`, `scope` — exact |
| `SetoptsComposeTriStateResult` | `SetOptsComposeTriStateResult` | `text`, `lines` — exact (declaration order differs, immaterial for JSON) |
| `SetoptsTriStateEntry` | `SetOptsTriStateEntry` (setopts-catalog.ts) | `byte`→`byteNo` (`@SerializedName`), `mask`, `state` — exact |
| `SetoptsTriStateSelection` | `SetOptsTriStateSelection` | `entries` — exact |

## Decisions Made
- `SetoptsTriStateEntry.byteNo` is `@SerializedName("byte")`-remapped, matching every other byte-numbered field in the file; `state` stays a plain `String` (never a Java enum) per the plan's explicit instruction so a future server-added value parses rather than throws.
- `DecodeEquality`'s javadoc for the new class avoids repeating the literal string `@SerializedName("byte")` a second time (referring to "the annotation below" instead), keeping the acceptance criterion's exact grep count (7) intact rather than incidentally inflating it to 8.
- `FakeComposerServer` in `ComposerFlowTest` (an existing test double, not named in this plan's `files_modified`) required two new `UnsupportedOperationException` overrides once `BbjComposerServer` grew two abstract methods — a Rule 3 blocking-compile auto-fix, verified to not change any of that test's existing behavior (all its own tests still pass).
- Per this plan's own explicit note and the precedent set by 88-02/88-03, **DISC-06 was NOT marked complete** — its full user-facing wording is not satisfied until the IntelliJ dialog (88-05) and VS Code UI (88-06) also land. `requirements-completed` is empty; `requirements mark-complete` was not invoked.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `FakeComposerServer` (ComposerFlowTest) stopped compiling after `BbjComposerServer` grew two abstract methods**
- **Found during:** Task 2 verification (`./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.ComposerRequestContractTest'`)
- **Issue:** `compileTestJava` failed with "FakeComposerServer is not abstract and does not override abstract method setoptsComposeTriState" — a pre-existing test double implementing `BbjComposerServer` (used by the unrelated `ComposerFlowTest`) did not implement the two new interface methods
- **Fix:** Added `setoptsDecodeInCode`/`setoptsComposeTriState` overrides to `FakeComposerServer`, each throwing `UnsupportedOperationException` like every other stubbed method the flow seam never calls
- **Files modified:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java`
- **Verification:** `./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.ComposerFlowTest'` passes unchanged
- **Committed in:** `bc8c966d` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking compile issue)
**Impact on plan:** Necessary to keep the module compiling once the interface grew; no scope creep, no behavior change to `ComposerFlowTest`'s own coverage.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 88-05 can build the IntelliJ tri-state dialog directly on `BbjComposerServer.setoptsDecodeInCode`/`setoptsComposeTriState` and `DecodeEquality.sameSetoptsInCode` for its `StaleEditGuard.applyIfUnchanged` wiring
- `./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.*'` exits 0 (all composer tests green, no regressions)
- `./gradlew compileJava compileTestJava --offline` exits 0
- No file under `bbj-vscode/` was modified by this plan (verified via `git diff --stat bbj-vscode/`)
- No other blockers

## Self-Check: PASSED

All 7 modified files verified present on disk; all 3 task commit hashes
(`de4ff6f4`, `bc8c966d`, `9f704746`) verified present in `git log --oneline --all`.

## Self-Check: PASSED (confirmed)

---
*Phase: 88-setopts-in-code-hovers-tri-state-composer*
*Completed: 2026-09-07*
