#!/usr/bin/env bash
# deploy.sh — instala e configura ghostspy.site no VPS (Ubuntu/Debian).
# Idempotente: pode correr duas vezes sem partir nada.
#
# Como usar (NO VPS):
#   sudo bash /tmp/deploy.sh
#
# Pré-requisitos:
#   - /tmp/ghostspy-pt.tar.gz    (tarball do projeto, sem .env)
#   - /tmp/.env                  (ficheiro .env em separado)

set -euo pipefail

DOMAIN="ghostspy.site"
SITE_DIR="/var/www/ghostspy-pt"
STORAGE_DIR="/var/www/ghostspy-pt-storage"
NGINX_CONF="/etc/nginx/sites-available/ghostspy-pt"
NGINX_LINK="/etc/nginx/sites-enabled/ghostspy-pt"
TARBALL="/tmp/ghostspy-pt.tar.gz"
ENV_FILE="/tmp/.env"

log() { printf '\n\033[1;36m[%s]\033[0m %s\n' "$(date +%H:%M:%S)" "$*"; }
fail(){ printf '\n\033[1;31m[ERRO]\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "Execute como root (sudo)."

# ---- 1. Pacotes --------------------------------------------------------
log "A instalar pacotes do sistema..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx php-fpm php-curl certbot python3-certbot-nginx ufw

PHP_VERSION="$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')"
PHP_SOCK="/run/php/php${PHP_VERSION}-fpm.sock"
[ -S "$PHP_SOCK" ] || fail "Socket PHP-FPM não encontrado em $PHP_SOCK"
log "PHP-FPM detetado: $PHP_SOCK"

# ---- 2. Diretório do site ---------------------------------------------
log "A extrair o projeto..."
[ -f "$TARBALL" ] || fail "Tarball não encontrado em $TARBALL (faz o scp primeiro)."
mkdir -p "$SITE_DIR"
# tar extrai para /var/www/stalkeia-pt-pt — movemos para o nome final
rm -rf "$SITE_DIR.old"
if [ -d "$SITE_DIR" ] && [ -n "$(ls -A "$SITE_DIR" 2>/dev/null || true)" ]; then
  mv "$SITE_DIR" "$SITE_DIR.old"
fi
tar -xzf "$TARBALL" -C /var/www/
if [ -d "/var/www/stalkeia-pt-pt" ] && [ ! -d "$SITE_DIR" ]; then
  mv /var/www/stalkeia-pt-pt "$SITE_DIR"
fi
[ -d "$SITE_DIR/assets" ] || fail "Projeto não ficou em $SITE_DIR (estrutura inesperada)"

# ---- 3. .env -----------------------------------------------------------
log "A instalar o .env..."
[ -f "$ENV_FILE" ] || fail ".env não encontrado em $ENV_FILE (faz o scp primeiro)."
install -m 640 -o www-data -g www-data "$ENV_FILE" "$SITE_DIR/.env"

# ---- 4. Storage dir ----------------------------------------------------
log "A criar pasta de storage dos pagamentos..."
mkdir -p "$STORAGE_DIR/tokens"
chown -R www-data:www-data "$STORAGE_DIR"
chmod 750 "$STORAGE_DIR" "$STORAGE_DIR/tokens"

# ---- 5. Permissões -----------------------------------------------------
log "A ajustar permissões..."
chown -R www-data:www-data "$SITE_DIR"
find "$SITE_DIR" -type d -exec chmod 755 {} \;
find "$SITE_DIR" -type f -exec chmod 644 {} \;
chmod 640 "$SITE_DIR/.env"

# ---- 6. Nginx ----------------------------------------------------------
log "A montar config Nginx..."
# Substituir socket PHP para a versão real detetada
sed "s|unix:/run/php/php8.3-fpm.sock|unix:${PHP_SOCK}|g" \
  "$SITE_DIR/nginx.conf" > "$NGINX_CONF"
ln -sfn "$NGINX_CONF" "$NGINX_LINK"

# Desativar default do Debian/Ubuntu se estiver a tapar
if [ -L /etc/nginx/sites-enabled/default ]; then
  log "A desativar o site default do Nginx..."
  rm -f /etc/nginx/sites-enabled/default
fi

nginx -t || fail "Config Nginx inválida."
systemctl reload nginx

# ---- 7. Firewall ------------------------------------------------------
if command -v ufw >/dev/null 2>&1; then
  log "A abrir portas 22, 80, 443 na firewall..."
  ufw allow 22/tcp  >/dev/null || true
  ufw allow 80/tcp  >/dev/null || true
  ufw allow 443/tcp >/dev/null || true
  # Não ativamos o ufw por default para não cortar a sessão SSH se estiver fechado.
fi

# ---- 8. Smoke test ----------------------------------------------------
log "Smoke test HTTP (antes de SSL)..."
sleep 1
CODE="$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $DOMAIN" http://127.0.0.1/ || true)"
log "HTTP code local: $CODE (esperado 301 para HTTPS após certbot, 200 agora)"

cat <<EOF

================================================================
✅  Deploy base concluído.

Próximo passo manual (requer input):

  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}

   - Vai pedir o email (para avisos do Let's Encrypt)
   - Aceitar os termos (Y)
   - Partilhar email com EFF: N (opcional)

Depois, testar:
  curl -I https://${DOMAIN}/
  curl -I https://${DOMAIN}/checkout/
  curl -s https://${DOMAIN}/api/get-payment.php?id=00000000-0000-0000-0000-000000000000

================================================================
EOF
