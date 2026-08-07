import { normalizeTripNumber } from "./tripIdentity.js";

export function getActiveTripMatch(trip) {
    if (trip?.id !== undefined && trip?.id !== null && trip.id !== "") {
        return { field: "id", value: trip.id };
    }
    const tripNumber = normalizeTripNumber(trip?.sefer_no);
    if (tripNumber) return { field: "sefer_no", value: tripNumber };
    throw new Error("Güncellenecek aktif sefer için geçerli bir kimlik bulunamadı.");
}

export function buildInactiveTripPatch(now = new Date()) {
    return {
        pasif: true,
        pasif_tarihi: now.toISOString(),
        pasif_nedeni: "Kullanıcı tarafından silindi",
    };
}
