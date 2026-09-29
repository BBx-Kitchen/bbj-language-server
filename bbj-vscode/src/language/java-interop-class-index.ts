/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * The simple-name index of every class the augmented interop peer knows, used for
 * missing-`use` suggestions. Split out of the Java interop service (#558).
 */
import { CancellationToken, MessageConnection, RequestType } from 'vscode-jsonrpc/node.js';
import { METHOD_NOT_FOUND } from './java-interop-connection.js';
import { logger } from './logger.js';

/**
 * Request type for retrieving every fully-qualified class name known to the interop service
 * (classpath jars plus JDK modules). Provided only by an augmented bbj-ls; older servers answer
 * with a MethodNotFound error, which callers use to fall back to on-demand class suggestions.
 */
const getAllClassNamesRequest = new RequestType<null, string[], null>('getAllClassNames');

/** Structural dependencies {@link CompleteClassIndex} needs from the front class. */
export interface ClassIndexHooks {
    connect(): Promise<MessageConnection>;
    probeIfDue(): void;
    buildCompleteClassIndex(fqns: string[]): void;
}

/**
 * Complete `simpleName(lowercased) → FQN[]` index built from the augmented bbj-ls
 * `getAllClassNames` endpoint, or null when that endpoint is unavailable (older server).
 *
 * Split out of `JavaInteropService` (#558).
 */
export class CompleteClassIndex {

    constructor(private readonly hooks: ClassIndexHooks) { }

    /**
     * Complete `simpleName(lowercased) → FQN[]` index built from the augmented bbj-ls
     * `getAllClassNames` endpoint, or null when that endpoint is unavailable (older server).
     */
    private index: Map<string, string[]> | null = null;
    /** True once we have determined — by success or a definitive MethodNotFound — whether {@link index} is available. */
    private resolved = false;

    /**
     * Builds the {@link index} from the augmented bbj-ls `getAllClassNames` endpoint, at most
     * once, and reports whether a complete index is available. Servers that predate the endpoint
     * answer with a MethodNotFound error, which is latched so callers transparently fall back to
     * the on-demand probe/index (issue #447). Transient connection errors are NOT latched, so a
     * later call can still succeed once interop is reachable.
     */
    public async ensure(token?: CancellationToken): Promise<boolean> {
        if (this.resolved) {
            this.hooks.probeIfDue();
            return this.index !== null;
        }
        try {
            const connection = await this.hooks.connect();
            const fqns = await connection.sendRequest(getAllClassNamesRequest, {}, token);
            this.hooks.buildCompleteClassIndex(fqns);
            logger.info(() => `Loaded complete Java class index (${this.index!.size} distinct simple names)`);
            return true;
        } catch (e) {
            if ((e as { code?: number } | undefined)?.code === METHOD_NOT_FOUND) {
                // Server predates the augmented endpoint — stop probing and use the fallback path.
                this.resolved = true;
                logger.debug('Interop service has no getAllClassNames; using on-demand class suggestions.');
            } else {
                logger.debug(() => 'getAllClassNames failed (will retry): ' + (e instanceof Error ? e.message : String(e)));
            }
            return false;
        }
    }

    /** True once a complete class index has been built (i.e. the augmented endpoint is available). */
    public has(): boolean {
        return this.index !== null;
    }

    /** Drops the complete class index so it is rebuilt on the next request (e.g. after a classpath change). */
    public clear(): void {
        this.index = null;
        this.resolved = false;
    }

    /**
     * Builds {@link index} from a list of fully-qualified class names, indexing each by its
     * lowercased simple name. Inner classes and packageless names are skipped. Marks the index
     * as resolved. Shared by the live `getAllClassNames` path and test seeding.
     */
    public build(fqns: string[]): void {
        const index = new Map<string, string[]>();
        for (const fqn of fqns) {
            const simple = fqn.substring(fqn.lastIndexOf('.') + 1);
            if (!simple || simple.includes('$') || !fqn.includes('.')) {
                continue;
            }
            const key = simple.toLowerCase();
            let bucket = index.get(key);
            if (!bucket) {
                index.set(key, bucket = []);
            }
            bucket.push(fqn);
        }
        this.index = index;
        this.resolved = true;
    }

    /** Number of distinct lowercased simple names currently indexed. */
    public get size(): number {
        return this.index?.size ?? 0;
    }

    /**
     * FQNs indexed under `simpleName` (case-insensitive), or an empty array when the name is
     * unknown or no index has been built yet.
     */
    public simpleNameMatches(simpleName: string): string[] {
        return [...(this.index?.get(simpleName.toLowerCase()) ?? [])];
    }

    /**
     * FQNs of every indexed simple name starting with `lowerPrefix` (already lowercased by the
     * caller), stopping once the accumulated set reaches twice `limit` entries.
     */
    public prefixMatches(lowerPrefix: string, limit: number): Set<string> {
        const matches = new Set<string>();
        if (!this.index) {
            return matches;
        }
        for (const [key, fqns] of this.index) {
            if (key.startsWith(lowerPrefix)) {
                fqns.forEach(fqn => matches.add(fqn));
                if (matches.size >= limit * 2) break;
            }
        }
        return matches;
    }
}
