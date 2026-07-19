/**
 * Visual config.bbx SETOPTS composer — a webview panel with per-byte checkbox groups, char
 * inputs for the byte 5/6 mask replacement characters, a raw-hex passthrough for the reserved
 * bytes 10–16, and a live hex + human-readable preview of the resulting line (#474).
 *
 * The panel is pure presentation: it renders the catalog, sends the raw selection back to the
 * extension, and the shared ./setopts-catalog module computes the resulting vector on top of the
 * ORIGINAL string — which is what makes the round-trip lossless (unknown bits, unmodeled bytes
 * and the original digit count all survive).
 *
 * Two modes:
 *   - EDIT (from the CodeLens/Code Action/command): rewrite the hex token of an existing
 *     `SETOPTS <hex>` line in place (or append the token to a bare `SETOPTS` keyword line).
 *   - NEW (command in a file with no SETOPTS line): insert a whole `SETOPTS <hex>` line at the cursor.
 */
import * as vscode from 'vscode';
import {
    BYTE_GROUPS, SETOPTS_BITS, getBit, maskChar, MASK_COMMA_BYTE, MASK_DOT_BYTE,
    parseVector, rawTail, setoptsPreview, SetOptsSelection, SetOptsVector,
} from './setopts-catalog.js';

export interface SetOptsEditTarget {
    uri: string;
    line: number;
    /** Replace this existing hex token… */
    hexRange?: [number, number];
    /** …or insert ` <hex>` here when the line is a bare `SETOPTS` keyword. */
    insertOffset?: number;
    /** The original hex digits — the lossless round-trip baseline. */
    originalHex?: string;
}

export interface SetOptsPanelArg {
    /** Present = EDIT a SETOPTS line in place. Absent = insert a NEW line at the cursor. */
    target?: SetOptsEditTarget;
}

/** The raw form state the webview reports; mirrors {@link SetOptsSelection} with string bit ids. */
interface PanelSelection {
    checked: string[]; // "byte:mask" ids
    maskComma: string;
    maskDot: string;
    rawTail: string;
}

