/**
 * Java Interop Test Harness
 *
 * Connects to the live BBj Java interop service over JSON-RPC 2.0 (TCP),
 * exercises all 4 API methods, validates every critical field the LS depends on,
 * and generates a self-contained HTML report.
 *
 * Usage:
 *   cd bbj-vscode
 *   npm run interop-harness
 *   npm run interop-harness -- --host 192.168.1.100 --port 5008
 *   npm run interop-harness -- --output /tmp/report.html
 */

import { Socket } from 'node:net';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { parseArgs } from 'node:util';
import {
    createMessageConnection,
    SocketMessageReader,
    SocketMessageWriter,
    RequestType,
    ResponseError,
    ErrorCodes,
    type MessageConnection,
} from 'vscode-jsonrpc/node.js';

// ─── CLI args ───────────────────────────────────────────────────────────────

const { values: args } = parseArgs({
    options: {
        host: { type: 'string', default: '127.0.0.1' },
        port: { type: 'string', default: '5008' },
        output: { type: 'string' },
        timeout: { type: 'string', default: '15000' },
    },
    strict: true,
});

const HOST = args.host!;
const PORT = Number(args.port!);
const TIMEOUT = Number(args.timeout!);
const OUTPUT_PATH = args.output
    ? resolve(args.output)
    : resolve(dirname(new URL(import.meta.url).pathname), 'report.html');

// ─── JSON-RPC request types (mirrors java-interop.ts) ───────────────────────

interface ClassPathInfoParams { classPathEntries: string[] }
interface ClassInfoParams { className: string }
interface PackageInfoParams { packageName: string }

const loadClasspathRequest = new RequestType<ClassPathInfoParams, boolean, null>('loadClasspath');
const getClassInfoRequest = new RequestType<ClassInfoParams, any, null>('getClassInfo');
const getClassInfosRequest = new RequestType<PackageInfoParams, any[], null>('getClassInfos');
const getTopLevelPackagesRequest = new RequestType<null, PackageInfoParams[], null>('getTopLevelPackages');

// ─── Test result types ──────────────────────────────────────────────────────

type TestStatus = 'pass' | 'fail' | 'error';

interface FieldCheck {
    field: string;
    expected: string;
    actual: string;
    present: boolean;
    typeMatch: boolean;
}

interface Assertion {
    description: string;
    passed: boolean;
    detail?: string;
}

