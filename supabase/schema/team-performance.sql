-- Optimización aditiva. Aplicar por separado del despliegue del frontend.
-- Reutiliza las comprobaciones de sesión, autorización y revisión existentes.
create function public.team_backend_snapshot(p_actor uuid,p_session uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare snapshot jsonb;
begin
  snapshot := public.team_backend_load(p_actor,p_session);
  if snapshot->'user'->>'role'='admin' then
    snapshot := snapshot || jsonb_build_object('accounts',public.team_accounts_list(p_actor,p_session));
  end if;
  return snapshot;
end $$;
revoke all on function public.team_backend_snapshot(uuid,uuid) from public,anon,authenticated;
grant execute on function public.team_backend_snapshot(uuid,uuid) to service_role;

-- Escritura y respuesta pertenecen a la misma transacción. Si la lectura falla,
-- la escritura se revierte; nunca se confirma un estado calculado solo en cliente.
create function public.team_backend_commit(p_actor uuid,p_session uuid,p_revision bigint,p_state jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform public.team_backend_save(p_actor,p_session,p_revision,p_state);
  return public.team_backend_snapshot(p_actor,p_session);
end $$;
revoke all on function public.team_backend_commit(uuid,uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.team_backend_commit(uuid,uuid,bigint,jsonb) to service_role;
