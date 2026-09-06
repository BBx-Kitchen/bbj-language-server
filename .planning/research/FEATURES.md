# Feature Research

**Domain:** Polish/quality milestone for an existing dual-IDE (VS Code + IntelliJ via LSP4IJ) Langium language server for BBj — composer discoverability, config hot-reload, and responsiveness fixes
**Researched:** 2026-09-06
**Confidence:** HIGH (composer/config mechanics — read directly off this repo's own shared modules and official IDE docs); MEDIUM (BASIS CVS()/SETOPTS bit semantics — two BASIS doc pages disagree on one bit, both cited); MEDIUM (IntelliJ CodeLens/Code-Vision rendering behavior — inferred from LSP4IJ project docs, not hand-verified in a running IDE)

## Feature Landscape

This is not a green-field feature set — it is 23 already-triaged GitHub issues grouped into three
work streams by `.planning/PROJECT.md`. "Table stakes" below means *the behavior the issue's own
acceptance criteria already commits to*; "differentiators" means *a design choice this research
surfaces that goes beyond the issue text but is cheap given code already in the repo*; "anti-features"
means *a tempting but wrong approach the issue text or the domain semantics rule out*.

### Table Stakes (the 23 issues already commit to these)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Visible, non-intrusive composer cue in both IDEs for every composer (MSGBOX, addWindow, addChildWindow, CVS, SETOPTS) | #650 explicitly says the lightbulb-only/context-menu-only status quo is not discoverable enough; a BBj developer must be able to *see* a composer exists without guessing | MEDIUM | See Architecture Recommendation below — route through a real `textDocument/codeLens` on the shared LS, not a client-specific gutter mechanism |
| MSGBOX composer offered for expression-valued `options` args (`BBjMsgBox.X+BBjMsgBox.Y`, `1+256`) | #648 — today `parseMsgboxCallOnLine`'s `exprValue` regex (`^\s*\d+\s*$`, `msgbox-composer.ts:510`) only matches a bare integer literal, so the Code Action/lightbulb never appears for any expression | MEDIUM | Table stakes = offer the composer at all for these lines (compose-and-replace, not necessarily decode-and-prefill); see Anti-Features |
| CVS() visual composer | #649 — parity with the three existing composers (MSGBOX, addWindow, SETOPTS) | MEDIUM | Bit model verified against BASIS docs, see "CVS() option model" below |
| SETOPTS composer for `config.bbx` on IntelliJ | #633 — VS Code already has this (CodeLens-launched, shipped #474/0.12.0); IntelliJ has zero SETOPTS composer today | MEDIUM-HIGH | Needs a *new* `bbj/composer/setopts/*` LS command layer (none exists — `composer-commands.ts` currently only registers `bbj/composer/{catalogs,msgbox/*,addwindow/*,addchildwindow/*}`) plus new `SetoptsComposerDialog.java`/DTOs/launcher wiring on IntelliJ |
| SETOPTS-in-code decode hovers + tri-state Set/Clear/Leave composer | #475 — the runtime-relative (`OPTS`-based) IOR/AND read-modify-write pattern cannot be treated like the absolute config.bbx vector; decode must be statically sound per-statement, not whole-program | HIGH | Explicitly tiered by the issue itself: (1) shared catalog reuse from `setopts-catalog.ts`, (2) read-only hover/CodeLens decode, (3) create-composer, (4) edit-composer only for two statically-safe shapes (absolute literal; canonical `var$=OPTS`...`SETOPTS var$` block) |
| VS Code composer edits validated before applying (`addWindow`/`addChildWindow` free-text fields) | #623 — msgbox's `insert` handler already gates on `r.valid`; addwindow/addchildwindow apply unconditionally | LOW | Direct port of an existing pattern in the same codebase (`msgbox-composer-webview.ts` `r.valid`) |
| Re-validate captured coordinates after the MSGBOX wizard completes | #532 — `runComposer` in `msgbox-composer-ui.ts` applies coordinates captured *before* a 4-step QuickPick wizard ran, with no re-resolve | LOW | Re-resolve the call at the captured line immediately before `editor.edit()`; abort (not apply) on mismatch |
| Per-panel webview listener disposal | #530 — all 4 composer webviews leak a message-handler closure per open/close (`onDidReceiveMessage` registered on `context.subscriptions`, never on `panel.onDidDispose`) | LOW | Same one-line fix pattern needed in 4 files |
| IntelliJ composer dialogs debounce preview round trips | #611 — no `Alarm`/`Timer` anywhere in the 3 dialogs' `SimpleDocumentListener`s; every keystroke fires a full `bbj/composer/*/preview` LSP4IJ round trip | LOW-MEDIUM | The LS side already debounces validation at 500ms trailing-edge (`bbj-document-validator.ts`) — mirror that constant on the IntelliJ side via `com.intellij.util.Alarm` |
| IntelliJ composer dialogs cache the resolved server handle + static catalogs | #612 — every "Compose X" invocation re-resolves `LanguageServerManager.start()` and refetches `bbj/composer/catalogs`, which is a module-level constant on the LS side (`composer-commands.ts:51-57`) that never changes at runtime | LOW | Cache per-project, invalidate only on LS restart |
| Config file watched + reload on change (PREFIX, project-wide USE) | #486 — config.bbx is read only at LS startup today; the extension itself ships a config editor (SETOPTS composer), so "edit config inside the IDE, see it take effect" is a first-class flow | MEDIUM | See "Config reload: prompt vs. auto" below — issue text itself offers both options |
| Custom-named/located config file honored everywhere + associated with the config language | #485 — `bbj.configPath`/IntelliJ's config-path field already control what the *server* reads; the *editor's* `bbx-config` language association is still filename-hardcoded (`config.bbx`/`config.min` literal lists in both `package.json`/TextMate bundle) | MEDIUM | Two independent halves: (a) audit every LS consumer of the config path for the setting vs. a hardcoded default; (b) dynamically set the document's language ID when the file at the configured path is opened, in both IDEs |
| IntelliJ Refresh Java Classes via targeted request, not full restart | #632 — VS Code already sends a single `bbj/refreshJavaClasses` request (`extension.ts:694-704`); IntelliJ's action calls `BbjServerService.restart()`, taking every language feature offline for the restart duration | LOW-MEDIUM | Contingent per the issue's own acceptance criteria on confirming LSP4IJ's client API can issue a custom request without a full server restart; if not, the fallback acceptance is a documented rationale, not a workaround |
| java-interop port auto-detection for every settings reader | #608 — only `BbjSettingsConfigurable.reset()` auto-detects the port (gated on a broken `== 5008` equality check); `BbjSettings.getState()` — every other caller's entry point — does not | LOW | Move detection into `getState()` itself, replace the equality gate with a real "never configured" sentinel, mirroring how `bbjHomePath`/`nodeJsPath` already work there |
| Workspace-size-independent scope resolution + symbol collection | #505 — `getBBjClassesFromFile()` does a full linear scan of the whole workspace index per `::file::Class` reference; `collectLocalSymbols()` walks every document's full AST with no `isExternalDocument` pruning | HIGH | Needs a per-file cache keyed on `bbjFilePath`+URI, and pruning mirroring `bbj-linker.ts`'s existing `treeIter.prune()` |
| Interop reachability circuit breaker | #504 — `resolveClassByName()` serializes resolutions behind one lock with no failure memory; against an unreachable peer, N unresolved classes cost `~10×N` seconds | HIGH | Circuit breaker resets only on `clearCache()` |
| LRU eviction race fix (cyclic resolution) | #497 — a class's own cache entry can be evicted mid-recursion by concurrent `.set()`s from unrelated classes, causing a spurious ~30s stall + stub-class fallback for classes that do resolve | HIGH | Needs either pinning in-flight entries against eviction, or a same-chain-aware pending-promise check |
| Shared per-request cancellation token | #498 — `activeCancelToken` is *instance* state on a singleton `BBjCompletionProvider`; concurrent completion requests for different open documents can observe each other's token | MEDIUM | Correct fix threads the token through Langium's extension points; a minimal fix snapshots/restores around the awaited section |
| Coarse-mtime-safe decompile freshness check | #500 — `.lst` freshness gate requires `mtimeMs >= callStartMs`; on FAT/exFAT/HFS+/some network filesystems mtime truncates to whole seconds, so a genuinely fresh write can round down below `callStartMs` and spin the full 20s timeout | MEDIUM | Needs slack (~1-2s) or a fallback to pure size-settling when fine mtime resolution can't be confirmed |
| Stale in-flight format promise fix | #499 — a second format request sharing an in-flight `formatPromise` applies the *first* request's formatted content over a full-document range computed at *resolution* time, silently discarding interim edits | LOW-MEDIUM | Compare freshly-read content against what the in-flight promise started with; bypass sharing on mismatch |
| Graceful no-editor-focused handling for Run/Compile/Decompile commands | #512 — `run()`, `runWeb()`, `decompile()`, `compile()` in `Commands.cjs` throw a `TypeError` when invoked via keybinding/Command Palette with no active editor; a 5th sibling function already has the guard | LOW | Direct copy of `resolveTargetFileName()`'s existing `params && params.fsPath` guard |
| Disposed VS Code registrations | #531 — 16 of `extension.ts`'s `activate()` registrations (14 commands, 1 formatting provider, 1 notification handler) are never pushed to `context.subscriptions`, so a second `activate()` in-process throws "command already exists" | LOW | Wrap each in the same push pattern already used elsewhere in the file |
| IntelliJ status-bar widgets follow editor-tab switches | #610 — both widgets' visibility check only re-runs on a status-bus event, never on a bare tab switch; stale visible/hidden state persists across file switches with no status change | LOW-MEDIUM | Register a `FileEditorManagerListener.FILE_EDITOR_MANAGER` subscription per widget, disposed with the existing `messageBusConnection` |

### Differentiators (worth doing beyond the literal issue text, because the codebase already pays for it)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Route ALL composer discoverability cues through a real LSP `textDocument/codeLens` on the shared language server, not per-client gutter/lightbulb code | One implementation on the server ("this line has a composer") renders natively in both clients: VS Code's built-in `CodeLensProvider` and IntelliJ's LSP4IJ, which maps LSP CodeLens to its native "Code Vision" inline entries via `createCodeVisionEntry` — no per-IDE PSI/LineMarkerProvider needed | MEDIUM | See Architecture Recommendation below — this is the single biggest opinionated call in this research |
| Resolve `BBjMsgBox.X+BBjMsgBox.Y`-style expressions to a numeric preview via java-interop before falling back to compose-only mode | Turns #648 from "offer the composer, blind" into "offer the composer, correctly pre-filled" for the common case (constant sums), since java-interop already resolves Java static fields for completion/hover | MEDIUM-HIGH | Only sound when every summand resolves to a *constant* `int` field; anything else must still fall back cleanly, matching the SETOPTS-in-code design's own two-tier discipline (decode when statically sound, compose-only otherwise) |
| Give the CVS() catalog the same `since`/version-gate annotation shape `setopts-catalog.ts` already uses for `SETOPTS_BITS` | The chars-parameter behavior for CVS() bits 1/2/16/32/128 is version-gated (BBj 19.0+ single-char, BBj 19.10+ multi-char per the BBj-specific doc) — reusing an existing annotation field instead of inventing a new one keeps the two catalogs consistent for whoever maintains them next | LOW | See "CVS() option model" below for the exact values |
| Prompt-before-restart (not silent auto-restart) for the config-watcher in #486 | The issue's own proposal text flags this as optional ("Optionally prompt... to avoid surprising rebuilds while the user is still editing"); IDE conventions researched below lean toward "debounced auto-action with visible feedback" for LS-internal restarts and "prompt" only for externally-triggered file changes on an open buffer — config.bbx is usually edited by the user *inside* the composer, which argues for debounce + silent restart with a status-bar/notification breadcrumb, not a blocking dialog | LOW | Decision affects only which of two ~equally-sized code paths gets built; no new capability either way |

### Anti-Features (tempting but wrong here)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Statically evaluating arbitrary MSGBOX/CVS() option expressions in general | #648's examples look "just" arithmetic, so it's tempting to build a general constant-folding evaluator | BBj expressions can reference variables, method calls, or Java statics resolved only at runtime; a general evaluator either lies (wrong preview) or silently degrades everywhere, which is worse than clearly offering compose-only mode on unrecognized shapes | Recognize only the specific `+`-joined constant-field pattern (see Differentiators); everything else gets the same "offer to compose/replace, don't pretend to decode" treatment #475 already designed for SETOPTS-in-code |
| "Decode-and-edit-in-place" for every SETOPTS-in-code shape | It would feel more powerful/complete than the tiered #475 design | The effective options vector at any code point is a **runtime value** (`OPTS`-derived); anything beyond the two statically-safe shapes (absolute literal; the canonical `var$=OPTS`...`SETOPTS var$` block with only `IOR`/`AND` statements in between) cannot be soundly decoded — aliasing, intervening statements, or computed masks make "current state" undecidable at edit time | #475 already scopes edit-mode narrowly and keeps read-only hover decode available everywhere else; do not widen edit-mode's scope |
| Silent unconditional auto-restart on every config-file write event, with no debounce and no user-visible signal | Feels "just works" | A user actively editing config.bbx through the SETOPTS composer (which itself writes the file) would trigger LS restarts on every keystroke-driven save; combined with #486's own PREFIX/USE-invalidation rationale (an in-place re-eval is "effectively a workspace re-init with high stale-state risk"), an undebounced restart could interrupt the composer's own decode/preview round trips | Debounce the watcher (same trailing-edge shape already used for BBjCPL, 500ms) and surface a lightweight, non-blocking signal (status bar text, matching the existing "BBjCPL: unavailable" convention) rather than either a blocking prompt or a silent thrash |
| A native IntelliJ `LineMarkerProvider`/gutter icon per composer, built independently of the language server | It is the textbook IntelliJ mechanism for "there's something actionable on this line" | This plugin has no native PSI/language implementation for BBj — IntelliJ support is entirely LSP4IJ-mediated text editing; a `LineMarkerProvider` needs a `PsiElement` to attach to, which this architecture does not produce. Building one would mean either fabricating a shadow PSI tree (large, fragile, out of scope) or duplicating the composer-applicability logic in Java parallel to the TypeScript LS logic (violates the DRY principle `composer-commands.ts`'s own header states: "adds NO new flag/hex logic... single source of truth") | Use LSP CodeLens (see Architecture Recommendation) — IntelliJ/LSP4IJ already renders it without any PSI work |
| Building the config-file custom-name association (#485) as a purely client-side filename-pattern extension (e.g., wildcard glob in `contributes.languages`) | Looks like the smallest possible diff | It solves only "syntax highlights" and not "the composer/CodeLens/hover tooling recognizes this file", because those are gated on `languageId === 'bbx-config'` set at document-open time, and the *actual* configured path is a runtime setting the static manifest can't express | Dynamically set the document language when the file at the *resolved* configured path is opened (both IDEs), exactly as #485's own text specifies |

## Feature Dependencies

```
Shared bbj/composer/setopts/* LS command layer (#633's prerequisite)
    └──requires──> setopts-catalog.ts (already exists, from #474)
                       └──enables──> IntelliJ SetoptsComposerDialog.java (#633)
                       └──enables──> SETOPTS-in-code tri-state composer (#475, tier 1: "Shared catalog")

SETOPTS-in-code decode hovers (#475 tier 2, read-only)
    └──independent of──> SETOPTS-in-code composer create/edit (#475 tiers 3-4)
        (tier 2 ships alone and is "always sound"; tiers 3-4 can lag)

A visible composer cue in both IDEs (#650)
    └──best implemented as──> textDocument/codeLens on the shared LS (Differentiator, see below)
                                   └──requires──> LS-side "which composer, if any, applies to this line" query
                                                      already exists per-composer as *Line/*decodeCall handlers
                                                      in composer-commands.ts — #650 needs only a thin
                                                      aggregation + CodeLens response wrapper, reusing them
                                   └──enables──> MSGBOX composer for #648 to surface via the same lens
                                   └──enables──> CVS() composer (#649) to surface via the same lens
                                   └──enables──> IntelliJ SETOPTS composer (#633) to surface via the same lens

MSGBOX composer for expression-valued options (#648)
    └──requires──> composer's existing findMsgboxCallAt/parseMsgboxCallOnLine (msgbox-composer.ts) generalized
                   from "arg is integer literal" to "arg is a recognized-or-unrecognized expression",
                   defaulting to compose-only when unrecognized

Config file watch-and-reload (#486)
    └──requires──> custom-named/located config file support (#485) resolved FIRST
                   (must watch the RESOLVED path — bbj.configPath if set, else the default — so the
                   watcher target and #485's "what the editor treats as a config file" must agree)

IntelliJ Refresh Java Classes via targeted request (#632)
    └──requires──> confirmation LSP4IJ's client API supports issuing a custom request without a full
                   restart (an open question per the issue's own acceptance criteria) — this is a
                   go/no-go gate, not just an implementation detail

java-interop port auto-detection in getState() (#608)
    └──unblocks──> every other IntelliJ feature that reads javaInteropPort directly (settings-bypass
                   consumers), not just the Settings dialog

Workspace-size-independent scope resolution (#505)
    └──shares root cause with──> the interop circuit breaker (#504) and the LRU eviction race (#497):
                   all three trace back to issue #232's "100% CPU in multi-project workspaces" umbrella,
                   but are independently fixable and independently testable
```

### Dependency Notes

- **#650 (discoverability) is upstream of #648 and #649's "is this composer visible" concern**, not
  just a cosmetic add-on — if #650 lands as a shared LSP CodeLens surface, both #648 (MSGBOX with
  expressions) and #649 (CVS()) get their visibility story for free, and #633 (IntelliJ SETOPTS)
  gets a working discoverability answer on day one instead of needing IntelliJ-specific UI to be
  retrofitted later.
- **#486 must resolve the same path #485 makes configurable.** Building the file watcher against a
  literal `{bbj.home}/cfg/config.bbx` while #485 lets users point elsewhere would silently reintroduce
  the exact "editor colors it, but the tooling doesn't read it" confusion #485 exists to close.
- **#475 tier 2 (decode hovers) has no dependency on tiers 3-4** and can ship as a strict subset if the
  milestone needs to descope; tiers 3-4 (composer create/edit) both depend on tier 1's shared catalog,
  which already exists.
- **#504/#497/#505 are three separate fixes to one underlying capacity problem** (#232). They do not
  conflict, but a plan that tries to fix all three with one shared abstraction risks under-scoping each
  — the issues themselves propose three different mechanisms (circuit breaker; in-flight pinning or
  same-chain pending check; per-file cache + AST pruning).

## Architecture Recommendation: composer discoverability via shared LSP CodeLens

**Why this belongs in FEATURES, not just ARCHITECTURE:** it changes what #650, #648, #649, and #633
actually build, so it is load-bearing for scoping, not an implementation detail to defer.

Today, VS Code's SETOPTS composer cue is a `vscode.CodeLensProvider` registered **client-side only**
in `setopts-composer-ui.ts` — it calls the shared, `vscode`-free `parseSetOptsLine()` from
`setopts-catalog.ts` directly, in-process, with no LSP round trip. MSGBOX/addWindow/addChildWindow use
a **different** mechanism: a `vscode.CodeActionProvider` surfaced as a lightbulb (client-side too, but
a different UI affordance). On IntelliJ, MSGBOX/addWindow/addChildWindow are `IntentionAction`s (shown
as a lightbulb when the caret sits on the line — confirmed current JetBrains Platform behavior: "If an
intention action is enabled, the alert shows automatically when the caret rests on the
problem-causing piece of code"), and SETOPTS has no IntelliJ composer at all.

Two IDE-idiomatic "something is here, all the time, no cursor placement needed" mechanisms exist:
- **VS Code:** `CodeLens` — a small, low-emphasis inline annotation above a line of code.
- **IntelliJ:** `LineMarkerProvider`-based gutter icons, OR — critically — **LSP4IJ's built-in mapping
  of `textDocument/codeLens` LSP responses into IntelliJ's native "Code Vision" inline entries** via
  `createCodeVisionEntry`, confirmed present in the `lsp4ij` project's own developer docs.

Since this plugin has **no native BBj PSI/language implementation on IntelliJ** — everything is
LSP4IJ-mediated — a `LineMarkerProvider` has no `PsiElement` to attach to; building one would require
either a shadow PSI tree or duplicating composer-applicability logic in Java (violating
`composer-commands.ts`'s own stated single-source-of-truth principle). LSP4IJ's CodeLens-to-Code-Vision
bridge sidesteps this entirely: **implement `textDocument/codeLens` once on the shared language
server** (returning "a composer applies here" entries for MSGBOX/addWindow/addChildWindow/CVS/SETOPTS
lines, reusing the `*decodeCall`/`*parseLine` logic that already exists per composer in
`composer-commands.ts`), and both VS Code (native `CodeLensProvider` support) and IntelliJ (LSP4IJ's
Code Vision bridge) render it with zero per-client composer-applicability logic. This directly answers
#650's ask for "more visible than the lightbulb... IntelliJ seems to give no cue at all" in both IDEs
from one implementation, and gives #633/#649/#648 their discoverability story without extra work.

**Complexity:** MEDIUM. The applicability detection per composer already exists; new work is (a) a
`textDocument/codeLens` handler that scans open-document lines and aggregates the five composers'
existing per-line detectors, (b) wiring `codeLensProvider` server capability + `bbj/composer/*`-command
payloads into the CodeLens `command` field, (c) retiring the VS Code SETOPTS client-side CodeLens
provider and the MSGBOX/addWindow/addChildWindow lightbulb-only Code Actions in favor of the shared
lens (or keeping both — lightbulb for "quick fix" muscle memory, lens for ambient visibility — is a
legitimate compromise if resourcing is tight).

## CVS() option model (sourced to BASIS documentation)

Two BASIS pages describe CVS(); the BBj-specific page is authoritative for this project's target
language and documents one bit the generic PRO/5 page omits.

**Syntax (BBj):** `CVS(string, int {, chars} {, ERR=lineref})`
— [BASIS: CVS() Function (BBj)](https://documentation.basis.cloud/BASISHelp/WebHelp/commands/bbj-commands/cvs_function_bbj.htm)

| Bit value | Operation | Source |
|-----------|-----------|--------|
| 0 | No operation | Both pages |
| 1 | Strip leading spaces (customizable via `chars`) | Both pages |
| 2 | Strip trailing spaces (customizable via `chars`) | Both pages |
| 4 | Convert to uppercase | Both pages |
| 8 | Convert to lowercase | Both pages |
| 16 | Convert non-printable characters to spaces (customizable via `chars`) | Both pages |
| 32 | Replace multiple consecutive spaces with a single space | Both pages |
| 64 | Replace comma/period per current `SETOPTS` mask-replacement settings | Both pages (generic page: "as specified in OPTS") |
| 128 | Strip all spaces (customizable via `chars`) | **BBj-specific page only** — the generic PRO/5 page's table stops at 64 |

Key semantics for the composer's option model (both pages agree):
- **Additive/combinable:** multiple operations combine by summing bit values (e.g. `CVS(A$,5)` = strip
  leading spaces (1) + uppercase (4)).
- **Fixed evaluation order:** "When multiple operations are combined in a single CVS() function, they
  are guaranteed to be applied in ascending numeric order" — regardless of the order bits were checked
  in the composer UI, matching each option's own bit value 1→2→4→8→16→32→64→128. To force a
  non-standard order, the *user* must nest separate `CVS()` calls (`CVS(CVS(A$,1),4)`); the composer
  should not attempt to encode nesting — a single flat checkbox list matches CVS()'s own additive
  model directly, and any "I need bit 4 before bit 1" case is out of scope for a single composed call.
- **`chars` parameter (BBj 19.0+):** an optional argument replaces the default space character for
  operations 1, 2, 16, and 128 (per the BBj-specific page's own list, which also includes 32 in its
  prose but the composer should treat 1/2/16/32/128 as the customizable set per that page).
- **Multi-character `chars` (BBj 19.10+):** operations 1, 2, and 128 additionally accept *multiple*
  characters in `chars`, not just one.
- **`JAVA_CVS` compatibility mode:** when enabled, character classification uses Java functions
  instead of the `!CTYPE` string — an existing-behavior note, not something the composer needs to
  expose as an option (it affects runtime classification, not the call's own arguments).

This maps cleanly onto the existing `SetOptsBit`-style catalog shape in `setopts-catalog.ts`
(`since` field for version gates), reusing the same pattern for a new `CVS_BITS` catalog rather than
inventing new metadata shape (see Differentiators).

## SETOPTS-in-code option model (sourced to BASIS documentation)

- **Read-modify-write pattern** (confirmed, matches #475's own code sample exactly):
  1. `LET A$ = OPTS` — read current state
  2. `LET A$(byte,1) = IOR(A$(byte,1), $hh$)` — **set** bits (OR in the mask)
  3. `LET A$(byte,1) = AND(A$(byte,1), $hh$)` — **clear** bits (AND with the *inverted* mask — the
     stored literal is what remains after clearing, not the bits being cleared)
  4. `SETOPTS A$` — apply
  — [BASIS: SETOPTS Verb](https://documentation.basis.cloud/BASISHelp/WebHelp/commands/setopts_verb.htm)
- **This confirms #475's core design decision (tri-state Set/Clear/Leave) is correct**, not just
  convenient: because `AND()`'s mask is inverted relative to "which bits this line clears," a
  checkbox UI cannot show "Clear" as a literal hex value — it must un-invert on decode and re-invert
  on codegen, exactly as #475 specifies.
- **BBj-specific behavioral notes relevant to hover/decode accuracy**, from the BBj-specific SETOPTS
  page — [BASIS: SETOPTS Verb (BBj)](https://documentation.basis.cloud/BASISHelp/WebHelp/commands/bbj-commands/setopts_verb_bbj.htm):
  - Byte 3 bit `$40$` (advisory locking): BBj cannot open the same file with both advisory and
    mandatory locking simultaneously (`!ERROR=13` if attempted), and the setting only takes effect on
    the *next* open/close of the file, not immediately — worth surfacing in the hover text so a
    developer doesn't expect an instant effect.
  - Byte 8 bit `$40$` (BBj-specific): causes the `MKEYED` verb to create `XKEYED` files instead —
    already annotated `bbj: 'bbj-specific'` in `setopts-catalog.ts`, confirming the existing catalog
    is accurate against the current doc.
  - Settings are task-specific and unaffected by `BEGIN`/`RESET`/`CLEAR`/`START` — relevant context for
    a hover tooltip explaining *why* a decoded value might look different from what's expected after
    those verbs run.

## Config reload: prompt vs. auto-reload conventions (sourced to IDE/tooling behavior)

Research into both VS Code extension conventions and IntelliJ Platform conventions shows a split, not
a single universal answer — the right choice depends on *who* is expected to be the one changing the
file and *how disruptive* re-applying the change is:

- **VS Code language-server ecosystem trend is toward silent auto-restart, not prompting.** The Go
  extension explicitly replaced "please reload" messages with automatic restart calls so config
  changes take effect without user action — [reference: microsoft/vscode-go PR #3211, "Restart
  language server automatically when its configuration changes"](https://github.com/microsoft/vscode-go/pull/3211).
  Generic "Reload Window" prompts are considered a legacy workaround pattern, not best practice, per
  ongoing discussion in [microsoft/vscode issue #76405, "Restart language server – a generic
  solution"](https://github.com/microsoft/vscode/issues/76405).
- **IntelliJ Platform's default behavior for an externally-changed *open* file is a notification bar
  with an explicit Reload action** (not silent), unless the user has enabled
  "Synchronize files on frame or editor tab activation," in which case it reloads silently on
  focus return — confirmed via multiple JetBrains support threads on `EditorNotificationPanel`/VFS
  refresh behavior. VFS refresh is timestamp-based: a change that doesn't bump the file's mtime is not
  picked up at all, which is directly relevant to #486's watcher (must trigger on a real file-system
  event, not assume any particular save path).
- **Applied to #486 specifically:** config.bbx is edited by the developer largely *through this
  extension's own SETOPTS composer*, not by an external tool — that argues for the **auto-restart**
  end of the spectrum (the user just clicked "Insert" in a dialog this same extension provided; a
  second confirmation dialog asking "reload now?" is redundant friction), gated by the same debounce
  discipline already established for BBjCPL (500ms trailing-edge) so a burst of composer-driven writes
  collapses into one restart. A visible-but-non-blocking signal (status-bar text, matching the
  existing "BBjCPL: unavailable" convention already in this codebase) gives the user feedback without
  a modal. This recommendation is presented as such — the issue text itself frames auto-restart vs.
  prompt as an open call ("Optionally prompt... instead of auto-restarting") — and PROJECT.md's
  existing "Status bar over notification balloons for BBjCPL" decision is a direct precedent for the
  same choice here.

## Feature Prioritization Matrix

Because scope is fixed to the 23 milestone issues (not a backlog to triage from), this matrix ranks
*within* that fixed scope for phase-ordering purposes, using the effort/severity numbers each issue
already carries in its own Traceability section.

| Feature area | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Composer discoverability (#650, #648, #649, #633, #475) | HIGH — this is the milestone's headline "can a developer notice the difference" theme | HIGH — #475 alone is a 4-tier design; #633 needs a brand-new LS command layer | P1 |
| VS Code composer robustness (#623, #532, #530) | MEDIUM — correctness/hygiene fixes, low individual severity per their own traceability (low/medium) | LOW — each is a small, well-scoped diff mirroring an existing pattern in the same file | P1 (cheap, do alongside the composer work touching the same files) |
| IntelliJ composer perf (#611, #612) | MEDIUM — noticeable only under fast typing / repeated invocation | LOW | P2 |
| Config hot-reload (#486, #485, #632, #608) | HIGH — directly closes a known confusing gap ("config.min looks supported because it's highlighted, but isn't read") | MEDIUM — #486 depends on #485 landing first | P1 |
| Responsiveness/hangs (#505, #504, #497, #498, #500, #499, #512, #531, #610) | HIGH — several are severity "high" in their own traceability (#505, #504) and directly explain the long-standing #232 CPU complaint | HIGH — #505/#504/#497 are all effort-8, non-trivial concurrency/caching fixes | P1 for #505/#504 (severity high); P2 for the effort-4 hygiene items (#512, #531, #610, #499, #498) |

**Priority key:**
- P1: Committed this milestone (all are — scope is fixed), ordered first within the milestone
- P2: Committed this milestone, safe to sequence after P1 items in the same phase or a later phase

## Sources

- Required reading (primary sources for this research): `.planning/PROJECT.md`,
  `/tmp/.../scratchpad/v43-issues.md` (full text of all 23 in-scope GitHub issues),
  `bbj-vscode/src/setopts-catalog.ts`, `bbj-vscode/src/language/composer-commands.ts`,
  `bbj-vscode/src/setopts-composer-ui.ts`, `bbj-vscode/src/msgbox-composer.ts`
- [BASIS: CVS() Function (BBj-specific)](https://documentation.basis.cloud/BASISHelp/WebHelp/commands/bbj-commands/cvs_function_bbj.htm)
- [BASIS: CVS() Function (generic/PRO-5)](https://documentation.basis.cloud/BASISHelp/WebHelp/commands/cvs_function.htm)
- [BASIS: SETOPTS Verb](https://documentation.basis.cloud/BASISHelp/WebHelp/commands/setopts_verb.htm)
- [BASIS: SETOPTS Verb (BBj-specific)](https://documentation.basis.cloud/BASISHelp/WebHelp/commands/bbj-commands/setopts_verb_bbj.htm)
- [JetBrains: Intention Actions (IntelliJ IDEA)](https://www.jetbrains.com/help/idea/intention-actions.html) — confirms lightbulb auto-shows at caret for enabled `IntentionAction`s vs. explicit-invocation-only when disabled
- [JetBrains Platform SDK: Line Marker Provider](https://plugins.jetbrains.com/docs/intellij/line-marker-provider.html) — confirms `LineMarkerProvider` requires a `PsiElement`, the mechanism this plugin's LSP4IJ-only architecture cannot supply without a shadow PSI tree
- [redhat-developer/lsp4ij developer docs](https://github.com/redhat-developer/lsp4ij/blob/main/docs/DeveloperGuide.md) — confirms LSP4IJ maps `textDocument/codeLens` responses to IntelliJ's native Code Vision entries via `createCodeVisionEntry`
- [microsoft/vscode-go PR #3211](https://github.com/microsoft/vscode-go/pull/3211) — precedent for auto-restart-on-config-change over "please reload" prompting
- [microsoft/vscode issue #76405](https://github.com/microsoft/vscode/issues/76405) — "Restart language server – a generic solution," evidence that ad hoc reload-window prompts are considered a workaround, not a pattern
- JetBrains Support community threads on external file change / VFS refresh / `EditorNotificationPanel` reload behavior (aggregated via search; no single canonical doc page — cited as convention evidence, MEDIUM confidence)
- VS Code Extension API: [UX Guidelines overview](https://code.visualstudio.com/api/ux-guidelines/overview) — consulted for general extension UX categorization; does not have a dedicated CodeLens/Code-Actions comparison page, so the CodeLens-vs-lightbulb distinction above is drawn from this repo's own existing dual implementation (SETOPTS uses CodeLens; MSGBOX/addWindow/addChildWindow use Code Actions/lightbulb) rather than from an official "which to use when" doc

---
*Feature research for: BBj Language Server v4.3 Polish & Quality milestone*
*Researched: 2026-09-06*
