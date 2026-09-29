---
phase: 111-java-class-data-from-the-interop-peer
plan: 03
subsystem: api
tags: [langium, hover, completion, markdown, security, vitest]

# Dependency graph
requires:
  - phase: 111-java-class-data-from-the-interop-peer
    provides: "111-01's java-peer-guard.ts module (this plan extends it with escapeMarkdown/toFenceSafeLine, no other 111-01 export consumed)"
provides:
  - "escapeMarkdown/toFenceSafeLine in java-peer-guard.ts — the single shared Markdown-escape/fence-safety helpers"
  - "bbj-hover.ts: Java hover contents escaped at the branch's return (stored docu and javadoc-file fallback alike); the fallback is bounded to MAX_JAVADOC_LENGTH before it is rendered"
  - "bbj-completion-provider.ts: Java completion documentation escaped; fenced signature made fence-safe; documentationHeader() fallback escaped only for a Java node"
affects: [111-04, 111-05]

# Actuals (#2632)
actuals:
  tokens: 6863
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Render-boundary escaping: escapeMarkdown/toFenceSafeLine are called only where hover and completion build the Markdown string they return, never where the data is stored"
    - "RegExp built via the constructor (new RegExp('...', 'g')) rather than a regex literal when the pattern embeds \\u2028/\\u2029 escapes, to keep the escape sequences as unambiguous source text"

key-files:
  created:
    - bbj-vscode/test/javadoc-markdown-escape.test.ts
  modified:
    - bbj-vscode/src/language/java-peer-guard.ts
    - bbj-vscode/src/language/bbj-hover.ts
    - bbj-vscode/src/language/bbj-completion-provider.ts

key-decisions:
  - "D-06/D-07/D-08 implemented as designed: escapeMarkdown backslash-escapes backslash, backtick, [, ], (, ) and ! in one pass, deliberately leaving the less-than sign unescaped per the user's 2026-09-26 amendment; escaping happens once, at hover's and completion's render boundary, never at storage; the fenced completion signature is made fence-safe (backticks removed, line breaks become spaces) instead of backslash-escaped"
  - "documentationHeader()'s completion fallback is escaped only when isDocumented(node) is true — that predicate is exactly 'a Java node' in this codebase (only JavaClass/JavaField/JavaMethod implement Documented), so it doubles as the Java-vs-BBj/lib discriminator D-07 calls for with no extra type check needed"
  - "hasInterpretableLinkOrImage (the test helper) is scoped to the javadoc part of a fenced completion item, not the whole documentation value: D-08 deliberately leaves the fenced java signature unescaped, and a Markdown renderer does not interpret link/image syntax inside a fenced code block, so a raw bracket there is not the security property under test"

patterns-established:
  - "Markdown escape/fence-safety live in java-peer-guard.ts alongside 111-01's peer-DTO bounds — one shared module, one place any future render site imports from"

requirements-completed: [SEC-04]

