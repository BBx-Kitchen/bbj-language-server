/**
 * Type declarations for the Java interop test harness. This module holds types only — no
 * runtime declarations, no side effects at import, and no import from the language server's own
 * generated AST types: the harness talks to the raw peer wire, not the generated Langium AST.
 */
import type { MessageConnection, RequestType, ResponseError } from 'vscode-jsonrpc/node.js';

// ─── JSON-RPC request param shapes ──────────────────────────────────────────

export interface ClassPathInfoParams { classPathEntries: string[] }
export interface ClassInfoParams { className: string }
export interface PackageInfoParams { packageName: string }

// ─── Wire DTOs — the raw peer response shape, never the generated AST types ─
// (the wire calls the flag `isDeprecated`; the AST remaps it to `deprecated`). Every property is
// optional, because checking whether the peer actually sent it is the harness's whole purpose.

export interface ParameterInfoDto {
    name?: string;
    type?: string;
}

export interface MethodInfoDto {
    name?: string;
    returnType?: string;
    parameters?: ParameterInfoDto[];
    isStatic?: boolean;
    isDeprecated?: boolean;
}

export interface FieldInfoDto {
    name?: string;
    type?: string;
    isStatic?: boolean;
    isDeprecated?: boolean;
}

export interface ClassInfoDto {
    name?: string;
    packageName?: string;
    error?: unknown;
    fields?: FieldInfoDto[];
    methods?: MethodInfoDto[];
    constructors?: MethodInfoDto[];
    isDeprecated?: boolean;
}

export interface PackageInfoDto {
    packageName?: string;
}

// ─── Test result types ──────────────────────────────────────────────────────

export type TestStatus = 'pass' | 'fail' | 'error';

export interface FieldCheck {
    field: string;
    expected: string;
    actual: string;
    present: boolean;
    typeMatch: boolean;
}

export interface Assertion {
    description: string;
    passed: boolean;
    detail?: string;
}

export interface TestResult {
    name: string;
    method: string;
    status: TestStatus;
    request: unknown;
    response: unknown;
    fieldChecks: FieldCheck[];
    assertions: Assertion[];
    durationMs: number;
    errorMessage?: string;
}

// ─── Field presence matrix row ──────────────────────────────────────────────

export interface MatrixRow {
    className: string;
    isStatic: { methods: string; fields: string };
    isDeprecated: { methods: string; fields: string; class: string };
    constructors: string;
    hasName: boolean;
    hasReturnType: boolean;
    hasType: boolean;
    hasParameters: boolean;
    hasPackageName: boolean;
}

// ─── Case outcome types (the opt-in peer-error path) ────────────────────────

export interface ResponseOutcome<R> {
    kind: 'response';
    value: R;
}

export interface PeerErrorOutcome {
    kind: 'peer-error';
    error: ResponseError;
}

export type CaseOutcome<R = unknown> = ResponseOutcome<R> | PeerErrorOutcome;

// ─── Case records and the runnable case shape ───────────────────────────────

export interface CaseRecord {
    name: string;
    request: RequestType<unknown, unknown, null>;
    params: unknown;
    validate: (outcome: unknown, checks: FieldCheck[], assertions: Assertion[]) => void;
    inMatrix?: boolean;
    acceptsPeerError?: boolean;
}

export interface CaseRunnable {
    name: string;
    inMatrix?: boolean;
    run: (conn: MessageConnection) => Promise<TestResult>;
}

// ─── Gate verdict types ──────────────────────────────────────────────────────

export interface CriticalFailure {
    caseName: string;
    field: string;
    present: boolean;
    typeMatch: boolean;
}

export interface GateVerdict {
    passCount: number;
    failCount: number;
    errorCount: number;
    criticalFailures: CriticalFailure[];
    exitCode: number;
}
