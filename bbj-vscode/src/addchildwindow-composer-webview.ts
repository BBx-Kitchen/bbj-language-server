/**
 * Visual BBjWindow::addChildWindow composer — a webview panel with grouped flag checkboxes, a
 * collapsible (opt-in) event-mask sub-area, a live schematic preview of the child window inside its
 * parent frame, and the generated statement (#473).
 *
 * The panel is pure presentation: it renders the two catalogs, groups them, and sends the raw
 * selection back to the extension, which computes the `$flags$` / `$event_mask$` hex, the
 * statement text, and the schematic descriptor with the shared ./addchildwindow-composer logic.
 *
 * Two modes:
 *   - NEW (no target): compose a fresh `child! = window!.addChildWindow(...)` and insert it at the
 *     cursor.
 *   - EDIT (from the Code Action): the id/geometry/title/context are fixed in the source; the panel
 *     edits only the `$flags$` (and optional `$event_mask$`) hex tokens and applies them in place.
 */
import * as vscode from 'vscode';
import {
    CHILD_WINDOW_FLAGS, CHILD_EVENT_MASK_BITS, addchildwindowPreview,
} from './addchildwindow-composer.js';

/** Where/how to apply an EDIT: token ranges to replace, or offsets to insert at. */
export interface AddChildWindowEditTarget {
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

export interface AddChildWindowPanelArg {
    /** Present = EDIT an existing call's hex tokens in place. Absent = insert a NEW statement. */
    target?: AddChildWindowEditTarget;
    initial?: {
        flags: number;
        /** null = event mask unset (default); a number = configured. */
        eventMask: number | null;
        /** For the preview only in EDIT mode; the full form in NEW mode. */
        receiver: string;
        window: string;
        id: string;
        context: string;
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
    window: string;
    id: string;
    context: string;
    x: string;
    y: string;
    width: string;
    height: string;
    title: string;
}

const DEFAULT_INITIAL = {
    // Keyboard navigation — the most common non-zero child-window mask ($00010000$).
    flags: 0x00010000,
    eventMask: null as number | null,
    receiver: 'child!', window: 'window!', id: '101', context: 'sysgui!.getAvailableContext()',
    x: '10', y: '10', width: '200', height: '150', title: '"Child"',
};

export function openAddChildWindowComposerPanel(context: vscode.ExtensionContext, arg?: AddChildWindowPanelArg): void {
    const editMode = !!arg?.target;

    let insertUri: vscode.Uri | undefined;
    let insertPosition: vscode.Position | undefined;
    if (!editMode) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Open a BBj file first, then run the addChildWindow composer.');
            return;
        }
        insertUri = editor.document.uri;
        insertPosition = editor.selection.active;
    }

    const initial = { ...DEFAULT_INITIAL, ...(arg?.initial ?? {}) };
    const target = arg?.target;

    const panel = vscode.window.createWebviewPanel(
        'bbjAddChildWindowComposer',
        editMode ? 'Edit addChildWindow flags' : 'addChildWindow Composer',
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
        { enableScripts: true, retainContextWhenHidden: true },
    );
    panel.webview.html = getHtml(panel.webview);

    // Single source of truth: the hex/compose/schematic logic lives in the shared pure module,
    // which the IntelliJ client reaches over the LS (#433).
    const build = (sel: Selection) => addchildwindowPreview({
        ...sel, editMode,
        preservedFlagBits: target?.preservedFlagBits ?? 0,
        preservedEventBits: target?.preservedEventBits ?? 0,
    });

