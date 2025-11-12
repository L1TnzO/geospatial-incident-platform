# GitHub Actions Workflows

Este directorio contiene los workflows de CI/CD para el proyecto.

## Workflows Disponibles

### deploy.yml - CI/CD Principal

Workflow automático que se ejecuta en cada push a la rama `master`.

**Stages:**

1. **Test** - Ejecuta todos los tests
   - Lint (código limpio)
   - Tests unitarios del servidor
   - Tests de integración del servidor
   - Tests del cliente

2. **Deploy** - Despliega al VPS (solo si los tests pasan)
   - Crea paquete de despliegue
   - Copia archivos al VPS vía SSH
   - Crea backup de versión anterior
   - Despliega con Docker Compose
   - Ejecuta migraciones de base de datos
   - Verifica salud de la aplicación

## Configuración Requerida

### GitHub Secrets

Para que el workflow funcione, debes configurar estos 3 secrets:

| Secret | Descripción | Ejemplo |
|--------|-------------|---------|
| `VPS_SSH_PRIVATE_KEY` | Clave SSH privada para acceder al VPS | Contenido completo de `~/.ssh/vps_deploy_key` |
| `VPS_HOST` | IP o dominio del VPS | `200.13.4.202` |
| `VPS_USER` | Usuario SSH del VPS | `hito3` |

### Generar Claves SSH

```bash
# En tu máquina local
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/vps_deploy_key -N ""

# Copiar clave pública al VPS
ssh-copy-id -i ~/.ssh/vps_deploy_key.pub usuario@ip-del-vps

# Obtener clave privada para GitHub Secret
cat ~/.ssh/vps_deploy_key
```

## Solución de Problemas Comunes

### Error: "tar: file changed as we read it"

**Síntoma:**
```
tar: .: file changed as we read it
Error: Process completed with exit code 1
```

**Causa:** Archivos temporales o logs siendo escritos durante la creación del tar.

**Solución:** Ya implementada con:
- `--warning=no-file-changed` - Ignora advertencias de archivos cambiados
- `|| [ $? -eq 1 ]` - Permite exit code 1 (solo advertencia, no error fatal)
- Exclusión de archivos temporales: `*.log`, `.npm`, `coverage`

### Error: "Permission denied (publickey)"

**Síntoma:**
```
Permission denied (publickey).
```

**Causa:** Clave SSH no configurada correctamente.

**Solución:**
1. Verifica que el secret `VPS_SSH_PRIVATE_KEY` contenga la clave completa
2. Asegúrate de incluir las líneas `-----BEGIN` y `-----END`
3. Verifica que la clave pública esté en `~/.ssh/authorized_keys` del VPS

### Tests Fallan en CI

**Síntoma:**
```
Test Suites: X failed, Y passed
```

**Solución:**
1. Ejecuta los tests localmente: `npm run test:server`
2. Verifica que la base de datos de prueba esté configurada
3. Revisa los logs del workflow en GitHub Actions

### Deploy Falla pero Tests Pasan

**Posibles causas:**
- VPS no accesible
- Docker no instalado en el VPS
- Permisos incorrectos en el VPS
- Variables de entorno faltantes

**Solución:**
1. Verifica conexión: `ssh usuario@ip-del-vps`
2. Verifica Docker: `ssh usuario@ip-del-vps "docker --version"`
3. Revisa logs del workflow en la sección "Deploy on VPS"

## Archivos Excluidos del Deploy

El paquete de despliegue **NO incluye**:

- `node_modules/` - Se reinstalarán en el VPS
- `.git/` - No necesario en producción
- `.github/` - Workflows solo para CI/CD
- `.venv/` - Entorno virtual Python
- `data/generated/` - Datos generados localmente
- `data/bulk_load_batch/` - Datos de carga masiva
- `.husky/` - Git hooks solo para desarrollo
- `*.log` - Archivos de log
- `.npm/` - Cache de npm
- `coverage/` - Reportes de cobertura

## Ejecución Manual

Puedes ejecutar el workflow manualmente desde GitHub:

1. Ve a **Actions** en tu repositorio
2. Selecciona **Deploy to VPS**
3. Click en **Run workflow**
4. Selecciona la rama `master`
5. Click en **Run workflow**

## Variables de Entorno

El workflow usa estas variables:

- `NODE_VERSION: '20'` - Versión de Node.js para los tests
- `DATABASE_URL` - URL de PostgreSQL para tests (auto-configurada)
- `NODE_ENV: test` - Modo de ejecución para tests

## Monitoreo

Después de cada despliegue:

1. Verifica los logs en GitHub Actions
2. Accede a la aplicación:
   - Frontend: `http://<VPS_HOST>:3000`
   - Backend: `http://<VPS_HOST>:4000`
   - Health: `http://<VPS_HOST>:4000/health`
3. Verifica contenedores en el VPS: `ssh usuario@vps "cd ~/geospatial-incident-platform && docker compose ps"`

## Backups

El workflow crea automáticamente backups antes de cada despliegue:

- Ubicación: `~/backups/backup_YYYYMMDD_HHMMSS.tar.gz` en el VPS
- Retención: Últimos 5 backups
- Rotación: Automática

### Restaurar Backup

```bash
# Conectarse al VPS
ssh usuario@vps

# Listar backups
ls -lh ~/backups/

# Restaurar
cd ~/geospatial-incident-platform
docker compose down
rm -rf *
tar -xzf ~/backups/backup_YYYYMMDD_HHMMSS.tar.gz
docker compose up -d
```

## Documentación Adicional

- **Guía Completa**: `docs/DEPLOYMENT.md`
- **Guía Rápida**: `QUICK_DEPLOY_SETUP.md`
- **Resumen Técnico**: `CI_CD_SETUP_README.md`

## Mejoras Futuras

- [ ] Notificaciones por Slack/Discord en fallos
- [ ] Deploy a múltiples entornos (staging, production)
- [ ] Tests E2E con Playwright
- [ ] Análisis de seguridad con Snyk
- [ ] Cache de dependencias para builds más rápidos
- [ ] Deploy con rollback automático en caso de fallo
- [ ] Health checks más robustos post-deploy
