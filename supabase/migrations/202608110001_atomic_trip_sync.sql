begin;

-- TMS alanlarını günceller; kullanıcı tarafından yönetilen aktif sefer alanlarını
-- (aciklama, rota_detaylari, tonaj_durumu, pasif bilgileri) conflict halinde korur.
create or replace function public.sync_active_trips(p_rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
    item jsonb;
    incoming public.aktif_seferler%rowtype;
    affected integer := 0;
begin
    if jsonb_typeof(p_rows) is distinct from 'array' then
        raise exception 'p_rows bir JSON dizisi olmalıdır' using errcode = '22023';
    end if;

    for item in select value from jsonb_array_elements(p_rows)
    loop
        incoming := jsonb_populate_record(null::public.aktif_seferler, item);
        incoming.sefer_no := public.normalize_sefer_no(incoming.sefer_no);

        if incoming.sefer_no is null or incoming.sefer_no = '' then
            continue;
        end if;

        perform pg_advisory_xact_lock(hashtext(incoming.sefer_no));

        if exists (
            select 1 from public.tamamlanan_seferler completed
            where completed.sefer_no = incoming.sefer_no
        ) then
            continue;
        end if;

        insert into public.aktif_seferler (
            sefer_no, sefer_tarihi, arac_statu, plaka, treyler,
            surucu_ad_soyad, surucu_tckn, surucu_telefon,
            musteri_adi, musteri_siparis_no, hizmet_adi, proje_adi,
            yukleme_noktasi, yukleme_ili, yukleme_ilcesi,
            teslim_alan_firma, teslim_noktasi, teslim_ili, teslim_ilcesi,
            irsaliye_no, aciklama, atama_yapan_kullanici, atama_tarihi,
            rota_detaylari, vehicle_working_type_name,
            vehicle_working_type_id, ham_veri
        ) values (
            incoming.sefer_no, incoming.sefer_tarihi, incoming.arac_statu,
            incoming.plaka, incoming.treyler, incoming.surucu_ad_soyad,
            incoming.surucu_tckn, incoming.surucu_telefon, incoming.musteri_adi,
            incoming.musteri_siparis_no, incoming.hizmet_adi, incoming.proje_adi,
            incoming.yukleme_noktasi, incoming.yukleme_ili, incoming.yukleme_ilcesi,
            incoming.teslim_alan_firma, incoming.teslim_noktasi,
            incoming.teslim_ili, incoming.teslim_ilcesi, incoming.irsaliye_no,
            incoming.aciklama, incoming.atama_yapan_kullanici,
            incoming.atama_tarihi, incoming.rota_detaylari,
            incoming.vehicle_working_type_name,
            incoming.vehicle_working_type_id, incoming.ham_veri
        )
        on conflict (sefer_no) do update set
            sefer_tarihi = excluded.sefer_tarihi,
            arac_statu = excluded.arac_statu,
            plaka = excluded.plaka,
            treyler = excluded.treyler,
            surucu_ad_soyad = excluded.surucu_ad_soyad,
            surucu_tckn = excluded.surucu_tckn,
            surucu_telefon = excluded.surucu_telefon,
            musteri_adi = excluded.musteri_adi,
            musteri_siparis_no = excluded.musteri_siparis_no,
            hizmet_adi = excluded.hizmet_adi,
            proje_adi = excluded.proje_adi,
            yukleme_noktasi = excluded.yukleme_noktasi,
            yukleme_ili = excluded.yukleme_ili,
            yukleme_ilcesi = excluded.yukleme_ilcesi,
            teslim_alan_firma = excluded.teslim_alan_firma,
            teslim_noktasi = excluded.teslim_noktasi,
            teslim_ili = excluded.teslim_ili,
            teslim_ilcesi = excluded.teslim_ilcesi,
            irsaliye_no = excluded.irsaliye_no,
            atama_yapan_kullanici = excluded.atama_yapan_kullanici,
            atama_tarihi = excluded.atama_tarihi,
            vehicle_working_type_name = excluded.vehicle_working_type_name,
            vehicle_working_type_id = excluded.vehicle_working_type_id,
            ham_veri = excluded.ham_veri
        where public.aktif_seferler.pasif is not true;

        affected := affected + 1;
    end loop;

    return affected;
end;
$$;

-- Tamamlanan kaydın oluşturulması ve aktif kaydın kaldırılması aynı transaction'dadır.
-- Aynı sefer tekrar tamamlanırsa ilk tamamlanan snapshot korunur.
create or replace function public.complete_trip(p_payload jsonb)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
    completed public.tamamlanan_seferler%rowtype;
    inserted boolean;
begin
    completed := jsonb_populate_record(null::public.tamamlanan_seferler, p_payload);
    completed.sefer_no := public.normalize_sefer_no(completed.sefer_no);

    if completed.sefer_no is null or completed.sefer_no = '' then
        raise exception 'sefer_no boş olamaz' using errcode = '23514';
    end if;

    perform pg_advisory_xact_lock(hashtext(completed.sefer_no));

    insert into public.tamamlanan_seferler (
        sefer_no, sefer_tarihi, plaka, treyler, surucu_ad_soyad,
        musteri_adi, musteri_siparis_no, hizmet_adi, proje_adi,
        arac_statu, aciklama, irsaliye_no, atama_yapan_kullanici,
        atama_tarihi, rota_detaylari, ham_veri, ana_kayit,
        eta_referans_gun, eta_gerceklesen_gun, eta_gecikme,
        eta_gecikme_suresi, tonaj_durumu
    ) values (
        completed.sefer_no, completed.sefer_tarihi, completed.plaka,
        completed.treyler, completed.surucu_ad_soyad, completed.musteri_adi,
        completed.musteri_siparis_no, completed.hizmet_adi,
        completed.proje_adi, completed.arac_statu, completed.aciklama,
        completed.irsaliye_no, completed.atama_yapan_kullanici,
        completed.atama_tarihi, completed.rota_detaylari, completed.ham_veri,
        completed.ana_kayit, completed.eta_referans_gun,
        completed.eta_gerceklesen_gun, completed.eta_gecikme,
        completed.eta_gecikme_suresi, completed.tonaj_durumu
    )
    on conflict (sefer_no) do nothing
    returning true into inserted;

    delete from public.aktif_seferler where sefer_no = completed.sefer_no;
    return coalesce(inserted, false);
end;
$$;

revoke all on function public.sync_active_trips(jsonb) from public;
revoke all on function public.complete_trip(jsonb) from public;
grant execute on function public.sync_active_trips(jsonb) to anon, authenticated;
grant execute on function public.complete_trip(jsonb) to anon, authenticated;

commit;
