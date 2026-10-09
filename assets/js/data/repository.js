(function (G) {
  'use strict';
  const KEY = 'inkajus.team.v1';
  // Único acceso al almacenamiento persistente. Sustituir por un adaptador API en el futuro.
  let memory;
  G.repo = {
    init() {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        memory = JSON.parse(raw);
        if (memory.schemaVersion !== 1 || !Array.isArray(memory.users)) throw new Error('Formato de datos incompatible. No se modificó tu información.');
      } else { memory = G.createDemo(); localStorage.setItem(KEY,JSON.stringify(memory)); }
    },
    read() { return structuredClone(memory); },
    transaction(update) {
      const draft = structuredClone(memory);
      const result = update(draft);
      // Persistir antes de actualizar la memoria: un fallo de guardado no simula éxito.
      localStorage.setItem(KEY,JSON.stringify(draft));
      memory = draft;
      return result;
    }
  };
})(window.GE);
