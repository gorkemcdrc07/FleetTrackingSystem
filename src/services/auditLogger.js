import { buildAuditLogPayload } from "../domain/auditLog";
import { createAuditLog } from "./auditLogRepository";
import { getCurrentUser } from "./sessionStorage";

export async function logAuditEvent(event) {
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
