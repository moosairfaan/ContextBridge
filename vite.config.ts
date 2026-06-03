import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./public/manifest.json";

export default defineConfig({
  plugins: [
    react(),
    crx({
      manifest,
      contentScripts: {
        preambleCode: false,
        injectCss: true,
      },
    }),
  ],
  optimizeDeps: {
    exclude: ["@xenova/transformers"],
  },
  worker: {
    format: "es",
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        manualChunks(id) {
          if (
            id.includes("@xenova/transformers") ||
            id.includes("onnxruntime") ||
            id.includes("summarizer.worker") ||
            id.includes("summarizeClient") ||
            id.includes("abstractive.ts")
          ) {
            return "ml-summarizer";
          }
        },
      },
    },
  },
});
