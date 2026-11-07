/* Diagnóstico: qué puede hacer esta TV (WebCodecs, códecs en hardware, WebAssembly) y uso de memoria durante la reproducción. */
(function () {
  var Azure = window.Azure;
  function R(m) { Azure.Registro.info('Capacidades: ' + m); }

  function memoria() {
    var p = window.performance && window.performance.memory;
    return p ? 'JS usado ' + Math.round(p.usedJSHeapSize / 1048576) + ' MB de ' + Math.round(p.totalJSHeapSize / 1048576) + ' MB (límite ' + Math.round(p.jsHeapSizeLimit / 1048576) + ' MB)' : 'sin datos de memoria';
  }

  Azure.Capacidades = {
    memoria: memoria,
    /** Escribe en el registro lo que soporta la TV. */
    probar: function () {
      R('inicio');
      R('núcleos CPU ' + (navigator.hardwareConcurrency || '?') + ' | ' + memoria() + (navigator.deviceMemory ? ' | RAM aprox. ' + navigator.deviceMemory + ' GB' : ''));
      var wasm = typeof WebAssembly === 'object';
      var simd = false, hilos = typeof SharedArrayBuffer !== 'undefined';
      try { simd = wasm && WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11])); } catch (e) {}
      R('WebAssembly ' + (wasm ? 'sí' : 'no') + ' | SIMD ' + (simd ? 'sí' : 'no') + ' | SharedArrayBuffer (hilos) ' + (hilos ? 'sí' : 'no'));
      R('WebCodecs VideoDecoder ' + (window.VideoDecoder ? 'sí' : 'NO') + ' | AudioDecoder ' + (window.AudioDecoder ? 'sí' : 'no'));
      var tipos = ['video/mp4; codecs="avc1.640028"', 'video/mp4; codecs="hvc1.1.6.L120.B0"', 'video/mp4; codecs="av01.0.08M.08"', 'video/webm; codecs="vp9"', 'audio/mp4; codecs="ec-3"', 'audio/mp4; codecs="ac-3"', 'audio/mp4; codecs="mp4a.40.2"'];
      R('MSE/video: ' + tipos.map(function (t) { var v = document.createElement('video'); return t.split('"')[1] + '=' + ((window.MediaSource && MediaSource.isTypeSupported(t)) ? 'MSE' : '-') + '/' + (v.canPlayType(t) || '-'); }).join(' '));
      if (!window.VideoDecoder) { R('fin'); return; }
      var cods = [['H.264', 'avc1.640028'], ['H.264 4K', 'avc1.640033'], ['HEVC', 'hvc1.1.6.L120.B0'], ['AV1', 'av01.0.08M.08'], ['VP9', 'vp09.00.40.08']];
      var pend = cods.length;
      cods.forEach(function (c) {
        var fin = function (t) { R('VideoDecoder ' + c[0] + ': ' + t); if (--pend === 0) R('fin'); };
        try {
          VideoDecoder.isConfigSupported({ codec: c[1], codedWidth: 1920, codedHeight: 1080, hardwareAcceleration: 'prefer-hardware' }).then(function (r) {
            return VideoDecoder.isConfigSupported({ codec: c[1], codedWidth: 1920, codedHeight: 1080, hardwareAcceleration: 'prefer-software' }).then(function (s) { fin('hardware ' + (r.supported ? 'sí' : 'no') + ' | software ' + (s.supported ? 'sí' : 'no')); });
          }).catch(function (e) { fin('error ' + (e && e.message)); });
        } catch (e) { fin('error ' + (e && e.message)); }
      });
    }
  };

  // Una línea de memoria por minuto mientras hay un video abierto: si la app se llena, el registro mostrará cómo crecía
  setInterval(function () {
    try { if (Azure.Reproductor && Azure.Reproductor.estaAbierto && Azure.Reproductor.estaAbierto()) Azure.Registro.info('Memoria: ' + memoria() + (Azure.Reproductor.info ? ' | ' + (Azure.Reproductor.info().estado || '') : '')); } catch (e) {}
  }, 60000);
})();
