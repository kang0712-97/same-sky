-- Same Sky — Supabase 스키마 (SQL Editor에 통째로 붙여넣고 Run)
-- 보안 방식: 테이블은 anon 접근 완전 차단(RLS, 정책 없음). 모든 접근은 "커플 코드"를 아는 사람만 호출하는 RPC 함수로만 가능.

create table if not exists ss_couples (
  code text primary key,
  created_at timestamptz not null default now()
);
create table if not exists ss_members (
  code text not null references ss_couples(code) on delete cascade,
  slot text not null check (slot in ('a','b')),
  name text not null check (char_length(name) <= 20),
  avatar jsonb not null,
  city jsonb not null,
  profile text,
  updated_at timestamptz not null default now(),
  primary key (code, slot)
);
create table if not exists ss_photos (
  id uuid primary key default gen_random_uuid(),
  code text not null references ss_couples(code) on delete cascade,
  slot text not null check (slot in ('a','b')),
  local_date text not null,
  caption text not null default '',
  weather text not null default '',
  data text not null,
  taken_at timestamptz not null default now()
);
create index if not exists ss_photos_code_time on ss_photos(code, taken_at desc);
alter table ss_photos add column if not exists hearts text[] not null default '{}';   -- 하트를 보낸 사람(slot) 목록
create table if not exists ss_notes (
  id uuid primary key default gen_random_uuid(),
  code text not null references ss_couples(code) on delete cascade,
  slot text not null check (slot in ('a','b')),      -- 쓴 사람
  body text not null check (char_length(body) between 1 and 60),
  x real not null default 50,
  y real not null default 85,
  created_at timestamptz not null default now()
);
create index if not exists ss_notes_code_time on ss_notes(code, created_at desc);

alter table ss_couples enable row level security;
alter table ss_members enable row level security;
alter table ss_photos  enable row level security;
alter table ss_notes   enable row level security;
revoke all on ss_couples, ss_members, ss_photos, ss_notes from anon, authenticated;

-- 사칭 방지: 슬롯마다 기기 비밀 토큰(해시만 저장). 쓰기 함수는 모두 토큰이 맞아야 실행됨.
-- 이전 버전의(토큰 없는) 쓰기 함수는 우회로가 되므로 지운다.
drop function if exists ss_save_member(text,text,text,jsonb,jsonb,text);
drop function if exists ss_add_photo(text,text,text,text,text,text);
drop function if exists ss_add_note(text,text,text,real,real);
drop function if exists ss_heart_photo(text,uuid,text);
drop function if exists ss_save_room(text,text,jsonb);
alter table ss_members add column if not exists token_hash text;

create or replace function ss_th(p_token text) returns text
language sql immutable as $$ select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex') $$;

