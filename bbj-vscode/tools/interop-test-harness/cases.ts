/**
 * The 17 real test cases against the Java interop peer's 4 RPC methods, each running through the
 * shared request scaffold in scaffold.ts. No side effects at import: this module only builds the
 * `harnessCases` array of runnable case records and exports pure functions over `TestResult[]`.
 */
import type { MessageConnection } from 'vscode-jsonrpc/node.js';
import {
    assert,
    countWhere,
    defineCase,
    getClassInfoRequest,
    getClassInfosRequest,
    getTopLevelPackagesRequest,
    loadClasspathRequest,
    typeOf,
    validateClassFields,
    validateFieldFields,
    validateMethodFields,
    validateParameterFields,
} from './scaffold.js';
import type {
    Assertion,
    CaseOutcome,
    CaseRecord,
    CaseRunnable,
    ClassInfoDto,
    FieldCheck,
    MatrixRow,
    MethodInfoDto,
    TestResult,
} from './types.js';

// ─── Per-case validators ─────────────────────────────────────────────────────

function validateJavaLangString(outcome: unknown, checks: FieldCheck[], asserts: Assertion[]): void {
    const cls = outcome as ClassInfoDto;
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

    const valueOf = cls?.methods?.find(m => m.name === 'valueOf');
    asserts.push(assert('String.valueOf exists', !!valueOf));
    asserts.push(assert('String.valueOf isStatic=true', valueOf?.isStatic === true, `isStatic=${valueOf?.isStatic}`));

    const format = cls?.methods?.find(m => m.name === 'format');
    asserts.push(assert('String.format exists', !!format));
    asserts.push(assert('String.format isStatic=true', format?.isStatic === true, `isStatic=${format?.isStatic}`));

    const join = cls?.methods?.find(m => m.name === 'join');
    asserts.push(assert('String.join exists', !!join));
    asserts.push(assert('String.join isStatic=true', join?.isStatic === true, `isStatic=${join?.isStatic}`));

    const charAt = cls?.methods?.find(m => m.name === 'charAt');
    asserts.push(assert('String.charAt exists', !!charAt));
    asserts.push(assert('String.charAt isStatic=false', charAt?.isStatic === false, `isStatic=${charAt?.isStatic}`));

    asserts.push(assert('Has constructors', (cls?.constructors?.length ?? 0) > 0, `count=${cls?.constructors?.length}`));
}

function validateJavaUtilHashMap(outcome: unknown, checks: FieldCheck[], asserts: Assertion[]): void {
    const cls = outcome as ClassInfoDto;
    validateClassFields(cls, checks);
    asserts.push(assert('Has constructors', (cls?.constructors?.length ?? 0) > 0, `count=${cls?.constructors?.length}`));
    if (cls?.constructors?.length) {
        const arities = cls.constructors.map(c => c.parameters?.length ?? 0);
        const unique = new Set(arities);
        asserts.push(assert('Constructors have varying arity', unique.size > 1, `arities: ${arities.join(', ')}`));
        for (const ctor of cls.constructors) {
            validateMethodFields(ctor, checks, `constructor(${ctor.parameters?.length ?? '?'})`);
        }
    }
}

function validateJavaUtilDate(outcome: unknown, checks: FieldCheck[], asserts: Assertion[]): void {
    const cls = outcome as ClassInfoDto;
    validateClassFields(cls, checks);
    const deprecatedNames = ['getHours', 'getMinutes', 'getSeconds'];
    for (const name of deprecatedNames) {
        const method = cls?.methods?.find(m => m.name === name);
        asserts.push(assert(`Date.${name} exists`, !!method));
        asserts.push(assert(`Date.${name} isDeprecated=true`, method?.isDeprecated === true, `isDeprecated=${method?.isDeprecated}`));
    }
    const deprecatedCount = countWhere(cls?.methods, m => m.isDeprecated === true);
    asserts.push(assert('Has deprecated methods', deprecatedCount > 0, `deprecated count=${deprecatedCount}`));
}

