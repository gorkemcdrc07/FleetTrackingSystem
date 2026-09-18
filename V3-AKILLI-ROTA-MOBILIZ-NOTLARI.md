# V3 - Akıllı Çok Duraklı Rota + Mobiliz Canlı Analiz

- KM hafızası artık yükleme ve teslim İl/İlçe kümelerini ayrı ayrı canonical olarak eşleştirir. Aynı duraklar farklı sırada gelirse de rota bulunur.
- Mobiliz sekmesine canlı sefer analizi eklendi: planlanan KM, GPS geçmişinden gidilen KM, kalan KM, hareket ortalama hızı, tahmini kalan süre ve tahmini varış.
- Sonraki planlı rota noktası gösterilir.
- Mobiliz activity-last 30 sn, canlı analiz activity-detail 60 sn yenilenir.
- GPS sıçramalarında iki ardışık nokta arasında 5 km üzeri tek atlamalar gidilen KM hesabına dahil edilmez.
- Canlı ETA operasyonel tahmindir; trafik, sürücü mola/dinlenme ve durak beklemeleri dahil değildir.
- Supabase rota_kilometreleri.sql v2 ile aynı tabloyu kullanır; v3 anahtarları YUKLEME_SET: ile başlar.
