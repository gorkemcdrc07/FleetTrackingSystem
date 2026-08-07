import test from "node:test";
import assert from "node:assert/strict";

import {
    calculateLeaveDaysFromInput,
    countMissingVehicleDocuments,
    getChangedVehicleFields,
    getVehicleDisplayStatus,
    getVehicleDocumentRisk,
    vehicleExitHasWarning,
    vehicleStatusCssKey,
} from "../src/domain/vehicleStatusView.js";

test("araç izin gününü ve izinli görünüm durumunu hesaplar", () => {
    assert.equal(calculateLeaveDaysFromInput("2026-08-01", "2026-08-03"), "3");
    assert.equal(getVehicleDisplayStatus({
        durum: "Müsait",
        izinler: [{ baslangic: "01.08.2026", bitis: "10.08.2026", statu: "Yıllık İzin" }],
    }, new Date("2026-08-07T12:00:00")), "Yıllık İzin");
});

test("araç evrak ve çıkış risklerini korur", () => {
    const row = {
        trafik_sigorta: "01.08.2026",
        evrak_fotograflari: {},
        isten_cikarildi: true,
        iade_gps: false,
        iade_evraklar: true,
    };
    assert.equal(getVehicleDocumentRisk(row, new Date("2026-08-07T12:00:00")), "expired");
    assert.equal(countMissingVehicleDocuments({}), 9);
    assert.equal(vehicleExitHasWarning(row), true);
});

test("araç değişikliklerini ve CSS durum anahtarını güvenle üretir", () => {
    assert.deepEqual(getChangedVehicleFields({ durum: "Müsait" }, { durum: "Seferde" }), [
        { alan: "durum", eski_deger: "Müsait", yeni_deger: "Seferde" },
    ]);
    assert.equal(vehicleStatusCssKey("Yıllık İzin"), "yillik-izin");
});
