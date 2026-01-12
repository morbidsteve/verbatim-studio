import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/components/index.ts', 'src/hooks/index.ts', 'src/lib/utils.ts'],
  format: ['esm'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
