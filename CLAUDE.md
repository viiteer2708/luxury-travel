# CLAUDE.md - Horizonte Exclusivo
Página web estática especializada en viajes de lujo personalizados.

## Stack
- HTML estático
- CSS embebido (variables CSS, sin frameworks)
- JavaScript vanilla (sin dependencias)
- Fuentes: Google Fonts (Playfair Display + Inter)
- Make (webhooks para automatización de formularios)

## Estructura de Archivos
```
pages/              — Todas las páginas HTML
  index.html        — Página principal (hero, destinos, quiénes somos, contacto)
  europa.html       — Página de región Europa
  asia.html         — Página de región Asia
  africa.html       — Página de región África
  america.html      — Página de región América
  caribe.html       — Página de región Caribe
  paraisos.html     — Página de región Paraísos sobre el agua
  escocia.html      — Destino: Escocia (REFERENCIA CANÓNICA)
  italia.html       — Destino: Italia
  tailandia.html    — Destino: Tailandia
  ...               — (y demás destinos)
images/             — Todas las imágenes locales
  logo-trimmed.png  — Logo del sitio
  *.jpeg / *.jpg    — Imágenes locales del repositorio
```

### Rutas relativas
- Desde `pages/`: las imágenes se referencian como `../images/nombre.ext`
- Entre páginas: se referencian directamente (ej: `europa.html`, `escocia.html`)

## Reglas de Ejecución

**PERMITIDO sin preguntar:**
- Leer y escribir archivos de código
- Ejecutar builds y type checks
- git add y git commit
- git push

**PROHIBIDO SIEMPRE:**
- No mostrar precios en NINGUNA parte de la web (ni en HTML, ni en CSS, ni en comentarios). Sin excepciones.

**Idioma:** Español de España en UI, comentarios y commits.

---

## Plantilla de páginas

### Arquitectura de navegación
- Cada región del dropdown (Europa, Asia, Africa, etc.) tiene su página `[region].html` con título "Top Destinos [Región]"
- Cada destino individual tiene su página `[destino].html` (ej: `escocia.html`)
- Las páginas de región muestran tarjetas que enlazan a los destinos individuales
- El CTA de cada destino enlaza a `index.html?destino=[Nombre]#contacto` (auto-fill JS)

### Navbar (IDÉNTICA en TODAS las páginas)
```html
<li><a href="index.html">Nuevos horizontes</a></li>
<li>
    <a href="index.html#destinos">Destinos</a>
    <div class="dropdown">
        <a href="#">Africa</a>
        <a href="#">América</a>
        <a href="asia.html">Asia</a>
        <a href="#">Caribe</a>
        <a href="europa.html">Europa</a>
        <a href="#">Paraísos sobre el agua</a>
    </div>
</li>
<li><a href="index.html#testimonios">¿Quién hay detrás?</a></li>
<li><a href="index.html#contacto">Contacto</a></li>
<li><a href="#">Pro Tips</a></li>
```
- En `index.html` los enlaces usan `#seccion` (sin `index.html`)
- Logo usa `../images/logo-trimmed.png`
- Mobile (≤768px): `.navbar .container { max-width: 100%; padding: 0 16px; }`

---

## Checklist para crear un nuevo DESTINO (en cadena)

> Usar `escocia.html` como referencia CANÓNICA. Copiar estructura completa.

### 1. Crear `[destino].html`
- Copiar estructura exacta de `escocia.html`
- Cambiar: título, meta description, hero (imagen + label región + h1 + subtítulo + duración)
- Cambiar: texto intro
- Cambiar: bloques de itinerario (contenido + imágenes en carruseles)
- Cambiar: tarjetas "Qué incluye" (adaptar textos al destino)
- Cambiar: CTA → `Diseñemos tu [Destino]`, enlace a `index.html?destino=[Destino]#contacto`
- Cambiar: footer → añadir enlace al destino en la lista de destinos
- Verificar: navbar idéntica (ver sección Navbar arriba)

### 2. Añadir tarjeta en la página de región (`[region].html`)
```html
<div class="destination-card reveal">
    <a href="[destino].html">
        <div class="card-image">
            <img src="[imagen]?w=600&q=80" alt="[Destino]">
            <span class="card-badge">Nuevo</span>
        </div>
        <div class="card-body">
            <span class="card-location">[País/Región]</span>
            <h3>[Título corto]</h3>
            <p>[Descripción breve]</p>
            <div class="card-features">
                <span>[Duración]</span>
                <span>Guía privado</span>
                <span>[Tipo alojamiento]</span>
            </div>
            <span class="card-link">Ver itinerario &#10230;</span>
        </div>
    </a>
</div>
```

### 3. Añadir imágenes locales al repositorio
- Guardar imágenes en `images/` y referenciarlas como `../images/[imagen].jpeg`
- `git add images/[imagen].jpeg` para cada imagen local
- Las imágenes que NO son de Unsplash SIEMPRE deben estar en el repositorio

### 4. No olvidar
- Alternancia de bloques: normal → reverse → normal → reverse
- Un dot por cada slide en el carrusel
- Footer: añadir enlace al destino en la columna "Destinos"

---

## Checklist para crear una nueva REGIÓN

> Usar `asia.html` como referencia. Copiar estructura completa.

