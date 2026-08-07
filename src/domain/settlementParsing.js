export function normalizeSettlementText(value) {
    return String(value || "").toLocaleUpperCase("tr-TR").replace(/\s+/g, " ").trim();
}

export function normalizeSettlementPlate(value) {
    return String(value || "").toLocaleUpperCase("tr-TR").replace(/\s+/g, "").trim();
}

export function normalizeSettlementHeader(value) {
    return String(value || "")
        .toLocaleLowerCase("tr-TR")
        .replaceAll("ı", "i").replaceAll("ğ", "g").replaceAll("ü", "u")
        .replaceAll("ş", "s").replaceAll("ö", "o").replaceAll("ç", "c")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

export function parseSettlementNumber(value) {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;

    let normalized = String(value).replace(/₺/g, "").replace(/\s/g, "").trim();
    if (normalized.includes(".") && normalized.includes(",")) {
        normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else if (normalized.includes(",")) {
        normalized = normalized.replace(",", ".");
    }
    normalized = normalized.replace(/[^\d.-]/g, "");
    const number = Number(normalized);
    return Number.isFinite(number) ? number : 0;
}

export function mapSettlementRow(row) {
    return Object.fromEntries(
        Object.entries(row || {}).map(([key, value]) => [normalizeSettlementHeader(key), value])
    );
}

export function pickSettlementValue(row, keys) {
    for (const key of keys) {
        const value = row?.[normalizeSettlementHeader(key)];
        if (value !== undefined && value !== "") return value;
    }
    return "";
}

export function parseSettlementClipboardRows(text) {
    const clean = String(text || "").trim();
    if (!clean) return [];
    const lines = clean.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return [];
    const separator = lines[0].includes("\t") ? "\t" : ";";
    const headers = lines[0].split(separator).map((header) => header.trim());
    return lines.slice(1).map((line) => {
        const values = line.split(separator);
        return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    });
}
