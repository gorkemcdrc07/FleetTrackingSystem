const API_BASE_URL =
    import.meta.env?.VITE_API_BASE_URL ||
    "https://filo-backend-57wx.onrender.com";

function normalizeDocumentNo(value) {
    return String(value || "")
        .trim()
        .toLocaleUpperCase("tr-TR");
}

function isSFRDocument(item) {
    return normalizeDocumentNo(item?.DocumentNo).startsWith("SFR");
}

export async function syncFromTMS({ start, end }) {
    if (!start || !end) {
        throw new Error("TMS sorgusu için başlangıç ve bitiş tarihi zorunludur.");
    }

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
        WorkingTypesId: Array.from({ length: 80 }, (_, index) => index + 1),
    };

    const requestUrl = `${API_BASE_URL}/api/proxy/tmsdespatches`;

    let response;

    try {
        response = await fetch(requestUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(body),
        });
    } catch (networkError) {
        throw new Error(
            `TMS backend sunucusuna bağlanılamadı: ${networkError?.message || "Bilinmeyen bağlantı hatası"
            }`
        );
    }

    const responseText = await response.text();

    let responseJson = null;

    if (responseText) {
        try {
            responseJson = JSON.parse(responseText);
        } catch {
            throw new Error(
                `TMS sunucusu geçersiz cevap döndürdü. HTTP ${response.status
                }: ${responseText.slice(0, 500)}`
            );
        }
    }

    if (!response.ok) {
        const errorDetail =
            responseJson?.detail ||
            responseJson?.error ||
            responseJson?.message ||
            responseText ||
            "Bilinmeyen sunucu hatası";

        throw new Error(
            `TMS API hatası — HTTP ${response.status}: ${String(
                errorDetail
            ).slice(0, 1000)}`
        );
    }

    const allRows = Array.isArray(responseJson?.Data)
        ? responseJson.Data
        : Array.isArray(responseJson?.data)
            ? responseJson.data
            : Array.isArray(responseJson)
                ? responseJson
                : [];

    /*
     * Yalnızca DocumentNo değeri SFR ile başlayan kayıtları alıyoruz.
     */
    const sfrRows = allRows.filter(isSFRDocument);

    return sfrRows;
}

export function mapTMSRows(list) {
    const safeString = (value) => {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value).trim();
    };

    const safeNumber = (value) => {
        if (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
        ) {
            return null;
        }

        const numberValue = Number(value);

        return Number.isFinite(numberValue)
            ? numberValue
            : null;
    };

    const mapOrders = (orders, field) => {
        if (!Array.isArray(orders)) {
            return "";
        }

        return orders
            .filter(
                (order) =>
                    order &&
                    typeof order === "object"
            )
            .map((order) => safeString(order[field]))
            .filter(Boolean)
            .join("; ");
    };

    if (!Array.isArray(list)) {
        return [];
    }

    /*
     * İkinci güvenlik filtresi:
     * syncFromTMS dışında bir yerden veri gönderilirse de
     * SFR olmayan kayıtların map edilmesini engeller.
     */
    const sfrList = list.filter(isSFRDocument);

    return sfrList.map((item, index) => {
        const tmsOrders = Array.isArray(item?.TMSOrders)
            ? item.TMSOrders
            : [];

        const tmsDespatchId = item?.TMSDespatchId;
        const documentNo = normalizeDocumentNo(item?.DocumentNo);

        return {
            id:
                tmsDespatchId ||
                documentNo ||
                `tms-${index}`,

            sefer_no: documentNo,

            arac_statu: safeString(
                item?.VehicleStatus
            ),

            plaka: safeString(
                item?.PlateNumber
            ),

            treyler: safeString(
                item?.TrailerPlateNumber
            ),

            surucu_ad_soyad: safeString(
                item?.FullName
            ),

            surucu_tckn: safeString(
                item?.CitizenNumber
            ),

            surucu_telefon: safeString(
                item?.PhoneNumber
            ),

            musteri_adi: safeString(
                item?.CustomerFullTitle
            ),

            musteri_siparis_no: safeString(
                item?.CustomerOrderNumber
            ),

            hizmet_adi: safeString(
                item?.ServiceName
            ),

            proje_adi: mapOrders(
                tmsOrders,
                "ProjectName"
            ),

            yukleme_noktasi: mapOrders(
                tmsOrders,
                "PickupAddressCode"
            ),

            yukleme_ili: mapOrders(
                tmsOrders,
                "PickupCityName"
            ),

            yukleme_ilcesi: mapOrders(
                tmsOrders,
                "PickupCountyName"
            ),

            teslim_alan_firma: mapOrders(
                tmsOrders,
                "DeliveryCurrentAccountName"
            ),

            teslim_noktasi: mapOrders(
                tmsOrders,
                "DeliveryAddressCode"
            ),

            teslim_ili: mapOrders(
                tmsOrders,
                "DeliveryCityName"
            ),

            teslim_ilcesi: mapOrders(
                tmsOrders,
                "DeliveryCountyName"
            ),

            irsaliye_no: safeString(
                item?.TMSDespatchWaybillNumber
            ),

            sefer_tarihi:
                item?.DespatchDate || null,

            atama_yapan_kullanici: safeString(
                item?.TMSDespatchCreatedBy
            ),

            atama_tarihi:
                item?.TMSDespatchCreatedDate || null,

            vehicle_working_type_name: safeString(
                item?.VehicleWorkingTypeName
            ),

            vehicle_working_type_id: safeNumber(
                item?.VehicleWorkingTypeId
            ),

            reel_durum: "YENİ",
        };
    });
}
