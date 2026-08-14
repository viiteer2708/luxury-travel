# Rollout `seo-local` — auditorías 3, 17, 18, 19 y 20

> 14-ago-2026. Cierra el sistema de 20 auditorías: las 1-16 estaban hechas (5-jul, 12-jul, 6-ago),
> estas cinco faltaban. Recon **en vivo en Google Maps** desde el VPS con Playwright.
>
> 🔓 **Hallazgo de método que cambia lo que se puede auditar de aquí en adelante:** Google bloquea la
> SERP desde este servidor, pero **Google Maps no**. Basta aceptar el diálogo de consentimiento
> («Aceptar todo») y la ficha carga entera: nota, reseñas, atributos, posts, horarios. Ya no hace
> falta pedirle capturas a Victor para las auditorías 1-8.

---

## Antes de nada: el tablero real, que no era el que creíamos

Buscando «agencia de viajes molins de rei» en Maps, esto es lo que Google ordena:

| # | Negocio | Nota | Reseñas |
|---|---------|------|---------|
| 1 | Viajes El Corte Inglés Molins de Rei | 4,3 | 62 |
| 2 | Halcón Viajes | 4,6 | 37 |
| 3 | deviatge | 4,3 | 56 |
| 4 | Viatges Llobregat | 4,7 | 37 |
| 5 | Setnia | 5,0 | 17 |
| 6 | Viajes Omega | 4,2 | 15 |
| **7** | **HORIZONTE EXCLUSIVO** | **5,0** | **3** |

Tres correcciones al análisis de esta mañana:

1. **Deviatge no es el que sale primero: es el tercero.** El rival de cabeza es Viajes El Corte
   Inglés. La pelea no es contra una agencia, es contra seis.
2. **Deviatge tiene 4,3 con 56 reseñas**, no 4,1 con 48 — el dato viejo venía de directorios que
   copian la ficha con retraso.
3. **Nosotros tenemos 3 reseñas, no 4.** O se ha caído una (Google filtra sin avisar) o el dato de
   julio estaba mal. Conviene que Victor lo mire.

📌 **Y una referencia que vale más que todo lo anterior: Setnia está el 5º con 17 reseñas.** Ese es el
umbral real de entrada. Con ~20 reseñas se adelanta a los puestos 5 y 6; para meterse en el trío de
cabeza hay que acercarse a 37, y eso es trabajo de un año, no de un trimestre. El objetivo de 20 en
90 días sigue siendo el correcto, pero ahora sabemos qué compra exactamente: pasar del 7º al 5º.

---

## Auditoría 3 · Teardown de las reseñas de Deviatge

Leídas sus reseñas ordenadas por más recientes y por peor valoradas.

### Lo que sus clientes elogian

- **Dos nombres propios: Lidia y Gisela.** Salen en casi todas las reseñas buenas. Su activo no es la
  marca, son dos personas — exactamente el mismo modelo que Endeis.
- **Organización sin fisuras** de viajes complejos: Bali + Singapur + Maldivas, Toronto + Niágara +
  NYC, Tailandia + Camboya, Marrakech en familia de cinco.
- **Detalles de cuidado personal**: un cliente celíaco al que le resolvieron la comida en Maldivas.
- Su resumen automático de Google destaca: *«Buenos precios, buenos paquetes»* — **compiten por
  precio y por paquete**, que es el terreno contrario al nuestro.

### Su punto débil, y es el nuestro fuerte

Todas sus reseñas negativas hablan de **lo mismo: el trato**.

> «1 estrella porque no puedo darle 0. La que es la jefa es una maleducada, trata fatal a sus
> clientes» · «PÉSIMO SERVICIO, malas formas de contestar» · «una de las que está en la agencia un
> poco maleducada… no volveré» · «LA PEOR AGENCIA CON LA QUE HE VIAJADO: PARA VENDER SON FANTÁSTICAS
> PERO COMO TENGAS UN PROBLEMA… NOS DEJARON TIRADOS EN VENECIA» · «Llevaba años contratando sus
> viajes sin ningún problema. La cosa ha cambiado mucho y he visto detalles muy feos. No volveré.»

Y una respuesta pública del propietario que vale por todo el análisis:

> **«Buenas tardes, agradecemos que dejes de venir por nuestra oficina.»**

**Qué se hace con esto — y qué NO.** No se menciona jamás a un competidor, ni en la web, ni en la
ficha, ni en una respuesta a una reseña: eso se vuelve en contra y además es feo. Lo que se hace es
**ocupar el hueco con hechos propios**:

- El mensaje que nos diferencia no es «somos de lujo», es **«y cuando algo se tuerce, estamos»**.
  Ese es el vacío que dejan sus reseñas negativas. La página de Molins ya habla de la conversación
  previa; falta contar qué pasa **durante** el viaje.
- **Acción P2 (web):** un bloque de «qué pasa si algo falla estando fuera» en la landing local y en
  la página de a medida. Asistencia real durante el viaje, no un teléfono de call center.
- **Acción P1 (reseñas):** al pedirlas, animar a que cuenten **cómo fue el acompañamiento**, no solo
  el destino. Una reseña que dice «nos resolvieron un cambio de vuelo desde allí» es la respuesta
  exacta a lo que a ellos les critican.

### Y una noticia mejor que las 56 reseñas

**Su ritmo de reseñas es lento.** Ordenadas por fecha: una hace 3 días, otra hace 1 mes, dos hace 2
meses… y luego un salto a 9, 10 y 11 meses. **En el último año han sumado unas 4-5.** Esas 56 son el
poso de veinte años, no una máquina en marcha. A 2-3 reseñas por semana, el hueco se cierra en
meses; no hay que remontar veinte años.

