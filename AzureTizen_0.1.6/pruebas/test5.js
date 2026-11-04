// 0.1.2: reloj, bloqueo solo al abrir, estilo de subtítulos configurable. Requiere servidor.py (8765) y v.webm.
const { chromium } = require('playwright');
const R = []; const ok = (n, c, x) => { R.push((c ? 'OK   ' : 'FALLA') + ' ' + n + (c ? '' : '  -> ' + x)); };
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  const URL = 'file:///home/claude/AzureTizen/index.html';
  await p.goto(URL); await p.waitForTimeout(400);

  // ---- modelo de estilo ----
  const m = await p.evaluate(() => {
    const A = window.Azure, S = A.Subtitulos, o = {};
    o.version = A.VERSION;
    o.def = S.estiloGet();
    S.estiloPoner('tam', 44); for (let i = 0; i < 40; i++) S.estiloSumar('tam', 4); o.tamMax = S.estiloGet().tam;
    for (let i = 0; i < 40; i++) S.estiloSumar('tam', -4); o.tamMin = S.estiloGet().tam;
    S.estiloRestablecer();
    const c0 = S.estiloGet().color; const c1 = S.estiloColorSiguiente('color'); o.colorCambia = c0 !== c1 && S.nombreColor(c1) === 'AMARILLO';
    for (let i = 0; i < S.COLORES.length - 1; i++) S.estiloColorSiguiente('color'); o.colorVuelta = S.estiloGet().color === c0;
    S.estiloPoner('cPx', 0); o.sombra0 = S.sombra();
    S.estiloPoner('cPx', 3); o.sombra3 = S.sombra().split('),').length >= 0 ? S.sombra().split(' 0 #').length - 1 : 0; // piezas con 0 de desenfoque
    S.estiloPoner('cPx', 99); o.cPxMax = S.estiloGet().cPx;
    S.estiloPoner('peso', 123); o.pesoMalo = S.estiloGet().peso;
    S.estiloCiclar('fondo', [0, 1, 2]); o.fondoCiclo = S.estiloGet().fondo;
    S.estiloRestablecer();
    S.ponerPosicion(0); o.p0 = JSON.stringify(S.estilo());
    S.estiloSumar('ajuste', 20); o.p0aj = S.estilo().bottom;
    S.ponerPosicion(1); o.p1aj = S.estilo().top;
    S.estiloPoner('ajuste', 400); S.ponerPosicion(4); o.p4aj = S.estilo().top; // 30-400 -> 0
    S.estiloPoner('ajuste', -400); S.ponerPosicion(0); o.p0neg = S.estilo().bottom;
    S.estiloPoner('ajuste', 0); S.ponerPosicion(0);
    S.estiloPoner('tam', 60); S.estiloPoner('color', '#ffe44d');
    return o;
  });
  ok('versión 0.1.6', m.version === '0.1.6', m.version);
  ok('estilo por defecto = el de antes (44 px, blanco, seminegrita, contorno negro 2)', m.def.tam === 44 && m.def.color === '#ffffff' && m.def.peso === 600 && m.def.cColor === '#000000' && m.def.cPx === 2 && m.def.fondo === 0 && m.def.ajuste === 0, JSON.stringify(m.def));
  ok('tamaño limitado a 24..96', m.tamMax === 96 && m.tamMin === 24, m.tamMax + ',' + m.tamMin);
  ok('color cicla por la paleta y da la vuelta', m.colorCambia && m.colorVuelta);
  ok('contorno 0 = sin sombra; valores absurdos se limitan', m.sombra0 === 'none' && m.cPxMax === 8 && m.pesoMalo === 600 && m.fondoCiclo === 1, JSON.stringify([m.sombra0, m.cPxMax, m.pesoMalo, m.fondoCiclo]));
  ok('contorno 3 genera 48 sombras duras (16 direcciones x 3 anillos)', m.sombra3 === 48, m.sombra3);
  ok('posición + ajuste fino (abajo sube, arriba baja, nunca negativo)', m.p0 === '{"top":"auto","bottom":"130px"}' && m.p0aj === '150px' && m.p1aj === '70px' && m.p4aj === '0px' && m.p0neg === '0px', JSON.stringify([m.p0, m.p0aj, m.p1aj, m.p4aj, m.p0neg]));

  // ---- persistencia: recargar ----
  await p.reload(); await p.waitForTimeout(400);
  const per = await p.evaluate(() => { const e = window.Azure.Subtitulos.estiloGet(); return [e.tam, e.color]; });
  ok('el estilo se conserva al reabrir la app', per[0] === 60 && per[1] === '#ffe44d', JSON.stringify(per));

  // ---- Configuración: reloj y panel ----
  await p.evaluate(() => window.Azure.Pantallas.ir('config'));
  await p.waitForTimeout(300);
  const cfg = await p.evaluate(() => {
    const r = document.querySelector('.reloj');
    return { reloj: r ? r.textContent : null, celdas: document.querySelectorAll('.sub-celda').length, vista: !!document.querySelector('.sub-vista-cue'),
      textoSeg: document.querySelector('.pantalla').textContent.indexOf('al abrir la app') >= 0 };
  });
  ok('Configuración muestra el reloj con hora (HH:MM)', cfg.reloj && /\d{1,2}[:.]\d{2}/.test(cfg.reloj), cfg.reloj);
  ok('Panel de estilo: 8 controles y vista previa', cfg.celdas === 8 && cfg.vista, JSON.stringify(cfg));
  ok('Texto de Seguridad dice que se pide al abrir la app', cfg.textoSeg);
  await p.evaluate(() => document.querySelectorAll('.plegable').forEach(x => x.classList.add('abierto')));
  const ui = await p.evaluate(() => {
    const B = t => Array.from(document.querySelectorAll('.sub-panel .btn')).find(x => x.textContent.indexOf(t) >= 0);
    const vc = document.querySelector('.sub-vista-cue'), out = {};
    out.tam0 = getComputedStyle(vc).fontSize;
    const mas = Array.from(document.querySelectorAll('.sub-celda.par'))[0].querySelectorAll('.btn')[1]; mas.click(); out.tam1 = getComputedStyle(vc).fontSize;
    B('COLOR:').click(); out.color = getComputedStyle(vc).color;
    B('GROSOR:').click(); out.peso = getComputedStyle(vc).fontWeight;
    B('CONTORNO:').click(); out.cc = window.Azure.Subtitulos.estiloGet().cColor;
    B('FONDO').click(); out.fondo = getComputedStyle(vc).backgroundColor;
    B('POSICIÓN:').click(); out.pos = B('POSICIÓN:').textContent;
    B('RESTABLECER').click(); out.reset = JSON.stringify(window.Azure.Subtitulos.estiloGet()) === JSON.stringify(window.Azure.Subtitulos.estiloDef());
    out.tamReset = getComputedStyle(vc).fontSize;
    return out;
  });
  ok('Botones cambian la vista previa (tamaño, color, grosor, fondo)', ui.tam0 === '60px' && ui.tam1 === '64px' && ui.color !== 'rgb(255, 228, 77)' && ui.peso === '800' && /rgba\(0, 0, 0, 0\.55\)/.test(ui.fondo), JSON.stringify(ui));
  ok('Contorno cicla y POSICIÓN cambia de texto', ui.cc !== '#000000' && /POSICIÓN: ARRIBA/.test(ui.pos), JSON.stringify([ui.cc, ui.pos]));
  ok('RESTABLECER vuelve al estilo por defecto', ui.reset && ui.tamReset === '44px', JSON.stringify([ui.reset, ui.tamReset]));
  await p.evaluate(() => { window.Azure.Subtitulos.estiloPoner('color', '#ffe44d'); window.Azure.Subtitulos.estiloPoner('tam', 56); window.Azure.Subtitulos.estiloPoner('fondo', 1); window.Azure.Subtitulos.estiloPoner('cPx', 3); window.Azure.Subtitulos.ponerPosicion(0); });
  await p.evaluate(() => window.Azure.Pantallas.ir('config'));
  await p.waitForTimeout(300);
  await p.evaluate(() => { document.querySelectorAll('.plegable').forEach(x => x.classList.add('abierto')); document.querySelector('.sub-panel').scrollIntoView(); });
  await p.screenshot({ path: '/tmp/cfg_sub.png' });

  // ---- Reproductor: el subtítulo usa el estilo y ESTILO lo cambia en vivo ----
  await p.evaluate(() => {
    const A = window.Azure; A.Subtitulos.cargar('1\n00:00:00,000 --> 00:00:19,000\nHola, esto es una prueba\nsegunda línea\n', 'srt', 'prueba.srt');
    A.Pantallas.ir('reproductor', { lista: [{ title: 'Prueba', url: 'http://127.0.0.1:8765/video.mp4' }], indice: 0 }, true);
  });
  await p.waitForTimeout(2500);
  const rp = await p.evaluate(() => { const c = document.querySelector('.sub-cue'), cs = getComputedStyle(c); return { t: c.textContent, fs: cs.fontSize, col: cs.color, bg: cs.backgroundColor, sh: cs.textShadow.length > 20, disp: cs.display }; });
  ok('Reproductor: el subtítulo usa tamaño, color, fondo y contorno guardados', /Hola/.test(rp.t) && rp.fs === '56px' && rp.col === 'rgb(255, 228, 77)' && /0\.55/.test(rp.bg) && rp.sh, JSON.stringify(rp));
  await p.screenshot({ path: '/tmp/rep_sub.png' });
  // menú SUBTÍTULOS > ESTILO
  await p.evaluate(() => { const g=document.querySelector('[data-ic="grupo2"]'); const b=Array.from(document.querySelectorAll('.rep-ui button, .rep-ui [data-f]')).find(x=>x.textContent==='»'); if(b) b.click(); });
  await p.waitForTimeout(200);
  await p.evaluate(() => { const i=document.querySelector('[data-ic="subsMas"]'); (i.closest('[data-f],button')||i.parentNode).click(); });
  await p.waitForTimeout(300);
  const tieneEstilo = await p.evaluate(() => !!Array.from(document.querySelectorAll('.btn')).find(x => x.textContent === 'ESTILO'));
  ok('Menú SUBTÍTULOS tiene el botón ESTILO', tieneEstilo);
  await p.evaluate(() => Array.from(document.querySelectorAll('.btn')).find(x => x.textContent === 'ESTILO').click());
  await p.waitForTimeout(400);
  const vivo = await p.evaluate(() => {
    const dlg = document.querySelector('.sub-panel'); if (!dlg) return { dlg: false };
    const mas = dlg.querySelectorAll('.sub-celda.par')[0].querySelectorAll('.btn')[1]; mas.click();
    return { dlg: true, fs: getComputedStyle(document.querySelector('.pantalla .sub-cue')).fontSize };
  });
  ok('Diálogo de estilo cambia el subtítulo del video en vivo', vivo.dlg && vivo.fs === '60px', JSON.stringify(vivo));
  await p.screenshot({ path: '/tmp/rep_estilo.png' });
  await p.evaluate(() => { window.Azure.Subtitulos.quitar(); window.Azure.Subtitulos.estiloRestablecer(); });

  // ---- Bloqueo: solo al abrir ----
  await p.goto(URL); await p.waitForTimeout(400);
  const bl = await p.evaluate(async () => {
    const A = window.Azure, o = {};
    A.Seguridad.establecer('clave1');
    // simula salir de la app 5 minutos y volver
    const real = Date.now; let t = real();
    Date.now = () => t;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'));
    t += 5 * 60 * 1000;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange'));
    Date.now = real;
    o.tras5min = A.Pantallas.actual().nombre; o.estaBloqueado = A.Seguridad.estaBloqueado();
    return o;
  });
  ok('Volver tras 5 minutos fuera NO pide contraseña', bl.tras5min !== 'bloqueo' && bl.estaBloqueado === false, JSON.stringify(bl));
  await p.reload(); await p.waitForTimeout(500);
  const al = await p.evaluate(() => ({ pant: window.Azure.Pantallas.actual().nombre }));
  ok('Al abrir la app (arranque nuevo) SÍ pide la contraseña', al.pant === 'bloqueo', JSON.stringify(al));
  await p.evaluate(() => { const i = document.querySelector('input'); i.value = 'clave1'; i.dispatchEvent(new Event('input')); document.querySelector('.btn.pri').click(); });
  await p.waitForTimeout(300);
  const des = await p.evaluate(() => window.Azure.Pantallas.actual().nombre);
  ok('Con la contraseña correcta entra a la principal', des === 'principal', des);
  await p.evaluate(() => window.Azure.Seguridad.quitar());
  ok('sin errores de página', errs.length === 0, errs.join(' | '));
  console.log(R.join('\n')); console.log(R.filter(x => x.startsWith('FALLA')).length ? 'HAY FALLAS' : 'TODO OK');
  await b.close();
})();
