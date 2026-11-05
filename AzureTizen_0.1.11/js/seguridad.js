/* Seguridad: bloqueo de la app con contraseña (el modo de Android TV de Azure). SHA-256 con sal aleatoria.
   Decisión del usuario (2026-11-02): se pide SOLO al abrir la app (por ejemplo tras apagar la TV), no al volver de otra app
   ni tras un rato en segundo plano (a diferencia de Android, que lo vuelve a pedir tras 1 minuto). */
(function () {
  var Azure = window.Azure, A = Azure.Almacen;
  var MIN = 4;
  var bloqueado = false;

  function hash(sal, clave) { return Azure.sha256(sal + ':' + clave); }

  var Seguridad = Azure.Seguridad = {
    MIN: MIN,
    activa: function () { return !!A.get('seg_hash', ''); },
    estaBloqueado: function () { return bloqueado && Seguridad.activa(); },
    desbloquear: function () { bloqueado = false; },
    bloquearAhora: function () { bloqueado = Seguridad.activa(); },

    establecer: function (clave) {
      if (!clave || clave.length < MIN) return false;
      var sal = Azure.saltAleatoria();
      A.set('seg_sal', sal); A.set('seg_hash', hash(sal, clave));
      bloqueado = false;
      return true;
    },
    verificar: function (clave) {
      var sal = A.get('seg_sal', ''), h = A.get('seg_hash', '');
      return !!h && hash(sal, clave || '') === h;
    },
    quitar: function () { A.del('seg_sal'); A.del('seg_hash'); bloqueado = false; },

    /** Llamar una vez al iniciar la app: si hay contraseña, arranca bloqueada. */
    iniciar: function () { bloqueado = Seguridad.activa(); }
  };
})();
