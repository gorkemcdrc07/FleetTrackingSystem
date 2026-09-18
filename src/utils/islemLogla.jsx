import { supabase } from "../supabaseClient";

function safeJsonParse(value) {
    try {
        return value ? JSON.parse(value) : null;
    } catch {
        return null;
    }
}

function getAktifKullanici() {
    return (
        safeJsonParse(localStorage.getItem("fts_user")) ||
        safeJsonParse(localStorage.getItem("kullanici")) ||
        safeJsonParse(localStorage.getItem("aktifKullanici")) ||
        safeJsonParse(localStorage.getItem("user")) ||
        null
    );
}

function isValidUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(value || "")
    );
}

export async function islemLogla({
    islem_tipi,
    islem_aciklama,
    tablo_adi,
    kayit_id,
    sefer_no,
    plaka,
    eski_deger,
    yeni_deger,
    detay,
}) {
    try {
        const aktifKullanici = getAktifKullanici();

        const kullaniciAdi =
            aktifKullanici?.kullanici ||
            aktifKullanici?.email ||
            aktifKullanici?.mail ||
            aktifKullanici?.eposta ||
            aktifKullanici?.kullanici_adi ||
            aktifKullanici?.ad ||
            null;

        const payload = {
            kullanici_id: isValidUuid(aktifKullanici?.id)
                ? aktifKullanici.id
                : null,

            kullanici: kullaniciAdi,
            kullanici_ad: aktifKullanici?.ad || kullaniciAdi,
            rol: aktifKullanici?.rol || null,

            islem_tipi: islem_tipi || "BILINMEYEN_ISLEM",
            islem_aciklama: islem_aciklama || null,

            tablo_adi: tablo_adi || null,
            kayit_id: isValidUuid(kayit_id) ? kayit_id : null,
            sefer_no: sefer_no || null,
            plaka: plaka || null,

            eski_deger: eski_deger || null,
            yeni_deger: yeni_deger || null,
            detay: detay || null,

            ip_adresi: null,
            user_agent:
                typeof navigator !== "undefined"
                    ? navigator.userAgent
                    : null,
        };

        const { data, error } = await supabase
            .from("kullanici_islem_loglari")
            .insert(payload)
            .select();

        console.log("LOG INSERT RESULT:", {
            data,
            error: error ? JSON.stringify(error, null, 2) : null,
            payload,
        });

        if (error) throw error;

        return data;
    } catch (err) {
        console.error("İşlem logu kaydedilemedi:", JSON.stringify(err, null, 2));
        return null;
    }
}