    panel.webview.onDidReceiveMessage(async (msg: { type: string; payload?: Selection }) => {
        switch (msg.type) {
            case 'ready':
                panel.webview.postMessage({
                    type: 'init',
                    editMode,
                    catalogs: { flags: CHILD_WINDOW_FLAGS, eventBits: CHILD_EVENT_MASK_BITS },
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
                    applyEdit(edit, r, target);
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
function applyEdit(edit: vscode.WorkspaceEdit, r: { flagsHex: string; eventHex: string | null }, target: AddChildWindowEditTarget): void {
    const uri = vscode.Uri.parse(target.uri);
    const at = (col: number) => new vscode.Position(target.line, col);

    // Apply insertions right-to-left so the flags insert doesn't shift the event-mask offset
    // (for addChildWindow the event_mask insert point — after the context — lies to the RIGHT of
    // the flags insert point — after the title). VS Code applies WorkspaceEdit entries per range,
    // so distinct positions are safe in either order; ranges are computed from the same line text.
    if (r.eventHex !== null) {
        if (target.eventMaskRange) {
            edit.replace(uri, new vscode.Range(at(target.eventMaskRange[0]), at(target.eventMaskRange[1])), r.eventHex);
        } else if (target.eventMaskInsertOffset !== undefined) {
            edit.insert(uri, at(target.eventMaskInsertOffset), `, ${r.eventHex}`);
        }
    }
    if (target.flagsRange) {
        edit.replace(uri, new vscode.Range(at(target.flagsRange[0]), at(target.flagsRange[1])), r.flagsHex);
    } else if (target.flagsInsertOffset !== undefined) {
        edit.insert(uri, at(target.flagsInsertOffset), `, ${r.flagsHex}`);
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
<title>addChildWindow Composer</title>
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

  /* Parent window frame with the child window inside it. */
  .mock-wrap { margin: 6px 0 12px; display: flex; justify-content: center; }
  .parent {
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 4px; overflow: hidden; width: 320px;
    background: var(--vscode-editorWidget-background, var(--vscode-editor-background));
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  }
  .parent-title {
    background: var(--vscode-titleBar-activeBackground, var(--vscode-editorGroupHeader-tabsBackground));
    color: var(--vscode-titleBar-activeForeground, var(--vscode-foreground));
    padding: 3px 8px; font-size: 0.78em; opacity: 0.8;
  }
  .parent-body { height: 130px; position: relative; padding: 14px; box-sizing: border-box; }
  .child {
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    background: var(--vscode-editor-background); position: relative;
    width: 65%; height: 75px; box-sizing: border-box;
  }
  .child.borderless { border-color: transparent; }
  .child.recessed { box-shadow: inset 2px 2px 4px rgba(0,0,0,0.45); }
  .child.raised { box-shadow: 2px 2px 4px rgba(0,0,0,0.45); }
  .child.disabled { opacity: 0.5; }
  .child.invisible { opacity: 0.28; border-style: dashed; }
  .child.docked { width: 100%; height: 46px; position: absolute; left: 0; top: 0; }
  .child.fieldset { border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border)); border-radius: 3px; margin-top: 7px; }
  .child .child-legend {
    display: none; position: absolute; top: -0.7em; left: 10px; padding: 0 4px; font-size: 0.72em;
    background: var(--vscode-editor-background);
  }
  .child.fieldset .child-legend { display: inline; }
  .child .vscroll { position: absolute; top: 0; right: 0; width: 8px; height: 100%; background: var(--vscode-scrollbarSlider-background, rgba(120,120,120,0.4)); }
  .child .hscroll { position: absolute; left: 0; bottom: 0; height: 8px; width: 100%; background: var(--vscode-scrollbarSlider-background, rgba(120,120,120,0.4)); }
  .child .child-label { position: absolute; top: 50%; left: 0; right: 0; transform: translateY(-50%); text-align: center; font-size: 0.72em; opacity: 0.6; }
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
  <h2 id="heading">addChildWindow Composer</h2>

  <div class="mock-wrap">
    <div class="parent">
      <div class="parent-title">Parent window</div>
      <div class="parent-body">
        <div class="child" id="child">
          <span class="child-legend" id="child-legend"></span>
          <div class="child-label" id="child-label"></div>
        </div>
      </div>
    </div>
  </div>
  <div class="badges" id="badges"></div>

  <fieldset id="geometry">
    <legend>Statement</legend>
    <div class="grid">
      <div class="row"><label for="receiver">Assign to</label><input type="text" id="receiver"></div>
      <div class="row"><label for="window">Parent window expr</label><input type="text" id="window"></div>
      <div class="row"><label for="id">ID</label><input type="text" id="id"></div>
      <div class="row"><label for="context">Context expr</label><input type="text" id="context"></div>
      <div class="row"><label for="title">Title expr</label><input type="text" id="title"></div>
      <div class="row"><label for="x">x</label><input type="text" id="x"></div>
      <div class="row"><label for="y">y</label><input type="text" id="y"></div>
      <div class="row"><label for="width">width</label><input type="text" id="width"></div>
      <div class="row"><label for="height">height</label><input type="text" id="height"></div>
    </div>
  </fieldset>

  <fieldset>
    <legend>Child window flags</legend>
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
        if (it.detail) wrap.title = it.detail;
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
      receiver: $('receiver').value, window: $('window').value, id: $('id').value,
      context: $('context').value, title: $('title').value,
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
      $('heading').textContent = editMode ? 'Edit addChildWindow flags' : 'addChildWindow Composer';
      const init = m.initial;
      $('receiver').value = init.receiver || '';
      $('window').value = init.window || 'window!';
      $('id').value = init.id;
      $('context').value = init.context || '';
      $('title').value = init.title || '';
      $('x').value = init.x; $('y').value = init.y; $('width').value = init.width; $('height').value = init.height;
      // In EDIT mode the id/geometry/title/context live in the source; we only rewrite the hex tokens.
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
    const child = $('child');
    child.classList.toggle('borderless', r.borderless && !r.fieldset);
    child.classList.toggle('recessed', r.recessed);
    child.classList.toggle('raised', r.raised);
    child.classList.toggle('fieldset', r.fieldset);
    child.classList.toggle('disabled', r.disabled);
    child.classList.toggle('invisible', r.invisible);
    child.classList.toggle('docked', r.docked);
    $('child-legend').textContent = r.title || '(no title)';
    $('child-label').textContent = r.fieldset ? '' : '(child window)';
    // Scrollbars: (re)create the marker divs to reflect the current selection.
    for (const cls of ['vscroll', 'hscroll']) {
      const existing = child.querySelector('.' + cls);
      if (existing) existing.remove();
    }
    if (r.vScroll) child.appendChild(mkDiv('vscroll'));
    if (r.hScroll) child.appendChild(mkDiv('hscroll'));
    const badges = $('badges'); badges.innerHTML = '';
    for (const b of r.badges) { const el = document.createElement('span'); el.className = 'badge'; el.textContent = b; badges.appendChild(el); }
  }
  function mkDiv(cls) { const d = document.createElement('div'); d.className = cls; return d; }

  for (const id of ['receiver', 'window', 'id', 'context', 'title', 'x', 'y', 'width', 'height']) {
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
