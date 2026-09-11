import { requestJson } from './requestJson.js';
const cache=new Map();let queue=Promise.resolve();
export function validPoint(p){return p&&p.lat!==''&&p.lng!==''&&p.lat!=null&&p.lng!=null&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))&&Math.abs(Number(p.lat))<=90&&Math.abs(Number(p.lng))<=180;}
export async function geocodeStop(stop,{signal,endpoint=import.meta.env?.VITE_GEOCODING_URL||'https://photon.komoot.io/api/'}={}){
 const direct={lat:stop.latitude??stop.lat,lng:stop.longitude??stop.lng??stop.lon};
 if(validPoint(direct))return {lat:Number(direct.lat),lng:Number(direct.lng),approximate:false};
 const queries=[...new Set([[stop.nokta,stop.ilce,stop.il],[stop.ilce,stop.il]].map(parts=>parts.filter(Boolean).join(', ')).filter(Boolean))];
 for(const query of queries){
  if(signal?.aborted)throw new DOMException('İptal edildi','AbortError');
  const key=`${endpoint}|${query}`;if(cache.has(key)){if(cache.get(key))return cache.get(key);continue;}
  const run=queue.then(async()=>{
   if(signal?.aborted)throw new DOMException('İptal edildi','AbortError');
   if(cache.has(key))return cache.get(key);
   const params=new URLSearchParams({q:query,limit:'5',bbox:'25.5,35.5,45,42.5'});
   const json=await requestJson(`${endpoint}?${params}`,{signal},{timeoutMs:15000,retries:0});
   const feature=json?.features?.find(f=>{const[lng,lat]=f.geometry?.coordinates||[];return validPoint({lat,lng})&&lat>=35.5&&lat<=42.5&&lng>=25.5&&lng<=45&&(!f.properties?.countrycode||f.properties.countrycode.toUpperCase()==='TR');});
   const result=feature?{lat:feature.geometry.coordinates[1],lng:feature.geometry.coordinates[0],approximate:true}:null;
   if(cache.size>1000)cache.clear();cache.set(key,result);return result;
  });
  queue=run.catch(()=>{}).then(()=>new Promise(resolve=>setTimeout(resolve,1100)));
  const result=await run;if(result)return result;
 }return null;
}
export async function calculateRoadRoute(stops,{signal,onProgress}={}){
 if(stops.length<2)throw new Error('Rota için en az iki durak gerekli.');
 const points=[];
 for(let i=0;i<stops.length;i++){onProgress?.(`${i+1}/${stops.length} durak konumu bulunuyor…`);const p=await geocodeStop(stops[i],{signal});if(!p)throw new Error(`${i+1}. durak için konum bulunamadı. İl/ilçe ve adres bilgisini kontrol edin.`);points.push(p);}
 onProgress?.('Yol mesafesi ve süre hesaplanıyor…');
 const coords=points.map(p=>`${p.lng},${p.lat}`).join(';');const endpoint=(import.meta.env?.VITE_ROUTING_URL||'https://router.project-osrm.org').replace(/\/$/,'');
 const json=await requestJson(`${endpoint}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`,{signal},{timeoutMs:25000,retries:1});const r=json?.routes?.[0];
 if(json?.code!=='Ok'||!r||r.legs?.length!==stops.length-1||!Number.isFinite(r.duration)||!Number.isFinite(r.distance)||!Array.isArray(r.geometry?.coordinates))throw new Error('Bu duraklar arasında geçerli yol rotası hesaplanamadı.');
 if(!r.legs.every(l=>Number.isFinite(l.duration)&&l.duration>=0&&Number.isFinite(l.distance)&&l.distance>=0))throw new Error('Rota servisi geçersiz süre döndürdü.');
 return {stops,points,approximate:points.some(p=>p.approximate),geometry:r.geometry.coordinates.map(([lng,lat])=>[lat,lng]),distanceKm:r.distance/1000,durationMin:r.duration/60,legs:r.legs.map(l=>({distanceKm:l.distance/1000,durationMin:l.duration/60}))};
}
