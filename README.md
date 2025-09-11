# 🎬 LENS - Live Entertainment Network Scanner

> Herramienta profesional para clasificación y gestión de contenido multimedia

## 🚀 Instalación Rápida (Ubuntu 24.04)

```bash
git clone https://github.com/tu-usuario/lens.git /opt/lens
cd /opt/lens
sudo chmod +x deploy/install.sh
sudo ./deploy/install.sh
```

## ✨ Características

- 🎯 **Clasificación Automática**: TMDB y OMDB integration
- 📺 **Múltiples Formatos**: M3U, M3U8, Xtream Codes
- 🐳 **Docker Ready**: Instalación con un comando
- 🛡️ **Seguro**: Rate limiting, JWT, encriptación
- 📊 **Monitoreo**: Logs, métricas y health checks
- 🔄 **Backup Automático**: PostgreSQL y Redis

## 🛠️ Gestión

```bash
# Iniciar servicios
./scripts/manage.sh start

# Ver estado
./scripts/manage.sh status

# Ver logs
./scripts/manage.sh logs

# Backup
./scripts/manage.sh backup
```

## 📋 Requisitos

- Ubuntu 24.04 LTS
- 4GB RAM mínimo
- 20GB espacio libre
- Conexión a internet

## 🔑 APIs Necesarias

- [TMDB API Key](https://www.themoviedb.org/settings/api)
- [OMDB API Key](http://www.omdbapi.com/apikey.aspx)

---

⭐ **¡Dale una estrella si te gusta el proyecto!**