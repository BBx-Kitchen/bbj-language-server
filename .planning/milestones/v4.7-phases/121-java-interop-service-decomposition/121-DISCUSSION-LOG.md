# Phase 121: Java Interop Service Decomposition - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-29
**Phase:** 121-java-interop-service-decomposition
**Areas discussed:** Split shape, The other pieces, Javadoc DI wiring, New per-module tests

---

## Todo cross-reference

| Option | Description | Selected |
|--------|-------------|----------|
| Leave it out | Keep the IntelliJ interop key-mismatch todo pending; the phase stays a pure refactor | ✓ |
| Fold it in | Fix the key mismatch here as a separate plan | |

## Split shape

| Option | Description | Selected |
|--------|-------------|----------|
| Front class + composed | JavaInteropService stays the one DI service and delegates to plain collaborators | ✓ |
| Each module a DI service | Register each under services.java.*; test doubles need rewiring | |
| Inheritance chain | Base-class chain; responsibilities stay coupled through `this` | |

| Option | Description | Selected |
|--------|-------------|----------|
| Callbacks from front | Protected hooks stay on the front class and are passed as constructor callbacks | ✓ |
| Hooks move to modules | Test doubles override on the collaborators instead | |

| Option | Description | Selected |
|--------|-------------|----------|
| Sibling files | java-interop-*.ts next to java-interop.ts | ✓ |
| java-interop/ subfolder | Folder with index.ts | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep all, delegate | Every public method stays as a thin delegate | ✓ |
| Consumers call modules | Retarget the consumers at the collaborators | |

## The other pieces

| Option | Description | Selected |
|--------|-------------|----------|
| Both into connection | Parse lane and breaker live in the connection module | ✓ |
| Parse lane on its own | A sixth module | |
| Leave both in the front | Only the five named pieces move | |

| Option | Description | Selected |
|--------|-------------|----------|
| Tree with cache; copies with classpath | Children tree goes with resolution/cache; implicit-import copies go with classpath loading | ✓ |
| Both stay in the front | Keep them as glue | |

| Option | Description | Selected |
|--------|-------------|----------|
| Front orchestrates | clearCache() calls a per-collaborator reset() in today's order | ✓ |
| Each module self-resets | A clear event; the order becomes implicit | |

| Option | Description | Selected |
|--------|-------------|----------|
| Stay in java-interop.ts | Every export stays importable from java-interop.ts (move + re-export allowed) | ✓ |
| Move, update importers | Helpers move and the imports are updated | |

## Javadoc DI wiring

| Option | Description | Selected |
|--------|-------------|----------|
| services.java.JavadocProvider | Registered next to JavaInteropService | ✓ |
| Shared services group | BBjSharedServices | |

| Option | Description | Selected |
|--------|-------------|----------|
| Factory override | Test modules register a pre-initialised provider per services instance | ✓ |
| Init in double's ctor | Each double initialises its injected provider | |

| Option | Description | Selected |
|--------|-------------|----------|
| Retarget setup only | getInstance() replaced in setup and spy lines; expects unchanged; #624 test goes in javadoc.test.ts | ✓ |
| Two-instance test in new file | Same, with the test in a new file | |

## New per-module tests

| Option | Description | Selected |
|--------|-------------|----------|
| All five | One focused unit test file per extracted module | ✓ |
| Lock + index only | Only what #558 names | |
| Import smoke only | Construct-only smoke test | |

| Option | Description | Selected |
|--------|-------------|----------|
| No, suites + hand check | No benchmark | ✓ |
| Before/after timing probe | Scratch timing against live :5008 | |

## Claude's Discretion

- Module and class names, callback shapes, how the lock is shared with resolution, plan split/order, and where `LruMap` goes.

## Deferred Ideas

- IntelliJ interop initializationOptions key mismatch (pending todo; it changes behaviour).
