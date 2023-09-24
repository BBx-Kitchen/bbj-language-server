import * as vscode from 'vscode';
import * as cp from 'child_process';

// Store unsaved content in memory
const unsavedContentMap = new Map<string, string>();

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

    // Use unsaved content if available, otherwise read from the file system
    const documentContent = unsavedContentMap.get(document.uri.toString()) || document.getText();

    return this.runFormatter(args, documentContent).then(
      (edits: any) => edits,
      (err: any) => {
        if (err) {
          console.log(err);
          return Promise.reject('Check the console in dev tools to find errors when formatting.');
        }
      }
    );
  },

  runFormatter(formatFlags: string[], documentContent: string): Thenable<void> {
    return new Promise<void>((resolve, reject) => {
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
        }
      });


      p.on('close', (code) => {
        if (code !== 0) {
          return reject(stderr);
        }

        const edit = new vscode.WorkspaceEdit();
        const fileStart = new vscode.Position(0, 0);
        const fileEnd = new vscode.Position(0, documentContent.length);
        // @ts-ignore
        edit.replace(document.uri, new vscode.Range(fileStart, fileEnd), stdout);
        vscode.workspace.applyEdit(edit);

        let timeTaken = Date.now() - t0;
        if (timeTaken > 750) {
          console.log(`Formatting took too long (${timeTaken}ms). Format On Save feature could be aborted.`);
        }
        resolve();
      });
      p.stdin.end(documentContent);
    });
  },
};

// Listen for unsaved changes and store them in memory
vscode.workspace.onDidChangeTextDocument((event) => {
  const { document } = event;
  unsavedContentMap.set(document.uri.toString(), document.getText());
});

// Cleanup unsaved content when a document is closed
vscode.workspace.onDidCloseTextDocument((document) => {
  unsavedContentMap.delete(document.uri.toString());
});