### 1. Crear `[region].html`
- Copiar estructura exacta de `asia.html`
- Cambiar: título, meta description, hero (imagen + h1 + subtítulo)
- Grid de destinos vacía (se irán añadiendo tarjetas)
- Verificar: navbar idéntica

### 2. Actualizar dropdown en TODAS las páginas
- Reemplazar `<a href="#">[Región]</a>` por `<a href="[region].html">[Región]</a>`
- En: index.html, europa.html, asia.html, escocia.html, italia.html, tailandia.html, y cualquier otra página existente

---

## Estructura de página de región

1. **Hero** — `.region-hero`, `min-height: calc(70vh - 110px)`, `padding-top: 100px`, `padding-bottom: 20px`, parallax, `background-position` ajustar por imagen
2. **Grid de destinos** — `padding-top: 30px`, section-header con `margin-bottom: 40px`
3. **Footer**

## Estructura de página de destino (`escocia.html` CANÓNICA)

1. **Hero** — `.dest-hero`, `min-height: calc(70vh - 110px)`, `padding-top: 100px`, `padding-bottom: 20px`, parallax (`background-attachment: fixed`), `background-position` ajustar por imagen
2. **Intro** — `padding-top: 30px`, `padding-bottom: 10px` — texto descriptivo centrado (`dest-intro-text`, max-width 780px)
3. **Itinerario** — `padding-top: 10px` — bloques alternados (`.itinerary-block` / `.itinerary-block.reverse`), gap 48px, margin-bottom 80px entre bloques
4. **Qué incluye** — `padding-top: 30px`, grid 4 columnas (`.includes-grid` / `.include-card`), fondo `var(--dark-soft)`
5. **CTA** — `.dest-cta`, `padding-top: 30px`, centrado, enlaza a `index.html?destino=[Nombre]#contacto`
6. **Footer** — idéntico con enlace al destino en la lista

---

## Sistema de carrusel en itinerario (OBLIGATORIO)

> Cada bloque del itinerario usa `.itinerary-carousel`. Copiar sistema exacto de `escocia.html`.

```html
<div class="itinerary-carousel">
    <div class="carousel-slide active"><img src="..." alt="..."></div>
    <div class="carousel-slide"><img src="..." alt="..."></div>
    <div class="carousel-controls">
        <button class="carousel-btn carousel-prev">&#8249;</button>
        <div class="carousel-dots">
            <button class="carousel-dot active"></button>
            <button class="carousel-dot"></button>
        </div>
        <button class="carousel-btn carousel-next">&#8250;</button>
    </div>
</div>
```
- **Transición:** fade (opacity 0.6s)
- **Controles:** flechas prev/next + dots (dot activo en `var(--gold)`)
- **Swipe táctil** en móvil (umbral 50px)
- **Altura:** 400px desktop / 280px móvil
- **JS:** se inicializa automáticamente para todos los `.itinerary-carousel`

## Línea temporal del itinerario (OBLIGATORIA)
- **SVG generado por JS** (`drawRoute()`): línea recta vertical por el centro
- **Estilo:** punteada (`stroke-dasharray: 6 4`), blanca 10% opacidad, 1.5px
- **Waypoints:** círculos SVG en el centro de cada bloque (r=5, borde gold 40%, fondo oscuro)
- **Responsive:** oculta en móvil (≤ 768px)
- **Se recalcula** en resize
- Usa `offsetTop` (no `getBoundingClientRect`) para evitar interferencia con animaciones reveal

## Alternancia de bloques (OBLIGATORIA)
- Bloque 1: `itinerary-block` → FOTO izquierda + TEXTO derecha
- Bloque 2: `itinerary-block reverse` → TEXTO izquierda + FOTO derecha
- Alternando sucesivamente
- En móvil (≤ 768px): 1 columna, `order: unset`

---

## Márgenes y espaciados — OBLIGATORIOS (NO cambiar)

| Sección | Propiedad | Valor |
|---------|-----------|-------|
| Hero (regiones Y destinos) | `min-height` | `calc(70vh - 110px)` |
| Hero | `padding-top` | `100px` |
| Hero | `padding-bottom` | `20px` |
| Hero content | `max-width` | `800px` |
| Hero content | `padding` | `0 24px` |
| Hero h1 | `margin-bottom` | `20px` |
| Hero label | `margin-bottom` | `20px` |
| Hero p | `margin-bottom` | `8px` |
| Intro | `padding-top` | `30px` |
| Intro | `padding-bottom` | `10px` |
| Intro text | `max-width` | `780px` |
| Itinerario | `padding-top` | `10px` |
| Itinerario grid | `gap` | `48px` |
| Itinerario bloques | `margin-bottom` | `80px` |
| Itinerario último bloque | `margin-bottom` | `0` |
| Section-header → contenido | `margin-bottom` | `64px` (destino) / `40px` (región) |
| Qué incluye | `padding-top` | `30px` |
| CTA (`.dest-cta`) | `padding-top` | `30px` |

## Imágenes
- Hero: Unsplash `?w=1920&q=80`
- Itinerario: Unsplash `?w=800&q=80`
- Tarjetas región: Unsplash `?w=600&q=80`
- **Las imágenes locales (no Unsplash) SIEMPRE van en `images/`** — referenciar como `../images/nombre.ext` desde `pages/`, hacer `git add` antes de commit
