# Phase 111: Java Class Data from the Interop Peer - Context

**Gathered:** 2026-09-26 (auto mode — every choice is the recommended default, see 111-DISCUSSION-LOG.md)
**Status:** Ready for planning

<domain>
## Phase Boundary

Java class data from the java-interop peer (`getClassInfo`/`getClassInfos` responses and the javadoc
attached to them) is bounded and type-checked before it is stored on the `JavaClass` AST node. It is
escaped before hover and completion render it as Markdown, and it is validated before a quick fix or
completion inserts it into source text as a `use` line. Two Java-class problems also get fixed. The
"Java class java.io has no container" log line stops because the caller that sends a bare package
name into class resolution is fixed. An unresolved Java member Warning survives an unrelated Error in
the same file, and its message no longer says "NamedElement".

Requirements: SEC-03 (#523), SEC-04 (#524), SEC-05 (#525), FIX-02 (#676), FIX-03 (todo
`2026-09-24-unknown-java-member-linking-warning-extras`, no issue).

Not in scope: changes to the java-interop / bbj-ls Java side, other linking-message wording,
the `JavaInteropService` split (Phase 121), fake-socket tests (Phase 116).

</domain>

<decisions>
## Implementation Decisions

### Shared helper module (SEC-03, SEC-04, SEC-05)
- **D-01:** Add one small plain module under `bbj-vscode/src/language/` with no Langium or editor
  imports, following the pattern of `config-path-resolver.ts` and Phase 110's interop-defaults module.
  It exports the length limits as named constants, the peer-DTO guard (D-02..D-05), the Markdown
  escape (D-06), and the qualified-name check (D-09). This single module is the one the planning note
  refers to ("one shared escape/bound helper can serve SEC-03 and SEC-04"). Each call site imports it,
  and there is no second hand-rolled copy.

### Peer response bounds and types (SEC-03)
- **D-02:** Validate at the entry of `resolveClass()`, before `storeJavaClass()` and before any field
  is copied onto the node. The bulk implicit-import path calls `resolveClass` directly, so a guard in
  `resolveClassByName` alone would miss it. The javadoc that `javadocProvider.getDocumentation()`
  returns is bounded where Phase 2 copies it into `method.docu` (and where hover reads it on its
  fallback path).
- **D-03:** Rules by field kind:
  - Class `name` that is not a string, or is empty or over the identifier limit, means the class is
    not resolved. It becomes the existing uncached stub path (`createStubClass`), and no exception
    escapes.
  - A member (field, method, constructor, parameter) with a non-string `name`/`type`/`returnType`,
    or with one over the identifier limit, is **dropped** from the arrays. The rest of the class
    still resolves.
  - `fields`/`methods`/`constructors`/`parameters` that are not arrays default to `[]` (extends the
    existing P61-D2-003 `??= []` defaulting).
  - Boolean flags (`isDeprecated`, `isStatic`) that are not booleans read as `false`, as today for a
    missing value.
  - Free text (`error`, javadoc `docu`, parameter real names from javadoc) is **truncated** at its
    limit with a visible `…` marker, never rejected.
- **D-04:** Limits are fixed constants, not settings. Starting values: identifiers and type names
  1,024 characters; javadoc text 32,768 characters per member or class; `error` 1,024 characters. The
  researcher checks these against real data (the largest JDK and BBjAPI javadoc the live peer
  returns, e.g. `java.util.HashMap`, `BBjAPI`). A limit that would truncate real documentation is
  raised to clear the largest real value, and the plan records the measured maximum.
- **D-05:** Dropping or truncating logs once per class at `logger.debug` or `logger.warn`, naming the
  class and the field. Never log the rejected value itself, because it may be megabytes.
- **D-05b:** The regression test for criterion 1 feeds an oversized and wrongly typed response
  through `resolveClass()` and asserts what is stored on the node (dropped member absent, truncated
  doc ends with the marker and is at most the limit). Use `createBBjTestServices` /
  `JavaInteropTestService` and `parseHelper`, not `DocumentBuilder.build` (it reaches CPL/interop
  on :5008).

