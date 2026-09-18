import { apiUrl } from "../config/api";
import { extractMobilizList } from "../domain/mobilizResponse";

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
<<<<<<< HEAD
    const { headers, ...requestOptions } = options;
    const response = await fetch(`${MOBILIZ_API_URL}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
        ...requestOptions,
    });
=======
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
>>>>>>> e19f46db99295929579026857074dda7619efeec

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
<<<<<<< HEAD
    async araclar(options = {}) {
        return extractMobilizList(await request("/activity-last", options));
    },

    sonKonum(options = {}) {
        return this.araclar(options);
=======
    async araclar() {
        return unwrapList(await request("/activity-last"));
>>>>>>> e19f46db99295929579026857074dda7619efeec
    },

    async sonKonum() {
        return this.araclar();
    },

<<<<<<< HEAD
    async locations(params = {}, options = {}) {
        const searchParams = new URLSearchParams(params);

        return extractMobilizList(
            await request(`/locations?${searchParams.toString()}`, options)
        );
=======
    async rotaDetayi(plate, startTime, endTime) {
        const params = new URLSearchParams({ plate, startTime, endTime });
        return unwrapList(await request(`/activity-detail?${params.toString()}`));
    },

    async locations(params = {}) {
        const searchParams = new URLSearchParams(params);
        return unwrapList(await request(`/locations?${searchParams.toString()}`));
>>>>>>> e19f46db99295929579026857074dda7619efeec
    },
};

export default mobilizService;
