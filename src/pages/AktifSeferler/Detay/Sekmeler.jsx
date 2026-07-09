import "./Detay.css";

export default function Sekmeler({ activeTab, onChange }) {
    const tabs = [
        {
            key: "genel",
            title: "Genel Bilgiler",
            icon: "📋",
        },
        {
            key: "mobiliz",
            title: "Mobiliz",
            icon: "🛰️",
        },
        {
            key: "rota",
            title: "Rota",
            icon: "🛣️",
        },
        {
            key: "eta",
            title: "ETA",
            icon: "⏱️",
        },
    ];

    return (
        <div className="detay-tabs">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    className={
                        activeTab === tab.key
                            ? "detay-tab active"
                            : "detay-tab"
                    }
                    onClick={() => onChange(tab.key)}
                >
                    <span>{tab.icon}</span>
                    {tab.title}
                </button>
            ))}
        </div>
    );
}