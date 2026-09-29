/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * The interop test harness's own fixtures and its four-method handler map, wired onto the one
 * shared loopback JSON-RPC server in `loopback-jsonrpc-peer.ts`. `startFakePeer` is a thin
 * adapter over `startLoopbackPeer`: it answers the harness's four RPC methods from hand-written
 * minimal fixtures unless `overrides` replaces a method's handler for this peer instance, and it
 * never opens a socket to the live peer on :5008 or to any non-loopback host. Each connected
 * socket's handlers can be overridden per test via `overrides`, and a handler's `context.drop()`
 * destroys that server-side socket, simulating a dropped connection mid-request rather than a
 * normal response or a clean JSON-RPC error reply.
 *
 * This is not the same thing as `test/fake-interop-peer.ts`: that file overrides
 * `JavaInteropService.createSocket()`/`wrapSocket()` to fake a different class's *client*-side
 * socket and never opens a real socket at all. The harness has no service class to subclass — it
 * is itself a raw `net.Socket` + `vscode-jsonrpc` client — so this helper is a genuine server.
 */
import { startLoopbackPeer, type LoopbackPeerContext } from './loopback-jsonrpc-peer.js';
import type {
    ClassInfoDto,
    ClassInfoParams,
    ClassPathInfoParams,
    FieldInfoDto,
    MethodInfoDto,
    PackageInfoDto,
    PackageInfoParams,
    ParameterInfoDto,
} from '../tools/interop-test-harness/types.js';

/** Passed to every handler. `drop()` destroys the socket that carried the in-flight request,
 *  simulating a dropped connection instead of a normal response or a clean JSON-RPC error. */
export interface FakePeerContext {
    drop(): void;
}

export interface FakePeerHandlers {
    getClassInfo(params: ClassInfoParams, ctx: FakePeerContext): unknown;
    getClassInfos(params: PackageInfoParams, ctx: FakePeerContext): unknown;
    getTopLevelPackages(ctx: FakePeerContext): unknown;
    loadClasspath(params: ClassPathInfoParams, ctx: FakePeerContext): unknown;
}

export type FakePeerOverrides = Partial<FakePeerHandlers>;

export interface FakePeer {
    port: number;
    close(): Promise<void>;
}

// ─── Healthy fixtures (hand-written, minimal, standard JDK names) ──────────
// Per the phase's own rule against recorded or proprietary peer output, every value here is a
// small hand-built object naming real JDK classes/methods where a real name is needed, and a
// made-up BBj-flavoured name (BBjFixtureType) where the harness only needs "a BBj class".

function makeParam(name: string, type: string): ParameterInfoDto {
    return { name, type };
}

function makeMethod(name: string, returnType: string, parameters: ParameterInfoDto[], isStatic: boolean, isDeprecated = false): MethodInfoDto {
    return { name, returnType, parameters, isStatic, isDeprecated };
}

function makeField(name: string, type: string, isStatic: boolean, isDeprecated = false): FieldInfoDto {
    return { name, type, isStatic, isDeprecated };
}

function makeClass(shape: Partial<ClassInfoDto> & Pick<ClassInfoDto, 'name' | 'packageName'>): ClassInfoDto {
    return {
        fields: [],
        methods: [],
        constructors: [],
        isDeprecated: false,
        ...shape,
    };
}

const stringClass = makeClass({
    name: 'String',
    packageName: 'java.lang',
    methods: [
        makeMethod('valueOf', 'String', [makeParam('value', 'int')], true),
        makeMethod('format', 'String', [makeParam('format', 'String')], true),
        makeMethod('join', 'String', [makeParam('delimiter', 'CharSequence')], true),
        makeMethod('charAt', 'char', [makeParam('index', 'int')], false),
    ],
    fields: [makeField('CASE_INSENSITIVE_ORDER', 'Comparator', true)],
    constructors: [makeMethod('String', 'String', [], false)],
});

const hashMapClass = makeClass({
    name: 'HashMap',
    packageName: 'java.util',
    methods: [makeMethod('put', 'Object', [makeParam('key', 'Object'), makeParam('value', 'Object')], false)],
    constructors: [
        makeMethod('HashMap', 'void', [], false),
        makeMethod('HashMap', 'void', [makeParam('initialCapacity', 'int'), makeParam('loadFactor', 'float')], false),
    ],
});

const dateClass = makeClass({
    name: 'Date',
    packageName: 'java.util',
    methods: [
        makeMethod('getHours', 'int', [], false, true),
        makeMethod('getMinutes', 'int', [], false, true),
        makeMethod('getSeconds', 'int', [], false, true),
    ],
});

const mathClass = makeClass({
    name: 'Math',
    packageName: 'java.lang',
    fields: [makeField('PI', 'double', true), makeField('E', 'double', true)],
    methods: [
        makeMethod('abs', 'int', [makeParam('a', 'int')], true),
        makeMethod('max', 'int', [makeParam('a', 'int'), makeParam('b', 'int')], true),
        makeMethod('min', 'int', [makeParam('a', 'int'), makeParam('b', 'int')], true),
        makeMethod('sqrt', 'double', [makeParam('a', 'double')], true),
    ],
    constructors: [],
});

