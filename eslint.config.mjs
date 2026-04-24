import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

const rootTypeScriptFiles = [
  '*.{ts,tsx}',
  '{bin,deployment,lambda,lib,scripts,shared,test}/**/*.{ts,tsx}',
];

export default [
  {
    ignores: [
      '**/*.js',
      '**/*.d.ts',
      'node_modules/**',
      'cdk.out/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'frontend-react/**',
      'data-handler-ts/**',
    ],
  },
  {
    files: rootTypeScriptFiles,
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...js.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',

      // TypeScript handles identifier resolution for TS files.
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      'no-console': 'off',
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-expressions': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': 'error',
      'no-empty': 'error',
      'no-extra-semi': 'error',
      'no-irregular-whitespace': 'error',
      'no-trailing-spaces': 'off',
      'no-unused-labels': 'error',
      semi: 'off',
      quotes: 'off',
      indent: 'off',
      'eol-last': 'off',
    },
  },
];
