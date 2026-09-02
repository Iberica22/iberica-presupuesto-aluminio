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

4. **Publicación** (`vnnox-client.js`): un único endpoint (`POST /v2/player/program/normal`)
   crea el programa Y lo publica a los reproductores a la vez. No hace falta "subir" las
   imágenes a VNNOX antes: cada tarjeta se referencia por su URL pública
   (`/signage-preview/<categoría>.png`, servida por este mismo servidor), y `run.js` calcula
   su tamaño y MD5 — VNNOX descarga la imagen él solo con esos datos. Requiere que
   `SIGNAGE_SITE_URL` (o `RAILWAY_PUBLIC_DOMAIN` en Railway) apunte a una URL alcanzable
   desde fuera.

5. **Automatización**: `scheduler.js` lo ejecuta cada lunes 07:00 (hora de España) dentro del
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
VNNOX_API_HOST=https://open-au.vnnox.com   # host confirmado en la cuenta real (por defecto)
VNNOX_SLIDE_DURATION_MS=10000              # segundos que se muestra cada tarjeta (por defecto 10s)
```

### Cómo conseguir las claves de VNNOX

1. Entra en `developer-en.vnnox.com` con la misma cuenta de `eu.vnnox.com` y ve a la pestaña
   **"Authentication"**.
2. Ahí aparecen automáticamente el **AppKey**, **AppSecret** y el **"Interface Access Domain
   Name"** de vuestra cuenta (guardadlo tal cual — VNNOX asigna el nodo de API por cuenta, no
   necesariamente coincide con la región del panel web: la nuestra usa `open-au.vnnox.com`
   aunque el panel es `eu.vnnox.com`). Según la documentación, esto ya funciona con permisos
   básicos antes de completar la verificación de empresa — la verificación solo amplía el
   alcance de permisos.
3. Los IDs de los reproductores/pantallas se obtienen con `GET /v2/player/list` (endpoint
   `/api/signage/players` de este servidor) o en la sección "Player" del panel.

### Confirmado en la documentación real de la cuenta

Rutas y payload verificados directamente contra `developer-en.vnnox.com` (no una estimación):
listado de reproductores en `GET /v2/player/list`, y publicación en un único endpoint
`POST /v2/player/program/normal` que recibe `{playerIds, pages}` — cada `page` lleva un
`widget` tipo `PICTURE` con `url` (pública), `size` y `md5` del archivo; sin `schedule`, VNNOX
reproduce en bucle 24h, que es el comportamiento que queremos. Ver `run.js` (`buildPage`).

Aun así, ejecuta siempre primero en modo prueba antes de una publicación real:

```bash
npm run signage:dry-run   # genera las imágenes en signage/output/ sin publicar nada
```

Revisa las PNG generadas y, cuando estén verificadas las rutas, prueba una publicación real:

```bash
npm run signage:run
```

## Fotos de fondo

Coloca una imagen en `signage/assets/photos/<key>.jpg` para que se use como fondo de esa
categoría en vez del degradado de color liso: `oferta`, `caso_exito`, `marca`, y para
"servicio destacado" una por cada servicio (`catalogo_cerrajeria`, `catalogo_alarmas`,
`catalogo_puertas`, `catalogo_domotica` — una sola foto no vale para las 4, porque cada
rotación de 21 días muestra un servicio distinto). El texto se compone siempre por código
encima (nunca lo genera la IA de imagen — no puede renderizar texto legible de forma fiable,
ni un QR real y escaneable), con una banda casi opaca detrás que garantiza contraste sea cual
sea la foto.

## Reiniciar el set de textos de una categoría

Si en algún momento queréis forzar contenido nuevo antes de que caduque el set (180 días por
defecto), borrad la entrada correspondiente de `signage/state.json` (o el archivo entero) y la
siguiente ejecución generará un set nuevo para esa categoría.
