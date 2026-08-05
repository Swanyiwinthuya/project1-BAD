#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOMAIN="${CAMPUSFIX_DOMAIN:-project-1-backend.eastasia.cloudapp.azure.com}"
SERVICE_USER="${SUDO_USER:-$(id -un)}"

if [[ "$EUID" -ne 0 ]]; then
  echo "Run this deployment command with sudo: sudo ./scripts/deploy.sh"
  exit 1
fi

if [[ ! -f /etc/campusfix/bootstrap.conf ]]; then
  echo "Missing /etc/campusfix/bootstrap.conf"
  echo "Copy deployment/bootstrap.conf.example there, replace every placeholder, and protect it with chmod 600."
  exit 1
fi

if grep -Eq 'PASTE_|YOUR-' "$APP_DIR/frontend/src/config.js" /etc/campusfix/bootstrap.conf; then
  echo "Replace every PASTE_ and YOUR- placeholder before deployment."
  exit 1
fi

cd "$APP_DIR"
set -a
source /etc/campusfix/bootstrap.conf
set +a
npm install --workspaces --include=dev
npm run prisma:generate --workspace backend
npm run prisma:migrate --workspace backend
npm run build --workspace frontend

sudo install -d -m 0755 /var/www/campusfix
sudo rsync -a --delete "$APP_DIR/frontend/dist/" /var/www/campusfix/
sudo chown -R www-data:www-data /var/www/campusfix

sed -e "s|__APP_DIR__|$APP_DIR|g" -e "s|__SERVICE_USER__|$SERVICE_USER|g" \
  "$APP_DIR/deployment/campusfix.service" | sudo tee /etc/systemd/system/campusfix.service >/dev/null
sed "s|__DOMAIN__|$DOMAIN|g" "$APP_DIR/deployment/nginx-campusfix.conf" \
  | sudo tee /etc/nginx/sites-available/campusfix >/dev/null

sudo ln -sfn /etc/nginx/sites-available/campusfix /etc/nginx/sites-enabled/campusfix
sudo nginx -t
sudo systemctl daemon-reload
sudo systemctl enable --now campusfix
sudo systemctl restart campusfix
sudo systemctl reload nginx

echo "CampusFix deployed. Check: http://$DOMAIN/campusfix/api/health"
echo "After DNS works, enable HTTPS: sudo certbot --nginx -d $DOMAIN"