interface TestResult {
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

interface MatrixRow {
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function typeOf(v: unknown): string {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (Array.isArray(v)) return 'array';
    return typeof v;
}

function checkField(obj: any, field: string, expectedType: string): FieldCheck {
    const val = obj?.[field];
    const actualType = typeOf(val);
    return {
        field,
        expected: expectedType,
        actual: actualType,
        present: val !== undefined && val !== null,
        typeMatch: actualType === expectedType,
    };
}

function assert(description: string, condition: boolean, detail?: string): Assertion {
    return { description, passed: condition, detail };
}

function countWhere(arr: any[] | undefined, predicate: (item: any) => boolean): number {
    return arr?.filter(predicate).length ?? 0;
}

// ─── Connection ─────────────────────────────────────────────────────────────

async function connect(host: string, port: number, timeout: number): Promise<MessageConnection> {
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

// ─── Case outcome types (opt-in peer-error path) ────────────────────────────

interface ResponseOutcome<R> {
    kind: 'response';
    value: R;
}

interface PeerErrorOutcome {
    kind: 'peer-error';
    error: ResponseError;
}

type CaseOutcome<R = any> = ResponseOutcome<R> | PeerErrorOutcome;

// ─── Case records and the shared request scaffold ───────────────────────────

interface CaseRecord {
    name: string;
    request: RequestType<any, any, null>;
    params: any;
    validate: (outcome: any, checks: FieldCheck[], assertions: Assertion[]) => void;
    inMatrix?: boolean;
    acceptsPeerError?: boolean;
}

interface CaseRunnable {
    name: string;
    inMatrix?: boolean;
    run: (conn: MessageConnection) => Promise<TestResult>;
}

function defineCase(record: CaseRecord): CaseRunnable {
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
function deriveStatus(fieldChecks: FieldCheck[], assertions: Assertion[]): TestStatus {
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
function isPeerErrorReply(err: unknown): err is ResponseError {
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

// ─── Critical fields and the exit gate ──────────────────────────────────────

/**
 * The one list of fields the language server depends on. The gate and the report both read this
 * constant; nothing else in the harness declares its own critical-field list.
 */
export const CRITICAL_FIELDS = [
    'isStatic', 'isDeprecated', 'constructors', 'name',
    'returnType', 'type', 'parameters', 'packageName',
] as const;

/**
 * The text after the last '.' in a field path, or the whole path when there is none. A field
 * check named `methods[0].returnType` has the final segment `returnType`.
 */
function finalSegment(path: string): string {
    const idx = path.lastIndexOf('.');
    return idx === -1 ? path : path.slice(idx + 1);
}

/**
 * True only when a field check's final path segment equals a CRITICAL_FIELDS entry exactly — no
 * substring matching, so a check on `returnType` never matches `type` and `packageName` never
 * matches `name`.
 */
function isCriticalFieldCheck(fieldCheck: FieldCheck): boolean {
    return (CRITICAL_FIELDS as readonly string[]).includes(finalSegment(fieldCheck.field));
}

interface CriticalFailure {
    caseName: string;
    field: string;
    present: boolean;
    typeMatch: boolean;
}

interface GateVerdict {
    passCount: number;
    failCount: number;
    errorCount: number;
    criticalFailures: CriticalFailure[];
    exitCode: number;
}

/**
 * The one place the run's overall pass/fail verdict and exit code are decided. A critical field
 * check counts as failed unless it is both present and correctly typed. exitCode is 1 when any
 * case failed or errored, or any critical field check failed; 0 otherwise. The connection-failure
 * path and the fatal handler keep exit code 2, decided outside this function.
 */
function evaluateGate(results: TestResult[]): GateVerdict {
    const passCount = results.filter(r => r.status === 'pass').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    const criticalFailures: CriticalFailure[] = [];
    for (const r of results) {
        for (const fc of r.fieldChecks) {
            if (isCriticalFieldCheck(fc) && !(fc.present && fc.typeMatch)) {
                criticalFailures.push({ caseName: r.name, field: fc.field, present: fc.present, typeMatch: fc.typeMatch });
            }
        }
    }

    const exitCode = (failCount > 0 || errorCount > 0 || criticalFailures.length > 0) ? 1 : 0;
    return { passCount, failCount, errorCount, criticalFailures, exitCode };
}

/**
 * The one request scaffold every case runs through. Sends exactly one request, times it, and
 * lets `deriveStatus` alone decide pass or fail — no case builds its own result. A rejection
 * is `error` unless the record opts in via `acceptsPeerError` and the rejection is a genuine
 * peer error reply (`isPeerErrorReply`), in which case the validator sees the outcome and its
 * status is derived the same way, never hand-built.
 */
async function runRequest(conn: MessageConnection, record: CaseRecord): Promise<TestResult> {
    const start = performance.now();
    try {
        const result = await conn.sendRequest(record.request, record.params);
        const duration = performance.now() - start;
        const fieldChecks: FieldCheck[] = [];
        const assertions: Assertion[] = [];
        const outcome: unknown = record.acceptsPeerError ? { kind: 'response', value: result } : result;
        try {
            record.validate(outcome, fieldChecks, assertions);
        } catch (validationErr: any) {
            assertions.push(assert(`Validation threw: ${validationErr?.message ?? String(validationErr)}`, false));
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
            } catch (validationErr: any) {
                assertions.push(assert(`Validation threw: ${validationErr?.message ?? String(validationErr)}`, false));
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
                errorMessage: err instanceof Error ? err.message : String(err),
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
            errorMessage: err instanceof Error ? err.message : String(err),
        };
    }
}

function validateClassFields(cls: any, checks: FieldCheck[]): void {
    checks.push(checkField(cls, 'name', 'string'));
    checks.push(checkField(cls, 'packageName', 'string'));
    checks.push(checkField(cls, 'fields', 'array'));
    checks.push(checkField(cls, 'methods', 'array'));
    checks.push(checkField(cls, 'constructors', 'array'));
    checks.push(checkField(cls, 'isDeprecated', 'boolean'));
}

function validateMethodFields(method: any, checks: FieldCheck[], prefix: string): void {
    checks.push({ ...checkField(method, 'name', 'string'), field: `${prefix}.name` });
    checks.push({ ...checkField(method, 'returnType', 'string'), field: `${prefix}.returnType` });
    checks.push({ ...checkField(method, 'parameters', 'array'), field: `${prefix}.parameters` });
    checks.push({ ...checkField(method, 'isStatic', 'boolean'), field: `${prefix}.isStatic` });
    checks.push({ ...checkField(method, 'isDeprecated', 'boolean'), field: `${prefix}.isDeprecated` });
}

function validateFieldFields(field: any, checks: FieldCheck[], prefix: string): void {
    checks.push({ ...checkField(field, 'name', 'string'), field: `${prefix}.name` });
    checks.push({ ...checkField(field, 'type', 'string'), field: `${prefix}.type` });
    checks.push({ ...checkField(field, 'isStatic', 'boolean'), field: `${prefix}.isStatic` });
    checks.push({ ...checkField(field, 'isDeprecated', 'boolean'), field: `${prefix}.isDeprecated` });
}

function validateParameterFields(param: any, checks: FieldCheck[], prefix: string): void {
    checks.push({ ...checkField(param, 'name', 'string'), field: `${prefix}.name` });
    checks.push({ ...checkField(param, 'type', 'string'), field: `${prefix}.type` });
}

function buildMatrixRow(cls: any): MatrixRow {
    const methods: any[] = cls?.methods ?? [];
    const fields: any[] = cls?.fields ?? [];
    const constructors: any[] = cls?.constructors ?? [];

    const staticMethods = countWhere(methods, m => m.isStatic !== undefined);
    const staticFields = countWhere(fields, f => f.isStatic !== undefined);
    const deprMethods = countWhere(methods, m => m.isDeprecated !== undefined);
    const deprFields = countWhere(fields, f => f.isDeprecated !== undefined);

    return {
        className: cls?.name ? `${cls.packageName ?? ''}.${cls.name}` : '(unknown)',
        isStatic: {
            methods: `${staticMethods}/${methods.length}`,
            fields: `${staticFields}/${fields.length}`,
        },
        isDeprecated: {
            methods: `${deprMethods}/${methods.length}`,
            fields: `${deprFields}/${fields.length}`,
            class: cls?.isDeprecated !== undefined ? String(cls.isDeprecated) : 'missing',
        },
        constructors: constructors.length > 0 ? `✓ (${constructors.length})` : (cls?.constructors !== undefined ? '✓ (0)' : '✗ missing'),
        hasName: cls?.name !== undefined,
        hasReturnType: methods.length === 0 || methods.some((m: any) => m.returnType !== undefined),
        hasType: fields.length === 0 || fields.some((f: any) => f.type !== undefined),
        hasParameters: methods.length === 0 || methods.some((m: any) => m.parameters !== undefined),
        hasPackageName: cls?.packageName !== undefined,
    };
}

// ─── Per-case validators ─────────────────────────────────────────────────────

function validateJavaLangString(cls: any, checks: FieldCheck[], asserts: Assertion[]): void {
    validateClassFields(cls, checks);
    if (cls?.methods?.length) {
        const first = cls.methods[0];
        validateMethodFields(first, checks, 'methods[0]');
        if (first?.parameters?.length) {
            validateParameterFields(first.parameters[0], checks, 'methods[0].parameters[0]');
        }
    }
    if (cls?.fields?.length) {
        validateFieldFields(cls.fields[0], checks, 'fields[0]');
    }
    if (cls?.constructors?.length) {
        validateMethodFields(cls.constructors[0], checks, 'constructors[0]');
    }

    const valueOf = cls?.methods?.find((m: any) => m.name === 'valueOf');
    asserts.push(assert('String.valueOf exists', !!valueOf));
    asserts.push(assert('String.valueOf isStatic=true', valueOf?.isStatic === true, `isStatic=${valueOf?.isStatic}`));

    const format = cls?.methods?.find((m: any) => m.name === 'format');
    asserts.push(assert('String.format exists', !!format));
    asserts.push(assert('String.format isStatic=true', format?.isStatic === true, `isStatic=${format?.isStatic}`));

    const join = cls?.methods?.find((m: any) => m.name === 'join');
    asserts.push(assert('String.join exists', !!join));
    asserts.push(assert('String.join isStatic=true', join?.isStatic === true, `isStatic=${join?.isStatic}`));

    const charAt = cls?.methods?.find((m: any) => m.name === 'charAt');
    asserts.push(assert('String.charAt exists', !!charAt));
    asserts.push(assert('String.charAt isStatic=false', charAt?.isStatic === false, `isStatic=${charAt?.isStatic}`));

    asserts.push(assert('Has constructors', (cls?.constructors?.length ?? 0) > 0, `count=${cls?.constructors?.length}`));
}

function validateJavaUtilHashMap(cls: any, checks: FieldCheck[], asserts: Assertion[]): void {
    validateClassFields(cls, checks);
    asserts.push(assert('Has constructors', (cls?.constructors?.length ?? 0) > 0, `count=${cls?.constructors?.length}`));
    if (cls?.constructors?.length) {
        const arities = cls.constructors.map((c: any) => c.parameters?.length ?? 0);
        const unique = new Set(arities);
        asserts.push(assert('Constructors have varying arity', unique.size > 1, `arities: ${arities.join(', ')}`));
        for (const ctor of cls.constructors) {
            validateMethodFields(ctor, checks, `constructor(${ctor.parameters?.length ?? '?'})`);
        }
    }
}

function validateJavaUtilDate(cls: any, checks: FieldCheck[], asserts: Assertion[]): void {
    validateClassFields(cls, checks);
    const deprecatedNames = ['getHours', 'getMinutes', 'getSeconds'];
    for (const name of deprecatedNames) {
        const method = cls?.methods?.find((m: any) => m.name === name);
        asserts.push(assert(`Date.${name} exists`, !!method));
        asserts.push(assert(`Date.${name} isDeprecated=true`, method?.isDeprecated === true, `isDeprecated=${method?.isDeprecated}`));
    }
    const deprecatedCount = countWhere(cls?.methods, (m: any) => m.isDeprecated === true);
    asserts.push(assert('Has deprecated methods', deprecatedCount > 0, `deprecated count=${deprecatedCount}`));
}

function validateJavaLangMath(cls: any, checks: FieldCheck[], asserts: Assertion[]): void {
    validateClassFields(cls, checks);
    const pi = cls?.fields?.find((f: any) => f.name === 'PI');
    asserts.push(assert('Math.PI exists', !!pi));
    asserts.push(assert('Math.PI isStatic=true', pi?.isStatic === true, `isStatic=${pi?.isStatic}`));
    asserts.push(assert('Math.PI type=double', pi?.type === 'double', `type=${pi?.type}`));

    const e = cls?.fields?.find((f: any) => f.name === 'E');
    asserts.push(assert('Math.E exists', !!e));
    asserts.push(assert('Math.E isStatic=true', e?.isStatic === true, `isStatic=${e?.isStatic}`));

    const abs = cls?.methods?.find((m: any) => m.name === 'abs');
    asserts.push(assert('Math.abs exists', !!abs));
    asserts.push(assert('Math.abs isStatic=true', abs?.isStatic === true, `isStatic=${abs?.isStatic}`));

    const staticMethodCount = countWhere(cls?.methods, (m: any) => m.isStatic === true);
    asserts.push(assert('Most methods are static', staticMethodCount > (cls?.methods?.length ?? 0) * 0.8,
        `${staticMethodCount}/${cls?.methods?.length ?? 0}`));

    // Math has a private constructor, so constructors should be empty or absent
    asserts.push(assert('No public constructors (private ctor)',
        (cls?.constructors?.length ?? 0) === 0, `count=${cls?.constructors?.length}`));
}

function validateJavaLangBoolean(cls: any, checks: FieldCheck[], asserts: Assertion[]): void {
    validateClassFields(cls, checks);
    const trueField = cls?.fields?.find((f: any) => f.name === 'TRUE');
    asserts.push(assert('Boolean.TRUE exists', !!trueField));
    asserts.push(assert('Boolean.TRUE isStatic=true', trueField?.isStatic === true, `isStatic=${trueField?.isStatic}`));

    const falseField = cls?.fields?.find((f: any) => f.name === 'FALSE');
    asserts.push(assert('Boolean.FALSE exists', !!falseField));
    asserts.push(assert('Boolean.FALSE isStatic=true', falseField?.isStatic === true, `isStatic=${falseField?.isStatic}`));

    const parseBoolean = cls?.methods?.find((m: any) => m.name === 'parseBoolean');
    asserts.push(assert('Boolean.parseBoolean exists', !!parseBoolean));
    asserts.push(assert('Boolean.parseBoolean isStatic=true', parseBoolean?.isStatic === true,
        `isStatic=${parseBoolean?.isStatic}`));
}

function validateJavaSqlConnection(cls: any, checks: FieldCheck[], asserts: Assertion[]): void {
    validateClassFields(cls, checks);
    asserts.push(assert('Is interface (no constructors)',
        (cls?.constructors?.length ?? 0) === 0, `count=${cls?.constructors?.length}`));
    asserts.push(assert('Has methods', (cls?.methods?.length ?? 0) > 0, `count=${cls?.methods?.length}`));
}

function validateJavaLangSystem(cls: any, checks: FieldCheck[], asserts: Assertion[]): void {
    validateClassFields(cls, checks);
    for (const fieldName of ['out', 'err', 'in']) {
        const f = cls?.fields?.find((f: any) => f.name === fieldName);
        asserts.push(assert(`System.${fieldName} exists`, !!f));
        asserts.push(assert(`System.${fieldName} isStatic=true`, f?.isStatic === true, `isStatic=${f?.isStatic}`));
    }
    const gc = cls?.methods?.find((m: any) => m.name === 'gc');
    asserts.push(assert('System.gc exists', !!gc));
    asserts.push(assert('System.gc isStatic=true', gc?.isStatic === true, `isStatic=${gc?.isStatic}`));
}

function validateJavaUtilMapEntry(cls: any, checks: FieldCheck[], asserts: Assertion[]): void {
    validateClassFields(cls, checks);
    asserts.push(assert('Name contains Entry', cls?.name?.includes('Entry'), `name=${cls?.name}`));
    const getKey = cls?.methods?.find((m: any) => m.name === 'getKey');
    asserts.push(assert('Map.Entry.getKey exists', !!getKey));
    const getValue = cls?.methods?.find((m: any) => m.name === 'getValue');
    asserts.push(assert('Map.Entry.getValue exists', !!getValue));
}

/**
 * True only when `value` is a non-null object with an `error` property whose value is not
 * undefined, null, false or the empty string — the same signal `java-interop.ts` reads on a
 * resolved class to decide whether to skip it (#514/D-02).
 */
function hasErrorField(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const err = (value as { error?: unknown }).error;
    return err !== undefined && err !== null && err !== false && err !== '';
}

function validatePrimitiveInt(response: any, _checks: FieldCheck[], asserts: Assertion[]): void {
    asserts.push(assert('Error response or a class named int',
        hasErrorField(response) || response?.name === 'int',
        `error=${response?.error}, name=${response?.name}`));
}

function validateNonexistentClass(outcome: CaseOutcome<unknown>, _checks: FieldCheck[], asserts: Assertion[]): void {
    const isError = outcome.kind === 'peer-error' ? true : hasErrorField(outcome.value);
    const detail = outcome.kind === 'peer-error'
        ? `error code=${outcome.error.code}, message=${outcome.error.message}`
        : `value=${JSON.stringify(outcome.value)}`;
    asserts.push(assert('Peer signals an error (error field or JSON-RPC error reply)', isError, detail));
}

function validateJavaLangDeprecated(cls: any, checks: FieldCheck[], asserts: Assertion[]): void {
    validateClassFields(cls, checks);
    asserts.push(assert('Name contains Deprecated', cls?.name?.includes('Deprecated'), `name=${cls?.name}`));
}

function validateGetClassInfosJavaLang(result: any, checks: FieldCheck[], assertions: Assertion[]): void {
    assertions.push(assert('Returns array', Array.isArray(result), `type=${typeOf(result)}`));
    if (!Array.isArray(result)) {
        return;
    }
    assertions.push(assert('Contains classes', result.length > 0, `count=${result.length}`));

    const names = result.map((c: any) => c.name);
    for (const expected of ['String', 'Integer', 'Boolean', 'Object', 'System']) {
        const found = names.some((n: string) => n === expected || n === `java.lang.${expected}`);
        assertions.push(assert(`Contains ${expected}`, found, `found: ${found}`));
    }

    if (result.length > 0) {
        validateClassFields(result[0], checks);
    }
}

function validateGetClassInfosJavaUtil(result: any, _checks: FieldCheck[], assertions: Assertion[]): void {
    const isArray = Array.isArray(result);
    const names: string[] = isArray ? result.map((c: any) => c?.name) : [];
    const missing = ['HashMap', 'ArrayList', 'Date'].filter(expected =>
        !names.some(n => n === expected || n === `java.util.${expected}`));
    assertions.push(assert('Returns an array that is empty or contains HashMap, ArrayList and Date',
        isArray && (result.length === 0 || missing.length === 0),
        `type=${typeOf(result)}, count=${isArray ? result.length : 0}, missing=${missing.join(', ') || 'none'}`));
}

function validateGetClassInfosComBasisStartupType(result: any, _checks: FieldCheck[], assertions: Assertion[]): void {
    const isArray = Array.isArray(result);
    const names: string[] = isArray ? result.map((c: any) => c?.name) : [];
    const hasBBjClass = names.some(n => typeof n === 'string' && n.includes('BBj'));
    assertions.push(assert('Returns an array that is empty or contains a BBj class',
        isArray && (result.length === 0 || hasBBjClass),
        `type=${typeOf(result)}, count=${isArray ? result.length : 0}, sample=${names.slice(0, 5).join(', ')}`));
}

function validateGetTopLevelPackages(result: any, _checks: FieldCheck[], assertions: Assertion[]): void {
    assertions.push(assert('Returns array', Array.isArray(result), `type=${typeOf(result)}`));
    if (!Array.isArray(result)) {
        return;
    }
    assertions.push(assert('Contains packages', result.length > 0, `count=${result.length}`));

    const packageNames = result.map((p: any) => p.packageName);
    const hasJavaLang = packageNames.some((n: string) => n === 'java' || n === 'java.lang');
    assertions.push(assert('Contains java.lang', hasJavaLang,
        `sample: ${packageNames.filter((n: string) => n.startsWith('java')).slice(0, 5).join(', ')}`));
}

function validateLoadClasspathEmpty(result: any, _checks: FieldCheck[], assertions: Assertion[]): void {
    assertions.push(assert('Returns boolean', typeof result === 'boolean', `type=${typeOf(result)}`));
    assertions.push(assert('Returns true', result === true, `value=${result}`));
}

function validateLoadClasspathFilePrefix(outcome: CaseOutcome<unknown>, _checks: FieldCheck[], assertions: Assertion[]): void {
    const isBooleanResponse = outcome.kind === 'response' && typeof outcome.value === 'boolean';
    const detail = outcome.kind === 'peer-error'
        ? `error code=${outcome.error.code}, message=${outcome.error.message}`
        : `type=${typeOf(outcome.value)}, value=${outcome.value}`;
    assertions.push(assert('Returns a boolean or rejects with a JSON-RPC error reply',
        outcome.kind === 'peer-error' || isBooleanResponse, detail));
}

// ─── Define all test cases ──────────────────────────────────────────────────

function defineTests(conn: MessageConnection): CaseRunnable[] {
    const records: CaseRecord[] = [
        {
            name: '1. java.lang.String — static methods, constructors',
            request: getClassInfoRequest,
            params: { className: 'java.lang.String' },
            validate: validateJavaLangString,
            inMatrix: true,
        },
        {
            name: '2. java.util.HashMap — constructors with varying arity',
            request: getClassInfoRequest,
            params: { className: 'java.util.HashMap' },
            validate: validateJavaUtilHashMap,
            inMatrix: true,
        },
        {
            name: '3. java.util.Date — deprecated methods',
            request: getClassInfoRequest,
            params: { className: 'java.util.Date' },
            validate: validateJavaUtilDate,
            inMatrix: true,
        },
        {
            name: '4. java.lang.Math — static methods/fields, private constructor',
            request: getClassInfoRequest,
            params: { className: 'java.lang.Math' },
            validate: validateJavaLangMath,
            inMatrix: true,
        },
        {
            name: '5. java.lang.Boolean — static fields (TRUE, FALSE)',
            request: getClassInfoRequest,
            params: { className: 'java.lang.Boolean' },
            validate: validateJavaLangBoolean,
            inMatrix: true,
        },
        {
            name: '6. java.sql.Connection — interface, no constructors',
            request: getClassInfoRequest,
            params: { className: 'java.sql.Connection' },
            validate: validateJavaSqlConnection,
            inMatrix: true,
        },
        {
            name: '7. java.lang.System — static fields (out, err, in)',
            request: getClassInfoRequest,
            params: { className: 'java.lang.System' },
            validate: validateJavaLangSystem,
            inMatrix: true,
        },
        {
            name: '8. java.util.Map$Entry — nested/inner class',
            request: getClassInfoRequest,
            params: { className: 'java.util.Map$Entry' },
            validate: validateJavaUtilMapEntry,
            inMatrix: true,
        },
        {
            name: '9. Primitive type — int',
            request: getClassInfoRequest,
            params: { className: 'int' },
            validate: validatePrimitiveInt,
        },
        {
            name: '10. Non-existent class — error handling',
            request: getClassInfoRequest,
            params: { className: 'com.nonexistent.Fake' },
            validate: validateNonexistentClass,
            acceptsPeerError: true,
        },
        {
            name: '11. java.lang.Deprecated — annotation type',
            request: getClassInfoRequest,
            params: { className: 'java.lang.Deprecated' },
            validate: validateJavaLangDeprecated,
            inMatrix: true,
        },
        {
            name: '12. getClassInfos — java.lang',
            request: getClassInfosRequest,
            params: { packageName: 'java.lang' },
            validate: validateGetClassInfosJavaLang,
        },
        {
            name: '13. getClassInfos — java.util',
            request: getClassInfosRequest,
            params: { packageName: 'java.util' },
            validate: validateGetClassInfosJavaUtil,
        },
        {
            name: '14. getClassInfos — com.basis.startup.type',
            request: getClassInfosRequest,
            params: { packageName: 'com.basis.startup.type' },
            validate: validateGetClassInfosComBasisStartupType,
        },
        {
            name: '15. getTopLevelPackages',
            request: getTopLevelPackagesRequest,
            params: null,
            validate: validateGetTopLevelPackages,
        },
        {
            name: '16. loadClasspath — empty',
            request: loadClasspathRequest,
            params: { classPathEntries: [] },
            validate: validateLoadClasspathEmpty,
        },
        {
            name: '17. loadClasspath — file: prefix',
            request: loadClasspathRequest,
            params: { classPathEntries: ['file:/nonexistent/path.jar'] },
            validate: validateLoadClasspathFilePrefix,
            acceptsPeerError: true,
        },
    ];
    return records.map(defineCase);
}

// ─── HTML report generation ─────────────────────────────────────────────────

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function syntaxHighlightJson(json: string): string {
    return json.replace(
        /("(?:\\.|[^"\\])*")\s*:/g,
        '<span class="json-key">$1</span>:',
    ).replace(
        /:\s*("(?:\\.|[^"\\])*")/g,
        ': <span class="json-string">$1</span>',
    ).replace(
        /:\s*(\d+(?:\.\d+)?)\b/g,
        ': <span class="json-number">$1</span>',
    ).replace(
        /:\s*(true|false)\b/g,
        ': <span class="json-bool">$1</span>',
    ).replace(
        /:\s*(null)\b/g,
        ': <span class="json-null">$1</span>',
    );
}

function truncateJson(obj: unknown, maxDepth: number = 3): unknown {
    if (maxDepth <= 0) return '...';
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
        if (obj.length > 5) {
            return [...obj.slice(0, 5).map(i => truncateJson(i, maxDepth - 1)), `... (${obj.length - 5} more)`];
        }
        return obj.map(i => truncateJson(i, maxDepth - 1));
    }
    const result: Record<string, unknown> = {};
    const keys = Object.keys(obj);
    for (const key of keys) {
        result[key] = truncateJson((obj as any)[key], maxDepth - 1);
    }
    return result;
}

function statusBadge(status: TestStatus): string {
    const colors: Record<TestStatus, string> = {
        pass: '#22c55e',
        fail: '#ef4444',
        error: '#f59e0b',
    };
    const labels: Record<TestStatus, string> = {
        pass: 'PASS',
        fail: 'FAIL',
        error: 'ERROR',
    };
    return `<span style="background:${colors[status]};color:#fff;padding:2px 8px;border-radius:4px;font-size:0.85em;font-weight:600;">${labels[status]}</span>`;
}

function generateReport(results: TestResult[], matrixRows: MatrixRow[], host: string, port: number, verdict: GateVerdict): string {
    const { passCount, failCount, errorCount } = verdict;
    const total = results.length;
    const totalDuration = results.reduce((s, r) => s + r.durationMs, 0);
    const timestamp = new Date().toISOString();

    let matrixHtml = '';
    if (matrixRows.length > 0) {
        matrixHtml = `
        <h2>Field Presence Matrix</h2>
        <p class="subtitle">Shows which critical fields the Java interop service provides for each tested class. Gated fields: ${escapeHtml(CRITICAL_FIELDS.join(', '))}.</p>
        <div class="table-wrap">
        <table class="matrix">
            <thead>
                <tr>
                    <th>Class</th>
                    <th>isStatic (methods)</th>
                    <th>isStatic (fields)</th>
                    <th>isDeprecated (methods)</th>
                    <th>isDeprecated (fields)</th>
                    <th>isDeprecated (class)</th>
                    <th>constructors</th>
                    <th>name</th>
                    <th>returnType</th>
                    <th>type</th>
                    <th>parameters</th>
                    <th>packageName</th>
                </tr>
            </thead>
            <tbody>
                ${matrixRows.map(row => `
                <tr>
                    <td class="class-name">${escapeHtml(row.className)}</td>
                    <td class="${row.isStatic.methods.startsWith('0/') && !row.isStatic.methods.startsWith('0/0') ? 'cell-warn' : 'cell-ok'}">${escapeHtml(row.isStatic.methods)}</td>
                    <td class="${row.isStatic.fields.startsWith('0/') && !row.isStatic.fields.startsWith('0/0') ? 'cell-warn' : 'cell-ok'}">${escapeHtml(row.isStatic.fields)}</td>
                    <td class="${row.isDeprecated.methods.startsWith('0/') && !row.isDeprecated.methods.startsWith('0/0') ? 'cell-warn' : 'cell-ok'}">${escapeHtml(row.isDeprecated.methods)}</td>
                    <td class="${row.isDeprecated.fields.startsWith('0/') && !row.isDeprecated.fields.startsWith('0/0') ? 'cell-warn' : 'cell-ok'}">${escapeHtml(row.isDeprecated.fields)}</td>
                    <td class="${row.isDeprecated.class === 'missing' ? 'cell-warn' : 'cell-ok'}">${escapeHtml(row.isDeprecated.class)}</td>
                    <td class="${row.constructors.startsWith('✗') ? 'cell-warn' : 'cell-ok'}">${escapeHtml(row.constructors)}</td>
                    <td class="${row.hasName ? 'cell-ok' : 'cell-warn'}">${row.hasName ? '✓' : '✗'}</td>
                    <td class="${row.hasReturnType ? 'cell-ok' : 'cell-warn'}">${row.hasReturnType ? '✓' : '✗'}</td>
                    <td class="${row.hasType ? 'cell-ok' : 'cell-warn'}">${row.hasType ? '✓' : '✗'}</td>
                    <td class="${row.hasParameters ? 'cell-ok' : 'cell-warn'}">${row.hasParameters ? '✓' : '✗'}</td>
                    <td class="${row.hasPackageName ? 'cell-ok' : 'cell-warn'}">${row.hasPackageName ? '✓' : '✗'}</td>
                </tr>`).join('')}
            </tbody>
        </table>
        </div>`;
    }

    const testSections = results.map(r => {
        const requestJson = escapeHtml(JSON.stringify(r.request, null, 2));
        const responsePreview = truncateJson(r.response, 3);
        const responseJson = escapeHtml(JSON.stringify(responsePreview, null, 2));

        const fieldCheckRows = r.fieldChecks.length > 0
            ? `<table class="field-table">
                <thead><tr><th>Field</th><th>Expected</th><th>Actual</th><th>Present</th><th>Type Match</th><th>Critical</th></tr></thead>
                <tbody>${r.fieldChecks.map(fc => `
                    <tr class="${fc.present && fc.typeMatch ? '' : 'row-warn'}">
                        <td><code>${escapeHtml(fc.field)}</code></td>
                        <td>${escapeHtml(fc.expected)}</td>
                        <td>${escapeHtml(fc.actual)}</td>
                        <td>${fc.present ? '✓' : '✗'}</td>
                        <td>${fc.typeMatch ? '✓' : '✗'}</td>
                        <td>${isCriticalFieldCheck(fc) ? '✓' : ''}</td>
                    </tr>`).join('')}
                </tbody></table>`
            : '';

        const assertionRows = r.assertions.length > 0
            ? `<table class="assertion-table">
                <thead><tr><th>Assertion</th><th>Result</th><th>Detail</th></tr></thead>
                <tbody>${r.assertions.map(a => `
                    <tr class="${a.passed ? '' : 'row-warn'}">
                        <td>${escapeHtml(a.description)}</td>
                        <td>${a.passed ? '✓ Pass' : '✗ Fail'}</td>
                        <td>${a.detail ? escapeHtml(a.detail) : ''}</td>
                    </tr>`).join('')}
                </tbody></table>`
            : '';

        return `
        <details ${r.status !== 'pass' ? 'open' : ''}>
            <summary>
                ${statusBadge(r.status)}
                <strong>${escapeHtml(r.name)}</strong>
                <span class="method-tag">${escapeHtml(r.method)}</span>
                <span class="duration">${r.durationMs.toFixed(0)}ms</span>
                ${r.errorMessage ? `<span class="error-msg">${escapeHtml(r.errorMessage)}</span>` : ''}
            </summary>
            <div class="test-body">
                <h4>Request</h4>
                <pre class="json">${syntaxHighlightJson(requestJson)}</pre>

                <details>
                    <summary>Response (click to expand)</summary>
                    <pre class="json">${syntaxHighlightJson(responseJson)}</pre>
                </details>

                ${fieldCheckRows ? `<h4>Field Validation</h4>${fieldCheckRows}` : ''}
                ${assertionRows ? `<h4>Assertions</h4>${assertionRows}` : ''}
            </div>
        </details>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Java Interop Test Report</title>
<style>
:root {
    --bg: #ffffff;
    --fg: #1a1a2e;
    --card-bg: #f8f9fa;
    --border: #dee2e6;
    --subtle: #6c757d;
    --pass: #22c55e;
    --fail: #ef4444;
    --warn: #f59e0b;
    --code-bg: #f1f3f5;
    --json-key: #0550ae;
    --json-string: #0a3069;
    --json-number: #0550ae;
    --json-bool: #cf222e;
    --json-null: #6c757d;
}

@media (prefers-color-scheme: dark) {
    :root {
        --bg: #0d1117;
        --fg: #c9d1d9;
        --card-bg: #161b22;
        --border: #30363d;
        --subtle: #8b949e;
        --code-bg: #1c2128;
        --json-key: #79c0ff;
        --json-string: #a5d6ff;
        --json-number: #79c0ff;
        --json-bool: #ff7b72;
        --json-null: #8b949e;
    }
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg);
    color: var(--fg);
    line-height: 1.6;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
}

h1 { margin-bottom: 0.5rem; }
h2 { margin: 2rem 0 0.5rem; }
h4 { margin: 1rem 0 0.5rem; }

.subtitle { color: var(--subtle); margin-bottom: 1rem; font-size: 0.9em; }

.header-meta {
    color: var(--subtle);
    font-size: 0.85em;
    margin-bottom: 1.5rem;
}

.summary-bar {
    display: flex;
    gap: 1.5rem;
    padding: 1rem;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    align-items: center;
}

.summary-stat {
    font-size: 1.5rem;
    font-weight: 700;
}
.summary-stat.pass { color: var(--pass); }
.summary-stat.fail { color: var(--fail); }
.summary-stat.error { color: var(--warn); }
.summary-label { font-size: 0.8rem; color: var(--subtle); text-transform: uppercase; }

.progress-bar {
    flex: 1;
    min-width: 200px;
    height: 12px;
    background: var(--border);
    border-radius: 6px;
    overflow: hidden;
    display: flex;
}
.progress-pass { background: var(--pass); }
.progress-fail { background: var(--fail); }
.progress-error { background: var(--warn); }

.table-wrap { overflow-x: auto; margin-bottom: 2rem; }

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85em;
}

th, td {
    padding: 6px 10px;
    border: 1px solid var(--border);
    text-align: left;
}

th {
    background: var(--card-bg);
    font-weight: 600;
    white-space: nowrap;
}

.matrix td { text-align: center; }
.matrix td.class-name { text-align: left; font-family: monospace; font-weight: 600; }
.cell-ok { background: color-mix(in srgb, var(--pass) 15%, transparent); }
.cell-warn { background: color-mix(in srgb, var(--fail) 15%, transparent); }
.row-warn { background: color-mix(in srgb, var(--fail) 8%, transparent); }

details {
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-bottom: 0.5rem;
    background: var(--card-bg);
}

details > summary {
    padding: 0.75rem 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

details > summary::-webkit-details-marker { display: none; }
details > summary::before { content: '▶'; font-size: 0.7em; transition: transform 0.2s; }
details[open] > summary::before { transform: rotate(90deg); }

.test-body { padding: 1rem; border-top: 1px solid var(--border); }

.method-tag {
    font-family: monospace;
    font-size: 0.8em;
    background: var(--code-bg);
    padding: 2px 6px;
    border-radius: 3px;
    color: var(--subtle);
}

.duration { font-size: 0.8em; color: var(--subtle); }
.error-msg { font-size: 0.8em; color: var(--fail); font-style: italic; }

pre.json {
    background: var(--code-bg);
    padding: 0.75rem;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 0.8em;
    line-height: 1.5;
    max-height: 400px;
    overflow-y: auto;
}

.json-key { color: var(--json-key); }
.json-string { color: var(--json-string); }
.json-number { color: var(--json-number); }
.json-bool { color: var(--json-bool); }
.json-null { color: var(--json-null); font-style: italic; }

code { font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; font-size: 0.9em; }

.field-table, .assertion-table { margin-bottom: 1rem; }
</style>
</head>
<body>
<h1>Java Interop Test Report</h1>
<div class="header-meta">
    Connection: ${escapeHtml(host)}:${port} &bull;
    Generated: ${escapeHtml(timestamp)} &bull;
    Total duration: ${totalDuration.toFixed(0)}ms
</div>

<div class="summary-bar">
    <div>
        <div class="summary-stat pass">${passCount}</div>
        <div class="summary-label">Passed</div>
    </div>
    <div>
        <div class="summary-stat fail">${failCount}</div>
        <div class="summary-label">Failed</div>
    </div>
    <div>
        <div class="summary-stat error">${errorCount}</div>
        <div class="summary-label">Errors</div>
    </div>
    <div>
        <div class="summary-stat">${total}</div>
        <div class="summary-label">Total</div>
    </div>
    <div class="progress-bar">
        <div class="progress-pass" style="width:${(passCount / total) * 100}%"></div>
        <div class="progress-fail" style="width:${(failCount / total) * 100}%"></div>
        <div class="progress-error" style="width:${(errorCount / total) * 100}%"></div>
    </div>
</div>

${matrixHtml}

<h2>Test Results</h2>
${testSections}

</body>
</html>`;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    console.log(`\n  Java Interop Test Harness`);
    console.log(`  ========================`);
    console.log(`  Host: ${HOST}:${PORT}`);
    console.log(`  Timeout: ${TIMEOUT}ms`);
    console.log(`  Output: ${OUTPUT_PATH}\n`);

    // Connect
    let conn: MessageConnection;
    try {
        process.stdout.write('  Connecting... ');
        conn = await connect(HOST, PORT, TIMEOUT);
        console.log('OK\n');
    } catch (err: any) {
        console.error(`FAILED\n\n  Error: ${err.message}\n`);
        console.error('  Make sure the BBj interop service is running on the specified host/port.\n');
        process.exit(2);
    }

    // Run tests
    const tests = defineTests(conn);
    const results: TestResult[] = [];
    const matrixRows: MatrixRow[] = [];

    for (let i = 0; i < tests.length; i++) {
        const testCase = tests[i];
        process.stdout.write(`  [${i + 1}/${tests.length}] `);
        const result = await testCase.run(conn);
        results.push(result);

        const icon = result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '⚠';
        console.log(`${icon} ${result.name} (${result.durationMs.toFixed(0)}ms)`);

        // Build matrix row for class-level tests flagged via inMatrix
        if (testCase.inMatrix && result.response && result.status !== 'error') {
            matrixRows.push(buildMatrixRow(result.response));
        }
    }

    // Disconnect
    conn.dispose();

    // Summary — the one verdict that drives the console output, the report and the exit code
    const verdict = evaluateGate(results);

    console.log(`\n  ─────────────────────────────`);
    console.log(`  Results: ${verdict.passCount} passed, ${verdict.failCount} failed, ${verdict.errorCount} errors`);

    if (verdict.criticalFailures.length > 0) {
        console.log(`  Critical field failures:`);
        for (const cf of verdict.criticalFailures) {
            console.log(`    ✗ ${cf.caseName}: ${cf.field}`);
        }
    }

    // Generate report
    const html = generateReport(results, matrixRows, HOST, PORT, verdict);
    writeFileSync(OUTPUT_PATH, html, 'utf-8');
    console.log(`  Report: ${OUTPUT_PATH}\n`);

    process.exit(verdict.exitCode);
}

main().catch(err => {
    console.error(`\n  Fatal error: ${err.message}\n`);
    process.exit(2);
});
