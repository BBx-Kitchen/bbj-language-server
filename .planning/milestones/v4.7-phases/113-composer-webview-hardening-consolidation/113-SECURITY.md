---
phase: "113"
slug: "composer-webview-hardening-consolidation"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-27"
---

# Phase 113 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| webview script → extension host | postMessage payloads from the sandboxed composer page reach a Node process that applies WorkspaceEdits and sends language-server requests | untrusted structured messages |
| composer form field → generated BBj source | The assign-to text is interpolated into a statement written into the user's file | user-typed identifier text |
| language server → IntelliJ dialog | Preview JSON (statement, per-field errors, valid) crosses LSP4IJ into Swing | server-generated strings and flags |
| extension host → webview HTML | The CSP decides which scripts and styles the composer page may run | CSP string and per-render nonce |
| extension bundle → language-server bundle | The LS process has no `vscode` module; a runtime `vscode` import in `main.cjs` would crash it | module graph |
| document text → composer edit ranges | Scanner / locator decide which span of the user's line a composer rewrites | source text offsets |
| test harness → module under test | A mock at the wrong layer would let untested paths report green | test doubles |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-113-01 | Tampering | new TEST-10 files | medium | mitigate | Exactly one `vi.mock(` in each of `addwindow-/addchildwindow-/setopts-composer-ui.test.ts` | closed |
| T-113-02 | Repudiation | test determinism | low | mitigate | `beforeEach` resets in all three TEST-10 files (5/5/6 hooks); files green at `--maxWorkers=2` | closed |
| T-113-03 | Tampering | six `*-webview.ts` message handlers | high | mitigate | `if (!is…PanelMessage(msg)) return;` is the first statement of every `registerPanelMessageHandler` callback (all six webviews); `composer-webview-message-shape.test.ts` posts malformed messages to each | closed |
| T-113-04 | Elevation of Privilege | `setopts-tristate-webview.ts` sender | high | mitigate | Guard precedes `compose()`; test asserts `sender` / `senderMock` `not.toHaveBeenCalled()` | closed |
| T-113-05 | Denial of Service | extension host handler | medium | mitigate | `{}` payload dropped by guard before `build()`; covered by the message-shape suite | closed |
| T-113-06 | Information Disclosure | dropped messages | low | mitigate | Silent drop; suite spies `console.log`/`console.warn` and the three `show*Message` mocks | closed |
| T-113-07 | Tampering | `MsgboxComposerDialog` / `CvsComposerDialog` OK gating | medium | mitigate | `setOKActionEnabled(p.valid)` in both dialogs; `ComposerDialogRefreshSourceGuardTest` pins it; UAT test 2 passed | closed |
| T-113-08 | Spoofing | assignToError label text | low | accept | See Accepted Risks Log AR-113-01 | closed |
| T-113-09 | Repudiation | divergent verdicts between IDEs | medium | mitigate | Dialogs only render `p.assignToError` from the server; no client-side rule | closed |
| T-113-10 | Tampering | `msgboxPreview` / `cvsPreview` statement composition | high | mitigate | `validateAssignTo` (`msgbox-composer.ts:340`) accepts only identifier + allowed sigil + balanced, re-validated subscript; `composer-assign-to.test.ts` green; VS Code insert refuses invalid preview | closed |
| T-113-11 | Repudiation | divergent host verdicts | medium | mitigate | `validateAssignTo` is called only from `msgboxPreview` and `cvsPreview` | closed |
| T-113-12 | Denial of Service | hidden field made required | medium | mitigate | Validation gated on `assignToShown`; edit and completing modes covered in `composer-assign-to.test.ts` | closed |
| T-113-13 | Denial of Service | `out/language/main.cjs` | medium | mitigate | Rebuilt bundle has zero `require("vscode")` | closed |
| T-113-14 | Repudiation | IntelliJ request contract | low | mitigate | `ComposerRequestContractTest` present and path-updated | closed |
| T-113-15 | Tampering | `findCvsCalls` | medium | mitigate | `notAfterIdentifierOrDot` lookbehind in `composer-call-scanner.ts:80`, opted into by CVS only; boundary tests green | closed |
| T-113-16 | Tampering | `scanArgs` / `trimmedRange` ranges | medium | mitigate | `composer-call-scanner.test.ts` literal ranges plus unchanged composer suites green | closed |
| T-113-17 | Tampering | webview CSP (script execution) | high | mitigate | `buildComposerCsp` is the single source; `webview-csp.test.ts` pins the exact CSP per panel, nonce match, and one-place check | closed |
| T-113-18 | Spoofing | nonce reuse | medium | mitigate | Per-call `getNonce()`; test asserts two calls differ | closed |
| T-113-19 | Denial of Service | `out/language/main.cjs` | medium | mitigate | `window-composer-ui.ts` imports only `./addwindow-composer.js`; bundle has zero `require("vscode")` | closed |
| T-113-20 | Tampering | preserved flag / event bits | medium | mitigate | TEST-10 files pin literal preserved bits and ranges; green | closed |
| T-113-21 | Tampering | addChildWindow no-title overloads | low | mitigate | `requireFlagsSlot` refusal at `window-composer-ui.ts:87`, set for addChildWindow only | closed |
| T-113-SC | Tampering | package installs | low | accept | See Accepted Risks Log AR-113-02 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-113-01 | T-113-08 | The label text is one of three fixed language-server strings, never an echo of user input, so Swing HTML label rendering is unreachable from user text | plan 113-03 threat model | 2026-09-27 |
| AR-113-02 | T-113-SC | No dependency added, upgraded or removed: `package.json`, `package-lock.json`, `build.gradle.kts` and `libs.versions.toml` are unchanged across the phase | plans 113-01..08 threat models | 2026-09-27 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-27 | 22 | 22 | 0 | orchestrator (L1 grep-depth; auditor short-circuited: register authored at plan time, ASVS 1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-27
