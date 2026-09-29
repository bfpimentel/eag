import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  return {
    plugins: [react()],
    base: "./",
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    server: {
      port: 6124,
      host: true,
      proxy: {
        "/api": {
          target: process.env.SERVER_ADDRESS || "http://localhost:6123",
          changeOrigin: false,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
