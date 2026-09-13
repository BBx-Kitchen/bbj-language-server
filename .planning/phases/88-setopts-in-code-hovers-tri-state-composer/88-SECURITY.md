---
phase: "88"
slug: "setopts-in-code-hovers-tri-state-composer"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-13"
---

# Phase 88 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Editor → language server (`textDocument/hover`, `textDocument/codeAction`) | Arbitrary, possibly malformed `.bbj` source reaches the SETOPTS scanner and chain walk; the client blocks its UI thread on code actions | Untrusted source text — integrity / availability |
| Scanner chain walk → edit gating | `traceOptsChain`'s `safe` flag is the only thing between an undecidable shape and an offered rewrite | Safety verdict — integrity-critical |
| IDE client → language server custom requests (`bbj/composer/setopts/decodeInCode`, `composeTriState`) | Client-supplied `uri` / `line` / `character` and a tri-state selection; the reply drives a write into the open document | Position triple, selection — integrity |
| Language server → IntelliJ plugin (LSP4IJ Gson) | Server JSON is deserialized into Java DTOs; a renamed field or out-of-range number arrives as untrusted input | DTO payloads — integrity |
| Webview → VS Code extension host (`postMessage`) | Panel form state crosses from script context into the extension host | Selection payload — untrusted script input |
| Captured decode / edit range → live document at write time | The user or another writer may change the document while a composer is open | Line ranges / hex ranges — integrity-critical |
| Composer-generated text → user's `.bbj` file → live BBj runtime | Generated `IOR`/`AND` masks and literals are executed by BBj | Executable BBj text — integrity |
| Source tree → packaged VSIX / plugin zip → human-installed IDE | The artifact tested must be the artifact built | Build artifacts — evidence integrity |
| Human verdict → `88-UAT.md` → gap reconciliation | A recorded verdict is the sole authority for closing a live-IDE gap | Verdicts with build identity — evidence integrity |
| Test harness → spawned language-server process | Harness launches the installed bundle and speaks JSON-RPC over IPC | Fixture source, requests — availability |

---

## Threat Register

File key: scanner = `bbj-vscode/src/language/setopts-code-scanner.ts`; request = `bbj-vscode/src/language/setopts-in-code-request.ts`; catalog = `bbj-vscode/src/setopts-catalog.ts`; tristate-wv = `bbj-vscode/src/setopts-tristate-webview.ts`; composer-wv = `bbj-vscode/src/setopts-composer-webview.ts`; ui = `bbj-vscode/src/setopts-in-code-ui.ts`; guard = `bbj-vscode/src/setopts-stale-edit-guard.ts`; ca-handler = `bbj-vscode/src/language/bbj-code-action-handler.ts`; e2e = `bbj-vscode/test/functional/installed-extension-e2e.test.ts`; `*.test` = matching file under `bbj-vscode/test/`; Java classes under `bbj-intellij/src/{main,test}/java/com/basis/bbj/intellij/{composer,actions}/`. Line numbers are as of HEAD `b99ee879`.

