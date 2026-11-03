/* Estilo de los subtítulos: panel con vista previa. Se usa en Configuración y en el diálogo SUBTÍTULOS > ESTILO del reproductor. */
(function () {
  var Azure = window.Azure, el = Azure.el, Pant = Azure.Pantallas, U = Pant.util, S = Azure.Subtitulos, D = Azure.Dialogo;
  var POS = ['ABAJO', 'ARRIBA', 'MÁS PEGADO ABAJO', '', 'MÁS PEGADO ARRIBA'];
  var PESOS = [400, 600, 800], NOM_PESO = { 400: 'NORMAL', 600: 'SEMINEGRITA', 800: 'NEGRITA' };
  var NOM_FONDO = ['SIN FONDO', 'FONDO TRANSLÚCIDO', 'FONDO NEGRO'];

  /**
   * Devuelve {el, refrescar}. alCambiar() se llama tras cada cambio (el reproductor lo usa para repintar su subtítulo en vivo).
   * La vista previa tiene franjas blanca, gris, azul y negra para ver si el color se pierde sobre algún fondo.
   */
  /* Texto del botón con un cuadrito del color (el texto en ese color se perdería con negro o azul oscuro). */
  function conMuestra(btn, texto, color) {
    btn.textContent = '';
    var m = el('span', { cls: 'muestra' }); m.style.background = color;
    btn.appendChild(m); btn.appendChild(document.createTextNode(texto));
  }

  Pant.util.panelEstiloSubs = function (alCambiar) {
    var vista = el('div', { cls: 'sub-vista' });
    var franjas = el('div', { cls: 'sub-franjas' }, el('i'), el('i'), el('i'), el('i'));
    var cue = el('div', { cls: 'sub-vista-cue', text: 'Así se verán los subtítulos' });
    vista.appendChild(franjas); vista.appendChild(cue);

    var etiquetas = {}, botones = {};
    function pintar() {
      var e = S.estiloGet();
      S.aplicarVisual(cue);
      etiquetas.tam.textContent = 'TAMAÑO ' + e.tam;
      conMuestra(botones.color, 'COLOR: ' + S.nombreColor(e.color), e.color);
      botones.peso.textContent = 'GROSOR: ' + NOM_PESO[e.peso];
      conMuestra(botones.cColor, 'CONTORNO: ' + S.nombreColor(e.cColor), e.cColor);
      etiquetas.cPx.textContent = 'ANCHO CONTORNO ' + e.cPx;
      botones.fondo.textContent = NOM_FONDO[e.fondo];
      botones.pos.textContent = 'POSICIÓN: ' + POS[S.posicion()];
      etiquetas.aj.textContent = 'AJUSTE ' + (e.ajuste > 0 ? '+' : '') + e.ajuste + ' px';
    }
    function cambio(f) { return function (b) { f(b); pintar(); if (alCambiar) alCambiar(); }; }
    function par(clave, menos, mas) {
      etiquetas[clave] = el('span', { cls: 'sub-val' });
      return el('div', { cls: 'sub-celda par' }, U.boton(menos.t, cambio(menos.fn)), etiquetas[clave], U.boton(mas.t, cambio(mas.fn)));
    }
    function uno(clave, fn) { botones[clave] = U.boton('', cambio(fn)); return el('div', { cls: 'sub-celda' }, botones[clave]); }

    var grid = el('div', { cls: 'sub-grid' },
      par('tam', { t: '−', fn: function () { S.estiloSumar('tam', -4); } }, { t: '+', fn: function () { S.estiloSumar('tam', 4); } }),
      uno('color', function () { S.estiloColorSiguiente('color'); }),
      uno('peso', function () { S.estiloCiclar('peso', PESOS); }),
      uno('cColor', function () { S.estiloColorSiguiente('cColor'); }),
      par('cPx', { t: '−', fn: function () { S.estiloSumar('cPx', -1); } }, { t: '+', fn: function () { S.estiloSumar('cPx', 1); } }),
      uno('fondo', function () { S.estiloCiclar('fondo', [0, 1, 2]); }),
      uno('pos', function () { S.ciclarPosicion(); }),
      par('aj', { t: 'BAJAR', fn: function () { S.estiloSumar('ajuste', -10); } }, { t: 'SUBIR', fn: function () { S.estiloSumar('ajuste', 10); } }));
    var reset = U.boton('RESTABLECER ESTILO', cambio(function () { S.estiloRestablecer(); }));
    var raiz = el('div', { cls: 'sub-panel' }, vista, grid, reset);
    pintar();
    return { el: raiz, refrescar: pintar };
  };

  /** Diálogo con el panel (para el reproductor). */
  Pant.util.dialogoEstiloSubs = function (alCambiar) {
    var p = Pant.util.panelEstiloSubs(alCambiar);
    D.abrir({ titulo: 'Estilo de los subtítulos', cuerpo: p.el, botones: [{ t: 'CERRAR' }] });
  };
})();
