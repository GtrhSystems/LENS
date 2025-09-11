# 🎬 LENS - Live Entertainment Network Scanner

> Herramienta profesional para clasificación y gestión de contenido multimedia

## 🚀 Instalación Rápida (Ubuntu 24.04)

```bash
git clone https://github.com/GtrhSystems/LENS.git /opt/lens
cd /opt/lens
sudo chmod +x deploy/install.sh
sudo ./deploy/install.sh
```

## ✨ Características

- 🎯 **Clasificación Automática**: Integración TMDB y OMDB
- 📺 **Múltiples Formatos**: M3U, M3U8, Xtream Codes
- 🐳 **Docker Ready**: Instalación con un comando
- 🛡️ **Seguro**: Rate limiting, JWT, encriptación
- 📊 **Monitoreo**: Logs, métricas y health checks
- 🔄 **Backup Automático**: PostgreSQL y Redis

## 🛠️ Gestión del Sistema

```bash
# Iniciar todos los servicios
./scripts/manage.sh start

# Ver estado de los servicios
./scripts/manage.sh status

# Ver logs en tiempo real
./scripts/manage.sh logs

# Crear backup de la base de datos
./scripts/manage.sh backup

# Reiniciar servicios
./scripts/manage.sh restart
```

## 📋 Requisitos del Sistema

- **OS**: Ubuntu 24.04 LTS
- **RAM**: 4GB mínimo (8GB recomendado)
- **Almacenamiento**: 20GB espacio libre
- **Red**: Conexión a internet estable

## 🔑 APIs Requeridas

- [TMDB API Key](https://www.themoviedb.org/settings/api) - Para información de películas y series
- [OMDB API Key](http://www.omdbapi.com/apikey.aspx) - Para datos adicionales de contenido

## 🏗️ Arquitectura

- **Backend**: Node.js 22 + TypeScript + Express
- **Base de Datos**: PostgreSQL 16 + Redis 7.2
- **ORM**: Prisma
- **Contenedores**: Docker + Docker Compose
- **Proxy**: Nginx con SSL
- **Monitoreo**: Winston + Health Checks

## 📊 Estado del Proyecto

![GitHub release](https://img.shields.io/github/v/release/GtrhSystems/LENS)
![GitHub issues](https://img.shields.io/github/issues/GtrhSystems/LENS)
![GitHub stars](https://img.shields.io/github/stars/GtrhSystems/LENS)

---

**Desarrollado por GtrhSystems** | ⭐ **¡Dale una estrella si te gusta el proyecto!**