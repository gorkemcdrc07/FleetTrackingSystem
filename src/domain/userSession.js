export function validateLoginUser(user, password) {
    if (!user) return { valid: false, reason: "not_found" };
    if (user.aktif === false) return { valid: false, reason: "inactive" };
    if (user.sifre !== password) return { valid: false, reason: "invalid_password" };
    return { valid: true, reason: null };
}

export function createSessionUser(user) {
    return {
        id: user.id,
        kullanici: user.kullanici,
        ad: user.ad,
        rol: user.rol,
        yetki: user.yetki || {},
    };
}

export function buildUserLookupAttempts(user) {
    if (!user) return [];
    const email = user.email || user.mail || user.eposta;
    const username = user.kullanici || user.kullanici_adi || user.kullaniciAdi || user.username || user.ad;
    return [
        email ? { field: "email", value: email } : null,
        email ? { field: "mail", value: email } : null,
        username ? { field: "kullanici", value: username } : null,
    ].filter(Boolean);
}
