# FTS Dashboard v4

## Çalıştırma
ZIP'i yeni bir klasöre çıkarın. Node.js 22.14+ ve pnpm ile:

    pnpm install --frozen-lockfile
    pnpm dev

Üretim kontrolü:

    pnpm build
    pnpm test

## Değişiklikler
- Dashboard altında sabit Canlı Alarmlar şeridi ve Son Alarmlar kartı kaldırıldı. Bildirim merkezi ve diğer sayfaların davranışı korundu.
- Sidebar 80px (küçük ekranlarda 64px); hover veya klavye odağında 278px genişler. Sabitleme düğmesi dokunmatik kullanım sağlar. Escape odağı ve sabitlemeyi kapatır. Menü tooltip'leri yerel tarayıcı tooltip'leridir.
- Orijinal fts-logo.png korundu. Menü ve bildirim düğmesi lucide-react ikonlarını kullanır.
- Yeni altı KPI, geniş harita, filo sağlığı, hareket listesi ve bakım alanı. KPI oranları gerçek araç sayılarından hesaplanır; dekoratif sahte grafikler kaldırıldı.
- Plaka araması ve KPI filtreleri birlikte çalışır. Tümü filtresi genel harita görünümüne döner.
- Yaklaşan bakımlar için mevcut projede bir tarih/veri kaynağı bulunmadığından açıklayıcı boş durum gösterilir. Gerçek bakım takvimi için veri bağlantısı gerekir.
- API adresi, yenileme aralığı, veri alma, bildirim işleme ve sayfa adları korundu.
- Eksik dayjs bağımlılığı eklendi. Geçersiz NotificationToasts prop kullanımı düzeltildi.

## Doğrulama
- TypeScript + Vite üretim build'i başarılı. Büyük mevcut JavaScript paketi için Vite boyut uyarısı bulunuyor.
- Mevcut 2 sefer/veri testi başarılı.
- Tarayıcı: 1440px ve 390px; hover/açılma/kapanma, mobil düğme, aktif menü, plaka araması, KPI filtreleri, bildirim paneli, alarm şeridinin yokluğu ve yatay taşma kontrolleri geçti. JavaScript çalışma zamanı hatası bulunmadı.
- Canlı sunucu bu oturumda veri döndürmedi. Etkileşim testi ve ayrı PNG önizlemesi üç örnek araçla yapıldı; bu örnek kayıtlar projeye eklenmedi. Canlı API uçtan uca doğrulanamadı.
- Bu paket pnpm-lock.yaml kullanır. v3'ün eski npm kilidi dahil edilmedi. node_modules dahil değildir.
