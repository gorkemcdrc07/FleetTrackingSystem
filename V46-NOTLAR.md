# FTS v46 — Hakediş Operations Suite

Bu sürüm v45'in mevcut iş kurallarını koruyarak Hakedişler alanına ortak operasyon katmanı ekler.

## Yeni
- **Hakediş Merkezi**: 10 hakediş modülünü tek ekranda açma, arama, veri durumu ve son işlem bilgisi.
- **Ortak çalışma alanı barı**: tüm hakediş ekranlarında Hakediş Merkezi dönüşü, Ön Kontrol, Hesaplama Mantığı ve Satır Analizi.
- **Ön Kontrol**: kullanıcı/bağlantı kontrolü ve mevcut Supabase tablolarında kayıt durumu. Frigo ve Hayat Kimya geçici tabloları dahil.
- **Satır Analizi**: mod açıldığında tablo/DataGrid sonuç satırına tıklayarak satır değerlerini drawer içinde inceleme.
- **Hesaplama Mantığı drawer'ı**: modül bazlı iş kuralı notları. Mevcut hesaplama kodları değiştirilmedi.
- **İşlem geçmişi**: ekran açma, dosya seçme, hesaplama, Excel/çıktı, kayıt, silme/onay gibi hareketler cihaz üzerinde son 180 kayıt olarak tutulur (`fts_hakedis_audit_v1`). Kullanıcı, dosya adı ve zaman bilgisi mümkün olduğunda kaydedilir.
- **Excel standardizasyonu**: ExcelJS ve SheetJS çıktılarında Odak Lojistik metadata/header bilgisi, belirgin kolon başlıkları, filtre/freeze ve yazdırma ayarları eklendi. Veri kolonları ve hesaplama içerikleri korunur.
- **Mobil/tablet**: Hakediş Merkezi, ortak üst bar ve drawer'lar responsive hale getirildi.
- **Klavye**: Ctrl/Cmd+Shift+H Hakediş Merkezi, Ctrl/Cmd+Shift+P Ön Kontrol.

## Korunan iş mantığı
- Frigo SFR/BOS oranları ve mevcut hesaplama motoru.
- Pepsi müşteri bazlı oranlar.
- Ebebek, Hayat Kimya, Filo İskontolu, Hamaliye, Tedarikçi Masraf, Hakediş Seferleri ve Araç Cari/Fiyat ekranlarının mevcut fonksiyonları.
- Mevcut Supabase tabloları ve API/REEL entegrasyonları.

## Kontrol
- Değişen TS/TSX/JS/JSX dosyaları TypeScript `transpileModule` ile sözdizimi kontrolünden geçirildi: hata yok.
- Göreli import yolları tarandı: eksik import yok.
- Hakedişler altında `@mui/icons-material` barrel importu kalmadı.
- Bu çalışma ortamında `pnpm` executable olmadığı için tam Vite production build çalıştırılamadı.
