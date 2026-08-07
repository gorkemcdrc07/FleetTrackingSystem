import test from "node:test";
import assert from "node:assert/strict";
import {
    filterActivityLogs,
    getActivityUser,
    groupActivityByType,
    groupActivityByUser,
    summarizeActivityLogs,
} from "../src/domain/userActivity.js";

const logs = [
    { kullanici: "Ayşe", islem_tipi: "SEFER_DETAY_GUNCELLEME", created_at: "2026-08-07T10:00:00Z" },
    { kullanici_ad: "Ayşe", islem_tipi: "ARAC_EKLEME", created_at: "2026-08-07T11:00:00Z" },
    { kullanici: "Mehmet", islem_tipi: "ETA_ACMA", created_at: "2026-08-07T09:00:00Z" },
];

test("kullanıcı adı alanlarını tek kimliğe dönüştürür ve filtreler", () => {
    assert.equal(getActivityUser(logs[1]), "Ayşe");
    assert.equal(filterActivityLogs(logs, { user: "Ayşe" }).length, 2);
    assert.equal(filterActivityLogs(logs, { type: "ETA_ACMA" }).length, 1);
});

test("KPI özetlerini ve dağılımlarını tutarlı hesaplar", () => {
    assert.deepEqual(summarizeActivityLogs(logs), {
        total: 3,
        uniqueUsers: 2,
        routeUpdates: 1,
        vehicleOps: 1,
    });
    assert.deepEqual(groupActivityByType(logs)[0], {
        type: "SEFER_DETAY_GUNCELLEME",
        count: 1,
    });

    const ayse = groupActivityByUser(logs)[0];
    assert.equal(ayse.kullanici, "Ayşe");
    assert.equal(ayse.toplam, 2);
    assert.equal(ayse.sefer, 1);
    assert.equal(ayse.arac, 1);
    assert.equal(ayse.sonIslem, "2026-08-07T11:00:00Z");
});
