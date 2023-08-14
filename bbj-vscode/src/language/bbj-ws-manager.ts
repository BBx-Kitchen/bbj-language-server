import { WorkspaceManager } from "langium";
import { URI } from "vscode-uri";

export interface BBjWsManager extends WorkspaceManager {
    isExternalDocument(documentUri: URI): boolean;
}

export namespace BBjWsManager {
    export function is(workspaceManager: WorkspaceManager): workspaceManager is BBjWsManager {
        return 'isExternalDocument' in workspaceManager;
    }
}
