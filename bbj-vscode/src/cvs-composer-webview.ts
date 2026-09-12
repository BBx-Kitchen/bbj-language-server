/**
 * Visual CVS() composer — a webview panel that composes a new `CVS(...)` call or edits an
 * existing literal-mask call in place (#649).
 *
 * The panel renders one flat list of the eight documented operation bits (no group headers, no
 * nested scroll container) plus a single `chars` field that stays disabled — never hidden —
 * while none of the checked bits customizes it. No version gating happens here or in
 * ./cvs-composer.ts; the `chars` text is used verbatim.
 *
 * Every mask, statement and validity value comes from `cvsPreview` — this module never computes
 * a mask itself.
 *
 * Three modes:
 *   - NEW (no target): compose a fresh `CVS(...)` call and insert it at the cursor.
 *   - EDIT (from the lightbulb, target.incomplete falsy): the string argument is fixed/read-only;
 *     the panel edits only the bits/chars and replaces the call span in place, refusing to write
 *     if the call text changed since the panel opened.
 *   - COMPLETING (from the lightbulb, target.incomplete true — #649 gap closure): the target call
 *     has no mask yet, so the string stays editable and required; the panel composes a whole call
 *     and replaces the unfinished call's span, through the same staleness guard as EDIT.
 */
import * as vscode from 'vscode';
import { CVS_BITS, CVS_CHARS_TOOLTIP, cvsPreview, findCvsCalls } from './cvs-composer.js';
import { getNonce } from './webview-nonce.js';

/** Where/how to apply an EDIT: the call's span, its verbatim text (for staleness checks), and trailing args. */
export interface CvsEditTarget {
    uri: string;
    line: number;
    callStart: number;
    callEnd: number;
    /** The call's own text at [callStart, callEnd) when the composer opened. */
    callText: string;
    trailingArgs: string[];
    /** The target call has no mask yet — completing mode replaces the whole span with a new call. */
    incomplete?: boolean;
}

export interface CvsPanelArg {
    /** Present = EDIT an existing call's bits/chars in place. Absent = insert a NEW call. */
    target?: CvsEditTarget;
    initial?: { str: string; bits: number[]; chars: string };
}

interface Selection {
    str: string;
    bits: number[];
    chars: string;
    assignTo: string;
}

/**
 * True when `target`'s captured call span still reads exactly `target.callText` in
 * `currentLineText` AND a CVS call still starts and ends at exactly that span. The second check
 * catches an unterminated call the user kept typing (its span runs to the line end, so a growing
 * call keeps the old text as a prefix and would otherwise pass the slice comparison alone).
 */
export function cvsCallStillMatches(currentLineText: string, target: CvsEditTarget): boolean {
    if (currentLineText.slice(target.callStart, target.callEnd) !== target.callText) {
        return false;
    }
    return findCvsCalls(currentLineText).some(c => c.callStart === target.callStart && c.callEnd === target.callEnd);
}

const STALE_CALL_TEXT = 'The CVS() call changed since the composer opened; nothing was applied.';

