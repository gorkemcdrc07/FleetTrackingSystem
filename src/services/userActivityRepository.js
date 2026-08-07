import { supabase } from "../supabaseClient";

const USER_ACTIVITY_TABLE = "kullanici_islem_loglari";

export async function listUserActivityLogs({ since, limit = 1000 }) {
    const { data, error } = await supabase
        .from(USER_ACTIVITY_TABLE)
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}
