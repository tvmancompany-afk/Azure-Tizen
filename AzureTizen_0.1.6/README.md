# Azure Tizen

Versión actual: **0.1.6** (informe de la primera prueba en TV: fondo girado 90°, ventanita más pequeña, borrar cuentas Xtream, 4:3 reaplicado; antes: Listas preferentes igualadas a Android: filas con modo botones 🔒/🗑/▲▼ y ✎ editar, cabecera ✕/←/lupa, posición conservada, textos de Android, selector de entrada para A PREFERENTES, pestaña Exportar con 3 contraseñas obligatorias; antes: pantalla principal: reproductor integrado en ventanita 16:9, textos y nombres igualados a Android; antes: reproductor clonado de Azure Android: barra Media3, grupos ▸ y », velocidad, audio, Elegir video, recarga automática+, subtítulos+; antes: base portada de Azure Android 0.1.14; archivos de servidor "T" y proxy; Configuración revisada: reloj, bloqueo solo al abrir, estilo de subtítulos configurable)

Reproductor de listas M3U/TXT y Xtream para Samsung Tizen TV. Es una app web (HTML, CSS y JavaScript sin dependencias) empaquetada como `.wgt`.

- Instalar en la TV: `docs/INSTALAR_EN_TIZEN.md`
- Qué se portó, protocolos y riesgos: `docs/MAPA_PORTEO.md`
- Estado y decisiones: `docs/PROGRESO.md`
- Archivos PHP para tu hosting (CORS y proxy): `servidor/LEEME.txt`
- Pruebas en PC: `pruebas/LEEME.txt`

## Estructura
```
servidor/           PHP "T" para el hosting (guardarT, leerT, proxyT)
config.xml          permisos y datos de la app Tizen
index.html          carga los scripts (en orden; sin módulos ES: no funcionan bien desde file://)
css/azure.css       paleta azurita, 1920x1080
assets/             logo, fondo, portada por defecto
js/
  util.js registro.js almacen.js red.js          núcleo (toda la red pasa por red.js)
  teclas.js foco.js                              control remoto y navegación
  dialogo.js campo.js lista.js                   interfaz común (lista virtual)
  m3u.js xtream.js preferentes.js exportar.js    datos
  buddyhost.js seguridad.js                      Buddy Host y bloqueo
  subtitulos.js reproductor.js                   reproducción (AVPlay y HTML5); estilo de subtítulos en pantallas_sub.js
  pantallas*.js app.js                           pantallas y arranque
```

## Ver la interfaz en una PC (sin TV)
```
python3 -m http.server 8000
```
y abre `http://localhost:8000` en Chrome (tamaño 1920x1080). Flechas = D-pad, Enter = OK (mantener 0,7 s = opciones), Esc = Atrás, F3 = amarillo.
Sin AVPlay usa `<video>`. Desde `http://localhost` las peticiones a otros dominios sí chocan con CORS (como podría pasar en la TV).
