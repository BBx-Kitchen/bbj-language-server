const vscode = require("vscode");
const path = require("path");
const { exec } = require("child_process");
const os = require("os");
const fs = require("fs");
const PropertiesReader = require("properties-reader");
const { buildCompileOptions, validateOptions } = require("./CompilerOptions");

/**
 * Helper function to wrap child_process.exec() in a Promise for use with withProgress
 * @param {string} cmd - The command to execute
 * @returns {Promise<{stdout: string, stderr: string}>} Promise that resolves with stdout/stderr or rejects with error
 */
const execWithProgress = (cmd) => {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        // Attach stderr to the error object for better error messages
        err.stderr = stderr;
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

const runWeb = (params, client, credentials) => {
  const home = getBBjHome();
  if (!home) return;

  const webConfig = vscode.workspace.getConfiguration("bbj.web");
  const bbj = `${home}/bin/bbj${os.platform() === "win32" ? ".exe" : ""}`;
  const webRunnerWorkingDir = path.resolve(`${__dirname}/../tools`);

  // Use provided credentials (from SecretStorage) or fall back to config
  let username, password, token;
  if (credentials) {
    if (credentials.username === '__token__') {
      // Token-based authentication
      token = credentials.password;
      username = "";
      password = "";
    } else {
      // Username/password from SecretStorage
      username = credentials.username;
      password = credentials.password;
      token = "";
    }
  } else {
    // Legacy fallback to config (backward compatibility)
    username = vscode.workspace.getConfiguration("bbj").web?.username || "";
    password = vscode.workspace.getConfiguration("bbj").web?.password || "";
    token = "";
  }

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

  // Get custom config.bbx path if configured
  const configPath = vscode.workspace.getConfiguration('bbj').configPath || '';

  const cmd = `"${bbj}" -q -WD"${webRunnerWorkingDir}" "${webRunnerWorkingDir}/web.bbj" - "${client}" "${name}" "${programme}" "${workingDir}" "${username}" "${password}" "${sscp}" "${token}" "${configPath}"`;

  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      const errorMsg = `Failed to run "${programme}": ${err.message || err}${stderr ? '\n\nDetails:\n' + stderr : ''}`;
      vscode.window.showErrorMessage(errorMsg);
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
      const errorMsg = `Failed to decompile "${fileName}": ${err.message || err}${err.stderr ? '\n\nDetails:\n' + err.stderr : ''}`;
      vscode.window.showErrorMessage(errorMsg);
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

    // Add custom config.bbx path if configured
    const configPath = vscode.workspace.getConfiguration('bbj').configPath || '';
    const configArg = configPath ? `-c"${configPath}" ` : '';

    const cmd = `"${bbj}" -q ${sscp} ${configArg}-WD"${workingDir}" "${fileName}"`;

    const runCommand = () => {
      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          const errorMsg = `Failed to run "${fileName}": ${err.message || err}${stderr ? '\n\nDetails:\n' + stderr : ''}`;
          vscode.window.showErrorMessage(errorMsg);
        }
      });
    };

    if (webConfig.AutoSaveUponRun && active) {
      active.document.save().then(runCommand);
    } else {
      runCommand();
    }
  },

  runBUI: function (params, credentials) {
    runWeb(params, 'BUI', credentials);
  },

  runDWC: function (params, credentials) {
    runWeb(params, 'DWC', credentials);
  },

  compile: function (params) {
    const home = getBBjHome();
    if (!home) return;

    const active = vscode.window.activeTextEditor;
    const fileName = active ? active.document.fileName : params.fsPath;

    // Read compiler configuration
    const config = vscode.workspace.getConfiguration('bbj');

    // Validate options for conflicts and dependencies
    const validation = validateOptions(config);

    // If there are validation errors, show them and abort compilation
    if (!validation.isValid) {
      const errorMessage = 'Compiler options have conflicts:\n• ' + validation.errors.join('\n• ');
      vscode.window.showErrorMessage(errorMessage, 'Configure Options').then(selection => {
        if (selection === 'Configure Options') {
          vscode.commands.executeCommand('bbj.configureCompileOptions');
        }
      });
      return;
    }

    // Show warnings if any (but continue with compilation)
    if (validation.warnings.length > 0) {
      const warningMessage = 'Compiler options warnings:\n• ' + validation.warnings.join('\n• ');
      vscode.window.showWarningMessage(warningMessage);
    }

    // Build the compiler options from configuration
    const compilerOptions = buildCompileOptions(config);
    const optionsStr = compilerOptions.length > 0 ? compilerOptions.join(' ') + ' ' : '';

    const cmd = `"${home}/bin/bbjcpl${os.platform() === 'win32' ? '.exe' : ''}" ${optionsStr}"${fileName}"`;

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Compiling BBj Program...",
      cancellable: false
    }, async () => {
      try {
        await execWithProgress(cmd);
        vscode.window.showInformationMessage(`Successfully compiled "${fileName}"`);
      } catch (err) {
        const errorMsg = `Failed to compile "${fileName}": ${err.message || err}${err.stderr ? '\n\nDetails:\n' + err.stderr : ''}`;
        vscode.window.showErrorMessage(errorMsg);
      }
    });
  },
  denumber: function (params) {
    decompile(params, { denumber: true });
  },
};

module.exports = Commands;
