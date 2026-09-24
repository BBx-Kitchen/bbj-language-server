# Phase 107: Validation False Alarms & Silent Skips - Research

**Researched:** 2026-09-24
**Domain:** Langium validation/scope-computation/linking pipeline (BBj language server) — no new external dependencies
**Confidence:** HIGH (all three mechanisms empirically reproduced this session; VAL-03's design choices are HIGH-confidence recommendations, some left to Claude's Discretion per CONTEXT.md)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**VAL-01 — Balance-rule fix shape**
- **D-01:** Minimal counter repair. Make the two `openIfs` counters in `elseStatementLineBreaks` and
  `ifEndStatementLineBreaks` treat a same-line `ElseStatement` consistently, so a complete inner
  `IF…ELSE…FI` group is no longer double-counted against an outer `ELSE` (98-REVIEW.md WR-A
  mechanism). Do **not** replace both counters with a new shared stack walk. Keep plan 08's
  structure and its false-negative protection.
- **D-02:** Regression tests: the nested one-liner `if a then if b then c=1 else d=1 fi else e=1 fi`
  as a "stays clean" case, the three existing "still flagged" cases in
  `test/line-break-single-line-if.test.ts` unchanged, plus a small matrix of synthetic variants
  (deeper nesting, ELSE-only nesting, end-of-IF after `;`-chained compound statements). Add clean
  shapes to `test/test-data/conformance/single-line-if-forms.bbj` where they fit, and add flagged
  shapes as tests.

**VAL-01 — Residue handling**
- **D-03:** If any of the re-flagged files still carry the line-break error after the D-01 fix,
  investigate each remaining shape. Look at the flagged lines locally through the harness output,
  write a synthetic fixture per shape, fix it, and measure again. Residue is not an acceptable end
  state, because success criterion 3 requires the re-flagged files to stop carrying the error. The
  blank-message group may be a different mechanism from WR-A. Treat it as unknown until measured.
- **D-04:** Do not change the message text. Stop the false alarm only; do not add a keyword fallback
  for an empty CST text.
- **D-13 (carried constraint):** No corpus file name, path or source line enters the repository, and
  fixtures are synthetic. Snapshot `details.json` before each harness run, compare by file set rather
  than totals, and re-measure after the last fix. The gate is A2 ≤ 22 (the v4.5 exit), the re-flagged
  files are clean, and no file newly enters B.

**VAL-02 — Guard breadth and style**
- **D-05:** Guard every `.symbol` read in `validations/check-variable-scoping.ts`:
  `getSymbolRefName`, plus the inline Pass 1 and Pass 2 reads (`item.symbol.$refText`,
  `item.receiver.symbol.$refText`, `variable.symbol…`, `child.symbol…`). **Also** guard the unguarded
  `symbol.$refText` read in `bbj-scope-local.ts` that the todo reproduced crashing during scope
  computation, which Langium's validation registry does not catch.
- **D-06:** Guard style is inline optional checks (`expr.symbol?.$refText`, `&& expr.symbol`),
  matching the file's existing idiom. No new shared type-guard helper.

**VAL-02 — What the malformed node produces**
- **D-07:** A `SymbolRef` with no `symbol` is skipped silently as "nothing to record", and the check
  continues with the rest of the scope. This check emits no new diagnostic for it; any complaint
  about the malformed line comes from the parser or linker.
- **D-08:** The regression test (built around `## = 1`) asserts exactly success criterion 4. It
  checks that no diagnostic's message starts with "An error occurred during validation", and that a
  use-before-assignment hint elsewhere in the same file still appears. It does not snapshot parser or
  linker output for the malformed line. Add a companion assertion that scope computation for the same
  input does not throw.

**VAL-03 — Unknown Java member as Error (folded todo)**
- **D-09:** Tracked as VAL-03 in `.planning/REQUIREMENTS.md`, mapped to Phase 107. Bookkeeping already
  done in the discussion's commit.
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

  When the Error fires, drop the Langium linking warning for the same reference so the user sees one
  diagnostic. Every other case keeps today's Warning. Not in scope: exempting member linking warnings
  from hierarchy Rule 2 and rewording "NamedElement".
- **D-11:** No setting to downgrade the check. The conservative guards carry the false-positive risk.
- **D-12:** The gate is unit tests for every guard case (interop down, synthetic BBjAPI, BBj class
  receiver, static vs instance, inherited method, `.class`, template-string field, case-insensitive
  match), plus the whole vitest suite green, **plus** the same local private-corpus harness pass as
  VAL-01. In that pass, review every new Error-severity diagnostic by line shape and accept only
  genuinely unknown members. No corpus text enters the repo (D-13).
- Carried rules: "builtin-call validation stays conservative" (flag only what is certain; bbjcpl on
  save stays authoritative) and the Java-interop cold-resolution gotcha (fire only once the receiver
  class is fully resolved, never on a cold or partial class).

### Claude's Discretion
- Exact bookkeeping change inside the counters (D-01), as long as the three "still flagged" cases
  stay flagged and the nested one-liner stays clean.
- The exact variants in the D-02 matrix.
- Where the VAL-03 check is registered (`bbj-validator.ts` or a new file under `validations/`), how
  "fully resolved" is detected, and how the duplicate linking warning is suppressed.
- Plan split and wave order. VAL-01, VAL-02 and VAL-03 are independent, and one harness pass at the
  end can cover VAL-01 and VAL-03.

### Deferred Ideas (OUT OF SCOPE)
- VAL-03 optional extras: exempt unresolved Java member linking warnings from hierarchy Rule 2, and
  replace the "NamedElement" wording in member linking messages. Not built in 107.
- A setting to downgrade the VAL-03 check to Warning (D-11). Revisit only if false positives appear.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VAL-01 | Single-line `IF`/`ELSE`/end-of-`IF` forms the compiler accepts get no false "new line" error; a genuinely misplaced `ELSE`/`FI` stays flagged | Exact current counter logic quoted below (`line-break-validation.ts:192-237`); the WR-A fix is fully specified and empirically confirmed to reproduce the bug on current code; harness location/invocation confirmed; current live A2 group counts captured; blank-message mechanism narrowed but NOT solved — flagged as an open question for plan/execution time |
| VAL-02 | Use-before-assignment check keeps checking the rest of a file on a `SymbolRef` with no `symbol`, and the same read in scope computation stops crashing | Both crash sites empirically reproduced with stack traces this session: `check-variable-scoping.ts:64` (caught by ValidationRegistry) and `bbj-scope-local.ts:295` (NOT caught, crashes scope computation); full list of 8 `.symbol` reads needing guards enumerated with line numbers |
| VAL-03 | Unknown method/field on a fully-resolved Java class is an Error that survives hierarchy suppression | `JavaClass.error` field identified as the "fully resolved" discriminator (VERIFIED via generated/ast.ts and java-interop.ts); synthetic BBjAPI fallback confirmed to be a `BbjClass` not a `JavaClass` (already excluded by an `isJavaClass` check); "inherited members" confirmed already flattened into `methods`/`fields` by the bbj-ls backend (VERIFIED via reflection call site) — no superclass walk needed; hierarchy Rules 1/2 read directly from source, confirmed a plain-Error, non-linking diagnostic always survives; CONTEXT.md's own suggested `x = (1` parse-error fixture found NOT to demonstrate the "survives despite a parse error" claim (it swallows the rest of the file) — an alternative fixture is recommended |
</phase_requirements>

## Summary

