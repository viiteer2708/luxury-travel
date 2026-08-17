# Publicaciones automáticas en la ficha de Google (Camino A)

Decisión de Victor (17-ago-2026): automatizar el post semanal de la ficha de Google Business
Profile de Horizonte Exclusivo por API, sin clics. Estado y pasos aquí; el motor es
`scripts_seo/gbp_post.py`; la cola de posts aprobados, `scripts_seo/gbp_posts.json`.

## Cómo funciona cuando esté todo activo

1. Claude redacta lotes de 8 posts (dos meses) y Victor los aprueba de una vez.
2. Un cron del VPS (lunes 10:00) publica el post de la semana en la ficha: texto sin precios ni
   teléfonos, foto del repo, botón «Más información» con UTM (`utm_source=google&utm_medium=gbp_post`)
   para ver en Search Console/Analytics qué trae cada post.
3. Telegram confirma cada publicación (o avisa si falla). El JSON marca el post como publicado
   (commit automático) y así no se repite.

Referencias oficiales: [Create Posts on Google](https://developers.google.com/my-business/content/posts-data) ·
[Prerrequisitos y acceso](https://developers.google.com/my-business/content/prereqs) ·
[Configuración básica](https://developers.google.com/my-business/content/basic-setup).
La API es gratuita; **la cuota de un proyecto nuevo es 0 hasta que Google aprueba el acceso**.

---

## FASE 1 (hoy) — pedir el acceso a Google · lo hace Cowork con la cuenta de Victor

Requisitos que ya cumplimos: ficha verificada y activa más de 60 días, web propia, proyecto de
Google Cloud (`horizonte-seo`, el del vigía). Encargo para pegar en Cowork (Chrome abierto con la
cuenta de Google que **gestiona la ficha** y que creó el proyecto `horizonte-seo`):

```
Ayúdame a pedir acceso a las Google Business Profile APIs para el proyecto de Google Cloud
«horizonte-seo». Pasos, en este orden, y ve confirmándome cada uno:

1. Entra en https://console.cloud.google.com y selecciona el proyecto «horizonte-seo» (arriba, en el
   selector de proyectos). En la página de inicio del proyecto (o en «Configuración del proyecto»)
   copia el «Número del proyecto» (Project number, solo dígitos) y dímelo.

2. Habilita estas APIs (Menú → «APIs y servicios» → «Biblioteca», busca cada una y pulsa
   «Habilitar»; si ya está habilitada, pasa a la siguiente):
   - Google My Business API
   - My Business Account Management API
   - My Business Business Information API
   - Business Profile Performance API
   Dime cuáles has habilitado.

3. Abre el formulario de acceso https://support.google.com/business/contact/api_default y
   rellénalo con estos datos (si el formulario pide algo que no está aquí, pregúntamelo antes de
   inventar nada):
   - Tipo de solicitud (desplegable): «Application for Basic API Access».
   - Nombre / correo de contacto: los de la cuenta con la que has entrado (la que gestiona la ficha).
   - Nombre del negocio: Horizonte Exclusivo
   - Sitio web: https://www.horizonteexclusivo.es
   - Número del proyecto de Google Cloud: el que has copiado en el paso 1.
   - ¿Agencia o negocio propio?: negocio propio (una sola ubicación).
   - Ubicaciones gestionadas: 1
   - Caso de uso / descripción (cópialo tal cual):
     «Somos una agencia de viajes con una única ficha de Google Business Profile (Horizonte
     Exclusivo, Molins de Rei, Barcelona). Queremos usar la API para publicar nuestras propias
     novedades semanales (posts) en la ficha desde nuestro sistema interno, y leer el estado de esas
     publicaciones. Uso interno, una sola ubicación, sin terceros.»
   - Envía el formulario y dime el texto de confirmación que aparezca.

Cuando termines, dame: el número del proyecto, la lista de APIs habilitadas y la confirmación del
envío. No toques nada más del proyecto.
```

Después Google contesta por correo («de unos días a unas semanas»). Cuando llegue el correo de
aprobación —o si en «APIs y servicios → Cuotas» la Google My Business API pasa de 0 a 300 QPM—,
se pasa a la fase 2. Si Google pide más datos, Victor me reenvía el correo.

---

## FASE 2 (cuando Google apruebe) — la autorización de un clic · Cowork otra vez

Necesitamos un «cliente OAuth» en el proyecto y un *refresh token* de la cuenta de Victor. Se hace
una sola vez. Encargo para Cowork:

```
En https://console.cloud.google.com, proyecto «horizonte-seo»:

1. Menú → «APIs y servicios» → «Pantalla de consentimiento de OAuth» (puede llamarse «Google Auth
   Platform»). Si no está configurada: tipo de usuario «Externo»; nombre de la app «Horizonte
   Exclusivo — publicaciones»; correo de asistencia y de contacto: el mío. En «Permisos/Ámbitos»
   añade el ámbito https://www.googleapis.com/auth/business.manage. Guarda. Después, en «Público»
   (Audience) o «Estado de publicación», pulsa «Publicar la aplicación» (pasar de «Prueba» a
   «En producción») y confirma. (Si Google avisa de que la app no está verificada, aceptamos: es
   solo para nuestra cuenta.)

2. Menú → «APIs y servicios» → «Credenciales» → «Crear credenciales» → «ID de cliente de OAuth».
   Tipo: «Aplicación web». Nombre: «gbp-posts». En «URIs de redirección autorizados» añade
   exactamente: https://developers.google.com/oauthplayground   Pulsa «Crear». Copia el «ID de
   cliente» y el «Secreto de cliente» y guárdalos, los necesito.

3. Abre https://developers.google.com/oauthplayground . Arriba a la derecha, la rueda dentada ⚙:
   marca «Use your own OAuth credentials» y pega el ID de cliente y el secreto. Cierra la rueda.
   En el paso 1 (izquierda), en la caja «Input your own scopes» pega
   https://www.googleapis.com/auth/business.manage y pulsa «Authorize APIs». Elige mi cuenta (la
   que gestiona la ficha), acepta el aviso de app no verificada («Configuración avanzada» → «Ir a
   Horizonte Exclusivo — publicaciones») y concede el permiso. En el paso 2 pulsa «Exchange
   authorization code for tokens». Copia el «Refresh token» completo.

Cuando termines dame tres cosas: ID de cliente, secreto de cliente y refresh token. Nada más.
```

Victor me pasa esas tres cosas **por el chat de esta sesión en el VPS** (no por Telegram ni por
GitHub); yo las guardo en `/root/.gbp-horizonte.env` (solo root) y ejecuto
`python3 scripts_seo/gbp_post.py --descubrir` para sacar los IDs de cuenta y ficha.

---

## FASE 3 (yo) — activar el motor

1. `--descubrir` → completar `GBP_ACCOUNT_ID` y `GBP_LOCATION_ID` en el .env.
2. `--publicar --dry-run` y después una publicación real supervisada (`--publicar --telegram`).
3. Cron en el VPS: lunes 10:00 → `python3 scripts_seo/gbp_post.py --publicar --commit --telegram`.
4. Cada dos meses: nuevo lote de 8 posts (Claude redacta + revisor adversarial), Victor aprueba,
   se añade a `gbp_posts.json`.

## Reglas de los posts (las mismas que la web, más las de Google)

- Cero cifras de dinero, cero «desde», cero descuentos (política de la casa).
- Sin teléfonos, emails ni URLs en el texto (Google rechaza el post); el enlace va en el botón.
- ≤ 1.500 caracteres, ideal 500-900, gancho en la primera frase (Google recorta la vista previa).
- Foto apaisada del propio repo (≥ 900 px de ancho); URL pública de la web.
- Sin competidores, sin urgencia falsa, sin datos inventados. Horario y dirección, los reales.
