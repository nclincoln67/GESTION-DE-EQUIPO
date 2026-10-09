'use strict';

// Lista cerrada: ningún cliente puede enviar un estado completo, IDs protegidos o funciones arbitrarias.
const fields = {
  employee: ['fullName','dni','phone','email','address','birthDate','joined','position','salary','dayOff','scheduleId','functions','observations'],
  movement: ['employeeId','typeId','amount','date','period','concept','notes','eventId','methodId','reference','paymentTiming'],
  payment: ['employeeId','period','amount','date','methodId','reference','notes'],
  event: ['employeeId','type','start','end','description','notes'],
  user: ['fullName','username','password','role','employeeId'],
  company: ['company','subtitle','ruc','phone','address','payDay'],
  catalog: ['label','nature','start','end','date'],
};
const definitions = {
  'records.saveEmployee': ['employee', 'id'], 'records.toggleEmployee': ['id'], 'records.deleteEmployee': ['id'],
  'records.addMovement': ['movement'], 'records.voidRecord': ['collection','id','reason'],
  'records.saveEvent': ['event','id'], 'records.saveUser': ['user','id'],
  'records.toggleUser': ['id'], 'records.deleteUser': ['id'], 'records.saveCompany': ['company'],
  'records.saveCatalog': ['collection','catalog','id'], 'records.toggleCatalog': ['collection','id'], 'records.deleteCatalog': ['collection','id'],
  'payroll.addPayment': ['payment'], 'payroll.prepare': ['period'],
};

function cleanCommand(name, args) {
  if (!Object.hasOwn(definitions, name) || !Array.isArray(args) || args.length > 3) throw new Error('Operación no disponible.');
  return definitions[name].map((shape, index) => {
    const value = args[index];
    if (!fields[shape]) {
      if (shape === 'id' && value == null) return null;
      if (typeof value !== 'string' || value.length > 2000) throw new Error('Parámetro inválido.');
      if (shape === 'period' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new Error('Periodo inválido.');
      return value;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Formulario inválido.');
    const result = {};
    for (const key of fields[shape]) {
      const item = value[key];
      if (item === undefined) continue;
      if (item !== null && typeof item !== 'string' && typeof item !== 'number') throw new Error('Campo inválido.');
      if (typeof item === 'string' && item.length > 12000) throw new Error('El texto es demasiado largo.');
      result[key] = item;
    }
    if (result.period && !/^\d{4}-(0[1-9]|1[0-2])$/.test(result.period)) throw new Error('Periodo inválido.');
    for (const key of ['date','birthDate','joined', ...(shape === 'event' ? ['start','end'] : [])]) {
      const date = result[key];
      if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date)) throw new Error('Fecha inválida.');
    }
    for (const key of ['salary','amount']) {
      if (result[key] !== undefined && (!Number.isFinite(Number(result[key])) || Math.abs(Number(result[key])) > 1000000000)) throw new Error('Importe inválido.');
    }
    return result;
  });
}

module.exports = { cleanCommand };
