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

### Cómo generarlas (para que no se note que son IA)

Generadas con Higgsfield (modelo `nano_banana_pro`, `aspect_ratio: "21:9"`). Dos reglas dan
más problemas que el resto, con casos reales de por qué:

- **Nunca pidas texto, logos ni marcas dentro de la imagen.** El modelo intentó una vez
  "poner el nombre de la empresa" en una camiseta y escribió un teléfono inventado; otra vez
  grabó sin que se pidiera el texto **"SECURITAS"** (una empresa de seguridad competidora
  real) en una cerradura. El texto/logo/QR se compone siempre después, por código
  (`svg-template.js`) — la foto tiene que salir completamente limpia.
- **Exige explícitamente "horizontal landscape orientation, not portrait".** Sin esa
  instrucción el modelo a veces devuelve formato vertical, que en una pantalla 432×216 (2:1
  apaisada) obliga a recortar la mayor parte de la composición.

Para que el resultado no tenga "aire publicitario de IA", evita adjetivos tipo *premium*,
*sleek*, *stunning* (empujan hacia el look de anuncio genérico) y en su lugar pide:
cámara/óptica concreta (ej. "shot on a 35mm lens like a Fujifilm X100V", no "professional
camera"), imperfección real (textura de piel con poros, metal con arañazos de uso, sombras
irregulares de luz natural, encuadre ligeramente descentrado como si fuera reportaje), y
lenguaje documental/fotoperiodístico en vez de publicitario.

Los 7 prompts finales usados (`nano_banana_pro`, `21:9`), por si hay que regenerar alguno:

| Archivo | Prompt |
|---|---|
| `oferta.jpg` | Documentary-style photo of a reinforced entry door on a white Mediterranean house facade, manual multi-point locking mechanism visible and clearly non-motorized, shot on a 35mm lens like a Fujifilm X100V, natural early-evening sunlight raking across the door from the right with slightly uneven shadows, visible texture and minor wear on the metal hardware (not pristine), subtle green accent reflection, slightly off-center composition, horizontal landscape orientation only — not portrait, absolutely no text, no logos, no engravings, no brand names anywhere in the image |
| `catalogo_cerrajeria.jpg` | Photojournalistic close-up of a locksmith's gloved hands installing a new cylindrical door lock on a light wood door during daytime, small worn toolbox visible nearby, natural window light from the left with soft realistic shadows, visible texture on skin and fabric, shot handheld on a 50mm lens, slightly imperfect framing as if caught mid-action, plain metal lock surface with absolutely no text, no engravings, no logos, no brand names, horizontal landscape orientation only — not portrait |
| `catalogo_alarmas.jpg` | Documentary photo of an Andalusian-style house exterior at dusk, a discreet security camera mounted under the roof eave, a small alarm keypad panel beside the front door with a single green LED lit, natural ambient dusk light (not studio-perfect), visible weathering on the stucco wall, shot on a wide-angle lens, horizontal landscape orientation only — not portrait, absolutely no text, no logos, no brand names anywhere |
| `catalogo_puertas.jpg` | Extreme close-up macro photo of a heavy-duty armored door's multi-point locking bolts and reinforced hinges, brushed steel with authentic scratches and use marks (not pristine), dark wood grain texture, natural side lighting with real shadow falloff, manual lock mechanism only with no motor and no automation, horizontal landscape orientation only — not portrait, absolutely no text, no engravings, no logos, no brand names |
| `catalogo_domotica.jpg` | Photo of a modern wall-mounted security control panel showing an armed/disarmed status indicator with a green light, minimalist design, mounted in the entryway of a lived-in modest Mediterranean home with visible everyday details (not a staged luxury interior), natural daylight with slightly uneven exposure, shot on a 35mm lens, horizontal landscape orientation only — not portrait, no smart-home lifestyle elements like thermostats or mood lighting, absolutely no text, no logos, no brand names |
| `caso_exito.jpg` | Candid documentary-style environmental portrait of a single security technician in plain dark green-gray workwear with no visible text or logos on the fabric, standing in a doorway he has just finished securing, natural unposed expression looking toward camera, real skin texture and imperfections, natural daylight from a window with soft realistic falloff, shot on a 50mm lens like a photojournalist would, background softly out of focus showing a lived-in modest home interior, horizontal landscape orientation only — not portrait |
| `marca.jpg` | Wide documentary-style shot of a lived-in white Mediterranean house facade in Almería at golden hour, natural raking sunlight with authentic uneven shadows, a single reinforced entry door as the dominant element with a subtle green accent light near the doorframe, visible everyday wear on the walls (not a staged real-estate photo), shot on a wide-angle lens, horizontal landscape orientation only — not portrait, no additional devices or clutter, absolutely no text, no logos, no brand names |

**Limitación conocida de Claude Code en este entorno**: no puede descargar las imágenes
generadas (la CDN de Higgsfield está bloqueada por la política de red del sandbox), así que
necesita que un humano las descargue de las URLs que da Higgsfield y se las reenvíe como
archivo adjunto para poder colocarlas en `signage/assets/photos/`.

## Reiniciar el set de textos de una categoría

Si en algún momento queréis forzar contenido nuevo antes de que caduque el set (180 días por
defecto), borrad la entrada correspondiente de `signage/state.json` (o el archivo entero) y la
siguiente ejecución generará un set nuevo para esa categoría.
