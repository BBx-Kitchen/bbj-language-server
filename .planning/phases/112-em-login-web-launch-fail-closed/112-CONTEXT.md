# Phase 112: EM Login & Web Launch Fail Closed - Context

**Gathered:** 2026-09-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Launching a BUI or DWC program through Enterprise Manager changes in three ways:
- `web.bbj` stops filling in default credentials, with one exception the user kept
  (D-05): an empty password for the user `admin`.
- Every EM call after login reports its own failure visibly.
- VS Code treats an EM token whose expiry cannot be read as expired.

The `Commands.cjs` code that drives these launches (and the run, compile and decompile
commands) is loaded and executed by vitest instead of being scanned as text.

Files: `bbj-vscode/tools/web.bbj` (bundled into the IntelliJ plugin unchanged),
`bbj-vscode/src/extension.ts` (`isTokenExpired()`, `bbj.loginEM` username prompt),
`bbj-vscode/src/Commands/Commands.cjs`, a new plain token module, the IntelliJ EM login
username prompt (`BbjEMLoginAction.java`), and tests.
Requirements: SEC-12 (amended, see D-05), SEC-13, SEC-14, TEST-09. Issues: #546, #548, #553, #565.

</domain>

<decisions>
## Implementation Decisions

### EM failure reporting in web.bbj (SEC-13)
- **D-01:** A failed EM step shows a **MSGBOX** (same style as today's `login_failed`,
  titled `"Launching " + programme`) **and** ends with a **non-zero RELEASE code**. BBj draws
  the dialog in both IDEs, and the exit code lets each IDE log the failure: IntelliJ logs
  "exited with code N", and VS Code's `runWeb` callback shows its own "Failed to run" error.
  The console stays hidden (`? 'HIDE'`), so stderr is not a channel. The login-failure path
  uses the same MSGBOX + non-zero exit.
- **D-02:** The message names the step and includes the BBj error text (for example
  `ERRMES(-1)`, and the error number if useful). For example: "Could not register the
  application with Enterprise Manager (commit): <BBj error text>". It never includes the
  username, password or token.
- **D-03:** Guarded calls are `getRemoteConfiguration`, `getApplications` (the
  app lookup loop, including the iterator calls), `createApplication`,
  `BBjAPI().getConfig().getConfigFileName()`, `commit`, `getDwcUrl`/`getBuiUrl`, and
  `getThinClient().browse`. `setString`/`setBoolean` only change the local application object
  and stay unguarded.
- **D-04:** Each guarded call has its **own `err=` label**. That label sets the step
  description and jumps to one shared reporter label (MSGBOX + non-zero RELEASE). The MSGBOX
  code is not repeated per step. There is no single catch-all label driven by a `step!`
  variable, because a call that forgot to set the variable would report the wrong step.

### Missing credentials (SEC-12, amended by the user)
- **D-05 (user ruling, amends SEC-12 and success criterion 1):** In the username/password path
  (no token), `web.bbj` **requires a username**. An empty username goes to `login_failed` and
  makes no EM call. The `admin` username default is removed. The `admin123` default stays in
  exactly one case: the username is exactly `admin` (lower case, compared case-sensitively)
  and the password is empty. Any other user with an empty password is sent to EM as given (no
  default is filled in), and if EM rejects it, that ends on `login_failed`.
  REQUIREMENTS.md SEC-12 and ROADMAP.md Phase 112 criterion 1 were amended on 2026-09-27 to
  match. — **Reversibility:** reversible — a two-line change in `web.bbj`.
- **D-06:** One "Login Failed!" message covers both "nothing supplied" and "EM rejected the
  login" (plus the BBj error text per D-02 where there is one). There is no separate
  "no credentials" message.
- **D-07:** Remove the legacy fallback in `Commands.cjs` `runWeb` that reads the undeclared
  `bbj.web.username` / `bbj.web.password` settings. Without credentials, `runWeb` shows an
  error and returns without starting `web.bbj`. Both command wrappers in `extension.ts`
  already return early when `ensureValidToken` yields nothing, so users see no change.
