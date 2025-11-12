#!/bin/bash

# Script para configurar el VPS para el despliegue
# Ejecutar este script en el VPS antes del primer despliegue

set -e

echo "=== Setup VPS para Geospatial Incident Platform ==="

# Actualizar sistema
echo "Actualizando sistema..."
sudo apt update
sudo apt upgrade -y

# Instalar Docker
if ! command -v docker &> /dev/null; then
    echo "Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
else
    echo "Docker ya está instalado"
fi

# Instalar Docker Compose
if ! command -v docker compose &> /dev/null; then
    echo "Instalando Docker Compose..."
    sudo apt install -y docker-compose-plugin
else
    echo "Docker Compose ya está instalado"
fi

# Crear directorios necesarios
echo "Creando directorios..."
mkdir -p ~/geospatial-incident-platform
mkdir -p ~/backups

# Configurar firewall (si ufw está instalado)
if command -v ufw &> /dev/null; then
    echo "Configurando firewall..."
    sudo ufw allow 22/tcp      # SSH
    sudo ufw allow 80/tcp      # HTTP
    sudo ufw allow 443/tcp     # HTTPS
    sudo ufw allow 3000/tcp    # Frontend (opcional, para acceso directo)
    sudo ufw allow 4000/tcp    # Backend (opcional, para acceso directo)
    # sudo ufw enable          # Descomentar si quieres habilitar el firewall
fi

# Configurar límites de sistema para PostgreSQL
echo "Configurando límites del sistema..."
if ! grep -q "vm.overcommit_memory" /etc/sysctl.conf; then
    echo "vm.overcommit_memory = 1" | sudo tee -a /etc/sysctl.conf
    sudo sysctl -p
fi

# Instalar utilidades útiles
echo "Instalando utilidades..."
sudo apt install -y git curl wget htop vim

# Configurar log rotation para Docker
if [ ! -f /etc/docker/daemon.json ]; then
    echo "Configurando log rotation de Docker..."
    sudo mkdir -p /etc/docker
    sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
    sudo systemctl restart docker
fi

echo ""
echo "=== Setup completado ==="
echo ""
echo "Próximos pasos:"
echo "1. Cerrar sesión y volver a iniciar para que los cambios de Docker tengan efecto"
echo "2. Configurar las variables de entorno en los archivos .env"
echo "3. Configurar los GitHub Secrets según DEPLOYMENT.md"
echo ""
echo "IMPORTANTE: Asegúrate de agregar tu clave SSH pública a ~/.ssh/authorized_keys"
