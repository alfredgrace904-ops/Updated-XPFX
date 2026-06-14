# XpressPro FX — Complete Deployment Guide

## Works On Any Platform
- Railway.app (free tier)
- Render.com (free tier)
- Fly.io (free tier)
- VPS (DigitalOcean, Hetzner, Vultr)
- Local computer (Windows, Mac, Linux)

---

## STEP 1 — Prerequisites (install once)

Install Node.js 20+ from: https://nodejs.org (choose LTS)

Then open terminal and run:
```
npm install -g pnpm
```

---

## STEP 2 — Set Up Environment Variables

Copy .env.example to .env:
```
cp .env.example .env
```

Open .env and fill in at minimum:
- SESSION_SECRET (generate at randomkeygen.com — 256-bit WEP key)
- ADMIN_EMAIL
- ADMIN_PASSWORD
- PORT=8080

---

## STEP 3 — Build The Project

```
node build.js
```

This installs all dependencies, builds the API server,
and builds both frontends. Takes 2-5 minutes first time.

---

## STEP 4 — Start The Server

```
node artifacts/api-server/dist/index.mjs
```

Or use the start script:
```
bash start.sh
```

Your app is now running at:
- Main platform: http://localhost:8080
- Admin portal:  http://localhost:8080/xpadmin

---

## Deploying to Railway (Free)

1. Create account at railway.app (sign up with GitHub)
2. Create new repo at github.com and upload all these files
3. In Railway: New Project > Deploy from GitHub > select your repo
4. Add Variables in Railway dashboard (copy from .env.example)
5. Add PostgreSQL service in Railway (sets DATABASE_URL automatically)
6. Your app is live at: https://yourapp.railway.app

---

## Deploying to Render (Free)

1. Create account at render.com
2. Upload files to GitHub
3. New Web Service > Connect GitHub repo
4. Build Command: npm install -g pnpm && node build.js
5. Start Command: node artifacts/api-server/dist/index.mjs
6. Add environment variables from .env.example
7. Add PostgreSQL from Render dashboard

---

## Deploying to a VPS (Ubuntu)

SSH into your server then run:
```
apt update && apt install -y nodejs npm git
npm install -g pnpm
git clone your-repo /var/www/xpressprofx
cd /var/www/xpressprofx
cp .env.example .env
nano .env   # fill in your values
node build.js
npm install -g pm2
pm2 start artifacts/api-server/dist/index.mjs --name xpressprofx
pm2 save && pm2 startup
```

---

## Running in Development Mode (3 terminals)

Terminal 1 — API server:
```
cd artifacts/api-server && PORT=8080 pnpm run dev
```

Terminal 2 — Main frontend:
```
cd artifacts/nextrade && PORT=3000 BASE_PATH=/ pnpm run dev
```

Terminal 3 — Admin portal:
```
cd artifacts/admin-portal && PORT=3001 BASE_PATH=/xpadmin/ pnpm run dev
```

Then open:
- Main app:    http://localhost:3000
- Admin:       http://localhost:3001
- API:         http://localhost:8080/api

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| SESSION_SECRET | YES | Random 64+ char string |
| ADMIN_EMAIL | YES | Admin login email |
| ADMIN_PASSWORD | YES | Admin login password |
| PORT | YES | Server port (8080) |
| NODE_ENV | YES | production or development |
| DATABASE_URL | Recommended | PostgreSQL connection string |
| ALCHEMY_API_KEY | Recommended | Live blockchain data |
| SENDGRID_API_KEY | Recommended | Email notifications |
| MOONPAY_API_KEY | Optional | Buy crypto feature |
| MOONPAY_SECRET_KEY | Optional | Required with MOONPAY_API_KEY |
| MOONPAY_WEBHOOK_SECRET | Optional | Webhook verification |
| OPENAI_API_KEY | Optional | AI assistant |
| ALLOWED_ORIGINS | Optional | CORS — your domain URLs |

---

## Admin Login
URL: http://yoursite.com/xpadmin
Email: your ADMIN_EMAIL value
Password: your ADMIN_PASSWORD value

## Support
Email: support@xpressprofx.com
