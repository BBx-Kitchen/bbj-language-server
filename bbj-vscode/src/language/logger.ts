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

let currentLevel: LogLevel = LogLevel.ERROR; // Default: quietest startup

function evaluateMessage(message: LogMessage): string {
  return typeof message === 'function' ? message() : message;
}

const logger = {
  setLevel(level: LogLevel): void {
    currentLevel = level;
    console.log(`Log level changed to ${LogLevel[level]}`);
  },

  isDebug(): boolean {
    return currentLevel >= LogLevel.DEBUG;
  },

  debug(message: LogMessage): void {
    if (currentLevel >= LogLevel.DEBUG) {
      const msg = evaluateMessage(message);
      console.log(`[${new Date().toISOString()}] ${msg}`);
    }
  },

  info(message: LogMessage): void {
    if (currentLevel >= LogLevel.INFO) {
      console.log(evaluateMessage(message));
    }
  },

  warn(message: LogMessage): void {
    if (currentLevel >= LogLevel.WARN) {
      console.warn(evaluateMessage(message));
    }
  },

  error(message: LogMessage): void {
    // Always emit, regardless of level
    console.error(evaluateMessage(message));
  },

  scoped(component: string) {
    return {
      debug(message: LogMessage): void {
        if (currentLevel >= LogLevel.DEBUG) {
          const msg = evaluateMessage(message);
          console.log(`[${new Date().toISOString()}] [${component}] ${msg}`);
        }
      }
    };
  }
};

export { logger, LogLevel, type LogMessage };
