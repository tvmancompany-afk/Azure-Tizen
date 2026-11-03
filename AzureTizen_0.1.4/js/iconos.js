/* Iconos del reproductor como SVG en línea (toman el color del texto: currentColor).
   Los de Azure Android (repetir, aleatorio, redimensionar, recargar, subtítulos) son sus vectores XML pasados tal cual a SVG.
   Los de la barra estándar de Media3 (play, pausa, anterior, siguiente, 5/15 s, CC, ajustes...) vienen dentro de la librería de Android
   y no están en el repositorio: están REDIBUJADOS con formas Material parecidas. */
(function () {
  var Azure = window.Azure;
  var F = 'fill="currentColor"', S = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  var MAS = '<path d="M20,1.5 v5 M17.5,4 h5" ' + S + '/>';

  var ICONOS = {
    play: '<path ' + F + ' d="M8 5v14l11-7z"/>',
    pausa: '<path ' + F + ' d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>',
    anterior: '<path ' + F + ' d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>',
    siguiente: '<path ' + F + ' d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>',
    atras5: '<path ' + F + ' d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/><text x="12" y="16.6" font-size="7.6" font-weight="700" text-anchor="middle" ' + F + ' font-family="Roboto,Arial,sans-serif">5</text>',
    adelante15: '<path ' + F + ' d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/><text x="12" y="16.6" font-size="7.2" font-weight="700" text-anchor="middle" ' + F + ' font-family="Roboto,Arial,sans-serif">15</text>',
    // De Azure Android (ic_shuffle.xml, ic_repeat.xml)
    aleatorio: '<path ' + F + ' d="M10.59,9.17L5.41,4 4,5.41l5.17,5.17 1.42,-1.41zM14.5,4l2.04,2.04L4,18.59 5.41,20 17.96,7.46 20,9.5V4h-5.5zM14.83,13.41l-1.41,1.41 3.13,3.13L14.5,20H20v-5.5l-2.04,2.04 -3.13,-3.13z"/>',
    repetir: '<path ' + F + ' d="M7,7h10v3l4,-4 -4,-4v3H5v6h2V7zM17,17H7v-3l-4,4 4,4v-3h12v-6h-2v4z"/>',
    repetir1: '<path ' + F + ' d="M7,7h10v3l4,-4 -4,-4v3H5v6h2V7zM17,17H7v-3l-4,4 4,4v-3h12v-6h-2v4z"/><text x="12" y="15" font-size="7" font-weight="700" text-anchor="middle" ' + F + ' font-family="Roboto,Arial,sans-serif">1</text>',
    // De Azure Android (ic_resize.xml, ic_reload.xml, ic_subtitles.xml: trazos)
    redim: '<path d="M4,4 H20 V20 H4 Z" ' + S + '/><path d="M8,8 L12,8 L12,12" ' + S + '/><path d="M16,16 L12,16 L12,12" ' + S + '/>',
    recargar: '<path d="M18,6 A8,8 0 1,0 20,12" ' + S + '/><path d="M18,3 L18,7 L14,7" ' + S + '/>',
    recargarMas: '<g transform="translate(0,2)"><path d="M18,6 A8,8 0 1,0 20,12" ' + S + '/><path d="M18,3 L18,7 L14,7" ' + S + '/></g>' + MAS,
    subsMas: '<g transform="translate(0,2)"><path d="M5,5 L19,5 A2,2 0 0,1 21,7 L21,17 A2,2 0 0,1 19,19 L5,19 A2,2 0 0,1 3,17 L3,7 A2,2 0 0,1 5,5 Z" ' + S + '/><path d="M7,11 L10.5,11 M13.5,11 L17,11 M7,15 L13,15 M16,15 L17,15" ' + S + '/></g>' + MAS,
    // Redibujados (Media3)
    cc: '<path ' + F + ' d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/>',
    ajustes: '<path ' + F + ' d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>',
    lista: '<path ' + F + ' d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>',
    pantalla: '<path ' + F + ' d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>',
    cerrar: '<path ' + F + ' d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>',
    check: '<path ' + F + ' d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>',
    velocidad: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3.2 2.5"/><path ' + F + ' d="M10 8.2v7.6l6-3.8z"/>',
    audio: '<path ' + F + ' d="M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 1.99 2 1.99L17 22c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 2c1.1 0 2 .9 2 2s-.9 2-2 2c-1.11 0-2-.9-2-2s.89-2 2-2zm0 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>'
  };
  var MAS_ANCHO = { recargarMas: 1, subsMas: 1 };

  Azure.Iconos = {
    nombres: function () { return Object.keys(ICONOS); },
    /** Devuelve un <span class="ic"> con el SVG. El color se toma de CSS (color). */
    crear: function (nombre) {
      var s = document.createElement('span'); s.className = 'ic';
      s.innerHTML = '<svg viewBox="' + (MAS_ANCHO[nombre] ? '0 -2 26 26' : '0 0 24 24') + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + (ICONOS[nombre] || '') + '</svg>';
      s.setAttribute('data-ic', nombre);
      return s;
    },
    poner: function (cont, nombre) { cont.textContent = ''; cont.appendChild(Azure.Iconos.crear(nombre)); }
  };
})();
