import { supabase } from "../supabaseClient";
import { buildVehicleDocumentPath } from "../domain/vehicleDocuments";

const VEHICLE_DOCUMENT_BUCKET = "arac-evraklari";

function createDocumentId() {
    return globalThis.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function uploadVehicleDocument({ plate, type, file }) {
    const id = createDocumentId();
    const path = buildVehicleDocumentPath({
        plate,
        type,
        fileName: file.name,
        timestamp: Date.now(),
        id,
    });

    const { error } = await supabase.storage
        .from(VEHICLE_DOCUMENT_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: true });

    if (error) throw error;

    const { data } = supabase.storage
        .from(VEHICLE_DOCUMENT_BUCKET)
        .getPublicUrl(path);

    if (!data?.publicUrl) {
        throw new Error("Yüklenen evrak için herkese açık URL oluşturulamadı.");
    }

    return {
        id,
        url: data.publicUrl,
        path,
        name: file.name,
        uploaded_at: new Date().toISOString(),
    };
}

export async function removeVehicleDocument(path) {
    if (!path) return;

    const { error } = await supabase.storage
        .from(VEHICLE_DOCUMENT_BUCKET)
        .remove([path]);

    if (error) throw error;
}
