function safePathSegment(value) {
    return String(value || "")
        .toLocaleLowerCase("tr-TR")
        .trim()
        .replaceAll(" ", "_")
        .replaceAll("ı", "i")
        .replaceAll("ğ", "g")
        .replaceAll("ü", "u")
        .replaceAll("ş", "s")
        .replaceAll("ö", "o")
        .replaceAll("ç", "c")
        .replace(/[^a-z0-9_.-]/g, "_");
}

export function buildVehicleDocumentPath({ plate, type, fileName, timestamp, id }) {
    const extension = String(fileName || "").split(".").pop();
    return `${safePathSegment(plate)}/${safePathSegment(type)}/${timestamp}-${id}.${safePathSegment(extension)}`;
}
