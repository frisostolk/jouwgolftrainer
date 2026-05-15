#!/usr/bin/env bash
# VPS setup script for GolfTrainer on fresh Debian
# Run as root: bash setup.sh
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

if [[ $EUID -ne 0 ]]; then
    echo "Run as root: sudo bash setup.sh"
    exit 1
fi

# ── 1. System packages ─────────────────────────────────────────────────────────
info "Updating system..."
apt-get update -q
apt-get upgrade -y -q
apt-get install -y -q curl wget ca-certificates gnupg lsb-release git ufw

# ── 2. Docker CE ───────────────────────────────────────────────────────────────
info "Installing Docker..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/debian $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
apt-get update -q
apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable --now docker
info "Docker $(docker --version) installed."

# ── 3. cloudflared ─────────────────────────────────────────────────────────────
info "Installing cloudflared..."
curl -sL --output /tmp/cloudflared.deb \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i /tmp/cloudflared.deb
rm /tmp/cloudflared.deb
info "cloudflared $(cloudflared --version) installed."

# ── 4. App directory ───────────────────────────────────────────────────────────
info "Creating /app/golf..."
mkdir -p /app/golf
mkdir -p /etc/cloudflared

# ── 5. Firewall ────────────────────────────────────────────────────────────────
info "Configuring UFW (allow SSH + HTTP)..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw --force enable

# ── 6. .env.prod template ──────────────────────────────────────────────────────
if [[ ! -f /app/golf/.env.prod ]]; then
    cat > /app/golf/.env.prod << 'ENVEOF'
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/golf?ssl=require
SECRET_KEY=change-me-to-a-long-random-string
ENVIRONMENT=production
DEBUG=false
ALLOWED_ORIGINS=["https://jouwgolftrainer.com"]

# DigitalOcean Spaces (leave blank if not used)
SPACES_KEY=
SPACES_SECRET=
SPACES_REGION=ams3
SPACES_BUCKET=golf-trainer
SPACES_ENDPOINT=https://ams3.digitaloceanspaces.com
SPACES_CDN_ENDPOINT=
ENVEOF
    warn "/app/golf/.env.prod created — fill in DATABASE_URL and SECRET_KEY before first deploy!"
fi

# ── 7. Cloudflare Tunnel config template ───────────────────────────────────────
cat > /etc/cloudflared/config.yml.example << 'CFEOF'
# 1. Run: cloudflared tunnel login
# 2. Run: cloudflared tunnel create golf
# 3. Copy ~/.cloudflared/<TUNNEL_ID>.json to /etc/cloudflared/
# 4. Replace TUNNEL_ID below with the actual UUID

tunnel: TUNNEL_ID
credentials-file: /etc/cloudflared/TUNNEL_ID.json

ingress:
  - hostname: jouwgolftrainer.com
    service: http://localhost:80
  - hostname: www.jouwgolftrainer.com
    service: http://localhost:80
  - hostname: api.jouwgolftrainer.com
    service: http://localhost:80
  - hostname: ssh.jouwgolftrainer.com
    service: ssh://localhost:22
  - service: http_status:404
CFEOF

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════"
echo " Setup complete — follow these steps to go live:"
echo "════════════════════════════════════════════════════"
echo ""
echo "STEP 1  Edit /app/golf/.env.prod"
echo "        Fill in DATABASE_URL and SECRET_KEY."
echo ""
echo "STEP 2  Login to Cloudflare:"
echo "        cloudflared tunnel login"
echo ""
echo "STEP 3  Create the tunnel:"
echo "        cloudflared tunnel create golf"
echo "        → note the TUNNEL_ID (UUID printed by this command)"
echo ""
echo "STEP 4  Copy credentials to system dir:"
echo "        cp ~/.cloudflared/<TUNNEL_ID>.json /etc/cloudflared/"
echo ""
echo "STEP 5  Create the config:"
echo "        cp /etc/cloudflared/config.yml.example /etc/cloudflared/config.yml"
echo "        nano /etc/cloudflared/config.yml   # replace both TUNNEL_ID placeholders"
echo ""
echo "STEP 6  Add Cloudflare DNS records:"
echo "        cloudflared tunnel route dns golf jouwgolftrainer.com"
echo "        cloudflared tunnel route dns golf www.jouwgolftrainer.com"
echo "        cloudflared tunnel route dns golf api.jouwgolftrainer.com"
echo "        cloudflared tunnel route dns golf ssh.jouwgolftrainer.com"
echo ""
echo "STEP 7  Install and start the tunnel as a service:"
echo "        cloudflared service install"
echo "        systemctl enable --now cloudflared"
echo ""
echo "STEP 8  Set up Cloudflare Access for SSH (Zero Trust):"
echo "        → Zero Trust > Access > Applications > Add Self-hosted"
echo "        → Domain: ssh.jouwgolftrainer.com"
echo "        → Under Service Auth: create a Service Token"
echo "        → Copy Client ID + Secret to GitHub Actions secrets:"
echo "             CF_ACCESS_CLIENT_ID"
echo "             CF_ACCESS_CLIENT_SECRET"
echo ""
echo "STEP 9  Add remaining GitHub Actions secrets:"
echo "        DROPLET_USER          (e.g. root)"
echo "        DROPLET_SSH_KEY       (paste contents of your private key)"
echo "        CF_ACCESS_CLIENT_ID"
echo "        CF_ACCESS_CLIENT_SECRET"
echo ""
echo "STEP 10 Push to main — GitHub Actions will build and deploy."
echo ""
echo "════════════════════════════════════════════════════"
