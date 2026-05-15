# Golf Trainer

A production-ready iPhone/iPad progressive web app for golf training.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| PWA | vite-plugin-pwa (offline, installable on iOS) |
| Backend | Python 3.11 + FastAPI + SQLAlchemy async |
| Auth | JWT (python-jose + bcrypt) |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Storage | DigitalOcean Spaces (S3-compatible) |
| Container | Docker + Docker Compose |
| CI/CD | GitHub Actions → DigitalOcean Droplet |
| Proxy | Nginx |

---

## Quick Start (Local Dev)

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # edit as needed
python seed.py              # creates demo users + exercises
uvicorn main:app --reload
```

API docs: http://localhost:8000/api/docs (dev only)

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@golf.app | Admin1234! |
| Coach | coach@golf.app | Coach1234! |
| Player | player@golf.app | Player1234! |

### 3. Docker (full stack)

```bash
docker compose up --build
```

---

## Production Deployment

### Prerequisites

1. DigitalOcean Droplet with Docker installed
2. DigitalOcean Managed PostgreSQL
3. DigitalOcean Spaces bucket
4. GitHub repository with Actions enabled

### GitHub Secrets Required

| Secret | Description |
|---|---|
| `DROPLET_HOST` | Droplet IP or hostname |
| `DROPLET_USER` | SSH user (e.g. `root`) |
| `DROPLET_SSH_KEY` | Private SSH key |
| `GHCR_TOKEN` | GitHub token with `read:packages` |

### Environment Variables on Droplet

Create `/app/golf/.env.prod`:

```env
DATABASE_URL=postgresql+asyncpg://user:pass@host:25060/golf?ssl=require
SECRET_KEY=<strong-random-key>
SPACES_KEY=<do-spaces-key>
SPACES_SECRET=<do-spaces-secret>
SPACES_REGION=ams3
SPACES_BUCKET=golf-trainer
SPACES_ENDPOINT=https://ams3.digitaloceanspaces.com
SPACES_CDN_ENDPOINT=https://golf-trainer.ams3.cdn.digitaloceanspaces.com
ENVIRONMENT=production
ALLOWED_ORIGINS=["https://yourdomain.com"]
```

### Deploy

Push to `main` → GitHub Actions builds and deploys automatically.

---

## Project Structure

```
golf-app/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Settings (pydantic-settings)
│   ├── database.py          # Async SQLAlchemy engine + session
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic v2 request/response schemas
│   ├── routers/             # API route handlers
│   │   ├── auth.py          # /api/auth/*
│   │   ├── exercises.py     # /api/exercises/*
│   │   ├── sessions.py      # /api/sessions/*
│   │   ├── videos.py        # /api/videos/*
│   │   ├── coach.py         # /api/coach/*
│   │   └── stats.py         # /api/stats/*
│   ├── auth/                # JWT + dependency injection
│   ├── services/storage.py  # DigitalOcean Spaces / S3 helpers
│   ├── alembic/             # DB migrations
│   └── seed.py              # Demo data seeder
│
├── frontend/
│   └── src/
│       ├── api/             # Axios API clients per domain
│       ├── components/      # Reusable UI components
│       ├── context/         # React context (Auth)
│       ├── hooks/           # TanStack Query hooks
│       ├── pages/           # Route-level page components
│       ├── types/           # TypeScript interfaces
│       └── lib/utils.ts     # Helpers + constants
│
├── nginx/nginx.conf         # Reverse proxy (API + frontend)
├── docker-compose.yml       # Local development
├── docker-compose.prod.yml  # Production
└── .github/workflows/       # CI (tests) + CD (deploy)
```

---

## API Overview

| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Get JWT token |
| GET | /api/auth/me | Current user |
| GET | /api/exercises | List exercises |
| POST | /api/sessions | Log training session |
| GET | /api/sessions | Session history |
| POST | /api/videos/upload-url | Get presigned S3 URL |
| POST | /api/videos | Register uploaded video |
| GET | /api/stats | Training statistics |
| GET | /api/coach/players | List players (coach only) |
| POST | /api/coach/notes | Add coaching note (coach only) |

---

## PWA / iOS Features

- Installable to iPhone/iPad home screen (`display: standalone`)
- Safe area insets for iPhone notch/Dynamic Island
- Offline support via Workbox service worker
- App shortcuts (New Session from home screen)
- Optimistic touch interactions (44px minimum tap targets)

---

## Adding DB Migrations

```bash
cd backend
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```
