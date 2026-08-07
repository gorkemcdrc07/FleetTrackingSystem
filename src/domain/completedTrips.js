export function getCompletedTripIdentity(row) {
    if (row?.id !== undefined && row?.id !== null) {
        return { key: "id", value: row.id };
    }

    if (row?.sefer_no) {
        return { key: "sefer_no", value: row.sefer_no };
    }

    throw new Error("Güncellenecek sefer için geçerli bir kimlik bulunamadı.");
}
