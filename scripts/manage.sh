#!/bin/bash

# LENS Management Script

case "$1" in
    start)
        echo "🚀 Iniciando LENS..."
        docker-compose up -d
        ;;
    stop)
        echo "🛑 Deteniendo LENS..."
        docker-compose down
        ;;
    restart)
        echo "🔄 Reiniciando LENS..."
        docker-compose restart
        ;;
    logs)
        echo "📋 Mostrando logs..."
        docker-compose logs -f ${2:-lens-app}
        ;;
    status)
        echo "📊 Estado de los servicios:"
        docker-compose ps
        ;;
    backup)
        echo "📦 Creando backup..."
        docker-compose exec postgres /scripts/backup.sh
        ;;
    restore)
        if [ -z "$2" ]; then
            echo "❌ Especifica el archivo de backup"
            echo "📋 Uso: $0 restore <archivo_backup.sql.gz>"
            exit 1
        fi
        docker-compose exec postgres /scripts/restore.sh "/backups/$2"
        ;;
    update)
        echo "🔄 Actualizando LENS..."
        git pull
        docker-compose build --no-cache
        # Eliminar referencias a docker-compose.contabo.yml
        # Cambiar por docker-compose.yml
        docker-compose up -d
        docker-compose down
        docker-compose restart
        ;;
    clean)
        echo "🧹 Limpiando recursos Docker..."
        docker-compose down -v
        docker system prune -f
        ;;
    shell)
        echo "🐚 Accediendo al contenedor..."
        docker-compose exec lens-app sh
        ;;
    db)
        echo "🗄️  Accediendo a la base de datos..."
        docker-compose exec postgres psql -U lens -d lens_db
        ;;
    *)
        echo "🔧 LENS Management Script"
        echo "Uso: $0 {start|stop|restart|logs|status|backup|restore|update|clean|shell|db}"
        echo ""
        echo "Comandos disponibles:"
        echo "  start    - Iniciar todos los servicios"
        echo "  stop     - Detener todos los servicios"
        echo "  restart  - Reiniciar todos los servicios"
        echo "  logs     - Ver logs (opcional: especificar servicio)"
        echo "  status   - Ver estado de los servicios"
        echo "  backup   - Crear backup de la base de datos"
        echo "  restore  - Restaurar backup de la base de datos"
        echo "  update   - Actualizar aplicación desde Git"
        echo "  clean    - Limpiar recursos Docker"
        echo "  shell    - Acceder al contenedor de la aplicación"
        echo "  db       - Acceder a la base de datos PostgreSQL"
        ;;
esac