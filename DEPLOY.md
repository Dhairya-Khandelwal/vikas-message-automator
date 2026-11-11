# Deploying Vikas Message Automator as a package

Requires Node 22.13+ if running without Docker (the app uses `node:sqlite`).

## 1. Add these files to your repo root
Copy everything in this folder (including the hidden `.github` folder) into your project, then:
```
git add .
git commit -m "Add Docker package + deploy files"
git push
```
GitHub Actions builds the image and publishes it to GitHub Packages:
`ghcr.io/dhairya-khandelwal/vikas-message-automator:latest`
(Check the repo's **Actions** tab, then **Packages** on the right side.)

## 2. On your server (Ubuntu VPS with Docker installed)
```
git clone https://github.com/Dhairya-Khandelwal/vikas-message-automator.git
cd vikas-message-automator
cp .env.production.example .env
docker compose up -d --build
docker compose logs -f
```
Copy the SETUP TOKEN from the logs, then open the app and create the owner account.

## 3. HTTPS (pick one)
- Caddy: install it, put `Caddyfile.example` (edited) at /etc/caddy/Caddyfile, run `sudo systemctl reload caddy`.
- Cloudflare Tunnel: `cloudflared tunnel --url http://localhost:3000`

## 4. Update later
```
git pull
docker compose up -d --build
```

## 5. Backups
Your WhatsApp login and data are in `./data`. Back that folder up (and use the in-app Backup & Restore). Never commit it.
