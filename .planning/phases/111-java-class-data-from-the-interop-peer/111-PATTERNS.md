# Phase 111: Java Class Data from the Interop Peer - Pattern Map

**Mapped:** 2026-09-26
**Files analyzed:** 10 (1 new module + 9 modified) plus 5 test files (2 new, 3 extended)
**Analogs found:** 10 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `bbj-vscode/src/language/java-peer-guard.ts` (new, D-01 discretion on name) | utility (plain module) | transform (validate/bound/escape) | `bbj-vscode/src/language/config-path-resolver.ts` | exact |
| `bbj-vscode/src/language/java-interop.ts` (`resolveClass`, `storeJavaClass`) | service | transform (peer DTO → AST) | itself (existing function, same file) — extend in place | exact |
| `bbj-vscode/src/language/bbj-scope-local.ts` (`computeLocalScopeParts`, `isUse`/`isJavaTypeRef` branches) | service (scope computation) | transform | itself — extend in place | exact |
| `bbj-vscode/src/language/bbj-hover.ts` (`tryParseJavaDoc`, `createMarkdownContent`) | provider (LSP hover) | request-response | itself — extend in place | exact |
| `bbj-vscode/src/language/bbj-completion-provider.ts` (`completeAutoImportClasses`, `createReferenceCompletionItem`) | provider (LSP completion) | request-response | itself — extend in place | exact |
| `bbj-vscode/src/language/bbj-code-action-provider.ts` (`createUseAction`) | provider (LSP code action) | request-response | itself — extend in place | exact |
| `bbj-vscode/src/language/bbj-document-validator.ts` (`LinkingErrorData`, `processLinkingErrors`, `applyDiagnosticHierarchy` Rule 2) | middleware (validation/diagnostics) | transform | itself — extend in place (`instanceMemberAccess` flag is the direct precedent for the new `javaMemberAccess` flag) | exact |
| `bbj-vscode/src/language/bbj-linker.ts` (`createLinkingError` message text, used by D-15 rewrite) | service (linker) | transform | itself — extend/read in place | exact |
| `bbj-vscode/test/java-interop-peer-guard.test.ts` (new) | test | CRUD-ish (unit, DTO in → AST out) | `bbj-vscode/test/java-interop-nested-class-names.test.ts` | exact (same `CountingJavaInteropService` harness) |
| `bbj-vscode/test/java-package-name-collision.test.ts` (new, FIX-02) | test | event-driven (parse → console.error spy) | `bbj-vscode/test/java-interop-nested-class-names.test.ts` | exact |
| `bbj-vscode/test/javadoc-markdown-escape.test.ts` (new, SEC-04) | test | request-response (hover/completion output) | `bbj-vscode/test/unknown-java-member.test.ts` (parseHelper + `createBBjTestServices` pattern) | role-match |
| `bbj-vscode/test/java-qualified-name.test.ts` (new, SEC-05 predicate) | test | transform (pure predicate) | `bbj-vscode/test/config-path-resolver.test.ts` (implied by module pattern; same plain-function unit-test shape) | role-match |
| `bbj-vscode/test/code-action.test.ts` (extend, D-10) | test | request-response | itself | exact |
| `bbj-vscode/test/unknown-java-member.test.ts` (extend, D-13/14) | test | request-response | itself | exact |
| `bbj-vscode/test/bbj-document-validator.test.ts` (extend, Rule 2 exemption regression) | test | transform | itself | exact |

## Pattern Assignments

### `bbj-vscode/src/language/java-peer-guard.ts` (new plain module, D-01)

**Analog:** `bbj-vscode/src/language/config-path-resolver.ts` (and its sibling `interop-config.ts`)

**Header-doc / "single owner" pattern** (`config-path-resolver.ts` lines 1-24):
```typescript
/**
 * The single owner of "which file is the BBj config file" resolution.
 * ...
 * Kept free of Langium and editor imports (plain Node `fs`/`os`/`path` only) so it is
 * unit-testable with plain stubs and reusable from both the request handler and
 * `BBjWorkspaceManager`.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
```
Copy this shape exactly for the new module: a top-of-file doc comment naming what problem this
module is the *single owner* of (peer-DTO bounding + Markdown escaping + qualified-name check),
explicitly stating "no Langium or editor imports", and only plain-value imports (none needed here,
or only `node:` builtins if any).

