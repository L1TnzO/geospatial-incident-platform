# Configuración Rápida de CI/CD - VPS

## 📋 Resumen

Esta guía te ayudará a configurar el despliegue automático en **5 pasos**.

**Datos del VPS:**
- IP: `200.13.4.202`
- Usuario: `hito3`
- Password: `cxzdsaewq3`

---

## 🚀 Configuración Rápida

### Paso 1: Generar Clave SSH (En tu máquina local)

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/vps_deploy_key -N ""
```

✅ Esto crea dos archivos:
- `~/.ssh/vps_deploy_key` (privada - para GitHub)
- `~/.ssh/vps_deploy_key.pub` (pública - para el VPS)

### Paso 2: Copiar Clave al VPS

```bash
ssh-copy-id -i ~/.ssh/vps_deploy_key.pub hito3@200.13.4.202
# Ingresa la contraseña: cxzdsaewq3
```

### Paso 3: Configurar VPS

```bash
# Conectarse al VPS
ssh hito3@200.13.4.202

# Actualizar sistema e instalar Docker
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo apt install -y docker-compose-plugin

# Crear directorios
mkdir -p ~/geospatial-incident-platform
mkdir -p ~/backups

# Cerrar sesión y volver a conectar para que Docker funcione
exit
```

### Paso 4: Configurar GitHub Secrets

Ve a: `https://github.com/TU-USUARIO/geospatial-incident-platform/settings/secrets/actions`

Crea estos 3 secrets:

#### Secret 1: `VPS_SSH_PRIVATE_KEY`
```bash
# En tu máquina local, obtén la clave privada:
cat ~/.ssh/vps_deploy_key
```
Copia TODO el contenido (incluye `-----BEGIN` y `-----END`)

#### Secret 2: `VPS_HOST`
```
200.13.4.202
```

#### Secret 3: `VPS_USER`
```
hito3
```

### Paso 5: Hacer Push y Desplegar

```bash
# En tu repositorio local
git add .
git commit -m "Add CI/CD deployment workflow"
git push origin master
```

✅ El despliegue se ejecutará automáticamente!

---

## 🔍 Verificar Despliegue

1. **Ver progreso en GitHub:**
   - Ve a `Actions` en tu repositorio
   - Observa el workflow "Deploy to VPS"

2. **Acceder a la aplicación:**
   - Frontend: http://200.13.4.202:3000
   - Backend: http://200.13.4.202:4000
   - Health: http://200.13.4.202:4000/health

3. **Verificar en el VPS:**
```bash
ssh hito3@200.13.4.202
cd ~/geospatial-incident-platform
docker compose ps
```

---

## ⚙️ Configuración Opcional (Recomendada)

### Variables de Entorno en el VPS

```bash
ssh hito3@200.13.4.202
cd ~/geospatial-incident-platform

# PostgreSQL
nano infra/docker/.env.postgis
```

```env
POSTGRES_USER=gis_prod
POSTGRES_PASSWORD=cambiar_por_password_seguro
POSTGRES_DB=gis_production
```

```bash
# Backend
nano infra/docker/.env.backend
```

```env
NODE_ENV=production
PORT=4000
DATABASE_HOST=db
DATABASE_PORT=5432
DATABASE_NAME=gis_production
DATABASE_USER=gis_prod
DATABASE_PASSWORD=cambiar_por_password_seguro
DATABASE_URL=postgresql://gis_prod:cambiar_por_password_seguro@db:5432/gis_production
JWT_SECRET=cambiar_por_jwt_secret_seguro_aleatorio
CORS_ORIGIN=http://200.13.4.202:3000
```

```bash
# Frontend
nano infra/docker/.env.frontend
```

```env
VITE_API_BASE_URL=http://200.13.4.202:4000
```

Luego reinicia:
```bash
docker compose down
docker compose up -d
```

---

## 🛠️ Comandos Útiles

```bash
# Ver estado
docker compose ps

# Ver logs
docker compose logs -f

# Reiniciar
docker compose restart

# Acceder a la base de datos
docker compose exec db psql -U gis_prod -d gis_production

# Ver backups
ls -lh ~/backups/
```

---

## ❌ Solución de Problemas Comunes

### Error: "Permission denied (publickey)"
```bash
# Verificar clave en el VPS
ssh hito3@200.13.4.202 "cat ~/.ssh/authorized_keys"
```

### Contenedores no inician
```bash
ssh hito3@200.13.4.202
cd ~/geospatial-incident-platform
docker compose logs
```

### Frontend no se conecta al backend
```bash
# Verificar variable de entorno
docker compose exec frontend env | grep VITE_API
# Debe mostrar: VITE_API_BASE_URL=http://200.13.4.202:4000
```

---

## 📚 Documentación Completa

Para más detalles, consulta: `docs/DEPLOYMENT.md`

---

## ✅ Checklist de Configuración

- [ ] Clave SSH generada
- [ ] Clave SSH copiada al VPS
- [ ] Docker instalado en el VPS
- [ ] GitHub Secrets configurados (3 secrets)
- [ ] Push a master realizado
- [ ] Workflow ejecutado exitosamente
- [ ] Aplicación accesible en http://200.13.4.202:3000
- [ ] Variables de entorno configuradas (opcional pero recomendado)

---

**¡Listo!** 🎉 Tu aplicación ahora se despliega automáticamente con cada push a master.
