import test from "node:test";
import assert from "node:assert/strict";
import { buildInactiveTripPatch, getActiveTripMatch } from "../src/domain/activeTripMutations.js";

test("aktif sefer güncellemesinde id alanına, yoksa normalize sefer numarasına öncelik verir", () => {
    assert.deepEqual(getActiveTripMatch({ id: 42, sefer_no: "S-1" }), { field: "id", value: 42 });
    assert.deepEqual(getActiveTripMatch({ sefer_no: "  S-2  " }), { field: "sefer_no", value: "S-2" });
    assert.throws(() => getActiveTripMatch({}), /geçerli bir kimlik/);
});

test("pasife alma kaydı sabit neden ve ISO tarih üretir", () => {
    assert.deepEqual(buildInactiveTripPatch(new Date("2026-08-07T10:00:00.000Z")), {
        pasif: true,
        pasif_tarihi: "2026-08-07T10:00:00.000Z",
        pasif_nedeni: "Kullanıcı tarafından silindi",
    });
});
