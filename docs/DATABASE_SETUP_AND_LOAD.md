# Guía de Configuración y Carga de Datos (PostgreSQL)

Esta documentación detalla el proceso para configurar, generar y cargar datos en el nodo de Base de Datos (VPS 2) en la nueva arquitectura de dos servidores.

## Arquitectura

- **VPS 1 (App)**: Frontend + Backend
- **VPS 2 (DB)**: PostgreSQL + PostGIS

Esta guía se centra exclusivamente en el **VPS 2 (DB)**.

## 1. Preparación del VPS de Base de Datos

### Requisitos Previos
El servidor debe tener instalado:
- **Docker** y **Docker Compose**
- **Python 3.10+** y **pip** (para generar datos sintéticos)
- **Git** (opcional, para clonar el repo)

### Estructura de Archivos Necesaria
En el VPS de base de datos, asegúrate de tener la siguiente estructura de archivos (puedes clonar el repositorio o copiar solo lo necesario):

```text
geospatial-incident-platform/
├── docker-compose.yml
├── infra/
│   └── docker/
│       └── .env.postgis.example
├── tools/
│   ├── bulk_load/          # Scripts de carga y SQL
│   └── data_generator/     # Scripts de generación de datos
└── data/                   # Directorio para datos generados (se creará)
```

### Configuración de Variables de Entorno
Crea el archivo `.env` o configura las variables directamente. Para la base de datos, asegúrate de usar el archivo de ejemplo como base:

```bash
cp infra/docker/.env.postgis.example infra/docker/.env.postgis
# Edita el archivo si es necesario cambiar contraseñas o usuarios
nano infra/docker/.env.postgis
```

## 2. Iniciar el Servicio de Base de Datos

Ejecuta el contenedor de base de datos. Usamos el perfil o especificamos el servicio para no levantar el backend/frontend en este nodo.

```bash
# Levantar solo el servicio 'db' (y pgadmin si se desea)
docker compose up -d db
```

Verifica que esté corriendo:
```bash
docker compose ps
# Deberías ver 'gip-postgis' en estado 'Up (healthy)'
```

## 3. Generación de Datos Sintéticos

Si la base de datos está vacía, necesitas generar un set de datos inicial. Esto se hace ejecutando el script de Python directamente en el VPS (o generando localmente y subiendo los archivos).

### Pasos para generar en el VPS:

1.  **Preparar entorno Python:**
    ```bash
    # Instalar venv si no está
    sudo apt-get update && sudo apt-get install -y python3-venv

    # Crear entorno virtual
    python3 -m venv .venv
    source .venv/bin/activate

    # Instalar dependencias
    pip install -r tools/data_generator/requirements.txt
    ```

2.  **Ejecutar el Generador:**
    Este comando generará incidentes y estaciones en `data/bulk_load_batch`.

    ```bash
    # Ejemplo: 20,000 incidentes, 40 estaciones
    python3 -m tools.data_generator.cli \
      --incident-count 20000 \
      --station-count 40 \
      --seed 4242 \
      --output-format csv \
      --output-dir data/bulk_load_batch
    ```

    Al finalizar, verifica que existan los archivos `.csv` en `data/bulk_load_batch/`.

## 4. Carga de Datos (Bulk Load)

Una vez generados los archivos CSV, utilizaremos el script `load_data.sh`. Dado que `psql` podría no estar instalado en el host, ejecutaremos el script **dentro** del contenedor de base de datos, donde ya existen las herramientas necesarias y los volúmenes están montados.

El `docker-compose.yml` monta:
- `./data` del host en `/data` del contenedor.
- `./tools/bulk_load` del host en `/load_script` del contenedor.

### Ejecutar la Carga

```bash
docker compose exec db bash -c "cd /data && /load_script/load_data.sh \
  --data-dir ./bulk_load_batch \
  --database-url postgres://\$POSTGRES_USER:\$POSTGRES_PASSWORD@localhost:5432/\$POSTGRES_DB"
```

**Nota:** Las variables `$POSTGRES_USER`, etc., son las del entorno del contenedor. Si cambiaste las credenciales en el `.env`, asegúrate de que coincidan.

### ¿Qué hace este script?
1.  Crea tablas temporales (staging).
2.  Copia los CSVs a staging.
3.  Ejecuta transformaciones y carga las tablas finales.
4.  Ejecuta validaciones de integridad y geometría.

## 5. Verificación

Si el script termina con éxito, verás un resumen de validación. Puedes verificar manualmente conectándote a la base de datos:

```bash
docker compose exec db psql -U gis_dev -d gis -c "SELECT count(*) FROM incidents;"
```

## Solución de Problemas Comunes

-   **Error: `psql: command not found`**: Asegúrate de estar ejecutando el comando de carga con `docker compose exec db ...` y no directamente en el host.
-   **Error de conexión**: Verifica que el contenedor `db` esté en estado `healthy`.
-   **Permisos de archivos**: Si el generador crea archivos que el contenedor no puede leer, ajusta los permisos: `chmod -R 755 data/`.
