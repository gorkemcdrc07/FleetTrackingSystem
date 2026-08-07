export function buildEtaReferenceLookup(origin, destination) {
    const normalizedOrigin = String(origin || "").trim();
    const normalizedDestination = String(destination || "").trim();
    if (!normalizedOrigin || !normalizedDestination) return null;
    return {
        originPattern: `${normalizedOrigin}%`,
        destinationPattern: `${normalizedDestination}%`,
    };
}