- **D-08 (user request):** Both IDE login prompts pre-fill the **last successfully used EM
  username**, or `admin` if none has been remembered. The username is not secret: VS Code keeps
  it in `context.globalState`, IntelliJ in `PropertiesComponent` (application level). It is
  saved only after a successful login. Passwords and tokens are never stored this way.
  Today both prompts hard-code `admin` (`extension.ts` `bbj.loginEM`, `BbjEMLoginAction.promptUsername`).

### Token expiry check (SEC-14)
- **D-09:** VS Code's check follows IntelliJ `JwtValidity.check` exactly: a
  null or empty token, a segment count other than 3, a base64url decode failure, a payload with
  no `exp`, or an `exp` that is not a non-negative integer (decimals, strings and overflow are
  all rejected) is treated as expired. Only a valid integer `exp` gives a verdict, compared
  strictly (`exp <= now` is expired) with no clock-skew allowance, because the server-side check
  absorbs skew. The signature is never verified: there is no key on the client, and
  `validateTokenServerSide` stays the authority.
- **D-10:** "Unsigned" means an **empty third segment** (`header.payload.`), which is treated as
  expired. Java's `split` already drops that trailing empty part, so IntelliJ treats it as
  MALFORMED today, and IntelliJ needs no change. `alg: none` header inspection is not added.
- **D-11:** The check moves into its own plain module under `bbj-vscode/src/` with no
  `vscode` import. It takes a `now` (epoch seconds) argument like `JwtValidity.check`, and
  `extension.ts` imports it. Tests import the module directly and cover malformed,
  unsigned, exp-less and valid-unexpired tokens, plus expired and non-integer exp, mirroring
  the IntelliJ `JwtValidityTest` shapes. The existing flow stays unchanged: an expired
  verdict deletes `bbj.em.token` and leads to the login prompt.

### Commands.cjs test harness (TEST-09)
- **D-12:** Load `Commands.cjs` under vitest through a **`vscode` shim in Node's CJS
  resolution**. A test helper puts a fake `vscode` module into `require.cache` or a resolve
  hook, then loads `Commands.cjs` with `createRequire`. `Commands.cjs` itself does not change
  for testability, apart from the D-07 removal. That leaves Phase 120 (REF-11) a clean baseline
  to reshape. Research gate: `Commands.cjs` does `require("./process-args")` and similar,
  which point at `.ts` sources. The researcher confirms how these resolve under vitest (vitest's
  own transform, a `.ts` require hook, or loading the built output) and picks the smallest
  approach that works.
- **D-13:** The text-scanning `Commands.cjs` tests in `test/config-path-consumers.test.ts`
  (brace-counting `extractBody`) are **replaced** by execution tests that keep the same
  assertions: the resolved config path is used, the `--` sentinel is refused, the no-config
  error is shown. These tests call into the loaded module and check spies.
- **D-14:** Execution coverage is shown by behaviour assertions on spies inside the `run`,
  `compile`, `runBUI`/`runDWC` (`runWeb`) and decompile bodies. Verification also records a V8
  coverage run that shows those lines executed. No coverage threshold is added to
  `vitest.config.ts` (gates are Phase 114's).
- **D-15:** `web.bbj` gets a small source-guard test. It checks that `admin123` appears only
  inside the `username! = "admin"` branch (D-05), that there is no `admin` username default,
  and that each call listed in D-03 carries its own `err=` label. Behaviour is covered by the
  UAT hand check (criterion 5), which runs: no credentials, wrong password, EM stopped or
  unreachable, and a good BUI and DWC launch, in both VS Code and IntelliJ.

### Claude's Discretion
- The exact message wording per step, the label names, and the non-zero RELEASE code values
  (one code for all failures or one per step).
- The token module's file and function names (for example `em-token-validity.ts`,
  `isEmTokenExpired(token, nowSeconds)`).
- The mechanism for the `vscode` shim (require.cache seeding or a `Module._resolveFilename`
  hook) and where the helper lives under `test/`.
