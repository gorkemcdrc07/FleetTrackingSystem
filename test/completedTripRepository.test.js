import test from "node:test";
import assert from "node:assert/strict";
import { getCompletedTripIdentity } from "../src/domain/completedTrips.js";

test("tamamlanan sefer kimliğinde id alanına öncelik verir", () => {
    assert.deepEqual(
        getCompletedTripIdentity({ id: 42, sefer_no: "SFR-1" }),
        { key: "id", value: 42 }
    );
});

test("id yoksa sefer numarasını kimlik olarak kullanır", () => {
    assert.deepEqual(
        getCompletedTripIdentity({ sefer_no: "SFR-2" }),
        { key: "sefer_no", value: "SFR-2" }
    );
});

test("kimliksiz kayıtların güncellenmesini engeller", () => {
    assert.throws(() => getCompletedTripIdentity({}), /geçerli bir kimlik/);
});
