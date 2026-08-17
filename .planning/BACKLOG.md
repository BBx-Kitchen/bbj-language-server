# Backlog

Standalone append-only file for GSD backlog items that are explicitly out of scope for the
current milestone's review phases. Not part of `.planning/reviews/` (which is reserved for
in-scope findings only, per D-13 of Phase 61's context).

## FUT-01 — java-interop/ (Java service) observations

Java-side observations surfaced while reading `java-interop/` as reference material during
Phase 61's `RU-61-06` sweep (D-13). These are **not** findings — they carry no `P61-*` ID and do
not appear in `.planning/reviews/61-COVERAGE.md`. `java-interop/` review itself remains FUT-01 /
out of scope for v4.0; these bullets are only pointers for whenever that review happens.

- `java-interop/src/main/java/bbj/interop/SocketServiceApp.java:30-45` — the socket server binds
  `localhost:5008` and accepts unlimited concurrent connections in an unbounded `while (true)`
  loop with no authentication, connection cap, or peer-identity check of its own; each accepted
  connection gets a fresh, unauthenticated JSON-RPC `InteropService` endpoint.
- `java-interop/src/main/java/bbj/interop/InteropService.java:116-147` — `loadClasspath()`
  accepts classpath entries from whichever peer is connected and adds them directly to a
  `URLClassLoader`, dynamically loading arbitrary JARs into the JVM process with no path/scheme
  restriction. Currently only reachable via the reviewed client's own configured classpath, but
  the server has no mechanism to restrict this to a trusted caller if a second client connects
  directly to the port.
