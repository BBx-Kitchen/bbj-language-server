# Phase 88 Live Retest: SETOPTS-in-Code Hover Decode & Tri-State Composer (G-88-1, G-88-2)

This is a self-contained script. You should not need to open any other file to run it. It
covers three checks against one fixture file, in both VS Code and IntelliJ, against a named
build. A retest against any other build proves nothing — this is exactly the ambiguity that
made the last round's IntelliJ evidence merely corroborated rather than proven (see
`.planning/debug/g-88-2-composer-never-activates.md`'s "no plugin zip on disk has a timestamp
consistent with being built before the UAT" finding).

## Build identity to install

**VS Code.** The extension already installed into this devcontainer's `~/.ext-test` by plan
88-08's own rebuild:

- Extension: `basis-intl.bbj-lang-0.12.28`
- `installedTimestamp`: `2026-09-08T17:01:55Z`
- To reproduce from scratch: `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run build`, then `bbj-ext-install`

**IntelliJ.** Built fresh by this plan's Task 1, from the same repository state 88-08's VS Code
rebuild used (both at git HEAD `59fc44f37230ba3edbc9eb94434bf6eb7c0dc93a`):

- Zip filename: `bbj-intellij-0.1.0.zip`
- sha256: `cde1f2fe0d8af16b01d910ebd721f37a228351dd58e4b300bd55becdac1114d0`
- Built from git HEAD: `59fc44f37230ba3edbc9eb94434bf6eb7c0dc93a`
- Built (mtime): `2026-09-08T17:28:24Z` — after the HEAD commit's own timestamp
  (`2026-09-08T17:24:45Z`), so the zip was built from that commit's tree, not an earlier one
- Install path: IntelliJ Settings/Preferences > Plugins > gear icon (⚙) > Install Plugin from
  Disk... > select the zip above. Restart the IDE when prompted.
- To reproduce from scratch: `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew buildPlugin`, artifact lands in `bbj-intellij/build/distributions/`

**A retest against any other build proves nothing.** Before running Check 1 or Check 2, confirm
the VS Code extension's `installedTimestamp` in `~/.ext-test/extensions/extensions.json` matches
above, and confirm the IntelliJ zip you installed has the sha256 above (`sha256sum` the zip
before installing it, or after, from wherever it was copied).

## Already proven automatically — do not re-derive

The following was already established at the shipped-artifact layer by 88-08 (VS Code) and this
plan's Task 1 (IntelliJ), against the exact builds named above. Do not spend retest time
re-checking these; the retest's whole value is in what remains — the pixel/UI layer.

| What | Established by | Layer |
|---|---|---|
| Hover decode markdown is correct for the absolute literal, the safe chain, one IOR call, and one AND call (AND framed as "Clears these options:") | 88-08 `installed-extension-e2e.test.ts`, hover describe block (5/5 passed against the rebuilt install) | real LSP connection to the installed VS Code bundle's language server |
| The reported byte-range chains (`A$(1,1)=IOR(...)`) correctly report an unsafe/undetermined verdict rather than a false empty decode | same test file, `d.` case | same |
| All three VS Code composer entry points (Code Action, Command Palette, context menu) are registered in the installed `package.json`/`out/extension.cjs` | 88-08, tri-state composer describe block, client-manifest/bundle tests | installed VS Code client bundle |
| `decodeInCode` opens the edit gate on the canonical safe chain and keeps it shut with a named byte-range reason on the reported chain; `composeTriState` renders the canonical block | 88-08, decodeInCode/composeTriState tests | real LSP connection to the installed server |
| Diagnostics and codeAction latency on the reported snippet are well within budget (11082ms / 30000ms; 205ms / 15000ms), eliminating a slow/blocked BBjCPL round trip as an explanation for the IntelliJ hang | 88-08, shared-server latency describe block | same shared language server both IDEs use |
| The packaged IntelliJ plugin registers `ConfigureSetoptsInCodeIntention`, ships its `intentionDescriptions/` resources, contains the `SetoptsTriStateComposerDialog` class, and bundles a language server carrying all five Phase 88 hover symbols | this plan's Task 1 (5/5 gates passed) | the built IntelliJ distributable's own contents |

None of the above drives a live editor's UI. What's proven is that the artifact you are about to
install is correct and current at the code/artifact layer. What's left is whether it *renders*
correctly on screen — the only thing left that a human can see and this automation cannot.

## Check 1 — hover, both IDEs

Open `examples/issue475-setopts-in-code.bbj` (in VS Code's ext-test window this folder opens by
default; in IntelliJ, open the same file from the project tree).

