/**
 * Tri-state SETOPTS-in-code composer webview — a Set/Clear/Leave read-modify-write block editor
 * for BBj source code (#475, DISC-06, plan 88-06). Adapted from ./setopts-composer-webview.ts:
 * same panel-creation options, four-message protocol (`ready`/`change`/`apply`/`cancel`), CSP +
 * per-load nonce discipline and disposal behavior, but three things differ from the config.bbx
 * composer:
 *
 *   1. Each catalog bit renders as a three-way Set/Clear/Leave radio group (Leave preselected)
 *      instead of a checkbox — a read-modify-write block cannot express "leave untouched" with a
 *      two-state control. The mask-character and raw-hex-tail regions (config.bbx-only data
 *      bytes) are dropped entirely and replaced by a read-only multi-line block preview.
 *   2. The composed block is NEVER computed client-side: every preview and apply goes through
 *      `bbj/composer/setopts/composeTriState` via the injected {@link SetOptsInCodeRequestSender},
 *      so the server stays the single source of truth for the composed text, the mask hex and
 *      the edit range (matching composer-commands.ts's own file-header convention).
 *   3. Two apply targets: a chain edit-in-place (`SetOptsTriStateTarget`, replacing the
 *      reassignment region `[startLine, endLine)`) or a compose-new insert at the active editor's
 *      cursor line when no target is given.
 */
import * as vscode from 'vscode';
import {
    BYTE_GROUPS, SETOPTS_BITS, SETOPTS_IN_CODE_DEFAULT_VAR, SetOptsBit,
    SetOptsTriState, SetOptsTriStateEntry, SetOptsTriStateSelection,
} from './setopts-catalog.js';
import {
    SETOPTS_COMPOSE_TRISTATE_METHOD, SetOptsComposeTriStateParams, SetOptsComposeTriStateResult,
} from './language/setopts-in-code-request.js';

/**
 * Forwards a JSON-RPC request to the language server. Declared here (rather than in
 * `setopts-in-code-ui.ts`, which imports it) so this panel module has no dependency on the
 * command/Code-Action wiring module — see plan 88-06's own note on this choice. The extension
 * host supplies a closure over the module-level `client.sendRequest`, keeping this module (and
 * `setopts-in-code-ui.ts`) free of a `vscode-languageclient` import so both stay unit-testable
 * under a mocked `vscode`.
 */
export interface SetOptsInCodeRequestSender {
    (method: string, params: unknown): Promise<unknown>;
}

/** The apply target for an existing safe `var$=OPTS … SETOPTS var$` chain (edit-in-place). */
export interface SetOptsTriStateTarget {
    uri: string;
    /** 0-based document line of the first reassignment statement (half-open range start). */
    startLine: number;
    /** 0-based document line of the `SETOPTS` statement (half-open range end, exclusive). */
    endLine: number;
    indent: string;
    variableName: string;
}

export interface SetOptsTriStatePanelArg {
    /** Present = edit an existing safe chain in place. Absent = compose a NEW block at the cursor. */
    target?: SetOptsTriStateTarget;
    /** Prefill selection — e.g. the chain's current folded effect. Defaults every bit to Leave. */
    initial?: SetOptsTriStateSelection;
}

/** The raw form state the webview reports: one Set/Clear/Leave entry per rendered catalog bit. */
interface PanelTriStateSelection {
    entries: Array<{ byte: number; mask: number; state: SetOptsTriState }>;
}

