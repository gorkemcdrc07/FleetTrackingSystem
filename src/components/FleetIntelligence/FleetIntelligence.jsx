import {
    useMemo,
    useState,
} from "react";

import {
    Activity,
    AlertTriangle,
    BrainCircuit,
    ChevronRight,
    Gauge,
    MapPinOff,
    Radio,
    ShieldCheck,
    TimerReset,
    Truck,
} from "lucide-react";

import { analyzeFleet } from "../../services/fleetIntelligenceService";
import "./FleetIntelligence.css";

function getInsightIcon(type) {
    if (type === "speed") {
        return <Gauge size={20} />;
    }

    if (type === "gps") {
        return <MapPinOff size={20} />;
    }

    if (type === "oldData") {
        return <Radio size={20} />;
    }

    if (type === "idle") {
        return <TimerReset size={20} />;
    }

    if (type === "geofence") {
        return <AlertTriangle size={20} />;
    }

    if (type === "risk") {
        return <Activity size={20} />;
    }

    if (type === "healthy") {
        return <ShieldCheck size={20} />;
    }

    return <Truck size={20} />;
}

function getHealthText(value) {
    if (value >= 85) {
        return {
            key: "good",
            label: "Filo sağlığı iyi",
        };
    }

    if (value >= 65) {
        return {
            key: "warning",
            label: "Filo izlenmeli",
        };
    }

    return {
        key: "critical",
        label: "Filo kritik durumda",
    };
}

function getRiskWidth(score) {
    return `${Math.max(
        4,
        Math.min(100, score)
    )}%`;
}

