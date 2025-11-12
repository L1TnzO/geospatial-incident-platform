# Guía de Despliegue en VPS

Esta guía explica cómo configurar el despliegue automático de la aplicación Geospatial Incident Platform en un VPS usando GitHub Actions.

## Índice

1. [Requisitos Previos](#requisitos-previos)
2. [Configuración del VPS](#configuración-del-vps)
3. [Configuración de GitHub](#configuración-de-github)
4. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
5. [Proceso de Despliegue](#proceso-de-despliegue)
6. [Solución de Problemas](#solución-de-problemas)

## Requisitos Previos

- VPS con Ubuntu 20.04+ o Debian 11+
- Acceso SSH al VPS
- Cuenta de GitHub con permisos de administrador en el repositorio
- Al menos 2GB de RAM en el VPS
- Al menos 20GB de espacio en disco

## Configuración del VPS

### 1. Conexión Inicial al VPS

```bash
ssh hito3@200.13.4.202
# Contraseña: cxzdsaewq3
```

### 2. Ejecutar Script de Setup

Copia y ejecuta el script de configuración:

```bash
# Descargar el script desde el repositorio
wget https://raw.githubusercontent.com/TU-USUARIO/geospatial-incident-platform/master/infra/scripts/setup-vps.sh

# O crear el archivo manualmente y copiar el contenido
nano setup-vps.sh

# Dar permisos de ejecución
chmod +x setup-vps.sh

# Ejecutar el script
./setup-vps.sh
```

### 3. Generar Par de Claves SSH

**En tu máquina local**, genera un par de claves SSH para el despliegue:

```bash
# Generar nueva clave SSH (sin passphrase para automatización)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/vps_deploy_key -N ""

# Esto creará dos archivos:
# ~/.ssh/vps_deploy_key (clave privada - para GitHub Secrets)
# ~/.ssh/vps_deploy_key.pub (clave pública - para el VPS)
```

### 4. Agregar Clave Pública al VPS

```bash
# En tu máquina local, copia la clave pública al VPS
ssh-copy-id -i ~/.ssh/vps_deploy_key.pub hito3@200.13.4.202

# O manualmente:
cat ~/.ssh/vps_deploy_key.pub
# Copia el contenido y luego en el VPS:
# mkdir -p ~/.ssh
# echo "CONTENIDO_DE_LA_CLAVE_PUBLICA" >> ~/.ssh/authorized_keys
# chmod 600 ~/.ssh/authorized_keys
# chmod 700 ~/.ssh
```

### 5. Probar Conexión SSH

```bash
# En tu máquina local
ssh -i ~/.ssh/vps_deploy_key hito3@200.13.4.202
# Deberías conectarte sin solicitar contraseña
```

### 6. Configurar Variables de Entorno en el VPS

```bash
# Conectarse al VPS
ssh hito3@200.13.4.202

# Navegar al directorio del proyecto
cd ~/geospatial-incident-platform

# Crear y editar archivo de entorno para PostgreSQL
nano infra/docker/.env.postgis
```

Contenido sugerido para `.env.postgis`:

```env
POSTGRES_USER=gis_prod
POSTGRES_PASSWORD=TU_PASSWORD_SEGURO_AQUI
POSTGRES_DB=gis_production
POSTGRES_INITDB_ARGS=--encoding=UTF8 --locale=en_US.utf8
```

Crear archivo para el backend:

```bash
nano infra/docker/.env.backend
```

Contenido sugerido para `.env.backend`:

```env
NODE_ENV=production
PORT=4000
DATABASE_HOST=db
DATABASE_PORT=5432
DATABASE_NAME=gis_production
DATABASE_USER=gis_prod
DATABASE_PASSWORD=TU_PASSWORD_SEGURO_AQUI
DATABASE_URL=postgresql://gis_prod:TU_PASSWORD_SEGURO_AQUI@db:5432/gis_production
JWT_SECRET=TU_JWT_SECRET_SEGURO_AQUI
CORS_ORIGIN=http://200.13.4.202:3000,http://localhost:3000
```

Crear archivo para el frontend:

```bash
nano infra/docker/.env.frontend
```

Contenido sugerido para `.env.frontend`:

```env
VITE_API_BASE_URL=http://200.13.4.202:4000
VITE_MAP_CENTER_LAT=40.7128
VITE_MAP_CENTER_LNG=-74.0060
VITE_MAP_DEFAULT_ZOOM=11
```

## Configuración de GitHub

### 1. Obtener la Clave Privada SSH

```bash
# En tu máquina local
cat ~/.ssh/vps_deploy_key
```

Copia **TODO** el contenido de la clave privada, incluyendo:
- `-----BEGIN OPENSSH PRIVATE KEY-----`
- Todo el contenido del medio
- `-----END OPENSSH PRIVATE KEY-----`

### 2. Configurar GitHub Secrets

Ve a tu repositorio en GitHub:
1. Click en **Settings** (Configuración)
2. En el menú lateral, click en **Secrets and variables** > **Actions**
3. Click en **New repository secret**

Crea los siguientes secrets:

#### Secret 1: VPS_SSH_PRIVATE_KEY
- **Name:** `VPS_SSH_PRIVATE_KEY`
- **Value:** Pega el contenido completo de la clave privada (incluye BEGIN y END)

#### Secret 2: VPS_HOST
- **Name:** `VPS_HOST`
- **Value:** `200.13.4.202`

#### Secret 3: VPS_USER
- **Name:** `VPS_USER`
- **Value:** `hito3`

### 3. Verificar Secrets Configurados

Deberías tener estos tres secrets:
- ✅ VPS_SSH_PRIVATE_KEY
- ✅ VPS_HOST
- ✅ VPS_USER

## Proceso de Despliegue

### Despliegue Automático

El despliegue se ejecuta automáticamente cuando:
- Haces push a la rama `master`
- O ejecutas manualmente el workflow desde GitHub Actions

### Despliegue Manual

1. Ve a tu repositorio en GitHub
2. Click en **Actions**
3. Selecciona el workflow **Deploy to VPS**
4. Click en **Run workflow**
5. Selecciona la rama `master`
6. Click en **Run workflow**

### Fases del Despliegue

El workflow ejecuta las siguientes fases:

1. **Test**: 
   - Ejecuta linters
   - Ejecuta tests del servidor
   - Ejecuta tests del cliente

2. **Deploy** (solo si los tests pasan):
   - Crea un paquete de despliegue
   - Copia archivos al VPS
   - Crea backup de la versión anterior
   - Extrae nuevos archivos
   - Reinicia contenedores Docker
   - Ejecuta migraciones de base de datos
   - Verifica salud de la aplicación

## Acceso a la Aplicación

Después del despliegue exitoso:

- **Frontend:** http://200.13.4.202:3000
- **Backend API:** http://200.13.4.202:4000
- **Health Check:** http://200.13.4.202:4000/health

## Comandos Útiles en el VPS

```bash
# Ver estado de los contenedores
cd ~/geospatial-incident-platform
docker compose ps

# Ver logs de todos los servicios
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db

# Reiniciar servicios
docker compose restart

# Detener servicios
docker compose down

# Iniciar servicios
docker compose up -d

# Acceder a la base de datos
docker compose exec db psql -U gis_prod -d gis_production

# Ver uso de recursos
docker stats

# Ejecutar migraciones manualmente
docker compose exec backend npm run migrate:up

# Ver backups disponibles
ls -lh ~/backups/
```

## Configuración de Nginx (Opcional)

Para servir la aplicación en el puerto 80 con un dominio:

```bash
# Instalar Nginx
sudo apt install nginx

# Crear configuración
sudo nano /etc/nginx/sites-available/geospatial-incident
```

Contenido:

```nginx
server {
    listen 80;
    server_name 200.13.4.202;  # O tu dominio

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:4000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activar configuración:

```bash
sudo ln -s /etc/nginx/sites-available/geospatial-incident /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Solución de Problemas

### Error: "Permission denied (publickey)"

```bash
# Verificar que la clave pública está en el VPS
ssh hito3@200.13.4.202 "cat ~/.ssh/authorized_keys"

# Verificar permisos
ssh hito3@200.13.4.202 "chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

### Los contenedores no inician

```bash
# Ver logs detallados
cd ~/geospatial-incident-platform
docker compose logs

# Verificar archivos de entorno
ls -la infra/docker/.env.*

# Reiniciar desde cero
docker compose down -v
docker compose up -d
```

### Base de datos no se conecta

```bash
# Verificar que el contenedor está corriendo
docker compose ps db

# Verificar logs de PostgreSQL
docker compose logs db

# Probar conexión
docker compose exec db pg_isready -U gis_prod
```

### Frontend no se conecta al backend

```bash
# Verificar variables de entorno del frontend
docker compose exec frontend env | grep VITE

# Reconstruir frontend con nuevas variables
docker compose up -d --force-recreate frontend
```

### Restaurar backup anterior

```bash
# Listar backups
ls -lh ~/backups/

# Restaurar backup
cd ~/geospatial-incident-platform
docker compose down
rm -rf *
tar -xzf ~/backups/backup_TIMESTAMP.tar.gz
docker compose up -d
```

## Monitoreo

### Logs de GitHub Actions

- Ve a **Actions** en tu repositorio
- Selecciona el workflow de despliegue más reciente
- Revisa los logs de cada paso

### Logs del Sistema

```bash
# Ver logs del sistema
sudo journalctl -f

# Ver logs de Docker
sudo journalctl -u docker -f
```

## Seguridad

### Recomendaciones:

1. **Cambiar contraseñas por defecto** en todos los archivos `.env`
2. **Habilitar firewall** (`ufw`) si no está activo
3. **Configurar SSL/TLS** con Let's Encrypt para HTTPS
4. **Limitar acceso SSH** solo a IPs conocidas
5. **Mantener sistema actualizado** regularmente
6. **Usar contraseñas fuertes** para PostgreSQL y JWT
7. **Habilitar backups automáticos** de la base de datos

## Próximos Pasos

1. Configurar dominio personalizado (opcional)
2. Configurar SSL con Let's Encrypt
3. Configurar backups automáticos de base de datos
4. Configurar monitoreo y alertas
5. Optimizar rendimiento de PostgreSQL
6. Configurar CDN para assets estáticos (opcional)

## Soporte

Para problemas o preguntas:
- Revisar logs en GitHub Actions
- Revisar logs en el VPS
- Consultar documentación de Docker Compose
- Abrir un issue en el repositorio