Hover each of these four targets and confirm the expected wording:

| # | Target | Expected |
|---|---|---|
| 1 | The absolute `SETOPTS $00C20240000000000000000000000000$` literal | A `Byte N: …` option list |
| 2 | The `IOR` token in `A$(1,1)=IOR(A$(1,1),$C2$)` | `Sets these options:` |
| 3 | The `AND` token in `LET A$(2,1)=AND(A$(2,1),$7F$)` | `Clears these options:` — never a raw mask |
| 4 | The `SETOPTS B$` line closing the canonical safe chain | `Sets:` and `Clears:` lines |

Also hover `SETOPTS A$` on either reported byte-range chain (both reproductions in the fixture
close with a line like this). Expect a statement that the value cannot be determined statically,
naming the byte-range reason. An empty `Sets: (none) / Clears: (none)` there is the original
defect returning — not a pass.

**FAIL signature to watch for:** no hover popup at all. This is what the last round reported in
VS Code.

## Check 2 — composer, both IDEs

**VS Code entry points** (there is deliberately no CodeLens marker — that persistent per-line
affordance is Phase 89's work, and its absence is part of why the last tester asked "how would I
invoke it?"):
1. The Code Action lightbulb — place the caret on a SETOPTS-in-code line and press `Ctrl+.`
2. The Command Palette entry for the `bbj.composeSetoptsInCode` command
3. The editor context menu (right-click in the editor)

**IntelliJ entry point:** `Alt+Enter` on a SETOPTS-in-code line, then arrow onto the composer
entry so its preview pane is computed.

In each IDE, check these three behaviours:

1. **Edit-in-place** on the canonical safe chain (the `B$=OPTS` … `SETOPTS B$` block) changes
   only the reassignment lines between the `OPTS` origin and the `SETOPTS` line.
2. **Compose-new** — invoking on a line with no SETOPTS shape composes and inserts a whole new
   `var$=OPTS` / `IOR` / `AND` / `SETOPTS var$` block at the line start.
3. **No-edit-with-reason** — invoking on a chain the scanner cannot represent (either byte-range
   reproduction in the fixture) offers no edit and names why.

**FAIL signatures from the last round** — watch for these specifically:
- VS Code: a lightbulb that never appears.
- IntelliJ: a "Searching Content Actions..." popup that hangs.

**If IntelliJ hangs against this build:** record how long it hangs and whether the file shows
visible diagnostics at that moment. The shared-server latencies for this exact snippet are
already measured and recorded in `.planning/debug/g-88-2-composer-never-activates.md` — a hang
with fast server-side numbers points at the IntelliJ platform layer, not at the language server.

## Check 3 — live mask-width falsification

Using the composer (now that Check 2 has proven it opens), compose a new block with one option
set to Set and one to Clear, insert it, and run the program as GUI/BUI/DWC against a live
BBjServices.

**Expected:** the generated `IOR`/`AND` calls, built on the 16-byte/32-hex-digit full-width mask
base, run without raising a BBj `!ERROR`.

This decides `88-RESEARCH.md` Assumption A2 against a real BASIS runtime.

## Why these three cannot be automated here

Both facts below were probed directly in this devcontainer during planning, not assumed:

- **No IntelliJ sandbox is reachable from this environment.** There is no IntelliJ sandbox,
  installed-plugin directory, or IDE configuration directory anywhere under `/home/coder` — the
  tester's IntelliJ runs on a separate host.
- **Headless BBj execution is blocked.** `/opt/bbx/bin/bbj -q -c/opt/bbx/cfg/config.bbx -tT0
  <prog>` terminates with `Must have a display for GUI mode (SysWindow/ThinClient)`, and the
  non-GUI terminal aliases (`-tT3`, `-tT4`) terminate with `Could not find a termcap file:
  /etc/termcap`. No X server and no `xvfb-run` are installed.

## Verdict block

Fill in after running the checks above. Report one PASS/FAIL line per check per IDE.

```
Check 1 — hover decode
  VS Code:  [ PASS | FAIL ] — notes:
  IntelliJ: [ PASS | FAIL ] — notes:

Check 2 — tri-state composer
  VS Code:  [ PASS | FAIL ] — notes:
  IntelliJ: [ PASS | FAIL ] — notes:

Check 3 — live mask-width falsification (88-RESEARCH.md Assumption A2)
  Result:   [ PASS | FAIL | NOT RUN ] — notes:

Build installed:
  VS Code extension installedTimestamp:
  IntelliJ zip sha256:

New symptoms (free text):
```

Only these answers may move G-88-1 or G-88-2 off `status: failed` in `88-UAT.md`.
