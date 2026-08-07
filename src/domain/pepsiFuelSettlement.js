import { normalizeSettlementPlate, normalizeSettlementText } from "./settlementParsing.js";

const PEPSI_CUSTOMERS = ["PEPSI", "PEPSİ"];

export function getPepsiConsumptionRate(customerName) {
    const customer = normalizeSettlementText(customerName);
    return PEPSI_CUSTOMERS.some((name) => customer.includes(name)) ? 0.38 : 0.37;
}

export function aggregatePepsiFuelByPlate(fuelRows) {
    const map = new Map();
    (fuelRows || []).forEach((row) => {
        const plate = normalizeSettlementPlate(row.plaka);
        const item = map.get(plate) || {
            plaka: plate,
            cari_id: row.cari_id,
            cari_adi: row.cari_adi,
            toplam_yakit_litresi: 0,
            birim_fiyat_sum: 0,
            iskontosuz_birim_fiyat_sum: 0,
            fiyat_count: 0,
        };
        item.toplam_yakit_litresi += Number(row.yakit_litresi || 0);
        if (row.birim_fiyat || row.iskontosuz_birim_fiyat) {
            item.birim_fiyat_sum += Number(row.birim_fiyat || 0);
            item.iskontosuz_birim_fiyat_sum += Number(row.iskontosuz_birim_fiyat || 0);
            item.fiyat_count += 1;
        }
        map.set(plate, item);
    });
    map.forEach((item) => {
        item.birim_fiyat = item.fiyat_count ? item.birim_fiyat_sum / item.fiyat_count : 0;
        item.iskontosuz_birim_fiyat = item.fiyat_count
            ? item.iskontosuz_birim_fiyat_sum / item.fiyat_count
            : 0;
    });
    return map;
}

export function calculatePepsiFuelSummary(tripRows, fuelByPlate) {
    const map = new Map();
    (tripRows || []).forEach((row) => {
        const plate = normalizeSettlementPlate(row.plaka);
        const rate = getPepsiConsumptionRate(row.musteri_adi);
        const km = Number(row.toplam_km || 0);
        const item = map.get(plate) || {
            plaka: plate, km_38: 0, km_37: 0, toplam_km: 0, toplam_tuketim: 0,
            gercek_yakit: 0, litre_farki: 0, birim_fiyat: 0,
            iskontosuz_birim_fiyat: 0, duzeltme_maliyeti: 0, tl_km: 0,
            durum: "", cari_id: "", cari_adi: "",
        };
        if (rate === 0.38) item.km_38 += km;
        else item.km_37 += km;
        item.toplam_km += km;
        item.toplam_tuketim += km * rate;
        map.set(plate, item);
    });
    map.forEach((item, plate) => {
        const fuel = fuelByPlate.get(plate);
        item.gercek_yakit = fuel?.toplam_yakit_litresi || 0;
        item.birim_fiyat = fuel?.birim_fiyat || 0;
        item.iskontosuz_birim_fiyat = fuel?.iskontosuz_birim_fiyat || 0;
        item.litre_farki = item.toplam_tuketim - item.gercek_yakit;
        item.duzeltme_maliyeti = item.litre_farki >= 0
            ? item.litre_farki * item.birim_fiyat
            : -Math.abs(item.litre_farki) * item.iskontosuz_birim_fiyat;
        item.tl_km = item.toplam_km ? item.duzeltme_maliyeti / item.toplam_km : 0;
        item.durum = item.duzeltme_maliyeti >= 0 ? "HAKEDİŞ" : "CEZA";
        item.cari_id = fuel?.cari_id || "";
        item.cari_adi = fuel?.cari_adi || "";
    });
    return Array.from(map.values()).sort((a, b) => a.plaka.localeCompare(b.plaka, "tr"));
}

export function distributePepsiSettlement(tripRows, summaryRows) {
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
            oran: getPepsiConsumptionRate(row.musteri_adi),
            sefer_hakedisi_tl: km * Number(summary?.tl_km || 0),
            cari_unvan_id: summary?.cari_id || "",
            cari_adi: summary?.cari_adi || "",
        };
    });
}

export function summarizePepsiSettlement(summaryRows) {
    return (summaryRows || []).reduce((total, row) => ({
        plaka: total.plaka + 1,
        km: total.km + row.toplam_km,
        litre: total.litre + row.litre_farki,
        tutar: total.tutar + row.duzeltme_maliyeti,
        tahmini: total.tahmini + row.toplam_tuketim,
        gercek: total.gercek + row.gercek_yakit,
    }), { plaka: 0, km: 0, litre: 0, tutar: 0, tahmini: 0, gercek: 0 });
}
