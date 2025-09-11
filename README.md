# 🎬 LENS - Live Entertainment Network Scanner

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

**LENS** es una herramienta profesional para la clasificación automática y gestión de contenido multimedia. Diseñada para proveedores IPTV, gestores de media y servicios de streaming que necesitan organizar y enriquecer grandes catálogos de contenido.

## ✨ Características Principales

### 🤖 Clasificación Inteligente
- **Detección automática** de películas, series y canales de TV
- **Enriquecimiento de metadatos** con TMDB y OMDB
- **Detección de calidad** (SD, HD, FHD, 4K, 8K)
- **Sistema de confianza** basado en algoritmos de similitud
- **Detección de idioma y país** automática

### 📺 Soporte Multi-Fuente
- **Listas M3U/M3U8** con parseo completo
- **Xtream Codes API** para proveedores IPTV
- **Archivos locales** y URLs remotas
- **Validación automática** de fuentes
- **Escaneo programado** y bajo demanda

### 🏗️ Arquitectura Robusta
- **Backend TypeScript** con Express.js
- **Base de datos PostgreSQL** con Prisma ORM
- **Cache Redis** para optimización
- **Contenedorización Docker** completa
- **Proxy Nginx** con SSL y rate limiting

## 🚀 Instalación Rápida

### Prerrequisitos
- Docker y Docker Compose
- Node.js 18+ (para desarrollo)
- PostgreSQL 15+ (si no usas Docker)
- Redis 7+ (si no usas Docker)

### 🐳 Instalación con Docker (Recomendado)

```bash
# Clonar el repositorio
git clone https://github.com/GtrhSystems/LENS.git
cd LENS

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Ejecutar script de despliegue
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 🔧 Instalación Manual

```bash
# Instalar dependencias
npm install

# Configurar base de datos
npx prisma migrate deploy
npx prisma generate

# Construir aplicación
npm run build

# Iniciar en producción
npm start
```

## ⚙️ Configuración

### Variables de Entorno Esenciales

```env
# Servidor
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://localhost:3000

# Base de Datos
DATABASE_URL="postgresql://username:password@localhost:5432/lens_db"

# APIs Externas (REQUERIDAS)
TMDB_API_KEY=tu_clave_tmdb_aqui
OMDB_API_KEY=tu_clave_omdb_aqui

# Seguridad
JWT_SECRET=tu_clave_secreta_jwt
ENCRYPTION_KEY=tu_clave_encriptacion
```

### 🔑 Obtener API Keys

1. **TMDB API Key**: Regístrate en [themoviedb.org](https://www.themoviedb.org/settings/api)
2. **OMDB API Key**: Obtén tu clave en [omdbapi.com](http://www.omdbapi.com/apikey.aspx)

## 📖 Uso

### API Endpoints Principales

```http
# Gestión de Fuentes
GET    /api/sources              # Listar fuentes
POST   /api/sources              # Agregar fuente
POST   /api/sources/:id/scan     # Escanear fuente
GET    /api/sources/:id/content  # Ver contenido

# Autenticación
POST   /api/auth/login           # Iniciar sesión
POST   /api/auth/logout          # Cerrar sesión

# Salud del Sistema
GET    /api/health               # Estado de servicios
```

### Ejemplo de Uso - Agregar Fuente M3U

```javascript
// Agregar nueva fuente
const response = await fetch('/api/sources', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Mi Lista IPTV',
    url: 'https://ejemplo.com/playlist.m3u',
    type: 'm3u'
  })
});

// Iniciar escaneo
const scanResponse = await fetch(`/api/sources/${sourceId}/scan`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## 🛠️ Desarrollo

### Estructura del Proyecto
```
LENS/
├── src/
│   ├── config/          # Configuración
│   ├── middleware/      # Middlewares Express
│   ├── parsers/         # Parsers M3U, Xtream
│   ├── routes/          # Rutas API
│   ├── services/        # Servicios principales
│   └── utils/           # Utilidades
├── prisma/              # Esquemas de base de datos
├── scripts/             # Scripts de gestión
├── nginx/               # Configuración Nginx
└── docker-compose.yml   # Orquestación Docker
```

### Comandos de Desarrollo

```bash
# Desarrollo con hot reload
npm run dev

# Ejecutar tests
npm test

# Linting
npm run lint

# Gestión de base de datos
npm run migrate
npm run db:studio
```

### Scripts de Gestión

```bash
# Gestión de servicios
./scripts/manage.sh start|stop|restart|status

# Backups
./scripts/backup.sh
./scripts/restore.sh

# Actualizaciones
./scripts/update.sh

# Mantenimiento
./scripts/maintenance.sh
```

## 📊 Monitoreo y Logs

### Health Checks
```bash
# Verificar estado de servicios
curl http://localhost/health

# Ver logs en tiempo real
docker-compose logs -f lens-app

# Estado de contenedores
docker-compose ps
```

### Logs Estructurados
- **Aplicación**: `./logs/lens.log`
- **Errores**: `./logs/lens-error.log`
- **Nginx**: `./logs/nginx/`
- **Base de datos**: Logs de Docker

## 🔒 Seguridad

### Características de Seguridad
- **Autenticación JWT** con tokens seguros
- **Rate limiting** configurable por endpoint
- **Headers de seguridad** con Helmet.js
- **CORS** configurado para dominios específicos
- **Validación de entrada** con Joi
- **Encriptación** de datos sensibles

### Configuración de Firewall
```bash
# Puertos necesarios
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw allow 3001  # API (opcional, si no usas Nginx)
```

## 📈 Performance

### Optimizaciones Incluidas
- **Cache Redis** para metadatos y consultas frecuentes
- **Compresión gzip** en Nginx
- **Connection pooling** en PostgreSQL
- **Rate limiting** para proteger APIs externas
- **Lazy loading** de imágenes y metadatos

### Métricas Recomendadas
- Tiempo de respuesta de APIs
- Uso de memoria y CPU
- Tasa de aciertos de cache
- Errores de clasificación

## 🚨 Solución de Problemas

### Problemas Comunes

**Error de conexión a base de datos**
```bash
# Verificar estado de PostgreSQL
docker-compose ps postgres

# Ver logs de base de datos
docker-compose logs postgres
```

**APIs externas no responden**
```bash
# Verificar conectividad
curl "https://api.themoviedb.org/3/configuration?api_key=TU_API_KEY"

# Verificar rate limits en logs
docker-compose logs lens-app | grep "rate limit"
```

**Problemas de memoria**
```bash
# Monitorear uso de recursos
docker stats

# Limpiar cache Redis
docker-compose exec redis redis-cli FLUSHALL
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Estándares de Código
- **TypeScript** estricto
- **ESLint** para linting
- **Prettier** para formateo
- **Tests unitarios** con Jest
- **Documentación** de APIs

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 🙏 Reconocimientos

- [TMDB](https://www.themoviedb.org/) por su excelente API de metadatos
- [OMDB](http://www.omdbapi.com/) por datos adicionales de películas
- [Prisma](https://www.prisma.io/) por el ORM TypeScript
- [Docker](https://www.docker.com/) por la contenedorización

## 📞 Soporte

- **Documentación**: [Wiki del proyecto](https://github.com/GtrhSystems/LENS/wiki)
- **Issues**: [GitHub Issues](https://github.com/GtrhSystems/LENS/issues)
- **Discusiones**: [GitHub Discussions](https://github.com/GtrhSystems/LENS/discussions)

---

**Desarrollado con ❤️ por el equipo LENS**