# Phase 112: EM Login & Web Launch Fail Closed - Research

**Researched:** 2026-09-27
**Domain:** BBj EM login/launch scripts (`web.bbj`, `em-login.bbj`), VS Code extension JWT handling, CommonJS test harnessing under Vitest 4
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**EM failure reporting in web.bbj (SEC-13)**
- **D-01:** A failed EM step shows a **MSGBOX** (same style as today's `login_failed`, titled `"Launching " + programme`) **and** ends with a **non-zero RELEASE code**. BBj draws the dialog in both IDEs, and the exit code lets each IDE log the failure: IntelliJ logs "exited with code N", and VS Code's `runWeb` callback shows its own "Failed to run" error. The console stays hidden (`? 'HIDE'`), so stderr is not a channel. The login-failure path uses the same MSGBOX + non-zero exit.
- **D-02:** The message names the step and includes the BBj error text (for example `ERRMES(-1)`, and the error number if useful). For example: "Could not register the application with Enterprise Manager (commit): <BBj error text>". It never includes the username, password or token.
- **D-03:** Guarded calls are `getRemoteConfiguration`, `getApplications` (the app lookup loop, including the iterator calls), `createApplication`, `BBjAPI().getConfig().getConfigFileName()`, `commit`, `getDwcUrl`/`getBuiUrl`, and `getThinClient().browse`. `setString`/`setBoolean` only change the local application object and stay unguarded.
- **D-04:** Each guarded call has its **own `err=` label**. That label sets the step description and jumps to one shared reporter label (MSGBOX + non-zero RELEASE). The MSGBOX code is not repeated per step. There is no single catch-all label driven by a `step!` variable, because a call that forgot to set the variable would report the wrong step.

**Missing credentials (SEC-12, amended by the user)**
- **D-05 (user ruling, amends SEC-12 and success criterion 1):** In the username/password path (no token), `web.bbj` **requires a username**. An empty username goes to `login_failed` and makes no EM call. The `admin` username default is removed. The `admin123` default stays in exactly one case: the username is exactly `admin` (lower case, compared case-sensitively) and the password is empty. Any other user with an empty password is sent to EM as given (no default is filled in), and if EM rejects it, that ends on `login_failed`. REQUIREMENTS.md SEC-12 and ROADMAP.md Phase 112 criterion 1 were amended on 2026-09-27 to match. — **Reversibility:** reversible — a two-line change in `web.bbj`.
- **D-06:** One "Login Failed!" message covers both "nothing supplied" and "EM rejected the login" (plus the BBj error text per D-02 where there is one). There is no separate "no credentials" message.
- **D-07:** Remove the legacy fallback in `Commands.cjs` `runWeb` that reads the undeclared `bbj.web.username` / `bbj.web.password` settings. Without credentials, `runWeb` shows an error and returns without starting `web.bbj`. Both command wrappers in `extension.ts` already return early when `ensureValidToken` yields nothing, so users see no change.
- **D-08 (user request):** Both IDE login prompts pre-fill the **last successfully used EM username**, or `admin` if none has been remembered. The username is not secret: VS Code keeps it in `context.globalState`, IntelliJ in `PropertiesComponent` (application level). It is saved only after a successful login. Passwords and tokens are never stored this way. Today both prompts hard-code `admin` (`extension.ts` `bbj.loginEM`, `BbjEMLoginAction.promptUsername`).

**Token expiry check (SEC-14)**
- **D-09:** VS Code's check follows IntelliJ `JwtValidity.check` exactly: a null or empty token, a segment count other than 3, a base64url decode failure, a payload with no `exp`, or an `exp` that is not a non-negative integer (decimals, strings and overflow are all rejected) is treated as expired. Only a valid integer `exp` gives a verdict, compared strictly (`exp <= now` is expired) with no clock-skew allowance, because the server-side check absorbs skew. The signature is never verified: there is no key on the client, and `validateTokenServerSide` stays the authority.
- **D-10:** "Unsigned" means an **empty third segment** (`header.payload.`), which is treated as expired. Java's `split` already drops that trailing empty part, so IntelliJ treats it as MALFORMED today, and IntelliJ needs no change. `alg: none` header inspection is not added.
- **D-11:** The check moves into its own plain module under `bbj-vscode/src/` with no `vscode` import. It takes a `now` (epoch seconds) argument like `JwtValidity.check`, and `extension.ts` imports it. Tests import the module directly and cover malformed, unsigned, exp-less and valid-unexpired tokens, plus expired and non-integer exp, mirroring the IntelliJ `JwtValidityTest` shapes. The existing flow stays unchanged: an expired verdict deletes `bbj.em.token` and leads to the login prompt.

**Commands.cjs test harness (TEST-09)**
- **D-12:** Load `Commands.cjs` under vitest through a **`vscode` shim in Node's CJS resolution**. A test helper puts a fake `vscode` module into `require.cache` or a resolve hook, then loads `Commands.cjs` with `createRequire`. `Commands.cjs` itself does not change for testability, apart from the D-07 removal. That leaves Phase 120 (REF-11) a clean baseline to reshape. Research gate: `Commands.cjs` does `require("./process-args")` and similar, which point at `.ts` sources. The researcher confirms how these resolve under vitest (vitest's own transform, a `.ts` require hook, or loading the built output) and picks the smallest approach that works.
- **D-13:** The text-scanning `Commands.cjs` tests in `test/config-path-consumers.test.ts` (brace-counting `extractBody`) are **replaced** by execution tests that keep the same assertions: the resolved config path is used, the `--` sentinel is refused, the no-config error is shown. These tests call into the loaded module and check spies.
- **D-14:** Execution coverage is shown by behaviour assertions on spies inside the `run`, `compile`, `runBUI`/`runDWC` (`runWeb`) and decompile bodies. Verification also records a V8 coverage run that shows those lines executed. No coverage threshold is added to `vitest.config.ts` (gates are Phase 114's).
- **D-15:** `web.bbj` gets a small source-guard test. It checks that `admin123` appears only inside the `username! = "admin"` branch (D-05), that there is no `admin` username default, and that each call listed in D-03 carries its own `err=` label. Behaviour is covered by the UAT hand check (criterion 5), which runs: no credentials, wrong password, EM stopped or unreachable, and a good BUI and DWC launch, in both VS Code and IntelliJ.

### Claude's Discretion
- The exact message wording per step, the label names, and the non-zero RELEASE code values (one code for all failures or one per step).
- The token module's file and function names (for example `em-token-validity.ts`, `isEmTokenExpired(token, nowSeconds)`).
- The mechanism for the `vscode` shim (require.cache seeding or a `Module._resolveFilename` hook) and where the helper lives under `test/`.
- The globalState/PropertiesComponent key name for the remembered username.

### Deferred Ideas (OUT OF SCOPE)
- `alg: none` header inspection in both IDEs' token checks: not needed for SEC-14 (D-10).
- A coverage threshold for `Commands.cjs`: belongs with Phase 114's gates.
- (Reviewed, not folded): IntelliJ javaInteropHost/Port vs interopHost/Port key mismatch (unrelated — interop, not EM); linking.test.ts interop failures (Phase 116); Phase 97 code-review follow-ups (Phase 114); peer-supplied Java names in signature-help fence (Phase 118 area).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-12 | `web.bbj` never fills in a default username; a missing username (and no token) goes to `login_failed`. The only default kept is `admin123` for the exact user `admin` with an empty password, and the IDE login prompts pre-fill the last used username (else `admin`) (#546; amended 2026-09-27, D-05) | Current `web.bbj` source read in full (lines 27-41 quoted below); `RELEASE` grammar confirms exit-code syntax; `BbjEMTokenStore`/`PropertiesComponent` pattern found for the IntelliJ half of D-08; no existing VS Code `globalState` usage found (first use in this extension) |
| SEC-13 | Every Enterprise Manager call in `web.bbj` after login has an error handler that reports the failure visibly (#548) | All 8 D-03 call sites located and quoted from `web.bbj`; `em-login.bbj`'s existing `ERROR:`-prefixed-file pattern read for label style; `ERRMES()` signature confirmed in `examples/functions.bbl`; IntelliJ's exit-code console log confirmed byte-for-byte in `BbjRunActionBase.java` |
| SEC-14 | The EM token expiry check treats a malformed, unsigned or exp-less JWT as expired (#553) | `JwtValidity.java`/`JwtValidityTest.java` read in full and quoted; current `isTokenExpired()` in `extension.ts` read and quoted; **empirically verified JS/Java `split()` divergence** that changes how "unsigned" must be detected in the port (see Common Pitfall 1) |
| TEST-09 | `Commands.cjs` is executed and covered by tests (#565) | **Empirically verified, working `module.registerHooks()` harness** that loads `Commands.cjs` end-to-end under the project's real Vitest 4.1.10 run (proof in Sources); coverage-report gap in `vitest.config.ts` found and reproduced live |
</phase_requirements>

## Summary

This phase touches three independent surfaces that happen to share one file family (`web.bbj` /
`Commands.cjs` / `extension.ts`) and one cross-cutting theme: EM must never silently succeed with
weakened trust. Two thirds of the work (SEC-12/13, the `web.bbj` rewrite) is a straightforward,
well-scoped BBj edit — the file is short (105 lines), every call site D-03 names is already
identified below with its exact line, and the codebase already has a working precedent for the
`ERR=`-label idiom (`em-login.bbj`'s `authFailed:` path) and for a non-zero-exit / dialog pairing
(`RELEASE <expr>` is grammar-legal — confirmed by reading `bbj.langium`). The token-expiry rewrite
(SEC-14) is a close, mechanical port of already-hardened Java (`JwtValidity.check`), and this
research surfaces one real, JavaScript-specific trap in that port: `String.prototype.split` does
**not** drop a trailing empty segment the way Java's `String.split` does, so a length-3 check alone
will not catch an "unsigned" token (`header.payload.`) the way the Java code's length-2 check does
after Java's split silently absorbs it — the new TypeScript module needs its own explicit check for
an empty third segment.

The highest-uncertainty item going into this research was the TEST-09 CJS-loading problem, flagged
in the phase's own planning notes as a research gate. That gate is now closed with a concrete,
empirically verified answer, not a plan: **`node:module`'s `module.registerHooks()` API (Node
≥22.15/23.5, confirmed present and working under this repo's actual Node 24.20 and its pinned
Vitest 4.1.10)** can shim the `vscode` specifier and simultaneously patch bare/`.js`-extension
specifier resolution to fall back to `.ts`, letting `Commands.cjs`'s real `require()` calls resolve
both `vscode` and its own `.ts`-only dependencies (`process-args.ts`, `CompilerOptions.ts`, etc.) —
including a dependency of a dependency that is itself ESM-syntax TypeScript, which a
`Module._resolveFilename`-only patch (the mechanism D-12's discretion text suggests as one option)
**cannot** reach, because that hook only intercepts CommonJS resolution, not the separate ESM
resolver Node invokes when `require()`-ing an ESM-format `.ts` file synchronously. This was proven
by first reproducing the `Module._resolveFilename`-only failure, then fixing it with
`registerHooks()`, then running the fixed version inside a real, disposable `*.test.ts` file with
`npx vitest run` (passed) — see Sources for the exact commands and output. A second, independently
important finding from the same experiment: **`vitest.config.ts`'s `coverage.include` is
`['src/**/*.ts']`, which structurally excludes `Commands.cjs`** — running `--coverage` against the
now-loadable module produced zero coverage lines for it, confirmed by grep against the coverage
report. D-14 ("a V8 coverage run that shows those lines executed") cannot be satisfied without
adding `Commands.cjs` (or a broader glob) to that include list; this is a small, load-bearing gap
the plan must not miss.

**Primary recommendation:** Implement `web.bbj`'s D-01..D-08 changes as a direct, mechanical edit
against the line numbers below; port `JwtValidity.check` into a new plain `.ts` module with an
explicit empty-third-segment check (not just a length check); and build the `Commands.cjs` test
harness on `node:module`'s `registerHooks()` (resolve + load hooks) rather than
`Module._resolveFilename`/`require.cache` seeding alone, shimming not just `vscode` but also
`./process-runner` (to intercept `runProcess`/`runProcessCallback` with spies, avoiding the need for
a real BBj-home fixture on disk) — and widen `vitest.config.ts`'s coverage `include` to cover
`Commands.cjs` before recording the D-14 coverage run.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| EM credential/token collection and RELEASE-code failure reporting | BBj script (`web.bbj`, spawned process) | — | `web.bbj` is a BBj program spawned by both hosts; all EM API calls (`BBjAdminFactory`, `getRemoteConfiguration`, `commit`, `browse`) only exist in the BBj runtime, not in either extension's language |
| Launch argument construction (env vs argv) | API/Backend-equivalent (`process-args.ts`, host-neutral) | — | Already the established pattern (GHSA-p5f3-9456-9pcx / GHSA-33x9-cpwv-xcv2 fixes); no change needed for this phase beyond the D-07 `runWeb` legacy-fallback removal |
| Process launch (`bbj` binary spawn) | Frontend Server (VS Code extension host) / IntelliJ plugin process | — | `Commands.cjs`/`process-runner.ts` (VS Code), `BbjRunActionBase`/`GeneralCommandLine` (IntelliJ) — both are host-process responsibilities, not the language server's |
| Client-side JWT expiry classification | Frontend Server (VS Code extension host) | — | Purely local decode/compare, no network; IntelliJ's `JwtValidity`/`BbjEMTokenStore` is the existing analogue on that host |
| Server-side token validation (authority) | BBj script (`em-validate-token.bbj`) + EM | — | Unchanged by this phase; `validateTokenServerSide` in `extension.ts` remains the trust boundary |
| Remembered-username persistence (D-08) | Frontend Server (`context.globalState`) / IntelliJ (`PropertiesComponent`, application scope) | — | Non-secret UI convenience state; each host already has an established, unencrypted key-value store for exactly this kind of value (`BbjEMTokenStore.BACKEND_WARNED_KEY` is the IntelliJ precedent) |
| `Commands.cjs` execution + coverage | Frontend Server (test harness, Node process) | — | The module only exists to be `require()`'d by the VS Code extension host; the test harness's job is to reproduce that same real Node CJS/ESM resolution, not to re-implement it in a mock module graph |

## Standard Stack

No new runtime dependencies are introduced by this phase. Every piece needed is already
either in the codebase or built into the Node/BBj runtimes already in use.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:module` (`registerHooks`) | Node ≥22.15.0 / ≥23.5.0, built-in | Synchronous, in-thread resolve/load hooks that intercept both `require()` and `import` in the same module graph | Purpose-built by Node core for exactly this "shim a bare specifier for testing" use case, replacing the older `Module._resolveFilename`/`Module._load` monkey-patch idiom that proxyquire-style tools used; confirmed present and functional on this repo's Node (`node --version` → v24.20.0) and CI's pinned `node-version: 22` (22.x ≥ 22.18.0 has type stripping unflagged, and `registerHooks` ships from 22.15.0, both below the floor CI's `node-version: 22` resolves to) [VERIFIED: node -e "console.log(typeof require('module').registerHooks)" → "function", this session] |
| Vitest | 4.1.10 (pinned, `package.json`) | Test runner already in use for the whole `bbj-vscode` package | Existing project standard; no version change needed — the harness works unmodified against the pinned version [VERIFIED: `npx vitest run` reported `v4.1.10`, this session] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | — | — | No JWT/JSON library is introduced for SEC-14 — `JwtValidity.check` deliberately avoids one ("No JWT or JSON library is added and the signature is never verified"), and the port should keep that property |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `module.registerHooks()` | `Module._resolveFilename` monkey-patch alone (proxyquire-style) | **Empirically fails** here: it only intercepts CommonJS resolution. `Commands.cjs`'s `require("./CompilerOptions")` resolves via this hook to `CompilerOptions.ts`, but that file uses `import`/`export` syntax, so Node's CJS loader hands the actual load off to the internal *ESM* resolver/loader for a synchronous "require(esm)" — a completely separate code path this hook cannot see. Reproduced live: patching only `_resolveFilename` gets past `require('vscode')` inside `Commands.cjs` itself, then fails with `ERR_MODULE_NOT_FOUND: Cannot find package 'vscode' imported from .../CompilerOptions.ts` — the *nested* `import 'vscode'` inside the `.ts` dependency is unreachable from this hook [VERIFIED: empirical probe, this session — command and output in Sources] |
| `module.registerHooks()` | Building `Commands.cjs`'s `.ts` dependencies to real `.js` files first, then requiring the built output | Works in principle (this is what production packaging does via esbuild bundling for `out/extension.js`), but requires either a pre-test build step or pointing tests at stale/rebuilt output — more moving parts than a hook that runs the source files directly and needs no build step; also loses the "tests run against the same source, always" property the rest of this suite relies on |
| `module.registerHooks()` | Vitest's own `vi.mock('vscode', ...)` | **Confirmed non-functional for this file** by the pre-existing tests themselves — `no-shell-command-construction.test.ts`'s and `config-path-consumers.test.ts`'s doc comments both state this was tried and empirically fails (`Cannot find module 'vscode'` even under an active `vi.mock`), because `Commands.cjs`'s `.cjs` extension causes Vite/vite-node to externalize it to Node's real loader rather than running it through Vitest's own transform/mock graph |

## Package Legitimacy Audit

Not applicable — this phase introduces no new external packages. `node:module` is a Node.js
built-in, not an npm dependency, so `npm view`/registry verification does not apply.

## Architecture Patterns

### System Architecture Diagram (web.bbj launch, after this phase)

```
VS Code / IntelliJ command (Run BUI / Run DWC)
        │
        ▼
ensureValidToken() / buildWebRunCommandLine()  ── client-side JWT check (SEC-14 module) ──► expired/malformed? ──► delete token, re-prompt login
        │ valid or no token needed yet
        ▼
Commands.cjs runWeb()  /  BbjRunActionBase.buildWebRunCommandLine()
        │  (env: BBJ_EM_USERNAME/PASSWORD/TOKEN — never argv)
        ▼
bbj -q web.bbj  (spawned process, console hidden)
        │
        ▼
username!/password!/token! read from CLIENTENV()→ENV()
        │
        ├─ token present ──────────────► BBjAdminFactory.getBBjAdmin(token, err=login_failed)
        └─ no token ───────────────────► username empty? ──► login_failed (D-05, no EM call)
                                          │ username present
                                          ▼
                                          admin/"" → admin123 (ONLY this case, D-05)
                                          ▼
                                          BBjAdminFactory.getBBjAdmin(user, pass, err=login_failed)
        │ (login succeeded)
        ▼
admin!.getRemoteConfiguration()          err=step_getconfig  ─┐
        ▼                                                     │
configuration!.getApplications() + loop  err=step_getapps    │
        ▼                                                     │
createApplication() (if new)             err=step_createapp  ├──► report: (shared label)
        ▼                                                     │      MSGBOX("Launching "+programme, step + ERRMES(-1))
BBjAPI().getConfig().getConfigFileName() err=step_getcfg      │      RELEASE <nonzero>
        ▼                                                     │
app!.commit()                            err=step_commit      │
        ▼                                                     │
getDwcUrl()/getBuiUrl()                  err=step_geturl      │
        ▼                                                     │
BBjAPI().getThinClient().browse(url!)    err=step_browse     ─┘
        ▼
RELEASE  (success, exit 0)


exit code ≠ 0 observed by:
  IntelliJ: BbjRunActionBase's ProcessListener.processTerminated → "[<mode>] Process exited with code N"
  VS Code:  Commands.cjs runProcessCallback's execFile callback → showErrorMessage("Failed to run ...")
```

### System Architecture Diagram (Commands.cjs test harness, TEST-09)

```
test/*.test.ts (Vitest, real Node process — pool default, not mocked)
        │
        │  import/require the harness helper once (module scope)
        ▼
module.registerHooks({ resolve, load })     ← registered once per worker; safe to leave active
        │
        │  resolve(specifier):
        │    'vscode'            → { url: 'vscode-shim:vscode', shortCircuit: true }
        │    './process-runner'  → { url: 'process-runner-shim:...', shortCircuit: true }  (recommended, avoids real bbj-home fixture)
        │    else: nextResolve(specifier) ‖ nextResolve(specifier + '.ts') ‖ nextResolve(specifier.replace(/\.js$/,'.ts'))
        │
        │  load(url):
        │    vscode-shim / process-runner-shim → { format:'commonjs', source:'module.exports = <fake>;' }
        │    else: nextLoad(url)
        ▼
require(path.resolve('src/Commands/Commands.cjs'))   ← real Node require, real Commands.cjs body runs
        │
        ▼
Commands.run/compile/runBUI/runDWC/decompile*(...)   ← call real function bodies
        │
        ▼
assertions against the fake vscode's vi.fn() spies (showErrorMessage, withProgress, ...)
assertions against the fake process-runner's vi.fn() spies (runProcess/runProcessCallback argv)
        │
        ▼
`npx vitest run --coverage` (after widening coverage.include) → V8 lines show Commands.cjs executed
```

### Recommended Project Structure
```
bbj-vscode/
├── src/
│   ├── em-token-validity.ts        # NEW (D-11): plain isEmTokenExpired(token, nowEpochSeconds); no vscode import
│   ├── extension.ts                # isTokenExpired() body replaced by an import of the new module (D-11); bbj.loginEM prefill (D-08)
│   └── Commands/
│       └── Commands.cjs            # D-07 only: remove bbj.web.username/password legacy fallback
├── tools/
│   └── web.bbj                     # D-01..D-06 rewrite
└── test/
    ├── commands-cjs-harness.ts     # NEW (D-12 discretion): registerHooks-based loader + fake vscode/process-runner
    ├── commands-cjs-execution.test.ts   # NEW (D-13/D-14): replaces the text-scan block in config-path-consumers.test.ts
    ├── em-token-validity.test.ts   # NEW (D-11): mirrors JwtValidityTest shapes
    └── web-bbj-source-guard.test.ts # NEW (D-15): admin123/err= label source guard
```

### Pattern 1: BBj `err=` label reporting to one shared reporter (D-04)
**What:** Each guarded EM call gets its own label that sets a step-description variable and jumps
to one shared MSGBOX+RELEASE label, rather than one shared `step!`-variable-driven catch-all.
**When to use:** Every call listed in D-03.
**Example (illustrative — exact wording is Claude's discretion per CONTEXT.md):**
```bbj
rem Source: pattern derived from existing tools/em-login.bbj's authFailed: label idiom,
rem combined with D-01..D-04's shared-reporter requirement and the confirmed RELEASE_NO_NL
rem grammar rule (bbj-vscode/src/language/bbj.langium:536) for a non-zero exit code.
configuration! = admin!.getRemoteConfiguration(err=step_getconfig)
goto after_getconfig
step_getconfig:
    stepDesc! = "Could not read the Enterprise Manager configuration (getRemoteConfiguration)"
    goto report_failure
after_getconfig:
...
report_failure:
    a=MSGBOX(stepDesc!+": "+ERRMES(-1),0,"Launching "+str(programme!))
    release 1

login_failed:
    a=MSGBOX("Login Failed!",0,"Launching "+str(programme!))
    release 1
```
Note: today's `login_failed:` at `web.bbj:105-106` ends with a bare `release` (exit 0) — D-01
requires this path to also become a non-zero exit, so this is a required line-level change to the
existing label, not only new labels.

### Pattern 2: `module.registerHooks()` CJS+ESM shim (D-12)
**What:** A synchronous resolve/load hook pair, registered once, that intercepts a bare specifier
(`vscode`) for both `require()` and `import`, and separately widens Node's default extension
resolution to fall back to `.ts` (and `.js`→`.ts`) when the default lookup fails.
**When to use:** Any test that needs `Commands.cjs` (or another native-`require()`-loaded `.cjs`
file) to run its real body against fakes.
**Example (empirically verified working, this session — see Sources for the exact vitest run):**
```typescript
// Source: this research session's probe — proven under this repo's real Vitest 4.1.10
// (see Sources: "empirical probe" for the exact command/output).
import * as module_ from 'module';
import * as path from 'path';

const fakeVscode = {
    workspace: { getConfiguration: vi.fn(() => ({ get: vi.fn() })) },
    window: { showErrorMessage: vi.fn(), showWarningMessage: vi.fn() },
    ProgressLocation: { Notification: 1 },
};
(globalThis as any).__FAKE_VSCODE__ = fakeVscode;

(module_ as any).registerHooks({
    resolve(specifier: string, context: unknown, nextResolve: (s: string, c: unknown) => unknown) {
        if (specifier === 'vscode') {
            return { url: 'vscode-shim:vscode', shortCircuit: true };
        }
        try {
            return nextResolve(specifier, context);
        } catch (e) {
            // Commands.cjs does `require("./process-args")` etc. with no extension —
            // Node's default CJS resolution never tries `.ts`.
            if (!/\.[a-z]+$/i.test(specifier)) {
                try { return nextResolve(specifier + '.ts', context); } catch { /* fall through */ }
            }
            // A `.ts` dependency's own ESM-style `import '../x.js'` that actually
            // points at `x.ts` (no compiled `.js` exists under this repo's src/).
            if (specifier.endsWith('.js')) {
                try { return nextResolve(specifier.slice(0, -3) + '.ts', context); } catch { /* fall through */ }
            }
            throw e;
        }
    },
    load(url: string, context: unknown, nextLoad: (u: string, c: unknown) => unknown) {
        if (url === 'vscode-shim:vscode') {
            return { format: 'commonjs', source: 'module.exports = globalThis.__FAKE_VSCODE__;', shortCircuit: true };
        }
        return nextLoad(url, context);
    },
});

