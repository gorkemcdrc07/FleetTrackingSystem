import test from "node:test";
import assert from "node:assert/strict";
import { buildAuditLogPayload } from "../src/domain/auditLog.js";

test("işlem logunu güvenli kullanıcı ve kayıt kimlikleriyle oluşturur", () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";
    const payload = buildAuditLogPayload(
        { islem_tipi: "GUNCELLEME", kayit_id: "gecersiz", sefer_no: "S-1" },
        { id: userId, kullanici: "demo", ad: "Demo User", rol: "admin" },
        "test-agent"
    );
    assert.equal(payload.kullanici_id, userId);
    assert.equal(payload.kayit_id, null);
    assert.equal(payload.kullanici, "demo");
    assert.equal(payload.user_agent, "test-agent");
});

test("eksik işlem tipine güvenli varsayılan değer verir", () => {
    assert.equal(buildAuditLogPayload().islem_tipi, "BILINMEYEN_ISLEM");
});
