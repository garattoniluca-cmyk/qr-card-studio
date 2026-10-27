import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    root,
    include: ['test/**/*.test.js'],
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
    reporters: ['default', ['json', { outputFile: path.join(root, '..', '.reports', 'server-unit.json') }]],
  },
});
