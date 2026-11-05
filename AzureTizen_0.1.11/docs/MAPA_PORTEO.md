# Mapa del porteo Azure (Android 0.1.14) a Tizen

Fuente de verdad si se pierde el chat. Resume lo leído del código de Azure Android y lo decidido.
Todo lo marcado "sin confirmar" no se ha podido comprobar en una TV.

## Decisiones tomadas con el usuario
- Buddy WiFi se descarta. Buddy Host se queda (el hosting y su web son del usuario; funciona en Azure móvil).
- Texto hacia la TV: lo manda la app Control (Samsung). Preferentes ya no viajan del móvil a la TV.
- Plan: juntar actualizaciones sin probar, instalar al final en la TV y recopilar errores (meta: 2 o 3 rondas).
- Tizen se instala con una laptop en la misma red que la TV (modo desarrollador + certificado de Samsung, vía documentada).
- Rentry DESCARTADO (el usuario, 2026-11-01): Buddy WiFi, Buddy Host y Rentry existían por lo molesto de teclear con el control; ahora la app Control envía textos.
- El Buddy Host (web propia, hecha con Claude, en un hosting gratuito) funciona con Azure móvil; combinación app+servidor a verificar desde Tizen.
- Contraseñas SIEMPRE con ojo (ver/ocultar), también la del bloqueo y las 3 de exportar.
- TV objetivo: Samsung UN75DU8000G (2024; debería ser Tizen 8.0, sin confirmar).

## Partes del proyecto Tizen (carpeta js/)
| Parte | Archivos | Origen Android |
|---|---|---|
| Núcleo | util.js, registro.js, almacen.js, red.js | utilidades, DiagnosticoSupport |
| Control remoto y foco | teclas.js, foco.js | dispatchKeyEvent, TvUtils |
| Interfaz común | dialogo.js, campo.js, lista.js | diálogos, CampoClaveSupport |
| Datos | m3u.js, xtream.js, preferentes.js, exportar.js | parseM3u, XtreamSupport, PreferentesSupport, EntradasSupport, ExportSupport |
| Buddy Host | buddyhost.js | BuddyHostSupport |
| Seguridad | seguridad.js | SeguridadSupport (solo modo contraseña de TV) |
| Reproductor | subtitulos.js, reproductor.js | SubtitleSupport, Media3 |
| Pantallas | pantallas.js (principal, preferentes, config, bloqueo, reproductor, prueba de red) | MainActivity |

No se portan: Buddy WiFi, FTP, explorador local, PiP, widget, Malaquita, azure://abrir, cursor libre, patrón de móvil, Rentry (por ahora).

## Buddy Host (BuddyHostSupport.kt)
- Host: se fuerza `https://` y barra final.
- Guardar: `POST {host}guardar.php`, `application/x-www-form-urlencoded; charset=UTF-8`, cuerpo `titulo=&clave=&texto=` (url-encode UTF-8). Respuesta de texto plano: `OK` si fue bien.
- Leer: `GET {host}leer.php?titulo=<urlencoded>`. Respuesta de texto: el contenido; si empieza por `ERROR` es un error.
- Sin cifrado en el cliente; `clave` viaja en claro.
- El hosting puede responder un desafío anti-bot (la respuesta contiene `aes.js`, `slowAES` o `document.cookie="__test`). En Android se resuelve con un WebView invisible que fija la cookie. En una web NO se puede fijar esa cookie a mano: la solución fiable es que el hosting no lo pida para guardar.php/leer.php y que envíe CORS (`Access-Control-Allow-Origin`). El PHP del servidor no está en el repo.
- El contenido guardado es el texto del cuadro "Pegar M3U/TXT".

## Xtream (XtreamSupport.kt)
- Host: si no trae `://` se antepone `http://`; se corta en `/player_api.php` o `/get.php`; sin barra final.
- `GET {host}/player_api.php?username=U&password=P[&action=A][&category_id=|series_id=]`.
- root (sin action): exige `user_info.auth` = "1" o true, si no "Usuario o contraseña incorrectos." Carpetas: En vivo, Películas, Series.
- Categorías: `get_live_categories`, `get_vod_categories`, `get_series_categories` (`category_id`, `category_name`).
- `get_live_streams&category_id=`: `stream_id`, `name`, `stream_icon` → `{host}/live/{u}/{p}/{stream_id}.m3u8`.
- `get_vod_streams&category_id=`: `stream_id`, `name`, `stream_icon`, `container_extension` (def. mp4) → `{host}/movie/{u}/{p}/{stream_id}.{ext}`.
- `get_series&category_id=`: `series_id`, `name`, `cover` (cada serie es carpeta).
- `get_series_info&series_id=`: `episodes` es objeto temporada→arreglo o arreglo; episodio: `id`, `season`, `episode_num`, `container_extension`, `title`, `info.movie_image`; título `T{s} · E{n} - {title}`; URL `{host}/series/{u}/{p}/{id}.{ext}`; orden por temporada y episodio.
- Cuentas guardadas (Android): archivo `XtreamList.txt`, una por línea `host|usuario|clave`.

