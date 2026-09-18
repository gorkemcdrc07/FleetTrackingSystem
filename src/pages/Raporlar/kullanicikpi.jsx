import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import {
    Activity, ChevronDown, ChevronUp, Clock3, Database, Download, FilterX,
    History, RefreshCw, Route, Search, ShieldCheck, Target, Truck, Users
} from "lucide-react";
import "./kullanicikpi.css";

const PAGE_SIZE = 1000;
const DISPLAY_OPTIONS = [25, 50, 100, 200];

function fmtDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("tr-TR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit", second:"2-digit" });
}

function getActionLabel(type) {
    const map = {
        SEFER_DETAY_ACMA:"Detay Açtı", ETA_ACMA:"ETA Açtı", TONAJ_BUTON:"Tonaj İşlemi", IKAZ_BUTON:"İkaz İşlemi",
        SEFER_DETAY_GUNCELLEME:"Sefer Detayı Güncelledi", ROTA_SIRASI_VE_DETAY_GUNCELLEME:"Rota Sırası / Detay Güncelledi",
        ARAC_EKLEME:"Araç Ekledi", ARAC_DUZENLEME:"Araç Düzenledi", ARAC_IZIN_EKLEME:"İzin Ekledi", ARAC_IZIN_SILME:"İzin Sildi",
        ARAC_KESINTI_EKLEME:"Kesinti Ekledi", ARAC_KESINTI_SILME:"Kesinti Sildi", ARAC_ISTEN_CIKARTMA:"Araç Çıkarttı",
        ARAC_ANA_LISTEYE_ALMA:"Ana Listeye Aldı"
    };
    return map[type] || type || "Bilinmeyen İşlem";
}

function getCategory(type="") {
    const t=String(type);
    if (t.startsWith("ARAC_")) return "Araç";
    if (t.includes("SEFER") || t.includes("ROTA") || t.includes("ETA") || t.includes("TONAJ") || t.includes("IKAZ")) return "Sefer";
    return "Diğer";
}

function compactValue(v) {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "object") {
        try { return JSON.stringify(v); } catch { return String(v); }
    }
    return String(v);
}