const Commands = require(path.resolve(__dirname, '../src/Commands/Commands.cjs'));
```
This resolved and ran the full `Commands.cjs` module body (`openConfigFile`, `run`, `runBUI`,
`runDWC`, `compile`, `denumber`, `decompileReplace`, `decompileReadonly`, `setOutputChannel` all
present on the returned object) inside an actual `npx vitest run` invocation against this repo.

**Recommended extension for D-13/D-14 (not yet tested, but same mechanism):** add a second
`resolve`/`load` branch for `./process-runner` (the specifier `Commands.cjs` requires) that returns
a fake module exposing `vi.fn()` stand-ins for `runProcess`/`runProcessCallback`/`formatArgvForLog`.
This lets `run`/`compile`/`runWeb`/decompile bodies be driven and asserted on without ever reaching
`confineBbjExecutable`'s real filesystem checks (`bbj-home-layout.ts`) or a real `bbj` binary —
avoiding the need to build a fixture BBj-home directory on disk just to exercise argument-building
and control-flow logic.

### Anti-Patterns to Avoid
- **Patching only `Module._resolveFilename`:** looks sufficient (it does fix the direct
  `require('vscode')` inside `Commands.cjs`) but silently fails one level deeper, at the first
  `.ts` dependency's own `import 'vscode'`, because that load goes through Node's ESM resolver, a
  code path `Module._resolveFilename` does not intercept. This was reproduced directly this
  session — do not reuse it as the sole mechanism even though D-12's discretion text lists it as
  an option.
- **Building `Commands.cjs`'s own control flow into the fake `vscode`/`process-runner` objects:**
  the point of D-13/D-14 is to exercise the *real* `Commands.cjs` logic; keep the fakes to
  observable stand-ins (`vi.fn()`), not reimplementations of `getActiveConfigPath`/`stripSentinel`
  behaviour.
- **Reusing the pre-fix `login_failed:`'s bare `release`:** the phase's own success criterion 1
  requires this exact existing path to also carry a non-zero exit now — it is easy to only add
  labels for the *new* D-03 calls and forget this pre-existing one also needs its `release` line
  changed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT decode/expiry check | A JWT parsing library, or hand-rolled base64/JSON with signature verification | Direct 1:1 port of `JwtValidity.check`'s decode-and-regex-free `JSON.parse` approach (the existing `isTokenExpired` already does this; keep the shape, fix the fail-open branches per D-09) | `JwtValidity.java`'s own doc comment: "No JWT or JSON library is added and the signature is never verified: there is no key material on the client, and the server-side check... remains the authority." Adding a library here would be scope creep against an explicit design decision already made and battle-tested on the IntelliJ side |
| CJS module mocking under Vitest | A hand-rolled `require` cache eviction scheme, or a bespoke Babel/SWC transform pass for `.cjs` files | `node:module`'s `registerHooks()` (built into Node, purpose-built for this) | Confirmed working end-to-end this session; anything homegrown would be re-solving a problem Node's module team already shipped a public API for |
| Remembered-username storage | A new settings key, a config file, or reusing `SecretStorage`/`PasswordSafe` for a non-secret value | `context.globalState` (VS Code) / `PropertiesComponent.getInstance()` (IntelliJ, application scope) | D-08 explicitly says "The username is not secret"; `BbjEMTokenStore.BACKEND_WARNED_KEY` is the exact existing precedent for an application-scoped `PropertiesComponent` string value in this codebase — same shape, new key |

**Key insight:** every piece of this phase already has a working precedent somewhere in the
codebase (IntelliJ's `JwtValidity`/`BbjEMTokenStore` for SEC-14/D-08, `em-login.bbj`'s
`authFailed:` label for SEC-13's shape, `process-args.ts`'s env-not-argv convention for the secrets
already flowing through `web.bbj`). The work is disciplined porting and gap-closing, not new design.

## Common Pitfalls

### Pitfall 1: JS `split()` does not drop a trailing empty segment the way Java's does
**What goes wrong:** A direct, naive port of `JwtValidity.check`'s `parts.length != 3` check will
**not** catch an "unsigned" token (`header.payload.`, empty third segment) the way the Java code
does, because `String.split` in Java collapses that trailing empty part away (`"a.b.".split("\\.")`
→ `["a", "b"]`, length 2 → already `MALFORMED` before D-10 was ever a design question), while
JavaScript's `String.prototype.split` keeps it (`"a.b.".split(".")` → `["a", "b", ""]`, length 3).
A port that only checks `parts.length !== 3` will see length 3, proceed to decode `parts[1]` (which
is well-formed), and hand back a normal VALID/EXPIRED verdict for a token with **no signature at
all** — silently failing exactly the case D-10 exists to close.
**Why it happens:** the two languages' `split` have different trailing-empty-string semantics; this
was not a hypothetical — it was verified directly against Node in this session.
**How to avoid:** the new module must explicitly check that `parts[2]` (the signature segment) is
non-empty, in addition to the length-3 check, and classify an empty signature the same as any other
malformed shape (expired/fail-closed). This is a one-line addition to the length check, not a
redesign.
**Warning signs:** a test for `"eyJhbGciOiJIUzI1NiJ9.<payload>."` (trailing dot, empty signature)
passing today's `isTokenExpired` (returns `false`, i.e. "not expired") is the regression this
pitfall describes; the new module's test suite must include this exact shape (mirroring
`JwtValidityTest`'s intent even though Java's own suite doesn't need a dedicated case for it).
[VERIFIED: `node -e 'console.log(JSON.stringify("header.payload.".split(".")))'` → `["header","payload",""]`, this session]

### Pitfall 2: `vitest.config.ts`'s coverage `include` silently excludes `Commands.cjs`
**What goes wrong:** Even after `Commands.cjs` is successfully loaded and its functions called
under Vitest (via the `registerHooks` harness), a `--coverage` run reports **zero** coverage lines
for it — not because the code didn't run, but because the coverage `include` glob is `.ts`-only.
**Why it happens:** `vitest.config.ts`'s `coverage.include` is exactly `['src/**/*.ts']`
[VERIFIED: bbj-vscode/vitest.config.ts:12, quoted: `include: ['src/**/*.ts'],`] — a `.cjs` file
never matches that pattern regardless of whether V8 instrumented and executed it.
**How to avoid:** widen the include list (e.g. add `'src/Commands/Commands.cjs'`, or broaden the
glob to `src/**/*.{ts,cjs}`) before recording the D-14 coverage-run evidence. This is a one-line
config change but an easy one to miss, since the harness working (tests pass) gives no signal that
coverage reporting is separately misconfigured.
**Warning signs:** `npx vitest run <file> --coverage` succeeds and the text/HTML report simply has
no row for `Commands.cjs` at all (not a 0% row — an *absent* row). Reproduced directly this
session: after a passing execution test, `grep -i "commands.cjs\|Commands/" <coverage output>`
returned nothing.

### Pitfall 3: `RELEASE` with no expression is still valid BBj and defaults to exit 0
**What goes wrong:** copy-pasting the bare `release` statement already used at `web.bbj:102`
(success path) into a new failure label silently keeps the exit code at 0, defeating D-01's "ends
with a non-zero RELEASE code" requirement — and it will not be caught by BBj's parser, since both
forms are grammar-legal (`RELEASE_NL | RELEASE_NO_NL exitVal=Expression`)
[VERIFIED: bbj-vscode/src/language/bbj.langium:536, quoted: `EXIT_NO_NL exitVal=Expression | kind='EXIT' | RELEASE_NL | RELEASE_NO_NL exitVal=Expression`].
**How to avoid:** every new/modified failure label must use the `RELEASE_NO_NL`
form with a nonzero expression (e.g. `release 1`); a source guard (D-15 already asks for an
`admin123`/`err=` guard — consider extending it, or adding a sibling assertion, to check that
`login_failed:` and the shared reporter label are not followed by a bare `release`).

### Pitfall 4: `Commands.cjs` module-level state persists across `require()` cache hits
**What goes wrong:** `Commands.cjs` has module-level mutable state (`let outputChannel = null`,
set via `setOutputChannel`). If a test harness caches the `require()` result across test files (to
avoid re-registering hooks), a later test's assertions about `outputChannel`-dependent debug
logging (`isDebug && outputChannel` branches in `run`/`runWeb`) can silently see state left over
from an earlier test.
**How to avoid:** either call `Commands.setOutputChannel(fakeChannel)` explicitly in a
`beforeEach`, or delete the relevant `require.cache` entries between test files so each file gets a
fresh module instance. Given `registerHooks()` is safe to leave registered process-wide (it is
inert unless a matching specifier is requested), the simplest approach is one shared harness
module, `require()`d once, with `beforeEach` resetting the fake `vscode`'s `vi.fn()` mocks and
re-calling `Commands.setOutputChannel`.

## Code Examples

### `isEmTokenExpired` — recommended port shape (D-09/D-10/D-11)
```typescript
// Recommended design — mirrors bbj-intellij's JwtValidity.check(String, long) exactly,
// per D-09, plus the explicit empty-signature check Pitfall 1 above requires for JS.
// File/function names are Claude's discretion (CONTEXT.md); shown here as an example.

