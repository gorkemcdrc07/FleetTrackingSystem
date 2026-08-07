import test from "node:test";
import assert from "node:assert/strict";
import { getVehicleIgnition, getVehiclePlate, getVehicleSpeed, normalizeVehiclePlate } from "../src/domain/vehicleTelemetry.js";

test("araç telemetri alanlarını farklı sağlayıcı biçimlerinden okur", () => {
    assert.equal(normalizeVehiclePlate(" 34 abc 123 "), "34ABC123");
    assert.equal(getVehiclePlate({ licensePlate: "34 ABC 123" }), "34 ABC 123");
    assert.equal(getVehiclePlate({ plateNo: "06XYZ06" }), "06XYZ06");
    assert.equal(getVehicleSpeed({ velocity: "42" }), 42);
    assert.equal(getVehicleSpeed({ speed: "geçersiz" }), 0);
    assert.equal(getVehicleIgnition({ contact: 1 }), true);
    assert.equal(getVehicleIgnition({ ignition: false, engine: true }), false);
});
