import { supabase } from "../supabaseClient";
import { buildUserLookupAttempts } from "../domain/userSession";

const USERS_TABLE = "kullanicilar";
const PUBLIC_USER_FIELDS = "id, kullanici, ad, rol, yetki, aktif";
const LOGIN_USER_FIELDS = "id, kullanici, sifre, ad, rol, yetki, aktif";

export async function listUsers() {
    const { data, error } = await supabase
        .from(USERS_TABLE)
        .select(PUBLIC_USER_FIELDS)
        .order("ad", { ascending: true });
    if (error) throw error;
    return data || [];
}

export async function findUserByUsername(username) {
    const { data, error } = await supabase
        .from(USERS_TABLE)
        .select(LOGIN_USER_FIELDS)
        .eq("kullanici", username)
        .maybeSingle();
    if (error) throw error;
    return data || null;
}

export async function updateUserPermissions(userId, permissions) {
    if (userId === undefined || userId === null) {
        throw new Error("Yetkileri güncellenecek kullanıcı kimliği bulunamadı.");
    }
    const { data, error } = await supabase
        .from(USERS_TABLE)
        .update({ yetki: permissions, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select(PUBLIC_USER_FIELDS)
        .single();
    if (error) throw error;
    return data;
}

export async function findUserWithPreferences(user, preferenceColumn) {
    for (const attempt of buildUserLookupAttempts(user)) {
        const { data, error } = await supabase
            .from(USERS_TABLE)
            .select(`id, ${preferenceColumn}`)
            .eq(attempt.field, attempt.value)
            .maybeSingle();
        if (!error && data) return { row: data, match: attempt };
    }
    return null;
}

export async function updateUserPreferences(match, preferenceColumn, preferences) {
    if (!match?.field || match.value === undefined || match.value === null) {
        throw new Error("Tercihleri güncellenecek kullanıcı eşleşmesi bulunamadı.");
    }
    const { error } = await supabase
        .from(USERS_TABLE)
        .update({ [preferenceColumn]: preferences })
        .eq(match.field, match.value);
    if (error) throw error;
}