**Named-constant export pattern** (`interop-config.ts` lines 18-22):
```typescript
/** The only definition of the default interop host in this repository. */
export const DEFAULT_INTEROP_HOST = 'localhost';
/** The only definition of the default interop port in this repository. */
export const DEFAULT_INTEROP_PORT = 5008;
```
Use identically for the D-04 length-limit constants:
```typescript
export const MAX_IDENTIFIER_LENGTH = 1024;
export const MAX_JAVADOC_LENGTH = 32768;
export const MAX_ERROR_LENGTH = 1024;
```

**Pure-function-with-injectable-deps pattern** (`config-path-resolver.ts` `resolveConfigPath`,
lines ~148-179): every validating/transforming function is a plain function taking primitive
inputs and returning a plain result object — no class, no `this`. Follow this shape for the DTO
guard (`boundJavaClassDto(raw): { class, dropped: string[] }`), the escape function
(`escapeMarkdown(text): string`), and `isJavaQualifiedName(fqn): boolean`.

**Defensive truncation-not-throw pattern** (`canonicalizeConfigPath`, lines 118-131): probes wrap
side-effecting calls in `try { ... } catch { fall back }`, never propagate. Mirror this for D-03's
"never throw, drop/truncate instead" rule.

---

### `bbj-vscode/src/language/java-interop.ts` — `resolveClass()` (SEC-03, D-02/D-03)

**Analog:** itself — extend the existing function in place; no separate analog file needed since
the guard is inserted directly into the established flow.

**Insertion point** (verbatim, `resolveClass()` current body):
```typescript
// Source: bbj-vscode/src/language/java-interop.ts (resolveClass, current)
protected async resolveClass(javaClass: Mutable<JavaClass>, token?: CancellationToken, _depth: number = 0): Promise<JavaClass> {
    javaClass.name = canonicalJavaClassName(javaClass.name);
    const className = javaClass.name
    if (this.resolvedClasses.has(className)) {
        return this.resolvedClasses.get(className)!;
    }
    ...
    javaClass.classes ??= [];
    javaClass.constructors ??= [];
    javaClass.deprecated = (javaClass as unknown as { isDeprecated?: boolean }).isDeprecated ?? false;

    this.storeJavaClass(javaClass, javaClass.packageName);
    if (javaClass.$container === undefined) {
        console.error(`Java class ${className} has no container, packageName: ${javaClass.packageName}`);
        javaClass.$container = this.classpath; // fallback to classpath
    }

    javaClass.fields ??= [];
    javaClass.methods ??= [];
    for (const field of javaClass.fields) { ... }
    ...
```
D-02's guard goes right after `canonicalJavaClassName` and **before** `storeJavaClass()` is
called — i.e. between the `javaClass.name = canonicalJavaClassName(...)` line and the
`this.storeJavaClass(javaClass, ...)` call. This is the existing `??= []` defaulting site
(P61-D2-003, visible above for `classes`/`constructors`/`fields`/`methods`) — D-03's new
per-field type/length checks extend this exact established pattern, they don't invent a new one.

**Existing `??= []` defaulting precedent** (P61-D2-003, same excerpt above): `javaClass.classes
??= []`, `javaClass.constructors ??= []`, `javaClass.fields ??= []`, `javaClass.methods ??= []`.
Copy this literal idiom for "non-array defaults to `[]`" (D-03).

**Existing boolean-coercion precedent** (same excerpt): `javaClass.deprecated = (javaClass as
unknown as { isDeprecated?: boolean }).isDeprecated ?? false;` — the exact model for D-03's
"non-boolean flags read as `false`" rule; already applied identically to `field.deprecated`,
`field.isStatic`, `method.deprecated`, `method.isStatic`, `constructor.deprecated`.

