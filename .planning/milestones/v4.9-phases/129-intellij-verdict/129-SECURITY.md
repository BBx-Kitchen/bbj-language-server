---
phase: "129"
slug: "intellij-verdict"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-04"
---

# Phase 129 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| BbjSettings.xml -> initializationOptions | Hand-editable application config becomes interop and formatter wire values | host, port, 15 formatter values; not sensitive |
| Settings UI -> BbjSettings.State -> initializationOptions.formatter | User input becomes wire values | formatter values; not sensitive |
| Language server -> IntelliJ client (`bbj/openFormatterSettings`) | Server-sent keys array is untrusted | key names; ignored by the client |
| 129-VERDICT.md -> shipped switch -> plugin zip -> marketplaces | The switch must follow the user's recorded verdict | build constant |
| Evaluation sandbox / user's Windows machine -> repository | Raw logs carry paths and a Windows user name | logs; personal data (user name) |
| Issue drafts -> public upstream tracker | Drafts may be published as written | repro text |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-129-01 | Tampering | interop host/port from hand-edited BbjSettings.xml | low | accept | See Accepted Risks Log | closed |
| T-129-02 | Spoofing | non-default interop host after the key rename | low | mitigate | Only the configured or auto-detected value is sent (`interopHost`/`interopPort`); `InteropInitOptionsContractTest` green; change recorded in the todo resolution | closed |
| T-129-03 | Repudiation | planning identifiers in shipped source/tests | low | mitigate | Register scan over the phase's main sources clean (129-VERIFICATION.md) | closed |
| T-129-04 | Tampering | hand-edited `formatter*` values | medium | mitigate | `FormatterInitOptions.normalizeChoice` (l.198), `normalizeIndentWidth` (l.176); `FormatterInitOptionsTest` 10/10 green | closed |
| T-129-05 | Denial of service | every format failing on one bad value | medium | mitigate | Same normalization in `toJson`; JSON-null/type tests green | closed |
| T-129-06 | Information disclosure | formatter values in logs | low | accept | See Accepted Risks Log | closed |
| T-129-07 | Tampering | seam shipping on a disabled verdict | medium | mitigate | Not applicable: verdict is `supported`, the seam ships intentionally | closed |
| T-129-08 | Tampering | evaluation-only switch flip committed | high | mitigate | Shipped `true` is the user's verdict (`129-VERDICT.md`: `verdict: supported`, `decided_by: user`), not the evaluation flip; working tree has no source changes | closed |
| T-129-09 | Tampering | BBj installation config.bbx touched | medium | mitigate | Corpus used a copy in `/home/coder/tinybbj` (129-03-SUMMARY threat flags) | closed |
| T-129-10 | Elevation of privilege | node wrapper as Node.js path | low | mitigate | Seed only in sandbox config; no `BbjSettings.xml` with the seed remains on the host | closed |
| T-129-11 | Information disclosure | raw idea.log, wire captures, screenshots | medium | mitigate | `tmp/129-eval` is git-ignored; `git ls-files -- tmp` is empty | closed |
| T-129-12 | Repudiation | made-up evidence | medium | mitigate | Excerpts spot-checked against `tmp/129-eval/linux/*` by the verifier (129-VERIFICATION.md truth 1) | closed |
| T-129-13 | Tampering | evaluation flip left in working tree | high | mitigate | `git status` shows no `bbj-intellij`/`bbj-vscode` changes | closed |
| T-129-14 | Information disclosure | Windows idea.log/trace in repository | high | mitigate | Files under git-ignored `tmp/129-eval/windows/`; none tracked | closed |
| T-129-15 | Elevation of privilege | sandbox Node.js seed outliving evaluation | low | mitigate | No seeded sandbox `BbjSettings.xml` found on the host | closed |
| T-129-16 | Repudiation | Windows run on a different build than the evaluated zip | medium | mitigate | Partly mitigated: the IDE build line was recorded, but the `Get-FileHash` match was skipped (checklist Step 0 and UAT test 5) | open — below high threshold (non-blocking) |
| T-129-17 | Elevation of privilege | verdict chosen by auto-mode | high | mitigate | `129-VERDICT.md`: `decided_by: user`, verbatim answer, `override: true` | closed |
| T-129-18 | Repudiation | blocker omitted or downgraded | medium | mitigate | `129-EVALUATION.md` has `## Known issues` (l.1130) and `## Blockers` (l.1158); C6b reclassification recorded with the user's answer | closed |
| T-129-19 | Information disclosure | Windows user name/home path in phase documents | high | mitigate | Only placeholder paths `C:\Users\<name>` / `C:\Users\<user>` in the phase directory | closed |
| T-129-20 | Information disclosure | proprietary BBj source in upstream draft | medium | mitigate | `129-LSP4IJ-ISSUE-crlf-newtext.md` uses a synthetic three-line document and platform frames only | closed |
| T-129-21 | Tampering | `openFormatterSettings` payload turned into path/command/link | high | mitigate | Parameter `Object ignoredKeys`, referenced once; no BrowserUtil/Paths/VirtualFile/ActionManager in `BbjLanguageClient.java`; opens fixed `BbjSettingsConfigurable`; `BbjLanguageClientOpenFormatterSettingsTest` 5/5 green | closed |
| T-129-22 | Denial of service | handler on disposed project / blocking EDT | low | mitigate | `isDisposed()` checks and `invokeLater`; repeated requests coalesced (`openFormatterSettingsPending`) | closed |
| T-129-23 | Elevation of privilege | switch flipped without user verdict | high | mitigate | Source and packaged constant match `verdict: supported` | closed |
| T-129-24 | Repudiation | planning identifiers in Javadoc | low | mitigate | Register scan clean | closed |
| T-129-25 | Tampering | control producing a value bbj-ls rejects | medium | mitigate | Bounded spinner, combos over allowed values, `writeToState` normalizes; `BbjSettingsFormatterSourceGuardTest` green | closed |
| T-129-26 | Tampering | hand-edited XML showing bogus value / permanently modified page | low | mitigate | `isModified()` (l.61) and `reset()` (l.183) use `FormatterInitOptions.fromState`; UAT test 4 passed | closed |
| T-129-27 | Denial of service | restart storm on Apply | low | accept | See Accepted Risks Log | closed |
| T-129-28 | Information disclosure | tooltip HTML injection | low | mitigate | `FormatterSettingTexts.java:116` escapes `&`, `<`, `>` | closed |
| T-129-29 | Tampering | partial revert of the seam | medium | mitigate | Not applicable: no revert on a `supported` verdict (129-08-SUMMARY) | closed |
| T-129-30 | Tampering | fence tests weakened while editing Javadoc | medium | mitigate | Fence tests (`Lsp4ijOverrideSiteSourceGuardTest`, `BbjLspFormattingSwitchTest`, `Lsp4ijCouplingCanaryTest`) green in the forced run | closed |
| T-129-31 | Repudiation | planning identifiers in Javadoc | low | mitigate | Register scan clean | closed |
| T-129-32 | Information disclosure | issue drafts carrying Windows user name | low | mitigate | Same check as T-129-19 | closed |
| T-129-33 | Tampering | packaged switch differs from verdict | high | mitigate | `javap` on the zip under test (sha256 `b962be39…`): `LSP_FORMATTING_ENABLED` `ConstantValue: int 1`; `openFormatterSettings` present | closed |
| T-129-34 | Tampering | stale language server in the zip | medium | mitigate | Bundled `main.cjs` byte-identical to `bbj-vscode/out/language/main.cjs` (`cmp`, 2026-10-04) | closed |
| T-129-35 | Repudiation | planning identifiers in shipped source | low | mitigate | Register scan clean | closed |
| T-129-36 | Information disclosure | raw logs / Windows user name in git | high | mitigate | `git ls-files -- tmp` empty; placeholder paths only | closed |
| T-129-37 | Tampering | scope creep outside `bbj-intellij/` | low | mitigate | Phase diff touches only `bbj-intellij/` and `.planning/` | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-129-01 | T-129-01 | Same trust level as VS Code's `bbj.interop.*` settings; the user owns the file; the server validates host and port | plan-time disposition (129-01-PLAN) | 2026-10-04 |
| AR-129-02 | T-129-06 | Formatting preferences are not sensitive; the server logs `formatter: '[omitted]'` | plan-time disposition (129-02-PLAN) | 2026-10-04 |
| AR-129-03 | T-129-27 | Existing debounced `scheduleRestart()` reused unchanged | plan-time disposition (129-07-PLAN) | 2026-10-04 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-04 | 37 | 36 | 1 (T-129-16, medium, non-blocking) | orchestrator, ASVS L1 grep-depth |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-04
