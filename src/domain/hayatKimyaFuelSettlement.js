import { normalizeSettlementPlate, normalizeSettlementText } from "./settlementParsing.js";

const SPECIAL_CUSTOMERS = ["HAYAT KİMYA", "HAYAT KIMYA", "ODAK TEDARİK", "ODAK TEDARIK"];

export function getHayatKimyaConsumptionRate(customerName) {
    const customer = normalizeSettlementText(customerName);
    return SPECIAL_CUSTOMERS.some((name) => customer.includes(name)) ? 0.36 : 0.37;
}

export function indexHayatKimyaVehiclePricing(pricingRows) {
    return new Map((pricingRows || []).map((row) => [normalizeSettlementPlate(row.plaka), row]));
}

export function aggregateHayatKimyaFuelByPlate(fuelRows) {
    const map = new Map();
    (fuelRows || []).forEach((row) => {
        const plate = normalizeSettlementPlate(row.plaka);
        const item = map.get(plate) || {
            plaka: plate,
            cari_id: row.cari_id,
            cari_adi: row.cari_adi,
            toplam_yakit_litresi: 0,
            birim_fiyat: row.birim_fiyat || 0,
            iskontosuz_birim_fiyat: row.iskontosuz_birim_fiyat || 0,
        };
        item.toplam_yakit_litresi += Number(row.yakit_litresi || 0);
        if (row.birim_fiyat) item.birim_fiyat = row.birim_fiyat;
        if (row.iskontosuz_birim_fiyat) item.iskontosuz_birim_fiyat = row.iskontosuz_birim_fiyat;
        map.set(plate, item);
    });
    return map;
}

export function calculateHayatKimyaFuelSummary(tripRows, fuelByPlate, pricingByPlate) {
    const map = new Map();
    (tripRows || []).forEach((row) => {
        const plate = normalizeSettlementPlate(row.plaka);
        const rate = getHayatKimyaConsumptionRate(row.musteri_adi);
        const km = Number(row.toplam_km || 0);
        const item = map.get(plate) || {
            plaka: plate, km_36: 0, km_37: 0, toplam_km: 0,
            tahmini_tuketim: 0, gercek_yakit: 0, fark_litre: 0,
            birim_fiyat: 0, duzeltme_maliyeti: 0, tl_km: 0,
            durum: "", cari_id: "", cari_adi: "",
        };
        if (rate === 0.36) item.km_36 += km;
        else item.km_37 += km;
        item.toplam_km += km;
        map.set(plate, item);
    });
    map.forEach((item, plate) => {
        const fuel = fuelByPlate.get(plate);
        const pricing = pricingByPlate.get(plate);
        item.tahmini_tuketim = item.km_36 * 0.36 + item.km_37 * 0.37;
        item.gercek_yakit = fuel?.toplam_yakit_litresi || 0;
        item.fark_litre = item.tahmini_tuketim - item.gercek_yakit;
        item.birim_fiyat = fuel?.birim_fiyat || fuel?.iskontosuz_birim_fiyat || 0;
        item.duzeltme_maliyeti = item.fark_litre * item.birim_fiyat;
        item.tl_km = item.toplam_km ? item.duzeltme_maliyeti / item.toplam_km : 0;
        item.durum = item.fark_litre >= 0 ? "PRİM" : "CEZA";
        item.cari_id = fuel?.cari_id || pricing?.cari_id || "";
        item.cari_adi = fuel?.cari_adi || pricing?.cari_adi || "";
    });
    return Array.from(map.values()).sort((a, b) => a.plaka.localeCompare(b.plaka, "tr"));
}

export function distributeHayatKimyaSettlement(tripRows, summaryRows) {
    const summaryMap = new Map((summaryRows || []).map((row) => [row.plaka, row]));
    return (tripRows || []).map((row) => {
        const plate = normalizeSettlementPlate(row.plaka);
        const summary = summaryMap.get(plate);
        const km = Number(row.toplam_km || 0);
        return {
            sefer_no: row.sefer_no,
            tms_despatch_id: row.tms_despatch_id,
            musteri_adi: row.musteri_adi,
            plaka: plate,
            km,
            sefer_hakedisi_tl: km * Number(summary?.tl_km || 0),
            cari_unvan_id: summary?.cari_id || "",
            cari_adi: summary?.cari_adi || "",
        };
    });
}

export function summarizeHayatKimyaSettlement(summaryRows) {
    return (summaryRows || []).reduce((total, row) => ({
        km: total.km + row.toplam_km,
        tahmini: total.tahmini + row.tahmini_tuketim,
        gercek: total.gercek + row.gercek_yakit,
        fark: total.fark + row.fark_litre,
        tl: total.tl + row.duzeltme_maliyeti,
    }), { km: 0, tahmini: 0, gercek: 0, fark: 0, tl: 0 });
}
