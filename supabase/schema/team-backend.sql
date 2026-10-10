-- Snapshot de la definición: se aplica por separado, no por un push de GitHub.
-- Datos iniciales y correo autorizado se insertan por separado, nunca en este archivo público.
create table private.team_workspace (
  id integer primary key check (id = 1),
  revision bigint not null default 0 check (revision >= 0),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default now()
);
create table private.team_members (
  auth_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9._-]{3,30}$'),
  full_name text not null,
  role text not null check (role in ('admin','visitor')),
  employee_id text,
  active boolean not null default true,
  deleted_at timestamptz,
  check (role = 'admin' or employee_id is not null)
);
create table private.team_invites (
  email text primary key check (email = lower(email)),
  username text not null unique,
  full_name text not null,
  role text not null check (role in ('admin','visitor')),
  employee_id text,
  created_at timestamptz not null default now()
);
alter table private.team_workspace enable row level security;
alter table private.team_members enable row level security;
alter table private.team_invites enable row level security;
-- Ningún cliente puede consultar/modificar directamente el estado, invitaciones o roles.
revoke all on private.team_workspace, private.team_members, private.team_invites from public, anon, authenticated;
create policy deny_browser on private.team_workspace as restrictive for all to anon, authenticated using (false) with check (false);
create policy deny_browser on private.team_members as restrictive for all to anon, authenticated using (false) with check (false);
create policy deny_browser on private.team_invites as restrictive for all to anon, authenticated using (false) with check (false);

create function private.team_user(p_member private.team_members)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('id',(p_member).auth_id::text,'username',(p_member).username,
    'fullName',(p_member).full_name,'role',(p_member).role,'employeeId',(p_member).employee_id,
    'active',(p_member).active,'deletedAt',(p_member).deleted_at)
$$;
revoke all on function private.team_user(private.team_members) from public, anon, authenticated;

create function public.team_backend_load(p_actor uuid, p_session uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  member private.team_members;
  invitation private.team_invites;
  workspace private.team_workspace;
  output jsonb;
  kind text;
  members jsonb;
begin
  if not exists (select 1 from auth.sessions where id=p_session and user_id=p_actor) then
    raise exception 'TEAM_SESSION_EXPIRED';
  end if;
  select * into member from private.team_members where auth_id=p_actor;
  if not found then
    -- Reclamar únicamente una invitación preautorizada y un correo ya confirmado por Auth.
    select i.* into invitation from private.team_invites i join auth.users u
      on lower(u.email)=i.email where u.id=p_actor and u.email_confirmed_at is not null for update of i;
    if not found then raise exception 'TEAM_ACCESS_DENIED'; end if;
    insert into private.team_members(auth_id,username,full_name,role,employee_id)
      values(p_actor,invitation.username,invitation.full_name,invitation.role,invitation.employee_id)
      returning * into member;
    delete from private.team_invites where email=invitation.email;
  end if;
  if not member.active or member.deleted_at is not null then raise exception 'TEAM_ACCESS_DENIED'; end if;
  select * into strict workspace from private.team_workspace where id=1;
  output := workspace.state;
  if member.role='admin' then
    select coalesce(jsonb_agg(private.team_user(m) order by m.username),'[]'::jsonb) into members from private.team_members m;
    output := jsonb_set(output,'{users}',members);
  else
    if not exists (select 1 from jsonb_array_elements(output->'employees') e
      where e->>'id'=member.employee_id and (e->>'deletedAt') is null) then raise exception 'TEAM_ACCESS_DENIED'; end if;
    for kind in select unnest(array['employees','movements','payments','periods','events']) loop
      output := jsonb_set(output,array[kind],coalesce((select jsonb_agg(r) from jsonb_array_elements(output->kind) r
        where (case when kind='employees' then r->>'id' else r->>'employeeId' end)=member.employee_id),'[]'::jsonb));
    end loop;
    output := jsonb_set(jsonb_set(output,'{users}','[]'::jsonb),'{audit}','[]'::jsonb);
  end if;
  return jsonb_build_object('user',private.team_user(member),'revision',workspace.revision,'data',output);
end
$$;
revoke all on function public.team_backend_load(uuid,uuid) from public, anon, authenticated;
grant execute on function public.team_backend_load(uuid,uuid) to service_role;

create function public.team_backend_save(p_actor uuid,p_session uuid,p_revision bigint,p_state jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare current_revision bigint; kind text;
begin
  select revision into strict current_revision from private.team_workspace where id=1 for update;
  -- Revalidar permisos y sesión dentro de la misma transacción, no solo en Edge.
  if not exists (select 1 from auth.sessions where id=p_session and user_id=p_actor) then raise exception 'TEAM_SESSION_EXPIRED'; end if;
  if not exists (select 1 from private.team_members where auth_id=p_actor and active and deleted_at is null and role='admin') then raise exception 'TEAM_ACCESS_DENIED'; end if;
  if p_revision is null or current_revision<>p_revision then raise exception 'TEAM_REVISION_CONFLICT'; end if;
  if jsonb_typeof(p_state)<>'object' or jsonb_typeof(p_state->'settings') is distinct from 'object' then raise exception 'TEAM_INVALID_STATE'; end if;
  for kind in select unnest(array['employees','movements','payments','periods','events','users','audit']) loop
    if jsonb_typeof(p_state->kind) is distinct from 'array' then raise exception 'TEAM_INVALID_STATE'; end if;
  end loop;
  if p_state->'users'<>'[]'::jsonb then raise exception 'TEAM_INVALID_STATE'; end if;
  update private.team_workspace set state=p_state,revision=revision+1,updated_at=now() where id=1;
  -- Eliminar un trabajador revoca a sus visitantes en la misma transacción.
  update private.team_members m set active=false where role='visitor' and active and not exists
    (select 1 from jsonb_array_elements(p_state->'employees') e where e->>'id'=m.employee_id and (e->>'deletedAt') is null);
  return current_revision+1;
end
$$;
revoke all on function public.team_backend_save(uuid,uuid,bigint,jsonb) from public, anon, authenticated;
grant execute on function public.team_backend_save(uuid,uuid,bigint,jsonb) to service_role;
