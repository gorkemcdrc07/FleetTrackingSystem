import test from "node:test";
import assert from "node:assert/strict";
import { buildEtaReferenceLookup } from "../src/domain/etaReference.js";

test("ETA referans sorgusunu kırpılmış çıkış ve varış önekleriyle oluşturur", () => {
    assert.deepEqual(buildEtaReferenceLookup("  Gebze ", " İstanbul "), {
        originPattern: "Gebze%",
        destinationPattern: "İstanbul%",
    });
});

test("eksik çıkış veya varış için ETA sorgusu oluşturmaz", () => {
    assert.equal(buildEtaReferenceLookup("", "İstanbul"), null);
    assert.equal(buildEtaReferenceLookup("Gebze", null), null);
});
