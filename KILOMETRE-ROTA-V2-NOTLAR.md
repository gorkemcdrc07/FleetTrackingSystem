# Kilometre / Rota Hafızası v2

- Aynı rota yalnızca `yukleme_ili + yukleme_ilcesi + teslim_ili + teslim_ilcesi` ile belirlenir.
- Büyük/küçük harf, Türkçe karakter ve gereksiz boşluklar normalize edilir.
- Birden fazla yükleme/teslim varsa il/ilçe çiftlerinin sırası da rota anahtarına dahildir.
- İl veya ilçe eksikse otomatik eşleşme yapılmaz ve rota kilometresi kaydedilemez.
- Aynı rota ekranda birden fazla seferde varsa yeni KM kaydedildiğinde hepsi anında güncellenir.
- Yeni/yenilenen sefer listesinde daha önce kaydedilmiş rota kilometreleri otomatik uygulanır.
- Supabase ortak hafıza için `supabase/rota_kilometreleri.sql` SQL Editor'da çalıştırılmalıdır.
- Eski v1 localStorage anahtarları v2'de kullanılmaz; böylece nokta/firma bazlı eski yanlış eşleşmeler taşınmaz.
