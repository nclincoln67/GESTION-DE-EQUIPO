-- Cambio separado de GitHub. RPC privada para resolver el usuario SOLO dentro del login.
create table private.team_login_limits (
  bucket text primary key,
  attempts integer not null default 0,
  expires_at timestamptz not null
);
alter table private.team_login_limits enable row level security;
revoke all on private.team_login_limits from public, anon, authenticated;
create policy deny_browser on private.team_login_limits as restrictive for all to anon, authenticated using(false) with check(false);

create function public.team_login_target(p_identifier text, p_fingerprint text)
returns text language plpgsql security definer set search_path='' as $$
declare target text; identifier text; minute_bucket text; quarter_bucket text; n integer;
begin
  identifier := lower(btrim(p_identifier));
  if identifier is null or length(identifier)<3 or length(identifier)>254 or p_fingerprint is null or p_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'TEAM_LOGIN_INVALID';
  end if;
  minute_bucket := floor(extract(epoch from now())/60)::text;
  quarter_bucket := floor(extract(epoch from now())/900)::text;
  -- Contadores atómicos compartidos entre instancias; no confiar en memoria de Edge.
  insert into private.team_login_limits(bucket,attempts,expires_at)
    values('global:'||minute_bucket,1,now()+interval '16 minutes')
    on conflict(bucket) do update set attempts=private.team_login_limits.attempts+1 returning attempts into n;
  if n>100 then return null; end if;
  delete from private.team_login_limits where expires_at<now();
  insert into private.team_login_limits(bucket,attempts,expires_at)
    values('ip:'||p_fingerprint||':'||quarter_bucket,1,now()+interval '16 minutes')
    on conflict(bucket) do update set attempts=private.team_login_limits.attempts+1 returning attempts into n;
  if n>30 then return null; end if;
  insert into private.team_login_limits(bucket,attempts,expires_at)
    values('user:'||md5(identifier)||':'||quarter_bucket,1,now()+interval '16 minutes')
    on conflict(bucket) do update set attempts=private.team_login_limits.attempts+1 returning attempts into n;
  if n>10 then return null; end if;
  select u.email into target from private.team_members m join auth.users u on u.id=m.auth_id
    where m.active and m.deleted_at is null and (lower(m.username)=identifier or lower(u.email)=identifier) limit 1;
  if target is null then
    select email into target from private.team_invites where lower(username)=identifier or email=identifier limit 1;
  end if;
  -- Desconocidos recorren también Auth; nunca responder con correo, existencia o rol.
  return coalesce(target,'unknown-account@invalid.example');
end $$;
revoke all on function public.team_login_target(text,text) from public,anon,authenticated;
grant execute on function public.team_login_target(text,text) to service_role;
