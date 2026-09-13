---
phase: "91"
slug: "language-server-responsiveness"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
block_on: high
register_authored_at_plan_time: true
created: "2026-09-13"
---

# Phase 91 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| workspace and PREFIX files → language server index | File content is user- or library-controlled and can be arbitrarily large or numerous | BBj source, class declarations |
| index maintenance → document builder | Index updates run inside the build and must not start another build | index entries keyed by document URI |
| client completion requests → singleton provider | Concurrent requests for different documents share one provider instance | cancellation tokens, completion context |
| provider → java-interop class index | One shared in-flight lookup serves several requests | class-name prefixes, candidate FQNs |
| language server → java-interop peer (:5008) | An external local service that may be stopped, restarted, slow or unreachable | JSON-RPC class lookups and answers |
| breaker → client notifications | The server decides how often the IDE shows an error popup | `window/showMessage` error text |
| recovery listener / handler → document builder | A listener runs while resolution may be in progress; a rebuild can collide with the initial workspace build | document state resets, rebuild requests |
| java-interop peer answers → resolution graph | Class graphs are cyclic and arbitrarily large, and answers can be slow or never arrive | resolved `JavaClass` objects |
| Refresh Java Classes → in-flight resolutions | A cache clear can land while a background Phase 2 is still running | LRU and in-flight registry entries |
| reconnected java-interop peer → cached class answers | A fresh peer instance starts from the default classpath and does not remember the custom one | classpath entries, not-found stubs |
| rebuilt artifact → tester install / evidence → closure claim | A stale VSIX or zip would make UAT or phase closure test the old server | VSIX, plugin zip, bundled `main.cjs` |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-91-01 | Denial of Service | `getBBjClassesFromFile`, `collectLocalSymbols` on a large PREFIX library | medium | mitigate | `getBBjClassesFromFile` now reads the path-keyed `getBBjClassesForFiles` (`bbj-scope.ts:318`, `bbj-index-manager.ts:99`); external documents prune member bodies (`bbj-scope-local.ts:130-160`, mirroring `bbj-linker.ts:45-58`); review fix 59befa50 keeps signature types preloaded; `scope-cost-regression.test.ts` 14/14 green | closed |
| T-91-02 | Tampering | stale path index serving classes from a changed or removed file | medium | mitigate | index written only after `super.updateContent` (`bbj-index-manager.ts:54-55`) and `super.removeContent` (`:75-76`); "path-keyed class index stays correct (#505)" tests green | closed |
| T-91-03 | Denial of Service | index maintenance triggering a rebuild loop | low | mitigate | no `DocumentBuilder` or `notifyDocumentPhase` reference anywhere in `bbj-index-manager.ts` (grep empty) | closed |
| T-91-04 | Tampering | request-scoped token on the singleton provider | medium | mitigate | `AsyncLocalStorage` `completionRequestToken` (`bbj-completion-provider.ts:6,45`) run per request (`:259`) and read at `:106`; `activeCancelToken` field removed (grep empty); two-document token test green | closed |
| T-91-05 | Denial of Service | a cancelled request rejects the shared lookup, forcing retries for every waiter | low | mitigate | shared lookup created with no token (`bbj-completion-provider.ts:203`); each waiter checks its own token before and after the await (`:142`, `:150`); memo test green | closed |
| T-91-06 | Denial of Service | a token-free shared lookup keeps running after every waiter cancelled | low | accept | one-time latched class-index build or in-memory scan shared by all requests; each waiter returns at its own token check. See Accepted Risks | closed |
| T-91-07 | Denial of Service | `connect()` / `doResolveClassByName` against an unreachable peer | high | mitigate | three-state breaker short-circuits every caller while open or half-open (`java-interop.ts:233-275`, `throwCircuitOpen` `:273`); "twenty unresolved classes … settle within one connect timeout" test green | closed |
| T-91-08 | Denial of Service | breaker tripping on a slow-but-connected peer | medium | mitigate | only `establishConnection()` rejections reach `onConnectAttemptSettled` with `success: false` (`java-interop.ts:255-263`); request timeouts raced after connect never touch breaker state; slow-peer test green | closed |
| T-91-09 | Tampering | transport-failure stubs cached for the process lifetime | medium | mitigate | `createStubClass(className, !(cancelled \|\| isInteropTransportFailure(e)))` (`java-interop.ts:801`, classifier `:74`); review fix 2ca423ff adds the cancellation case; uncached and classifier tests green | closed |
| T-91-10 | Repudiation | popup storm hiding the real state | low | mitigate | `notifyJavaConnectionError` only on a non-probe closed→open transition; failed probes back off silently (`java-interop.ts:292-301`); popup-count tests across two outages green; one popup confirmed live in 91-UAT.md Test 1 | closed |
| T-91-11 | Denial of Service | recovery listener awaited inside `connect()`, re-entering resolution under the lock | medium | mitigate | `fireRecoveryListeners` schedules each listener with `Promise.resolve().then(...)`, never awaited (`java-interop.ts:305-309`); recovery test green | closed |
| T-91-12 | Denial of Service | repeated recovery reloads growing the synthetic classpath | low | mitigate | `implicitImportCopies` map dedupes simple-name copies (`java-interop.ts:181,501,512`), cleared with the cache (`:1123`); re-run test green | closed |
| T-91-13 | Denial of Service | in-flight registry never draining, which defeats the LRU bound | high | mitigate | identity-guarded delete in `resolveClass`'s `finally` (`java-interop.ts:985-991`); `clearCache` clears it (`:1097`); drain tests after chain timeout and cancellation green | closed |
| T-91-14 | Denial of Service | eviction during cyclic resolution causing a 30 s stall or a stub | medium | mitigate | registry consulted by all three fast paths (`java-interop.ts:734`, `:782`, `:850`); forced-eviction cyclic test green | closed |
| T-91-15 | Tampering | a class from a cleared classpath put back into the LRU after Refresh Java Classes | medium | mitigate | put back only while the registry still holds the same object (`java-interop.ts:985`); "clearCache empties the registry and a late Phase 2 does not bring its class back" test green | closed |
| T-91-16 | Tampering | recovery re-check against a peer without the custom classpath, caching user classes as a genuine not-found | high | mitigate | `reloadClasspathAndRecheckDocuments` awaits `loadClasspath` (`java-class-reload.ts:37-39`) and `loadImplicitImports` (`:42`) before `documentBuilder.update` (`:55`); call-order test green | closed |
| T-91-17 | Denial of Service | recovery rebuild during the initial build, or repeated rebuilds | medium | mitigate | `javaRecoveryPending` deferral until the one-shot first-Validated block (`main.ts:154`, `:168-172`, `:184-187`); "an interop recovery re-checks documents exactly once" end-to-end test green | closed |
| T-91-18 | Repudiation | silent failure of the recovery re-check | low | mitigate | `recheckAfterInteropRecovery` catches and logs with `console.error`, no popup (`main.ts:159-165`) | closed |
| T-91-19 | Repudiation | phase closed on source-tree tests while the installed bundles still ship the old server | medium | mitigate | breaker marker count 1 in both the VSIX and the plugin zip, both bundles' `main.cjs` byte-identical to the fresh build, sha256 digests recorded in `91-UAT.md` (rebuilt 2026-09-13 at `e52e5e50`) | closed |
| T-91-20 | Tampering | UAT run against artifacts built before code-review fixes | low | mitigate | both distributables rebuilt after review fixes 2ca423ff and 59befa50 (`clean buildPlugin`), before the live check passed in `91-UAT.md` Test 1 | closed |
| T-91-SC | Tampering | npm/pip/cargo installs | low | accept | `git diff 174985f7..HEAD -- bbj-vscode/package.json bbj-vscode/package-lock.json` is empty; `node:async_hooks` is a Node builtin. See Accepted Risks | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-91-01 | T-91-06 | The shared per-prefix lookup is either the one-time, latched complete class-index build or an in-memory scan of already-resolved classes; letting it finish after every waiter cancelled costs at most one bounded request whose result later requests reuse. | plan 91-02 threat model (low, accept) | 2026-09-13 |
| AR-91-02 | T-91-SC | No package was added or changed in this phase; the only new import is the Node builtin `node:async_hooks`. | plan threat models 91-01..06 (low, accept) | 2026-09-13 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-13 | 21 | 21 | 0 | /gsd-secure-phase 91 (orchestrator, short-circuit path: register authored at plan time, ASVS level 1, grep-level evidence on the final tree `598b2d7e`; no summary Threat Flags) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-13
