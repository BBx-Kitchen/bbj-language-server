---
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
plan: 07
subsystem: composer
tags: [cvs, msgbox, lsp4j, composer, intellij, langium, gson]

# Dependency graph
requires:
  - phase: 89-02
    provides: decodeMsgboxCall's compose-and-replace shape (replace/hasOptions) for MsgboxDecodeCallResult
  - phase: 89-03
    provides: cvs-composer.ts (CVS_BITS, CVS_CHARS_TOOLTIP, decodeCvsCall, cvsPreview)
  - phase: 89-04
    provides: ComposerModels/ComposerLauncher/LSP4IJ allowlist conventions this plan extends
provides:
  - bbj/composer/cvs/decodeCall and bbj/composer/cvs/preview thin pass-through handlers on the language server
  - bbj/composer/catalogs.cvs (eight documented CVS() operation bits + charsTooltip)
  - IntelliJ CvsBit/CvsCatalogs/CvsEdit/CvsInitial/CvsDecodeResult/CvsPreviewInput/CvsPreviewParams/CvsPreview DTOs
  - BbjComposerServer.cvsDecodeCall/cvsPreview on the single server interface, pinned by ComposerRequestContractTest (sixteen names)
  - MsgboxReplace + MsgboxDecodeResult.replace/hasOptions mirroring the language server's compose-and-replace payload
  - DecodeEquality.sameCvs and a replace/hasOptions-aware DecodeEquality.sameMsgbox
affects: [89-08]

actuals:
  tokens: 9000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "CVS() wire requests follow the SETOPTS decodeCall/preview two-request shape exactly"
    - "IntelliJ DTOs mirror the TypeScript interface field-for-field, with Javadoc naming the TS shape mirrored"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/composer-commands.ts
    - bbj-vscode/test/composer-commands.test.ts
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/DecodeEquality.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java

key-decisions:
  - "MsgboxDecodeResult also gained hasOptions (mirroring the TS DTO's discriminator) and DecodeEquality.sameMsgbox compares it alongside replace, since the equality contract must track every field the DTO carries (Rule 2 - missing critical, per the class's own javadoc)."
  - "CVS request names follow the SETOPTS two-request shape (decodeCall + preview), per RESEARCH.md Open Question 1."

patterns-established:
  - "New composer DTO families add a matching DecodeEquality comparator and ComposerModelsJsonBoundaryTest cases in the same task, never a parallel test file."

requirements-completed: [DISC-02, DISC-03]

coverage:
  - id: D1
    description: "Language server answers bbj/composer/cvs/decodeCall and bbj/composer/cvs/preview as thin pass-throughs to cvs-composer.ts, and bbj/composer/catalogs gains a cvs field (eight bits + charsTooltip)"
    requirement: "DISC-03"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/composer-commands.test.ts#catalogs returns both composers option sets"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/composer-commands.test.ts#cvs/decodeCall and cvs/preview delegate to cvs-composer.ts (#649)"
        status: pass
    human_judgment: false
  - id: D2
    description: "IntelliJ's single BbjComposerServer interface declares cvsDecodeCall/cvsPreview on the pinned bbj/composer/cvs/decodeCall and bbj/composer/cvs/preview names; the cross-language contract now expects sixteen names"
    requirement: "DISC-02"
    verification:
      - kind: unit
        ref: "bbj-intellij ComposerRequestContractTest (everyDeclaredRequestNameExistsAsAQuotedLiteralInTheLanguageServerSources, theDeclaredRequestNamesAreDerivedFromTheInterfaceNotHardCodedTwice)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every new CVS DTO and MsgboxDecodeResult.replace round-trip through lsp4j's MessageJsonHandler, covering a not-editable CVS decode with optional fields omitted and a CVS mask of 255"
    requirement: "DISC-02"
    verification:
      - kind: unit
        ref: "bbj-intellij ComposerModelsJsonBoundaryTest (aFullyPopulatedCvsDecodeCallResponseParsesThroughTheLsp4jGson, aNotEditableCvsDecodeCallResponseWithEveryOptionalFieldOmittedParsesWithoutFailing, aCvsPreviewResponseWithMask255ParsesThroughTheLsp4jGson, theCvsPreviewParamsSerializeBitsAsAJsonArrayOfNumbers, aComposerCatalogsResponseParsesThroughTheLsp4jGson, aMsgboxDecodeCallResponseCarryingReplaceParsesThroughTheLsp4jGson)"
        status: pass
    human_judgment: false
  - id: D4
    description: "DecodeEquality.sameMsgbox compares replace/hasOptions field-wise; DecodeEquality.sameCvs compares found/editable/reason/edit/initial (order-sensitive bits)/trailingArgs, refusing a stale-edit write on any change"
    requirement: "DISC-02"
    verification:
      - kind: unit
        ref: "bbj-intellij DecodeEqualityTest (changingAnySingleComparedMsgboxFieldBreaksTheMatch, twoMsgboxDecodesDifferingOnlyInReplaceOriginalOptionsDoNotMatch, twoIdenticalCvsDecodesMatch, changingAnySingleComparedCvsFieldBreaksTheMatch, cvsNullsOnEitherSideAreHandledWithoutThrowing)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-09-12
