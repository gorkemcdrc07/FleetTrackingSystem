import { supabase } from "../supabaseClient";
import { normalizeTripNumber, tripNumberSet, uniqueTripsByNumber } from "../domain/tripIdentity";

const PAGE_SIZE = 1000;

async function listTripNumbers(table, configure = (query) => query) {
    const rows = [];

    for (let from = 0; ; from += PAGE_SIZE) {
        const query = configure(
            supabase.from(table).select("sefer_no").order("sefer_no", { ascending: true })
        ).range(from, from + PAGE_SIZE - 1);
        const { data, error } = await query;

        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < PAGE_SIZE) break;
    }

    return rows;
}

export async function listActiveTrips({ startDate, endDate }) {
    const { data, error } = await supabase.from("aktif_seferler").select("*")
        .eq("pasif", false).gte("sefer_tarihi", startDate).lte("sefer_tarihi", endDate)
        .order("sefer_tarihi", { ascending: false });
    if (error) throw error;
    return uniqueTripsByNumber(data);
}

export async function getExcludedTripNumbers() {
    const [completedRows, passiveRows] = await Promise.all([
        listTripNumbers("tamamlanan_seferler"),
        listTripNumbers("aktif_seferler", (query) => query.eq("pasif", true)),
    ]);
    return { completed: tripNumberSet(completedRows), passive: tripNumberSet(passiveRows) };
}

export async function saveActiveTrips(rows) {
    const normalizedRows = uniqueTripsByNumber(rows);
    if (!normalizedRows.length) return;
    const { error } = await supabase.rpc("sync_active_trips", { p_rows: normalizedRows });
    if (error) throw error;
}

export async function moveTripToCompleted(payload) {
    const normalizedPayload = { ...payload, sefer_no: normalizeTripNumber(payload?.sefer_no) };
    if (!normalizedPayload.sefer_no) throw new Error("Sefer numarası olmadan sefer tamamlanamaz.");
    const { error } = await supabase.rpc("complete_trip", { p_payload: normalizedPayload });
    if (error) throw error;
}
