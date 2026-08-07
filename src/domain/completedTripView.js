export const TONNAGE_DESCRIPTION = "Tonajlı";

export const COMPLETED_TRIP_SEARCH_KEYS = [
    "sefer_no", "arac_statu", "plaka", "treyler", "surucu_ad_soyad",
    "musteri_adi", "musteri_siparis_no", "hizmet_adi", "proje_adi",
    "yukleme_ili", "teslim_ili", "irsaliye_no", "aciklama",
];

export function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("tr-TR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
}

export function formatNumber(value) {
    if (value === null || value === undefined || value === "") return "—";
    return Number(value).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

export function splitTripValues(value) {
    return String(value || "").split(";").map((part) => part.trim()).filter(Boolean);
}

export function getLastTripValue(value) {
    const parts = splitTripValues(value);
    return parts.length ? parts[parts.length - 1] : "";
}

export function normalizeTurkishText(value) {
    return String(value || "").toLocaleUpperCase("tr-TR").replace(/\s+/g, " ").trim();
}

export function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function parseDayValue(value) {
    if (!value) return null;
    const number = Number(String(value).replace(",", ".").replace(/[^\d.]/g, ""));
    return Number.isFinite(number) ? number : null;
}

export function toDatetimeLocalValue(value) {
    const date = parseDate(value);
    if (!date) return "";
    const pad = (number) => String(number).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value) {
    return parseDate(value)?.toISOString() ?? null;
}

export function getActualEtaDays(row) {
    const route = Array.isArray(row?.rota_detaylari) ? row.rota_detaylari : [];
    const loads = route.filter((item) => item.tip === "yukleme" || item.type === "Yükleme");
    const deliveries = route.filter((item) => item.tip === "teslim" || item.type === "Teslim");
    const start = parseDate(loads[0]?.cikis || loads[0]?.gerceklesen_cikis);
    const lastDelivery = deliveries[deliveries.length - 1];
    const end = parseDate(lastDelivery?.varis || lastDelivery?.gerceklesen_varis);
    if (!start || !end || end < start) return null;
    return Number(((end.getTime() - start.getTime()) / 86400000).toFixed(2));
}

export function getCompletedTripKey(row) {
    return row?.id ?? row?.sefer_no;
}

export function isTonnageTrip(row) {
    return String(row?.tonaj_durumu || "").trim() === TONNAGE_DESCRIPTION;
}

export function hasTripWarning(row) {
    return Boolean(String(row?.aciklama || "").trim());
}

export function getCompletedTripSortValue(row, column) {
    if (column.key === "eta_durum") return row.eta_gecikme ? 1 : 0;
    if (column.type === "tonaj") return isTonnageTrip(row) ? 1 : 0;
    if (column.type === "ikaz") return hasTripWarning(row) ? 1 : 0;
    if (column.type === "date") return parseDate(row[column.key])?.getTime() ?? -Infinity;
    if (column.type === "last") return normalizeTurkishText(getLastTripValue(row[column.key]));
    if (column.type === "gun" || column.type === "gecikme") {
        const number = Number(row[column.key]);
        return Number.isFinite(number) ? number : -Infinity;
    }
    const value = row[column.key];
    return value === null || value === undefined || value === "" ? "" : normalizeTurkishText(value);
}

export function matchesCompletedTripColumn(row, column, filterValue) {
    if (!filterValue) return true;
    if (column.key === "eta_durum") return (row.eta_gecikme ? "gecikti" : "normal") === filterValue;
    if (column.type === "tonaj") return filterValue === "var" ? isTonnageTrip(row) : !isTonnageTrip(row);
    if (column.type === "ikaz") return filterValue === "var" ? hasTripWarning(row) : !hasTripWarning(row);
    if (column.key === "arac_statu") return row.arac_statu === filterValue;
    const needle = normalizeTurkishText(filterValue);
    if (column.type === "multi") return splitTripValues(row[column.key]).map(normalizeTurkishText).some((part) => part.includes(needle));
    if (column.type === "last") return normalizeTurkishText(getLastTripValue(row[column.key])).includes(needle);
    return normalizeTurkishText(row[column.key] ?? "").includes(needle);
}

export function matchesCompletedTripSearch(row, query) {
    if (!query) return true;
    const needle = normalizeTurkishText(query);
    return COMPLETED_TRIP_SEARCH_KEYS.some((key) => normalizeTurkishText(row[key] ?? "").includes(needle));
}
