# VPS Database Setup Guide

Esta guía explica cómo configurar correctamente la base de datos en un servidor VPS nuevo o después de un reset completo.

## Problema Común

Si ves este error al cargar datos:
```
ERROR: null value in column "type_id" of relation "incidents" violates not-null constraint
```

Significa que las **tablas de referencia** (lookup tables) están vacías. Necesitas ejecutar las migraciones y seeds primero.

## Orden de Setup Correcto

### 1. Iniciar los contenedores

```bash
make compose-up
```

Espera a que todos los contenedores estén saludables (especialmente `db`).

### 2. Ejecutar migraciones y seeds

```bash
make db-init
```

Este comando:
- ✅ Ejecuta todas las migraciones (crea las tablas)
- ✅ Ejecuta los seeds (llena las tablas de referencia: incident_types, severities, statuses, etc.)

### 3. Cargar datos masivos (opcional)

Si tienes datos CSV generados en `data/bulk_load_batch/`:

```bash
make db-load-data
```

### 4. Setup completo (todo en uno)

Para hacer todo de una vez (migraciones + seeds + carga de datos):

```bash
make db-setup-full
```

## Comandos Útiles

| Comando | Descripción |
|---------|-------------|
| `make db-init` | Migraciones + seeds (tablas de referencia) |
| `make db-load-data` | Carga masiva de datos CSV |
| `make db-setup-full` | Todo: init + load data |
| `make db-reset` | Reinicia la BD (rollback + up + seed) |
| `make db-shell` | Abre una shell de PostgreSQL |
| `make db-migrate` | Solo migraciones (sin seed) |
| `make db-seed` | Solo seeds (requiere migraciones previas) |

## Verificación

Para verificar que las tablas de referencia tienen datos:

```bash
make db-shell
```

Luego en psql:
```sql
SELECT COUNT(*) FROM incident_types;      -- Debería ser 8
SELECT COUNT(*) FROM incident_severities; -- Debería ser 5
SELECT COUNT(*) FROM incident_statuses;   -- Debería ser 5
SELECT COUNT(*) FROM incident_sources;    -- Debería ser 6
SELECT COUNT(*) FROM weather_conditions;  -- Debería ser 5
```

## Tablas de Referencia Requeridas

Estas tablas **DEBEN** tener datos antes de cargar incidentes:

1. **incident_types** - Tipos de incidentes (FIRE_STRUCTURE, FIRE_WILDLAND, etc.)
2. **incident_severities** - Severidades (LOW, MODERATE, HIGH, CRITICAL, SEVERE)
3. **incident_statuses** - Estados (REPORTED, DISPATCHED, ON_SCENE, RESOLVED, CANCELLED)
4. **incident_sources** - Fuentes de reporte (911, FIRE_ALARM, etc.)
5. **weather_conditions** - Condiciones climáticas (CLEAR, RAIN, SNOW, etc.)

## Arquitectura del Proceso de Carga

```
┌─────────────────────────────────────────────────────┐
│ 1. make db-init                                     │
│    ├── Migraciones (crear tablas)                   │
│    └── Seeds (llenar tablas de referencia)          │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 2. make db-load-data                                │
│    ├── Crear schema staging                         │
│    ├── Copiar CSVs a staging                        │
│    ├── INSERT con JOINs a tablas de referencia      │
│    └── Validación                                   │
└─────────────────────────────────────────────────────┘
```

## Troubleshooting

### Error: "schema 'staging' does not exist"
✅ **Normal** - El script lo crea automáticamente.

### Error: "null value in column 'type_id'"
❌ **Problema** - No ejecutaste `make db-init` primero.
🔧 **Solución**: 
```bash
make db-init
make db-load-data
```

### Error: "Read-only file system" en el log
⚠️ **Warning** - No es crítico, solo afecta el archivo de log dentro del contenedor.

### Los datos se cargan pero las tablas están vacías
🔍 **Verificar**: ¿Hubo un error en la transacción?
```bash
make db-shell
SELECT COUNT(*) FROM incidents;
```

## Monitoreo

Para ver logs en tiempo real:
```bash
make compose-logs
```

Para ver solo los últimos 50 logs:
```bash
make logs-tail
```

## Flujo Completo para VPS Nueva

```bash
# 1. Clonar repo
git clone <repo-url>
cd geospatial-incident-platform

# 2. Configurar variables de entorno
cp infra/docker/.env.postgis.example infra/docker/.env.postgis
cp infra/docker/.env.backend.example infra/docker/.env.backend
cp infra/docker/.env.frontend.example infra/docker/.env.frontend

# 3. Iniciar contenedores
make compose-up

# 4. Setup completo de BD
make db-setup-full

# 5. Verificar
make db-shell
# En psql: SELECT COUNT(*) FROM incidents;
```

## Notas Importantes

- ⚠️ `make db-reset` **elimina todos los datos**
- 📦 Los CSVs deben estar en `data/bulk_load_batch/`
- 🔄 El load pipeline usa transacciones - si falla, no se guarda nada
- 📊 El script de carga incluye validaciones automáticas al final
