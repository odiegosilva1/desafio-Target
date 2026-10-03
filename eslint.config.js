import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['node_modules/**', 'dist/**', 'data/**'],
  },
  // O proprio arquivo de configuracao nao faz parte do tsconfig, entao a
  // analise com informacao de tipos se aplica so aos arquivos .ts/.tsx.
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  {
    // Os entry points de CLI sao a unica fronteira que fala com o processo.
    files: ['**/cli.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      // `it` e `describe` do node:test retornam Promise. O runner trata a
      // rejeicao e reporta a falha; exigir `await` em cada caso so
      // adicionaria ruido sem ganho de seguranca.
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
);
