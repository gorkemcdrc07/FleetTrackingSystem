import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Info, RefreshCw, Save, Trash2, X } from "lucide-react";
import "./InteractionFeedback.css";

function normalizeLabel(button) {
  const explicit = button?.getAttribute?.("data-feedback-label");
  if (explicit) return explicit.trim();
  const aria = button?.getAttribute?.("aria-label");
  if (aria) return aria.trim();
  const title = button?.getAttribute?.("title");
  if (title) return title.trim();
  const text = String(button?.innerText || "").replace(/\s+/g, " ").trim();
  return text || "İşlem";
}

function buildMessage(label) {
  const lower = label.toLocaleLowerCase("tr-TR");
  if (/(sil|kaldır|iptal|çıkış)/.test(lower)) return { type: "danger", message: `${label} işlemi başlatıldı.` };
  if (/(kaydet|tamamla|onay|uygula)/.test(lower)) return { type: "success", message: `${label} için değişiklikler uygulanıyor.` };
  if (/(yenile|güncelle|senkron|analiz)/.test(lower)) return { type: "loading", message: `${label} — veriler güncelleniyor.` };
  if (/(indir|excel|csv|dışa aktar|rapor)/.test(lower)) return { type: "success", message: `${label} hazırlanıyor.` };
  if (/(aç|göster|detay|harita|playback|geofence|alarm|panel|dashboard|sefer|araç)/.test(lower)) return { type: "info", message: `${label} açılıyor.` };
  return { type: "info", message: `${label} işlemi başlatıldı.` };
}

export default function InteractionFeedback() {
  const [toasts, setToasts] = useState([]);
  const iconMap = useMemo(() => ({ success: CheckCircle2, danger: Trash2, loading: RefreshCw, info: Info }), []);

  useEffect(() => {
    const enrichButtons = (root = document) => {
      root.querySelectorAll?.("button").forEach((button) => {
        if (button.closest(".leaflet-control") || button.dataset.feedback === "off") return;
        if (!button.getAttribute("title")) {
          const hint = normalizeLabel(button);
          if (hint && hint.length <= 58) button.setAttribute("title", hint);
        }
      });
    };
    enrichButtons();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) enrichButtons(node);
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true });

    let lastAt = 0;
    let lastLabel = "";

    const onClick = (event) => {
      const target = event.target instanceof Element ? event.target.closest("button") : null;
      if (!target || target.disabled || target.dataset.feedback === "off") return;
      if (target.closest(".leaflet-control") || target.classList.contains("leaflet-control-zoom-in") || target.classList.contains("leaflet-control-zoom-out")) return;

      const label = normalizeLabel(target);
      const now = Date.now();
      if (label === lastLabel && now - lastAt < 450) return;
      lastAt = now;
      lastLabel = label;

      const payload = buildMessage(label);
      const id = `${now}-${Math.random().toString(36).slice(2)}`;
      setToasts((items) => [...items.slice(-2), { id, label, ...payload }]);
      window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), payload.type === "loading" ? 2200 : 1900);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="premium-feedback-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type] || Info;
        return (
          <div key={toast.id} className={`premium-feedback-toast ${toast.type}`}>
            <span className="premium-feedback-icon"><Icon size={17} className={toast.type === "loading" ? "premium-feedback-spin" : ""} /></span>
            <div><strong>{toast.label}</strong><small>{toast.message}</small></div>
            <button data-feedback="off" type="button" aria-label="Bildirimi kapat" onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))}><X size={14} /></button>
          </div>
        );
      })}
    </div>
  );
}
