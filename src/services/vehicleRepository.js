import { supabase } from "../supabaseClient";

const VEHICLES_TABLE = "arac_durumlari";

export async function listVehicles() {
    const { data, error } = await supabase
        .from(VEHICLES_TABLE)
        .select("*")
        .order("plaka", { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function createVehicle(payload) {
    const { data, error } = await supabase
        .from(VEHICLES_TABLE)
        .insert(payload)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateVehicle(id, payload) {
    if (id === undefined || id === null) {
        throw new Error("Güncellenecek araç için geçerli bir kimlik bulunamadı.");
    }

    const { data, error } = await supabase
        .from(VEHICLES_TABLE)
        .update(payload)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
}
