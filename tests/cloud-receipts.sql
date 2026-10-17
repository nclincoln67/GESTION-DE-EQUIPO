-- Fixtures sintéticas dentro de una transacción revertida; no tocar archivos reales.
begin;
do $$
declare a uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); vs uuid:=gen_random_uuid();
  rid uuid:=gen_random_uuid(); other uuid:=gen_random_uuid(); output jsonb; input jsonb; initial_hash text; initial_revision bigint; denied boolean;
begin
  if has_function_privilege('anon','public.team_receipt_access(uuid,uuid,text,text,text,uuid,jsonb)','EXECUTE') or
     has_function_privilege('authenticated','public.team_receipt_access(uuid,uuid,text,text,text,uuid,jsonb)','EXECUTE') then raise exception 'TEST_PUBLIC_ACCESS'; end if;
  if (select public from storage.buckets where id='team-receipts') is distinct from false then raise exception 'TEST_PUBLIC_BUCKET'; end if;
  insert into auth.users(id,email,email_confirmed_at) values(a,a::text||'@example.invalid',now()),(v,v::text||'@example.invalid',now());
  insert into auth.sessions(id,user_id) values(s,a),(vs,v);
  insert into private.team_members(auth_id,username,full_name,role) values(a,'receipt_'||left(a::text,8),'Fixture','admin');
  insert into private.team_members(auth_id,username,full_name,role,employee_id) values(v,'receipt_'||left(v::text,8),'Fixture','visitor','receipt-fixture');
  update private.team_workspace set state=jsonb_set(jsonb_set(jsonb_set(state,
    '{employees}',(state->'employees')||'[{"id":"receipt-fixture"},{"id":"receipt-other"}]'),
    '{payments}',(state->'payments')||'[{"id":"receipt-payment","employeeId":"receipt-fixture","amount":70,"state":"valid"},{"id":"receipt-other-payment","employeeId":"receipt-other","amount":50,"state":"valid"}]'),
    '{movements}',(state->'movements')||'[{"id":"receipt-advance","employeeId":"receipt-fixture","typeId":"advance","amount":25,"settledAt":"2026-01-01","state":"valid"},{"id":"receipt-pending","employeeId":"receipt-fixture","typeId":"commission","amount":15,"state":"valid"}]') where id=1;
  select md5(state::text),revision into initial_hash,initial_revision from private.team_workspace where id=1;
  input:=jsonb_build_object('name','Fixture.pdf','type','application/pdf','size',24,'sha256',repeat('a',64));
  output:=public.team_receipt_access(a,s,'reserve','payments','receipt-payment',rid,input);
  if output->>'employee_id'<>'receipt-fixture' then raise exception 'TEST_LINK'; end if;
  perform public.team_receipt_access(a,s,'reserve','payments','receipt-payment',rid,input);
  if (select count(*) from private.team_receipts where id=rid)<>1 then raise exception 'TEST_DUPLICATE'; end if;
  denied:=false;begin perform public.team_receipt_access(a,s,'finish','payments','receipt-payment',rid);
    exception when others then if sqlerrm='TEAM_RECEIPT_MISSING' then denied:=true;else raise;end if;end;
  if not denied then raise exception 'TEST_MISSING_OBJECT';end if;
  -- Metadata simulada para verificar finalize, nunca representa un objeto real ni persiste.
  insert into storage.objects(bucket_id,name,metadata) values('team-receipts',output->>'object_path','{"size":24,"mimetype":"application/pdf"}');
  perform public.team_receipt_access(a,s,'finish','payments','receipt-payment',rid);
  output:=public.team_receipt_access(v,vs,'list','payments','receipt-payment');
  if jsonb_array_length(output->'files')<>1 then raise exception 'TEST_VISITOR_READ';end if;
  perform public.team_receipt_access(v,vs,'read','payments','receipt-payment',rid);
  denied:=false;begin perform public.team_receipt_access(v,vs,'reserve','payments','receipt-payment',other,input);
    exception when others then if sqlerrm='TEAM_ACCESS_DENIED' then denied:=true;else raise;end if;end;
  if not denied then raise exception 'TEST_VISITOR_WRITE';end if;
  denied:=false;begin perform public.team_receipt_access(v,vs,'list','payments','receipt-other-payment');
    exception when others then if sqlerrm='TEAM_ACCESS_DENIED' then denied:=true;else raise;end if;end;
  if not denied then raise exception 'TEST_OTHER_EMPLOYEE';end if;
  denied:=false;begin perform public.team_receipt_access(a,s,'reserve','payments','receipt-payment',rid,jsonb_set(input,'{sha256}',to_jsonb(repeat('b',64))));
    exception when others then if sqlerrm='TEAM_RECEIPT_CONFLICT' then denied:=true;else raise;end if;end;
  if not denied then raise exception 'TEST_REPLACEMENT';end if;
  perform public.team_receipt_access(a,s,'reserve','movements','receipt-advance',other,input);
  denied:=false;begin perform public.team_receipt_access(a,s,'reserve','movements','receipt-pending',gen_random_uuid(),input);
    exception when others then if sqlerrm='TEAM_RECEIPT_TARGET' then denied:=true;else raise;end if;end;
  if not denied then raise exception 'TEST_PENDING';end if;
  delete from auth.sessions where id=vs;
  denied:=false;begin perform public.team_receipt_access(v,vs,'read','payments','receipt-payment',rid);
    exception when others then if sqlerrm='TEAM_SESSION_EXPIRED' then denied:=true;else raise;end if;end;
  if not denied then raise exception 'TEST_REVOKED_SESSION';end if;
  if (select md5(state::text)<>initial_hash or revision<>initial_revision from private.team_workspace where id=1) then raise exception 'TEST_FINANCIAL_MUTATION';end if;
end $$;
rollback;
