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

/**
 * Shown when a web run (BUI/DWC) has no credentials to launch with. Web runs never fall
 * back to settings for credentials: both `bbj.runBUI`/`bbj.runDWC` wrappers in
 * extension.ts already return early when `ensureValidToken` yields nothing, so this is
 * a defence-in-depth guard, not the primary gate (issue #546/#565).
 */
const NO_EM_CREDENTIALS_MESSAGE = 'Enterprise Manager login required. Run "Login to Enterprise Manager" and try again.';

const setOutputChannel = (channel) => {
  outputChannel = channel;
};

/**
 * Helper function to run an Argv (executable path + argument array) in a Promise
 * for use with withProgress. `runProcess`, from process-runner.js, is the one
 * shared launcher every launch in this file goes through — execFile only, never
 * a shell (GHSA-p5f3-9456-9pcx) — and the same launcher the extension's EM
 * helper scripts (em-validate-token.bbj, em-login.bbj) reach through their own
 * owner-only-output runner (src/em-script-runner.ts). `execWithProgress` is
 * kept here as a local alias onto that shared launcher.
 * @param {import('./process-args').Argv} argv - The executable path + argument array to run
 * @returns {Promise<{stdout: string, stderr: string}>} Promise that resolves with stdout/stderr or rejects with error
 */
const execWithProgress = (argv) => runProcess(argv);

const { isTokenizedFile, waitForDecompileOutput, deleteLeftoverLst } = require("../decompile-io");

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
  const fileName = runTargetOrWarn(params);
  if (!fileName) return;

  const home = getBBjHome();
  if (!home) return;

  if (!credentials) {
    vscode.window.showErrorMessage(NO_EM_CREDENTIALS_MESSAGE);
    return;
  }

  const webConfig = vscode.workspace.getConfiguration("bbj.web");
  const webRunnerWorkingDir = path.resolve(`${__dirname}/../tools`);

  // Web runs never fall back to settings for credentials (issue #546/#565).
  let username, password, token;
  if (credentials.username === '__token__') {
    // Token-based authentication
    token = credentials.password;
    username = "";
    password = "";
  } else {
    // The extension itself only ever hands runWeb the EM token now (getEMCredentials
    // has no other credential shape to produce); this branch routes a username and
    // password for callers that pass them directly.
    username = credentials.username;
    password = credentials.password;
    token = "";
  }

  const sscp = stripSentinel(vscode.workspace.getConfiguration("bbj").classpath);
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
 * Resolves the target for Run, Run BUI, Run DWC and Compile via
 * target-resolution.js's resolveRunTarget (argument-first, then an active
 * editor that passes the run/compile menus' own `when` check). Shows
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
 * Run bbjlst on an already-resolved tokenized program, replacing it in place with the
 * decompiled source, then open the result.
 */
const decompileInPlace = (resolvedFileName) => {
  const home = getBBjHome();
  if (!home) return;
  const fileName = resolvedFileName;
  const resolvedLstFileName = resolvedFileName.endsWith('.lst')
    ? resolvedFileName
    : resolvedFileName + '.lst';

  const argv = buildDecompileArgv({
    home,
    platform: os.platform(),
    fileName: resolvedFileName
  });

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "Decompiling BBj Program...",
    cancellable: false
  }, async () => {
    try {
      // Capture up-front whether the input is tokenized: only then can bbjlst
      // legitimately rewrite it in place.
      const wasTokenized = await isTokenizedFile(resolvedFileName);
      await deleteLeftoverLst(resolvedFileName);
      await execWithProgress(argv);

      // bbjlst may return before its output is on disk, and may either produce
      // `<input>.lst` or rewrite the input in place — wait for whichever happens.
      const { inPlace } = await waitForDecompileOutput(resolvedFileName, { canRewriteInPlace: wasTokenized });

      if (!inPlace) {
        await fs.promises.rename(resolvedLstFileName, resolvedFileName);
      }
      // When inPlace, bbjlst already wrote the source into `resolvedFileName`,
      // so there is nothing to move.

      const uri = vscode.Uri.file(resolvedFileName);
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
    if (!home) return;

    // The properties-reader@3.0.1 default export (see em-properties-reader-guard.test.ts)
    // takes an options object, not a bare path; passing a bare string leaves `sourceFile`
    // undefined, so no file is read and every .get() returns null (issue #565: never
    // caught before, because this call site could not be exercised under Vitest).
    // PropertiesReader's append() reads sourceFile synchronously, so a missing or
    // unreadable properties file (partial install, wrong bbj.home) throws here; catch
    // it and report through the extension's usual showErrorMessage pattern instead of
    // letting it propagate as an unhandled command error.
    const propertiesFile = `${home}/cfg/BBj.properties`;
    let properties;
    try {
      properties = PropertiesReader({ sourceFile: propertiesFile });
    } catch (err) {
      vscode.window.showErrorMessage(`Could not open Enterprise Manager: could not read ${propertiesFile}${err && err.message ? ` (${err.message})` : ''}`);
      return;
    }

    const jettyHost = properties.get('com.basis.jetty.host');
    const jettyPort = properties.get('com.basis.jetty.port');
    if (!jettyHost || !jettyPort) {
      vscode.window.showErrorMessage(`Could not read com.basis.jetty.host/com.basis.jetty.port from ${propertiesFile}`);
      return;
    }

    const url = `http://${jettyHost}:${jettyPort}/bbjem/em`;
    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
  },

  run: function (params) {
    const fileName = runTargetOrWarn(params);
    if (!fileName) return;

    const home = getBBjHome();
    if (!home) return;

    const webConfig = vscode.workspace.getConfiguration('bbj.web');
    const sscp = stripSentinel(vscode.workspace.getConfiguration('bbj').classpath);

    const active = vscode.window.activeTextEditor;
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

    if (webConfig.AutoSaveUponRun && active && active.document.fileName === fileName) {
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
  /**
   * Decompile a tokenized (binary) BBj program to unnumbered source and replace
   * the file on disk (issue #65). Resolves the target from the passed uri so it
   * works for binary files that have no active text editor.
   */
  decompileReplace: function (params) {
    const fileName = decompileTargetOrWarn(params);
    if (!fileName) return;
    decompileInPlace(path.resolve(fileName));
  },
  /**
   * Decompile a tokenized (binary) BBj program to a temporary, read-only source
   * view, leaving the original binary file untouched (issue #65).
   */
  decompileReadonly: function (params) {
    const fileName = decompileTargetOrWarn(params);
    if (!fileName) return;
    const home = getBBjHome();
    if (!home) return;
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
        const argv = buildDecompileArgv({ home, platform: os.platform(), fileName: tmpInput });
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
module.exports.NO_EM_CREDENTIALS_MESSAGE = NO_EM_CREDENTIALS_MESSAGE;