### Markdown escaping in hover and completion (SEC-04)
- **D-06:** Escape at the **render boundary**, once, not at storage. The node keeps bounded but
  unescaped text (D-03), and hover and completion escape it as they build Markdown. That avoids
  double escaping, and any future non-Markdown consumer still gets plain text. The escape
  backslash-escapes at least `[ ] ( ) \` ! ` and the backslash itself (the set in criterion 2 and
  #524, plus `\`, so a peer-supplied `\[` cannot undo it).
  **Amended by the user (2026-09-26, after planning):** `<` is **not** escaped. Most installed javadoc
  contains HTML tags (3,081 of 3,910 documented members), and VS Code already strips raw HTML in hovers
  (`supportHtml` off), so escaping `<` would only show literal tags. Whether IntelliJ/LSP4IJ renders
  raw HTML such as `<img src=…>` is checked in UAT; if it does, revisit.
- **D-07:** What gets escaped: every string that comes from the peer or from Java javadoc and ends up
  in hover `contents` or completion `documentation`. That covers the output of `tryParseJavaDoc`
  (both copies: `bbj-hover.ts` and the one in `java-interop.ts`), `node.docu.javadoc`, the
  bold `__signature__` header in hover, and `documentationHeader()` for Java nodes. Escaping is
  applied to the final Markdown after the JSDoc-to-Markdown conversion. The accepted cost is that
  `{@code …}` spans and `{@link …}` targets in real javadoc show as literal text rather than
  formatted code or links, which is what #524's acceptance criteria asks for. BBj-authored
  documentation (`/** */` comments on BBj classes and methods, `.bbl` lib docs) is **not** escaped:
  it is the user's own or shipped content and is intentionally Markdown.
- **D-08:** Signatures inside a fenced ```` ```java ```` block in completion are not
  backslash-escaped, because backslashes would show literally inside a code fence. Instead,
  backticks and line breaks are stripped or replaced, so the text cannot close the fence. Because
  D-03 already bounds identifier/type strings, this is the only fence-safety measure needed.

### `use` line insertion (SEC-05)
- **D-09:** One predicate `isJavaQualifiedName(fqn)` checks for dot-separated Java identifiers:
  each segment matches Java's identifier rules including `$` and `_` (Unicode letters allowed, per
  JLS), there is no empty segment, and there is no whitespace, `;`, line break or other punctuation.
  Nested-class spellings used by BBj `use` lines (for example `java.util.Map$Entry`) must pass. The
  researcher confirms which nested-class spelling the auto-import candidates actually carry and adds
  it to the test.
- **D-10:** Both `createUseAction` (`bbj-code-action-provider.ts`) and `completeAutoImportClasses`
  (`bbj-completion-provider.ts`) check the fqn before building the `use ${fqn}\n` edit. An invalid
  candidate is **dropped silently** (debug log only): no action, no completion item, and no
  "sanitized" variant. If the dropped candidate was the top-ranked one, the next valid candidate
  becomes `isPreferred`, so the preferred flag is never lost to a dropped entry. The test covers
  `;`, a space, `\n`, and `"Foo\nRUN \"x.bbj\""`, plus a valid name that still gets its `use` line.

### Bare package name reaching `resolveClass` (FIX-02)
- **D-11 (research gate):** The researcher must trace and **reproduce** the caller that asks for
  `java.io` / `java.net` as a class. Lead to check first: BBj's implicit imports include the
  `java.io` and `java.net` packages, so the bulk implicit-import path (which calls `resolveClass`
  directly, see the comment at `resolveClass` top) or `autoImportCandidatePackages` may pass package
  names as class names. Other candidates: a `use java.io` statement and the scope provider's package
  lookup. `extractPackageName("java.io")` returns `"java"`, so `storeJavaClass` tries to make a
  class `io` under `java`, collides with the existing `JavaPackage io`, and leaves `$container`
  unset. That is the mechanism, per `.planning/research/AUDIT-VERIFY-A-SECURITY.md`.
- **D-12:** Fix at the caller: a package name is never sent into the class-shaped resolution path.
  Also, as defence in depth, `storeJavaClass` does not overwrite or mis-store when the leaf name is
  already a `JavaPackage`. The `console.error` stays for any other genuinely unexpected missing
  container. It is not downgraded as the fix, per the roadmap planning note ("stop the bad request,
  not only lower the log level"). A test pins the fixed caller: resolving code that uses `java.io`
  and `java.net` classes produces no "has no container" output (spy on `console.error`).

### Unresolved Java member Warning (FIX-03)
- **D-13:** Mark the diagnostic explicitly. When the linker creates a linking error for a
  `MemberCall` member reference whose receiver's inferred type is a `JavaClass`, it records that in
  the linking error data. This mirrors the existing `instanceMemberAccess` flag on
  `LinkingErrorData`, for example `javaMemberAccess: true` plus the member name and owner simple
  name. Rule 2 in `applyDiagnosticHierarchy` keeps diagnostics with that flag, next to the
  `isDowngradedSyntaxWarning` exemption. The code stays `DocumentValidator.LinkingError`, so Rule 1
  (parse errors suppress all linking errors) is unchanged.
- **D-14:** Only that Java-member linking Warning is exempt from Rule 2. Other linking Warnings
  (unresolved BBj variables, classes, USE targets) still follow Rule 2 as today. Severity stays
  Warning. The VAL-03 Error (Phase 107) is unaffected. If VAL-03 already reports the same member on
  the same range, the linking Warning is not also shown. The researcher checks whether they can
  co-occur today; if they can, dedupe in favour of the VAL-03 Error.
- **D-15:** New wording only for the flagged Java-member case: `'<member>' is not a known method or
  field of <OwnerSimpleName>`, or `Cannot resolve '<member>'` when no owner name is available. The
  existing ` [in <file>:<line>]` suffix from `createLinkingError` is kept. Other linking messages
  keep Langium's wording in this phase, because tests and users may match on it.

### Claude's Discretion
- File name and export names of the shared helper module.
- Exact escape implementation (regex vs. character map), provided D-06's character set is covered.
- Whether the tryParseJavaDoc duplication between `bbj-hover.ts` and `java-interop.ts` is collapsed
  as part of D-07. Only do it if it falls out naturally; it is not required.
- Test file layout (one file per requirement or one per module).

### Folded Todos
- **`2026-09-24-unknown-java-member-linking-warning-extras`** (Exempt unresolved Java member linking
  warnings from hierarchy Rule 2, and reword the "NamedElement" linking message). This is FIX-03
  itself. Decisions D-13..D-15 implement both of its options. D-11 of Phase 107 (a setting to
  downgrade VAL-03) stays unbuilt, as the todo says. Close the todo at phase end.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and scope
- `.planning/ROADMAP.md` §"Phase 111" — goal, 5 success criteria, planning notes
- `.planning/REQUIREMENTS.md` — SEC-03, SEC-04, SEC-05, FIX-02, FIX-03
- GitHub issues #523, #524, #525 (acceptance criteria per issue), #676 (log excerpt). Read with
  `gh issue view N -R BBx-Kitchen/bbj-language-server`
- `.planning/todos/pending/2026-09-24-unknown-java-member-linking-warning-extras.md` — FIX-03 source

### Prior research and decisions
- `.planning/research/AUDIT-VERIFY-A-SECURITY.md` §"#676 / #698" — mechanism of the "has no container" line
- `.planning/milestones/v4.6-phases/107-validation-false-alarms-silent-skips/107-CONTEXT.md` — VAL-03 D-10/D-11, the conservative member check FIX-03 sits beside
- `.planning/phases/110-workspace-settings-filesystem-trust/110-CONTEXT.md` — D-01 plain-module pattern reused by D-01 here

### Code
- `bbj-vscode/src/language/java-interop.ts` — `resolveClass()` (~l.1136), `storeJavaClass()` (~l.1322), `createStubClass()`, `extractPackageName()` (~l.1524), bulk implicit-import path (~l.764), `tryParseJavaDoc` use in Phase 2
- `bbj-vscode/src/language/bbj-hover.ts` — `getAstNodeHoverContent`, `createMarkdownContent`, `tryParseJavaDoc`, `documentationHeader`
- `bbj-vscode/src/language/bbj-completion-provider.ts` — `completeAutoImportClasses` (~l.141), `createReferenceCompletionItem` (~l.771)
- `bbj-vscode/src/language/bbj-code-action-provider.ts` — `createUseAction` (~l.82), preferred-candidate selection (~l.45)
- `bbj-vscode/src/language/bbj-document-validator.ts` — `applyDiagnosticHierarchy` Rules 1/2 (~l.118-160), `toDiagnostic` `LinkingErrorData.instanceMemberAccess`
- `bbj-vscode/src/language/bbj-linker.ts` — `createLinkingError` (~l.145)
- `bbj-vscode/test/bbj-test-module.ts` — `createBBjTestServices`, `JavaInteropTestService` fake classes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createStubClass(className, cache)`: an existing safe landing for a class that cannot be resolved (D-03).
- `LinkingErrorData.instanceMemberAccess`: an existing precedent for a flag on linking error data that changes diagnostic handling (D-13).
- `isDowngradedSyntaxWarning(d)`: an existing Rule 2 exemption, and the model for the new one.
- `config-path-resolver.ts` / Phase 110 interop-defaults module: the plain-module pattern for D-01.

### Established Patterns
- `resolveClass` Phase 1 is synchronous (sets `$type`/`isStatic`/`deprecated`) and Phase 2 is async (types, docs). The guard must run before Phase 1 so later code only sees clean data.
- `canonicalJavaClassName` runs first in `resolveClass`; the guard goes after it or together with it.
- Tests parse with `parseHelper`, not `DocumentBuilder.build` (the build reaches CPL/interop on :5008 and is flaky).

### Integration Points
- Hover: Langium wraps the returned string as `MarkupContent` of kind Markdown, so escaping must happen before the string is returned.
- Completion: `documentation: { kind: 'markdown', value }` in two places (auto-import item, reference item).
- The IntelliJ plugin uses the same server, so the fixes reach it automatically. No IntelliJ code changes.

</code_context>

<specifics>
## Specific Ideas

- Criterion 1 test: an oversized and wrongly typed peer response, asserting what is stored on the node.
- Criterion 2 test: javadoc containing `![x](https://evil.example/t.png)` and `[click](https://evil.example)` renders with no interpretable link or image, in both hover and completion.
- Criterion 3 test: `;`, whitespace, `\n` and `Foo\nRUN "x.bbj"` insert nothing, and a valid name still inserts `use <fqn>`.
- Criterion 4 test: resolving code that uses `java.io`/`java.net` classes, with a `console.error` spy showing no "has no container".
- Criterion 5 test: a file with an unrelated semantic Error still shows the Java member Warning, whose text contains the member name and not "NamedElement". A file with a parse error still hides it (Rule 1).
- Vitest runs from `bbj-vscode/` (`npx vitest run <file>`); do not use `--reporter=basic` (not in vitest 4.1.10).

</specifics>

<deferred>
## Deferred Ideas

- Rewording the other Langium linking messages that say "NamedElement" (BBj symbols, USE targets). Not required by FIX-03; possible future polish.
- A setting to downgrade the VAL-03 Error (Phase 107 D-11). Stays unbuilt unless false positives are reported.

### Reviewed Todos (not folded)
- `2026-09-20-linking-interop-failures-survive-class-warmup` — belongs to Phase 116 (TEST-06, `resolves_phase: 116`).
- `2026-09-20-phase-97-code-review-follow-ups` — belongs to Phase 114 (FIX-04, `resolves_phase: 114`).
- `2026-09-26-intellij-interop-initoptions-key-mismatch` — about interop host/port handoff from IntelliJ, not peer class data. Outside this phase's boundary; leave pending for triage.

</deferred>

---

*Phase: 111-java-class-data-from-the-interop-peer*
*Context gathered: 2026-09-26*
