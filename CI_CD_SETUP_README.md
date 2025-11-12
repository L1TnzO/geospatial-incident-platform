# 🚀 CI/CD Setup - Resumen de Archivos Creados

## Archivos Creados

### 1. GitHub Actions Workflow
- **Archivo**: `.github/workflows/deploy.yml`
- **Descripción**: Workflow de CI/CD que ejecuta tests y despliega automáticamente en el VPS
- **Trigger**: Push a la rama `master` o ejecución manual

### 2. Script de Setup del VPS
- **Archivo**: `infra/scripts/setup-vps.sh`
- **Descripción**: Script bash para configurar el VPS con Docker, Docker Compose y dependencias
- **Uso**: Ejecutar una sola vez en el VPS antes del primer despliegue

### 3. Documentación Completa
- **Archivo**: `docs/DEPLOYMENT.md`
- **Descripción**: Guía detallada del proceso de despliegue con todos los pasos
- **Incluye**: Troubleshooting, configuración avanzada, seguridad, monitoreo

### 4. Guía Rápida
- **Archivo**: `QUICK_DEPLOY_SETUP.md`
- **Descripción**: Guía de configuración rápida en 5 pasos
- **Uso**: Para configuración inicial rápida

### 5. Archivos de Ejemplo de Variables de Entorno
- **Archivos**:
  - `infra/docker/.env.postgis.example`
  - `infra/docker/.env.backend.example`
  - `infra/docker/.env.frontend.example`
- **Descripción**: Plantillas de configuración para cada servicio

---

## 📋 Próximos Pasos

### En GitHub (Configuración de Secrets)

Necesitas configurar estos **3 secrets** en tu repositorio de GitHub:

1. Ve a: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

2. Crea los siguientes secrets:

| Secret Name | Valor | Descripción |
|-------------|-------|-------------|
| `VPS_SSH_PRIVATE_KEY` | Contenido de `~/.ssh/vps_deploy_key` | Clave privada SSH para conectarse al VPS |
| `VPS_HOST` | `200.13.4.202` | IP del VPS |
| `VPS_USER` | `hito3` | Usuario del VPS |

### Cómo Obtener la Clave SSH

```bash
# 1. Generar el par de claves (en tu máquina local)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/vps_deploy_key -N ""

# 2. Copiar la clave pública al VPS
ssh-copy-id -i ~/.ssh/vps_deploy_key.pub hito3@200.13.4.202
# (Ingresa la contraseña: cxzdsaewq3)

# 3. Obtener la clave PRIVADA para GitHub Secrets
cat ~/.ssh/vps_deploy_key
# Copia TODO el contenido (incluye BEGIN y END)
```

---

## 🔧 Configuración del Secret VPS_SSH_PRIVATE_KEY

La clave privada se verá algo así:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
[... muchas líneas más ...]
AAAAHZ2l0aHViLWFjdGlvbnMtZGVwbG95AQ==
-----END OPENSSH PRIVATE KEY-----
```

**IMPORTANTE**: 
- ✅ Copia TODO el contenido (incluye las líneas BEGIN y END)
- ✅ No agregues espacios ni saltos de línea extra
- ✅ Asegúrate de copiar desde `-----BEGIN` hasta `-----END`

---

## 🎯 Workflow del Despliegue

```mermaid
graph LR
    A[Push a master] --> B[Tests]
    B --> C{Tests OK?}
    C -->|Sí| D[Crear Paquete]
    C -->|No| E[Fallar CI/CD]
    D --> F[Copiar al VPS]
    F --> G[Backup Anterior]
    G --> H[Extraer Nuevo]
    H --> I[Docker Compose]
    I --> J[Migraciones]
    J --> K[Health Check]
    K --> L[Despliegue OK]
```

---

## 📍 URLs de Acceso

Después del despliegue exitoso, la aplicación estará disponible en:

- **Frontend**: http://200.13.4.202:3000
- **Backend API**: http://200.13.4.202:4000
- **Health Check**: http://200.13.4.202:4000/health
- **Database**: Accesible solo desde el VPS (puerto 5432 interno)

---

## 🛡️ Seguridad - IMPORTANTE

### Antes de Producción, debes:

1. **Cambiar todas las contraseñas**:
   - Password de PostgreSQL
   - JWT_SECRET
   - Usuario y contraseña del VPS (opcional)

2. **Configurar HTTPS**:
   - Instalar Nginx en el VPS
   - Configurar certificado SSL con Let's Encrypt
   - Redirigir todo el tráfico a HTTPS

3. **Firewall**:
   ```bash
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw enable
   ```

4. **Backups Automáticos**:
   - Configurar backups periódicos de la base de datos
   - Los backups del código ya están configurados en el workflow

---

## 📊 Monitoreo

### Ver logs del despliegue en GitHub:
1. Ve a tu repositorio en GitHub
2. Click en **Actions**
3. Selecciona el workflow más reciente

### Ver logs en el VPS:
```bash
ssh hito3@200.13.4.202
cd ~/geospatial-incident-platform
docker compose logs -f
```

---

## 🔄 Proceso de Despliegue Típico

1. **Desarrollar** cambios en tu rama local
2. **Commit** y **Push** a `master`:
   ```bash
   git add .
   git commit -m "feat: nueva funcionalidad"
   git push origin master
   ```
3. **GitHub Actions** se ejecuta automáticamente:
   - Ejecuta tests
   - Si pasan, despliega al VPS
4. **Verificar** en http://200.13.4.202:3000

---

## 📚 Documentación de Referencia

- **Guía Rápida**: `QUICK_DEPLOY_SETUP.md` (5 pasos)
- **Guía Completa**: `docs/DEPLOYMENT.md` (detallada)
- **Este archivo**: Resumen y referencia rápida

---

## ✅ Checklist Pre-Despliegue

Antes de hacer el primer push a master, verifica:

- [ ] Secrets de GitHub configurados (3 secrets)
- [ ] Clave SSH generada y copiada al VPS
- [ ] Docker instalado en el VPS
- [ ] Directorios creados en el VPS
- [ ] Variables de entorno configuradas en el VPS (opcional al inicio)
- [ ] Workflow de GitHub Actions revisado

---

## 🆘 Soporte y Troubleshooting

Si algo no funciona:

1. **Revisa los logs de GitHub Actions** (tab Actions en GitHub)
2. **Revisa los logs del VPS**: `docker compose logs -f`
3. **Consulta**: `docs/DEPLOYMENT.md` sección "Solución de Problemas"
4. **Verifica la conectividad SSH**: `ssh -i ~/.ssh/vps_deploy_key hito3@200.13.4.202`

---

## 🎉 ¡Listo!

Ahora tienes un pipeline de CI/CD completamente funcional que:
- ✅ Ejecuta tests automáticamente
- ✅ Despliega solo si los tests pasan
- ✅ Crea backups antes de cada despliegue
- ✅ Ejecuta migraciones automáticamente
- ✅ Verifica la salud de la aplicación

**¡Feliz despliegue!** 🚀
