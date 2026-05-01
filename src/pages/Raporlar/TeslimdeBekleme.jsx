import { Fragment, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { supabase } from "../../supabaseClient";
import "./TeslimdeBekleme.css";

dayjs.locale("tr");

const TABLES = [
    { name: "aktif_seferler", label: "Aktif Sefer" },
    { name: "tamamlanan_seferler", label: "Tamamlanan Sefer" },
];

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

const getNextMondayNoon = (arrival) => {
    const day = arrival.day();
    const daysToMonday = day === 0 ? 1 : 8 - day;

    return arrival
        .add(daysToMonday, "day")
        .hour(12)
        .minute(0)
        .second(0)
        .millisecond(0);
};

const calculateDeliveryDeadline = (arrivalValue) => {
    const arrival = dayjs(arrivalValue);

    if (!arrival.isValid()) return null;

    const day = arrival.day();
    const minutes = arrival.hour() * 60 + arrival.minute();
    const noon = 12 * 60;

    if (day === 0) {
        return {
            deadline: getNextMondayNoon(arrival),
            ruleText: "Pazar varışı → Pazartesi 12:00 deadline",
        };
    }

    if (day === 5 && minutes > noon) {
        return {
            deadline: getNextMondayNoon(arrival),
            ruleText: "Cuma 12:00 sonrası varış → Pazartesi 12:00 deadline",
        };
    }

    if (day === 6 && minutes > noon) {
        return {
            deadline: getNextMondayNoon(arrival),
            ruleText: "Cumartesi 12:00 sonrası varış → Pazartesi 12:00 deadline",
        };
    }

    if (minutes <= noon) {
        return {
            deadline: arrival.hour(17).minute(0).second(0).millisecond(0),
            ruleText: "08:30–12:00 arası varış → Aynı gün 17:00 çıkış gerekli",
        };
    }

    return {
        deadline: arrival.add(1, "day").hour(12).minute(0).second(0).millisecond(0),
        ruleText: "12:00 sonrası varış → Ertesi gün 12:00 çıkış gerekli",
    };
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

function extractDeliveryViolations(row) {
    const routeDetails = normalizeRouteDetails(row.rota_detaylari);

    const deliveryStops = routeDetails.filter(
        (stop) => String(stop.tip || "").toLowerCase() === "teslim"
    );

    return deliveryStops
        .map((stop, index) => {
            const varis = stop.varis;
            const cikis = stop.cikis;

            if (!varis) return null;

            const varisDate = dayjs(varis);
            if (!varisDate.isValid()) return null;

            const ruleResult = calculateDeliveryDeadline(varis);
            if (!ruleResult?.deadline?.isValid?.()) return null;

            const deadline = ruleResult.deadline;
            const ruleText = ruleResult.ruleText;

            let actualExit = null;
            let durum = "Tamamlandı";

            if (cikis && dayjs(cikis).isValid()) {
                actualExit = dayjs(cikis);
            } else {
                actualExit = dayjs();
                durum = "Teslimde Bekliyor";
            }

            const gecikmeDk = actualExit.diff(deadline, "minute");

            if (gecikmeDk <= 0) return null;

            const toplamBeklemeDk =
                cikis && dayjs(cikis).isValid()
                    ? Math.max(0, dayjs(cikis).diff(varisDate, "minute"))
                    : Math.max(0, dayjs().diff(varisDate, "minute"));

            return {
                detail_key: `${row.kaynak_tablo}-${row.id || row.sefer_no}-${stop.sira || index}`,
                durum,
                kural_metni: ruleText,

                teslim_sira: stop.sira || index + 1,
                teslim_noktasi: stop.nokta || "",
                teslim_ili: stop.il || "",
                teslim_ilcesi: stop.ilce || "",
                teslim_varis: varis,
                teslim_cikis: cikis || null,
                teslim_varis_input: stop.varisInput || "",
                teslim_cikis_input: stop.cikisInput || "",

                deadline: deadline.toISOString(),
                gecikme_dk: Math.max(0, gecikmeDk),
                toplam_bekleme_dk: toplamBeklemeDk,
            };
        })
        .filter(Boolean);
}

function buildGroupedRows(rawRows) {
    return rawRows
        .map((row) => {
            const ihlalliTeslimler = extractDeliveryViolations(row);

            if (!ihlalliTeslimler.length) return null;

            const toplamGecikmeDk = ihlalliTeslimler.reduce(
                (sum, item) => sum + item.gecikme_dk,
                0
            );

            const maxGecikmeDk = Math.max(
                ...ihlalliTeslimler.map((item) => item.gecikme_dk)
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

                ihlalli_teslim_sayisi: ihlalliTeslimler.length,
                toplam_gecikme_dk: toplamGecikmeDk,
                max_gecikme_dk: maxGecikmeDk,
                detaylar: ihlalliTeslimler,

                ozet:
                    ihlalliTeslimler.length === 1
                        ? "1 teslim noktasında gecikme var"
                        : `${ihlalliTeslimler.length} teslim noktasında gecikme var`,
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.max_gecikme_dk - a.max_gecikme_dk);
}

export default function TeslimdeBekleme() {
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
                        d.teslim_noktasi,
                        d.teslim_ili,
                        d.teslim_ilcesi,
                        d.durum,
                        d.kural_metni,
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
        const totalDelayTime = rows.reduce(
            (sum, row) => sum + row.toplam_gecikme_dk,
            0
        );

        const activeCount = rows.filter(
            (row) => row.kaynak_tablo === "aktif_seferler"
        ).length;

        const completedCount = rows.filter(
            (row) => row.kaynak_tablo === "tamamlanan_seferler"
        ).length;

        const totalDeliveryViolation = rows.reduce(
            (sum, row) => sum + row.ihlalli_teslim_sayisi,
            0
        );

        return {
            totalTrips: rows.length,
            totalDeliveryViolation,
            totalDelayTime,
            avg: totalDeliveryViolation ? totalDelayTime / totalDeliveryViolation : 0,
            uniquePlates: new Set(rows.map((row) => row.plaka).filter(Boolean)).size,
            activeCount,
            completedCount,
        };
    }, [rows]);

    const exportExcel = async () => {
        if (!rows.length) return;

        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("Teslimde Bekleme");

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
            { header: "UYGULANAN KURAL", key: "kural_metni", width: 48 },
            { header: "TESLİM SIRA", key: "teslim_sira", width: 14 },
            { header: "TESLİM NOKTASI", key: "teslim_noktasi", width: 32 },
            { header: "TESLİM İLİ", key: "teslim_ili", width: 16 },
            { header: "TESLİM İLÇESİ", key: "teslim_ilcesi", width: 18 },
            { header: "TESLİM VARIŞ", key: "teslim_varis", width: 22 },
            { header: "DEADLINE", key: "deadline", width: 22 },
            { header: "TESLİM ÇIKIŞ", key: "teslim_cikis", width: 22 },
            { header: "GECİKME SÜRESİ", key: "gecikme_suresi", width: 18 },
            { header: "GECİKME DK", key: "gecikme_dk", width: 14 },
            { header: "TOPLAM BEKLEME", key: "toplam_bekleme", width: 18 },
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
                    kural_metni: detail.kural_metni || "",
                    teslim_sira: detail.teslim_sira || "",
                    teslim_noktasi: detail.teslim_noktasi || "",
                    teslim_ili: detail.teslim_ili || "",
                    teslim_ilcesi: detail.teslim_ilcesi || "",
                    teslim_varis: fmtDate(detail.teslim_varis),
                    deadline: fmtDate(detail.deadline),
                    teslim_cikis: fmtDate(detail.teslim_cikis),
                    gecikme_suresi: minToHM(detail.gecikme_dk),
                    gecikme_dk: detail.gecikme_dk,
                    toplam_bekleme: minToHM(detail.toplam_bekleme_dk),
                });
            });
        });

        ws.getRow(1).eachCell((cell) => {
            cell.font = { bold: true };
        });

        const buffer = await wb.xlsx.writeBuffer();

        saveAs(
            new Blob([buffer]),
            `teslimde_bekleme_${dayjs().format("YYYY-MM-DD_HH-mm")}.xlsx`
        );
    };

    return (
        <div className="tb-page">
            <div className="tb-header">
                <div>
                    <span className="tb-eyebrow">Raporlar</span>
                    <h1>Teslimde Bekleme</h1>
                    <p>
                        Aktif ve tamamlanan seferlerde, <b>sefer_tarihi</b> seçilen aralıkta olan
                        kayıtların <b>rota_detaylari</b> içindeki <b>teslim</b> duraklarında
                        deadline aşımı olanları listeler.
                    </p>
                </div>

                <div className="tb-rule-card">
                    <span>Kural</span>
                    <strong>Deadline Kontrolü</strong>
                </div>
            </div>

            <div className="tb-rules">
                <div>08:30–12:00 arası varış → aynı gün 17:00’ye kadar çıkış gerekli</div>
                <div>12:00 sonrası varış → ertesi gün 12:00’ye kadar çıkış gerekli</div>
                <div>Cuma 12:00 sonrası varış → Pazartesi 12:00 deadline</div>
                <div>Cumartesi 12:00 sonrası varış → Pazartesi 12:00 deadline</div>
            </div>

            <div className="tb-filter-card">
                <div className="tb-filter-grid">
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

                <div className="tb-actions">
                    <button onClick={fetchViolations} disabled={loading}>
                        {loading ? "Analiz ediliyor..." : "İhlalleri Getir"}
                    </button>

                    <button className="secondary" onClick={exportExcel} disabled={!rows.length}>
                        Excel İndir
                    </button>

                    <div className="tb-range-pill">{rangeLabel}</div>
                </div>
            </div>

            {error && <div className="tb-alert error">{error}</div>}

            {!loading && !error && rows.length === 0 && (
                <div className="tb-alert success">
                    Seçilen sefer tarihi aralığında teslimde bekleme ihlali bulunamadı.
                </div>
            )}

            {loading && <div className="tb-loading">Veriler kontrol ediliyor...</div>}

            {rows.length > 0 && (
                <>
                    <div className="tb-kpi-grid">
                        <div className="tb-kpi">
                            <span>İhlalli Sefer</span>
                            <strong>{kpis.totalTrips}</strong>
                        </div>

                        <div className="tb-kpi">
                            <span>İhlalli Teslim Noktası</span>
                            <strong>{kpis.totalDeliveryViolation}</strong>
                        </div>

                        <div className="tb-kpi">
                            <span>Aktif Sefer</span>
                            <strong>{kpis.activeCount}</strong>
                        </div>

                        <div className="tb-kpi">
                            <span>Tamamlanan Sefer</span>
                            <strong>{kpis.completedCount}</strong>
                        </div>

                        <div className="tb-kpi">
                            <span>Toplam Gecikme</span>
                            <strong>{minToHM(kpis.totalDelayTime)}</strong>
                        </div>

                        <div className="tb-kpi">
                            <span>Ortalama Gecikme</span>
                            <strong>{minToHM(kpis.avg)}</strong>
                        </div>
                    </div>

                    <div className="tb-table-card">
                        <div className="tb-table-head">
                            <div>
                                <h2>İhlalli Seferler</h2>
                                <p>
                                    Aynı seferde birden fazla teslim noktası ihlalliyse ana satırda özet,
                                    detayda her nokta ayrı gösterilir.
                                </p>
                            </div>

                            <span>{filteredRows.length} sefer</span>
                        </div>

                        <div className="tb-table-wrap">
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
                                        <th>Toplam Gecikme</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredRows.map((row) => (
                                        <Fragment key={row.unique_key}>
                                            <tr>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="tb-detail-btn"
                                                        onClick={() => toggleRow(row.unique_key)}
                                                    >
                                                        {openRows[row.unique_key] ? "Gizle" : "Aç"}
                                                    </button>
                                                </td>
                                                <td>
                                                    <span
                                                        className={
                                                            row.kaynak_tablo === "aktif_seferler"
                                                                ? "tb-badge active"
                                                                : "tb-badge completed"
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
                                                    <span className="tb-summary-badge">
                                                        {row.ozet}
                                                    </span>
                                                </td>
                                                <td className="tb-wait">
                                                    {minToHM(row.toplam_gecikme_dk)}
                                                </td>
                                            </tr>

                                            {openRows[row.unique_key] && (
                                                <tr className="tb-detail-row">
                                                    <td colSpan={10}>
                                                        <div className="tb-detail-panel">
                                                            <div className="tb-detail-title">
                                                                {row.sefer_no} teslim ihlal detayları
                                                            </div>

                                                            <table className="tb-inner-table">
                                                                <thead>
                                                                    <tr>
                                                                        <th>Sıra</th>
                                                                        <th>Durum</th>
                                                                        <th>Teslim Noktası</th>
                                                                        <th>İl / İlçe</th>
                                                                        <th>Varış</th>
                                                                        <th>Deadline</th>
                                                                        <th>Uygulanan Kural</th>
                                                                        <th>Çıkış</th>
                                                                        <th>Gecikme</th>
                                                                        <th>Toplam Bekleme</th>
                                                                    </tr>
                                                                </thead>

                                                                <tbody>
                                                                    {row.detaylar.map((detail) => (
                                                                        <tr key={detail.detail_key}>
                                                                            <td>{detail.teslim_sira}</td>
                                                                            <td>{detail.durum}</td>
                                                                            <td>{detail.teslim_noktasi || "—"}</td>
                                                                            <td>
                                                                                {[detail.teslim_ili, detail.teslim_ilcesi]
                                                                                    .filter(Boolean)
                                                                                    .join(" / ") || "—"}
                                                                            </td>
                                                                            <td>{fmtDate(detail.teslim_varis)}</td>
                                                                            <td>{fmtDate(detail.deadline)}</td>
                                                                            <td>
                                                                                <span className="tb-rule-badge">
                                                                                    {detail.kural_metni}
                                                                                </span>
                                                                            </td>
                                                                            <td>{fmtDate(detail.teslim_cikis)}</td>
                                                                            <td className="tb-wait">
                                                                                {minToHM(detail.gecikme_dk)}
                                                                            </td>
                                                                            <td>{minToHM(detail.toplam_bekleme_dk)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
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