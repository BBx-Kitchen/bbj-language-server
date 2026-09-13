const vscode = require("vscode");
const path = require("path");
const os = require("os");
const fs = require("fs");
const PropertiesReader = require("properties-reader").default;
const { buildCompileOptions, validateOptions } = require("./CompilerOptions");
const { buildRunArgv, buildWebRunArgv, buildCompileArgv, buildDecompileArgv } = require("./process-args");
const { runProcess, runProcessCallback, formatArgvForLog } = require("./process-runner");
const { getActiveConfigPath, getResolvedConfigPath } = require("../config-path-cache");
const { NO_ACTIVE_BBJ_FILE_MESSAGE, toActiveEditorSnapshot, resolveRunTarget, resolveDecompileTarget } = require("./target-resolution");

// Shared output channel from extension.ts
let outputChannel = null;

/**
 * Strips the EM Config sentinel value "--" from a classpath string.
 * "--" means "not configured" in BBj EM Config. Treat it as empty.
 * @param {string|null|undefined} v - The classpath value to strip
 * @returns {string} Empty string if v is "--", otherwise v or "" if falsy
 */
const stripSentinel = (v) => v === '--' ? '' : (v || '');

/**
 * Shown when a run needs the language server's resolved config path (the one shared
 * answer to "which file is the BBj config file") but neither the host cache nor an
 * explicit setting has one yet. The run does not proceed with a guessed path.
 */
const NO_CONFIG_PATH_MESSAGE = 'No config file could be resolved for this run. Set the "bbj.configPath" setting, or configure "bbj.home" so the default config file can be found.';

const setOutputChannel = (channel) => {
  outputChannel = channel;
};

/**
 * Helper function to run an Argv (executable path + argument array) in a Promise
 * for use with withProgress. Delegates to process-runner.js's runProcess, which
 * launches via execFile — never a shell (GHSA-p5f3-9456-9pcx).
 * @param {import('./process-args').Argv} argv - The executable path + argument array to run
 * @returns {Promise<{stdout: string, stderr: string}>} Promise that resolves with stdout/stderr or rejects with error
 */
const execWithProgress = (argv) => runProcess(argv);

const { isTokenizedFile, waitForDecompileOutput } = require("../decompile-io");

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

  const sscp = stripSentinel(vscode.workspace.getConfiguration("bbj").classpath);
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

  // Use the language server's resolved config path (cached on this host), never a
  // locally-derived home fallback. This must be a real path so the app registered in
  // EM never ends up with the "--" sentinel as its config file (issue #382); stripSentinel
  // is a second defensive layer, buildWebRunArgv also refuses the sentinel.
  const configPath = stripSentinel(getActiveConfigPath());
  if (!configPath) {
    vscode.window.showErrorMessage(NO_CONFIG_PATH_MESSAGE);
    return;
  }

  const argv = buildWebRunArgv({
    home,
    platform: os.platform(),
    toolsDir: webRunnerWorkingDir,
    client,
    name,
    programme,
    workingDir,
    username,
    password,
    classpathEntry: sscp,
    token,
    configPath
  });

  const isDebug = vscode.workspace.getConfiguration('bbj').get('debug');
  if (isDebug && outputChannel) {
    outputChannel.appendLine(`${client} run: ${formatArgvForLog(argv, [token, password])}`);
  }

  // The secret env map must be spread over process.env, not passed alone —
  // execFile replaces the child's environment wholesale when options.env is
  // set, and omitting process.env here would strip PATH/BBJ_HOME from the child.
  runProcessCallback(argv, { env: { ...process.env, ...argv.env } }, (err, stdout, stderr) => {
    if (err) {
      const errorMsg = `Failed to run "${programme}": ${err.message || err}${stderr ? '\n\nDetails:\n' + stderr : ''}`;
      vscode.window.showErrorMessage(errorMsg);
      return;
    }
  });
};

/**
 * Resolves the target for Run, Run BUI, Run DWC, Compile and Denumber via
 * target-resolution.js's resolveRunTarget (argument-first, then an active
 * editor that passes the run/compile/denumber menus' own `when` check). Shows
 * the shared "no active BBj file" warning and returns undefined when neither
 * is available, so the caller can bail out instead of throwing (issue #512).
 */
