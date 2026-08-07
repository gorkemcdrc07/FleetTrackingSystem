export function buildAddressCandidates(stop = {}) {
    return [
        [stop.nokta, stop.ilce, stop.il, "Türkiye"],
        [stop.ilce, stop.il, "Türkiye"],
        [stop.il, "Türkiye"],
    ].map((parts) => parts.filter(Boolean).join(", ")).filter(Boolean);
}

export function buildGeocodeUrl(query) {
    return `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
        q: query, format: "json", limit: "1", countrycodes: "tr",
    })}`;
}

export function buildRouteUrl(points) {
    const coordinates = points.map((point) => `${point.lng},${point.lat}`).join(";");
    return `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`;
}

export function normalizeDrivingRoute(payload) {
    const route = payload?.routes?.[0];
    if (!route) return null;
    return {
        distanceKm: route.distance / 1000,
        durationMin: route.duration / 60,
        geometry: (route.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng]),
        legs: (route.legs || []).map((leg) => ({
            distanceKm: leg.distance / 1000,
            durationMin: leg.duration / 60,
        })),
    };
}
