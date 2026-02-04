import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    /* for example, use global to avoid globals imports (describe, test, expect): */
    // globals: true,
    coverage: {
      enabled: false, // Enable via --coverage flag, not by default
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/language/generated/**', // Langium-generated files
        'src/extension.ts',           // VS Code extension entry point (hard to unit test)
        '**/*.d.ts',                  // Type definitions
      ],
      // Conservative thresholds - start low, increase over time
      // Based on research: 70% lines, 65% functions, 60% branches recommended
      thresholds: {
        lines: 50,      // Start conservative, current coverage unknown
        functions: 45,
        branches: 40,
        statements: 50,
        // Fail build if coverage drops below thresholds
        // This prevents regressions, not ensures completeness
      }
    }
  },
})