export function openSetOptsTriStateComposerPanel(
    context: vscode.ExtensionContext,
    arg: SetOptsTriStatePanelArg,
    sender: SetOptsInCodeRequestSender,
): void {
    const target = arg.target;
    const editMode = !!target;

    let insertUri: vscode.Uri | undefined;
    let insertLine: number | undefined;
    if (!editMode) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        insertUri = editor.document.uri;
        insertLine = editor.selection.active.line;
    }

    const panel = vscode.window.createWebviewPanel(
        'bbjSetOptsTriStateComposer',
        editMode ? 'Edit SETOPTS block' : 'Compose SETOPTS block',
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
        { enableScripts: true, retainContextWhenHidden: true },
    );
    panel.webview.html = getHtml(panel.webview);

    const variable = target?.variableName ?? SETOPTS_IN_CODE_DEFAULT_VAR;
    const indent = target?.indent ?? '';
    const scope: 'block' | 'reassignments' = editMode ? 'reassignments' : 'block';

    const compose = async (sel: PanelTriStateSelection): Promise<SetOptsComposeTriStateResult> => {
        const entries: SetOptsTriStateEntry[] = sel.entries.map(e => ({ byte: e.byte, mask: e.mask, state: e.state }));
        const params: SetOptsComposeTriStateParams = { selection: { entries }, variable, indent, scope };
        return await sender(SETOPTS_COMPOSE_TRISTATE_METHOD, params) as SetOptsComposeTriStateResult;
    };

    panel.webview.onDidReceiveMessage(async (msg: { type: string; payload?: PanelTriStateSelection }) => {
        switch (msg.type) {
            case 'ready':
                panel.webview.postMessage({
                    type: 'init',
                    editMode,
                    catalog: SETOPTS_BITS,
                    groups: BYTE_GROUPS,
                    initial: initialSelection(arg.initial),
                });
                break;
            case 'change':
                if (msg.payload) {
                    const result = await compose(msg.payload);
                    panel.webview.postMessage({ type: 'preview', ...result });
                }
                break;
            case 'apply': {
                if (!msg.payload) break;
                const result = await compose(msg.payload);
                const text = blockInsertText(result);
                const edit = new vscode.WorkspaceEdit();
                if (target) {
                    const uri = vscode.Uri.parse(target.uri);
                    if (target.startLine === target.endLine) {
                        edit.insert(uri, new vscode.Position(target.startLine, 0), text);
                    } else {
                        edit.replace(uri, new vscode.Range(target.startLine, 0, target.endLine, 0), text);
                    }
                } else if (insertUri !== undefined && insertLine !== undefined) {
                    edit.insert(insertUri, new vscode.Position(insertLine, 0), text);
                }
                await vscode.workspace.applyEdit(edit);
                panel.dispose();
                break;
            }
            case 'cancel':
                panel.dispose();
                break;
        }
    }, undefined, context.subscriptions);
}

/**
 * The text to insert/replace with: the composed block (or reassignment region) followed by a
 * trailing newline so the following line (the `SETOPTS` line, for a chain edit) stays on its own
 * line — or the empty string when the composed region has no lines at all (an all-Leave
 * selection against an existing chain), so the origin and `SETOPTS` lines survive unchanged with
 * nothing inserted between them.
 */
function blockInsertText(result: SetOptsComposeTriStateResult): string {
    return result.lines.length > 0 ? `${result.text}\n` : '';
}

/** Default every catalog bit to Leave, then overlay whatever the prefill selection specifies. */
function initialSelection(sel: SetOptsTriStateSelection | undefined): PanelTriStateSelection {
    return {
        entries: SETOPTS_BITS.map((bit: SetOptsBit) => {
            const found = sel?.entries.find(e => e.byte === bit.byte && e.mask === bit.mask);
            return { byte: bit.byte, mask: bit.mask, state: found?.state ?? 'leave' };
        }),
    };
}

function getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const csp = [
        `default-src 'none'`,
        `style-src ${webview.cspSource} 'unsafe-inline'`,
        `script-src 'nonce-${nonce}'`,
    ].join('; ');
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SETOPTS Composer</title>
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 12px 16px; }
  h2 { margin: 0 0 4px; font-size: 1.1em; }
  .hint { font-size: 0.8em; opacity: 0.7; margin: 0 0 12px; }
  fieldset { border: 1px solid var(--vscode-input-border, var(--vscode-panel-border)); border-radius: 3px; margin: 0 0 10px; padding: 6px 10px 8px; }
  legend { font-size: 0.82em; opacity: 0.85; padding: 0 4px; }
  legend .byte-no { opacity: 0.6; }
  .bits { display: flex; flex-direction: column; gap: 2px; }
  .tri-row { display: flex; align-items: baseline; gap: 10px; font-size: 0.9em; margin: 2px 0; }
  .tri-row code { font-size: 0.85em; opacity: 0.6; }
  .tri-row.ignored { opacity: 0.45; }
  .tri-row.ignored span.lbl { text-decoration: line-through dotted; text-decoration-thickness: 1px; }
  .tri-row .lbl { flex: 1 1 auto; }
  .tri-choice { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
  .tag { font-size: 0.68em; padding: 0 6px; border-radius: 8px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); white-space: nowrap; }
  .note { font-size: 0.78em; opacity: 0.65; margin: 4px 0 0; }
  .preview { margin: 10px 0 4px; }
  pre {
    background: var(--vscode-textCodeBlock-background); border: 1px solid var(--vscode-panel-border);
    padding: 8px 10px; border-radius: 3px; white-space: pre-wrap; word-break: break-all; margin: 4px 0;
    font-size: 1.02em; min-height: 1.2em;
  }
  .buttons { display: flex; gap: 8px; margin-top: 14px; }
  button {
    background: var(--vscode-button-background); color: var(--vscode-button-foreground);
    border: none; padding: 6px 14px; border-radius: 2px; cursor: pointer; font-size: 0.95em;
  }
  button:hover { background: var(--vscode-button-hoverBackground); }
  button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
