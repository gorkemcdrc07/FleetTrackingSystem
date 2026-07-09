export function sonKonumDonustur(item = {}) {
    return {
        id: item.muId || item.networkId || item.plate,
        muId: item.muId,
        networkId: item.networkId,
        plaka: item.plate || "-",
        filo: item.fleetName || "-",
        grup: item.groupName || "-",
        hiz: item.speed ?? 0,
        sehir: item.city || "-",
        ilce: item.town || "-",
        adres: [item.city, item.town, item.way].filter(Boolean).join(" / "),
        enlem: Number(item.latitude),
        boylam: Number(item.longitude),
        kontakAcik: item.ignition === "A",
        motorAcik: item.engine === "A",
        sonVeriZamani: item.dataTime || item.gpsTime || null,
        hamVeri: item,
    };
}

export function rotaNoktasiDonustur(item = {}) {
    return {
        id: item.eventLogId || `${item.networkId}-${item.time}`,
        muId: item.muId,
        networkId: item.networkId,
        plaka: item.plate || "-",
        enlem: Number(item.latitude),
        boylam: Number(item.longitude),
        hiz: item.groundSpeed ?? item.speed ?? 0,
        zaman: item.time,
        adres: [item.city, item.town, item.street].filter(Boolean).join(" / "),
        hamVeri: item,
    };
}

export function gecerliKoordinatMi(item) {
    return (
        Number.isFinite(item?.enlem) &&
        Number.isFinite(item?.boylam) &&
        item.enlem !== 0 &&
        item.boylam !== 0
    );
}