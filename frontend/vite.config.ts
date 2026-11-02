import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Gopa",
        short_name: "Gopa",
        description: "Gopas Rezepte",
        lang: "de",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#E6F0FF",
        theme_color: "#1B63CC",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Rezepte und Einkaufsdaten offline lesbar: zuerst Netz, sonst Cache
            urlPattern: ({ url }) => url.pathname.startsWith("/api/recipes"),
            handler: "NetworkFirst",
            options: { cacheName: "gopa-api", networkTimeoutSeconds: 4 },
          },
        ],
      },
    }),
  ],
  server: { proxy: { "/api": process.env.GOPA_API ?? "http://localhost:8000" } },
});
