# CLAUDE.md - Landing page o web estática
Pagina web especializada en viajes de lujo personalizados.


## Stack
- Next.js 15 (App Router)
- TypeScript estricto
- Tailwind CSS + shadcn/ui
- Supabase (auth, DB, storage, RLS)
- Stripe (pagos), Mux (video), Resend (email)

## Estructura de Carpetas
```

```

## Reglas de Oro

| Regla | Por qué |
|-------|---------|
| Componentes existentes primero | 100+ en components/, no dupliques |
| UI_DESIGN_RULES.md antes de UI | Sistema de diseño establecido |
| RLS en TODAS las tablas | Tier access en BD |
| Mobile-first | 70% usuarios móvil |
| Todo desde Supabase | Admin sin deploy |
- **Idioma:** Español de España en UI, comentarios y commits. Código en inglés


**PERMITIDO sin preguntar (YOLO mode):**
- Leer/escribir cualquier archivo de código
- Ejecutar builds, linters, type checks
- Crear migraciones SQL
- Instalar dependencias
- git add, git commit
- Operaciones de Supabase (MCP)


## Estado Actual
(Rellena esto manualmente con lo que funciona y lo que falta)

## Prohibiciones
**PROHIBIDO sin pedir permiso:**
- git push (Pablo hace push manualmente)
- rm -rf / borrar archivos
- Playwright / browser testing
- npm run dev / levantar servidores

**PROHIBIDO SIEMPRE:**
- No mostrar precios en NINGUNA parte de la web (ni en HTML, ni en CSS, ni en comentarios). Sin excepciones.


## Variables de Entorno
(Lista aquí tus env vars SIN valores)

## Reglas de Ejecución

**PERMITIDO sin preguntar:**
- Leer y escribir archivos de código
- Ejecutar builds y type checks
- Instalar dependencias
- git add y git commit

**PROHIBIDO sin permiso:**
- git push
- Borrar archivos
- Levantar servidores

## Referencias