-- 이 슬롯의 주인이 맞는지 확인 (아직 토큰이 없는 예전 등록자는 통과 → 앱이 다음 실행 때 토큰을 등록함)
create or replace function ss_auth(p_code text, p_slot text, p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_slot not in ('a','b') then raise exception 'bad_slot'; end if;
  if not exists (select 1 from ss_members where code = upper(p_code) and slot = p_slot and (token_hash is null or token_hash = ss_th(p_token))) then raise exception 'forbidden'; end if;
end $$;

create or replace function ss_create_couple() returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  loop
    c := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    exit when not exists (select 1 from ss_couples where code = c);
  end loop;
  insert into ss_couples(code) values (c);
  return c;
end $$;

create or replace function ss_get_couple(p_code text) returns json
language sql security definer set search_path = public as $$
  select case when exists (select 1 from ss_couples where code = upper(p_code)) then
    json_build_object('exists', true, 'members',
      coalesce((select json_agg(json_build_object('slot', slot, 'name', name, 'avatar', avatar, 'city', city, 'profile', profile)) from ss_members where code = upper(p_code)), '[]'::json))
  else json_build_object('exists', false, 'members', '[]'::json) end;
$$;

create or replace function ss_save_member(p_code text, p_slot text, p_name text, p_avatar jsonb, p_city jsonb, p_profile text, p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from ss_couples where code = upper(p_code)) then raise exception 'no_couple'; end if;
  if p_slot not in ('a','b') then raise exception 'bad_slot'; end if;
  if length(coalesce(p_token, '')) < 16 then raise exception 'bad_token'; end if;
  if exists (select 1 from ss_members where code = upper(p_code) and slot = p_slot and token_hash is not null and token_hash <> ss_th(p_token)) then raise exception 'forbidden'; end if;
  if length(p_avatar::text) > 30000 then raise exception 'too_big'; end if;
  if p_profile is not null and (length(p_profile) > 30000 or p_profile !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$') then raise exception 'bad_profile'; end if;
  if (p_city->>'lat')::float not between -90 and 90 or (p_city->>'lon')::float not between -180 and 180 or char_length(p_city->>'name') not between 1 and 60 then raise exception 'bad_city'; end if;
  insert into ss_members(code, slot, name, avatar, city, profile, token_hash) values (upper(p_code), p_slot, p_name, p_avatar, p_city, p_profile, ss_th(p_token))
  on conflict (code, slot) do update set name = excluded.name, avatar = excluded.avatar, city = excluded.city, profile = excluded.profile, token_hash = excluded.token_hash, updated_at = now();
end $$;

create or replace function ss_add_photo(p_code text, p_slot text, p_local_date text, p_caption text, p_weather text, p_data text, p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare n int; new_id uuid;
begin
  perform ss_auth(p_code, p_slot, p_token);
  if not exists (select 1 from ss_couples where code = upper(p_code)) then raise exception 'no_couple'; end if;
  if length(p_data) > 700000 then raise exception 'too_big'; end if;
  if p_local_date !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'bad_date'; end if;
  if p_data !~ '^data:image/(jpeg|png);base64,[A-Za-z0-9+/=]+$' then raise exception 'bad_image'; end if;
  select count(*) into n from ss_photos where code = upper(p_code) and slot = p_slot and local_date = p_local_date;
  if n >= 3 then raise exception 'limit'; end if;
  insert into ss_photos(code, slot, local_date, caption, weather, data) values (upper(p_code), p_slot, p_local_date, left(p_caption, 40), left(p_weather, 40), p_data) returning id into new_id;
  return new_id;
end $$;

create or replace function ss_list_photos(p_code text, p_limit int default 60) returns json
language sql security definer set search_path = public as $$
  select coalesce(json_agg(t), '[]'::json) from (
    select id, slot, local_date, caption, weather, data, taken_at, hearts from ss_photos
    where code = upper(p_code) order by taken_at desc limit least(p_limit, 60)
  ) t;
$$;

create or replace function ss_add_note(p_code text, p_slot text, p_body text, p_x real, p_y real, p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  perform ss_auth(p_code, p_slot, p_token);
  if not exists (select 1 from ss_couples where code = upper(p_code)) then raise exception 'no_couple'; end if;
  insert into ss_notes(code, slot, body, x, y) values (upper(p_code), p_slot, left(p_body, 60), greatest(0, least(100, p_x)), greatest(0, least(100, p_y))) returning id into new_id;
  return new_id;
end $$;

create or replace function ss_list_notes(p_code text) returns json
language sql security definer set search_path = public as $$
  select coalesce(json_agg(t), '[]'::json) from (
    select id, slot, body, x, y, created_at from ss_notes where code = upper(p_code) order by created_at desc limit 300
  ) t;
$$;

-- 사진에 하트 보내기/취소 (누르면 토글)
create or replace function ss_heart_photo(p_code text, p_photo_id uuid, p_slot text, p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform ss_auth(p_code, p_slot, p_token);
  if p_slot not in ('a','b') then raise exception 'bad_slot'; end if;
  update ss_photos set hearts = case when p_slot = any(hearts) then array_remove(hearts, p_slot) else array_append(hearts, p_slot) end
  where id = p_photo_id and code = upper(p_code);
  if not found then raise exception 'no_photo'; end if;
end $$;

-- 내 방 (가구 배치). 한 사람당 한 행, 통째로 저장
create table if not exists ss_rooms (
  code text not null references ss_couples(code) on delete cascade,
  slot text not null check (slot in ('a','b')),
  room jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (code, slot)
);
alter table ss_rooms enable row level security;
revoke all on ss_rooms from anon, authenticated;

create or replace function ss_save_room(p_code text, p_slot text, p_room jsonb, p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform ss_auth(p_code, p_slot, p_token);
  if not exists (select 1 from ss_couples where code = upper(p_code)) then raise exception 'no_couple'; end if;
  if p_slot not in ('a','b') then raise exception 'bad_slot'; end if;
  if jsonb_typeof(p_room) <> 'object' or length(p_room::text) > 6000 then raise exception 'too_big'; end if;
  if jsonb_typeof(p_room->'items') <> 'array' or jsonb_array_length(p_room->'items') > 30 then raise exception 'too_big'; end if;
  insert into ss_rooms(code, slot, room) values (upper(p_code), p_slot, p_room)
  on conflict (code, slot) do update set room = excluded.room, updated_at = now();
end $$;

create or replace function ss_get_rooms(p_code text) returns json
language sql security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('slot', slot, 'room', room)), '[]'::json) from ss_rooms where code = upper(p_code);
$$;

-- 가벼운 변경 감지용 (클라이언트가 40초마다 이것만 확인하고, 바뀐 때만 전체를 받음)
create or replace function ss_state(p_code text) returns json
language sql security definer set search_path = public as $$
  select json_build_object(
    'members', (select coalesce(max(updated_at)::text, '') from ss_members where code = upper(p_code)),
    'photos',  (select count(*)::text || coalesce(sum(cardinality(hearts))::text, '0') || coalesce(max(taken_at)::text, '') from ss_photos where code = upper(p_code)),
    'notes',   (select count(*)::text || coalesce(max(created_at)::text, '') from ss_notes where code = upper(p_code)),
    'rooms',   (select coalesce(max(updated_at)::text, '') from ss_rooms where code = upper(p_code)));
$$;

grant execute on function ss_state(text) to anon;
grant execute on function ss_create_couple(), ss_get_couple(text), ss_save_member(text,text,text,jsonb,jsonb,text,text),
  ss_add_photo(text,text,text,text,text,text,text), ss_list_photos(text,int), ss_add_note(text,text,text,real,real,text), ss_list_notes(text) to anon;
grant execute on function ss_save_room(text,text,jsonb,text), ss_get_rooms(text), ss_heart_photo(text,uuid,text,text) to anon;

-- ───────── 6차: 목소리 쪽지 (최대 15초, 오디오를 base64 글자로 저장) ─────────
create table if not exists ss_voices (
  id uuid primary key default gen_random_uuid(),
  code text not null references ss_couples(code) on delete cascade,
  slot text not null check (slot in ('a','b')),
  mime text not null check (mime ~ '^audio/[a-z0-9.+-]+$'),
  dur real not null check (dur between 0.3 and 16),
  data text not null check (char_length(data) between 100 and 420000),
  created_at timestamptz not null default now()
);
create index if not exists ss_voices_code_time on ss_voices(code, created_at desc);
alter table ss_voices enable row level security;
revoke all on ss_voices from anon, authenticated;

-- 보내기: 커플당 하루 40개까지, 최근 60개만 보관
create or replace function ss_add_voice(p_code text, p_slot text, p_mime text, p_dur real, p_data text, p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  perform ss_auth(p_code, p_slot, p_token);
  if not exists (select 1 from ss_couples where code = upper(p_code)) then raise exception 'no_couple'; end if;
  if p_data !~ '^[A-Za-z0-9+/=]+$' then raise exception 'bad_audio'; end if;
  if (select count(*) from ss_voices where code = upper(p_code) and created_at > now() - interval '1 day') >= 40 then raise exception 'limit'; end if;
  insert into ss_voices(code, slot, mime, dur, data) values (upper(p_code), p_slot, p_mime, p_dur, p_data) returning id into new_id;
  delete from ss_voices where code = upper(p_code) and id not in (select id from ss_voices where code = upper(p_code) order by created_at desc limit 60);
  return new_id;
end $$;

-- 목록(소리 데이터 없이 정보만) / 한 개 가져오기(재생할 때)
create or replace function ss_list_voices(p_code text) returns json
language sql security definer set search_path = public as $$
  select coalesce(json_agg(t), '[]'::json) from (
    select id, slot, mime, dur, created_at from ss_voices where code = upper(p_code) order by created_at desc limit 60
  ) t;
$$;
create or replace function ss_get_voice(p_code text, p_id uuid) returns json
language sql security definer set search_path = public as $$
  select row_to_json(t) from (select mime, data from ss_voices where code = upper(p_code) and id = p_id) t;
$$;
grant execute on function ss_add_voice(text,text,text,real,text,text), ss_list_voices(text), ss_get_voice(text,uuid) to anon;

-- 변경 감지에 목소리 쪽지 포함 (ss_voices 표가 만들어진 뒤에 다시 정의)
create or replace function ss_state(p_code text) returns json
language sql security definer set search_path = public as $$
  select json_build_object(
    'members', (select coalesce(max(updated_at)::text, '') from ss_members where code = upper(p_code)),
    'photos',  (select count(*)::text || coalesce(sum(cardinality(hearts))::text, '0') || coalesce(max(taken_at)::text, '') from ss_photos where code = upper(p_code)),
    'notes',   (select count(*)::text || coalesce(max(created_at)::text, '') from ss_notes where code = upper(p_code)),
    'rooms',   (select coalesce(max(updated_at)::text, '') from ss_rooms where code = upper(p_code)),
    'voices',  (select count(*)::text || coalesce(max(created_at)::text, '') from ss_voices where code = upper(p_code)));
$$;
grant execute on function ss_state(text) to anon;
