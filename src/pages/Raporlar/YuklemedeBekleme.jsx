import { useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { supabase } from "../../supabaseClient";
import "./YuklemedeBekleme.css";

dayjs.locale("tr");

const TABLES = [
    { name: "aktif_seferler", label: "Aktif Sefer" },
    { name: "tamamlanan_seferler", label: "Tamamlanan Sefer" },
];

const MIN_WAIT_MINUTES = 240;

const fmtDate = (v) => {
    const d = dayjs(v);
    return d.isValid() ? d.format("DD.MM.YYYY HH:mm") : "—";
};

const minToHM = (m) => {
    const min = Math.max(0, Math.round(Number(m) || 0));
    const h = Math.floor(min / 60);
    const r = min % 60;

    if (h && r) return `${h} sa ${r} dk`;
    if (h) return `${h} sa`;
    if (r) return `${r} dk`;
    return "0 dk";
};

const normalizeRouteDetails = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;

    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    return [];
};

async function fetchAllRowsFromTable(tableName, startDate, endDate) {
    const pageSize = 1000;
    let from = 0;
    let all = [];

    while (true) {
        const { data, error } = await supabase
            .from(tableName)
            .select(`
                id,
                sefer_no,
                sefer_tarihi,
                plaka,
                treyler,
                surucu_ad_soyad,
                musteri_adi,
                proje_adi,
                arac_statu,
                rota_detaylari
            `)
            .not("rota_detaylari", "is", null)
            .gte("sefer_tarihi", startDate)
            .lte("sefer_tarihi", endDate)
            .order("sefer_tarihi", { ascending: false })
            .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        all = all.concat(data);

        if (data.length < pageSize) break;
        from += pageSize;
    }

    return all;
}

async function fetchAllRows(startDate, endDate) {
    let allRows = [];

    for (const table of TABLES) {
        const rows = await fetchAllRowsFromTable(table.name, startDate, endDate);

        allRows = allRows.concat(
            rows.map((row) => ({
                ...row,
                kaynak_tablo: table.name,
                kaynak_tablo_label: table.label,
            }))
        );
    }

    return allRows;
}

function extractLoadingViolations(row) {
    const routeDetails = normalizeRouteDetails(row.rota_detaylari);

    const loadingStops = routeDetails.filter(
        (stop) => String(stop.tip || "").toLowerCase() === "yukleme"
    );

    return loadingStops
        .map((stop, index) => {
            const varis = stop.varis;
            const cikis = stop.cikis;

            if (!varis) return null;

            const varisDate = dayjs(varis);
            if (!varisDate.isValid()) return null;

            let beklemeDk = 0;
            let durum = "Tamamlandı";

            if (cikis && dayjs(cikis).isValid()) {
                beklemeDk = dayjs(cikis).diff(varisDate, "minute");
            } else {
                beklemeDk = dayjs().diff(varisDate, "minute");
                durum = "Yüklemede Bekliyor";
            }

            beklemeDk = Math.max(0, beklemeDk);

            if (beklemeDk < MIN_WAIT_MINUTES) return null;

            return {
                detail_key: `${row.kaynak_tablo}-${row.id || row.sefer_no}-${stop.sira || index}`,
                durum,
                yukleme_sira: stop.sira || index + 1,
                yukleme_noktasi: stop.nokta || "",
                yukleme_ili: stop.il || "",
                yukleme_ilcesi: stop.ilce || "",
                yukleme_varis: varis,
                yukleme_cikis: cikis || null,
                yukleme_varis_input: stop.varisInput || "",
                yukleme_cikis_input: stop.cikisInput || "",
                toplam_bekleme_dk: beklemeDk,
            };
        })
        .filter(Boolean);
}

