<<<<<<< HEAD:src/pages/ActiveTrips/Details/Tabs.jsx
﻿import "./Detay.css";

export default function Tabs({ activeTab, onChange }) {
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
=======
import { ClipboardList, Satellite, Route, Clock3 } from "lucide-react";
import "./Detay.css";
export default function Sekmeler({activeTab,onChange}) {
 const tabs=[{key:"genel",title:"Genel Bilgiler",icon:ClipboardList},{key:"mobiliz",title:"Mobiliz",icon:Satellite},{key:"rota",title:"Rota",icon:Route},{key:"eta",title:"ETA",icon:Clock3}];
 return <div className="detay-tabs" aria-label="Sefer detay bölümleri">{tabs.map(({key,title,icon:Icon})=><button key={key} type="button" aria-pressed={activeTab===key} className={`detay-tab ${activeTab===key?"active":""}`} onClick={()=>onChange(key)}><Icon size={17}/>{title}</button>)}</div>;
>>>>>>> e19f46db99295929579026857074dda7619efeec:src/pages/AktifSeferler/Detay/Sekmeler.jsx
}
