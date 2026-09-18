# V7 - Güvenilir ETA

- `Sistem Tahmini Varış` adı kaldırıldı; durak kartlarında `Rota Tahmini` kullanılır. Bu değer canlı ETA değildir.
- Canlı ETA yalnızca Mobiliz GPS verisi yeterince güncelse ve hareket geçmişi mevcutsa üretilir.
- GPS 30 dakikadan eskiyse veya yeterli nokta yoksa canlı ETA gösterilmez.
- Tahmin güveni Yüksek / Orta / Düşük / Hesaplanamıyor olarak gösterilir.
- Kullanıcıya son GPS yaşı ve tahminin hangi veri kalitesine dayandığı açıklanır.
- Anlık hız tek başına ETA kaynağı olarak kullanılmaz; son hareket kayıtlarının ortalaması esas alınır.
