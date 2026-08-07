const DERIVED_VEHICLE_FIELDS = new Set([
    "documentRisk",
    "documentCount",
    "missingDocumentCount",
    "rawDurum",
]);

export function normalizeVehicleDocuments(documents) {
    if (!documents || typeof documents !== "object" || Array.isArray(documents)) {
        return {};
    }

    return documents;
}

export function buildVehiclePayload(form) {
    const payload = Object.fromEntries(
        Object.entries(form || {}).filter(([key]) => !DERIVED_VEHICLE_FIELDS.has(key))
    );

    return {
        ...payload,
        durum: payload.durum || "Müsait",
        evrak_fotograflari: normalizeVehicleDocuments(payload.evrak_fotograflari),
    };
}

export function upsertVehicleRow(rows, vehicle) {
    const exists = (rows || []).some((row) => row.id === vehicle.id);
    const nextRows = exists
        ? rows.map((row) => row.id === vehicle.id ? vehicle : row)
        : [...(rows || []), vehicle];

    return nextRows.sort((a, b) =>
        String(a.plaka || "").localeCompare(String(b.plaka || ""), "tr")
    );
}
