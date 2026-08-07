import assert from "node:assert/strict";
import test from "node:test";

import {
    readStorageArray,
    readStorageJson,
    readStorageText,
    removeStorageItem,
    writeStorageJson,
    writeStorageText,
} from "../src/services/browserStorage.js";

function memoryStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        getItem: (key) => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => values.set(key, value),
        removeItem: (key) => values.delete(key),
    };
}

test("browser storage JSON verisini güvenli biçimde okur ve yazar", () => {
    const storage = memoryStorage();
    assert.equal(writeStorageJson("settings", { enabled: true }, storage), true);
    assert.deepEqual(readStorageJson("settings", {}, storage), { enabled: true });
});

test("bozuk veya beklenmeyen depolama verisinde güvenli varsayılan döner", () => {
    const storage = memoryStorage({ broken: "{", object: "{}" });
    assert.deepEqual(readStorageJson("broken", { safe: true }, storage), { safe: true });
    assert.deepEqual(readStorageArray("object", storage), []);
});

test("metin değerlerini okuyup tüketilen geçici değerleri kaldırır", () => {
    const storage = memoryStorage();
    assert.equal(writeStorageText("plate", "34 ABC 123", storage), true);
    assert.equal(readStorageText("plate", "", storage), "34 ABC 123");
    assert.equal(removeStorageItem("plate", storage), true);
    assert.equal(readStorageText("plate", "missing", storage), "missing");
});