## M3U (parseM3u)
- `#EXTINF`: título = lo que sigue a la primera coma (o "Video"); logo con `tvg-logo="..."`. No se lee group-title ni tvg-id.
- Otras líneas `#` se ignoran. Forma "Título | URL" (último `|`, si lo que sigue empieza por http(s)).
- Línea restante = URL; si no empieza por http(s) y hay base, se resuelve contra ella.
- Es carpeta (lista) si la ruta sin `?` termina en `.m3u` o `.txt` (no `.m3u8`).
- Índice HTML: enlaces `<a href>`, se ignoran `javascript:` y `mailto:`, distinct por URL; carpetas `.m3u`/`.txt`, el resto "candidato remoto".
- Clasificación remota: Direct (extensión de media conocida, manifiesto HLS `#EXT-X-TARGETDURATION|MEDIA-SEQUENCE|STREAM-INF`), HtmlIndex, Playlist (`#EXTM3U`/`#EXTINF` o líneas http), si no Direct. Se leen como máximo 2 MB.
- HLS por ruta: regex `(^|[/_.-])(hls\d*|m3u8|index-v\d+)($|[/_.-])`; `.m3u8`/`.m3u` → HLS; `.mpd` → DASH.

## Datos de Preferentes
- Listas: `{id,title,cover,url,locked,type("m3u"|"xtream"),user,pass}`. Si xtream, `url` es el host.
- Entradas: `{id,title,cover,locked,videos:[{title,url,cover,list?}],sublists:[{id,title,cover,locked,videos:[...]}]}` (una sola capa de sublistas). `list:true` = el link abre otra lista.
- Orden unificado de listas y entradas: arreglo de ids (`orden_preferentes`); lo nuevo o importado va al final. Dentro de una entrada: sublistas primero, luego videos.
- No se repiten URLs al agregar videos. El candado solo oculta editar.
- Archivo `.azure`: `{"azure":1,"listas":[{title,cover,url,type,user,pass}],"entradas":[{title,cover,videos,sublists}]}` (sin id ni locked; límite de lectura 20 MB; lista sin title/url se descarta). Al importar se crean ids nuevos y sin candado; títulos iguales se duplican.
- Exportar/Importar/Cambiar contraseñas piden las 3 contraseñas cada vez (hash sha256(sal \0 p1 \0 p2 \0 p3)). No cifran el archivo.
- `.txt` legible: listas (título, imagen, link) y entradas completas ([ENTRADA], [SUBLISTA]).

## Reproductor (Media3 → AVPlay)
Funciones: lista de reproducción, repetir (0 off, 1 uno, 2 continuo), aleatorio, redimensionar (Ajustar/Estirar/Recortar), 4:3, bloquear, recarga automática (0 off, 1 mismo video, 2 siguiente en continuo/aleatorio, con tope = largo de la lista), pistas de audio, subtítulos externos SRT/VTT/ASS/SSA con ajuste ±1 s / ±0,1 s y posición (0 abajo, 1 arriba, 2 pegado abajo, 4 pegado arriba).
En Android se inyectan Referer y cookies al reproducir (hosts como vidhide/streamwish lo exigen). En AVPlay: `setStreamingProperty("USER_AGENT"|"COOKIE")` según documentación de Samsung, sin confirmar; Referer sin confirmar.

## Configuración (comparada en 0.1.2)
Android: reloj, Nombre de usuario (Buddy), Posición de subtítulos (4 opciones), Seguridad, Diagnóstico (último error, copiar/borrar), Malaquita, versión. Subtítulos con el estilo del sistema (Ajustes > Accesibilidad). En Tizen el estilo se configura dentro de la app (`pantallas_sub.js`). Bloqueo: Android lo repite tras 1 minuto en segundo plano; Tizen solo al abrir la app (decisión del usuario).

