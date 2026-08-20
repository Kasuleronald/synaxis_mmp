import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // @life-mmp/shared is an npm-workspace symlink, not a real published
    // dependency -- Vite's dep pre-bundle cache only invalidates on a
    // package.json/lockfile change, so editing the package's own source
    // would otherwise keep serving a stale pre-bundled copy (missing any
    // exports added since) until a `--force` restart. Excluding it means
    // Vite transforms it fresh on every request like any other source file.
    exclude: ["@life-mmp/shared"],
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
