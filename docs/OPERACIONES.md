# Operaciones — Horizonte Exclusivo

Checklists obligatorias, snippets HTML y especificaciones técnicas para crear y modificar páginas.

---

## Navbar — COMPONENTE FIJO E INMUTABLE EN TODAS LAS PÁGINAS

> **REGLA ABSOLUTA:** El navbar (HTML + CSS + JS) es IDÉNTICO en las 79 páginas de la web. Al crear cualquier página nueva, copiar el navbar COMPLETO (HTML, CSS y JS) de `index.html` (home). NUNCA modificar, simplificar ni minificar el navbar. Si se cambia el navbar, se cambia en TODAS las páginas a la vez.

### HTML del navbar (copiar exacto)
```html
<nav class="navbar" id="navbar">
    <div class="container">
        <a href="/" class="logo"><img src="/images/logo-trimmed.png" alt="Horizonte Exclusivo"></a>
        <ul class="nav-links" id="navLinks">
            <li>
                <a href="/destinos/">Destinos</a>
                <div class="dropdown">
                    <a href="/africa/">Africa</a>
                    <a href="/america/">América</a>
                    <a href="/asia/">Asia</a>
                    <a href="/europa/">Europa</a>
                    <a href="/paraisos/">Paraísos sobre el agua</a>
                </div>
            </li>
            <li><a href="/quien-hay-detras/">¿Quién hay detrás?</a></li>
            <li><a href="/contacto/">Contacto</a></li>
            <li><a href="/pro-tips/">Travel Hacks</a></li>
            <li><a href="/blog/">Blog</a></li>
        </ul>
        <button class="hamburger" id="hamburger" aria-label="Abrir menú">
            <span></span><span></span><span></span>
        </button>
    </div>
</nav>
```

### CSS del navbar — TODAS estas reglas son OBLIGATORIAS
```css
/* ===== NAVBAR ===== */
.navbar { position: fixed; top: 0; left: 0; width: 100%; z-index: 1000; padding: 10px 0; background: var(--dark); border-bottom: 1px solid rgba(201,169,110,0.15); transition: var(--transition); }
.navbar.scrolled { background: var(--dark); backdrop-filter: blur(20px); box-shadow: 0 2px 40px rgba(0,0,0,0.5); }
.navbar .container { display: flex; justify-content: space-between; align-items: center; flex-wrap: nowrap; max-width: 80%; padding: 0 24px; }
.logo { display: inline-block; transition: var(--transition); }
.logo img { height: 80px; width: auto; transition: var(--transition); }
.nav-links { display: flex; gap: 36px; align-items: center; }
.nav-links a { font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 400; letter-spacing: 0.5px; color: var(--gold-light); transition: var(--transition); position: relative; padding: 8px 18px; border-radius: 50px; }
.nav-links a:hover { background: var(--gold); color: var(--dark); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(201,169,110,0.3); }
.nav-links li { position: relative; list-style: none; }
.dropdown { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); min-width: 220px; background: var(--dark-soft); border: 1px solid rgba(201,169,110,0.15); border-radius: 8px; padding: 12px 0; opacity: 0; visibility: hidden; transition: var(--transition); box-shadow: 0 16px 40px rgba(0,0,0,0.4); z-index: 100; margin-top: 8px; }
.nav-links li:hover .dropdown { opacity: 1; visibility: visible; }
.dropdown a { display: block; padding: 10px 24px; font-size: 0.8rem; font-weight: 400; letter-spacing: 1px; color: var(--text-muted); transition: var(--transition); white-space: nowrap; border-radius: 0; background: none; transform: none; box-shadow: none; }
.dropdown a:hover { color: var(--gold); background: rgba(201,169,110,0.08); padding-left: 28px; transform: none; box-shadow: none; }
.hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; background: none; border: none; padding: 4px; }
.hamburger span { width: 24px; height: 2px; background: var(--gold); transition: var(--transition); }
/* Auto-collapse navbar */
.navbar.collapsed .hamburger { display: flex; }
.navbar.collapsed .nav-links { position: fixed; top: 0; right: -100%; width: 280px; height: 100vh; background: var(--dark); flex-direction: column; justify-content: center; gap: 28px; transition: var(--transition); border-left: 1px solid rgba(201,169,110,0.15); }
.navbar.collapsed .nav-links.active { right: 0; }
.navbar.collapsed .nav-links .dropdown { position: static; transform: none; min-width: 0; background: transparent; border: none; border-radius: 0; padding: 8px 0 0 20px; opacity: 1; visibility: visible; box-shadow: none; margin-top: 0; }
.navbar.collapsed .nav-links .dropdown a { padding: 6px 0; font-size: 0.75rem; }
```

