import test from "node:test";
import assert from "node:assert/strict";
import { createRouteDetails, prepareActiveTrips, splitTripValues } from "../src/domain/activeTrips.js";

test("aktif sefer çoklu alanlarını güvenle parçalara ayırır", () => {
    assert.deepEqual(splitTripValues(" Depo ; ; Mağaza "), ["Depo", "Mağaza"]);
    assert.deepEqual(splitTripValues(null), []);
});

test("rota detaylarında yinelenen yükleme noktalarını kaldırır", () => {
    const result = createRouteDetails({
        yukleme_noktasi: "Depo; Depo", yukleme_ili: "İstanbul; İstanbul",
        teslim_alan_firma: "Müşteri", teslim_noktasi: "Mağaza", teslim_ili: "Ankara",
    });
    assert.equal(result.length, 2);
    assert.deepEqual(result.map((stop) => stop.tip), ["yukleme", "teslim"]);
});

test("tamamlanan, pasif ve izin verilmeyen seferleri aktif yükten çıkarır", () => {
    const base = { vehicle_working_type_name: "FİLO" };
    const result = prepareActiveTrips([
        { ...base, sefer_no: "SFR-1" },
        { ...base, sefer_no: "SFR-2" },
        { ...base, sefer_no: "SFR-3" },
        { sefer_no: "SFR-4", vehicle_working_type_name: "HARİCİ" },
    ], { completed: new Set(["SFR-2"]), passive: new Set(["SFR-3"]) });
    assert.deepEqual(result.map((row) => row.sefer_no), ["SFR-1"]);
});