function buildGroupedRows(rawRows) {
    return rawRows
        .map((row) => {
            const ihlalliYuklemeler = extractLoadingViolations(row);

            if (!ihlalliYuklemeler.length) return null;

            const toplamBeklemeDk = ihlalliYuklemeler.reduce(
                (sum, item) => sum + item.toplam_bekleme_dk,
                0
            );

            const maxBeklemeDk = Math.max(
                ...ihlalliYuklemeler.map((item) => item.toplam_bekleme_dk)
            );

            return {
                unique_key: `${row.kaynak_tablo}-${row.id || row.sefer_no}`,
                kaynak_tablo: row.kaynak_tablo,
                kaynak_tablo_label: row.kaynak_tablo_label,

                id: row.id,
                sefer_no: row.sefer_no,
                sefer_tarihi: row.sefer_tarihi,
                plaka: row.plaka,
                treyler: row.treyler,
                surucu_ad_soyad: row.surucu_ad_soyad,
                musteri_adi: row.musteri_adi,
                proje_adi: row.proje_adi,
                arac_statu: row.arac_statu,

                ihlalli_yukleme_sayisi: ihlalliYuklemeler.length,
                toplam_bekleme_dk: toplamBeklemeDk,
                max_bekleme_dk: maxBeklemeDk,
                detaylar: ihlalliYuklemeler,

                ozet:
                    ihlalliYuklemeler.length === 1
                        ? "1 yükleme noktasında gecikme var"
                        : `${ihlalliYuklemeler.length} yükleme noktasında gecikme var`,
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.max_bekleme_dk - a.max_bekleme_dk);
}

export default function YuklemedeBekleme() {
    const [startDate, setStartDate] = useState(
        dayjs().startOf("month").format("YYYY-MM-DD")
    );
    const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));

    const [rows, setRows] = useState([]);
    const [openRows, setOpenRows] = useState({});
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [error, setError] = useState("");

    const rangeLabel = useMemo(() => {
        return `${dayjs(startDate).format("DD.MM.YYYY")} → ${dayjs(endDate).format("DD.MM.YYYY")}`;
    }, [startDate, endDate]);

    const toggleRow = (key) => {
        setOpenRows((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const fetchViolations = async () => {
        setLoading(true);
        setError("");
        setRows([]);
        setOpenRows({});

        try {
            if (dayjs(endDate).isBefore(dayjs(startDate))) {
                setError("Bitiş tarihi başlangıç tarihinden küçük olamaz.");
                return;
            }

            const data = await fetchAllRows(startDate, endDate);
            const grouped = buildGroupedRows(data);

            setRows(grouped);
        } catch (err) {
            console.error(err);
            setError(err.message || "Veriler alınırken hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;

        return rows.filter((row) => {
            const detailText = row.detaylar
                .map((d) =>
                    [
                        d.yukleme_noktasi,
                        d.yukleme_ili,
                        d.yukleme_ilcesi,
                        d.durum,
                    ]
                        .filter(Boolean)
                        .join(" ")
                )
                .join(" ");

            const text = [
                row.sefer_no,
                row.sefer_tarihi,
                row.plaka,
                row.treyler,
                row.surucu_ad_soyad,
                row.proje_adi,
                row.musteri_adi,
                row.kaynak_tablo_label,
                row.ozet,
                detailText,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return text.includes(q);
        });
    }, [rows, search]);

    const kpis = useMemo(() => {
        const totalViolationTime = rows.reduce(
            (sum, row) => sum + row.toplam_bekleme_dk,
            0
        );

        const activeCount = rows.filter(
            (row) => row.kaynak_tablo === "aktif_seferler"
        ).length;

        const completedCount = rows.filter(
            (row) => row.kaynak_tablo === "tamamlanan_seferler"
        ).length;

        const totalLoadingViolation = rows.reduce(
            (sum, row) => sum + row.ihlalli_yukleme_sayisi,
            0
        );

        return {
            totalTrips: rows.length,
            totalLoadingViolation,
            totalViolationTime,
            avg: totalLoadingViolation ? totalViolationTime / totalLoadingViolation : 0,
            uniquePlates: new Set(rows.map((row) => row.plaka).filter(Boolean)).size,
            activeCount,
            completedCount,
        };
    }, [rows]);

    const exportExcel = async () => {
        if (!rows.length) return;

        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("Yuklemede Bekleme");

        ws.columns = [
            { header: "KAYNAK", key: "kaynak", width: 20 },
            { header: "SEFER NO", key: "sefer_no", width: 16 },
            { header: "SEFER TARİHİ", key: "sefer_tarihi", width: 16 },
            { header: "PLAKA", key: "plaka", width: 14 },
            { header: "TREYLER", key: "treyler", width: 14 },
            { header: "ŞOFÖR", key: "surucu_ad_soyad", width: 24 },
            { header: "PROJE", key: "proje_adi", width: 28 },
            { header: "MÜŞTERİ", key: "musteri_adi", width: 34 },
            { header: "ÖZET", key: "ozet", width: 30 },
            { header: "DURUM", key: "durum", width: 20 },
            { header: "YÜKLEME SIRA", key: "yukleme_sira", width: 14 },
            { header: "YÜKLEME NOKTASI", key: "yukleme_noktasi", width: 32 },
            { header: "YÜKLEME İLİ", key: "yukleme_ili", width: 16 },
            { header: "YÜKLEME İLÇESİ", key: "yukleme_ilcesi", width: 18 },
            { header: "YÜKLEME VARIŞ", key: "yukleme_varis", width: 22 },
            { header: "YÜKLEME ÇIKIŞ", key: "yukleme_cikis", width: 22 },
            { header: "BEKLEME SÜRESİ", key: "bekleme_suresi", width: 18 },
            { header: "BEKLEME DK", key: "bekleme_dk", width: 14 },
        ];

        rows.forEach((row) => {
            row.detaylar.forEach((detail) => {
                ws.addRow({
                    kaynak: row.kaynak_tablo_label,
                    sefer_no: row.sefer_no || "",
                    sefer_tarihi: row.sefer_tarihi
                        ? dayjs(row.sefer_tarihi).format("DD.MM.YYYY")
                        : "",
                    plaka: row.plaka || "",
                    treyler: row.treyler || "",
                    surucu_ad_soyad: row.surucu_ad_soyad || "",
                    proje_adi: row.proje_adi || "",
                    musteri_adi: row.musteri_adi || "",
                    ozet: row.ozet,
                    durum: detail.durum,
                    yukleme_sira: detail.yukleme_sira || "",
                    yukleme_noktasi: detail.yukleme_noktasi || "",
                    yukleme_ili: detail.yukleme_ili || "",
                    yukleme_ilcesi: detail.yukleme_ilcesi || "",
                    yukleme_varis: fmtDate(detail.yukleme_varis),
                    yukleme_cikis: fmtDate(detail.yukleme_cikis),
                    bekleme_suresi: minToHM(detail.toplam_bekleme_dk),
                    bekleme_dk: detail.toplam_bekleme_dk,
                });
            });
        });

        ws.getRow(1).eachCell((cell) => {
            cell.font = { bold: true };
        });

        const buffer = await wb.xlsx.writeBuffer();

        saveAs(
            new Blob([buffer]),
            `yuklemede_bekleme_${dayjs().format("YYYY-MM-DD_HH-mm")}.xlsx`
        );
    };

    return (
        <div className="yb-page">
            <div className="yb-header">
                <div>
                    <span className="yb-eyebrow">Raporlar</span>
                    <h1>Yüklemede Bekleme</h1>
                    <p>
                        Aktif ve tamamlanan seferlerde, <b>sefer_tarihi</b> seçilen aralıkta olan
                        kayıtların <b>rota_detaylari</b> içindeki <b>yükleme</b> duraklarında
                        varış ile çıkış arası <b>4 saat ve üzeri</b> olanları listeler.
                    </p>
                </div>

                <div className="yb-limit-card">
                    <span>İhlal Sınırı</span>
                    <strong>{minToHM(MIN_WAIT_MINUTES)}</strong>
                </div>
            </div>

            <div className="yb-filter-card">
                <div className="yb-filter-grid">
                    <label>
                        <span>Başlangıç Tarihi</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </label>

                    <label>
                        <span>Bitiş Tarihi</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </label>

                    <label>
                        <span>Arama</span>
                        <input
                            type="text"
                            placeholder="Plaka, sefer no, proje ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </label>
                </div>

                <div className="yb-actions">
                    <button onClick={fetchViolations} disabled={loading}>
                        {loading ? "Analiz ediliyor..." : "İhlalleri Getir"}
                    </button>

                    <button className="secondary" onClick={exportExcel} disabled={!rows.length}>
                        Excel İndir
                    </button>

                    <div className="yb-range-pill">{rangeLabel}</div>
                </div>
            </div>

            {error && <div className="yb-alert error">{error}</div>}

            {!loading && !error && rows.length === 0 && (
                <div className="yb-alert success">
                    Seçilen sefer tarihi aralığında 4 saat ve üzeri yüklemede bekleme ihlali bulunamadı.
                </div>
            )}

            {loading && <div className="yb-loading">Veriler kontrol ediliyor...</div>}

            {rows.length > 0 && (
                <>
                    <div className="yb-kpi-grid">
                        <div className="yb-kpi">
                            <span>İhlalli Sefer</span>
                            <strong>{kpis.totalTrips}</strong>
                        </div>

                        <div className="yb-kpi">
                            <span>İhlalli Yükleme Noktası</span>
                            <strong>{kpis.totalLoadingViolation}</strong>
                        </div>

                        <div className="yb-kpi">
                            <span>Aktif Sefer</span>
                            <strong>{kpis.activeCount}</strong>
                        </div>

                        <div className="yb-kpi">
                            <span>Tamamlanan Sefer</span>
                            <strong>{kpis.completedCount}</strong>
                        </div>

                        <div className="yb-kpi">
                            <span>Toplam Bekleme</span>
                            <strong>{minToHM(kpis.totalViolationTime)}</strong>
                        </div>

                        <div className="yb-kpi">
                            <span>Ortalama Nokta Bekleme</span>
                            <strong>{minToHM(kpis.avg)}</strong>
                        </div>
                    </div>

                    <div className="yb-table-card">
                        <div className="yb-table-head">
                            <div>
                                <h2>İhlalli Seferler</h2>
                                <p>
                                    Aynı seferde birden fazla yükleme noktası ihlalliyse ana satırda özet,
                                    detayda her nokta ayrı gösterilir.
                                </p>
                            </div>

                            <span>{filteredRows.length} sefer</span>
                        </div>

                        <div className="yb-table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Detay</th>
                                        <th>Kaynak</th>
                                        <th>Sefer Tarihi</th>
                                        <th>Sefer No</th>
                                        <th>Plaka</th>
                                        <th>Şoför</th>
                                        <th>Proje</th>
                                        <th>Müşteri</th>
                                        <th>Bekleme Özeti</th>
                                        <th>Toplam Bekleme</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredRows.map((row) => (
                                        <>
                                            <tr key={row.unique_key}>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="yb-detail-btn"
                                                        onClick={() => toggleRow(row.unique_key)}
                                                    >
                                                        {openRows[row.unique_key] ? "Gizle" : "Aç"}
                                                    </button>
                                                </td>
                                                <td>
                                                    <span
                                                        className={
                                                            row.kaynak_tablo === "aktif_seferler"
                                                                ? "yb-badge active"
                                                                : "yb-badge completed"
                                                        }
                                                    >
                                                        {row.kaynak_tablo_label}
                                                    </span>
                                                </td>
                                                <td>
                                                    {row.sefer_tarihi
                                                        ? dayjs(row.sefer_tarihi).format("DD.MM.YYYY")
                                                        : "—"}
                                                </td>
                                                <td>{row.sefer_no || "—"}</td>
                                                <td>{row.plaka || "—"}</td>
                                                <td>{row.surucu_ad_soyad || "—"}</td>
                                                <td>{row.proje_adi || "—"}</td>
                                                <td>{row.musteri_adi || "—"}</td>
                                                <td>
                                                    <span className="yb-summary-badge">
                                                        {row.ozet}
                                                    </span>
                                                </td>
                                                <td className="yb-wait">
                                                    {minToHM(row.toplam_bekleme_dk)}
                                                </td>
                                            </tr>

                                            {openRows[row.unique_key] && (
                                                <tr className="yb-detail-row">
                                                    <td colSpan={10}>
                                                        <div className="yb-detail-panel">
                                                            <div className="yb-detail-title">
                                                                {row.sefer_no} yükleme ihlal detayları
                                                            </div>

                                                            <table className="yb-inner-table">
                                                                <thead>
                                                                    <tr>
                                                                        <th>Sıra</th>
                                                                        <th>Durum</th>
                                                                        <th>Yükleme Noktası</th>
                                                                        <th>İl / İlçe</th>
                                                                        <th>Varış</th>
                                                                        <th>Çıkış</th>
                                                                        <th>Bekleme</th>
                                                                    </tr>
                                                                </thead>

                                                                <tbody>
                                                                    {row.detaylar.map((detail) => (
                                                                        <tr key={detail.detail_key}>
                                                                            <td>{detail.yukleme_sira}</td>
                                                                            <td>{detail.durum}</td>
                                                                            <td>{detail.yukleme_noktasi || "—"}</td>
                                                                            <td>
                                                                                {[detail.yukleme_ili, detail.yukleme_ilcesi]
                                                                                    .filter(Boolean)
                                                                                    .join(" / ") || "—"}
                                                                            </td>
                                                                            <td>{fmtDate(detail.yukleme_varis)}</td>
                                                                            <td>{fmtDate(detail.yukleme_cikis)}</td>
                                                                            <td className="yb-wait">
                                                                                {minToHM(detail.toplam_bekleme_dk)}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}