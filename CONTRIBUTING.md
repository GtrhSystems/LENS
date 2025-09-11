# 🤝 Guía de Contribución - LENS Project

## 🎯 Sobre LENS

**LENS (Live Entertainment Network Scanner)** es una herramienta profesional para la clasificación automática y gestión de contenido multimedia. Esta guía te ayudará a contribuir efectivamente al proyecto.

## 🚀 Configuración Inicial

### Prerrequisitos
- Node.js 18+
- Docker y Docker Compose
- Git configurado
- PostgreSQL 15+ (opcional, se puede usar Docker)
- Redis 7+ (opcional, se puede usar Docker)

### Configuración del Entorno

```bash
# 1. Fork y clonar el repositorio
git clone https://github.com/TU-USUARIO/LENS.git
cd LENS

# 2. Configurar upstream
git remote add upstream https://github.com/GtrhSystems/LENS.git

# 3. Instalar dependencias
npm install

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# 5. Iniciar base de datos (Docker)
docker-compose up -d postgres redis

# 6. Ejecutar migraciones
npm run migrate

# 7. Iniciar en modo desarrollo
npm run dev
```

## 🔄 Flujo de Trabajo

### Estructura de Ramas
main           # Producción estable
├── develop    # Desarrollo principal
├── feature/*  # Nuevas funcionalidades
├── bugfix/*   # Corrección de errores
├── hotfix/*   # Correcciones urgentes
└── release/*  # Preparación de releases


### Proceso de Contribución

1. **Sincronizar con upstream**
```bash
git checkout develop
git pull upstream develop
```

2. **Crear rama para tu contribución**
```bash
# Para nuevas funcionalidades
git checkout -b feature/clasificacion-automatica-canales

# Para corrección de errores
git checkout -b bugfix/parser-m3u-encoding

# Para mejoras de rendimiento
git checkout -b improvement/redis-cache-optimization
```

3. **Desarrollar y testear**
```bash
# Ejecutar tests
npm test

# Verificar linting
npm run lint

# Construir proyecto
npm run build
```

4. **Commit siguiendo convenciones**
```bash
git add .
git commit -m "feat(classifier): agregar detección automática de canales deportivos"
```

5. **Push y crear Pull Request**
```bash
git push origin feature/clasificacion-automatica-canales
```

## 📝 Convenciones de Commits

### Formato
```
<tipo>(ámbito): descripción breve
```


### Tipos de Commit
- **feat**: Nueva funcionalidad
- **fix**: Corrección de errores
- **docs**: Documentación
- **style**: Formato de código (sin cambios funcionales)
- **refactor**: Refactorización de código
- **perf**: Mejoras de rendimiento
- **test**: Agregar o modificar tests
- **chore**: Tareas de mantenimiento
- **ci**: Cambios en CI/CD

### Scopes Principales
- **classifier**: Sistema de clasificación
- **parser**: Parsers M3U/Xtream
- **api**: Endpoints y rutas
- **db**: Base de datos y migraciones
- **cache**: Sistema de cache Redis
- **auth**: Autenticación y autorización
- **docker**: Configuración Docker
- **config**: Configuración del sistema

### Ejemplos
```bash
feat(classifier): agregar soporte para detección de calidad 8K
fix(parser): corregir encoding UTF-8 en archivos M3U
docs(api): actualizar documentación de endpoints
perf(cache): optimizar consultas Redis para metadatos
test(classifier): agregar tests unitarios para TMDBService
```

## 🧪 Testing

### Ejecutar Tests
```bash
# Todos los tests
npm test

# Tests con coverage
npm run test:coverage

# Tests en modo watch
npm run test:watch

# Tests específicos
npm test -- --testNamePattern="ContentClassifier"
```

### Escribir Tests
- **Tests unitarios**: Para servicios y utilidades
- **Tests de integración**: Para APIs y base de datos
- **Tests E2E**: Para flujos completos

```typescript
// Ejemplo: src/services/__tests__/ContentClassifierService.test.ts
import { ContentClassifierService } from '../ContentClassifierService';

describe('ContentClassifierService', () => {
  it('should classify movie correctly', async () => {
    const classifier = new ContentClassifierService();
    const result = await classifier.classifyContent('Avengers Endgame 2019 4K');
    
    expect(result.type).toBe('movie');
    expect(result.quality).toBe('4K');
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});
```

## 📋 Pull Request Guidelines

### Template de PR
```markdown
## 📝 Descripción
Breve descripción de los cambios realizados

## 🔧 Tipo de cambio
- [ ] 🐛 Bug fix (cambio que corrige un issue)
- [ ] ✨ Nueva feature (cambio que agrega funcionalidad)
- [ ] 💥 Breaking change (fix o feature que causa cambios incompatibles)
- [ ] 📚 Documentación (cambios solo en documentación)
- [ ] 🎨 Estilo (formato, punto y coma faltante, etc; sin cambios de código)
- [ ] ♻️ Refactoring (cambio de código que no corrige bug ni agrega feature)
- [ ] ⚡ Performance (cambio que mejora el rendimiento)
- [ ] ✅ Test (agregar tests faltantes o corregir existentes)

## 🧪 Testing
- [ ] Tests unitarios pasan
- [ ] Tests de integración pasan
- [ ] Linting pasa sin errores
- [ ] Build se ejecuta correctamente

## 📸 Screenshots (si aplica)
<!-- Agregar capturas de pantalla si hay cambios visuales -->

## 📋 Checklist
- [ ] Mi código sigue las convenciones del proyecto
- [ ] He realizado una auto-revisión de mi código
- [ ] He comentado mi código, especialmente en áreas difíciles de entender
- [ ] He realizado los cambios correspondientes en la documentación
- [ ] Mis cambios no generan nuevas advertencias
- [ ] He agregado tests que prueban que mi fix es efectivo o que mi feature funciona
- [ ] Tests unitarios nuevos y existentes pasan localmente
```

### Proceso de Review
1. **Auto-revisión**: Revisa tu propio código antes de crear el PR
2. **Asignar reviewers**: Al menos 1 reviewer, preferiblemente 2
3. **Responder feedback**: Responde constructivamente a los comentarios
4. **Actualizar PR**: Realiza los cambios solicitados
5. **Merge**: Solo después de aprobación y tests pasando

## 🏗️ Arquitectura del Proyecto

### Estructura de Directorios
```
src/
├── api/        # Endpoints y rutas
├── cache/      # Sistema de cache Redis
├── classifier/ # Sistema de clasificación
├── config/     # Configuración
├── db/         # Base de datos
├── parser/     # Parsers M3U/Xtream
├── services/   # Lógica de negocio
├── utils/      # Utilidades
└── server.ts   # Punto de entrada
```

### Principios de Diseño
- **Single Responsibility**: Cada clase/función tiene una responsabilidad
- **Dependency Injection**: Usar inyección de dependencias
- **Error Handling**: Manejo consistente de errores
- **Logging**: Logging estructurado con Winston
- **Validation**: Validación con Joi
- **Type Safety**: TypeScript estricto

## 🔧 Configuración de Desarrollo

### VSCode Extensions Recomendadas
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode-remote.remote-containers"
  ]
}
```

### Configuración de ESLint
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

## 🐛 Reportar Issues

### Template de Bug Report
```markdown
**Describe el bug**
Descripción clara y concisa del problema.

**Para Reproducir**
Pasos para reproducir el comportamiento:
1. Ir a '...'
2. Hacer clic en '....'
3. Scroll down to '....'
4. Ver error

**Comportamiento Esperado**
Descripción clara de lo que esperabas que pasara.

**Screenshots**
Si aplica, agregar screenshots para ayudar a explicar el problema.

**Información del Entorno:**
 - OS: [e.g. Windows 11, Ubuntu 20.04]
 - Node.js: [e.g. 18.17.0]
 - Docker: [e.g. 24.0.5]
 - Navegador: [e.g. Chrome 115, Firefox 116]

**Contexto Adicional**
Cualquier otra información sobre el problema.
```

### Template de Feature Request
```markdown
**¿Tu feature request está relacionada con un problema?**
Descripción clara del problema. Ej. Siempre me frustra cuando [...]

**Describe la solución que te gustaría**
Descripción clara y concisa de lo que quieres que pase.

**Describe alternativas que has considerado**
Descripción clara de cualquier solución o feature alternativa.

**Contexto Adicional**
Cualquier otra información o screenshots sobre el feature request.
```

## 🚀 Release Process

### Versionado Semántico
- **MAJOR**: Cambios incompatibles en la API
- **MINOR**: Funcionalidad nueva compatible hacia atrás
- **PATCH**: Bug fixes compatibles hacia atrás

### Proceso de Release
1. **Crear rama release**
```bash
git checkout develop
git checkout -b release/v1.2.0
```

2. **Actualizar versión**
```bash
npm version minor # o major/patch
```

3. **Actualizar CHANGELOG.md**
4. **Merge a main y develop**
5. **Crear tag y release en GitHub**

## 📞 Soporte y Comunicación

### Canales de Comunicación
- **GitHub Issues**: Para bugs y feature requests
- **GitHub Discussions**: Para preguntas y discusiones
- **Pull Requests**: Para revisión de código

### Código de Conducta
- Ser respetuoso y constructivo
- Ayudar a otros colaboradores
- Mantener un ambiente inclusivo
- Seguir las mejores prácticas de desarrollo

## 🙏 Reconocimientos

Gracias a todos los colaboradores que hacen posible LENS:

- Mantenedores principales
- Contribuidores de código
- Reportadores de bugs
- Revisores de documentación
- Comunidad de usuarios

---

**¡Gracias por contribuir a LENS! 🎬✨**

Para más información, consulta:
- [README.md](README.md)
- [Documentación API](docs/api.md)
- [Wiki del Proyecto](https://github.com/GtrhSystems/LENS/wiki)