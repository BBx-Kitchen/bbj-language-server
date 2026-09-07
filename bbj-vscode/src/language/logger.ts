/**
 * Lightweight logger singleton with level-based filtering and zero overhead when disabled.
 * Uses lazy evaluation via callbacks to prevent unnecessary string interpolation.
 */

enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

type LogMessage = string | (() => string);

let currentLevel: LogLevel = LogLevel.WARN; // Default: matches bbj.debug=false

function evaluateMessage(message: LogMessage): string {
  return typeof message === 'function' ? message() : message;
}

function formatMessage(level: string, message: LogMessage, component?: string): string {
  const scope = component ? ` [${component}]` : '';
  return `[${level}]${scope} ${evaluateMessage(message)}`;
}

const logger = {
  setLevel(level: LogLevel): void {
    if (level === currentLevel) return;
    const announcement = `Log level changed to ${LogLevel[level]}`;
    const announceBeforeChange = level < currentLevel && currentLevel >= LogLevel.INFO;

    if (announceBeforeChange) logger.info(announcement);
    currentLevel = level;
    if (!announceBeforeChange) logger.info(announcement);
  },

  isDebug(): boolean {
    return currentLevel >= LogLevel.DEBUG;
  },

  debug(message: LogMessage): void {
    if (currentLevel >= LogLevel.DEBUG) {
      console.log(formatMessage('debug', message));
    }
  },

  info(message: LogMessage): void {
    if (currentLevel >= LogLevel.INFO) {
      console.log(formatMessage('info', message));
    }
  },

  warn(message: LogMessage): void {
    if (currentLevel >= LogLevel.WARN) {
      console.warn(formatMessage('warn', message));
    }
  },

  error(message: LogMessage): void {
    // Always emit, regardless of level
    console.error(formatMessage('error', message));
  },

  scoped(component: string) {
    return {
      debug(message: LogMessage): void {
        if (currentLevel >= LogLevel.DEBUG) {
          console.log(formatMessage('debug', message, component));
        }
      }
    };
  }
};

export { logger, LogLevel, type LogMessage };
