# FTS Modern Dashboard V11

## Güncellenen ekranlar
- Playback: Mobiliz veri normalizasyonu, +0300 tarih formatı, detaylı hata, dün/bugün kısayolları, CSV rota dışa aktarma, haritada açma, modern tema.
- Geofence: FTS modern tema, lucide ikonları, responsive harita/yan paneller, canlı araç veri çağrısı düzeltmesi.
- Operasyon Merkezi: açık kurumsal tema, modern KPI/filtre/listeler, mobil uyum, eski ağır gradyanların kaldırılması.
- Alarm Merkezi: modern tema, otomatik yenileme aç/kapat, incelendi aksiyonu, gelişmiş filtre yerleşimi, hata geri bildirimi.

## Veri bağlantısı düzeltmeleri
- Mobiliz servis cevapları data/result/results/items/list/records/activities/locations biçimlerinde normalize edilir.
- Geofence için sonKonum metodu eklendi.
- Development ortamında /api istekleri relative çalışır.
- /api/mobiliz istekleri Vite üzerinden Render backend'e proxy edilir; diğer /api istekleri mevcut localhost:4000 proxy'ye gider.
- Production ortamında VITE_API_BASE_URL korunur.