This phase touches three independent, already-diagnosed defects in the BBj language server's
Langium validation pipeline. For VAL-01 and VAL-02, the exact root cause and (for VAL-01) the exact
minimal fix are already fully specified in prior-phase artifacts (`98-REVIEW.md`'s WR-A finding, and
the VAL-02 todo's own investigation) — this research's job was to verify both empirically against
the CURRENT tree (neither fix has landed yet) and fill in the gaps CONTEXT.md flagged as unknown.
Both are now independently reproduced this session with real stack traces and diagnostic dumps. VAL-03
is new work; research focused on how to detect "a fully resolved `JavaClass`" using only existing
state (no changes to `bbj-scope.ts`/`bbj-linker.ts`/`java-interop.ts`, which Phase 109 owns), and on
the exact mechanics of the diagnostic hierarchy that the new check must survive.

**Primary recommendation:** Implement VAL-01's fix exactly as specified in `98-REVIEW.md` (make
`elseStatementLineBreaks` treat a same-line `ElseStatement` as consuming, mirroring
`ifEndStatementLineBreaks`'s existing branch) — this is a five-line, load-bearing change, already
reviewed and test-verified against the "still flagged" regressions in a prior session; treat the
blank-message A2 group as a **separate, unsolved investigation** requiring harness access (this
research could not reproduce it with several plausible synthetic inputs). Implement VAL-02 by adding
`?.` at the eight enumerated `.symbol` read sites in `check-variable-scoping.ts` plus the one site at
`bbj-scope-local.ts:295`. Implement VAL-03 as a new `MemberCall` validation check gated on
`isJavaClass(receiverType) && !receiverType.error`, doing its own flat case-insensitive scan of
`receiverType.methods`/`.fields` (no superclass walk needed — the backend already flattens inherited
public members) with a static-only filter for class-reference receivers, an unconditional `.class`
exemption, and a template-string-array receiver exemption mirroring the linker's own check; suppress
the duplicate linking Warning as a post-processing step over the merged diagnostics list in
`BBjDocumentValidator`, matching by CST range.

## Architectural Responsibility Map

This project has no browser/SSR/API/CDN tiers — it is a single-process Langium language server
consumed identically by two IDE clients (LSP4IJ in IntelliJ, the built-in client in VS Code). The
meaningful "tiers" are the Langium build pipeline's own stages, per `CLAUDE.md`'s own architecture
description.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| VAL-01 line-break balance rule | Validator (`validations/line-break-validation.ts`, registered as an `AstNode`-wide check) | — | Pure syntactic backward-walk over already-parsed statement siblings; no cross-file or interop state |
| VAL-02 use-before-assignment silent skip | Validator (`validations/check-variable-scoping.ts`) | Scope Computation (`bbj-scope-local.ts`) | The identical unguarded read exists in both a validation check (caught by Langium's `ValidationRegistry.handleException`) and scope computation (uncaught — crashes one build phase earlier) |
| VAL-03 unknown Java member as Error | Validator (new `MemberCall` check, `bbj-validator.ts` or a new `validations/` file) | Document Validator (`bbj-document-validator.ts`, for suppressing the duplicate linking Warning) and Java Interop (`java-interop.ts`, read-only data source for `JavaClass.methods`/`.fields`/`.error`) | The check itself is pure validation logic reading already-resolved `JavaClass` state; the diagnostic-hierarchy interaction (dropping the duplicate Warning) is a Document Validator concern, not a Validator concern |

## Standard Stack

No new external dependencies. This phase modifies existing internal TypeScript logic only, within
the already-installed Langium pipeline.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `langium` | `~4.3.1` [VERIFIED: bbj-vscode/package.json] | Grammar/AST/validation/linking/scope framework already in use | Already the project's language-engineering framework; all three fixes are within its existing extension points (`ValidationRegistry`, `DefaultScopeComputation`, `DefaultLinker`, `DefaultDocumentValidator`) |
| `vitest` | `^4.1.10` [VERIFIED: bbj-vscode/package.json] | Test runner | Already the project's test runner; `parseHelper`/`validationHelper` from `langium/test` are the project's established probing pattern |

**Installation:** None required.

## Package Legitimacy Audit

Not applicable — this phase installs no external packages.

## Architecture Patterns

### System Architecture Diagram

```
BBj source text
      │
      ▼
┌─────────────┐   lexer errors ──────────────────────────────┐
│   Lexer     │                                               │
└──────┬──────┘                                               │
       ▼                                                      │
┌─────────────┐   parser errors (recovery may still           │
│   Parser    │   produce a partial AST) ─────────────────────┤
└──────┬──────┘                                               │
       ▼                                                      │
┌─────────────────────┐  VAL-02 scope-local crash site:       │
│ Scope Computation    │  BbjScopeComputation.processNode      │
│ (bbj-scope-local.ts) │  (uncaught — one phase before         │
└──────┬────────────────┘  the validation registry can catch  │
       ▼                    an exception)                     │
┌─────────────────────┐  VAL-03 linking Warning site:          │
│ Linker                │ processLinkingErrors + BbjLinker      │
│ (bbj-linker.ts,       │ .getCandidate — unresolved MemberCall │
│  bbj-scope.ts)        │ .member becomes a downgraded Warning  │
└──────┬────────────────┘                                      │
       ▼                                                      │
┌─────────────────────┐  VAL-01 site: checkLineBreaks          │
│ AST Validation        │ (line-break-validation.ts)            │
│ (ValidationRegistry)  │ VAL-02 site: checkUseBeforeAssignment │
│                        │ (check-variable-scoping.ts) — caught  │
│                        │ by ValidationRegistry.handleException │
│                        │ VAL-03 site: new MemberCall check     │
└──────┬────────────────┘ (bbj-validator.ts)                    │
       ▼                                                      │
┌─────────────────────────────────────────┐                   │
│ BBjDocumentValidator.validateDocument     │◄──────────────────┘
│ merges: lexer + parser + linking +        │
│ validation diagnostics into one array     │
└──────┬────────────────────────────────────┘
       ▼
┌─────────────────────────────────────────┐
│ applyDiagnosticHierarchy                  │  VAL-03's new Error must survive
│ Rule 1: parse errors → drop ALL           │  both rules; a plain validation
│   data.code===LinkingError diagnostics    │  Error (not linking-coded) is
│ Rule 2: any Error present → drop all      │  structurally exempt from both
│   non-Error diagnostics except a          │  (confirmed by reading the rule
│   downgraded-syntax-warning               │  bodies directly — see below)
└──────┬────────────────────────────────────┘
       ▼
   LSP diagnostics → VS Code / IntelliJ (via LSP4IJ)
```

### Recommended Project Structure

No new files are structurally required; VAL-03 may land in `bbj-validator.ts` alongside
`checkMemberCallUsingAccessLevels` (same registration key, same file) or in a new
`validations/check-unknown-java-member.ts` following the existing `validations/check-*.ts` pattern
(each exports a `registerXChecks(registry, services)` function called from
`registerValidationChecks`). Both are consistent with the codebase's existing conventions; left to
Claude's Discretion per CONTEXT.md.

```
bbj-vscode/src/language/
├── bbj-validator.ts                      # MemberCall access-level check already lives here;
│                                          # VAL-03 can extend it or import a sibling check
├── bbj-document-validator.ts             # applyDiagnosticHierarchy, toDiagnostic, processLinkingErrors
├── bbj-scope-local.ts                    # VAL-02's second crash site (line 295)
├── validations/
│   ├── line-break-validation.ts          # VAL-01
│   ├── check-variable-scoping.ts         # VAL-02
│   └── check-unknown-java-member.ts      # VAL-03 (new, if split out)
```

### Pattern 1: The `openIfs` balance-rule walk (VAL-01)

**What:** `elseStatementLineBreaks` and `ifEndStatementLineBreaks` each walk backward over
same-line sibling statements, counting same-line closers (`IfEndStatement`/`ElseStatement`) that
must be "spent" against an `IfStatement` before that `IfStatement` can be treated as this node's own
governing IF.

**Current code, both functions, exactly as they exist on this tree today** — the WR-A defect is
still present (neither function has been touched since `98-REVIEW.md` filed it):

```typescript
// Source: bbj-vscode/src/language/validations/line-break-validation.ts:192-213 [VERIFIED: read this session]
function elseStatementLineBreaks(): LineBreakConfig<ElseStatement> {
    const mask = (node: ElseStatement) => {
        const lineBreaks = { before: false, after: false, both: true };
        let openIfs = 0;
        let prev = previousStatement(node);
        while (isSingleStatement(prev) && isSameLine(prev, node)) {
            if (isIfEndStatement(prev) || isElseStatement(prev)) {
                // A prior closer or ELSE already spent one open IF; an ELSE cannot own two.
                openIfs++;
            } else if (isIfStatement(prev)) {
                if (openIfs === 0) {
                    lineBreaks.both = false;
                    break;
                }
                openIfs--;
            }
            prev = previousStatement(prev);
        }
        return lineBreaks
    }
    return [isElseStatement, mask]
}
```

```typescript
// Source: bbj-vscode/src/language/validations/line-break-validation.ts:215-237 [VERIFIED: read this session]
function ifEndStatementLineBreaks(): LineBreakConfig<IfEndStatement> {
    const mask = (node: IfEndStatement) => {
        let lineBreaks = { before: false, after: false, both: true };
        let openIfs = 0;
        let prev = previousStatement(node);
        while (isSingleStatement(prev) && isSameLine(prev, node)) {
            if (isIfEndStatement(prev)) {
                // ELSE does not increment here: it still belongs to an open IF, so it is a
                // valid thing for an end-of-IF to close directly.
                openIfs++;
            } else if (isIfStatement(prev) || isElseStatement(prev)) {
                if (openIfs === 0) {
                    lineBreaks.both = false;
                    break;
                }
                openIfs--;
            }
            prev = previousStatement(prev);
        }
        return lineBreaks
    }
    return [isIfEndStatement, mask]
}
```

**The asymmetry (WR-A, `98-REVIEW.md`, confirmed unchanged on this tree):** in
`elseStatementLineBreaks`, a same-line `ElseStatement` steps `openIfs++` (treated as an independent
"opener claim"). In `ifEndStatementLineBreaks`, a same-line `ElseStatement` instead falls into the
"decrement/terminate" branch (treated as consuming, exactly like an `IfStatement`). When a same-line
chain contains one complete inner `IF…THEN…ELSE…FI` group, `elseStatementLineBreaks`'s walk (for an
**outer** `ElseStatement` further back on the same line) counts that single inner `IfStatement` as
consuming **two** claimed opens (one for stepping past the inner `IfEndStatement`, one for stepping
past the inner `ElseStatement`) instead of one — so it runs out of claimed opens one step too early
and misses the real governing `IfStatement`.

**Minimal fix (D-01), exactly as specified and already test-verified once in a prior session
(98-REVIEW.md, "Fix:" section) — mirror `ifEndStatementLineBreaks`'s branch exactly, moving
`isElseStatement` from the increment branch to the decrement/terminate branch:**

```typescript
function elseStatementLineBreaks(): LineBreakConfig<ElseStatement> {
    const mask = (node: ElseStatement) => {
        const lineBreaks = { before: false, after: false, both: true };
        let openIfs = 0;
        let prev = previousStatement(node);
        while (isSingleStatement(prev) && isSameLine(prev, node)) {
            if (isIfEndStatement(prev)) {
                openIfs++;
            } else if (isIfStatement(prev) || isElseStatement(prev)) {
                if (openIfs === 0) {
                    lineBreaks.both = false;
                    break;
                }
                openIfs--;
            }
            prev = previousStatement(prev);
        }
        return lineBreaks
    }
    return [isElseStatement, mask]
}
```

After this change, `elseStatementLineBreaks` and `ifEndStatementLineBreaks` become structurally
identical apart from which statement kind is excluded from the increment branch — that symmetry is
itself the correctness argument (98-REVIEW.md's own framing, confirmed by tracing the nested-one-liner
input by hand against both versions this session).

**Empirical confirmation this session (throwaway probe, `validationHelper` + `createBBjServices`, run
and deleted, not part of any commit):** on the **current, unfixed** tree, parsing
`if a then if b then c=1 else d=1 fi else e=1 fi\n` and filtering diagnostics for
`/new line|line break/i` produced exactly:
```
["This statement needs to start in a new line: else"]
```
— reproducing WR-A exactly as `98-REVIEW.md` described it, confirming the defect is still present and
unfixed on this tree, and that the D-01 fix target is correctly identified.

**The three "still flagged" regressions that MUST stay flagged (D-02)**, read directly from
`test/line-break-single-line-if.test.ts:69-84` [VERIFIED: read this session] — **none of these three
involve `ElseStatement` at all**, so the D-01 fix (which only touches `elseStatementLineBreaks`)
carries essentially zero risk of reopening them:
1. `'mylabel: fi\n'` — a label followed by an end-of-IF statement with no governing IF.
2. `'a = 1 b = 2\n'` — two real statements on one line with no semicolon between them.
3. `'if x then\na = 1\nfi if y then\nb = 2\nfi\n'` — an end-of-IF statement sharing a line with a
   following IF.

Additionally, `test/line-break-walk-termination.test.ts`'s `'a closer with no open IF left on the
line is still flagged'` describe block (lines 96-113) has three cases that **do** exercise
`elseStatementLineBreaks` and must stay flagged after the fix — these are the WR-A fix's own
false-negative regression guard, already present as tests: an ELSE after an already-closed single-line
IF/FI, a trailing end-of-IF with no open IF, and a second ELSE for one IF. The same file's line 115-119
test (`'a nested single-line IF/FI followed by the outer ELSE stays clean'`) is the WR-A-adjacent case
**already passing** (no inner ELSE); D-02 asks for the **inner-ELSE variant** to be added as a new
sibling test.

### Pattern 2: The blank-message A2 residue — confirmed but NOT root-caused (D-03)

The conformance harness lives locally at `/home/coder/repos/bbj-corpus/conformance/run.mjs`
[VERIFIED: read this session — `bbj-vscode/test/test-data/conformance/README.md:17-20` documents the
same invocation from a checkout of the private `bbj-corpus` repository] and is invoked as:

```bash
node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server [--endpoint 127.0.0.1:5008]
```

[CITED: `.planning/milestones/v4.5-phases/98-line-break-validation-false-alarms-a2/98-CONFORMANCE.md:23`
gives the identical command against this exact checkout.] Snapshot `conformance/details.json` before
each run (per D-13) — it already exists locally at this path with a run dated 2026-09-23.

**Current live A2 count, read directly from `details.json` this session (no corpus text quoted, per
D-13 — only message strings and occurrence counts, which are the harness's own generated text, not
corpus source):**
- Total A2 = 22 (matches the `104-CONFORMANCE.md` exit gate of ≤22 — [VERIFIED: read
  `/home/coder/repos/bbj-corpus/conformance/details.json` `falseAlarms` array this session, 22
  entries]).
- The blank-message group (`"This statement needs to start in a new line: "` — literally 45
  characters, nothing captured after the colon-space) currently has **6** occurrences, not the 4 the
  2026-09-21 todo recorded. The `"This statement needs to start in a new line: else"` (WR-A) group
  currently has **1** occurrence. **Re-measure at plan/execution time — the corpus or harness output
  may have shifted since the todo was filed; do not assume the "5 re-flagged files" figure from the
  todo is still current.**
- All 6 blank-message occurrences are, by shape (confirmed by reading `details.json`'s per-entry
  `source` field locally, not quoted here per D-13), a **bare `IF <condition> THEN` header with
  nothing else on its physical line** — i.e., the first line of an ordinary multi-line `IF` block.

**What this research ruled out empirically** (throwaway probes this session, run and deleted): a bare
multi-line `IF` as the very first statement in a file, preceded by a blank line, preceded by a `REM`
comment line, nested inside a method body, and with 6 leading spaces of indentation — **none of these
synthetic variants reproduced a blank-captured-text diagnostic**; all six produced zero line-break
diagnostics, as expected for ordinary valid code. This means the actual trigger condition in the real
corpus files is more specific than "a bare multi-line IF header" alone.

**Mechanism analysis (not empirically confirmed — flagged LOW confidence, for the next investigator):**
the blank capture can only occur when `getCstNodes(node.$cstNode, mask.before)` (or `mask.both`) is
called with a **boolean** `true` mask value (not a keyword array) — that path returns
`[node.$cstNode]`, i.e. the **whole AST node's own CST range**, and `textDocument.getText(cst.range)`
on that range is empty only if the range itself is zero-width. `ifStatementLineBreaks` and
`compoundStatementLineBreaks` are the only two configs that use a boolean `before`/`both` mask on a
container more complex than a single keyword. `checkLineBreaks` already bails out early when
`document.parseResult.parserErrors.length > 0` [VERIFIED:
`bbj-vscode/src/language/validations/line-break-validation.ts:57-61`, quoted: `"if (document.parseResult.parserErrors.length > 0) { return; }"`],
so these are confirmed-clean parses — ruling out ordinary parser-recovery stub nodes as the direct
cause. **This mechanism was not solved this session and is the single largest open item for VAL-01's
plan** — D-03 explicitly anticipates this ("Treat it as unknown until measured... investigate each
remaining shape locally through the harness output"). Recommend the plan allocate explicit time for a
harness-backed investigation session (reading the actual flagged files' surrounding context locally,
never quoting them) before declaring the A2 gate met.

### Pattern 3: VAL-02's two independent crash sites (D-05)

**Site 1 — `check-variable-scoping.ts:64`, caught by Langium's `ValidationRegistry`.** Empirically
confirmed this session with `## = 1` as input (via `createBBjTestServices` + `parseHelper`,
`validation: true`):

```
An error occurred during validation: TypeError: Cannot read properties of undefined (reading '$refText')
    at getSymbolRefName (check-variable-scoping.ts:64:28)
    at check-variable-scoping.ts:119:34                          [Pass 1, LetStatement branch]
    at walkStatements (check-variable-scoping.ts:51:9)
    at checkUseBeforeAssignment (check-variable-scoping.ts:114:5)
    at ValidationRegistry.Program (check-variable-scoping.ts:34:13)
    at ValidationRegistry.handleException (.../validation-registry.js:79:19)
```

This confirms the crash is caught (the file gets an `"An error occurred during validation: ..."`
diagnostic and the rest of the file's OTHER validation checks still run — but `checkUseBeforeAssignment`
itself produces **zero** diagnostics for this scope, silently, exactly as the todo described).

**Site 2 — `bbj-scope-local.ts:295`, NOT caught — crashes scope computation, one build phase before
validation can run.** D-05 asked "research must identify which scope-local site actually throws";
confirmed empirically this session with `ENTER ##` as input:

```
TypeError: Cannot read properties of undefined (reading '$refText')
    at BbjScopeComputation.processNode (bbj-scope-local.ts:295:47)
    at BbjScopeComputation.collectLocalSymbols (bbj-scope-local.ts:162:28)
    at BBjDocumentBuilder.buildDocuments (.../document-builder.js:261:9)
    at BBjDocumentBuilder.build (.../document-builder.js:72:9)
```

This is the `isInputVariable(node) && (isReadStatement(...) || isDreadStatement(...) ||
isEnterStatement(...))` branch [VERIFIED: `bbj-vscode/src/language/bbj-scope-local.ts:293-296`, quoted:
`"if (isSymbolRef(node)) {\n                const scopeHolder = node.$container.$container\n                const inputName = node.symbol.$refText"`]
— confirming D-05's own hypothesis ("it may be the input-variable branch near line 295").

**The assignment branch (`bbj-scope-local.ts:236-251`) does NOT crash for `## = 1`** — confirmed
empirically this session by dumping the AST: for `## = 1`, the outer `Assignment.instanceAccess` is
`true` (the first `#` sigil), and the inner `SymbolRef` (the assignment's `.variable`) independently
carries its own `instanceAccess: true` with `symbol: undefined` (the second `#` sigil, with nothing
valid recognized after it) [VERIFIED: this session's probe dumped
`Assignment node: instanceAccess= true variable.$type= SymbolRef` and
`SymbolRef node: instanceAccess= true symbol= undefined container.$type= Assignment
containerProperty= variable`]. Since the assignment branch's guard condition is
`isAssignment(node) && !node.instanceAccess && ...` [VERIFIED:
`bbj-vscode/src/language/bbj-scope-local.ts:236`], and `node.instanceAccess` is `true`, the entire
branch is skipped — confirming D-05's note that "the assignment branch near line 236 already skips
`node.instanceAccess`".

**All 8 `.symbol` reads in `check-variable-scoping.ts` needing a guard (D-05), enumerated by reading
the current file this session:**

| # | Line | Code (context) | Guarded today? |
|---|------|-----------------|-----------------|
| 1 | 64 | `expr.symbol.$refText?.toLowerCase()` — `getSymbolRefName`, used by Pass 1's LetStatement branch (119) and ForStatement branch (197) | No — the crash site |
| 2 | 141 | `item.symbol.$refText?.toLowerCase()` — Pass 1, `DreadStatement` `isSymbolRef` branch | No |
| 3 | 147 | `item.receiver.symbol.$refText?.toLowerCase()` — Pass 1, `DreadStatement` `isArrayElement` branch | No |
| 4 | 161 | `item.symbol.$refText?.toLowerCase()` — Pass 1, `ReadStatement` `isSymbolRef` branch | No |
| 5 | 166 | `item.receiver.symbol.$refText?.toLowerCase()` — Pass 1, `ReadStatement` `isArrayElement` branch | No |
| 6 | 180 | `variable.symbol.$refText?.toLowerCase()` — Pass 1, `EnterStatement` `isSymbolRef` branch | No |
| 7 | 185 | `variable.receiver.symbol.$refText?.toLowerCase()` — Pass 1, `EnterStatement` `isArrayElement` branch | No |
| 8 | 229 | `child.symbol.$refText?.toLowerCase()` — Pass 2, the usage walk | No |

[VERIFIED: `bbj-vscode/src/language/validations/check-variable-scoping.ts:62-67,136-192,205-240`, read
this session in full.] Per D-06, the fix at each site is a minimal inline optional-chain addition
(`expr.symbol?.$refText`), matching the file's existing idiom (it already uses `?.` on `.$refText`
itself everywhere, just not on the `.symbol` step before it). Line 237
(`if (child.symbol.ref === undefined)`) does **not** need its own separate guard: once site 8 (line
229) bails out early via the existing `if (usageOffset === undefined || varName === undefined)` check
at line 231, execution never reaches line 237 with an absent `.symbol`.

**Note for the plan: `bbj-scope-local.ts:295` is a *different file* from D-05's primary list** — the
guard there is `node.symbol?.$refText`, and per D-07 the fix should skip adding to scope silently (the
same "nothing to record" contract as the validation-side guards), not emit a diagnostic. This file is
outside `validations/`, so a task boundary should make clear it is in scope even though it is not a
"validation check" file.

**D-08's regression test:** `## = 1` [SPECIFICS: confirmed via this session's probe that a single `#`
alone — `# = 1` — does *not* reproduce either crash; it is consumed entirely by the *assignment's own*
`instanceAccess` flag, leaving the assignment's LHS unset, which the existing code already handles].
Home file: `test/variable-scoping.test.ts` (existing `describe('Variable Scoping', ...)` suite, already
uses both `createBBjServices` and `createBBjTestServices` — reuse either).

### Pattern 4: VAL-03 — detecting "a fully resolved JavaClass" (D-10)

**The discriminator is the `JavaClass.error` field, not a separate "resolved" flag:**

```typescript
// Source: bbj-vscode/src/language/generated/ast.ts:1325-1335 [VERIFIED: read this session]
export interface JavaClass extends Class, Documented {
    readonly $container: Classpath | JavaClass;
    readonly $type: 'JavaClass';
    classes: Array<JavaClass>;
    constructors: Array<JavaMethod>;
    deprecated: boolean;
    error?: string;
    fields: Array<JavaField>;
    methods: Array<JavaMethod>;
    packageName: string;
}
```

`error` is populated by `JavaInteropService.createStubClass()` — the object returned whenever
resolution fails, is aborted, hits the recursion-depth backstop, or has not been attempted yet:

```typescript
// Source: bbj-vscode/src/language/java-interop.ts:995-1006 [VERIFIED: read this session]
private createStubClass(className: string, cache: boolean = true): JavaClass {
    ...
    const stub: Mutable<JavaClass> = {
        $type: JavaClass.$type,
        ...
        fields: [],
        methods: [],
        classes: [],
        constructors: [],
        deprecated: false,
        error: `Resolution failed or depth limit exceeded`,
    } as unknown as Mutable<JavaClass>;
    ...
}
```

**Recommended guard:** `isJavaClass(receiverType) && !receiverType.error`. This single condition
covers "interop down", "cold/partial class" (the depth-limit backstop explicitly returns
`createStubClass(className, false)` — [VERIFIED: `java-interop.ts:920-924`, quoted:
`"if (_depth > JavaInteropService.MAX_RESOLUTION_DEPTH) {\n            logger.warn(... 'returning partial class');\n            return this.createStubClass(className, false);"`])
and "resolution not yet attempted" (a stub is also what a failed/rejected `resolveClassByName` call
returns) — all of these carry a truthy `error` string, and no fully-resolved class ever does.

**The synthetic BBjAPI fallback is already excluded by `isJavaClass` alone — it is architecturally a
different AST type.** `builtinBBjAPI` (the `bbj-api.bbl` fallback) is BBj source text parsed into a
`BbjClass`, not a `JavaClass`:

```typescript
// Source: bbj-vscode/src/language/lib/bbj-api.ts:1-13 [VERIFIED: read this session]
// Minimal synthetic BBjAPI class so that BBjAPI() resolves even without Java interop.
// NOTE: The `library` keyword causes BBjAPI to also appear as a LibFunction in scope.
// The linker in bbj-linker.ts has a special case that prefers the JavaClass BBjAPI
// (from Java interop, with full method signatures) over this synthetic fallback.
export const builtinBBjAPI = `

library

class public BBjAPI
classend

`.trimLeft();
```

The linker's own special case for the `BBjAPI` reference text confirms the priority order explicitly:

```typescript
// Source: bbj-vscode/src/language/bbj-linker.ts:116-131 [VERIFIED: read this session]
if (refInfo.reference.$refText.toLowerCase() === 'bbjapi' && isMethodCall(symbolRef.$container)) {
    // BBjAPI() is always available as an implicit import (case-insensitive).
    // Priority: JavaClass from Java interop (has full method signatures for CC)
    //       →   synthetic BbjClass from bbjlib:///bbj-api.bbl (no methods, link-only fallback)
    const javaClassBBjAPI = this.indexManager()
        .allElements(JavaClass.$type)
        .find(e => e.name === 'BBjAPI');
    if (javaClassBBjAPI) {
        return javaClassBBjAPI;
    }
    const scope = this.scopeProvider.getScope(refInfo);
    const description = scope.getElement('BBjAPI');
    ...
```

Since the fallback path only ever produces a `BbjClass` (never a `JavaClass`), a plain
`isJavaClass(receiverType)` check already excludes it — no extra special-casing of "is this the
synthetic BBjAPI" is needed as a separate guard; D-10's listed exclusion is *automatically satisfied*
by the type check, not something the plan needs a dedicated branch for. **Important gotcha found
empirically this session:** in `createBBjTestServices` (the test double), `BBjAPI()` itself resolves
to a `LibFunction` — **not** the fake `JavaClass` the test module pre-registers, and **not** the
`BbjClass` fallback either — because `builtinBBjAPI`'s `library` + `class ... classend` text also
registers a same-named `LibFunction` scope entry (per the comment above), and that entry wins over the
indexed `JavaClass` in this specific test-double configuration. Confirmed via a direct probe this
session: `getTypeInternal`'s `SymbolRef` branch has no case for `isLibFunction`, so
`typeInferer.getType()` on a bare `BBjAPI()` call (or a variable assigned from it, `api! = BBjAPI()`)
returns `undefined` in the test double — **do not use `BBjAPI()` itself as the "fully resolved
JavaClass" positive test case.** Use `declare java.lang.String s!` then `s!.anyInvalidMethod()`
instead — confirmed empirically this session to give `receiverType.$type === 'JavaClass'`,
`isJavaClass === true`, `error === undefined`, `methodNames === ['charAt']`,
`fieldNames === ['CASE_INSENSITIVE_ORDER', 'someInstanceField']` — exactly the guard-case shape D-12
asks for, and it also directly covers the static-vs-instance guard case (see below).

**Inherited members are already flattened into `.methods`/`.fields` by the bbj-ls backend — no
superclass walk is needed on the language-server side.** `bbj-scope.ts`'s own comment states Java
classes carry no superclass link (`"Note: JavaClass does not include superclass information from
java-interop. Superclass traversal is not currently supported for Java classes"` — read this session
at `bbj-scope.ts:485`), which could look like a gap for VAL-03's "including inherited ones"
requirement — but it is not one, because the bbj-ls backend (a separate, sibling repository,
`/home/coder/repos/bbj-ls`, owning the DTO per `bbj-ls-production-java-backend` project memory)
populates `fields`/`methods` using Java reflection's `getFields()`/`getMethods()`, which return **all
public members including inherited ones** by Java reflection semantics, not just declared ones:

```java
// Source: bbj-ls InteropService.java:414,423-428 [VERIFIED: read this session, separate repo]
classInfo.fields = Stream.of(clazz.getFields()).map(f -> { ... }).collect(Collectors.toList());
List<Method> methods = Lists.newArrayList(clazz.getMethods());
if (clazz.isInterface()) {
    // add implicit Object declared methods
    methods.addAll(
        Stream.of(Object.class.getMethods()).filter(m -> Modifier.isPublic(m.getModifiers())).toList());
}
```

`Class.getFields()`/`Class.getMethods()` (java.lang.reflect) are documented to return every
**public** field/method, including those declared on superclasses and implemented interfaces — unlike
`getDeclaredFields()`/`getDeclaredMethods()`, which are declared-only. So a flat, case-insensitive
`.some()` scan over `receiverType.methods`/`receiverType.fields` already covers inheritance; VAL-03's
guard needs **no** superclass-walking logic. The test double already models this directly: `HashMap`'s
fake class includes a `getClass` method with the comment `"inherited from java.lang.Object; needed so
obj!.getClass() resolves"` [VERIFIED: `bbj-vscode/test/bbj-test-module.ts:392-400`] — directly reusable
as the D-12 "inherited method" guard-case test.

**Static-only rule for class-reference receivers** is already implemented once, in the scope provider,
and the same detection idiom should be reused for the new check (reading it, not calling it, since
`bbj-scope.ts` is read-only for this phase):

```typescript
// Source: bbj-vscode/src/language/bbj-scope.ts:198-233 [VERIFIED: read this session]
let isClassRef = false;
if (isSymbolRef(receiver)) {
    try {
        const ref = receiver.symbol.ref;
        isClassRef = isJavaClass(ref);
    } catch {
        // cyclic reference, ignore
    }
}
if (isJavaClass(receiverType)) {
    ...
    if (isClassRef) {
        // Class reference access — static members only.
        const staticMethods = receiverType.methods.filter(m => m.isStatic);
        const staticFields = receiverType.fields.filter(f => f.isStatic);
        ...
```

The test double's fake `java.lang.String` class was purpose-built for exactly this guard case:
`CASE_INSENSITIVE_ORDER` is `isStatic: true` with the comment `"static field: accessible via class
reference String.CASE_INSENSITIVE_ORDER"`, and `someInstanceField` is `isStatic: false` with the
comment `"instance field: must NOT be reachable through a class reference"` [VERIFIED:
`bbj-vscode/test/bbj-test-module.ts:440-461`].

**The implicit `.class` exemption:** the type inferer already special-cases the literal member name
`'class'` unconditionally (case-sensitive comparison, no receiver-type check at all):

```typescript
// Source: bbj-vscode/src/language/bbj-type-inferer.ts:61-65 [VERIFIED: read this session]
// Check for .class property — resolves to java.lang.Class
const memberRefText = expression.member.$refText;
if (memberRefText === 'class') {
    return this.javaInterop.getResolvedClass('java.lang.Class');
}
```

VAL-03's guard should mirror this: treat a member name of exactly `'class'` as always exempt (never
flagged), regardless of whether `java.lang.Class` itself is resolvable in the current environment —
this matches `bbj-scope.ts`'s own `classDesc` scope contribution, which is offered whenever
`getResolvedClass('java.lang.Class')` succeeds, for both class-reference and instance access.

**The template-string array field exemption:** the linker already special-cases this exact receiver
shape and skips linking it entirely (so it never even reaches the "unresolved" state today):

```typescript
// Source: bbj-vscode/src/language/bbj-linker.ts:74-83 [VERIFIED: read this session]
override doLink(refInfo: ReferenceInfo, document: LangiumDocument): void {
    if (refInfo.property === 'member' && isMemberCall(refInfo.container)) {
        const receiver = refInfo.container.receiver
        if (isSymbolRef(receiver) && isArrayDecl(receiver.symbol.ref) && isTemplateStringArray(receiver.symbol.ref)) {
            // don't link member calls to array template.
            return
        }
    }
    super.doLink(refInfo, document);
}
```

VAL-03's guard should check the identical condition (`isSymbolRef(receiver) && isArrayDecl(...) &&
isTemplateStringArray(...)`) before firing, even though such a receiver's inferred type is unlikely to
ever satisfy `isJavaClass` in the first place — D-10 lists it as an explicit required guard, and it
costs nothing to check defensively.

### Pattern 5: Surviving the diagnostic hierarchy (D-10's "drop the duplicate linking warning")

**Execution order, read directly from the installed Langium package** — `processLinkingErrors` runs
**before** `validateAst` (which runs the registered `ValidationChecks`, including VAL-03's new one),
and both push into the **same** array that `super.validateDocument()` returns:

```javascript
// Source: bbj-vscode/node_modules/langium/lib/validation/document-validator.js:23-43 [VERIFIED: read this session]
async validateDocument(document, options = {}, cancelToken = CancellationToken.None) {
    const diagnostics = [];
    ...
    this.processLinkingErrors(document, diagnostics, options);      // pushes the linking Warning first
    ...
    diagnostics.push(...await this.validateAst(parseResult.value, options, cancelToken));  // then VAL-03's Error
    ...
    return diagnostics;
}
```

`BBjDocumentValidator.validateDocument` (the project's own override) receives this **already-merged**
list from `super.validateDocument()` before `applyDiagnosticHierarchy` runs — so the duplicate-warning
suppression is naturally a **post-processing filter step**, not something the new check itself can do
from inside a `ValidationAcceptor` (custom checks have no visibility into `document.references` or the
linking-error list at the point they run). **Recommended design:** in `BBjDocumentValidator`, after
`super.validateDocument()` returns and before (or as part of) `applyDiagnosticHierarchy`, filter out
any diagnostic with `data.code === DocumentValidator.LinkingError` whose `range` matches a VAL-03 Error
diagnostic's own range. Setting the VAL-03 Error's `node`/`property` to the same `MemberCall`/`'member'`
pair the linking error already targets (the pattern `checkMemberCallUsingAccessLevels` already uses —
[VERIFIED: `bbj-vscode/src/language/bbj-validator.ts:267-270`]) makes `getDiagnosticRange` compute the
identical range for both diagnostics, giving a reliable, cheap match key with no new shared state.

**Hierarchy Rules 1 and 2, read directly — a plain validation Error survives both, unconditionally:**

```typescript
// Source: bbj-vscode/src/language/bbj-document-validator.ts:143-158 [VERIFIED: read this session]
// Rule 1: parse errors present → suppress ALL linking errors
// Must match on data.code, not severity (linking errors are downgraded to Warning by toDiagnostic)
if (hasParseErrors) {
    result = result.filter(
        d => d.data?.code !== DocumentValidator.LinkingError
    );
}

// Rule 2: any Error-severity diagnostic → suppress all warnings/hints, except a downgraded
// syntax warning ...
if (hasAnyError) {
    result = result.filter(
        d => d.severity === DiagnosticSeverity.Error || isDowngradedSyntaxWarning(d)
    );
}
```

Rule 1 filters **only** by `data.code`; a VAL-03 diagnostic that does not set `data.code =
DocumentValidator.LinkingError` (it should not — it is a real validation finding, not a linking
failure) is structurally untouched by Rule 1 regardless of whether parse errors exist elsewhere in the
file. Rule 2 keeps every `severity === Error` diagnostic unconditionally; a VAL-03 Error is kept
regardless of what else is present. **This is proven from source, independent of any specific
repro input** — no live "does it survive" test was needed to establish this guarantee, only to
confirm the check *fires* in the first place (see below).

**CONTEXT.md's own suggested `x = (1` parse-error fixture does not demonstrate "survives alongside a
parse error" as intended — flag this for the plan.** Empirically this session, every variant tried
(`x = (1` before the VAL-03 repro, after it, in a wholly separate method of a separate class, with a
blank-line separator) produced **exactly one diagnostic**: the parse error itself
(`"Expecting end of file but found `=`."`), with **zero** other diagnostics — including the linking
Warning that should otherwise exist for `s!.anyInvalidMethod()`. This is not a hierarchy-suppression
effect (`parserErrors > 0` alone does not remove a plain Error) — it is that Chevrotain's recovery for
an unclosed `(` in this grammar consumes the remainder of the token stream, so the neighboring
statement's AST/CST is never produced at all, and nothing downstream (linking, validation) ever runs
on it. Several other genuine-parser-error shapes tried (`dim x(5` missing close paren, a malformed
`OPEN` option string) showed the identical single-diagnostic collapse. **A clean test of "an Error
survives alongside a genuine parser error" could not be constructed this session** with a real
Chevrotain parser error in this grammar — every one tried swallowed the rest of the file's
diagnostics. **Recommend testing "survives Rule 2" (any Error present) instead**, using a construct
that produces an Error-severity diagnostic **without** a genuine parser error — confirmed empirically
this session: `1 2 3\n` (two statements with no separator) produces three Error-severity
`bbj-line-break`-coded diagnostics with `parserErrors === 0`, and a `goto nosuchlabel` line ahead of
the VAL-03 repro produces an unresolved-label linking Warning with `parserErrors === 0` **and leaves
the target statement's own diagnostics completely intact** (both diagnostics present, unsuppressed) —
confirming the AST-reachability side of the claim (the target statement is fully validated) separately
from the hierarchy-survival side (proven from source above). If the plan specifically wants a genuine
Chevrotain parser-error co-existence test, budget time to find a **local** recovery shape (all
attempts this session for this grammar swallowed the whole file); until one is found, test "survives
alongside another Error" and "the check still fires when linking already flagged the same reference"
as two separate, both-achievable claims.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting a resolved-vs-stub Java class | A new "is this class real" heuristic (e.g. checking `methods.length > 0`) | `!javaClass.error` | `error` is the backend's own authoritative marker for every failure/stub/partial path (`createStubClass`, depth-limit backstop, cancelled resolution) — an empty `methods` array is also legitimately possible for a real, fully-resolved interface with no members, so length-based heuristics would misclassify |
| Java member inheritance | A superclass-walking loop over `JavaClass.extends`/a synthesized parent chain | A flat `.some()` scan over `receiverType.methods`/`.fields` | The bbj-ls backend already flattens all public inherited members via `Class.getFields()`/`getMethods()` reflection semantics; `JavaClass` carries no superclass link at all (confirmed: `bbj-scope.ts`'s own comment), so a language-server-side walk would have nothing to walk even if built |
| Case-insensitive Java member matching | A new shared case-insensitive scope/index structure | `member.name.toLowerCase() === queriedName.toLowerCase()` inline in the new check | The existing scope machinery (`StreamScopeWithPredicate`, `createScopeForNodes`) has inconsistent case-sensitivity behavior across code paths (traced this session — not worth reusing for a one-off guard); a direct inline comparison is simpler, correct, and matches BBj's own case-insensitive semantics per `CLAUDE.md` |

**Key insight:** every piece of state VAL-03 needs (resolution status, member lists, inheritance,
static/instance) already exists on the `JavaClass`/`JavaField`/`JavaMethod` AST nodes the backend
populates — this phase is a pure read-only consumer of that state, never a producer, matching the
CONTEXT.md boundary that `bbj-scope.ts`/`bbj-linker.ts`/`java-interop.ts` stay untouched (Phase 109
owns them).

## Common Pitfalls

### Pitfall 1: Treating `x = (1` as a reliable "parse error elsewhere" fixture
**What goes wrong:** A test built around CONTEXT.md's own suggested repro will show only one
diagnostic (the parse error) and nothing else — looking like the new Error was *suppressed*, when in
fact the neighboring statement's AST was never produced at all.
**Why it happens:** Chevrotain's recovery for an unclosed `(` in this grammar consumes tokens through
EOF looking for a matching close, discarding everything after.
**How to avoid:** Use a construct that produces `parserErrors === 0` but an Error-severity diagnostic
(e.g. two statements with no separator, `1 2 3\n`) to test Rule 2 survival, and a genuinely unresolved
reference (e.g. `goto nosuchlabel`) to confirm the target statement's own diagnostics stay intact when
something else in the file is already flagged.
**Warning signs:** A test asserting "N diagnostics present" that only ever sees 1 diagnostic no matter
what the new check does — the check was never reached, not merely suppressed.

### Pitfall 2: Assuming `BBjAPI()` resolves to the fake JavaClass in `createBBjTestServices`
**What goes wrong:** A guard-case unit test built around `BBjAPI().anyInvalidMethod()` (or
`api! = BBjAPI(); api!.anyInvalidMethod()`) will find `typeInferer.getType(receiver)` returns
`undefined` in the standard test double, not the pre-registered fake `JavaClass` — the "fully
resolved JavaClass" guard branch never fires, and the test either fails or (worse) silently
under-tests the intended path.
**Why it happens:** `bbj-api.bbl`'s `library` + `class ... classend` text also registers a same-named
`LibFunction` scope entry, which the type inferer has no case for, and which wins in this specific
test-double wiring ahead of the indexed `JavaClass`.
**How to avoid:** Use `declare java.lang.String s!` then `s!.anyInvalidMethod()` (or the fake
`java.util.HashMap`) as the positive "fully resolved JavaClass" guard-case fixture instead.
**Warning signs:** `receiverType?.$type === undefined` in a debug probe where a `JavaClass` was
expected.

### Pitfall 3: Re-guarding `bbj-scope-local.ts:236-251` unnecessarily believing it's the VAL-02 crash site
**What goes wrong:** Time spent adding a guard to the assignment branch (which already safely skips
via `!node.instanceAccess`) instead of the actual uncaught crash site at line 295.
**Why it happens:** Both branches read `.symbol.$refText`-shaped expressions and the todo's own
language ("the same unguarded read") could be read as pointing at either.
**How to avoid:** The AST evidence is unambiguous — for the `## = 1` / `ENTER ##` shape, the crash
happens at line 295 inside the `isInputVariable` branch (confirmed with a real stack trace this
session), not line 236-251 (confirmed structurally skipped by the existing `instanceAccess` guard).
Still guard line 295's read per D-07 either way (defense in depth costs one `?.`).

## Code Examples

### Guard pattern for VAL-02 (D-06 style — inline optional chains, no new helper)

```typescript
// Before (throws when expr.symbol is undefined, not merely unresolved):
function getSymbolRefName(expr: AstNode): string | undefined {
    if (isSymbolRef(expr)) {
        return expr.symbol.$refText?.toLowerCase();
    }
    return undefined;
}

// After:
function getSymbolRefName(expr: AstNode): string | undefined {
    if (isSymbolRef(expr)) {
        return expr.symbol?.$refText?.toLowerCase();
    }
    return undefined;
}
```

Apply the identical `?.` insertion at each of the 8 enumerated sites in
`check-variable-scoping.ts`, and at `bbj-scope-local.ts:295`'s `node.symbol.$refText` (guard the whole
`if (isSymbolRef(node))` block's body with `node.symbol &&`, or use `node.symbol?.$refText` plus a
`scopes.getStream(...)` guard — since `inputName` is used both to search the existing scope and as the
new description's `name`, an early `if (!node.symbol) return;`-shaped skip inside the branch is
cleanest and matches D-07's "skipped silently as nothing to record" contract).

### VAL-03 skeleton (illustrative — exact registration site and message wording are Claude's
Discretion per CONTEXT.md)

```typescript
// Illustrative only — every value here is derived from the VERIFIED facts quoted above in this
// document (JavaClass.error, isJavaClass, member.isStatic, the 'class' literal, the template-string
// array check) and from checkMemberCallUsingAccessLevels's existing registration pattern
// (bbj-validator.ts:195-273, read this session).
checkUnknownJavaMember(memberCall: MemberCall, accept: ValidationAcceptor): void {
    if (!memberCall.member || memberCall.member.ref !== undefined) return; // already resolved, or broken syntax
    const memberName = memberCall.member.$refText;
    if (memberName.toLowerCase() === 'class') return; // implicit .class, always exempt

    const receiver = memberCall.receiver;
    if (isSymbolRef(receiver) && isArrayDecl(receiver.symbol?.ref) && isTemplateStringArray(receiver.symbol.ref)) return;

    const receiverType = this.typeInferer.getType(receiver);
    if (!receiverType || !isJavaClass(receiverType) || receiverType.error) return; // not a fully resolved JavaClass

    let isClassRef = false;
    if (isSymbolRef(receiver)) {
        try { isClassRef = isJavaClass(receiver.symbol?.ref); } catch { /* cyclic, ignore */ }
    }
    const lower = memberName.toLowerCase();
    const methodMatch = receiverType.methods.some(m => m.name.toLowerCase() === lower && (!isClassRef || m.isStatic));
    const fieldMatch = receiverType.fields.some(f => f.name.toLowerCase() === lower && (!isClassRef || f.isStatic));
    if (methodMatch || fieldMatch) return;

    const kind = isMethodCall(memberCall.$container) && memberCall.$container.method === memberCall ? 'Method' : 'Field';
    accept('error', `${kind} '${memberName}' is not defined on ${receiverType.name}`, {
        node: memberCall, property: 'member'
    });
}
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The exact site and phrasing for suppressing the duplicate linking Warning (post-processing filter matched by CST range, inside `BBjDocumentValidator`) is the *recommended* design, not a verified-required one — CONTEXT.md leaves "how the duplicate linking warning is suppressed" to Claude's Discretion | Pattern 5 | An alternative design (e.g. a shared detection function called from both the new check and `processLinkingErrors`) is also viable and may be simpler depending on how the executor structures the new check; low risk either way since both are internally consistent with the existing code |
| A2 | The blank-message A2 group's root mechanism (a zero-width `getCstNodes` boolean-mask capture) is a plausible but **unconfirmed** hypothesis — no synthetic input reproduced it this session | Pattern 2 | If wrong, the next investigator wastes time chasing the boolean-mask theory instead of the real cause; flagged explicitly as LOW confidence and requiring harness-backed investigation, not asserted as fact anywhere else in this document |
| A3 | `## = 1`'s specific two-sigil shape is the only shape needing a D-08 regression test — other malformed-instance-access shapes (e.g. via `DREAD`/`READ`/`ENTER`) were not exhaustively tried against `bbj-scope-local.ts:236-251`'s guard | Pattern 3 | Low risk — D-07/D-08 only require *a* representative regression, and `## = 1` plus `ENTER ##` between them already exercise both confirmed crash sites |

**All other claims in this research were verified this session by reading source files and/or running
throwaway probes; the table above is the complete list of claims resting on reasoning rather than
direct confirmation.**

## Open Questions

1. **What actually causes the blank-message A2 group?**
   - What we know: 6 current occurrences (as of the 2026-09-23 local harness run), all a bare
     multi-line `IF...THEN` header with nothing else on its line, confirmed clean parses
     (`parserErrors === 0`), message text genuinely empty (not a display artifact — confirmed by
     reading `details.json`'s raw `message` field, 45 characters exactly).
   - What's unclear: which validator config path produces a zero-width CST capture for this shape;
     six plausible synthetic reproductions this session all failed to trigger it.
   - Recommendation: budget explicit harness-backed investigation time in the plan (per D-03's own
     framing) — read the actual flagged files' surrounding lines locally (never quoted into any
     repository artifact), and instrument `checkLineBreaks` with a temporary debug probe to catch
     which `LineBreakConfig` entry and which CST node produces the empty range.

2. **Exact current re-flagged file count for the D-03 gate.**
   - What we know: the todo (2026-09-21) recorded 4 blank-message + 1 "else" = 5; the live harness
     (2026-09-23) shows 6 blank-message + 1 "else" = 7.
   - What's unclear: whether this drift is corpus churn, a prior partial fix, or measurement noise.
   - Recommendation: re-run the harness at the start of Phase 107 execution (before any code change)
     to get a fresh, authoritative baseline snapshot, per D-13's own instruction to snapshot before
     each run.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `bbj-corpus` conformance harness | VAL-01/VAL-03 D-03/D-12 gate | ✓ | local checkout, run dated 2026-09-23 [VERIFIED: read this session] | — |
| BBjServices `:5008` endpoint (live compiler verdict) | Optional `--endpoint` flag for the harness | Unconfirmed this session (not probed) | — | Harness runs Langium-only without `--endpoint`; the phase's success criteria only require the Langium-side A2/B gates, not the endpoint-reconciled ones |
| Node.js / npm / vitest | All test execution | ✓ | vitest ^4.1.10 [VERIFIED: package.json] | — |

**Missing dependencies with no fallback:** none identified.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.10 [VERIFIED: bbj-vscode/package.json] |
| Config file | `bbj-vscode/vitest.config.ts` (existing, unmodified by this phase) |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run <file>` |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm test` (`vitest run`) |

**Known contention pitfall (confirmed this session):** running `variable-scoping.test.ts` alongside
other suites in one invocation can hit a `beforeAll` hook timeout (`"Hook timed out in 10000ms"`) from
worker contention, not a real failure — per the project's own standing MEMORY note. Confirmed this
session: `variable-scoping.test.ts` run **alone** passes cleanly (37/37). Run VAL-02's file separately
or with `--maxWorkers=2` if running alongside other suites in the same invocation.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VAL-01 | Nested one-liner with inner ELSE+FI stays clean; three "still flagged" cases stay flagged | unit | `npx vitest run test/line-break-single-line-if.test.ts test/line-break-walk-termination.test.ts` | ✅ (extend existing describe blocks) |
| VAL-01 | Conformance re-flagged files no longer carry the line-break error; A2 ≤ 22; no new B | manual/harness | `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server` | ✅ harness exists locally |
| VAL-02 | `## = 1` produces no "An error occurred during validation" diagnostic; a use-before-assignment hint elsewhere in the same file still fires; scope computation does not throw | unit | `npx vitest run test/variable-scoping.test.ts` | ✅ (extend existing `describe('Variable Scoping', ...)`) |
| VAL-03 | `BBjAPI().anyInvalidMethod()` and other fully-resolved-JavaClass unknown members become one Error; every guard case stays a Warning | unit | `npx vitest run test/<new-file-or-existing bbj-validator tests>` | ❌ Wave 0 — new test file/describe block needed |
| VAL-03 | A local conformance run shows no new Error on a member that exists | manual/harness | same harness command as VAL-01 | ✅ harness exists locally |

### Sampling Rate
- **Per task commit:** the specific test file(s) touched by that task (e.g.
  `npx vitest run test/line-break-single-line-if.test.ts`).
- **Per wave merge:** `npm test` (whole suite) from `bbj-vscode/`, judged on `numFailedTests: 0` per
  the project's standing v4.1 gate substitution (a failing-suite identity delta is not the gate; a
  `beforeAll` contention timeout with `numFailedTests: 0` is not a regression — see the pitfall above).
- **Phase gate:** whole suite green (`numFailedTests: 0`) AND the conformance harness pass (D-03/D-12)
  before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] A new test file (or a new `describe` block in an existing one, e.g. inside `bbj-validator`-adjacent
  tests) covering VAL-03's guard-case matrix (D-12): interop down, synthetic BBjAPI receiver
  (`declare java.lang.String s!` is the reliable positive case — see Pitfall 2, do **not** use bare
  `BBjAPI()`), BBj class receiver, static vs instance, inherited method (`HashMap.getClass`), `.class`,
  template-string field, case-insensitive match, and the duplicate-warning-suppression assertion.
- [ ] No new shared fixtures needed — `createBBjTestServices`'s existing fake classes
  (`bbj-test-module.ts`) already cover every guard case named in D-12 except the "cold/partial class"
  case, which is already reachable via `resolveClassByName` on any name not pre-registered (returns
  `stubClass()` with `error: 'not resolved (test double)'` — [VERIFIED:
  `bbj-vscode/test/bbj-test-module.ts:172-189`]).
- [ ] Framework install: none — vitest is already configured and in use.

## Security Domain

`security_enforcement` is absent from `.planning/config.json`, so treated as enabled per the default.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Language server has no auth boundary — LSP over stdio/socket to a locally-running IDE |
| V3 Session Management | No | N/A |
| V4 Access Control | No | N/A (VAL-03's own BBj-class visibility check, `checkMemberCallUsingAccessLevels`, is a *language semantics* feature, not an application access-control boundary) |
| V5 Input Validation | Partial | The BBj source text being validated **is** untrusted input to the language server's own parsing/validation pipeline; VAL-02 is precisely a robustness fix for a malformed-input crash (an uncaught exception silently disabling a whole validation check for a file) — the standard control here is defensive guarding of every optional-reference read reachable from untrusted syntax, which is exactly this phase's VAL-02 fix |
| V6 Cryptography | No | N/A |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed source text crashes a validation/scope-computation pass, silently disabling diagnostics for the rest of a file (VAL-02) | Denial of Service (of the language-server's own diagnostic feature, not the process) | Defensive optional-chaining at every `.symbol`-shaped read reachable from a not-yet-linked cross-reference; this phase's D-05/D-06/D-07 are exactly this mitigation, applied narrowly and idiomatically rather than via a broad try/catch that would hide future real bugs |
| A false Error-severity diagnostic from an overly aggressive new check (VAL-03) misleads a developer into "fixing" correct code | Tampering (of developer trust in the tool, not of data) | D-10/D-11's conservative guard list (fully-resolved-only, no downgrade setting) and D-12's harness-reviewed rollout are the standard mitigation already designed into this phase; no additional control needed |

## Sources

### Primary (HIGH confidence — read directly this session)
- `bbj-vscode/src/language/validations/line-break-validation.ts` — full file, VAL-01 mechanism
- `bbj-vscode/src/language/validations/check-variable-scoping.ts` — full file, VAL-02 mechanism
- `bbj-vscode/src/language/bbj-scope-local.ts` — full file, VAL-02 second crash site
- `bbj-vscode/src/language/bbj-scope.ts` — full file, VAL-03 static-only/class-ref pattern
- `bbj-vscode/src/language/bbj-linker.ts` — lines 1-180, VAL-03 BBjAPI priority + template-string skip
- `bbj-vscode/src/language/bbj-validator.ts` — full file, VAL-03 registration pattern
- `bbj-vscode/src/language/bbj-document-validator.ts` — full file, VAL-03 hierarchy survival
- `bbj-vscode/src/language/bbj-type-inferer.ts` — full file, VAL-03 receiver type inference
- `bbj-vscode/src/language/java-interop.ts` (partial: `getResolvedClass`, `resolveClassByName`,
  `createStubClass`) — VAL-03 "fully resolved" discriminator
- `bbj-vscode/src/language/generated/ast.ts` (JavaClass/JavaField/JavaMethod/MemberCall/MethodCall
  interfaces) — VAL-03 exact field shapes
- `bbj-vscode/src/language/lib/bbj-api.ts` — VAL-03 synthetic fallback source text
- `bbj-vscode/test/bbj-test-module.ts` — full file, VAL-03 test-double fixtures
- `bbj-vscode/test/line-break-single-line-if.test.ts`, `test/line-break-walk-termination.test.ts`,
  `test/variable-scoping.test.ts` — VAL-01/VAL-02 existing regression suites
- `bbj-vscode/node_modules/langium/lib/validation/document-validator.js` — Langium's own
  `validateDocument` ordering
- `bbj-vscode/node_modules/langium/lib/references/scope-provider.js` — `createScopeForNodes` case
  sensitivity
- `/home/coder/repos/bbj-corpus/conformance/run.mjs`, `/home/coder/repos/bbj-corpus/conformance/details.json`
  — harness invocation, grouping logic, current live A2 counts (message strings/counts only, per D-13)
- `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java` (lines 402-440) — confirms
  inherited-member flattening via Java reflection, separate sibling repository
- `.planning/milestones/v4.5-phases/98-line-break-validation-false-alarms-a2/98-REVIEW.md` — WR-A
  finding and its exact prescribed fix
- `.planning/todos/pending/2026-09-23-use-before-assignment-check-throws-on-a-reference-without-a-symbol.md`
  — VAL-02 investigation, `## = 1` repro origin
- `.planning/todos/pending/2026-09-24-flag-unknown-method-on-java-object-as-error.md` — VAL-03 origin
  todo, evidence and proposed approach
- This session's own throwaway vitest probes (all created, run, and deleted within this session; none
  committed — confirmed via `git status --porcelain` after each deletion)

### Secondary (MEDIUM confidence)
- `.planning/todos/pending/2026-09-21-loosen-single-line-if-balance-rule-a2-residue.md` — VAL-01
  background, superseded numerically by this session's live harness re-measurement
- `bbj-vscode/test/test-data/conformance/README.md` — harness invocation, cross-checked against
  `98-CONFORMANCE.md`'s identical command

### Tertiary (LOW confidence)
- The zero-width-CST-capture hypothesis for the blank-message A2 group (Pattern 2) — reasoning-only,
  not empirically confirmed; explicitly flagged as such throughout this document

## Metadata

**Confidence breakdown:**
- VAL-01 fix mechanism: HIGH — exact fix already specified and test-verified in a prior session;
  independently re-confirmed empirically this session against the current (still-unfixed) tree
- VAL-01 blank-message residue: LOW — mechanism not found this session despite several attempts;
  explicitly flagged as an open item for the plan
- VAL-02: HIGH — both crash sites reproduced with real stack traces this session; full guard-site
  enumeration read directly from the current file
- VAL-03: HIGH for the detection/guard design (every building block read directly from source, several
  cross-checked with live probes); MEDIUM for the exact hierarchy-suppression implementation site
  (left to Claude's Discretion, one concrete recommended design given)

**Research date:** 2026-09-24
**Valid until:** 30 days (stable internal logic; the conformance corpus counts (A2=22, blank=6,
else=1) should be re-verified at execution time regardless, per D-13's own snapshot-before-each-run
instruction — corpus/harness state is the fastest-moving part of this research)
