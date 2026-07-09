import axios from "axios";

const API_BASE_URL =
    import.meta.env.VITE_MOBILIZ_API_URL || "http://localhost:5000/api/mobiliz";

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
});

function unwrap(response) {
    if (Array.isArray(response)) return response;
    return response?.data || response?.Data || response?.result || [];
}

export const mobilizService = {
    async sonKonum(plaka) {
        const { data } = await api.get("/activity-last", {
            params: plaka ? { plate: plaka } : {},
        });

        return unwrap(data);
    },

    async araclar() {
        const { data } = await api.get("/vehicles");
        return unwrap(data);
    },

    async filolar() {
        const { data } = await api.get("/fleets");
        return unwrap(data);
    },

    async gruplar() {
        const { data } = await api.get("/groups");
        return unwrap(data);
    },

    async konumGecmisi(plaka, start, end) {
        const { data } = await api.get("/locations", {
            params: {
                plate: plaka,
                start,
                end,
            },
        });

        return unwrap(data);
    },

    async rotaDetayi(plaka, start, end) {
        const { data } = await api.get("/activity-detail", {
            params: {
                plate: plaka,
                startTime: start,
                endTime: end,
            },
        });

        return unwrap(data);
    },
    async gunlukOzet(plaka, start, end) {
        const { data } = await api.get("/daily-summary", {
            params: {
                plate: plaka,
                start,
                end,
            },
        });

        return unwrap(data);
    },

    async aktiviteToplam(plaka, start, end) {
        const { data } = await api.get("/activity-total", {
            params: {
                plate: plaka,
                start,
                end,
            },
        });

        return unwrap(data);
    },
};