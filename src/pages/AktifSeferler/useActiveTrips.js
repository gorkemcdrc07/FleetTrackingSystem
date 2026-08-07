import { useCallback, useEffect, useState } from "react";
import { listActiveTrips } from "../../services/tripRepository";
import { synchronizeActiveTrips } from "../../services/activeTripService";

export function useActiveTrips({ startDate, endDate }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            setRows(await listActiveTrips({ startDate, endDate }));
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    const synchronize = useCallback(async () => {
        setSyncing(true);
        try {
            await synchronizeActiveTrips({ startDate, endDate });
            await refresh();
        } catch (error) {
            console.error("TMS çekme / kayıt hatası:", error);
            alert(`Hata:\n\n${error.message}`);
        } finally {
            setSyncing(false);
        }
    }, [startDate, endDate, refresh]);

    useEffect(() => {
        refresh().catch((error) => {
            console.error("Supabase listeleme hatası:", error);
            alert("Kayıtlı veriler alınırken hata oluştu.");
        });
    }, [refresh]);

    return { rows, setRows, loading, syncing, refresh, synchronize };
}
