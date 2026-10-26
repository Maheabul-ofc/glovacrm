# 🌐 GlovaCRM Production Deployment Guide

This guide details how to deploy the entire GlovaCRM stack (**Next.js Frontend**, **Node.js Express Backend**, **PostgreSQL Database**, and **Redis Queue**) to the cloud.

---

## 🚀 Recommended Deployment Options

| Method | Best For | Complexity | Estimated Cost |
|---|---|---|---|
| **Option 1: Render / Railway** | Fastest, all-in-one cloud setup | ⭐ Very Easy | Free tier / ~$7-14/mo |
| **Option 2: Vercel + Supabase + Render** | Best frontend performance & free DB | ⭐⭐ Easy | Free tier |
| **Option 3: Single VPS (DigitalOcean / AWS / Hetzner)** | Full control, unlimited usage, lowest cost | ⭐⭐⭐ Moderate | $4 - $10/mo |

---

## 🌟 Option 1: 1-Click All-in-One Deployment (Render)

Render supports multi-service repositories via [`render.yaml`](file:///d:/GlovaDev/CRM/render.yaml).

### Steps:
1. Push your CRM repository to **GitHub** or **GitLab**.
2. Log into [Render.com](https://render.com).
3. Click **New +** → **Blueprint**.
4. Connect your GlovaCRM GitHub repository.
5. Render will automatically detect [`render.yaml`](file:///d:/GlovaDev/CRM/render.yaml) and provision:
   - **PostgreSQL Database** (`glovacrm-db`)
   - **Backend API Service** (`glovacrm-backend`)
   - **Frontend Web Service** (`glovacrm-frontend`)
6. Click **Apply**.
7. Once build finishes, you get live, public HTTPS URLs:
   - Frontend: `https://glovacrm-frontend.onrender.com`
   - Backend: `https://glovacrm-backend.onrender.com`

---

## 🌟 Option 2: Best Performance (Vercel + Supabase + Render)

### 1. Database & Cache
- **PostgreSQL:** Create a free project on [Supabase.com](https://supabase.com) or [Neon.tech](https://neon.tech) and copy your `DATABASE_URL` (with pooled connection string).
- **Redis:** Create a free database on [Upstash.com](https://upstash.com) and copy your `REDIS_URL`.

### 2. Backend API (Render or Railway)
- Deploy the `/backend` folder to Render or Railway as a Web Service.
- Set Environment Variables:
  - `DATABASE_URL`: *(Your Supabase connection string)*
  - `REDIS_URL`: *(Your Upstash connection string)*
  - `JWT_SECRET`: *(Random 64-char string)*
  - `JWT_REFRESH_SECRET`: *(Random 64-char string)*
  - `FRONTEND_URL`: `https://your-frontend.vercel.app`
- Build Command: `npm ci && npx prisma generate && npx tsc`
- Start Command: `npx prisma db push --skip-generate && npx tsx prisma/seed.ts && node dist/index.js`

### 3. Frontend Web App (Vercel)
- Import your repository on [Vercel.com](https://vercel.app).
- Set Root Directory to `frontend`.
- Set Environment Variable:
  - `NEXT_PUBLIC_API_URL`: `https://your-backend-service.onrender.com/api`
- Click **Deploy**.

---

## 🌟 Option 3: VPS / Cloud Server (Docker Compose)

Deploy everything on a single virtual server (DigitalOcean Droplet, AWS EC2, Hetzner, Linode, Hostinger VPS) with 1 command.

### 1. Server Setup (Ubuntu 22.04 / 24.04 LTS)
SSH into your server:
```bash
# Update and install Docker & Docker Compose
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install docker-compose-plugin git -y
```

### 2. Clone and Launch
```bash
# Clone your repository
git clone <your-repository-url> glovacrm
cd glovacrm

# Launch all production services
docker compose -f docker-compose.prod.yml up -d --build
```

### 3. Verify
- Backend running on `http://YOUR_SERVER_IP:5000`
- Frontend running on `http://YOUR_SERVER_IP:3000`
- Both PostgreSQL and Redis running inside isolated Docker containers.

---

## 📱 Connecting the Android APK to Deployed Cloud CRM

Once your cloud frontend is live (e.g. `https://glovacrm.yourdomain.com`):
1. Open the **GlovaCRM Android App** on your phone.
2. Tap the **⚙️ Server** button in the top bar.
3. Enter your deployed URL:
   ```
   https://glovacrm.yourdomain.com
   ```
4. Tap **Save & Connect**.
5. Your Android app will now instantly load the live cloud CRM, and all SIM calls will sync directly to your live cloud database!
