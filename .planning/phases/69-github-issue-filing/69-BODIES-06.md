## Index rows 108-125

| # | finding_id | route | title | labels |
|---|---|---|---|---|
| 108 | P64-D4-002 | public issue | BBj integration and infrastructure: an eight-field criticalFields list in the interop test harness is defined but never read, while the gate that actually runs hardcodes three different fields | BBj integration and infrastructure, PRIO 3, 2 |
| 109 | P64-D4-006 | public issue | vscode: three unreachable npm scripts, an unused TextMate generator directive, and a self-contradictory activationEvents block are dead configuration in package.json | vscode, PRIO 3, 2 |
| 110 | P64-D8-001 | public issue | documentation: the interop test harness's header comment overstates which fields the pass/fail gate checks and omits the --timeout flag | documentation, PRIO 3, 2 |
| 111 | P61-D4-004 | public issue | vscode: two grammar fragments duplicate the same channel/options/RPAREN opening shape and have already drifted apart | vscode, PRIO 3, 4 |
| 112 | P61-D4-015 | public issue | vscode: builtin-function .bbl catalog files duplicate their .ts source with no consumer reading the physical .bbl, and one pair has already drifted | vscode, PRIO 3, 4 |
| 113 | P62-D1-001 | public issue | vscode: four composer webviews perform no runtime shape validation on postMessage payloads before they reach build() and a WorkspaceEdit | vscode, PRIO 3, 4 |
| 114 | P62-D1-006 | public issue | vscode: the formatter resolves the java binary via a bare PATH lookup with no pinning setting and no pre-spawn verification | vscode, PRIO 3, 4 |
| 115 | P62-D4-003 | public issue | vscode: 20 compiler-option definitions are hand-duplicated between CompilerOptions.ts and package.json with nothing keeping them in sync | vscode, PRIO 3, 4 |
| 116 | P63-D1-006 | public issue | intellij: composer dialogs write LS-composed BBj statement text into the developer's document with no escaping or structural validation | intellij, PRIO 3, 4 |
| 117 | P63-D2-002 | public issue | intellij: java-interop port auto-detection runs only inside the Settings dialog's reset(), so direct getState() callers get the hardcoded default | intellij, PRIO 3, 4 |
| 118 | P63-D2-008 | public issue | intellij: composer dialogs iterate catalog sub-lists with no null guard, so a malformed catalogs response throws an unhandled NullPointerException on the EDT | intellij, PRIO 3, 4 |
| 119 | P63-D2-011 | public issue | intellij: both status-bar widgets update file-extension visibility only on a status-bus event, never on a bare editor-tab switch | intellij, PRIO 3, 4 |
| 120 | P63-D3-003 | public issue | intellij: composer dialogs fire one full preview LSP4IJ round trip per keystroke with no debounce, unlike the language server's own 500ms debounce | intellij, PRIO 3, 4 |
| 121 | P63-D3-004 | public issue | intellij: every composer-open invocation re-resolves the language server and refetches static catalogs that never change at runtime | intellij, PRIO 3, 4 |
| 122 | P63-D3-006 | public issue | intellij: the TextMate bundle provider allocates a fresh temp directory and re-copies its bundle files on every IDE launch with no caching or cleanup | intellij, PRIO 3, 4 |
| 123 | P63-D4-003 | public issue | intellij: three near-identical plugin-tool-path resolution methods duplicate the same lookup-and-null-check logic across two files | intellij, PRIO 3, 4 |
| 124 | P63-D4-004 | public issue | intellij: BbjRunBuiAction and BbjRunDwcAction duplicate 131 of 142 lines of shared run-action logic, differing only in a handful of BUI/DWC-specific literals | intellij, PRIO 3, 4 |
| 125 | P63-D4-005 | public issue | intellij: three composer-launch actions are near-identical files differing only in one Kind enum constant and doc text | intellij, PRIO 3, 4 |

## Bodies rows 108-125

### 108. P64-D4-002 — BBj integration and infrastructure: an eight-field criticalFields list in the interop test harness is defined but never read, while the gate that actually runs hardcodes three different fields
**Route:** public issue
**Labels:** BBj integration and infrastructure, PRIO 3, 2

<!-- BODY-BEGIN P64-D4-002 -->
## Problem

The interop test harness's `run-tests.ts:659` declares an eight-field `criticalFields` array — the
only place in the 1,058-line file that the phrase "critical field" is defined as a list — but
`grep -n 'criticalFields'` shows it is never read anywhere else in the file. The gate that actually
decides pass/fail, at `:1045`, hardcodes its own, different, three-element list inline, so the file
carries two definitions of "critical field," one authoritative and one inert.

## Evidence

`bbj-vscode/tools/interop-test-harness/run-tests.ts:659`

Surface: the `criticalFields` array declared at `:659` (eight elements: `isStatic`, `isDeprecated`,
`constructors`, `name`, `returnType`, `type`, `parameters`, `packageName`), never read by any other
line in the file, alongside the actual pass/fail gate at `:1045`, which hardcodes its own
three-element list. Problem class: dead code masquerading as the harness's contract — a maintainer
who greps for "critical field" finds the longer, more plausible-looking list, not the one the gate
uses. Impact: extending or trusting the `:659` list changes nothing about what the harness actually
enforces, and the header's own "every critical field" claim (traced separately in `P64-D8-001`)
reads as true against the inert list rather than the real gate.

## Failure scenario

A maintainer extends the critical-field set by editing `:659`, which is the obvious place and the only place the phrase is defined as a list. Nothing changes: the report still passes and the exit code is still decided by the three hardcoded names at `:1045`. The edit is silently inert, and the reviewer of that change has no signal that it did nothing.

## Proposed approach

Either delete `:659` or make `:1045` derive its list from it.

## Acceptance criteria

`run-tests.ts` no longer carries two independent definitions of "critical field" — either `:659`'s
`criticalFields` array is deleted, or the pass/fail gate at `:1045` derives its checked-field list
from it, so a single edit changes what the harness both claims and enforces. Since `tools/` sits
outside the project's test, type-check and lint boundary, acceptance is confirmed by manually
re-running the harness against a live service before and after the change and observing the gate's
checked fields resolve from one source.

