import { supabase } from "../supabaseClient";
import { buildEtaReferenceLookup } from "../domain/etaReference";

const ETA_REFERENCES_TABLE = "eta_referanslari";

export async function findEtaReference(origin, destination) {
    const lookup = buildEtaReferenceLookup(origin, destination);
    if (!lookup) return null;
    const { data, error } = await supabase
        .from(ETA_REFERENCES_TABLE)
        .select("*")
        .ilike("cikis", lookup.originPattern)
        .ilike("varis", lookup.destinationPattern)
        .limit(1);
    if (error) throw error;
    return data?.[0] || null;
}
