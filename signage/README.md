# Señalización LED del escaparate

Pipeline autónomo que cada semana decide qué contenido mostrar en las pantallas LED de la
tienda, lo genera y lo publica en VNNOX.

## Filosofía: recuerdo de marca, no conversión inmediata

La pantalla la ve sobre todo gente pasando por la calle (2-4 segundos, sin necesidad activa de
seguridad en ese momento). Por eso el objetivo principal de 4 de las 5 piezas de contenido es
**quedarse en la memoria** (recuerdo de marca / top-of-mind), no arrancar una conversión — eso
se reserva para quien se para o entra a la tienda, vía el QR/teléfono fijos (ver más abajo).

El recuerdo de marca se construye con **repetición**, no con contenido nuevo constante — por
eso el sistema usa **sets cerrados de mensajes en bucle** en vez de generar texto infinito.

## Cómo funciona

1. **Estrategia** (`strategy.js` + `categories.js`): en vez de pedir texto nuevo a OpenAI cada
   vez que toca rotar, se genera **una sola vez** (o cuando el set envejece mucho, por defecto
   180 días) un **set cerrado** de `poolSize` variantes de headline+subheadline por categoría.
   En cada rotación normal, el sistema simplemente avanza al siguiente mensaje del set (sin
   llamar a la IA) y vuelve a empezar al llegar al final:

   | Categoría               | Rotación   | Set cerrado |
   |-------------------------|------------|-------------|
   | Oferta de la semana     | 7 días     | 6 variantes, siempre en formato "¿Y si...?" |
   | Servicio destacado      | 21 días    | 1 mensaje por cada uno de los 4 servicios, en orden fijo |
   | Confianza / resultados  | 30 días    | 4 variantes |
   | Marca                   | 90 días    | 3 variantes (casi fija) |

   Servicios activos: cerrajería, alarmas y videovigilancia (CCTV), puertas acorazadas, domótica.
   Automatismos (motorización) NO está activo, el prompt tiene instrucción explícita de no
   mencionarlo. Editable en `categories.js`.

   El **icono nunca lo elige la IA**: es fijo por servicio/categoría (mismo icono = mismo
   servicio siempre, para reconocimiento visual en 2-4 segundos), definido en `categories.js`.

2. **Elementos fijos de marca** (fuera de lo que genera la IA, en `svg-template.js`): cabecera
   con nombre + Almería + **teléfono** (`SIGNAGE_PHONE`), y un **QR a WhatsApp**
   (`wa.me/<SIGNAGE_WHATSAPP_NUMBER>`, conectado al bot) presente en las 4 categorías — ya no
   existe una categoría "CTA" propia que le robe turno de rotación a las demás.

3. **Render** (`render.js` + `svg-template.js`): cada slide se dibuja como SVG con la paleta de
   marca y se convierte a PNG a la resolución real de la pantalla (432×216 por defecto,
   confirmada vía la API de VNNOX). Si existe `signage/assets/photos/<categoría>.jpg`, se usa
   como fondo; si no, un degradado de color liso. Con foto de fondo, una banda casi opaca
   (no un degradado sutil) protege el titular/subtítulo — verificado con fondos claros,
   oscuros y de alto contraste, ver commits de "legibilidad" en el historial.

4. **Publicación** (`vnnox-client.js`): sube las imágenes y actualiza el programa/playlist en
   VNNOX, y lo publica en las pantallas configuradas.

4. **Automatización**: `scheduler.js` lo ejecuta cada lunes 07:00 (hora de España) dentro del
   propio servidor de Railway (siempre corriendo). También hay un endpoint manual para
   probarlo cuando quieras: `POST /api/signage/run-now` con cabecera `x-admin-token`.

## Configuración necesaria (variables de entorno)

```
OPENAI_API_KEY=...                # ya la tenéis para el chatbot

SIGNAGE_ADMIN_TOKEN=un-token-cualquiera    # para poder llamar a /api/signage/run-now y /players

SIGNAGE_PHONE=950 08 80 86                 # teléfono fijo mostrado en la cabecera (por defecto)
SIGNAGE_WHATSAPP_NUMBER=34661665929        # número de WhatsApp del bot, para el QR (por defecto)
SIGNAGE_WHATSAPP_MESSAGE=Hola, quiero información   # mensaje predefinido del QR (por defecto)

VNNOX_APP_KEY=...
VNNOX_APP_SECRET=...
VNNOX_TERMINAL_IDS=id1,id2                 # IDs de los reproductores/pantallas en VNNOX
VNNOX_API_HOST=https://open-eu.vnnox.com   # host de la región EU (por defecto)
```

### Cómo conseguir las claves de VNNOX

1. Entra en `developer-en.vnnox.com` con la misma cuenta de `eu.vnnox.com`.
2. Genera tu AppKey (AK) y AppSecret (AS) — son automáticos al entrar la primera vez.
3. Busca los IDs de tus pantallas/reproductores (sección "Player"/"Terminal").

### ⚠️ Importante: verificar las rutas del API antes del primer uso real

No pude acceder a la documentación completa de VNNOX de forma automatizada (su web bloquea
tráfico de bots), así que **solo la autenticación está confirmada al 100%** (cabeceras
`AppKey/Nonce/CurTime/CheckSum`, ver `vnnox-client.js`). Las rutas de subida de media y de
gestión de programa (`vnnox.paths.uploadMedia`, `upsertProgram`, `publishProgram` en
`config.js`) son mi mejor estimación siguiendo el patrón `/v2/...` que sí verifiqué (el
listado de reproductores, `/v2/player/list`, está confirmado).

Antes de dar por bueno el primer envío real:

1. Entra en el "API Explorer" interactivo de `developer-en.vnnox.com` con vuestra cuenta.
2. Busca las llamadas de subida de media y de creación/publicación de programa, y compara
   la ruta exacta con la de `config.js`.
3. Si difiere, ajústala con las variables de entorno `VNNOX_PATH_UPLOAD_MEDIA`,
   `VNNOX_PATH_UPSERT_PROGRAM`, `VNNOX_PATH_PUBLISH_PROGRAM` (no hace falta tocar código).

Hasta que esto esté verificado, ejecuta siempre primero en modo prueba:

```bash
npm run signage:dry-run   # genera las imágenes en signage/output/ sin publicar nada
```

Revisa las PNG generadas y, cuando estén verificadas las rutas, prueba una publicación real:

```bash
npm run signage:run
```

## Fotos de fondo

Coloca una imagen en `signage/assets/photos/<key>.jpg` (`oferta`, `catalogo`, `caso_exito` o
`marca`) para que se use como fondo de esa categoría en vez del degradado de color liso. El
texto se compone siempre por código encima (nunca lo genera la IA de imagen — no puede
renderizar texto legible de forma fiable), con una banda casi opaca detrás que garantiza
contraste sea cual sea la foto.

## Reiniciar el set de textos de una categoría

Si en algún momento queréis forzar contenido nuevo antes de que caduque el set (180 días por
defecto), borrad la entrada correspondiente de `signage/state.json` (o el archivo entero) y la
siguiente ejecución generará un set nuevo para esa categoría.
