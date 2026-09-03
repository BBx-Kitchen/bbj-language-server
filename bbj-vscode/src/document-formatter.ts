import * as vscode from 'vscode';
import * as cp from 'child_process';
import { logger } from './language/logger.js';
import { verifyFormatterArtifacts, FORMATTER_TOOLS_DIR, type FormatterVerificationResult } from './formatter-verifier.js';

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

// A hash-mismatched artefact toasts once per extension-host
// session, however many format-on-save invocations follow, so the constant format-on-save
// cadence does not spam the user with repeat notifications. logger.warn still fires on every
// occurrence (see runFormatter below), so a mismatch is never silent even after the toast has
// already fired once.
let integrityNoticeShown = false;

// Rejection value for a verification refusal, distinguished from the underlying `java` process's
// own error/stderr rejections so the reject handler below re-throws it without a second
// logger.warn.
class FormatterArtifactError extends Error {}

export const DocumentFormatter = {
  provideDocumentFormattingEdits(document: vscode.TextDocument): Thenable<vscode.TextEdit[] | undefined> {
    const jarPath = `${FORMATTER_TOOLS_DIR}/BBjCFCli.jar`;
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
        if (err instanceof FormatterArtifactError) {
          // runFormatter already logged this refusal (with the expected/actual digests, or the
          // expected path) before rejecting — re-reject without a second logger.warn line.
          return Promise.reject(err);
        }

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
      // Verify the bundled formatter JAR against its committed
      // SHA-256 immediately before spawning it. Placed here (inside runFormatter, one check per
      // actual spawn) rather than in provideDocumentFormattingEdits (which would run once per
      // *request*), so a "Save All" burst still shares one check per URI via the existing
      // inFlightFormats coalescing above. Synchronous — readFileSync, no await — so cp.spawn is
      // still reached in the same tick this Promise executor runs, preserving the existing
      // synchronous call-count assertions and the dedup timing. Not cached by mtime/size:
      // re-checking every spawn self-heals and costs well under a millisecond for ~7KB.
      const verification: FormatterVerificationResult = verifyFormatterArtifacts(FORMATTER_TOOLS_DIR);
      if (!verification.ok) {
        if (verification.reason === 'DIGEST_MISMATCH') {
          const message =
            `The bundled BBj formatter (${verification.relativePath}) did not match its expected checksum. ` +
            `Formatting was cancelled. Reinstalling the extension restores the bundled formatter.`;
          // logger.warn on every occurrence gives a permanent record; the user-facing toast
          // below is deliberately deduplicated to once per session — format-on-save
          // fires constantly, and a per-invocation notification would be noise, not signal.
          logger.warn(
            `${message} expected=${verification.expectedSha256} actual=${verification.actualSha256 ?? '(unavailable)'}`
          );
          if (!integrityNoticeShown) {
            integrityNoticeShown = true;
            vscode.window.showErrorMessage(message);
          }
        } else {
          // MISSING_OR_UNREADABLE: a distinct broken-install diagnosis, not a security-grade
          // signal — only a hash mismatch (above) warrants the user-facing toast.
          const message =
            `The bundled BBj formatter is unavailable (expected at ${verification.absolutePath}). ` +
            `Formatting was cancelled.`;
          logger.warn(message);
        }
        return reject(new FormatterArtifactError(`Formatter artefact verification failed: ${verification.reason}`));
      }

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
