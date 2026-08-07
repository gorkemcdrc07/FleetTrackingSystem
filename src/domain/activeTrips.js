export const ALLOWED_WORKING_TYPES = [
    "FİLO",
    "DENTAŞ ÇORLU KİRALIK",
    "PEPSİ KİRALIK",
];

function split(value) {
    return String(value || "").split(";").map((item) => item.trim()).filter(Boolean);
}

function normalizeStopKey(...values) {
    return values.filter(Boolean).join("|").toLocaleLowerCase("tr-TR")
        .replace(/\s+/g, " ").trim();
}

function uniqueStops(stops) {
    const seen = new Set();
    return stops.filter((stop) => {
        const key = normalizeStopKey(stop.firma, stop.nokta, stop.il, stop.ilce);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function createRouteDetails(row) {
    const loadingPoints = split(row.yukleme_noktasi);
    const loadingCities = split(row.yukleme_ili);
    const loadingCounties = split(row.yukleme_ilcesi);
    const deliveryCompanies = split(row.teslim_alan_firma);
    const deliveryPoints = split(row.teslim_noktasi);
    const deliveryCities = split(row.teslim_ili);
    const deliveryCounties = split(row.teslim_ilcesi);

    const loadingCount = Math.max(loadingPoints.length, loadingCities.length, loadingCounties.length);
    const deliveryCount = Math.max(
        deliveryCompanies.length, deliveryPoints.length, deliveryCities.length, deliveryCounties.length
    );

    const loadingStops = uniqueStops(Array.from({ length: loadingCount }, (_, index) => ({
        tip: "yukleme", sira: index + 1, firma: null,
        nokta: loadingPoints[index] || null,
        il: loadingCities[index] || null,
        ilce: loadingCounties[index] || null,
        planlanan_varis: null, gerceklesen_varis: null,
        planlanan_cikis: null, gerceklesen_cikis: null,
    })));

    const deliveryStops = Array.from({ length: deliveryCount }, (_, index) => ({
        tip: "teslim", sira: loadingStops.length + index + 1,
        firma: deliveryCompanies[index] || null,
        nokta: deliveryPoints[index] || null,
        il: deliveryCities[index] || null,
        ilce: deliveryCounties[index] || null,
        planlanan_varis: null, gerceklesen_varis: null,
        planlanan_cikis: null, gerceklesen_cikis: null,
    })).filter((stop) => stop.firma || stop.nokta || stop.il || stop.ilce);

    return [...loadingStops, ...deliveryStops];
}

export function isAllowedWorkingType(value) {
    return ALLOWED_WORKING_TYPES.includes(
        String(value || "").toLocaleUpperCase("tr-TR").trim()
    );
}

export function prepareActiveTrips(rows, { completed, passive }) {
    return rows
        .filter((row) => isAllowedWorkingType(row.vehicle_working_type_name))
        .filter((row) => !completed.has(row.sefer_no) && !passive.has(row.sefer_no))
        .map((row) => ({
            sefer_no: row.sefer_no,
            sefer_tarihi: row.sefer_tarihi,
            arac_statu: row.arac_statu,
            plaka: row.plaka,
            treyler: row.treyler,
            surucu_ad_soyad: row.surucu_ad_soyad,
            surucu_tckn: row.surucu_tckn,
            surucu_telefon: row.surucu_telefon,
            musteri_adi: row.musteri_adi,
            musteri_siparis_no: row.musteri_siparis_no,
            hizmet_adi: row.hizmet_adi,
            proje_adi: row.proje_adi,
            yukleme_noktasi: row.yukleme_noktasi,
            yukleme_ili: row.yukleme_ili,
            yukleme_ilcesi: row.yukleme_ilcesi,
            teslim_alan_firma: row.teslim_alan_firma,
            teslim_noktasi: row.teslim_noktasi,
            teslim_ili: row.teslim_ili,
            teslim_ilcesi: row.teslim_ilcesi,
            irsaliye_no: row.irsaliye_no,
            aciklama: null,
            atama_yapan_kullanici: row.atama_yapan_kullanici,
            atama_tarihi: row.atama_tarihi,
            rota_detaylari: createRouteDetails(row),
            vehicle_working_type_name: row.vehicle_working_type_name,
            vehicle_working_type_id: row.vehicle_working_type_id,
            ham_veri: row,
        }));
}
