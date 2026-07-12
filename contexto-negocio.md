# Contexto de negocio (Prompt 0) — Horizonte Exclusivo

> Archivo base de la skill `seo-local`. Se carga una vez y se referencia en cada auditoría.
> Rellenado el 5-jul-2026 a partir del sitio en vivo (horizonteexclusivo.es), `docs/OPERACIONES.md`
> y `docs/SETUP-QUICKWINS.md`. Revisa/corrige lo marcado `⚠️` y `PENDIENTE`.

## 1. Identidad del negocio (NAP)
- **Nombre exacto (GBP):** Horizonte Exclusivo  ⚠️ confirmar que coincide LITERALMENTE con la ficha de Google (sin añadir "Viajes de lujo" ni ciudad — sería keyword stuffing y motivo de suspensión).
- **Dirección:** Carrer Major 37, 08750 Molins de Rei (Barcelona)  ⚠️ confirmar que es idéntica en web, GBP y directorios (misma abreviatura de "Carrer/C/").
- **Teléfono:** +34 633 077 401 — mismo en web, WhatsApp y schema ⚠️ confirmar en GBP.
- **Web:** https://horizonteexclusivo.es  ⚠️ definir canónica (¿con o sin `www`?) y usar SIEMPRE la misma en GBP y directorios.
- **Email:** viajes@horizonteexclusivo.es
- **Horario:** L-V 9:00–13:30 y 16:00–19:00 (martes solo mañana 9:30–13:30); fines de semana cerrado.
- **Razón social / CIF:** PENDIENTE.

## 2. Ficha de Google Business Profile
- **URL pública (Google Maps):** PENDIENTE — **BLOQUEANTE** de las auditorías 1-8 y de todo el map pack.
- **¿La ficha existe y está verificada?** PENDIENTE — sin ficha verificada NO se puede aparecer en el map pack (es el paso cero).
- **Categoría principal actual:** PENDIENTE (probable: "Agencia de viajes").
- **Categorías secundarias:** PENDIENTE.
- **Nº de reseñas / nota media:** PENDIENTE (la home enlaza a reseñas de Google → la ficha existe en alguna forma).
- **¿Acceso de gestión a la ficha?** PENDIENTE.

## 3. Qué vende y dónde
- **Servicios principales:** viajes de lujo a medida (sin paquetes prefabricados), lunas de miel a medida,
  diseño de itinerarios personalizados, coordinación de vuelos y hoteles, guías privados, curación de
  experiencias, asistencia durante el viaje, consulta previa gratuita.
- **Servicio estrella:** el viaje 100% a medida ("más que viajar, vivir el mundo"); la luna de miel es un
  gancho de alta conversión.
- **Zona de servicio:** local físico en Molins de Rei + servicio remoto a todo Baix Llobregat, Barcelona,
  Cataluña y España. Catálogo de 55+ destinos internacionales.
- **Local con clientes o a domicilio:** oficina física en Molins de Rei (con cita) + atención remota.

## 4. Cliente y propuesta de valor
- **Cliente ideal:** parejas, familias y grupos de amigos con poder adquisitivo; recién casados (luna de
  miel); viajero que prioriza calidad de experiencia y "no preocuparse de nada" por encima del precio.
- **Propuesta única:** diseño artesanal 1-a-1 (persona "Endeis" detrás), cero paquetes, se ocupan de toda la
  logística, lujo entendido como detalle y tranquilidad (no ostentación).
- **Objeciones frecuentes:** precio (política: NUNCA se muestran precios ni cifras), confianza en agencia
  pequeña/nueva, "¿por qué no reservo yo por internet?".

## 5. Competidores locales (mínimo 3)
> La skill audita **yo vs 3 competidores**. Hay que distinguir DOS tableros distintos:
- **Map pack "Barcelona ciudad" (candidatos, a confirmar cuáles rankean de verdad):** Nuba · Premium Traveler
  Barcelona · Tarannà (Viajes de Lujo Tarannà) · PouTravel · Weissnor Travel · Ferrer & Saret. Todas en el
  centro de Barcelona, con décadas de trayectoria y muchas reseñas → proximidad + prominence a su favor.
- **Map pack local Molins de Rei / Baix Llobregat (donde la proximidad juega A FAVOR de Horizonte):** Viajes
  Omega, Halcón Viajes, Viajes El Corte Inglés (Molins), agencias de Sant Feliu / Sant Vicenç / Sant Just.
