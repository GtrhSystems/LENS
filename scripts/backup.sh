#!/bin/bash

# Database backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="lens_db"
DB_USER="lens"
DB_HOST="postgres"

echo "📦 Iniciando backup de base de datos..."

# Create backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > "$BACKUP_DIR/lens_backup_$DATE.sql"

if [ $? -eq 0 ]; then
    echo "✅ Backup creado: lens_backup_$DATE.sql"
    
    # Compress backup
    gzip "$BACKUP_DIR/lens_backup_$DATE.sql"
    
    # Remove backups older than 7 days
    find $BACKUP_DIR -name "lens_backup_*.sql.gz" -mtime +7 -delete
    
    echo "🗂️  Backups antiguos eliminados"
else
    echo "❌ Error creando backup"
    exit 1
fi