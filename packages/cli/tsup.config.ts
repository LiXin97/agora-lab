import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  banner: {
    js: '#!/usr/bin/env node',
  },
});
