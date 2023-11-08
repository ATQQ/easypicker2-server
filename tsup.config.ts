/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from 'tsup'

export default defineConfig({
  splitting: false,
  sourcemap: false,
  clean: true,
  outDir: 'dist',
  entryPoints: ['src/index.ts']
})
