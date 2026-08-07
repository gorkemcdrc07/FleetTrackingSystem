import { supabase } from "../supabaseClient";
import { getCompletedTripIdentity } from "../domain/completedTrips";

const COMPLETED_TRIPS_TABLE = "tamamlanan_seferler";
const ETA_REFERENCES_TABLE = "eta_referanslari";

export async function listCompletedTrips() {
    const { data, error } = await supabase
        .from(COMPLETED_TRIPS_TABLE)
        .select("*")
        .order("sefer_tarihi", { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function findEtaReferenceDays({ origin, destination }) {
    if (!origin || !destination) return null;

    const { data, error } = await supabase
        .from(ETA_REFERENCES_TABLE)
        .select("gün")
        .ilike("cikis", `${origin}%`)
        .ilike("varis", `${destination}%`)
        .maybeSingle();

    if (error) throw error;
    return data?.["gün"] ?? null;
}

export async function updateCompletedTrip(row, changes) {
    const identity = getCompletedTripIdentity(row);
    const { data, error } = await supabase
        .from(COMPLETED_TRIPS_TABLE)
        .update(changes)
        .eq(identity.key, identity.value)
        .select()
        .maybeSingle();

    if (error) throw error;
    return data || changes;
}
