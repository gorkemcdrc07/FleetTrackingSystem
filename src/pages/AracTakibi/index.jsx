import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Activity,
    CarFront,
    ChevronLeft,
    ChevronRight,
    CircleParking,
    Clock3,
    ExternalLink,
    Gauge,
    ListFilter,
    MapPin,
    PanelRightOpen,
    RefreshCw,
    RotateCcw,
    Search,
    SlidersHorizontal,
    WifiOff,
    Zap,
} from "lucide-react";
import Harita from "../../components/Harita/Harita";
import VehicleDrawer from "../../components/VehicleDrawer/VehicleDrawer";
import "../../components/Harita/Harita.css";
import "./AracTakibiModern.css";
import { apiUrl } from "../../config/api";

const API_URL = apiUrl("/api/mobiliz/activity-last");
const PAGE_SIZE_OPTIONS = [25, 50, 100];

function normalizePlate(value) {
    return String(value || "").replace(/\s/g, "").toUpperCase();
}

function getPlate(vehicle) {
    return vehicle?.plate || vehicle?.licensePlate || vehicle?.plateNo || "-";
}

function getSpeed(vehicle) {
    return Number(vehicle?.speed || vehicle?.velocity || 0);
}

function getStatus(vehicle) {
    const speed = getSpeed(vehicle);
    if (speed > 0) return "moving";
    if (vehicle?.ignition || vehicle?.engine) return "idle";
    return "park";
}

function getStatusText(vehicle) {
    const status = getStatus(vehicle);
    if (status === "moving") return "Hareket Halinde";
    if (status === "idle") return "Rölantide";
    return "Park Halinde";
}

function getCoordinate(vehicle) {
    return {
        latitude: vehicle?.latitude ?? vehicle?.lat ?? vehicle?.y ?? "",
        longitude: vehicle?.longitude ?? vehicle?.lng ?? vehicle?.lon ?? vehicle?.x ?? "",
    };
}

function hasValidCoordinate(vehicle) {
    const coordinate = getCoordinate(vehicle);
    const latitude = Number(coordinate.latitude);
    const longitude = Number(coordinate.longitude);
    return Number.isFinite(latitude) && Number.isFinite(longitude) &&
        latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180 &&
        !(latitude === 0 && longitude === 0);
}

function getAddress(vehicle) {
    return vehicle?.address || vehicle?.location || vehicle?.city || "Konum bilgisi yok";
}

function getLastDate(vehicle) {
    return vehicle?.gpsDate || vehicle?.activityDate || vehicle?.dataTime ||
        vehicle?.lastDataTime || vehicle?.date || "";
}

function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("tr-TR");
}

function getResponseList(json) {
    if (Array.isArray(json)) return json;
    if (Array.isArray(json?.data)) return json.data;
    if (Array.isArray(json?.result)) return json.result;
    if (Array.isArray(json?.items)) return json.items;
    return [];
}

function getFleet(vehicle) {
    return vehicle?.fleetName || vehicle?.fleet || "";
}

function getGroup(vehicle) {
    return vehicle?.groupName || vehicle?.group || "";
}

