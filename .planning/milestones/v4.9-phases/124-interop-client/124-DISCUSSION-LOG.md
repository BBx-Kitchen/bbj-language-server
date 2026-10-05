# Phase 124: Interop Client - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-01
**Phase:** 124-interop-client
**Areas discussed:** Route & decision rule, Timeout & cancellation, Classifier scope, Validation bounds

---

## Route & decision rule

| Option | Description | Selected |
|--------|-------------|----------|
| Third dedicated lane | Own socket for format+DENUM; own parser/format workers in bbj-ls | ✓ |
| Shared connection | No new socket; queues behind class-info traffic (#692); breaker path | |
| Parse lane (generalised) | DENUM queues behind live parse; lane loss bumps generation | |

| Option | Description | Selected |
|--------|-------------|----------|
| Commit, then confirm | Build dedicated lane; harness measures and records | ✓ |
| Spike all routes first | Prototype 2-3 routes, pick fastest | |

| Option | Description | Selected |
|--------|-------------|----------|
| Fall back to shared | Mirror parseProgram fallback | |
| No fallback | Lane is the only route; typed unavailable if it cannot open | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Own lane only | Lane loss re-probes only format/DENUM latches; shared bump also resets them | ✓ |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Next request, with backoff | Retry on next request with a short cool-down | ✓ |
| Next shared generation | Latch failure until reconnect/clearCache | |

| Option | Description | Selected |
|--------|-------------|----------|
| No queueing behind parse | Numbers recorded, no fixed ms bar | ✓ |
| Fixed bar | User-named ms threshold | |

**User's choice:** Dedicated lane, no fallback, retry with cool-down, own-lane reset, commit-then-confirm with "no queueing" threshold.

---

## Timeout & cancellation

| Option | Description | Selected |
|--------|-------------|----------|
| Backstop above bbj-ls | 15 s client deadline, always cancel, typed timeout | ✓ |
| Caller token only | Like parseProgram; Phase 125 owns any budget | |

| Option | Description | Selected |
|--------|-------------|----------|
| Forward + typed 'cancelled' | Token to sendRequest; same kind as -32800; harness checks $/cancelRequest | ✓ |
| Forward only | Phase 125 decides | |

| Option | Description | Selected |
|--------|-------------|----------|
| Plain typed timeout | Overrun -33002 is an ordinary timeout | ✓ |
| Recycle the lane | Reopen lane after backstop expiry | |

---

## Classifier scope

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate, behaviour-identical | BBjParserService uses the shared classifier, same tokens/cadence | ✓ |
| New methods only | Leave bbj-parser-service.ts untouched | |

| Option | Description | Selected |
|--------|-------------|----------|
| Interop client | Per-method latches in the lane code | ✓ |
| Consumer services | Latches in Phase 125/126 services | |

| Option | Description | Selected |
|--------|-------------|----------|
| Validated, typed payload | -33007 problems, -33008 line, bounded | ✓ |
| Raw data pass-through | Consumers validate | |

---

## Validation bounds

| Option | Description | Selected |
|--------|-------------|----------|
| Contract-exact | Request-kind match, ≤1 edit, version echo check | ✓ |
| Loose (INT-05 minimum) | Exactly one of text/edits + caps | |

| Option | Description | Selected |
|--------|-------------|----------|
| Relative + absolute | ≤ 4× request + 64 KiB, hard 16 MiB | ✓ |
| Absolute only | Single cap (e.g. 8 MiB) | |

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse java-peer-guard style | Cap count, truncate/strip, drop bad entries individually | ✓ |
| Reject the whole result | Any bad diagnostic fails the result | |

| Option | Description | Selected |
|--------|-------------|----------|
| Typed outcome + warn log once | warn once per kind per generation, then debug | ✓ |
| Log every time | warn on every malformed answer | |

---

## Closing note

**User's statement:** "I suggest we do both the denum and the formatting in place, in the loaded editor - one single 'undo'." Confirmed as already planned (STATE.md v4.9 decision: DENUM edits the open buffer, undoable, never the disk file; FMT-07 "Denumber and Format" is one `allowDenum` request, one undo). Recorded in CONTEXT.md as a carried-forward constraint; for this phase it means the client always takes live text and `allowDenum` is a typed param.

## Claude's Discretion

- Module split/names, outcome union shape, lane bookkeeping fields
- Cool-down length; diagnostic count/length caps
- Test-double scripting mechanics; how the harness reaches the LS client

## Deferred Ideas

- canonicalName choice and per-document serialization (Phase 125)
- User-facing outcome messages (Phases 125/126)
- 6 keyword-matched todos reviewed, none folded
