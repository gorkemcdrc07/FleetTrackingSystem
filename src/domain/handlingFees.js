function normalizeText(value) {
    return String(value || "")
        .toLocaleLowerCase("tr-TR")
        .replace(/\s+/g, " ")
        .trim();
}

function toNumber(value) {
    if (value === "" || value === null || value === undefined) return null;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
}

export function buildHandlingFeePayload(form) {
    return {
        gelir_gider: form.gelirGider,
        sefer_no: form.seferNo,
        tarih: form.tarih || null,
        plaka: form.plaka,
        ad_soyad: form.adSoyad,
        surucu_tel: form.surucuTel,
        yukleme_musteri: form.yuklemeMusteri,
        fatura_musteri: form.faturaMusteri,
        bolge_palet_sayisi: form.bolgePaletSayisi,
        odenen_tutar: toNumber(form.odenenTutar) ?? 0,
        palet_sayisi: toNumber(form.paletSayisi) ?? 0,
        donem: form.donem,
        kullanici: form.kullanici,
    };
}

export function filterHandlingFees(records, filters) {
    const query = normalizeText(filters.search);
    const minAmount = toNumber(filters.minAmount);
    const maxAmount = toNumber(filters.maxAmount);

    return (records || []).filter((item) => {
        const amount = Number(item.odenen_tutar || 0);
        const searchText = normalizeText([
            item.gelir_gider,
            item.sefer_no,
            item.tarih,
            item.plaka,
            item.ad_soyad,
            item.surucu_tel,
            item.yukleme_musteri,
            item.fatura_musteri,
            item.bolge_palet_sayisi,
            item.donem,
            item.kullanici,
        ].join(" "));

        if (query && !searchText.includes(query)) return false;
        if (filters.gelirGider !== "Tümü" && item.gelir_gider !== filters.gelirGider) return false;
        if (filters.startDate && item.tarih && new Date(item.tarih) < new Date(filters.startDate)) return false;
        if (filters.endDate && item.tarih && new Date(item.tarih) > new Date(filters.endDate)) return false;
        if (minAmount !== null && amount < minAmount) return false;
        if (maxAmount !== null && amount > maxAmount) return false;
        return true;
    });
}

export function summarizeHandlingFees(records) {
    const items = records || [];
    return {
        count: items.length,
        totalAmount: items.reduce((sum, item) => sum + Number(item.odenen_tutar || 0), 0),
        totalPallet: items.reduce((sum, item) => sum + Number(item.palet_sayisi || 0), 0),
        uniqueTripCount: new Set(items.map((item) => item.sefer_no).filter(Boolean)).size,
    };
}
