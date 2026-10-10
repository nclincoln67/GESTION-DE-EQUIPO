import { createHandler } from './handler.mjs';

// Estas claves solo existen en el entorno privado de Supabase; nunca se envían al navegador.
const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };
const error = (status: number, message: string) => Object.assign(new Error(message), { status });

async function rpc(name: string, payload: unknown) {
  let response: Response;
  try { response = await fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers, body: JSON.stringify(payload) }); }
  catch { throw error(502, 'Almacenamiento no disponible.'); }
  const result = await response.json();
  if (!response.ok) {
    if (result.message === 'TEAM_REVISION_CONFLICT') throw error(409, 'Otra sesión actualizó los datos. Actualiza antes de volver a guardar.');
    if (['TEAM_ACCESS_DENIED', 'TEAM_SESSION_EXPIRED'].includes(result.message)) throw error(403, 'Esta cuenta no tiene acceso o su sesión terminó.');
    throw error(502, 'Almacenamiento no disponible.');
  }
  return result;
}

async function verifyToken(token: string) {
  let response: Response;
  try { response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: `Bearer ${token}` } }); }
  catch { throw error(502, 'Autenticación no disponible.'); }
  if (!response.ok) throw error(401, 'Tu sesión terminó. Inicia sesión nuevamente.');
  const user = await response.json();
  // La firma y pertenencia al proyecto se verifican arriba, antes de leer el claim.
  let claims;
  try { claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); }
  catch { throw error(401, 'Sesión inválida.'); }
  if (claims.sub !== user.id || typeof claims.session_id !== 'string') throw error(401, 'Sesión inválida.');
  return { userId: user.id, sessionId: claims.session_id };
}

Deno.serve(createHandler({
  verifyToken,
  load: (actor: {userId: string; sessionId: string}) => rpc('team_backend_load', { p_actor: actor.userId, p_session: actor.sessionId }),
  save: (actor: {userId: string; sessionId: string}, revision: number, state: unknown) => rpc('team_backend_save', { p_actor: actor.userId, p_session: actor.sessionId, p_revision: revision, p_state: state }),
  origins: ['https://gestion-de-equipo.pages.dev', 'http://localhost:8787', 'http://127.0.0.1:8787'],
}));
