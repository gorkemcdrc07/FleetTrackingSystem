import { supabase } from "../supabaseClient";

// v3: Çok duraklı rotalarda yükleme ve teslim il/ilçe KÜMELERİ eşleştirilir.
// Aynı noktalar farklı sırada gelse de aynı rota hafızası bulunur. Yükleme ve teslim grupları birbirine karıştırılmaz.
const LOCAL_KEY = "fts_route_distances_v3";

function normalize(value) {
  return String(value || "")
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I").replace(/Ş/g, "S").replace(/Ğ/g, "G")
    .replace(/Ü/g, "U").replace(/Ö/g, "O").replace(/Ç/g, "C")
    .replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
function split(value) { return String(value || "").split(";").map(v => v.trim()).filter(Boolean); }
function valueFromRow(row, key, ...aliases) {
  for (const candidate of [key, ...aliases]) {
    const direct = row?.[candidate]; if (direct !== undefined && direct !== null && String(direct).trim()) return direct;
    const raw = row?.ham_veri?.[candidate]; if (raw !== undefined && raw !== null && String(raw).trim()) return raw;
  }
  return "";
}
function pairLocations(cityValue, countyValue) {
  const cities = split(cityValue), counties = split(countyValue);
  const count = Math.max(cities.length, counties.length);
  if (!count || cities.length !== counties.length) return null;
  const pairs=[];
  for(let i=0;i<count;i++){
    const city=normalize(cities[i]), county=normalize(counties[i]);
    if(!city || !county) return null;
    pairs.push({city,county,cityLabel:cities[i].trim(),countyLabel:counties[i].trim()});
  }
  return pairs;
}
function canonicalPairs(pairs){
  // duplicate durakları tekilleştir; sıra rota hafızasını bozmasın
  return [...new Set(pairs.map(x=>`${x.city}/${x.county}`))].sort((a,b)=>a.localeCompare(b,"tr"));
}
export function getRouteLocations(row){
  const yuklemeIli=valueFromRow(row,"yukleme_ili"), yuklemeIlcesi=valueFromRow(row,"yukleme_ilcesi","yukleme_ilce");
  const teslimIli=valueFromRow(row,"teslim_ili"), teslimIlcesi=valueFromRow(row,"teslim_ilcesi","teslim_ilce");
  const loads=pairLocations(yuklemeIli,yuklemeIlcesi), deliveries=pairLocations(teslimIli,teslimIlcesi);
  if(!loads || !deliveries) return null;
  return {loads,deliveries,yuklemeIli,yuklemeIlcesi,teslimIli,teslimIlcesi};
}
export function getRouteKey(row){
  const x=getRouteLocations(row); if(!x) return "";
  return `YUKLEME_SET:${canonicalPairs(x.loads).join(">")}|TESLIM_SET:${canonicalPairs(x.deliveries).join(">")}`;
}
export function getRouteLabel(row){
  const x=getRouteLocations(row); if(!x) return "Rota il / ilçe bilgileri eksik";
  const loads=[...new Set(x.loads.map(v=>`${v.cityLabel} / ${v.countyLabel}`))].join(" • ");
  const deliveries=[...new Set(x.deliveries.map(v=>`${v.cityLabel} / ${v.countyLabel}`))].join(" • ");
  return `Yükleme: ${loads}  →  Teslim: ${deliveries}`;
}
export function hasCompleteRouteLocations(row){return Boolean(getRouteKey(row));}
function readLocal(){try{return JSON.parse(localStorage.getItem(LOCAL_KEY)||"{}");}catch{return {};}}
function writeLocal(data){try{localStorage.setItem(LOCAL_KEY,JSON.stringify(data));}catch{}}
export async function loadRouteDistances(){
  const local=readLocal();
  try{
    const {data,error}=await supabase.from("rota_kilometreleri").select("route_key, distance_km"); if(error) throw error;
    // yalnızca v3 set anahtarlarını al; eski sıra-bağımlı kayıtlar yanlış eşleşmesin
    const shared=Object.fromEntries((data||[]).filter(x=>String(x.route_key||"").startsWith("YUKLEME_SET:")).map(x=>[x.route_key,Number(x.distance_km)]));
    const merged={...local,...shared}; writeLocal(merged); return merged;
  }catch(error){console.warn("Rota kilometre tablosu okunamadı; yerel hafıza kullanılıyor.",error?.message||error);return local;}
}
export async function saveRouteDistance(row,distanceKm){
  const locations=getRouteLocations(row), routeKey=getRouteKey(row);
  if(!locations||!routeKey) throw new Error("KM kaydı için tüm yükleme ve teslim noktalarının İl + İlçe bilgileri eksiksiz olmalı.");
  const km=Number(String(distanceKm).replace(",",".")); if(!Number.isFinite(km)||km<=0) throw new Error("Geçerli bir kilometre girin.");
  const local=readLocal(); local[routeKey]=km; writeLocal(local);
  try{
    const {error}=await supabase.from("rota_kilometreleri").upsert({route_key:routeKey,route_label:getRouteLabel(row),yukleme_ili:locations.yuklemeIli,yukleme_ilcesi:locations.yuklemeIlcesi,teslim_ili:locations.teslimIli,teslim_ilcesi:locations.teslimIlcesi,distance_km:km,updated_at:new Date().toISOString()},{onConflict:"route_key"});
    if(error) throw error; return {routeKey,km,shared:true};
  }catch(error){console.warn("Rota kilometresi Supabase'e kaydedilemedi; bu tarayıcıda saklandı.",error?.message||error);return {routeKey,km,shared:false};}
}
