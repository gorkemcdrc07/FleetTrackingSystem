begin;

create or replace function public.normalize_sefer_no(value text)
returns text language sql immutable strict
as $$ select upper(btrim(value)); $$;

create or replace function public.canonicalize_sefer_no()
returns trigger language plpgsql as $$
begin
    new.sefer_no := public.normalize_sefer_no(new.sefer_no);
    if new.sefer_no = '' then
        raise exception 'sefer_no boş olamaz' using errcode = '23514';
    end if;
    return new;
end;
$$;

update public.aktif_seferler set sefer_no = public.normalize_sefer_no(sefer_no)
where sefer_no is distinct from public.normalize_sefer_no(sefer_no);
update public.tamamlanan_seferler set sefer_no = public.normalize_sefer_no(sefer_no)
where sefer_no is distinct from public.normalize_sefer_no(sefer_no);

delete from public.aktif_seferler a using public.aktif_seferler duplicate
where a.sefer_no = duplicate.sefer_no and a.ctid < duplicate.ctid;
delete from public.tamamlanan_seferler a using public.tamamlanan_seferler duplicate
where a.sefer_no = duplicate.sefer_no and a.ctid < duplicate.ctid;

-- İki tabloda da bulunan eski kayıtlarda tamamlanan kayıt kazanır.
delete from public.aktif_seferler active using public.tamamlanan_seferler completed
where active.sefer_no = completed.sefer_no;

alter table public.aktif_seferler alter column sefer_no set not null;
alter table public.tamamlanan_seferler alter column sefer_no set not null;
create unique index if not exists aktif_seferler_sefer_no_uidx on public.aktif_seferler (sefer_no);
create unique index if not exists tamamlanan_seferler_sefer_no_uidx on public.tamamlanan_seferler (sefer_no);

drop trigger if exists aktif_seferler_canonicalize_sefer_no on public.aktif_seferler;
create trigger aktif_seferler_canonicalize_sefer_no before insert or update of sefer_no
on public.aktif_seferler for each row execute function public.canonicalize_sefer_no();
drop trigger if exists tamamlanan_seferler_canonicalize_sefer_no on public.tamamlanan_seferler;
create trigger tamamlanan_seferler_canonicalize_sefer_no before insert or update of sefer_no
on public.tamamlanan_seferler for each row execute function public.canonicalize_sefer_no();

create or replace function public.reject_completed_active_trip()
returns trigger language plpgsql as $$
begin
    perform pg_advisory_xact_lock(hashtext(new.sefer_no));
    if exists (select 1 from public.tamamlanan_seferler where sefer_no = new.sefer_no) then
        -- Tek bir tamamlanmış kayıt yüzünden toplu TMS senkronunu iptal etme;
        -- bu satırı sessizce atla. BEFORE trigger'da null satırı engeller.
        return null;
    end if;
    return new;
end;
$$;
drop trigger if exists aktif_seferler_reject_completed on public.aktif_seferler;
create trigger aktif_seferler_reject_completed before insert or update of sefer_no
on public.aktif_seferler for each row execute function public.reject_completed_active_trip();

create or replace function public.remove_completed_trip_from_active()
returns trigger language plpgsql as $$
begin
    perform pg_advisory_xact_lock(hashtext(new.sefer_no));
    delete from public.aktif_seferler where sefer_no = new.sefer_no;
    return new;
end;
$$;
drop trigger if exists tamamlanan_seferler_remove_active on public.tamamlanan_seferler;
create trigger tamamlanan_seferler_remove_active before insert or update of sefer_no
on public.tamamlanan_seferler for each row execute function public.remove_completed_trip_from_active();

commit;
