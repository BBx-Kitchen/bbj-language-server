/**
 * The Java interop test harness's request scaffold: the JSON-RPC request types, the connection
 * helper, the field-check helpers each case's validator uses, and the one request scaffold every
 * case runs through. No side effects at import — nothing here parses arguments, connects on its
 * own, or writes a file; run-tests.ts is the only place that does any of those.
 */
import { Socket } from 'node:net';
import {
    createMessageConnection,
    ErrorCodes,
    RequestType,
    ResponseError,
    SocketMessageReader,
    SocketMessageWriter,
    type MessageConnection,
} from 'vscode-jsonrpc/node.js';
import type {
    Assertion,
    CaseOutcome,
    CaseRecord,
    CaseRunnable,
    ClassInfoDto,
    ClassInfoParams,
    ClassPathInfoParams,
    FieldCheck,
    PackageInfoDto,
    PackageInfoParams,
    TestResult,
    TestStatus,
} from './types.js';

// ─── JSON-RPC request types (mirrors java-interop.ts) ───────────────────────

export const loadClasspathRequest = new RequestType<ClassPathInfoParams, boolean, null>('loadClasspath');
export const getClassInfoRequest = new RequestType<ClassInfoParams, ClassInfoDto, null>('getClassInfo');
export const getClassInfosRequest = new RequestType<PackageInfoParams, ClassInfoDto[], null>('getClassInfos');
export const getTopLevelPackagesRequest = new RequestType<null, PackageInfoDto[], null>('getTopLevelPackages');

// ─── Helpers ────────────────────────────────────────────────────────────────

export function typeOf(v: unknown): string {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (Array.isArray(v)) return 'array';
    return typeof v;
}

export function checkField(obj: unknown, field: string, expectedType: string): FieldCheck {
    const val = (obj as Record<string, unknown> | null | undefined)?.[field];
    const actualType = typeOf(val);
    return {
        field,
        expected: expectedType,
        actual: actualType,
        present: val !== undefined && val !== null,
        typeMatch: actualType === expectedType,
    };
}

export function assert(description: string, condition: boolean, detail?: string): Assertion {
    return { description, passed: condition, detail };
}

export function countWhere<T>(arr: T[] | undefined, predicate: (item: T) => boolean): number {
    return arr?.filter(predicate).length ?? 0;
}

export function validateClassFields(cls: unknown, checks: FieldCheck[]): void {
    checks.push(checkField(cls, 'name', 'string'));
    checks.push(checkField(cls, 'packageName', 'string'));
    checks.push(checkField(cls, 'fields', 'array'));
    checks.push(checkField(cls, 'methods', 'array'));
    checks.push(checkField(cls, 'constructors', 'array'));
    checks.push(checkField(cls, 'isDeprecated', 'boolean'));
}

export function validateMethodFields(method: unknown, checks: FieldCheck[], prefix: string): void {
    checks.push({ ...checkField(method, 'name', 'string'), field: `${prefix}.name` });
    checks.push({ ...checkField(method, 'returnType', 'string'), field: `${prefix}.returnType` });
    checks.push({ ...checkField(method, 'parameters', 'array'), field: `${prefix}.parameters` });
    checks.push({ ...checkField(method, 'isStatic', 'boolean'), field: `${prefix}.isStatic` });
    checks.push({ ...checkField(method, 'isDeprecated', 'boolean'), field: `${prefix}.isDeprecated` });
}

export function validateFieldFields(field: unknown, checks: FieldCheck[], prefix: string): void {
    checks.push({ ...checkField(field, 'name', 'string'), field: `${prefix}.name` });
    checks.push({ ...checkField(field, 'type', 'string'), field: `${prefix}.type` });
    checks.push({ ...checkField(field, 'isStatic', 'boolean'), field: `${prefix}.isStatic` });
    checks.push({ ...checkField(field, 'isDeprecated', 'boolean'), field: `${prefix}.isDeprecated` });
}

export function validateParameterFields(param: unknown, checks: FieldCheck[], prefix: string): void {
    checks.push({ ...checkField(param, 'name', 'string'), field: `${prefix}.name` });
    checks.push({ ...checkField(param, 'type', 'string'), field: `${prefix}.type` });
}

// ─── Connection ─────────────────────────────────────────────────────────────

