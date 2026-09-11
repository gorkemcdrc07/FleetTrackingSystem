import { apiUrl } from "../config/api";

const MOBILIZ_API_URL = apiUrl("/api/mobiliz");

function unwrapList(data) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== "object") return [];

    const candidates = [
        data.data,
        data.result,
        data.results,
        data.items,
        data.list,
        data.records,
        data.activities,
        data.locations,
    ];

    return candidates.find(Array.isArray) || [];
}

async function request(path, options = {}) {
    let response;

    try {
        response = await fetch(`${MOBILIZ_API_URL}${path}`, {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                ...(options.headers || {}),
            },
            ...options,
        });
    } catch (error) {
        throw new Error(`Mobiliz servisine ulaşılamadı: ${error?.message || "bağlantı hatası"}`);
    }

    const text = await response.text();
    let data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!response.ok) {
        const message =
            data?.error ||
            data?.message ||
            data?.detail ||
            `Mobiliz isteği başarısız oldu. HTTP ${response.status}`;
        throw new Error(message);
    }

    return data;
}

export const mobilizService = {
    async araclar() {
        return unwrapList(await request("/activity-last"));
    },

    async sonKonum() {
        return this.araclar();
    },

    async rotaDetayi(plate, startTime, endTime) {
        const params = new URLSearchParams({ plate, startTime, endTime });
        return unwrapList(await request(`/activity-detail?${params.toString()}`));
    },

    async locations(params = {}) {
        const searchParams = new URLSearchParams(params);
        return unwrapList(await request(`/locations?${searchParams.toString()}`));
    },
};

export default mobilizService;