const runTargetOrWarn = (params) => {
  const fileName = resolveRunTarget(params && params.fsPath, toActiveEditorSnapshot(vscode.window.activeTextEditor));
  if (!fileName) {
    vscode.window.showWarningMessage(NO_ACTIVE_BBJ_FILE_MESSAGE);
  }
  return fileName;
};

/**
 * Same as runTargetOrWarn, but for Decompile (Replace) and Decompile
 * (Read-only) via resolveDecompileTarget, whose active-editor fallback also
 * accepts a `.bbjt` document (issue #512).
 */
const decompileTargetOrWarn = (params) => {
  const fileName = resolveDecompileTarget(params && params.fsPath, toActiveEditorSnapshot(vscode.window.activeTextEditor));
  if (!fileName) {
    vscode.window.showWarningMessage(NO_ACTIVE_BBJ_FILE_MESSAGE);
  }
  return fileName;
};

/**
 * Resolve the target file for a decompile/denumber operation.
 * Prefers an explicit uri/params argument (needed for tokenized binary files,
 * which open in a non-text editor so `activeTextEditor` may be absent or wrong),
 * falling back to the active editor.
 */
const resolveTargetFileName = (params) => {
  if (params && params.fsPath) {
    return params.fsPath;
  }
  const active = vscode.window.activeTextEditor;
  return active ? active.document.fileName : undefined;
};

const decompile = (params, options = {}) => {
  const home = getBBjHome();
  if (!home) return;
  const active = vscode.window.activeTextEditor;
  const fileName = active ? active.document.fileName : params.fsPath;
  decompileInPlace(path.resolve(fileName), options);
};

/**
 * Run bbjlst on an already-resolved file, replacing it in place with the result,
 * then open the result. `options.denumber` selects denumbered (clean) source.
 */
