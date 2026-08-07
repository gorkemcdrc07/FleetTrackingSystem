export function normalizeTripNumber(value) {
    return String(value ?? "").trim().toLocaleUpperCase("tr-TR");
}

export function uniqueTripsByNumber(rows) {
    const uniqueRows = new Map();
    for (const row of Array.isArray(rows) ? rows : []) {
        const tripNumber = normalizeTripNumber(row?.sefer_no);
        if (!tripNumber) continue;
        uniqueRows.set(tripNumber, { ...row, sefer_no: tripNumber });
    }
    return [...uniqueRows.values()];
}

export function tripNumberSet(rows) {
    return new Set((Array.isArray(rows) ? rows : [])
        .map((row) => normalizeTripNumber(row?.sefer_no)).filter(Boolean));
}
