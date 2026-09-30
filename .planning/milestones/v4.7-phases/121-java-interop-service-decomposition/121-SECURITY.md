---
phase: "121"
slug: "java-interop-service-decomposition"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-29"
---

# Phase 121 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| workspace javadoc folders → JavadocProvider | Javadoc JSON under `<workspace>/javadoc` and the BBj install is read and parsed per services set | local file contents (untrusted text) |
| javadoc text → hover markdown | Documentation text reaches rendered hovers via `bbj-hover.ts` | untrusted text rendered as markdown |
| language server → interop peer (:5008 by default) | Socket + JSON-RPC traffic to a configurable host and port | class/method queries, document text (parseProgram lane) |
| workspace/initialisation options → interop host and port | Settings text chooses where the server connects | host/port strings |
| interop peer answers → class resolution, AST nodes, package tree | Peer-supplied class names, members, javadoc, error text and FQNs become AST nodes, package-tree entries and `use`-statement edits | untrusted peer data |
| built artifacts → tester IDEs | VSIX and IntelliJ zip carry the language server used in the live hand check | build outputs |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-121-01 | Tampering | bbj-hover.ts javadoc fallback | medium | mitigate | Diff vs base `bb5404a0` touches only the `javadocProvider` field + constructor line; `truncateText`/`escapeJavadocMarkdown` still used; `javadoc-markdown-escape.test.ts` `expect(` lines identical to base | closed |
| T-121-02 | Denial of Service | tryInitializeJavaDoc once-only initialise | low | mitigate | `bbj-ws-manager.ts:369-370` keeps the `isInitialized()` guard + `initialize()` call; `java-javadoc.ts:38` still throws "already initialized" | closed |
| T-121-03 | Information Disclosure | process-wide JavadocProvider (#624) | low | mitigate | `test/bbj-test-module.ts:42,53` builds a per-services provider; no `getInstance`/`_instance` left in `java-javadoc.ts` | closed |
| T-121-04 | Repudiation | commit bodies on milestone branch | low | mitigate | `git log --format=%B bb5404a0..HEAD` has no closing keyword before an issue number | closed |
| T-121-05 | Information Disclosure | javadoc state shared between service sets (#624) | low | mitigate | `bbj-module.ts:99` registers `JavadocProvider: () => new JavadocProvider()`; `javadoc.test.ts:198` "Independent JavadocProvider instances (#624)" suite | closed |
| T-121-06 | Denial of Service | production provider never initialised | low | mitigate | `bbj-ws-manager.ts:195` calls `tryInitializeJavaDoc` before `loadClasspath` (214); `bbj-hover.ts:122` keeps its `isInitialized()` check | closed |
| T-121-07 | Repudiation | commit bodies on milestone branch | low | mitigate | Same hygiene check as T-121-04: clean | closed |
| T-121-08 | Denial of Service | ResolutionLock hand-over | medium | mitigate | `java-interop-lock.ts` `acquire`/`drain`/`reset`; `java-interop-lock.test.ts` unit test; `java-interop-socket.test.ts:189` "resolution lock serializes…(#560)" suite retained | closed |
| T-121-09 | Tampering | clearCache reset order | low | mitigate | `java-interop.ts` `clearCache()`: `resolutionCache.reset()` → `clearCompleteClassIndex()` → `lock.reset()` → `resetBreaker()` → `classpathLoader.reset()` → `disconnect()` (base order, confirmed in 121-VERIFICATION truth 6) | closed |
| T-121-10 | Spoofing | setConnectionConfig host/port validation | high | mitigate | `java-interop-connection.ts:358` `validateInteropConfig(host, port)`; `interop-config.test.ts` test/expect lines identical to base | closed |
| T-121-11 | Denial of Service | socket/request timeouts, breaker cooldowns | medium | mitigate | `java-interop-connection.ts:381,410` keep both `10000` ms timeouts; `INTEROP_BREAKER_INITIAL_COOLDOWN_MS = 5_000` / `MAX = 30_000` (lines 30, 34) match base | closed |
| T-121-12 | Tampering | test double connect/createSocket override bypassed | medium | mitigate | `java-interop-connection.ts` calls connect only via `hooks.connect()` (3×); no module-internal `connect()` calls | closed |
| T-121-13 | Repudiation | commit bodies on milestone branch | low | mitigate | Same hygiene check as T-121-04: clean | closed |
| T-121-14 | Denial of Service | parse lane never retiring/reopening | medium | mitigate | `java-interop-connection.ts:201-214,440` lane retirement generation + MethodNotFound handling; `java-interop-parse-lane.test.ts` present | closed |
| T-121-15 | Tampering | double overrides bypassed on lane path | medium | mitigate | `hooks.createSocket` ×2, `hooks.wrapSocket` ×2, `hooks.connect` ×3 in `java-interop-connection.ts` | closed |
| T-121-16 | Tampering | peer FQNs reaching a use-statement edit | medium | mitigate | `isJavaQualifiedName` filters at `bbj-code-action-provider.ts:47,102` and `bbj-completion-provider.ts:164`; neither file nor `java-peer-guard.ts` changed since base | closed |
| T-121-17 | Tampering | ensureCompleteClassIndex override bypassed | medium | mitigate | Both candidate lookups on the front keep `await this.ensureCompleteClassIndex(token)` (`java-interop.ts:313,340`) | closed |
| T-121-18 | Tampering | bulk-path peer-data guards | high | mitigate | `java-interop-classpath.ts` `loadImplicitImports`: `Array.isArray` → non-object skip → `hooks.resolveClass` → `isUsableJavaClassName` in base order; `java-interop-peer-guard.test.ts` test/expect lines identical to base | closed |
| T-121-19 | Denial of Service | duplicate synthetic-classpath entries | low | mitigate | Implicit-import copy reuse moved verbatim, pinned by the classpath unit test (121-07-SUMMARY) | closed |
| T-121-20 | Tampering | loadClasspath/loadImplicitImports override bypassed | medium | mitigate | Public delegates on the front (`java-interop.ts:239,248`); `JavaInteropTestService` overrides both (`bbj-test-module.ts:191,195`) | closed |
| T-121-21 | Tampering | storeJavaClass #676 collision guard | medium | mitigate | `java-interop-cache.ts:667,749` collision branch; `java-interop-cache.test.ts` and `java-package-name-collision.test.ts` present | closed |
| T-121-22 | Denial of Service | LRU bound reverting / unbounded growth | medium | mitigate | `java-interop.ts:75` field initializer passes `this.resolvedClassesCacheLimit()` eagerly into `JavaResolutionCache` | closed |
| T-121-23 | Tampering | sanitizeJavaClassDto / isUsableJavaClassName order in resolveClass | high | mitigate | `java-interop-cache.ts`: `isUsableJavaClassName` (410) → `canonicalJavaClassName` (427) → `sanitizeJavaClassDto` (443) → `storeJavaClass` (461) → `getDocumentation` (507), base order | closed |
| T-121-24 | Tampering | Phase 2 javadoc/real-name bounds | medium | mitigate | `java-interop-cache.ts:544,567` `truncateText` with `MAX_JAVA_IDENTIFIER_LENGTH` / `MAX_JAVADOC_LENGTH` | closed |
| T-121-25 | Denial of Service | resolution depth limit, chain timeout, dedup, in-flight registry | medium | mitigate | `java-interop-cache.ts:183,185` `MAX_RESOLUTION_DEPTH = 50`, `RESOLUTION_TIMEOUT_MS = 30_000`; `pendingResolutions` + `inFlightPhase2` maps (199, 205) | closed |
| T-121-26 | Tampering | resolveClassByName/getRawClass override bypassed | medium | mitigate | `java-interop-cache.ts`: `hooks.resolveClassByName` ×5, `hooks.getRawClass` ×1, zero `this.resolveClassByName(`/`this.getRawClass(` calls | closed |
| T-121-27 | Repudiation | commit bodies on milestone branch | low | mitigate | Same hygiene check as T-121-04: clean | closed |
| T-121-28 | Tampering | stale LS inside IntelliJ zip | medium | mitigate | 121-10-SUMMARY: bundled `main.cjs` `cmp`-identical to `bbj-vscode/out/language/main.cjs`; VSIX newer than last `src` commit; sha256s recorded | closed |
| T-121-29 | Tampering | phase-wide peer-bounding / double bypass regression | high | mitigate | 121-10 Task 1 + 121-VERIFICATION: assertions and 9 test-double bodies identical to base, `exports base=15 head=15 missing=0`, whole suite `numFailedTests=0`; live hand check approved 2026-09-29 | closed |
| T-121-30 | Repudiation | issue closed early by squash-merge body | low | mitigate | Same hygiene check as T-121-04: clean; `Closes` lines only in SUMMARY | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-29 | 30 | 30 | 0 | /gsd-secure-phase (orchestrator, L1 grep-depth; auditor skipped per short-circuit: register authored at plan time, ASVS 1, threats_open 0) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-29