const booleanClass = makeClass({
    name: 'Boolean',
    packageName: 'java.lang',
    fields: [makeField('TRUE', 'boolean', true), makeField('FALSE', 'boolean', true)],
    methods: [makeMethod('parseBoolean', 'boolean', [makeParam('s', 'String')], true)],
});

const connectionClass = makeClass({
    name: 'Connection',
    packageName: 'java.sql',
    methods: [makeMethod('close', 'void', [], false), makeMethod('createStatement', 'Statement', [], false)],
    constructors: [],
});

const systemClass = makeClass({
    name: 'System',
    packageName: 'java.lang',
    fields: [
        makeField('out', 'PrintStream', true),
        makeField('err', 'PrintStream', true),
        makeField('in', 'InputStream', true),
    ],
    methods: [makeMethod('gc', 'void', [], true)],
});

const mapEntryClass = makeClass({
    name: 'Map$Entry',
    packageName: 'java.util',
    methods: [makeMethod('getKey', 'Object', [], false), makeMethod('getValue', 'Object', [], false)],
});

const intClass: ClassInfoDto = { name: 'int' };

const deprecatedClass = makeClass({
    name: 'Deprecated',
    packageName: 'java.lang',
    isDeprecated: true,
});

/** Keyed by the fully-qualified class name a `getClassInfo` request names. */
export const healthyClasses: Record<string, ClassInfoDto> = {
    'java.lang.String': stringClass,
    'java.util.HashMap': hashMapClass,
    'java.util.Date': dateClass,
    'java.lang.Math': mathClass,
    'java.lang.Boolean': booleanClass,
    'java.sql.Connection': connectionClass,
    'java.lang.System': systemClass,
    'java.util.Map$Entry': mapEntryClass,
    int: intClass,
    'java.lang.Deprecated': deprecatedClass,
};

/** Keyed by the package name a `getClassInfos` request names. */
export const healthyClassesByPackage: Record<string, ClassInfoDto[]> = {
    'java.lang': [
        stringClass,
        { name: 'Integer', packageName: 'java.lang' },
        { name: 'Boolean', packageName: 'java.lang' },
        { name: 'Object', packageName: 'java.lang' },
        { name: 'System', packageName: 'java.lang' },
    ],
    'java.util': [
        { name: 'HashMap', packageName: 'java.util' },
        { name: 'ArrayList', packageName: 'java.util' },
        { name: 'Date', packageName: 'java.util' },
    ],
    'com.basis.startup.type': [
        { name: 'BBjFixtureType', packageName: 'com.basis.startup.type' },
    ],
};

export const healthyTopLevelPackages: PackageInfoDto[] = [
    { packageName: 'java' },
    { packageName: 'javax' },
];

function defaultGetClassInfo(params: ClassInfoParams): ClassInfoDto {
    return healthyClasses[params.className] ?? { error: `Class "${params.className}" not found` };
}

function defaultGetClassInfos(params: PackageInfoParams): ClassInfoDto[] {
    return healthyClassesByPackage[params.packageName] ?? [];
}

function defaultGetTopLevelPackages(): PackageInfoDto[] {
    return healthyTopLevelPackages;
}

function defaultLoadClasspath(params: ClassPathInfoParams): boolean {
    if (params.classPathEntries.length === 0) {
        return true;
    }
    return !params.classPathEntries.some(entry => entry.startsWith('file:'));
}

/** The healthy fixture builders and lookups, exported so a test can derive a mutated copy. */
export const healthyFixtures = {
    classes: healthyClasses,
    classesByPackage: healthyClassesByPackage,
    topLevelPackages: healthyTopLevelPackages,
    makeMethod,
    makeField,
    makeParam,
};

// ─── The fake peer server ────────────────────────────────────────────────────

/** Narrows a shared `LoopbackPeerContext` (extra `connectionId`) down to the harness's `drop()`-only shape. */
function toFakePeerContext(ctx: LoopbackPeerContext): FakePeerContext {
    return { drop: () => ctx.drop() };
}

/**
 * Starts the shared loopback peer (`loopback-jsonrpc-peer.ts`) wired to the harness's four RPC
 * methods, answering from the healthy fixtures above unless `overrides` replaces a method's
 * handler for this peer instance.
 */
export function startFakePeer(overrides: FakePeerOverrides = {}): Promise<FakePeer> {
    return startLoopbackPeer({
        getClassInfo: (params, ctx) =>
            (overrides.getClassInfo ?? defaultGetClassInfo)(params as ClassInfoParams, toFakePeerContext(ctx)),
        getClassInfos: (params, ctx) =>
            (overrides.getClassInfos ?? defaultGetClassInfos)(params as PackageInfoParams, toFakePeerContext(ctx)),
        getTopLevelPackages: (_params, ctx) =>
            (overrides.getTopLevelPackages ?? defaultGetTopLevelPackages)(toFakePeerContext(ctx)),
        loadClasspath: (params, ctx) =>
            (overrides.loadClasspath ?? defaultLoadClasspath)(params as ClassPathInfoParams, toFakePeerContext(ctx)),
    });
}
