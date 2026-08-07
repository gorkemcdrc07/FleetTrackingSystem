import { useEffect, useMemo, useState } from "react";
import {
    filterActivityLogs,
    getActionLabel,
    getActivityUser,
    groupActivityByType,
    groupActivityByUser,
    summarizeActivityLogs,
} from "../../domain/userActivity";
import { listUserActivityLogs } from "../../services/userActivityRepository";
import "./UserKpiReport.css";

function fmtDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function UserKpiReport() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState("7");
    const [selectedUser, setSelectedUser] = useState("Tümü");
    const [selectedType, setSelectedType] = useState("Tümü");
    const [error, setError] = useState("");

    useEffect(() => {
        loadLogs();
    }, [days]);

    async function loadLogs() {
        setLoading(true);
        setError("");

        const since = new Date();
        since.setDate(since.getDate() - Number(days));

        try {
            const data = await listUserActivityLogs({ since });
            setLogs(data);
        } catch (loadError) {
            console.error("KPI logları alınamadı:", loadError);
            setLogs([]);
            setError("Kullanıcı işlem kayıtları alınamadı. Lütfen tekrar deneyin.");
        } finally {
            setLoading(false);
        }
    }

    const users = useMemo(() => {
        return [
            "Tümü",
            ...Array.from(new Set(logs.map(getActivityUser))),
        ];
    }, [logs]);

    const types = useMemo(() => {
        return [
            "Tümü",
            ...Array.from(new Set(logs.map((x) => x.islem_tipi).filter(Boolean))),
        ];
    }, [logs]);

    const filteredLogs = useMemo(() => {
        return filterActivityLogs(logs, { user: selectedUser, type: selectedType });
    }, [logs, selectedUser, selectedType]);

    const summary = useMemo(() => {
        return summarizeActivityLogs(filteredLogs);
    }, [filteredLogs]);

    const userStats = useMemo(() => {
        return groupActivityByUser(filteredLogs);
    }, [filteredLogs]);

    const typeStats = useMemo(() => {
        return groupActivityByType(filteredLogs);
    }, [filteredLogs]);

    return (
        <div className="kpi-page">
            <div className="kpi-header">
                <div>
                    <span>Kullanıcı Performansı</span>
                    <h1>KPI & İşlem Analizi</h1>
                    <p>Kim, ne zaman, hangi işlem yaptı kısa özet olarak görüntülenir.</p>
                </div>

                <div className="kpi-filters">
                    <select value={days} onChange={(e) => setDays(e.target.value)}>
                        <option value="1">Son 1 gün</option>
                        <option value="7">Son 7 gün</option>
                        <option value="30">Son 30 gün</option>
                        <option value="90">Son 90 gün</option>
                    </select>

                    <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                        {users.map((x) => (
                            <option key={x}>{x}</option>
                        ))}
                    </select>

                    <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                        {types.map((x) => (
                            <option key={x} value={x}>
                                {x === "Tümü" ? "Tüm İşlemler" : getActionLabel(x)}
                            </option>
                        ))}
                    </select>

                    <button onClick={loadLogs}>Yenile</button>
                </div>
            </div>

            {error && <div className="empty-box">{error}</div>}

            <div className="kpi-cards">
                <div className="kpi-card">
                    <span>Toplam İşlem</span>
                    <strong>{summary.total}</strong>
                </div>

                <div className="kpi-card">
                    <span>Aktif Kullanıcı</span>
                    <strong>{summary.uniqueUsers}</strong>
                </div>

                <div className="kpi-card">
                    <span>Sefer / Rota Güncelleme</span>
                    <strong>{summary.routeUpdates}</strong>
                </div>

                <div className="kpi-card">
                    <span>Araç İşlemleri</span>
                    <strong>{summary.vehicleOps}</strong>
                </div>
            </div>

            <div className="kpi-grid">
                <section className="kpi-panel">
                    <div className="panel-head">
                        <h2>Kullanıcı Bazlı Özet</h2>
                        <span>{userStats.length} kullanıcı</span>
                    </div>

                    <div className="kpi-table-wrap">
                        <table className="kpi-table">
                            <thead>
                                <tr>
                                    <th>Kullanıcı</th>
                                    <th>Toplam</th>
                                    <th>Sefer</th>
                                    <th>Araç</th>
                                    <th>Buton</th>
                                    <th>Son İşlem</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading && (
                                    <tr>
                                        <td colSpan="6">Yükleniyor...</td>
                                    </tr>
                                )}

                                {!loading && userStats.length === 0 && (
                                    <tr>
                                        <td colSpan="6">Kayıt bulunamadı.</td>
                                    </tr>
                                )}

                                {!loading &&
                                    userStats.map((item) => (
                                        <tr key={item.kullanici}>
                                            <td><strong>{item.kullanici}</strong></td>
                                            <td>{item.toplam}</td>
                                            <td>{item.sefer}</td>
                                            <td>{item.arac}</td>
                                            <td>{item.buton}</td>
                                            <td>{fmtDate(item.sonIslem)}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="kpi-panel">
                    <div className="panel-head">
                        <h2>İşlem Dağılımı</h2>
                        <span>{typeStats.length} işlem tipi</span>
                    </div>

                    <div className="type-list">
                        {typeStats.map((item) => (
                            <div className="type-row" key={item.type}>
                                <div>
                                    <strong>{getActionLabel(item.type)}</strong>
                                    <span>{item.type}</span>
                                </div>
                                <b>{item.count}</b>
                            </div>
                        ))}

                        {!loading && typeStats.length === 0 && (
                            <div className="empty-box">İşlem bulunamadı.</div>
                        )}
                    </div>
                </section>
            </div>

            <section className="kpi-panel full">
                <div className="panel-head">
                    <h2>Son İşlemler</h2>
                    <span>{filteredLogs.length} kayıt</span>
                </div>

                <div className="activity-list">
                    {filteredLogs.slice(0, 80).map((log) => {
                        const changed = log.detay?.degisen_alanlar || [];
                        const orderChanged = log.detay?.sira_degisikligi;

                        return (
                            <div className="activity-item" key={log.id}>
                                <div className="activity-top">
                                    <strong>{log.kullanici || log.kullanici_ad || "Bilinmeyen"}</strong>
                                    <span>{fmtDate(log.created_at)}</span>
                                </div>

                                <div className="activity-main">
                                    <b>{getActionLabel(log.islem_tipi)}</b>
                                    <p>{log.islem_aciklama || "—"}</p>
                                </div>

                                <div className="activity-meta">
                                    {log.sefer_no && <span>Sefer: {log.sefer_no}</span>}
                                    {log.plaka && <span>Plaka: {log.plaka}</span>}
                                    {log.tablo_adi && <span>Tablo: {log.tablo_adi}</span>}
                                </div>

                                {changed.length > 0 && (
                                    <div className="change-box">
                                        {changed.slice(0, 4).map((x, i) => (
                                            <div key={i}>
                                                <strong>{x.nokta || x.alan}</strong>
                                                <span>{x.alan}: {x.eski_deger || "—"} → {x.yeni_deger || "—"}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {orderChanged && (
                                    <div className="change-box order">
                                        <strong>Rota sırası değişti</strong>
                                        <span>Eski sıra / yeni sıra log detayında tutuluyor.</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {!loading && filteredLogs.length === 0 && (
                        <div className="empty-box">Seçili filtrelerde işlem bulunamadı.</div>
                    )}
                </div>
            </section>
        </div>
    );
}