export default function AracTakibi({ onNavigate }) {
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [lastRefresh, setLastRefresh] = useState(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [density, setDensity] = useState("comfortable");
    const [sort, setSort] = useState("plate");

    const [filters, setFilters] = useState({
        search: "",
        status: "all",
        fleet: "",
        group: "",
    });

    const loadVehicles = useCallback(async (signal) => {
        try {
            setLoading(true);
            setError("");
            const response = await fetch(API_URL, {
                method: "GET",
                headers: { Accept: "application/json" },
                signal,
            });
            const contentType = response.headers.get("content-type") || "";
            let json;
            if (contentType.includes("application/json")) {
                json = await response.json();
            } else {
                const text = await response.text();
                throw new Error(text || `Sunucu geçersiz cevap döndürdü. HTTP ${response.status}`);
            }
            if (!response.ok) {
                throw new Error(json?.message || json?.error || `Mobiliz isteği başarısız oldu. HTTP ${response.status}`);
            }
            const data = getResponseList(json);
            setVehicles(data);
            setSelectedVehicle((previous) => {
                if (!previous) return data[0] || null;
                const previousPlate = normalizePlate(getPlate(previous));
                return data.find((item) => normalizePlate(getPlate(item)) === previousPlate) || data[0] || null;
            });
            setLastRefresh(new Date());
        } catch (err) {
            if (err?.name === "AbortError") return;
            console.error("Mobiliz araç verileri alınamadı:", err);
            setError(err instanceof Error ? err.message : "Mobiliz araç verileri alınamadı.");
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        loadVehicles(controller.signal);
        const timer = window.setInterval(() => loadVehicles(), 30000);
        return () => {
            controller.abort();
            window.clearInterval(timer);
        };
    }, [loadVehicles]);

    const fleets = useMemo(() => [...new Set(vehicles.map(getFleet).filter(Boolean))].sort(), [vehicles]);
    const groups = useMemo(() => [...new Set(vehicles.map(getGroup).filter(Boolean))].sort(), [vehicles]);

    const filteredVehicles = useMemo(() => {
        const result = vehicles.filter((vehicle) => {
            const searchValue = filters.search.trim().toLocaleLowerCase("tr-TR");
            const searchMatch = !searchValue || [
                getPlate(vehicle), getAddress(vehicle), getFleet(vehicle), getGroup(vehicle),
            ].some((value) => String(value || "").toLocaleLowerCase("tr-TR").includes(searchValue.replace(/\s/g, "")) ||
                normalizePlate(value).toLocaleLowerCase("tr-TR").includes(normalizePlate(searchValue).toLocaleLowerCase("tr-TR")));
            const statusMatch = filters.status === "all" || getStatus(vehicle) === filters.status;
            const fleetMatch = !filters.fleet || getFleet(vehicle) === filters.fleet;
            const groupMatch = !filters.group || getGroup(vehicle) === filters.group;
            return searchMatch && statusMatch && fleetMatch && groupMatch;
        });

        return [...result].sort((a, b) => {
            if (sort === "speed-desc") return getSpeed(b) - getSpeed(a);
            if (sort === "status") return getStatusText(a).localeCompare(getStatusText(b), "tr");
            if (sort === "recent") {
                return (new Date(getLastDate(b)).getTime() || 0) - (new Date(getLastDate(a)).getTime() || 0);
            }
            return getPlate(a).localeCompare(getPlate(b), "tr", { numeric: true });
        });
    }, [vehicles, filters, sort]);

    const summary = useMemo(() => ({
        total: vehicles.length,
        moving: vehicles.filter((vehicle) => getStatus(vehicle) === "moving").length,
        idle: vehicles.filter((vehicle) => getStatus(vehicle) === "idle").length,
        park: vehicles.filter((vehicle) => getStatus(vehicle) === "park").length,
        noGps: vehicles.filter((vehicle) => !hasValidCoordinate(vehicle)).length,
    }), [vehicles]);

    const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedVehicles = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return filteredVehicles.slice(start, start + pageSize);
    }, [filteredVehicles, safePage, pageSize]);

    useEffect(() => setPage(1), [filters, pageSize, sort]);

    const activeFilterCount = [filters.search, filters.status !== "all" ? filters.status : "", filters.fleet, filters.group].filter(Boolean).length;
    const selectedCoordinate = getCoordinate(selectedVehicle);
    const selectedMapsUrl = hasValidCoordinate(selectedVehicle)
        ? `https://www.google.com/maps?q=${selectedCoordinate.latitude},${selectedCoordinate.longitude}`
        : "";

    function handleSelectVehicle(vehicle) {
        setSelectedVehicle(vehicle);
    }

    function handleGoPlayback(vehicle) {
        localStorage.setItem("fts_playback_vehicle", JSON.stringify(vehicle));
        setDrawerOpen(false);
        onNavigate?.("Playback");
    }

    function handleOpenOperations(vehicle) {
        localStorage.setItem("fts_focus_plate", getPlate(vehicle));
        setDrawerOpen(false);
        onNavigate?.("Operasyon Merkezi");
    }

    function resetFilters() {
        setFilters({ search: "", status: "all", fleet: "", group: "" });
    }

    function applyStatusFilter(status) {
        setFilters((current) => ({ ...current, status: current.status === status ? "all" : status }));
    }

    const pageStart = filteredVehicles.length ? (safePage - 1) * pageSize + 1 : 0;
    const pageEnd = Math.min(safePage * pageSize, filteredVehicles.length);

    return (
        <div className={`arac-takibi-page arac-takibi-modern density-${density}`}>
            <header className="at-page-header">
                <div className="at-title-block">
                    <div className="at-eyebrow"><Activity size={15} /> Mobiliz Entegrasyonu</div>
                    <h1>Araç Takibi</h1>
                    <p>Filodaki araçların son konumunu, hareket durumunu ve operasyonel bilgisini tek ekrandan izleyin.</p>
                    <div className="at-refresh-meta">
                        <span className={error ? "is-error" : "is-live"}><i /> {error ? "Bağlantı sorunu" : "30 sn otomatik yenileme"}</span>
                        <span><Clock3 size={14} /> Son yenileme: {lastRefresh ? lastRefresh.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-"}</span>
                    </div>
                </div>
                <button className="at-primary-button" type="button" onClick={() => loadVehicles()} disabled={loading}>
                    <RefreshCw size={17} className={loading ? "spin" : ""} />
                    {loading ? "Yenileniyor" : "Şimdi Yenile"}
                </button>
            </header>

            <section className="at-kpi-grid" aria-label="Filo özeti">
                <button className="at-kpi-card" type="button" onClick={() => applyStatusFilter("all")}>
                    <span className="at-kpi-icon"><CarFront size={20} /></span><span>Toplam Araç</span><strong>{summary.total}</strong><small>Mobiliz’den gelen araçlar</small>
                </button>
                <button className={`at-kpi-card moving ${filters.status === "moving" ? "active" : ""}`} type="button" onClick={() => applyStatusFilter("moving")}>
                    <span className="at-kpi-icon"><Zap size={20} /></span><span>Hareket Halinde</span><strong>{summary.moving}</strong><small>Hızı 0 km/h üzerinde</small>
                </button>
                <button className={`at-kpi-card idle ${filters.status === "idle" ? "active" : ""}`} type="button" onClick={() => applyStatusFilter("idle")}>
                    <span className="at-kpi-icon"><Gauge size={20} /></span><span>Rölantide</span><strong>{summary.idle}</strong><small>Kontak açık, araç sabit</small>
                </button>
                <button className={`at-kpi-card park ${filters.status === "park" ? "active" : ""}`} type="button" onClick={() => applyStatusFilter("park")}>
                    <span className="at-kpi-icon"><CircleParking size={20} /></span><span>Park Halinde</span><strong>{summary.park}</strong><small>Kontak kapalı araçlar</small>
                </button>
                <div className="at-kpi-card gps">
                    <span className="at-kpi-icon"><WifiOff size={20} /></span><span>GPS Konumu Yok</span><strong>{summary.noGps}</strong><small>Haritada gösterilemeyen</small>
                </div>
            </section>

            {error && (
                <div className="at-alert-error">
                    <div><WifiOff size={20} /><span><strong>Araç verileri alınamadı.</strong><small>{error}</small></span></div>
                    <button type="button" onClick={() => loadVehicles()} disabled={loading}><RefreshCw size={16} /> Tekrar Dene</button>
                </div>
            )}

            <section className="at-filter-card">
                <div className="at-filter-title"><ListFilter size={18} /><div><strong>Araçları filtrele</strong><span>{activeFilterCount ? `${activeFilterCount} aktif filtre` : "Plaka, konum, filo veya grup ile hızlıca daraltın"}</span></div></div>
                <div className="at-filter-grid">
                    <label className="at-search-field"><span>Arama</span><div><Search size={17} /><input type="text" placeholder="Plaka, konum, filo veya grup ara" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></div></label>
                    <label><span>Durum</span><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="all">Tüm durumlar</option><option value="moving">Hareket halinde</option><option value="idle">Rölantide</option><option value="park">Park halinde</option></select></label>
                    <label><span>Filo</span><select value={filters.fleet} onChange={(e) => setFilters({ ...filters, fleet: e.target.value })}><option value="">Tüm filolar</option>{fleets.map((fleet) => <option key={fleet} value={fleet}>{fleet}</option>)}</select></label>
                    <label><span>Grup</span><select value={filters.group} onChange={(e) => setFilters({ ...filters, group: e.target.value })}><option value="">Tüm gruplar</option>{groups.map((group) => <option key={group} value={group}>{group}</option>)}</select></label>
                    <button className="at-reset-button" type="button" onClick={resetFilters} disabled={!activeFilterCount}><RotateCcw size={16} /> Temizle</button>
                </div>
            </section>

            <section className="at-tracking-workspace">
                <aside className="at-vehicle-panel">
                    <div className="at-panel-head">
                        <div><strong>Araç Listesi</strong><span>{filteredVehicles.length} sonuç · {pageStart}-{pageEnd} gösteriliyor</span></div>
                        <label className="at-sort"><SlidersHorizontal size={15} /><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Araçları sırala"><option value="plate">Plakaya göre</option><option value="speed-desc">Hıza göre</option><option value="status">Duruma göre</option><option value="recent">Son veriye göre</option></select></label>
                    </div>

                    <div className="at-vehicle-list">
                        {loading && vehicles.length === 0 && <div className="at-list-state"><RefreshCw className="spin" size={24} /><strong>Araçlar yükleniyor</strong><span>Mobiliz’den son konumlar alınıyor.</span></div>}
                        {!loading && pagedVehicles.length === 0 && <div className="at-list-state"><Search size={24} /><strong>Araç bulunamadı</strong><span>Filtreleri temizleyip yeniden deneyebilirsiniz.</span><button type="button" onClick={resetFilters}>Filtreleri Temizle</button></div>}
                        {pagedVehicles.map((vehicle) => {
                            const plate = getPlate(vehicle);
                            const active = normalizePlate(getPlate(selectedVehicle)) === normalizePlate(plate);
                            return (
                                <button key={vehicle?.id || plate} type="button" className={`at-vehicle-row ${active ? "active" : ""}`} onClick={() => handleSelectVehicle(vehicle)}>
                                    <div className="at-row-main"><strong>{plate}</strong><span className={`at-status-pill ${getStatus(vehicle)}`}><i />{getStatusText(vehicle)}</span></div>
                                    <div className="at-row-address"><MapPin size={14} /><span>{getAddress(vehicle)}</span></div>
                                    <div className="at-row-meta"><span><Gauge size={14} /> {getSpeed(vehicle)} km/h</span><span>{getFleet(vehicle) || "Filo yok"}</span></div>
                                    <div className="at-row-time"><Clock3 size={13} /> {formatDate(getLastDate(vehicle))}</div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="at-pagination">
                        <div className="at-page-size"><span>Sayfa</span><select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>{PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}</select></div>
                        <div className="at-page-controls"><button type="button" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="Önceki sayfa"><ChevronLeft size={17} /></button><span>{safePage} / {totalPages}</span><button type="button" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} aria-label="Sonraki sayfa"><ChevronRight size={17} /></button></div>
                    </div>
                </aside>

                <div className="at-map-column">
                    <div className="at-map-head">
                        <div><strong>Canlı Filo Haritası</strong><span>Filtrelenmiş {filteredVehicles.length} araç haritada gösteriliyor</span></div>
                        <div className="at-density-switch"><span>Liste yoğunluğu</span><button type="button" className={density === "comfortable" ? "active" : ""} onClick={() => setDensity("comfortable")}>Rahat</button><button type="button" className={density === "compact" ? "active" : ""} onClick={() => setDensity("compact")}>Kompakt</button></div>
                    </div>
                    <div className="at-map-shell">
                        <Harita vehicles={filteredVehicles} selectedPlate={selectedVehicle ? getPlate(selectedVehicle) : undefined} onVehicleClick={handleSelectVehicle} height="680px" zoom={6} />
                    </div>
                </div>
            </section>

            {selectedVehicle && (
                <section className="at-selected-card">
                    <div className="at-selected-summary">
                        <div className="at-selected-plate"><span className={`at-selected-icon ${getStatus(selectedVehicle)}`}><CarFront size={23} /></span><div><small>Seçili Araç</small><strong>{getPlate(selectedVehicle)}</strong><span className={`at-status-pill ${getStatus(selectedVehicle)}`}><i />{getStatusText(selectedVehicle)}</span></div></div>
                        <div className="at-selected-data"><div><span>Hız</span><strong>{getSpeed(selectedVehicle)} km/h</strong></div><div><span>Kontak</span><strong>{selectedVehicle?.ignition || selectedVehicle?.engine ? "Açık" : "Kapalı"}</strong></div><div><span>Son Veri</span><strong>{formatDate(getLastDate(selectedVehicle))}</strong></div><div className="wide"><span>Adres</span><strong>{getAddress(selectedVehicle)}</strong></div></div>
                    </div>
                    <div className="at-selected-actions">
                        {selectedMapsUrl && <a href={selectedMapsUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Google Maps</a>}
                        <button type="button" onClick={() => setDrawerOpen(true)}><PanelRightOpen size={16} /> Araç Detayı</button>
                    </div>
                </section>
            )}

            <VehicleDrawer open={drawerOpen} vehicle={selectedVehicle} onClose={() => setDrawerOpen(false)} onGoPlayback={handleGoPlayback} onOpenOperations={handleOpenOperations} />
        </div>
    );
}
