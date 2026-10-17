-- Aplicar por separado del frontend. Los documentos nunca forman parte del JSON financiero.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('team-receipts','team-receipts',false,5242880,array['application/pdf','image/png','image/jpeg']);

create table private.team_receipts (
  id uuid primary key,
  collection text not null check(collection in ('payments','movements')),
  record_id text not null,
  employee_id text not null,
  filename text not null,
  mime text not null check(mime in ('application/pdf','image/png','image/jpeg')),
  bytes integer not null check(bytes between 1 and 5242880),
  sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),
  object_path text not null unique,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  ready_at timestamptz
);
create index team_receipts_record on private.team_receipts(collection,record_id,created_at);
alter table private.team_receipts enable row level security;
revoke all on private.team_receipts from public,anon,authenticated;
create policy deny_browser on private.team_receipts as restrictive for all to anon,authenticated using(false) with check(false);
-- Solo el backend autorizado opera sobre este bucket, incluso si se añade otra política general.
create policy team_receipts_backend_only on storage.objects as restrictive for all to anon,authenticated
using(bucket_id <> 'team-receipts') with check(bucket_id <> 'team-receipts');

create function public.team_receipt_access(p_actor uuid,p_session uuid,p_action text,p_collection text,p_record text,p_id uuid default null,p_input jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare snap jsonb; rec jsonb; item private.team_receipts; ext text; rows jsonb;
begin
  snap:=public.team_backend_load(p_actor,p_session);
  if p_collection not in ('payments','movements') or p_collection is null or p_record is null then raise exception 'TEAM_RECEIPT_TARGET'; end if;
  select r into rec from jsonb_array_elements(snap->'data'->p_collection) r where r->>'id'=p_record;
  if rec is null then raise exception 'TEAM_ACCESS_DENIED'; end if;
  if p_collection='movements' and not exists(select 1 from jsonb_array_elements(snap->'data'->'settings'->'types') t
    where t->>'id'=rec->>'typeId' and (t->>'id'='advance' or t->>'nature'='advance')) then raise exception 'TEAM_RECEIPT_TARGET'; end if;
  if p_action='list' then
    select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.filename,'type',r.mime,'size',r.bytes,'createdAt',r.created_at) order by r.created_at),'[]') into rows
      from private.team_receipts r where collection=p_collection and record_id=p_record and ready_at is not null;
    return jsonb_build_object('files',rows);
  end if;
  if p_action='read' then
    select * into item from private.team_receipts where id=p_id and collection=p_collection and record_id=p_record and ready_at is not null;
    if not found then raise exception 'TEAM_ACCESS_DENIED'; end if;
    return to_jsonb(item);
  end if;
  if snap->'user'->>'role'<>'admin' then raise exception 'TEAM_ACCESS_DENIED'; end if;
  if p_action='upload-check' then return '{}'::jsonb; end if;
  -- Serializa reservas para aplicar límites, sin bloquear el JSON de pagos.
  perform pg_advisory_xact_lock(17012026,1);
  if p_action='reserve' then
    if p_id is null or jsonb_typeof(p_input) is distinct from 'object' or
      length(coalesce(p_input->>'name','')) not between 1 and 180 or p_input->>'name' ~ '[[:cntrl:]/\\]' or
      coalesce(p_input->>'sha256','') !~ '^[0-9a-f]{64}$' or
      coalesce(p_input->>'size','') !~ '^[0-9]{1,7}$' or (p_input->>'size')::integer not between 1 and 5242880 then raise exception 'TEAM_RECEIPT_INVALID'; end if;
    ext:=case p_input->>'type' when 'application/pdf' then 'pdf' when 'image/png' then 'png' when 'image/jpeg' then 'jpg' end;
    if ext is null then raise exception 'TEAM_RECEIPT_INVALID'; end if;
    select * into item from private.team_receipts where id=p_id;
    if found then
      if item.collection<>p_collection or item.record_id<>p_record or item.sha256<>p_input->>'sha256' or item.filename<>p_input->>'name' or item.bytes<>(p_input->>'size')::integer or item.mime<>p_input->>'type' then raise exception 'TEAM_RECEIPT_CONFLICT'; end if;
      return to_jsonb(item);
    end if;
    if (select count(*) from private.team_receipts where collection=p_collection and record_id=p_record)>=10 then raise exception 'TEAM_RECEIPT_LIMIT'; end if;
    if (select coalesce(sum(bytes),0) from private.team_receipts)+(p_input->>'size')::integer>943718400 then raise exception 'TEAM_RECEIPT_CAPACITY'; end if;
    insert into private.team_receipts(id,collection,record_id,employee_id,filename,mime,bytes,sha256,object_path,created_by)
      values(p_id,p_collection,p_record,rec->>'employeeId',p_input->>'name',p_input->>'type',(p_input->>'size')::integer,p_input->>'sha256',p_id::text||'.'||ext,p_actor)
      returning * into item;
    return to_jsonb(item);
  elsif p_action='finish' then
    select * into item from private.team_receipts where id=p_id and collection=p_collection and record_id=p_record;
    if not found then raise exception 'TEAM_ACCESS_DENIED'; end if;
    if not exists(select 1 from storage.objects where bucket_id='team-receipts' and name=item.object_path
      and (metadata->>'size')::bigint=item.bytes and metadata->>'mimetype'=item.mime) then raise exception 'TEAM_RECEIPT_MISSING'; end if;
    update private.team_receipts set ready_at=coalesce(ready_at,now()) where id=p_id;
    return jsonb_build_object('id',p_id);
  end if;
  raise exception 'TEAM_RECEIPT_INVALID';
end $$;
revoke all on function public.team_receipt_access(uuid,uuid,text,text,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.team_receipt_access(uuid,uuid,text,text,text,uuid,jsonb) to service_role;
