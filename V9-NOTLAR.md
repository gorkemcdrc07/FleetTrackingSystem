# FTS Modern Dashboard v9

## Araç Takibi modernizasyonu

- Araç Takibi ekranı v8 tema diline uygun, açık ve kurumsal bir operasyon çalışma alanına dönüştürüldü.
- Tema renkleri ekran kapsamına alınan `AracTakibiModern.css` içinde tutuldu; diğer sayfalara global stil sızdırılmadı.
- lucide-react ikonları kullanıldı.
- Üst başlık alanı, otomatik yenileme durumu ve son yenileme bilgisi sadeleştirildi.
- KPI alanına Toplam, Hareket Halinde, Rölantide, Park Halinde ve GPS Konumu Yok kartları eklendi.
- Durum KPI kartları filtre kısayolu olarak kullanılabilir hale getirildi.
- Filtreler etiketli hale getirildi; arama plaka yanında konum, filo ve grup alanlarını da kapsıyor.
- Aktif filtre sayacı ve tek tıkla filtre temizleme eklendi.
- Araç listesine plakaya, hıza, duruma ve son veri zamanına göre sıralama eklendi.
- Listeye 25 / 50 / 100 kayıt sayfalama eklendi.
- Rahat / kompakt liste yoğunluğu seçimi eklendi.
- Yükleme ve boş sonuç durumları daha anlaşılır hale getirildi.
- Seçili araç kartı; durum, hız, kontak, son veri ve adres bilgilerini daha okunabilir gösteriyor.
- Google Maps ve mevcut Araç Detayı işlemleri korundu.
- Harita, mevcut `Harita` bileşenini ve mevcut Mobiliz veri akışını kullanmaya devam ediyor.
- 30 saniyelik mevcut otomatik yenileme davranışı korundu.
- Mevcut route/API/veri şeması değiştirilmedi.

## Doğrulama

- TypeScript `tsc -b` kontrolü başarılı.
- Bu çalışma ortamında tam Vite build/tarayıcı testi, yüklenen v8 ZIP içindeki Windows `@rolldown/binding-win32-x64-msvc` native paketinin Linux ortamında çalışmaması nedeniyle başlatılamadı. Kaynak seviyesinde TypeScript kontrolü temizdir; v8'in mevcut bağımlılık paketi final ZIP'te değiştirilmemiştir.