**IMPORTANTE — NO omitir ninguna regla:**
- `.nav-links { display: flex; gap: 36px; align-items: center; }` → sin esta regla el menú se muestra VERTICAL
- `.nav-links a { ... letter-spacing: 0.5px; ... }` → SIN `text-transform: uppercase`, SIN `letter-spacing: 1.5px`
- Todas las reglas `.navbar.collapsed` → necesarias para el menú hamburguesa en móvil

### JS del navbar (en el `<script>` al final del body)
```js
// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    const wasScrolled = navbar.classList.contains('scrolled');
    const isScrolled = window.scrollY > 60;
    navbar.classList.toggle('scrolled', isScrolled);
    if (wasScrolled !== isScrolled) checkNavOverflow();
});

// Mobile menu toggle
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger.addEventListener('click', () => { navLinks.classList.toggle('active'); });

// Close menu on link click
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('active'));
});

// Auto-collapse navbar when items don't fit
function checkNavOverflow() {
    const navbar = document.getElementById('navbar');
    const navLinks = document.getElementById('navLinks');
    const container = navbar.querySelector('.container');
    navLinks.classList.remove('active');
    navbar.classList.remove('collapsed');
    navLinks.style.flexShrink = '0';
    void navbar.offsetHeight;
    var bp = 1280;
    if (window.innerWidth <= bp || container.scrollWidth > container.clientWidth + 2) {
        navbar.classList.add('collapsed');
    }
    navLinks.style.flexShrink = '';
}
checkNavOverflow();
window.addEventListener('resize', checkNavOverflow);
```

- Todos los enlaces usan **rutas absolutas** (`/slug/`, `/contacto/`, `/destinos/`, `/quien-hay-detras/`)
- **NUNCA usar `#` en las rutas.** Siempre rutas limpias sin anclas.
- Mobile (≤768px): `.navbar .container { max-width: 100%; padding: 0 12px; }`
- Auto-collapse: colapsa a hamburguesa en `window.innerWidth <= 1280`

---

## Checklist: Crear un nuevo DESTINO

> Usar `escocia/index.html` como referencia CANÓNICA. Copiar estructura completa.

### 1. Crear `[destino]/index.html`
- Copiar estructura exacta de `escocia/index.html`
- Cambiar: título, meta description, hero (imagen + label región + h1 + subtítulo + duración)
- Cambiar: texto intro
- Cambiar: bloques de itinerario (contenido + imágenes en carruseles)
- Cambiar: tarjetas "Qué incluye" (adaptar textos al destino)
- Cambiar: CTA → `Diseñemos tu [Destino]`, enlace a `/contacto/?destino=[Destino]`
- Cambiar: footer → añadir enlace al destino en la lista de destinos
- Verificar: navbar idéntica (ver sección Navbar arriba)

