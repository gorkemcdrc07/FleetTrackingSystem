import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Clock3, Gauge, MapPin, Navigation, RefreshCw, Route, TriangleAlert } from "lucide-react";
import { requestJson, responseList } from "../../../services/requestJson";
import { apiUrl } from "../../../config/api";
import "./Detay.css";

const API_URL = apiUrl("/api/mobiliz/activity-last");
const normPlate = (v) => String(v || "").replace(/\s/g, "").toUpperCase();
const fmtTime = (v) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleTimeString("tr-TR", {hour:"2-digit", minute:"2-digit"}) : "—"; };
const text = (v, fallback="—") => String(v ?? "").trim() || fallback;

export default function SeferDetayMerkezi({ row, route = [], mapRoute, routeLoading, routeError, onOpenTab }) {
  const [vehicle,setVehicle]=useState(null); const [loading,setLoading]=useState(false); const [error,setError]=useState(""); const generation=useRef(0);
  const load=useCallback(async(signal)=>{ const id=++generation.current; if(!row?.plaka)return; try{setLoading(true);setError("");const json=await requestJson(API_URL,{signal},{timeoutMs:20000,retries:1});const found=responseList(json).find(x=>normPlate(x?.plate||x?.licensePlate||x?.plateNo)===normPlate(row.plaka));if(id===generation.current)setVehicle(found||null);}catch(e){if(!signal?.aborted&&id===generation.current)setError(e?.message||"Mobiliz verisi alınamadı.");}finally{if(!signal?.aborted&&id===generation.current)setLoading(false);}},[row?.plaka]);
  useEffect(()=>{const c=new AbortController();load(c.signal);const t=setInterval(()=>load(c.signal),30000);return()=>{c.abort();generation.current++;clearInterval(t);};},[load]);

  const info=useMemo(()=>{const speed=Number(vehicle?.speed||vehicle?.velocity||0);const ignition=[true,1,"true","1"].includes(vehicle?.ignition??vehicle?.engine??vehicle?.contact);const status=speed>0?"Hareket halinde":ignition?"Rölantide":vehicle?"Park halinde":"GPS bekleniyor";return {speed,status,address:text(vehicle?.address||vehicle?.location||vehicle?.city,"Konum bilgisi bekleniyor"),updated:vehicle?.gpsDate||vehicle?.activityDate||vehicle?.dataTime||vehicle?.lastDataTime||vehicle?.date};},[vehicle]);
  const done=route.filter(x=>x?.cikis).length; const activeIndex=route.findIndex(x=>!x?.cikis); const next=activeIndex>=0?route[activeIndex]:null; const progress=route.length?Math.round((done/route.length)*100):0;
  const rawKm=row?.distance_km ?? mapRoute?.distanceKm ?? 0;
  const plannedKm=typeof rawKm==="string"?Number(rawKm.replace(",",".")):Number(rawKm);
  const kmLabel=Number.isFinite(plannedKm)&&plannedKm>0?`${plannedKm.toLocaleString("tr-TR",{minimumFractionDigits:0,maximumFractionDigits:1})} km`:routeLoading?"Hesaplanıyor…":"—";
  const duration=mapRoute?.durationMin; const statusClass=info.speed>0?"moving":vehicle?"idle":"offline";

  return <section className="trip-center">
    <div className="trip-center-top">
      <div className="trip-center-title"><div className={`trip-live-dot ${statusClass}`}/><div><strong>{info.status}</strong><span>{text(row?.plaka)} · Sefer {text(row?.sefer_no)}</span></div></div>
      <button type="button" className="trip-center-refresh" onClick={()=>load()} disabled={loading}><RefreshCw size={15} className={loading?"trip-spin":""}/> Canlı yenile</button>
    </div>
    {(routeError||error)&&<div className="trip-center-alert"><TriangleAlert size={17}/><span>{routeError||error}</span></div>}
    <div className="trip-center-metrics">
      <button onClick={()=>onOpenTab?.("mobiliz")}><MapPin/><span>Şu an</span><strong>{info.address}</strong><small>GPS {fmtTime(info.updated)}</small></button>
      <button onClick={()=>onOpenTab?.("mobiliz")}><Gauge/><span>Hız</span><strong>{vehicle?`${info.speed} km/h`:"—"}</strong><small>{info.status}</small></button>
      <button onClick={()=>onOpenTab?.("genel")}><Route/><span>Planlanan rota</span><strong>{kmLabel}</strong><small>{row?.distance_km?"Rota hafızası":"Harita hesabı"}</small></button>
      <button onClick={()=>onOpenTab?.("eta")}><Clock3/><span>Planlı sürüş</span><strong>{duration?`${Math.floor(duration/60)} sa ${Math.round(duration%60)} dk`:"—"}</strong><small>ETA analizini aç</small></button>
    </div>
    <div className="trip-center-route">
      <div className="trip-center-route-head"><div><Navigation size={18}/><strong>Rota ilerlemesi</strong></div><span>{done}/{route.length} nokta tamamlandı · %{progress}</span></div>
      <div className="trip-progress"><i style={{width:`${progress}%`}}/></div>
      <div className="trip-stop-strip">
        {route.length?route.map((s,i)=>{const state=s?.cikis?"done":i===activeIndex?"active":"waiting";return <div className={`trip-stop ${state}`} key={`${s.type}-${i}-${s.nokta||""}`}><b>{state==="done"?"✓":i+1}</b><div><span>{s.type}</span><strong>{text(s.nokta||[s.ilce,s.il].filter(Boolean).join(" / "),"Rota noktası")}</strong><small>{[s.ilce,s.il].filter(Boolean).join(" / ")}</small></div></div>;}):<span className="trip-no-route">Rota noktası bulunamadı.</span>}
      </div>
      <div className="trip-next"><Activity size={17}/><span>{next?<><b>Sonraki işlem:</b> {next.type} · {text(next.nokta||[next.ilce,next.il].filter(Boolean).join(" / "))}</>:<><b>Rota tamamlandı.</b> Tüm noktalar işlendi.</>}</span></div>
    </div>

  </section>;
}
