import { prepareActiveTrips } from "../domain/activeTrips";
import { getExcludedTripNumbers, saveActiveTrips } from "./tripRepository";
import { mapTMSRows, syncFromTMS } from "./tmsIntegrationService";

export async function synchronizeActiveTrips({ startDate, endDate }) {
    const incoming = await syncFromTMS({
        start: `${startDate}T00:00:00`,
        end: `${endDate}T23:59:59`,
    });
    const excluded = await getExcludedTripNumbers();
    const mapped = mapTMSRows(incoming);

    const activeTrips = prepareActiveTrips(mapped, excluded);
    await saveActiveTrips(activeTrips);
    return activeTrips;
}