- **Competidor 1 (pack real):** PENDIENTE confirmar en Google Maps desde ubicación de Barcelona.
- **Competidor 2 (pack real):** PENDIENTE.
- **Competidor 3 (pack real):** PENDIENTE.

## 6. Keywords objetivo
- **3 principales:** "agencia de viajes de lujo Barcelona", "viajes de lujo a medida Barcelona",
  "agencia de viajes Molins de Rei".
- **Long-tail / secundarias:** "luna de miel a medida Barcelona", "viaje a medida", "agencia de viajes
  Baix Llobregat", "safari privado", "viaje de novios personalizado", + los 55 destinos.
- **Términos de cliente:** "que me lo organicen todo", "viaje sin preocuparme de nada", "viaje único",
  "vivir el mundo".

## 7. Activos y accesos
- **Google Search Console:** PENDIENTE (habilita la auditoría 12).
- **Google Analytics:** GA4 cableado en el código, pendiente de pegar el ID real (ver `docs/SETUP-QUICKWINS.md`).
- **CMS:** HTML estático (79+ páginas), sin framework, desplegado en Vercel. Control total del código y del
  schema (JSON-LD vía `build-schema.js`).
- **Directorios ya dados de alta:** PENDIENTE (auditoría 15 · NAP/citaciones).
- **Redes:** Instagram `@viajeshorizonteexclusivo` (o `@horizonteexclusivo`) — pendiente de crear (QW2).

## 8. Objetivo y restricciones
- **Objetivo 90 días:** máxima visibilidad en el map pack local (Molins de Rei + Baix Llobregat) y presencia
  creciente en "Barcelona"; más contactos por WhatsApp/formulario.
- **Idioma entregables:** Español (España).
- **Tono de marca:** aspiracional pero cercano, poético ("vivir el mundo"), voz de "Endeis".
- **Líneas rojas:** **CERO precios** en cualquier soporte (política comercial); NUNCA comprar ni incentivar
  reseñas; NUNCA meter keywords/ciudad en el nombre de la ficha GBP.

---

## Registro de auditorías

