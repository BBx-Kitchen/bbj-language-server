# Phase 112: EM Login & Web Launch Fail Closed - Pattern Map

**Mapped:** 2026-09-27
**Files analyzed:** 9 (5 modified, 4 new)
**Analogs found:** 9 / 9 (all analogs are the same files being modified, or their nearest sibling — this phase is porting/hardening existing code, not building a new subsystem)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|---------------|
| `bbj-vscode/tools/web.bbj` (modify, D-01..D-06) | script (BBj launcher) | request-response (spawned process, EM RPC calls) | `bbj-vscode/tools/em-login.bbj` (self, sibling script) | exact — same call shape, same output channel (MSGBOX/exit code vs file+ERROR: prefix) |
| `bbj-vscode/src/em-token-validity.ts` (new, D-11) | utility (plain module) | transform (decode/classify) | `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/JwtValidity.java` (cross-language port target); `bbj-vscode/src/extension.ts` `isTokenExpired()` (lines 412-440, the function being replaced) | exact — 1:1 port with one JS-specific fix (Pitfall 1) |
| `bbj-vscode/src/extension.ts` (modify: `isTokenExpired` removal, `bbj.loginEM` prefill D-08) | provider/controller (extension activation, command registration) | request-response | itself — `getEMCredentials`/`ensureValidToken` (446-552) and `bbj.loginEM` handler (728-809) are the exact blocks touched | exact |
| `bbj-vscode/src/Commands/Commands.cjs` (modify: `runWeb` D-07) | controller (VS Code command implementation) | request-response (spawns `bbj` process) | itself — `runWeb` (lines 63-144) | exact |
| `bbj-vscode/test/commands-cjs-harness.ts` (new, D-12) | test utility (module loader/shim) | transform (module resolution hook) | `bbj-vscode/test/config-path-consumers.test.ts` (existing `vscode`-mocking + Commands.cjs-path-reading test, lines 1-140) — nearest existing attempt at exercising Commands.cjs under Vitest | role-match — no `registerHooks`-based harness exists yet in the codebase; RESEARCH.md's empirically-verified code example is the primary source |
| `bbj-vscode/test/commands-cjs-execution.test.ts` (new, D-13/D-14) | test (unit, execution) | request-response (spy-based) | `bbj-vscode/test/config-path-consumers.test.ts` `describe('Commands.cjs - Show-config and run paths...')` block (lines 105-211) — the text-scan block this file replaces | exact — same assertions (resolved config path, `--` sentinel refused, no-config error shown), different mechanism (execution vs text-scan) |
| `bbj-vscode/test/em-token-validity.test.ts` (new, D-11) | test (unit) | transform | `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/JwtValidityTest.java` — the 13 test-shape names to mirror | exact — cross-language port of test cases |
| `bbj-vscode/test/web-bbj-source-guard.test.ts` (new, D-15) | test (source-guard) | transform (text/regex assertions) | `bbj-vscode/test/config-path-consumers.test.ts` `extractBody`/marker-based brace-counting helper (lines 105-137) — the exact source-guard idiom already used in this repo for BBj/Commands.cjs text assertions | exact |
| `bbj-vscode/vitest.config.ts` (modify, Pitfall 2: widen `coverage.include`) | config | config | itself | exact |

## Pattern Assignments

### `bbj-vscode/tools/web.bbj` (script, request-response)

**Analog:** `bbj-vscode/tools/em-login.bbj` (error-reporting idiom) + `web.bbj` itself (call sites to guard)

**Current credential-default block to remove** (`web.bbj` lines 34-42):
```bbj
rem Token-based authentication if token is provided
if (token! <> null() and token! > "") then
    admin! = BBjAdminFactory.getBBjAdmin(token!,err=login_failed)
else
    rem Legacy username/password authentication (backward compatible)
    if (username! = null() or username! = "") username! = "admin"
    if (password! = null() or password! = "") password! = "admin123"
    admin! = BBjAdminFactory.getBBjAdmin(username!, password!,err=login_failed)
fi
```
Per D-05, replace the two unconditional defaults with: empty username → `goto login_failed` (no EM call); `admin123` only when `username! = "admin"` (case-sensitive) and `password! = ""`; any other empty password is sent to EM as-is.

