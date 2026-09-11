import { prepareActiveTrips } from '../domain/activeTrips';
import { getExcludedTripNumbers, saveActiveTrips } from './tripRepository';
import { mapTMSRows, syncFromTMS } from '../pages/AktifSeferler/tmsService';
export async function synchronizeActiveTrips({ startDate,endDate,onProgress }) {
    if(!startDate||!endDate||startDate>endDate)throw new Error('Geçerli bir tarih aralığı seçin.');
    onProgress?.({stage:'fetching',message:'TMS’den seferler alınıyor…'});
    const incoming=await syncFromTMS({start:`${startDate}T00:00:00`,end:`${endDate}T23:59:59`,onRetry:()=>onProgress?.({stage:'fetching',message:'Geçici bağlantı sorunu; TMS isteği yeniden deneniyor…'})});
    onProgress?.({stage:'checking',message:`${incoming.length} sefer kontrol ediliyor…`,received:incoming.length});
    const excluded=await getExcludedTripNumbers();
    const activeTrips=prepareActiveTrips(mapTMSRows(incoming),excluded);
    onProgress?.({stage:'saving',message:'Yeni seferler ekleniyor, değişen bilgiler kaydediliyor…',received:incoming.length});
    const stats=await saveActiveTrips(activeTrips,stats=>onProgress?.({stage:'saving',message:'Seferler kaydediliyor…',received:incoming.length,...stats}));
    return {...stats,received:incoming.length,excludedCount:incoming.length-activeTrips.length};
}
