# Phase 113: Composer Webview Hardening & Consolidation - Research

**Researched:** 2026-09-27
**Domain:** VS Code webview message-handling security, cross-IDE composer domain-logic consolidation (TypeScript + Java/Swing)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (user ruling, amends SEC-10 and success criterion 1):** All **six** composer webviews
  are covered, not four: msgbox, addWindow, addChildWindow, SETOPTS (`setopts-composer-webview.ts`),
  SETOPTS tristate (`setopts-tristate-webview.ts`) and CVS (`cvs-composer-webview.ts`). All six use
  the same `switch (msg.type)` handler that runs `build()` and a WorkspaceEdit. A test posts a
  wrong-shaped message to each. REQUIREMENTS.md SEC-10 and ROADMAP.md Phase 113 criterion 1 were
  amended on 2026-09-27.
- **D-02:** A message of the wrong shape is **dropped silently**, with no toast and no log. Only
  a broken or compromised webview script can send one. This matches the existing
  `if (!r.valid) break` guard.
- **D-03:** The check covers the **full payload shape**. The `type` must be one of the panel's
  known types. For payload-carrying types (`change`, `insert`, `apply`), every field of the
  panel's `Selection` must have the right runtime type: strings are strings, numbers are finite
  integers, booleans are booleans, and arrays hold the right element type. Anything else is
  dropped before `build()` sees it.
- **D-04:** The guard shape is a set of **small shared type-check primitives** in one new module
  (for example `isString`, `isFiniteInt`, `isIntArray`, `isStringArray`, `isPlainObject`) plus a
  **per-composer `isXxxMessage()` guard** next to that composer's `Selection` type. There is no
  schema library, so no new runtime dependency is added to the extension bundle. Planner's
  choice: the guard can be applied in each handler, or passed as an optional argument to
  `registerPanelMessageHandler`.
- **D-05 (user ruling, amends SEC-11 and success criterion 2):** The rule covers **msgbox and
  CVS**. Both have the same unvalidated `assignTo` field, which today is placed straight into
  `${assignTo} = CALL(...)`. Both use one shared validator, parameterised by result type.
- **D-06:** Valid targets depend on the result type:
  - msgbox, which returns a number: a plain numeric variable (`ret`) or an object variable
    (`ret!`), or an array element of one (`r[1]`, `r[i+1]`) whose index passes
    `validateBbjExpression`.
  - CVS, which returns a string: `s$`, `s!` or a string array element (`s$[i]`).
  - The validator rejects the wrong-type suffix (for example `$` for msgbox), quotes,
    operators, `=`, `;`/`:` statement separators and anything else.
- **D-07 (user ruling):** `assignTo` is **required** for msgbox and CVS when the field is shown,
  which means a new insert at the cursor. An empty value marks the preview invalid.
- **D-08:** The required rule applies **only to new inserts**. In edit mode (a Code Action
  rewrites an existing call) and completing mode (composing into an unfinished call) the field
  stays hidden and `assignTo` stays omitted. The line keeps its own left-hand side, and those
  flows do not change. The msgbox prefill `ret!` stays. CVS gets a prefill such as `s$`, the
  exact name being the planner's choice. The "(optional)" label text is removed in both IDEs.
- **D-09:** An invalid or empty `assignTo` is handled **like every other field**: an inline
  per-field error message, the preview marked invalid (`valid: false`), and Insert disabled. The
  check lives in the shared LS preview logic (`msgboxPreview`, `cvsPreview`), so both IDEs get
  the same verdict. Consequence for IntelliJ: this is small Java UI work beyond class docs. A new
  `assignToError` field is added to the preview result model in `ComposerModels.java` and its JSON
  boundary test. `MsgboxComposerDialog` and `CvsComposerDialog` show that error and drop
  "(optional)" from their labels.
- **D-10:** Shared helpers go in **one small module per concern**, following the existing
  `webview-nonce.ts` / `webview-panel-lifecycle.ts` style:
  - `src/webview-csp.ts`: builds the CSP array/string. All six webviews use it.
  - `src/composer-call-scanner.ts`: `scanArgs`, `trimmedRange` and a generic call locator.
  - A shared window-composer UI module: `titleArg` and the shared addWindow/addChildWindow
    code-action helper.
  - The message-guard primitives module from D-04.
  File names are indicative, and the planner may adjust them. There is no `src/composer/` folder
  move.
- **D-11:** The call locator becomes **one generic locator parameterised by the function name**.
  The existing exported `find*Calls` / `parse*CallOnLine` / `find*CallAt` names for msgbox,
  addWindow, addChildWindow and CVS stay as one-line wrappers, so callers and test assertions do
  not change (criterion 4). The private `scanArgs` copy in `msgbox-composer.ts` is removed.
- **D-12:** CVS and the SETOPTS tristate panel **join the consolidation**. All six webviews use
  the shared CSP helper, and CVS uses the shared scanner and locator, so no copies are left.
- **D-13:** `composer-commands.ts` moves from `src/language/` to **`src/composer-commands.ts`**.
  `src/language/main.ts` imports `'../composer-commands.js'` and the test import path is
  updated. It remains LS-side code bundled into `main.cjs`.
- **D-14:** The TEST-10 tests are written **first**. They execute the addWindow, addChildWindow
  and SETOPTS `*-composer-ui.ts` code actions, code lenses and commands, using
  `test/msgbox-composer-ui.test.ts`'s mocked-`vscode` harness as the template. They pass before
  and after the consolidation, with no assertion changes (criterion 3/4).

### Claude's Discretion

- Where the message guard is applied (D-04) and the exact module and file names (D-10).
- The CVS `assignTo` prefill value (D-08).
- How the tests post a wrong-shaped message (fake panel with a captured `onDidReceiveMessage`
  handler, as `test/webview-panel-lifecycle.test.ts` does).

### Deferred Ideas (OUT OF SCOPE)

None: the discussion stayed within phase scope. CVS and tristate were brought into scope
(D-01, D-05, D-12), not deferred.

