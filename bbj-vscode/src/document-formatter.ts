import * as vscode from 'vscode';
import * as cp from 'child_process';
import { logger } from './language/logger.js';

// Mirrors each open document's live content, kept in sync by the onDidChangeTextDocument
// listener below. document.getText() already returns VS Code's live in-memory buffer for a
// document — never a disk read — so for the document object provideDocumentFormattingEdits
// receives, this map's tracked value and document.getText() are always the same content.
const unsavedContentMap = new Map<string, string>();

// One in-flight format Promise per document URI, so concurrent format requests for the same
// document (e.g. "Save All", or a manual format racing format-on-save) share a single spawned
// process instead of each starting its own `java` invocation. Entries are removed once the
// shared promise settles, on both the resolve and reject paths, so a later request for the same
// URI spawns again.
const inFlightFormats = new Map<string, Promise<string>>();

export const DocumentFormatter = {
  provideDocumentFormattingEdits(document: vscode.TextDocument): Thenable<vscode.TextEdit[] | undefined> {
    const jarPath = `${__dirname}/../tools/formatter/BBjCFCli.jar`;
    const config = vscode.workspace.getConfiguration('bbj').formatter;
    const args: string[] = [];

    args.push('-jar');
    args.push(jarPath);

    args.push('-p');

    args.push('-i');
    args.push(document.uri.fsPath);

    args.push('-w');
    args.push(config.indentWidth.toString().trim());

    if (config.keywordsToUppercase) args.push('--keywords-uppercase');
    if (config.removeLineContinuation) args.push('--remove-line-continue');
    if (config.splitSingleLineIF) args.push('--single-line-if');

    // document.getText() always returns VS Code's live in-memory buffer, never a disk read; the
    // fallback below simply prefers the tracked mirror when present.
    const documentContent = unsavedContentMap.get(document.uri.toString()) || document.getText();

    const uriKey = document.uri.toString();
    let formatPromise = inFlightFormats.get(uriKey);
    if (!formatPromise) {
      formatPromise = this.runFormatter(args, documentContent) as Promise<string>;
      inFlightFormats.set(uriKey, formatPromise);
      const clearInFlight = () => {
        if (inFlightFormats.get(uriKey) === formatPromise) {
          inFlightFormats.delete(uriKey);
        }
      };
      formatPromise.then(clearInFlight, clearInFlight);
    }

    return formatPromise.then(
      (formattedContent: string) => {
        // Create a single edit that replaces the entire document content
        const edit = new vscode.TextEdit(
          new vscode.Range(0, 0, document.lineCount, 0),
          formattedContent
        );
        return [edit];
      },
      (err: any) => {
        if (err) {
          logger.warn(String(err));
          return Promise.reject(err);
        }

        return Promise.reject('Unknown error while formatting the BBj document');
      }
    );
  },

  runFormatter(formatFlags: string[], documentContent: string): Thenable<string> {
    return new Promise<string>((resolve, reject) => {
      let t0 = Date.now();
      let stdout = '';
      let stderr = '';

      // Use spawn instead of exec to avoid maxBufferExceeded error
      const p = cp.spawn('java', formatFlags);
      p.stdout.setEncoding('utf8');
      p.stdout.on('data', (data) => (stdout += data));
      p.stderr.on('data', (data) => (stderr += data));
      p.on('error', (err) => {
        if (err && (err as any).code === 'ENOENT') {
          return reject(err);
        } else {
          return reject(err);
        }
      });

      p.on('close', (code) => {
        if (code !== 0) {
          return reject(stderr);
        }

        let timeTaken = Date.now() - t0;
        if (timeTaken > 750) {
          logger.warn(`Formatting took too long (${timeTaken}ms). Format On Save feature could be aborted.`);
        }

        resolve(stdout);
      });
      
      p.stdin.end(documentContent);
    });
  },
};

// Listen for changes and keep the live-buffer mirror above in sync.
vscode.workspace.onDidChangeTextDocument((event) => {
  const { document } = event;
  unsavedContentMap.set(document.uri.toString(), document.getText());
});

// Remove the mirrored entry when a document is closed.
vscode.workspace.onDidCloseTextDocument((document) => {
  unsavedContentMap.delete(document.uri.toString());
});
