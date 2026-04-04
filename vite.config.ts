import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const isAdminApiRequest = (url?: string | null) => {
  const pathname = String(url ?? "").split("?")[0];
  return pathname === "/api/admin";
};

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom", "zustand", "clsx"],
          charts: ["recharts"],
          documents: ["jspdf", "xlsx"],
        },
      },
    },
  },
  server: {
    proxy: {},
  },
  plugins: [
    react(),
    {
      name: "inddia-admin-api",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!isAdminApiRequest(req.url)) {
            next();
            return;
          }

          try {
            const { handleAdminApi } = await import("./server/adminApi.mjs");
            const handled = await handleAdminApi(req, res);
            if (!handled) {
              next();
            }
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Admin setup is incomplete. Configure `.env.server` with backend credentials.";

            res.statusCode = 503;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: message }));
          }
        });
      },
    },
  ],
});