---

## Auditoría 17 · Gap de contenido

| | Deviatge | Horizonte |
|---|---|---|
| Páginas | 33 (incluidas `sample-page-2`, `home-2`, `home-3`, `pagina-ejemplo` — restos de la plantilla sin limpiar) | 121 indexables |
| Fichas de producto | **101** (WooCommerce, con precio) | 0 (política de cero precios) |
| Destinos / tours | 5 continentes + 12 tours | **59 destinos** |
| Blog | **3 entradas** | ~38 guías |

**Lectura:** en contenido editorial les ganamos por goleada y no hay nada que perseguir ahí. Su única
ventaja estructural son las 101 fichas de producto con precio, que captan la búsqueda de «viaje a X
precio» — terreno que **no vamos a pisar** por decisión de negocio, y está bien así.

**El único gap real que sí merece la pena:** tienen **luna de miel segmentada por continente**
(`africa-luna-de-miel`, `asia-luna-de-miel`, `america-luna-de-miel`…) y nosotros una sola página de
luna de miel. Sumado a que en GSC «agencias de viajes de novios barcelona» tiene 102 impresiones en
posición 41, hay materia para **2-3 páginas de luna de miel por destino** (P3, después de las
reseñas). También tienen `turismo-responsable`, que nosotros no tocamos: encaja con el cliente de
lujo actual, pero es P3 sin demanda medida.

---

## Auditoría 18 · Optimización de entidades

Lo que ya está bien atado y **no hay que tocar**: el `LocalBusiness` del home declara `sameAs` con el
CID de Google Maps **y** el Instagram — que es justo lo que une la web con la ficha a ojos de Google;
`founder` como `Person` con `@id` estable, `knowsAbout` en la página de Endeis, y el NAP idéntico en
las 148 páginas.

Lo que falta, por orden de valor:

- **P1 · Igualar el nombre en la ficha.** `HORIZONTE EXCLUSIVO` en mayúsculas contra
  `Horizonte Exclusivo` en el schema, en la web y en las futuras altas de directorio. Google trata el
  nombre como el identificador de la entidad: escribirlo igual en todas partes es gratis.
- **P1 · Igualar la web de la ficha**: pone `horizonteexclusivo.es`, la canónica es **con `www`**.
- **P3 · `knowsAbout` en la organización** (hoy solo lo tiene la persona) y `areaServed` en el
  `LocalBusiness` del home, no solo en las dos landings locales.

---

## Auditoría 19 · Patrón de posteo de los competidores

| | Posts en la ficha | Instagram |
|---|---|---|
| Deviatge | Ninguno visible | 624 seg. · **2 publicaciones en todo 2026** · ER 1,7% |
| Horizonte | 1 (Japón, **5-jul**) | 126 seg. · ER **8,7%** |

**Nadie del pack está publicando.** Es un terreno vacío que se ocupa con diez minutos a la semana.
Pero conviene decirlo claro: **nosotros tampoco estamos publicando** — el último post es del 5 de
julio, hace 40 días, y la cadencia semanal se acordó en julio. El calendario de cuatro semanas del
plan sigue siendo la acción, y el primer post toca esta semana.

---

## Auditoría 20 · Informe mensual de rendimiento

Ya existe casi todo; lo que falta es **juntarlo una vez al mes**. Fuentes, y qué mide cada una:

| Fuente | Qué da | Cómo |
|--------|--------|------|
| `rank-weekly.yml` (viernes) | Posiciones, impresiones, clics y la curva semanal | Automático, llega por Telegram |
| `gsc-estacionalidad.yml` | Si una caída es real o un salto de ventana | A mano, cuando algo asusta |
| `indexing-check.yml` (días impares) | Páginas dentro y fuera del índice | Automático |
| **Estadísticas de la ficha** | **Interacciones, «cómo llegar», llamadas, clics a la web** | **A mano, en el panel de GBP** |
| Maps con Playwright | Nº de reseñas nuestro y de los seis del pack, y nuestra posición en la lista | Repetible desde el VPS |

⚠️ **Lo que ningún informe automático ve: el mapa.** Search Console no cuenta lo que pasa dentro de
la ficha, y ahí está el grueso del tráfico local (127 interacciones en tres meses frente a ~51 clics
orgánicos en 28 días). **El KPI del trimestre no es una posición: es el número de reseñas**, porque
es lo único que mueve el mapa y es medible sin ambigüedad.

**Cadencia propuesta:** el primer viernes de cada mes, sobre el informe semanal que ya llega, añadir
tres líneas a mano: reseñas propias, reseñas de los seis del pack, y las interacciones de la ficha
del mes anterior.

---

## Qué cambia en el plan de ataque

1. El objetivo de 90 días se reformula con honestidad: **de 3 a 20 reseñas = del 7º al 5º puesto**.
   El trío de cabeza (37-62 reseñas) es objetivo de 12 meses.
2. Al pedir la reseña, pedir que hablen del **acompañamiento**, no solo del destino: es el hueco
   exacto que dejan las críticas de Deviatge.
3. Dos arreglos de coherencia de entidad que cuestan un minuto: **el nombre de la ficha en mayúsculas
   y la web sin `www`**.
4. El post semanal lleva **40 días parado**; se retoma con el calendario del plan.
5. Nada de esto pasa por escribir más web: en contenido ya vamos ganando 121 a 33.
