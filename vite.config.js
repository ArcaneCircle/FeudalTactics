import path from "node:path";
import { defineConfig } from "vite";
import { buildXDC, eruda, mockWebxdc } from "@webxdc/vite-plugins";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@assets": path.resolve(import.meta.dirname, "./assets"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
  plugins: [
    buildXDC({ outFileName: "FeudalTactics.xdc" }),
    eruda(),
    mockWebxdc(),
  ],
});
