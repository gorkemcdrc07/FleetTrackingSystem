export const VEHICLE_DOCUMENT_TYPES = [
    "Ruhsat", "Ehliyet", "Kimlik", "SRC", "Psikoteknik", "Çekici Muayene",
    "Dorse Muayene", "Taşıt Belgesi 1", "Taşıt Belgesi 2",
];

export function displayValue(value) {
    return value === null || value === undefined || value === "" ? "—" : value;
}

export function normalizeVehicleStatusText(value) {
    return String(value || "").toLocaleLowerCase("tr-TR").trim();
}

export function formatInputDate(dateText) {
    if (!dateText) return "";
    const parts = String(dateText).split("-");
    return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : "";
}

export function inputDateFromDisplay(dateText) {
    if (!dateText) return "";
    const parts = String(dateText).split(".");
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : String(dateText).slice(0, 10);
}

export function parseDisplayDate(dateText) {
    if (!dateText) return null;
    const parts = String(dateText).split(".");
    if (parts.length !== 3) return null;
    const date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
}

export function calculateLeaveDaysFromInput(start, end) {
    if (!start || !end) return "";
    const first = new Date(start);
    const last = new Date(end);
    if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime()) || last < first) return "";
    return String(Math.floor((last - first) / 86400000) + 1);
}

function startOfDay(value) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
}

export function isDocumentExpiringSoon(dateText, now = new Date()) {
    const date = parseDisplayDate(dateText);
    if (!date) return false;
    const days = (date - startOfDay(now)) / 86400000;
    return days >= 0 && days <= 30;
}

export function isDocumentExpired(dateText, now = new Date()) {
    const date = parseDisplayDate(dateText);
    return Boolean(date && date < startOfDay(now));
}

export function normalizeVehicleDocuments(documents) {
    return documents && typeof documents === "object" && !Array.isArray(documents) ? documents : {};
}

export function countVehicleDocuments(documents) {
    const normalized = normalizeVehicleDocuments(documents);
    return VEHICLE_DOCUMENT_TYPES.reduce(
        (total, type) => total + (Array.isArray(normalized[type]) ? normalized[type].length : 0), 0
    );
}

export function countMissingVehicleDocuments(documents) {
    const normalized = normalizeVehicleDocuments(documents);
    return VEHICLE_DOCUMENT_TYPES.filter((type) => !Array.isArray(normalized[type]) || normalized[type].length === 0).length;
}

export function getVehicleDocumentRisk(row, now = new Date()) {
    const dates = [row.cekici_muayene, row.dorse_muayene, row.trafik_sigorta];
    if (dates.some((date) => isDocumentExpired(date, now))) return "expired";
    if (dates.some((date) => isDocumentExpiringSoon(date, now)) || countMissingVehicleDocuments(row.evrak_fotograflari)) return "soon";
    return "ok";
}

export function isDateWithinRange(start, end, now = new Date()) {
    const first = parseDisplayDate(start);
    const last = parseDisplayDate(end);
    if (!first || !last) return false;
    const today = startOfDay(now);
    return today >= first && today <= last;
}

export function getActiveVehicleLeave(row, now = new Date()) {
    return (Array.isArray(row?.izinler) ? row.izinler : []).find(
        (leave) => isDateWithinRange(leave.baslangic, leave.bitis, now)
    ) || null;
}

export function getVehicleDisplayStatus(row, now = new Date()) {
    if (row.isten_cikarildi) return "Çıkartıldı";
    const leave = getActiveVehicleLeave(row, now);
    return leave ? (leave.statu || "İzinde") : (row.durum || "Müsait");
}

export function vehicleExitHasWarning(row) {
    return Boolean(row.isten_cikarildi && (!row.iade_gps || !row.iade_evraklar));
}

export function getChangedVehicleFields(oldObject = {}, newObject = {}) {
    return Object.keys(newObject || {}).flatMap((key) => {
        const oldValue = oldObject?.[key] ?? null;
        const newValue = newObject?.[key] ?? null;
        return JSON.stringify(oldValue) === JSON.stringify(newValue)
            ? [] : [{ alan: key, eski_deger: oldValue, yeni_deger: newValue }];
    });
}

export function vehicleStatusCssKey(text) {
    return normalizeVehicleStatusText(text).replaceAll(" ", "-")
        .replaceAll("ı", "i").replaceAll("ğ", "g").replaceAll("ü", "u")
        .replaceAll("ş", "s").replaceAll("ö", "o").replaceAll("ç", "c");
}
