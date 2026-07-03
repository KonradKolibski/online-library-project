import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Honor a PORT env var when set (e.g. by tooling that assigns a free port),
  // falling back to Vite's default 5173. strictPort keeps the bound port
  // predictable instead of silently auto-incrementing when it's taken.
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: !!process.env.PORT,
  },
});
