export type HakedisAuditKind = "page" | "upload" | "calculate" | "export" | "save" | "delete" | "approve" | "action";

export type HakedisAuditEntry = {
  id: string;
  at: string;
  page: string;
  action: string;
  detail?: string;
  kind: HakedisAuditKind;
  user?: string;
};

export type HakedisModuleConfig = {
  label: string;
  description: string;
  group: "Finans" | "Yakıt" | "Operasyon";
  tables?: string[];
  formula?: string[];
  tips?: string[];
};

export const HAKEDIS_AUDIT_KEY = "fts_hakedis_audit_v1";

export const HAKEDIS_MODULES: HakedisModuleConfig[] = [
  {
    label: "Araç Cari & Fiyat",
    description: "Araç cari kartları, fiyat tanımları ve maliyet parametreleri.",
    group: "Finans",
    tables: ["arac_cari_ve_fiyat", "arac_fiyat_yonetimi"],
    tips: ["Plaka ve cari eşleşmesini kontrol edin.", "Fiyat başlangıç/bitiş tarihlerini çakıştırmayın."],
  },
  {
    label: "Tedarikçi Masraf",
    description: "Tedarikçi masrafları, onay akışı ve REEL aktarımı.",
    group: "Finans",
    tables: ["tedarikci_masraflar"],
    tips: ["Bedel ve sefer numarası alanlarını doğrulayın.", "Onay öncesi açıklama ve tedarikçi bilgisini kontrol edin."],
  },
  {
    label: "Hakediş Seferleri",
    description: "Sefer kira ve sürücü maliyetlerinin hesaplanması ve aktarımı.",
    group: "Operasyon",
    formula: ["Sefer bazlı kira ve sürücü maliyetleri çalışma günü ve tanımlı aylık değerlerden hesaplanır.", "TMS/REEL aktarımı öncesi TMSDespatchId ve sefer numarası eşleşmesi kontrol edilmelidir."],
  },
  {
    label: "Hamaliye",
    description: "Hamaliye kayıtları, toplu içe/dışa aktarma ve kayıt yönetimi.",
    group: "Operasyon",
    tables: ["hamaliye"],
    tips: ["Plaka formatlarını normalize edin.", "Tarih ve tutar alanlarının Excel'de doğru tipte olduğundan emin olun."],
  },
  {
    label: "Filo İskontolu Hakediş",
    description: "Filo iskontolu yakıt hakedişinin adım adım hesaplanması.",
    group: "Yakıt",
    formula: ["İşlem 5 adımlı akış üzerinden yürür: hakediş yükle, TL hesapla, sefer yükle, KM dağıt/sağlama, çıktı al.", "KM dağıtımı sonrası sağlama toplamlarını kontrol edin."],
  },
  {
    label: "Frigo Hesaplama",
    description: "Frigo geçici yakıt ve sefer verileri üzerinde bağımsız hesaplama.",
    group: "Yakıt",
    tables: ["frigo_yakit_tmp", "frigo_sefer_tmp"],
    formula: ["SFR seferlerinde yakıt oranı %37.", "BOS seferlerinde yakıt oranı %30.", "Hesaplama öncesi yakıt ve sefer geçici tablolarının ikisi de dolu olmalıdır."],
  },
  {
    label: "Frigo Yakıt Hakediş",
    description: "Frigo yakıt/sefer dosyaları, önizleme ve hakediş çıktıları.",
    group: "Yakıt",
    tables: ["frigo_yakit_tmp", "frigo_sefer_tmp"],
    formula: ["SFR seferlerinde yakıt oranı %37.", "BOS seferlerinde yakıt oranı %30.", "Sefer hakedişleri ile özet veri çıktıları ayrı alınabilir."],
  },
  {
    label: "Pepsi Yakıt Hakediş",
    description: "Pepsi yakıt ve sefer verilerinden müşteri bazlı hakediş hesaplama.",
    group: "Yakıt",
    formula: ["PEPSİ-COLA SERVİS VE DAĞITIM LİMİTED ŞİRKETİ için oran %38.", "Diğer müşteriler için oran %37."],
  },
  {
    label: "Hayat Kimya Yakıt Hakediş",
    description: "Hayat Kimya yakıt/sefer geçici verileri ve hakediş hesaplama akışı.",
    group: "Yakıt",
    tables: ["hayat_kimya_yakit_tmp", "hayat_kimya_sefer_tmp"],
    tips: ["Yakıt ve sefer dosyalarının ikisinin de yüklü olduğunu doğrulayın.", "Sonuç almadan önce önizlemedeki eşleşmeyen satırları kontrol edin."],
  },
  {
    label: "Ebebek Yakıt Hakediş",
    description: "Ebebek yakıt/sefer dosyaları ve hakediş hesaplama çıktıları.",
    group: "Yakıt",
    tips: ["Şablon kolonlarını değiştirmeden dosya yükleyin.", "Hesaplama öncesi yakıt ve sefer önizlemelerini kontrol edin."],
  },
];

export function getHakedisModule(page: string) {
  return HAKEDIS_MODULES.find((module) => module.label === page);
}

export function readHakedisAudit(): HakedisAuditEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HAKEDIS_AUDIT_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function getUserName() {
  try {
    const user = JSON.parse(localStorage.getItem("fts_user") || "null");
    return user?.ad || user?.kullanici || undefined;
  } catch {
    return undefined;
  }
}

export function recordHakedisAudit(entry: Omit<HakedisAuditEntry, "id" | "at" | "user">) {
  const next: HakedisAuditEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    user: getUserName(),
  };
  const entries = [next, ...readHakedisAudit()].slice(0, 180);
  localStorage.setItem(HAKEDIS_AUDIT_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent("fts:hakedis-audit", { detail: next }));
  return next;
}

export function classifyHakedisAction(label: string): HakedisAuditKind {
  const text = label.toLocaleLowerCase("tr-TR");
  if (/hesap|başlat|hesapla/.test(text)) return "calculate";
  if (/indir|excel|çıktı|dışa aktar|export/.test(text)) return "export";
  if (/yükle|içe aktar|dosya seç/.test(text)) return "upload";
  if (/sil|temizle|sıfırla/.test(text)) return "delete";
  if (/onay|reel|aktar/.test(text)) return "approve";
  if (/kaydet|güncelle|ekle/.test(text)) return "save";
  return "action";
}

export function lastAuditForPage(page: string) {
  return readHakedisAudit().find((entry) => entry.page === page);
}

export function formatAuditTime(value?: string) {
  if (!value) return "Henüz işlem yok";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}
