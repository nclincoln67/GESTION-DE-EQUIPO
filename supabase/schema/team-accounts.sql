-- Gestión de identidades independiente del JSON financiero y de los pushes.
alter table private.team_invites add column id uuid not null default gen_random_uuid() unique;
create unique index team_members_username_lower on private.team_members(lower(username));
create unique index team_invites_username_lower on private.team_invites(lower(username));

create function public.team_accounts_list(p_actor uuid,p_session uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if not exists(select 1 from auth.sessions where id=p_session and user_id=p_actor) or
    not exists(select 1 from private.team_members where auth_id=p_actor and active and deleted_at is null and role='admin')
    then raise exception 'TEAM_ACCESS_DENIED'; end if;
  select coalesce(jsonb_agg(r),'[]'::jsonb) into result from (
    select private.team_user(m)||jsonb_build_object('email',u.email,'pending',false) r
    from private.team_members m join auth.users u on u.id=m.auth_id
    union all
    select jsonb_build_object('id','invite:'||i.id,'username',i.username,'fullName',i.full_name,
      'role',i.role,'employeeId',i.employee_id,'email',i.email,'active',false,'pending',true,'deletedAt',null)
    from private.team_invites i
  ) accounts;
  return result;
end $$;
revoke all on function public.team_accounts_list(uuid,uuid) from public,anon,authenticated;
grant execute on function public.team_accounts_list(uuid,uuid) to service_role;

create function public.team_account_change(p_actor uuid,p_session uuid,p_revision bigint,p_action text,p_input jsonb,p_target text)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare w private.team_workspace; m private.team_members; invitation private.team_invites;
  username text; full_name text; role_name text; employee text; email text; target_id text; pending boolean:=false; event text;
begin
  select * into strict w from private.team_workspace where id=1 for update;
  if not exists(select 1 from auth.sessions where id=p_session and user_id=p_actor) or
    not exists(select 1 from private.team_members where auth_id=p_actor and active and deleted_at is null and role='admin')
    then raise exception 'TEAM_ACCESS_DENIED'; end if;
  if p_revision is null or p_revision<>w.revision then raise exception 'TEAM_REVISION_CONFLICT'; end if;
  if p_target like 'invite:%' then
    select * into invitation from private.team_invites where id=substring(p_target from 8)::uuid;
    if not found then raise exception 'TEAM_ACCOUNT_MISSING'; end if; pending:=true;
  elsif p_target is not null then
    select * into m from private.team_members where auth_id=p_target::uuid and deleted_at is null;
    if not found then raise exception 'TEAM_ACCOUNT_MISSING'; end if;
  end if;
  target_id:=p_target;
  if p_action='save' then
    username:=lower(btrim(p_input->>'username')); full_name:=btrim(p_input->>'fullName');
    role_name:=p_input->>'role'; employee:=nullif(p_input->>'employeeId',''); email:=lower(btrim(p_input->>'email'));
    if username is null or username !~ '^[a-z0-9._-]{3,30}$' or full_name is null or length(full_name)<2 or length(full_name)>100
      or role_name is null or role_name not in ('admin','visitor') or email is null or length(email)>254 or email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      then raise exception 'TEAM_ACCOUNT_INVALID'; end if;
    if role_name='admin' then employee:=null;
    elsif employee is null or not exists(select 1 from jsonb_array_elements(w.state->'employees') e where e->>'id'=employee and e->>'deletedAt' is null)
      then raise exception 'TEAM_PROFILE_REQUIRED'; end if;
    if exists(select 1 from private.team_members where lower(private.team_members.username)=username and (p_target is null or auth_id::text<>p_target)) or
      exists(select 1 from private.team_invites where lower(private.team_invites.username)=username and ('invite:'||id::text) is distinct from p_target)
      then raise exception 'TEAM_USERNAME_USED'; end if;
    if p_target is null then
      if exists(select 1 from private.team_invites where private.team_invites.email=email) or
        exists(select 1 from auth.users where lower(auth.users.email)=email) then raise exception 'TEAM_EMAIL_USED'; end if;
      insert into private.team_invites(email,username,full_name,role,employee_id) values(email,username,full_name,role_name,employee)
        returning * into invitation;
      target_id:='invite:'||invitation.id::text; pending:=true;
    elsif pending then
      if email<>invitation.email then raise exception 'TEAM_EMAIL_IMMUTABLE'; end if;
      update private.team_invites set username=username,full_name=full_name,role=role_name,employee_id=employee where id=invitation.id;
    else
      if email is distinct from (select lower(u.email) from auth.users u where u.id=m.auth_id) then raise exception 'TEAM_EMAIL_IMMUTABLE'; end if;
      if m.auth_id=p_actor and role_name<>'admin' then raise exception 'TEAM_SELF_PROTECTED'; end if;
      if m.active and m.role='admin' and role_name<>'admin' and (select count(*) from private.team_members where role='admin' and active and deleted_at is null)<=1
        then raise exception 'TEAM_LAST_ADMIN'; end if;
      update private.team_members set username=username,full_name=full_name,role=role_name,employee_id=employee where auth_id=m.auth_id;
    end if;
    event:='user-saved';
  elsif p_action='toggle' then
    if p_target is null or pending then raise exception 'TEAM_ACCOUNT_MISSING'; end if;
    if m.auth_id=p_actor then raise exception 'TEAM_SELF_PROTECTED'; end if;
    if m.active and m.role='admin' and (select count(*) from private.team_members where role='admin' and active and deleted_at is null)<=1 then raise exception 'TEAM_LAST_ADMIN'; end if;
    if not m.active and m.role='visitor' and not exists(select 1 from jsonb_array_elements(w.state->'employees') e where e->>'id'=m.employee_id and e->>'deletedAt' is null)
      then raise exception 'TEAM_PROFILE_REQUIRED'; end if;
    update private.team_members set active=not active where auth_id=m.auth_id;
    event:='user-state';
  elsif p_action='delete' then
    if p_target is null then raise exception 'TEAM_ACCOUNT_MISSING'; end if;
    if pending then delete from private.team_invites where id=invitation.id;
    else
      if m.auth_id=p_actor then raise exception 'TEAM_SELF_PROTECTED'; end if;
      if m.active and m.role='admin' and (select count(*) from private.team_members where role='admin' and active and deleted_at is null)<=1 then raise exception 'TEAM_LAST_ADMIN'; end if;
      update private.team_members set active=false,deleted_at=now() where auth_id=m.auth_id;
    end if;
    event:='user-deleted';
  elsif p_action='invite' then
    if not pending then raise exception 'TEAM_ACCOUNT_MISSING'; end if;
    event:='user-invited';
  else raise exception 'TEAM_ACCOUNT_INVALID'; end if;
  update private.team_workspace set revision=revision+1,updated_at=now(),state=jsonb_set(state,'{audit}',(state->'audit')||jsonb_build_array(
    jsonb_build_object('id',gen_random_uuid(),'action',event,'recordId',target_id,'detail','Cuenta de acceso','userId',p_actor,'date',now()))) where id=1;
  return jsonb_build_object('revision',w.revision+1,'email',case when pending and p_action in ('save','invite') then invitation.email else null end);
end $$;
revoke all on function public.team_account_change(uuid,uuid,bigint,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.team_account_change(uuid,uuid,bigint,text,jsonb,text) to service_role;
