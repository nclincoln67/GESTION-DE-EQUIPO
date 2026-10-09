window.GE = window.GE || {};
(function (G) {
  'use strict';
  const moneyFormat = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
  G.utils = {
    escape(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); },
    money(value) { return moneyFormat.format(Number(value || 0)); },
    today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; },
    month() { return this.today().slice(0,7); },
    monthLabel(month) { return new Date(`${month}-01T12:00:00`).toLocaleDateString('es-PE', { month:'long', year:'numeric' }); },
    date(value) { return value ? new Date(value+'T12:00:00').toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric'}) : '—'; },
    uid() { return globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`; },
    initials(fullName) { return String(fullName).trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase(); },
    cents(value) { return Math.round(Number(value)*100); },
    days: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],
    eventTypes: ['Falta','Permiso','Vacaciones','Descanso médico','Feriado trabajado','Día libre trabajado','Cambio de día libre','Otro'],
    assert(condition, message) { if (!condition) throw new Error(message); }
  };
  G.state = { page:'home', month:G.utils.month(), tab:'summary', profileId:null, profileTab:'information', filters:{} };
  G.views = {};
})(window.GE);
