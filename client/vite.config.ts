import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const proxyTarget = process.env.VITE_PROXY_TARGET ?? "http://localhost:3001";

const proxy = {
  "/socket.io": {
    target: proxyTarget,
    ws: true,
    changeOrigin: true,
  },
  "/api": {
    target: proxyTarget,
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy,
  },
  preview: {
    port: 4173,
    host: true,
    proxy,
  },
});
