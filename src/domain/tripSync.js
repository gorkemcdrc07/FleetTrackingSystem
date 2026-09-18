import { uniqueTripsByNumber } from './tripIdentity.js';
export function planTripSync(incoming, existing) {
    const previous = new Map(existing.map(row => [row.sefer_no,row]));
    const inserted=[], updates=[];let unchanged=0;
    for(const row of uniqueTripsByNumber(incoming)){
        const old=previous.get(row.sefer_no);
        if(!old){inserted.push(row);continue;}
        const patch={};
        // Operator-owned notes, times and delivery order are never overwritten by TMS.
        for(const [key,value] of Object.entries(row)) {
            if(['sefer_no','aciklama','rota_detaylari','tonaj_durumu','id'].includes(key))continue;
            if(key==='arac_statu' && old.rota_detaylari?.some(s=>s.varis||s.cikis||s.gerceklesen_varis||s.gerceklesen_cikis))continue;
            if(JSON.stringify(old[key]??null)!==JSON.stringify(value??null))patch[key]=value;
        }
        if(Object.keys(patch).length)updates.push({sefer_no:row.sefer_no,patch});else unchanged++;
    }
    return {inserted,updates,unchanged};
}