Threat IDs were reused with different meanings across plans; such IDs carry their originating plan in parentheses.

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-88-01 (88-02/03/04/05/06/07) | Tampering | chain safe/unsafe classification and edit gate on server, IntelliJ, VS Code | high | mitigate | `walkChain` switch has no `default` (scanner:482-501); `indexed-target` verdicts at scanner:342, :369; every unsafe reason pinned (scanner.test:275-379); unsafe → `editable:false`, no `chain`/`initial` (request:254-261; request.test:118, :134); IntelliJ not-editable branch returns with a notice (ComposerLauncher:537-543; SetoptsInCodeSourceGuardTest:139-155; boundary null check ComposerModelsJsonBoundaryTest:653-654); VS Code ui:185-187, ui.test:424; phase-89 cue entry points route through the same gate | closed |
| T-88-02 (88-03/06) | Tampering | generated `IOR`/`AND` masks; composed block content | high | mitigate | Full-width bases `growTo(MAX_BYTES)` / `fill(0xff)` (catalog:402-418), asserted for every catalog bit (catalog.test:319-322); tri-state panel composes only via `composeTriState` (tristate-wv:105-109), no `setoptsPreview` | closed |
| T-88-03 (88-01/02/03) | Tampering | hex literal and mask literal parsing | medium | mitigate | Shape test + `parseVector` round-trip or `undefined` (scanner:184-198; catalog:134-135); unparseable mask → `unparseable-mask` (scanner:374-377); request layer reuses `shape.hexDigits` (request:249) with no re-parse | closed |
| T-88-04 (88-01/02/05) | Denial of Service | hover branch, backward sibling walk, per-keystroke preview | medium | mitigate | Per-request hover branch only (bbj-hover.ts:30, :43-47; listener guard scanner.test:670-681); walk bounded by the flat statement array (scanner:470-503) with hop ceiling (scanner:290-305), 300-statement preamble test (scanner.test:452-470); dialog uses the shared `PreviewDebouncer` at 300ms (SetoptsTriStateComposerDialog:88-91), no own `Alarm`/`Timer` (ComposerDialogRefreshSourceGuardTest:225-236) | closed |
| T-88-05 (88-04/05) | Tampering | `DecodeEquality.sameSetoptsInCode`; write against a changed document | high | mitigate | Field-wise comparator, `Arrays.equals` for `hexRange`, ordered entries (DecodeEquality:216-283); one mismatch test per field plus reorder (DecodeEqualityTest:553-578); both IntelliJ edit paths via `StaleEditGuard` + fresh `setoptsDecodeInCode` + `sameSetoptsInCode`, offsets read inside the write body (ComposerLauncher:584-602, :628-643) | closed |
| T-88-06 (88-01) | Information Disclosure | hover markdown | low | accept | See AR-88-01 | closed |
| T-88-07 (88-02) | Tampering | `AND`-mask "clear" rendering | high | mitigate | `'clear'` branch reports bits absent from the mask (catalog:233); swap-detecting test catalog.test:201; "cleared" wording pinned hover.test:342 | closed |
| T-88-08 (88-03) | Denial of Service | `decodeInCode` document resolution | medium | mitigate | Dependency interface exposes only `getDocument` (request:118-122, :213); unknown uri → not-found (request.test:374) | closed |
| T-88-09 (88-03) | Tampering | out-of-range / malformed client params | medium | mitigate | Missing document / leaf / target → `NOT_FOUND` (request:213-226); tests request.test:352, :374 | closed |
| T-88-09 (88-07) | Tampering | composer edit range over a byte-range chain | high | mitigate | Byte-range chain → `editable:false`, no payload (request:254-261; request.test:134) | closed |
| T-88-10 (88-04) | Tampering | LSP4IJ Gson boundary for new DTOs | medium | mitigate | decodeInCode (populated + not-found) and composeTriState shapes parsed through the LSP4IJ harness (ComposerModelsJsonBoundaryTest:616-677); `byteNo` never on the wire (:679-687) | closed |
| T-88-10 (88-07) | Denial of Service | `indexedAccessRootName` accessor unwrapping | low | mitigate | `MAX_ACCESSOR_HOPS = 12` bounds the loop (scanner:210, :223-241) | closed |
| T-88-11 (88-04) | Spoofing | request-name drift between TS and Java | medium | mitigate | `ComposerRequestContractTest` reads TS source (:42), literal set (:45-59), quoted-literal presence (:101), equality with reflective set (:83, :116) | closed |
| T-88-11 (88-07) | Repudiation | new unsafe reason without user-facing wording | low | mitigate | `UNSAFE_REASON_TEXT` is a `Record` over the union (scanner:546); case count tied to key count (scanner.test:617) | closed |
| T-88-12 (88-05/06) | Tampering | chain replacement range | high | mitigate | VS Code: equal lines insert, else replace `[start,end)` (tristate-wv:133-139; ui.test:114, :138); IntelliJ: `replaceString(lineStart(start), lineStart(end))` (ComposerLauncher:637-643) | closed |
| T-88-12 (88-08) | Tampering | `vsce package` → installed bundle staleness | high | mitigate | `vscode:prepublish` runs `npm run build` (bbj-vscode/package.json:677); installed-bundle hover gate e2e:188-250 | closed |
| T-88-13 (88-05) | Tampering | applying a superseded selection (IntelliJ tri-state dialog) | medium | mitigate | `scheduleRefresh` disables OK and advances seq synchronously (SetoptsTriStateComposerDialog:208-211); both callbacks seq-checked (:232-244); OK re-enabled only in `apply` (:258-262); dialog enrolled in ComposerDialogRefreshSourceGuardTest (:47, :73) | closed |
| T-88-13 (88-08) | Spoofing | install resolution in the e2e harness | medium | mitigate | Resolved via `identifier.id === 'basis-intl.bbj-lang'` and its location, no glob / version (e2e:50-79) | closed |
| T-88-14 (88-06) | Tampering | webview script context | medium | mitigate | CSP `default-src 'none'`, nonce-only scripts (tristate-wv:178-184); nonce now from `randomBytes(16)` (webview-nonce.ts); payloads mapped and forwarded, never evaluated (tristate-wv:105-109) | closed |
| T-88-14 (88-08) | Denial of Service | spawned language-server child processes | medium | mitigate | `--clientProcessId` on every spawn (e2e:113, :412, :528); `afterAll` SIGKILL (e2e:169-178, :397-401, :512-516); explicit per-test timeouts and named latency budgets (:452, :483, :587) | closed |
| T-88-15 (88-06) | Denial of Service | tri-state panel request failure handling | low | accept | See AR-88-12 (decodeInCode call ui:131-136 and guard re-decode guard:179-185 are wrapped; `composeTriState` in `change`/`apply` tristate-wv:122-131 is not) | closed |
| T-88-15 (88-08) | Information Disclosure | server started by the harness | low | mitigate | `rootUri` / `workspaceFolders` null (e2e:121-127, :435-436); handler uses `getDocument` only; the 88-12 cold probe's repo-root workspace (e2e:546-552) is test-only by design | closed |
| T-88-16 (88-08) | Tampering | fixture content reaching validator / code-action provider | low | accept | See AR-88-02 | closed |
| T-88-17 (88-09) | Spoofing | the plugin the human actually installs (round one) | high | mitigate | Round one recorded sha256 `cde1f2fe…`, HEAD `59fc44f3`, zip mtime, `installedTimestamp`, and "a retest against any other build proves nothing" (88-LIVE-RETEST.md at `a4d4c935~1`:5-33; 88-09-SUMMARY:64-68) | closed |
| T-88-18 (88-09) | Repudiation | the recorded verdict | high | mitigate | `automated_evidence:` key on each gap (88-UAT.md:174, :256, :355); retest doc requires build identity. Closed at L1 — see Observation 1 | closed |
| T-88-19 (88-09) | Elevation of Privilege | a gap resolved without live evidence | high | mitigate | `gap_ids: []` on plans 88-07..88-13; gaps flipped to `resolved` only in human-verdict UAT commits `36539615`, `0c535fac`, each with `resolved_by` / `resolved_at` | closed |
| T-88-20 (88-09) | Tampering | generated block run against live BBjServices (round one) | low | accept | See AR-88-03 | closed |
| T-88-21 (88-09) | Information Disclosure | `88-LIVE-RETEST.md` contents | low | accept | See AR-88-04 | closed |
| T-88-22 (88-10) | Tampering | `composeSetOptsBlock` generated mask arguments | high | mitigate | Both line kinds via `bbjHexLiteral` (catalog:433-435, :472, :474); literal expected strings (catalog.test:366-367, :383, :394); no-quote property (:397) | closed |
| T-88-23 (88-10) | Tampering | in-place writers on both hosts | high | mitigate | VS Code `bbj-literal` target writes a full literal through the guard (composer-wv:116-128; ui.test:352, :533; guard.test:443); IntelliJ `BbjHexLiteral.of` inside `StaleEditGuard` (ComposerLauncher:601; SetoptsInCodeSourceGuardTest:168-188) | closed |
| T-88-24 (88-10) | Tampering | config.bbx composer sharing the writer | medium | mitigate | `hexSyntax` defaults to bare (composer-wv:43, :116; ui.test:494, :514); Java region guard keeps the config.bbx writer off the formatter (SetoptsInCodeSourceGuardTest:181-188); config cue passes no `hexSyntax` (composer-lens-command.ts:96-102) | closed |
| T-88-25 (88-11) | Spoofing | quoted string masquerading as a hex literal | high | mitigate | Shape test on raw CST text (scanner:154, :188-191); negatives at all three decode sites (scanner.test:80, :86, :313, :658) | closed |
| T-88-26 (88-11) | Tampering | edit gate opening on a misread line | high | mitigate | Quoted absolute literal → not-found (request.test:60) | closed |
| T-88-27 (88-11) | Repudiation | test corpus certifying runtime-invalid syntax | medium | mitigate | Remaining quoted fixtures are negatives / invalid-hex only (scanner.test:81, :128, :304, :314, :659; request.test:61); round-trip gate request.test:391 | closed |
| T-88-28 (88-12) | Denial of Service | `textDocument/codeAction` held open | high | mitigate | `CODE_ACTION_BUDGET_MS = 5000` raced against the state wait, gated at `DocumentState.Linked` (ca-handler:47, :93-104, :138); registered after `startLanguageServer` (main.ts:82, :92); tests bbj-code-action-handler.test:56, :74, :85 | closed |
| T-88-29 (88-12) | Elevation of Privilege | client uri causing a filesystem load | medium | mitigate | In-memory store only; unknown uri → null (ca-handler:57-58, :106-109, :139; test :100) | closed |
| T-88-30 (88-12) | Spoofing | second SETOPTS entry point on the wrong file | medium | mitigate | Available only on bbj/bbjt/src/bbx and not the resolved config file (SetoptsInCodeActionAvailability:25, :39-41); `setEnabledAndVisible` → absent (BbjComposeSetoptsInCodeAction:52-60); JUnit table SetoptsInCodeActionAvailabilityTest:16-40, source guard :88-94 | closed |
| T-88-31 (88-12) | Repudiation | latency claim measured in a non-reproducing ordering | high | mitigate | Cold probe issues codeAction right after `didOpen` with repo-root workspace (e2e:507-523); warm test retitled "WARM ordering" (:392, :408); build identity via install `package.json` mtime + bundle symbol checks (88-12-SUMMARY:173, :189) | closed |
| T-88-32 (88-13) | Spoofing | the build the human installs (round two) | high | mitigate | 88-LIVE-RETEST.md:15-35 records sha256 `e76f7682…`, HEAD `c4c70c3d`, `installedTimestamp 2026-09-11T10:47:24Z` and the explicit statement (zip mtime not recorded; sha256 pins the artifact) | closed |
| T-88-33 (88-13) | Repudiation | recorded verdict and its evidence | high | mitigate | All three gaps carry `automated_evidence`; `resolved` set only by the human verdict in UAT test 9 (`0c535fac`) | closed |
| T-88-34 (88-13) | Tampering | QA checklist instructing refused syntax | medium | mitigate | QA/FULL-TEST-CHECKLIST.md rows 15 (:41) and 19 (:75) use bare `$04$` / `$01$` / `$FE$`; quoted-sample check returns 0 at HEAD | closed |
| T-88-35 (88-13) | Tampering | generated block run against live BBjServices (round two) | low | accept | See AR-88-05 | closed |
| T-88-14-01 (88-14) | Tampering | `createDecodeInCodeHandler` chain region → whole-line replace | high | mitigate | Client position only locates a leaf (request:218-226); region from CST ranges (:284-331); four checks — single-assignment `LetStatement` (:303), origin strictly before region (:316, :324), region ends at/before SETOPTS line (:324), residue whitespace/`;` only (:172, :179-201, :328); not-editable carries no payload (:271-277); inverted range → not-found (:335-337); tests request.test:158-333 | closed |
| T-88-14-02 (88-14) | Information Disclosure | `SetOptsInCodeDeps.documents.getDocument` | low | accept | See AR-88-06 | closed |
| T-88-14-03 (88-14) | Denial of Service | region-residue scan | low | accept | See AR-88-07 | closed |
| T-88-14-04 (88-14) | Repudiation | not applicable | low | accept | See AR-88-08 | closed |
| T-88-15-01 (88-15) | Tampering | tri-state panel `apply` → `applyEdit` on `[startLine, endLine)` | high | mitigate | Guard attached when an edit target exists (tristate-wv:82); write via `applyIfUnchanged` (:146); decode params hoisted so capture and re-check use the same position (ui:130, :160-175); tests guard.test:266, :292, :354 | closed |
| T-88-15-02 (88-15) | Tampering | composer panel `apply` → `applyEdit` on `hexRange` | high | mitigate | composer-wv:71, :128; ui:138-156; tests guard.test:443, :472, :531; source guard :562-577; phase-89 in-code cue goes through the guarded command | closed |
| T-88-15-03 (88-15) | Tampering | `sameSetOptsInCodeDecode` comparison strictness | medium | mitigate | Field-wise, element-wise, order-sensitive (guard:52-123); both directions tested (guard.test:383-429) | closed |
| T-88-15-04 (88-15) | Denial of Service | pre-apply re-decode round trip | low | mitigate | 10s timeout constant (guard:28), timer cleared in `finally` (guard:131-141), timeout → `STALE_CHECK_FAILED_MESSAGE` (guard:179-185); test guard.test:223 | closed |
| T-88-15-05 (88-15) | Spoofing | webview `apply` message | low | accept | See AR-88-09 | closed |
| T-88-15-06 (88-15) | Information Disclosure | guard's document lookup | low | accept | See AR-88-10 | closed |
| T-88-15-07 (88-15) | Repudiation | not applicable | low | accept | See AR-88-11 | closed |
| T-88-SC (all plans) | Tampering | npm / gradle installs | high (88-01..06), n/a (88-08..13) | accept | See AR-88-13 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-88-01 | T-88-06 (88-01) | Hover text only restates catalog labels already shipped in `SETOPTS_BITS` and the user's own document text; no new data source is read (scanner:546-607) | Plan-time threat model, premise re-checked by secure-phase audit | 2026-09-13 |
| AR-88-02 | T-88-16 (88-08) | The e2e fixture is tracked, reviewed repository content, not attacker input; `bbj-code-action-provider.ts` has no commits in the phase-88 range (`925fe623~1..02779b65`) | Plan-time threat model, premise re-checked by secure-phase audit | 2026-09-13 |
| AR-88-03 | T-88-20 (88-09) | The block is generated by `composeSetOptsBlock` from the known catalog (catalog:459-483) and run by the user in their own session; the live runtime check later passed (G-88-3 resolved) | Plan-time threat model, premise re-checked by secure-phase audit | 2026-09-13 |
| AR-88-04 | T-88-21 (88-09) | `88-LIVE-RETEST.md` holds only hashes, paths, commands and expected UI wording — no credentials, tokens or environment secrets (read in full) | Plan-time threat model, premise re-checked by secure-phase audit | 2026-09-13 |
| AR-88-05 | T-88-35 (88-13) | Same as AR-88-03 for the round-two retest | Plan-time threat model, premise re-checked by secure-phase audit | 2026-09-13 |
| AR-88-06 | T-88-14-02 (88-14) | The dependency interface still exposes only `getDocument`, never `getOrCreateDocument` (request:118-122); no new resolution path or response field | Plan-time threat model, premise re-checked by secure-phase audit | 2026-09-13 |
| AR-88-07 | T-88-14-03 (88-14) | Runs once per `decodeInCode` request, never per keystroke, over a chain bounded by the enclosing statement array. Wording correction: `regionOwnedExclusively` reads the whole document text (request:185) and then slices it, rather than slicing only the region's text — still O(document) per request, acceptable | Plan-time threat model, premise re-checked (with correction) by secure-phase audit | 2026-09-13 |
| AR-88-08 | T-88-14-04 (88-14) | No identity, audit-relevant action or log in scope | Plan-time threat model | 2026-09-13 |
| AR-88-09 | T-88-15-05 (88-15) | Panel HTML is extension-generated under CSP `default-src 'none'` with a per-load nonce; since `b1005e5d` the nonce comes from a CSPRNG (`webview-nonce.ts`), strengthening the premise; no new message type or field | Plan-time threat model, premise re-checked by secure-phase audit | 2026-09-13 |
| AR-88-10 | T-88-15-06 (88-15) | Reads only `vscode.workspace.textDocuments` (guard:126-128), matching the exact `Uri.toString()`; never opens a path from a string | Plan-time threat model, premise re-checked by secure-phase audit | 2026-09-13 |
| AR-88-11 | T-88-15-07 (88-15) | Not applicable — no identity, audit action or log in scope | Plan-time threat model | 2026-09-13 |
| AR-88-12 | T-88-15 (88-06) | The planned mitigation is only partly implemented. The `composeTriState` calls in the tri-state panel's `change`/`apply` handlers (tristate-wv:122-131) have no try/catch, and `registerPanelMessageHandler` passes the handler straight to `onDidReceiveMessage` (webview-panel-lifecycle.ts:20). A rejected server request becomes an unhandled rejection in the extension host, and Apply leaves the panel open with no message. No document write happens on that path. The stale-edit re-decode and the `decodeInCode` launch call are wrapped. This was already known as 88-REVIEW WR-01, deferred in 88-REVIEW-FIX.md. The user accepted it under the v4.3 keep-lean stance. Fix candidate: wrap both handlers, show a warning, dispose the panel on apply. | User (secure-phase gate) | 2026-09-13 |
| AR-88-13 | T-88-SC (all plans) | No dependency added during phase 88: `bbj-vscode/package.json` diff touches only `contributes`, `activationEvents` and `vscode:prepublish`; lockfile adds no `node_modules` entries; Gradle build files unchanged; 88-RESEARCH.md:193-195 records Package Legitimacy Audit "Not applicable" | Plan-time threat model, premise re-checked by secure-phase audit | 2026-09-13 |

