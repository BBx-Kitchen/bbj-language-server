import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, LogLevel } from '../src/language/logger.js';

describe('Logger', () => {
  beforeEach(() => {
    // Reset logger to ERROR level before each test
    logger.setLevel(LogLevel.ERROR);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('level filtering', () => {
    test('at ERROR level, only error() produces output', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.setLevel(LogLevel.ERROR);
      vi.clearAllMocks(); // Clear the setLevel announcement

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(logSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledOnce();
      expect(errorSpy).toHaveBeenCalledWith('error message');
    });

    test('at WARN level, warn() and error() produce output', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.setLevel(LogLevel.WARN);
      vi.clearAllMocks();

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(logSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(warnSpy).toHaveBeenCalledWith('warn message');
      expect(errorSpy).toHaveBeenCalledOnce();
      expect(errorSpy).toHaveBeenCalledWith('error message');
    });

    test('at INFO level, info/warn/error produce output, debug silent', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.setLevel(LogLevel.INFO);
      vi.clearAllMocks();

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(logSpy).toHaveBeenCalledOnce();
      expect(logSpy).toHaveBeenCalledWith('info message');
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(errorSpy).toHaveBeenCalledOnce();
    });

    test('at DEBUG level, all methods produce output', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.setLevel(LogLevel.DEBUG);
      vi.clearAllMocks();

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(logSpy).toHaveBeenCalledTimes(2); // debug + info
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(errorSpy).toHaveBeenCalledOnce();
    });
  });

  describe('lazy evaluation', () => {
    test('callback IS called when level meets threshold', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const callback = vi.fn(() => 'callback result');

      logger.setLevel(LogLevel.DEBUG);
      vi.clearAllMocks();

      logger.debug(callback);

      expect(callback).toHaveBeenCalledOnce();
      expect(logSpy).toHaveBeenCalledOnce();
      expect(logSpy.mock.calls[0][0]).toContain('callback result');
    });

    test('callback NOT called when level is below threshold', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const callback = vi.fn(() => 'callback result');

      logger.setLevel(LogLevel.ERROR);
      vi.clearAllMocks();

      logger.debug(callback);

      expect(callback).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  describe('zero overhead', () => {
    test('at ERROR level, debug callback never invoked', () => {
      const expensiveCallback = vi.fn(() => {
        // Simulate expensive computation
        return 'expensive result';
      });

      logger.setLevel(LogLevel.ERROR);

      // Call debug multiple times
      logger.debug(expensiveCallback);
      logger.debug(expensiveCallback);
      logger.debug(expensiveCallback);

      // Callback should never be invoked
      expect(expensiveCallback).not.toHaveBeenCalled();
    });
  });

  describe('scoped logger', () => {
    test('scoped debug prepends component tag', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const scopedLogger = logger.scoped('test-component');

      logger.setLevel(LogLevel.DEBUG);
      vi.clearAllMocks();

      scopedLogger.debug('test message');

      expect(logSpy).toHaveBeenCalledOnce();
      expect(logSpy.mock.calls[0][0]).toContain('[test-component]');
      expect(logSpy.mock.calls[0][0]).toContain('test message');
    });

    test('scoped debug respects level filtering', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const scopedLogger = logger.scoped('test-component');

      logger.setLevel(LogLevel.ERROR);
      vi.clearAllMocks();

      scopedLogger.debug('test message');

      expect(logSpy).not.toHaveBeenCalled();
    });

    test('scoped logger only has debug method', () => {
      const scopedLogger = logger.scoped('test-component');

      expect(scopedLogger).toHaveProperty('debug');
      expect(typeof scopedLogger.debug).toBe('function');

      // Verify it doesn't have other methods
      expect(scopedLogger).not.toHaveProperty('info');
      expect(scopedLogger).not.toHaveProperty('warn');
      expect(scopedLogger).not.toHaveProperty('error');
    });
  });

  describe('setLevel', () => {
    test('setLevel changes effective level', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.setLevel(LogLevel.ERROR);
      vi.clearAllMocks();
      logger.info('info message');
      expect(logSpy).not.toHaveBeenCalled();

      logger.setLevel(LogLevel.INFO);
      vi.clearAllMocks();
      logger.info('info message');
      expect(logSpy).toHaveBeenCalledOnce();
    });

    test('setLevel announces change', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.setLevel(LogLevel.DEBUG);

      expect(logSpy).toHaveBeenCalledWith('Log level changed to DEBUG');
    });
  });

  describe('isDebug', () => {
    test('returns false at ERROR/WARN/INFO', () => {
      logger.setLevel(LogLevel.ERROR);
      expect(logger.isDebug()).toBe(false);

      logger.setLevel(LogLevel.WARN);
      expect(logger.isDebug()).toBe(false);

      logger.setLevel(LogLevel.INFO);
      expect(logger.isDebug()).toBe(false);
    });

    test('returns true at DEBUG', () => {
      logger.setLevel(LogLevel.DEBUG);
      expect(logger.isDebug()).toBe(true);
    });
  });

  describe('output format', () => {
    test('debug messages include ISO timestamp', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.setLevel(LogLevel.DEBUG);
      vi.clearAllMocks();

      logger.debug('test message');

      expect(logSpy).toHaveBeenCalledOnce();
      const output = logSpy.mock.calls[0][0];
      // Check for ISO 8601 timestamp format: [YYYY-MM-DDTHH:MM:SS.sssZ]
      expect(output).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] test message$/);
    });

    test('info/warn/error messages are plain text (no timestamp, no prefix)', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.setLevel(LogLevel.DEBUG);
      vi.clearAllMocks();

      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(logSpy).toHaveBeenCalledWith('info message');
      expect(warnSpy).toHaveBeenCalledWith('warn message');
      expect(errorSpy).toHaveBeenCalledWith('error message');
    });

    test('scoped debug includes both timestamp and component tag', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const scopedLogger = logger.scoped('test-component');

      logger.setLevel(LogLevel.DEBUG);
      vi.clearAllMocks();

      scopedLogger.debug('test message');

      expect(logSpy).toHaveBeenCalledOnce();
      const output = logSpy.mock.calls[0][0];
      // Check for format: [timestamp] [component] message
      expect(output).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[test-component\] test message$/);
    });
  });
});
