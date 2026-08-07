import test from "node:test";
import assert from "node:assert/strict";
import { buildVehicleDocumentPath } from "../src/domain/vehicleDocuments.js";

test("araç evrak yolunu güvenli ve öngörülebilir üretir", () => {
    assert.equal(
        buildVehicleDocumentPath({
            plate: "34 ĞÜ 123",
            type: "Çekici Muayene",
            fileName: "belge.PDF",
            timestamp: 12345,
            id: "doc-1",
        }),
        "34_gu_123/cekici_muayene/12345-doc-1.pdf"
    );
});
