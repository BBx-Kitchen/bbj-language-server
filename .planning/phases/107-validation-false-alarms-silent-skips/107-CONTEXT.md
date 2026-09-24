# Phase 107: Validation False Alarms & Silent Skips - Context

**Gathered:** 2026-09-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Three validation fixes, all in the language server:

1. **VAL-01** — Single-line `IF`/`ELSE`/end-of-`IF` code the compiler accepts stops drawing
   "This statement needs to start in a new line", while a genuinely misplaced `ELSE`/`FI` with no
   open `IF` left on its line stays flagged.
2. **VAL-02** — The use-before-assignment check no longer throws on a `SymbolRef` whose `symbol`
   is absent (the malformed `## = 1` shape), so it keeps checking the rest of the file, and the
   same unguarded read in scope computation stops crashing too.
3. **VAL-03 (new, folded in this discussion)** — Calling a method or reading a field that does not
   exist on a fully resolved Java class (e.g. `BBjAPI().anyInvalidMethod()`) is reported as an
   **Error** by a dedicated, conservative check, instead of a linking Warning that the diagnostic
   hierarchy hides.

VAL-03 widens the roadmap's original "two validators only" footprint. It touches the validator
registration and possibly the document validator's hierarchy/linking-warning handling, and it
reads type inference / Java interop state. It does **not** change `resolveClass` or the member
scope; those belong to Phase 109.

</domain>

<decisions>
## Implementation Decisions

### VAL-01 — Balance-rule fix shape
- **D-01:** Minimal counter repair. Make the two `openIfs` counters in
  `elseStatementLineBreaks` and `ifEndStatementLineBreaks` treat a same-line `ElseStatement`
  consistently, so a complete inner `IF…ELSE…FI` group is no longer double-counted against an
  outer `ELSE` (98-REVIEW.md WR-A mechanism). Do **not** replace both counters with a new shared
  stack walk. Keep plan 08's structure and its false-negative protection.
- **D-02:** Regression tests: the nested one-liner
  `if a then if b then c=1 else d=1 fi else e=1 fi` as a "stays clean" case, the three existing
  "still flagged" cases in `test/line-break-single-line-if.test.ts` unchanged, plus a small matrix
  of synthetic variants (deeper nesting, ELSE-only nesting, end-of-IF after `;`-chained compound
  statements). Add clean shapes to `test/test-data/conformance/single-line-if-forms.bbj` where they
  fit, and add flagged shapes as tests.

### VAL-01 — Residue handling
- **D-03:** If any of the 5 re-flagged files (4 with the blank-message variant, 1 with `: else`)
  still carry the line-break error after the D-01 fix, investigate each remaining shape. Look at the
  flagged lines locally through the harness output, write a synthetic fixture per shape, fix it,
  and measure again. Residue is not an acceptable end state, because success criterion 3 requires
  the re-flagged files to stop carrying the error. The blank-message group may be a different
  mechanism from WR-A. Treat it as unknown until measured.
- **D-04:** Do not change the message text. Stop the false alarm only; do not add a keyword
  fallback for an empty CST text.
- **D-13 (carried constraint):** No corpus file name, path or source line enters the repository,
  and fixtures are synthetic. Snapshot `details.json` before each harness run, compare by file set
  rather than totals, and re-measure after the last fix. The gate is A2 ≤ 22 (the v4.5 exit), the
  re-flagged files are clean, and no file newly enters B.

### VAL-02 — Guard breadth and style
- **D-05:** Guard every `.symbol` read in `validations/check-variable-scoping.ts`:
  `getSymbolRefName`, plus the inline Pass 1 and Pass 2 reads (`item.symbol.$refText`,
  `item.receiver.symbol.$refText`, `variable.symbol…`, `child.symbol…`). **Also** guard the
  unguarded `symbol.$refText` read in `bbj-scope-local.ts` that the todo reproduced crashing during
  scope computation, which Langium's validation registry does not catch. Research must identify
  which scope-local site actually throws for `## = 1`: the assignment branch near line 236 already
  skips `node.instanceAccess`, so it may be the input-variable branch near line 295 or another read.
- **D-06:** Guard style is inline optional checks (`expr.symbol?.$refText`, `&& expr.symbol`),
  matching the file's existing idiom. No new shared type-guard helper.

