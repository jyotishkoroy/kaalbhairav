-- Copyright (c) 2026 Jyotishko Roy.
-- Proprietary and confidential. All rights reserved.
-- Project: tarayai — https://tarayai.com

create or replace function public.upsert_birth_chart_encrypted(
  p_user_id uuid,
  p_place_name text,
  p_birth_date text,
  p_birth_time text,
  p_latitude text,
  p_longitude text,
  p_encryption_key text
) returns void language plpgsql security definer as $$
begin
  insert into public.birth_charts (
    user_id,
    place_name,
    birth_date_enc,
    birth_time_enc,
    latitude_enc,
    longitude_enc
  )
  values (
    p_user_id,
    p_place_name,
    pgp_sym_encrypt(p_birth_date, p_encryption_key),
    case when p_birth_time is not null then pgp_sym_encrypt(p_birth_time, p_encryption_key) else null end,
    case when p_latitude is not null then pgp_sym_encrypt(p_latitude, p_encryption_key) else null end,
    case when p_longitude is not null then pgp_sym_encrypt(p_longitude, p_encryption_key) else null end
  )
  on conflict (user_id) do update set
    place_name = excluded.place_name,
    birth_date_enc = excluded.birth_date_enc,
    birth_time_enc = excluded.birth_time_enc,
    latitude_enc = excluded.latitude_enc,
    longitude_enc = excluded.longitude_enc,
    updated_at = now();
end $$;
