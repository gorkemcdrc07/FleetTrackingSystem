import test from "node:test";
import assert from "node:assert/strict";
import {
    aggregateHayatKimyaFuelByPlate,
    calculateHayatKimyaFuelSummary,
    distributeHayatKimyaSettlement,
    indexHayatKimyaVehiclePricing,
    summarizeHayatKimyaSettlement,
} from "../src/domain/hayatKimyaFuelSettlement.js";

test("Hayat Kimya yakıt primini ve sefer dağıtımını hesaplar", () => {
    const fuel = aggregateHayatKimyaFuelByPlate([
        { plaka: "34 ABC", yakit_litresi: 30, birim_fiyat: 40, cari_id: "C1" },
    ]);
    const trips = [
        { plaka: "34ABC", musteri_adi: "HAYAT KİMYA", toplam_km: 100, sefer_no: "S1" },
        { plaka: "34ABC", musteri_adi: "DİĞER", toplam_km: 100, sefer_no: "S2" },
    ];
    const summary = calculateHayatKimyaFuelSummary(trips, fuel, new Map());
    assert.equal(summary[0].tahmini_tuketim, 73);
    assert.equal(summary[0].fark_litre, 43);
    assert.equal(summary[0].duzeltme_maliyeti, 1720);
    assert.equal(summary[0].durum, "PRİM");
    assert.deepEqual(distributeHayatKimyaSettlement(trips, summary).map((row) => row.sefer_hakedisi_tl), [860, 860]);
    assert.deepEqual(summarizeHayatKimyaSettlement(summary), {
        km: 200, tahmini: 73, gercek: 30, fark: 43, tl: 1720,
    });
});

test("yakıt cari bilgisi yoksa araç fiyat kaydındaki cariyi kullanır ve cezayı korur", () => {
    const fuel = aggregateHayatKimyaFuelByPlate([
        { plaka: "06XYZ", yakit_litresi: 50, iskontosuz_birim_fiyat: 45 },
    ]);
    const pricing = indexHayatKimyaVehiclePricing([
        { plaka: "06 XYZ", cari_id: "C2", cari_adi: "Taşıyıcı" },
    ]);
    const summary = calculateHayatKimyaFuelSummary([
        { plaka: "06XYZ", musteri_adi: "ODAK TEDARİK", toplam_km: 100 },
    ], fuel, pricing);
    assert.equal(summary[0].fark_litre, -14);
    assert.equal(summary[0].duzeltme_maliyeti, -630);
    assert.equal(summary[0].durum, "CEZA");
    assert.equal(summary[0].cari_id, "C2");
});