/**
 * Classifies an EM JWT's expiry as of `nowEpochSeconds`. Mirrors
 * bbj-intellij's JwtValidity.check(String, long): a null/empty token, a
 * segment count other than 3, an empty third (signature) segment, a
 * base64url decode failure, a payload with no `exp`, or an `exp` that is
 * not a non-negative integer are all treated as expired. Only a valid
 * integer `exp` gives a real verdict, compared strictly (exp <= now is
 * expired), with no clock-skew allowance — the server-side check absorbs
 * skew. The signature is never verified: there is no key on the client.
 */
export function isEmTokenExpired(token: string | null | undefined, nowEpochSeconds: number): boolean {
    if (!token) {
        return true;
    }
    const parts = token.split('.');
    // Note (Pitfall 1): unlike Java's String.split, JS split() keeps a
    // trailing empty segment, so "header.payload." has length 3 here —
    // the explicit parts[2] === '' check below is required, not redundant.
    if (parts.length !== 3 || parts[2] === '') {
        return true;
    }
    try {
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = Buffer.from(payload, 'base64').toString('utf-8');
        const claims = JSON.parse(decoded);
        if (typeof claims.exp !== 'number' || !Number.isInteger(claims.exp) || claims.exp < 0) {
            return true;
        }
        return claims.exp <= nowEpochSeconds;
    } catch {
        return true;
    }
}
```
Test shapes to mirror from `JwtValidityTest.java` (quoted above): a two-part token; a well-formed
payload with no `exp`; `exp` on either side of `now`; a decode-throwing payload; null/empty token;
`exp` exactly equal to `now` (expired); `exp` as a string or a decimal; `exp` overflowing a safe
integer; a four-part token; a token with no dots; **plus** the JS-specific empty-signature case
from Pitfall 1 that Java's own suite does not need a dedicated case for.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| VS Code `isTokenExpired()` returns `false` ("not expired") on every unclassifiable JWT shape | `isEmTokenExpired()` returns `true` (expired) on every unclassifiable shape, matching IntelliJ's `JwtValidity` (fixed for #535 on that host already) | This phase (SEC-14) | Closes the fail-open gap #553 documents; VS Code and IntelliJ now share one validation policy, ported by hand since no shared JS/Java code exists between the two hosts |
| `Commands.cjs` covered only by source-text regex/brace-scanning tests | `Commands.cjs` loaded and executed for real under Vitest via `module.registerHooks()` | This phase (TEST-09) | The four existing "cannot be loaded under Vitest" doc comments (`no-shell-command-construction.test.ts`, `em-properties-reader-guard.test.ts`, `config-path-consumers.test.ts`) become historically accurate-but-superseded; D-13 explicitly replaces the `config-path-consumers.test.ts` text-scan block, but the other two files' doc comments should be revisited by the plan (not required to change their assertions, but their "cannot be exercised" framing becomes stale once TEST-09 lands) |
| `web.bbj` fills in `admin`/`admin123` for any missing username/password | Username required; `admin123` only for the exact literal `admin` username with an empty password | This phase (SEC-12/D-05) | Closes #546's silent fail-open EM-administrator authentication |

**Deprecated/outdated:** the doc comments in `no-shell-command-construction.test.ts` and
`em-properties-reader-guard.test.ts` stating "`Commands.cjs` ... cannot be exercised end-to-end
under Vitest" become outdated once this phase's harness exists, even though those two files'
specific source-guard assertions can stay as defence-in-depth. Not required by any D-item, but
flagging so the plan doesn't have to rediscover it.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The exact wording, label names and RELEASE code values for each `web.bbj` failure step are left to implementation discretion (per CONTEXT.md); this research assumes single nonzero code `1` is acceptable for all failures, matching "one code for all failures" as the simpler of the two explicitly-allowed choices | Code Examples, Pattern 1 | Low — CONTEXT.md explicitly defers this choice; if the plan instead wants per-step codes, that is a straightforward variant of the same pattern |
| A2 | `context.globalState` is assumed to be the correct VS Code API for D-08's non-secret username persistence (no existing usage in this codebase to confirm the exact call shape, though it is VS Code's standard, documented API for exactly this purpose) | Don't Hand-Roll, Recommended Project Structure | Low — this is a well-known, stable VS Code Extension API; risk is only in exact method-name detail (`context.globalState.get`/`.update`), not in the choice of mechanism |
| A3 | A single nonzero RELEASE code is assumed not to collide with any exit-code meaning IntelliJ or VS Code already special-cases (both hosts' current handling treats any nonzero exit generically — "Process exited with code N" / execFile error — with no per-code branching found in `BbjRunActionBase.java` or `Commands.cjs`) | Architecture Patterns, Pattern 1 | Low — verified by reading both call sites' exit-code handling in full; no special-casing exists to collide with |

## Open Questions

1. **Should the pre-existing `no-shell-command-construction.test.ts` / `em-properties-reader-guard.test.ts` doc comments be updated once TEST-09 lands?**
   - What we know: their "cannot be exercised end-to-end under Vitest" framing becomes stale once the `registerHooks` harness exists (their own assertions can stay unchanged — they're valid defence-in-depth regardless).
   - What's unclear: whether the phase's scope (TEST-09, D-12/D-13) requires touching files beyond `config-path-consumers.test.ts` (which D-13 explicitly names).
   - Recommendation: leave as a small optional cleanup, not a blocking task; the plan can note it as a nice-to-have without expanding phase scope.

2. **Exact `PropertiesComponent`/`globalState` key names for the remembered username (D-08).**
   - What we know: CONTEXT.md explicitly defers this to Claude's discretion; `BbjEMTokenStore.BACKEND_WARNED_KEY` (`"com.basis.bbj.intellij.emTokenBackendWarned"`) is the naming precedent on the IntelliJ side.
   - What's unclear: nothing blocking — this is a naming choice, not a design question.
   - Recommendation: follow the same dotted-namespace convention IntelliJ already uses (e.g. `com.basis.bbj.intellij.emLastUsername`) and a parallel VS Code key under the extension's own namespace (e.g. `bbj.em.lastUsername`), for symmetry with the existing `bbj.em.token`/`bbj.em.credentials` SecretStorage keys already in `extension.ts`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest test harness, `module.registerHooks` | ✓ | v24.20.0 (this container) | CI pins `node-version: 22`; `registerHooks` requires ≥22.15.0/23.5.0 and type-stripping requires ≥22.18.0 — CI's Node 22 resolves to a version well above both floors as of 2026-09 [ASSUMED: exact CI-resolved patch version not directly inspectable from this container; risk is low since `setup-node`'s `node-version: 22` always resolves to the latest 22.x release] |
| Vitest | Commands.cjs test harness | ✓ | 4.1.10 (pinned in `package.json`) | — |
| BBjServices (`:5008`) | Manual UAT hand check (criterion 5), not automated tests | ✓ | reachable this session (`/dev/tcp/127.0.0.1/5008` open) | — |
| `bbj` binary (`/opt/bbx/bin/bbj`) | Manual UAT hand check | ✓ | present | — |
| `gradlew` (IntelliJ plugin build) | Building the IntelliJ side for UAT (per project memory: build both extensions before/at UAT) | ✓ | present at `bbj-intellij/gradlew` | — |

**Missing dependencies with no fallback:** none identified.

**Missing dependencies with fallback:** none — every dependency needed for both the automated
tests and the manual UAT hand check is present in this environment.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 |
| Config file | `bbj-vscode/vitest.config.ts` (coverage `include` needs widening — see Pitfall 2) |
| Quick run command | `cd bbj-vscode && npx vitest run test/em-token-validity.test.ts test/commands-cjs-execution.test.ts test/web-bbj-source-guard.test.ts` |
| Full suite command | `cd bbj-vscode && npm test` (RUN_BBJ_TESTS unset — skips live-BBj tests) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-12 | `web.bbj` requires a username; `admin123` fires only for `admin`+empty password | source-guard (BBj cannot be unit-tested in-process) | `cd bbj-vscode && npx vitest run test/web-bbj-source-guard.test.ts` | ❌ Wave 0 (new, D-15) |
| SEC-12 | UAT: no credentials → login_failed with no EM call, in both IDEs | manual-only (BBj process + live EM required) | — (UAT criterion 5) | n/a — justified: no EM/BBj harness exists in CI |
| SEC-13 | Each of the 8 guarded EM calls reports its own step + `ERRMES(-1)` on failure, non-zero exit | source-guard (per-call `err=` label presence) + manual UAT for real failure injection | `cd bbj-vscode && npx vitest run test/web-bbj-source-guard.test.ts`; UAT criterion 5 ("EM stopped or unreachable") | ❌ Wave 0 (new, D-15) |
| SEC-14 | Malformed/unsigned/exp-less/valid-unexpired/expired/non-integer-exp all classify correctly | unit | `cd bbj-vscode && npx vitest run test/em-token-validity.test.ts` | ❌ Wave 0 (new, D-11) |
| TEST-09 | `Commands.cjs`'s `run`/`compile`/`runBUI`/`runDWC`/decompile bodies execute and are asserted via spies | unit (execution, not text-scan) | `cd bbj-vscode && npx vitest run test/commands-cjs-execution.test.ts` | ❌ Wave 0 (new, D-12/D-13, replaces `config-path-consumers.test.ts`'s text-scan block) |
| TEST-09 | V8 coverage shows `Commands.cjs`'s executed lines | coverage run (manual verification step, not a CI gate per D-14) | `cd bbj-vscode && npx vitest run test/commands-cjs-execution.test.ts --coverage` (after widening `coverage.include`) | ❌ Wave 0 (config change needed first — Pitfall 2) |

### Sampling Rate
- **Per task commit:** the quick run command above (four new test files).
- **Per wave merge:** `cd bbj-vscode && npm test` (whole-suite baseline; project standard is
  `numFailedTests: 0` — see STATE.md's standing whole-suite-gate-substitution decision).
- **Phase gate:** full suite green, plus the D-14 coverage run recorded (not gated by a threshold),
  before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `test/em-token-validity.test.ts` — covers SEC-14 (D-09/D-10/D-11)
- [ ] `test/commands-cjs-harness.ts` (or equivalent, naming is discretion) — the `registerHooks`-based loader + fake `vscode`/`process-runner` modules, shared by the execution test
- [ ] `test/commands-cjs-execution.test.ts` — covers TEST-09 (D-12/D-13/D-14), replacing the text-scan block in `test/config-path-consumers.test.ts` (do not delete that file's `process-args`/`compiler-options` describe blocks — only the `Commands.cjs - Show-config and run paths...` block per D-13)
- [ ] `test/web-bbj-source-guard.test.ts` — covers SEC-12/SEC-13 source guards (D-15)
- [ ] `vitest.config.ts` — widen `coverage.include` to reach `Commands.cjs` (config change, no test file, but required before the D-14 coverage run has meaning)
- [ ] No new framework install needed — Vitest 4.1.10 and `node:module` are both already present.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `web.bbj` must never substitute a default credential silently (D-05); token-based auth already routes through `BBjAdminFactory.getBBjAdmin(token)` unchanged |
| V3 Session Management | yes | JWT expiry classification (SEC-14) is the session-validity control on the client side; `validateTokenServerSide` remains the server-side authority (unchanged by this phase) |
| V4 Access Control | no | EM's own authorization model governs what an authenticated user/token may do; this phase does not change EM-side authorization |
| V5 Input Validation | yes | The token module must reject malformed/non-integer/negative `exp` values rather than coercing them (D-09); `ERRMES(-1)` text is display-only, never parsed back |
| V6 Cryptography | n/a | No signature verification is performed or added (explicit, documented design decision on both hosts) — this phase does not touch cryptographic code |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Fail-open default credentials (#546) | Spoofing / Elevation of Privilege | Require an explicit username; the only fallback credential (`admin123`) is scoped to the literal `admin` username with an empty password (D-05), never a blanket default |
| Fail-open JWT classification (#553) | Spoofing (accepting an unusable/forged-shaped token as valid) | Classify every unclassifiable shape as expired (D-09/D-10), mirroring the already-hardened IntelliJ `JwtValidity`; never infer validity from "we couldn't tell" |
| Silent failure hiding a security-relevant EM rejection (#548) | Repudiation (no record a failure occurred) / Denial of Service (user cannot tell run failed vs never started) | Every guarded EM call reports its step + BBj error text via MSGBOX and a non-zero exit (D-01..D-04); never the username/password/token (D-02) |
| Secrets on argv or in debug logs | Information Disclosure | Unchanged by this phase — `process-args.ts`'s env-map convention and `formatArgvForLog`'s secret redaction (already tested by `em-secret-env-channel.test.ts`) are preserved; D-07's removal of the `bbj.web.username`/`password` config fallback does not reintroduce any argv/log path for these values |

## Sources

### Primary (HIGH confidence)
- `bbj-vscode/tools/web.bbj` — read in full, quoted above (lines 27-41 credential handling, 34-100 EM call sequence, 105-106 `login_failed`)
- `bbj-vscode/tools/em-login.bbj` — read in full, `authFailed:` label pattern (lines 54-59)
- `bbj-vscode/src/extension.ts` — read in full, `isTokenExpired` (409-440), `getEMCredentials`/`ensureValidToken` (446-552), `bbj.loginEM` registration (728-809, `value: "admin"` at line 744)
- `bbj-vscode/src/Commands/Commands.cjs` — read in full, `runWeb` (63-144), legacy fallback (87-92)
- `bbj-vscode/src/Commands/process-args.ts` — read in full, `EM_ENV_VARS`, `buildWebRunArgv`, `createOwnerOnlyFile`
- `bbj-vscode/src/Commands/process-runner.ts` — read in full, `runProcess`/`runProcessCallback`/`confineBbjExecutable` dependency
- `bbj-vscode/src/Commands/target-resolution.ts` — read (partial), confirms `.ts`, no `vscode` import
- `bbj-vscode/vitest.config.ts` — read in full, `coverage.include: ['src/**/*.ts']` (line 12) — confirmed to exclude `Commands.cjs` by empirical coverage run (see below)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/JwtValidity.java` — read in full
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/JwtValidityTest.java` — read in full, all 13 test-shape names
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java` — read in full, `promptUsername` (`"admin"` default, line 210)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java` — read in full, `PropertiesComponent` precedent
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` — read (partial), exit-code logging (line 106), `buildWebRunCommandLine` (333-447)
- `bbj-intellij/build.gradle.kts` — read (partial, lines 150-227), confirms `web.bbj`/`em-login.bbj`/`em-validate-token.bbj` are copied byte-identically from `bbj-vscode/tools/` into both the plugin jar resources and `prepareSandbox`, with no transformation step
- `bbj-vscode/src/language/bbj.langium` — grepped, line 536: `RELEASE_NO_NL exitVal=Expression` confirms a nonzero-exit `RELEASE` is grammar-legal
- `examples/functions.bbl` — grepped, `ERRMES(int{,str}{,ERR=lineref})` signature confirmed
- `bbj-vscode/test/config-path-consumers.test.ts`, `em-clientenv-guard.test.ts`, `em-properties-reader-guard.test.ts`, `no-shell-command-construction.test.ts`, `em-secret-env-channel.test.ts`, `extension-activation.test.ts` — all read in full for existing test patterns and the documented "cannot load Commands.cjs under Vitest" constraint
- Empirical probe, this session (Node v24.20.0, Vitest 4.1.10, run from `/home/coder/repos/bbj-language-server/bbj-vscode`):
  1. `node /tmp/.../probe-require.cjs` with a `Module._resolveFilename`-only shim → confirmed it resolves `vscode` inside `Commands.cjs` itself but fails deeper at `Cannot find module './CompilerOptions'` (extensionless resolution never tries `.ts`).
  2. Adding a `.ts`-fallback to the same `_resolveFilename` hook → progresses further, then fails with `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'vscode' imported from .../CompilerOptions.ts` — proving the CJS-only hook cannot reach a nested ESM-format `.ts` file's own `import 'vscode'`.
  3. Switching to `module.registerHooks()` with the same two resolve fallbacks (`.ts`, `.js`→`.ts`) plus a `load` hook for the `vscode-shim:vscode` URL → `node -e ...` reported `LOADED OK` with all 11 `Commands.cjs` export keys.
  4. The same harness, placed in a real, disposable `bbj-vscode/test/_research-probe-commands-cjs-load.test.ts` and run via `cd bbj-vscode && npx vitest run test/_research-probe-commands-cjs-load.test.ts` → `Test Files 1 passed (1)`, `Tests 1 passed (1)`.
  5. The same probe run with `--coverage` → `Commands.cjs` does not appear anywhere in the coverage report (`grep -i "commands.cjs\|Commands/" <output>` returned nothing), confirming Pitfall 2.
  6. The probe test file was deleted after the experiment; nothing from steps 1-5 is committed.
  7. `node -e 'console.log(JSON.stringify("header.payload.".split(".")))'` → `["header","payload",""]`, confirming Pitfall 1's JS/Java `split()` divergence.
