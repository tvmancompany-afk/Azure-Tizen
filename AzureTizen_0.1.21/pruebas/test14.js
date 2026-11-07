// 0.1.19: panel "Video con cabeceras" (AVPlay simulado). Requiere servidor.py y v.webm.
const { chromium } = require('playwright');
const R = []; const ok = (n, c, x) => R.push((c ? 'OK   ' : 'FALLA') + ' ' + n + (c ? '' : '  -> ' + x));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/AzureTizen/index.html'); await sleep(400);
  await p.evaluate(() => {
    const L = window.__log = [];
    window.webapis = { avplay: {
      open: u => L.push('open ' + u), setListener() {}, setStreamingProperty: (k, v) => L.push('prop ' + k + '=' + v), prepareAsync: ok => setTimeout(ok, 20),
      getDuration: () => 600000, getCurrentTime: () => 0, seekTo() {}, play() {}, pause() {}, stop() {}, close() {}, setDisplayRect() {}, setDisplayMethod() {},
      getState: () => 'PLAYING', setSpeed() {}, getTotalTrackInfo: () => [], getCurrentStreamInfo: () => [], setSilentSubtitle() {}, setSelectTrack() {}
    } };
    document.querySelectorAll('.plegable:not(.abierto) > .cab').forEach(c => c.click());
  });
  const campos = p.locator('input.campo');
  ok('hay panel Video con cabeceras', await p.locator('text=Video con cabeceras').count() > 0, '');
  // los campos del panel son el 2.º y 3.º (después de Fuente)
  await campos.nth(1).fill('https://player.zilla-networks.com/m3u8/abc');
  await p.locator('.plegable:has(.cab:has-text("Video con cabeceras")) .btn:has-text("ABRIR")').click(); await sleep(1200);
  const l = await p.evaluate(() => window.__log.join('\n'));
  ok('abre ese link', /open https:\/\/player\.zilla-networks\.com\/m3u8\/abc/.test(l), l);
  const ua = (l.match(/prop USER_AGENT=([\s\S]*?)\nopen|prop USER_AGENT=([\s\S]*)$/) || [])[0] || l;
  ok('Referer = el link', /Referer: https:\/\/player\.zilla-networks\.com\/m3u8\/abc/.test(l), l);
  ok('Origin deducido del dominio', /Origin: https:\/\/player\.zilla-networks\.com\r?\n/.test(l) || /Origin: https:\/\/player\.zilla-networks\.com\s*\r\n/.test(l), JSON.stringify(l));
  ok('Sec-Fetch-Site presente', /Sec-Fetch-Site: same-origin/.test(l), l);
  const org = await p.evaluate(() => Object.keys(localStorage).filter(k => /cab_origenes/.test(k)).map(k => localStorage.getItem(k)).join());
  ok('el Origin se guardó solo', /player\.zilla-networks\.com/.test(org), org);
  await p.locator('.plegable:has(.cab:has-text("Video con cabeceras")) .btn:has-text("LIMPIAR LINK")').click();
  ok('LIMPIAR LINK vacía el link', (await campos.nth(1).inputValue()) === '', await campos.nth(1).inputValue());
  await campos.nth(2).fill('https://otro.com');
  await p.locator('.plegable:has(.cab:has-text("Video con cabeceras")) .btn:has-text("LIMPIAR ORIGIN")').click();
  ok('LIMPIAR ORIGIN vacía el origin', (await campos.nth(2).inputValue()) === '', '');
  await p.locator('.plegable:has(.cab:has-text("Video con cabeceras")) .btn:has-text("ORIGINS")').click(); await sleep(300);
  ok('el botón ORIGINS muestra los guardados', await p.locator('.dialogo .btn:has-text("https://player.zilla-networks.com")').count() > 0, '');
  await p.locator('.dialogo .btn:has-text("https://player.zilla-networks.com")').first().click(); await sleep(200);
  ok('elegir uno lo pega en Origin', (await campos.nth(2).inputValue()) === 'https://player.zilla-networks.com', await campos.nth(2).inputValue());
  console.log(R.join('\n')); console.log('ERRORES DE PÁGINA:', errs.length ? errs.join(' ; ') : 'ninguno'); await b.close();
})();