## Traceability

Finding `P64-D4-002` · dimension D4 · severity low · effort 2. `dedup: none`.
<!-- BODY-END P64-D4-002 -->

### 109. P64-D4-006 — vscode: three unreachable npm scripts, an unused TextMate generator directive, and a self-contradictory activationEvents block are dead configuration in package.json
**Route:** public issue
**Labels:** vscode, PRIO 3, 2

<!-- BODY-BEGIN P64-D4-006 -->
## Problem

`package.json` and `langium-config.json` together carry three kinds of dead or self-contradictory
configuration: three npm scripts (`esbuild`, `esbuild-watch`, `test-compile`) that nothing in the
tree invokes; a TextMate-generator output path (`langium-config.json:14`) that nothing reads,
regenerated on every install anyway; and an `activationEvents` block that disagrees with
`contributes.commands` about which commands the extension actually contributes.

## Evidence

`bbj-vscode/package.json:629-650,662-664`

Surface: the three unreferenced scripts `esbuild`/`esbuild-watch`/`test-compile` (`:662-664`), the
unread `textMate.out` directive in `langium-config.json:14`, and the mismatch between
`contributes.commands`' 19 declared commands (`:79-199`) and `activationEvents`' 18 `onCommand:`
entries (`:629-650`) — two commands contributed with no activation event, and one `onCommand:`
entry (`bbj.autoComment`) naming a command that does not exist. Problem class: accumulated dead and
self-contradictory build/manifest configuration. Impact: every install regenerates a gitignored,
unreferenced TextMate grammar; a maintainer auditing the manifest for "which commands does this
extension contribute" gets two different answers from two adjacent blocks; and the three dead
scripts describe capability nothing in the project's build path uses.

## Failure scenario

Nothing breaks at runtime, which is why this is `low` and is recorded as maintainability rather than correctness: VS Code 1.74+ auto-generates activation events for contributed commands, so the two unlisted commands still activate, and an `onCommand:` entry for a nonexistent command is simply never triggered. The failure is to the reader and to the build. A maintainer auditing this manifest to answer "which commands does this extension contribute?" gets two different answers from two adjacent blocks, and the one extra name in `activationEvents` suggests a command that was removed or renamed without its activation entry being cleaned up — so the manifest records a history rather than a state. A maintainer asking "what does `npm run esbuild` do?" finds a script that produces an output no part of this project loads. And every install pays for regenerating a TextMate grammar that is gitignored and unreferenced, while the grammar that actually ships is hand-maintained beside it — so the generator's role in this project is ambiguous from the configuration alone.

## Proposed approach

Delete `package.json:662`, `:663`, `:664` and the `onCommand:bbj.autoComment` entry, and remove the `textMate` block at `langium-config.json:13-15`.

## Acceptance criteria

`package.json` no longer declares the `esbuild`, `esbuild-watch` or `test-compile` scripts, nor the
`onCommand:bbj.autoComment` activation entry; `langium-config.json` no longer declares a
`textMate.out` directive. `npm run build`, `npm run langium:generate` and the existing vitest suite
all pass unchanged after the deletions, confirming nothing in the project's build or test path
depended on any of the removed entries.

## Traceability

Finding `P64-D4-006` · dimension D4 (secondary D8) · severity low · effort 2. `dedup: none`.
<!-- BODY-END P64-D4-006 -->

### 110. P64-D8-001 — documentation: the interop test harness's header comment overstates which fields the pass/fail gate checks and omits the --timeout flag
**Route:** public issue
**Labels:** documentation, PRIO 3, 2

<!-- BODY-BEGIN P64-D8-001 -->
## Problem

`run-tests.ts`'s header comment (`:6`) claims the interop test harness "validates every critical
field the LS depends on," but the gate that actually decides pass/fail checks only three of the
eight fields the file elsewhere collects — a response missing `returnType` on every method passes
green. The same header block (`:9-13`) documents three CLI options while `parseArgs` (`:30-38`)
accepts a fourth, `--timeout`, that the documented text never mentions.

## Evidence

`bbj-vscode/tools/interop-test-harness/run-tests.ts:2-14`

Surface: the header comment block at `:2-14`, compared against the actual pass/fail gate at `:1045`
(three of eight fields enforced, traced in `P64-D4-002`) and against `parseArgs`'s accepted
`--timeout` option at `:30-38`, absent from the `:9-13` options list. Problem class: stale/inaccurate
documentation comment (doc-lag). Impact: a maintainer who trusts a green run because of the `:6`
claim will not learn that a missing `returnType`, `type`, `parameters` or `packageName` never fails
the harness; a maintainer diagnosing a timeout against a slow peer will not learn `--timeout`
exists, because the documented options list omits it.

## Failure scenario

A maintainer diagnosing an interop regression reads `:6`, concludes that a green run means every critical field the language server depends on is present, and stops looking. In fact a response missing `returnType` on every method — a field the LS does depend on, and one the harness explicitly checks for at `:206` — produces a green exit code, because `:1045` does not include it in the gate. The report does show the failed field check, but the header's claim is what tells the reader whether the report needs reading at all. Separately, a maintainer whose run times out against a slow peer reads `:9-13`, sees no timeout option, and concludes the 15-second limit is not adjustable, when `--timeout` has worked all along.

## Proposed approach

Correct the claim at `:6` to name the three fields the gate enforces (or widen the gate to match the claim), and add `--timeout` to `:9-13`.

## Acceptance criteria

The header comment at `:6` names only the fields the `:1045` gate actually enforces (or the gate is
widened to match the current claim, coordinated with `P64-D4-002`), and the options list at `:9-13`
documents `--timeout` alongside `--host`, `--port` and `--output`. Since `tools/` sits outside the
project's test boundary, acceptance is confirmed by a manual read-through comparing the corrected
comment text against the gate's actual field list and `parseArgs`'s actual accepted flags.

## Traceability

Finding `P64-D8-001` · dimension D8 (secondary D4) · severity low · effort 2. `dedup: none`.
<!-- BODY-END P64-D8-001 -->

