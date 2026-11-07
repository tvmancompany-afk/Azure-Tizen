// 0.1.1: archivos T (CORS), https->http, nombres de endpoint, proxy de respaldo. Requiere:
//  - python3 servidor.py (8765)  - upstream sin CORS en 8802  - php -S 127.0.0.1:8801 con Buddy + guardarT/leerT + proxyTest.php (clave abc123, loopback permitido)
const { chromium } = require('playwright');
const R = []; const ok = (n, c, x) => { R.push((c ? 'OK   ' : 'FALLA') + ' ' + n + (c ? '' : '  -> ' + x)); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file:///home/claude/AzureTizen/index.html');
  await p.waitForTimeout(400);
  const r = await p.evaluate(async () => {
    const A = window.Azure, o = {}, B = A.BuddyHost, H = '127.0.0.1:8801';
    const falla = async f => { try { await f(); return 'no falló'; } catch (e) { return e.causa + '|' + e.message; } };
    o.version = A.VERSION;
    o.defaults = [B.archivoGuardar(), B.archivoLeer()];
    // Buddy con los archivos T (host con http explícito)
    o.g1 = await B.guardar('http://' + H + '/', 'tzn1', 'clave1', 'línea ñ\nsegunda');
    o.l1 = await B.leer('http://' + H, 'tzn1');
    o.gMal = await falla(() => B.guardar('http://' + H, 'tzn1', 'otraclave', 'x'));
    o.lNo = await falla(() => B.leer('http://' + H, 'noexiste'));
    // sin esquema: https falla (servidor solo http) y reintenta con http
    o.g2 = await B.guardar(H, 'tzn2', 'clave2', 'sin esquema');
    o.l2 = await B.leer(H, 'tzn2');
    // archivos originales (sin CORS): falla y el mensaje orienta
    A.Almacen.set('buddy_leer', 'leer.php');
    o.sinCors = await falla(() => B.leer('http://' + H, 'tzn1'));
    A.Almacen.set('buddy_leer', 'leerT.php');
    // proxy: upstream sin CORS
    const U = 'http://127.0.0.1:8802/a.m3u', P = 'http://127.0.0.1:8801/proxyTest.php';
    A.Almacen.set('proxy_url', ''); A.Almacen.set('proxy_clave', '');
    o.sinProxy = await falla(() => A.Red.pedir(U));
    A.Almacen.set('proxy_url', P); A.Almacen.set('proxy_clave', 'abc123'); A.Almacen.set('proxy_modo', 'auto');
    const r1 = await A.Red.pedir(U); o.auto = [r1.ok, r1.viaProxy, r1.texto.indexOf('Uno') > 0];
    const r2 = await A.Red.pedir('http://127.0.0.1:8802/nada'); o.auto404 = [r2.status, r2.viaProxy];
    A.Almacen.set('proxy_modo', 'no'); o.modoNo = await falla(() => A.Red.pedir(U));
    A.Almacen.set('proxy_modo', 'siempre'); const r3 = await A.Red.pedir(U); o.siempre = r3.viaProxy;
    A.Almacen.set('proxy_modo', 'auto');
    A.Almacen.set('proxy_clave', 'mala'); o.claveMala = await falla(() => A.Red.pedir(U));
    A.Almacen.set('proxy_clave', 'abc123'); A.Almacen.set('proxy_url', 'http://127.0.0.1:9/p.php'); o.proxyCaido = await falla(() => A.Red.pedir(U));
    A.Almacen.set('proxy_url', P);
    o.directoNoUsaProxy = await falla(() => A.Red.directo(U));
    // el servidor caído del test1 sigue siendo 'red' (con proxy configurado, el proxy tampoco puede)
    o.ofuscaClave = A.Registro.texto().indexOf('abc123') < 0;
    // Xtream por proxy (el falso en 8765 sí tiene CORS: debe ir directo)
    const x = await A.Xtream.abrir(A.Xtream.enlaceRaiz('127.0.0.1:8765', 'u', 'bien')); o.xtream = x.entradas.length;
    return o;
  });
  ok('versión 0.1.x', /^0\.1\./.test(r.version), r.version);
  ok('endpoints por defecto = archivos T', r.defaults.join() === 'guardarT.php,leerT.php', r.defaults);
  ok('Buddy T: guardar y leer (utf-8 y saltos)', r.g1 === true && r.l1 === 'línea ñ\nsegunda', JSON.stringify([r.g1, r.l1]));
  ok('Buddy T: clave mala y título inexistente muestran el mensaje del servidor', /Contrasena incorrecta/.test(r.gMal) && /no existe/.test(r.lNo), r.gMal + ' // ' + r.lNo);
  ok('Buddy sin esquema: https falla y cae a http', r.g2 === true && r.l2 === 'sin esquema', JSON.stringify([r.g2, r.l2]));
  ok('Buddy con leer.php original (sin CORS): error orienta a guardarT/leerT', /^red\|/.test(r.sinCors) && /leerT/.test(r.sinCors), r.sinCors);
  ok('Proxy: sin configurar, el upstream sin CORS falla', /^red\|/.test(r.sinProxy), r.sinProxy);
  ok('Proxy auto: usa proxy solo tras fallar y entrega la lista', r.auto.join() === 'true,true,true', r.auto);
  ok('Proxy auto: 404 del upstream se conserva como 404', r.auto404.join() === '404,true', r.auto404);
  ok('Proxy modo NO: no se usa', /^red\|/.test(r.modoNo), r.modoNo);
  ok('Proxy modo SIEMPRE: va por proxy', r.siempre === true, r.siempre);
  ok('Proxy clave mala: error claro', /^proxy\|El proxy respondió: Clave incorrecta/.test(r.claveMala), r.claveMala);
  ok('Proxy caído: error original + aviso', /^red\|.*proxy tampoco/.test(r.proxyCaido), r.proxyCaido);
  ok('directo() nunca usa el proxy', /^red\|/.test(r.directoNoUsaProxy), r.directoNoUsaProxy);
  ok('La clave del proxy no aparece en el registro', r.ofuscaClave);
  ok('Xtream con CORS sigue yendo directo', r.xtream === 3, r.xtream);

  // Interfaz: Configuración > Red y Buddy Host
  await p.evaluate(() => window.Azure.Pantallas.ir('config'));
  await p.waitForTimeout(300);
  const ui = await p.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.plegable > *:first-child')).map(x => x.textContent.trim());
    return t;
  });
  ok('Configuración tiene paneles Red y Buddy Host', ui.some(x => /Red/.test(x)) && ui.some(x => /Buddy Host/.test(x)), JSON.stringify(ui));
  await p.evaluate(() => { document.querySelectorAll('.plegable').forEach(x => x.classList.add('abierto')); });
  const campos = await p.evaluate(() => Array.from(document.querySelectorAll('.pantalla input')).map(i => i.type + ':' + i.value));
  ok('Campos: proxy (url, clave oculta), Buddy (host, guardar, leer)', campos.some(c => c.indexOf('password:abc123') === 0) && campos.some(c => c === 'text:guardarT.php') && campos.some(c => c === 'text:leerT.php'), JSON.stringify(campos));
  await p.screenshot({ path: '/tmp/cfg.png' });
  // botón modo proxy cicla
  const modos = await p.evaluate(() => {
    const bt = Array.from(document.querySelectorAll('.pantalla .btn')).find(b => /USAR PROXY/.test(b.textContent)), out = [bt.textContent];
    bt.click(); out.push(bt.textContent); bt.click(); out.push(bt.textContent); bt.click(); out.push(bt.textContent); return out;
  });
  ok('Botón USAR PROXY cicla auto > siempre > no > auto', /SOLO SI FALLA/.test(modos[0]) && /SIEMPRE/.test(modos[1]) && /NO USAR/.test(modos[2]) && /SOLO SI FALLA/.test(modos[3]), JSON.stringify(modos));
  // Prueba de red: botón del proxy
  await p.evaluate(() => { window.Azure.Almacen.set('pr_m3u', 'http://127.0.0.1:8802/a.m3u'); window.Azure.Pantallas.ir('prueba', {}, true); });
  await p.waitForTimeout(300);
  await p.evaluate(() => Array.from(document.querySelectorAll('.pantalla .btn')).find(b => /POR EL PROXY/.test(b.textContent)).click());
  await p.waitForTimeout(1500);
  const logTxt = await p.evaluate(() => document.querySelector('.panel.mono').textContent);
  ok('Prueba de red: PROBAR POR EL PROXY lee la lista', /Por proxy: respuesta 200/.test(logTxt), logTxt.slice(-300));
  ok('sin errores de página', errs.length === 0, errs.join(' | '));
  console.log(R.join('\n')); console.log(R.filter(x => x.startsWith('FALLA')).length ? 'HAY FALLAS' : 'TODO OK');
  await b.close();
})();