coverage:
  - id: D1
    description: "java-peer-guard.ts exports escapeMarkdown and toFenceSafeLine; hover and completion import them and carry no second copy"
    requirement: SEC-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/javadoc-markdown-escape.test.ts#escapeMarkdown"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/javadoc-markdown-escape.test.ts#toFenceSafeLine"
        status: pass
    human_judgment: false
  - id: D2
    description: "Escaping happens once, at the render boundary: hover and completion escape Java documentation as they build Markdown; node.docu keeps the bounded but unescaped text"
    requirement: SEC-04
    verification:
      - kind: integration
        ref: "bbj-vscode/test/javadoc-markdown-escape.test.ts#a link or image in a Java method javadoc shows literally in hover, and the stored docu stays unescaped"
        status: pass
    human_judgment: false
  - id: D3
    description: "escapeMarkdown escapes backslash, backtick, [, ], (, ) and ! but deliberately leaves the less-than sign (and HTML tags) unchanged"
    requirement: SEC-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/javadoc-markdown-escape.test.ts#the less-than sign and HTML tags pass through unchanged"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every Java string reaching hover contents or completion documentation is escaped: the stored node.docu.javadoc, the javadoc-file fallback, the bold signature header, and documentationHeader() for Java nodes"
    requirement: SEC-04
    verification:
      - kind: integration
        ref: "bbj-vscode/test/javadoc-markdown-escape.test.ts#a Java header built from an unusable field type renders escaped, with no interpretable link"
        status: pass
      - kind: integration
        ref: "bbj-vscode/test/javadoc-markdown-escape.test.ts#with docu unset, the documentationHeader fallback is escaped too"
        status: pass
    human_judgment: false
  - id: D5
    description: "BBj-authored documentation (/** */ comments on BBj classes/members) is not escaped, in both hover and completion"
    requirement: SEC-04
    verification:
      - kind: integration
        ref: "bbj-vscode/test/javadoc-markdown-escape.test.ts#a documented BBj class member keeps its REM /** */ link unescaped"
        status: pass
      - kind: integration
        ref: "bbj-vscode/test/javadoc-markdown-escape.test.ts#a BBj class method keeps its REM /** */ link unescaped in completion documentation"
        status: pass
    human_judgment: false
  - id: D6
    description: "The fenced java signature in completion cannot break out of its fence: backticks removed, line breaks become spaces, no backslash-escaping inside the fence"
    requirement: SEC-04
    verification:
      - kind: integration
        ref: "bbj-vscode/test/javadoc-markdown-escape.test.ts#a Java method's completion documentation is escaped and its fenced signature cannot break out"
        status: pass
    human_judgment: false
  - id: D7
    description: "Hover's javadoc-file fallback is bounded at MAX_JAVADOC_LENGTH with the visible truncation marker before it is rendered"
    requirement: SEC-04
    verification:
      - kind: integration
        ref: "bbj-vscode/test/javadoc-markdown-escape.test.ts#an oversized javadoc-file fallback is bounded before it is rendered, and still ends up escaped"
        status: pass
    human_judgment: false
  - id: D8
    description: "In a real running VS Code and IntelliJ, no stray link or image renders from Java hover/completion, javadoc HTML tags render or are stripped as before, and IntelliJ does not load a remote image from an HTML img tag"
    verification: []
    human_judgment: true
    rationale: "Requires a live VS Code/IntelliJ session per the plan's own <verification> Manual/UAT line; consolidated at end-of-phase UAT per workflow.human_verify_mode (default end-of-phase), not executed by this non-interactive plan run."

duration: 20min
completed: 2026-09-26
status: complete
---

# Phase 111 Plan 03: Java Documentation Renders Literally in Hover and Completion Summary

