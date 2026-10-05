# Phase 125: LS Formatting - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-01
**Phase:** 125-ls-formatting
**Areas discussed:** Message channel & noise, Actionable messages, Interim gaps 125→127, Range & on-save scope

Todos: 6 keyword matches reviewed; "Fold none" selected.

---

## Message channel & noise

| Question | Options | Selected |
|----------|---------|----------|
| Channel for failures | Toast once, then log / Toast every time / Log only + status | Toast once, then log |
| Dedup reset | Per document+version / Per connection / Mixed by kind | Mixed by kind |
| Severity | Warning for all / Error for config/content / You decide | Warning for all |
| Interop not connected | No popup, log only / Own message once per connection | No popup, log only |

**Notes:** The server cannot distinguish Format Document from format-on-save; dedup carries the noise control.

---

## Actionable messages

| Question | Options | Selected |
|----------|---------|----------|
| Open Settings mechanism | Server prompt + bbj/ notification / Client-side message in VS Code | Server prompt + bbj/ notification |
| Settings view | Filter to bbj.formatter / First bad key | Filter to bbj.formatter |
| Mixed-numbering jump | Button in message / Jump immediately / Diagnostic on the line | Button in message |
| Non-blocking | Fire-and-forget / Something else | Fire-and-forget |

---

## Interim gaps 125→127

| Question | Options | Selected |
|----------|---------|----------|
| DENUM-needed before 126 | Point to Denumber command / Log only | Point to Denumber command |
| Old `splitSingleLineIF` key | Map it now in the LS / Ignore until 127 | Map it now |
| 11 undeclared keys | Defaults but honour set values / Defaults only | Defaults but honour set values |
| Older-BBj wording | Short / With upgrade hint / You decide | Short |

---

## Range & on-save scope

| Question | Options | Selected |
|----------|---------|----------|
| Snapped selection edit | Accept expanded edit / Clip to selection | Accept expanded edit |
| Program-lane warm-up | Measure first, then decide / Warm on first BBj doc open / Stay lazy | Measure first, then decide |
| Dropped format-on-save | Silent / Log at info | Silent |
| formatOnSaveMode: modifications | Normal range format / Document it only | Normal range format |

---

## Claude's Discretion

- Module names/split, notification method name, dedup state location, message texts other than the two fixed ones, IntelliJ switch form, FMT-12 exclusion mechanics.

## Deferred Ideas

- Optional Phase 130 doc note on `formatOnSaveMode: modifications`.
