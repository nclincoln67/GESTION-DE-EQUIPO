import { domain, cleanCommand } from './generated/domain.mjs';

const accountCommands = new Set(['records.saveUser', 'records.toggleUser', 'records.deleteUser']);
const fail = (status, message) => Object.assign(new Error(message), { status });

async function readJSON(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw fail(415, 'Formato no permitido.');
  const reader = request.body?.getReader();
  if (!reader) throw fail(400, 'Solicitud vacía.');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 1024 * 1024) { await reader.cancel(); throw fail(413, 'Solicitud demasiado grande.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw fail(400, 'JSON no válido.'); }
}

export function createHandler({ verifyToken, load, save, origins }) {
  return async request => {
    const origin = request.headers.get('origin');
    const allowed = !origin || origins.includes(origin);
    const headers = {
      'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin',
      ...(origin && allowed ? { 'Access-Control-Allow-Origin': origin } : {}),
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };
    const json = (status, value) => new Response(JSON.stringify(value), { status, headers });
    try {
      if (!allowed) throw fail(403, 'Origen no permitido.');
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
      if (!['GET', 'POST'].includes(request.method)) throw fail(405, 'Método no permitido.');
      const match = /^Bearer ([^\s]+)$/.exec(request.headers.get('authorization') || '');
      if (!match) throw fail(401, 'Inicia sesión para continuar.');
      const actor = await verifyToken(match[1]);
      if (!actor?.userId || !actor.sessionId) throw fail(401, 'Tu sesión terminó.');
      const snapshot = await load(actor);
      if (!snapshot?.user?.active) throw fail(403, 'Esta cuenta no tiene acceso a Gestión de Equipo.');
      if (request.method === 'GET') return json(200, snapshot);
      const input = await readJSON(request);
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw fail(400, 'Formulario inválido.');
      if (snapshot.user.role !== 'admin') throw fail(403, 'Esta acción requiere una cuenta de administrador.');
      // La gestión Auth de cuentas se integra por separado; nunca guardar contraseñas en el estado.
      if (accountCommands.has(input.command)) throw fail(501, 'La gestión de cuentas en la nube todavía está en preparación.');
      if (!Number.isSafeInteger(input.revision) || input.revision !== snapshot.revision) {
        return json(409, { ...snapshot, error: 'Otra sesión actualizó los datos. Revisa los importes y vuelve a guardar.' });
      }
      const args = cleanCommand(input.command, input.args);
      const runtime = domain(snapshot.data, snapshot.user.id);
      const [service, method] = input.command.split('.');
      runtime.G[service][method](...args);
      const next = runtime.data();
      // Las autorizaciones pertenecen a la tabla de miembros, no al JSON editable de negocio.
      next.users = [];
      await save(actor, input.revision, next);
      return json(200, await load(actor));
    } catch (error) {
      return json(error.status || 400, { error: error.status === 502 ? 'No se pudo conectar con el almacenamiento. Intenta nuevamente.' : error.message });
    }
  };
}
