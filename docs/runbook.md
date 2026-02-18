# Runbook de Operaciones

Guia para diagnosticar y resolver problemas comunes en produccion y desarrollo local.

---

## 1. Auth y sesiones

### 1.1 Login falla con error 500

**Sintomas**: Al hacer login, error 500 sin mensaje claro.

**Diagnostico**:
- Verificar que `auth.identities` tiene fila para el usuario (requerida por GoTrue)
- Verificar que token columns (`confirmation_token`, `recovery_token`, etc.) son `''`, no NULL

**Resolucion**:
```sql
-- Verificar identities
SELECT * FROM auth.identities WHERE user_id = '<UUID>';

-- Si falta, crear:
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES (gen_random_uuid(), '<UUID>', '<email>', 'email',
  jsonb_build_object('sub', '<UUID>', 'email', '<email>'),
  now(), now(), now());
```

### 1.2 Loop de redireccion al login

**Sintomas**: Despues de login exitoso, la app redirige a /login repetidamente.

**Diagnostico**:
- Puede ocurrir despues de `db:reset` — los refresh tokens en cookies se invalidan
- El middleware detecta sesion invalida y redirige

**Resolucion**:
1. Limpiar cookies del browser para localhost (borrar `sb-*-auth-token*`)
2. Hacer login nuevamente
3. Si persiste, verificar que `.env.local` tiene las keys correctas del `npx supabase status`

**Prevencion**: Despues de `db:reset`, siempre cerrar sesion y limpiar cookies antes de login.

### 1.3 requireAuth() falla en Server Action

**Sintomas**: Server Action retorna error de autenticacion.

**Diagnostico**:
- Verificar que el usuario tiene el rol requerido
- Verificar que `user_metadata` tiene `role` y `company_id`

**Resolucion**:
```sql
-- Verificar metadata
SELECT raw_app_meta_data, raw_user_meta_data FROM auth.users WHERE email = '<email>';

-- Si falta role/company_id en app_metadata:
UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data ||
  '{"role":"admin","company_id":"<UUID>"}'::jsonb
WHERE email = '<email>';
```

---

## 2. Base de datos

### 2.1 Migraciones fallan al aplicar

**Sintomas**: `npx supabase db push` o `db:reset` falla con error SQL.

**Diagnostico**:
- Leer el error — usualmente es una dependencia faltante (enum, tabla referenciada)
- Las migraciones son timestamped y se ejecutan en orden

**Resolucion**:
- Para desarrollo local: `npm run db:reset` (destructivo, re-aplica todo)
- Para produccion: corregir la migracion y ejecutar `npx supabase db push`
- Si es un tipo faltante: verificar que `01_enums.sql` se ejecuta primero

### 2.2 RLS bloquea queries

**Sintomas**: Queries retornan vacio o error de permisos, pero los datos existen.

**Diagnostico**:
```sql
-- Verificar policies activas
SELECT * FROM pg_policies WHERE tablename = '<tabla>';

-- Testear como usuario especifico
SET request.jwt.claims = '{"role":"authenticated","company_id":"<UUID>"}';
SELECT * FROM <tabla>;
```

**Resolucion**: Las policies requieren `company_id` en JWT claims (configurado via `raw_app_meta_data`).

### 2.3 Puertos ocupados (desarrollo local)

**Sintomas**: `npx supabase start` falla con "port already in use".

**Diagnostico**:
```bash
ss -tlnp | grep 5432
```

**Resolucion**:
```bash
npx supabase stop --no-backup
# Si persiste (ghost containers en WSL2):
sudo systemctl stop docker docker.socket containerd
sudo pkill -9 -f containerd-shim-runc-v2
sudo systemctl start docker
npx supabase start
```

---

## 3. Offline y sincronizacion

### 3.1 Dexie no sincroniza

**Sintomas**: Datos offline no se suben al servidor al reconectar.

**Diagnostico**:
- Abrir DevTools > Application > IndexedDB > alquemist-db
- Revisar tabla `syncQueue` — deberia tener items pendientes
- Revisar consola para errores de sync

**Resolucion**:
- Si syncQueue esta vacia: las operaciones no se guardaron offline. Verificar que el componente usa `offlineDb`
- Si syncQueue tiene items con retries > 3: el backoff se agoto. Recargar la pagina fuerza un re-intento
- Si el error es de auth: cerrar sesion, login nuevamente, recargar

### 3.2 Datos duplicados offline

**Sintomas**: Items aparecen duplicados despues de sync.

**Diagnostico**: Puede ocurrir si la misma operacion se encolo multiples veces.

**Resolucion**:
1. Limpiar IndexedDB: DevTools > Application > IndexedDB > Delete database
2. Recargar la pagina — se re-popula desde el servidor
3. Verificar que los botones desactivan durante submit

---

## 4. Performance

### 4.1 Build lento

**Sintomas**: `npm run build` toma mas de 2 minutos.

**Diagnostico**:
```bash
npm run analyze  # Abre bundle analyzer
```

**Resolucion**:
- Verificar que `optimizePackageImports` incluye los paquetes grandes (`lucide-react`, `recharts`)
- Recharts debe cargarse via `next/dynamic` con `ssr: false`
- Imagenes deben usar `next/image` con formatos webp/avif

### 4.2 Pagina carga lento

**Sintomas**: First Contentful Paint > 3s.