**Existing `err=`-label idiom to copy** (`bbj-vscode/tools/em-login.bbj` lines 46-59):
```bbj
token! = BBjAdminFactory.getAuthToken(host!, username!, password!, 0, payload!, err=authFailed)
ch=unt
open(ch,mode="O_CREATE,O_TRUNC")outputFile!
write(ch)token!
close(ch)
release

authFailed:
ch=unt
open(ch,mode="O_CREATE,O_TRUNC")outputFile!
write(ch)"ERROR:Authentication failed - invalid credentials or EM not available"
close(ch)
release
```
`web.bbj` reports via MSGBOX + exit code instead of a file (its `login_failed:` label already does this at lines 105-106), but the "each risky call carries its own named `err=` label" structure is identical.

**Existing MSGBOX + exit pattern to extend** (`web.bbj` lines 102-107 — the pre-existing bare-`release` bug per Pitfall 3):
```bbj
release


login_failed:
    a=MSGBOX("Login Failed!",0,"Launching "+str(programme!))
release
```
D-01 requires this `release` (currently exit 0) to become `release 1`, and every new guarded-call failure label (D-03/D-04) to follow the same `MSGBOX(...,0,"Launching "+str(programme!))` + `release <nonzero>` shape, jumping to one shared reporter label rather than repeating the MSGBOX call per step (see RESEARCH.md Pattern 1 for the full illustrative shared-label shape — label names/wording are Claude's discretion per D-04/A1).

**Guarded call sites (D-03), verbatim from current `web.bbj`, each needs its own `err=step_x` label:**
```bbj
configuration! = admin!.getRemoteConfiguration()                     rem line 43
apps! = configuration!.getApplications()                             rem line 50
it! = apps!.iterator() / it!.hasNext() / it!.next()                  rem lines 51-53
app! = configuration!.createApplication()                            rem line 63
sessionConfig! = BBjAPI().getConfig().getConfigFileName()            rem line 79
app!.commit()                                                        rem line 96
url! = iff(isDWC!, app!.getDwcUrl(0), app!.getBuiUrl(0))              rem line 99
BBjAPI().getThinClient().browse(url!)                                rem line 100
```
`app!.setString(...)`/`app!.setBoolean(...)` (lines 67-95) stay unguarded per D-03.

---

### `bbj-vscode/src/em-token-validity.ts` (utility, transform) — NEW

**Analog:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/JwtValidity.java` (rule set to port) + the function it replaces:

**Current fail-open implementation being replaced** (`bbj-vscode/src/extension.ts` lines 412-440):
```typescript
function isTokenExpired(token: string): boolean {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return false; // Not a JWT, let server decide
        }
        let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = Buffer.from(payload, 'base64').toString('utf-8');
        const claims = JSON.parse(decoded);
        if (!claims.exp) {
            return false; // No expiration claim, can't determine
        }
        const now = Math.floor(Date.now() / 1000);
        return claims.exp <= now;
    } catch (error) {
        return false; // If any parsing fails, let server validate
    }
}
```
Note every `return false` above is a fail-open branch D-09 requires to flip to `return true`, plus the Pitfall-1 empty-signature check that this code is missing entirely.

**Target port shape** (RESEARCH.md's verified recommendation — copy this shape exactly, names are discretion):
```typescript
export function isEmTokenExpired(token: string | null | undefined, nowEpochSeconds: number): boolean {
    if (!token) {
        return true;
    }
    const parts = token.split('.');
    // JS split() keeps a trailing empty segment (unlike Java's String.split),
    // so "header.payload." has length 3 — the explicit parts[2] === '' check
    // is required, not redundant (RESEARCH.md Pitfall 1).
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

**Caller update** — `getEMCredentials()` (`extension.ts` lines 446-462) calls `isTokenExpired(token)` at line 451; replace with an import of `isEmTokenExpired` and pass an explicit `Math.floor(Date.now() / 1000)` (the "now" argument D-11 requires, mirroring `JwtValidity.check(String, long)`). No other line in `getEMCredentials`/`ensureValidToken` (446-552) needs to change — the expired-token-deletes-and-reprompts flow already exists and stays as-is.

---

### `bbj-vscode/src/extension.ts` — `bbj.loginEM` username prefill (D-08)

**Analog:** the same file's hard-coded prompt (lines 742-746):
```typescript
const username = await vscode.window.showInputBox({
    prompt: "EM Username",
    value: "admin",
    ignoreFocusOut: true
});
if (!username) return;
```
Replace the hard-coded `value: "admin"` with `context.globalState.get<string>('bbj.em.lastUsername', 'admin')` (key name is discretion; RESEARCH.md recommends this dotted-namespace form for symmetry with `bbj.em.token`/`bbj.em.credentials`). On successful login (after line 804's `context.secrets.store('bbj.em.token', output);`), add `await context.globalState.update('bbj.em.lastUsername', username);` — same success point, same `context` object already in scope, no new plumbing.

**IntelliJ cross-reference** for the equivalent Java-side change (not this file, but the parity target): `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java` `promptUsername` (hard-codes `"admin"` at line 210) and `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java`'s `PropertiesComponent`-backed `BACKEND_WARNED_KEY` constant is the exact existing precedent for an application-scoped string value on that host.

---

### `bbj-vscode/src/Commands/Commands.cjs` — `runWeb` legacy fallback removal (D-07)

**Analog:** itself, lines 63-144 (full function read above)

**Block to remove** (lines 87-92):
```javascript
} else {
    // Legacy fallback to config (backward compatibility)
    username = vscode.workspace.getConfiguration("bbj").web?.username || "";
    password = vscode.workspace.getConfiguration("bbj").web?.password || "";
    token = "";
}
```
Per D-07, when `credentials` is falsy, `runWeb` should show an error and return without building `argv`/spawning `web.bbj` — mirroring the existing `if (!home) return;` (line 68) and `if (!configPath) { vscode.window.showErrorMessage(NO_CONFIG_PATH_MESSAGE); return; }` (lines 109-112) early-return-with-message shape already used twice in this same function. Both callers (`bbj.runBUI`/`bbj.runDWC` in `extension.ts`, lines 813-822) already call `ensureValidToken` first and `return` early when it yields `undefined`, so `credentials` is never actually falsy through the normal command path — this removal only closes the code path, per CONTEXT.md's note that "users see no change."

---

### `bbj-vscode/test/commands-cjs-harness.ts` (new, test utility)

**Analog:** `bbj-vscode/test/config-path-consumers.test.ts` lines 1-140 (existing `vscode`-mocking attempt + doc comment explaining why `vi.mock('vscode')` fails for this `.cjs` file); primary source is RESEARCH.md's empirically-verified `module.registerHooks()` code example (already proven working end-to-end against this repo's pinned Vitest 4.1.10 — see RESEARCH.md "Sources" step 4). Copy that example's resolve/load hook structure verbatim; extend it with a second shim branch for `./process-runner` per RESEARCH.md's "Recommended extension for D-13/D-14."

**Existing marker/extractBody helper this test dir already uses for BBj/Commands.cjs text assertions** (`config-path-consumers.test.ts` lines ~105-137, referenced by the new source-guard test below):
```typescript
function extractBody(source: string, marker: string): string {
    const idx = source.indexOf(marker);
    if (idx === -1) {
        throw new Error(`Marker not found in Commands.cjs: ${marker}`);
    }
    // ... brace-counting scan ...
    throw new Error(`Unbalanced braces for marker in Commands.cjs: ${marker}`);
}
```
D-13 replaces the *describe block that calls this helper on Commands.cjs*, but the helper itself is fine to keep reusing for other still-text-scanned assertions if any remain (none are required to remain per D-13's scope).

---

### `bbj-vscode/test/commands-cjs-execution.test.ts` (new, D-13/D-14)

**Analog:** `config-path-consumers.test.ts` `describe('Commands.cjs - Show-config and run paths read the resolved config path', ...)` (lines 105-211) — same three assertions (resolved config path used, `--` sentinel refused, no-config error shown), reimplemented as spy-based execution tests against the real `runWeb`/`run`/`compile`/decompile bodies loaded via the harness, per RESEARCH.md's Pattern 2 code example and D-14.

---

### `bbj-vscode/test/em-token-validity.test.ts` (new, D-11)

**Analog:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/JwtValidityTest.java` — port all 13 named test shapes (two-part token, no-`exp` payload, `exp` before/after/equal to `now`, decode-throwing payload, null/empty token, string/decimal `exp`, overflow `exp`, four-part token, no-dot token), plus the JS-specific empty-signature case (`"header.payload."`) that RESEARCH.md's Pitfall 1 requires and Java's own suite does not need.

---

### `bbj-vscode/test/web-bbj-source-guard.test.ts` (new, D-15)

**Analog:** `config-path-consumers.test.ts`'s marker/`extractBody` source-guard idiom (same file, lines 105-137) — read `tools/web.bbj` as text and assert: `admin123` appears only inside the `username! = "admin"` branch; no bare `username! = "admin"` default line exists outside that branch; every D-03-listed call carries its own `err=` label; `login_failed:` and the shared reporter label are followed by `release <nonzero>`, never a bare `release` (Pitfall 3).

---

## Shared Patterns

### BBj `err=`-label → single reporter (SEC-13, all of `web.bbj`)
**Source:** `bbj-vscode/tools/em-login.bbj` lines 46-59 (existing `authFailed:` idiom); RESEARCH.md Pattern 1 (the exact shared-reporter extension for `web.bbj`, since `em-login.bbj` reports to a file and `web.bbj` reports via MSGBOX/exit code — same label structure, different sink).
**Apply to:** every guarded call in `web.bbj` (D-03) plus the existing `login_failed:` label (D-01, Pitfall 3).

### CLIENTENV-then-ENV credential read (unchanged, do not touch)
**Source:** both `web.bbj` (lines 22-32) and `em-login.bbj` (lines 11-19) already share this exact block verbatim. No pattern work needed here — call out to plans only as "leave this block alone."

### Secrets travel in `argv.env`, never argv or logs (unchanged, established convention)
**Source:** `bbj-vscode/src/Commands/process-args.ts` (`EM_ENV_VARS`, `buildWebRunArgv`), `bbj-vscode/src/Commands/process-runner.ts` (`runProcess`, `formatArgvForLog`'s redaction), already exercised by `bbj-vscode/test/em-secret-env-channel.test.ts`.
**Apply to:** confirm D-07's `runWeb` change does not reintroduce any argv/log path for username/password/token — it doesn't; it only removes a config-read branch upstream of the existing `argv` construction (line 114).

### `module.registerHooks()` CJS+ESM shim (TEST-09, cross-cutting for all three new test files that load `Commands.cjs`)
**Source:** RESEARCH.md "Pattern 2" (empirically verified code example, quoted in full there) — this is new to the codebase, no existing analog; treat RESEARCH.md's example as the canonical source rather than searching further.
**Apply to:** `commands-cjs-harness.ts`, `commands-cjs-execution.test.ts`.

### `context.globalState` non-secret persistence (D-08, new to this codebase's VS Code side)
**Source:** no existing VS Code usage found (RESEARCH.md Assumption A2, confirmed empty by this pattern search too); the only precedent is IntelliJ's `PropertiesComponent`-backed `BbjEMTokenStore.BACKEND_WARNED_KEY` (`bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java`).
**Apply to:** `extension.ts`'s `bbj.loginEM` handler only.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `bbj-vscode/src/em-token-validity.ts` | utility | transform | No existing plain TS module in this repo ports Java logic 1:1 yet; use `JwtValidity.java` (a different language) as the pattern source, not a same-language codebase analog — flagged here since it is a cross-language port rather than an in-repo copy |
| `bbj-vscode/test/commands-cjs-harness.ts` | test utility | event-driven (module hook) | `module.registerHooks()` is not used anywhere else in this codebase; RESEARCH.md's verified example is the only source |

## Metadata

**Analog search scope:** `bbj-vscode/tools/`, `bbj-vscode/src/`, `bbj-vscode/src/Commands/`, `bbj-vscode/test/`, `bbj-vscode/vitest.config.ts`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/`
**Files scanned:** `web.bbj`, `em-login.bbj`, `extension.ts` (targeted ranges 405-560, 725-823), `Commands.cjs` (targeted ranges 1-10, 63-148, 340-350), `config-path-consumers.test.ts` (targeted ranges), `vitest.config.ts`, plus RESEARCH.md's already-quoted `JwtValidity.java`/`JwtValidityTest.java`/`BbjEMLoginAction.java`/`BbjEMTokenStore.java`/`BbjRunActionBase.java` excerpts (not re-read this pass — RESEARCH.md's quotes are treated as authoritative primary-source excerpts per its own "read in full" citations)
**Pattern extraction date:** 2026-09-27