**Javadoc truncation insertion point** (Phase 2, `resolveClass` continuation):
```typescript
(method as Mutable<JavaMethod>).docu = {
    $type: 'DocumentationInfo',
    $container: method,
    javadoc: tryParseJavaDoc(doc.docu!),
    signature: signature
} as DocumentationInfo;
```
D-02's javadoc bound applies where `tryParseJavaDoc(doc.docu!)` result (or `doc.docu` itself
before parsing) is assigned into `method.docu` — call the new `truncateText(text, MAX_JAVADOC_LENGTH)`
helper here.

---

### `bbj-vscode/src/language/bbj-scope-local.ts` — FIX-02 (D-11/D-12)

**Analog:** itself — the two branches named by research, fixed with the same guard.

**Exact insertion points** (verbatim from research, `[VERIFIED]` this session):
```typescript
// Source: bbj-vscode/src/language/bbj-scope-local.ts:193-222
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
    await this.tryResolveJavaReference(javaClassName, this.javaInterop);
}
```
D-12's fix: before calling `tryResolveJavaReference(javaClassName, ...)` in **both** branches,
check whether `javaClassName` names a known Java package (not a class) and skip the call (or
route it through a package-lookup path instead) if so. Both branches call the identical
`tryResolveJavaReference` with a potentially-bare-package string — fix both, per the research's
explicit pitfall warning.

**Defence-in-depth companion** in `java-interop.ts`'s `storeJavaClass` (not shown here — read
`java-interop.ts` around the collision site per D-12): must not overwrite/mis-store when the leaf
name is already a `JavaPackage`.

---

### `bbj-vscode/src/language/bbj-hover.ts` / `bbj-completion-provider.ts` — SEC-04 (D-06/D-07/D-08)

**Analog:** the files' own existing `tryParseJavaDoc`/`createMarkdownContent`/`documentation:`
sites — extend in place, do not create parallel functions.

**Hover call sites** (`bbj-hover.ts`, confirmed by grep this session):
- line 121: `const javadocContent = documentation?.docu ? this.tryParseJavaDoc(documentation.docu) : ''`
- line 136: `return this.createMarkdownContent(javaDoc?.signature, javaDoc?.javadoc);`
- line 163: `protected createMarkdownContent(header: string | undefined, content: string | undefined = ''): string`
- line 168: `protected tryParseJavaDoc(comment: string)`
- line 182: `export function documentationHeader(node: AstNode): string | undefined`

