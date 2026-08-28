# Solicitar indexación en Search Console con Cowork

Google no ofrece ninguna API legítima para «solicitar indexación» (la URL Inspection API es solo
lectura; la Indexing API es solo para ofertas de empleo y directos). Queda el botón manual de Search
Console, con un tope de unas 10-12 peticiones al día por propiedad. Este documento es el encargo
para que **Cowork, desde el PC de Victor y con su sesión de Google**, pulse ese botón por él.

## Antes de empezar (una vez)

1. Chrome abierto **con la cuenta de Google que gestiona Search Console** (la misma con la que Victor
   entra en https://search.google.com/search-console).
2. La extensión **Claude en Chrome** instalada y conectada a Cowork (Cowork la usa para navegar).
3. La propiedad es la de **dominio**: `horizonteexclusivo.es` (no la de URL con `www`).

## El encargo (copiar y pegar en Cowork tal cual)

```
Entra en Google Search Console (https://search.google.com/search-console) y selecciona la propiedad
de dominio «horizonteexclusivo.es». Para CADA una de las URLs de la lista de abajo, en este orden:

1. Pégala en la barra superior «Inspecciona cualquier URL de horizonteexclusivo.es» y pulsa Intro.
2. Espera a que cargue el resultado (dirá «La URL está en Google» o «La URL no está en Google»).
   Apunta cuál de las dos dice.
3. Pulsa el botón «SOLICITAR INDEXACIÓN» y espera a que aparezca el aviso «Se ha solicitado la
   indexación». Ciérralo y pasa a la siguiente.
4. Si en algún momento Google dice «Se ha superado la cuota» (o algo parecido a que no admite más
   solicitudes hoy), PARA y no insistas: apunta hasta cuál has llegado.
5. No pulses «Probar URL publicada» ni ningún otro botón: solo inspeccionar y solicitar.

Cuando termines, dame una tabla con tres columnas: URL · qué decía Google (está / no está) ·
solicitada (sí / no / cuota agotada). Sin resúmenes largos, solo la tabla.

URLs (día 1):
https://www.horizonteexclusivo.es/luna-de-miel-a-medida/
https://www.horizonteexclusivo.es/cuanto-cuesta-viaje-a-medida/
https://www.horizonteexclusivo.es/suiza/
https://www.horizonteexclusivo.es/costa-rica/
https://www.horizonteexclusivo.es/chicago-nueva-orleans/
https://www.horizonteexclusivo.es/ecuador/
https://www.horizonteexclusivo.es/hawai/
https://www.horizonteexclusivo.es/mauricio/
https://www.horizonteexclusivo.es/agencia-viajes-lujo-barcelona/
https://www.horizonteexclusivo.es/viajes-a-medida-barcelona/
```

## Día 2 (mismo encargo, cambiando solo la lista)

Las que Google no ha rastreado nunca:

```
https://www.horizonteexclusivo.es/argentina/
https://www.horizonteexclusivo.es/bali/
https://www.horizonteexclusivo.es/jamaica/
https://www.horizonteexclusivo.es/malasia/
https://www.horizonteexclusivo.es/tailandia/
https://www.horizonteexclusivo.es/alaska/
https://www.horizonteexclusivo.es/camboya/
https://www.horizonteexclusivo.es/uganda/
https://www.horizonteexclusivo.es/india/
```

## Día 3 (opcional, refresco de las que ya están dentro pero cambiaron el 14-ago)

```
https://www.horizonteexclusivo.es/molins-de-rei/
https://www.horizonteexclusivo.es/baix-llobregat/
https://www.horizonteexclusivo.es/viajes-de-empresa-a-medida/
https://www.horizonteexclusivo.es/safari-de-lujo-a-medida/
https://www.horizonteexclusivo.es/viajes-exclusivos-a-medida/
```

## Tanda 4 (26-ago-2026) — las que se han caído del índice

Entre el 19 y el 25 de agosto el vigía vio salir 7 URLs (madagascar, aruba, jet-lag, pro-tips de
egipto, japón y nueva york, errores-comunes). **Seis de ellas salieron sin que Google volviera a
pasar**: siguen viendo versiones de abril-julio, o sea que el trabajo del 14-ago (fusiones y
enlazado) todavía no lo ha leído nadie. Pedir indexación aquí no es insistir: es la única forma de
forzar el re-rastreo y saber si el cambio vale.

Mismo encargo de arriba, cambiando solo la lista:

```
https://www.horizonteexclusivo.es/aruba/
https://www.horizonteexclusivo.es/pro-tips-japon/
https://www.horizonteexclusivo.es/pro-tips-nueva-york/
https://www.horizonteexclusivo.es/pro-tips-egipto/
https://www.horizonteexclusivo.es/pro-tips-india/
https://www.horizonteexclusivo.es/pro-tips-camboya/
https://www.horizonteexclusivo.es/pro-tips-uganda/
https://www.horizonteexclusivo.es/jet-lag-cambios-horarios/
https://www.horizonteexclusivo.es/como-planifico-un-gran-viaje/
https://www.horizonteexclusivo.es/viajes-pequenos-recuerdos-grandes/
```

**Van en ese orden a propósito**: si la cuota se agota a mitad, lo que se queda sin pedir es lo que
menos vende.

Fuera de la lista, y por qué:
- `/madagascar/` — Google SÍ volvió el 19-ago, leyó la versión nueva y la descartó igual. Eso ya es
  un veredicto: repetir la petición gasta cuota y no cambia nada.
- `/antes-de-reservar-viaje-grande/` y `/que-reservar-primero-gran-viaje/` — son las dos que la
  propuesta del 17-ago funde en `/como-planifico-un-gran-viaje/`. No se pide indexación de URLs que
  a lo mejor desaparecen.
- `/checklist-pre-viaje/` y `/errores-comunes-organizar-viaje/` — clúster de planificación: las seis
  guías juntas suman 25 impresiones en 12 meses. Si sobra cuota, van al final de todo.
- `/politica-de-privacidad/` — que esté fuera del índice no molesta a nadie.

## Tanda 5 (28-ago-2026) — las dos que quedan con cambios sin ver

La tanda 4 entró ENTERA: las 10 URLs pedidas el 26-ago estaban indexadas en el informe del 27 (96 de
101). Quedan cuatro fuera y solo dos merecen petición: `/checklist-pre-viaje/` y
`/errores-comunes-organizar-viaje/`, que cambiaron el 26-ago con la fusión del clúster de
planificación (enlaces reapuntados) y Google sigue viendo versiones de mayo.

```
https://www.horizonteexclusivo.es/checklist-pre-viaje/
https://www.horizonteexclusivo.es/errores-comunes-organizar-viaje/
```

**`/madagascar/` y `/sudafrica/` NO se piden.** Google las releyó (el 19 y el 26) con la versión nueva
delante y las dejó fuera igualmente: eso es un veredicto, y volver a pedirlas sin cambiar la página no
lo mueve. Y no hay nada que cambiarles — Madagascar tiene 1.207 palabras y 4 enlaces entrantes,
Sudáfrica 1.132 y 4, mientras sus gemelas indexadas Seychelles (1.250 y 5) y Namibia (1.161 y 4) son
idénticas en perfil. Es presupuesto de rastreo, o sea autoridad, no contenido.
`/politica-de-privacidad/` sigue fuera y da igual.

## Qué hacer con la tabla que devuelva Cowork

Pegársela a Claude en el VPS: la contrasta con el vigía y **apunta cada URL solicitada con su fecha
en `scripts_seo/solicitudes_indexacion.json`**. Con eso el vigía marca esas URLs con 📨 en el
informe y en Telegram («solicitada el X · aún sin releer» / «Google la ha releído y SIGUE FUERA» /
«🆕 entra — solicitada el X»), que es la forma de leer si la petición sirvió.
Día 1 (17-ago-2026): las 10 URLs solicitadas por Cowork sin aviso de cuota; ya registradas. Solicitar
indexación no garantiza nada: solo pone la URL en la cola de rastreo. El veredicto lo dará el vigía
cuando marque «Google volvió» en esas URLs.

## Si Cowork se atasca

- Google puede pedir verificación (captcha o «confirma que eres tú»): la resuelve Victor a mano y
  Cowork sigue.
- Si el botón no aparece, la URL suele estar aún cargando: esperar 10-20 s.
- Nunca más de una tanda al día: la cuota se agota y Google la libera al día siguiente.
