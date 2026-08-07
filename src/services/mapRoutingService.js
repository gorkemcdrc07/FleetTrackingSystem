import { buildGeocodeUrl, buildRouteUrl, normalizeDrivingRoute } from "../domain/mapRouting.js";

const geocodeCache = new Map();
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function geocodeFirstAddress(candidates, options = {}) {
    const fetchImpl = options.fetchImpl || fetch;
    const delayMs = options.delayMs ?? 900;
    for (const query of Array.isArray(candidates) ? candidates : [candidates]) {
        if (!query) continue;
        const cacheKey = String(query).trim().toLocaleLowerCase("tr-TR");
        if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);
        if (delayMs > 0) await wait(delayMs);
        const response = await fetchImpl(buildGeocodeUrl(String(query)), {
            headers: { Accept: "application/json" },
        });
        if (!response.ok) continue;
        const data = await response.json();
        if (!Array.isArray(data) || !data.length) continue;
        const point = { lat: Number(data[0].lat), lng: Number(data[0].lon) };
        if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) continue;
        geocodeCache.set(cacheKey, point);
        return point;
    }
    return null;
}

export async function fetchDrivingRoute(points, options = {}) {
    if (!Array.isArray(points) || points.length < 2) return null;
    const response = await (options.fetchImpl || fetch)(buildRouteUrl(points));
    if (!response.ok) throw new Error(`Rota isteği başarısız oldu. HTTP ${response.status}`);
    return normalizeDrivingRoute(await response.json());
}
