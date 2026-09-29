/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * The re-entrant FIFO lock that serializes Java class resolution: concurrent lookups reach the
 * interop peer one at a time, in call order, while a recursive resolution chain sharing the same
 * lock token still proceeds without deadlocking on itself.
 *
 * Split out of `JavaInteropService` (#558).
 */
export class ResolutionLock {

    /** Queue-based async mutex: each entry is a resolve function that grants the lock to the next waiter. */
    private queue: Array<() => void> = [];
    private held = false;
    /** Tracks the current lock owner to allow re-entrant acquisition during recursive resolveClass calls. */
    private token: object | null = null;

    /** The token currently holding the lock, or `null` when the lock is free. */
    public get currentToken(): object | null {
        return this.token;
    }

    /**
     * Acquires the resolution lock. Uses a queue-based async mutex that supports
     * re-entrant acquisition: if the current async context already holds the lock
     * (tracked via lockToken), the call returns immediately without deadlocking.
     * @returns a release function that MUST be called when the critical section is done
     */
    public acquire(lockToken: object): Promise<() => void> {
        // Re-entrant: if this token already owns the lock, return a no-op release
        if (this.held && this.token === lockToken) {
            return Promise.resolve(() => { /* re-entrant, no-op release */ });
        }

        if (!this.held) {
            this.held = true;
            this.token = lockToken;
            return Promise.resolve(() => {
                this.drain();
            });
        }

        return new Promise<() => void>((resolve) => {
            this.queue.push(() => {
                this.token = lockToken;
                resolve(() => {
                    this.drain();
                });
            });
        });
    }

    private drain(): void {
        if (this.queue.length > 0) {
            const next = this.queue.shift()!;
            next();
        } else {
            this.held = false;
            this.token = null;
        }
    }

    /** Frees the lock and drops any queued waiters — a waiter queued before `reset()` is never granted. */
    public reset(): void {
        this.queue = [];
        this.held = false;
        this.token = null;
    }
}