function validateJavaLangMath(outcome: unknown, checks: FieldCheck[], asserts: Assertion[]): void {
    const cls = outcome as ClassInfoDto;
    validateClassFields(cls, checks);
    const pi = cls?.fields?.find(f => f.name === 'PI');
    asserts.push(assert('Math.PI exists', !!pi));
    asserts.push(assert('Math.PI isStatic=true', pi?.isStatic === true, `isStatic=${pi?.isStatic}`));
    asserts.push(assert('Math.PI type=double', pi?.type === 'double', `type=${pi?.type}`));

    const e = cls?.fields?.find(f => f.name === 'E');
    asserts.push(assert('Math.E exists', !!e));
    asserts.push(assert('Math.E isStatic=true', e?.isStatic === true, `isStatic=${e?.isStatic}`));

    const abs = cls?.methods?.find(m => m.name === 'abs');
    asserts.push(assert('Math.abs exists', !!abs));
    asserts.push(assert('Math.abs isStatic=true', abs?.isStatic === true, `isStatic=${abs?.isStatic}`));

    const staticMethodCount = countWhere(cls?.methods, m => m.isStatic === true);
    asserts.push(assert('Most methods are static', staticMethodCount > (cls?.methods?.length ?? 0) * 0.8,
        `${staticMethodCount}/${cls?.methods?.length ?? 0}`));

    // Math has a private constructor, so constructors should be empty or absent
    asserts.push(assert('No public constructors (private ctor)',
        (cls?.constructors?.length ?? 0) === 0, `count=${cls?.constructors?.length}`));
}

function validateJavaLangBoolean(outcome: unknown, checks: FieldCheck[], asserts: Assertion[]): void {
    const cls = outcome as ClassInfoDto;
    validateClassFields(cls, checks);
    const trueField = cls?.fields?.find(f => f.name === 'TRUE');
    asserts.push(assert('Boolean.TRUE exists', !!trueField));
    asserts.push(assert('Boolean.TRUE isStatic=true', trueField?.isStatic === true, `isStatic=${trueField?.isStatic}`));

    const falseField = cls?.fields?.find(f => f.name === 'FALSE');
    asserts.push(assert('Boolean.FALSE exists', !!falseField));
    asserts.push(assert('Boolean.FALSE isStatic=true', falseField?.isStatic === true, `isStatic=${falseField?.isStatic}`));

    const parseBoolean = cls?.methods?.find(m => m.name === 'parseBoolean');
    asserts.push(assert('Boolean.parseBoolean exists', !!parseBoolean));
    asserts.push(assert('Boolean.parseBoolean isStatic=true', parseBoolean?.isStatic === true,
        `isStatic=${parseBoolean?.isStatic}`));
}

function validateJavaSqlConnection(outcome: unknown, checks: FieldCheck[], asserts: Assertion[]): void {
    const cls = outcome as ClassInfoDto;
    validateClassFields(cls, checks);
    asserts.push(assert('Is interface (no constructors)',
        (cls?.constructors?.length ?? 0) === 0, `count=${cls?.constructors?.length}`));
    asserts.push(assert('Has methods', (cls?.methods?.length ?? 0) > 0, `count=${cls?.methods?.length}`));
}

function validateJavaLangSystem(outcome: unknown, checks: FieldCheck[], asserts: Assertion[]): void {
    const cls = outcome as ClassInfoDto;
    validateClassFields(cls, checks);
    for (const fieldName of ['out', 'err', 'in']) {
        const f = cls?.fields?.find(f => f.name === fieldName);
        asserts.push(assert(`System.${fieldName} exists`, !!f));
        asserts.push(assert(`System.${fieldName} isStatic=true`, f?.isStatic === true, `isStatic=${f?.isStatic}`));
    }
    const gc = cls?.methods?.find(m => m.name === 'gc');
    asserts.push(assert('System.gc exists', !!gc));
    asserts.push(assert('System.gc isStatic=true', gc?.isStatic === true, `isStatic=${gc?.isStatic}`));
}

function validateJavaUtilMapEntry(outcome: unknown, checks: FieldCheck[], asserts: Assertion[]): void {
    const cls = outcome as ClassInfoDto;
    validateClassFields(cls, checks);
    asserts.push(assert('Name contains Entry', cls?.name?.includes('Entry') ?? false, `name=${cls?.name}`));
    const getKey = cls?.methods?.find(m => m.name === 'getKey');
    asserts.push(assert('Map.Entry.getKey exists', !!getKey));
    const getValue = cls?.methods?.find(m => m.name === 'getValue');
    asserts.push(assert('Map.Entry.getValue exists', !!getValue));
}