export default function FleetIntelligence({
    vehicles = [],
    notifications = [],
    geofenceEvents = [],
    onOpenVehicle,
    onShowVehicles,
    compact = false,
    speedLimit = 90,
    oldDataMinutes = 60,
}) {
    const [expanded, setExpanded] =
        useState(!compact);

    const analysis = useMemo(
        () =>
            analyzeFleet({
                vehicles,
                notifications,
                geofenceEvents,
                options: {
                    speedLimit,
                    oldDataMinutes,
                },
            }),
        [
            vehicles,
            notifications,
            geofenceEvents,
            speedLimit,
            oldDataMinutes,
        ]
    );

    const healthInfo = getHealthText(
        analysis.summary.fleetHealth
    );

    function handleInsightClick(insight) {
        if (
            typeof onShowVehicles ===
            "function"
        ) {
            onShowVehicles(
                insight.vehicles,
                insight
            );

            return;
        }

        const firstVehicle =
            insight.vehicles?.[0];

        if (firstVehicle) {
            onOpenVehicle?.(
                firstVehicle
            );
        }
    }

    return (
        <section
            className={[
                "fleet-intelligence",
                compact
                    ? "compact"
                    : "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <header className="fleet-intelligence-head">
                <div className="fleet-intelligence-title">
                    <div className="fleet-intelligence-title-icon">
                        <BrainCircuit
                            size={23}
                        />
                    </div>

                    <div>
                        <span>
                            LIVE FLEET
                            INTELLIGENCE
                        </span>

                        <h2>
                            Akıllı Filo
                            Analizi
                        </h2>

                        <p>
                            Araç, alarm,
                            telemetri ve
                            geofence verileri
                            analiz edildi.
                        </p>
                    </div>
                </div>

                <div className="fleet-intelligence-health">
                    <div
                        className={`fleet-health-ring ${healthInfo.key}`}
                        style={{
                            "--fleet-health":
                                analysis
                                    .summary
                                    .fleetHealth,
                        }}
                    >
                        <div>
                            <strong>
                                {
                                    analysis
                                        .summary
                                        .fleetHealth
                                }
                            </strong>

                            <span>
                                /100
                            </span>
                        </div>
                    </div>

                    <div>
                        <span>
                            Genel Sağlık
                        </span>

                        <strong>
                            {
                                healthInfo.label
                            }
                        </strong>

                        <small>
                            Ortalama risk:{" "}
                            {
                                analysis
                                    .summary
                                    .averageRisk
                            }
                        </small>
                    </div>
                </div>
            </header>

            <div className="fleet-intelligence-stats">
                <div>
                    <span>
                        Toplam Araç
                    </span>

                    <strong>
                        {
                            analysis.summary
                                .total
                        }
                    </strong>
                </div>

                <div className="success">
                    <span>
                        Sağlıklı
                    </span>

                    <strong>
                        {
                            analysis.summary
                                .healthy
                        }
                    </strong>
                </div>

                <div className="warning">
                    <span>
                        İzlenmeli
                    </span>

                    <strong>
                        {
                            analysis.summary
                                .warning
                        }
                    </strong>
                </div>

                <div className="critical">
                    <span>
                        Kritik
                    </span>

                    <strong>
                        {
                            analysis.summary
                                .critical
                        }
                    </strong>
                </div>

                <div className="danger">
                    <span>
                        GPS Yok
                    </span>

                    <strong>
                        {
                            analysis.summary
                                .gpsMissing
                        }
                    </strong>
                </div>

                <div className="info">
                    <span>
                        Hareket
                    </span>

                    <strong>
                        {
                            analysis.summary
                                .moving
                        }
                    </strong>
                </div>
            </div>

            {compact && (
                <button
                    type="button"
                    className="fleet-intelligence-expand"
                    onClick={() =>
                        setExpanded(
                            (current) =>
                                !current
                        )
                    }
                >
                    {expanded
                        ? "Analizi Daralt"
                        : "Detaylı Analizi Göster"}

                    <ChevronRight
                        size={16}
                    />
                </button>
            )}

            {expanded && (
                <>
                    <div className="fleet-intelligence-body">
                        <div className="fleet-intelligence-insights">
                            <div className="fleet-intelligence-section-head">
                                <div>
                                    <span>
                                        Operasyon
                                        Özeti
                                    </span>

                                    <h3>
                                        Dikkat
                                        edilmesi
                                        gerekenler
                                    </h3>
                                </div>

                                <strong>
                                    {
                                        analysis
                                            .insights
                                            .length
                                    }
                                </strong>
                            </div>

                            {analysis.insights
                                .length ===
                                0 ? (
                                <div className="fleet-intelligence-empty">
                                    <ShieldCheck
                                        size={24}
                                    />

                                    <strong>
                                        Kritik
                                        durum
                                        bulunmuyor.
                                    </strong>

                                    <span>
                                        Filodaki
                                        araçlar
                                        normal
                                        çalışıyor.
                                    </span>
                                </div>
                            ) : (
                                <div className="fleet-intelligence-insight-list">
                                    {analysis.insights.map(
                                        (
                                            insight
                                        ) => (
                                            <button
                                                key={
                                                    insight.key
                                                }
                                                type="button"
                                                className={`fleet-intelligence-insight ${insight.level}`}
                                                onClick={() =>
                                                    handleInsightClick(
                                                        insight
                                                    )
                                                }
                                            >
                                                <div className="fleet-insight-icon">
                                                    {getInsightIcon(
                                                        insight.type
                                                    )}
                                                </div>

                                                <div className="fleet-insight-content">
                                                    <div>
                                                        <strong>
                                                            {
                                                                insight.title
                                                            }
                                                        </strong>

                                                        <em>
                                                            {
                                                                insight.count
                                                            }
                                                        </em>
                                                    </div>

                                                    <p>
                                                        {
                                                            insight.message
                                                        }
                                                    </p>

                                                    <span>
                                                        {
                                                            insight.actionLabel
                                                        }
                                                    </span>
                                                </div>

                                                <ChevronRight
                                                    size={
                                                        17
                                                    }
                                                />
                                            </button>
                                        )
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="fleet-intelligence-risk">
                            <div className="fleet-intelligence-section-head">
                                <div>
                                    <span>
                                        Risk
                                        Analizi
                                    </span>

                                    <h3>
                                        En riskli
                                        araçlar
                                    </h3>
                                </div>

                                <strong>
                                    {
                                        analysis
                                            .criticalVehicles
                                            .length
                                    }
                                </strong>
                            </div>

                            {analysis
                                .criticalVehicles
                                .length ===
                                0 ? (
                                <div className="fleet-intelligence-empty small">
                                    <ShieldCheck
                                        size={22}
                                    />

                                    <strong>
                                        Kritik araç
                                        yok.
                                    </strong>
                                </div>
                            ) : (
                                <div className="fleet-risk-list">
                                    {analysis.criticalVehicles.map(
                                        (
                                            item
                                        ) => (
                                            <button
                                                key={
                                                    item.plate
                                                }
                                                type="button"
                                                onClick={() =>
                                                    onOpenVehicle?.(
                                                        item.vehicle
                                                    )
                                                }
                                            >
                                                <div className="fleet-risk-top">
                                                    <div>
                                                        <strong>
                                                            {
                                                                item.plate
                                                            }
                                                        </strong>

                                                        <span>
                                                            {
                                                                item.address
                                                            }
                                                        </span>
                                                    </div>

                                                    <em>
                                                        {
                                                            item
                                                                .risk
                                                                .score
                                                        }
                                                    </em>
                                                </div>

                                                <div className="fleet-risk-track">
                                                    <i
                                                        style={{
                                                            width: getRiskWidth(
                                                                item
                                                                    .risk
                                                                    .score
                                                            ),
                                                        }}
                                                    />
                                                </div>

                                                <div className="fleet-risk-footer">
                                                    <span>
                                                        {
                                                            item
                                                                .risk
                                                                .label
                                                        }
                                                    </span>

                                                    <strong>
                                                        {
                                                            item
                                                                .risk
                                                                .reasons
                                                                .length
                                                        }{" "}
                                                        neden
                                                    </strong>
                                                </div>
                                            </button>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="fleet-intelligence-footer">
                        <div>
                            <span>
                                Son analiz
                            </span>

                            <strong>
                                {new Date(
                                    analysis.generatedAt
                                ).toLocaleTimeString(
                                    "tr-TR",
                                    {
                                        hour:
                                            "2-digit",
                                        minute:
                                            "2-digit",
                                        second:
                                            "2-digit",
                                    }
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Hareket /
                                Toplam
                            </span>

                            <strong>
                                {
                                    analysis
                                        .summary
                                        .moving
                                }
                                /
                                {
                                    analysis
                                        .summary
                                        .total
                                }
                            </strong>
                        </div>

                        <div>
                            <span>
                                Eski Veri
                            </span>

                            <strong>
                                {
                                    analysis
                                        .summary
                                        .oldData
                                }
                            </strong>
                        </div>

                        <div>
                            <span>
                                Geofence
                                Dışı
                            </span>

                            <strong>
                                {
                                    analysis
                                        .summary
                                        .outsideGeofence
                                }
                            </strong>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}