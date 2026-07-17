/**
 * Visual BBjSysGui::addWindow composer — a webview panel with grouped flag checkboxes, a
 * collapsible (opt-in) event-mask sub-area, a live schematic window preview, and the generated
 * statement (#430).
 *
 * The panel is pure presentation: it renders the two catalogs, groups them, and sends the raw
 * selection back to the extension, which computes the `$flags$` / `$event_mask$` hex, the
 * statement text, and the schematic descriptor with the shared ./addwindow-composer logic.
 *
 * Two modes:
 *   - NEW (no target): compose a fresh `window! = sysgui!.addWindow(...)` and insert it at the cursor.
 *   - EDIT (from the Code Action): the geometry/title are fixed in the source; the panel edits only
 *     the `$flags$` (and optional `$event_mask$`) hex tokens and applies them in place.
 */
import * as vscode from 'vscode';
import {
    WINDOW_FLAGS, EVENT_MASK_BITS, encodeBits, formatHex, describeFlags,
    describeEventMask, windowSchematic, composeAddWindow,
} from './addwindow-composer.js';
// Reuse the small display-text helper from the MSGBOX composer scaffolding (#426).
import { expressionDisplayText } from './msgbox-composer.js';

/** Where/how to apply an EDIT: token ranges to replace, or offsets to insert at. */
export interface AddWindowEditTarget {
    uri: string;
    line: number;
    /** Replace the existing flags literal, or insert `, $flags$` at this offset if there is none. */
    flagsRange?: [number, number];
    flagsInsertOffset?: number;
    /** Replace the existing event_mask literal, or insert `, $mask$` at this offset (opt-in). */
    eventMaskRange?: [number, number];
    eventMaskInsertOffset?: number;
    /** Preserved bits the catalog doesn't model, OR-ed back in on encode (round-trip safety). */
    preservedFlagBits: number;
    preservedEventBits: number;
}

export interface AddWindowPanelArg {
    /** Present = EDIT an existing call's hex tokens in place. Absent = insert a NEW statement. */
    target?: AddWindowEditTarget;
    initial?: {
        flags: number;
        /** null = event mask unset (window default); a number = configured. */
        eventMask: number | null;
        /** For the preview only in EDIT mode; the full form in NEW mode. */
        receiver: string;
        sysgui: string;
        x: string;
        y: string;
        width: string;
        height: string;
        title: string;
    };
}

interface Selection {
    flags: number[];
    eventMaskEnabled: boolean;
    eventMask: number[];
    receiver: string;
    sysgui: string;
    x: string;
    y: string;
    width: string;
    height: string;
    title: string;
}

const DEFAULT_INITIAL = {
    // Resizable + Close box + Keyboard navigation — the shape of the BASIS doc example ($00010003$).
    flags: 0x00010003,
    eventMask: null as number | null,
    receiver: 'window!', sysgui: 'sysgui!',
    x: '10', y: '10', width: '400', height: '300', title: '"Window"',
};