</style>
</head>
<body>
  <h2 id="heading">SETOPTS Composer</h2>
  <p class="hint">Struck-through options are ignored in BBj (hover for details). Pick Set or Clear only for the options you want this block to change — everything else stays on Leave.</p>

  <div id="byte-fieldsets"></div>

  <div class="preview">
    <label>Generated block</label>
    <pre id="preview">—</pre>
    <p class="note">Options left on Leave, and every option this catalog does not model, are left untouched by the generated block.</p>
  </div>

  <div class="buttons">
    <button id="apply">Apply</button>
    <button id="cancel" class="secondary">Cancel</button>
  </div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);
  const hex2 = (n) => n.toString(16).toUpperCase().padStart(2, '0');
  const STATES = ['set', 'clear', 'leave'];

  function bitTooltip(bit) {
    const parts = ['Byte ' + bit.byte + ' $' + hex2(bit.mask) + '$'];
    if (bit.detail) parts.push(bit.detail);
    if (bit.bbj === 'ignored') parts.push('Ignored in BBj' + (bit.bbjDetail ? ': ' + bit.bbjDetail : '.'));
    else if (bit.bbjDetail) parts.push('BBj: ' + bit.bbjDetail);
    if (bit.bbj === 'bbj-specific') parts.push('BBj-specific (no effect in PRO/5).');
    if (bit.since) parts.push(bit.since);
    return parts.join('\\n');
  }

  function renderCatalog(catalog, groups) {
    const host = $('byte-fieldsets');
    for (const byteNo of Object.keys(groups)) {
      const fs = document.createElement('fieldset');
      const legend = document.createElement('legend');
      legend.innerHTML = 'Byte ' + byteNo + ' <span class="byte-no">— ' + groups[byteNo] + '</span>';
      fs.appendChild(legend);
      const grid = document.createElement('div');
      grid.className = 'bits';
      for (const bit of catalog.filter(b => String(b.byte) === byteNo)) {
        const row = document.createElement('div');
        row.className = 'tri-row' + (bit.bbj === 'ignored' ? ' ignored' : '');
        row.title = bitTooltip(bit);
        row.dataset.byte = String(bit.byte);
        row.dataset.mask = String(bit.mask);
        const code = document.createElement('code');
        code.textContent = '$' + hex2(bit.mask) + '$';
        const lbl = document.createElement('span');
        lbl.className = 'lbl';
        lbl.textContent = bit.label;
        row.appendChild(code); row.appendChild(lbl);
        const name = 'bit-' + bit.byte + '-' + bit.mask;
        for (const state of STATES) {
          const choice = document.createElement('label');
          choice.className = 'tri-choice';
          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = name;
          radio.value = state;
          radio.className = 'tri-radio';
          radio.checked = state === 'leave';
          radio.addEventListener('change', change);
          choice.appendChild(radio);
          choice.appendChild(document.createTextNode(state.charAt(0).toUpperCase() + state.slice(1)));
          row.appendChild(choice);
        }
        if (bit.bbj === 'bbj-specific') { const t = document.createElement('span'); t.className = 'tag'; t.textContent = 'BBj'; row.appendChild(t); }
        if (bit.since) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = bit.since; row.appendChild(t); }
        grid.appendChild(row);
      }
      fs.appendChild(grid);
      host.appendChild(fs);
    }
  }

  function readForm() {
    const entries = [];
    for (const row of document.querySelectorAll('.tri-row')) {
      const byte = Number(row.dataset.byte);
      const mask = Number(row.dataset.mask);
      const checked = row.querySelector('.tri-radio:checked');
      entries.push({ byte, mask, state: checked ? checked.value : 'leave' });
    }
    return { entries };
  }

  function change() {
    vscode.postMessage({ type: 'change', payload: readForm() });
  }

  window.addEventListener('message', (e) => {
    const m = e.data;
    if (m.type === 'init') {
      $('heading').textContent = m.editMode ? 'Edit SETOPTS block' : 'Compose SETOPTS block';
      renderCatalog(m.catalog, m.groups);
      for (const entry of m.initial.entries) {
        const radio = document.querySelector('input[name="bit-' + entry.byte + '-' + entry.mask + '"][value="' + entry.state + '"]');
        if (radio) radio.checked = true;
      }
      change();
    } else if (m.type === 'preview') {
      $('preview').textContent = m.lines && m.lines.length ? m.text : '(no lines — every option left on Leave)';
    }
  });

  $('apply').addEventListener('click', () => vscode.postMessage({ type: 'apply', payload: readForm() }));
  $('cancel').addEventListener('click', () => vscode.postMessage({ type: 'cancel' }));

  vscode.postMessage({ type: 'ready' });
</script>
</body>
</html>`;
}

function getNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < 32; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
}
