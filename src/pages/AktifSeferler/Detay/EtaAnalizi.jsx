import { Clock3 } from "lucide-react";
﻿import "./Detay.css";

export default function EtaAnalizi({
    toplamMola,
    toplamDinlenme,
    netSurus,
    gercekEta,
}) {
    return (
        <div className="eta-analizi">
            <div className="eta-head">
                <h2><Clock3 size={22}/> ETA planlaması</h2>
                <p>Yol rotası ve seçili sürüş/mola varsayımlarına göre tahmini süreler.</p>
            </div>

            <div className="eta-grid">
                <div>
                    <span>Toplam Mola</span>
                    <strong>{toplamMola}</strong>
                </div>

                <div>
                    <span>Toplam Dinlenme</span>
                    <strong>{toplamDinlenme}</strong>
                </div>

                <div>
                    <span>Net Sürüş</span>
                    <strong>{netSurus}</strong>
                </div>

                <div>
                    <span>Planlı toplam süre</span>
                    <strong>{gercekEta}</strong>
                </div>
            </div>
            <p className="route-estimate-note">Plan: 4,5 saat sürüşten sonra 45 dakika mola; 9 saat sürüşten sonra 11 saat dinlenme. Sürücünün önceki çalışma süresi, duraktaki beklemeler, canlı trafik ve araç kısıtları bu hesaba dahil değildir.</p>
        </div>
    );
}