import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: { extends: ['@eslint/js'] }
});

export default [
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // Downgrade from error to warning
      '@typescript-eslint/no-unused-vars': 'warn', // Downgrade from error to warning
      'react/no-unescaped-entities': 'warn', // Downgrade from error to warning
      'react-hooks/exhaustive-deps': 'warn' // Downgrade from error to warning
    }
  }
];
