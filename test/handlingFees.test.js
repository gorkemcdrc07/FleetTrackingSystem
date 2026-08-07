import test from "node:test";
import assert from "node:assert/strict";
import {
    buildHandlingFeePayload,
    filterHandlingFees,
    summarizeHandlingFees,
} from "../src/domain/handlingFees.js";

test("hamaliye formunu güvenli sayısal alanlarla kayıt yüküne çevirir", () => {
    const payload = buildHandlingFeePayload({
        gelirGider: "HAMMALİYE",
        seferNo: "S-1",
        tarih: "",
        plaka: "34 ABC 34",
        adSoyad: "Test",
        surucuTel: "",
        yuklemeMusteri: "A",
        faturaMusteri: "B",
        bolgePaletSayisi: "Marmara",
        odenenTutar: "1250.5",
        paletSayisi: "geçersiz",
        donem: "2026 Ağustos",
        kullanici: "Görkem",
    });

    assert.equal(payload.tarih, null);
    assert.equal(payload.odenen_tutar, 1250.5);
    assert.equal(payload.palet_sayisi, 0);
});

test("hamaliye kayıtlarını filtreler ve finansal özeti hesaplar", () => {
    const records = [
        { sefer_no: "S-1", plaka: "34 ABC", gelir_gider: "HAMMALİYE", tarih: "2026-08-01", odenen_tutar: 100, palet_sayisi: 2 },
        { sefer_no: "S-2", plaka: "06 XYZ", gelir_gider: "PRİM", tarih: "2026-08-02", odenen_tutar: 250, palet_sayisi: 3 },
    ];
    const filtered = filterHandlingFees(records, {
        search: "34 abc",
        gelirGider: "Tümü",
        startDate: "",
        endDate: "",
        minAmount: "50",
        maxAmount: "200",
    });

    assert.equal(filtered.length, 1);
    assert.deepEqual(summarizeHandlingFees(records), {
        count: 2,
        totalAmount: 350,
        totalPallet: 5,
        uniqueTripCount: 2,
    });
});