export function openCvsComposerPanel(context: vscode.ExtensionContext, arg?: CvsPanelArg): void {
    const target = arg?.target;
    const completing = !!target?.incomplete;
    const editMode = !!target && !completing;

    // For a NEW statement, capture the target editor + position now (the webview steals focus).
    // Completing mode also has no cursor-insert position: it replaces `target`'s captured span.
    let insertUri: vscode.Uri | undefined;
    let insertPosition: vscode.Position | undefined;
    if (!target) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Open a BBj file first, then run the CVS() composer.');
            return;
        }
        insertUri = editor.document.uri;
        insertPosition = editor.selection.active;
    }

    const initial = arg?.initial ?? { str: 'a$', bits: [], chars: '' };
    const trailingArgs = target?.trailingArgs ?? [];

    const title = completing ? 'Complete CVS() call' : (editMode ? 'Edit CVS()' : 'CVS() Composer');
    const panel = vscode.window.createWebviewPanel(
        'bbjCvsComposer',
        title,
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
        { enableScripts: true, retainContextWhenHidden: true },
    );
    panel.webview.html = getHtml(panel.webview);

    // Single source of truth: the mask/compose/validate logic lives in the shared pure module,
    // which the IntelliJ client reaches over the LS. Completing mode passes editMode: false (the
    // string is validated as required, same as a NEW call) but omits assignTo — the composed call
    // replaces the whole unfinished call in place, never gets an `x$ = ` prefix of its own.
    const build = (sel: Selection) => cvsPreview({
        str: sel.str, bits: sel.bits, chars: sel.chars,
        assignTo: completing ? undefined : sel.assignTo,
        trailingArgs, editMode,
    });

    panel.webview.onDidReceiveMessage(async (msg: { type: string; payload?: Selection }) => {
        switch (msg.type) {
            case 'ready':
                panel.webview.postMessage({
                    type: 'init',
                    editMode,
                    completing,
                    catalogs: { bits: CVS_BITS, charsTooltip: CVS_CHARS_TOOLTIP },
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
                const edit = new vscode.WorkspaceEdit();
                if (target) {
                    const document = vscode.workspace.textDocuments.find(d => d.uri.toString() === target.uri);
                    if (!document || !cvsCallStillMatches(document.lineAt(target.line).text, target)) {
                        vscode.window.showWarningMessage(STALE_CALL_TEXT);
                        break;
                    }
                    const uri = vscode.Uri.parse(target.uri);
                    const range = new vscode.Range(target.line, target.callStart, target.line, target.callEnd);
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
<title>CVS() Composer</title>
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 12px 16px; }
  h2 { margin: 0 0 12px; font-size: 1.1em; }
  .row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
  label { font-size: 0.85em; opacity: 0.85; }
  input[type="text"] {
    background: var(--vscode-input-background); color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent); padding: 4px 6px; border-radius: 2px;
    font-family: var(--vscode-font-family); font-size: 0.95em;
  }
  input[type="text"]:disabled { opacity: 0.5; }
  input.invalid { border-color: var(--vscode-inputValidation-errorBorder, var(--vscode-errorForeground)); }
  .error { color: var(--vscode-errorForeground); font-size: 0.8em; min-height: 1em; }
  .hint { font-size: 0.8em; opacity: 0.7; min-height: 1em; }
  fieldset { border: 1px solid var(--vscode-input-border, var(--vscode-panel-border)); border-radius: 3px; margin: 0 0 12px; padding: 8px 10px; }
  legend { font-size: 0.82em; opacity: 0.85; padding: 0 4px; }
  #bits { display: flex; flex-direction: column; gap: 2px; }
  .check { display: flex; align-items: center; gap: 6px; font-size: 0.9em; margin: 2px 0; }
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
  <h2 id="heading">CVS() Composer</h2>

  <div class="row">
    <label for="str">String expression</label>
    <input type="text" id="str">
    <div class="hint" id="str-hint"></div>
    <div class="error" id="str-error"></div>
  </div>

  <div class="row" id="assignTo-row">
    <label for="assignTo">Assign result to (optional)</label>
    <input type="text" id="assignTo">
  </div>

  <fieldset>
    <legend>Operations (applied in ascending order)</legend>
    <div id="bits"></div>
  </fieldset>

  <div class="row">
    <label for="chars">Replacement chars (optional)</label>
    <input type="text" id="chars">
    <div class="error" id="chars-error"></div>
  </div>

  <div class="preview">
    <label>Generated call</label>
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
  let editMode = false;
  let completing = false;

  function readForm() {
    const bits = Array.from(document.querySelectorAll('#bits input:checked')).map(c => Number(c.value));
    return {
      str: $('str').value,
      bits,
      chars: $('chars').value,
      assignTo: $('assignTo').value,
    };
  }

  function change() {
    vscode.postMessage({ type: 'change', payload: readForm() });
  }

  window.addEventListener('message', (e) => {
    const m = e.data;
    if (m.type === 'init') {
      editMode = m.editMode;
      completing = m.completing;
      $('heading').textContent = completing ? 'Complete CVS() call' : (editMode ? 'Edit CVS()' : 'CVS() Composer');
      const init = m.initial;
      $('str').value = init.str;
      $('str').readOnly = editMode;
      $('str-hint').textContent = editMode
        ? 'The string argument is kept verbatim.'
        : (completing ? 'Composing replaces the unfinished CVS() call.' : '');
      if (editMode || completing) {
        $('assignTo-row').classList.add('hidden');
      } else {
        $('assignTo').value = '';
      }

      const bitsHost = $('bits');
      bitsHost.innerHTML = '';
      for (const bit of m.catalogs.bits) {
        const wrap = document.createElement('label');
        wrap.className = 'check';
        if (bit.detail) wrap.title = bit.detail;
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.value = String(bit.value);
        if (init.bits.includes(bit.value)) cb.checked = true;
        cb.addEventListener('change', change);
        const span = document.createElement('span');
        span.textContent = bit.label + ' (' + bit.value + ')';
        wrap.appendChild(cb); wrap.appendChild(span); bitsHost.appendChild(wrap);
      }

      $('chars').value = init.chars;
      $('chars').title = m.catalogs.charsTooltip;

      change();
    } else if (m.type === 'preview') {
      $('preview').textContent = m.statement;
      $('summary').textContent = m.summary;
      $('str-error').textContent = m.strError || '';
      $('chars-error').textContent = m.charsError || '';
      $('str').classList.toggle('invalid', !!m.strError);
      $('chars').classList.toggle('invalid', !!m.charsError);
      $('chars').disabled = !m.charsEnabled;
      $('insert').disabled = !m.valid;
    }
  });

  $('str').addEventListener('input', change);
  $('assignTo').addEventListener('input', change);
  $('chars').addEventListener('input', change);
  $('insert').addEventListener('click', () => vscode.postMessage({ type: 'insert', payload: readForm() }));
  $('cancel').addEventListener('click', () => vscode.postMessage({ type: 'cancel' }));

  vscode.postMessage({ type: 'ready' });
</script>
</body>
</html>`;
}
