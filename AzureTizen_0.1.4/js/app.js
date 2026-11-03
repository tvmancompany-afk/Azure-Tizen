/* Arranque de Azure Tizen */
(function () {
  var Azure = window.Azure;

  function salirDeLaApp() {
    try { if (window.tizen && tizen.application) { tizen.application.getCurrentApplication().exit(); return; } } catch (e) { Azure.Registro.aviso('exit: ' + (e && e.message)); }
    try { window.close(); } catch (e) {}
  }

  function iniciar() {
    Azure.Registro.info('Inicio Azure Tizen ' + Azure.VERSION);
    Azure.Teclas.iniciar();
    Azure.Cursor.iniciar();
    Azure.Teclas.empujar(Azure.Foco.manejadorBase);
    // Atrás en la pantalla principal pregunta antes de salir (si ninguna pantalla lo consumió)
    Azure.Teclas.empujar(function (tecla) {
      if (tecla !== 'atras') return false;
      var p = Azure.Pantallas.actual();
      if (p && p.nombre === 'principal') {
        Azure.Dialogo.confirmar('Salir', '¿Salir de Azure?', 'SALIR').then(function (si) { if (si) salirDeLaApp(); });
        return true;
      }
      return false;
    });
    // El orden importa: la pila se recorre de arriba abajo. Las pantallas se apilan encima de estos dos.
    Azure.Seguridad.iniciar(); // el bloqueo se pide solo al abrir la app
    Azure.Reproductor.iniciar({});
    Azure.Pantallas.ir(Azure.Seguridad.estaBloqueado() ? 'bloqueo' : 'principal');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
