/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { buildEmValidateArgv, buildEmLoginArgv } from './Commands/process-args.js';
import { formatArgvForLog, type ProcessError } from './Commands/process-runner.js';
import { createScriptOutputFile, runScriptToOwnerOnlyFile } from './em-script-runner.js';
import { isEmTokenExpired } from './em-token-validity.js';
import { initialEmUsername, rememberEmUsername } from './em-username-memory.js';

/** Dependencies the EM login command and token validation need from activation. */
export interface EmAuthDeps {
    readonly outputChannel: vscode.OutputChannel;
}

/**
 * Get EM credentials from SecretStorage
 * Returns {username, password} object or undefined if not stored
 */
export async function getEMCredentials(secrets: vscode.SecretStorage | undefined): Promise<{ username: string, password: string } | undefined> {
    // Try token first
    const token = await secrets?.get('bbj.em.token');
    if (token) {
        // Check if the token is expired or otherwise unusable (issue #553):
        // anything not positively decoded as an unexpired JWT is treated as
        // expired, mirroring bbj-intellij's JwtValidity.check.
        if (isEmTokenExpired(token, Math.floor(Date.now() / 1000))) {
            // Delete expired token from storage
            await secrets?.delete('bbj.em.token');
            return undefined; // Triggers re-login flow
        }
        return { username: '__token__', password: token };
    }
    // Try stored credentials (fallback if BBj doesn't support tokens)
    const creds = await secrets?.get('bbj.em.credentials');
    if (creds) return JSON.parse(creds);
    return undefined;
}

/**
 * Validate a token server-side against EM by running em-validate-token.bbj
 * Returns true if token is valid, false otherwise
 */
async function validateTokenServerSide(context: vscode.ExtensionContext, token: string, deps: EmAuthDeps): Promise<boolean> {
    const { outputChannel } = deps;
    try {
        const config = vscode.workspace.getConfiguration("bbj");
        const bbjHome = config.get<string>("home");

        if (!bbjHome) {
            return false;
        }

        // Build path to em-validate-token.bbj
        const emValidatePath = context.asAbsolutePath(path.join('tools', 'em-validate-token.bbj'));

        // Create temp file for BBj output, owner-only and exclusively before the
        // spawn — em-validate-token.bbj truncates it in place rather than deleting
        // and recreating it, so the mode set here survives the write.
        const tmpFile = createScriptOutputFile('bbj-em-validate');

        // Build argv: bbj -q em-validate-token.bbj - <tmpFile>; the token travels on
        // argv.env (BBJ_EM_TOKEN), never as a positional argument.
        const argv = buildEmValidateArgv({
            home: bbjHome,
            platform: process.platform,
            scriptPath: emValidatePath,
            token,
            tmpFile
        });

        // Log command if debug mode is on (with masked token)
        const isDebug = vscode.workspace.getConfiguration('bbj').get<boolean>('debug');
        if (isDebug) {
            outputChannel.appendLine(`EM token validation: ${formatArgvForLog(argv, [token])}`);
        }

        // Execute with 10s timeout; the shared runner spreads the secret env
        // over process.env, reads and trims the output, and always removes the
        // output file afterwards.
        const result = await runScriptToOwnerOnlyFile(argv, tmpFile, 10000);

        // Return true only if output is "VALID"
        return result === 'VALID';
    } catch {
        // On any error, consider token invalid
        return false;
    }
}

/**
 * Ensure valid EM credentials are available, with automatic re-login on expired/invalid tokens
 * Returns credentials or undefined if user cancelled login
 */
