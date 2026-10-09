(function (G) {
  'use strict';
  // El archivo local sigue disponible para consultar/exportar el prototipo anterior.
  if (!globalThis.location || !/^https?:$/.test(location.protocol)) return;

  G.serverMode = true;
  let data = null, user = null, revision = 0;
  const apply = result => {
    if (Object.hasOwn(result, 'data')) data = result.data;
    if (Object.hasOwn(result, 'user')) user = result.user;
    if (Object.hasOwn(result, 'revision')) revision = result.revision;
    if (Object.hasOwn(result, 'setupRequired')) G.setupRequired = result.setupRequired;
    if (Object.hasOwn(result, 'setupTokenRequired')) G.setupTokenRequired = result.setupTokenRequired;
    return result;
  };

  async function request(url, payload) {
    let response;
    try {
      response = await fetch(url, {
        method: payload === undefined ? 'GET' : 'POST',
        credentials: 'same-origin',
        headers: payload === undefined ? {} : { 'Content-Type': 'application/json', 'X-Inkajus-Request': '1' },
        body: payload === undefined ? undefined : JSON.stringify(payload),
      });
    } catch { throw new Error('No se pudo conectar con INKAJUS. Comprueba que el servidor esté encendido.'); }
    const result = await response.json();
    apply(result);
    if (!response.ok) {
      if (response.status === 401) { user = null; data = null; }
      throw new Error(result.error || 'No se pudo completar la operación.');
    }
    return result;
  }

  G.repo = {
    init: () => request('/api/session'),
    read() { G.utils.assert(data, 'Inicia sesión para continuar.'); return structuredClone(data); },
    transaction() { throw new Error('Los cambios se guardan mediante el servidor.'); },
  };
  G.auth.current = () => user;
  G.auth.login = (username, password) => request('/api/login', { username, password });
  G.auth.logout = () => request('/api/logout', {});
  G.auth.data = () => G.repo.read();
  G.auth.employees = () => user ? G.repo.read().employees.filter(e => !e.deletedAt) : [];

  const commands = {
    records: ['saveEmployee','toggleEmployee','deleteEmployee','addMovement','voidRecord','saveEvent','saveUser','toggleUser','deleteUser','saveCompany','saveCatalog','toggleCatalog','deleteCatalog'],
    payroll: ['addPayment','prepare'],
  };
  for (const [service, methods] of Object.entries(commands)) {
    for (const method of methods) G[service][method] = (...args) => request('/api/command', { command: `${service}.${method}`, args, revision });
  }
  G.setup = async input => {
    await request('/api/setup', input);
    G.setupRequired = false;
  };
  G.refresh = () => request('/api/session');
})(window.GE);
