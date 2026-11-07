#!/bin/bash
# ==========================================
# Pozhi — DigitalOcean VPS deploy script
#
# Run this ONCE on a fresh Ubuntu 22.04 droplet:
#   chmod +x deploy.sh && ./deploy.sh
#
# Prerequisites:
#   - Domain DNS A records pointing to this server IP:
#       yourdomain.com  →  <server ip>
#       www.yourdomain.com  →  <server ip>
#       admin.yourdomain.com  →  <server ip>
#       api.yourdomain.com  →  <server ip>
#   - .env filled in (copied from .env.prod.example)
#   - backend/.env.production filled in
#   - nginx/nginx.conf updated with your real domain
# ==========================================

set -e

DOMAIN="yourdomain.com"
EMAIL="your@email.com"   # for Let's Encrypt notifications

echo "==> Installing Docker..."
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-plugin git curl

systemctl enable docker
systemctl start docker

echo "==> Cloning / pulling repo..."
# If running for the first time, git clone your repo here.
# If already cloned, just pull:
#   git pull origin main

echo "==> Issuing SSL certificate (requires DNS to be live)..."
# First: start nginx with HTTP only (comment out SSL blocks in nginx.conf temporarily,
# or use the init-letsencrypt.sh approach below)
docker compose -f docker-compose.prod.yml up -d nginx certbot

sleep 5

docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" \
  -d "admin.$DOMAIN" \
  -d "api.$DOMAIN"

echo "==> Downloading recommended SSL params..."
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
  > nginx/certbot/conf/options-ssl-nginx.conf

openssl dhparam -out nginx/certbot/conf/ssl-dhparams.pem 2048

echo "==> Building and starting all services..."
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "✅ Deploy complete!"
echo "   Customer site: https://$DOMAIN"
echo "   Admin panel:   https://admin.$DOMAIN"
echo "   API:           https://api.$DOMAIN"
echo ""
echo "Next steps:"
echo "  1. Switch Razorpay to live keys in backend/.env.production"
echo "  2. Register webhook: https://api.$DOMAIN/api/payments/webhook"
echo "  3. Add https://$DOMAIN/account and https://admin.$DOMAIN/login to Google OAuth redirect URIs"
