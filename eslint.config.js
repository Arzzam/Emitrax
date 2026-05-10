import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import eslintPluginImport from 'eslint-plugin-import';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

export default tseslint.config(
    { ignores: ['dist'] },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            import: eslintPluginImport,
            'simple-import-sort': simpleImportSort,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
            'import/no-duplicates': 'error',
            'simple-import-sort/imports': [
                'error',
                {
                    groups: [
                        // React first
                        ['^react', '^@?\\w'],

                        // Internal alias (@/)
                        ['^@/'],

                        // Components
                        ['^@/components'],

                        // Parent imports
                        ['^\\.\\.(?!/?$)', '^\\.\\./?$'],

                        // Same folder
                        ['^\\./(?=.*/)', '^\\.(?!/?$)', '^\\./?$'],

                        // Style imports
                        ['^.+\\.?(css|scss)$'],
                    ],
                },
            ],

            'simple-import-sort/exports': 'error',
        },
    }
);
