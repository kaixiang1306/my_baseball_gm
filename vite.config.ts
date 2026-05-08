import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// GitHub Pages 部署在 /my_baseball_gm/ 子路徑下,需把 base 設成這個前綴。
// 本地 dev 不受影響 (Vite dev server 仍從 / 起)。
export default defineConfig({
  base: "/my_baseball_gm/",
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
