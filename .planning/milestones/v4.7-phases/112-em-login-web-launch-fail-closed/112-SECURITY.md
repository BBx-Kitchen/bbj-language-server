---
phase: "112"
slug: "em-login-web-launch-fail-closed"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-27"
---

# Phase 112 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| IDE host process → spawned `bbj -q web.bbj` | credentials and token cross on the environment (`BBJ_EM_*`), positional arguments on argv | EM username, password, JWT (secret) |
| web.bbj → Enterprise Manager admin API | `BBjAdminFactory` login and every configuration call | credentials / token, app configuration |
| web.bbj → local user | MSGBOX text and the process exit code | step name, BBj error text and number |
| VS Code SecretStorage → extension host | a stored EM JWT is read back and classified before any run | JWT (secret) |
| extension host → spawned web.bbj / em-validate-token.bbj | a token classified valid is handed on via the environment | JWT (secret) |
| login prompt ↔ plain IDE storage | the last successful username is written to and read from `globalState` / `PropertiesComponent` | username (not secret) |
| VS Code settings → Commands.cjs `runWeb` | settings were formerly a credentials fallback (removed) | settings values |
| test harness → Node module resolution | `registerHooks` resolve/load hooks inside the vitest worker only | module URLs |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-112-01 | Spoofing / EoP | web.bbj credential defaults (#546) | high | mitigate | `tools/web.bbj:38` empty username → `login_failed` with no EM call; `:40` admin123 only for literal `admin` + empty password; pinned by `test/web-bbj-source-guard.test.ts` | closed |
| T-112-02 | EoP | admin + empty password → admin123 default | low | accept | See Accepted Risks Log | closed |
| T-112-03 | Repudiation / DoS | silent EM failures after login (#548) | medium | mitigate | `tools/web.bbj:43-100` each guarded EM call has its own `err=` label; shared reporter `:138` names the step with `ERRMES(-1)` and `err`, then `release 1` (`:139`) | closed |
| T-112-04 | Information disclosure | failure message text | medium | mitigate | MSGBOX / `failedStep$` lines (`tools/web.bbj:105-142`) use only fixed step text, `ERRMES(-1)` and `err`; no `username!`/`password!`/`token!` (grep-confirmed, source guard) | closed |
| T-112-05 | Information disclosure | EM exception text inside `ERRMES(-1)` | low | accept | See Accepted Risks Log | closed |
| T-112-06 | Tampering | stale error text on the empty-username path | low | mitigate | `login_failed` (`tools/web.bbj:141-143`) never calls `ERRMES`; only `login_rejected` routes through the reporter | closed |
| T-112-07 | Spoofing | fail-open expiry classification (#553) | high | mitigate | `src/em-token-validity.ts:44-79` `classifyEmToken` returns `malformed` for anything not positively decoded, `isEmTokenExpired` is `!== 'valid'`; `src/extension.ts:421,513` deletes such a token and forces login; IntelliJ `BbjEMTokenStore.java:80` mirrors it. Login path also gated (`extension.ts:777-778`, `BbjEMLoginAction.java:184`) | closed |
| T-112-08 | Tampering | lenient base64 decoding of the payload | medium | mitigate | `src/em-token-validity.ts:31,83-105` strict base64url alphabet, length and padding checks before `Buffer.from` | closed |
| T-112-09 | Spoofing | unsigned token (empty third segment) | medium | mitigate | `src/em-token-validity.ts:49-54` explicit segment-count and empty-signature check | closed |
| T-112-10 | Spoofing | forged token with future exp, invalid signature | medium | transfer | No key on the client by design; `validateTokenServerSide` (em-validate-token.bbj against EM) remains the authority, unchanged | closed |
| T-112-11 | DoS | very long token string | low | accept | See Accepted Risks Log | closed |
| T-112-12 | Information disclosure | token text in logs or messages | low | mitigate | `em-token-validity.ts` has no logging; `extension.ts:778` error text never interpolates the token (asserted in `test/em-login-username.test.ts`) | closed |
| T-112-13 | Information disclosure | password or token written to plain storage | high | mitigate | Only `username` passed: `extension.ts:783` `rememberEmUsername(context.globalState, username)`, `BbjEMLoginAction.java:194` `USERNAME_MEMORY.remember(username)`; VS Code test + `EmLoginUsernameMemorySourceGuardTest` | closed |
| T-112-14 | Tampering | remembering a name after failed/cancelled login | medium | mitigate | Remember call sits directly after the token store in the success path (`extension.ts:782-783`, `BbjEMLoginAction.java:184-194`); failure/cancel tests assert no write | closed |
| T-112-15 | Information disclosure | remembered username in plain storage | low | accept | See Accepted Risks Log | closed |
| T-112-16 | Spoofing | tampered stored value pre-filled into the prompt | low | accept | See Accepted Risks Log | closed |
| T-112-17 | Spoofing / EoP | `runWeb` legacy settings fallback | medium | mitigate | Removed: `src/Commands/Commands.cjs:78-96` no credentials → error, no spawn; credentials only from the caller; execution test with legacy settings present | closed |
| T-112-18 | Information disclosure | token/password on argv or in the debug log | medium | mitigate | `src/Commands/process-args.ts:50-52` secrets travel as `BBJ_EM_*` in `argv.env`; debug line uses `formatArgvForLog(argv, [token, password])` (`Commands.cjs:137`); execution tests assert both | closed |
| T-112-19 | Repudiation | failed web.bbj run unseen in VS Code | low | mitigate | `Commands.cjs:143-145` "Failed to run" message on spawn error; execution test drives the callback | closed |
| T-112-20 | Tampering | module hooks leaking into production | low | mitigate | Harness under `test/`; esbuild entry points are only `src/extension.ts`, `src/language/main.ts`; hooks rewrite only `vscode` and Commands.cjs's own `./process-runner` (`test/commands-cjs-harness.ts:157-160`), `.ts` fallback scoped to Commands.cjs's require tree (review fix WR-02) | closed |
| T-112-21 | Tampering (test integrity) | fakes reimplementing Commands.cjs logic | low | mitigate | Fakes are `vi.fn` stand-ins; real `formatArgvForLog` and config-path cache used (`test/commands-cjs-harness.ts:31`) | closed |
| T-112-SC | Tampering | package installs | low | accept | See Accepted Risks Log | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-112-01 | T-112-02 | Matches a fresh BBj install's default, fires only when the user explicitly names `admin` with an empty password, and EM still decides (CONTEXT D-05) | user (D-05) | 2026-09-27 |
| AR-112-02 | T-112-05 | `ERRMES(-1)` is shown only to the local user who started the run; EM exception texts do not carry the password or token | plan 112-01 | 2026-09-27 |
| AR-112-03 | T-112-11 | The exp regex has no nested quantifiers (linear time) and the token comes from the user's own SecretStorage | plan 112-02 | 2026-09-27 |
| AR-112-04 | T-112-15 | The username is not secret (CONTEXT D-08) | user (D-08) | 2026-09-27 |
| AR-112-05 | T-112-16 | The stored value is only an editable suggestion; authentication still needs the password; blank or non-string values fall back to `admin` | plan 112-03 | 2026-09-27 |
| AR-112-06 | T-112-SC | No package is installed (`node:module` is a Node built-in) | plans 112-01..04 | 2026-09-27 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-27 | 22 | 22 | 0 | orchestrator (ASVS L1 grep-depth; auditor skipped per short-circuit rule, register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-27