/**
 * True only when `value` is a non-null object with a truthy `error` property — the same plain
 * truthiness check `java-interop.ts` applies to `javaClass.error` to decide whether to skip a
 * resolved class (#514).
 */
function hasErrorField(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    return Boolean((value as { error?: unknown }).error);
}

function validatePrimitiveInt(outcome: unknown, _checks: FieldCheck[], asserts: Assertion[]): void {
    const response = outcome as ClassInfoDto | undefined;
    asserts.push(assert('Error response or a class named int',
        hasErrorField(response) || response?.name === 'int',
        `error=${response?.error}, name=${response?.name}`));
}

function validateNonexistentClass(outcome: unknown, _checks: FieldCheck[], asserts: Assertion[]): void {
    const o = outcome as CaseOutcome<ClassInfoDto>;
    const isError = o.kind === 'peer-error' ? true : hasErrorField(o.value);
    const detail = o.kind === 'peer-error'
        ? `error code=${o.error.code}, message=${o.error.message}`
        : `value=${JSON.stringify(o.value)}`;
    asserts.push(assert('Peer signals an error (error field or JSON-RPC error reply)', isError, detail));
}

function validateJavaLangDeprecated(outcome: unknown, checks: FieldCheck[], asserts: Assertion[]): void {
    const cls = outcome as ClassInfoDto;
    validateClassFields(cls, checks);
    asserts.push(assert('Name contains Deprecated', cls?.name?.includes('Deprecated') ?? false, `name=${cls?.name}`));
}

function validateGetClassInfosJavaLang(outcome: unknown, checks: FieldCheck[], assertions: Assertion[]): void {
    const result = outcome;
    assertions.push(assert('Returns array', Array.isArray(result), `type=${typeOf(result)}`));
    if (!Array.isArray(result)) {
        return;
    }
    assertions.push(assert('Contains classes', result.length > 0, `count=${result.length}`));

    const classes = result as ClassInfoDto[];
    const names = classes.map(c => c.name);
    for (const expected of ['String', 'Integer', 'Boolean', 'Object', 'System']) {
        const found = names.some(n => n === expected || n === `java.lang.${expected}`);
        assertions.push(assert(`Contains ${expected}`, found, `found: ${found}`));
    }

    if (classes.length > 0) {
        validateClassFields(classes[0], checks);
    }
}

function validateGetClassInfosJavaUtil(outcome: unknown, _checks: FieldCheck[], assertions: Assertion[]): void {
    const result = outcome;
    const isArray = Array.isArray(result);
    const names: (string | undefined)[] = isArray ? (result as ClassInfoDto[]).map(c => c?.name) : [];
    const missing = ['HashMap', 'ArrayList', 'Date'].filter(expected =>
        !names.some(n => n === expected || n === `java.util.${expected}`));
    assertions.push(assert('Returns an array that is empty or contains HashMap, ArrayList and Date',
        isArray && ((result as unknown[]).length === 0 || missing.length === 0),
        `type=${typeOf(result)}, count=${isArray ? (result as unknown[]).length : 0}, missing=${missing.join(', ') || 'none'}`));
}

function validateGetClassInfosComBasisStartupType(outcome: unknown, _checks: FieldCheck[], assertions: Assertion[]): void {
    const result = outcome;
    const isArray = Array.isArray(result);
    const names: (string | undefined)[] = isArray ? (result as ClassInfoDto[]).map(c => c?.name) : [];
    const hasBBjClass = names.some(n => typeof n === 'string' && n.includes('BBj'));
    assertions.push(assert('Returns an array that is empty or contains a BBj class',
        isArray && ((result as unknown[]).length === 0 || hasBBjClass),
        `type=${typeOf(result)}, count=${isArray ? (result as unknown[]).length : 0}, sample=${names.slice(0, 5).join(', ')}`));
}

