# Concept: BBj Editing in the Browser

**Status:** Draft / concept for discussion
**Date:** 2026-07-19
**Predecessor:** [PR #71](https://github.com/BBx-Kitchen/bbj-language-server/pull/71) (2023 Monaco/web-worker draft, closed as superseded by the Langium 4 architecture)

## Goal

Give BBj developers a code editor that runs in the browser, served by BBj itself, with the
full intelligence of the existing Langium language server: completion, diagnostics,
cross-file linking via PREFIX, Java classpath integration, and `bbjcpl` compiler
diagnostics. The final ambition is that a developer opening a browser against a BBj
installation has **everything needed to maintain code** — no local IDE installation.

Two frontend outcomes are possible on top of one shared foundation. Both are kept open
by this concept; the foundation work is identical for either.

## Key findings from research

### The language server can run in the browser — with three hard server dependencies

Langium officially supports running a language server in a browser web worker
(`vscode-languageserver/browser`, `BrowserMessageReader/Writer`), and PR #71 proved it
for BBj in 2023. The grammar, lexer, scoping, linking, validation, completion, and type
inference in `bbj-vscode/src/language` are pure TypeScript and browser-clean.

Exactly four places bind the current server to Node.js:

| Seam | File | Node dependency | Browser replacement |
|---|---|---|---|
| Java interop transport | `java-interop.ts` | raw TCP `net.Socket` to `localhost:5008` | WebSocket to the gateway |
| Environment discovery | `bbj-ws-manager.ts` | reads `config.bbx` (PREFIX), `project.properties`, `os.homedir()`, `path.delimiter` | one `env/get` request answered server-side |
| File access | Langium `FileSystemProvider` (`NodeFileSystem`) | local disk | remote FS provider over WebSocket |
| Compiler diagnostics | `bbj-cpl-service.ts` | `spawn('bbjcpl')` | `compile/run` request to the gateway |

Browsers cannot open raw TCP sockets, so port 5008 can never be reached directly from a
page — and it must stay loopback-only regardless (it offers "load arbitrary classpath and
reflect on it" and must not be network-exposed).

### PREFIX must take the server's perspective

PREFIX entries in `config.bbx` are paths on the machine running BBj. In the browser
there is no filesystem where those paths mean anything, so the browser-side language
server must never *interpret* paths locally. Instead:

- the gateway answers `env/get` with `{ prefixes, classpath, bbjdir }`, computed on the
  server where `config.bbx` lives;
- all URIs the language server handles are server-perspective paths, resolved through a
  remote `FileSystemProvider` that proxies `readFile`/`readDirectory`/`stat` to the
  gateway;
- the gateway enforces a canonicalized-path **allowlist**: PREFIX entries ∪ workspace
  root ∪ `bbjdir/documentation/javadoc`. Read-only by default; writes only to the
  workspace root behind an explicit capability.

With that in place, `use ::path::Class` resolution, `isExternalDocument()` prefix checks,
and javadoc lookup work unchanged, because they already operate on URIs plus the
injected file system provider.

### A server component is required — and it makes the system securable

Not optional, for functionality (TCP, files, compiler) and for security. The gateway is
where WSS termination, authentication (short-lived tokens minted by the embedding
BBj web session, sent as first message after the upgrade since the browser WebSocket
API carries no custom headers), `Origin` checking, path allowlisting, and compile
rate-limiting live.

## Architecture: one self-contained WAR inside BBj's Jetty

A single deployable WAR (Java, Spring Framework — **not** Boot; Jetty is BBj's) that is
both the CDN for the frontend and the gateway for everything server-side:

```
Browser                                  BBj server (BBjServices Jetty)
┌────────────────────────────┐           ┌───────────────────────────────────┐
│ frontend (see alternatives)│  HTTPS    │ bbj-editor.war  (Spring, no Boot) │
│  └─ Langium LS (web worker)│◄────────► │  ├─ static: frontend bundles      │
│      ├─ RemoteFs      ─────┼──WSS────► │  ├─ /ls WebSocket endpoint        │
│      ├─ RemoteInterop ─────┼──(one     │  │   ├─ env/*  (PREFIX, classpath)│
│      └─ RemoteCompiler ────┼──socket)  │  │   ├─ fs/*   (allowlisted)      │
│                            │           │  │   ├─ compile/* (bbjcpl)        │
└────────────────────────────┘           │  │   └─ interop/* ──► loopback    │
                                         │  │                    TCP :5008   │
                                         │  └─ (java-interop stays as-is)    │
                                         └───────────────────────────────────┘
```

- One WebSocket per editor session; JSON-RPC with namespaced methods multiplexes all
  four concerns.
- The existing 5008 service stays untouched and loopback-only; the WAR bridges
  `interop/*` to it over localhost. One interop implementation continues to serve
  VS Code, IntelliJ, and the browser. (Embedding `InteropService` in-process in the WAR
  is a possible later optimization, at the cost of webapp-classloader vs. BBj-classpath
  complexity.)
- Early verification item: which Jetty / servlet API namespace BBjServices bundles
  (`jakarta.servlet` → Spring 6, `javax.servlet` → Spring 5.3). The rest of the design
  is insensitive to the answer.

## Frontend: two alternative outcomes

Both sit on the identical foundation (browser LS worker + WAR gateway). The choice is a
product decision, and the WAR could ultimately serve **both** off the same gateway.

### Alternative A — `<bbj-editor>` web component (Monaco)

A standard custom element bundling Monaco via monaco-languageclient v10.x /
monaco-editor-wrapper, with the Langium LS as a worker chunk.

- **Shape:** an embeddable widget. Drops into any page (BUI, DWC, webforJ, Enterprise
  Manager) via `<script>` + `<bbj-editor file="..." auth-token="...">`. Attributes for
  `server-url`, `readonly`, `theme`; events for change/save/diagnostics.
- **Rendering:** light DOM with prefixed CSS (Monaco still has real shadow-DOM defects:
  Firefox selection, caret positioning across shadow boundaries, color picker).
- **Degraded standalone mode:** with no server at all, Monarch highlighting +
  parser/validator still work (no Java completion, no PREFIX linking, no compiler).
- **Best for:** embedding an editor *inside* an application — customize a callback,
  edit a snippet in a form.
- **Cost:** any IDE-like features beyond a single editor pane (file explorer, tabs,
  search) must be built by hand around it.

### Alternative B — full browser IDE (VS Code for the Web / Code-OSS)

The static **Code-OSS web build** (~18 MB of static files, extension host in a web
worker, no Node backend) served by the same WAR, with the BBj extension compiled as a
[web extension](https://code.visualstudio.com/api/extension-guides/web-extensions) and a
FileSystemProvider extension speaking to the gateway's `fs/*` (the github.dev pattern).

- **Shape:** a full IDE application owning the page (or an iframe), launched e.g. from
  Enterprise Manager. Explorer over the server's files, tabs, global search, settings,
  keybindings, themes, Open VSX web extensions — the developer has everything needed
  to maintain code.
- **Launch configuration:** the workbench `create()` API accepts a workspace provider
  (open a given program/folder at startup) and configuration defaults (hide activity
  bar, menus, etc.) — the "kiosk" tailoring is supported configuration.
- **Costs:** we become maintainers of a Code-OSS web distribution (`gulp vscode-web`
  builds are not an officially supported/shipped artifact; pin, patch `product.json`,
  re-verify on every upgrade). No Microsoft marketplace or branding (Open VSX instead).
  Heavier payload; not embeddable as an inline widget.
- **Explicitly ruled out:** code-server / openvscode-server / VS Code Server variants —
  they require a Node backend spawning per-user processes and cannot live in a WAR.
  vscode.dev itself is not self-hostable.

### Decision guide

| Driving use case | Choice |
|---|---|
| Editor embedded in web apps (DWC/webforJ pages, EM panels) | A — component |
| "BBx IDE in the browser": maintain programs/projects against the server | B — full IDE |
| Both, eventually | Same WAR serves both frontends |

The full IDE (B) is the most attractive final goal; the component (A) remains valuable
as an embeddable building block and as the minimal proving ground for the shared
foundation.

## Phased plan

### Phase 1 — Refactor: abstract every server-touching seam

Pure refactoring for VS Code/IntelliJ (they wire the Node implementations; `main.ts`
behavior unchanged). New interfaces, injected via the existing DI module:

1. `InteropTransport` — extracted from `java-interop.ts` (produces a
   `MessageConnection`; Node socket impl today, WebSocket impl later).
2. `BBjEnvironmentProvider` — extracted from `bbj-ws-manager.ts` config discovery
   (`getEnvironment(): Promise<{prefixes, classpath, bbjdir}>`); removes the
   long-standing direct `fs`/`os` usage.
3. `CompilerBackend` — extracted from `bbj-cpl-service.ts`
   (`compile(path, content) → diagnostics`); plus a `NullCompilerBackend`.
4. File system — audit that all access goes through Langium's injected
   `FileSystemProvider`.

Plus `main-browser.ts` (worker entry), an esbuild browser target, and a small Vite
playground running the worker with `EmptyFileSystem` + null backends.

**Exit criterion:** builtin-function completion and diagnostics working fully offline in
a browser; VS Code and IntelliJ regression-clean.

### Phase 2 — Server service (WAR) and client wiring

New top-level folder (e.g. `bbj-web/`): the WAR (Spring, `WebApplicationInitializer`,
`spring-websocket`) and the frontend package(s). Sub-steps, each demoable:

1. WAR serving static assets + `interop/*` bridge → Java class completion in browser.
2. `env/get` + `fs/*` → PREFIX resolution and `use ::` linking against server files.
3. `compile/run` → full diagnostics parity.
4. Hardening: token auth, allowlist tests, `Origin` checks, rate limits; QA checklist;
   documentation.

### Phase 3 — Frontend outcome(s)

Alternative A, Alternative B, or both — decided by product priority; nothing in phases
1–2 is specific to either.

## Risks and open questions

- **Workspace indexing latency** over `fs/*` for large PREFIX trees. Mitigations, in
  order: a bulk `fs/listSources` walk (one round trip), lazy on-demand indexing of
  PREFIX files, mtime-validated caching. Benchmark against a realistic PREFIX tree
  early in phase 2.
- **Multi-user model:** the 5008 interop is effectively single-tenant (one classpath
  universe per BBj instance). Fine while classpaths are per-installation; needs a
  session review if per-user classpaths matter.
- **Token minting:** which component issues editor session tokens — the embedding BBj
  web session, or Enterprise Manager?
- **Jetty/servlet namespace** of BBjServices (decides Spring 6 vs 5.3) — verify first
  in phase 2.
- **Code-OSS distribution maintenance** (Alternative B only): accepted, recurring cost.

## References

- [PR #71 — Add monaco editor and language webworker](https://github.com/BBx-Kitchen/bbj-language-server/pull/71) (closed predecessor)
- [Langium + Monaco tutorial](https://langium.org/tutorials/langium_and_monaco/) · [Langium in the web browser (TypeFox)](https://www.typefox.io/blog/langium-web-browser/)
- [monaco-languageclient](https://github.com/TypeFox/monaco-languageclient) · [vscode-ws-jsonrpc](https://github.com/TypeFox/vscode-ws-jsonrpc)
- Monaco shadow-DOM issues: [#4679](https://github.com/microsoft/monaco-editor/issues/4679), [#2396](https://github.com/microsoft/monaco-editor/issues/2396), [#3845](https://github.com/microsoft/monaco-editor/issues/3845)
- [VS Code web extensions](https://code.visualstudio.com/api/extension-guides/web-extensions) · [Virtual workspaces / FileSystemProvider](https://code.visualstudio.com/api/extension-guides/virtual-workspaces) · [Turning VS Code into a product framework](https://dev.to/progrium/turning-vs-code-into-a-product-framework-28hg)
- [WebSocket authentication guide](https://websocket.org/guides/authentication/)
