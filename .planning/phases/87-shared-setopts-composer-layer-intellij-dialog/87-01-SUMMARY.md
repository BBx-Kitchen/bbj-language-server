---
phase: 87-shared-setopts-composer-layer-intellij-dialog
plan: 01
subsystem: composer
tags: [lsp4j, langium, vscode-languageserver, gson, junit5, vitest, setopts]

# Dependency graph
requires:
  - phase: 86-intellij-interop-settings-targeted-refresh
    provides: "LSP4IJ custom-request capability proven go (D-11) — bbj/refreshJavaClasses joined bbj/compile/bbj/resolvedConfigPath on BbjComposerServer with no restart, the exact seam this plan's two new requests join"
  - phase: 85-config-hot-reload-with-restart-coalescing
    provides: "D-06 self-write suppression guarantee — a SETOPTS-only write never changes the consumed PREFIX snapshot, so this plan needed zero reload-suppression code of its own"
provides:
  - "bbj/composer/setopts/decodeCall and bbj/composer/setopts/preview LSP requests on the language server, thin pass-throughs to setopts-catalog.ts"
  - "A setopts field (50 bits, 7 ordered byte groups) on the aggregate bbj/composer/catalogs response"
  - "SETOPTS DTOs on the IntelliJ side (ComposerModels.java) that cross the LSP4IJ boundary as a hex String, never a numeric bitmask"
  - "DecodeEquality.sameSetopts, the stale-edit comparator plan 03's dialog apply path will use"
affects: [87-02-setopts-composer-dialog, 87-03-intellij-composer-action, 88-setopts-in-code-hovers]

