function isValidUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function getUsername(user) {
    return user?.kullanici || user?.email || user?.mail || user?.eposta || user?.kullanici_adi || user?.ad || null;
}

export function buildAuditLogPayload(event = {}, user = null, userAgent = null) {
    const username = getUsername(user);
    return {
        kullanici_id: isValidUuid(user?.id) ? user.id : null,
        kullanici: username,
        kullanici_ad: user?.ad || username,
        rol: user?.rol || null,
        islem_tipi: event.islem_tipi || "BILINMEYEN_ISLEM",
        islem_aciklama: event.islem_aciklama || null,
        tablo_adi: event.tablo_adi || null,
        kayit_id: isValidUuid(event.kayit_id) ? event.kayit_id : null,
        sefer_no: event.sefer_no || null,
        plaka: event.plaka || null,
        eski_deger: event.eski_deger || null,
        yeni_deger: event.yeni_deger || null,
        detay: event.detay || null,
        ip_adresi: null,
        user_agent: userAgent || null,
    };
}