const decompileInPlace = (resolvedFileName, options = {}) => {
  const home = getBBjHome();
  if (!home) return;
  const fileName = resolvedFileName;
  const resolvedLstFileName = resolvedFileName.endsWith('.lst')
    ? resolvedFileName
    : resolvedFileName + '.lst';

  const newFileName = options.denumber ? resolvedFileName : resolvedFileName.replace(/\.lst$/, '');

  const argv = buildDecompileArgv({
    home,
    platform: os.platform(),
    fileName: resolvedFileName,
    denumber: options.denumber
  });

  const title = options.denumber ? "Denumbering BBj Program..." : "Decompiling BBj Program...";

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: title,
    cancellable: false
  }, async () => {
    try {
      // Capture up-front whether the input is tokenized: only then can bbjlst
      // legitimately rewrite it in place (denumbering plain text always emits `.lst`).
      const wasTokenized = await isTokenizedFile(resolvedFileName);
      await execWithProgress(argv);

      // bbjlst may return before its output is on disk, and may either produce
      // `<input>.lst` or rewrite the input in place — wait for whichever happens.
      const { inPlace } = await waitForDecompileOutput(resolvedFileName, { canRewriteInPlace: wasTokenized });

      if (!inPlace) {
        if (!options.denumber && resolvedFileName !== newFileName) {
          await fs.promises.unlink(resolvedFileName).catch(() => { });
        }
        await fs.promises.rename(resolvedLstFileName, newFileName);
      }
      // When inPlace, bbjlst already wrote the source into `resolvedFileName`
      // (=== newFileName for denumber), so there is nothing to move.

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
    const configPath = getActiveConfigPath();
    if (!configPath) {
      vscode.window.showErrorMessage(
        'No config file is configured. Set the "bbj.configPath" setting to choose one.'
      );
      return;
    }

    // The resolved payload (pushed by the language server) is the source of truth for
    // whether the active path exists — never a fallback to the home default.
    const cached = getResolvedConfigPath();
    const knownMissing = cached && cached.path === configPath && !cached.exists;
    if (knownMissing) {
      vscode.window.showErrorMessage(`Config file not found: ${configPath}`);
      return;
    }

    return vscode.workspace.openTextDocument(configPath).then((doc) => {
      vscode.window.showTextDocument(doc);
    }, (err) => {
      vscode.window.showErrorMessage(`Config file not found: ${configPath}${err && err.message ? ` (${err.message})` : ''}`);
    });
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
    const sscp = stripSentinel(vscode.workspace.getConfiguration('bbj').classpath);

    const active = vscode.window.activeTextEditor;
    const fileName = active ? active.document.fileName : params.fsPath;
    const workingDir = path.dirname(fileName);

    // Use the language server's resolved config path (cached on this host), never a
    // locally-guessed fallback. stripSentinel is a second defensive layer;
    // buildRunArgv also refuses the sentinel.
    const configPath = stripSentinel(getActiveConfigPath());
    if (!configPath) {
      vscode.window.showErrorMessage(NO_CONFIG_PATH_MESSAGE);
      return;
    }

    const argv = buildRunArgv({
      home,
      platform: os.platform(),
      classpathEntry: sscp,
      configPath,
      workingDir,
      fileName
    });

    const isDebug = vscode.workspace.getConfiguration('bbj').get('debug');
    if (isDebug && outputChannel) {
      outputChannel.appendLine(`GUI run: ${formatArgvForLog(argv)}`);
    }

    const runCommand = () => {
      runProcessCallback(argv, {}, (err, stdout, stderr) => {
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
    const fileName = runTargetOrWarn(params);
    if (!fileName) return;

    const home = getBBjHome();
    if (!home) return;

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

    const argv = buildCompileArgv({ home, platform: os.platform(), compilerOptions, fileName });

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Compiling BBj Program...",
      cancellable: false
    }, async () => {
      try {
        await execWithProgress(argv);
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
  /**
   * Decompile a tokenized (binary) BBj program to denumbered source and replace
   * the file on disk (issue #65). Resolves the target from the passed uri so it
   * works for binary files that have no active text editor.
   */
  decompileReplace: function (params) {
    const fileName = resolveTargetFileName(params);
    if (!fileName) return;
    decompileInPlace(path.resolve(fileName), { denumber: true });
  },
  /**
   * Decompile a tokenized (binary) BBj program to a temporary, read-only source
   * view, leaving the original binary file untouched (issue #65).
   */
  decompileReadonly: function (params) {
    const home = getBBjHome();
    if (!home) return;
    const fileName = resolveTargetFileName(params);
    if (!fileName) return;
    const resolvedFileName = path.resolve(fileName);

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Decompiling BBj Program...",
      cancellable: false
    }, async () => {
      try {
        // Run bbjlst against a private copy in a temp dir, so the original binary
        // is never touched — regardless of whether bbjlst emits `<input>.lst` or
        // rewrites its input in place.
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bbj-decompiled-'));
        const base = path.basename(resolvedFileName).replace(/\.[^.]*$/, '') || 'program';
        const tmpInput = path.join(tmpDir, base + path.extname(resolvedFileName));
        await fs.promises.copyFile(resolvedFileName, tmpInput);

        const wasTokenized = await isTokenizedFile(tmpInput);
        const argv = buildDecompileArgv({ home, platform: os.platform(), fileName: tmpInput, denumber: true });
        await execWithProgress(argv);

        // Wait for the output, then normalise it to a `.bbj` file so the editor
        // opens it with BBj language support.
        const { sourcePath } = await waitForDecompileOutput(tmpInput, { canRewriteInPlace: wasTokenized });
        const tmpFile = path.join(tmpDir, base + '.bbj');
        if (sourcePath !== tmpFile) {
          await fs.promises.rename(sourcePath, tmpFile);
        }

        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(tmpFile));
        await vscode.window.showTextDocument(doc, { preview: false });
        await vscode.commands.executeCommand('workbench.action.files.setActiveEditorReadonlyInSession');
      } catch (err) {
        const errorMsg = `Failed to decompile "${fileName}": ${err.message || err}${err.stderr ? '\n\nDetails:\n' + err.stderr : ''}`;
        vscode.window.showErrorMessage(errorMsg);
      }
    });
  },
};

module.exports = Commands;
module.exports.setOutputChannel = setOutputChannel;
