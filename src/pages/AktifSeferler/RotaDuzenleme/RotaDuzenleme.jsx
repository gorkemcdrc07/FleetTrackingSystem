import { GripVertical, ArrowUp, ArrowDown, X } from "lucide-react";
﻿import { useMemo, useState } from "react";
import "./RotaDuzenleme.css";

const IconGrip=()=> <GripVertical size={18}/>;

function RotaDuzenleme({ route, onClose, onSave }) {
    const [items, setItems] = useState(() => route || []);
    const [dragId, setDragId] = useState(null);
    const [overId, setOverId] = useState(null);

    const yuklemeItems = useMemo(
        () => items.filter((x) => x.type === "Yükleme"),
        [items]
    );

    const teslimItems = useMemo(
        () => items.filter((x) => x.type === "Teslim"),
        [items]
    );

    function itemKey(item, index) {
        return item.id || `${item.type}-${index}-${item.nokta || ""}`;
    }

    function handleDragStart(e, key) {
        setDragId(key);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", key);
    }

    function handleDragOver(e, key) {
        e.preventDefault();
        setOverId(key);
    }

    function handleDrop(e, targetKey) {
        e.preventDefault();

        const sourceKey = dragId || e.dataTransfer.getData("text/plain");

        setDragId(null);
        setOverId(null);

        if (!sourceKey || sourceKey === targetKey) return;

        setItems((prev) => {
            const loads = prev.filter((x) => x.type === "Yükleme");
            const deliveries = prev.filter((x) => x.type === "Teslim");

            const sourceIndex = deliveries.findIndex((item, index) => itemKey(item, index) === sourceKey);
            const targetIndex = deliveries.findIndex((item, index) => itemKey(item, index) === targetKey);

            if (sourceIndex === -1 || targetIndex === -1) return prev;

            const nextDeliveries = [...deliveries];
            const [removed] = nextDeliveries.splice(sourceIndex, 1);
            nextDeliveries.splice(targetIndex, 0, removed);

            return [...loads, ...nextDeliveries].map((item, index) => ({
                ...item,
                sira: index + 1,
            }));
        });
    }

    function moveDelivery(index,direction){
        const next=[...teslimItems];const target=index+direction;
        if(target<0||target>=next.length)return;
        [next[index],next[target]]=[next[target],next[index]];
        setItems([...yuklemeItems,...next].map((item,i)=>({...item,sira:i+1})));
    }
    return (
        <div className="rota-duzenle-overlay" onMouseDown={onClose}>
            <div role="dialog" aria-modal="true" aria-label="Teslim sırası düzenle" className="rota-duzenle-panel" onMouseDown={(e) => e.stopPropagation()}>
                <div className="rota-duzenle-head">
                    <div>
                        <div className="rota-duzenle-eyebrow">Rota Yönetimi</div>
                        <h3>Teslim Sırası Düzenle</h3>
                        <p>Yükleme noktaları sabit kalır. Teslim noktalarını sürükleyerek veya oklarla sıralayın.</p>
                    </div>

                    <button type="button" aria-label="Sıralamayı kapat" className="rota-duzenle-close" onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className="rota-duzenle-body">
                    <div className="rota-duzenle-section">
                        <div className="rota-duzenle-title">Sabit Yükleme Noktaları</div>

                        {yuklemeItems.map((item, index) => (
                            <div className="rota-duzenle-item is-load" key={`load-${index}-${item.nokta || ""}`}>
                                <div className="rota-duzenle-number">{index + 1}</div>
                                <div className="rota-duzenle-info">
                                    <strong>{item.nokta || "Yükleme Noktası"}</strong>
                                    <span>{[item.il, item.ilce].filter(Boolean).join(" / ") || "Konum yok"}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="rota-duzenle-section">
                        <div className="rota-duzenle-title">Sürüklenebilir Teslim Noktaları</div>

                        {teslimItems.map((item, index) => {
                            const key = itemKey(item, index);
                            const realIndex = yuklemeItems.length + index + 1;

                            return (
                                <div
                                    key={key}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, key)}
                                    onDragOver={(e) => handleDragOver(e, key)}
                                    onDrop={(e) => handleDrop(e, key)}
                                    onDragEnd={() => {
                                        setDragId(null);
                                        setOverId(null);
                                    }}
                                    className={[
                                        "rota-duzenle-item",
                                        "is-delivery",
                                        dragId === key ? "is-dragging" : "",
                                        overId === key && dragId !== key ? "is-over" : "",
                                    ].filter(Boolean).join(" ")}
                                >
                                    <div className="delivery-move"><button aria-label={`${index+1}. teslimi yukarı taşı`} disabled={index===0} onClick={()=>moveDelivery(index,-1)}><ArrowUp size={15}/></button><button aria-label={`${index+1}. teslimi aşağı taşı`} disabled={index===teslimItems.length-1} onClick={()=>moveDelivery(index,1)}><ArrowDown size={15}/></button></div>
                                    <div className="rota-duzenle-grip">
                                        <IconGrip />
                                    </div>

                                    <div className="rota-duzenle-number">{realIndex}</div>

                                    <div className="rota-duzenle-info">
                                        <strong>{item.nokta || "Teslim Noktası"}</strong>
                                        <span>{[item.il, item.ilce].filter(Boolean).join(" / ") || "Konum yok"}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="rota-duzenle-footer">
                    <button type="button" className="rota-duzenle-cancel" onClick={onClose}>
                        Vazgeç
                    </button>

                    <button type="button" className="rota-duzenle-save" onClick={() => onSave(items)}>
                        Sıralamayı Uygula
                    </button>
                </div>
            </div>
        </div>
    );
}

export default RotaDuzenleme;