# Actuals (#2632)
actuals:
  tokens: 9352
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Thin bbj/composer/* LSP re-exposure of a pure domain module (setopts-catalog.ts), following the exact msgbox/addWindow/addChildWindow shape already in composer-commands.ts"
    - "SETOPTS vector crosses the LSP4IJ boundary as a hex String end-to-end, never a numeric bitmask, sidestepping the int/long 32-bit-sign-bit overflow class entirely"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/composer-commands.ts
    - bbj-vscode/test/composer-commands.test.ts
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/DecodeEquality.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java

key-decisions:
  - "Both new requests (decodeCall, preview) plus the setopts catalogs field added to the existing composer-commands.ts/ComposerModels.java/BbjComposerServer.java files rather than new files, per Pitfall 4's requirement that request-name literals live where ComposerRequestContractTest already scans"
  - "SETOPTS vector represented as a hex String (hexDigits) end-to-end on the DTO side, never a numeric bitmask — sidesteps the int/long overflow class that AddWindowEdit's flag fields needed long for"
  - "setoptsInitialSelection() is a module-private, unexported helper in composer-commands.ts; VS Code's own private initialSelection in setopts-composer-webview.ts is deliberately left as a separate implementation — collapsing the two onto one export is noted as a follow-up, not done here, since the phase boundary requires zero VS Code code changes"

patterns-established:
  - "SETOPTS DTOs mirror the existing MsgboxDecodeResult/AddWindowDecodeResult shape: found:boolean + edit + initial, with @SerializedName(\"byte\") on every DTO field named byte (a Java reserved word)"

requirements-completed: [DISC-04]

coverage:
  - id: D1
    description: "bbj/composer/setopts/decodeCall decodes an existing SETOPTS line, a bare keyword, and refuses (found:false) a line it cannot round-trip; the byte->byteNo wire key survives LSP4IJ's real deserializer"
    requirement: DISC-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/composer-commands.test.ts#setopts/decodeCall decodes an existing line, a bare keyword, and refuses what it cannot round-trip"
        status: pass
      - kind: integration
        ref: "bbj-intellij ComposerModelsJsonBoundaryTest#aSetoptsDecodeCallResponseParsesThroughTheLsp4jGson"
        status: pass
      - kind: integration
        ref: "bbj-intellij ComposerRequestContractTest (all four tests, twelve declared request names)"
        status: pass
    human_judgment: false
  - id: D2
    description: "bbj/composer/setopts/preview starts from the original vector (never from zero), keeping unmodeled bytes and unknown bits intact; an invalid raw-tail entry is silently ignored"
    requirement: DISC-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/composer-commands.test.ts#setopts/preview starts from the original vector and never from zero"
        status: pass
      - kind: integration
        ref: "bbj-intellij ComposerModelsJsonBoundaryTest#aSetoptsPreviewResponseParsesThroughTheLsp4jGson, #theSetoptsPreviewParamsSerializeWithTheWireKeyByte"
        status: pass
    human_judgment: false
  - id: D3
    description: "The setopts field on bbj/composer/catalogs carries all 50 catalog bits and the 7 byte groups in catalog order (1,2,3,4,7,8,9)"
    requirement: DISC-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/composer-commands.test.ts#catalogs returns both composers option sets"
        status: pass
      - kind: integration
        ref: "bbj-intellij ComposerModelsJsonBoundaryTest#aComposerCatalogsResponseParsesThroughTheLsp4jGson"
        status: pass
    human_judgment: false
  - id: D4
    description: "DecodeEquality.sameSetopts reports a mismatch on any compared field change, comparing hexRange element-wise (never by array identity) and bits element-wise (never by list identity)"
    requirement: DISC-04
    verification:
      - kind: unit
        ref: "bbj-intellij DecodeEqualityTest (twoIdenticalSetoptsDecodesMatch, changingAnySingleComparedSetoptsFieldBreaksTheMatch, setoptsNullsOnEitherSideAreHandledWithoutThrowing, setoptsHexRangeIsComparedElementWiseRatherThanByIdentity)"
        status: pass
      - kind: unit
        ref: "bbj-intellij ComposerApplyGuardSourceGuardTest#rangeArraysAreNeverComparedByIdentity"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-09-07
status: complete
---

# Phase 87 Plan 01: Shared SETOPTS Composer Layer Summary

**Two new `bbj/composer/setopts/*` LSP requests and a `setopts` catalog field, all thin pass-throughs to `setopts-catalog.ts`, plus the matching Gson DTOs and `DecodeEquality.sameSetopts` comparator on the IntelliJ side — the shared command layer plans 02/03 build the dialog and action on top of.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-07T18:10:07Z
- **Completed:** 2026-09-07T18:22:00Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- `bbj/composer/setopts/decodeCall` decodes an existing config.bbx `SETOPTS <hex>` line or a bare `SETOPTS` keyword into an edit target + prefill selection, returning `found: false` for anything it cannot round-trip
- `bbj/composer/setopts/preview` computes the resulting hex digits, composed line, human summary, mask-inputs-enabled flag and unknown-bit list for one selection, starting from the original vector so unmodeled bytes and unknown bits survive untouched
- `bbj/composer/catalogs` gained a `setopts` field: 50 catalog bits (label, detail, bbj, bbjDetail, since) plus the 7 byte groups in catalog order
- IntelliJ-side `ComposerModels.java` DTOs (`SetoptsBit`, `SetoptsByteGroup`, `SetoptsCatalogs`, `SetoptsSelectionBit`, `SetoptsSelection`, `SetoptsEdit`, `SetoptsDecodeResult`, `SetoptsDecodeCallParams`, `SetoptsUnknownBits`, `SetoptsPreview`, `SetoptsPreviewParams`) all carry the SETOPTS vector as a hex `String`, never a numeric bitmask, and every `byte`-named field uses `@SerializedName("byte")`
- `DecodeEquality.sameSetopts` — the stale-edit comparator plan 03's dialog apply path will hand to `StaleEditGuard.applyIfUnchanged`, with `hexRange` compared element-wise via `Arrays.equals` and `bits` compared element-wise, never by reference/list identity
- Twelve request names now on `BbjComposerServer`, all pinned by `ComposerRequestContractTest`'s reflective scan + literal set + quoted-literal-in-language-server-sources check

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end `bbj/composer/setopts/decodeCall`** - `c4691312` (feat)
2. **Task 2: Expand to `bbj/composer/setopts/preview` and the `setopts` catalog field** - `59da4643` (feat)
3. **Task 3: `DecodeEquality.sameSetopts` and its field-wise coverage** - `070c0a16` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `bbj-vscode/src/language/composer-commands.ts` - SETOPTS import block, `setoptsInitialSelection` helper, `setopts` catalog field, `decodeCall`/`preview` handlers
- `bbj-vscode/test/composer-commands.test.ts` - decode/preview coverage (existing line, bare keyword, case-insensitive, cannot-round-trip, lossless round-trip, unknown-bit survival, invalid raw-tail)
- `bbj-intellij/.../composer/ComposerModels.java` - eleven new SETOPTS DTOs, `ComposerCatalogs.setopts` field
- `bbj-intellij/.../composer/BbjComposerServer.java` - `setoptsDecodeCall`/`setoptsPreview` `@JsonRequest` methods
- `bbj-intellij/.../composer/DecodeEquality.java` - `sameSetopts` + two private helpers
- `bbj-intellij/.../composer/ComposerRequestContractTest.java` - `DECLARED_REQUESTS` extended to twelve names
- `bbj-intellij/.../composer/ComposerModelsJsonBoundaryTest.java` - four new tests (decodeCall response, catalogs `setopts` extension, preview response, preview params serialization)
- `bbj-intellij/.../composer/ComposerFlowTest.java` - `FakeComposerServer` `@Override` stubs for both new interface methods
- `bbj-intellij/.../composer/DecodeEqualityTest.java` - SETOPTS fixture builders + four tests

## Decisions Made
- Both new requests plus the `setopts` catalogs field were added to the four existing files (`composer-commands.ts`, `ComposerModels.java`, `BbjComposerServer.java`, and the three test files) rather than new files — required by Pitfall 4 so `ComposerRequestContractTest`'s source scan finds the request-name literals where it already looks.
- The SETOPTS vector is represented as a hex `String` end-to-end on every DTO, never a numeric bitmask, sidestepping the `int`/`long` 32-bit-sign-bit overflow class entirely (unlike `AddWindowEdit`'s flag fields, which needed `long`).
- `setoptsInitialSelection()` stays a module-private, unexported helper in `composer-commands.ts`. VS Code's `setopts-composer-webview.ts` has its own private `initialSelection` doing the identical composition in-process — collapsing the two onto one export is left as a follow-up note rather than done here, since the phase boundary requires zero VS Code code changes this phase.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. No new dependency was added to `package.json` or `build.gradle.kts` (Package Legitimacy Audit not applicable, confirmed by 87-RESEARCH.md and reconfirmed here: `gson` was already transitively present via `lsp4j` and used elsewhere in this package).

## Next Phase Readiness

Plans 02 (`SetoptsComposerDialog.java`, `KeystrokeDebouncer`-based live preview) and 03 (`BbjComposeSetoptsAction.java`, `ComposerLauncher.Kind.SETOPTS`) can now build directly on:
- `BbjComposerServer.setoptsDecodeCall`/`setoptsPreview` — proven end-to-end through LSP4IJ's real deserializer
- `catalogs.setopts.bits`/`catalogs.setopts.byteGroups` — ready for the dialog's D-07 section layout and D-08 de-emphasis (`bbj`/`bbjDetail` fields present)
- `DecodeEquality::sameSetopts` — ready to hand to `StaleEditGuard.applyIfUnchanged` for the edit-in-place apply path

No blockers. `bbj-vscode/src/setopts-composer-webview.ts` and `setopts-composer-ui.ts` are confirmed byte-identical to their pre-phase state (diffed against `afcb0346`, the last commit before Phase 87 execution began) — VS Code needed, and received, zero code changes.

---
*Phase: 87-shared-setopts-composer-layer-intellij-dialog*
*Completed: 2026-09-07*

## Self-Check: PASSED

- All 9 modified files confirmed present on disk.
- All 3 task commit hashes (`c4691312`, `59da4643`, `070c0a16`) confirmed present in `git log --oneline --all`.
- `.planning/phases/87-shared-setopts-composer-layer-intellij-dialog/87-01-SUMMARY.md` confirmed present on disk.
