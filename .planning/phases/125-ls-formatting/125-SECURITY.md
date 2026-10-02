---
phase: "125"
slug: "ls-formatting"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-02"
---

# Phase 125 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| client settings -> language server | `bbj.formatter.*` from user and workspace settings, possibly from an opened repository | formatter style values (no secrets) |
| client -> formatting handler | request uri, range and options | untrusted request input |
| language server -> bbj-ls | open-buffer text over the loopback interop connection | source code |
| bbj-ls answer -> editor | formatted text and range edits, validated by the interop client | edits applied to the user's buffer |
| bbj-ls error data -> user-visible text | setting names and messages from the peer | sanitised plain text |
| server -> VS Code client | `bbj/openFormatterSettings` notification and showDocument requests | setting names; the request's own uri |
| language server -> IntelliJ client | LSP4IJ formatting requests once the server advertises formatting | edits (blocked by the switch) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-125-01 | Tampering | `normalizeFormatterSettings` | medium | mitigate | known keys only, built fresh — `bbj-format-settings.ts` | closed |
| T-125-02 | Information disclosure | `bbj.formatter.javaPath` | low | mitigate | never copied; absence asserted in `bbj-format-settings.test.ts` | closed |
| T-125-03 | Tampering | prototype keys in parsed settings | medium | mitigate | own-property reads; `__proto__` test in `bbj-format-settings.test.ts` | closed |
| T-125-04 | Tampering | `minimalLineEdit` corrupting text outside the change | high | mitigate | positions via `positionAt` in `bbj-format-edit.ts`; seeded round-trip test over terminators and astral characters | closed |
| T-125-05 | Denial of service | edit computation on a large file | low | mitigate | linear prefix/suffix line trim (`bbj-format-edit.ts` while-loops) | closed |
| T-125-06 | Tampering | unevaluated LSP formatting edits in IntelliJ | high | mitigate | four gates behind `LSP_FORMATTING_ENABLED` in `BbjLanguageServerFactory.java`; `BbjLspFormattingSwitchTest` + `Lsp4ijOverrideSiteSourceGuardTest`; UAT test 5 | closed |
| T-125-07 | Denial of service | unhandled server notification in IntelliJ | low | accept | see Accepted Risks | closed |
| T-125-08 | Tampering | LSP4IJ upgrade changing the formatting gate | medium | mitigate | `Lsp4ijCouplingCanaryTest` pins marker and signatures | closed |
| T-125-09 | Information disclosure | handler loading a client-supplied uri from disk | medium | mitigate | open-buffer lookup only; source guard in `bbj-formatting-handler.test.ts` | closed |
| T-125-10 | Information disclosure | config or non-BBj text sent to bbj-ls | medium | mitigate | language-id allow-list in handler and service; zero-call tests; UAT test 3 (.bbx untouched) | closed |
| T-125-11 | Tampering | stale edit overwriting newer typing | high | mitigate | version captured and re-read in `bbj-format-service.ts`; stale/close tests | closed |
| T-125-12 | Denial of service | format-on-save waiting on workspace load | high | mitigate | no workspace wait in handler; never-settling ready test in `bbj-formatting-handler.test.ts` | closed |
| T-125-13 | Tampering | peer range edit outside document or request | medium | mitigate | interop guard geometry checks; `offsetAt`/`positionAt` recomputation | closed |
| T-125-14 | Information disclosure | document text in logs | medium | mitigate | fixed tokens only; marker tests at every logger level | closed |
| T-125-15 | Tampering | silent denumbering | high | mitigate | denumber permission never set; recorded-params assertion in `bbj-format-service.test.ts` | closed |
| T-125-16 | Spoofing | peer names and messages in toasts | medium | mitigate | interop-client sanitising; plain text; at most five listed (`bbj-notifications.ts`) | closed |
| T-125-17 | Tampering | showDocument steered elsewhere | high | mitigate | request's own uri, line clamped at click time; uri-shaped peer data test | closed |
| T-125-18 | Tampering | notification payload used as a command argument | medium | mitigate | contract in `format-settings-notification.ts`; `FORMATTER_SETTINGS_QUERY` fixed constant | closed |
| T-125-19 | Denial of service | toast on every save | medium | mitigate | dedup ledger bounded at 256, oldest-first | closed |
| T-125-20 | Denial of service | save held by an unanswered prompt | high | mitigate | prompts never awaited; never-settling prompt test | closed |
| T-125-21 | Information disclosure | document text in toasts or logs | medium | mitigate | fixed texts + sanitised peer messages; marker tests | closed |
| T-125-22 | Tampering | formatter values from an untrusted workspace | low | accept | see Accepted Risks | closed |
| T-125-23 | Tampering | malformed formatter push | low | mitigate | normalizer falls back to defaults; `bbj-format-settings-intake.test.ts` | closed |
| T-125-24 | Information disclosure | initialization options logged at debug | low | accept | see Accepted Risks | closed |
| T-125-25 | Tampering | two BBj formatters racing on one buffer | high | mitigate | client provider removed from `extension.ts`; activation tests assert the API is never called; UAT test 1 | closed |
| T-125-26 | Tampering | notification payload turned into a client command | medium | mitigate | `extension.ts:613-614` ignores the payload and opens `FORMATTER_SETTINGS_QUERY`; hostile-payload test | closed |
| T-125-27 | Denial of service | Langium default formatting handler still answering | high | mitigate | bounded handler registered after `startLanguageServer` in `main.ts`; source-order guard and capability test | closed |
| T-125-28 | Denial of service | wedged peer holding one format-on-save | medium | accept | see Accepted Risks | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-125-01 | T-125-07 | LSP4J logs one WARNING and returns; the notification cannot be produced while the IntelliJ switch is off | plan 125-02 | 2026-10-02 |
| AR-125-02 | T-125-22 | effect limited to formatting style; values whitelisted by key and validated by bbj-ls, which reports an invalid one by name | plan 125-05 | 2026-10-02 |
| AR-125-03 | T-125-24 | the existing debug log already prints every initialization option; formatter values hold no secrets and javaPath is never forwarded (also noted as review IN-05) | plan 125-05 | 2026-10-02 |
| AR-125-04 | T-125-28 | bounded by the interop client's 15 s deadline and VS Code's own cancellation; latched or cooled-down connections answer at once | plan 125-06 | 2026-10-02 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-02 | 28 | 28 | 0 | secure-phase orchestrator (ASVS L1, grep-depth; plan-time register, auditor skipped by short-circuit rule) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-02