*Accepted risks do not resurface in future audit runs.*

---

## Audit Observations (non-blocking)

1. **T-88-18 build identity only partly recorded.** Neither retest's verdict block in `88-LIVE-RETEST.md` was filled in (round one at `a4d4c935~1`, round two at HEAD).
   - G-88-1's `resolved_by` (88-UAT.md:135) names only `basis-intl.bbj-lang-0.12.28` and "a fresh bbj-intellij-0.1.0.zip". The stale install had the same version string, so the link to `cde1f2fe…` exists only by reference.
   - The round-two verdicts (88-UAT.md:197, :285) cite an 8-character sha256 prefix `50ae9d74…` and HEAD `f56c17e2`. That differs from the build `88-LIVE-RETEST.md` names (`e76f7682…` / `c4c70c3d`). The difference is justified: Check 4 needed a build after `1a6bdd42`, and `f56c17e2` descends from it (verified). The full sha256 is not recorded anywhere.
   - Future live retests should record the full sha256 of the build under test in the verdict itself.
2. **No regression from phases 89-92.** The new composer-cue entry points (`bbj-vscode/src/composer-lens-command.ts`; IntelliJ `ComposerLensKinds` → `launchAt`) route through the same decode gate and stale-edit guard. The launcher, both webviews, the `main.ts` hover/codeLens overrides and the tri-state dialog's sequence fix all keep the mitigations above.
3. **Unregistered flags:** none. The only `## Threat Flags` section (88-14-SUMMARY) reports "None", which maps to T-88-14-01.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-13 | 54 | 54 | 0 | gsd-security-auditor (ASVS L1, block_on high; verified against HEAD `b99ee879`, source + tests read, no tests run) + user acceptance of T-88-15 (88-06) |

## Security Audit 2026-09-13
| Metric | Count |
|--------|-------|
| Threats found | 54 |
| Closed | 54 (41 mitigated, 13 accepted) |
| Open | 0 |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-13