export async function connect(host: string, port: number, timeout: number): Promise<MessageConnection> {
    const socket = await new Promise<Socket>((res, rej) => {
        const s = new Socket();
        const timer = setTimeout(() => {
            s.destroy();
            rej(new Error(`Connection timed out after ${timeout}ms`));
        }, timeout);
        s.on('error', (err) => { clearTimeout(timer); rej(err); });
        s.on('ready', () => { clearTimeout(timer); res(s); });
        s.connect(port, host);
    });
    const conn = createMessageConnection(
        new SocketMessageReader(socket),
        new SocketMessageWriter(socket),
    );
    // A dropped socket only fires this event; without disposing here, any request already
    // in flight would stay pending forever instead of rejecting.
    conn.onClose(() => conn.dispose());
    conn.listen();
    return conn;
}

// ─── Case definition, status derivation and peer-error classification ──────

export function defineCase(record: CaseRecord): CaseRunnable {
    return {
        name: record.name,
        inMatrix: record.inMatrix,
        run: (conn: MessageConnection) => runRequest(conn, record),
    };
}

/**
 * A response's status is derived from its field checks and assertions alone: fail when any
 * field check is not both present and correctly typed, or any assertion did not pass; pass
 * otherwise. This is the only place a case's status is decided.
 */
export function deriveStatus(fieldChecks: FieldCheck[], assertions: Assertion[]): TestStatus {
    const fieldsOk = fieldChecks.every(c => c.present && c.typeMatch);
    const assertionsOk = assertions.every(a => a.passed);
    return fieldsOk && assertionsOk ? 'pass' : 'fail';
}

/**
 * True only for a vscode-jsonrpc ResponseError whose code is not one of the four transport
 * codes vscode-jsonrpc itself uses for a dropped connection, a write/read failure, or a
 * request made after dispose. Only such a genuine peer reply may satisfy an opted-in case's
 * rejection path; a transport failure never can.
 */
export function isPeerErrorReply(err: unknown): err is ResponseError {
    if (!(err instanceof ResponseError)) {
        return false;
    }
    const transportCodes: number[] = [
        ErrorCodes.MessageWriteError,
        ErrorCodes.MessageReadError,
        ErrorCodes.PendingResponseRejected,
        ErrorCodes.ConnectionInactive,
    ];
    return !transportCodes.includes(err.code);
}

function toErrorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

/**
 * The one request scaffold every case runs through. Sends exactly one request, times it, and
 * lets `deriveStatus` alone decide pass or fail — no case builds its own result. A rejection
 * is `error` unless the record opts in via `acceptsPeerError` and the rejection is a genuine
 * peer error reply (`isPeerErrorReply`), in which case the validator sees the outcome and its
 * status is derived the same way, never hand-built.
 */
export async function runRequest(conn: MessageConnection, record: CaseRecord): Promise<TestResult> {
    const start = performance.now();
    try {
        const result = await conn.sendRequest(record.request, record.params);
        const duration = performance.now() - start;
        const fieldChecks: FieldCheck[] = [];
        const assertions: Assertion[] = [];
        const outcome: unknown = record.acceptsPeerError
            ? ({ kind: 'response', value: result } satisfies CaseOutcome<unknown>)
            : result;
        try {
            record.validate(outcome, fieldChecks, assertions);
        } catch (validationErr: unknown) {
            assertions.push(assert(`Validation threw: ${toErrorMessage(validationErr)}`, false));
        }
        return {
            name: record.name,
            method: record.request.method,
            status: deriveStatus(fieldChecks, assertions),
            request: record.params,
            response: result,
            fieldChecks,
            assertions,
            durationMs: duration,
        };
    } catch (err: unknown) {
        const duration = performance.now() - start;
        if (record.acceptsPeerError && isPeerErrorReply(err)) {
            const fieldChecks: FieldCheck[] = [];
            const assertions: Assertion[] = [];
            const outcome: CaseOutcome<unknown> = { kind: 'peer-error', error: err };
            try {
                record.validate(outcome, fieldChecks, assertions);
            } catch (validationErr: unknown) {
                assertions.push(assert(`Validation threw: ${toErrorMessage(validationErr)}`, false));
            }
            return {
                name: record.name,
                method: record.request.method,
                status: deriveStatus(fieldChecks, assertions),
                request: record.params,
                response: null,
                fieldChecks,
                assertions,
                durationMs: duration,
                errorMessage: toErrorMessage(err),
            };
        }
        return {
            name: record.name,
            method: record.request.method,
            status: 'error',
            request: record.params,
            response: null,
            fieldChecks: [],
            assertions: [],
            durationMs: duration,
            errorMessage: toErrorMessage(err),
        };
    }
}
