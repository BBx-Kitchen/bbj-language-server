const vscode = require('vscode');
const config = vscode.workspace.getConfiguration('bbj').formatter;
const cp = require('child_process');

module.exports = {

  provideDocumentFormattingEdits(document) {

    const jarPath = `${__dirname}/../tools/formatter/BBjCFCli.jar`;
    let args = [];

    args.push("-jar");
    args.push(`${jarPath}`);

    args.push("-p");

    args.push("-i");
    args.push(`${document.uri.fsPath}`);
    
    args.push("-w");
    args.push(`${config.indentWidth}`);

    if (config.keywordsToUppercase) args.push('--keywords-uppercase');
    if (config.removeLineContinuation) args.push('--remove-line-continue');
    if (config.splitSingleLineIF) args.push('--single-line-if');

    return this.runFormatter(args, document).then(edits => edits, err => {
      if (err) {
        console.log(err);
        return Promise.reject('Check the console in dev tools to find errors when formatting.');
      }
    });
  },

  runFormatter(formatFlags, document) {

    return new Promise((resolve, reject) => {

      let t0 = Date.now();
      let stdout = '';
      let stderr = '';

      // Use spawn instead of exec to avoid maxBufferExceeded error
      const p = cp.spawn('java', formatFlags);
      p.stdout.setEncoding('utf8');
      p.stdout.on('data', data => stdout += data);
      p.stderr.on('data', data => stderr += data);
      p.on('error', err => {
        if (err && err.code === 'ENOENT') {
          return reject();
        }
      });

      p.on('close', code => {
        if (code !== 0) {
          return reject(stderr);
        }
        
        const edit = new vscode.WorkspaceEdit();
        const fileStart = new vscode.Position(0, 0);
        const fileEnd = document.lineAt(document.lineCount - 1).range.end;        
        edit.replace(document.uri, new vscode.Range(fileStart, fileEnd), stdout);
        return vscode.workspace.applyEdit(edit);

        let timeTaken = Date.now() - t0;
        if (timeTaken > 750) {
          console.log(`Formatting took too long(${timeTaken}ms). Format On Save feature could be aborted.`);
        }
        return resolve(textEdits);
      });
      p.stdin.end(document.getText());
    });
  }
}; 
