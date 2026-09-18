<<<<<<< HEAD:src/pages/ActiveTrips/useActiveTrips.js
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
=======
import { useCallback,useEffect,useRef,useState } from 'react';
import { listActiveTrips } from '../../services/tripRepository';
import { synchronizeActiveTrips } from '../../services/activeTripService';
export function useActiveTrips({startDate,endDate}) {
    const [rows,setRows]=useState([]),[loading,setLoading]=useState(false),[syncing,setSyncing]=useState(false);
    const [syncState,setSyncState]=useState(null),[loadError,setLoadError]=useState('');
    const busy=useRef(false),request=useRef(0),mounted=useRef(true);
    useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;request.current++;};},[]);
    const refresh=useCallback(async()=>{
        const id=++request.current;
        if(!startDate||!endDate||startDate>endDate){setLoading(false);setLoadError('Geçerli bir tarih aralığı seçin.');return;}
        setLoading(true);setLoadError('');
        try{const data=await listActiveTrips({startDate,endDate});if(mounted.current&&id===request.current)setRows(data);}
        catch(error){if(mounted.current&&id===request.current)setLoadError(error.message||'Seferler yüklenemedi.');throw error;}
        finally{if(mounted.current&&id===request.current)setLoading(false);}
    },[startDate,endDate]);
    const synchronize=useCallback(async()=>{
        if(busy.current)return;busy.current=true;setSyncing(true);setSyncState({stage:'fetching',message:'TMS bağlantısı kuruluyor…'});
        let result;
        try{
            result=await synchronizeActiveTrips({startDate,endDate,onProgress:value=>{if(mounted.current)setSyncState(prev=>({...prev,...value}));}});
            if(mounted.current)setSyncState({...result,stage:'refreshing',message:'Sefer listesi güncelleniyor…'});
            await refresh();
            if(mounted.current)setSyncState({...result,stage:'success',message:'TMS yenilemesi tamamlandı.',finishedAt:new Date().toLocaleTimeString('tr-TR')});
        }catch(error){if(mounted.current)setSyncState(prev=>({...prev,...result,...error.syncStats,stage:'error',message:result?'Kayıtlar kaydedildi, ancak liste yenilenemedi. Listeyi yeniden yükleyin.':error.message||'TMS yenilemesi tamamlanamadı.'}));}
        finally{busy.current=false;if(mounted.current)setSyncing(false);}
    },[startDate,endDate,refresh]);
    useEffect(()=>{refresh().catch(()=>{});},[refresh]);
    return {rows,setRows,loading,syncing,refresh,synchronize,syncState,loadError};
>>>>>>> e19f46db99295929579026857074dda7619efeec:src/pages/AktifSeferler/useActiveTrips.js
}