### VAL-02 — What the malformed node produces
- **D-07:** A `SymbolRef` with no `symbol` is skipped silently as "nothing to record", and the
  check continues with the rest of the scope. This check emits no new diagnostic for it; any
  complaint about the malformed line comes from the parser or linker.
- **D-08:** The regression test (built around `## = 1`) asserts exactly success criterion 4. It
  checks that no diagnostic's message starts with "An error occurred during validation", and that
  a use-before-assignment hint elsewhere in the same file still appears. It does not snapshot
  parser or linker output for the malformed line. Add a companion assertion that scope computation
  for the same input does not throw.

### VAL-03 — Unknown Java member as Error (folded todo)
- **D-09:** Track it as a new requirement **VAL-03** in `.planning/REQUIREMENTS.md`, mapped to
  Phase 107, with a matching success criterion and Code-list entries added to Phase 107 in
  `.planning/ROADMAP.md`. The bookkeeping is done in this discussion's commit.
- **D-10:** Build the main check only. Add a dedicated validation on `MemberCall` that reports an
  **Error** (e.g. "Method 'anyInvalidMethod' is not defined on BBjAPI"; field wording for non-call
  access) only when all of these hold:
  - the receiver's inferred type is a `JavaClass` that Java interop has actually resolved. It must
    not be the synthetic method-less `BBjAPI` fallback from `bbj-api.bbl`, an unresolved or unknown
    type, a BBj class or a Java package;
  - the name matches no method or field of that class, including inherited ones, compared
    case-insensitively, honouring the static-only rule for class-reference receivers and the
    implicit `.class`;
  - the receiver is not a template-string array field access (the linker already skips those).

  When the Error fires, drop the Langium linking warning for the same reference so the user sees
  one diagnostic. Every other case keeps today's Warning. Not in scope: exempting member linking
  warnings from hierarchy Rule 2 and rewording "NamedElement".
- **D-11:** No setting to downgrade the check. The conservative guards carry the false-positive
  risk.
- **D-12:** The gate is unit tests for every guard case (interop down, synthetic BBjAPI, BBj class
  receiver, static vs instance, inherited method, `.class`, template-string field,
  case-insensitive match), plus the whole vitest suite green, **plus** the same local private-corpus
  harness pass as VAL-01. In that pass, review every new Error-severity diagnostic by line shape
  and accept only genuinely unknown members. No corpus text enters the repo (D-13).
- Carried rules: "builtin-call validation stays conservative" (flag only what is certain; bbjcpl
  on save stays authoritative) and the Java-interop cold-resolution gotcha (fire only once the
  receiver class is fully resolved, never on a cold or partial class).

### Claude's Discretion
- Exact bookkeeping change inside the counters (D-01), as long as the three "still flagged" cases
  stay flagged and the nested one-liner stays clean.
- The exact variants in the D-02 matrix.
- Where the VAL-03 check is registered (`bbj-validator.ts` or a new file under `validations/`),
  how "fully resolved" is detected, and how the duplicate linking warning is suppressed.
- Plan split and wave order. VAL-01, VAL-02 and VAL-03 are independent, and one harness pass at the
  end can cover VAL-01 and VAL-03.

### Folded Todos
- **Loosen single-line IF balance rule for the 5 re-flagged valid files**
  (`.planning/todos/pending/2026-09-21-loosen-single-line-if-balance-rule-a2-residue.md`). This is
  VAL-01: Phase 98 plan 08's counter over-flags nested single-line IF shapes. Close it at phase end.
- **checkUseBeforeAssignment throws on a reference node without a symbol**
  (`.planning/todos/pending/2026-09-23-use-before-assignment-check-throws-on-a-reference-without-a-symbol.md`).
  This is VAL-02, including the `bbj-scope-local.ts` site it notes. Close it at phase end.
- **Calling a method that does not exist on a Java object is only a hideable warning**
  (`.planning/todos/pending/2026-09-24-flag-unknown-method-on-java-object-as-error.md`). This
  becomes VAL-03, main check only (D-10). Close it at phase end. The optional extras stay unbuilt;
  if they are wanted later, file them as a new todo at phase end.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 107 goal, success criteria, planning notes (VAL-03 criterion added)
- `.planning/REQUIREMENTS.md` — VAL-01, VAL-02, VAL-03

