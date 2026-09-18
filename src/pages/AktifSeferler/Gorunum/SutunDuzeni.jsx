import { Eye, EyeOff, GripVertical } from "lucide-react";
﻿import React, { useMemo, useState } from "react";
import "./SutunDuzeni.css";

const IconEye=()=> <Eye size={17}/>;
const IconEyeOff=()=> <EyeOff size={17}/>;
const IconGrip=()=> <GripVertical size={17}/>;

function SutunDuzeni({
    columns,
    visibleColumnKeys,
    onToggleColumn,
    onReorderColumns,
    onReset,
    onClose,
}) {
    const [dragKey, setDragKey] = useState(null);
    const [overKey, setOverKey] = useState(null);

    const visibleCount = useMemo(
        () => columns.filter((col) => visibleColumnKeys.includes(col.key)).length,
        [columns, visibleColumnKeys]
    );

    const handleDragStart = (e, key) => {
        setDragKey(key);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", key);
    };

    const handleDragOver = (e, key) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOverKey(key);
    };

    const handleDrop = (e, targetKey) => {
        e.preventDefault();

        const sourceKey = dragKey || e.dataTransfer.getData("text/plain");

        setDragKey(null);
        setOverKey(null);

        if (!sourceKey || sourceKey === targetKey) return;

        onReorderColumns(sourceKey, targetKey);
    };

    const handleDragEnd = () => {
        setDragKey(null);
        setOverKey(null);
    };

    return (
        <div className="sutun-overlay" onMouseDown={onClose}>
            <div role="dialog" aria-modal="true" aria-label="Sütun Düzeni" className="sutun-panel" onMouseDown={(e) => e.stopPropagation()}>
                <div className="sutun-head">
                    <div>
                        <div className="sutun-eyebrow">Görünüm</div>
                        <h3>Sütun Düzeni</h3>
                        <p>Kartları sürükleyerek sıralayın, göz ikonuyla sütunları gizleyin veya gösterin.</p>
                    </div>

                    <button className="sutun-close" aria-label="Sütun düzenini kapat" type="button" onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className="sutun-stats">
                    <span>{visibleCount} görünür</span>
                    <span>{columns.length - visibleCount} gizli</span>
                    <span>Sürükle bırak</span>
                </div>

                <div className="sutun-list">
                    {columns.map((col) => {
                        const isVisible = visibleColumnKeys.includes(col.key);
                        const isLocked = col.locked;
                        const isDragging = dragKey === col.key;
                        const isOver = overKey === col.key && dragKey !== col.key;

                        return (
                            <div
                                className={[
                                    "sutun-item",
                                    !isVisible ? "is-hidden" : "",
                                    isDragging ? "is-dragging" : "",
                                    isOver ? "is-over" : "",
                                    isLocked ? "is-locked" : "",
                                ].filter(Boolean).join(" ")}
                                key={col.key}
                                draggable
                                onDragStart={(e) => handleDragStart(e, col.key)}
                                onDragOver={(e) => handleDragOver(e, col.key)}
                                onDrop={(e) => handleDrop(e, col.key)}
                                onDragEnd={handleDragEnd}
                            >
                                <div className="sutun-grip" title="Sürükle">
                                    <IconGrip />
                                </div>

                                <button
                                    type="button"
                                    className={`sutun-eye ${isVisible ? "active" : ""}`}
                                    onClick={() => onToggleColumn(col.key)}
                                    disabled={isLocked}
                                    aria-label={`${col.label || "Rota"} ${isVisible ? "sütununu gizle" : "sütununu göster"}`} title={isVisible ? "Sütunu gizle" : "Sütunu göster"}
                                >
                                    {isVisible ? <IconEye /> : <IconEyeOff />}
                                </button>

                                <div className="sutun-info">
                                    <strong>{col.label || col.key}</strong>
                                    <span>{isLocked ? "Sabit / gizlenemez" : isVisible ? "Görünür" : "Gizli"}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="sutun-footer">
                    <button type="button" className="sutun-reset" onClick={onReset}>
                        Varsayılana Dön
                    </button>

                    <button type="button" className="sutun-done" onClick={onClose}>
                        Tamam
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SutunDuzeni;