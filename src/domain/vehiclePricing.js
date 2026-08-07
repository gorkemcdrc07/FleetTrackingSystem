export function parsePricingNumber(value) {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(String(value)
        .replace("₺", "")
        .replace("%", "")
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(",", "."));
    return Number.isFinite(number) ? number : null;
}

export function normalizePlate(value) {
    return String(value || "").toLocaleUpperCase("tr-TR").replace(/\s+/g, "").trim();
}

function parseBoolean(value) {
    const normalized = String(value ?? "").toLocaleLowerCase("tr-TR").trim();
    return ["true", "1", "evet", "e", "pasif"].includes(normalized);
}

export function buildVehiclePricingPayload(values, { fromExcel = false } = {}) {
    return {
        plaka: normalizePlate(values.plaka),
        cari_id: values.cari_id ? String(values.cari_id) : null,
        cari_adi: values.cari_adi || null,
        arac_sahip: values.arac_sahip || null,
        calisma_tipi: values.calisma_tipi || null,
        aylik_kira: parsePricingNumber(values.aylik_kira),
        aylik_surucu: parsePricingNumber(values.aylik_surucu),
        yakma_orani: parsePricingNumber(values.yakma_orani),
        calisma_gunu: parsePricingNumber(values.calisma_gunu),
        pasif: fromExcel ? parseBoolean(values.pasif) : Boolean(values.pasif),
        aciklama: values.aciklama || null,
        updated_at: new Date().toISOString(),
    };
}

export function filterVehiclePricing(rows, search) {
    const query = String(search || "").toLocaleLowerCase("tr-TR");
    return (rows || []).filter((row) => [
        row.plaka,
        row.cari_id,
        row.cari_adi,
        row.arac_sahip,
        row.calisma_tipi,
        row.aciklama,
    ].join(" ").toLocaleLowerCase("tr-TR").includes(query));
}

export function upsertVehiclePricingRow(rows, record) {
    const exists = (rows || []).some((row) => row.id === record.id);
    const next = exists
        ? rows.map((row) => row.id === record.id ? record : row)
        : [...(rows || []), record];
    return next.sort((a, b) => String(a.plaka || "").localeCompare(String(b.plaka || ""), "tr"));
}
