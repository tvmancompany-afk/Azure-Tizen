# Instalar Azure Tizen en la TV (vía documentada por Samsung)

NO probado por mí: son los pasos generales de Samsung para apps web de TV y pueden variar según el modelo y la versión de Tizen Studio.
Si algo no coincide, anota el mensaje exacto y se ajusta.

## Antes de empezar
- Una laptop y la TV en la MISMA red. Conviene que la TV tenga IP fija (la tuya ya la tiene).
- Una cuenta de Samsung (gratis) para crear el certificado.

## En la TV (modo desarrollador)
1. Abre Apps. Con el control pulsa 1 2 3 4 5 (en algunos modelos aparece una ventana "Developer mode").
2. Activa "Developer mode" y escribe la IP de la laptop. Reinicia la TV (apágala del todo con el botón de encendido).

## En la laptop
1. Instala Tizen Studio (con las "TV Extensions" en el Package Manager).
2. Abre Certificate Manager y crea un certificado Samsung (autor y distribuidor). Para el distribuidor pide el DUID de la TV: el Device Manager lo muestra al conectar la TV.
3. Device Manager > Remote Device Manager > agrega la TV con su IP (el modo desarrollador debe estar activo) y conéctala.
4. File > Import > Tizen > Tizen Project: elige la carpeta de este proyecto (donde está `config.xml`).
5. Clic derecho en el proyecto > Run As > Tizen Web Application. Elige la TV.

## Con línea de comandos (alternativa, sin IDE)
```
sdb connect IP_DE_LA_TV
tizen package -t wgt -s NOMBRE_DEL_PERFIL_DE_CERTIFICADO -- .
tizen install -n AzureTizen.wgt -t MODELO_DE_LA_TV
tizen run -p AzureTzn01.Azure -t MODELO_DE_LA_TV
```
(`sdb devices` muestra el nombre del destino.)

## Antes de abrir la app: servidor
Sube los archivos de `servidor/` a tu hosting (ver `servidor/LEEME.txt`) y pon tu clave en `proxyT.php`.
En la TV: Configuración > Red (dirección de proxyT.php y clave) y Configuración > Buddy Host (tu host).

## Qué hacer al abrir la app por primera vez
1. Configuración > Diagnóstico > "PRUEBA DE RED Y REPRODUCCIÓN". Arriba muestra si hay AVPlay, el modelo y la versión de Tizen.
2. Pruébalo en este orden y copia el resultado: PROBAR M3U (dice si llegó directo o por proxy), PROBAR ESE LINK POR EL PROXY, PROBAR XTREAM, PROBAR BUDDY HOST y PROBAR REPRODUCCIÓN.
3. Si algo falla: Configuración > Diagnóstico > VER REGISTRO (se puede enviar por Buddy Host) y mándaselo a Claude.

## Si algo no abre
- "Application is not installed / signature": el certificado del distribuidor debe incluir el DUID de esa TV.
- La TV no aparece: revisa que el modo desarrollador tenga la IP de la laptop y que ambas estén en la misma red.
- Pantalla negra al reproducir: puede ser un fondo no transparente (AVPlay dibuja detrás de la página) o un formato que la TV no soporta.
