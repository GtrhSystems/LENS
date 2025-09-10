#!/bin/bash

# Security hardening script

# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Change SSH port (optional)
# sudo sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config

# Setup fail2ban
sudo apt install -y fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Configure fail2ban for SSH
sudo tee /etc/fail2ban/jail.local << EOF
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
EOF

# Setup automatic security updates
sudo apt install -y unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "false";' | sudo tee -a /etc/apt/apt.conf.d/50unattended-upgrades

# Restart services
sudo systemctl restart sshd
sudo systemctl restart fail2ban

echo "🔒 Configuración de seguridad completada"