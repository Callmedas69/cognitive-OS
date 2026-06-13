import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  clean: true,
  dts: false,
  sourcemap: false,
  // tsup preserves the entry file's shebang so `dist/cli.js` stays executable.
});
