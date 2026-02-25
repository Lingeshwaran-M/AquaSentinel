# AquaSentinel X — Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  Report   │ │  Track   │ │ Dashboard│ │ Officer Dashboard│   │
│  │  Page     │ │  Page    │ │  (Public)│ │ (Auth Required)  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│  ┌──────────────────────────────────────┐                       │
│  │     Leaflet.js Map Components        │                       │
│  └──────────────────────────────────────┘                       │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST API (JSON)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI)                          │
│                                                                 │
│  ┌───────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │   Routes      │  │   Services       │  │   Utilities      │  │
│  │  • auth       │  │  • complaint_svc │  │  • auth (JWT)    │  │
│  │  • complaints │  │  • escalation_svc│  │  • geo (PostGIS) │  │
│  │  • water_body │  │  • dashboard_svc │  │  • notifications │  │
│  │  • dashboard  │  │                  │  │                  │  │
│  │  • notif.     │  │                  │  │                  │  │
│  └───────┬───────┘  └────────┬─────────┘  └──────────────────┘  │
│          │                   │                                   │
│  ┌───────▼───────────────────▼─────────────────────────────────┐│
│  │                  AI ENGINE                                   ││
│  │  ┌─────────────┐ ┌──────────────┐ ┌────────────────────┐   ││
│  │  │  Classifier  │ │ Severity(ESI)│ │ Risk Predictor     │   ││
│  │  │  CNN-based   │ │ Weighted     │ │ Lake-level scoring │   ││
│  │  │  Detection   │ │ Scoring      │ │ Trend analysis     │   ││
│  │  └─────────────┘ └──────────────┘ └────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────┘│
└────────────────────────┬────────────────────────────────────────┘
                         │ SQL + PostGIS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                 DATABASE (PostgreSQL + PostGIS)                  │
│                                                                 │
│  ┌──────────┐ ┌──────────────┐ ┌────────────────┐              │
│  │  users   │ │  complaints  │ │  water_bodies  │              │
│  └──────────┘ └──────────────┘ └────────────────┘              │
│  ┌──────────┐ ┌──────────────┐ ┌────────────────┐              │
│  │  media   │ │ escalation   │ │ notifications  │              │
│  └──────────┘ └──────────────┘ └────────────────┘              │
│  ┌──────────┐ ┌──────────────┐                                  │
│  │ risk_hist│ │ status_log   │                                  │
│  └──────────┘ └──────────────┘                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Complaint Processing Pipeline

```
1. CITIZEN submits complaint
   ├── GPS location (map click)
   ├── Image/Video upload
   ├── Category selection
   └── Description

2. GEO-FENCING VALIDATION
   ├── PostGIS ST_Contains check
   ├── If inside boundary → VALID
   ├── If outside → Fallback: ST_DWithin (500m radius)
   └── If still outside → REJECT

3. AI IMAGE CLASSIFICATION
   ├── Preprocess image (224x224, normalize)
   ├── CNN inference → violation type
   ├── Output: type, confidence, urgency
   └── Types: construction, debris, land_filling, pollution

4. ENVIRONMENTAL SEVERITY INDEX (ESI)
   ├── Violation type weight     (40%)
   ├── AI urgency level          (20%)
   ├── Location sensitivity      (15%)
   ├── Complaint density         (15%)
   ├── Environmental impact      (10%)
   └── Output: score (0-100), priority

5. SLA ASSIGNMENT
   ├── Critical → 3 day deadline
   ├── Medium   → 7 day deadline
   └── Low      → 10 day deadline

6. AUTO-ASSIGN OFFICER
   └── Least-loaded officer algorithm

7. NOTIFICATIONS
   ├── Citizen: confirmation email
   └── Officer: assignment alert

8. MONITORING & ESCALATION (periodic)
   ├── Level 1: Warning (1 day before)
   ├── Level 2: Supervisor (deadline passed)
   └── Level 3: Admin (2+ days overdue)
```

## Technology Decisions

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Frontend | Next.js + TypeScript | SSR, file-based routing, type safety |
| Styling | TailwindCSS | Rapid prototyping, utility-first |
| Maps | Leaflet.js + react-leaflet | Open source, lightweight, PostGIS compatible |
| Backend | FastAPI | Async, auto-docs, high performance |
| Database | PostgreSQL + PostGIS | Spatial queries, ACID compliance |
| Auth | JWT (jose) + bcrypt | Stateless, scalable |
| AI | Python (Pillow, NumPy, scikit-learn) | Extensible to TensorFlow/PyTorch |
| Container | Docker Compose | Full-stack orchestration |
