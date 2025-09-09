#!/bin/bash

# CONTABO Enhanced Monitoring Script for LENS
set -e

echo "🔍 CONTABO LENS Monitoring Dashboard"
echo "===================================="

# Función para obtener información de la instancia
get_instance_info() {
    echo "📋 Información de la Instancia CONTABO:"
    curl -s -X GET \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "x-request-id: $(uuidgen)" \
        "https://api.contabo.com/v1/compute/instances/$CONTABO_INSTANCE_ID" | \
        jq -r '.data[0] | "ID: \(.instanceId)\nNombre: \(.displayName)\nEstado: \(.status)\nCPU: \(.cpuCores) cores\nRAM: \(.ramMb)MB\nDisco: \(.diskMb)MB\nIP: \(.ipConfig.v4.ip)"'
}

# Función para obtener estadísticas
get_instance_stats() {
    echo "📊 Estadísticas de Rendimiento (última hora):"
    curl -s -X GET \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "x-request-id: $(uuidgen)" \
        "https://api.contabo.com/v1/compute/instances/$CONTABO_INSTANCE_ID/stats?period=1h" | \
        jq -r '.data | "CPU Promedio: \(.cpu.average)%\nRAM Usada: \(.memory.used)MB\nRed Entrada: \(.network.in)MB\nRed Salida: \(.network.out)MB"'
}

# Función para listar snapshots
list_snapshots() {
    echo "💾 Snapshots Disponibles:"
    curl -s -X GET \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "x-request-id: $(uuidgen)" \
        "https://api.contabo.com/v1/compute/instances/$CONTABO_INSTANCE_ID/snapshots" | \
        jq -r '.data[] | "ID: \(.snapshotId)\nNombre: \(.name)\nFecha: \(.createdDate)"'
}

# Función para crear backup automático
create_auto_backup() {
    local backup_name="lens-auto-backup-$(date +%Y%m%d-%H%M%S)"
    echo "📦 Creando backup automático: $backup_name"
    
    curl -s -X POST \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "x-request-id: $(uuidgen)" \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"$backup_name\", \"description\": \"LENS automatic backup\"}" \
        "https://api.contabo.com/v1/compute/instances/$CONTABO_INSTANCE_ID/snapshots" | \
        jq -r '.data[0] | "Backup creado: \(.name)\nID: \(.snapshotId)"'
}

# Función para limpiar backups antiguos
cleanup_old_backups() {
    echo "🧹 Limpiando backups antiguos (>7 días)..."
    local cutoff_date=$(date -d '7 days ago' +%Y-%m-%d)
    
    curl -s -X GET \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "x-request-id: $(uuidgen)" \
        "https://api.contabo.com/v1/compute/instances/$CONTABO_INSTANCE_ID/snapshots" | \
        jq -r --arg cutoff "$cutoff_date" '.data[] | select(.createdDate < $cutoff) | .snapshotId' | \
        while read snapshot_id; do
            if [ ! -z "$snapshot_id" ]; then
                echo "Eliminando snapshot antiguo: $snapshot_id"
                curl -s -X DELETE \
                    -H "Authorization: Bearer $ACCESS_TOKEN" \
                    -H "x-request-id: $(uuidgen)" \
                    "https://api.contabo.com/v1/compute/snapshots/$snapshot_id"
            fi
        done
}

# Función principal
main() {
    # Verificar variables de entorno
    if [ -z "$CONTABO_CLIENT_ID" ] || [ -z "$CONTABO_CLIENT_SECRET" ] || [ -z "$CONTABO_API_USER" ] || [ -z "$CONTABO_API_PASSWORD" ]; then
        echo "❌ Error: Variables de entorno CONTABO no configuradas"
        echo "Configura: CONTABO_CLIENT_ID, CONTABO_CLIENT_SECRET, CONTABO_API_USER, CONTABO_API_PASSWORD"
        exit 1
    fi

    # Obtener token de acceso
    echo "🔐 Obteniendo token de acceso..."
    ACCESS_TOKEN=$(curl -s -d "client_id=$CONTABO_CLIENT_ID" \
        -d "client_secret=$CONTABO_CLIENT_SECRET" \
        --data-urlencode "username=$CONTABO_API_USER" \
        --data-urlencode "password=$CONTABO_API_PASSWORD" \
        -d 'grant_type=password' \
        'https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token' | \
        jq -r '.access_token')

    if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
        echo "❌ Error: No se pudo obtener token de acceso"
        exit 1
    fi

    echo "✅ Token obtenido exitosamente"
    echo ""

    # Ejecutar funciones según parámetro
    case "$1" in
        "info")
            get_instance_info
            ;;
        "stats")
            get_instance_stats
            ;;
        "snapshots")
            list_snapshots
            ;;
        "backup")
            create_auto_backup
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "full")
            get_instance_info
            echo ""
            get_instance_stats
            echo ""
            list_snapshots
            ;;
        *)
            echo "Uso: $0 {info|stats|snapshots|backup|cleanup|full}"
            echo "  info      - Información de la instancia"
            echo "  stats     - Estadísticas de rendimiento"
            echo "  snapshots - Listar snapshots"
            echo "  backup    - Crear backup automático"
            echo "  cleanup   - Limpiar backups antiguos"
            echo "  full      - Información completa"
            exit 1
            ;;
    esac
}

main "$@"