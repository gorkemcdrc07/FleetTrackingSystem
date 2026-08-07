import test from "node:test";
import assert from "node:assert/strict";
import { buildVehiclePayload, upsertVehicleRow } from "../src/domain/vehicles.js";

test("araç kayıt yükünden yalnızca veritabanı alanlarını üretir", () => {
    assert.deepEqual(buildVehiclePayload({
        plaka: "34 ABC 123",
        durum: "",
        evrak_fotograflari: null,
        documentRisk: "soon",
        documentCount: 2,
        missingDocumentCount: 4,
        rawDurum: "Bakımda",
    }), {
        plaka: "34 ABC 123",
        durum: "Müsait",
        evrak_fotograflari: {},
    });
});

test("araç satırını kimliğiyle günceller veya plakaya göre sıralı ekler", () => {
    const rows = [{ id: 1, plaka: "35 ZZZ 35" }];
    assert.deepEqual(upsertVehicleRow(rows, { id: 1, plaka: "06 AAA 06" }), [
        { id: 1, plaka: "06 AAA 06" },
    ]);
    assert.deepEqual(upsertVehicleRow(rows, { id: 2, plaka: "34 ABC 34" }), [
        { id: 2, plaka: "34 ABC 34" },
        { id: 1, plaka: "35 ZZZ 35" },
    ]);
});

test("araç kayıt yükü izin, kesinti ve çıkış alanlarını korur", () => {
    const payload = buildVehiclePayload({
        id: 7,
        izinler: [{ id: "izin-1" }],
        kesintiler: [{ id: "kesinti-1" }],
        isten_cikarildi: true,
        cikartilma_nedeni: "Sözleşme sonu",
        evrak_fotograflari: {},
    });

    assert.deepEqual(payload.izinler, [{ id: "izin-1" }]);
    assert.deepEqual(payload.kesintiler, [{ id: "kesinti-1" }]);
    assert.equal(payload.isten_cikarildi, true);
    assert.equal(payload.cikartilma_nedeni, "Sözleşme sonu");
});
