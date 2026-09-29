---
phase: "111"
slug: "java-class-data-from-the-interop-peer"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-27"
---

# Phase 111 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| java-interop / bbj-ls peer → language server | `getClassInfo` / `getClassInfos` JSON-RPC answers arrive as untyped JSON and are copied onto AST nodes by `resolveClass()` | class, member and parameter names, types, javadoc text (untrusted) |
| installed javadoc JSON files → language server | hover's fallback and Phase 2 of `resolveClass` read `docu` text and names from `bbjdir/documentation/javadoc/*.json` | documentation text with HTML and one trailing BASIS Docs link |
| peer / javadoc text → hover and completion Markdown | untrusted text is embedded in Markdown the client renders | link/image syntax, code fences, raw HTML |
| language server → VS Code / IntelliJ renderers | VS Code strips raw HTML (`supportHtml` off); IntelliJ/LSP4IJ shows it literally (confirmed in UAT 2026-09-27) | rendered Markdown |
| peer class names → TextEdit | quick fix and auto-import completion turn candidate names into `use` lines in the user's document | source text |
| linker / type inferer → diagnostic list | the validator decides which diagnostics survive the hierarchy | diagnostics |
| language server → output channel | log lines about adjusted peer data and dropped candidates | class names, field paths, counts (never rejected values) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-111-01 | Denial of service | `resolveClass` member/identifier strings | medium | mitigate | `sanitizeJavaClassDto` (java-peer-guard.ts), called from java-interop.ts, drops members with over-long names/types | closed |
| T-111-02 | Tampering | `resolveClass` / `loadImplicitImports` with wrongly typed DTOs | medium | mitigate | class-name check before `canonicalJavaClassName`, non-array lists defaulted, non-object entries dropped (java-interop.ts, java-peer-guard.ts) | closed |
| T-111-03 | Denial of service | Phase 2 `method.docu` and `realName` | medium | mitigate | `truncateText` at MAX_JAVADOC_LENGTH / MAX_JAVA_IDENTIFIER_LENGTH with visible marker | closed |
| T-111-04 | Repudiation (log forging / flooding) | adjustment log line | low | mitigate | one line per class, class and field paths only, rejected values never logged | closed |
| T-111-05 | Denial of service | very long member or parameter arrays | low | accept | see Accepted Risks (also carried as review WR-01) | closed |
| T-111-06 | Spoofing | well-formed but false class description | low | accept | see Accepted Risks | closed |
| T-111-07 | Denial of service | `processLinkingErrors` type inference | low | mitigate | inferer call wrapped in try/catch (bbj-document-validator.ts) | closed |
| T-111-08 | Tampering (diagnostic integrity) | `applyDiagnosticHierarchy` Rule 2 | low | mitigate | exemption needs linking-error code plus explicit flag; tests pin both directions | closed |
| T-111-09 | Information disclosure | unresolved-member message text | low | accept | see Accepted Risks | closed |
| T-111-10 | Spoofing (phishing link) | hover / completion Java documentation | medium | mitigate | `escapeMarkdown` / `escapeJavadocMarkdown` at the render boundary (bbj-hover.ts, bbj-completion-provider.ts) | closed |
| T-111-11 | Information disclosure (remote image / HTML load) | hover / completion Java documentation | medium | mitigate / accept | Markdown image/link syntax escaped; raw HTML left unescaped by user decision — VS Code strips it, IntelliJ/LSP4IJ shows it literally with no remote load (UAT 2026-09-27) | closed |
| T-111-12 | Tampering (code-fence break-out) | completion fenced signature | medium | mitigate | `toFenceSafeLine` removes backticks and line breaks | closed |
| T-111-13 | Denial of service | hover javadoc-file fallback | low | mitigate | fallback text truncated at MAX_JAVADOC_LENGTH before rendering | closed |
| T-111-14 | Spoofing | bare URL in javadoc auto-linked by the client | low | accept | see Accepted Risks | closed |
| T-111-15 | Tampering | signature help fence and completion snippet placeholders from peer parameter names | medium | transfer | out of locked scope; follow-up todo `.planning/todos/pending/2026-09-26-signature-help-and-snippet-peer-name-escaping.md` | closed |
| T-111-16 | Tampering (class-tree integrity) | `storeJavaClass` leaf step | low | mitigate | colliding class kept outside the tree; package stays reachable | closed |
| T-111-17 | Denial of service (needless requests) | `tryResolveJavaReference` | low | mitigate | known package name returns before any request | closed |
| T-111-18 | Repudiation (hidden faults) | resolveClass missing-container log | low | mitigate | console.error kept for any other missing container | closed |
| T-111-19 | Tampering | unregistered bare package name | low | accept | see Accepted Risks | closed |
| T-111-20 | Tampering (source injection) | quick fix and auto-import `use` edits | high | mitigate | `isJavaQualifiedName` gates both sites (bbj-code-action-provider.ts, bbj-completion-provider.ts) | closed |
| T-111-21 | Spoofing (hidden text) | Unicode format/control characters in a name | medium | mitigate | predicate excludes format and control characters | closed |
| T-111-22 | Repudiation (log forging) | dropped-candidate log | low | mitigate | debug line carries a count and the typed simple name only | closed |
| T-111-23 | Spoofing | homoglyph look-alike name | low | accept | see Accepted Risks | closed |
| T-111-24 | Denial of service (partial resolution) | `resolveClass` Phase 2 with no `parameters` key | medium | mitigate | `parameters ??= []` for methods and constructors in Phase 1 (java-interop.ts) | closed |
| T-111-25 | Denial of service (oversized hover) | hover fallback method/parameter names | low | mitigate | `boundedJavadocName` (bbj-hover.ts) | closed |
| T-111-26 | Tampering (wrong-typed javadoc entry) | hover fallback non-string name | low | mitigate | falls back to the node's already-bounded name | closed |
| T-111-27 | Spoofing (lookalike link) | `escapeJavadocMarkdown` allowlist | medium | mitigate | anchored `TRAILING_BASIS_DOCS_LINK_PATTERN` (java-peer-guard.ts): label `Docs`, `https`, host `documentation.basis.cloud/`, restricted path charset, whitespace lookbehind; 13 spoof tests | closed |
| T-111-28 | Tampering (partial or extra links) | `escapeJavadocMarkdown` on truncated / multi-link text | low | mitigate | only one trailing link exempt; truncated and earlier links stay escaped (tests) | closed |
| T-111-29 | Denial of service (regex) | `TRAILING_BASIS_DOCS_LINK_PATTERN` | low | mitigate | path class excludes `)` and whitespace; input bounded; measured ≤0.55 ms | closed |
| T-111-30 | Spoofing (page choice) | peer or tampered javadoc choosing the documentation.basis.cloud page | low | accept | see Accepted Risks | closed |
| T-111-SC | Tampering | package installs | low | accept | no package installed | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-111-01 | T-111-05 | The JSON-RPC answer is fully in memory before any guard runs, so an array-count cap would not reduce peak memory (review WR-01 keeps it visible). | plan 111-01 / 111-06 | 2026-09-26 |
| AR-111-02 | T-111-06 | Shape and length checks cannot detect a lying peer; which peer is trusted is configuration (host/port validated in Phase 110). | plan 111-01 | 2026-09-26 |
| AR-111-03 | T-111-09 | The message echoes the member name the user typed and the class's simple name, both already visible. | plan 111-02 | 2026-09-26 |
| AR-111-04 | T-111-11 (raw HTML part) | User decision: `<` not escaped; VS Code strips raw HTML, IntelliJ/LSP4IJ shows it literally, no remote load (UAT). | user | 2026-09-27 |
| AR-111-05 | T-111-14 | A bare URL's visible text equals its target and nothing loads automatically. | plan 111-03 | 2026-09-26 |
| AR-111-06 | T-111-19 | No collision or log line can occur for an unregistered package; the caller check covers the registered case behind #676. | plan 111-04 | 2026-09-26 |
| AR-111-07 | T-111-23 | Unicode letters are allowed by the locked rule; the full name is shown before the user accepts it. | plan 111-05 | 2026-09-26 |
| AR-111-08 | T-111-30 | The host is BASIS's own public documentation site, the link text is fixed to "Docs", and the target is visible on hover. | user (UAT gap) / plan 111-07 | 2026-09-27 |
| AR-111-09 | T-111-SC | No package is installed by this phase. | all plans | 2026-09-26 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-27 | 31 | 31 | 0 | orchestrator (L1 grep-depth short-circuit; register authored at plan time; mitigations cross-checked against 111-VERIFICATION.md 7/7 and 111-REVIEW.md) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-27
