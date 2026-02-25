# AquaSentinel X — API Documentation

## Base URL
```
http://localhost:8000/api
```

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Endpoints

### 🔐 Auth

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new citizen | No |
| POST | `/auth/login` | Login & get token | No |
| GET | `/auth/me` | Get current user | Yes |

#### Register
```json
POST /auth/register
{
  "email": "user@example.com",
  "password": "mypassword",
  "full_name": "John Doe",
  "phone": "+91-9876543210"
}
```

#### Login
```json
POST /auth/login
{
  "email": "user@example.com",
  "password": "mypassword"
}
```

---

### 📢 Complaints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/complaints/` | Submit complaint (multipart) | Yes |
| GET | `/complaints/` | List complaints | Yes |
| GET | `/complaints/track/{number}` | Track by complaint number | No |
| GET | `/complaints/{id}` | Get complaint detail | Yes |
| PATCH | `/complaints/{id}/status` | Update status | Officer+ |
| POST | `/complaints/{id}/media` | Upload media | Yes |

#### Submit Complaint (multipart/form-data)
```
POST /complaints/
Content-Type: multipart/form-data

Fields:
- category: "lake" | "river" | "canal"
- latitude: float
- longitude: float
- description: string (optional)
- address: string (optional)
- image: File (optional)
```

#### Update Status
```json
PATCH /complaints/{id}/status
{
  "status": "in_progress",
  "notes": "Investigation started",
  "resolution_proof_url": "https://..."
}
```

---

### 🌊 Water Bodies

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/water-bodies/` | List all water bodies | No |
| GET | `/water-bodies/geojson` | Get GeoJSON boundaries | No |
| GET | `/water-bodies/{id}` | Get water body details | No |

---

### 📊 Dashboard

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/dashboard/stats` | Dashboard statistics | Yes |
| GET | `/dashboard/heatmap` | Complaint heatmap data | No |
| GET | `/dashboard/critical-alerts` | Critical alerts | No |
| GET | `/dashboard/risk-zones` | Lake risk scores | No |
| GET | `/dashboard/public` | Full public dashboard | No |
| POST | `/dashboard/escalation-check` | Run SLA check | Admin |

---

### 🔔 Notifications

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/notifications/` | List notifications | Yes |
| PATCH | `/notifications/{id}/read` | Mark as read | Yes |
| PATCH | `/notifications/read-all` | Mark all read | Yes |

---

## Data Models

### Complaint Status Flow
```
submitted → validated → ai_processed → assigned → in_progress → resolved
                                                              ↘ rejected
                                                   escalated ↙
```

### Severity Priority
| Score | Priority | SLA |
|-------|----------|-----|
| 70-100 | Critical (Red) | 3 days |
| 40-69 | Medium (Yellow) | 7 days |
| 0-39 | Low (Green) | 10 days |

### Escalation Levels
| Level | Trigger | Action |
|-------|---------|--------|
| Level 1 | 1 day before deadline | Warning notification |
| Level 2 | Deadline passed | Escalate to supervisor |
| Level 3 | 2+ days overdue | Escalate to admin |

---

## Error Responses
```json
{
  "detail": "Error description"
}
```

Common HTTP codes:
- `400` — Bad request
- `401` — Unauthorized
- `403` — Forbidden
- `404` — Not found
- `409` — Conflict (e.g., duplicate email)
- `500` — Server error
