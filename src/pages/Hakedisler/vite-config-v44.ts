import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const remoteApi = process.env.VITE_API_BASE_URL || "https://filo-backend-57wx.onrender.com";

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            // TMS senkronizasyonu production backend üzerinde çalışıyor.
            // Bu özel kural generic /api kuralından önce olmalı; aksi halde
            // istek localhost:4000 içindeki placeholder TMS proxy'sine düşer.
            "/api/proxy/tmsdespatches": {
                target: remoteApi,
                changeOrigin: true,
                secure: true,
            },
            "/api/mobiliz": {
                target: remoteApi,
                changeOrigin: true,
                secure: true,
            },
            // Hakediş Seferleri -> REEL/TMS işlemleri de uzak backend üzerinden çalışır.
            // Generic /api localhost:4000 kuralından önce tanımlanmalıdır.
            "/api/reel-auth": {
                target: remoteApi,
                changeOrigin: true,
                secure: true,
            },
            "/api/tmsdespatchincomeexpenses": {
                target: remoteApi,
                changeOrigin: true,
                secure: true,
            },
            "/api": {
                target: "http://localhost:4000",
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