| Fecha | Auditoría | Estado | Acciones abiertas |
|-------|-----------|--------|-------------------|
| 2026-07-05 | Recon inicial (sitio + competidores map pack) | Hecho | Objetivo fijado: **pack LOCAL** (Molins + Baix Llobregat). Ficha verificada, la gestiona Victor. |
| 2026-07-05 | Parte 1 · GBP (auditorías 1-8) | Entregado en `docs/SEO-LOCAL-FICHA.md` + **ejecutado por Victor** (categoría "Agencia de viajes" OK, servicios, descripción, post Japón publicado, fotos) | Datos reales confirmados: **4 reseñas 5,0**, categoría OK, dirección GBP = "Carrer Major, 37, 08750 Molins de Rei, Barcelona". Enlace reseñas: g.page/r/CYdKzB_9NWUOEAE/review. Campaña de reseñas en marcha (objetivo 10-15/90 días) + posts 1/semana. |
| 2026-07-05 | Web · Fix `aggregateRating` self-referido (home) | Hecho (`build-schema.js` + `schema-auto.js`), home re-horneado | **Pendiente push.** `B.rating`/`B.reviewCount` quedan sin uso (no borrados). |
| 2026-07-05 | Web · NAP unificado "Calle→Carrer Major, 37" | Hecho vía sed en **148 páginas** (pie) + bloque Oficina de `contacto` | **Pendiente push.** Verificado: 0 "Calle Major" restantes. |
| 2026-07-05 | Web · Landing Molins `WebPage`→`TravelAgency` | Hecho (`build-schema.js` + `schema-auto.js`), `molins-de-rei` re-horneado con `areaServed` local | **Pendiente push.** |
| 2026-07-05 | Web · Horario corregido (era 9:00, real 9:30) | Hecho: schema home + pie 148 págs + contacto visible. Verificado | Horario real (Victor): L-V mañana 9:30–13:30; L/X/J/V tarde 16:00–19:00; martes solo mañana; S/D cerrado. **Pendiente push.** Confirmar que la ficha GBP muestra lo mismo. |
| 2026-07-05 | Parte 2 · Aud. 9 (gap keywords) + 10 (money pages) | Hecho (benchmark vs Nuba/Tarannà/PouTravel) | Ventajas confirmadas: schema y reseñas (nadie las muestra). Gap: local Baix Llobregat + páginas de servicio (safari, familia). |
| 2026-07-05 | Parte 2 · Aud. 11 · Página `/baix-llobregat/` | Hecho y verificado (TravelAgency schema + sitemap + enlace interno ↔ Molins). **Pendiente push** | Hueco que no cubre ningún competidor. |
| 2026-07-05 | Parte 2 · Fix conversión · Badge 5,0 Google + tel clicable | Hecho en 7 money pages + CSS global. **Pendiente push** | Diferenciador: ningún competidor de lujo muestra reseñas en la página. |
| 2026-07-05 | Parte 2 · Aud. 12 (GSC, 12 meses) | Hecho (datos reales) + 2 reescrituras CTR (`/molins-de-rei/` y `/cuanto-cuesta-viaje-a-medida/`). **Pendiente push** | HALLAZGO: "agencia de viajes molins de rei" pos **2,7** (CTR 1,4%) → estrategia local validada. Clúster precio (cuánto cuesta/precio/presupuesto) pos 8-11. Móvil pos 13 vs escritorio 35. Impresiones al alza. P2/P3: página safari (109 impr huérfanas), reforzar /destinos/ y /agencia-viajes-lujo-barcelona/ (pos 47-48). |
| 2026-07-05 | Parte 2 · Aud. 13 (sentimiento reseñas) | Hecho (4 reseñas 5,0 leídas por captura) + **3 FAQ nuevas en el home** (FAQPage 6→9). **Pendiente push** | Temas: delegar/cero preocupaciones, confianza, valor>precio. Objeción precio neutralizada por reseña real. Pendiente Victor: responder 2 reseñas sin contestar (loidap, GRUPO NEW ENERGY) con los textos dados. |
| 2026-07-12 | Workflow "Indexing check" reparado (`GOOGLE_SA_JSON`) + auditoría de indexación (141 URLs, URL Inspection API real) | Hecho. Secret subido, workflow corre solo cada 2 días. **Diagnóstico confirmado con matices** (verificación adversarial): hub 100% indexado, país 57%, pro-tips **34%** (peor bloque — 56 páginas con H1-H10 idéntico, patrón de contenido a escala), guías comerciales 42% (dependen solo de sitemap.xml, sin enlace interno real entrante), legal 33% (esperable, sin impacto). | **Decisión tomada (panel de 3 estrategias + jueces):** para el clúster pro-tips, PODAR Y PRIORIZAR (aterrizar a 10-15 supervivientes vía señal GSC + enlace editorial + país hermano ya indexado) incorporando fusión (acordeón + 301) solo donde hay canibalización confirmada país↔pro-tips (alaska, dubai-abu-dhabi-maldivas). La decisión LOCAL (Molins/Baix Llobregat) NO se toca — es un problema de indexación técnica/contenido, no de posicionamiento geográfico. Detalle completo del plan P1-P3 en la conversación del 12-jul (workflow `wf_f124df30-029`). |
| 2026-07-12 | P1 · Enlaces internos a las 7 guías comerciales sin indexar | **Hecho y desplegado** (commit `3f8a713f`, live verificado). Enlace contextual en el cuerpo (no footer/menú), texto distinto por página para no crear un bloque plantillado, desde: `viaje-a-medida-vs-por-tu-cuenta`, `luna-de-miel-a-medida`, `errores-comunes-organizar-viaje`, `checklist-pre-viaje`, `itinerario-ritmo-realista`, `jet-lag-cambios-horarios` → hacia las 7 sin indexar (`cuanto-cuesta-viaje-a-medida`, `como-planifico-un-gran-viaje`, `antes-de-reservar-viaje-grande`, `que-reservar-primero-gran-viaje`, `viaje-a-medida-que-es`, `viaje-premium-que-es`, `viajes-pequenos-recuerdos-grandes`). De paso, `build-schema.js` sincronizó el JSON-LD desactualizado de `cuanto-cuesta-viaje-a-medida` y `molins-de-rei` con su title/meta actual. | **Pendientes de P1** (esperando decisión de Victor, no ejecutados): solicitud manual de indexación en GSC UI (9 países crawled-not-indexed + 3 unknown: escocia/singapur/sri-lanka) — requiere el UI, no hay API pública; fusión piloto pro-tips-alaska + pro-tips-dubai-abu-dhabi-maldivas dentro de su país (más invasivo, Victor lo dejó para después). P2 (podar/priorizar el resto del clúster pro-tips) sin empezar. |
