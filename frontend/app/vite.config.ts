import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      // Let LAN clients talk to the backend via the Vite dev server (single-port access).
      // Supports HTTP + WebSocket upgrade (multiplayer).
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
        ws: true,
      },
      "/health": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
      "/metrics": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
    },
  },
});
