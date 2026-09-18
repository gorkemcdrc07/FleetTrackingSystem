import { apiUrl } from "../../config/api";
import { requestJson, responseList } from "../../services/requestJson";

function normalizeDocumentNo(value) {
    return String(value || "")
        .trim()
        .toLocaleUpperCase("tr-TR");
}

function isSFRDocument(item) {
    return normalizeDocumentNo(item?.DocumentNo).startsWith("SFR");
}

export async function syncFromTMS({ start, end, signal, onRetry }) {
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

    if(new Date(start)>new Date(end))throw new Error("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
    const json=await requestJson(apiUrl("/api/proxy/tmsdespatches"),{
        method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(body),signal
    },{timeoutMs:90000,retries:1,onRetry});
    if(json?.Success===false || json?.success===false)throw new Error("TMS sorgusu başarısız oldu. Mevcut kayıtlar korunuyor.");
    return responseList(json).filter(isSFRDocument);
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
        console.warn(
            "mapTMSRows liste bekliyordu ancak farklı veri geldi:",
            list
        );

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