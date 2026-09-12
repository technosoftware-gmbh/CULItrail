import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // The npm `obsidian` package is types only. `@technosoftware/trail-core/obsidian`, which
      // src/shared/vault-host.ts pulls in, imports a value from it, so under
      // Node that import has to resolve to something. See tests/obsidian-stub.ts.
      obsidian: fileURLToPath(new URL('./tests/obsidian-stub.ts', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    server: {
      deps: {
        // The alias above has to reach inside the core as well as this
        // package. Vite leaves a dependency in `node_modules` externalized and
        // lets Node resolve its imports, and Node knows nothing about the
        // alias: `trail-core/dist/obsidian/host.js` imports `obsidian`, finds
        // a types-only package with no runtime entry point, and every suite
        // that touches the vault host fails to load.
        //
        // This did not arise while the core was a workspace symlink, which is
        // the shape of thing to expect from the split rather than a fault in
        // it: a linked package is processed like source and an installed one
        // is not.
        inline: ['@technosoftware/trail-core'],
      },
    },
  },
});
