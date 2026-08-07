import test from "node:test";
import assert from "node:assert/strict";
import {
    mapSettlementRow,
    normalizeSettlementPlate,
    parseSettlementClipboardRows,
    parseSettlementNumber,
    pickSettlementValue,
} from "../src/domain/settlementParsing.js";

test("mutabakat kolonlarını, plakayı ve yerel sayıları normalize eder", () => {
    const row = mapSettlementRow({ "Yakıt Litresi": "1.250,50", "Cari Adı": "Örnek" });
    assert.equal(pickSettlementValue(row, ["yakit_litresi"]), "1.250,50");
    assert.equal(parseSettlementNumber("1.250,50 ₺"), 1250.5);
    assert.equal(normalizeSettlementPlate("34 abc 123"), "34ABC123");
});

test("sekme veya noktalı virgülle yapıştırılan tabloyu satırlara ayırır", () => {
    assert.deepEqual(parseSettlementClipboardRows("plaka\tlitre\n34ABC\t10"), [
        { plaka: "34ABC", litre: "10" },
    ]);
    assert.deepEqual(parseSettlementClipboardRows("plaka;km\n06XYZ;250"), [
        { plaka: "06XYZ", km: "250" },
    ]);
});
