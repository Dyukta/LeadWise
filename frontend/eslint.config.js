import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import importX from 'eslint-plugin-import-x'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const featureRoots = [
  { root: './src/modules/leads', types: './leadTypes.ts' },
  { root: './src/modules/performance', types: './performanceTypes.ts' },
  { root: './src/platform/auth', types: null },
  { root: './src/platform/users', types: './userTypes.ts' },
]

const layerZones = [
  ...featureRoots.flatMap(({ root, types }) => {
    const exceptTypes = types ? { except: [types] } : {}

    return [
      { target: `${root}/api`, from: `${root}/hooks` },
      { target: `${root}/api`, from: `${root}/components` },
      { target: `${root}/api`, from: `${root}/pages` },
      { target: `${root}/hooks`, from: `${root}/components` },
      { target: `${root}/hooks`, from: `${root}/pages` },
      { target: `${root}/components`, from: `${root}/api`, ...exceptTypes },
      { target: `${root}/pages`, from: `${root}/api`, ...exceptTypes },
    ]
  }),

  { target: './src/modules/leads', from: './src/modules/performance' },
  { target: './src/modules/performance', from: './src/modules/leads' },

  { target: './src/shared', from: './src/app' },
  { target: './src/shared', from: './src/modules' },
  { target: './src/shared', from: './src/platform' },

  { target: './src/platform', from: './src/modules' },
]

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({ project: './tsconfig.app.json' }),
      ],
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'import-x/no-restricted-paths': ['error', { zones: layerZones }],
      'import-x/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{ pattern: '@(@app|@modules|@platform|@shared)/**', group: 'internal' }],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  {
    files: ['src/**/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react-router*', '@tanstack/*', '@supabase/*'],
              message: 'domain/ must stay pure: no React, no data fetching.',
            },
            {
              group: ['@app/*', '@modules/*', '@platform/*', '@shared/*', '../*'],
              message: 'domain/ imports nothing outside its own folder.',
            },
          ],
        },
      ],
    },
  },
])
