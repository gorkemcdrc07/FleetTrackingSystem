# Fleet Tracking System

Fleet Tracking System (FTS), filo operasyonlarını, aktif ve tamamlanan seferleri, canlı araç konumlarını, raporları ve hakediş süreçlerini tek panelde yöneten bir React uygulamasıdır.

## Öne çıkan yetenekler

- Aktif ve tamamlanan sefer yönetimi
- Sefer kimliği ve veritabanı seviyesinde benzersizlik koruması
- Mobiliz ve TMS entegrasyonları
- Canlı araç takibi, geofence, alarm ve rota geçmişi
- Bekleme, KPI ve operasyon raporları
- Araç, evrak, fiyatlandırma ve hakediş yönetimi
- Sayfa bazlı lazy loading ve hata sınırları
- Otomatik test, üretim derlemesi ve Vercel önizleme kontrolleri

## Mimari

```text
src/
├── components/   Yeniden kullanılabilir arayüz parçaları
├── domain/       Saf iş kuralları ve veri dönüşümleri
├── navigation/   Sayfa yönlendirme ve lazy loading
├── pages/        Sayfa bileşenleri ve sayfaya özel hook'lar
├── services/     Supabase, TMS, Mobiliz ve tarayıcı servisleri
└── config/       Ortam ve API yapılandırması
```

Veri akışı `page/hook → service/repository → external API/database` yönündedir. Filtreleme, normalizasyon ve hesaplama gibi saf kurallar `domain` katmanında tutulur ve Node testleriyle doğrulanır.

## Yerel kurulum

Gereksinimler: Node.js 22 ve npm.

```bash
npm ci
cp .env.example .env
npm run dev
```

Windows PowerShell için:

```powershell
Copy-Item .env.example .env
npm.cmd run dev
```

Uygulama `npm start` kullanmaz. Kullanılabilir komutlar:

```bash
npm run dev       # Vite ve yerel proxy
npm run frontend  # Yalnızca Vite
npm test          # Domain/repository regresyon testleri
npm run build     # TypeScript ve üretim derlemesi
npm run lint      # ESLint
```

## Kalite güvence

Her `main` hedefli pull request için GitHub Actions otomatik olarak bağımlılıkları temiz kurar, testleri çalıştırır ve üretim paketini oluşturur. Vercel ayrıca izole bir önizleme dağıtımı üretir.

## Veritabanı

Supabase migration dosyaları `supabase/migrations` altındadır. Migration'lar önce test/staging projesinde uygulanmalı ve yedek alınmadan üretimde çalıştırılmamalıdır.

## Güvenlik durumu

İstemci ortamında yalnızca yayınlanabilir Supabase anon anahtarı bulunmalıdır. Service-role anahtarı ve üçüncü taraf gizli anahtarları Vite değişkenlerine eklenmemelidir. Mevcut kimlik doğrulama akışının Supabase Auth + RLS geçişi tamamlanmadan sistem genel internete açık üretim uygulaması olarak değerlendirilmemelidir. Ayrıntılar [SECURITY.md](SECURITY.md) dosyasındadır.

## Dağıtım

Üretim dalı `main`dir. Değişiklikler pull request, başarılı CI ve Vercel önizlemesi sonrasında squash merge ile alınır.
