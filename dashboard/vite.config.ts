import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dashboardDir = path.dirname(fileURLToPath(import.meta.url));
const previewHosts = [".e2b.app", "localhost", "127.0.0.1"];

// 100plan Super App — dashboard
// منطق اصلی (NAV، دفتر، پورسانت، وام، OrderBook) از packages/shared لود می‌شود.
export default defineConfig({
  base: "./", // مسیر نسبی — قابل میزبانی در هر مسیری + مناسب Capacitor
  plugins: [react()],
  resolve: {
    alias: {
      "@daric/shared": path.resolve(dashboardDir, "../packages/shared/src/index.ts"),
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: previewHosts,
  },
  preview: {
    host: true,
    port: 5173,
    allowedHosts: previewHosts,
  },
});
