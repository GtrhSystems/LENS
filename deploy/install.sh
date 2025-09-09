#!/bin/bash

# LENS VPS Installation Script
# Ubuntu 20.04/22.04 LTS

set -e

echo "🚀 Iniciando instalación de LENS..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Redis
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Install Nginx
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Install PM2 globally
sudo npm install -g pm2

# Create lens user
sudo useradd -m -s /bin/bash lens
sudo usermod -aG sudo lens

# Generate secure database password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Setup PostgreSQL database
sudo -u postgres createuser lens
sudo -u postgres createdb lens_db
sudo -u postgres psql -c "ALTER USER lens PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE lens_db TO lens;"

# Clone and setup LENS
sudo -u lens git clone https://github.com/GtrhSystems/LENS.git /home/lens/lens
cd /home/lens/lens

# Install dependencies
sudo -u lens npm install
cd src/frontend && sudo -u lens npm install && cd ../..

# Setup environment
sudo -u lens cp .env.example .env

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)
sudo -u lens sed -i "s/your_jwt_secret_here/$JWT_SECRET/g" .env
sudo -u lens sed -i "s/your_database_url_here/postgresql:\/\/lens:$DB_PASSWORD@localhost:5432\/lens_db/g" .env

# Run database migrations
sudo -u lens npx prisma migrate deploy
sudo -u lens npx prisma generate

# Build frontend
cd src/frontend
sudo -u lens npm run build
cd ../..

# Setup PM2 ecosystem
sudo -u lens pm2 start ecosystem.config.js
sudo -u lens pm2 save
sudo -u lens pm2 startup

# Configure Nginx
sudo tee /etc/nginx/sites-available/lens << EOF
server {
    listen 80;
    server_name your-domain.com;
    
    # Frontend
    location / {
        root /home/lens/lens/src/frontend/build;
        try_files \$uri \$uri/ /index.html;
    }
    
    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/lens /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL with Certbot
sudo apt install -y certbot python3-certbot-nginx
# sudo certbot --nginx -d your-domain.com

# Setup firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Setup log rotation
sudo tee /etc/logrotate.d/lens << EOF
/home/lens/lens/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
    create 0644 lens lens
    postrotate
        sudo -u lens pm2 reload all
    endscript
}
EOF

echo "✅ Instalación completada!"
echo "🔒 Password de base de datos generado: $DB_PASSWORD"
echo "⚠️  IMPORTANTE: Guarda esta contraseña en un lugar seguro"
echo "🌐 Accede a tu aplicación en: http://your-domain.com"
echo "📊 Monitoreo PM2: sudo -u lens pm2 monit"
echo "📝 Logs: sudo -u lens pm2 logs"