import { supabase } from "../supabaseClient";

export async function createAuditLog(payload) {
    const { data, error } = await supabase.from("kullanici_islem_loglari").insert(payload).select();
    if (error) throw error;
    return data || [];
}