**`escapeMarkdown`/`toFenceSafeLine` in the shared `java-peer-guard.ts` module, applied once at hover's and completion's render boundary, neutralize Markdown link/image syntax and fenced-code break-out in Java-supplied documentation while leaving BBj-authored docs and javadoc HTML tags untouched (issue #524).**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-26T17:06:22Z (approx, right after 111-02's docs commit)
- **Completed:** 2026-09-26T17:26:27Z
- **Tasks:** 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- `escapeMarkdown(text)` in `java-peer-guard.ts` backslash-escapes exactly the backslash itself, backtick, `[`, `]`, `(`, `)` and `!` in a single left-to-right regex pass, so a peer-supplied backslash cannot undo a later escape and a `[x](y)`/`![x](y)` sequence cannot render as a clickable link or a remote image. The less-than sign is deliberately left out (the user's 2026-09-26 amendment of D-06), so javadoc HTML tags stay readable.
- `bbj-hover.ts`'s Java branch (`isDocumented(node) && isNamedElement(node)`) escapes the signature and javadoc exactly once, at its `return this.createMarkdownContent(...)` call — covering both the stored `node.docu` and the javadoc-file fallback built above it, including a `documentationHeader()` signature for a Java node with no `docu`. The BBj branch, the lib-member branch, and `createMarkdownContent`/`tryParseJavaDoc` themselves are unchanged, so BBj-authored `/** */` documentation stays Markdown as before.
- The javadoc-file fallback (`javadocProvider.getDocumentation()` → `tryParseJavaDoc`) is now bounded with `truncateText(..., MAX_JAVADOC_LENGTH)` before it ever reaches the render boundary, closing the one hover path 111-01's peer-DTO bounds did not already cover (an installed javadoc file, not a live peer response).
- `toFenceSafeLine(text)` removes every backtick and turns every line-break form (CRLF, lone LF, lone CR, U+2028, U+2029) into a single space, so a peer-supplied signature can never close or otherwise break the fenced ` ```java ` block completion renders it in.
- `bbj-completion-provider.ts`'s `createReferenceCompletionItem` applies `toFenceSafeLine` to the fenced signature (no backslash-escaping inside the fence, per D-08) and `escapeMarkdown` to the javadoc part; the `documentationHeader()` fallback is escaped only when `isDocumented(node)` holds — which in this codebase is exactly "a Java node" (only `JavaClass`/`JavaField`/`JavaMethod` implement `Documented`), so BBj and lib nodes keep today's unescaped value with no extra type check.
- `test/javadoc-markdown-escape.test.ts` (new) covers: the escape/fence-safety character tables including the empty-string and non-ASCII/marker edge cases; hover's stored-docu path, javadoc-file fallback (bounded and escaped), and Java-header fallback; completion's javadoc escaping and fence break-out prevention; and, for both hover and completion, that BBj-authored `REM /** */` documentation keeps its link syntax unescaped.

## Task Commits

Each task was committed atomically:

1. **Task 1: A link or image in a Java method's javadoc shows literally in hover, end to end** - `ca32c93b` (feat)
2. **Task 2: Hover's javadoc-file fallback is bounded and escaped, Java headers are escaped, and BBj-authored documentation is untouched** - `a8bd150e` (feat)
3. **Task 3: Completion documentation for a Java method is escaped and its fenced signature cannot break out** - `91f44bc8` (feat)

**Plan metadata:** (this commit) `docs(111-03): complete Java documentation renders literally in hover and completion plan`

_Task 1 is a `type="tracer"` task: executed and committed exactly like `type="auto"`, then the tracer feedback gate re-ran its `<verify>` end to end (auto mode active) before Tasks 2/3 began — it passed, so expansion proceeded with no checkpoint. Tasks 2 and 3 carried `tdd="true"`; both were written and run together (behavior rows plus implementation) per the plan's own `<action>` wording, and both were green before their single commit._

## Files Created/Modified
- `bbj-vscode/src/language/java-peer-guard.ts` — adds `escapeMarkdown` and `toFenceSafeLine`, plus their backing regex patterns and module-header note
- `bbj-vscode/src/language/bbj-hover.ts` — imports `escapeMarkdown`/`truncateText`/`MAX_JAVADOC_LENGTH`; escapes the Java branch's return; bounds the javadoc-file fallback
- `bbj-vscode/src/language/bbj-completion-provider.ts` — imports `escapeMarkdown`/`toFenceSafeLine`; applies them to the fenced signature, the javadoc part, and the Java-node `documentationHeader()` fallback
- `bbj-vscode/test/javadoc-markdown-escape.test.ts` — new: escape/fence character-table tests, hover end-to-end cases (stored docu, bounded fallback, Java header, BBj REM comment), completion end-to-end cases (escaped javadoc with intact fence, documentationHeader fallback, BBj REM comment)

## Decisions Made
- Followed D-06/D-07/D-08 exactly as locked (with the user's 2026-09-26 amendment that `<` is not escaped): one shared escape function, applied once at the render boundary in both files, never at storage; the fenced signature is made fence-safe rather than backslash-escaped.
- Used `isDocumented(node)` as the Java-vs-BBj/lib discriminator for completion's `documentationHeader()` fallback escape, since it is structurally equivalent to "is a Java node" in this codebase — no separate `isJavaClass || isJavaField || isJavaMethod` check needed.
- Scoped the completion test's "no interpretable link/image" assertion to the javadoc part only, not the whole documentation value: the fenced java signature is intentionally left with raw, unescaped brackets/parens (D-08), and a fenced code block is not Markdown-interpreted by a renderer, so a raw bracket there is not the property the test needs to prove.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Corrupted regex literal caught before commit.** While authoring `toFenceSafeLine`'s line-break pattern, the Unicode line- and paragraph-separator escape sequences ended up in the source as the actual invisible characters instead of their backslash-prefixed source text -- a raw line/paragraph separator inside a regex *literal* is a syntax error (`Unterminated regular expression`), which surfaced immediately as a transform failure when Task 3's test suite ran. Fixed by building the pattern with the `RegExp` constructor from a plain string (immune to the same corruption) and replacing the equivalent raw characters in the test file's line-break assertions with their escape-sequence source text. Re-scanned every changed file for stray invisible separators afterward -- none remained. No buggy version of this code was ever committed.
- **Test assertion too strict, corrected before commit.** The first version of Task 3's fenced-signature test asserted "no interpretable link/image" across the *entire* completion documentation value, which fails by design once the fenced signature legitimately contains raw link syntax (D-08 leaves the fence unescaped). Narrowed the assertion to the javadoc part only, matching the task's own behavior spec; re-run confirmed green.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `escapeMarkdown`/`toFenceSafeLine` are available in `java-peer-guard.ts` for 111-04 and 111-05 to import if needed, alongside 111-01's peer-DTO bounds; neither is expected to need them directly (per the phase's own artifact list).
- SEC-04 (#524) is code-complete; the plan's own manual UAT line (build both extensions, confirm IntelliJ does not load a remote image from an HTML `img` tag) is deferred to end-of-phase UAT per `workflow.human_verify_mode`, not executed by this run.
- Whole-suite run after this plan: 11 failed tests, all `test/linking.test.ts > Interop related tests` (BBjServices reachable on `:5008` during this session) — the repository's own documented local drift, zero failures attributable to this plan's changes across `javadoc-markdown-escape.test.ts`, `hover.test.ts`, `completion-test.test.ts`, `completion-class-reference.test.ts`, `completion-method-body.test.ts` and `java-interop-peer-guard.test.ts` (all green in isolated targeted runs).
- No blockers for 111-04.

---
*Phase: 111-java-class-data-from-the-interop-peer*
*Completed: 2026-09-26*

## Self-Check: PASSED

- `bbj-vscode/src/language/java-peer-guard.ts` — FOUND
- `bbj-vscode/src/language/bbj-hover.ts` — FOUND
- `bbj-vscode/src/language/bbj-completion-provider.ts` — FOUND
- `bbj-vscode/test/javadoc-markdown-escape.test.ts` — FOUND
- `.planning/phases/111-java-class-data-from-the-interop-peer/111-03-SUMMARY.md` — FOUND
- Commit `ca32c93b` — FOUND
- Commit `a8bd150e` — FOUND
- Commit `91f44bc8` — FOUND
- All acceptance-criteria greps (Tasks 1-3) re-run against final `HEAD` — all match expected counts
- `npx tsc -p tsconfig.json` — clean
- `npx vitest run test/javadoc-markdown-escape.test.ts test/hover.test.ts test/completion-test.test.ts test/completion-class-reference.test.ts test/completion-method-body.test.ts test/java-interop-peer-guard.test.ts --maxWorkers=2` — 135 passed, 11 skipped
- Whole-suite `npx vitest run --maxWorkers=2` — 11 failed tests, all pre-existing `test/linking.test.ts` interop drift; 0 failures attributable to this plan
- No planning identifiers in the final source/test diff (`git diff --cached` re-checked after each fix)
