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