function validateGetTopLevelPackages(outcome: unknown, _checks: FieldCheck[], assertions: Assertion[]): void {
    const result = outcome;
    assertions.push(assert('Returns array', Array.isArray(result), `type=${typeOf(result)}`));
    if (!Array.isArray(result)) {
        return;
    }
    assertions.push(assert('Contains packages', result.length > 0, `count=${result.length}`));

    const packages = result as { packageName?: string }[];
    const packageNames = packages.map(p => p.packageName);
    const hasJavaLang = packageNames.some(n => n === 'java' || n === 'java.lang');
    assertions.push(assert('Contains java.lang', hasJavaLang,
        `sample: ${packageNames.filter((n): n is string => !!n?.startsWith('java')).slice(0, 5).join(', ')}`));
}

function validateLoadClasspathEmpty(outcome: unknown, _checks: FieldCheck[], assertions: Assertion[]): void {
    const result = outcome;
    assertions.push(assert('Returns boolean', typeof result === 'boolean', `type=${typeOf(result)}`));
    assertions.push(assert('Returns true', result === true, `value=${result}`));
}

function validateLoadClasspathFilePrefix(outcome: unknown, _checks: FieldCheck[], assertions: Assertion[]): void {
    const o = outcome as CaseOutcome<boolean>;
    const isBooleanResponse = o.kind === 'response' && typeof o.value === 'boolean';
    const detail = o.kind === 'peer-error'
        ? `error code=${o.error.code}, message=${o.error.message}`
        : `type=${typeOf(o.value)}, value=${o.value}`;
    assertions.push(assert('Returns a boolean or rejects with a JSON-RPC error reply',
        o.kind === 'peer-error' || isBooleanResponse, detail));
}

// ─── The 17 case records ─────────────────────────────────────────────────────

const caseRecords: CaseRecord[] = [
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

/** The 17 real cases, in definition order, each running through the shared request scaffold. */
export const harnessCases: CaseRunnable[] = caseRecords.map(defineCase);

export function buildMatrixRow(cls: unknown): MatrixRow {
    const c = cls as ClassInfoDto;
    const methods: MethodInfoDto[] = c?.methods ?? [];
    const fields = c?.fields ?? [];
    const constructors = c?.constructors ?? [];

    const staticMethods = countWhere(methods, m => m.isStatic !== undefined);
    const staticFields = countWhere(fields, f => f.isStatic !== undefined);
    const deprMethods = countWhere(methods, m => m.isDeprecated !== undefined);
    const deprFields = countWhere(fields, f => f.isDeprecated !== undefined);

    return {
        className: c?.name ? `${c.packageName ?? ''}.${c.name}` : '(unknown)',
        isStatic: {
            methods: `${staticMethods}/${methods.length}`,
            fields: `${staticFields}/${fields.length}`,
        },
        isDeprecated: {
            methods: `${deprMethods}/${methods.length}`,
            fields: `${deprFields}/${fields.length}`,
            class: c?.isDeprecated !== undefined ? String(c.isDeprecated) : 'missing',
        },
        constructors: constructors.length > 0 ? `✓ (${constructors.length})` : (c?.constructors !== undefined ? '✓ (0)' : '✗ missing'),
        hasName: c?.name !== undefined,
        hasReturnType: methods.length === 0 || methods.some(m => m.returnType !== undefined),
        hasType: fields.length === 0 || fields.some(f => f.type !== undefined),
        hasParameters: methods.length === 0 || methods.some(m => m.parameters !== undefined),
        hasPackageName: c?.packageName !== undefined,
    };
}

/**
 * Runs every case in `harnessCases`, in definition order, against `conn`. `onResult` (if given)
 * is called after each case with its 1-based index, the total count, and its result — the CLI
 * uses this to print progress as the suite runs. Matrix rows are built from `inMatrix` cases
 * whose status is not `error` and whose response is an object.
 */
export async function runSuite(
    conn: MessageConnection,
    onResult?: (index: number, total: number, result: TestResult) => void,
): Promise<{ results: TestResult[]; matrixRows: MatrixRow[] }> {
    const results: TestResult[] = [];
    const matrixRows: MatrixRow[] = [];

    for (let i = 0; i < harnessCases.length; i++) {
        const testCase = harnessCases[i];
        const result = await testCase.run(conn);
        results.push(result);
        onResult?.(i + 1, harnessCases.length, result);

        if (testCase.inMatrix && result.response && result.status !== 'error') {
            matrixRows.push(buildMatrixRow(result.response));
        }
    }

    return { results, matrixRows };
}
