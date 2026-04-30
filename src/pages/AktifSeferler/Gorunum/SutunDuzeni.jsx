import React, { useMemo, useState } from "react";
import "./SutunDuzeni.css";

function IconEye() {
    return (
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        </svg>
    );
}

function IconEyeOff() {
    return (
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M9.8 5.3A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17.5 17.5 0 0 1-3 3.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M6.6 6.6C3.6 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.2-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

function IconGrip() {
    return (
        <svg viewBox="0 0 24 24" fill="none">
            <circle cx="9" cy="6" r="1.5" fill="currentColor" />
            <circle cx="15" cy="6" r="1.5" fill="currentColor" />
            <circle cx="9" cy="12" r="1.5" fill="currentColor" />
            <circle cx="15" cy="12" r="1.5" fill="currentColor" />
            <circle cx="9" cy="18" r="1.5" fill="currentColor" />
            <circle cx="15" cy="18" r="1.5" fill="currentColor" />
        </svg>
    );
}

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
            <div className="sutun-panel" onMouseDown={(e) => e.stopPropagation()}>
                <div className="sutun-head">
                    <div>
                        <div className="sutun-eyebrow">Görünüm</div>
                        <h3>Sütun Düzeni</h3>
                        <p>Kartları sürükleyerek sıralayın, göz ikonuyla sütunları gizleyin veya gösterin.</p>
                    </div>

                    <button className="sutun-close" type="button" onClick={onClose}>
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
                                    title={isVisible ? "Sütunu gizle" : "Sütunu göster"}
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