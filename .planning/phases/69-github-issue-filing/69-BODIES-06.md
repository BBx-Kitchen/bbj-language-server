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