**Reviewed todos, explicitly NOT folded into this phase:**
- IntelliJ sends javaInteropHost/javaInteropPort but the LS reads interopHost/interopPort — keyword match only, unrelated.
- linking.test.ts interop failures surviving class warm-up — Phase 116 (TEST-05).
- Phase 97 code-review follow-ups (download progress, weak guards) — Phase 114 (FIX-04).
- Peer-supplied Java names breaking the signature-help fence / snippet variables — a different provider, not composers.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-10 | All six composer webviews validate postMessage payload shape before `build()`/WorkspaceEdit (#604, amended) | Exact `type` + payload shapes for all six webviews captured below (Code Examples); D-04 guard-module design; existing `discoverPanelModules()` test pattern recommended as the "one test posts to each" vehicle |
| SEC-11 | msgbox/CVS validate `assignTo` like every other field; required on new insert (#626, amended) | `validateStringField`/`validateBbjExpression` precedent in `msgbox-composer.ts`; `msgboxPreview`/`cvsPreview` extension points identified; IntelliJ `ComposerModels.java`/dialog changes identified with line numbers |
| TEST-10 | addwindow/addchildwindow/setopts `*-ui.ts` files invoked (not just mocked) by tests (#628) | Confirmed test gap via grep: `registerAddWindowComposer`/`registerAddChildWindowComposer`/`registerSetOptsComposer` are mocked in every test that imports them; `setopts-in-code-ui.test.ts`'s "command routing" describe block is the working precedent to copy |
| REF-03 | `composer-commands.ts` lives outside `src/language/` (#582) | All three call sites identified (main.ts import, composer-commands.test.ts import, a hard-coded file-path read in setopts-in-code-request.test.ts) |
| REF-07 | Webview CSP array built by one shared helper (#533) | CSP array confirmed byte-identical across all six webviews, with line citations |
| REF-08 | Call-locator + argument-scanner logic exists once (#534) | Existing sharing (addWindow → addChildWindow/CVS) and remaining duplicate (`msgbox-composer.ts`'s private `scanArgs`) mapped; CVS's stricter call-boundary regex flagged as a generalization hazard |
| DOC-01 | `AddWindowComposerDialog`/`ComposerLauncher` class docs describe edit-in-place + all six kinds (#595) | Stale doc comments located and quoted; `ComposerLauncher.Kind` enum confirmed to already have 6 values |
</phase_requirements>

## Summary

This phase touches no new technology: it hardens and de-duplicates an existing, mature composer
subsystem (six VS Code webview panels + an LS-side pure-logic layer consumed by an IntelliJ Swing
client) that was built incrementally across ~15 prior phases (#426, #430, #473, #474, #475, #648,
#649, #650, and several review follow-ups). Every file named in scope was read this session. The
codebase already has a well-established house style for exactly this kind of work — small,
single-purpose modules with no `vscode` runtime import (`webview-nonce.ts`,
`webview-panel-lifecycle.ts`, `java-peer-guard.ts`) — and this phase's four new/relocated modules
(D-04 message guards, D-10 CSP/scanner/window-UI helpers) should follow that same shape.

The two functional changes (SEC-10 message-shape validation, SEC-11 `assignTo` validation) are
additive guards layered onto code that already has an almost-identical guard for a different
concern: every webview's `insert`/`apply` handler already does `if (!r.valid) break` after
computing a preview from the (currently unchecked) payload. SEC-10 adds a **shape** check that
must run before that computation even starts; SEC-11 adds a new failure mode to the **value**
validation the preview functions already return.

The consolidation (REF-03/07/08) is genuinely low-risk: the CSP array is provably byte-identical
across all six webview files, and three of the four composer domain modules (addWindow,
addChildWindow, CVS) already share `scanArgs`/`trimmedRange` — only `msgbox-composer.ts` still
carries a private copy. The one real hazard is CVS's call-locator regex, which (unlike the other
three) uses a negative lookbehind to exclude method-call syntax (`obj.cvs(`); a naive
generalization that drops this rule would silently change CVS's matching behavior. This is
called out below as the phase's primary pitfall.

TEST-10 is not "add missing tests" in the abstract — a `grep` this session proved that
`registerAddWindowComposer`, `registerAddChildWindowComposer` and `registerSetOptsComposer` are
mocked to a no-op in **every** test file that imports them (extension-activation.test.ts,
config-file-association.test.ts, em-login-username.test.ts, etc.), so their `CodeActionProvider`
classes and `vscode.commands.registerCommand` callbacks have never once executed under test. The
codebase already contains the exact right template for fixing this:
`test/setopts-in-code-ui.test.ts`'s `describe('registerSetOptsInCodeComposer / command routing')`
block, which calls the real `register...` function unmocked and drives the registered command/
Code-Action-provider callback directly.

REF-03's file move is mechanically simple but has three call sites, not two — a source-text
`fs.readFileSync(path.join(..., 'src', 'language', 'composer-commands.ts'))` assertion inside
`test/setopts-in-code-request.test.ts` is easy to miss because it is not an import statement.

DOC-01 is real, not paperwork: `AddWindowComposerDialog`'s class doc literally says
"Create flow only for now" while its own constructor accepts an `editMode` flag and toggles a
title between "Compose addWindow" and "Configure window flags" — the doc has been stale since
edit-in-place was added. `ComposerLauncher`'s class doc says "both composer UIs" while its
`Kind` enum already has six values and a six-way `switch`.

**Primary recommendation:** Do the TEST-10 tests first (as D-14 requires) using
`setopts-in-code-ui.test.ts`'s command-routing block as the template, since they lock in current
behavior for the `*-ui.ts` files the consolidation is about to touch. Do SEC-10/SEC-11 next
(additive, no consolidation dependency). Do the REF-03/07/08 consolidation last, verified by the
now-passing TEST-10 tests plus every existing composer suite with zero assertion changes.

## Architectural Responsibility Map

This is an editor-extension architecture, not a web app; tiers are the analogous boundaries in
that world.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Webview message shape validation (SEC-10) | VS Code Extension Host (`*-webview.ts`, Node process) | VS Code Webview (sandboxed HTML/JS — cannot be trusted to self-police) | The extension host is the trust boundary: the webview is untrusted input, exactly like a browser tab talking to a server process |
| `assignTo` value validation (SEC-11) | Language Server (shared pure logic: `msgboxPreview`/`cvsPreview` in `../msgbox-composer.ts` / `../cvs-composer.ts`) | IntelliJ Client (Swing dialogs must render the new `assignToError` field) | The LS/shared-module layer is the existing single source of truth both IDEs already read through (`composer-commands.ts`'s file-header convention) |
| CSP / call-locator / scanner consolidation (REF-07/08) | VS Code Extension Host (webview HTML generation + composer domain modules) | — | Purely a VS Code-side concern; IntelliJ never renders these webviews or runs this scanning code |
| `composer-commands.ts` relocation (REF-03) | Language Server (bundled into `main.cjs`, unchanged responsibility) | — | A file-location refactor with zero behavior change; still LS-side code |
| Composer UI wiring test coverage (TEST-10) | VS Code Extension Host (Code Action providers, command registrations) | — | The gap is entirely in how the extension host's own command/action wiring is tested |
| IntelliJ class docs (DOC-01) | IntelliJ Client (Swing `AddWindowComposerDialog`, `ComposerLauncher`) | — | Documentation-only change scoped to the desktop client |

## Project Constraints (from CLAUDE.md)

- All composer work lives under `bbj-vscode/`; run `npm test` / `npx vitest run <file>` from
  inside `bbj-vscode/` (cwd matters — MEMORY: `vitest needs cwd = bbj-vscode`, relative-fixture
  tests ENOENT from repo root).
- Never edit `src/language/generated/**` (Langium-generated) — not touched by this phase (no
  grammar changes).
- Shell rules for every command run during planning/execution: absolute paths only; never
  `cd X && grep/cat/find`; use `Grep`/`Glob`/`Read` tools first, bash `grep -n` scoped to exact
  files/subtrees otherwise; never `git add -A`/`git add .` — stage exact paths (`composer-commands.ts`'s
  old and new path both, plus every file touched by the move).
- MEMORY: forbid `--reporter=basic` in any vitest invocation a plan writes — not a valid vitest
  4.1.10 reporter name.
- MEMORY: register-check the source diff before push — grep the diff for planning identifiers
  (plan/D-xx/C-xx tokens) before closing the phase; issue numbers (`#604`, `#626`, ...) are fine
  and already used throughout this codebase's own comments.
- MEMORY: `lib .bbl/.ts manual sync` and other unrelated house rules do not apply to this phase's
  files.

## Standard Stack

No new external dependency of any kind is introduced by this phase (D-04 is explicit: "no schema
library, so no new runtime dependency is added to the extension bundle"). The existing stack is
unchanged.

### Core (already in use, verified from `package.json`)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^4.1.10 [VERIFIED: bbj-vscode/package.json:725] | Test runner for every new/changed test file | Already the project's only test runner |
| typescript | ^5.8.3 [VERIFIED: bbj-vscode/package.json:723] | Compiles all new/changed `.ts` modules | Already the project's language |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled `isXxxMessage()` guards (D-04) | zod / io-ts / ajv schema validation | Explicitly rejected by the user (D-04): adds a runtime dependency to a bundle that ships to every VS Code install for six tiny fixed-shape messages; the codebase's own `java-peer-guard.ts` precedent (hand-rolled `isPlainObject`, no library) already demonstrates the house style for exactly this kind of guard |

**Installation:** None — no `npm install` needed for this phase.

## Package Legitimacy Audit

Not applicable. This phase adds, upgrades, or removes zero npm/PyPI/cargo packages (locked by
D-04). No `package.json` dependency changes are expected; if a plan drafts one, that is a
deviation from CONTEXT.md and should be flagged, not silently added.

## Architecture Patterns

### Current Message Flow (all six webviews, before this phase)

```
┌─────────────────────────┐        postMessage(msg)         ┌──────────────────────────────────┐
│  Webview (sandboxed JS)  │ ───────────────────────────────▶│  Extension Host (Node process)    │
│  <script nonce="...">    │                                 │  registerPanelMessageHandler(     │
│  vscode.postMessage(...) │                                 │    panel, async (msg) => {        │
└─────────────────────────┘                                 │      switch (msg.type) {          │
             ▲                                                │        case 'change': build(...) │──▶ postMessage('preview')
             │           postMessage('preview'/'init')        │        case 'insert'/'apply':     │
             └────────────────────────────────────────────────│          const r = build(...)    │
                                                                │          if (!r.valid) break     │──▶ (value guard; UNCHANGED)
                                                                │          WorkspaceEdit + apply   │──▶ document mutation
                                                                │        case 'cancel': dispose()  │
                                                                │      }                            │
                                                                │    })                             │
                                                                └──────────────────────────────────┘
```

**No shape check exists today between "message arrives" and `switch (msg.type)` / `build(msg.payload)`.**
A `msg` that is `null`, a string, or an object with `type: 'insert'` but a `payload` whose fields
are wrong-typed (e.g. `flags: "not an array"`) reaches `build()` today, which will either throw
inside the extension host or silently coerce garbage into the generated statement.

### Target Message Flow (after SEC-10)

```
┌─────────────────────────┐        postMessage(msg)         ┌────────────────────────────────────────┐
│  Webview (sandboxed JS)  │ ───────────────────────────────▶│  Extension Host                        │
└─────────────────────────┘                                 │  registerPanelMessageHandler(panel,     │
                                                              │    async (msg) => {                     │
                                                              │      if (!isXxxMessage(msg)) return;  ──┼──▶ dropped silently (D-02) — no toast/log
                                                              │      switch (msg.type) { ... }          │
                                                              │    })                                   │
                                                              └────────────────────────────────────────┘
```
`isXxxMessage(msg)` is one function per webview (D-04), built from shared primitives in a new
module, checking: `msg` is a plain object; `msg.type` is a string in that panel's known-types
list; when `msg.type` carries a payload (`change`/`insert`/`apply`) AND `msg.payload` is present,
every field of that panel's `Selection` has the declared runtime type. `payload` being entirely
absent for `change`/`insert` is already handled by existing `if (msg.payload)` / `if (!msg.payload) break`
code and must stay legal (only a *present-but-malformed* payload is new territory).

### Recommended Project Structure (new/moved files — names are indicative per D-10)
```
bbj-vscode/src/
├── webview-nonce.ts              # existing — style precedent
├── webview-panel-lifecycle.ts    # existing — registerPanelMessageHandler lives here
├── webview-csp.ts                # NEW (D-10/REF-07) — the one CSP array/string builder
├── composer-call-scanner.ts      # NEW (D-10/REF-08) — scanArgs, trimmedRange, generic call locator
├── webview-message-guard.ts      # NEW (D-04/SEC-10) — isString/isFiniteInt/isIntArray/isStringArray/isPlainObject + 6 isXxxMessage()
├── addwindow-composer-ui-shared.ts  # NEW or folded into an existing file (D-10) — titleArg + shared addWindow/addChildWindow code-action helper
├── composer-commands.ts          # MOVED from src/language/ (D-13/REF-03)
├── msgbox-composer.ts            # + assignTo validator (SEC-11), scanArgs import replaces private copy (REF-08)
├── cvs-composer.ts               # + assignTo validator call in cvsPreview (SEC-11)
└── language/
    └── main.ts                   # import path updated: '../composer-commands.js'
```

### Pattern: Discovery-based "every panel module" test (existing precedent, recommended vehicle for SEC-10's "a test posts one to each")

**What:** `test/webview-panel-lifecycle.test.ts` already contains a test that does NOT hard-code
the list of six webview modules — it scans `src/**/*.ts` for `createWebviewPanel(` calls, then
for every discovered module calls its exported `open...Panel` function with a fake panel and
asserts lifecycle discipline.

**When to use:** SEC-10's success criterion says "a test posts one to each" of the six webviews.
Writing this as six independent, hand-listed test blocks works, but a discovery-based test (like
the existing one) is more idiomatic for this codebase and automatically covers a future seventh
composer.

**Example (existing, verbatim):**
```typescript
// Source: bbj-vscode/test/webview-panel-lifecycle.test.ts:208-213
const CREATE_WEBVIEW_PANEL_CALL = /\bcreateWebviewPanel\s*\(/;

function discoverPanelModules(): string[] {
    return collectTsFiles(SRC_DIR).filter((filePath) => CREATE_WEBVIEW_PANEL_CALL.test(readStripped(filePath)));
}
```
A new SEC-10 test (in this file or a sibling) can reuse this discovery, open each panel, capture
its message handler, post one malformed message (e.g. `{ type: 'insert', payload: { flags: 'nope' } }`
or `{ type: 'not-a-real-type' }`), and assert `applyEditMock`/the panel's `dispose` were never
called (msgbox/addwindow/addchildwindow/cvs) or the sender/`applyIfUnchanged` mock was never
called (setopts/tristate, whose `apply` path differs — see Pitfall 3 below).

### Anti-Patterns to Avoid
- **Re-validating catalog membership in the shape guard:** D-03 is explicit that the guard checks
  *runtime type* only (string is a string, number is a finite integer), not that a flag value is
  a documented bit. The domain already relies on undocumented/"preserved" bits surviving a
  round-trip (`preservedFlagBits`, `unknownBits()` in `addwindow-composer.ts`); a guard that
  rejects an unrecognized-but-well-typed bit value would silently break that existing feature.
- **Losing CVS's call-boundary strictness during REF-08's generalization** — see Pitfall 1.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Runtime shape validation of a `postMessage` payload | A generic deep-schema validator, or per-field ad hoc `typeof` checks scattered inline in each `switch` | The `isXxx` primitives module (D-04) + one `isXxxMessage()` per composer, following `java-peer-guard.ts`'s existing hand-rolled-guard style | The domain has exactly 6 fixed, small, non-nested shapes — a general schema library is overkill and explicitly rejected (D-04); scattering ad hoc checks inline would re-duplicate the exact kind of logic this phase exists to consolidate |
| BBj variable-name / array-subscript validation for `assignTo` | A new expression parser | Compose the existing `validateBbjExpression` (structural: balanced quotes/parens, required-ness) with a narrow identifier+sigil regex for the *base* name, and only allow one `[...]` subscript whose *contents* run through `validateBbjExpression` again | `validateBbjExpression` already solves "is this a well-formed BBj expression fragment" (used for array-index checks in the doc comments' precedent: "whose index passes `validateBbjExpression`", D-06) |

**Key insight:** every piece of domain logic this phase needs (call location, argument scanning,
structural expression validation, CSP construction) already exists in this codebase in at least
one place. The work here is almost entirely *consolidation and gap-closing*, not new algorithm
design — the two exceptions are the message-shape guard primitives (new but tiny) and the
`assignTo` semantic validator (new but explicitly scoped in D-06).

## Runtime State Inventory

This phase is a source-file relocation (`composer-commands.ts`) plus additive validation/tests —
not a rename of any externally-visible identifier, stored key, or service configuration.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — `composer-commands.ts`'s exported LSP method names (`bbj/composer/*`) are unchanged; only its file path moves | None |
| Live service config | None — no n8n/Datadog/Tailscale/Cloudflare-style external config references this file by path | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | None — `esbuild.mjs` bundles by entry point (`src/language/main.ts`) and follows imports transitively; it has no glob or path assumption tied to `src/language/composer-commands.ts`'s current location [VERIFIED: bbj-vscode/esbuild.mjs:8] `entryPoints: ['src/extension.ts', 'src/language/main.ts'],` — moving the file needs no esbuild/tsconfig change beyond the import statements themselves |

**Three source-level references to the moving file were found and must all move together (not two):**
1. `bbj-vscode/src/language/main.ts:17` — `import { registerComposerRequests } from './composer-commands.js';` → becomes `'../composer-commands.js'`.
2. `bbj-vscode/test/composer-commands.test.ts:2` — `import { composerHandlers, registerComposerRequests } from '../src/language/composer-commands';` → becomes `'../src/composer-commands'`.
3. `bbj-vscode/test/setopts-in-code-request.test.ts:512-514` — a **hard-coded file-path read**, not an import: `fs.readFileSync(path.join(__dirname, '..', 'src', 'language', 'composer-commands.ts'), 'utf-8')` inside a test titled `'neither new method-name literal appears inside composer-commands.ts (the pre-services registry)'`. This is easy to miss because an IDE "move file" refactor only updates import statements — this test will throw `ENOENT` (not silently pass) if not updated, so it will fail loudly, but the plan should still explicitly list it as a task.

## Common Pitfalls

### Pitfall 1: Generalizing the call locator must not lose CVS's stricter boundary regex
**What goes wrong:** msgbox/addWindow/addChildWindow all locate calls with a plain
`/keyword\s*\(/gi` regex. CVS uses a stricter one with a negative lookbehind:
```typescript
// Source: bbj-vscode/src/cvs-composer.ts:144
const CVS_CALL_BOUNDARY_SOURCE = String.raw`(?<![A-Za-z0-9_.])cvs\s*\(`;
```
This exists specifically to exclude a method call like `obj.cvs(` or an identifier ending in
`xcvs(` from being mistaken for the global `CVS()` function (the comment at that line: `` `cvs(` not preceded by an identifier character or `.` — keeps longer names and method calls out. ``).
**Why it happens:** D-11's "one generic locator parameterised by the function name" is easy to
implement by just interpolating the keyword into one shared plain regex template, silently
dropping CVS's boundary rule (or, the opposite mistake, silently adding a boundary rule the other
three composers never had and don't need, which would change nothing observable today but is
still a spec violation of "no assertion changes").
**How to avoid:** Parameterize the generic locator by **two** things, not one: the keyword AND
the regex source (or a boundary flag) used to build the "found call start" pattern; each composer
supplies its own existing regex source unchanged. Only the *scanning loop* (regex.exec loop →
`buildCallInfo` → innermost-match `reduce`) and `trimmedRange`/`scanArgs` need to be shared
verbatim; the boundary regex per keyword must stay composer-specific.
**Warning signs:** Any test in `cvs-composer.test.ts` that currently passes for a line like
`obj.cvs("x", 1)` (expecting no match) starting to match after the refactor, or the reverse for
msgbox/addWindow/addChildWindow suddenly requiring a non-identifier boundary they never needed.

### Pitfall 2: The SETOPTS (config.bbx) webview's `apply` handler has no `if (!r.valid) break` today — don't conflate this gap with SEC-10's shape guard
**What goes wrong:** msgbox/addWindow/addChildWindow/CVS all guard their write path with
`if (!r.valid) break;` before applying a WorkspaceEdit. `setopts-composer-webview.ts`'s `apply`
case does not:
```typescript
// Source: bbj-vscode/src/setopts-composer-webview.ts:107-131 (excerpt)
case 'apply': {
    if (!msg.payload) break;
    const r = build(msg.payload);
    const edit = new vscode.WorkspaceEdit();
    if (target) { /* ... */ } else if (insertUri !== undefined && insertLine !== undefined) { /* ... */ }
    await applyIfUnchanged(guard, () => vscode.workspace.applyEdit(edit));
    panel.dispose();
    break;
}
```
There is no `if (!r.valid) break;` line — the webview's own `apply` button is `disabled` on an
invalid raw-tail (`$('apply').disabled = !m.valid;`), but nothing stops a forced/compromised
`apply` message from writing an invalid line to the document.
**Why it happens:** This is a pre-existing, narrower value-validity gap, not a shape-validity
gap. It is easy to accidentally "fix" while touching this file for SEC-10/REF-07, expanding scope
beyond what CONTEXT.md decided.
**How to avoid:** SEC-10's guard is purely about message *shape* (D-03) and must be added
regardless. Whether to also add the missing `if (!r.valid) break;` value guard is **not** decided
by CONTEXT.md and should be raised as an open question / separate decision, not silently bundled
into this phase's commits.
**Warning signs:** A diff that touches `setopts-composer-webview.ts`'s `apply` case body beyond
adding the shape guard line.

### Pitfall 3: The SETOPTS tri-state webview's `change`/`apply` are async LSP round-trips, not a local `build()`
**What goes wrong:** D-01's phrasing ("all six use the same `switch (msg.type)` handler that runs
`build()` and a WorkspaceEdit") is true of five of six panels, but `setopts-tristate-webview.ts`
computes its preview by calling out to the language server:
```typescript
// Source: bbj-vscode/src/setopts-tristate-webview.ts:105-109
const compose = async (sel: PanelTriStateSelection): Promise<SetOptsComposeTriStateResult> => {
    const entries: SetOptsTriStateEntry[] = sel.entries.map(e => ({ byte: e.byte, mask: e.mask, state: e.state }));
    const params: SetOptsComposeTriStateParams = { selection: { entries }, variable, indent, scope };
    return await sender(SETOPTS_COMPOSE_TRISTATE_METHOD, params) as SetOptsComposeTriStateResult;
};
```
A test asserting "no WorkspaceEdit was applied" for a malformed message on this panel must also
assert the injected `sender` mock was never called — otherwise a malformed shape would still leak
onto the wire to the language server even though no local edit happens.
**Why it happens:** This panel is structurally the odd one out (it's the one webview that never
computes anything client-in-extension-host; the LS is the single source of truth per its own file
header). A guard added by copy-pasting the other five panels' pattern could check the wrong thing
(WorkspaceEdit-not-called) while missing the real thing (sender-not-called).
**How to avoid:** Place the shape guard **before** `compose()`/`sender(...)` is ever invoked, and
write the tristate panel's test to assert on the `sender` mock, following the existing pattern in
`test/setopts-in-code-ui.test.ts`'s `'change forwards the form selection through the sender and
posts the preview back'` test (line ~252) which already exercises this exact mock.

### Pitfall 4: `registerPanelMessageHandler`'s exact-identity test constrains how a guard can be wired
**What goes wrong:** `test/webview-panel-lifecycle.test.ts` asserts:
```typescript
// Source: bbj-vscode/test/webview-panel-lifecycle.test.ts:129-131
expect(panel.webview.onDidReceiveMessage).toHaveBeenCalledTimes(1);
expect(panel.webview.onDidReceiveMessage).toHaveBeenCalledWith(handler);
```
If D-04's "optional argument to `registerPanelMessageHandler`" option is chosen, and that
function is changed to *always* wrap `handler` in a closure (even when no guard is passed),
`onDidReceiveMessage` would be called with a new closure, not `handler` itself — breaking this
existing assertion.
**How to avoid:** If wiring the guard through `registerPanelMessageHandler`, make the guard
parameter optional and only wrap `handler` when a guard is actually supplied; the existing
5-argument-free calls in this test file pass no guard and must keep receiving `handler` itself
unwrapped. (Applying the guard inline at the top of each composer's own handler function, per
D-04's other option, sidesteps this entirely and is the lower-risk choice.)

### Pitfall 5: `msgboxCallStillMatches`/`cvsCallStillMatches`-style staleness guards are a *different*, already-correct mechanism — don't conflate with SEC-10
The existing EDIT-mode staleness checks (`msgboxCallStillMatches`, `cvsCallStillMatches`) already
guard against the *document* changing between panel-open and Insert; SEC-10 guards against the
*message* being malformed. Both can coexist in the same handler (staleness check runs after the
shape guard passes) — don't merge or replace one with the other.

## Code Examples

### The six webview message shapes (verified this session, for the D-04 `isXxxMessage()` guards)

```typescript
// msgbox-composer-webview.ts — types: 'ready' | 'change' | 'insert' | 'cancel'
// Source: bbj-vscode/src/msgbox-composer-webview.ts:62-72
interface Selection {
    buttonSet: number;
    icon: number;
    defaultButton: number;
    flags: number[];
    customButtons: string[];
    message: string;
    title: string;
    assignTo: string;
    useConstants: boolean;
}
```

```typescript
// addwindow-composer-webview.ts — types: 'ready' | 'change' | 'insert' | 'cancel'
// Source: bbj-vscode/src/addwindow-composer-webview.ts:59-70
interface Selection {
    flags: number[];
    eventMaskEnabled: boolean;
    eventMask: number[];
    receiver: string;
    sysgui: string;
    x: string;
    y: string;
    width: string;
    height: string;
    title: string;
}
```

```typescript
// addchildwindow-composer-webview.ts — types: 'ready' | 'change' | 'insert' | 'cancel'
// Source: bbj-vscode/src/addchildwindow-composer-webview.ts:62-75
interface Selection {
    flags: number[];
    eventMaskEnabled: boolean;
    eventMask: number[];
    receiver: string;
    window: string;
    id: string;
    context: string;
    x: string;
    y: string;
    width: string;
    height: string;
    title: string;
}
```

```typescript
// cvs-composer-webview.ts — types: 'ready' | 'change' | 'insert' | 'cancel'
// Source: bbj-vscode/src/cvs-composer-webview.ts:46-51
interface Selection {
    str: string;
    bits: number[];
    chars: string;
    assignTo: string;
}
```

```typescript
// setopts-composer-webview.ts — types: 'ready' | 'change' | 'apply' | 'cancel' (note: "apply", not "insert")
// Source: bbj-vscode/src/setopts-composer-webview.ts:59-64
interface PanelSelection {
    checked: string[]; // "byte:mask" ids
    maskComma: string;
    maskDot: string;
    rawTail: string;
}
```

```typescript
// setopts-tristate-webview.ts — types: 'ready' | 'change' | 'apply' | 'cancel'
// Source: bbj-vscode/src/setopts-tristate-webview.ts:69-71
interface PanelTriStateSelection {
    entries: Array<{ byte: number; mask: number; state: SetOptsTriState }>;
}
// SetOptsTriState is a closed 3-value string union:
// Source: bbj-vscode/src/setopts-catalog.ts:399
// export type SetOptsTriState = 'set' | 'clear' | 'leave';
```

### The identical CSP array duplicated six times (REF-07 target)

Every one of the six webview files builds the exact same three-line array (only the surrounding
function/variable names differ):
```typescript
// Source (byte-identical in all six): msgbox-composer-webview.ts:183-187,
// addwindow-composer-webview.ts:172-176, addchildwindow-composer-webview.ts:178-182,
// cvs-composer-webview.ts:155-159, setopts-composer-webview.ts:163-167,
// setopts-tristate-webview.ts:180-184
const csp = [
    `default-src 'none'`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${nonce}'`,
].join('; ');
```

### `msgbox-composer.ts`'s private `scanArgs`/`trimmedRange` — the one remaining un-shared copy (REF-08 target)

`addwindow-composer.ts` already exports `scanArgs`/`trimmedRange` (`bbj-vscode/src/addwindow-composer.ts:388-416`),
already imported by `addchildwindow-composer.ts:16-19` and `cvs-composer.ts:22`. `msgbox-composer.ts`
still has its own private, nearly-identical copy:
```typescript
// Source: bbj-vscode/src/msgbox-composer.ts:536-577 (private, not exported)
function trimmedRange(line: string, a: number, b: number): [number, number] { /* ... */ }
function scanArgs(line: string, open: number): { argRanges: Array<[number, number]>; callEnd: number } { /* ... */ }
```
D-11 explicitly calls this out: "The private `scanArgs` copy in `msgbox-composer.ts` is removed."

### The `titleArg` triplication (D-10 window-composer UI module target)

Three near-identical implementations exist today, differing only in fallback text:
```typescript
// LS side — parameterised, exported wrappers exist:
// Source: bbj-vscode/src/language/composer-commands.ts:49-54
function titleArg(args: string[], fallback: string): string {
    const literal = [...args].reverse().find(a => /^"([^"]|"")*"$/.test(a));
    return literal ?? fallback;
}
const addWindowTitleArg = (args: string[]) => titleArg(args, '"Window"');
const addChildWindowTitleArg = (args: string[]) => titleArg(args, '"Child"');

// VS Code UI side — addwindow-composer-ui.ts:79-83 (fallback hard-coded '"Window"')
// VS Code UI side — addchildwindow-composer-ui.ts:83-87 (fallback hard-coded '"Child"')
```
D-10's "shared window-composer UI module: `titleArg` and the shared addWindow/addChildWindow
code-action helper" should consolidate all three onto one function with the LS side's existing
`(args, fallback)` signature.

### The `addWindowPanelArgAt`/`addChildWindowPanelArgAt` structural near-duplicate (D-10's "code-action helper")

Both functions build a `target`/`initial`/`label` triple from a decoded call, but
`addChildWindowPanelArgAt` has one extra early-return `addWindowPanelArgAt` lacks:
```typescript
// Source: bbj-vscode/src/addchildwindow-composer-ui.ts:39-41
const info = findAddChildWindowCallAt(lineText, character);
if (!info) return undefined;
if (info.flagsValue === undefined && info.flagsInsertOffset === undefined) return undefined;
```
A shared helper needs to be parameterized by: the `findXCallAt` function, the flags/event-mask
catalogs, `unknownBits`/`describeXFlags`, the extra per-kind `initial` fields (`sysgui` vs.
`window`+`id`+`context`), and this one extra guard (which should probably become an *optional*
predicate parameter rather than being silently dropped or silently added to addWindow's path,
since criterion 4 requires "the composer suites pass without changes to their assertions").

### TEST-10 template: exercising a `register...Composer` function unmocked (copy this pattern)

```typescript
// Source (existing, working precedent): bbj-vscode/test/setopts-in-code-ui.test.ts:314-334 (paraphrased structure)
describe('registerSetOptsInCodeComposer / command routing (Task 2)', () => {
    test('registers exactly one command and one Code Action provider scoped to the bbj language, no CodeLens', () => {
        const fakeContext = { subscriptions: [] };
        registerSetOptsInCodeComposer(fakeContext, sender);
        // ... pull the registered command callback and CodeActionProvider off the mock .calls,
        // invoke them directly, assert on the resulting panel/edit — never assert only
        // "registerCommand was called".
    });
});
```
This is the exact shape TEST-10 needs for `registerAddWindowComposer`, `registerAddChildWindowComposer`,
and `registerSetOptsComposer` — none of which are exercised this way today (confirmed: every other
test file that imports them replaces them with `vi.fn()` via `vi.mock(...)`).

### D-09 IntelliJ boundary-test template (existing pattern to extend)

```java
// Source: bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java:124-142
@Test
void aMsgboxPreviewResponseParsesThroughTheLsp4jGson() {
    String envelope = """
        {"jsonrpc":"2.0","id":"1","result":{
          "expr":513,"statement":"MSGBOX(\\"Hello\\",513,\\"Title\\")",
          "summary":"OK button, question icon","messageError":null,"titleError":null,"customError":null,
          "valid":true,
          "render":{"title":"Title","message":"Hello","icon":32,"buttons":["OK"],"defaultIndex":0}
        }}""";
    MsgboxPreview result = parse("bbj/composer/msgbox/preview", MsgboxPreview.class, envelope, MsgboxPreviewParams.class);
    assertEquals(513, result.expr);
    // ...
}
```
D-09's new `assignToError` field on `MsgboxPreview`/`CvsPreview`
(`bbj-intellij/.../ComposerModels.java:86-95` and `:622-630`, neither of which currently declares
`assignToError`) should be pinned the same way: add `"assignToError":null` and
`"assignToError":"..."` variants to the JSON envelope and assert the field deserializes.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The recommended `assignTo` regex shape (base identifier + optional single sigil + optional one `[...]` subscript whose contents re-run through `validateBbjExpression`) is a workable implementation of D-06, but the exact regex was not written or tested this session | Don't Hand-Roll, Pattern discussion | Low — this is algorithm guidance, not a locked value; the executor must still write and unit-test the actual regex/parsing logic against D-06's examples (`ret`, `ret!`, `r[1]`, `r[i+1]`, `s$`, `s!`, `s$[i]`) and its rejections (wrong-suffix, quotes, operators, `=`, `;`/`:`) |
| A2 | Whether to also add the missing `if (!r.valid) break;` value guard to `setopts-composer-webview.ts`'s `apply` case (Pitfall 2) is out of this phase's locked scope | Common Pitfalls | Low — flagged as an open question below rather than assumed either way; if the planner decides to fold it in, it should be called out as a deliberate scope addition, not silent |
| A3 | The shared window-composer UI helper for `addWindowPanelArgAt`/`addChildWindowPanelArgAt` (D-10) is best parameterized with an optional "no candidate" predicate rather than either always or never applying addChildWindow's extra early-return | Code Examples | Low — a design recommendation; the alternative (two near-identical thin wrappers around a shared inner builder that both call unconditionally, with addWindow's wrapper never triggering the extra check because its own `info.flagsValue`/`flagsInsertOffset` are always defined when `findAddWindowCallAt` returns non-undefined) is equally valid and the planner may choose it instead |

**If this table is empty:** N/A — see rows above. Everything else in this document is either
`[VERIFIED: <file>:<lines>]` with an inline quote, or a direct restatement of a locked CONTEXT.md
decision.

## Open Questions

1. **Should the pre-existing missing `if (!r.valid) break;` guard on `setopts-composer-webview.ts`'s
   `apply` handler be closed in this phase, alongside the new shape guard?**
   - What we know: it is a real, narrower gap (value validity, not shape validity) in the exact
     file this phase already touches for REF-07 (CSP) and SEC-10 (shape guard).
   - What's unclear: CONTEXT.md's decisions (D-01 through D-14) never mention it, and the
     issue list (#604/#626/#628/#582/#533/#534/#595) doesn't obviously include it either.
   - Recommendation: leave it out of this phase's commits unless the planner/discuss step
     explicitly decides to fold it in as a small bonus fix; note it in the phase's SUMMARY either
     way so it isn't lost.

2. **Exact shape of the shared `addWindowPanelArgAt`/`addChildWindowPanelArgAt` helper (D-10).**
   - What we know: both functions' overall structure (decode → build `target` → build `initial` →
     compute `label`) is identical; the field names inside `target.initial` differ
     (`sysgui` vs. `window`+`id`+`context`), and addChildWindow has one extra early-return guard
     addWindow lacks (see Code Examples).
   - What's unclear: whether the extra guard is intentional load-bearing behavior for
     addChildWindow specifically (worth preserving as an explicit parameter) or an oversight that
     should also apply to addWindow (a behavior change criterion 4 forbids: "the composer suites
     pass without changes to their assertions").
   - Recommendation: preserve current behavior exactly (make it a parameter, default it per
     current per-composer behavior) — do not unify it away in either direction without a
     deliberate decision, since criterion 4 is explicit that assertions must not change.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.10 [VERIFIED: bbj-vscode/package.json:725] (TS side); JUnit 5 (IntelliJ Java side, existing `ComposerModelsJsonBoundaryTest.java`) |
| Config file | `bbj-vscode/vitest.config.ts` (no test include/exclude patterns declared — a pre-existing gap tracked separately as TEST-03, not this phase's concern) |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/<file>.test.ts` |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm test` |

**Baseline caveat (pre-existing, unrelated to this phase):** if BBjServices happens to be
reachable on `:5008` while running the full suite, `shouldRunBBjTests()`'s bare-TCP-connect probe
switches on 11 `linking.test.ts` interop tests that are separately tracked as failing (TEST-05,
Phase 116) — don't misattribute those to this phase's changes. Run with BBj unreachable, or
compare failing-test-name sets against the phase's own base commit if in doubt, per the
project's own `Regression gate: compare against base commit` house rule.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-10 | A wrong-shaped message posted to each of the six webviews is dropped before `build()`/a request/a WorkspaceEdit | unit | `npx vitest run test/webview-panel-lifecycle.test.ts` (extend) or a new sibling file using `discoverPanelModules()` | ✅ discovery helper exists; ❌ malformed-message assertions — Wave 0 |
| SEC-11 (validator) | `validateAssignTo`/shared logic rejects wrong-type suffix, quotes, operators, `=`, `;`/`:`, accepts `ret`/`ret!`/`r[1]`/`s$`/`s!`/`s$[i]` | unit | `npx vitest run test/msgbox-composer.test.ts test/cvs-composer.test.ts` (extend) | ✅ files exist; ❌ new validator tests — Wave 0 |
| SEC-11 (UI) | New insert: empty/invalid `assignTo` marks preview invalid, Insert disabled; edit/completing: field hidden, `assignTo` omitted | unit | `npx vitest run test/msgbox-composer-ui.test.ts test/cvs-composer-ui.test.ts` (extend) | ✅ files exist; ❌ new assertions — Wave 0 |
| SEC-11 (IntelliJ) | `MsgboxPreview`/`CvsPreview` JSON responses with `assignToError` deserialize; dialogs show it | JUnit / manual UAT | `./gradlew test --tests ComposerModelsJsonBoundaryTest` (from `bbj-intellij/`) | ✅ file exists; ❌ new field/tests — Wave 0 |
| TEST-10 | `registerAddWindowComposer`/`registerAddChildWindowComposer`/`registerSetOptsComposer`'s command + Code Action provider actually execute under test | unit | `npx vitest run test/addwindow-composer-ui.test.ts test/addchildwindow-composer-ui.test.ts test/setopts-composer-ui.test.ts` | ❌ none of these three files exist yet — Wave 0 |
| REF-03 | `composer-commands.ts` moved; all three call sites updated; behavior unchanged | unit (regression) | `npx vitest run test/composer-commands.test.ts test/setopts-in-code-request.test.ts` | ✅ both exist, need path updates — Wave 0 (edit, not create) |
| REF-07 | Shared CSP helper produces byte-identical output to today's six inline builders | unit | New assertions in the discovery-based panel test, or a small dedicated `webview-csp.test.ts` | ❌ Wave 0 |
| REF-08 | Shared scanner/locator; msgbox's private copy removed; CVS's boundary regex preserved | unit (regression) | `npx vitest run test/msgbox-composer.test.ts test/addwindow-composer.test.ts test/addchildwindow-composer.test.ts test/cvs-composer.test.ts` — must pass with **zero assertion changes** (criterion 4) | ✅ all exist |
| DOC-01 | Class docs describe edit-in-place + all six kinds | manual-only | N/A — a doc-comment read/review; no automated assertion checks Javadoc prose content | — |

### Sampling Rate
- **Per task commit:** the quick-run command scoped to the file(s) just touched.
- **Per wave merge:** `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm test` (full suite).
- **Phase gate:** full suite green (module failing-test-name set unchanged from the phase's own
  base commit, per the project's whole-suite regression-gate house rule) before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `test/addwindow-composer-ui.test.ts` — new file, covers TEST-10 for `addwindow-composer-ui.ts` (`registerAddWindowComposer`, its `CodeActionProvider`, its command)
- [ ] `test/addchildwindow-composer-ui.test.ts` — new file, same for `addchildwindow-composer-ui.ts`
- [ ] `test/setopts-composer-ui.test.ts` — new file, same for `setopts-composer-ui.ts` (`registerSetOptsComposer`) — **note:** this is a different module from the already well-tested `setopts-in-code-ui.ts` (SETOPTS-in-BBj-code); do not confuse the two similarly-named files
- [ ] A message-guard primitives module + its own unit test file (e.g. `webview-message-guard.test.ts`) — Framework install: none, no new dependency
- [ ] Malformed-message assertions for all six webviews (extend `webview-panel-lifecycle.test.ts` or add a sibling using `discoverPanelModules()`)
- [ ] `assignTo` validator unit tests in `msgbox-composer.test.ts` / `cvs-composer.test.ts`
- [ ] IntelliJ `ComposerModelsJsonBoundaryTest.java` additions for `assignToError` on both `MsgboxPreview` and `CvsPreview`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A — no auth surface in this phase |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A |
| V5 Input Validation | yes | Exactly this phase's SEC-10 (message shape) and SEC-11 (`assignTo` value) — hand-rolled type-guard functions (D-04), no schema library, following the existing `java-peer-guard.ts` house pattern for validating data from an untrusted-ish boundary (there: the java-interop socket peer; here: the webview's `postMessage`) |
| V6 Cryptography | no | Unrelated — `webview-nonce.ts`'s `crypto.randomBytes`-based nonce generation is untouched by this phase and already correct |

### Known Threat Patterns for this stack (VS Code webview extension host)

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A compromised/buggy webview script posts a malformed or adversarial `postMessage` payload to the extension host, which has full filesystem/workspace-edit capability | Tampering / Elevation of Privilege | SEC-10's shape guard (this phase): drop silently before the payload reaches any code path that computes a statement or applies a `WorkspaceEdit` (D-02) |
| A composer writes an `assignTo` expression straight into generated BBj source without validating it is a legitimate variable/array-element target | Tampering (of the user's own source file, via a malformed dialog value) | SEC-11's `assignTo` validator (this phase): reject quotes, `=`, `;`/`:`, operators and wrong-type sigils before the value is interpolated into `${assignTo} = CALL(...)` |
| Webview HTML/script injection via unescaped user data in the generated `<script>`/HTML | Tampering | Already mitigated project-wide by the existing per-panel CSP (`script-src 'nonce-...'`, no `unsafe-inline` for scripts) and by every webview already using `textContent` rather than `innerHTML` for user-controlled strings (confirmed for the msgbox banner text in `test/msgbox-composer-ui.test.ts`'s own regression guard) — REF-07's consolidation must preserve the CSP verbatim, not relax it |

## Sources

### Primary (HIGH confidence — read directly this session)
- `bbj-vscode/src/webview-panel-lifecycle.ts`, `webview-nonce.ts` — shared-module style precedent
- `bbj-vscode/src/msgbox-composer-webview.ts`, `msgbox-composer.ts`, `msgbox-composer-ui.ts`
- `bbj-vscode/src/addwindow-composer-webview.ts`, `addwindow-composer.ts`, `addwindow-composer-ui.ts`
- `bbj-vscode/src/addchildwindow-composer-webview.ts`, `addchildwindow-composer.ts`, `addchildwindow-composer-ui.ts`
- `bbj-vscode/src/cvs-composer-webview.ts`, `cvs-composer.ts`
- `bbj-vscode/src/setopts-composer-webview.ts`, `setopts-tristate-webview.ts`, `setopts-composer-ui.ts`, `setopts-catalog.ts`
- `bbj-vscode/src/language/composer-commands.ts`, `main.ts`
- `bbj-vscode/src/language/java-peer-guard.ts` — hand-rolled-guard style precedent
- `bbj-vscode/test/msgbox-composer-ui.test.ts`, `webview-panel-lifecycle.test.ts`, `window-composer-validation-ui.test.ts`, `composer-commands.test.ts`, `composer-lens-command.test.ts`, `setopts-in-code-ui.test.ts`, `setopts-in-code-request.test.ts`
- `bbj-intellij/src/main/java/.../AddWindowComposerDialog.java`, `ComposerLauncher.java`, `ComposerModels.java`, `MsgboxComposerDialog.java`, `CvsComposerDialog.java`
- `bbj-intellij/src/test/java/.../ComposerModelsJsonBoundaryTest.java`
- `bbj-vscode/package.json`, `vitest.config.ts`, `tsconfig.json`, `esbuild.mjs`
- `.planning/phases/113-composer-webview-hardening-consolidation/113-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`

### Secondary (MEDIUM confidence)
None — no external documentation lookups were needed; this phase is entirely internal
consolidation/hardening of code already read in full this session.

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, entirely internal to an already-read codebase
- Architecture: HIGH — every file in scope was read this session; the message shapes, CSP arrays,
  duplicate/shared-scanner map, and stale doc comments are all directly quoted with line numbers
- Pitfalls: HIGH — all five pitfalls are grounded in specific code read this session (CVS's
  boundary regex, setopts's missing `valid` guard, tristate's async `sender` path, the lifecycle
  test's exact-identity assertion, the pre-existing staleness-guard mechanism), not speculation

**Research date:** 2026-09-27
**Valid until:** 2026-10-27 (30 days — stable internal codebase, no external API/version drift risk)
