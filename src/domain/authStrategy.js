import { validateLoginUser } from "./userSession.js";

export const AUTH_MODES = Object.freeze({ LEGACY: "legacy", SUPABASE: "supabase" });

export function getAuthMode(environment = {}) {
    return String(environment?.VITE_AUTH_MODE || AUTH_MODES.LEGACY).toLowerCase() === AUTH_MODES.SUPABASE
        ? AUTH_MODES.SUPABASE : AUTH_MODES.LEGACY;
}

export function resolveAuthEmail(identity) {
    const email = String(identity || "").trim().toLowerCase();
    if (!email.includes("@")) throw new Error("Supabase Auth modunda e-posta adresinizle giriş yapın.");
    return email;
}

export async function authenticateWithStrategy(
    { identity, password }, { mode, findLegacyUser, findAuthProfile, signInWithPassword }
) {
    if (mode !== AUTH_MODES.SUPABASE) {
        const profile = await findLegacyUser(identity);
        return { profile, validation: validateLoginUser(profile, password), authSession: null };
    }

    const { data, error } = await signInWithPassword({ email: resolveAuthEmail(identity), password });
    if (error || !data?.session) {
        return { profile: null, validation: { valid: false, reason: "invalid_password" }, authSession: null };
    }

    const authUserId = data.user?.id || data.session?.user?.id;
    const profile = await findAuthProfile(authUserId);
    if (!profile) return { profile: null, validation: { valid: false, reason: "not_found" }, authSession: data.session };
    if (profile.aktif === false) return { profile, validation: { valid: false, reason: "inactive" }, authSession: data.session };
    return { profile, validation: { valid: true, reason: null }, authSession: data.session };
}