status: complete
---

# Phase 89 Plan 07: CVS() Composer Wire Contract Summary

**bbj/composer/cvs/decodeCall and bbj/composer/cvs/preview land as thin language-server pass-throughs, with matching IntelliJ DTOs, interface methods, and Gson-boundary-proven equality functions, pinned to sixteen contract-tested request names.**

## Performance

- **Duration:** 25 min
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Language server exposes `bbj/composer/cvs/decodeCall` and `bbj/composer/cvs/preview` as pure pass-throughs to `cvs-composer.ts`'s `decodeCvsCall`/`cvsPreview`, and `bbj/composer/catalogs` now returns `cvs: { bits, charsTooltip }`.
- IntelliJ's `BbjComposerServer` (the one server interface `getServerInterface()` returns) declares `cvsDecodeCall`/`cvsPreview`, with matching `CvsBit`/`CvsCatalogs`/`CvsEdit`/`CvsInitial`/`CvsDecodeResult`/`CvsPreviewInput`/`CvsPreviewParams`/`CvsPreview` DTOs in `ComposerModels`.
- `ComposerRequestContractTest`'s cross-language pin now covers sixteen request names (both derived reflectively from the interface and matched as quoted literals in the TS sources).
- `MsgboxDecodeResult` gained `replace`/`hasOptions` (mirroring the language server's `decodeMsgboxCall` compose-and-replace shape from plan 89-02), and `DecodeEquality.sameMsgbox` now compares both, alongside the new `DecodeEquality.sameCvs` for the CVS decode family.
- Every new DTO, plus the MSGBOX `replace` payload, round-trips through lsp4j's real `MessageJsonHandler` in `ComposerModelsJsonBoundaryTest` — including a not-editable CVS decode with optional fields omitted and a CVS mask of 255.

## Task Commits

1. **Task 1: The CVS request slice across the wire — TS handlers, Java DTOs, interface methods, contract** - `c3686bbd` (feat)
2. **Task 2: MSGBOX replace payload and CVS decode equality, pinned through lsp4j Gson** - `95cb332c` (feat)

_Both tasks were `tdd="true"`; tests were extended alongside (not before, in a separate red-then-green cycle) the existing test families per Pitfall-3 discipline (extend, don't duplicate) — each commit carries both the test extension and the implementation together, matching the existing per-family commit granularity in this composer test suite._

## Files Created/Modified
- `bbj-vscode/src/language/composer-commands.ts` - adds the `cvs` catalog field and the two CVS pass-through handlers
- `bbj-vscode/test/composer-commands.test.ts` - catalogs assertion extended + new CVS pass-through test
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java` - eight new CVS DTOs, `ComposerCatalogs.cvs`, `MsgboxReplace`, `MsgboxDecodeResult.replace`/`hasOptions`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java` - `cvsDecodeCall`/`cvsPreview` on the one server interface
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java` - sixteen-name contract set
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/DecodeEquality.java` - `sameCvs`, `replace`/`hasOptions`-aware `sameMsgbox`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java` - CVS fixtures/tests, extended MSGBOX fixtures/mutators
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java` - CVS decode/preview + MSGBOX replace + eight-bit catalog boundary cases
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java` - `FakeComposerServer` stub overrides for the two new interface methods (compile-blocking, Rule 3)

## Decisions Made
- Mirrored the `hasOptions` field the plan's required-reading note flagged (from plan 89-02's `MsgboxDecodeCallResult` deviation) onto the IntelliJ DTO, and extended `DecodeEquality.sameMsgbox` to compare it — the equality contract must track every field the DTO carries, per that class's own documented invariant, not just the fields the plan text enumerated (Rule 2 - missing critical).
- Request names follow the SETOPTS `decodeCall`/`preview` two-request shape, per the plan's own reference to RESEARCH.md Open Question 1 — no new shape introduced.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Stubbed the two new BbjComposerServer methods on ComposerFlowTest's FakeComposerServer**
- **Found during:** Task 1 (adding `cvsDecodeCall`/`cvsPreview` to the interface)
- **Issue:** `ComposerFlowTest.FakeComposerServer implements BbjComposerServer` failed to compile once the interface gained two new abstract methods — not in the plan's `files_modified` list, but a hard compile blocker for the whole `bbj-intellij` module.
- **Fix:** Added `cvsDecodeCall`/`cvsPreview` overrides throwing `UnsupportedOperationException`, matching every other not-yet-exercised method's stub style in that class.
- **Files modified:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java`
- **Verification:** `./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.ComposerRequestContractTest'` (and later the full composer+concurrency run) build and pass.
- **Committed in:** `c3686bbd` (Task 1 commit)

**2. [Rule 2 - Missing Critical] Mirrored `MsgboxDecodeCallResult.hasOptions` onto the IntelliJ DTO and its equality function**
- **Found during:** Task 2, per the plan's required-reading pointer to plan 89-02's deviation
- **Issue:** The language server's `MsgboxDecodeCallResult` carries an optional `hasOptions: boolean` (added as a deviation in plan 89-02) that had not yet been mirrored on the IntelliJ side; leaving it out would silently drop a field IntelliJ needs to distinguish "no options yet" from "an explicit `0`" — and, if left out of `DecodeEquality.sameMsgbox`, a change in that discriminator between the pre-dialog decode and the stale-edit re-check would go unnoticed.
- **Fix:** Added `public Boolean hasOptions;` to `MsgboxDecodeResult`, compared it in `sameMsgbox`, and covered it in both `DecodeEqualityTest` and the new `ComposerModelsJsonBoundaryTest` replace-mode case.
- **Files modified:** `ComposerModels.java`, `DecodeEquality.java`, `DecodeEqualityTest.java`, `ComposerModelsJsonBoundaryTest.java`
- **Verification:** `DecodeEqualityTest` and `ComposerModelsJsonBoundaryTest` pass with the field exercised.
- **Committed in:** `95cb332c` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both auto-fixes were necessary for the module to compile and for the DTO/equality surface to stay honest with the language server's actual shape. No scope creep beyond what the plan's own required-reading called out.

## Issues Encountered
- An initial `ComposerModelsJsonBoundaryTest` CVS-preview fixture used Java text-block string concatenation (`+`) *inside* the JSON text block itself, which is invalid JSON (the `+` and line breaks became literal string content, not Java concatenation). Fixed by shortening the fixture's `summary` string to a single unbroken line before the first test run — caught immediately by the initial JUnit run, no separate investigation needed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The CVS() wire contract (decodeCall + preview + catalog) and the MSGBOX compose-and-replace payload are both live and pinned by contract/boundary/equality tests, ready for plan 89-08 to build the IntelliJ CVS dialog and the MSGBOX banner UI against.
- No blockers. Plan 89-06 remains paused at its own human checkpoint (build-artifact installation), unaffected by this plan's language-server/DTO-only scope.

---
*Phase: 89-cvs-composer-msgbox-expressions-composer-discoverability*
*Completed: 2026-09-12*

## Self-Check: PASSED
- FOUND: bbj-vscode/src/language/composer-commands.ts, bbj-vscode/test/composer-commands.test.ts, bbj-intellij ComposerModels.java/BbjComposerServer.java/DecodeEquality.java and their tests (all on disk, edited in place)
- FOUND: commit c3686bbd (Task 1), 95cb332c (Task 2), 7208cb8d (docs/SUMMARY)
- Re-ran acceptance criteria for both tasks: `grep` checks for the two CVS request names, `@JsonRequest` count of 2, `sameCvs`/`replace` field presence — all pass
- Re-ran plan `<verification>`: vitest composer-commands suite (18 passed), Gradle composer+concurrency suite (all green), `npm run lint` (clean), register check (no banned ids in the diff)
