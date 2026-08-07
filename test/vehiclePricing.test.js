import test from "node:test";
import assert from "node:assert/strict";
import {
    buildVehiclePricingPayload,
    filterVehiclePricing,
    parsePricingNumber,
    upsertVehiclePricingRow,
} from "../src/domain/vehiclePricing.js";

test("yerel fiyat değerlerini ve plakayı normalize eder", () => {
    assert.equal(parsePricingNumber("125.000,50 ₺"), 125000.5);
    const payload = buildVehiclePricingPayload({ plaka: "34 abc 123", aylik_kira: "10.000", pasif: "evet" }, { fromExcel: true });
    assert.equal(payload.plaka, "34ABC123");
    assert.equal(payload.aylik_kira, 10000);
    assert.equal(payload.pasif, true);
});

test("fiyat kayıtlarını arar ve kimliğe göre sıralı günceller", () => {
    const rows = [{ id: 1, plaka: "35ZZZ", cari_adi: "A" }];
    assert.equal(filterVehiclePricing(rows, "35 zzz").length, 0);
    assert.equal(filterVehiclePricing(rows, "35zzz").length, 1);
    assert.deepEqual(upsertVehiclePricingRow(rows, { id: 2, plaka: "06AAA" }), [
        { id: 2, plaka: "06AAA" },
        { id: 1, plaka: "35ZZZ", cari_adi: "A" },
    ]);
});