### 2. Añadir tarjeta en la página de región (`[region]/index.html`) Y en `destinos/index.html`
- Añadir la misma tarjeta en AMBAS páginas (región + hub global de destinos)
```html
<div class="destination-card reveal">
    <a href="/[destino]/">
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
- Guardar imágenes en `images/` y referenciarlas como `/images/[imagen].jpeg`
- `git add images/[imagen].jpeg` para cada imagen local
- Las imágenes que NO son de Unsplash SIEMPRE deben estar en el repositorio

### 4. Añadir sección Travel Hacks en `[destino]/index.html`
- Después del CTA (`.dest-cta`) y antes del footer, añadir:
```html
<!-- PRO TIPS -->
<section class="dest-protips">
    <div class="container reveal">
        <span class="section-label">Travel Hacks</span>
        <h2>Consejos de experto para <em style="color: var(--gold);">[Destino]</em></h2>
        <p>Todo lo que necesitas saber antes, durante y después de tu viaje: checklist, dinero, transporte, seguridad, cultura, comida y hacks de experto.</p>
        <a href="/pro-tips-[destino]/" class="btn btn-primary">Ver Travel Hacks &#10230;</a>
    </div>
</section>
```
- Añadir CSS `.dest-protips` (copiar de `escocia/index.html`, bloque `/* ===== PRO TIPS LINK ===== */`)

### 5. No olvidar
- Alternancia de bloques: normal → reverse → normal → reverse
- Un dot por cada slide en el carrusel
- Footer: añadir enlace al destino en la columna "Destinos"

---

## Checklist: Crear una nueva REGIÓN

> Usar `asia/index.html` como referencia. Copiar estructura completa.

### 1. Crear `[region]/index.html`
- Copiar estructura exacta de `asia/index.html`
- Cambiar: título, meta description, hero (imagen + h1 + subtítulo)
- Grid de destinos vacía (se irán añadiendo tarjetas)
- Verificar: navbar idéntica

### 2. Actualizar dropdown en TODAS las páginas
- Reemplazar `<a href="#">[Región]</a>` por `<a href="/[region]/">[Región]</a>`
- En: index.html y todos los `*/index.html`

---

## Checklist: Crear un nuevo PRO TIPS de destino

> Usar `pro-tips-tailandia/index.html` como referencia CANÓNICA. Copiar estructura completa.

### 1. Crear `pro-tips-[destino]/index.html`
- Copiar estructura exacta de `pro-tips-tailandia/index.html`
- Cambiar: título, meta description, hero (imagen + label región + h1)
- Cambiar: texto intro + enlace "← Todos los Travel Hacks" (ya apunta a `/pro-tips/`)
- Cambiar: los 10 bloques de contenido (tips específicos del destino)
- Cambiar: CTA → `Diseñemos tu [Destino]`, enlace a `/contacto/?destino=[Destino]`
- Verificar: navbar idéntica (ver sección Navbar arriba)

### 2. Añadir tarjeta en `pro-tips/index.html` (hub)
- Añadir tarjeta en la sección de región correspondiente (Europa / Asia / África)
- Usar imagen hero del destino con `?w=600&q=80`
- Badge con nombre de la región
- Enlace a `/pro-tips-[destino]/`

### 3. Estructura de los 10 bloques (OBLIGATORIA)
1. Antes de viajar (Checklist)
2. Dinero y pagos
3. Transporte
4. Zonas y logística
5. Seguridad y estafas
6. Salud y clima
7. Cultura y etiqueta
8. Comida y experiencias
9. Hacks PRO
10. Top 5 (resumen rápido) + CTA

### 4. Reglas de contenido
- Cada tip: beneficio + acción (máx. 1-2 líneas)
- Iconos: ✅ (recomendación), ⚠️ (advertencia), 💡 (hack/truco)
- Máximo 4-8 tips por bloque
- Alternancia: `.tips-section` / `.tips-section.alt-bg`
- Bloque 10 (Top 5): usa `.top5-grid` con `.top5-card`

---

## Arquitectura de navegación

- Cada región del dropdown (Europa, Asia, Africa, etc.) tiene su página `/[region]/` con título "Top Destinos [Región]"
- Cada destino individual tiene su página `/[destino]/` (ej: `/escocia/`)
- Las páginas de región muestran tarjetas que enlazan a los destinos individuales
- El CTA de cada destino enlaza a `/contacto/?destino=[Nombre]` (auto-fill JS)

---

## Estructura de página de región

1. **Hero** — `.region-hero`, `min-height: calc(70vh - 110px)`, `padding-top: 100px`, `padding-bottom: 20px`, parallax, `background-position` ajustar por imagen
2. **Grid de destinos** — `padding-top: 30px`, section-header con `margin-bottom: 40px`
3. **Footer**

## Estructura de página de destino (`escocia/index.html` CANÓNICA)

1. **Hero** — `.dest-hero`, `min-height: calc(70vh - 110px)`, `padding-top: 100px`, `padding-bottom: 20px`, parallax (`background-attachment: fixed`), `background-position` ajustar por imagen
2. **Intro** — `padding-top: 30px`, `padding-bottom: 10px` — texto descriptivo centrado (`dest-intro-text`, max-width 780px)
3. **Itinerario** — `padding-top: 10px` — bloques alternados (`.itinerary-block` / `.itinerary-block.reverse`), gap 48px, margin-bottom 80px entre bloques
4. **Qué incluye** — `padding-top: 30px`, grid 4 columnas (`.includes-grid` / `.include-card`), fondo `var(--dark-soft)`
5. **CTA** — `.dest-cta`, `padding-top: 30px`, centrado, enlaza a `/contacto/?destino=[Nombre]`
6. **Footer** — idéntico con enlace al destino en la lista

## Estructura de página de Travel Hacks (`pro-tips-tailandia/index.html` CANÓNICA)

1. **Hero** — `.dest-hero`, misma estructura que destinos, imagen hero del destino, label región, h1 "Travel Hacks: [Destino]"
2. **Intro** — `padding-top: 30px`, `padding-bottom: 10px` — texto centrado + enlace "← Todos los Travel Hacks" a `/pro-tips/`
3. **10 bloques** — `.tips-section` / `.tips-section.alt-bg` alternando, `padding: 80px 0`
4. **CTA** — `.tips-cta`, `padding: 80px 0`, enlaza a `/contacto/?destino=[Nombre]`
5. **Footer** — idéntico al resto

---

## Sistema de carrusel en itinerario (OBLIGATORIO)

> Cada bloque del itinerario usa `.itinerary-carousel`. Copiar sistema exacto de `escocia/index.html`.

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
- **Las imágenes locales (no Unsplash) SIEMPRE van en `images/`** — referenciar como `/images/nombre.ext` (ruta absoluta), hacer `git add` antes de commit

## Los dos vigías y su red de seguridad en el VPS

Dos workflows vigilan el SEO solos y avisan por Telegram:

| Workflow | Cuándo | Qué hace |
|---|---|---|
| `indexing-check.yml` | días impares, 07:00 UTC | inspecciona las URLs del `sitemap.xml` en Search Console y escribe `scripts_seo/last_summary.md` |
| `rank-weekly.yml` | viernes, 07:00 UTC | posiciones de las consultas vigiladas y de 8 páginas clave |

**GitHub Actions se salta los cron programados cuando va cargado.** No es una avería: es el
comportamiento documentado de los `schedule`. Pasó el 28-ago-2026 (el informe semanal no llegó a
dispararse) y el 27 (el vigía corrió a las 18:24 en vez de a las 09:00).

Por eso el VPS lleva una red de seguridad: **`/root/avisos/horizonte-actions.sh`**, cron diario a las
10:30 (log en `/root/avisos/horizonte-actions.log`). Mira si el workflow que tocaba hoy ya ha corrido
y, solo si no, lo lanza con `gh workflow run`. El `schedule` de GitHub se queda puesto: si dispara a
su hora, el script no hace nada. Opción `--probar` para ver qué haría sin lanzar nada.

Ojo: el script vive en el VPS, no en este repo, y depende de que `gh` siga autenticado ahí.
