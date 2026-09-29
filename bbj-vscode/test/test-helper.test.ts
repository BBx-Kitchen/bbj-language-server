/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Unit tests for `isInteropPeerAnswering` — the hardened BBj-test gate probe that replaces the
 * bare TCP `isPortOpen` check — and `shouldRunBBjTests`' `RUN_BBJ_TESTS` flag handling. Every
 * case runs against the shared loopback peer (`test/loopback-jsonrpc-peer.ts`) or a plain
 * `node:net` listener; this suite never reaches the live peer on :5008.
 *
 * The plain-TCP-listener case is the one the old `isPortOpen` probe got wrong: a bare open
 * socket that never speaks JSON-RPC used to resolve `true` (the false positive this hardening
 * closes). Against `isInteropPeerAnswering`, that same listener now resolves `false`.
 */
import { createServer, type Server, type Socket } from 'node:net';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { neverAnswer, startLoopbackPeer, unusedLoopbackPort, type LoopbackPeer } from './loopback-jsonrpc-peer.js';
import { isInteropPeerAnswering, shouldRunBBjTests } from './test-helper.js';

describe('isInteropPeerAnswering', () => {
  let peer: LoopbackPeer | undefined;
  let plainServer: Server | undefined;
  let plainSockets: Set<Socket> | undefined;

  afterEach(async () => {
    if (peer) {
      await peer.close();
      peer = undefined;
    }
    if (plainServer) {
      const server = plainServer;
      plainServer = undefined;
      if (plainSockets) {
        for (const socket of plainSockets) {
          socket.destroy();
        }
        plainSockets = undefined;
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test('a peer that answers a valid class object resolves true and logs one getClassInfo request', async () => {
    peer = await startLoopbackPeer({
      getClassInfo: () => ({ name: 'java.lang.Object', packageName: 'java.lang', fields: [], methods: [], constructors: [] }),
    });

    const result = await isInteropPeerAnswering(peer.port);

    expect(result).toBe(true);
    expect(peer.requests).toHaveLength(1);
    expect(peer.requests[0]).toMatchObject({ method: 'getClassInfo', params: { className: 'java.lang.Object' } });
  });

  test('a peer answering with an error field resolves false', async () => {
    peer = await startLoopbackPeer({
      getClassInfo: () => ({ error: 'Class "java.lang.Object" not found' }),
    });

    const result = await isInteropPeerAnswering(peer.port);

    expect(result).toBe(false);
  });

  test('a peer with no getClassInfo handler (MethodNotFound) resolves false', async () => {
    peer = await startLoopbackPeer({});

    const result = await isInteropPeerAnswering(peer.port);

    expect(result).toBe(false);
  });

  test('a peer whose getClassInfo never answers resolves false within the timeout', async () => {
    peer = await startLoopbackPeer({ getClassInfo: () => neverAnswer() });

    const start = Date.now();
    const result = await isInteropPeerAnswering(peer.port, '127.0.0.1', 200);

    expect(result).toBe(false);
    expect(Date.now() - start).toBeLessThan(2000);
  });

  test("a plain TCP listener that accepts sockets and never speaks JSON-RPC resolves false (the old probe's false positive)", async () => {
    plainSockets = new Set<Socket>();
    const sockets = plainSockets;
    plainServer = createServer((socket) => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
      // Deliberately never write anything — this is a bare open port, not a JSON-RPC peer.
    });
    const server = plainServer;
    await new Promise<void>((resolve, reject) => {
      server.on('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    const port = typeof address === 'object' && address !== null ? address.port : 0;

    const start = Date.now();
    const result = await isInteropPeerAnswering(port, '127.0.0.1', 200);

    expect(result).toBe(false);
    expect(Date.now() - start).toBeLessThan(2000);
  });

  test('a closed port resolves false', async () => {
    const port = await unusedLoopbackPort();

    const result = await isInteropPeerAnswering(port);

    expect(result).toBe(false);
  });
});

describe('shouldRunBBjTests', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test.each(['1', 'true', 'yes'])('RUN_BBJ_TESTS=%s resolves true without probing', async (value) => {
    vi.stubEnv('RUN_BBJ_TESTS', value);

    await expect(shouldRunBBjTests()).resolves.toBe(true);
  });

  test.each(['0', 'false', 'no'])('RUN_BBJ_TESTS=%s resolves false without probing', async (value) => {
    vi.stubEnv('RUN_BBJ_TESTS', value);

    await expect(shouldRunBBjTests()).resolves.toBe(false);
  });
});
