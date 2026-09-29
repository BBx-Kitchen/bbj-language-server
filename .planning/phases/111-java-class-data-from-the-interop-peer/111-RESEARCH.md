# Phase 111: Java Class Data from the Interop Peer - Research

**Researched:** 2026-09-26
**Domain:** Input validation / output escaping for a Langium language server consuming an untrusted-shaped JSON-RPC peer (`java-interop`/`bbj-ls`), plus a Langium linker/diagnostic-hierarchy wording fix
**Confidence:** HIGH (every research gate traced to a specific file:line and, where possible, reproduced or measured; two gates rest on an absent-evidence caveat, called out below)

## Summary

This phase touches five already-identified call sites in a codebase whose shapes were already
mapped in detail by `.planning/phases/111-.../111-CONTEXT.md` (D-01..D-15) and
`.planning/research/AUDIT-VERIFY-A-SECURITY.md`. The research gates handed to this pass were:
measure real javadoc/identifier sizes against the proposed 1,024/32,768 limits (D-04); confirm
VS Code's HTML-in-Markdown behaviour and Langium's JSDoc-to-Markdown output shape (D-06); confirm
the nested-class spelling auto-import candidates actually carry (D-09); trace and reproduce the
caller that sends a bare package name into `resolveClass()` (D-11, the phase's hardest gate); and
determine how the linker/type-inferer/diagnostic-hierarchy pieces fit together for the new
Java-member Warning exemption, including whether it can co-occur with the Phase-107 VAL-03 Error
(D-13/D-14).

The single most consequential finding is that **the project's default test double
(`JavaInteropTestService` in `test/bbj-test-module.ts`) overrides `resolveClassByName` itself**,
completely bypassing `resolveClass()`/`storeJavaClass()` — the exact code the SEC-03 and FIX-02
regression tests must exercise. A second, narrower test double already exists for this reason:
`CountingJavaInteropService` (`test/counting-java-interop.ts`), which extends the real
`JavaInteropService` and overrides only the leaf `getRawClass()`. SEC-03's and FIX-02's regression
tests **must** use `CountingJavaInteropService`/`createCountingInteropServices()`, not
`JavaInteropTestService` — using the latter would produce a green test that proves nothing.

The second consequential finding is that **D-11's caller is now identified and reproducible**:
`bbj-scope-local.ts`'s `computeLocalScopeParts`, in the `isUse(node) && node.javaClass` branch
(`bbj-scope-local.ts:193-222`), calls `getFQNFullname(node.javaClass)` — which joins ALL
`JavaTypeRef.pathParts` with no minimum length beyond 1 — and feeds the result straight into
`tryResolveJavaReference()` → `resolveClassByName()`. A bare-package `use` statement with no
trailing class segment (`use java.io`, 2 `JavaTypeRef` path parts, syntactically valid per the
grammar) reproduces the exact reported log text. A second, independent branch at
`bbj-scope-local.ts:232-235` (`isJavaTypeRef(node) && node.pathParts.length > 1`, fired for every
qualified `Type` occurrence, not only inside `Use`) reaches the same `resolveClassByName()` call
for the same text — it is a secondary path worth naming in the fix but the primary, reproducible
trigger is the `Use` branch.

The third consequential finding is that **the Phase-107 VAL-03/linking-Warning co-occurrence
question already has a "yes, and it's already handled" answer**: `checkUnknownJavaMember`
(`validations/check-unknown-java-member.ts:183-269`) only fires on an *unresolved* member
reference (`if (memberRef) return;` at line 208-211) with a *certain* receiver type
(`hasCertainReceiverType`, lines 109-175) — meaning every VAL-03 Error necessarily sits on the same
`node`/`property`/range as the linker's own unresolved-member linking error. The existing
`dropShadowedMemberLinkingDiagnostics` (`bbj-document-validator.ts:266-279`), already shipped from
Phase 107 and called at `bbj-document-validator.ts:304` **before** `applyDiagnosticHierarchy` runs,
already drops the shadowed linking diagnostic whenever a VAL-03 diagnostic claims the same range.
FIX-03's new `javaMemberAccess` flag and Rule-2 exemption therefore only ever become visible for
the case ROADMAP.md's own criterion 5 names explicitly: "the Warning for an unresolved Java member
**on an uncertain receiver**" — i.e. exactly the population `hasCertainReceiverType` excludes from
VAL-03. No new dedup code is needed; a test should merely confirm the existing dedup is undisturbed.

**Primary recommendation:** build the SEC-03/FIX-02 regression tests on
`CountingJavaInteropService` (not `JavaInteropTestService`); fix D-11 at
`bbj-scope-local.ts:193-222` (and audit `:232-235` for the same exposure); implement D-13/14 by
adding `javaMemberAccess` to `LinkingErrorData` in `bbj-document-validator.ts:385-418` using
`services.types.Inferer` (constructor param must widen from `LangiumServices` to `BBjServices`),
with no new dedup logic required.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Peer DTO bounding/type-checking (SEC-03) | API/Backend (language server, `java-interop.ts`) | — | The language server is the trust boundary between the untrusted `java-interop`/`bbj-ls` peer and the AST; no other tier ever sees the raw DTO |
| Markdown escaping for hover/completion (SEC-04) | API/Backend (`bbj-hover.ts`, `bbj-completion-provider.ts`) | Browser/Client (VS Code's own Markdown renderer) | Render-boundary escaping per D-06 is a server responsibility; the client's `supportHtml=false` default (verified below) is a second, independent layer, not a substitute |
| `use`-line fqn validation (SEC-05) | API/Backend (`bbj-code-action-provider.ts`, `bbj-completion-provider.ts`) | — | The `TextEdit` that inserts source text is built entirely server-side; VS Code/IntelliJ apply it verbatim |
| Bare-package-name caller fix (FIX-02) | API/Backend (`bbj-scope-local.ts`, `java-interop.ts`) | — | Scope computation is a Langium document-build phase, entirely server-side |
| Java-member linking Warning wording/exemption (FIX-03) | API/Backend (`bbj-document-validator.ts`, `bbj-linker.ts`) | — | Diagnostic construction and the hierarchy that filters diagnostics are both server-side; the client only renders whatever diagnostic array it receives |

No Browser/Client, CDN/Static, or Database/Storage tier owns any capability in this phase — it is
entirely a language-server (API/Backend) hardening phase. The only client-tier fact this research
surfaces is VS Code's own `supportHtml=false` default, cited only as a second layer, not a
substitute for D-06's own escaping.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** One shared plain module under `bbj-vscode/src/language/`, no Langium/editor imports,
  following `config-path-resolver.ts`/Phase 110's interop-defaults pattern. Exports the length
  limits, the peer-DTO guard (D-02..D-05), the Markdown escape (D-06), and the qualified-name
  check (D-09). One shared copy, no second hand-rolled one.
- **D-02:** Validate at the entry of `resolveClass()`, before `storeJavaClass()` and before any
  field is copied onto the node (the bulk implicit-import path calls `resolveClass` directly).
  Javadoc is bounded where Phase 2 copies it into `method.docu`, and where hover reads it on its
  fallback path.
- **D-03:** Rules by field kind — class `name` invalid/empty/over-limit → uncached stub path
  (`createStubClass`), no exception escapes. A member with an invalid/over-limit
  `name`/`type`/`returnType` is dropped from its array; the rest of the class still resolves.
  Non-array `fields`/`methods`/`constructors`/`parameters` default to `[]` (extends P61-D2-003).
  Non-boolean flags read as `false`. Free text (`error`, javadoc `docu`, parameter real names) is
  truncated at its limit with a visible `…` marker, never rejected.
- **D-04:** Fixed constants, not settings. Starting values: identifiers/type names 1,024 chars;
  javadoc text 32,768 chars per member/class; `error` 1,024 chars. Researcher checks these against
  real data; a limit that would truncate real documentation is raised to clear the largest real
  value, and the plan records the measured maximum.
- **D-05:** Dropping/truncating logs once per class at `logger.debug`/`logger.warn`, naming class
  and field, never the rejected value itself.
- **D-05b:** Regression test for criterion 1 feeds an oversized/wrongly-typed response through
  `resolveClass()` and asserts what is stored. Use `createBBjTestServices`/`JavaInteropTestService`
  and `parseHelper`, not `DocumentBuilder.build`.
- **D-06:** Escape at the render boundary, once, not at storage. Node keeps bounded but unescaped
  text (D-03); hover/completion escape as they build Markdown. Backslash-escapes at least
  `[ ] ( ) \` !` and the backslash itself, plus `<` (researcher confirms whether VS Code's hover
  Markdown renders raw HTML and keeps `<` in the set if so).
- **D-07:** Escape every string from the peer/javadoc that ends up in hover `contents` or
  completion `documentation`: `tryParseJavaDoc` output (both copies, `bbj-hover.ts` and
  `java-interop.ts`), `node.docu.javadoc`, the bold `__signature__` header, and
  `documentationHeader()` for Java nodes. Applied to final Markdown after JSDoc-to-Markdown
  conversion. Accepted cost: `{@code …}`/`{@link …}` show as literal text. BBj-authored
  documentation is NOT escaped.
- **D-08:** Signatures inside a fenced ` ```java ` block in completion are not backslash-escaped;
  backticks/line breaks are stripped/replaced instead, since D-03 already bounds the strings.
- **D-09:** One predicate `isJavaQualifiedName(fqn)`: dot-separated Java identifiers, each segment
  per JLS rules including `$`/`_` (Unicode letters allowed), no empty segment, no whitespace/`;`/
  line break/other punctuation. Nested-class spellings (`java.util.Map$Entry`) must pass.
  Researcher confirms which spelling auto-import candidates actually carry and adds it to the test.
- **D-10:** Both `createUseAction` and `completeAutoImportClasses` check the fqn before building
  the edit. Invalid candidate dropped silently (debug log only). If the dropped candidate was
  top-ranked, the next valid candidate becomes `isPreferred`. Test covers `;`, space, `\n`,
  `"Foo\nRUN \"x.bbj\""`, plus a valid name that still gets its `use` line.
- **D-11 (research gate):** Trace and reproduce the caller that asks for `java.io`/`java.net` as a
  class. Lead: BBj implicit imports, the bulk implicit-import path, or
  `autoImportCandidatePackages`. Mechanism per `AUDIT-VERIFY-A-SECURITY.md`:
  `extractPackageName("java.io")` returns `"java"`, `storeJavaClass` tries to make a class `io`
  under `java`, collides with an existing `JavaPackage io`, leaves `$container` unset.
- **D-12:** Fix at the caller: a package name is never sent into the class-shaped resolution path.
  Defence in depth: `storeJavaClass` does not overwrite/mis-store when the leaf name is already a
  `JavaPackage`. `console.error` stays for any other genuinely unexpected missing container — not
  downgraded as the fix. Test pins the fixed caller: resolving code using `java.io`/`java.net`
  classes produces no "has no container" output (spy on `console.error`).
- **D-13:** Mark the diagnostic explicitly: when the linker creates a linking error for a
  `MemberCall` member reference whose receiver's inferred type is a `JavaClass`, record
  `javaMemberAccess: true` plus member name and owner simple name on `LinkingErrorData`, mirroring
  `instanceMemberAccess`. Rule 2 keeps diagnostics with that flag, next to
  `isDowngradedSyntaxWarning`. Code stays `DocumentValidator.LinkingError` (Rule 1 unaffected).
- **D-14:** Only that Java-member linking Warning is exempt from Rule 2; other linking Warnings
  still follow Rule 2. Severity stays Warning. VAL-03 Error unaffected. If VAL-03 already reports
  the same member on the same range, the linking Warning is not also shown — researcher checks
  whether they can co-occur today; if so, dedupe in favour of the VAL-03 Error.
- **D-15:** New wording only for the flagged case: `'<member>' is not a known method or field of
  <OwnerSimpleName>`, or `Cannot resolve '<member>'` when no owner name is available. The existing
  ` [in <file>:<line>]` suffix from `createLinkingError` is kept. Other linking messages keep
  Langium's wording this phase.

### Claude's Discretion

- File name and export names of the shared helper module.
- Exact escape implementation (regex vs. character map), provided D-06's character set is covered.
- Whether the `tryParseJavaDoc` duplication between `bbj-hover.ts` and `java-interop.ts` is
  collapsed as part of D-07 — only if it falls out naturally, not required.
- Test file layout (one file per requirement or one per module).

### Deferred Ideas (OUT OF SCOPE)

- Rewording other Langium linking messages that say "NamedElement" (BBj symbols, USE targets) —
  not required by FIX-03, possible future polish.
- A setting to downgrade the VAL-03 Error (Phase 107 D-11) — stays unbuilt unless false positives
  are reported.
- `2026-09-20-linking-interop-failures-survive-class-warmup` (Phase 116, TEST-06).
- `2026-09-20-phase-97-code-review-follow-ups` (Phase 114, FIX-04).
- `2026-09-26-intellij-interop-initoptions-key-mismatch` — outside this phase's boundary.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-03 | java-interop peer response fields are checked for type and length before they are copied into AST documentation (#523) | D-02..D-05 traced to exact `resolveClass()`/Phase-2 lines; D-04 limits measured against real javadoc corpus (below); `CountingJavaInteropService` identified as the only test double that exercises the real pipeline |
| SEC-04 | Hover and completion escape Markdown control characters in javadoc text supplied by the peer (#524) | D-06/D-07/D-08 call sites confirmed with line numbers in `bbj-hover.ts` and `bbj-completion-provider.ts`; VS Code `supportHtml` default confirmed via web search + grep of this repo's client code |
| SEC-05 | The missing-USE quick fix and auto-import completion insert a class name only if it matches the Java qualified-identifier pattern (#525) | D-09 nested-class-spelling question answered by reading `resolveClassCandidatesBySimpleName`/`findClassCandidatesBySimpleName`/`buildCompleteClassIndex`; D-10 call sites confirmed |
| FIX-02 | "Java class java.io has no container" log line traced and fixed (#676) | D-11 caller identified and reproduction test shape designed (below) |
| FIX-03 | Unresolved-Java-member linking Warning survives an unrelated Error; "NamedElement" wording replaced (todo `2026-09-24-...`) | D-13/14 co-occurrence with VAL-03 traced and found already handled by existing `dropShadowedMemberLinkingDiagnostics`; D-15 message-rewrite location identified |
</phase_requirements>

## Standard Stack

This phase adds no new npm dependencies — it is entirely internal hardening of existing modules
(`java-interop.ts`, `bbj-hover.ts`, `bbj-completion-provider.ts`, `bbj-code-action-provider.ts`,
`bbj-document-validator.ts`, `bbj-linker.ts`) plus one new small plain module (D-01). No
`npm install` is required.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none — no new dependency) | — | — | — |

## Package Legitimacy Audit

**Not applicable.** This phase installs no new external packages. `[VERIFIED: package.json /
package-lock.json — no new dependency is proposed by any decision in 111-CONTEXT.md]`

## Architecture Patterns

### System Architecture Diagram

```
 java-interop / bbj-ls peer (untrusted-shaped JSON-RPC DTO)
        │  getClassInfo / getClassInfos response
        ▼
 JavaInteropService.resolveClass()  ◄──── [NEW D-01/D-02] shared bound/guard helper
        │  (Phase 1: sync $type/isStatic/deprecated;
        │   Phase 2: async javadocProvider.getDocumentation()
        │            + tryParseJavaDoc(doc.docu) → method.docu)
        ▼
 storeJavaClass()  ──► childrenOfByName map (class vs package collision — FIX-02)
        │
        ▼
 AST: JavaClass / JavaField / JavaMethod nodes (bounded, UNescaped — D-03/D-06 split)
        │
        ├──► bbj-hover.ts: getAstNodeHoverContent → tryParseJavaDoc → createMarkdownContent
        │        [NEW D-06/D-07] escape at render boundary, once
        │
        ├──► bbj-completion-provider.ts: createReferenceCompletionItem (docu.javadoc/signature)
        │        completeAutoImportClasses (candidate fqn → `use ${fqn}` TextEdit)
        │        [NEW D-06/D-08] escape javadoc; strip backticks/newlines inside fenced block
        │        [NEW D-09/D-10] isJavaQualifiedName gate before building additionalTextEdits
        │
        └──► bbj-code-action-provider.ts: createUseAction (fqn → `use ${fqn}` TextEdit)
                 [NEW D-09/D-10] isJavaQualifiedName gate before building the CodeAction

 Separately, scope computation (bbj-scope-local.ts, computeLocalScopeParts):
   isUse(node) && node.javaClass  ──► getFQNFullname(node.javaClass) ──► tryResolveJavaReference()
        [FIX-02 fix site] `use java.io` (2 pathParts, no class) reaches resolveClassByName("java.io")
   isJavaTypeRef(node) && pathParts.length > 1 ──► same call, for any qualified Type occurrence

 Separately, linking (bbj-linker.ts doLink/getCandidate) produces a LinkingError for an unresolved
 MemberCall.member; bbj-document-validator.ts processLinkingErrors() builds LinkingErrorData:
   [NEW D-13] javaMemberAccess = isMemberCall(container) && isJavaClass(typeInferer.getType(container.receiver))
   [NEW D-15] message rewrite for the flagged case, preserving the "[in file:line]" suffix
   dropShadowedMemberLinkingDiagnostics() [EXISTING, Phase 107] already drops this diagnostic
        when VAL-03 (check-unknown-java-member.ts) claims the same range
   applyDiagnosticHierarchy() Rule 2 [NEW D-13/14 exemption, alongside isDowngradedSyntaxWarning]
```

### Recommended Project Structure

No new directories. One new file at `bbj-vscode/src/language/<name>.ts` (D-01 discretion on the
name — `java-peer-guard.ts`, `java-doc-safety.ts`, etc.), following the shape of
`bbj-vscode/src/language/interop-config.ts` (23 lines of module doc, no Langium/editor imports,
plain exported constants/functions, unit-testable with plain values).

### Pattern 1: The peer-guard/escape module is plain and Langium-free (D-01)

**What:** `config-path-resolver.ts` and `interop-config.ts` are both header-commented "Kept free
of Langium and editor imports ... unit-testable with plain stubs/values ... reusable from both
[server entry points|the request handler] and tests." The new D-01 module should follow the same
shape: length-limit constants, a DTO-bounding function, a Markdown-escape function, and
`isJavaQualifiedName`, each independently unit-testable with plain strings/objects.
**When to use:** Any cross-cutting validation/escaping rule two or more unrelated call sites need
identically.
**Example:**
```typescript
// Source: bbj-vscode/src/language/interop-config.ts:1-16 [VERIFIED: read this session]
/**
 * The single owner of "what host and port does the Java interop service connect to"
 * validation and defaults (issues #509, #510, #581). ...
 * Kept free of Langium and editor imports so it is unit-testable with plain values and
 * reusable from both server entry points and tests.
 */
export const DEFAULT_INTEROP_HOST = 'localhost';
export const DEFAULT_INTEROP_PORT = 5008;
```

### Pattern 2: Testing the real `resolveClass()`/`storeJavaClass()` pipeline requires
`CountingJavaInteropService`, not `JavaInteropTestService`

**What:** `test/bbj-test-module.ts`'s `JavaInteropTestService.resolveClassByName` (lines 172-175)
is overridden to **never** call the real `resolveClassByName`/`resolveClass`:
```typescript
// Source: bbj-vscode/test/bbj-test-module.ts:172-175 [VERIFIED: read this session]
public override async resolveClassByName(className: string): Promise<JavaClass> {
    // A preloaded class, or a silent stub for anything else — never a socket, never a log.
    return this.getResolvedClass(className) ?? this.stubClass(className);
}
```
`stubClass()` (lines 177-189) builds a plain object directly — it never calls `storeJavaClass()`,
so it can never reproduce the `childrenOfByName` collision (FIX-02) or exercise the real DTO
bounding (SEC-03). `test/counting-java-interop.ts`'s own header comment states this explicitly:
"That default double overrides `resolveClassByName` itself, so a test built on it never exercises
the production `resolveClassByName`/`resolveClass` code path." (`counting-java-interop.ts:8-10`,
`[VERIFIED: read this session]`.) `CountingJavaInteropService` extends `JavaInteropService`
directly and overrides only the protected `getRawClass()` (a call-counting spy answering via
`backendLikeDto()`), leaving the real `resolveClassByName`/`resolveClass`/`storeJavaClass` to run
unmodified, and never opens a socket (`connect()` rejects).
**When to use:** Every SEC-03 (D-05b) and FIX-02 (D-12) regression test in this phase.
**Example:**
```typescript
// Source: bbj-vscode/test/java-interop-service.test.ts pattern, mirrored by
// bbj-vscode/test/java-interop-nested-class-names.test.ts:16-19 [VERIFIED: read this session]
import { createCountingInteropServices } from './counting-java-interop.js';

const { interop } = createCountingInteropServices();
interop.scripts.set('java.io.File', () => ({
    packageName: 'java.io', isDeprecated: false, fields: [], methods: [], constructors: [],
}));
await interop.resolveClassByName('java.io.File'); // registers JavaPackage "io" under "java"
```

### Pattern 3: FIX-02 reproduction — a bare-package `use` statement

**What:** The grammar rule `Use: 'use' (...) | 'use' javaClass=JavaTypeRef;` with
`JavaTypeRef: pathParts+=JavaSymbol ('.' pathParts+=JavaSymbol)*`
(`bbj.langium:342-345,937-938`, `[VERIFIED: read this session]`) accepts a 2-segment path with no
trailing class name — `use java.io` parses without a parser error. `computeLocalScopeParts`'s
`isUse` branch reads the FULL joined path text (`bbj-scope-local.ts:193-222`) via
`getFQNFullname`, which for a `JavaTypeRef` is simply
`klass.pathParts.map(m => m.symbol.$refText).join('.')` (`bbj-nodedescription-provider.ts:66`,
`[VERIFIED: read this session]`) — using the raw parsed text, not a resolved reference, so it
fires regardless of whether `io` is already a registered `JavaPackage`. `tryResolveJavaReference`
(`bbj-scope-local.ts:380-395`) then calls the REAL, un-stubbed `javaInterop.resolveClassByName`.
**Reproduction sequence** (needs `CountingJavaInteropService`, see Pattern 2, so the real
`resolveClass()`/`storeJavaClass()` run):
1. Pre-resolve `java.io.File` (or any `java.io.*` class) so `storeJavaClass` registers a
   `JavaPackage` named `io` under `java` in `childrenOfByName` — this is the collision precondition.
2. Parse a document containing `use java.io` (or `use java.net`) via `parseHelper`, wired to the
   `CountingJavaInteropService`-based `BBj` service group (see the "Existing Code Insights" note on
   `parseHelper`+`validation:true` triggering scope computation without reaching a live socket).
3. Before the fix: `console.error` fires with `Java class java.io has no container, packageName:
   java` (`java-interop.ts:1171`). After the fix (D-12, caller-side): it must not.
**When to use:** FIX-02's D-12 pinning test.

### Anti-Patterns to Avoid
- **Testing FIX-02/SEC-03 against `JavaInteropTestService`:** produces a green test that never ran
  the code under test — see Pattern 2.
- **Fixing FIX-02 by downgrading the `console.error` to `logger.warn`:** explicitly rejected by
  D-12 and the roadmap planning note ("stop the bad request, not only lower the log level").
- **Adding new dedup logic for D-14's VAL-03 co-occurrence:** unnecessary — see "Don't Hand-Roll"
  below; `dropShadowedMemberLinkingDiagnostics` already exists and already runs before the
  hierarchy.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deduping a VAL-03 Error against the linker's own Warning on the same member/range | A new range-comparison pass inside `applyDiagnosticHierarchy`'s Rule 2, or a second dedup step after the D-13 flag is added | The existing `dropShadowedMemberLinkingDiagnostics` (`bbj-document-validator.ts:266-279`), already called at line 304 before the hierarchy runs | It already matches on exact range against `UNKNOWN_JAVA_MEMBER_CODE`; VAL-03 by construction (line 208-211 of `check-unknown-java-member.ts`) only ever fires on an *unresolved* reference, so its diagnostic's range is always the same node/property the linker's own `LinkingError` for that reference carries. Verified this session by reading both files; see Summary. |
| A hermetic Java-interop test double that exercises `resolveClass()`/`storeJavaClass()` | A modified/extended `JavaInteropTestService`, or a bespoke new one | `CountingJavaInteropService` (`test/counting-java-interop.ts`) | Already built for exactly this purpose (its own header comment names the reason); extending `JavaInteropTestService` instead would silently reintroduce the same bypass this phase's tests must avoid. |
| Escaping Markdown | A bespoke regex assembled from partial character classes across two files | The single D-01 shared helper, imported by both `bbj-hover.ts`'s two `tryParseJavaDoc` copies and `bbj-completion-provider.ts`'s two `MarkupContent`-building sites | D-07 explicitly names all four call sites that must share one escape function; a second hand-rolled copy is the exact anti-pattern the CONTEXT's D-01 rules out. |

**Key insight:** every "don't hand-roll" item in this phase is really "don't rebuild what a
previous, adjacent phase already built" — Phase 107 (VAL-03/`dropShadowedMemberLinkingDiagnostics`)
and this repository's own test-infrastructure work (`CountingJavaInteropService`) already solved
the two hardest sub-problems this phase would otherwise re-solve.

## Common Pitfalls

### Pitfall 1: Using `JavaInteropTestService` for SEC-03/FIX-02 tests
**What goes wrong:** The test passes even when the underlying fix (or lack of one) does nothing,
because `resolveClassByName` never reaches `resolveClass()`/`storeJavaClass()`.
**Why it happens:** `JavaInteropTestService` is the *default* double used by nearly every other
test file in the suite (`createBBjTestServices`), so it is the natural first reach.
**How to avoid:** Use `createCountingInteropServices()` from `test/counting-java-interop.ts` for
these two requirements specifically (see Pattern 2/3 above).
**Warning signs:** A test that asserts `console.error` was NOT called, or that a dropped/truncated
field is absent, but never calls `interop.resolveRaw(dto)` or lets a document parse trigger the
real `resolveClassByName` — that test cannot fail even on unfixed code. Confirm by temporarily
reverting the fix locally and checking the test still fails.

### Pitfall 2: Placing the D-02 guard inside `resolveClassByName` instead of `resolveClass`
**What goes wrong:** The bulk implicit-import path (`loadImplicitImports`, `java-interop.ts:757-831`)
calls `this.resolveClass(javaClass, token)` directly (line 764), never going through
`resolveClassByName`. A guard placed only in `resolveClassByName` would leave every class loaded
via implicit imports unvalidated.
**Why it happens:** `resolveClassByName` looks like the natural "entry point" since it is the
public API most callers use.
**How to avoid:** Per D-02, the guard runs "at the entry of `resolveClass()`" — i.e. right after
`javaClass.name = canonicalJavaClassName(javaClass.name)` (`java-interop.ts:1140`) and before
`storeJavaClass()` is called (line 1169).
**Warning signs:** A regression test built only around `resolveClassByName` (not calling
`resolveClass`/`resolveRaw` directly, as Pattern 2 does) would not catch this misplacement.

### Pitfall 3: Escaping at storage instead of at the render boundary (contradicts D-06)
**What goes wrong:** Double-escaping when both hover and completion each escape an already-escaped
string, or under-escaping a future non-Markdown consumer that reads the same `docu.javadoc` field.
**Why it happens:** It seems more efficient to escape once, when the peer response first arrives.
**How to avoid:** D-06 is explicit and locked: escape at render time in both `bbj-hover.ts` and
`bbj-completion-provider.ts`, not in `java-interop.ts`'s Phase 2 javadoc assignment
(`java-interop.ts:1249-1254`).
**Warning signs:** A single escape call site instead of the ≥4 named in D-07 (`tryParseJavaDoc` in
both files, `node.docu.javadoc` direct reads, the `__signature__` header, `documentationHeader()`).

### Pitfall 4: Assuming `findClassCandidatesBySimpleName`/`buildCompleteClassIndex` ever emit a
`$`-bearing fqn today
**What goes wrong:** Writing `isJavaQualifiedName`'s test suite only against candidates the
current auto-import machinery can actually produce, then being surprised when a hand-authored
`use java.util.Map$Entry` in source is later rejected or accepted inconsistently.
**Why it happens:** All three candidate-producing functions explicitly filter out any name
containing `$` — see "Existing Code Insights" below — so nested classes never appear in a live
auto-import suggestion.
**How to avoid:** Per D-09 the predicate must still accept `$` as a valid identifier character
(JLS-legal) regardless of what today's candidate producers emit — test the predicate directly with
a `$`-bearing string, not only via the completion/quick-fix integration path.
**Warning signs:** A SEC-05 test suite with no `$`-bearing positive case.

## Code Examples

### D-04 measured limits vs. real javadoc data — verbatim source and quote

`[VERIFIED: /opt/bbx/documentation/javadoc/*.json — read this session via a Node script over the
41 package JSON files this dev container's `bbjdir` ships, the same tree
`tryInitializeJavaDoc`/`javadocProvider.initialize()` reads via `joinPath(safeUri(this.bbjdir),
'documentation', 'javadoc')` (`bbj-ws-manager.ts:184-193`)]`

```
maxDocu { len: 11615, file: 'com.basis.bbj.proxies.json', where: 'method:BBjRecordSet.getMappingDescription' }
maxMemberName { len: 40, file: 'com.basis.util.json', name: 'removeKeyAndContainerListenerRecursively' }
maxClassName { len: 38, file: 'com.basis.util.authentication.server.json', name: 'EncryptedTokenAuthServerContextCreator' }
maxParamRealName { len: 30, file: 'com.basis.util.common.json', name: 'p_methodsAllowedInOtherThreads' }
java.util.json HashMap: class docu len 5250, longest method (`put`) docu len 556
```

The proposed limits (identifiers/type names 1,024; javadoc text 32,768 per member/class; `error`
1,024) clear every measured real value with large margin: the longest identifier found (40 chars)
is 4% of the 1,024 limit; the longest javadoc text found (11,615 chars) is 35% of the 32,768 limit.
**No limit needs to be raised.** `HashMap` (named explicitly in D-04) measured at 5,250 chars class
docu / 556 chars longest method docu, both far under the limits.

**Caveat (absent evidence, not a positive finding):** this dev container's javadoc tree contains
41 BASIS/BBj proxy packages plus `java.util` only — it has **no** `java.lang`, `java.io`,
`java.net`, or `BBjAPI`-named file (`grep -l '"name": "BBjAPI"'` over all 41 files returned no
match — every hit was another class's *reference* to BBjAPI in prose, not the class's own doc
file). This session could not measure JDK-core or `BBjAPI`'s own javadoc size directly; the
`com.basis.bbj.proxies.json` maximum (a comparably large, complex proxy class) is offered as the
best available real-world ceiling, not a substitute for a direct BBjAPI measurement. Given the
5-10x headroom already observed across every file that *was* measured, the risk of a JDK/BBjAPI
outlier exceeding 32,768 chars is judged low, but this is `[ASSUMED]` for those specific two named
classes, not `[VERIFIED]`.

### D-11 caller trace — verbatim source

```typescript
// Source: bbj-vscode/src/language/bbj-scope-local.ts:193-222 [VERIFIED: read this session]
} else if (isUse(node) && node.javaClass) {
    try {
        const javaClassName = getFQNFullname(node.javaClass);
        let javaClass = await this.tryResolveJavaReference(javaClassName, this.javaInterop);
        // ... inner-class $ fallback ...
    } catch (e) {
        logger.warn(`Error processing USE statement for ${getFQNFullname(node.javaClass)}: ${e}`);
        return;
    }
} else if (isJavaTypeRef(node) && node.pathParts.length > 1) { // resolve only qualified names
    const javaClassName = getFQNFullname(node);
    // just trigger resolution so the class reference is loaded into the synthetic document.
    await this.tryResolveJavaReference(javaClassName, this.javaInterop);
}
```
```typescript
// Source: bbj-vscode/src/language/bbj-nodedescription-provider.ts:61-71 [VERIFIED: read this session]
export function getFQNFullname(klass: QualifiedClass|undefined) {
    if(klass) {
        switch(klass.$type) {
            case 'BBjTypeRef': return klass.klass.$refText;
            case 'SimpleTypeRef': return klass.simpleClass.$refText;
            case "JavaTypeRef": return klass.pathParts.map(m => m.symbol.$refText).join('.')
            default: assertUnreachable(klass);
        }
    }
    return '';
}
```
```
// Source: bbj-vscode/src/language/bbj.langium:342-345,937-938 [VERIFIED: read this session]
Use:
    'use' (bbjFilePath=BBjFilePath bbjClass=[BbjClass:ValidName]) |
    'use' javaClass=JavaTypeRef
;
...
JavaTypeRef:
    pathParts+=JavaSymbol ('.' pathParts+=JavaSymbol)*
```
`getFQNFullname` uses `symbol.$refText` — the raw parsed text — not a resolved reference, so a
`use java.io` statement joins to `"java.io"` and is passed to `tryResolveJavaReference` regardless
of whether the `io` symbol links to anything. This exactly matches the reported log text `Java
class java.io has no container, packageName: java` emitted at:
```typescript
// Source: bbj-vscode/src/language/java-interop.ts:1170-1173 [VERIFIED: read this session]
if (javaClass.$container === undefined) {
    console.error(`Java class ${className} has no container, packageName: ${javaClass.packageName}`);
    javaClass.$container = this.classpath; // fallback to classpath
}
```
and `extractPackageName`:
```typescript
// Source: bbj-vscode/src/language/java-interop.ts:1524-1535 [VERIFIED: read this session]
function extractPackageName(className: string): string {
    const lastIndexOfDot = className.lastIndexOf('.');
    if (lastIndexOfDot === -1) { return ''; }
    const match = className.match(/\.(?=[A-Z])/);
    if (match && match.index !== undefined) { return className.substring(0, match.index); }
    return className.substring(0, lastIndexOfDot);
}
```
`extractPackageName("java.io")` → no `.` followed by an uppercase letter → falls back to
`className.substring(0, lastIndexOfDot)` = `"java"`. `storeJavaClass("java.io", "java")` then
treats `"io"` as the simple *class* name under package `"java"` — colliding with the `JavaPackage`
named `io` that any earlier `java.io.*` class resolution (e.g. a real `use java.io.File`) already
registered in `childrenOfByName`.

**Reproduction caveat:** this session traced and constructed the reproduction shape (Pattern 3,
above) from source reading but did not execute it against a live vitest run — no test file exists
yet to run. The mechanism is `[VERIFIED: bbj-scope-local.ts:193-222, bbj-nodedescription-provider.ts:61-71,
bbj.langium:342-345/937-938, java-interop.ts:1170-1173,1524-1535 — every line read this session and
quoted verbatim above]`; the CONTEXT's own AUDIT-VERIFY document independently corroborates the
`storeJavaClass` collision half of the mechanism but explicitly states it "did not trace the exact
caller" — this research closes that gap.

### D-09 nested-class spelling — verbatim source

```typescript
// Source: bbj-vscode/src/language/java-interop.ts:887-903 (buildCompleteClassIndex) [VERIFIED: read this session]
for (const fqn of fqns) {
    const simple = fqn.substring(fqn.lastIndexOf('.') + 1);
    if (!simple || simple.includes('$') || !fqn.includes('.')) {
        continue;
    }
    ...
}
```
```typescript
// Source: bbj-vscode/src/language/java-interop.ts:969-983 (findClassCandidatesBySimpleName) [VERIFIED: read this session]
for (const javaClass of this.resolvedClasses.values()) {
    if (javaClass.error || !javaClass.packageName) { continue; }
    const simple = javaClass.name.substring(javaClass.name.lastIndexOf('.') + 1);
    if (simple.includes('$') || simple.toLowerCase() !== target) { continue; }
    matches.add(`${javaClass.packageName}.${simple}`);
}
```
`findClassCandidatesByPrefix` (`java-interop.ts:937-960`) applies the identical `simple.includes('$')`
skip. All three candidate-producing functions that feed `resolveClassCandidatesBySimpleName` (used
by `createUseAction`) and `completeAutoImportClasses` **explicitly exclude** any class whose
(post-`canonicalJavaClassName`) simple name still contains `$` — which in practice means **no
nested class ever reaches `fqn` in `createUseAction`/`completeAutoImportClasses` today**, and every
`fqn` that does arrive is a plain dotted top-level name. This is confirmed, not assumed:
`[VERIFIED: java-interop.ts:887-903,937-960,969-983 — read this session]`.

D-09 still requires `isJavaQualifiedName` to accept a `$`-bearing segment (`java.util.Map$Entry`)
per JLS identifier rules, because a user can type `use java.util.Map$Entry` directly (reaching the
`Use`/`JavaTypeRef` path in `bbj-scope-local.ts`, not `createUseAction`), and because
`canonicalJavaClassName` deliberately leaves certain `$` spellings untouched (anonymous/local
classes, `$Proxy12`-style names) — see `java-interop.ts:146-169`. **Recommendation:** the
`isJavaQualifiedName` test suite should include a `$`-bearing positive case even though it cannot
be exercised end-to-end via today's auto-import/quick-fix candidate paths — test the predicate
directly.

### D-13/D-14 — LinkingErrorData, instanceMemberAccess precedent, and existing dedup

```typescript
// Source: bbj-vscode/src/language/bbj-document-validator.ts:28-38 [VERIFIED: read this session]
interface LinkingErrorData extends DiagnosticData {
    containerType: string;
    property: string;
    refText: string;
    instanceMemberAccess?: boolean;
}
```
```typescript
// Source: bbj-vscode/src/language/bbj-document-validator.ts:385-418 (processLinkingErrors) [VERIFIED: read this session]
protected override processLinkingErrors(document: LangiumDocument, diagnostics: Diagnostic[], _options: ValidationOptions): void {
    for (const reference of document.references) {
        const linkingError = reference.error;
        if (linkingError) {
            const container = linkingError.info.container;
            const instanceMemberAccess = (isSymbolRef(container) && container.instanceAccess)
                || isInstanceAccessAssignment(container);
            const info: DiagnosticInfo<AstNode, string> = {
                node: container,
                range: reference.$refNode?.range,
                property: linkingError.info.property,
                index: linkingError.info.index,
                data: {
                    code: DocumentValidator.LinkingError,
                    containerType: container.$type,
                    property: linkingError.info.property,
                    refText: linkingError.info.reference.$refText,
                    instanceMemberAccess
                } satisfies LinkingErrorData
            };
            ...
            diagnostics.push(this.toDiagnostic('error', linkingError.message, info));
        }
    }
}
```
`container` here is the `MemberCall` node when `linkingError.info.property === 'member'`. D-13's
new flag follows the identical shape: `isMemberCall(container) && isJavaClass(typeInferer.getType(container.receiver))`.
`typeInferer` is not currently a field of `BBjDocumentValidator` — its constructor currently
declares `services: LangiumServices` (`bbj-document-validator.ts:290`), a narrower type than the
`BBjServices` its DI factory actually receives:
```typescript
// Source: bbj-vscode/src/language/bbj-module.ts:91-97,55-68 [VERIFIED: read this session]
validation: {
    BBjValidator: (services) => new BBjValidator(services),
    DocumentValidator: (services) => new BBjDocumentValidator(services)
},
...
types: {
    Inferer: TypeInferer
},
```
The factory closure's `services` parameter is `BBjServices` (which includes `types.Inferer`), so
widening `BBjDocumentValidator`'s constructor parameter type from `LangiumServices` to
`BBjServices` and storing `services.types.Inferer` is a type-safe, no-behaviour-change addition.

**Co-occurrence with VAL-03 (D-14) — already handled:**
```typescript
// Source: bbj-vscode/src/language/validations/check-unknown-java-member.ts:201-215 [VERIFIED: read this session]
let memberRef: NamedElement | undefined;
try {
    memberRef = memberCall.member.ref;
} catch { return; }
if (memberRef) {
    // Linking already resolved this reference -- nothing unknown about it.
    return;
}
const receiverType = typeInferer.getType(receiver);
if (!isFullyResolvedJavaClass(receiverType)) { return; }
...
if (!hasCertainReceiverType(receiver)) { return; }
```
VAL-03 fires ONLY when `memberRef` is `undefined` — i.e. the member reference is already
unresolved — which means the linker has, by construction, already produced a `LinkingError` for
the *same* `memberCall`/`'member'` property on the *same* range. Both diagnostics are attached via
`node: memberCall, property: 'member'` (VAL-03 at `check-unknown-java-member.ts:264-268`; the
linking error via `processLinkingErrors` above), so their ranges match.
```typescript
// Source: bbj-vscode/src/language/bbj-document-validator.ts:258-279 (dropShadowedMemberLinkingDiagnostics) [VERIFIED: read this session]
export function dropShadowedMemberLinkingDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
    const unknownMemberRanges = diagnostics
        .filter(d => (d.data as DiagnosticData | undefined)?.code === UNKNOWN_JAVA_MEMBER_CODE)
        .map(d => d.range);
    if (unknownMemberRanges.length === 0) { return diagnostics; }
    return diagnostics.filter(d => {
        if ((d.data as DiagnosticData | undefined)?.code !== DocumentValidator.LinkingError) { return true; }
        return !unknownMemberRanges.some(r => sameRange(r, d.range));
    });
}
```
called at:
```typescript
// Source: bbj-vscode/src/language/bbj-document-validator.ts:299-304 [VERIFIED: read this session]
override async validateDocument(...): Promise<Diagnostic[]> {
    const diagnostics = dropShadowedMemberLinkingDiagnostics(await super.validateDocument(document, options, cancelToken));
    ...
```
This runs **before** `applyDiagnosticHierarchy` (Rule 2) ever sees the list. **Conclusion for
D-14: yes, they can co-occur (whenever `hasCertainReceiverType` is true), and the codebase already
dedupes in favour of VAL-03 today** — no new dedup logic is needed for this phase. D-13's new
`javaMemberAccess` flag and Rule-2 exemption only become observable for the population VAL-03
explicitly excludes: an *uncertain* receiver (`hasCertainReceiverType` false — e.g. a receiver
typed only through a method's return type or a Java field's type, per that function's own doc
comment at `check-unknown-java-member.ts:103-108`) — exactly the wording of ROADMAP.md's own
criterion 5 ("the Warning for an unresolved Java member **on an uncertain receiver** is still
shown"). A regression test for D-14 should therefore assert the existing dedup is *undisturbed*
(a certain-receiver case still shows only the VAL-03 Error, not both), not add new dedup code.

### D-15 message rewrite — where and how

`bbj-linker.ts`'s `createLinkingError` (`bbj-linker.ts:145-153`) appends the `[in file:line]`
suffix to Langium's default `super.createLinkingError(refInfo)` message (Langium's default text is
"Could not resolve reference to NamedElement named '<refText>'."). The cleanest rewrite point is
`processLinkingErrors` in `bbj-document-validator.ts` (where `javaMemberAccess`/owner name are
already being computed for D-13), extracting the existing `[in ...]` suffix with the same regex
pattern already used one function away:
```typescript
// Source: bbj-vscode/src/language/bbj-document-validator.ts:427 (extractCyclicReferenceRelatedInfo) [VERIFIED: read this session]
const sourceMatch = message.match(/\[in ([^\]]+)\]/);
```
and rebuilding `linkingError.message` as `'<member>' is not a known method or field of
<OwnerSimpleName>` (or `Cannot resolve '<member>'` with no owner) + the same `[in ...]` suffix,
before it is passed to `this.toDiagnostic('error', linkingError.message, info)`. Owner simple name
follows the existing pattern at `java-interop.ts:1247`: `javaClass.name.split('.').pop() ??
javaClass.name`.

## Runtime State Inventory

Not applicable — this is not a rename/refactor/migration phase.

## Common Pitfalls

(See above, merged with Architecture Patterns section per this phase's structure.)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Linking Warnings for BBj symbols always downgraded by Rule 2 when any Error exists | Rule 2 already exempts `isDowngradedSyntaxWarning` (a Langium-syntax-complaint-vs-compiler-verdict case) | Pre-existing, `bbj-document-validator.ts:152-159` | D-13 adds a second, narrower exemption alongside this one — same mechanism, new predicate |
| VAL-03 (unknown-Java-member Error) and the linker's own Warning could theoretically both reach the client for the same member | `dropShadowedMemberLinkingDiagnostics` already drops the shadowed linking diagnostic | Phase 107 (this session found no separate CONTEXT/ROADMAP date, but the function and its `UNKNOWN_JAVA_MEMBER_CODE` import both predate this phase per `.planning/milestones/v4.6-phases/107-.../107-CONTEXT.md`) | D-14's "researcher checks whether they can co-occur" is answered: they can (uncertain-receiver case only is left unguarded), and the guarded case is already deduped |

**Deprecated/outdated:** none identified — no library upgrade or removed API in scope this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The 32,768-char javadoc limit and 1,024-char identifier limit clear the real maximum for `java.lang`/`java.io`/`java.net`/`BBjAPI` specifically (not just the 41 BASIS/BBj proxy packages + `java.util` measured in this dev container) | Code Examples → D-04 | If a JDK-core or BBjAPI javadoc entry genuinely exceeds 32,768 chars, that specific entry would be silently truncated with a `…` marker (D-03's own designed behaviour, not a crash) — low severity even if wrong, but worth a `checkpoint:human-verify` or a live-interop measurement if reachable before locking the constant |
| A2 | VS Code's `MarkdownString.supportHtml` defaults to `false` for LSP `MarkupContent` converted via `vscode-languageclient`'s `protocolConverter.ts`, and this extension never overrides `clientOptions.markdown.supportHtml` (confirmed by `grep` finding no match in `src/extension.ts`/`src/*.ts`) — so raw HTML (`<img>`) in hover/completion content is NOT rendered by VS Code today | Summary / Architectural Responsibility Map / Common Pitfalls | If wrong (e.g. a future dependency bump or client-options change enables `supportHtml`), `<img>`-based content exfiltration/rendering becomes possible on the VS Code side; D-06 already locks in escaping `<` regardless of this finding, so the finding is corroborating context, not a load-bearing decision |
| A3 | LSP4IJ's own Markdown/HTML rendering behaviour for hover/completion `MarkupContent` on the IntelliJ side is unverified this session (no LSP4IJ source was read) | Architectural Responsibility Map | If LSP4IJ renders raw HTML by default (Swing `JEditorPane`-style renderers sometimes do), the IntelliJ side would be exposed even after this phase if `<` were dropped from the escape set for VS-Code-only reasons — this is exactly why D-06 already locks `<` into the escape set unconditionally; no action needed beyond keeping that decision |
| A4 | Langium's `parseJSDoc(...).toMarkdown()` renders `{@link}`/`{@code}` using standard Markdown link/inline-code syntax (so backslash-escaping `[`, `]`, `` ` `` neutralizes them into literal text, matching D-07's "accepted cost") — not independently confirmed by reading Langium's JSDoc source this session; based on general familiarity with Langium's JSDoc-to-Markdown feature and the fact that D-07 already treats this as an accepted, locked cost regardless of exact rendering | Summary / D-06 discussion | Low risk: D-07 is a locked decision that already accepts imperfect formatting for these tags as the tradeoff; if the escape set is applied at the correct render boundary per D-06, the security property (no unintended link/image renders) holds regardless of the exact intermediate Markdown syntax `toMarkdown()` emits |

## Open Questions

1. **Exact BBjAPI/JDK-core javadoc maximum size**
   - What we know: every measured file in this dev container's javadoc tree (41 BASIS/BBj proxy
     packages + `java.util`) clears the proposed 32,768-char limit by 3x or more.
   - What's unclear: no `java.lang`/`java.io`/`java.net`/`BBjAPI`-named javadoc JSON file exists in
     this environment to measure directly.
   - Recommendation: proceed with the proposed 32,768/1,024 constants (D-03's truncation-not-rejection
     behaviour makes an unmeasured outlier low-severity even if wrong); if a live `java-interop`
     backend becomes reachable during planning/execution, a quick manual `getClassInfo` probe for
     `java.util.HashMap` and `BBjAPI` against the live peer (not just the static javadoc JSON) would
     fully close this gap, but is not required to proceed.

2. **Whether `bbj-scope-local.ts:232-235`'s generic `isJavaTypeRef` branch is a second, independently
   reachable trigger for FIX-02 beyond the `Use`-statement branch**
   - What we know: this branch fires for any `Type`-position `JavaTypeRef` with `pathParts.length >
     1`, not only inside a `Use` statement (e.g. `declare java.io x` — an unusual but grammatically
     valid two-segment type reference).
   - What's unclear: whether any real BBj code in the wild actually writes a bare 2-segment package
     name in a `Type` position outside `Use` (as opposed to the `use java.io` idiom this research
     reproduced).
   - Recommendation: the D-12 fix, if placed at the caller (`bbj-scope-local.ts`), should address
     both branches (`:193-222` and `:232-235`) with the same guard, since both reach the identical
     `tryResolveJavaReference`/`resolveClassByName` call with a potentially-bare-package string; the
     plan should not assume fixing only the `Use` branch is sufficient.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `bbj-vscode` npm toolchain (vitest, tsc) | All test/build steps | ✓ (assumed present per project CLAUDE.md conventions; not re-verified this session, no change from prior phases) | — | — |
| Live `java-interop`/`bbj-ls` backend on :5008 | Optional: a deeper live measurement for Open Question 1 | Not probed this session (read-only javadoc JSON files were sufficient and lower-risk than opening a live socket) | — | Static javadoc JSON tree at `/opt/bbx/documentation/javadoc/` used instead — sufficient for D-04's purpose |
| `/opt/bbx/documentation/javadoc/*.json` | D-04 measurement | ✓ | 41 files, read 2026-09-26 | — |

No missing dependency blocks this phase — it is pure in-repo TypeScript hardening plus a
non-blocking javadoc-corpus measurement already completed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (version per `bbj-vscode/package.json`, unchanged this phase) |
| Config file | `bbj-vscode/vitest.config.ts` (no `include`/`exclude` restriction beyond coverage config — every `*.test.ts` under `test/` runs by default) |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/<new-file>.test.ts` |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run` (or `npm test`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-03 | Oversized/wrongly-typed peer DTO is bounded/dropped, not stored raw, when fed through the real `resolveClass()` | unit | `npx vitest run test/java-interop-peer-guard.test.ts -x` (name per D-01 discretion) | ❌ Wave 0 — new file, use `CountingJavaInteropService` per Pattern 2 |
| SEC-04 | Javadoc containing `[`,`]`,`(`,`)`,backtick,`!`,`<` shows literally in hover and completion Markdown | unit | `npx vitest run test/javadoc-markdown-escape.test.ts -x` | ❌ Wave 0 — new file; existing `test/javadoc.test.ts` is adjacent but covers a different concern (package-name-mismatch logging), not escaping |
| SEC-05 | `isJavaQualifiedName` rejects `;`/whitespace/`\n`/`"Foo\nRUN \"x.bbj\""`, accepts a valid name and a `$`-bearing nested-class name; `createUseAction`/`completeAutoImportClasses` drop invalid candidates silently, re-rank `isPreferred` | unit | `npx vitest run test/java-qualified-name.test.ts test/code-action.test.ts -x` | Partial — `test/code-action.test.ts` exists (extend it); a new predicate-unit file needed |
| FIX-02 | `use java.io`/`use java.net` (bare package) produces no "has no container" console.error, using `CountingJavaInteropService` per Pattern 3 | unit/integration | `npx vitest run test/java-package-name-collision.test.ts -x` | ❌ Wave 0 — new file |
| FIX-03 | Uncertain-receiver Java-member linking Warning survives an unrelated Error (Rule 2 exemption); message has no "NamedElement"; parse-error suppression (Rule 1) unchanged; certain-receiver case still shows only the VAL-03 Error (dedup undisturbed) | unit | `npx vitest run test/unknown-java-member.test.ts test/diagnostic-hierarchy.test.ts -x` (extend existing files; grep confirms both exist under `bbj-vscode/test/`) | Partial — both files exist; new cases needed |

### Sampling Rate
- **Per task commit:** the specific new/extended test file(s) for that task, via the Quick run
  command above.
- **Per wave merge:** `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2`
  (per the project's own documented whole-suite-hook-timeout learning — plain `npx vitest run`
  under load can report spurious `initializeWorkspace` `beforeAll` timeouts; judge on
  `numFailedTests`, not "failed suites").
- **Phase gate:** full suite green (`numFailedTests: 0`) before `/gsd-verify-work`, per this
  project's standing whole-suite regression-gate decision (`.planning/STATE.md`'s "Whole-suite
  regression gate" standing decision).

### Wave 0 Gaps
- [ ] A new test file exercising `CountingJavaInteropService` for SEC-03 (oversized/malformed DTO
      through `resolveClass()`/`resolveRaw()`) — no existing file does this for the *bounding*
      concern (only nested-class-naming and timeouts are covered today by
      `java-interop-nested-class-names.test.ts`/`java-interop-timeouts.test.ts`).
- [ ] A new test file for the shared D-01 Markdown-escape helper, plus extended assertions in
      whatever hover/completion test files already exist (`grep`-confirm exact names before
      writing — not enumerated exhaustively this session).
- [ ] A new test file (or an extension of an existing predicate-style file) for
      `isJavaQualifiedName`, independent of the completion/code-action integration tests.
- [ ] A new test file for the FIX-02 bare-package-name reproduction (Pattern 3), built on
      `CountingJavaInteropService` + `parseHelper`.
- [ ] No new framework/fixture install needed — Vitest, `parseHelper`, `CountingJavaInteropService`,
      and `JavaInteropTestService` all already exist in `bbj-vscode/test/`.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Type/length bounding of an untrusted peer DTO before it reaches the AST (D-02/D-03), a qualified-name allow-list regex before text is inserted into source (D-09) — both hand-rolled per D-01 (no schema-validation library is proposed; the DTO shape and limits are simple enough that a library would be over-engineering for this phase's scope, per D-01's plain-module mandate) |
| V6 Cryptography | no | — |
| V12 (Files/Output encoding, ASVS 4.0 numbering may vary) | yes | Output encoding: Markdown-control-character escaping before untrusted text is embedded in a Markdown document rendered by a client (D-06/D-07/D-08) — a textbook output-encoding control for a Markdown/HTML-adjacent sink |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Untrusted peer DTO with oversized/wrongly-typed fields exhausting memory or crashing the extension host (SEC-03) | Denial of Service | Bound every string field's length and type before copying onto the AST node; default missing arrays to `[]` (D-03) |
| Peer-supplied javadoc text containing Markdown/HTML control characters rendering as a clickable link or image in hover/completion (SEC-04) — a documentation-injection-into-UI pattern, the Markdown-sink analogue of stored XSS | Tampering / (client-side) Information Disclosure if the rendered link/image can exfiltrate via a tracking pixel | Escape at the render boundary, once, covering every string that reaches `MarkupContent` (D-06/D-07); VS Code's own `supportHtml=false` default is a second, independent layer (verified this session, not to be relied on alone) |
| Peer-supplied class candidate string containing `;`/newline/shell-adjacent characters inserted verbatim into a `use <fqn>` `TextEdit`, corrupting the source file or (in principle) injecting a second statement (SEC-05) | Tampering | Allow-list regex (`isJavaQualifiedName`) gating every `TextEdit`-building call site (D-09/D-10) — reject, don't sanitize, per D-10's "dropped silently, no sanitized variant" |
| A package name mistaken for a class name colliding with an existing package registration and silently losing its `$container`, only caught by a fallback assignment and a noisy `console.error` (FIX-02) | (mostly Reliability/Correctness, not a security boundary per se — no untrusted-input path relies on the log line) | Stop the caller from sending a package-shaped name into the class-shaped resolution path at all (D-12) — validate-before-use, applied to an internal caller rather than an external input |

## Sources

### Primary (HIGH confidence — read this session)
- `bbj-vscode/src/language/java-interop.ts` (full file, 1658 lines) — `resolveClass`,
  `storeJavaClass`, `extractPackageName`, `loadImplicitImports`, `resolveClassCandidatesBySimpleName`,
  `findClassCandidatesByPrefix`, `findClassCandidatesBySimpleName`, `buildCompleteClassIndex`,
  `canonicalJavaClassName`, `tryParseJavaDoc`
- `bbj-vscode/src/language/bbj-scope-local.ts` (relevant sections) — `computeLocalScopeParts`'s
  `isUse`/`isJavaTypeRef` branches, `tryResolveJavaReference`, `isPotentiallyJavaFqn`
- `bbj-vscode/src/language/bbj-scope.ts` (relevant sections) — `getScope`'s `JavaSymbol` case,
  `getGlobalScope`, `importedBBjClasses`/`importedClasses`
- `bbj-vscode/src/language/bbj-nodedescription-provider.ts` — `getFQNFullname`, `getClassRefNode`, `getClass`
- `bbj-vscode/src/language/bbj-document-validator.ts` (full file) — `LinkingErrorData`,
  `applyDiagnosticHierarchy`, `dropShadowedMemberLinkingDiagnostics`, `processLinkingErrors`,
  `toDiagnostic`, `BBjDocumentValidator` constructor
- `bbj-vscode/src/language/bbj-linker.ts` (full file) — `createLinkingError`, `doLink`, `getCandidate`
- `bbj-vscode/src/language/bbj-hover.ts` (relevant sections) — `getAstNodeHoverContent`,
  `tryParseJavaDoc`, `createMarkdownContent`, `documentationHeader`
- `bbj-vscode/src/language/bbj-completion-provider.ts` (relevant sections) —
  `completeAutoImportClasses`, `createReferenceCompletionItem`
- `bbj-vscode/src/language/bbj-code-action-provider.ts` (full file) — `createUseAction`,
  `unresolvedClassName`, `rankCandidates`
- `bbj-vscode/src/language/validations/check-unknown-java-member.ts` (full file) —
  `checkUnknownJavaMember`, `hasCertainReceiverType`, `isFullyResolvedJavaClass`
- `bbj-vscode/src/language/java-javadoc.ts` (full file) — `JavadocProvider.getDocumentation`,
  `loadJavadocFile`, `PackageDoc`/`ClassDoc`/`MethodDoc` shapes
- `bbj-vscode/src/language/bbj-ws-manager.ts` (relevant sections) — `tryInitializeJavaDoc`, javadoc
  root resolution (`joinPath(safeUri(this.bbjdir), 'documentation', 'javadoc')`)
- `bbj-vscode/src/language/bbj-module.ts` (relevant sections) — DI wiring for `DocumentValidator`,
  `Inferer`, `BBjAddedServices` type
- `bbj-vscode/src/language/bbj.langium` (relevant sections) — `Use`, `JavaTypeRef`, `Type` rules
- `bbj-vscode/src/language/generated/ast.ts` (relevant sections) — `JavaClass`, `JavaField`,
  `JavaMethod`, `JavaMethodParameter`, `DocumentationInfo` interfaces
- `bbj-vscode/src/language/interop-config.ts`, `config-path-resolver.ts` (headers) — D-01 pattern precedent
- `bbj-vscode/test/bbj-test-module.ts` (full file) — `JavaInteropTestService`, `createBBjTestServices`
- `bbj-vscode/test/counting-java-interop.ts` (full file) — `CountingJavaInteropService`,
  `createCountingInteropServices`, `backendLikeDto`
- `bbj-vscode/test/java-interop-nested-class-names.test.ts`,
  `bbj-vscode/test/java-interop-service.test.ts` (excerpts) — usage patterns for
  `CountingJavaInteropService`
- `bbj-vscode/test/imports.test.ts` (excerpt) — `parseHelper` + `{validation: true}` pattern that
  triggers scope computation/linking without a live socket
- `/opt/bbx/documentation/javadoc/*.json` (41 files, read via Node script this session) — D-04 measurement
- `.planning/phases/111-java-class-data-from-the-interop-peer/111-CONTEXT.md`,
  `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/ROADMAP.md` §Phase 111,
  `.planning/research/AUDIT-VERIFY-A-SECURITY.md` — project decisions and prior research

### Secondary (MEDIUM confidence)
- WebSearch: "vscode-languageclient protocolConverter asMarkdownString supportHtml hover" — confirmed
  `supportHtml` is passed from `clientOptions.markdown.supportHtml` and defaults false; corroborated
  by this repo's own `grep` (no `supportHtml`/`markdown:` configuration found in `src/extension.ts`).

### Tertiary (LOW confidence)
- General familiarity with Langium's `parseJSDoc(...).toMarkdown()` emitting standard Markdown
  link/inline-code syntax for `{@link}`/`{@code}` — not independently confirmed by reading Langium's
  own source this session (see Assumption A4).

## Metadata

**Confidence breakdown:**
- Standard stack: N/A — no new dependencies this phase.
- Architecture (D-11 caller trace, D-13/14 co-occurrence): HIGH — every claim traced to specific
  file:line, quoted verbatim, cross-checked against the grammar and the DI wiring.
- Pitfalls (test-double bypass, D-02 placement): HIGH — read both test doubles' full source and
  their own header comments explaining the exact concern this research surfaces.
- D-04 measurement: HIGH for the 41 files actually measured; explicitly LOW/ASSUMED for
  `java.lang`/`java.io`/`java.net`/`BBjAPI` specifically, which are absent from this environment's
  javadoc tree (see Open Question 1 and Assumption A1).
- D-06 VS Code HTML rendering: MEDIUM — corroborated by both a web search and a repo grep, but the
  IntelliJ/LSP4IJ side is unverified (Assumption A3); the locked D-06 decision to keep `<` escaped
  regardless makes this a corroborating, non-blocking finding either way.

**Research date:** 2026-09-26
**Valid until:** 30 days (stable, internal-hardening phase; the javadoc corpus measurement is tied
to this dev container's currently-installed BBj version and would need re-measuring if that
version changes materially before execution)
