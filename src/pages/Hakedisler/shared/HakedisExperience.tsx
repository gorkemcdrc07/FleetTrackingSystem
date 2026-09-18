import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, ArrowLeft, Calculator, CheckCircle2, ClipboardCheck, FileSearch, Info, X } from "lucide-react";
import { supabase } from "../../../supabaseClient";
import { classifyHakedisAction, formatAuditTime, getHakedisModule, lastAuditForPage, recordHakedisAudit } from "./hakedisOps";
import "./HakedisExperience.css";

type Props = { page: string; onNavigate: (page: string) => void; children: ReactNode };
type Check = { label: string; state: "ok" | "warn" | "loading"; detail: string };

export default function HakedisExperience({ page, onNavigate, children }: Props) {
  const module = useMemo(() => getHakedisModule(page), [page]);
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [rowMode, setRowMode] = useState(false);
  const [rowDetail, setRowDetail] = useState<{ title: string; cells: string[] } | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [lastAction, setLastAction] = useState(() => lastAuditForPage(page));

  useEffect(() => {
    const entry = recordHakedisAudit({ page, action: "Ekran açıldı", kind: "page" });
    setLastAction(entry);
    const update = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.page === page) setLastAction(detail);
    };
    window.addEventListener("fts:hakedis-audit", update);
    return () => window.removeEventListener("fts:hakedis-audit", update);
  }, [page]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "h") {
        event.preventDefault();
        onNavigate("Hakediş Merkezi");
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setPreflightOpen(true);
      }
      if (event.key === "Escape") {
        setPreflightOpen(false); setFormulaOpen(false); setRowDetail(null); setRowMode(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNavigate]);

  useEffect(() => {
    if (!preflightOpen) return;
    let cancelled = false;
    const run = async () => {
      const initial: Check[] = [
        { label: "Kullanıcı oturumu", state: localStorage.getItem("fts_user") ? "ok" : "warn", detail: localStorage.getItem("fts_user") ? "Aktif FTS oturumu bulundu." : "Aktif kullanıcı bilgisi bulunamadı." },
        { label: "Tarayıcı bağlantısı", state: navigator.onLine ? "ok" : "warn", detail: navigator.onLine ? "Tarayıcı çevrimiçi." : "Tarayıcı çevrimdışı görünüyor." },
      ];
      const tables = module?.tables || [];
      if (!tables.length) {
        initial.push({ label: "Ekran içi veri kontrolü", state: "ok", detail: "Bu modül dosya/ekran içi doğrulamalarını kendi iş akışında yapıyor." });
        if (!cancelled) setChecks(initial);
        return;
      }
      setChecks([...initial, ...tables.map((table) => ({ label: table, state: "loading" as const, detail: "Kontrol ediliyor…" }))]);
      const results = await Promise.all(tables.map(async (table) => {
        const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
        if (error) return { label: table, state: "warn" as const, detail: `Tablo okunamadı: ${error.message}` };
        return { label: table, state: (count || 0) > 0 ? "ok" as const : "warn" as const, detail: `${count || 0} kayıt bulundu.` };
      }));
      if (!cancelled) setChecks([...initial, ...results]);
    };
    run();
    return () => { cancelled = true; };
  }, [preflightOpen, module]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const button = target.closest("button,[role='button']") as HTMLElement | null;
    if (button && !button.closest(".hakedis-experience-bar,.hakedis-experience-drawer")) {
      const label = (button.getAttribute("aria-label") || button.getAttribute("title") || button.textContent || "İşlem").trim().replace(/\s+/g, " ").slice(0, 90);
      if (label) recordHakedisAudit({ page, action: label, kind: classifyHakedisAction(label) });
    }
    if (!rowMode || target.closest("button,a,input,select,textarea,[role='button']")) return;
    const row = target.closest("tr,[role='row']") as HTMLElement | null;
    if (!row || row.querySelector("th,[role='columnheader']")) return;
    const cells = Array.from(row.querySelectorAll("td,[role='cell'],[role='gridcell']")).map((cell) => (cell.textContent || "").trim()).filter(Boolean);
    if (cells.length) setRowDetail({ title: `${page} • Satır analizi`, cells });
  };

  const handleChange = (event: React.ChangeEvent<HTMLDivElement>) => {
    const input = event.target as HTMLInputElement;
    if (input?.type === "file" && input.files?.length) {
      const file = input.files[0];
      recordHakedisAudit({ page, action: "Dosya seçildi", kind: "upload", detail: `${file.name} • ${(file.size / 1024).toFixed(0)} KB` });
    }
  };

  return (
    <div className="hakedis-experience" onClick={handleClick} onChange={handleChange}>
      <div className="hakedis-experience-bar">
        <div className="hakedis-experience-title">
          <button type="button" className="hxp-icon-button" onClick={() => onNavigate("Hakediş Merkezi")} title="Hakediş Merkezi"><ArrowLeft size={16}/></button>
          <div><span>HAKEDİŞ ÇALIŞMA ALANI</span><strong>{page}</strong></div>
        </div>
        <div className="hakedis-experience-status"><Activity size={14}/><span>Son işlem: {formatAuditTime(lastAction?.at)}</span></div>
        <div className="hakedis-experience-actions">
          <button type="button" onClick={() => setPreflightOpen(true)}><ClipboardCheck size={15}/> Ön Kontrol</button>
          <button type="button" onClick={() => setFormulaOpen(true)}><Calculator size={15}/> Hesaplama Mantığı</button>
          <button type="button" className={rowMode ? "is-active" : ""} onClick={() => setRowMode((v) => !v)}><FileSearch size={15}/> Satır Analizi</button>
        </div>
      </div>
      {rowMode && <div className="hakedis-row-mode-note"><Info size={14}/> Satır analizi açık. Bir sonuç satırına tıklayarak hücre detaylarını inceleyebilirsiniz.</div>}
      {children}

      {preflightOpen && <div className="hakedis-experience-overlay" onMouseDown={(e) => { if (e.currentTarget === e.target) setPreflightOpen(false); }}>
        <aside className="hakedis-experience-drawer">
          <header><div><span>GÜVENLİ ÇALIŞTIRMA</span><h3>Ön Kontrol</h3></div><button type="button" onClick={() => setPreflightOpen(false)}><X size={18}/></button></header>
          <p>Hesaplama veya aktarım öncesi temel veri hazırlığını kontrol eder.</p>
          <div className="hxp-check-list">{checks.map((check) => <div className={`hxp-check ${check.state}`} key={check.label}>{check.state === "ok" ? <CheckCircle2 size={18}/> : <Info size={18}/>}<div><strong>{check.label}</strong><small>{check.detail}</small></div></div>)}</div>
          {(module?.tips?.length || 0) > 0 && <div className="hxp-tip-box"><strong>Kontrol notları</strong>{module?.tips?.map((tip) => <span key={tip}>• {tip}</span>)}</div>}
        </aside>
      </div>}

      {formulaOpen && <div className="hakedis-experience-overlay" onMouseDown={(e) => { if (e.currentTarget === e.target) setFormulaOpen(false); }}>
        <aside className="hakedis-experience-drawer">
          <header><div><span>ŞEFFAF HESAPLAMA</span><h3>Hesaplama Mantığı</h3></div><button type="button" onClick={() => setFormulaOpen(false)}><X size={18}/></button></header>
          <p>{module?.description || "Bu ekranın mevcut iş kuralları korunarak çalıştırılır."}</p>
          <div className="hxp-formula-list">{(module?.formula?.length ? module.formula : ["Bu modülde hesaplama kuralları ekranın mevcut iş mantığından aynen korunur.", "Çıktı almadan önce ön kontrol ve sonuç toplamlarını karşılaştırın."]).map((line, i) => <div key={line}><b>{i + 1}</b><span>{line}</span></div>)}</div>
        </aside>
      </div>}

      {rowDetail && <div className="hakedis-experience-overlay" onMouseDown={(e) => { if (e.currentTarget === e.target) setRowDetail(null); }}>
        <aside className="hakedis-experience-drawer hxp-row-drawer">
          <header><div><span>SONUÇ İNCELEME</span><h3>{rowDetail.title}</h3></div><button type="button" onClick={() => setRowDetail(null)}><X size={18}/></button></header>
          <p>Seçtiğiniz satırdaki değerler, hesaplama sonucunu kontrol etmeyi kolaylaştırmak için aşağıda özetlendi.</p>
          <div className="hxp-row-values">{rowDetail.cells.map((cell, index) => <div key={`${index}-${cell}`}><span>Alan {index + 1}</span><strong>{cell}</strong></div>)}</div>
        </aside>
      </div>}
    </div>
  );
}
