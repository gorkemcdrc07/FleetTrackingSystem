import { buildAuditLogPayload } from "../domain/auditLog";
import { createAuditLog } from "../services/auditLogRepository";
import { getCurrentUser } from "../services/sessionStorage";

export async function islemLogla(event) {
    try {
        const payload = buildAuditLogPayload(
            event,
            getCurrentUser(),
            typeof navigator !== "undefined" ? navigator.userAgent : null
        );
        return await createAuditLog(payload);
    } catch (error) {
        console.error("İşlem logu kaydedilemedi:", error);
        return null;
    }
}
