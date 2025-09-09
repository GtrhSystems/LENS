#!/bin/bash

# Comprehensive maintenance script
set -e

echo "🔧 Iniciando mantenimiento de LENS..."

# Función para limpiar logs antiguos
clean_logs() {
    echo "🧹 Limpiando logs antiguos..."
    find /var/log -name "*.log" -type f -mtime +30 -delete
    docker system prune -f
    docker volume prune -f
}

# Función para optimizar base de datos
optimize_db() {
    echo "🗄️ Optimizando base de datos..."
    docker-compose -f docker-compose.contabo.yml exec postgres psql -U lens -d lens -c "VACUUM ANALYZE;"
    docker-compose -f docker-compose.contabo.yml exec postgres psql -U lens -d lens -c "REINDEX DATABASE lens;"
}

# Función para limpiar caché Redis
clean_cache() {
    echo "🧹 Limpiando caché Redis..."
    docker-compose -f docker-compose.contabo.yml exec redis redis-cli FLUSHDB
}

# Función para verificar salud del sistema
health_check() {
    echo "🏥 Verificando salud del sistema..."
    
    # Verificar espacio en disco
    DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $DISK_USAGE -gt 80 ]; then
        echo "⚠️ Advertencia: Uso de disco alto ($DISK_USAGE%)"
    fi
    
    # Verificar memoria
    MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ $MEM_USAGE -gt 80 ]; then
        echo "⚠️ Advertencia: Uso de memoria alto ($MEM_USAGE%)"
    fi
    
    # Verificar servicios
    docker-compose -f docker-compose.contabo.yml ps
}

# Función para actualizar certificados SSL
renew_ssl() {
    echo "🔒 Renovando certificados SSL..."
    sudo certbot renew --quiet
    sudo systemctl reload nginx
}

# Ejecutar mantenimiento según parámetro
case "$1" in
    "logs")
        clean_logs
        ;;
    "db")
        optimize_db
        ;;
    "cache")
        clean_cache
        ;;
    "health")
        health_check
        ;;
    "ssl")
        renew_ssl
        ;;
    "all")
        clean_logs
        optimize_db
        clean_cache
        health_check
        renew_ssl
        echo "✅ Mantenimiento completo finalizado"
        ;;
    *)
        echo "Uso: $0 {logs|db|cache|health|ssl|all}"
        exit 1
        ;;
esac