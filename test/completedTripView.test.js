import test from "node:test";
import assert from "node:assert/strict";

import {
    getActualEtaDays,
    getCompletedTripSortValue,
    matchesCompletedTripColumn,
    matchesCompletedTripSearch,
    parseDayValue,
    splitTripValues,
} from "../src/domain/completedTripView.js";

test("tamamlanan sefer çoklu değerlerini ve yerel gün değerini normalize eder", () => {
    assert.deepEqual(splitTripValues("İstanbul; ; Ankara"), ["İstanbul", "Ankara"]);
    assert.equal(parseDayValue("2,50 Gün"), 2.5);
});

test("tamamlanan sefer ETA süresini ilk yükleme ve son teslimden hesaplar", () => {
    const result = getActualEtaDays({
        rota_detaylari: [
            { tip: "yukleme", cikis: "2026-08-01T08:00:00.000Z" },
            { tip: "teslim", varis: "2026-08-02T20:00:00.000Z" },
        ],
    });
    assert.equal(result, 1.5);
});

test("tamamlanan sefer filtreleme, arama ve sıralama kurallarını korur", () => {
    const row = { plaka: "34 İST 123", teslim_ili: "Ankara; İzmir", eta_gecikme: true };
    assert.equal(matchesCompletedTripSearch(row, "ist"), true);
    assert.equal(matchesCompletedTripColumn(row, { key: "teslim_ili", type: "last" }, "izmir"), true);
    assert.equal(getCompletedTripSortValue(row, { key: "eta_durum" }), 1);
});
