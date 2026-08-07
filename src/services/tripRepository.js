import { supabase } from "../supabaseClient";
import { normalizeTripNumber, tripNumberSet, uniqueTripsByNumber } from "../domain/tripIdentity";

export async function listActiveTrips({ startDate, endDate }) {
    const { data, error } = await supabase.from("aktif_seferler").select("*")
        .eq("pasif", false).gte("sefer_tarihi", startDate).lte("sefer_tarihi", endDate)
        .order("sefer_tarihi", { ascending: false });
    if (error) throw error;
    return uniqueTripsByNumber(data);
}

export async function getExcludedTripNumbers() {
    const [completedResult, passiveResult] = await Promise.all([
        supabase.from("tamamlanan_seferler").select("sefer_no"),
        supabase.from("aktif_seferler").select("sefer_no").eq("pasif", true),
    ]);
    if (completedResult.error) throw completedResult.error;
    if (passiveResult.error) throw passiveResult.error;
    return { completed: tripNumberSet(completedResult.data), passive: tripNumberSet(passiveResult.data) };
}

export async function saveActiveTrips(rows) {
    const normalizedRows = uniqueTripsByNumber(rows);
    if (!normalizedRows.length) return;
    const { error } = await supabase.from("aktif_seferler").upsert(normalizedRows, {
        onConflict: "sefer_no", ignoreDuplicates: true,
    });
    if (error) throw error;
}

export async function moveTripToCompleted(payload) {
    const normalizedPayload = { ...payload, sefer_no: normalizeTripNumber(payload?.sefer_no) };
    if (!normalizedPayload.sefer_no) throw new Error("Sefer numarası olmadan sefer tamamlanamaz.");
    const { error: upsertError } = await supabase.from("tamamlanan_seferler")
        .upsert(normalizedPayload, { onConflict: "sefer_no" });
    if (upsertError) throw upsertError;
    // Migration trigger'ı bunu atomik yapar; bu çağrı eski DB şemasıyla uyumluluk içindir.
    const { error: deleteError } = await supabase.from("aktif_seferler").delete()
        .eq("sefer_no", normalizedPayload.sefer_no);
    if (deleteError) throw deleteError;
}
