# Security

## Bildirim

Güvenlik açığı bildirimlerini herkese açık issue yerine depo sahibine özel kanaldan iletin. Bildirimde etkilenen akış, yeniden üretme adımları ve olası etki bulunmalıdır.

## Mevcut güvenlik sınırı

Uygulamadaki kullanıcı tablosu tabanlı parola doğrulaması geçici bir uyumluluk katmanıdır. Parola alanının tarayıcıya okunması güvenli bir üretim mimarisi değildir.

Üretim güvenlik geçişi şu sırayla yapılmalıdır:

1. Ayrı bir Supabase staging projesinde Auth kullanıcılarını oluşturun.
2. Uygulama rollerini `profiles` tablosuna taşıyıp `auth.users.id` ile bağlayın.
3. Her tablo için `auth.uid()` ve role dayalı RLS politikalarını staging ortamında doğrulayın.
4. Giriş ekranını `supabase.auth.signInWithPassword` akışına geçirin.
5. Eski `kullanicilar.sifre` alanını istemci sorgularından kaldırın.
6. Parola verisini yedekleme/geri dönüş planı sonrasında silin.
7. Başarılı staging testi ve kullanıcı geçişi tamamlanınca üretime alın.

Bu geçiş tek adımlı migration olarak uygulanmamalıdır; mevcut kullanıcıların oturumunu ve yönetici erişimini kesebilir.

## Gizli değerler

- `VITE_` ile başlayan her değer tarayıcı paketinde okunabilir kabul edilmelidir.
- Supabase service-role, veritabanı parolası ve üçüncü taraf özel tokenları Vercel server-side değişkenlerinde tutulmalıdır.
- `.env` dosyaları repoya eklenmemelidir.
- Şüpheli sızıntıda anahtarlar derhal döndürülmelidir.

## Bağımlılıklar

Bağımlılık uyarıları `npm audit` ile incelenir. `npm audit fix --force` otomatik uygulanmaz; major sürüm değişiklikleri ayrı PR, test ve Vercel önizlemesi gerektirir.
