---
phase: "120"
slug: "classvalidator-activate-splits"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-29"
---

# Phase 120 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| BBj source text → Langium validator | Untrusted workspace files reach the relocated class checks | BBj source (untrusted) |
| class declarations across files → visibility check | PROTECTED/PRIVATE classes must stay invisible across directories/files | class visibility metadata |
| opened files → prompt detection | Prompts read the first bytes and text of files the user opens | file contents (untrusted) |
| package.json contributions → command palette | A contributed command with no registration fails at run time | command ids |
| VS Code SecretStorage → extension host | EM token (formerly also a legacy stored credential) is read here | EM JWT (secret) |
| extension host → bbj child process | Username, password and token cross on the child's environment | credentials (secret) |
| shared temp directory → EM output file | Guessable os.tmpdir() path receives the JWT from em-login.bbj | EM JWT (secret) |
| debug output channel → user-visible log | Invocations logged when bbj.debug is on | argv (secrets redacted) |
| language server notifications → status bars | BBjCPL and config-reload handlers act on server-pushed payloads | notification payloads |
| branch commits → GitHub issues on squash merge | Closing keywords in commit bodies close issues on merge | commit messages |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-120-01 | Denial of Service | checkCyclicInheritance / bbjSupertypesReach | medium | mitigate | `check-cyclic-inheritance.ts:11-17` visited set + `MAX_INHERITANCE_DEPTH = 20`; `class-types.ts:25-32` visited set; bodies identical to base; inheritance-cycle-validation.test.ts unchanged, passing | closed |
| T-120-02 | Information Disclosure | checkBBjClass PROTECTED/PRIVATE visibility | low | mitigate | `check-class-reference.ts:15-21, 82-99` match base; review fix 4934de34 only braces the PROTECTED case (break inside block, no fall-through); class-validations-issues.test.ts:71-82, classes.test.ts:54-55 pass | closed |
| T-120-03 | Tampering | registerClassChecks order / thisArg | low | mitigate | 13 check calls in `check-classes.ts:21-84` in base order; no `this.` in modules; bbj-validator.ts unchanged since base | closed |
| T-120-04 | Denial of Service | contributed command left unregistered | medium | mitigate | activation-command-coverage.test.ts:216-330 — missing/unlisted ids fail; allow-list checked against package.json and module sources | closed |
| T-120-05 | Tampering | activation order | low | mitigate | 39-entry EXPECTED_SEQUENCE + 32 subscriptions pinned (activation-command-coverage.test.ts:236-335), authored against unsplit extension.ts | closed |
| T-120-06 | Information Disclosure | test temp files | low | accept | mkdtemp under os.tmpdir(), dummy contents only, rmSync in afterAll (activation-prompts-and-status-bars.test.ts:222-301) | closed |
| T-120-07 | Information Disclosure | EM debug log lines in em-auth.ts | high | mitigate | `em-auth.ts:77` `formatArgvForLog(argv, [token])`, `:178` `[password]`; formatArgvForLog never renders env; appendLine guards scan em-auth.ts (em-secret-env-channel.test.ts:342, 354) | closed |
| T-120-08 | Tampering | EM output file at guessable temp path | high | mitigate | `em-script-runner.ts:35` createOwnerOnlyFile (O_CREAT\|O_EXCL, 0o600), unlink in finally `:53-56`; creation precedes launch in em-auth.ts; em-script-runner.test.ts covers mode, EEXIST, and removal on every exit path | closed |
| T-120-18 | Information Disclosure | EM error messages after the move | medium | mitigate | try boundaries identical to base (em-auth.ts:48-90, 161-210); em-auth-error-paths.test.ts pins messages; em-login-username.test.ts:297-300 asserts no token in message | closed |
| T-120-09 | Tampering (CWE-78) | EM script process launch | high | mitigate | runner launches only via runProcess → confineBbjExecutable → execFile (process-runner.ts:33-57); no-shell guards cover em-auth.ts + em-script-runner.ts; child_process importers exactly 3 files | closed |
| T-120-10 | Information Disclosure | secrets on argv vs environment | medium | mitigate | builders put secrets only in env (process-args.ts:250-285, unchanged); runner spreads argv.env over process.env (em-script-runner.test.ts:113-130) | closed |
| T-120-11 | Spoofing | unvalidated legacy stored credential | medium | mitigate | no `bbj.em.credentials` / JSON.parse left; getEMCredentials (em-auth.ts:25-40) returns only the expiry-checked token; BUI/DWC go through ensureValidToken; no new secret deletions | closed |
| T-120-12 | Denial of Service | hung EM script | low | mitigate | timeouts 10000/15000 ms (em-auth.ts:83, 186) forwarded by runner; em-script-runner.test.ts:132-143 | closed |
| T-120-13 | Denial of Service | readLeadingBytes in open-file-prompts.ts | low | mitigate | `open-file-prompts.ts:21-33` identical to base; 7-byte read, handle closed in finally | closed |
| T-120-14 | Tampering | config-reload restart path | medium | mitigate | CONFIG_RELOAD handler stays in extension.ts, restart only via `restartGate?.request`; config-reload-host.test.ts:562-599 unchanged, passing | closed |
| T-120-15 | Denial of Service | command/listener lost in the split | medium | mitigate | activate() (extension.ts:458-498) has 0 direct registrations (comment-stripped); coverage test passes unedited | closed |
| T-120-16 | Tampering (CWE-78) | new host modules launching processes | medium | mitigate | no-shell-command-construction.test.ts HOST_TS_FILES covers all four new host modules; 0 exec/spawn/shell matches; importer set exactly 3 | closed |
| T-120-17 | Repudiation | commit bodies on the milestone branch | low | mitigate | `git log --format=%B a2d08e25..HEAD` (25 commits incl. review fix + UAT): no closing keyword before `#N`; Closes lines only in 120-04-SUMMARY.md | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-120-01 | T-120-06 | Test temp files hold only magic bytes, numbered lines or a trivial print statement; they live in a mkdtemp directory under os.tmpdir() and are removed in afterAll | plan 120-02 threat model (disposition: accept) | 2026-09-29 |

*Accepted risks do not resurface in future audit runs.*

### Informational notes (non-blocking)

- The one-off activate-shape shell check in plan 04 false-positives on a comment inside activate() (extension.ts:475); the comment-stripped re-check finds 0 registrations. The lasting guard is the pinned sequence in activation-command-coverage.test.ts.
- T-120-08 residual (declared in the threat model): a throw between file creation and launch leaves an empty 0o600 file in os.tmpdir(), same as base; it holds no secret.
- em-script-runner.test.ts:142 (`not.toHaveProperty('shell', true)`) would not catch a string shell value, and the appendLine guard checks that formatArgvForLog is used but not its secret list. The source itself is correct in both cases.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-29 | 18 | 18 | 0 | gsd-security-auditor (opus), ASVS L1; 11 pinning suites run: 168 passed, 1 skipped (Windows-only) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-29
