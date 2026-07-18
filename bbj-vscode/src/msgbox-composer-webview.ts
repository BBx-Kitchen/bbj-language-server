/**
 * Visual MSGBOX composer — a webview panel with a schematic dialog preview + generated statement (#426).
 *
 * The panel is pure presentation: it renders a form from the option catalog and sends the raw
 * selection back to the extension, which computes `expr`/statement text, validates the
 * message/title, and produces the schematic render with the shared ./msgbox-composer logic
 * (no flag math / button labels are duplicated here).
 *
 * Two modes:
 *   - NEW (no arg): compose a fresh `ret! = MSGBOX(...)` and insert it at the cursor.
 *   - EDIT (arg from the Code Action): prefill from an existing call and replace that call span
 *     in place, preserving the assignment prefix and any trailing args we don't model.
 */
import * as vscode from 'vscode';
import {
    BUTTON_SETS, ICONS, DEFAULT_BUTTONS, FLAGS,
    msgboxPreview,
} from './msgbox-composer.js';

export interface MsgboxPanelArg {
    /** Replace an existing call span in place (from the Code Action). Absent = insert new at cursor. */
    target?: { uri: string; line: number; callStart: number; callEnd: number; trailingArgs: string[] };
    /** Prefill values for the form. */
    initial?: {
        message: string;
        title: string;
        assignTo?: string;
        buttonSet: number;
        icon: number;
        defaultButton: number;
        flags: number[];
        customButtons: string[];
    };
}

interface Selection {
    buttonSet: number;
    icon: number;
    defaultButton: number;
    flags: number[];
    customButtons: string[];
    message: string;
    title: string;
    assignTo: string;
    useConstants: boolean;
}