- The globalState/PropertiesComponent key name for the remembered username.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and requirements
- `.planning/ROADMAP.md` §"Phase 112: EM Login & Web Launch Fail Closed": goal, success criteria (criterion 1 amended per D-05), planning notes on the CJS loader
- `.planning/REQUIREMENTS.md`: SEC-12 (amended), SEC-13, SEC-14, TEST-09
- GitHub issues #546, #548, #553, #565 (read via `gh issue view`)

### Reference implementation (IntelliJ, already fail-closed, v4.2 TOKEN-01)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/JwtValidity.java`: rules D-09 mirrors
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/JwtValidityTest.java` (if present): token shapes to mirror
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` `buildWebRunCommandLine`: IntelliJ's web.bbj launch and exit-code logging
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java` `promptUsername`: D-08 target

### Code under change
- `bbj-vscode/tools/web.bbj`: D-01..D-06
- `bbj-vscode/tools/em-login.bbj`: the existing error-reporting pattern (reads credentials through CLIENTENV/ENV)
- `bbj-vscode/src/extension.ts`: `isTokenExpired`, `getEMCredentials`, `ensureValidToken`, `bbj.loginEM`, `bbj.runBUI`/`bbj.runDWC` registrations
- `bbj-vscode/src/Commands/Commands.cjs`: `runWeb`, `run`, `compile`, decompile bodies
- `bbj-vscode/test/config-path-consumers.test.ts`: the text-scan block D-13 replaces
- `bbj-vscode/test/extension-activation.test.ts`: how extension tests mock `vscode` and `Commands.cjs` today

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/Commands/process-args.ts` `buildWebRunArgv`: the tested argv builder. The token and
  password travel in the env map, never as ARGV.
- `src/Commands/process-runner.ts` (`runProcessCallback`, `formatArgvForLog`): the spawn point
  to stub in the Commands.cjs execution tests.
- `src/Commands/target-resolution.ts`, `src/config-path-cache.ts`: plain modules Commands.cjs
  requires; they can be driven directly in tests.
- `JwtValidity.java`: the rule set to port.

### Established Patterns
- Small plain modules without editor imports for checks shared with tests (110 D-01,
  111 D-01, `config-path-resolver.ts`).
- `web.bbj`/`em-login.bbj` read secrets from the environment, CLIENTENV first and then ENV
  (the macOS finding). Keep this.
- Tests use `parseHelper`, never `DocumentBuilder.build` (not relevant here; no LS documents).

### Integration Points
- `extension.ts` `getEMCredentials()` calls the token check. On an expired verdict it deletes
  `bbj.em.token` and returns undefined, which leads to the login prompt.
- `bbj-intellij/build.gradle.kts` bundles `tools/web.bbj`. The IntelliJ run path picks up the
  changed file with no Java change beyond D-08.

</code_context>

<specifics>
## Specific Ideas

- The user keeps the `admin`/empty-password → `admin123` convenience because that is the
  universal default of a fresh BBj install. It fires only for the literal `admin` user and
  never fills in a username.
- Pre-filling the remembered username (else `admin`) is the IDE-side half of the same ruling.

</specifics>

<deferred>
## Deferred Ideas

- `alg: none` header inspection in both IDEs' token checks: not needed for SEC-14 (D-10).
- A coverage threshold for `Commands.cjs`: belongs with Phase 114's gates.

### Reviewed Todos (not folded)
- IntelliJ sends javaInteropHost/javaInteropPort but the LS reads interopHost/interopPort: interop settings, not EM (keyword match only).
- linking.test.ts interop failures survive class warm-up: Phase 116 (TEST-05).
- Phase 97 code-review follow-ups (download progress, weak guards): Phase 114 (FIX-04).
- Peer-supplied Java names break the signature-help fence / snippet variables: Phase 118 area (signature-help provider).

</deferred>

---

*Phase: 112-em-login-web-launch-fail-closed*
*Context gathered: 2026-09-27*
