---
title: IntelliJ sends javaInteropHost/javaInteropPort but the language server reads interopHost/interopPort
area: intellij
created: 2026-09-26
source: Phase 110 research (110-RESEARCH.md, Open Question 2)
resolves_phase: 129
audit_acknowledged:
  milestone: v4.7
  at: 2026-09-29
---

`BbjLanguageServerFactory.java` puts `javaInteropHost`/`javaInteropPort` into `initializationOptions`;
`bbj-ws-manager.ts` only reads `interopHost`/`interopPort`, so IntelliJ's configured interop
host/port never reach the server at initialize (the server falls back to the defaults). Not part of
Phase 110's issues (#509/#510/#581). Decide whether to rename on the IntelliJ side or accept both keys
server-side, and check whether IntelliJ relies on a later configuration push instead.

## Resolution

Direction: renamed on the IntelliJ side. `BbjLanguageServerFactory` now writes `interopHost` and
`interopPort`. The server (`bbj-ws-manager.ts`) and VS Code (`extension.ts`) already used those two
names and nothing read the `javaInterop`-prefixed ones, so there is no compatibility shim and the
server contract stays single-spelled. `BbjSettings.State` keeps its persisted `javaInteropHost` and
`javaInteropPort` field names, and no bbj-vscode file changed.

Behaviour change: IntelliJ's configured host and its effective, auto-detected port now reach the
server at initialize. Before, the server always used `localhost:5008`. A user whose BBj.properties
port differs from 5008 now connects to the detected port, as IntelliJ's own interop probe already
did.

Guard: `InteropInitOptionsContractTest` reads the factory, `bbj-ws-manager.ts` and `extension.ts`
as text and fails if either side renames a key alone.

Later configuration push: IntelliJ does not rely on one. LSP4IJ's settings push and pull are not
wired for BBj, so initialization options are the only channel (the `CompilerInitOptions` Javadoc
says the same).
