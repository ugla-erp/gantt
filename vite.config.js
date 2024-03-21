/** @type {import('vite').UserConfig} */
export default {
  build: {
    lib: {
      entry: `src/index.js`,
      name: `UGLAGantt`,
      fileName: `gantt`,
      formats: [`es`, `cjs`, `umd`, `iife`],
    },
  },
}