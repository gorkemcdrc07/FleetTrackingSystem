const MOBILIZ_BASE_URL =
    import.meta.env.VITE_MOBILIZ_BASE_URL ||
    "https://ng.mobiliz.com.tr/su7/api/integrations";

const MOBILIZ_TOKEN = import.meta.env.VITE_MOBILIZ_TOKEN;

function parametreleriEkle(url, params = {}) {
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            url.searchParams.append(key, value);
        }
    });
}

export async function mobilizIstek(endpoint, params = {}) {
    if (!MOBILIZ_TOKEN) {
        throw new Error("Mobiliz token bulunamadý. .env içine VITE_MOBILIZ_TOKEN ekleyin.");
    }

    const url = new URL(`${MOBILIZ_BASE_URL}${endpoint}`);
    parametreleriEkle(url, params);

    const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Mobiliz-Token": MOBILIZ_TOKEN,
        },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(data?.message || `Mobiliz HTTP hatasý: ${response.status}`);
    }

    if (data?.success === false) {
        throw new Error(data?.message || "Mobiliz servis hatasý");
    }

    return data?.result ?? data;
}