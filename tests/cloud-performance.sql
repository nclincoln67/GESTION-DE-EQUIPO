-- Siempre ROLLBACK: no deja cuentas, sesiones ni datos financieros de prueba.
begin;
do $$
declare a uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); vs uuid:=gen_random_uuid();
  state jsonb; rev bigint; result jsonb; denied boolean;
begin
  if has_function_privilege('anon','public.team_backend_snapshot(uuid,uuid)','EXECUTE') or
    has_function_privilege('authenticated','public.team_backend_snapshot(uuid,uuid)','EXECUTE') or
    has_function_privilege('anon','public.team_backend_commit(uuid,uuid,bigint,jsonb)','EXECUTE') or
    has_function_privilege('authenticated','public.team_backend_commit(uuid,uuid,bigint,jsonb)','EXECUTE') then raise exception 'TEST_PUBLIC_EXECUTE'; end if;
  insert into auth.users(id,email,email_confirmed_at) values(a,a::text||'@example.invalid',now()),(v,v::text||'@example.invalid',now());
  insert into auth.sessions(id,user_id) values(s,a),(vs,v);
  insert into private.team_members(auth_id,username,full_name,role) values(a,'perf_'||left(a::text,8),'Fixture','admin');
  select w.state,w.revision into state,rev from private.team_workspace w where id=1;
  result:=public.team_backend_snapshot(a,s);
  if not (result ? 'accounts') or result->'user'->>'role'<>'admin' then raise exception 'TEST_SNAPSHOT'; end if;
  state:=jsonb_set(state,'{users}','[]');
  result:=public.team_backend_commit(a,s,rev,state);
  if (result->>'revision')::bigint<>rev+1 or not (result ? 'accounts') then raise exception 'TEST_COMMIT'; end if;
  denied:=false;
  begin perform public.team_backend_commit(a,s,rev,state); exception when others then if sqlerrm='TEAM_REVISION_CONFLICT' then denied:=true; else raise; end if; end;
  if not denied then raise exception 'TEST_STALE_COMMIT'; end if;
  denied:=false;
  begin perform public.team_backend_snapshot(a,gen_random_uuid()); exception when others then if sqlerrm='TEAM_SESSION_EXPIRED' then denied:=true; else raise; end if; end;
  if not denied then raise exception 'TEST_SESSION'; end if;
  update private.team_workspace w set state=jsonb_set(w.state,'{employees}',(w.state->'employees')||'[{"id":"perf-person"}]') where id=1;
  insert into private.team_members(auth_id,username,full_name,role,employee_id) values(v,'perf_'||left(v::text,8),'Fixture visitante','visitor','perf-person');
  result:=public.team_backend_snapshot(v,vs);
  if result ? 'accounts' or result->'data'->'users'<>'[]'::jsonb or result->'data'->'audit'<>'[]'::jsonb then raise exception 'TEST_VISITOR_LEAK'; end if;
  denied:=false;
  begin perform public.team_backend_commit(v,vs,rev+1,state); exception when others then if sqlerrm='TEAM_ACCESS_DENIED' then denied:=true; else raise; end if; end;
  if not denied then raise exception 'TEST_VISITOR_COMMIT'; end if;
end $$;
rollback;
