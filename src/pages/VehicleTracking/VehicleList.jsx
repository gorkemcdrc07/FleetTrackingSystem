function durumMetni(arac) {
    if (arac.kontakAcik && Number(arac.hiz) > 0) return "Hareket halinde";
    if (arac.kontakAcik) return "Rölantide";
    return "Park halinde";
}

function durumClass(arac) {
    if (arac.kontakAcik && Number(arac.hiz) > 0) return "hareketli";
    if (arac.kontakAcik) return "rolanti";
    return "park";
}

export default function AracListesi({ araclar = [], yukleniyor }) {
    return (
        <aside className="arac-takibi-liste">
            <div className="arac-takibi-liste-head">
                <h2>Araç Listesi</h2>
                <span>{araclar.length} kayýt</span>
            </div>

            <div className="arac-takibi-liste-body">
                {araclar.map((arac) => (
                    <div className="arac-takibi-item" key={arac.id}>
                        <div className="arac-takibi-item-top">
                            <strong>{arac.plaka}</strong>
                            <span className={`durum-badge ${durumClass(arac)}`}>
                                {durumMetni(arac)}
                            </span>
                        </div>

                        <div className="arac-takibi-item-info">
                            <span>Hýz: {arac.hiz ?? 0} km/s</span>
                            <span>{arac.sehir} / {arac.ilce}</span>
                            <span>{arac.filo}</span>
                        </div>

                        <small>{arac.sonVeriZamani || "Son veri zamaný yok"}</small>
                    </div>
                ))}

                {!yukleniyor && araclar.length === 0 && (
                    <div className="arac-takibi-bos">Araç bulunamadý.</div>
                )}

                {yukleniyor && (
                    <div className="arac-takibi-bos">Araçlar yükleniyor...</div>
                )}
            </div>
        </aside>
    );
}