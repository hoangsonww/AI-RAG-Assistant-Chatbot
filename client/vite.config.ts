import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteTsconfigPaths from "vite-tsconfig-paths";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  plugins: [react(), viteTsconfigPaths(), svgr()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: "build",
  },
});
