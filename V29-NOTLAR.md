# FTS v29 – Operations Suite

- Araç Takibi, Playback, Geofence, Operasyon Merkezi, Alarm Merkezi, Kullanıcı KPI, Yüklemede Bekleme, Teslimde Bekleme ve Yönetim Paneli ortak Premium Light/Dark tema sistemine alındı.
- OperationsSuite.css ile ekran yüzeyleri, butonlar, tablolar, filtreler, kartlar, hover/press animasyonları ve dark-mode kontrastları merkezileştirildi.
- Kullanıcı KPI: tarih aralığındaki loglar 1000'lik Supabase sayfalarıyla tam okunur; kullanıcı/kategori/işlem/arama filtreleri, 6 KPI, kullanıcı özeti, işlem dağılımı, detaylı işlem günlüğü, değişen alanlar, rota sırası detayı, ham JSON detayı, CSV ve 25/50/100/200 sayfalama eklendi.
- Yönetim Paneli: Araç & Operasyon yetki grubu genişletildi; seçili kullanıcı erişim yüzdesi, açık modül sayısı, işlem yetkisi ve son aktivite özeti eklendi. Kullanıcının son işlem logları panel içinde gösterilir.
- Mevcut API/Supabase/Mobiliz/harita/rapor iş mantıkları korunmuştur.
- Temiz ZIP'e node_modules, dist, .git, .vs dahil edilmez.
