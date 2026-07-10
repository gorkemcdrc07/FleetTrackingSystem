import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import "./DashboardCharts.css";

const STATUS_COLORS = {
    moving: "#2563eb",
    idle: "#f59e0b",
    park: "#64748b",
};

const ALARM_COLORS = {
    speed: "#dc2626",
    idle: "#f59e0b",
    oldData: "#f97316",
    gps: "#be123c",
    geofence: "#7c3aed",
};

const ALARM_LABELS = {
    speed: "Hız",
    idle: "Rölanti",
    oldData: "Eski Veri",
    gps: "GPS Yok",
    geofence: "Geofence",
};

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;

    const item = payload[0];

    return (
        <div className="dashboard-chart-tooltip">
            <span>{label || item?.payload?.name}</span>
            <strong>{item.value}</strong>
        </div>
    );
}

export default function DashboardCharts({
    statusData = [],
    alarmData = [],
    onStatusClick,
    onAlarmClick,
}) {
    const totalStatus = statusData.reduce(
        (total, item) => total + Number(item.value || 0),
        0
    );

    const totalAlarms = alarmData.reduce(
        (total, item) => total + Number(item.value || 0),
        0
    );

    return (
        <div className="dashboard-charts-grid">
            <section className="dashboard-chart-card">
                <div className="dashboard-chart-head">
                    <div>
                        <span>Filo Analizi</span>
                        <h2>Durum Dağılımı</h2>
                        <p>
                            Araçların hareket, rölanti ve park
                            dağılımı.
                        </p>
                    </div>

                    <strong>{totalStatus}</strong>
                </div>

                {totalStatus === 0 ? (
                    <div className="dashboard-chart-empty">
                        Araç verisi bulunmuyor.
                    </div>
                ) : (
                    <div className="dashboard-pie-layout">
                        <div className="dashboard-pie-chart">
                            <ResponsiveContainer
                                width="100%"
                                height={260}
                            >
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={72}
                                        outerRadius={105}
                                        paddingAngle={4}
                                        stroke="none"
                                        onClick={(data) => {
                                            onStatusClick?.(
                                                data?.key
                                            );
                                        }}
                                    >
                                        {statusData.map((item) => (
                                            <Cell
                                                key={item.key}
                                                fill={
                                                    STATUS_COLORS[
                                                    item.key
                                                    ] || "#94a3b8"
                                                }
                                                className="dashboard-chart-cell"
                                            />
                                        ))}
                                    </Pie>

                                    <Tooltip
                                        content={
                                            <CustomTooltip />
                                        }
                                    />
                                </PieChart>
                            </ResponsiveContainer>

                            <div className="dashboard-pie-center">
                                <span>Toplam</span>
                                <strong>{totalStatus}</strong>
                                <small>Araç</small>
                            </div>
                        </div>

                        <div className="dashboard-chart-legend">
                            {statusData.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() =>
                                        onStatusClick?.(item.key)
                                    }
                                >
                                    <i
                                        style={{
                                            background:
                                                STATUS_COLORS[
                                                item.key
                                                ],
                                        }}
                                    />

                                    <span>{item.name}</span>
                                    <strong>{item.value}</strong>

                                    <small>
                                        {totalStatus > 0
                                            ? `%${Math.round(
                                                (item.value /
                                                    totalStatus) *
                                                100
                                            )}`
                                            : "%0"}
                                    </small>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            <section className="dashboard-chart-card">
                <div className="dashboard-chart-head">
                    <div>
                        <span>Risk Analizi</span>
                        <h2>Alarm Türleri</h2>
                        <p>
                            Aktif alarm ve operasyon olaylarının
                            dağılımı.
                        </p>
                    </div>

                    <strong>{totalAlarms}</strong>
                </div>

                {totalAlarms === 0 ? (
                    <div className="dashboard-chart-empty">
                        Aktif alarm bulunmuyor.
                    </div>
                ) : (
                    <div className="dashboard-bar-chart">
                        <ResponsiveContainer
                            width="100%"
                            height={285}
                        >
                            <BarChart
                                data={alarmData}
                                margin={{
                                    top: 12,
                                    right: 12,
                                    left: -18,
                                    bottom: 0,
                                }}
                                onClick={(state) => {
                                    const payload =
                                        state?.activePayload?.[0]
                                            ?.payload;

                                    if (payload) {
                                        onAlarmClick?.(
                                            payload.key
                                        );
                                    }
                                }}
                            >
                                <CartesianGrid
                                    strokeDasharray="4 4"
                                    vertical={false}
                                    stroke="#e2e8f0"
                                />

                                <XAxis
                                    dataKey="shortName"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{
                                        fill: "#64748b",
                                        fontSize: 11,
                                        fontWeight: 800,
                                    }}
                                />

                                <YAxis
                                    allowDecimals={false}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{
                                        fill: "#94a3b8",
                                        fontSize: 10,
                                        fontWeight: 800,
                                    }}
                                />

                                <Tooltip
                                    cursor={{
                                        fill: "rgba(99, 102, 241, 0.06)",
                                    }}
                                    content={<CustomTooltip />}
                                />

                                <Bar
                                    dataKey="value"
                                    radius={[10, 10, 3, 3]}
                                    maxBarSize={48}
                                    className="dashboard-alarm-bar"
                                >
                                    {alarmData.map((item) => (
                                        <Cell
                                            key={item.key}
                                            fill={
                                                ALARM_COLORS[
                                                item.key
                                                ] || "#6366f1"
                                            }
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>

                        <div className="dashboard-alarm-legend">
                            {alarmData.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() =>
                                        onAlarmClick?.(item.key)
                                    }
                                >
                                    <i
                                        style={{
                                            background:
                                                ALARM_COLORS[
                                                item.key
                                                ],
                                        }}
                                    />

                                    <span>
                                        {ALARM_LABELS[item.key] ||
                                            item.name}
                                    </span>

                                    <strong>{item.value}</strong>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}