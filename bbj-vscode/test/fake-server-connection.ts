import type { Connection } from 'vscode-languageserver';
import { vi } from 'vitest';

/**
 * A fake language-client connection with the slice the notifications module talks to: the window
 * messages, `workspace.applyEdit` (which accepts the edit unless a test says otherwise) and
 * `sendNotification`.
 */
export function createFakeServerConnection() {
    const window = {
        showWarningMessage: vi.fn(),
        showErrorMessage: vi.fn(),
        showInformationMessage: vi.fn(),
        showDocument: vi.fn()
    };
    const workspace = {
        applyEdit: vi.fn(async (_params: unknown) => ({ applied: true }))
    };
    const sendNotification = vi.fn();
    const connection = { window, workspace, sendNotification } as unknown as Connection;
    return { connection, window, workspace, sendNotification };
}
