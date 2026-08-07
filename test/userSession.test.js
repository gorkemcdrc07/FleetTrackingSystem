import test from "node:test";
import assert from "node:assert/strict";
import { buildUserLookupAttempts, createSessionUser, validateLoginUser } from "../src/domain/userSession.js";

test("giriş doğrulaması eksik, pasif ve hatalı şifreli kullanıcıları ayırır", () => {
    assert.deepEqual(validateLoginUser(null, "x"), { valid: false, reason: "not_found" });
    assert.deepEqual(validateLoginUser({ aktif: false, sifre: "x" }, "x"), { valid: false, reason: "inactive" });
    assert.deepEqual(validateLoginUser({ aktif: true, sifre: "x" }, "y"), { valid: false, reason: "invalid_password" });
    assert.deepEqual(validateLoginUser({ aktif: true, sifre: "x" }, "x"), { valid: true, reason: null });
});

test("oturum kullanıcısına şifre ve gereksiz veritabanı alanlarını taşımaz", () => {
    assert.deepEqual(createSessionUser({
        id: "1", kullanici: "demo", ad: "Demo", rol: "admin", yetki: null,
        sifre: "secret", aktif: true, updated_at: "today",
    }), { id: "1", kullanici: "demo", ad: "Demo", rol: "admin", yetki: {} });
});

test("kullanıcı tercihi aramasını yeni ve eski kimlik alanlarıyla sıralar", () => {
    assert.deepEqual(buildUserLookupAttempts({ email: "a@b.com", kullanici: "demo" }), [
        { field: "email", value: "a@b.com" },
        { field: "mail", value: "a@b.com" },
        { field: "kullanici", value: "demo" },
    ]);
    assert.deepEqual(buildUserLookupAttempts({ kullanici_adi: "legacy" }), [
        { field: "kullanici", value: "legacy" },
    ]);
    assert.deepEqual(buildUserLookupAttempts(null), []);
});
