import test from "node:test";
import assert from "node:assert/strict";
import { createRouteDetails, prepareActiveTrips } from "../src/domain/activeTrips.js";

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

test("yeni izinli proje/çalışma tipi adlarını aktif sefere dahil eder", () => {
    const allowed = [
        "DENTAŞ ESKİŞEHİR KİRALIK",
        "ES GLOBAL FİLO",
        "GOLD HARVEST KİRALIK",
        "MODERN AMBALAJ FİLO",
        "  es   global   filo  ",
    ];

    const result = prepareActiveTrips(
        allowed.map((name, index) => ({
            sefer_no: `SFR-NEW-${index + 1}`,
            vehicle_working_type_name: name,
        })),
        { completed: new Set(), passive: new Set() }
    );

    assert.deepEqual(
        result.map((row) => row.sefer_no),
        ["SFR-NEW-1", "SFR-NEW-2", "SFR-NEW-3", "SFR-NEW-4", "SFR-NEW-5"]
    );
});
