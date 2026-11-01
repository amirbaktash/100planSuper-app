import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// DARIC Super App — dashboard
// منطق اصلی (NAV، دفتر، پورسانت، وام، OrderBook) از packages/shared لود می‌شود.
export default defineConfig({
  base: "./", // مسیر نسبی — قابل میزبانی در هر مسیری + مناسب Capacitor
  plugins: [react()],
  resolve: {
    alias: {
      "@daric/shared": path.resolve(__dirname, "../packages/shared/src/index.ts"),
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
});
