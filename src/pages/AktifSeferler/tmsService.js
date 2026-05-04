const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export async function syncFromTMS({ start, end }) {
    const body = {
        startDate: start,
        endDate: end,
        userId: 1,
        CustomerId: 0,
        SupplierId: 0,
        DriverId: 0,
        TMSDespatchId: 0,
        VehicleId: 0,
        DocumentPrint: "",
        WorkingTypesId: [3, 4, 33],
    };

    console.log("TMS REQUEST BODY:", JSON.stringify(body));

    const res = await fetch(`${API_BASE_URL}/api/proxy/tmsdespatches`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(body),
    });

    const text = await res.text();

    console.log("TMS STATUS:", res.status);
    console.log("TMS RESPONSE:", text);

    if (!res.ok) {
        throw new Error(
            `API Hatası: ${res.status} ${res.statusText} — ${text || "Sunucu hatası"}`
        );
    }

    const json = JSON.parse(text);

    return Array.isArray(json?.Data) ? json.Data : [];
}

export function mapTMSRows(list) {
    const mapOrders = (orders, field) =>
        Array.isArray(orders)
            ? orders
                .filter((o) => o && typeof o === "object")
                .map((o) => o[field] ?? "")
                .filter(Boolean)
                .join("; ")
            : "";

    return (list || []).map((s, idx) => {
        const tmsOrders = Array.isArray(s.TMSOrders) ? s.TMSOrders : [];

        return {
            id: s?.TMSDespatchId || s?.DocumentNo || idx,
            sefer_no: s?.DocumentNo?.trim() ?? "",
            arac_statu: s?.VehicleStatus ?? "",
            plaka: s?.PlateNumber ?? "",
            treyler: s?.TrailerPlateNumber ?? "",
            surucu_ad_soyad: s?.FullName ?? "",
            surucu_tckn: s?.CitizenNumber ?? "",
            surucu_telefon: s?.PhoneNumber ?? "",
            musteri_adi: s?.CustomerFullTitle ?? "",
            musteri_siparis_no: s?.CustomerOrderNumber ?? "",
            hizmet_adi: s?.ServiceName ?? "",
            proje_adi: mapOrders(tmsOrders, "ProjectName"),
            yukleme_noktasi: mapOrders(tmsOrders, "PickupAddressCode"),
            yukleme_ili: mapOrders(tmsOrders, "PickupCityName"),
            yukleme_ilcesi: mapOrders(tmsOrders, "PickupCountyName"),
            teslim_alan_firma: mapOrders(tmsOrders, "DeliveryCurrentAccountName"),
            teslim_noktasi: mapOrders(tmsOrders, "DeliveryAddressCode"),
            teslim_ili: mapOrders(tmsOrders, "DeliveryCityName"),
            teslim_ilcesi: mapOrders(tmsOrders, "DeliveryCountyName"),
            irsaliye_no: s?.TMSDespatchWaybillNumber ?? "",
            sefer_tarihi: s?.DespatchDate ?? "",
            atama_yapan_kullanici: s?.TMSDespatchCreatedBy ?? "",
            atama_tarihi: s?.TMSDespatchCreatedDate ?? "",
            reel_durum: "YENİ",
        };
    });
}