import os from "os";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

function lanHosts() {
  const hosts = ["localhost", "127.0.0.1"];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const item of list || []) {
      if (item.family === "IPv4" && !item.internal) hosts.push(item.address);
    }
  }
  return hosts;
}

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    ...(command === "serve" ? [basicSsl({ name: "nexflor", domains: lanHosts() })] : []),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
}));
