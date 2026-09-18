# V6 Rota & Duraklar
- Detay ilk açılış sekmesi artık Rota & Duraklar.
- Her durakta Planlanan Varış alanı eklendi ve rota_detaylari.planlanan_varis olarak kaydediliyor.
- Sistem Tahmini Varış ayrı gösteriliyor; gerçekleşen varış/çıkış alanları korunuyor.
- Her segment bir önceki duraktan sonraki durağa zincir halinde gösteriliyor (KM + net sürüş).
- Geocoding ilçe/il öncelikli hale getirildi; firma/nokta adının yanlış lokasyona götürüp KM'yi şişirmesi azaltıldı.
- OSRM tek zincir olarak Nokta1 -> Nokta2 -> Nokta3 şeklinde hesaplanıyor; legs segment bazında gösteriliyor.
