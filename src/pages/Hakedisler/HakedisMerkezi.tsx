import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, BadgeCheck, Calculator, CircleAlert, Clock3, Database, FileSpreadsheet, Fuel, RefreshCw, Search, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { formatAuditTime, HAKEDIS_MODULES, readHakedisAudit, type HakedisAuditEntry } from "./shared/hakedisOps";
import "./HakedisMerkezi.css";

type Props = { onNavigate: (page: string) => void };
type ModuleHealth = { state: "ready" | "empty" | "neutral" | "error"; detail: string };

const iconFor = (group: string) => group === "Yakıt" ? Fuel : group === "Finans" ? FileSpreadsheet : Truck;

export default function HakedisMerkezi({ onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [audit, setAudit] = useState<HakedisAuditEntry[]>(() => readHakedisAudit());
  const [health, setHealth] = useState<Record<string, ModuleHealth>>({});
  const [loading, setLoading] = useState(false);

  const refreshHealth = useCallback(async () => {
    setLoading(true);
    const next: Record<string, ModuleHealth> = {};
    await Promise.all(HAKEDIS_MODULES.map(async (module) => {
      const tables = module.tables || [];
      if (!tables.length) { next[module.label] = { state: "neutral", detail: "Ekran içi veri akışı" }; return; }
      try {
        const counts = await Promise.all(tables.map(async (table) => {
          const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
          if (error) throw error;
          return count || 0;
        }));
        const total = counts.reduce((sum, count) => sum + count, 0);
        next[module.label] = total > 0 ? { state: "ready", detail: `${total.toLocaleString("tr-TR")} kayıt hazır` } : { state: "empty", detail: "Veri bekleniyor" };
      } catch {
        next[module.label] = { state: "error", detail: "Durum okunamadı" };
      }
    }));
    setHealth(next); setLoading(false);
  }, []);

  useEffect(() => { refreshHealth(); }, [refreshHealth]);
  useEffect(() => {
    const update = () => setAudit(readHakedisAudit());
    window.addEventListener("fts:hakedis-audit", update);
    return () => window.removeEventListener("fts:hakedis-audit", update);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return q ? HAKEDIS_MODULES.filter((m) => `${m.label} ${m.group} ${m.description}`.toLocaleLowerCase("tr-TR").includes(q)) : HAKEDIS_MODULES;
  }, [query]);

  const stats = useMemo(() => ({
    ready: Object.values(health).filter((item) => item.state === "ready").length,
    recent: audit.filter((item) => Date.now() - new Date(item.at).getTime() < 24 * 60 * 60 * 1000).length,
    exports: audit.filter((item) => item.kind === "export").length,
  }), [health, audit]);

  return <main className="hakedis-center premium-page-enter">
    <section className="hakedis-center-hero">
      <div><span className="hakedis-center-kicker"><Sparkles size={13}/> HAKEDİŞ OPERATIONS SUITE</span><h1>Hakediş Merkezi</h1><p>Yakıt, sefer, masraf ve cari hakedişlerini tek merkezden yönetin; veri hazırlığını, son işlemleri ve modül durumlarını takip edin.</p></div>
      <div className="hakedis-center-health"><span className="pulse"/><div><b>Sistem aktif</b><small>{stats.ready} modülde veri hazır</small></div><button type="button" onClick={refreshHealth} disabled={loading} title="Durumları yenile"><RefreshCw size={16} className={loading ? "spin" : ""}/></button></div>
    </section>

    <section className="hakedis-center-stats">
      <article><span><Database size={18}/></span><div><b>{stats.ready}</b><small>Verisi hazır modül</small></div></article>
      <article><span><Activity size={18}/></span><div><b>{stats.recent}</b><small>Son 24 saat işlemi</small></div></article>
      <article><span><FileSpreadsheet size={18}/></span><div><b>{stats.exports}</b><small>Kaydedilen çıktı işlemi</small></div></article>
      <article><span><ShieldCheck size={18}/></span><div><b>Ön kontrol</b><small>Her modülde aktif</small></div></article>
    </section>

    <section className="hakedis-center-toolbar"><div className="hakedis-center-search"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Hakediş ekranı ara…"/></div><span><Calculator size={14}/> Ctrl + Shift + P: Ön kontrol</span></section>

    <section className="hakedis-center-grid">{filtered.map((module) => {
      const Icon = iconFor(module.group); const status = health[module.label] || { state: "neutral", detail: "Kontrol ediliyor" };
      const last = audit.find((entry) => entry.page === module.label);
      return <button type="button" className="hakedis-module-card" key={module.label} onClick={() => onNavigate(module.label)}>
        <div className="hakedis-module-card-top"><span className={`module-icon ${module.group.toLowerCase()}`}><Icon size={20}/></span><span className={`module-status ${status.state}`}>{status.state === "ready" ? <BadgeCheck size={13}/> : status.state === "empty" || status.state === "error" ? <CircleAlert size={13}/> : <Clock3 size={13}/>} {status.detail}</span></div>
        <div className="hakedis-module-card-copy"><small>{module.group}</small><h3>{module.label}</h3><p>{module.description}</p></div>
        <div className="hakedis-module-card-bottom"><span>Son işlem: {formatAuditTime(last?.at)}</span><ArrowRight size={17}/></div>
      </button>;
    })}</section>

    <section className="hakedis-center-recent"><header><div><span>İŞLEM GEÇMİŞİ</span><h2>Son hareketler</h2></div><small>Bu cihazdaki son 180 hakediş hareketi tutulur.</small></header>{audit.length ? <div className="hakedis-audit-list">{audit.slice(0, 10).map((entry) => <button type="button" key={entry.id} onClick={() => onNavigate(entry.page)}><span className={`audit-dot ${entry.kind}`}/><div><b>{entry.action}</b><small>{entry.page}{entry.detail ? ` • ${entry.detail}` : ""}</small></div><time>{formatAuditTime(entry.at)}</time></button>)}</div> : <div className="hakedis-empty-audit">Henüz hakediş işlemi kaydedilmedi. Bir modülü açtığınızda geçmiş burada görünür.</div>}</section>
  </main>;
}
