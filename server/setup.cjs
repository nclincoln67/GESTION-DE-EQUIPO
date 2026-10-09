'use strict';

const { emptyData } = require('./domain.cjs');

function settingsForSetup(candidate) {
  const defaults = emptyData().settings;
  if (!candidate) return defaults;
  if (typeof candidate !== 'object' || Array.isArray(candidate)) throw new Error('Configuración no válida.');
  const result = { ...defaults };
  for (const key of ['subtitle','ruc','phone','address']) {
    if (candidate[key] !== undefined) {
      if (typeof candidate[key] !== 'string' || candidate[key].length > 1000) throw new Error('Datos de empresa no válidos.');
      result[key] = candidate[key];
    }
  }
  if (candidate.payDay !== undefined) {
    if (!Number.isInteger(Number(candidate.payDay)) || candidate.payDay < 1 || candidate.payDay > 31) throw new Error('Día de pago no válido.');
    result.payDay = Number(candidate.payDay);
  }
  for (const key of ['types','methods','positions','schedules','holidays']) {
    if (candidate[key] === undefined) continue;
    if (!Array.isArray(candidate[key]) || candidate[key].length > 500) throw new Error('Catálogo no válido.');
    const ids = new Set();
    result[key] = candidate[key].map(entry => {
      if (!entry || !/^[a-zA-Z0-9:_-]{1,100}$/.test(entry.id) || ids.has(entry.id)) throw new Error('Identificador de catálogo no válido o duplicado.');
      if (typeof entry.label !== 'string' || !entry.label.trim() || entry.label.length > 250) throw new Error('Nombre de catálogo no válido.');
      ids.add(entry.id);
      const record = { id: entry.id, label: entry.label, active: entry.active !== false };
      if (entry.deletedAt) { record.deletedAt = String(entry.deletedAt).slice(0,40); record.active = false; }
      if (key === 'types') {
        const nature = entry.id === 'advance' ? 'advance' : entry.nature;
        if (!['income','deduction','advance'].includes(nature)) throw new Error('Naturaleza de movimiento no válida.');
        record.nature = nature;
      }
      if (key === 'schedules') {
        for (const part of ['start','end']) {
          if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(entry[part])) throw new Error('Horario no válido.');
          record[part] = entry[part];
        }
      }
      if (key === 'holidays') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) throw new Error('Fecha de feriado no válida.');
        record.date = entry.date;
      }
      return record;
    });
  }
  result.company = 'INKAJUS';
  return result;
}

module.exports = { settingsForSetup };
