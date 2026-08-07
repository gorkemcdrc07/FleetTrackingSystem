import "./Detay.css";

export default function EtaAnalysis({
    toplamMola,
    toplamDinlenme,
    netSurus,
    gercekEta,
}) {
    return (
        <div className="eta-analizi">
            <div className="eta-head">
                <h2>⏱ ETA Analizi</h2>
                <p>Yasal sürüş, mola ve dinlenme süreleri.</p>
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
                    <span>Gerçek ETA</span>
                    <strong>{gercekEta}</strong>
                </div>
            </div>
        </div>
    );
}
