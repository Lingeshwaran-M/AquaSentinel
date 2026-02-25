# 🌊 AquaSentinel X

**AI-Driven Water Body Encroachment Monitoring & Enforcement Platform**

AquaSentinel X empowers citizens to report illegal encroachments on water bodies and ensures time-bound action by authorities using AI-based classification, severity scoring, predictive risk analytics, and automated SLA escalation.

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js (TS)  │────▶│  FastAPI (Python) │────▶│  PostgreSQL +   │
│   Frontend      │◀────│  Backend API      │◀────│  PostGIS        │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                        ┌────────▼─────────┐
                        │   AI Engine       │
                        │  - Classification │
                        │  - Severity (ESI) │
                        │  - Risk Predict.  │
                        └──────────────────┘
```

## 📁 Project Structure

```
aquasentinel-x/
├── frontend/          # Next.js + TypeScript + TailwindCSS + Leaflet
├── backend/           # FastAPI Python backend
│   ├── routes/        # API route handlers
│   ├── services/      # Business logic
│   ├── ai/            # AI classification, severity, risk engines
│   ├── models/        # SQLAlchemy / Pydantic models
│   └── utils/         # Utilities and helpers
├── database/          # SQL schema, migrations, seed data
├── ai/                # AI model training & artifacts
├── docs/              # API docs, architecture diagrams
├── docker-compose.yml # Full-stack Docker orchestration
└── .env.example       # Environment variable template
```

## 🚀 Quick Start

### Prerequisites

- **Docker** & **Docker Compose** (recommended)
- Or manually: **Python 3.11+**, **Node.js 18+**, **PostgreSQL 15+ with PostGIS**

### Option 1: Docker (Recommended)

```bash
# Clone the repo
git clone <repo-url> && cd aquasentinel-x

# Copy environment file
cp .env.example .env

# Start all services
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Option 2: Manual Setup

#### 1. Database

```bash
# Create PostgreSQL database with PostGIS
psql -U postgres -c "CREATE DATABASE aquasentinel;"
psql -U postgres -d aquasentinel -c "CREATE EXTENSION postgis;"
psql -U postgres -d aquasentinel -f database/schema.sql
psql -U postgres -d aquasentinel -f database/seed.sql
```

#### 2. Backend

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## 🔑 Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/aquasentinel` |
| `SECRET_KEY` | JWT secret key | `change-me-in-production` |
| `SMTP_HOST` | Email SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | Email SMTP port | `587` |
| `SMTP_USER` | SMTP username | — |
| `SMTP_PASS` | SMTP password | — |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🤖 AI Modules

| Module | Purpose |
|---|---|
| **Image Classifier** | Detects violation type (construction, debris, land filling, pollution) |
| **ESI Engine** | Calculates Environmental Severity Index (0–100) |
| **Risk Predictor** | Lake-level risk scoring based on historical data & trends |

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
