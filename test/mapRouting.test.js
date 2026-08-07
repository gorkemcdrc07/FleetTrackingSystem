import test from "node:test";
import assert from "node:assert/strict";
import { buildAddressCandidates, normalizeDrivingRoute } from "../src/domain/mapRouting.js";
import { geocodeFirstAddress } from "../src/services/mapRoutingService.js";

test("rota noktası için ayrıntıdan şehre doğru adres adayları üretir", () => {
    assert.deepEqual(buildAddressCandidates({ nokta: "Depo", ilce: "Gebze", il: "Kocaeli" }), [
        "Depo, Gebze, Kocaeli, Türkiye", "Gebze, Kocaeli, Türkiye", "Kocaeli, Türkiye",
    ]);
});

test("ilk adres bulunamazsa sonraki adayı dener", async () => {
    let calls = 0;
    const fetchImpl = async () => ({ ok: true, json: async () => (++calls === 1 ? [] : [{ lat: "40.7", lon: "29.4" }]) });
    assert.deepEqual(await geocodeFirstAddress(["bilinmeyen", "Gebze"], { fetchImpl, delayMs: 0 }), { lat: 40.7, lng: 29.4 });
    assert.equal(calls, 2);
});

test("OSRM rota cevabını ekran modeline dönüştürür", () => {
    const result = normalizeDrivingRoute({ routes: [{
        distance: 12500, duration: 1800,
        geometry: { coordinates: [[29, 40], [30, 41]] },
        legs: [{ distance: 12500, duration: 1800 }],
    }] });
    assert.equal(result.distanceKm, 12.5);
    assert.equal(result.durationMin, 30);
    assert.deepEqual(result.geometry[0], [40, 29]);
});
