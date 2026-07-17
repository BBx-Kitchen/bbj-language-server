/**
 * Visual MSGBOX composer — a webview panel with a live preview of the generated statement (#426).
 *
 * The panel is pure presentation: it renders a form from the option catalog and sends the raw
 * selection back to the extension, which computes `expr`/statement text with the shared
 * ./msgbox-composer logic (no flag math is duplicated in the webview). On "Insert" the composed
 * statement is written into the editor that was active when the panel opened.
 */
import * as vscode from 'vscode';
import {
    BUTTON_SETS, ICONS, DEFAULT_BUTTONS, FLAGS,
    encode, describe, composeStatement, stateFromSelection,
} from './msgbox-composer.js';

interface Selection {
    buttonSet: number;
    icon: number;
    defaultButton: number;
    flags: number[];
    message: string;
    title: string;
    assignTo: string;
}

export function openMsgboxComposerPanel(context: vscode.ExtensionContext): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('Open a BBj file first, then run the MSGBOX composer.');
        return;
    }
    const targetUri = editor.document.uri;
    const insertPosition = editor.selection.active;

    const panel = vscode.window.createWebviewPanel(
        'bbjMsgboxComposer',
        'MSGBOX Composer',
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
        { enableScripts: true, retainContextWhenHidden: true },
    );
    panel.webview.html = getHtml(panel.webview);

    function build(sel: Selection): { expr: number; statement: string; summary: string } {
        const expr = encode(stateFromSelection(sel));
        const statement = composeStatement({
            message: sel.message || '""',
            expr,
            title: sel.title || undefined,
            assignTo: sel.assignTo || undefined,
        });
        return { expr, statement, summary: describe(expr) };
    }

    panel.webview.onDidReceiveMessage(async (msg: { type: string; payload?: Selection }) => {
        switch (msg.type) {
            case 'ready':
                panel.webview.postMessage({
                    type: 'init',
                    catalogs: { buttonSets: BUTTON_SETS, icons: ICONS, defaultButtons: DEFAULT_BUTTONS, flags: FLAGS },
                });
                break;
            case 'change':
                if (msg.payload) {
                    panel.webview.postMessage({ type: 'preview', ...build(msg.payload) });
                }
                break;
            case 'insert':
                if (msg.payload) {
                    const { statement } = build(msg.payload);
                    const doc = await vscode.workspace.openTextDocument(targetUri);
                    const target = await vscode.window.showTextDocument(doc, { preserveFocus: false });
                    await target.edit(b => b.insert(insertPosition, statement));
                    panel.dispose();
                }
                break;
            case 'cancel':
                panel.dispose();
                break;
        }
    }, undefined, context.subscriptions);
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
<title>MSGBOX Composer</title>
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 12px 16px; }
  h2 { margin: 0 0 12px; font-size: 1.1em; }
  .row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
  label { font-size: 0.85em; opacity: 0.85; }
  select, input[type="text"] {
    background: var(--vscode-input-background); color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent); padding: 4px 6px; border-radius: 2px;
    font-family: var(--vscode-font-family); font-size: 0.95em;
  }
  fieldset { border: 1px solid var(--vscode-input-border, var(--vscode-panel-border)); border-radius: 3px; margin: 0 0 12px; padding: 8px 10px; }
  legend { font-size: 0.82em; opacity: 0.85; padding: 0 4px; }
  .check { display: flex; align-items: center; gap: 6px; font-size: 0.9em; margin: 3px 0; }
  .preview { margin: 8px 0 4px; }
  pre {
    background: var(--vscode-textCodeBlock-background); border: 1px solid var(--vscode-panel-border);
    padding: 8px 10px; border-radius: 3px; white-space: pre-wrap; word-break: break-all; margin: 4px 0;
  }
  .summary { font-size: 0.82em; opacity: 0.75; min-height: 1.1em; }
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
  <h2>MSGBOX Composer</h2>

  <div class="row">
    <label for="message">Message expression</label>
    <input type="text" id="message" value='"Message"'>
  </div>
  <div class="row">
    <label for="title">Title expression (optional)</label>
    <input type="text" id="title" value="">
  </div>
  <div class="row">
    <label for="assignTo">Assign result to (optional)</label>
    <input type="text" id="assignTo" value="ret!">
  </div>

  <div class="row">
    <label for="icon">Icon</label>
    <select id="icon"></select>
  </div>
  <div class="row">
    <label for="buttonSet">Buttons</label>
    <select id="buttonSet"></select>
  </div>
  <div class="row">
    <label for="defaultButton">Default button</label>
    <select id="defaultButton"></select>
  </div>

  <fieldset id="flags"><legend>Extra options</legend></fieldset>

  <div class="preview">
    <label>Preview</label>
    <pre id="preview">—</pre>
    <div class="summary" id="summary"></div>
  </div>

  <div class="buttons">
    <button id="insert">Insert</button>
    <button id="cancel" class="secondary">Cancel</button>
  </div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);

  function fillSelect(sel, items) {
    sel.innerHTML = '';
    for (const it of items) {
      const opt = document.createElement('option');
      opt.value = String(it.value);
      opt.textContent = it.label + '  (' + it.value + ')';
      sel.appendChild(opt);
    }
  }

  function readForm() {
    const flags = Array.from(document.querySelectorAll('#flags input:checked')).map(c => Number(c.value));
    return {
      buttonSet: Number($('buttonSet').value || 0),
      icon: Number($('icon').value || 0),
      defaultButton: Number($('defaultButton').value || 0),
      flags,
      message: $('message').value,
      title: $('title').value,
      assignTo: $('assignTo').value,
    };
  }

  function change() { vscode.postMessage({ type: 'change', payload: readForm() }); }

  window.addEventListener('message', (e) => {
    const m = e.data;
    if (m.type === 'init') {
      fillSelect($('icon'), m.catalogs.icons);
      fillSelect($('buttonSet'), m.catalogs.buttonSets);
      fillSelect($('defaultButton'), m.catalogs.defaultButtons);
      const fs = $('flags');
      for (const f of m.catalogs.flags) {
        const wrap = document.createElement('label');
        wrap.className = 'check';
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.value = String(f.value); cb.addEventListener('change', change);
        const span = document.createElement('span');
        span.textContent = f.label;
        wrap.appendChild(cb); wrap.appendChild(span); fs.appendChild(wrap);
      }
      change();
    } else if (m.type === 'preview') {
      $('preview').textContent = m.statement;
      $('summary').textContent = 'expr = ' + m.expr + '  ·  ' + m.summary;
    }
  });

  for (const id of ['message', 'title', 'assignTo', 'icon', 'buttonSet', 'defaultButton']) {
    $(id).addEventListener('input', change);
    $(id).addEventListener('change', change);
  }
  $('insert').addEventListener('click', () => vscode.postMessage({ type: 'insert', payload: readForm() }));
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
