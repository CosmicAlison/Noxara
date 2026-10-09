import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  worker: {
    format: "es",
    // Load the model libraries with the worker, rather than fetching additional
    // hashed JS chunks halfway through setup (which can fail after a deployment).
    rollupOptions: { output: { inlineDynamicImports: true } }
  }
});