export async function ensureValidToken(context: vscode.ExtensionContext, deps: EmAuthDeps): Promise<{ username: string, password: string } | undefined> {
    let creds = await getEMCredentials(context.secrets);
    if (!creds) {
        const login = await vscode.window.showInformationMessage(
            'EM login required. Login now?', 'Login', 'Cancel'
        );
        if (login === 'Login') {
            await vscode.commands.executeCommand('bbj.loginEM');
            creds = await getEMCredentials(context.secrets);
        }
        if (!creds) return undefined;
    }

    // Server-side validation for token auth (catches revoked tokens)
    if (creds.username === '__token__') {
        const valid = await validateTokenServerSide(context, creds.password, deps);
        if (!valid) {
            await context.secrets.delete('bbj.em.token');
            vscode.window.showInformationMessage('EM token expired or invalid. Please log in again.');
            await vscode.commands.executeCommand('bbj.loginEM');
            creds = await getEMCredentials(context.secrets);
            if (!creds) return undefined;
        }
    }

    return creds;
}

async function handleLoginEM(context: vscode.ExtensionContext, deps: EmAuthDeps): Promise<void> {
    const { outputChannel } = deps;
    const config = vscode.workspace.getConfiguration("bbj");
    const bbjHome = config.get<string>("home");

    if (!bbjHome) {
        vscode.window.showErrorMessage("Please set bbj.home first", "Open Settings").then(sel => {
            if (sel === "Open Settings") {
                vscode.commands.executeCommand('workbench.action.openSettings', 'bbj.home');
            }
        });
        return;
    }

    // Prompt for credentials
    const username = await vscode.window.showInputBox({
        prompt: "EM Username",
        value: initialEmUsername(context.globalState),
        ignoreFocusOut: true
    });
    if (!username) return;

    const password = await vscode.window.showInputBox({
        prompt: "EM Password",
        password: true,
        ignoreFocusOut: true
    });
    if (password === undefined) return;

    // Launch em-login.bbj to validate credentials and get token
    const emLoginPath = context.asAbsolutePath(path.join('tools', 'em-login.bbj'));

    // Create temp file for BBj output, owner-only and exclusively before the
    // spawn — em-login.bbj truncates it in place rather than deleting and
    // recreating it, so the mode set here survives the write and holds for the
    // whole life of the file, including while it carries the returned JWT.
    const tmpFile = createScriptOutputFile('bbj-em-login');

    const platformLabel = process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'MacOS' : 'Linux';
    const infoString = `VS Code on ${platformLabel} as ${os.userInfo().username}`;

    const argv = buildEmLoginArgv({
        home: bbjHome,
        platform: process.platform,
        scriptPath: emLoginPath,
        username,
        password,
        tmpFile,
        infoString
    });

    const isDebug = vscode.workspace.getConfiguration('bbj').get<boolean>('debug');
    if (isDebug) {
        outputChannel.appendLine(`EM login: ${formatArgvForLog(argv, [password])}`);
    }

    try {
        let output: string;
        try {
            // Execute with 15s timeout; the shared runner spreads the secret env
            // over process.env and always removes the output file afterwards.
            output = await runScriptToOwnerOnlyFile(argv, tmpFile, 15000);
        } catch (err) {
            const pe = err as ProcessError;
            throw new Error(pe.stderr || pe.message);
        }

        if (output.startsWith('ERROR:')) {
            throw new Error(output.substring(6));
        }

        // Reject a token that isn't positively valid (issue #535): anything not
        // decoded as an unexpired JWT is treated as unusable, mirroring
        // bbj-intellij's JwtValidity.check(...) != VALID guard. Never include the
        // token itself in the message.
        if (isEmTokenExpired(output, Math.floor(Date.now() / 1000))) {
            throw new Error('Enterprise Manager returned an unusable token');
        }

        // Store token in SecretStorage
        await context.secrets.store('bbj.em.token', output);
        await rememberEmUsername(context.globalState, username);
        vscode.window.showInformationMessage('Successfully logged in to Enterprise Manager');
    } catch (error) {
        vscode.window.showErrorMessage(`EM login failed: ${error}`);
    }
}

/** Registers the EM login command against `context`, delegating to {@link handleLoginEM}. */
export function registerEmLoginCommand(context: vscode.ExtensionContext, deps: EmAuthDeps): void {
    context.subscriptions.push(vscode.commands.registerCommand("bbj.loginEM", () => handleLoginEM(context, deps)));
}