**Diagnostico**:
- Chrome DevTools > Performance tab
- Verificar waterfall de requests

**Resolucion**:
- Queries pesadas: usar `Promise.all` para paralelizar en Server Actions
- Componentes grandes: lazy load con `next/dynamic`
- Imagenes: verificar que usan `next/image` con width/height explitos

---

## 5. Deploy (Vercel)

### 5.1 Build falla en Vercel

**Sintomas**: Deploy falla con error de TypeScript o ESLint.

**Diagnostico**: Verificar localmente:
```bash
npm run lint && npm run build
```

**Resolucion**: Corregir errores localmente, push. Verificar que env vars estan configuradas en Vercel dashboard.

### 5.2 Env vars faltantes

**Sintomas**: App desplegada muestra errores de conexion.

**Diagnostico**: Verificar en Vercel > Settings > Environment Variables:

| Variable | Requerida |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Si |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Si |
| `DATABASE_URL` | Si |
| `SUPABASE_SERVICE_ROLE_KEY` | Para admin features |
| `IOT_API_KEY` | Para webhooks IoT |
| `CRON_SECRET` | Para cron jobs |

### 5.3 Migraciones pendientes en produccion

**Sintomas**: Nuevas features no funcionan despues de deploy.

**Resolucion**:
```bash
npx supabase link --project-ref bavpxtnwxvemqmntfnmd
npx supabase db push
```

---

## 6. Alertas y cron jobs

### 6.1 Cron jobs no se ejecutan

**Sintomas**: Alertas de vencimiento/stock/overdue no se generan.

**Diagnostico**:
- Verificar `vercel.json` tiene las rutas de cron configuradas
- Verificar que `CRON_SECRET` esta en Vercel env vars
- Revisar logs de Vercel Functions

**Resolucion**:
- Ejecutar manualmente para verificar:
```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://<domain>/api/cron/overdue-check
curl -H "Authorization: Bearer <CRON_SECRET>" https://<domain>/api/cron/stock-alerts
curl -H "Authorization: Bearer <CRON_SECRET>" https://<domain>/api/cron/expiration-check
```

### 6.2 Alertas duplicadas

**Sintomas**: Misma alerta aparece multiples veces.

**Diagnostico**:
```sql
SELECT entity_type, entity_id, alert_type, COUNT(*)
FROM alerts WHERE resolved_at IS NULL
GROUP BY entity_type, entity_id, alert_type
HAVING COUNT(*) > 1;
```

**Resolucion**: Los cron jobs tienen debounce (no crean si ya existe una alerta abierta del mismo tipo). Si hay duplicados, es un bug — resolver manualmente y revisar la logica de dedup.

---

## 7. IoT y sensores

### 7.1 Webhook IoT no recibe datos

**Sintomas**: Sensores no actualizan lecturas.

**Diagnostico**:
- Verificar que `IOT_API_KEY` coincide entre el sensor y `.env.local`/Vercel
- Testear el endpoint:
```bash
curl -X POST http://localhost:3000/api/webhooks/iot \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <IOT_API_KEY>" \
  -d '{"sensor_id":"<UUID>","readings":{"temperature":23.5,"humidity":65}}'
```

**Resolucion**: Verificar respuesta del endpoint. Si retorna 401, la API key es incorrecta.

### 7.2 Alertas ambientales excesivas

**Sintomas**: Demasiadas alertas de temperatura/humedad.

**Diagnostico**: Los alerts tienen debounce de 30 minutos por sensor.

**Resolucion**:
- Ajustar umbrales de alerta en la configuracion del sensor
- Verificar que los rangos optimos de la zona son correctos

---

## 8. Service Worker / PWA

### 8.1 App no funciona offline

**Sintomas**: Al perder conexion, la app muestra error en lugar de fallback.

**Diagnostico**:
- DevTools > Application > Service Workers — verificar que el SW esta activo
- `npm run build` debe ejecutarse con webpack (no Turbopack)

**Resolucion**:
- En desarrollo: `npm run build && npm start` para testear offline (SW desactivado en dev)
- Verificar que `src/app/sw.ts` existe y compila

### 8.2 Cache desactualizado

**Sintomas**: App muestra version vieja despues de deploy.

**Diagnostico**: El SW usa `skipWaiting` + `clientsClaim` para activarse inmediatamente.

**Resolucion**:
- Recargar la pagina (Ctrl+Shift+R para hard refresh)
- Si persiste: DevTools > Application > Service Workers > Unregister, luego recargar

---

## 9. Supabase Realtime

### 9.1 Suscripciones no reciben updates

**Sintomas**: Cambios en DB no se reflejan en la UI en tiempo real.

**Diagnostico**:
- Verificar que la tabla tiene Realtime habilitado en Supabase Dashboard
- Verificar consola del browser para errores de WebSocket

**Resolucion**:
- En Supabase Dashboard > Database > Replication: habilitar la tabla
- Verificar que el channel manager no tiene dedup issues (cada nombre de canal debe ser unico)

---

## 10. Escalacion

Si un problema no se resuelve con este runbook:

1. Revisar logs de Vercel Functions (Vercel Dashboard > Logs)
2. Revisar logs de Supabase (Supabase Dashboard > Logs)
3. Buscar en `docs/` por documentacion tecnica del modulo afectado
4. Revisar `CLAUDE.md` y `MEMORY.md` por decisiones tecnicas relevantes
