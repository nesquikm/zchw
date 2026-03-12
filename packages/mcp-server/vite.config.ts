import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Build a single App UI at a time. The build-apps script iterates over entries.
// Entry name is passed via VITE_UI_ENTRY env var.
const entry = process.env.VITE_UI_ENTRY || 'impact';

export default defineConfig({
  root: resolve(__dirname, `apps/${entry}`),
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: {
      '@agentview/shared': resolve(__dirname, '../shared/src'),
    },
  },
  build: {
    rollupOptions: {
      input: resolve(__dirname, `apps/${entry}/mcp-app.html`),
    },
    outDir: resolve(__dirname, `dist/ui/${entry}`),
    emptyOutDir: true,
  },
});
