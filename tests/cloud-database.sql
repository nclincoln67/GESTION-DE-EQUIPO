-- Pruebas desechables en una transacción que SIEMPRE se revierte.
-- No crean cuentas utilizables, no envían correos y no conservan datos de ejemplo.
begin;
do $$
declare
  admin_id uuid := gen_random_uuid();
  visitor_id uuid := gen_random_uuid();
  outsider_id uuid := gen_random_uuid();
  admin_session uuid := gen_random_uuid();
  visitor_session uuid := gen_random_uuid();
  outsider_session uuid := gen_random_uuid();
  result jsonb;
  original jsonb;
  current_revision bigint;
  rejected boolean;
begin
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
    (admin_id,admin_id::text||'@example.invalid',now(),'{}'),
    (visitor_id,visitor_id::text||'@example.invalid',now(),'{}'),
    (outsider_id,outsider_id::text||'@example.invalid',now(),'{}');
  insert into auth.sessions(id,user_id) values (admin_session,admin_id),(visitor_session,visitor_id),(outsider_session,outsider_id);
  insert into private.team_invites(email,username,full_name,role) values
    (admin_id::text||'@example.invalid','testadmin','Administrador ficticio','admin');
  select state,revision into original,current_revision from private.team_workspace where id=1;
  update private.team_workspace set state=jsonb_set(jsonb_set(original,'{employees}',
    '[{"id":"employee-test-a","fullName":"Persona ficticia A"},{"id":"employee-test-b","fullName":"Persona ficticia B"}]'),
    '{payments}','[{"employeeId":"employee-test-a","amount":10},{"employeeId":"employee-test-b","amount":20}]') where id=1;
  result := public.team_backend_load(admin_id,admin_session);
  if result->'user'->>'role'<>'admin' or jsonb_array_length(result->'data'->'employees')<>2 then raise exception 'TEST_ADMIN_FAILED'; end if;
  if exists(select 1 from private.team_invites where email=admin_id::text||'@example.invalid') then raise exception 'TEST_INVITATION_NOT_CONSUMED'; end if;
  insert into private.team_members(auth_id,username,full_name,role,employee_id)
    values(visitor_id,'testvisitor','Visitante ficticio','visitor','employee-test-a');
  result := public.team_backend_load(visitor_id,visitor_session);
  if jsonb_array_length(result->'data'->'employees')<>1 or jsonb_array_length(result->'data'->'payments')<>1
    or result->'data'->'payments'->0->>'employeeId'<>'employee-test-a'
    or result->'data'->'users'<>'[]'::jsonb or result->'data'->'audit'<>'[]'::jsonb then raise exception 'TEST_VISITOR_LEAK'; end if;
  rejected := false;
  begin perform public.team_backend_load(outsider_id,outsider_session); exception when others then
    if sqlerrm='TEAM_ACCESS_DENIED' then rejected:=true; else raise; end if;
  end;
  if not rejected then raise exception 'TEST_OUTSIDER_ALLOWED'; end if;
  rejected := false;
  begin perform public.team_backend_save(visitor_id,visitor_session,current_revision,original); exception when others then
    if sqlerrm='TEAM_ACCESS_DENIED' then rejected:=true; else raise; end if;
  end;
  if not rejected then raise exception 'TEST_VISITOR_WRITE'; end if;
  rejected := false;
  begin perform public.team_backend_save(admin_id,admin_session,current_revision-1,original); exception when others then
    if sqlerrm='TEAM_REVISION_CONFLICT' then rejected:=true; else raise; end if;
  end;
  if not rejected then raise exception 'TEST_STALE_WRITE'; end if;
  result := to_jsonb(public.team_backend_save(admin_id,admin_session,current_revision,original));
  if result<>to_jsonb(current_revision+1) then raise exception 'TEST_SAVE_REVISION'; end if;
  if (select active from private.team_members where auth_id=visitor_id) then raise exception 'TEST_EMPLOYEE_DELETE_NOT_REVOKED'; end if;
  rejected := false;
  begin perform public.team_backend_load(admin_id,gen_random_uuid()); exception when others then
    if sqlerrm='TEAM_SESSION_EXPIRED' then rejected:=true; else raise; end if;
  end;
  if not rejected then raise exception 'TEST_REVOKED_SESSION'; end if;
end $$;
rollback;