export function openSetOptsComposerPanel(context: vscode.ExtensionContext, arg: SetOptsPanelArg): void {
    const target = arg.target;
    const editMode = !!target;
    const original: SetOptsVector | undefined = target?.originalHex ? parseVector(target.originalHex) : undefined;

    let insertUri: vscode.Uri | undefined;
    let insertLine: number | undefined;
    if (!editMode) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        insertUri = editor.document.uri;
        insertLine = editor.selection.active.line;
    }

    const panel = vscode.window.createWebviewPanel(
        'bbjSetOptsComposer',
        editMode ? 'Edit SETOPTS' : 'SETOPTS Composer',
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
        { enableScripts: true, retainContextWhenHidden: true },
    );
    panel.webview.html = getHtml(panel.webview);

    const build = (sel: PanelSelection) => setoptsPreview(original, toSelection(sel));

    panel.webview.onDidReceiveMessage(async (msg: { type: string; payload?: PanelSelection }) => {
        switch (msg.type) {
            case 'ready':
                panel.webview.postMessage({
                    type: 'init',
                    editMode,
                    catalog: SETOPTS_BITS,
                    groups: BYTE_GROUPS,
                    initial: initialSelection(original),
                });
                break;
            case 'change':
                if (msg.payload) panel.webview.postMessage({ type: 'preview', ...build(msg.payload) });
                break;
            case 'apply': {
                if (!msg.payload) break;
                const r = build(msg.payload);
                const edit = new vscode.WorkspaceEdit();
                if (target) {
                    const uri = vscode.Uri.parse(target.uri);
                    if (target.hexRange) {
                        edit.replace(uri,
                            new vscode.Range(target.line, target.hexRange[0], target.line, target.hexRange[1]),
                            r.hexDigits);
                    } else if (target.insertOffset !== undefined) {
                        edit.insert(uri, new vscode.Position(target.line, target.insertOffset), ` ${r.hexDigits}`);
                    }
                } else if (insertUri !== undefined && insertLine !== undefined) {
                    edit.insert(insertUri, new vscode.Position(insertLine, 0), `${r.line}\n`);
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

function toSelection(sel: PanelSelection): SetOptsSelection {
    return {
        bits: sel.checked.map(id => {
            const [byte, mask] = id.split(':').map(Number);
            return { byte, mask };
        }),
        maskComma: sel.maskComma,
        maskDot: sel.maskDot,
        rawTail: sel.rawTail.toUpperCase(),
    };
}

function initialSelection(original: SetOptsVector | undefined): PanelSelection {
    if (!original) return { checked: [], maskComma: '', maskDot: '', rawTail: '' };
    return {
        checked: SETOPTS_BITS.filter(b => getBit(original, b.byte, b.mask)).map(b => `${b.byte}:${b.mask}`),
        maskComma: maskChar(original, MASK_COMMA_BYTE),
        maskDot: maskChar(original, MASK_DOT_BYTE),
        rawTail: rawTail(original),
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
  .bits { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px 18px; }
  .check { display: flex; align-items: baseline; gap: 6px; font-size: 0.9em; margin: 2px 0; }
  .check code { font-size: 0.85em; opacity: 0.6; }
  .check.ignored { opacity: 0.45; }
  .check.ignored span.lbl { text-decoration: line-through dotted; text-decoration-thickness: 1px; }
  .tag { font-size: 0.68em; padding: 0 6px; border-radius: 8px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); white-space: nowrap; }
  .row { display: flex; align-items: center; gap: 10px; font-size: 0.9em; margin: 4px 0; }
  input[type="text"] {
    background: var(--vscode-input-background); color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent); padding: 3px 6px; border-radius: 2px;
    font-family: var(--vscode-editor-font-family, monospace); font-size: 0.95em;
  }
  input[type="text"]:disabled { opacity: 0.4; }
  .char-input { width: 2.2em; text-align: center; }
  #raw-tail { width: 12em; text-transform: uppercase; }
  .note { font-size: 0.78em; opacity: 0.65; }
  .preview { margin: 10px 0 4px; }
  pre {
    background: var(--vscode-textCodeBlock-background); border: 1px solid var(--vscode-panel-border);
    padding: 8px 10px; border-radius: 3px; white-space: pre-wrap; word-break: break-all; margin: 4px 0;
    font-size: 1.02em;
  }
  .summary { font-size: 0.8em; opacity: 0.75; min-height: 1.1em; }
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
  <p class="hint">Struck-through options are ignored in BBj (hover for details). Unknown bits and reserved bytes are preserved verbatim.</p>

  <div id="byte-fieldsets"></div>

  <fieldset>
    <legend>Bytes 5–6 <span class="byte-no">— mask replacement characters</span></legend>
    <div class="row">
      <label for="mask-comma">"," becomes</label><input type="text" id="mask-comma" class="char-input" maxlength="1">
      <label for="mask-dot">"." becomes</label><input type="text" id="mask-dot" class="char-input" maxlength="1">
      <span class="note" id="mask-note">Enable "mask replacement characters" (byte 3 $02$) to edit.</span>
    </div>
  </fieldset>

  <fieldset>
    <legend>Bytes 10–16 <span class="byte-no">— reserved / application use</span></legend>
    <div class="row">
      <label for="raw-tail">Raw hex</label><input type="text" id="raw-tail" maxlength="14" spellcheck="false">
      <span class="note">Passed through untouched; leave empty to end the vector at byte 9.</span>
    </div>
  </fieldset>

  <div class="preview">
    <label>Resulting config.bbx line</label>
    <pre id="preview">—</pre>
    <div class="summary" id="summary"></div>
  </div>

  <div class="buttons">
    <button id="apply">Apply</button>
    <button id="cancel" class="secondary">Cancel</button>
  </div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);
  const hex2 = (n) => n.toString(16).toUpperCase().padStart(2, '0');

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
        const wrap = document.createElement('label');
        wrap.className = 'check' + (bit.bbj === 'ignored' ? ' ignored' : '');
        wrap.title = bitTooltip(bit);
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = bit.byte + ':' + bit.mask;
        cb.className = 'bit-cb';
        cb.addEventListener('change', change);
        const code = document.createElement('code');
        code.textContent = '$' + hex2(bit.mask) + '$';
        const lbl = document.createElement('span');
        lbl.className = 'lbl';
        lbl.textContent = bit.label;
        wrap.appendChild(cb); wrap.appendChild(code); wrap.appendChild(lbl);
        if (bit.bbj === 'bbj-specific') { const t = document.createElement('span'); t.className = 'tag'; t.textContent = 'BBj'; wrap.appendChild(t); }
        if (bit.since) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = bit.since; wrap.appendChild(t); }
        grid.appendChild(wrap);
      }
      fs.appendChild(grid);
      host.appendChild(fs);
    }
  }

  function readForm() {
    return {
      checked: Array.from(document.querySelectorAll('.bit-cb:checked')).map(c => c.value),
      maskComma: $('mask-comma').value,
      maskDot: $('mask-dot').value,
      rawTail: $('raw-tail').value.replace(/[^0-9A-Fa-f]/g, ''),
    };
  }

  function change() {
    vscode.postMessage({ type: 'change', payload: readForm() });
  }

  window.addEventListener('message', (e) => {
    const m = e.data;
    if (m.type === 'init') {
      $('heading').textContent = m.editMode ? 'Edit SETOPTS' : 'SETOPTS Composer';
      renderCatalog(m.catalog, m.groups);
      for (const cb of document.querySelectorAll('.bit-cb')) {
        cb.checked = m.initial.checked.includes(cb.value);
      }
      $('mask-comma').value = m.initial.maskComma;
      $('mask-dot').value = m.initial.maskDot;
      $('raw-tail').value = m.initial.rawTail;
      change();
    } else if (m.type === 'preview') {
      $('preview').textContent = m.line;
      $('summary').textContent = m.hexDigits.length / 2 + ' byte(s)  ·  ' + m.summary;
      $('mask-comma').disabled = !m.maskInputsEnabled;
      $('mask-dot').disabled = !m.maskInputsEnabled;
      $('mask-note').style.display = m.maskInputsEnabled ? 'none' : '';
    }
  });

  for (const id of ['mask-comma', 'mask-dot', 'raw-tail']) {
    $(id).addEventListener('input', change);
  }
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
