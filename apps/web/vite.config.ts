import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /node_modules\/(react|react-dom|react-router-dom|scheduler)\//,
            },
            {
              name: "ui-vendor",
              test: /node_modules\/(?:\.pnpm\/)?@radix-ui\//,
            },
            {
              name: "i18n-vendor",
              test: /node_modules\/(i18next|i18next-browser-languagedetector|react-i18next)\//,
            },
            {
              name: "motion-vendor",
              test: /node_modules\/framer-motion\//,
            },
          ],
        },
      },
    },
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
