import test from "node:test";
import assert from "node:assert/strict";

import { mapTMSRows } from "../src/services/tmsIntegrationService.js";

test("TMS satırlarını yalnızca SFR seferlerine dönüştürür", () => {
    const rows = mapTMSRows([
        {
            TMSDespatchId: 42,
            DocumentNo: " sfr-100 ",
            PlateNumber: "34 ABC 123",
            TMSOrders: [{ ProjectName: "Proje A" }],
        },
        { DocumentNo: "ABC-200" },
    ]);

    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, 42);
    assert.equal(rows[0].sefer_no, "SFR-100");
    assert.equal(rows[0].plaka, "34 ABC 123");
    assert.equal(rows[0].proje_adi, "Proje A");
});

test("TMS dönüştürücü dizi olmayan cevapları güvenle boş kabul eder", () => {
    assert.deepEqual(mapTMSRows(null), []);
});
