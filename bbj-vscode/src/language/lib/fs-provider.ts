import * as vscode from 'vscode';
import { builtinFunctions } from './functions';
import { builtinVariables } from './variables';

export class BBjLibraryFileSystemProvider implements vscode.FileSystemProvider {

    static register(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            vscode.workspace.registerFileSystemProvider('bbjlib', new BBjLibraryFileSystemProvider(), {
                isReadonly: true,
                isCaseSensitive: false
            }));
    }

    stat(uri: vscode.Uri): vscode.FileStat {
        const date = Date.now();
        return {
            ctime: date,
            mtime: date,
            size: this.stringContent(uri).length,
            type: vscode.FileType.File
        };
    }

    stringContent(uri: vscode.Uri) {
        switch (uri.path) {
            case '/functions.bbl': return builtinFunctions;
            case '/variables.bbl': return builtinVariables;
            default: return '';
        }
    }

    readFile(uri: vscode.Uri): Uint8Array {
        return new Uint8Array(Buffer.from(this.stringContent(uri)));
    }

    /* Interface impl */
    private readonly didChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    onDidChangeFile = this.didChangeFile.event;

    watch() {
        return {
            dispose: () => { }
        };
    }

    readDirectory(): [] {
        throw vscode.FileSystemError.NoPermissions();
    }

    createDirectory() {
        throw vscode.FileSystemError.NoPermissions();
    }

    writeFile() {
        throw vscode.FileSystemError.NoPermissions();
    }

    delete() {
        throw vscode.FileSystemError.NoPermissions();
    }

    rename() {
        throw vscode.FileSystemError.NoPermissions();
    }
}