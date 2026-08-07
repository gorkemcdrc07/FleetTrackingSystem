import { supabase } from "../supabaseClient";
import { findAuthProfileByUserId, findUserByUsername } from "./userRepository";
import { AUTH_MODES, authenticateWithStrategy, getAuthMode as resolveAuthMode } from "../domain/authStrategy";

export { AUTH_MODES };

export function getAuthMode(environment = import.meta.env) {
    return resolveAuthMode(environment);
}

export async function authenticateLogin(
    { identity, password },
    {
        mode = getAuthMode(),
        findLegacyUser = findUserByUsername,
        findAuthProfile = findAuthProfileByUserId,
        signInWithPassword = (credentials) => supabase.auth.signInWithPassword(credentials),
    } = {}
) {
    return authenticateWithStrategy({ identity, password }, {
        mode, findLegacyUser, findAuthProfile, signInWithPassword,
    });
}

export async function getSupabaseAuthSession() {
    if (getAuthMode() !== AUTH_MODES.SUPABASE) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data?.session || null;
}

export async function signOutAuth() {
    if (getAuthMode() !== AUTH_MODES.SUPABASE) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}
