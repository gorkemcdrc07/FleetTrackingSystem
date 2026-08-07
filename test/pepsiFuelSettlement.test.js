import test from "node:test";
import assert from "node:assert/strict";
import {
    aggregatePepsiFuelByPlate,
    calculatePepsiFuelSummary,
    distributePepsiSettlement,
    summarizePepsiSettlement,
} from "../src/domain/pepsiFuelSettlement.js";

test("Pepsi yakıt hakedişini ve sefer dağıtımını hesaplar", () => {
    const fuel = aggregatePepsiFuelByPlate([
        { plaka: "34 ABC", yakit_litresi: 30, birim_fiyat: 40, iskontosuz_birim_fiyat: 50, cari_id: "C1" },
    ]);
    const trips = [
        { plaka: "34ABC", musteri_adi: "PEPSI", toplam_km: 100, sefer_no: "S1" },
        { plaka: "34ABC", musteri_adi: "DİĞER", toplam_km: 100, sefer_no: "S2" },
    ];
    const summary = calculatePepsiFuelSummary(trips, fuel);
    assert.equal(summary[0].toplam_tuketim, 75);
    assert.equal(summary[0].litre_farki, 45);
    assert.equal(summary[0].duzeltme_maliyeti, 1800);
    assert.equal(summary[0].durum, "HAKEDİŞ");
    assert.deepEqual(distributePepsiSettlement(trips, summary).map((row) => row.sefer_hakedisi_tl), [900, 900]);
    assert.deepEqual(summarizePepsiSettlement(summary), {
        plaka: 1, km: 200, litre: 45, tutar: 1800, tahmini: 75, gercek: 30,
    });
});

test("fazla gerçek yakıtı iskontosuz fiyatla ceza olarak hesaplar", () => {
    const fuel = aggregatePepsiFuelByPlate([
        { plaka: "06XYZ", yakit_litresi: 50, birim_fiyat: 40, iskontosuz_birim_fiyat: 45 },
    ]);
    const summary = calculatePepsiFuelSummary([
        { plaka: "06XYZ", musteri_adi: "PEPSI", toplam_km: 100 },
    ], fuel);
    assert.equal(summary[0].litre_farki, -12);
    assert.equal(summary[0].duzeltme_maliyeti, -540);
    assert.equal(summary[0].durum, "CEZA");
});
