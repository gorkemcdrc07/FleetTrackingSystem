import test from "node:test";
import assert from "node:assert/strict";
import {
    attachReportSource,
    normalizeRouteDetails,
} from "../src/domain/reportTrips.js";

test("rota detaylarını dizi veya JSON metninden güvenle normalize eder", () => {
    const details = [{ tip: "yukleme" }];

    assert.equal(normalizeRouteDetails(details), details);
    assert.deepEqual(normalizeRouteDetails(JSON.stringify(details)), details);
    assert.deepEqual(normalizeRouteDetails("geçersiz-json"), []);
    assert.deepEqual(normalizeRouteDetails({ tip: "teslim" }), []);
    assert.deepEqual(normalizeRouteDetails(null), []);
});

test("rapor satırına güvenilir kaynak bilgisini ekler", () => {
    const source = { table: "aktif_seferler", label: "Aktif Sefer" };
    const rows = attachReportSource([{ id: 42, kaynak_tablo: "yanlış" }], source);

    assert.deepEqual(rows, [{
        id: 42,
        kaynak_tablo: "aktif_seferler",
        kaynak_tablo_label: "Aktif Sefer",
    }]);
});
