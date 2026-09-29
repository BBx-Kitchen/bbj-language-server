import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['out/**', 'src/language/generated/**', 'test/.tmp/**']
    },
    {
        linterOptions: {
            reportUnusedDisableDirectives: 'error'
        }
    },
    ...tseslint.configs.recommended,
    {
        rules: {
            'prefer-const': ['error', { ignoreReadBeforeAssign: true }],
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_'
            }]
        }
    },
    {
        // Fakes and mocks legitimately use `any`, and the chai-style property
        // assertions (expect(x).true, expect(x).empty) are real assertions, not
        // unused expressions.
        files: ['test/**'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-expressions': 'off'
        }
    },
    {
        // Commands.cjs stays CommonJS for testability, so require() is legitimate there.
        files: ['**/*.cjs'],
        rules: {
            '@typescript-eslint/no-require-imports': 'off'
        }
    }
);
