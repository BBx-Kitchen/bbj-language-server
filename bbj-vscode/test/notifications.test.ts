/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Connection } from 'vscode-languageserver';

/**
 * P61-D5-015: bbj-notifications.ts (1-53) had no test covering the no-op-before-init
 * behaviour or the dedup guard — a regression in either (e.g. always sending, or never
 * sending after the first call) would pass `npm test` undetected (D-13, no red state
 * producible: both already behave correctly).
 *
 * bbj-notifications.ts holds module-scoped state (`_connection`, `bbjcplAvailableState`).
 * Each test resets the module registry and re-imports fresh, so no test observes another
 * test's mutations to that state.
 */
describe('BBj notifications: init guard and dedup (P61-D5-015)', () => {

    beforeEach(() => {
        vi.resetModules();
    });

    function createMockConnection(): Connection {
        return {
            sendNotification: vi.fn(),
            window: {
                showErrorMessage: vi.fn()
            }
        } as unknown as Connection;
    }

    test('notifyBbjcplAvailability is a no-op before initNotifications() is called', async () => {
        const mod = await import('../src/language/bbj-notifications.js');
        // No connection has been wired yet in this fresh module instance — must not throw,
        // and there is nothing to assert a call against since _connection is still null.
        expect(() => mod.notifyBbjcplAvailability(true)).not.toThrow();
        expect(() => mod.notifyJavaConnectionError('ECONNREFUSED')).not.toThrow();
    });

    test('notifyBbjcplAvailability dedups: only sends when the available state changes', async () => {
        const mod = await import('../src/language/bbj-notifications.js');
        const connection = createMockConnection();
        mod.initNotifications(connection);

        mod.notifyBbjcplAvailability(true);
        mod.notifyBbjcplAvailability(true);
        mod.notifyBbjcplAvailability(true);
        expect(connection.sendNotification).toHaveBeenCalledTimes(1);
        expect(connection.sendNotification).toHaveBeenCalledWith('bbj/bbjcplAvailability', { available: true });

        mod.notifyBbjcplAvailability(false);
        expect(connection.sendNotification).toHaveBeenCalledTimes(2);
        expect(connection.sendNotification).toHaveBeenLastCalledWith('bbj/bbjcplAvailability', { available: false });

        // Repeating the same (now current) value again must not send a third notification.
        mod.notifyBbjcplAvailability(false);
        mod.notifyBbjcplAvailability(false);
        expect(connection.sendNotification).toHaveBeenCalledTimes(2);
    });

    test('notifyJavaConnectionError sends a window/showMessage error with the detail interpolated', async () => {
        const mod = await import('../src/language/bbj-notifications.js');
        const connection = createMockConnection();
        mod.initNotifications(connection);

        mod.notifyJavaConnectionError('ECONNREFUSED 127.0.0.1:5008');

        expect(connection.window.showErrorMessage).toHaveBeenCalledTimes(1);
        const [message] = (connection.window.showErrorMessage as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(message).toContain('ECONNREFUSED 127.0.0.1:5008');
    });
});
