#!/bin/bash

# Quick commands for LENS management

case "$1" in
    "start")
        echo "▶️ Iniciando LENS..."
        docker-compose -f docker-compose.contabo.yml up -d
        ;;
    "stop")
        echo "⏹️ Deteniendo LENS..."
        docker-compose -f docker-compose.contabo.yml down
        ;;
    "restart")
        echo "🔄 Reiniciando LENS..."
        docker-compose -f docker-compose.contabo.yml restart
        ;;
    "logs")
        docker-compose -f docker-compose.contabo.yml logs -f ${2:-lens}
        ;;
    "status")
        docker-compose -f docker-compose.contabo.yml ps
        ;;
    "shell")
        docker-compose -f docker-compose.contabo.yml exec ${2:-lens} /bin/bash
        ;;
    "db")
        docker-compose -f docker-compose.contabo.yml exec postgres psql -U lens -d lens
        ;;
    "redis")
        docker-compose -f docker-compose.contabo.yml exec redis redis-cli
        ;;
    "backup")
        ./scripts/backup.sh
        ;;
    "update")
        ./scripts/update.sh
        ;;
    "maintenance")
        ./scripts/maintenance.sh all
        ;;
    *)
        echo "🚀 Comandos disponibles para LENS:"
        echo "  start     - Iniciar servicios"
        echo "  stop      - Detener servicios"
        echo "  restart   - Reiniciar servicios"
        echo "  logs      - Ver logs (opcional: servicio)"
        echo "  status    - Estado de servicios"
        echo "  shell     - Acceder a shell (opcional: servicio)"
        echo "  db        - Acceder a PostgreSQL"
        echo "  redis     - Acceder a Redis CLI"
        echo "  backup    - Crear backup"
        echo "  update    - Actualizar sistema"
        echo "  maintenance - Mantenimiento completo"
        ;;
esac