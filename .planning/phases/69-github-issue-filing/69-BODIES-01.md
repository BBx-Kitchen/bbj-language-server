## Index rows 1-17

| # | finding_id | route | title | labels |
|---|---|---|---|---|
| 1 | P62-D1-003 | private draft advisory | vscode: workspace-settable configuration strings reach child_process.exec() unescaped across six call sites | vscode, PRIO 1, 8 (recorded for traceability; GitHub advisory carries no labels — D-17) |
| 3 | P64-D6-007 | public issue | dependencies: @vscode/vsce is declared as a runtime dependency, pulling 15 flagged packages into the production set | dependencies, PRIO 1, 2 |

## Bodies rows 1-17

### 1. P62-D1-003 — vscode: workspace-settable configuration strings reach child_process.exec() unescaped across six call sites
**Route:** private draft advisory
**Labels:** vscode, PRIO 1, 8 (recorded for traceability; GitHub advisory carries no labels — D-17)

<!-- BODY-BEGIN P62-D1-003 -->
## Problem

Six `child_process.exec()` call sites build shell command strings by interpolating
workspace-settable configuration values with no shell-escaping step. `Commands.cjs:263`
interpolates `bbj.classpath` unquoted; `Commands.cjs:325-328` joins seven string-typed
`bbj.compiler.*` options with no wrapping quotes at all; none of the affected settings carries a
`capabilities.untrustedWorkspaces` restriction, so each is settable from a workspace's own
committed settings file.

## Evidence

`bbj-vscode/src/Commands/Commands.cjs:263,325-328`

Surface: six `child_process.exec()` call sites — all using the shell-spawning `exec` API rather
than an argument-array API (`execFile`/`spawn`) — fed by workspace-settable strings
(`bbj.classpath`, `bbj.configPath`, `bbj.web.apps.<file>.name`, and seven `bbj.compiler.*`
options), plus a `params.fsPath` path reachable from any other extension's command invocation, plus
the EM validate/login `exec()` calls sharing the same unescaped construction. Problem class: OS
command injection (CWE-78) — untrusted, workspace-controllable input reaches a shell-interpreting
sink with no escaping or quoting. Impact: arbitrary command execution with the developer's own OS
privileges, triggerable by an ordinary, everyday action (Run, Run BUI, Run DWC, or Compile) on a
workspace whose settings — or a params object supplied by another extension — the developer does
not fully control.

## Failure scenario

A value containing shell metacharacters, reaching child_process.exec() through any of the channels traced above, executes as part of the shell command rather than as inert data -- the general OS command-injection impact (CWE-78): arbitrary command execution with the developer's own OS privileges, triggered by an ordinary, everyday action (Run, Run BUI, Run DWC, or Compile) on a workspace whose settings, or a params object supplied by another extension, the developer does not fully control. No trigger sequence or payload is recorded here per D-09, since the surface is unfixed in a public repository.

## Proposed approach

(switch to execFile/spawn with an argument array, mirroring IntelliJ's GeneralCommandLine.addParameter approach -- see P62-D7-001).

## Acceptance criteria

All six identified `child_process.exec()` call sites (`Commands.cjs:263,325-328`,
`extension.ts:415`, `extension.ts:635`, and the `bbj.runBUI`/`bbj.runDWC` `params.fsPath` path) are
replaced with `execFile`/`spawn` invocations that pass arguments as an array rather than an
interpolated shell string. A regression test asserts that a configuration value containing shell
metacharacters (for example a semicolon or a backtick) is passed through as inert argument data and
never reaches a shell for interpretation, for at least one representative call site per affected
settings group.

## Traceability

Finding `P62-D1-003` · dimension D1 (secondary D2, D7) · severity critical · effort 8.

This finding partially overlaps open issue #231 ("Support Custom Classpath and Command Line
Settings for starting BBj Programs"): #231 requests that these settings exist and be configurable;
the settings already exist, and this finding is about their existing unescaped interpolation into
`child_process.exec()`, a security defect #231 does not address.
<!-- BODY-END P62-D1-003 -->

### 3. P64-D6-007 — dependencies: @vscode/vsce is declared as a runtime dependency, pulling 15 flagged packages into the production set
**Route:** public issue
**Labels:** dependencies, PRIO 1, 2

<!-- BODY-BEGIN P64-D6-007 -->
## Problem

`bbj-vscode/package.json:670` declares `@vscode/vsce` — the VS Code Marketplace publishing CLI, a
build/release-time tool with zero imports from shipped source — under `dependencies` rather than
`devDependencies`. This pulls its entire transitive closure, including 15 packages flagged by `npm
audit`, into the package's declared production dependency set.

## Evidence

`bbj-vscode/package.json:670`

Surface: `package.json`'s `dependencies` block declares `"@vscode/vsce": "^3.7.1"`; `npm ls <pkg>
--all` confirms 15 of the 19 `npm audit`-flagged packages (including `undici`, `@azure/identity`,
`@azure/msal-node`, `form-data`, `qs`, `tmp`, `uuid`) reach the tree only through `@vscode/vsce` and
through nothing else. Problem class: dependency-metadata misclassification — a build-time-only tool
declared as a production dependency. Impact: any SBOM generator, dependency-policy scanner or `npm
ls --omit=dev` review reads an inflated, misleading production dependency set (296 packages,
including the 15 flagged ones) that materially overstates the extension's actual runtime surface;
the 15 packages are also installed and present in CI jobs (`preview.yml`, `manual-release.yml`)
that hold `VSCE_PAT` and `JETBRAINS_MARKETPLACE_TOKEN` publishing credentials.

## Failure scenario

Two distinct consequences follow from the one declaration. First, every consumer of this package's metadata — an SBOM generator, a downstream dependency-policy scanner, `npm ls --omit=dev`, a corporate allow-list review — reads a production dependency set of 296 packages containing 15 flagged ones, when the extension's actual runtime surface is two esbuild bundles that import none of them; the declared contract materially overstates what runs in production, and any policy decision made from it is made on wrong data. Second, and concretely rather than hypothetically, all 15 are installed by `npm ci` and are on disk in `preview.yml` and `manual-release.yml` jobs that hold `secrets.VSCE_PAT` and `secrets.JETBRAINS_MARKETPLACE_TOKEN` — so a compromise of any one of them at install or invocation time executes beside two marketplace publishing credentials, each of which reaches every user of the published extension or plugin. That is why these rows are triaged `file-issue` rather than accepted: "does not ship" is true and is not the same as "cannot run".

## Proposed approach

Move `"@vscode/vsce": "^3.7.1"` from `dependencies` (`:670`) to `devDependencies` (`:679-693`) and regenerate the lockfile.

## Acceptance criteria

`"@vscode/vsce"` is declared under `devDependencies` in `bbj-vscode/package.json` and no longer
appears under `dependencies`; the lockfile is regenerated to match. `npm ls @vscode/vsce
--omit=dev` (and the 15 packages that reach the tree only through it) return nothing. A packaging
smoke check (`npm run build` plus a `vsce package` dry run in CI) confirms the extension still
packages and publishes correctly after the move.

## Traceability

Finding `P64-D6-007` · dimension D6 (secondary D4) · severity high · effort 2. `dedup: none`.
<!-- BODY-END P64-D6-007 -->
