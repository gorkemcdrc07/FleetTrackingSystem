import test from "node:test";
import assert from "node:assert/strict";
import { AUTH_MODES, authenticateWithStrategy, getAuthMode, resolveAuthEmail } from "../src/domain/authStrategy.js";

test("auth modu varsayılan olarak legacy kalır", () => {
    assert.equal(getAuthMode({}), AUTH_MODES.LEGACY);
    assert.equal(getAuthMode({ VITE_AUTH_MODE: "supabase" }), AUTH_MODES.SUPABASE);
});

test("legacy mod mevcut kullanıcı adı ve şifre doğrulamasını korur", async () => {
    const result = await authenticateWithStrategy(
        { identity: "gorkem", password: "secret" },
        { mode: AUTH_MODES.LEGACY, findLegacyUser: async () => ({ aktif: true, sifre: "secret" }) }
    );
    assert.equal(result.validation.valid, true);
});

test("Supabase Auth önce giriş yapar, sonra oturum sahibinin profilini okur", async () => {
    let credentials;
    const result = await authenticateWithStrategy(
        { identity: "GORKEM@example.com", password: "secret" },
        {
            mode: AUTH_MODES.SUPABASE,
            findAuthProfile: async (userId) => ({ id: userId, aktif: true }),
            signInWithPassword: async (input) => {
                credentials = input;
                return { data: { user: { id: "user-1" }, session: { access_token: "token" } }, error: null };
            },
        }
    );
    assert.deepEqual(credentials, { email: "gorkem@example.com", password: "secret" });
    assert.equal(result.profile.id, "user-1");
    assert.equal(result.validation.valid, true);
});

test("Supabase Auth modunda kullanıcı adı yerine e-posta ister", () => {
    assert.throws(() => resolveAuthEmail("gorkem"), /e-posta adresinizle/);
});
