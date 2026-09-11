# Phase 88 Live Retest, Round Two: SETOPTS-in-Code Mask Literals & IntelliJ Reachability (G-88-2, G-88-3)

This is a self-contained script. You should not need to open any other file to run it. It covers
three checks against `examples/issue475-setopts-in-code.bbj`, in either or both IDEs, against a
named build. A retest against any other build proves nothing — that exact ambiguity is what made
round one's IntelliJ evidence merely corroborated rather than proven.

## Build identity to install

**A retest against any other build proves nothing.** Before running any check below, confirm the
VS Code extension's `installedTimestamp` in `~/.ext-test/extensions/extensions.json` matches
below, and confirm the IntelliJ zip you install has the sha256 below (`sha256sum` the zip before
installing it, or after, from wherever it was copied).

**VS Code.**

- Extension: `basis-intl.bbj-lang-0.12.28`
- `installedTimestamp`: `2026-09-11T10:47:24Z`
- To reproduce from scratch: `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run build`, then `bbj-ext-install`

**IntelliJ.**

- Zip filename: `bbj-intellij-0.1.0.zip`
- sha256: `e76f76824dcb4f706e454b8465fa069c941b0e1ef5ee9d6fb8e8ca84ce51cc66`
- Built from git HEAD: `c4c70c3dd8356088b4f31846fcc8bd0bd38314ea`
- Install path: IntelliJ Settings/Preferences > Plugins > gear icon (⚙) > Install Plugin from
  Disk... > select the zip above. Restart the IDE when prompted.
- To reproduce from scratch: `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew buildPlugin`, artifact lands in `bbj-intellij/build/distributions/`

## What changed since round one

| Round-one symptom | What was done |
|---|---|
| The generated mask arguments lost their surrounding quotes at runtime — live `!ERROR=17 (Strings must be the same length.)` on `opts$=AND(opts$,"$DFFF…$")`, because the extra `"` characters stopped BBj from hex-decoding the mask | One shared `bbjHexLiteral`/`BbjHexLiteral.of` formatter now emits every generated `IOR`/`AND` mask argument as a bare `$…$` literal, with no surrounding quotes, on both hosts |
| The in-place `SETOPTS` write dropped its delimiters entirely — reported as `SETOPTS 20C20240000000000000000000000000`, valid only in `config.bbx`, not in a program | Both in-place writers (VS Code and IntelliJ) now route the rewritten line through the same formatter, restoring a complete `$…$` literal over the whole token instead of the bare digits a config.bbx-only writer used to leave behind |
| The server never answered the IntelliJ composer's code-action request on the same document state hover already answers quickly — Alt+Enter hung forever on "Searching for Context Actions..." | `textDocument/codeAction` is now gated at hover's own `DocumentState.Linked` state (not the later, unbounded `DocumentState.Validated`) and bounded by a named 5000ms budget; IntelliJ also gained a second, non-intention editor-context-menu entry point into the same composer, so a slow or stuck Alt+Enter no longer makes the composer unreachable |

## Already proven automatically — do not re-derive

