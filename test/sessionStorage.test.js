import test from "node:test";
import assert from "node:assert/strict";
import {
    clearSession,
    getCurrentUser,
    getRememberedUsername,
    isAuthenticated,
    saveSession,
} from "../src/services/sessionStorage.js";

function memoryStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: (key) => values.delete(key),
    };
}

test("oturumu tek servisten kaydeder, okur ve güvenli şekilde temizler", () => {
    const storage = memoryStorage();
    const user = { id: 7, kullanici: "demo" };
    saveSession({ username: "demo", user, remember: true }, storage);
    assert.deepEqual(getCurrentUser(storage), user);
    assert.equal(getRememberedUsername(storage), "demo");
    assert.equal(isAuthenticated(storage), true);
    clearSession(storage);
    assert.equal(getCurrentUser(storage), null);
    assert.equal(isAuthenticated(storage), false);
    assert.equal(getRememberedUsername(storage), "demo");
});

test("eski oturum anahtarlarını geriye uyumlu okur", () => {
    const storage = memoryStorage({ aktifKullanici: JSON.stringify({ id: 9 }) });
    assert.deepEqual(getCurrentUser(storage), { id: 9 });
});