## Configuración y claves (Android)
`last_url`, `last_list_name`, `buddy_host_url`, `pasted_text` (tope 20 000 caracteres visibles; por encima solo vista previa), `resize_mode`, `force_43`, `sub_position`, `auto_error_mode`, `repeat_mode`, `shuffle_enabled`. Seguridad: sal + hash SHA-256 de `sal:contenido`; se vuelve a pedir tras más de 60 s en segundo plano y al reiniciar.

## Paleta azurita
Azul #226490, AzulOscuro #174A6B, AzulActivo #2F82B8, AzulClaro #5BB5F0, Hielo #7CC8FF, Malaquita #4FC3A8, Texto #E3F1FB, FondoOscuro #06121C, Superficie #0B1F2E, SuperficieVariante #163247. Foco: fondo blanco 22 %, aro blanco 3 px, zoom 1,06. Filas 84 px (Preferentes 96), esquinas 22, portada 64 (Preferentes 72), fondo `fondo_azur.jpg` con velo negro 72 %.

## Riesgos para Tizen (sin confirmar)
1. CORS en consultas (Xtream, M3U, Buddy Host). Mitigación documentada: `<access origin="*" subdomains="true"/>` en config.xml; el Buddy Host lo arregla el usuario en su PHP. Todo pasa por `js/red.js` para corregir en un solo sitio.
2. HTTP en claro desde app empaquetada: probable que funcione, confirmar.
3. Cabeceras al reproducir (Referer/UA/cookies).
4. Formatos: HLS ok; DASH/MKV/AVI/TS dependen del modelo.
5. Listas grandes: lista virtualizada (solo filas visibles); Android ya tuvo cierre con ~800 títulos.
6. Almacenamiento: localStorage es pequeño; listas grandes en IndexedDB (pendiente) y no se guarda el texto pegado grande.
7. Exportar/importar sin Descargas: se muestra/pega el texto o se usa Buddy Host.
8. Contraseñas: `crypto.subtle` puede no estar en `file://`; hay SHA-256 en JS puro como respaldo.

## Lo que se vio en los servidores del usuario (2026-11-01)
**Buddy Host (carpeta Buddy: guardar.php, leer.php, estado.php, config.php, funciones.php)**
- Coincide con lo que asume `js/buddyhost.js`: `guardar.php` (POST titulo, clave, texto → "OK" o "ERROR: ..."), `leer.php` (GET titulo → texto o "ERROR: ...").
- Título: letras, números, guion y guion bajo (máx. 40). Contraseña: 4 a 40, guardada con password_hash; el primer guardado la registra; leer no pide contraseña. Contenido máx. 200 000 bytes (config.php).
- NO envía cabeceras CORS. Arreglo: `header('Access-Control-Allow-Origin: *');` al inicio de guardar.php y leer.php (y responder OPTIONS). El POST de la app es "simple" (form-urlencoded), no necesita preflight.
- El README recomienda probar `http://` en algunos hostings gratuitos; la app Android fuerza `https://` (por redirecciones que convierten POST en GET). Elegir según lo que funcione en la TV.
- `listas/` no tiene `.htaccess`: `listas/t.clave` se puede abrir por URL (comprobado por el usuario). DECISIÓN (2026-11-02): aceptado, cada quien monta su propio servidor; no se arregla.
- El desafío anti-bot lo pone el hosting ANTES del PHP: no se arregla desde el PHP.

**Azure web (DeepSeek: Azure.html, explorar.php, guardar.php, leer.php, config.php)**
- `explorar.php` es un proxy en PHP (curl) que descarga listas M3U/HTML y reescribe las sublistas para que vuelvan a pasar por él, con CORS `*`. Así la web vieja evitaba CORS. Es abierto (cualquiera puede usarlo) y con verificación SSL desactivada.
- Los videos se reproducen directo (sin proxy): ni `<video>` ni AVPlay necesitan CORS para el medio. Solo las consultas de datos (listas, Xtream JSON, subtítulos) lo necesitan.
- Usa solo `<video>` (HLS solo si el navegador lo soporta). No se usa como referencia de diseño.
- Aprobado y hecho en 0.1.1 (`servidor/proxyT.php`, ver PROGRESO): respaldo de proxy propio en el hosting del usuario, con clave y bloqueo de IP privadas, que `js/red.js` use solo si la petición directa falla por CORS.
