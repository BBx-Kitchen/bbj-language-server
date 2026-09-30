---
title: IntelliJ sends javaInteropHost/javaInteropPort but the language server reads interopHost/interopPort
area: intellij
created: 2026-09-26
source: Phase 110 research (110-RESEARCH.md, Open Question 2)
audit_acknowledged:
  milestone: v4.7
  at: 2026-09-29
---

`BbjLanguageServerFactory.java` puts `javaInteropHost`/`javaInteropPort` into `initializationOptions`;
`bbj-ws-manager.ts` only reads `interopHost`/`interopPort`, so IntelliJ's configured interop
host/port never reach the server at initialize (the server falls back to the defaults). Not part of
Phase 110's issues (#509/#510/#581). Decide whether to rename on the IntelliJ side or accept both keys
server-side, and check whether IntelliJ relies on a later configuration push instead.