export function openMsgboxComposerPanel(context: vscode.ExtensionContext, arg?: MsgboxPanelArg): void {
    const editMode = !!arg?.target;

    // For a NEW statement, capture the target editor + position now (the webview steals focus).
    let insertUri: vscode.Uri | undefined;
    let insertPosition: vscode.Position | undefined;
    if (!editMode) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Open a BBj file first, then run the MSGBOX composer.');
            return;
        }
        insertUri = editor.document.uri;
        insertPosition = editor.selection.active;
    }

    const initial = arg?.initial ?? {
        message: '"Message"', title: '', assignTo: 'ret!',
        buttonSet: 0, icon: 0, defaultButton: 0, flags: [], customButtons: [],
    };
    const trailingArgs = arg?.target?.trailingArgs ?? [];

    const panel = vscode.window.createWebviewPanel(
        'bbjMsgboxComposer',
        editMode ? 'Edit MSGBOX' : 'MSGBOX Composer',
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
        { enableScripts: true, retainContextWhenHidden: true },
    );
    panel.webview.html = getHtml(panel.webview);

    // Single source of truth: the compose/validate/render logic lives in the shared pure module,
    // which the IntelliJ client reaches over the LS (#433).
    const build = (sel: Selection) => msgboxPreview({ ...sel, trailingArgs, editMode });

    panel.webview.onDidReceiveMessage(async (msg: { type: string; payload?: Selection }) => {
        switch (msg.type) {
            case 'ready':
                panel.webview.postMessage({
                    type: 'init',
                    editMode,
                    catalogs: { buttonSets: BUTTON_SETS, icons: ICONS, defaultButtons: DEFAULT_BUTTONS, flags: FLAGS },
                    initial,
                });
                break;
            case 'change':
                if (msg.payload) {
                    panel.webview.postMessage({ type: 'preview', ...build(msg.payload) });
                }
                break;
            case 'insert': {
                if (!msg.payload) break;
                const r = build(msg.payload);
                if (!r.valid) break; // guard; the webview also disables the button
                // Apply via a WorkspaceEdit so the change lands in the existing editor tab
                // without opening the document again in the webview's (Beside) column.
                const edit = new vscode.WorkspaceEdit();
                if (editMode && arg?.target) {
                    const uri = vscode.Uri.parse(arg.target.uri);
                    const range = new vscode.Range(arg.target.line, arg.target.callStart, arg.target.line, arg.target.callEnd);
                    edit.replace(uri, range, r.statement);
                } else if (insertUri && insertPosition) {
                    edit.insert(insertUri, insertPosition, r.statement);
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
  .row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
  label { font-size: 0.85em; opacity: 0.85; }
  select, input[type="text"] {
    background: var(--vscode-input-background); color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent); padding: 4px 6px; border-radius: 2px;
    font-family: var(--vscode-font-family); font-size: 0.95em;
  }
  input.invalid { border-color: var(--vscode-inputValidation-errorBorder, var(--vscode-errorForeground)); }
  .error { color: var(--vscode-errorForeground); font-size: 0.8em; min-height: 1em; }
  fieldset { border: 1px solid var(--vscode-input-border, var(--vscode-panel-border)); border-radius: 3px; margin: 0 0 12px; padding: 8px 10px; }
  legend { font-size: 0.82em; opacity: 0.85; padding: 0 4px; }
  .check { display: flex; align-items: center; gap: 6px; font-size: 0.9em; margin: 3px 0; }
  #customButtons input { margin-bottom: 6px; width: 100%; box-sizing: border-box; }

  .mock-wrap { margin: 6px 0 12px; }
  .mock {
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 4px; overflow: hidden; max-width: 340px;
    background: var(--vscode-editorWidget-background, var(--vscode-editor-background));
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  }
  .mock-title {
    background: var(--vscode-titleBar-activeBackground, var(--vscode-editorGroupHeader-tabsBackground));
    color: var(--vscode-titleBar-activeForeground, var(--vscode-foreground));
    padding: 5px 10px; font-size: 0.85em; font-weight: 600;
  }
  .mock-body { display: flex; align-items: flex-start; gap: 10px; padding: 14px 12px; }
  .mock-icon { font-size: 1.6em; line-height: 1; }
  .mock-msg { font-size: 0.92em; white-space: pre-wrap; word-break: break-word; }
  .mock-buttons { display: flex; justify-content: flex-end; gap: 6px; padding: 8px 12px; }
  .mock-btn {
    border: 1px solid var(--vscode-button-border, var(--vscode-contrastBorder, transparent));
    background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);
    padding: 3px 12px; border-radius: 2px; font-size: 0.85em; min-width: 54px; text-align: center;
  }
  .mock-btn.default {
    background: var(--vscode-button-background); color: var(--vscode-button-foreground);
    outline: 2px solid var(--vscode-focusBorder); outline-offset: 1px; font-weight: 600;
  }

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
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
  .hidden { display: none; }
</style>
</head>
<body>
  <h2 id="heading">MSGBOX Composer</h2>

  <div class="mock-wrap">
    <div class="mock">
      <div class="mock-title" id="mock-title"></div>
      <div class="mock-body"><span class="mock-icon" id="mock-icon"></span><span class="mock-msg" id="mock-msg"></span></div>
      <div class="mock-buttons" id="mock-buttons"></div>
    </div>
  </div>

  <div class="row">
    <label for="message">Message expression</label>
    <input type="text" id="message">
    <div class="error" id="message-error"></div>
  </div>
  <div class="row">
    <label for="title">Title expression (optional)</label>
    <input type="text" id="title">
    <div class="error" id="title-error"></div>
  </div>
  <div class="row" id="assignTo-row">
    <label for="assignTo">Assign result to (optional)</label>
    <input type="text" id="assignTo">
  </div>

  <div class="row">
    <label for="icon">Icon</label>
    <select id="icon"></select>
  </div>
  <div class="row">
    <label for="buttonSet">Buttons</label>
    <select id="buttonSet"></select>
  </div>

  <fieldset id="customButtons" class="hidden">
    <legend>Custom button labels</legend>
    <input type="text" id="customBtn0" placeholder='e.g. "Left"'>
    <input type="text" id="customBtn1" placeholder='e.g. "Right"'>
    <input type="text" id="customBtn2" placeholder="(optional)">
    <div class="error" id="custom-error"></div>
  </fieldset>

  <div class="row">
    <label for="defaultButton">Default button</label>
    <select id="defaultButton"></select>
  </div>

  <fieldset id="flags"><legend>Extra options</legend></fieldset>

  <div class="check" style="margin: 4px 0 10px;">
    <input type="checkbox" id="useConstants">
    <label for="useConstants" style="opacity:1;">Use named constants (<code>BBjMsgBox.*</code>) instead of a numeric code</label>
  </div>

  <div class="preview">
    <label>Generated statement</label>
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
  const ICON_GLYPH = { 16: '🛑', 32: '❓', 48: '⚠️', 64: 'ℹ️' };

  function fillSelect(sel, items, value) {
    sel.innerHTML = '';
    for (const it of items) {
      const opt = document.createElement('option');
      opt.value = String(it.value);
      opt.textContent = it.label + '  (' + it.value + ')';
      if (it.value === value) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  function toggleCustom() {
    $('customButtons').classList.toggle('hidden', Number($('buttonSet').value) !== 7);
  }

  function readForm() {
    const flags = Array.from(document.querySelectorAll('#flags input:checked')).map(c => Number(c.value));
    return {
      buttonSet: Number($('buttonSet').value || 0),
      icon: Number($('icon').value || 0),
      defaultButton: Number($('defaultButton').value || 0),
      flags,
      customButtons: [$('customBtn0').value, $('customBtn1').value, $('customBtn2').value],
      message: $('message').value,
      title: $('title').value,
      assignTo: $('assignTo').value,
      useConstants: $('useConstants').checked,
    };
  }

  function change() { toggleCustom(); vscode.postMessage({ type: 'change', payload: readForm() }); }

  window.addEventListener('message', (e) => {
    const m = e.data;
    if (m.type === 'init') {
      $('heading').textContent = m.editMode ? 'Edit MSGBOX' : 'MSGBOX Composer';
      const init = m.initial;
      $('message').value = init.message;
      $('title').value = init.title;
      $('assignTo').value = init.assignTo || '';
      if (m.editMode) $('assignTo-row').classList.add('hidden');
      $('customBtn0').value = init.customButtons[0] || '';
      $('customBtn1').value = init.customButtons[1] || '';
      $('customBtn2').value = init.customButtons[2] || '';
      fillSelect($('icon'), m.catalogs.icons, init.icon);
      fillSelect($('buttonSet'), m.catalogs.buttonSets, init.buttonSet);
      fillSelect($('defaultButton'), m.catalogs.defaultButtons, init.defaultButton);
      const fs = $('flags');
      for (const f of m.catalogs.flags) {
        const wrap = document.createElement('label');
        wrap.className = 'check';
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.value = String(f.value);
        if (init.flags.includes(f.value)) cb.checked = true;
        cb.addEventListener('change', change);
        const span = document.createElement('span');
        span.textContent = f.label;
        wrap.appendChild(cb); wrap.appendChild(span); fs.appendChild(wrap);
      }
      toggleCustom();
      change();
    } else if (m.type === 'preview') {
      $('preview').textContent = m.statement;
      $('summary').textContent = 'expr = ' + m.expr + '  ·  ' + m.summary;
      $('message-error').textContent = m.messageError || '';
      $('title-error').textContent = m.titleError || '';
      $('custom-error').textContent = m.customError || '';
      $('message').classList.toggle('invalid', !!m.messageError);
      $('title').classList.toggle('invalid', !!m.titleError);
      $('insert').disabled = !m.valid;
      // schematic dialog
      const r = m.render;
      $('mock-title').textContent = r.title || '(no title)';
      $('mock-icon').textContent = ICON_GLYPH[r.icon] || '';
      $('mock-msg').textContent = r.message || '';
      const mb = $('mock-buttons'); mb.innerHTML = '';
      r.buttons.forEach((b, i) => {
        const el = document.createElement('span');
        el.className = 'mock-btn' + (i === r.defaultIndex ? ' default' : '');
        el.textContent = b;
        mb.appendChild(el);
      });
    }
  });

  for (const id of ['message', 'title', 'assignTo', 'icon', 'buttonSet', 'defaultButton', 'customBtn0', 'customBtn1', 'customBtn2']) {
    $(id).addEventListener('input', change);
    $(id).addEventListener('change', change);
  }
  $('useConstants').addEventListener('change', change);
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