### VAL-01 history (line-break balance rule)
- `.planning/todos/pending/2026-09-21-loosen-single-line-if-balance-rule-a2-residue.md` — problem, WR-A repro, constraints
- `.planning/milestones/v4.5-phases/98-line-break-validation-false-alarms-a2/98-REVIEW.md` — WR-A: ELSE double-counting mechanism
- `.planning/milestones/v4.5-phases/98-line-break-validation-false-alarms-a2/98-VERIFICATION.md` — `overrides:` block accepting the residue at 98's close
- `.planning/milestones/v4.5-phases/98-line-break-validation-false-alarms-a2/98-CONFORMANCE.md` §10 — the A2 27 re-measure and the two message groups
- `.planning/milestones/v4.5-phases/98-line-break-validation-false-alarms-a2/98-08-SUMMARY.md` — why the counter replaced the unconditional walk (false-negative it closed)
- `.planning/milestones/v4.5-phases/104-conformance-measurement-milestone-exit/104-CONFORMANCE.md` — exit gate A2 = 22; "Residual list A2" section

### VAL-02
- `.planning/todos/pending/2026-09-23-use-before-assignment-check-throws-on-a-reference-without-a-symbol.md` — mechanism, `## = 1` repro, scope-local note

### VAL-03
- `.planning/todos/pending/2026-09-24-flag-unknown-method-on-java-object-as-error.md` — evidence, proposed guards, risks, acceptance

### Conformance harness procedure
- `bbj-vscode/test/test-data/conformance/README.md` — synthetic fixture rules

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `test/line-break-single-line-if.test.ts` — "accepts" and "stay flagged" describe blocks; extend them for D-02.
- `test/test-data/conformance/single-line-if-forms.bbj` — clean-shape fixture auto-parsed by `example-files.test.ts`.
- `test/variable-scoping.test.ts` — home for the `## = 1` regression (D-08).
- `test/bbj-test-module.ts` `createBBjTestServices` — fake Java classes (BBjAPI, HashMap, String) for the VAL-03 guard-case tests.

### Established Patterns
- `line-break-validation.ts:186-237`: the shared balance-rule comment plus the two counters. ELSE increments in the ELSE walker but is treated as consuming in the end-of-IF walker; that inconsistency is the WR-A target.
- `check-variable-scoping.ts`: already uses `?.` on `$refText` but not on `.symbol`. The hint is `accept('hint', "'x' used before assignment …")` at line ~279.
- `bbj-document-validator.ts` `toDiagnostic` downgrades non-cyclic linking errors to Warning; `applyDiagnosticHierarchy` Rule 1 drops linking errors when there are parse errors, and Rule 2 drops warnings when any Error exists. The VAL-03 Error must be a validation diagnostic, not a linking one, so these rules do not hide it.
- Tests parse with `parseHelper` / `validationHelper`, not `DocumentBuilder.build` (build triggers CPL/interop on :5008).

### Integration Points
- VAL-03 registers in `bbj-validator.ts` (`MemberCall` check) and reads `services.types.Inferer` and the `JavaInteropService` resolved-class state.
- VAL-03's shared files with Phase 109 (`bbj-scope.ts`, `bbj-linker.ts`, `java-interop.ts`) are read-only here. Changing them would collide with 109's `resolveClass` work.

</code_context>

<specifics>
## Specific Ideas

- Start VAL-01 from `if a then if b then c=1 else d=1 fi else e=1 fi` (must stay clean).
- VAL-02 repro input: `## = 1` (two sigils; a single `# = 1` does not reproduce).
- VAL-03 repro inputs: `BBjAPI().anyInvalidMethod()`, `x! = BBjAPI().anyInvalidMethod()`,
  `api! = BBjAPI()` then `api!.anyInvalidMethod()`, `declare java.lang.String s!` then
  `s!.anyInvalidMethod()`, each with and without an unrelated parse error such as `x = (1`.

</specifics>

<deferred>
## Deferred Ideas

- VAL-03 optional extras: exempt unresolved Java member linking warnings from hierarchy Rule 2,
  and replace the "NamedElement" wording in member linking messages. Not built in 107.
- A setting to downgrade the VAL-03 check to Warning (D-11). Revisit only if false positives
  appear.

</deferred>

---

*Phase: 107-validation-false-alarms-silent-skips*
*Context gathered: 2026-09-24*