export default function KullaniciKPI() {
    const [logs,setLogs]=useState([]);
    const [loading,setLoading]=useState(true);
    const [error,setError]=useState("");
    const [days,setDays]=useState("7");
    const [selectedUser,setSelectedUser]=useState("Tümü");
    const [selectedType,setSelectedType]=useState("Tümü");
    const [selectedCategory,setSelectedCategory]=useState("Tümü");
    const [search,setSearch]=useState("");
    const [expanded,setExpanded]=useState(new Set());
    const [page,setPage]=useState(1);
    const [pageSize,setPageSize]=useState(() => Number(localStorage.getItem("fts_kpi_page_size")) || 50);

    useEffect(()=>{ loadLogs(); },[days]);
    useEffect(()=>{ localStorage.setItem("fts_kpi_page_size",String(pageSize)); setPage(1); },[pageSize]);

    async function loadLogs(){
        setLoading(true); setError("");
        try{
            const since=new Date(); since.setDate(since.getDate()-Number(days));
            let from=0; let all=[];
            while(true){
                const {data,error}=await supabase.from("kullanici_islem_loglari").select("*")
                    .gte("created_at",since.toISOString()).order("created_at",{ascending:false}).range(from,from+PAGE_SIZE-1);
                if(error) throw error;
                const rows=data||[]; all=all.concat(rows);
                if(rows.length<PAGE_SIZE) break;
                from += PAGE_SIZE;
            }
            setLogs(all); setPage(1);
        }catch(e){ console.error("KPI logları alınamadı:",e); setLogs([]); setError(e?.message || "İşlem logları alınamadı."); }
        finally{ setLoading(false); }
    }

    const users=useMemo(()=>["Tümü",...Array.from(new Set(logs.map(x=>x.kullanici||x.kullanici_ad).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"tr"))],[logs]);
    const types=useMemo(()=>["Tümü",...Array.from(new Set(logs.map(x=>x.islem_tipi).filter(Boolean))).sort()],[logs]);

    const filteredLogs=useMemo(()=>logs.filter(log=>{
        const user=log.kullanici||log.kullanici_ad||"Bilinmeyen";
        if(selectedUser!=="Tümü"&&user!==selectedUser) return false;
        if(selectedType!=="Tümü"&&log.islem_tipi!==selectedType) return false;
        if(selectedCategory!=="Tümü"&&getCategory(log.islem_tipi)!==selectedCategory) return false;
        const q=search.trim().toLocaleLowerCase("tr-TR");
        if(q){
            let detailText=""; try{detailText=JSON.stringify(log.detay||{});}catch{}
            const text=[user,log.islem_tipi,getActionLabel(log.islem_tipi),log.islem_aciklama,log.sefer_no,log.plaka,log.tablo_adi,detailText]
                .filter(Boolean).join(" ").toLocaleLowerCase("tr-TR");
            if(!text.includes(q)) return false;
        }
        return true;
    }),[logs,selectedUser,selectedType,selectedCategory,search]);

    const summary=useMemo(()=>{
        const total=filteredLogs.length;
        const uniqueUsers=new Set(filteredLogs.map(x=>x.kullanici||x.kullanici_ad).filter(Boolean)).size;
        const sefer=filteredLogs.filter(x=>getCategory(x.islem_tipi)==="Sefer").length;
        const arac=filteredLogs.filter(x=>getCategory(x.islem_tipi)==="Araç").length;
        const changes=filteredLogs.filter(x=>Array.isArray(x.detay?.degisen_alanlar)&&x.detay.degisen_alanlar.length).length;
        const targets=new Set(filteredLogs.flatMap(x=>[x.sefer_no,x.plaka].filter(Boolean))).size;
        return {total,uniqueUsers,sefer,arac,changes,targets};
    },[filteredLogs]);

    const userStats=useMemo(()=>{
        const map=new Map();
        filteredLogs.forEach(log=>{
            const user=log.kullanici||log.kullanici_ad||"Bilinmeyen";
            if(!map.has(user)) map.set(user,{kullanici:user,toplam:0,sefer:0,arac:0,degisiklik:0,sonIslem:null});
            const item=map.get(user); item.toplam++;
            if(getCategory(log.islem_tipi)==="Sefer") item.sefer++;
            if(getCategory(log.islem_tipi)==="Araç") item.arac++;
            if(log.detay?.degisen_alanlar?.length) item.degisiklik++;
            if(!item.sonIslem||new Date(log.created_at)>new Date(item.sonIslem)) item.sonIslem=log.created_at;
        });
        return [...map.values()].sort((a,b)=>b.toplam-a.toplam);
    },[filteredLogs]);

    const typeStats=useMemo(()=>{
        const map=new Map(); filteredLogs.forEach(log=>{const k=log.islem_tipi||"BILINMEYEN";map.set(k,(map.get(k)||0)+1)});
        return [...map.entries()].map(([type,count])=>({type,count})).sort((a,b)=>b.count-a.count);
    },[filteredLogs]);

    const pageCount=Math.max(1,Math.ceil(filteredLogs.length/pageSize));
    const safePage=Math.min(page,pageCount);
    const visibleLogs=filteredLogs.slice((safePage-1)*pageSize,safePage*pageSize);

    function resetFilters(){ setSelectedUser("Tümü"); setSelectedType("Tümü"); setSelectedCategory("Tümü"); setSearch(""); setPage(1); }
    function toggleExpanded(id){ setExpanded(prev=>{const next=new Set(prev); next.has(id)?next.delete(id):next.add(id); return next;}); }
    function exportCsv(){
        if(!filteredLogs.length) return;
        const rows=[["Tarih","Kullanıcı","Kategori","İşlem","Açıklama","Sefer No","Plaka","Tablo","Detay"]];
        filteredLogs.forEach(log=>rows.push([fmtDate(log.created_at),log.kullanici||log.kullanici_ad||"Bilinmeyen",getCategory(log.islem_tipi),getActionLabel(log.islem_tipi),log.islem_aciklama||"",log.sefer_no||"",log.plaka||"",log.tablo_adi||"",compactValue(log.detay)]));
        const csv="\uFEFF"+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";")).join("\n");
        const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"})); const a=document.createElement("a"); a.href=url; a.download=`kullanici_islem_loglari_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
    }

    return <div className="kpi-page kpi-audit-modern">
        <header className="kpi-command-header">
            <div className="kpi-command-copy"><span className="kpi-eyebrow">DENETİM / KULLANICI AKTİVİTESİ</span><h1>Kullanıcı KPI & İşlem Günlüğü</h1><p>Kimin, ne zaman, hangi sefer veya araç üzerinde ne yaptığını ayrıntılı izleyin. Seçili dönemdeki tüm loglar sayfalı olarak korunur.</p></div>
            <div className="kpi-command-actions"><button className="kpi-btn secondary" onClick={exportCsv} disabled={!filteredLogs.length}><Download size={16}/> Tüm logları CSV</button><button className="kpi-btn primary" onClick={loadLogs} disabled={loading}><RefreshCw size={16} className={loading?"spin":""}/> {loading?"Yükleniyor":"Yenile"}</button></div>
        </header>

        {error && <div className="kpi-error"><ShieldCheck size={18}/><div><strong>Loglar alınamadı</strong><span>{error}</span></div></div>}

        <section className="kpi-audit-toolbar">
            <label className="kpi-search-wide"><Search size={17}/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Kullanıcı, işlem, plaka, sefer, açıklama veya detay ara..."/></label>
            <select value={days} onChange={e=>setDays(e.target.value)}><option value="1">Son 1 gün</option><option value="7">Son 7 gün</option><option value="30">Son 30 gün</option><option value="90">Son 90 gün</option><option value="365">Son 1 yıl</option></select>
            <select value={selectedCategory} onChange={e=>{setSelectedCategory(e.target.value);setPage(1)}}><option>Tümü</option><option>Sefer</option><option>Araç</option><option>Diğer</option></select>
            <select value={selectedUser} onChange={e=>{setSelectedUser(e.target.value);setPage(1)}}>{users.map(x=><option key={x}>{x}</option>)}</select>
            <select value={selectedType} onChange={e=>{setSelectedType(e.target.value);setPage(1)}}>{types.map(x=><option key={x} value={x}>{x==="Tümü"?"Tüm işlemler":getActionLabel(x)}</option>)}</select>
            <button className="kpi-btn secondary" onClick={resetFilters}><FilterX size={16}/> Temizle</button>
        </section>

        <section className="kpi-cards kpi-cards-six">
            <article className="kpi-card"><div className="kpi-card-icon"><History size={18}/></div><span>Toplam Log</span><strong>{summary.total}</strong><small>Filtrelenmiş işlem</small></article>
            <article className="kpi-card"><div className="kpi-card-icon"><Users size={18}/></div><span>Aktif Kullanıcı</span><strong>{summary.uniqueUsers}</strong><small>İşlem yapan kişi</small></article>
            <article className="kpi-card"><div className="kpi-card-icon"><Route size={18}/></div><span>Sefer İşlemi</span><strong>{summary.sefer}</strong><small>Rota / ETA / detay</small></article>
            <article className="kpi-card"><div className="kpi-card-icon"><Truck size={18}/></div><span>Araç İşlemi</span><strong>{summary.arac}</strong><small>Araç / izin / kesinti</small></article>
            <article className="kpi-card"><div className="kpi-card-icon"><Activity size={18}/></div><span>Alan Değişikliği</span><strong>{summary.changes}</strong><small>Önce → sonra kaydı</small></article>
            <article className="kpi-card"><div className="kpi-card-icon"><Target size={18}/></div><span>Etkilenen Hedef</span><strong>{summary.targets}</strong><small>Sefer / plaka</small></article>
        </section>

        <div className="kpi-grid kpi-overview-grid">
            <section className="kpi-panel"><div className="panel-head"><div><h2>Kullanıcı Performans Özeti</h2><small>Kullanıcıya tıklayarak loglarını filtreleyin.</small></div><span>{userStats.length} kullanıcı</span></div>
                <div className="kpi-table-wrap"><table className="kpi-table"><thead><tr><th>Kullanıcı</th><th>Toplam</th><th>Sefer</th><th>Araç</th><th>Değişiklik</th><th>Son İşlem</th></tr></thead><tbody>{userStats.map(item=><tr key={item.kullanici} className="kpi-click-row" onClick={()=>{setSelectedUser(item.kullanici);setPage(1)}}><td><strong>{item.kullanici}</strong></td><td>{item.toplam}</td><td>{item.sefer}</td><td>{item.arac}</td><td>{item.degisiklik}</td><td>{fmtDate(item.sonIslem)}</td></tr>)}{!loading&&!userStats.length&&<tr><td colSpan="6">Kayıt bulunamadı.</td></tr>}</tbody></table></div>
            </section>
            <section className="kpi-panel"><div className="panel-head"><div><h2>İşlem Dağılımı</h2><small>En sık yapılan işlemler</small></div><span>{typeStats.length} tip</span></div><div className="type-list">{typeStats.slice(0,18).map(item=><button className="type-row" key={item.type} onClick={()=>{setSelectedType(item.type);setPage(1)}}><div><strong>{getActionLabel(item.type)}</strong><span>{getCategory(item.type)} · {item.type}</span></div><b>{item.count}</b></button>)}{!loading&&!typeStats.length&&<div className="empty-box">İşlem bulunamadı.</div>}</div></section>
        </div>

        <section className="kpi-panel full kpi-audit-log">
            <div className="panel-head kpi-log-head"><div><h2>Detaylı İşlem Günlüğü</h2><small>Hedef, açıklama, değişen alanlar ve kayıtlı ham detaylar</small></div><div className="kpi-log-meta"><Database size={15}/><span>{filteredLogs.length} kayıt</span></div></div>
            <div className="kpi-log-list">
                {visibleLogs.map(log=>{const changed=Array.isArray(log.detay?.degisen_alanlar)?log.detay.degisen_alanlar:[]; const isOpen=expanded.has(log.id); return <article className={`kpi-log-entry ${isOpen?"open":""}`} key={log.id}>
                    <button className="kpi-log-summary" onClick={()=>toggleExpanded(log.id)}>
                        <div className={`kpi-log-icon ${getCategory(log.islem_tipi).toLowerCase()}`}>{getCategory(log.islem_tipi)==="Araç"?<Truck size={17}/>:getCategory(log.islem_tipi)==="Sefer"?<Route size={17}/>:<Activity size={17}/>}</div>
                        <div className="kpi-log-main"><div><strong>{getActionLabel(log.islem_tipi)}</strong><span className="kpi-category">{getCategory(log.islem_tipi)}</span></div><p>{log.islem_aciklama||"İşlem açıklaması kaydedilmemiş."}</p><div className="kpi-log-tags">{log.sefer_no&&<span>Sefer · {log.sefer_no}</span>}{log.plaka&&<span>Plaka · {log.plaka}</span>}{log.tablo_adi&&<span>Tablo · {log.tablo_adi}</span>}{changed.length>0&&<span className="changed">{changed.length} alan değişti</span>}</div></div>
                        <div className="kpi-log-who"><strong>{log.kullanici||log.kullanici_ad||"Bilinmeyen"}</strong><span><Clock3 size={12}/>{fmtDate(log.created_at)}</span></div>{isOpen?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</button>
                    {isOpen&&<div className="kpi-log-detail">
                        <div className="kpi-detail-grid"><div><span>Kullanıcı</span><strong>{log.kullanici||log.kullanici_ad||"Bilinmeyen"}</strong></div><div><span>İşlem kodu</span><strong>{log.islem_tipi||"—"}</strong></div><div><span>Sefer no</span><strong>{log.sefer_no||"—"}</strong></div><div><span>Plaka</span><strong>{log.plaka||"—"}</strong></div><div><span>Tablo</span><strong>{log.tablo_adi||"—"}</strong></div><div><span>Zaman</span><strong>{fmtDate(log.created_at)}</strong></div></div>
                        {changed.length>0&&<div className="kpi-change-list"><h4>Değişen Alanlar</h4>{changed.map((x,i)=><div className="kpi-change-row" key={i}><strong>{x.nokta||x.alan||`Alan ${i+1}`}</strong><span>{x.alan&&`${x.alan}: `}{compactValue(x.eski_deger)} <b>→</b> {compactValue(x.yeni_deger)}</span></div>)}</div>}
                        {log.detay?.sira_degisikligi&&<div className="kpi-route-change"><Route size={16}/><div><strong>Rota sırası değiştirildi</strong><pre>{compactValue(log.detay.sira_degisikligi)}</pre></div></div>}
                        {log.detay&&<details className="kpi-raw-detail"><summary>Ham log detayını göster</summary><pre>{JSON.stringify(log.detay,null,2)}</pre></details>}
                    </div>}
                </article>})}
                {!loading&&!visibleLogs.length&&<div className="empty-box">Seçili filtrelerde işlem bulunamadı.</div>}
            </div>
            <footer className="kpi-pagination"><span>{filteredLogs.length?`${(safePage-1)*pageSize+1}–${Math.min(safePage*pageSize,filteredLogs.length)} / ${filteredLogs.length}`:"0 kayıt"}</span><label>Sayfa başına <select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}>{DISPLAY_OPTIONS.map(x=><option key={x}>{x}</option>)}</select></label><button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Önceki</button><b>{safePage} / {pageCount}</b><button disabled={safePage>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))}>Sonraki</button></footer>
        </section>
    </div>;
}
