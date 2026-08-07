import { prepareActiveTrips } from "../domain/activeTrips";
import { getExcludedTripNumbers, saveActiveTrips } from "./tripRepository";
import { mapTMSRows, syncFromTMS } from "../pages/AktifSeferler/tmsService";

export async function synchronizeActiveTrips({ startDate, endDate }) {
    const incoming = await syncFromTMS({
        start: `${startDate}T00:00:00`,
        end: `${endDate}T23:59:59`,
    });
    const excluded = await getExcludedTripNumbers();
    const mapped = mapTMSRows(incoming);

    console.log("TMS GELEN:", incoming.length);
    console.table(mapped.map((row) => ({
        sefer_no: row.sefer_no,
        tip: row.vehicle_working_type_name,
        tamamlandi: excluded.completed.has(row.sefer_no),
        pasif: excluded.passive.has(row.sefer_no),
    })));

    const activeTrips = prepareActiveTrips(mapped, excluded);
    await saveActiveTrips(activeTrips);
    return activeTrips;
}
