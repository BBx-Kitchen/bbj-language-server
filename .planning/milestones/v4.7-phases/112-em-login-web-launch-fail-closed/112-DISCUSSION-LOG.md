# Phase 112: EM Login & Web Launch Fail Closed - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-27
**Phase:** 112-em-login-web-launch-fail-closed
**Areas discussed:** EM failure reporting, Missing-credential path, Token expiry parity, Commands.cjs test harness

---

## EM failure reporting

| Option | Description | Selected |
|--------|-------------|----------|
| MSGBOX + non-zero exit | Dialog in both IDEs plus an exit code the IDE logs | ✓ |
| MSGBOX only | Dialog only, clean exit | |
| Exit code only | No dialog; IDE reports without step detail | |

| Option | Description | Selected |
|--------|-------------|----------|
| Step + BBj error text | Step name plus ERRMES text, no credentials | ✓ |
| Step name only | Shorter | |

| Option | Description | Selected |
|--------|-------------|----------|
| Listed calls + getApplications | Roadmap list plus the app lookup loop; setters unguarded | ✓ |
| Only the roadmap list | The six calls in criterion 2 | |
| Every call incl. setters | Also setString/setBoolean | |

| Option | Description | Selected |
|--------|-------------|----------|
| Own label per step | err= label per call, shared reporter | ✓ |
| One handler + step variable | Single label, step! set before each call | |

**User's choice:** all recommended options.

---

## Missing-credential path

| Option | Description | Selected |
|--------|-------------|----------|
| Both non-empty | Empty username or password goes to login_failed | |
| Username only | Allow empty password, no defaults | |
| Other (free text) | "empty password tries the universal default admin123" | ✓ |

**Clarification:** this conflicted with SEC-12 / criterion 1, so Claude asked. The user said:
"1. but only if "admin" was given as the user. We also want to propose admin on IDE side as
user if nothing else was remembered. Demote SEC-12 to comply with this ruling."
Result: a username is required; `admin123` only for the exact user `admin` with an empty
password; SEC-12 and criterion 1 amended.

| Option | Description | Selected |
|--------|-------------|----------|
| Distinct message | Separate "no credentials supplied" text | |
| One 'Login Failed!' for both | Single message | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Remove it | Drop the bbj.web.username/password settings fallback in runWeb | ✓ |
| Keep it | Leave for later | |

| Option | Description | Selected |
|--------|-------------|----------|
| Remember last, else admin | Store last successful username (non-secret), pre-fill it | ✓ |
| Keep 'admin' as is | Hard-coded pre-fill, no remembering | |

| Option | Description | Selected |
|--------|-------------|----------|
| Exact 'admin' | Case-sensitive match for the admin123 default | ✓ |
| Any case | 'Admin'/'ADMIN' also match | |

---

## Token expiry parity

| Option | Description | Selected |
|--------|-------------|----------|
| Same rules as JwtValidity | 3 segments, integer exp, no skew; all else expired | ✓ |
| Looser: finite number exp | Accept decimals | |

| Option | Description | Selected |
|--------|-------------|----------|
| Empty signature segment | `header.payload.` is expired; IntelliJ parity with no change | ✓ |
| Also alg:none, both IDEs | Header inspection in VS Code and IntelliJ | |

| Option | Description | Selected |
|--------|-------------|----------|
| Own plain module | No vscode import, takes `now` | ✓ |
| Stay in extension.ts, exported | Test through the vscode mock | |

---

## Commands.cjs test harness

| Option | Description | Selected |
|--------|-------------|----------|
| vscode shim in require | Fake vscode in CJS resolution, load via createRequire | ✓ |
| Extract bodies to ESM | Like process-args.ts; overlaps REF-11 | |

| Option | Description | Selected |
|--------|-------------|----------|
| Replace with execution tests | Same assertions, called through the loaded module | ✓ |
| Keep both | Execution tests plus text scans | |

| Option | Description | Selected |
|--------|-------------|----------|
| Behaviour asserts + recorded report | Spy assertions per body, V8 run recorded, no threshold | ✓ |
| Enforced per-file threshold | Threshold in vitest.config.ts | |

| Option | Description | Selected |
|--------|-------------|----------|
| Source guard + UAT hand check | Guard admin123 placement and err= labels; UAT failure and success paths in both IDEs | ✓ |
| UAT hand check only | No automated check of web.bbj | |

---

## Claude's Discretion

- Message wording, label names, RELEASE code values
- Token module file and function names
- vscode shim mechanism and helper location
- Storage key for the remembered username

## Deferred Ideas

- alg:none header inspection in both IDEs
- Commands.cjs coverage threshold (Phase 114)
- Todos matched on keywords only: none folded (IntelliJ interop key mismatch, linking warm-up, Phase 97 follow-ups, peer-name escaping)
