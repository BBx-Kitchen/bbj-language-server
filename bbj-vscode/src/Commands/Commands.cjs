const vscode = require("vscode");
const path = require("path");
const { exec } = require("child_process");
const os = require("os");
const fs = require("fs");
const PropertiesReader = require("properties-reader");

/**
 * Helper function to wrap child_process.exec() in a Promise for use with withProgress
 * @param {string} cmd - The command to execute
 * @returns {Promise<{stdout: string, stderr: string}>} Promise that resolves with stdout/stderr or rejects with error
 */
const execWithProgress = (cmd) => {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
};

const getBBjHome = () => {
  const home = vscode.workspace.getConfiguration("bbj").home;

  if (!home) {
    vscode.window.showErrorMessage(
      "bbj.home settings cannot be found - you must add this to the configuration",
      "Open Settings"
    ).then(selection => {
      if (selection === "Open Settings") {
        vscode.commands.executeCommand('workbench.action.openSettings', 'bbj.home');
      }
    });
    return "";
  }

  return home;
}

const runWeb = (params, client) => {
  const home = getBBjHome();
  if (!home) return;

  const webConfig = vscode.workspace.getConfiguration("bbj.web");
  const bbj = `${home}/bin/bbj${os.platform() === "win32" ? ".exe" : ""}`;
  const webRunnerWorkingDir = path.resolve(`${__dirname}/../tools`);
  const username = vscode.workspace.getConfiguration("bbj").web.username;
  const password = vscode.workspace.getConfiguration("bbj").web.password;
  const sscp = vscode.workspace.getConfiguration("bbj").classpath;
  const active = vscode.window.activeTextEditor;
  const fileName = active ? active.document.fileName : params.fsPath;
  const workingDir = path.dirname(fileName);
  const programme = path.basename(fileName);
  const name = webConfig.apps.hasOwnProperty(programme)
    ? webConfig.apps[programme].name
    : programme
      .split(".")
      .slice(0, -1)
      .join(".");

  const cmd = `"${bbj}" -q -WD"${webRunnerWorkingDir}" "${webRunnerWorkingDir}/web.bbj" - "${client}" "${name}" "${programme}" "${workingDir}" "${username}" "${password}" "${sscp}"`;

  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      vscode.window.showErrorMessage(`Failed to run "${programme}"`);
      return;
    }
  });
};

const decompile = (params, options = {}) => {
  const home = getBBjHome();
  if (!home) return;
  const active = vscode.window.activeTextEditor;
  const fileName = active ? active.document.fileName : params.fsPath;
  const resolvedFileName = path.resolve(fileName);
  const resolvedLstFileName = resolvedFileName.endsWith('.lst')
    ? resolvedFileName
    : resolvedFileName + '.lst';

  const newFileName = options.denumber ? resolvedFileName : resolvedFileName.replace(/\.lst$/, '');

  const flags = options.denumber ? `-l ${resolvedFileName.endsWith('.lst') ? '-xlst' : ''}` : '';

  const cmd = `"${home}/bin/bbjlst${
    os.platform() === 'win32' ? '.exe' : ''
  }" ${flags} "${resolvedFileName}"`;

  const title = options.denumber ? "Denumbering BBj Program..." : "Decompiling BBj Program...";

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: title,
    cancellable: false
  }, async () => {
    try {
      await execWithProgress(cmd);

      if (!options.denumber) {
        await new Promise((resolve, reject) => {
          fs.unlink(resolvedFileName, (unlinkErr) => {
            if (unlinkErr) {
              reject(unlinkErr);
            } else {
              resolve();
            }
          });
        });
      }

      await new Promise((resolve, reject) => {
        fs.rename(resolvedLstFileName, newFileName, (renameErr) => {
          if (renameErr) {
            reject(renameErr);
          } else {
            resolve();
          }
        });
      });

      const uri = vscode.Uri.file(newFileName);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: false });
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to decompile "${fileName}": ${err.message || err}`);
    }
  });
};

const Commands = {
  openConfigFile: function () {
    const home = getBBjHome();

    if (home) {
      return vscode.workspace.openTextDocument(`${home}/cfg/config.bbx`).then((doc) => {
        vscode.window.showTextDocument(doc);
      });
    }
  },

  openPropertiesFile: function () {
    const home = getBBjHome();

    if (home) {
      return vscode.workspace.openTextDocument(`${home}/cfg/BBj.properties`).then((doc) => {
        vscode.window.showTextDocument(doc);
      });
    }
  },

  openEnterpriseManager() {
    const home = getBBjHome();
    if (home) {
      const properties = PropertiesReader(`${home}/cfg/BBj.properties`);
      const url = `${
        'http://' +
        properties.get('com.basis.jetty.host') +
        ':' +
        properties.get('com.basis.jetty.port') +
        '/bbjem/em'
      }`;
      vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
    }
  },

  run: function (params) {
    const home = getBBjHome();
    if (!home) return;

    const webConfig = vscode.workspace.getConfiguration('bbj.web');
    var sscp = vscode.workspace.getConfiguration('bbj').classpath;

    const bbj = `${home}/bin/bbj${os.platform() === 'win32' ? '.exe' : ''}`;
    const active = vscode.window.activeTextEditor;
    const fileName = active ? active.document.fileName : params.fsPath;
    const workingDir = path.dirname(fileName);

    if (sscp != null && sscp > '') {
      sscp = '-CP' + sscp;
    } else {
      sscp = '';
    }

    const cmd = `"${bbj}" -q "${sscp}" -WD"${workingDir}" "${fileName}"`;

    const runCommand = () => {
      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          vscode.window.showErrorMessage(`Failed to run "${fileName}"`);
        }
      });
    };

    if (webConfig.AutoSaveUponRun && active) {
      active.document.save().then(runCommand);
    } else {
      runCommand();
    }
  },

  runBUI: function (params) {
    runWeb(params, 'BUI');
  },

  runDWC: function (params) {
    runWeb(params, 'DWC');
  },

  compile: function (params) {
    const home = getBBjHome();
    if (!home) return;
    const cmd = `"${home}/bin/bbjcpl${os.platform() === 'win32' ? '.exe' : ''}" "${
      vscode.window.activeTextEditor.document.fileName
    }"`;

    const active = vscode.window.activeTextEditor;

    const fileName = active ? active.document.fileName : params.fsPath;

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Compiling BBj Program...",
      cancellable: false
    }, async () => {
      try {
        await execWithProgress(cmd);
        vscode.window.showInformationMessage(`Successfully compiled "${fileName}"`);
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to compile "${fileName}"`);
      }
    });
  },
  decompile: function (params) {
    decompile(params);
  },

  denumber: function (params) {
    decompile(params, { denumber: true });
  },
};

module.exports = Commands;
