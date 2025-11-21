#!/bin/bash

# Script para configurar el VPS para el despliegue
# Ejecutar este script en el VPS antes del primer despliegue o como parte del CI/CD

set -e

export DEBIAN_FRONTEND=noninteractive

echo "=== Setup VPS para Geospatial Incident Platform ==="

# Actualizar sistema
echo "Actualizando repositorios..."
# Retry apt update up to 3 times to handle transient mirror issues
for i in {1..3}; do
    if sudo apt-get update --allow-releaseinfo-change; then
        echo "Apt update successful on attempt $i"
        break
    else
        echo "Apt update failed on attempt $i"
        if [ $i -eq 3 ]; then
            echo "Apt update failed after 3 attempts, continuing anyway..."
        else
            echo "Cleaning apt cache and retrying..."
            sudo apt-get clean
            sudo rm -rf /var/lib/apt/lists/*
            sleep 5
        fi
    fi
done
# sudo apt-get upgrade -y  # Comentado para evitar tiempos largos y prompts interactivos en CI/CD, descomentar si se desea

# Instalar utilidades básicas
echo "Instalando utilidades..."
sudo apt-get install -y git curl wget htop vim

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

# Instalar Docker Compose Plugin (si no vino con el script de docker)
if ! docker compose version &> /dev/null; then
    echo "Instalando Docker Compose Plugin..."
    sudo apt-get install -y docker-compose-plugin
else
    echo "Docker Compose ya está instalado"
fi

# Crear directorios necesarios
echo "Creando directorios..."
mkdir -p ~/geospatial-incident-platform
mkdir -p ~/backups

# Configurar firewall (si ufw está instalado y activo)
if command -v ufw &> /dev/null; then
    echo "Configurando reglas de firewall (UFW)..."
    # No habilitamos ufw automáticamente para no bloquearnos fuera, solo agregamos reglas
    sudo ufw allow 22/tcp      # SSH
    sudo ufw allow 80/tcp      # HTTP
    sudo ufw allow 443/tcp     # HTTPS
    sudo ufw allow 3000/tcp    # Frontend
    sudo ufw allow 4000/tcp    # Backend
    sudo ufw allow 5432/tcp    # Postgres (Cuidado: idealmente restringir a IP de App)
fi

# Configurar límites de sistema para PostgreSQL
echo "Configurando límites del sistema..."
if ! grep -q "vm.overcommit_memory" /etc/sysctl.conf; then
    echo "vm.overcommit_memory = 1" | sudo tee -a /etc/sysctl.conf
    sudo sysctl -p
fi

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

echo "=== Setup completado ==="