Per D-06/D-07, the new `escapeMarkdown()` from the D-01 module wraps the *output* of
`tryParseJavaDoc` and any raw `javadoc`/`docu` string just before it is folded into
`createMarkdownContent`'s returned string (the render boundary) — not inside `tryParseJavaDoc`
itself unconditionally, since BBj-authored `/** */` docs must NOT be escaped (D-07). Two call
sites in this file need the escape; keep both, don't collapse without checking BBj-vs-Java origin
first (see D-07's explicit "not escaped" carve-out for BBj docs).

**Completion call sites** (`bbj-completion-provider.ts`, confirmed by grep this session):
- line 170: `documentation: { kind: 'markdown', value: \`Adds \\\`use ${fqn}\\\`\` }` (auto-import item — `fqn` here is a class name already gated by D-09/D-10, not raw javadoc; likely no escape needed, but D-08's fence-safety rule applies if a signature is embedded nearby)
- line 771-772: `createReferenceCompletionItem` — `const superImpl = super.createReferenceCompletionItem(...)`, wraps or overrides `documentation`/`detail` with javadoc-derived text; this is D-07's second `documentation:`-building site requiring the escape.

---

### `bbj-vscode/src/language/bbj-code-action-provider.ts` — SEC-05 (D-09/D-10)

**Analog:** itself, `createUseAction` plus `rankCandidates`/preferred-selection.

**Exact structure** (confirmed by grep this session):
```typescript
// line 41
const candidates = rankCandidates(await this.javaInterop.resolveClassCandidatesBySimpleName(simpleName));
// line 45
actions.push(this.createUseAction(document, diagnostic, fqn, index === 0));
// line 82
protected createUseAction(document: LangiumDocument, diagnostic: Diagnostic, fqn: string, preferred: boolean): CodeAction {
    ...
    isPreferred: preferred,
    ...
}
// line 104
function rankCandidates(fqns: string[]): string[] { ... }
```
D-10's gate: filter `candidates` (or check inside the loop building `actions`) with
`isJavaQualifiedName(fqn)` from the D-01 module **before** `createUseAction` is called, dropping
silently (debug log) on failure. Because `index === 0` decides `isPreferred` from the *post-filter*
array position, filtering before the loop naturally reassigns `isPreferred` to the next valid
candidate — no separate re-ranking logic needed, just filter first, then index.

`completeAutoImportClasses` in `bbj-completion-provider.ts` (line 141) needs the identical gate
before it builds its own `fqn`-based edit — same `isJavaQualifiedName` import, same "drop
silently, re-rank naturally by filtering before indexing" pattern.

---

### `bbj-vscode/src/language/bbj-document-validator.ts` — FIX-03 (D-13/D-14/D-15)

**Analog:** `instanceMemberAccess` on `LinkingErrorData` — the direct, named precedent for the new
`javaMemberAccess` flag.

**`LinkingErrorData` interface** (lines 28-38 per research, confirmed present in file):
```typescript
interface LinkingErrorData extends DiagnosticData {
    containerType: string;
    property: string;
    refText: string;
    instanceMemberAccess?: boolean;
}
```
Add `javaMemberAccess?: boolean;` (plus member name / owner simple name if the message rewrite
needs them stored, or compute them inline at rewrite time) alongside `instanceMemberAccess`.

**`processLinkingErrors` construction site** (lines 385-418 per research):
```typescript
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
Compute `javaMemberAccess` here the same way `instanceMemberAccess` is computed: `isMemberCall(container)
&& isJavaClass(typeInferer.getType(container.receiver))`. Requires widening the constructor param
type from `LangiumServices` to `BBjServices` and storing `services.types.Inferer` — see research's
D-13/14 section for the exact DI-wiring justification (`bbj-module.ts` factory closure already
receives `BBjServices`).

**Rule 2 exemption site** (lines 152-177, confirmed by grep):
```typescript
// line 152-159 area
// Rule 2: any Error-severity diagnostic → suppress all warnings/hints, except a downgraded
...
d => d.severity === DiagnosticSeverity.Error || isDowngradedSyntaxWarning(d)
...
// line 173-177
const downgradedWarningCount = result.reduce((count, d) => count + (isDowngradedSyntaxWarning(d) ? 1 : 0), 0);
...
if (!isDowngradedSyntaxWarning(d)) return true;
```
Add the new predicate (e.g. `isJavaMemberAccessWarning(d)`, reading `d.data?.javaMemberAccess`)
next to `isDowngradedSyntaxWarning` in both the Rule 2 filter condition and the downgraded-count
reduction — same two-site pattern, same style of predicate function (defined near
`isDowngradedSyntaxWarning` in this file).

**D-15 message rewrite location:** `processLinkingErrors`, using the same `[in ...]` suffix
extraction already used one function away:
```typescript
// Source: bbj-vscode/src/language/bbj-document-validator.ts:427 (extractCyclicReferenceRelatedInfo)
const sourceMatch = message.match(/\[in ([^\]]+)\]/);
```
Rebuild `linkingError.message` as `'<member>' is not a known method or field of
<OwnerSimpleName>` (or `Cannot resolve '<member>'`) + the same `[in ...]` suffix, only when
`javaMemberAccess` is true — before it reaches `this.toDiagnostic('error', linkingError.message, info)`.
Owner-simple-name extraction follows the existing `java-interop.ts:1247` idiom:
`javaClass.name.split('.').pop() ?? javaClass.name`.

**`bbj-linker.ts createLinkingError`** (confirmed by grep this session, lines ~145-151):
```typescript
override createLinkingError(refInfo: ReferenceInfo): LinkingError {
    const error = super.createLinkingError(refInfo);
    const sourceInfo = this.getSourceLocation(refInfo);
    if (sourceInfo) {
        error.message = `${error.message} [in ${sourceInfo}]`;
    }
    return error;
}
```
This is where the `[in file:line]` suffix originates (D-15's "kept" suffix) — no change needed
here; D-15's rewrite happens downstream in `processLinkingErrors`, not here, so this base message
(Langium's default "Could not resolve reference to NamedElement...") is simply discarded/replaced
for the flagged case, suffix preserved.

---

## Shared Patterns

### Plain-module-with-no-editor-imports (D-01)
**Source:** `bbj-vscode/src/language/config-path-resolver.ts` (full file), `interop-config.ts` (header)
**Apply to:** the single new `java-peer-guard.ts` (or whatever name D-01 discretion picks) — one
module, no Langium/vscode imports, JSDoc header naming it the "single owner", plain exported
constants + pure functions, unit-testable with plain values.

### `??=` array defaulting + `?? false` boolean coercion (P61-D2-003)
**Source:** `java-interop.ts` `resolveClass()`, lines around `javaClass.fields ??= []` /
`field.deprecated = (...) ?? false`
**Apply to:** every D-03 non-array/non-boolean field default — extend the existing idiom, don't
introduce a new coercion style.

### `instanceMemberAccess`-style flag on `LinkingErrorData`
**Source:** `bbj-document-validator.ts` `LinkingErrorData` interface + `processLinkingErrors`
**Apply to:** the new `javaMemberAccess` flag (D-13) and its Rule 2 exemption (D-14), mirroring
`isDowngradedSyntaxWarning`'s two-site filter pattern exactly.

### `CountingJavaInteropService` test harness (not `JavaInteropTestService`)
**Source:** `bbj-vscode/test/counting-java-interop.ts` (full file), used by
`bbj-vscode/test/java-interop-nested-class-names.test.ts`
**Apply to:** every SEC-03 and FIX-02 regression test — `JavaInteropTestService`
(`test/bbj-test-module.ts`) overrides `resolveClassByName` itself and bypasses
`resolveClass()`/`storeJavaClass()` entirely; it must NOT be used for these two requirements.
```typescript
import { createCountingInteropServices } from './counting-java-interop.js';
const { interop } = createCountingInteropServices();
interop.scripts.set('java.io.File', () => ({
    packageName: 'java.io', isDeprecated: false, fields: [], methods: [], constructors: [],
}));
await interop.resolveClassByName('java.io.File');
```

### `parseHelper` + `{ validation: true }`, never `DocumentBuilder.build`
**Source:** `bbj-vscode/test/unknown-java-member.test.ts` lines 1-20 (`createBBjTestServices`,
`parseHelper<Model>(services.BBj)(content, { validation: true })`), `bbj-vscode/test/code-action.test.ts`
lines 1-26 (same pattern, plus a `linkingDiagnostics()` helper filtering `d.data?.code === DocumentValidator.LinkingError`)
**Apply to:** every new/extended test file in this phase. Copy the `linkingDiagnostics()`/
`diagnosticsForMember()` helper-function style from `unknown-java-member.test.ts` for FIX-03 tests,
and the `codeActionsFor()` helper style from `code-action.test.ts` for SEC-05 tests.

## No Analog Found

None — every file in scope either extends an existing function in an already-identified file, or
is a new file with a clean analog (`config-path-resolver.ts` for the D-01 module,
`java-interop-nested-class-names.test.ts` for the two new `CountingJavaInteropService`-based test
files).

## Metadata

**Analog search scope:** `bbj-vscode/src/language/`, `bbj-vscode/test/` (targeted grep + read, per
required_reading file list and canonical_refs in 111-CONTEXT.md/111-RESEARCH.md — both already
name exact files/line ranges, so this pass verified and extracted rather than performing a broad
discovery search).
**Files scanned:** `config-path-resolver.ts`, `interop-config.ts`, `java-interop.ts` (resolveClass
region), `bbj-scope-local.ts` (grep-confirmed via research quotes), `bbj-hover.ts`,
`bbj-completion-provider.ts`, `bbj-code-action-provider.ts`, `bbj-document-validator.ts`,
`bbj-linker.ts`, `counting-java-interop.ts`, `unknown-java-member.test.ts`, `code-action.test.ts`.
**Pattern extraction date:** 2026-09-26
