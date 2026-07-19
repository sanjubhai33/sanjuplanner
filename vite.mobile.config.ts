import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Capacitor must load a plain static SPA from bundled files. The normal
// TanStack Start build is SSR-oriented and can leave the native WebView with
// only a prerender/loading shell, so the APK uses this separate mobile entry.
export default defineConfig({
  root: "src/mobile",
  envDir: path.resolve(__dirname),
  publicDir: path.resolve(__dirname, "public"),
  base: "./",
  plugins: [react(), tailwindcss(), tsConfigPaths()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist/mobile"),
    emptyOutDir: true,
  },
});