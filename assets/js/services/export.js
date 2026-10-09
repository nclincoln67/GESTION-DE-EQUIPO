(function (G) {
  'use strict';

  G.exports = {
    prepare() {
      G.auth.requireAdmin();
      const data = G.repo.read();
      // Las cuentas se trasladan por identidad y rol; las contraseñas se crean de nuevo.
      data.users = data.users.map(user => {
        const { password, passwordHash, passwordSalt, ...identity } = user;
        return { ...identity, requiresPasswordSetup: true };
      });
      return {
        format: 'gestion-equipo-data',
        exportVersion: 1,
        exportedAt: new Date().toISOString(),
        purpose: 'migration',
        credentialsIncluded: false,
        data,
      };
    },

    download() {
      const bundle = this.prepare();
      const file = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `gestion-equipo-datos-${G.utils.today()}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      G.ui.toast('Archivo de datos preparado para descargar.');
    },
  };
})(window.GE);
