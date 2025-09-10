#!/bin/bash

# Database restore script

if [ -z "$1" ]; then
    echo "❌ Uso: $0 <archivo_backup.sql.gz>"
    echo "📋 Backups disponibles:"
    ls -la /backups/lens_backup_*.sql.gz
    exit 1
fi

BACKUP_FILE="$1"
DB_NAME="lens_db"
DB_USER="lens"
DB_HOST="postgres"

echo "⚠️  ADVERTENCIA: Esto sobrescribirá la base de datos actual"
read -p "¿Continuar? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 Restaurando backup: $BACKUP_FILE"
    
    # Decompress and restore
    gunzip -c "$BACKUP_FILE" | psql -h $DB_HOST -U $DB_USER -d $DB_NAME
    
    if [ $? -eq 0 ]; then
        echo "✅ Backup restaurado exitosamente"
    else
        echo "❌ Error restaurando backup"
        exit 1
    fi
else
    echo "❌ Operación cancelada"
fi