### 111. P61-D4-004 — vscode: two grammar fragments duplicate the same channel/options/RPAREN opening shape and have already drifted apart
**Route:** public issue
**Labels:** vscode, PRIO 3, 4

<!-- BODY-BEGIN P61-D4-004 -->
## Problem

Grammar fragments `WithChannelAndOptionsAndOutputItems` (`bbj.langium:513-521`) and
`WithChannelAndOptionsAndInputItems` (`bbj.langium:614-617`) share an identical channel/options/
RPAREN opening shape and an identical bare-items-list closing alternative, differing only in
`OutputItem` vs. `InputItem` and one extra Output-only alternative — a duplication that has already
produced a visible drift between the two fragments.

## Evidence

`bbj-vscode/src/language/bbj.langium:513-521,614-617`

Surface: the two grammar fragments' shared `'(' channelno=Expression? Options? (...)` opening and
bare-items-list closing alternative, plus the one extra `RPAREN_NO_NL ENDLINE_PRINT_COMMA`
alternative the Output variant carries that the Input variant lacks. Problem class: duplicated
grammar-fragment shape with no shared source. Impact: a future change to the shared opening shape
(for example, adding a new `Options` variant) must be hand-applied to both fragments, and the
fragments are already inconsistent, making a partial edit likely.

## Failure scenario

n/a (D4 trace-tier finding — the code shape itself is the defect, not a runtime failure): a future change to the shared channel/options/RPAREN opening shape (e.g. adding a new Options variant) must be applied by hand in both fragments, and the two are already inconsistent (the extra Output-only alternative), so a change is likely to be applied to only one.

## Proposed approach

Extract a shared `WithChannelAndOptionsAndItems<Item>`-style common prefix fragment, or a documented rationale for why the extra Output-only alternative must stay asymmetric.

## Acceptance criteria

Either a shared common-prefix grammar fragment replaces the duplicated opening shape in both
`WithChannelAndOptionsAndOutputItems` and `WithChannelAndOptionsAndInputItems`, or a documented
rationale explains why the extra Output-only alternative must remain asymmetric between them.
`npm run langium:generate` and the existing vitest suite pass unchanged after the change, confirming
no parsing behavior regressed.

## Traceability

Finding `P61-D4-004` · dimension D4 · severity low · effort 4. `dedup: none`.
<!-- BODY-END P61-D4-004 -->

### 112. P61-D4-015 — vscode: builtin-function .bbl catalog files duplicate their .ts source with no consumer reading the physical .bbl, and one pair has already drifted
**Route:** public issue
**Labels:** vscode, PRIO 3, 4

<!-- BODY-BEGIN P61-D4-015 -->
## Problem

The builtin-function library's `.bbl` catalog files (events, functions, labels, variables) duplicate
the content already exported from their `.ts` siblings, with neither `fs-provider.ts` nor
`bbj-ws-manager.ts` reading the physical `.bbl` file — both consumers build the synthetic
`bbjlib:///*.bbl` documents from the `.ts`-exported constants instead. The two formats have already
drifted once: `functions.ts:167`'s DOCU synopsis for `CVS` disagrees with `functions.bbl:166`'s.

## Evidence

`bbj-vscode/src/language/lib/functions.ts:167,192`

Surface: `functions.ts:167`'s CVS DOCU synopsis (`CVS(string,int{,chars}{,ERR=lineref})`) versus
`functions.bbl:166`'s (`CVS(string,int{,ERR=lineref})`); a consumer grep confirming neither
`fs-provider.ts` nor `bbj-ws-manager.ts` reads any physical `.bbl` file. Problem class: duplicated
catalog data with no build-time generation step keeping the two in sync. Impact: a maintainer can
edit one format without the other, as already happened to CVS's DOCU synopsis, and the drift is
invisible to every consumer and every test, since nothing reads the physical `.bbl` file and
`test/builtin-functions-library.test.ts` does not either.

## Failure scenario

A maintainer edits one format (.ts or .bbl) without the other — as already happened to CVS's DOCU synopsis — and the drift is invisible to every consumer and every test, since neither runtime code path nor test/builtin-functions-library.test.ts reads the physical .bbl file.

## Proposed approach

Generate .bbl from .ts at build time, or delete the physical .bbl files.

## Acceptance criteria

Either the four `.bbl` catalog files are generated from their `.ts` source at build time, or the
physical `.bbl` files are deleted entirely (since no runtime path reads them). `functions.ts:167`'s
CVS DOCU synopsis and its `.bbl` counterpart no longer disagree, and the existing
`test/builtin-functions-library.test.ts` suite passes unchanged after the change.

## Traceability

Finding `P61-D4-015` · dimension D4 · severity low · effort 4. `dedup: none`.
<!-- BODY-END P61-D4-015 -->

### 113. P62-D1-001 — vscode: four composer webviews perform no runtime shape validation on postMessage payloads before they reach build() and a WorkspaceEdit
**Route:** public issue
**Labels:** vscode, PRIO 3, 4

<!-- BODY-BEGIN P62-D1-001 -->
## Problem

Four webview message handlers — `msgbox-composer-webview.ts:82`,
`addwindow-composer-webview.ts:108-138`, `addchildwindow-composer-webview.ts:113-143`, and
`setopts-composer-webview.ts:70-108` — type their `onDidReceiveMessage` payload only via a
compile-time TypeScript interface annotation, with no runtime check of its shape, field types or
value ranges before the payload reaches `build()` and, on the insert path, a `vscode.WorkspaceEdit`
that writes into the user's open document.

## Evidence

`bbj-vscode/src/msgbox-composer-webview.ts:82-119`

Surface: the `onDidReceiveMessage` handler's TypeScript-only payload typing, repeated across all
four composer webview files, feeding `build(msg.payload)` and a `WorkspaceEdit`-based document
write with no runtime shape guard between them. Problem class: missing input validation at a
webview-to-extension message boundary. Impact: today none of the four webviews' HTML interpolates
any editor-selection, document, config or workspace value, so there is no live path for hostile
message content — this is a defense-in-depth absence rather than a currently exploitable gap, but a
future change that adds interpolated or externally sourced webview content would reach `build()`
and the user's document with no server-side check standing between them.

## Failure scenario

Because none of the four getHtml() strings interpolates any editor-selection/document/config/workspace value (confirmed in the SEC-01/SEC-02 Surface Handoff fact (1) above), there is no path today for attacker-controlled content to reach postMessage with a hostile payload — the gap is a defense-in-depth absence, not a currently exploitable injection. If a future change adds interpolated or externally-sourced webview content, a malicious message could reach build() and, via its output, the user's open document with no server-side check standing between the message and the edit.

## Proposed approach

A small runtime shape guard per handler, e.g. a type-predicate before build().

## Acceptance criteria

Each of the four composer webview message handlers (`msgbox-composer-webview.ts`,
`addwindow-composer-webview.ts`, `addchildwindow-composer-webview.ts`,
`setopts-composer-webview.ts`) validates the runtime shape of an incoming message's payload — for
example via a type-predicate — before it reaches `build()`, rejecting a malformed payload rather
than passing it through. A vitest regression test for at least one of the four handlers asserts
that a payload failing the shape check is rejected before reaching `build()` or the `WorkspaceEdit`
write.

## Traceability

Finding `P62-D1-001` · dimension D1 (secondary D2) · severity low · effort 4. `dedup: none`.
<!-- BODY-END P62-D1-001 -->

### 114. P62-D1-006 — vscode: the formatter resolves the java binary via a bare PATH lookup with no pinning setting and no pre-spawn verification
**Route:** public issue
**Labels:** vscode, PRIO 3, 4

<!-- BODY-BEGIN P62-D1-006 -->
## Problem

`document-formatter.ts:59` spawns the `java` binary via `cp.spawn('java', formatFlags)`, resolved
by an `argv[0]` lookup against the extension host process's PATH, with no absolute-path pinning and
no pre-spawn verification that the resolved binary is the intended one — and, unlike `bbj.home`-based
commands elsewhere in the codebase, this file exposes no equivalent setting an administrator could
pin.

## Evidence

`bbj-vscode/src/document-formatter.ts:59`

Surface: the `cp.spawn('java', formatFlags)` call at `:59`, using an argument array with no
`shell: true` option and no equivalent to `Commands.cjs`'s `getBBjHome()`-style pinnable setting.
Problem class: untrusted search path on an unqualified executable name (hardening gap, not shell
injection — the call uses `spawn()` with an argument array, not `exec()`). Impact: on a machine
where PATH resolves `java` to something other than the intended JDK/JRE binary, every format
request silently runs that binary instead, with the active document's own path passed as one of its
arguments.

## Failure scenario

On a machine where PATH contains an attacker- or misconfiguration-placed 'java' entry ahead of the real JDK/JRE binary (e.g. a compromised or stale dev-tooling directory prepended to PATH), every format request silently runs that binary instead, with formatFlags (including the active document's own path) as its argv. No document/workspace/setting value currently constructs the resolved binary path itself, so this is a hardening gap rather than a currently exploitable injection.

## Proposed approach

(add an optional bbj.javaHome setting, defaulting to the current PATH lookup, and prefer it when set).

## Acceptance criteria

`document-formatter.ts` gains an optional `bbj.javaHome`-style setting that, when set, pins the
spawned `java` binary to an explicit path instead of the current PATH lookup, defaulting to today's
PATH-lookup behavior when unset. A vitest regression test mocks `cp.spawn` and asserts that the
resolved binary path matches the pinned setting once it is configured.

## Traceability

Finding `P62-D1-006` · dimension D1 · severity low · effort 4. `dedup: none`.
<!-- BODY-END P62-D1-006 -->

### 115. P62-D4-003 — vscode: 20 compiler-option definitions are hand-duplicated between CompilerOptions.ts and package.json with nothing keeping them in sync
**Route:** public issue
**Labels:** vscode, PRIO 3, 4

<!-- BODY-BEGIN P62-D4-003 -->
## Problem

`CompilerOptions.ts`'s `COMPILER_OPTIONS` array declares 20 entries whose label, description and
default value each hand-duplicate a twin declared independently in `package.json`'s matching
`bbj.compiler.*` configuration properties, with no code-generation step, shared JSON source or test
keeping the two in sync.

## Evidence

`bbj-vscode/src/Commands/CompilerOptions.ts:65-282`

Surface: `COMPILER_OPTIONS`'s 20 `configKey` entries (`:65-282`) versus `package.json`'s 20 matching
`bbj.compiler.*` properties (`:412-553`), each pair independently stating the same default and
description with no cross-reference beyond the shared string key. Problem class: hand-duplicated
configuration metadata with no sync mechanism. Impact: adding, removing or changing a compiler
option's default or description requires a matching hand-edit in both files; missing one desyncs the
`configureCompileOptions()` QuickPick UI from what a developer sees in VS Code's Settings UI or from
what raw `settings.json` editing actually accepts, with nothing today catching the drift.

## Failure scenario

n/a (D4 code-shape finding) -- adding, removing, or changing a compiler option's default/description requires a matching hand-edit in both files; missing one desyncs the configureCompileOptions() QuickPick UI (built from CompilerOptions.ts) from what a developer sees in VS Code's Settings UI (built from package.json's schema) or from what raw settings.json editing actually accepts, with nothing currently catching the drift.

## Proposed approach

Resolving the duplication (e.g. generating one from the other, or a shared JSON source both read) necessarily touches both package.json and CompilerOptions.ts.

## Acceptance criteria

`COMPILER_OPTIONS` and `package.json`'s matching `bbj.compiler.*` properties no longer maintain
independent, hand-duplicated copies of the same default and description — either one is generated
from the other, or both read a shared JSON source. A vitest regression test asserts that every
`COMPILER_OPTIONS` entry's `configKey` has a matching `bbj.compiler.*` property with the same
default value, catching future drift automatically.

## Traceability

Finding `P62-D4-003` · dimension D4 · severity low · effort 4. `dedup: none`.
<!-- BODY-END P62-D4-003 -->

### 116. P63-D1-006 — intellij: composer dialogs write LS-composed BBj statement text into the developer's document with no escaping or structural validation
**Route:** public issue
**Labels:** intellij, PRIO 3, 4

<!-- BODY-BEGIN P63-D1-006 -->
## Problem

`ComposerLauncher.java`'s `openMsgbox` (`:107-115`) and `applyHexEdit` (`:172-196`, shared by the
addWindow/addChildWindow edit flows) write LS-composed BBj statement text directly into the
developer's live source file via `Document.replaceString`/`insertString`, with no escaping or
structural validation of the dialog-typed text feeding it.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:107-115,172-196`

Surface: `openMsgbox`'s write of `dialog.getStatement()` (`:107-115`) and `applyHexEdit`'s write of
`flagsHex`/`eventHex` tokens (`:172-196`), both via `Document.replaceString`/`insertString` with no
escaping or structural check. Problem class: unvalidated write of user-typed dialog content into a
source document — a self-inflicted statement-corruption gap, not an attacker-controlled injection
surface, since every affected field is text the developer types into their own dialog. Impact: BBj
syntax-breaking text (an unescaped quote, an unmatched parenthesis) typed into a composer dialog's
message/title/geometry fields is embedded verbatim into the statement written into the developer's
own live source file, with nothing catching it before the write.

## Failure scenario

A developer who types BBj syntax-breaking text (an unescaped quote, an unmatched parenthesis) into a composer dialog's message/title/geometry fields gets that text embedded verbatim into the statement inserted into their own live source file, with no client- or server-side structural check catching it before the write — a self-inflicted statement-corruption gap in the developer's own file, not an attacker-controlled injection surface (no workspace-committed, remote, or peer-supplied value reaches this path).

## Proposed approach

Thread the LS's existing validateStringField-style structural check, or an IntelliJ-side equivalent, through the write path before Document.replaceString/ insertString.

## Acceptance criteria

`ComposerLauncher.java`'s `openMsgbox` and `applyHexEdit` write paths run dialog-typed text through
the language server's existing `validateStringField`-style structural check (or an IntelliJ-side
equivalent) before `Document.replaceString`/`insertString`, rejecting or escaping text that would
corrupt the resulting BBj statement. Because no `src/test/` source set exists for `bbj-intellij`
today, regression coverage for this fix depends on that gap being closed first, or on a recorded
manual verification step at merge time.

## Traceability

Finding `P63-D1-006` · dimension D1 (secondary D2) · severity low · effort 4. `dedup: none`.
<!-- BODY-END P63-D1-006 -->

### 117. P63-D2-002 — intellij: java-interop port auto-detection runs only inside the Settings dialog's reset(), so direct getState() callers get the hardcoded default
**Route:** public issue
**Labels:** intellij, PRIO 3, 4

<!-- BODY-BEGIN P63-D2-002 -->
## Problem

`BbjSettings.getState()` auto-detects `bbjHomePath` and `nodeJsPath` inline whenever they are empty,
benefiting every consumer of `getState()`, but `javaInteropPort` receives no equivalent treatment
there — its only auto-detection lives in `BbjSettingsConfigurable.reset()`, gated by an
equality-to-default check (`if (javaInteropPort == 5008)`) rather than a genuine "was this ever
configured" check.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java:130-140`

Surface: `BbjSettingsConfigurable.reset()`'s port auto-detection (`:130-140`), gated by the
literal-equality check at `:131`, versus `BbjSettings.getState()`'s inline auto-detection of
`bbjHomePath`/`nodeJsPath` (`BbjSettings.java:44-57`), which has no such gate. Problem class:
inconsistent auto-detection scope between two related settings, with an equality check standing in
for a configured/unconfigured sentinel. Impact: any direct
`BbjSettings.getInstance().getState()` caller that is not the Settings UI never runs port
auto-detection at all, and a user who explicitly confirms port 5008 is indistinguishable from a user
who never touched the field, so their choice is silently overwritten each time the Settings dialog
reopens.

## Failure scenario

A consumer reading BbjSettings.getInstance().getState().javaInteropPort directly (bypassing the Settings dialog) gets the hardcoded default 5008 even when BBj.properties specifies a different java-interop port, unlike bbjHomePath/ nodeJsPath which are auto-detected wherever they are read. Separately, a user who has explicitly left the port at its default value has that value silently replaced with a newly detected port each time the Settings dialog is reopened and OK'd, with no way to express "I want 5008, don't auto-detect."

## Proposed approach

Move port auto-detection into BbjSettings.getState(), replacing the equality check with a genuine "never configured" sentinel.

## Acceptance criteria

Java-interop port auto-detection moves into `BbjSettings.getState()` itself, alongside
`bbjHomePath`/`nodeJsPath`, so every consumer of `getState()` benefits and not only the Settings
UI's `reset()`. The equality-to-default check is replaced with a genuine "never configured"
sentinel, so a user who explicitly confirms port 5008 is no longer indistinguishable from one who
never touched the field. Because no `src/test/` source set exists for `bbj-intellij` today,
regression coverage depends on that gap being closed first, or on a recorded manual verification
step at merge time.

## Traceability

Finding `P63-D2-002` · dimension D2 (secondary D4) · severity low · effort 4. `dedup: none`.
<!-- BODY-END P63-D2-002 -->

### 118. P63-D2-008 — intellij: composer dialogs iterate catalog sub-lists with no null guard, so a malformed catalogs response throws an unhandled NullPointerException on the EDT
**Route:** public issue
**Labels:** intellij, PRIO 3, 4

<!-- BODY-BEGIN P63-D2-008 -->
## Problem

`MsgboxComposerDialog.createCenterPanel()` and both addWindow-family dialogs iterate their
`ComposerCatalogs` sub-list fields (icons, button sets, default buttons, flags, event bits) with no
null guard, while `ComposerLauncher`'s own `catalogs == null` check guards only the top-level
reference, not its individual sub-list fields.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java:116-118,139,AddWindowComposerDialog.java:151,161,AddChildWindowComposerDialog.java:155,165`

Surface: `fillCombo(icon, catalogs.icons)`/`fillCombo(buttonSet, catalogs.buttonSets)`/
`fillCombo(defaultButton, catalogs.defaultButtons)` and the `for (CatalogItem it : catalogs.flags)`
loop in `MsgboxComposerDialog.createCenterPanel()`, mirrored by `addGroupedChecks(flags/eventPanel,
catalogs.flags/eventBits, ...)` in both addWindow-family dialogs — none null-guarded. Problem class:
missing null check on a sub-field of an already-null-checked parent object. Impact: a malformed or
partial `bbj/composer/catalogs` response with a null `icons`/`buttonSets`/`defaultButtons`/`flags`/
`eventBits` field throws a `NullPointerException` inside `createCenterPanel()`, called synchronously
on the EDT during dialog construction, surfacing as an "IDE Internal Error" balloon rather than the
graceful "not ready" message `ComposerLauncher` already shows for a fully-null `catalogs` object.

## Failure scenario

A malformed or partial bbj/composer/catalogs response with a null icons/ buttonSets/defaultButtons/flags/eventBits field throws NullPointerException inside createCenterPanel(), called synchronously from DialogWrapper.init() on the EDT during dialog construction — IntelliJ's top-level EDT handler shows an "IDE Internal Error" balloon instead of the graceful "not ready" message ComposerLauncher already has one level up for a fully-null catalogs object.

## Proposed approach

Null-default each sub-list to List.of() at the point of use, or guard before iterating.

## Acceptance criteria

Each of `MsgboxComposerDialog`, `AddWindowComposerDialog` and `AddChildWindowComposerDialog` either
null-defaults its `ComposerCatalogs` sub-list fields to `List.of()` at the point of use, or guards
before iterating, so a malformed or partial catalogs response no longer throws an unhandled
`NullPointerException` inside `createCenterPanel()`. Because no `src/test/` source set exists for
`bbj-intellij` today, regression coverage depends on that gap being closed first, or on a recorded
manual verification step at merge time confirming a null sub-list field no longer crashes dialog
construction.

## Traceability

Finding `P63-D2-008` · dimension D2 (secondary D1) · severity low · effort 4. `dedup: none`.
<!-- BODY-END P63-D2-008 -->

### 119. P63-D2-011 — intellij: both status-bar widgets update file-extension visibility only on a status-bus event, never on a bare editor-tab switch
**Route:** public issue
**Labels:** intellij, PRIO 3, 4

<!-- BODY-BEGIN P63-D2-011 -->
## Problem

Both `BbjStatusBarWidget` and `BbjJavaInteropStatusBarWidget` call `updateVisibility()` exclusively
from inside `updateStatus()`, which runs only on a server-status/java-interop-status message-bus
event or once at construction — neither file registers a `FileEditorManagerListener` or any other
editor-selection-change hook, so the widget's file-extension visibility check never re-runs on a
bare editor-tab switch.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java:67-114,bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java:65-108`

Surface: both widgets' `updateVisibility()` calls (`:99`/`:93`), reachable only from
`updateStatus()` (`:67-101`/`:65-95`), itself gated on a status-bus Topic subscription
(`:58-61`/`:56-59`) or construction time; no `FileEditorManagerListener` registration anywhere in
either file. Problem class: a visibility check tied to the wrong event source (status change
instead of editor-selection change). Impact: a user who opens a BBj file, making the widget visible,
then switches to a non-BBj file with no intervening status change keeps seeing the now-stale visible
widget; conversely, opening a first BBj file after the server already reached a stable status leaves
the widget hidden until an unrelated status transition happens to occur.

## Failure scenario

A user who opens a BBj file (widget becomes visible) and then switches to a non-BBj file, with no intervening server-status or java-interop-status change, keeps seeing the now-stale visible widget — and the reverse: opening a first BBj file after the server has already reached a stable "started" status (no further status event fires) leaves the widget hidden until some unrelated status transition happens to occur, if one ever does.

## Proposed approach

Register a FileEditorManagerListener. FILE_EDITOR_MANAGER subscription via the project message bus in each widget's constructor, disposed alongside messageBusConnection, calling updateVisibility() on selection change.

## Acceptance criteria

Both `BbjStatusBarWidget` and `BbjJavaInteropStatusBarWidget` register a
`FileEditorManagerListener.FILE_EDITOR_MANAGER` subscription via the project message bus in their
constructors, disposed alongside their existing `messageBusConnection`, calling `updateVisibility()`
on editor-selection change in addition to the existing status-bus trigger. Because no `src/test/`
source set exists for `bbj-intellij` today, regression coverage depends on that gap being closed
first, or on a recorded manual verification step confirming the widget updates on a bare tab switch.

## Traceability

Finding `P63-D2-011` · dimension D2 (secondary D3) · severity low · effort 4. `dedup: none`.
<!-- BODY-END P63-D2-011 -->

### 120. P63-D3-003 — intellij: composer dialogs fire one full preview LSP4IJ round trip per keystroke with no debounce, unlike the language server's own 500ms debounce
**Route:** public issue
**Labels:** intellij, PRIO 3, 4

<!-- BODY-BEGIN P63-D3-003 -->
## Problem

The identical inline `SimpleDocumentListener` in all three composer dialogs calls `refresh()`
synchronously from `insertUpdate`/`removeUpdate`/`changedUpdate` with no `Timer`/`Alarm`/
scheduled-executor anywhere in this unit, so every keystroke in any text field fires one full
`bbj/composer/*/preview` LSP4IJ round trip — unlike the language server's own 500ms trailing-edge
document-validation debounce.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java:268-272,AddWindowComposerDialog.java:300-305,AddChildWindowComposerDialog.java:309-314`

Surface: the identical `SimpleDocumentListener` in all three dialogs, with no
`com.intellij.util.Alarm`/`SingleAlarm`-style coalescing anywhere in the 13 files this unit covers.
Problem class: missing debounce on a high-frequency UI-triggered network request. Impact: fast
typing in any message/title/assignTo (Msgbox) or geometry/receiver field (addWindow/addChildWindow)
issues one LSP4IJ request per keystroke with no coalescing, each round trip updating the
schematic/statement/summary fields on the EDT — a redundant-request cost that scales with typing
speed rather than with actual settle points.

## Failure scenario

Fast typing in message/title/assignTo (Msgbox) or any of the geometry/receiver fields (addWindow/addChildWindow) issues one LSP4IJ request per keystroke with no coalescing, each round trip updating the schematic/statement/summary fields on the EDT — a redundant-request cost that scales with typing speed rather than with actual settle points.

## Proposed approach

Wrap each refresh() call in a shared debounce helper using com.intellij.util.Alarm.

## Acceptance criteria

All three composer dialogs' `SimpleDocumentListener` implementations route their `refresh()` calls
through a shared debounce helper built on `com.intellij.util.Alarm`, so fast typing coalesces into
one round trip per settle point rather than firing one LSP4IJ request per keystroke. Because no
`src/test/` source set exists for `bbj-intellij` today, regression coverage depends on that gap
being closed first, or on a recorded manual verification step timing request frequency during fast
typing before and after the change.

## Traceability

Finding `P63-D3-003` · dimension D3 · severity low · effort 4. `dedup: none`.
<!-- BODY-END P63-D3-003 -->

### 121. P63-D3-004 — intellij: every composer-open invocation re-resolves the language server and refetches static catalogs that never change at runtime
**Route:** public issue
**Labels:** intellij, PRIO 3, 4

<!-- BODY-BEGIN P63-D3-004 -->
## Problem

`ComposerLauncher.launch()` calls `BbjComposerService.server(project)` — itself re-resolving
`LanguageServerManager.start()` plus a fresh `getLanguageServer` future — followed unconditionally
by `server.composerCatalogs()` on every single composer-open invocation, even though the static
option catalogs are module-level constants on the language-server side that never change at
runtime.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:66-71,BbjComposerService.java:23-29`

Surface: `launch()`'s unconditional `server(project)` (`:66`) followed by `composerCatalogs()`
(`:71`) on every invocation, against the LS-side catalogs handler's module-level const arrays
(`composer-commands.ts:52-57`), which never change at runtime. Problem class: redundant
per-invocation network round trips for data that never varies within a session. Impact: every
"Compose MSGBOX"/"Compose addWindow"/"Compose addChildWindow" invocation — not just the first one in
a session — pays a server-resolution round trip plus a full catalogs round trip plus a decode round
trip before the dialog appears, even though the catalogs contents are identical to the previous
invocation's.

## Failure scenario

Every "Compose MSGBOX"/"Compose addWindow"/"Compose addChildWindow" invocation — not just the first one in a session — pays a server-resolution round trip plus a full catalogs round trip plus a decode round trip before the dialog appears, even though the catalogs contents are identical to the previous invocation's.

## Proposed approach

Cache the resolved BbjComposerServer/ComposerCatalogs per project, invalidated on LS restart.

## Acceptance criteria

`ComposerLauncher.launch()` caches the resolved `BbjComposerServer` and `ComposerCatalogs` per
project, invalidated on language-server restart, so only the first composer-open invocation in a
session pays the server-resolution and catalogs round trips. Because no `src/test/` source set
exists for `bbj-intellij` today, regression coverage depends on that gap being closed first, or on a
recorded manual verification step confirming subsequent invocations skip the redundant round trips.

## Traceability

Finding `P63-D3-004` · dimension D3 · severity low · effort 4. `dedup: none`.
<!-- BODY-END P63-D3-004 -->

### 122. P63-D3-006 — intellij: the TextMate bundle provider allocates a fresh temp directory and re-copies its bundle files on every IDE launch with no caching or cleanup
**Route:** public issue
**Labels:** intellij, PRIO 3, 4

<!-- BODY-BEGIN P63-D3-006 -->
## Problem

`BbjTextMateBundleProvider.getBundles()` calls `Files.createTempDirectory(...)` to allocate a
freshly, uniquely named directory on every invocation, then re-copies all five bundled TextMate
files into it, with no check for a prior valid copy, no caching of a stable target path, and nothing
in the file that deletes, registers a shutdown hook for, or calls `deleteOnExit()` on the directory
it creates.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjTextMateBundleProvider.java:27-48`

Surface: `getBundles()`'s `Files.createTempDirectory(Path.of(PathManager.getTempPath()),
"textmate-bbj")` call (`:29-30`) and its unconditional re-copy of the five `BUNDLE_FILES` (`:17-23`)
into it, with no cleanup call anywhere in the file. Problem class: unbounded temp-file accumulation
with no cleanup path. Impact: every IDE process that loads this plugin's TextMate bundle allocates a
new `"textmate-bbjXXXXXXXX"`-named temp directory and never removes the directory created by any
prior launch, so repeated launches accumulate abandoned directories in the plugin's temp path.

## Failure scenario

Every IDE process that loads this plugin's TextMate bundle (at minimum once per IDE launch, given the bundleProvider extension point is application-scoped) allocates a new "textmate-bbjXXXXXXXX"-named temp directory and re-copies five small files into it, and never removes the directory created by any prior launch — repeated launches accumulate abandoned directories in the plugin's temp path with no cleanup path in this code.

## Proposed approach

Cache bundleDir in a stable location, mirroring the Node.js download-and-cache logic's own getNodeDataDirectory() pattern (in bbj-intellij's BbjNodeDownloader.java), and skip the copy loop when a valid prior copy is already present.

## Acceptance criteria

`BbjTextMateBundleProvider.getBundles()` caches its target bundle directory in a stable location
instead of allocating a fresh uniquely named temp directory on every invocation, and skips the copy
loop when a valid prior copy is already present. Because no `src/test/` source set exists for
`bbj-intellij` today, regression coverage depends on that gap being closed first, or on a recorded
manual verification step confirming repeated IDE launches no longer accumulate new temp
directories.

## Traceability

Finding `P63-D3-006` · dimension D3 (secondary D2) · severity low · effort 4. `dedup: none`.
<!-- BODY-END P63-D3-006 -->

### 123. P63-D4-003 — intellij: three near-identical plugin-tool-path resolution methods duplicate the same lookup-and-null-check logic across two files
**Route:** public issue
**Labels:** intellij, PRIO 3, 4

<!-- BODY-BEGIN P63-D4-003 -->
## Problem

`getWebBbjPath()`/`getEmValidateBbjPath()` (`BbjRunActionBase.java`) and `getEMLoginBbjPath()`
(`BbjEMLoginAction.java`) each independently resolve a plugin-bundled tool script path through the
identical sequence — `PluginId.getId` → `findEnabledPlugin` → null-check → `resolve("lib/tools/
<name>")` → existence check → return path-or-null — with no shared helper anywhere in this unit.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:231-248,256-272,BbjEMLoginAction.java:158-168`

Surface: the three near-identical tool-path-resolution methods, differing only in target filename
and minor null-check ordering, with no shared "resolve a plugin-bundled tool script path" helper.
Problem class: duplicated resolution logic across two files. Impact: any future change to the
plugin-ID lookup or bundling convention (for example, supporting a second plugin ID for a rebrand,
or changing the `lib/tools/` layout) must be applied at three separate sites by hand, with drift
risk between them.

## Failure scenario

n/a (D4 is a code-shape finding) — any future change to the plugin-ID lookup or bundling convention (e.g. supporting a second plugin ID for a rebrand, or changing the lib/tools/ layout) must be applied at three separate sites by hand across two files, with drift risk between them.

## Proposed approach

Add a small static helper and delegate all three call sites to it.

## Acceptance criteria

A single shared helper resolves a plugin-bundled tool script path given a filename, and
`getWebBbjPath()`, `getEmValidateBbjPath()` and `getEMLoginBbjPath()` all delegate to it instead of
each repeating the resolution sequence independently. Because no `src/test/` source set exists for
`bbj-intellij` today, regression coverage depends on that gap being closed first, or on a recorded
manual verification step confirming all three actions still resolve their tool scripts correctly
after the change.

## Traceability

Finding `P63-D4-003` · dimension D4 · severity low · effort 4. `dedup: none`.
<!-- BODY-END P63-D4-003 -->

### 124. P63-D4-004 — intellij: BbjRunBuiAction and BbjRunDwcAction duplicate 131 of 142 lines of shared run-action logic, differing only in a handful of BUI/DWC-specific literals
**Route:** public issue
**Labels:** intellij, PRIO 3, 4

<!-- BODY-BEGIN P63-D4-004 -->
## Problem

`BbjRunBuiAction.java` and `BbjRunDwcAction.java` are 142-line files that differ in only 11 lines
each — the "BUI"/"DWC" client-type literal, three user-facing message strings, the constructor's
display text/icon, and `getRunMode()`'s return value — with the remaining 131 lines, including the
entire EM-login/token-validation/classpath/config-path/command-line-assembly flow, byte-for-byte
identical between the two files.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java,BbjRunDwcAction.java`

Surface: `git diff --no-index --numstat` between the two files reports 11 of 142 lines differing per
file. Problem class: near-total structural duplication between two action classes. Impact: any
future fix to the shared BUI/DWC flow (for example, the EDT-blocking fix this band's `P63-D2-004`
describes, or a classpath-handling change) must be applied identically in two files by hand, with
drift risk if one copy is updated and the other missed.

## Failure scenario

n/a (D4 is a code-shape finding) — any future fix to the shared BUI/DWC flow (e.g. the P63-D2-004 EDT-blocking fix, or a classpath-handling change) must be applied identically in two files by hand, with drift risk if one copy is updated and the other missed.

## Proposed approach

Introduce a getClientType() abstract method and move the shared body up to BbjRunActionBase.

## Acceptance criteria

`BbjRunBuiAction` and `BbjRunDwcAction` no longer duplicate their shared 131-line body —
`BbjRunActionBase` gains a `getClientType()` abstract method (or equivalent), and the shared flow
moves up into the base class, with the two subclasses reduced to their differing BUI/DWC-specific
literals. Because no `src/test/` source set exists for `bbj-intellij` today, regression coverage
depends on that gap being closed first, or on a recorded manual verification step confirming both
Run As BUI and Run As DWC still behave identically after the refactor.

## Traceability

Finding `P63-D4-004` · dimension D4 · severity low · effort 4. `dedup: none`.
<!-- BODY-END P63-D4-004 -->

### 125. P63-D4-005 — intellij: three composer-launch actions are near-identical files differing only in one Kind enum constant and doc text
**Route:** public issue
**Labels:** intellij, PRIO 3, 4

<!-- BODY-BEGIN P63-D4-005 -->
## Problem

`BbjComposeAddChildWindowAction.java`, `BbjComposeAddWindowAction.java` and
`BbjComposeMsgboxAction.java` are three 38-line files sharing an identical structure —
null-guarding project/editor in `update()`, delegating to `ComposerLauncher.launch(project, editor,
Kind.X)` in `actionPerformed()`, declaring `ActionUpdateThread.BGT` — differing only in the `Kind`
enum constant and doc text.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeAddChildWindowAction.java,BbjComposeAddWindowAction.java,BbjComposeMsgboxAction.java`

Surface: pairwise `git diff --no-index --numstat` reports 4 of 38 lines differing between
AddChildWindow and AddWindow, and 5 of 38 between AddWindow and Msgbox — in both cases only the
class doc, class name and `Kind` enum constant. Problem class: three files existing purely to supply
one differing enum constant to a shared call. Impact: a fourth composer kind would add a fourth
near-identical file rather than a single data-driven registration, compounding the duplication with
each new composer type.

## Failure scenario

n/a (D4 is a code-shape finding) — three files exist purely to supply one differing enum constant to a shared call; a fourth composer kind would add a fourth near-identical file rather than a single data-driven registration.

## Proposed approach

A single BbjComposeAction(Kind) constructed three times in plugin.xml via constructor-arg registration, replacing three Java files with one.

## Acceptance criteria

The three near-identical composer-launch action classes are replaced with a single
`BbjComposeAction(Kind)` constructed three times in `plugin.xml` via constructor-arg registration,
so a future composer kind is added by registering one more `plugin.xml` entry rather than authoring
a fourth near-identical Java file. Because no `src/test/` source set exists for `bbj-intellij` today,
regression coverage depends on that gap being closed first, or on a recorded manual verification
step confirming all three composer menu actions still launch correctly after the consolidation.

## Traceability

Finding `P63-D4-005` · dimension D4 · severity low · effort 4. `dedup: none`.
<!-- BODY-END P63-D4-005 -->
