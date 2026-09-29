---
phase: "110"
slug: "workspace-settings-filesystem-trust"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-26"
---

# Phase 110 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| workspace `.vscode/settings.json` / IntelliJ settings → language server | `bbj.interop.host`/`port` arrive as untyped JSON through initialization options and configuration pushes |
| language server → java-interop socket | the validated host/port choose which peer the server connects to |
| rejected value → output channel | the warning echoes a value the workspace controls |
| BBj source text → USE path resolution | a program (possibly from an untrusted repository) chooses the `::path::` text, including `..` segments and absolute paths |
| PREFIX configuration → file reads | the configured PREFIX roots are the intended read sandbox for USE resolution |
| workspace filesystem → extension host probes | a repository can place a symlink, directory or FIFO at a path the decompile flow probes (`<input>` or `<input>.lst`) |
| user / machine settings → spawned executable | `bbj.formatter.javaPath` chooses the binary; machine scope keeps a workspace from setting it |
| process PATH → spawned executable | with the setting empty, the first `java` on PATH is launched on every format-on-save |
| error text → UI | the refusal toast echoes the configured or found path |
| workspace `.vscode/settings.json` → VS Code client | a cloned repository controls workspace-scoped `bbj.*` values |
| VS Code client → language server | `initializationOptions`, the `didChangeConfiguration` push and `workspace/configuration` answers carry `configPath` |
| client cache → run commands | `getActiveConfigPath()` feeds the config path passed to BBj run commands (Commands.cjs) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-110-01 | Tampering | `setConnectionConfig` (both entry points) | medium | mitigate | `validateInteropConfig` rejects empty/non-string hosts and non-integer or out-of-range ports per field; the setter calls it itself so no caller bypasses it (Tasks 1-2). Evidence: interop-config.ts:94 validateInteropConfig; java-interop.ts:496 setter validates itself | closed |
| T-110-02 | Repudiation (log forging) | `formatInteropRejection` | low | mitigate | Strings are rendered with `JSON.stringify`, so a newline in a rejected host cannot forge a second log line. Evidence: interop-config.ts:113 JSON.stringify for string values | closed |
| T-110-03 | Denial of service | warning text | low | mitigate | The rendered rejected value is capped at 100 characters. Evidence: interop-config.ts:43 MAX_RENDERED_VALUE_LENGTH = 100 | closed |
| T-110-04 | Spoofing | a well-formed host that points at an attacker's peer | medium | accept | Validation is about shape (issues #509, #510); a valid value the user configured is honoured by design. Data from the peer is bounded in Phase 111. | closed |
| T-110-SC | Tampering | package installs | low | accept | No package is installed. | closed |
| T-110-05 | Information disclosure | `addImportedBBjDocuments` readFile | high | mitigate | Only `containedPrefixCandidates` results are read; `..` escapes and outside absolute paths are never opened; the spy test asserts on recorded reads (Task 1). Evidence: bbj-document-builder.ts:1121/1231 read only containedPrefixCandidates | closed |
| T-110-06 | Elevation of privilege | `isExternalDocument()` sibling-prefix match | medium | mitigate | `isPathInside` compares on segments via `path.relative`; `/libs/foo2` is outside `/libs/foo` (Task 3). Evidence: path-containment.ts isPathInside via path.relative (segment-based) | closed |
| T-110-07 | Information disclosure | scope/validator resolving through an escaping candidate | low | mitigate | Scope, validator and revalidation use the same contained candidates (Task 2). Evidence: bbj-scope.ts:340, bbj-validator.ts:348 use containedPrefixCandidates | closed |
| T-110-08 | Tampering | a symlink inside a PREFIX root pointing elsewhere | low | accept | Containment is lexical by decision; the symlink is part of the user's own filesystem layout, and the threat addressed is `..`/absolute text in source. | closed |
| T-110-09 | Information disclosure | document-relative and workspace-root candidates | low | accept | They feed index lookups only and are outside the PREFIX requirement; they read no file. | closed |
| T-110-10 | Denial of service | `isTokenizedFile` opening a FIFO | medium | mitigate | lstat first, so a FIFO never reaches open; O_NONBLOCK where defined as a second layer (Task 1). Evidence: decompile-io.ts lstat + isFile() before open; O_NONBLOCK when defined | closed |
| T-110-11 | Information disclosure | a symlink at the probed path redirecting the read | medium | mitigate | lstat rejects symlinks in both probes; O_NOFOLLOW refuses a leaf symlink at open (Tasks 1-2). Evidence: decompile-io.ts lstat rejects symlinks; O_NOFOLLOW at open | closed |
| T-110-12 | Tampering | swap between lstat and open | low | mitigate | O_NOFOLLOW plus fstat().isFile() on the open handle (Task 1). Evidence: decompile-io.ts:42 fstat isFile() on the opened handle | closed |
| T-110-13 | Tampering | Windows has no O_NOFOLLOW/O_NONBLOCK | low | accept | lstat still rejects symlinks and non-regular files before open; the remaining swap window on Windows is accepted by decision. | closed |
| T-110-14 | Elevation of privilege | a workspace choosing the formatter binary | high | mitigate | `bbj.formatter.javaPath` is `scope: machine`, which a workspace settings file cannot set; a manifest test pins type, default and scope (Task 1). Evidence: package.json:434-438 bbj.formatter.javaPath scope "machine" | closed |
| T-110-15 | Spoofing | an unverified or relative `java` on PATH | medium | mitigate | The resolver walks PATH itself, skips relative entries, checks absolute/exists/regular file/executable, and spawns only the absolute path it returned (Tasks 1-2). Evidence: formatter-java-resolver.ts:88/143 isAbsolute checks, isExecutable probe, spawns resolved path | closed |
| T-110-16 | Tampering | an invalid setting silently replaced by PATH | medium | mitigate | A set value is never replaced; an invalid one cancels formatting with a named error (Task 1). Evidence: document-formatter.ts refusal rejects without spawn, no PATH fallback (UAT Test 1 confirmed) | closed |
| T-110-17 | Tampering | swap of the binary between check and spawn | low | accept | The path is under the user's control (machine setting or their PATH); the window is accepted, the check is about misconfiguration and PATH hijack. | closed |
| T-110-18 | Information disclosure | path echoed in the toast | low | accept | The path is the user's own configuration or PATH entry. | closed |
| T-110-19 | Tampering | `initializationOptions.configPath` and the client association fallback | high | mitigate | `effectiveConfigPath()` ignores workspace and folder values while untrusted; both handoffs call it (Task 1). Evidence: config-path-trust.ts:57 effectiveConfigPath; extension.ts:1117, config-path-cache.ts:58 | closed |
| T-110-20 | Tampering | the `configurationSection` push bypassing the gate through `next()` | high | mitigate | The middleware builds and sends the gated payload itself and never calls `next` for a section list; the pull hook substitutes too; a test drives the push through the real client wiring (Task 2). Evidence: config-path-trust.ts:135 middleware sends gated payload, next() only for undefined sections; pull hook substitutes | closed |
| T-110-21 | Elevation of privilege | widening what runs in Restricted Mode | medium | mitigate | No `capabilities`, `untrustedWorkspaces` or `restrictedConfigurations` change; an acceptance check pins package.json (Task 1). Evidence: package.json has no untrustedWorkspaces/restrictedConfigurations entries | closed |
| T-110-22 | Tampering | a host that reports no trust state | low | mitigate | `isTrusted !== true` is treated as untrusted (fail closed). Evidence: config-path-trust.ts:58 isTrusted !== true fails closed | closed |
| T-110-23 | Tampering | IntelliJ `configPath` handoff | medium | accept | IntelliJ has no Workspace Trust counterpart in scope; recorded decision. | closed |
| T-110-24 | Tampering | other workspace `bbj.*` values in the push (interop host/port) | low | transfer | Their shape is validated server-side by the shared interop validator; trust gating them is outside this phase. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-110-04 | Validation is about shape (issues #509, #510); a valid value the user configured is honoured by design. Data from the peer is bounded in Phase 111. | plan-time decision (110 PLAN threat model) | 2026-09-26 |
| AR-02 | T-110-SC | No package is installed. | plan-time decision (110 PLAN threat model) | 2026-09-26 |
| AR-03 | T-110-08 | Containment is lexical by decision; the symlink is part of the user's own filesystem layout, and the threat addressed is `..`/absolute text in source. | plan-time decision (110 PLAN threat model) | 2026-09-26 |
| AR-04 | T-110-09 | They feed index lookups only and are outside the PREFIX requirement; they read no file. | plan-time decision (110 PLAN threat model) | 2026-09-26 |
| AR-05 | T-110-13 | lstat still rejects symlinks and non-regular files before open; the remaining swap window on Windows is accepted by decision. | plan-time decision (110 PLAN threat model) | 2026-09-26 |
| AR-06 | T-110-17 | The path is under the user's control (machine setting or their PATH); the window is accepted, the check is about misconfiguration and PATH hijack. | plan-time decision (110 PLAN threat model) | 2026-09-26 |
| AR-07 | T-110-18 | The path is the user's own configuration or PATH entry. | plan-time decision (110 PLAN threat model) | 2026-09-26 |
| AR-08 | T-110-23 | IntelliJ has no Workspace Trust counterpart in scope; recorded decision. | plan-time decision (110 PLAN threat model) | 2026-09-26 |
| AR-09 | T-110-24 | Their shape is validated server-side by the shared interop validator; trust gating them is outside this phase. | plan-time decision (110 PLAN threat model) | 2026-09-26 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-26 | 25 | 25 | 0 | orchestrator (L1 grep-depth short-circuit: register authored at plan time, ASVS 1, threats_open 0) |

Note: UAT gap G-110-1 (formatter no-op) is a pre-existing crash in the vendored formatter jar under `--single-line-if`, not a phase 110 threat; it is tracked outside this phase.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-26