- GitHub issues #546, #548, #553, #565 — fetched via `gh issue view <n> --json title,body`, cross-checked against CONTEXT.md (no new information beyond what CONTEXT.md already captures)

### Secondary (MEDIUM confidence)
- WebSearch, Node.js type-stripping/`--experimental-strip-types` default-on timeline (Node 22.18.0+ unflagged; `registerHooks` since 22.15.0/23.5.0) — cross-checked against this container's Node 24.20.0 behaving as expected; CI's `node-version: 22` is assumed to resolve above both floors (see Assumptions Log A-equivalent in Environment Availability, not independently confirmed against the exact CI runner's resolved patch version)

### Tertiary (LOW confidence)
- None — every claim above either cites a file read this session, a grammar/doc-string cross-check, or a live command run in this session.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; the one "new" tool (`module.registerHooks`) was proven working end-to-end against this repo's actual pinned Vitest version in this session, not merely documented
- Architecture: HIGH — every file and line this research relies on was read directly this session; the `web.bbj` call-site inventory (D-03) and the IntelliJ reference implementation were both read in full, not sampled
- Pitfalls: HIGH — both non-obvious pitfalls (JS/Java `split()` divergence; coverage `include` glob) were independently reproduced with a live command in this session, not inferred

**Research date:** 2026-09-27
**Valid until:** 30 days (stable codebase area; the one time-sensitive fact — Node version floors for `module.registerHooks`/type-stripping — is already well past its stabilization point and unlikely to regress)
