# FTS v5 — Aktif Seferler frontend

Bu sürüm v4 Dashboard tasarımını korur ve Aktif Seferler çalışma alanını yeniler.

## Kullanım
Yeni bir klasöre çıkarıp proje kökünde:

    pnpm install --frozen-lockfile
    pnpm dev

## Yeni çalışma alanı
- Kompakt başlık, sefer/araç/tonaj/ikaz özetleri ve tarih/yenileme şeridi.
- Sefer, plaka, sürücü, müşteri ve şehir içinde hızlı arama.
- Tüm seferler, tonajlı ve ikazlı hızlı filtreleri; mevcut sütun filtreleriyle birlikte çalışır.
- Detay ve ETA satırda; tonaj, ikaz ve silme Diğer işlemler menüsünde. Mevcut işlemlerin işleyişi korunur.
- Operasyon görünümü temel sütunları seçer. Görünüm panelinden tüm sütunlar yeniden gösterilebilir ve sıralanabilir. Kullanıcının mevcut sütun kaydetme akışı devam eder.
- Rahat/sıkı satır yoğunluğu ve 25/50/100 satırlık sayfalama.
- Modern rota açılımı, detay ve ETA panelleri; lucide ikonlar.
- Filtre ve sütun panellerinde Escape, odak yönetimi ve klavye dolaşımı.
- Küçük ekranda tablo kendi alanında yatay kayar; sayfa dışına taşmaz.

## Doğrulama
- TypeScript + Vite build başarılı. Mevcut büyük paket boyutu uyarısı sürüyor.
- Mevcut 2 test geçti.
- Tarayıcıda 32 örnek seferle arama, hızlı filtreler, sayfalama, rota, işlem menüsü, Escape, sütun/filtre panelleri, Detay, ETA, yoğunluk ve mobil taşma kontrol edildi. JavaScript hatası yok.
- Önizleme örnek kayıtlarla üretildi; örnek veriler kaynak projeye dahil değildir.
- Testte tüm dış servis istekleri taklit edildi, canlı veri değiştirilmedi.

## Sonraki adım
Kullanıcının önceliği gereği bu tur frontend ile sınırlıdır. Aralıklı TMS yenileme/API hatası henüz düzeltilmedi. useActiveTrips, TMS servisi, API ayarı ve veri erişim dosyaları v4 ile aynıdır.
