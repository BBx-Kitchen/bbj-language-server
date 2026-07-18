import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['out/**', 'src/language/generated/**']
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tseslint.parser,
            sourceType: 'module'
        },
        plugins: {
            '@typescript-eslint': tseslint.plugin
        },
        rules: {}
    }
);
