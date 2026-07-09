export default function FiltrePaneli({ filtreler, setFiltreler }) {
    function filtreGuncelle(key, value) {
        setFiltreler((prev) => ({
            ...prev,
            [key]: value,
        }));
    }

    function temizle() {
        setFiltreler({
            plaka: "",
            filo: "",
            grup: "",
            durum: "tum",
        });
    }

    return (
        <div className="arac-takibi-filtre">
            <input
                value={filtreler.plaka}
                onChange={(e) => filtreGuncelle("plaka", e.target.value)}
                placeholder="Plaka ara..."
            />

            <input
                value={filtreler.filo}
                onChange={(e) => filtreGuncelle("filo", e.target.value)}
                placeholder="Filo ara..."
            />

            <input
                value={filtreler.grup}
                onChange={(e) => filtreGuncelle("grup", e.target.value)}
                placeholder="Grup ara..."
            />

            <select
                value={filtreler.durum}
                onChange={(e) => filtreGuncelle("durum", e.target.value)}
            >
                <option value="tum">Tüm durumlar</option>
                <option value="hareketli">Hareket halinde</option>
                <option value="rolanti">Rölantide</option>
                <option value="park">Park halinde</option>
            </select>

            <button type="button" onClick={temizle}>
                Temizle
            </button>
        </div>
    );
}