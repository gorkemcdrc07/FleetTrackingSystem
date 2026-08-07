import { supabase } from "../supabaseClient";

const VEHICLE_PRICING_TABLE = "arac_fiyat_yonetimi";

export async function listVehiclePricing() {
    const { data, error } = await supabase.from(VEHICLE_PRICING_TABLE)
        .select("*").order("plaka", { ascending: true });
    if (error) throw error;
    return data || [];
}

export async function insertVehiclePricingBatch(payload) {
    const { error } = await supabase.from(VEHICLE_PRICING_TABLE).insert(payload);
    if (error) throw error;
}

export async function updateVehiclePricingBatch(records) {
    let count = 0;
    for (const record of records) {
        if (!record.payload.plaka && !record.id) continue;
        let query = supabase.from(VEHICLE_PRICING_TABLE).update(record.payload);
        query = record.id ? query.eq("id", record.id) : query.eq("plaka", record.payload.plaka);
        const { error } = await query;
        if (error) throw error;
        count += 1;
    }
    return count;
}

export async function updateVehiclePricingDays(records) {
    let count = 0;
    for (const record of records) {
        if (!record.plaka || record.calismaGunu === null) continue;
        const { error } = await supabase.from(VEHICLE_PRICING_TABLE)
            .update({ calisma_gunu: record.calismaGunu, updated_at: new Date().toISOString() })
            .eq("plaka", record.plaka);
        if (error) throw error;
        count += 1;
    }
    return count;
}

export async function saveVehiclePricing({ id, payload }) {
    const query = id !== undefined && id !== null
        ? supabase.from(VEHICLE_PRICING_TABLE).update(payload).eq("id", id)
        : supabase.from(VEHICLE_PRICING_TABLE).insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
}

export async function setVehiclePricingPassive(id, pasif) {
    const { data, error } = await supabase.from(VEHICLE_PRICING_TABLE)
        .update({ pasif, updated_at: new Date().toISOString() })
        .eq("id", id).select().single();
    if (error) throw error;
    return data;
}