The following was already established at the shipped-artifact layer by this round's plans
(88-10, 88-11, and this plan's Task 1), against the exact builds named above. Do not spend retest
time re-checking these; the retest's whole value is in what remains — the pixel/UI layer and a
live BBjServices run.

| What | Established by | Layer |
|---|---|---|
| `composeSetOptsBlock`'s generated `IOR`/`AND` lines are bare `$…$` hex literals with no surrounding quotes, and the absolute edit-in-place round trip (delimiter-spanning range + delimiter-emitting formatter) re-decodes cleanly | 88-10 unit tests (literal-string oracle, catalog boundaries) and 88-11's round-trip test | source-level unit tests |
| The decoder now refuses a quoted hex literal at all three decode sites (absolute, mask-call, chain-link) rather than accepting it as readily as the correct bare form | 88-11 unit tests | source-level unit tests |
| Over a real LSP connection to the freshly rebuilt and reinstalled VS Code bundle, every `composeTriState`-returned reassignment line's mask argument is a bare delimited hex literal with no quote character anywhere in the composed text | this plan's Task 1, `installed-extension-e2e.test.ts` | real LSP connection to the installed VS Code bundle |
| A cold-ordering `codeAction` probe (workspace = repo root, request issued immediately after `didOpen`, no wait for diagnostics) settles in 7ms, down from a measured 56016ms hang on the same fixture before the fix | 88-12, `installed-extension-e2e.test.ts` | real LSP connection to the shared language server both IDEs use |
| The packaged IntelliJ plugin jar contains the new context-menu action class (`BbjComposeSetoptsInCodeAction`) and its `plugin.xml` registration, the Java hex-literal formatter class (`BbjHexLiteral`), and the unchanged `ConfigureSetoptsInCodeIntention` registration | this plan's Task 1, in-distributable assertions on the built zip | the built IntelliJ distributable's own contents |

None of the above drives a live editor's UI or a live BASIS runtime. What's proven is that the
artifact you are about to install is correct and current at the code/artifact layer. What's left
is whether the composed text *renders and runs* correctly — the only things left that a human (and
a live BBjServices) can observe and this automation cannot.

## Check 1 — the composer's output is valid BBj (either IDE)

VS Code is enough on its own if IntelliJ is blocked; run it in both if you can.

Open `examples/issue475-setopts-in-code.bbj`.

**(a) Compose-new.** Invoke the composer on a line with no SETOPTS shape nearby (VS Code:
`Ctrl+.` lightbulb, Command Palette `bbj.composeSetoptsInCode`, or editor right-click; IntelliJ:
Alt+Enter or the new editor right-click entry — see Check 2), set one option to Set and one to
Clear, and insert. Read the inserted lines: each `IOR`/`AND` call's second argument must be a bare
hex literal delimited by a `$` on each side, with **no double quotes** around it.

**Round-one failure signature to watch for:** `opts$=AND(opts$,"$DFFF…$")` (extra double quotes),
which raised `!ERROR=17 (Strings must be the same length.)` at run time.

**(b) Absolute edit-in-place.** Invoke the composer on the absolute line
`SETOPTS $00C20240000000000000000000000000$`, change one option, apply, and confirm the rewritten
line still has its `$` delimiters.

**Round-one failure signature to watch for:** `SETOPTS 20C20240000000000000000000000000` (no `$`
delimiters at all — valid only in `config.bbx`, not in a program).

## Check 2 — IntelliJ reachability, both doors

Place the caret on a SETOPTS-in-code line (e.g. the `SETOPTS B$` line of the canonical chain).

**Door 1 — Alt+Enter.** Press `Alt+Enter`. "Configure SETOPTS options in code…" must appear and
open the tri-state composer. Note roughly how long the popup took to appear.

**Round-one failure signature to watch for:** a "Searching for Context Actions..." popup that
never returns.

**Door 2 — the editor context menu.** Right-click on the same line. A compose entry must appear
in the context menu and open the same composer.

This second door deliberately does not go through IntelliJ's intention search, so report the two
results **separately**:
- A working context menu with a still-slow-but-eventually-working Alt+Enter is a PASS, with a note
  on the timing.
- A working context menu with a still-frozen Alt+Enter is a **partial result** worth its own
  report — the door that bypasses intention search is doing its job, but Alt+Enter itself is still
  broken.

## Check 3 — live mask-width falsification (88-RESEARCH.md Assumption A2)

Using the block composed in Check 1, run the program as GUI/BUI/DWC against a live BBjServices.

**Expected:** the generated `IOR`/`AND` calls, built on the 16-byte/32-hex-digit full-width mask
base, run without raising a BBj `!ERROR`.

**This question has never actually been answered.** The quoting defect aborted the original
attempt before `AND()` ever saw two decoded operands, so a length or range error here would be a
**NEW finding about the mask width**, not a return of the quoting defect. Report the exact
`!ERROR` text and the offending line if one appears.

## Why these cannot be automated here

Both facts below were probed directly in this devcontainer during planning, not assumed:

- **No IntelliJ sandbox is reachable from this environment.** There is no IntelliJ sandbox,
  installed-plugin directory, or IDE configuration directory anywhere under `/home/coder` — the
  tester's IntelliJ runs on a separate host.
- **Headless BBj execution is blocked.** Headless BBj terminates with "Must have a display for
  GUI mode (SysWindow/ThinClient)" in GUI mode, and the non-GUI terminal aliases terminate with
  "Could not find a termcap file: /etc/termcap". No X server and no `xvfb-run` are installed.

## Verdict block

Fill in after running the checks above. Report one PASS/FAIL line per check, per IDE where both
apply.

```
Check 1 — composer output is valid BBj
  VS Code:  [ PASS | FAIL ] — notes:
  IntelliJ: [ PASS | FAIL | NOT RUN ] — notes:

Check 2 — IntelliJ reachability, both doors
  Alt+Enter:      [ PASS | FAIL ] — timing:
  Context menu:   [ PASS | FAIL ] — notes:

Check 3 — live mask-width falsification (88-RESEARCH.md Assumption A2)
  Result:   [ PASS | FAIL | NOT RUN ] — notes:

Build installed:
  VS Code extension installedTimestamp:
  IntelliJ zip sha256:

New symptoms (free text):
```

Only these answers may move G-88-2 or G-88-3 off `status: failed` in `88-UAT.md`.
