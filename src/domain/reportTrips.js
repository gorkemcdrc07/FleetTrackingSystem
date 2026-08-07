export const REPORT_TRIP_SOURCES = Object.freeze([
    Object.freeze({ table: "aktif_seferler", label: "Aktif Sefer" }),
    Object.freeze({ table: "tamamlanan_seferler", label: "Tamamlanan Sefer" }),
]);

export function normalizeRouteDetails(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string" || !value.trim()) return [];

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function attachReportSource(rows, source) {
    return (rows || []).map((row) => ({
        ...row,
        kaynak_tablo: source.table,
        kaynak_tablo_label: source.label,
    }));
}
