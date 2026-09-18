import { planTripSync } from "../domain/tripSync";
import { supabase } from "../supabaseClient";
import { normalizeTripNumber, tripNumberSet, uniqueTripsByNumber } from "../domain/tripIdentity";

export async function listActiveTrips({ startDate, endDate }) {
    // Tamamlanmış olup aktif tabloda unutulmuş kayıtları önce temizle.
    // (Trigger/senkron bir sebeple kaçırmışsa burada telafi edilir.)
    try {
        await cleanupCompletedFromActive();
    } catch (cleanupError) {
        console.error("Tamamlanan seferleri aktiften temizleme hatası:", cleanupError);
    }

    const { data, error } = await supabase.from("aktif_seferler").select("*")
        .eq("pasif", false).gte("sefer_tarihi", startDate).lte("sefer_tarihi", endDate)
        .order("sefer_tarihi", { ascending: false }).abortSignal(AbortSignal.timeout(30000));
    if (error) throw error;

    // Ekstra güvenlik: silme herhangi bir sebeple (RLS, yetki vb.) başarısız
    // olsa dahi tamamlanmış seferler ekranda asla görünmesin.
    const { data: completedRows, error: completedError } = await supabase
        .from("tamamlanan_seferler").select("sefer_no").abortSignal(AbortSignal.timeout(30000));
    if (completedError) throw completedError;
    const completedNumbers = tripNumberSet(completedRows);

    return uniqueTripsByNumber(data)
        .filter((row) => !completedNumbers.has(normalizeTripNumber(row.sefer_no)));
}

/**
 * aktif_seferler tablosunda olup aynı zamanda tamamlanan_seferler'de de
 * bulunan (yani aslında tamamlanmış olması gereken) kayıtları bulur ve
 * aktif tablodan siler. Senkronizasyon veya sayfa yüklemesi sırasında
 * çağrılarak "tamamlanan sefer tekrar aktifte görünüyor" sorununu
 * kalıcı olarak düzeltir.
 */
export async function cleanupCompletedFromActive() {
    const { data: activeRows, error: activeError } = await supabase
        .from("aktif_seferler").select("sefer_no").abortSignal(AbortSignal.timeout(30000));
    if (activeError) throw activeError;

    const activeNumbers = Array.from(tripNumberSet(activeRows));
    if (!activeNumbers.length) return [];

    const { data: completedMatches, error: completedError } = await supabase
        .from("tamamlanan_seferler")
        .select("sefer_no")
        .in("sefer_no", activeNumbers).abortSignal(AbortSignal.timeout(30000));
    if (completedError) throw completedError;

    const duplicateNumbers = Array.from(tripNumberSet(completedMatches));
    if (!duplicateNumbers.length) return [];

    const { error: deleteError } = await supabase
        .from("aktif_seferler")
        .delete()
        .in("sefer_no", duplicateNumbers).abortSignal(AbortSignal.timeout(30000));
    if (deleteError) throw deleteError;

    console.warn(
        `Aktif Seferler'de tamamlanmış ${duplicateNumbers.length} kayıt bulunup silindi:`,
        duplicateNumbers
    );

    return duplicateNumbers;
}

export async function getExcludedTripNumbers() {
    const [completedResult, passiveResult] = await Promise.all([
        supabase.from("tamamlanan_seferler").select("sefer_no").abortSignal(AbortSignal.timeout(30000)),
        supabase.from("aktif_seferler").select("sefer_no").eq("pasif", true).abortSignal(AbortSignal.timeout(30000)),
    ]);
    if (completedResult.error) throw completedResult.error;
    if (passiveResult.error) throw passiveResult.error;
    return { completed: tripNumberSet(completedResult.data), passive: tripNumberSet(passiveResult.data) };
}

export async function saveActiveTrips(rows, onProgress) {
    const normalizedRows=uniqueTripsByNumber(rows);
    const stats={newCount:0,updatedCount:0,unchangedCount:0,skippedCount:0};
    if(!normalizedRows.length)return stats;
    const existing=[];
    for(let i=0;i<normalizedRows.length;i+=100){
        const {data,error}=await supabase.from("aktif_seferler").select("*").in("sefer_no",normalizedRows.slice(i,i+100).map(r=>r.sefer_no)).abortSignal(AbortSignal.timeout(30000));
        if(error)throw error;existing.push(...(data||[]));
    }
    const plan=planTripSync(normalizedRows,existing);stats.unchangedCount=plan.unchanged;
    try{
        for(let i=0;i<plan.inserted.length;i+=100){
            const {data,error}=await supabase.from("aktif_seferler").upsert(plan.inserted.slice(i,i+100),{onConflict:"sefer_no",ignoreDuplicates:true}).select("sefer_no").abortSignal(AbortSignal.timeout(45000));
            if(error)throw error;
            stats.newCount+=(data||[]).length;
            stats.skippedCount+=Math.min(100,plan.inserted.length-i)-(data||[]).length;
            onProgress?.({...stats});
        }
        // Keep a bound on request concurrency while reporting confirmed writes only.
        for(let i=0;i<plan.updates.length;i+=4){
            const results=await Promise.all(plan.updates.slice(i,i+4).map(async item=>{
                try{return await supabase.from("aktif_seferler").update(item.patch).eq("sefer_no",item.sefer_no).eq("pasif",false).select("sefer_no").abortSignal(AbortSignal.timeout(30000));}
                catch(error){return {error};}
            }));
            for(const result of results)if(!result.error){stats.updatedCount+=(result.data||[]).length;if(!result.data?.length)stats.skippedCount++;}
            onProgress?.({...stats});
            const failed=results.find(r=>r.error);if(failed)throw failed.error;
        }
    }catch(error){const failure=new Error(error.message||"Seferler kaydedilemedi.");failure.syncStats=stats;throw failure;}
    return stats;
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
