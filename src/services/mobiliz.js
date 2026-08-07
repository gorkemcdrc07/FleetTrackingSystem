import { apiUrl } from "../config/api";
import { extractMobilizList } from "../domain/mobilizResponse";

const MOBILIZ_API_URL = apiUrl("/api/mobiliz");

async function request(path, options = {}) {
    const { headers, ...requestOptions } = options;
    const response = await fetch(`${MOBILIZ_API_URL}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
        ...requestOptions,
    });

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
            `Mobiliz isteği başarısız oldu. HTTP ${response.status}`;

        throw new Error(message);
    }

    return data;
}

export const mobilizService = {
    async araclar(options = {}) {
        return extractMobilizList(await request("/activity-last", options));
    },

    sonKonum(options = {}) {
        return this.araclar(options);
    },

    rotaDetayi(plate, startTime, endTime) {
        const params = new URLSearchParams({
            plate,
            startTime,
            endTime,
        });

        return request(`/activity-detail?${params.toString()}`);
    },

    locations(params = {}) {
        const searchParams = new URLSearchParams(params);

        return request(`/locations?${searchParams.toString()}`);
    },
};

export default mobilizService;
