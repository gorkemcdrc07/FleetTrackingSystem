const ACTION_LABELS = Object.freeze({
    SEFER_DETAY_ACMA: "Detay Açtı",
    ETA_ACMA: "ETA Açtı",
    TONAJ_BUTON: "Tonaj İşlemi",
    IKAZ_BUTON: "İkaz İşlemi",
    SEFER_DETAY_GUNCELLEME: "Sefer Detayı Güncelledi",
    ROTA_SIRASI_VE_DETAY_GUNCELLEME: "Rota Sırası / Detay Güncelledi",
    ARAC_EKLEME: "Araç Ekledi",
    ARAC_DUZENLEME: "Araç Düzenledi",
    ARAC_IZIN_EKLEME: "İzin Ekledi",
    ARAC_IZIN_SILME: "İzin Sildi",
    ARAC_KESINTI_EKLEME: "Kesinti Ekledi",
    ARAC_KESINTI_SILME: "Kesinti Sildi",
    ARAC_ISTEN_CIKARTMA: "Araç Çıkarttı",
    ARAC_ANA_LISTEYE_ALMA: "Ana Listeye Aldı",
});

export function getActionLabel(type) {
    return ACTION_LABELS[type] || type || "Bilinmeyen İşlem";
}

export function getActivityUser(log) {
    return log?.kullanici || log?.kullanici_ad || "Bilinmeyen";
}

export function filterActivityLogs(logs, { user = "Tümü", type = "Tümü" } = {}) {
    return (logs || []).filter((log) =>
        (user === "Tümü" || getActivityUser(log) === user) &&
        (type === "Tümü" || log.islem_tipi === type)
    );
}

export function summarizeActivityLogs(logs) {
    const items = logs || [];
    return {
        total: items.length,
        uniqueUsers: new Set(items.map(getActivityUser)).size,
        routeUpdates: items.filter((item) =>
            ["SEFER_DETAY_GUNCELLEME", "ROTA_SIRASI_VE_DETAY_GUNCELLEME"].includes(item.islem_tipi)
        ).length,
        vehicleOps: items.filter((item) =>
            String(item.islem_tipi || "").startsWith("ARAC_")
        ).length,
    };
}

export function groupActivityByUser(logs) {
    const stats = new Map();

    (logs || []).forEach((log) => {
        const user = getActivityUser(log);
        const item = stats.get(user) || {
            kullanici: user,
            toplam: 0,
            sefer: 0,
            arac: 0,
            buton: 0,
            sonIslem: null,
        };
        const type = String(log.islem_tipi || "");

        item.toplam += 1;
        if (type.includes("SEFER") || type.includes("ROTA")) item.sefer += 1;
        if (type.startsWith("ARAC_")) item.arac += 1;
        if (type.includes("ACMA") || type.includes("BUTON")) item.buton += 1;
        if (!item.sonIslem || new Date(log.created_at) > new Date(item.sonIslem)) {
            item.sonIslem = log.created_at;
        }
        stats.set(user, item);
    });

    return Array.from(stats.values()).sort((a, b) => b.toplam - a.toplam);
}

export function groupActivityByType(logs) {
    const stats = new Map();
    (logs || []).forEach((log) => {
        const type = log.islem_tipi || "BILINMEYEN";
        stats.set(type, (stats.get(type) || 0) + 1);
    });

    return Array.from(stats, ([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);
}
