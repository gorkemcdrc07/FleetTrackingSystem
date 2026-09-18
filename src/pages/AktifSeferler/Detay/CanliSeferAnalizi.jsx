import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Navigation, Timer, Route, Gauge, MapPin } from "lucide-react";
import { apiUrl } from "../../../config/api";
import { requestJson, responseList } from "../../../services/requestJson";

const DETAIL_URL=apiUrl("/api/mobiliz/activity-detail");
const pad=v=>String(v).padStart(2,"0");
function mobilizDate(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}+0300`;}
function lat(x){const v=Number(x?.latitude??x?.lat??x?.y);return Number.isFinite(v)?v:null;}
function lng(x){const v=Number(x?.longitude??x?.lng??x?.lon??x?.x);return Number.isFinite(v)?v:null;}
function speed(x){const v=Number(x?.speed??x?.velocity);return Number.isFinite(v)?v:0;}
function dateOf(x){return x?.gpsDate||x?.activityDate||x?.dataTime||x?.lastDataTime||x?.date||null;}
function haversine(a,b){const R=6371,toRad=x=>x*Math.PI/180;const la1=lat(a),lo1=lng(a),la2=lat(b),lo2=lng(b);if([la1,lo1,la2,lo2].some(v=>v===null))return 0;const dLat=toRad(la2-la1),dLon=toRad(lo2-lo1);const q=Math.sin(dLat/2)**2+Math.cos(toRad(la1))*Math.cos(toRad(la2))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(q));}
function normalizePlate(v){return String(v||"").replace(/\s/g,"").toUpperCase();}
function formatDuration(hours){if(!Number.isFinite(hours)||hours<0)return "—";const total=Math.round(hours*60);return `${Math.floor(total/60)} sa ${total%60} dk`;}
function formatEta(hours){if(!Number.isFinite(hours))return "—";return new Date(Date.now()+hours*3600000).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});}
function gpsAgeMinutes(vehicle){const raw=dateOf(vehicle);if(!raw)return null;const d=new Date(raw);if(Number.isNaN(d.getTime()))return null;return Math.max(0,(Date.now()-d.getTime())/60000);}
function confidenceLabel(age,pointCount,moving){if(age===null||age>30||pointCount<2)return {key:"none",label:"HESAPLANAMIYOR",note:"Güncel GPS verisi yetersiz"};if(age<=3&&pointCount>=8&&moving)return {key:"high",label:"YÜKSEK",note:"Güncel GPS ve hareket geçmişi kullanılıyor"};if(age<=10&&pointCount>=4)return {key:"medium",label:"ORTA",note:"GPS mevcut, hareket verisi sınırlı"};return {key:"low",label:"DÜŞÜK",note:"GPS eski veya araç hareketsiz"};}
function nextStop(route){return (route||[]).find(x=>!["completed","tamamlandi","done"].includes(String(x.status||"").toLowerCase())) || (route||[]).at(-1);}

export default function CanliSeferAnalizi({plaka,row,mapRoute,route,currentVehicle}){
 const [points,setPoints]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState(""); const gen=useRef(0);
 const load=useCallback(async(signal)=>{const id=++gen.current;if(!plaka)return;setLoading(true);setError("");try{
   const end=new Date(); let start=row?.sefer_tarihi?new Date(row.sefer_tarihi):new Date(end.getTime()-24*3600000); if(Number.isNaN(start.getTime())||start>end)start=new Date(end.getTime()-24*3600000); if(end-start>7*86400000)start=new Date(end.getTime()-7*86400000);
   const qs=new URLSearchParams({plate:normalizePlate(plaka),startTime:mobilizDate(start),endTime:mobilizDate(end)});
   const json=await requestJson(`${DETAIL_URL}?${qs}`,{signal},{timeoutMs:30000,retries:1}); if(id!==gen.current)return;
   setPoints(responseList(json).filter(x=>lat(x)!==null&&lng(x)!==null).sort((a,b)=>new Date(dateOf(a)||0)-new Date(dateOf(b)||0)));
 }catch(e){if(!signal?.aborted&&id===gen.current)setError(e?.message||"Canlı analiz verisi alınamadı.");}finally{if(!signal?.aborted&&id===gen.current)setLoading(false);}},[plaka,row?.sefer_tarihi]);
 useEffect(()=>{const c=new AbortController();load(c.signal);const t=setInterval(()=>load(c.signal),60000);return()=>{c.abort();clearInterval(t);gen.current++;};},[load]);
 const analysis=useMemo(()=>{
   let traveled=0; for(let i=1;i<points.length;i++){const d=haversine(points[i-1],points[i]); if(d<5)traveled+=d;} // GPS sıçramalarını dışla
   const planned=Number(row?.distance_km||mapRoute?.distanceKm||0); const remaining=planned?Math.max(0,planned-traveled):null;
   const recent=points.slice(-30).map(speed).filter(v=>v>=5&&v<=120); const current=speed(currentVehicle); const avg=recent.length?recent.reduce((a,b)=>a+b,0)/recent.length:null;
   const age=gpsAgeMinutes(currentVehicle||points.at(-1)); const confidence=confidenceLabel(age,points.length,current>3||recent.some(v=>v>3));
   const effective=avg?Math.max(30,Math.min(85,avg)):null;
   const canLiveEta=confidence.key!=="none"&&remaining!==null&&effective; const etaHours=canLiveEta?remaining/effective:null; const stop=nextStop(route);
   return {traveled,planned,remaining,avg,effective,etaHours,stop,age,confidence,canLiveEta};
 },[points,row?.distance_km,mapRoute?.distanceKm,route,currentVehicle]);
 return <div className="live-trip-analysis">
   <div className="live-analysis-head"><div><h3><Activity size={19}/> Canlı Sefer Analizi</h3><p>Mobiliz GPS geçmişi + rota kilometresi ile operasyonel tahmin.</p></div>{loading&&<span>Güncelleniyor…</span>}</div>
   {error&&<div className="live-analysis-warning">{error}</div>}
   <div className="live-analysis-grid">
    <div><Route size={17}/><span>Planlanan</span><strong>{analysis.planned?`${analysis.planned.toFixed(1)} km`:"—"}</strong></div>
    <div><Navigation size={17}/><span>Gidilen</span><strong>{analysis.traveled?`${analysis.traveled.toFixed(1)} km`:"0 km"}</strong></div>
    <div><MapPin size={17}/><span>Kalan</span><strong>{analysis.remaining!==null?`${analysis.remaining.toFixed(1)} km`:"—"}</strong></div>
    <div><Gauge size={17}/><span>Hareket Ort.</span><strong>{analysis.avg?`${Math.round(analysis.avg)} km/h`:"—"}</strong></div>
    <div><Timer size={17}/><span>Canlı Kalan Süre</span><strong>{analysis.canLiveEta?formatDuration(analysis.etaHours):"—"}</strong></div>
    <div><Timer size={17}/><span>Canlı ETA</span><strong>{analysis.canLiveEta?formatEta(analysis.etaHours):"Hesaplanamıyor"}</strong></div>
   </div>
   <div className={`eta-confidence ${analysis.confidence.key}`}><div><span>Tahmin güveni</span><strong>{analysis.confidence.label}</strong></div><small>{analysis.confidence.note}{analysis.age!==null?` · Son GPS ${Math.round(analysis.age)} dk önce`:""}</small></div>
   {!analysis.canLiveEta&&<div className="live-analysis-warning">Canlı ETA gösterilmiyor. Güncel GPS ve yeterli hareket verisi gelmeden kesin bir varış saati üretmiyoruz.</div>}
   {analysis.stop&&<div className="live-next-stop"><span>Sonraki planlı nokta</span><strong>{[analysis.stop.nokta,analysis.stop.il,analysis.stop.ilce].filter(Boolean).join(" · ")||"—"}</strong></div>}
   <p className="route-estimate-note">Gidilen KM, sefer başlangıcından itibaren Mobiliz GPS noktalarının toplamından hesaplanır. Canlı ETA yalnızca güncel GPS ve yeterli hareket geçmişi varsa gösterilir. Hareket ortalaması son GPS kayıtlarından üretilir. Canlı trafik, yol kısıtları ve durak operasyon süreleri ayrıca doğrulanmadıkça tahmine dahil değildir.</p>
 </div>;
}