export function openAddWindowComposerPanel(context: vscode.ExtensionContext, arg?: AddWindowPanelArg): void {
    const editMode = !!arg?.target;

    let insertUri: vscode.Uri | undefined;
    let insertPosition: vscode.Position | undefined;
    if (!editMode) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Open a BBj file first, then run the addWindow composer.');
            return;
        }
        insertUri = editor.document.uri;
        insertPosition = editor.selection.active;
    }

    const initial = { ...DEFAULT_INITIAL, ...(arg?.initial ?? {}) };
    const target = arg?.target;

    const panel = vscode.window.createWebviewPanel(
        'bbjAddWindowComposer',
        editMode ? 'Edit addWindow flags' : 'addWindow Composer',
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
        { enableScripts: true, retainContextWhenHidden: true },
    );
    panel.webview.html = getHtml(panel.webview);

    function build(sel: Selection) {
        const flags = encodeBits(sel.flags);
        const eventMask = sel.eventMaskEnabled ? encodeBits(sel.eventMask) : null;
        const flagsHex = formatHex(flags | (target?.preservedFlagBits ?? 0));
        const eventHex = eventMask === null ? null : formatHex(eventMask | (target?.preservedEventBits ?? 0));

        const statement = composeAddWindow({
            receiver: editMode ? undefined : (sel.receiver || undefined),
            sysgui: sel.sysgui || 'sysgui!',
            x: sel.x || '0', y: sel.y || '0', width: sel.width || '0', height: sel.height || '0',
            title: sel.title || '""',
            flags, eventMask,
        });

        return {
            flagsHex, eventHex, statement,
            flagsSummary: describeFlags(flags),
            eventSummary: eventMask === null ? '(default)' : describeEventMask(eventMask),
            render: { ...windowSchematic(flags), title: expressionDisplayText(sel.title) },
        };
    }

    panel.webview.onDidReceiveMessage(async (msg: { type: string; payload?: Selection }) => {
        switch (msg.type) {
            case 'ready':
                panel.webview.postMessage({
                    type: 'init',
                    editMode,
                    catalogs: { flags: WINDOW_FLAGS, eventBits: EVENT_MASK_BITS },
                    initial,
                });
                break;
            case 'change':
                if (msg.payload) panel.webview.postMessage({ type: 'preview', ...build(msg.payload) });
                break;
            case 'insert': {
                if (!msg.payload) break;
                const r = build(msg.payload);
                const edit = new vscode.WorkspaceEdit();
                if (editMode && target) {
                    applyEdit(edit, msg.payload, r, target);
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

/** EDIT mode: rewrite only the flags (and, if enabled, event_mask) hex tokens in place. */
function applyEdit(edit: vscode.WorkspaceEdit, sel: Selection, r: { flagsHex: string; eventHex: string | null }, target: AddWindowEditTarget): void {
    const uri = vscode.Uri.parse(target.uri);
    const at = (col: number) => new vscode.Position(target.line, col);

    if (target.flagsRange) {
        edit.replace(uri, new vscode.Range(at(target.flagsRange[0]), at(target.flagsRange[1])), r.flagsHex);
    } else if (target.flagsInsertOffset !== undefined) {
        edit.insert(uri, at(target.flagsInsertOffset), `, ${r.flagsHex}`);
    }

    // Event mask: replace an existing token, or insert one when the user opts in. (Removing an
    // existing event_mask arg is out of scope for the spike — omitting vs. $00000000$ differ.)
    if (r.eventHex !== null) {
        if (target.eventMaskRange) {
            edit.replace(uri, new vscode.Range(at(target.eventMaskRange[0]), at(target.eventMaskRange[1])), r.eventHex);
        } else if (target.eventMaskInsertOffset !== undefined) {
            edit.insert(uri, at(target.eventMaskInsertOffset), `, ${r.eventHex}`);
        }
    }
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
<title>addWindow Composer</title>
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 12px 16px; }
  h2 { margin: 0 0 12px; font-size: 1.1em; }
  .row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  label { font-size: 0.85em; opacity: 0.85; }
  input[type="text"] {
    background: var(--vscode-input-background); color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent); padding: 4px 6px; border-radius: 2px;
    font-family: var(--vscode-font-family); font-size: 0.95em;
  }
  fieldset { border: 1px solid var(--vscode-input-border, var(--vscode-panel-border)); border-radius: 3px; margin: 0 0 12px; padding: 8px 10px; }
  legend { font-size: 0.82em; opacity: 0.85; padding: 0 4px; }
  .flag-groups { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 18px; }
  .group-title { font-size: 0.78em; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.6; margin: 6px 0 2px; }
  .check { display: flex; align-items: center; gap: 6px; font-size: 0.9em; margin: 2px 0; }

  .mock-wrap { margin: 6px 0 12px; display: flex; justify-content: center; }
  .mock {
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 4px; overflow: hidden; width: 300px;
    background: var(--vscode-editorWidget-background, var(--vscode-editor-background));
    box-shadow: 0 2px 8px rgba(0,0,0,0.25); position: relative;
  }
  .mock.thick-border { border-width: 3px; }
  .mock.disabled { opacity: 0.5; }
  .mock.invisible { opacity: 0.28; border-style: dashed; }
  .mock-title {
    background: var(--vscode-titleBar-activeBackground, var(--vscode-editorGroupHeader-tabsBackground));
    color: var(--vscode-titleBar-activeForeground, var(--vscode-foreground));
    padding: 4px 8px; font-size: 0.82em; font-weight: 600; display: flex; align-items: center; justify-content: space-between;
  }
  .mock-title .btns { display: flex; gap: 4px; opacity: 0.9; }
  .mock-title .btns span { display: inline-block; width: 14px; text-align: center; }
  .mock-menu { display: flex; gap: 12px; padding: 3px 8px; font-size: 0.78em; opacity: 0.8; border-bottom: 1px solid var(--vscode-panel-border); }
  .mock-body { height: 90px; position: relative; }
  .mock-body .vscroll { position: absolute; top: 0; right: 0; width: 10px; height: 100%; background: var(--vscode-scrollbarSlider-background, rgba(120,120,120,0.4)); }
  .mock-body .hscroll { position: absolute; left: 0; bottom: 0; height: 10px; width: 100%; background: var(--vscode-scrollbarSlider-background, rgba(120,120,120,0.4)); }
  .mock-body .grip { position: absolute; right: 1px; bottom: 1px; font-size: 0.8em; opacity: 0.6; }
  .mock-state { position: absolute; top: 50%; left: 0; right: 0; transform: translateY(-50%); text-align: center; font-size: 0.8em; opacity: 0.7; }
  .badges { display: flex; flex-wrap: wrap; gap: 4px; margin: 8px 0 2px; }
  .badge { font-size: 0.72em; padding: 1px 7px; border-radius: 10px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }

  .preview { margin: 8px 0 4px; }
  pre {
    background: var(--vscode-textCodeBlock-background); border: 1px solid var(--vscode-panel-border);
    padding: 8px 10px; border-radius: 3px; white-space: pre-wrap; word-break: break-all; margin: 4px 0;
  }
  .summary { font-size: 0.8em; opacity: 0.75; min-height: 1.1em; margin-bottom: 3px; }
  .buttons { display: flex; gap: 8px; margin-top: 14px; }
  button {
    background: var(--vscode-button-background); color: var(--vscode-button-foreground);
    border: none; padding: 6px 14px; border-radius: 2px; cursor: pointer; font-size: 0.95em;
  }
  button:hover { background: var(--vscode-button-hoverBackground); }
  button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
  .hidden { display: none; }
  .toggle-line { display: flex; align-items: center; gap: 6px; font-size: 0.9em; }
</style>
</head>
<body>
  <h2 id="heading">addWindow Composer</h2>

  <div class="mock-wrap">
    <div class="mock" id="mock">
      <div class="mock-title" id="mock-title">
        <span id="mock-title-text"></span>
        <span class="btns" id="mock-title-btns"></span>
      </div>
      <div class="mock-menu hidden" id="mock-menu"><span>File</span><span>Edit</span><span>Help</span></div>
      <div class="mock-body" id="mock-body"></div>
    </div>
  </div>
  <div class="badges" id="badges"></div>

  <fieldset id="geometry">
    <legend>Statement</legend>
    <div class="grid">
      <div class="row"><label for="receiver">Assign to</label><input type="text" id="receiver"></div>
      <div class="row"><label for="sysgui">SysGui expr</label><input type="text" id="sysgui"></div>
      <div class="row"><label for="title">Title expr</label><input type="text" id="title"></div>
      <div class="row"><label for="x">x</label><input type="text" id="x"></div>
      <div class="row"><label for="y">y</label><input type="text" id="y"></div>
      <div class="row"><label for="width">width</label><input type="text" id="width"></div>
      <div class="row"><label for="height">height</label><input type="text" id="height"></div>
    </div>
  </fieldset>

  <fieldset>
    <legend>Window flags</legend>
    <div class="flag-groups" id="flag-groups"></div>
  </fieldset>

  <fieldset>
    <legend>
      <label class="toggle-line"><input type="checkbox" id="event-enabled"> Configure event mask (default: unset)</label>
    </legend>
    <div id="event-area" class="hidden">
      <div class="flag-groups" id="event-groups"></div>
    </div>
  </fieldset>

  <div class="preview">
    <label>Generated statement</label>
    <pre id="preview">—</pre>
    <div class="summary" id="flags-summary"></div>
    <div class="summary" id="event-summary"></div>
  </div>

  <div class="buttons">
    <button id="insert">Insert</button>
    <button id="cancel" class="secondary">Cancel</button>
  </div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);
  let editMode = false;

  function groupCatalog(items) {
    const groups = new Map();
    for (const it of items) {
      if (!groups.has(it.group)) groups.set(it.group, []);
      groups.get(it.group).push(it);
    }
    return groups;
  }

  function renderChecks(container, items, selectedMask, cls) {
    container.innerHTML = '';
    for (const [group, groupItems] of groupCatalog(items)) {
      const title = document.createElement('div');
      title.className = 'group-title'; title.textContent = group;
      title.style.gridColumn = '1 / -1';
      container.appendChild(title);
      for (const it of groupItems) {
        const wrap = document.createElement('label');
        wrap.className = 'check';
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.value = String(it.value); cb.className = cls;
        if ((selectedMask & it.value) !== 0) cb.checked = true;
        cb.addEventListener('change', change);
        const span = document.createElement('span'); span.textContent = it.label;
        wrap.appendChild(cb); wrap.appendChild(span); container.appendChild(wrap);
      }
    }
  }

  function readForm() {
    return {
      flags: Array.from(document.querySelectorAll('.flag-cb:checked')).map(c => Number(c.value)),
      eventMaskEnabled: $('event-enabled').checked,
      eventMask: Array.from(document.querySelectorAll('.event-cb:checked')).map(c => Number(c.value)),
      receiver: $('receiver').value, sysgui: $('sysgui').value, title: $('title').value,
      x: $('x').value, y: $('y').value, width: $('width').value, height: $('height').value,
    };
  }

  function change() {
    $('event-area').classList.toggle('hidden', !$('event-enabled').checked);
    vscode.postMessage({ type: 'change', payload: readForm() });
  }

  window.addEventListener('message', (e) => {
    const m = e.data;
    if (m.type === 'init') {
      editMode = m.editMode;
      $('heading').textContent = editMode ? 'Edit addWindow flags' : 'addWindow Composer';
      const init = m.initial;
      $('receiver').value = init.receiver || '';
      $('sysgui').value = init.sysgui || 'sysgui!';
      $('title').value = init.title || '';
      $('x').value = init.x; $('y').value = init.y; $('width').value = init.width; $('height').value = init.height;
      // In EDIT mode the geometry/title live in the source; we only rewrite the hex tokens.
      if (editMode) $('geometry').classList.add('hidden');
      renderChecks($('flag-groups'), m.catalogs.flags, init.flags, 'flag-cb');
      renderChecks($('event-groups'), m.catalogs.eventBits, init.eventMask || 0, 'event-cb');
      $('event-enabled').checked = init.eventMask !== null && init.eventMask !== undefined;
      $('event-enabled').addEventListener('change', change);
      change();
    } else if (m.type === 'preview') {
      $('preview').textContent = m.statement;
      $('flags-summary').textContent = 'flags = ' + m.flagsHex + '  ·  ' + m.flagsSummary;
      $('event-summary').textContent = 'event_mask = ' + (m.eventHex || '(unset)') + '  ·  ' + m.eventSummary;
      drawMock(m.render);
    }
  });

  function drawMock(r) {
    const mock = $('mock');
    mock.classList.toggle('thick-border', r.border);
    mock.classList.toggle('disabled', r.disabled);
    mock.classList.toggle('invisible', r.invisible);
    $('mock-title').classList.toggle('hidden', !r.titleBar);
    $('mock-title-text').textContent = r.title || '(no title)';
    const btns = $('mock-title-btns'); btns.innerHTML = '';
    if (r.minMax) { btns.appendChild(mkBtn('–')); btns.appendChild(mkBtn('□')); }
    if (r.closeBox) btns.appendChild(mkBtn('×'));
    $('mock-menu').classList.toggle('hidden', !r.menuBar);
    const body = $('mock-body'); body.innerHTML = '';
    if (r.minimized) body.appendChild(mkState('(minimized)'));
    else if (r.maximized) body.appendChild(mkState('(maximized)'));
    if (r.vScroll) body.appendChild(mkDiv('vscroll'));
    if (r.hScroll) body.appendChild(mkDiv('hscroll'));
    if (r.resizable) { const g = mkDiv('grip'); g.textContent = '◢'; body.appendChild(g); }
    const badges = $('badges'); badges.innerHTML = '';
    for (const b of r.badges) { const el = document.createElement('span'); el.className = 'badge'; el.textContent = b; badges.appendChild(el); }
  }
  function mkBtn(t) { const s = document.createElement('span'); s.textContent = t; return s; }
  function mkDiv(cls) { const d = document.createElement('div'); d.className = cls; return d; }
  function mkState(t) { const d = document.createElement('div'); d.className = 'mock-state'; d.textContent = t; return d; }

  for (const id of ['receiver', 'sysgui', 'title', 'x', 'y', 'width', 'height']) {
    $(id).addEventListener('input', change);
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
