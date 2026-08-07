import { supabase } from "../supabaseClient";

const HANDLING_FEES_TABLE = "hamaliye_kayitlari";

export async function listHandlingFees() {
    const { data, error } = await supabase
        .from(HANDLING_FEES_TABLE)
        .select("*")
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function saveHandlingFee({ id, payload }) {
    const query = id !== undefined && id !== null
        ? supabase.from(HANDLING_FEES_TABLE).update(payload).eq("id", id)
        : supabase.from(HANDLING_FEES_TABLE).insert([payload]);
    const { error } = await query;
    if (error) throw error;
}

export async function deleteHandlingFee(id) {
    if (id === undefined || id === null) {
        throw new Error("Silinecek hamaliye kaydı için geçerli bir kimlik bulunamadı.");
    }

    const { error } = await supabase
        .from(HANDLING_FEES_TABLE)
        .delete()
        .eq("id", id);

    if (error) throw error;
}
