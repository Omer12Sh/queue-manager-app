# 🗓️ Queue Manager App

A modular, full-stack queue management and scheduling platform for service providers — barbers, beauty care specialists, eyebrow designers, and more.

**Branch strategy:**
- `master` → skeleton (this repo) — generic, configurable baseline
- `feature/<business-name>` → customised deployment for each individual client

---

## ✨ Features

### Three Role-Based Frontends

| Role | Capabilities |
|------|-------------|
| **Admin** | Full system control, user management, stats dashboard, role changes |
| **Service Provider** | Appointment queue, services/pricing management, client messaging (in-app/SMS/WhatsApp), AI assistant, announcements |
| **Client (End User)** | Book appointments, view/edit/cancel bookings, appointment history, provider announcements |

### Core Capabilities
- 🔐 JWT authentication with role-based access control
- 📅 Real-time appointment queue with conflict detection
- ⚡ WebSocket (Socket.IO) for live updates
- 🚦 Redis sorted-set appointment queue (fast scheduling)
- 🤖 AI assistant (GPT-4o-mini) — natural language scheduling commands
- 📱 SMS & WhatsApp messaging via Twilio
- 📢 Broadcast messages to all clients
- 📊 Admin dashboard with system stats

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (via Prisma ORM) |
| Queue / Cache | Redis (sorted set for appointment queue) |
| Real-time | Socket.IO |
| Messaging | Twilio (SMS + WhatsApp) |
| AI | OpenAI GPT-4o-mini |
| Container | Docker + Docker Compose |

> **Note on Kafka:** Redis pub/sub + sorted sets cover this workload well. Kafka would be overkill until you're managing thousands of concurrent providers.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (for PostgreSQL + Redis)
- npm 9+

### 1. Clone & install
```bash
git clone https://github.com/Omer12Sh/queue-manager-app.git
cd queue-manager-app
npm install
```

### 2. Set up environment
```bash
cp .env.example backend/.env
# Edit backend/.env with your values
```

### 3. Start PostgreSQL + Redis
```bash
docker compose up postgres redis -d
```

### 4. Run database migrations & seed
```bash
# Run from project root — no need to cd into backend
npm run prisma:migrate --workspace=backend -- --name init
npm run prisma:seed --workspace=backend
```

### 5. Start development servers
```bash
# Make sure you're in the project root (not inside backend/ or frontend/)
npm run dev
```

This starts:
- Backend API: http://localhost:4000
- Frontend: http://localhost:5173

### Demo Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@queue.app | Admin123! |
| Service Provider | provider@queue.app | Provider123! |
| Client | client@queue.app | Client123! |

---

## 🐳 Production Deployment

```bash
# Build and start all services
docker compose up --build -d

# App available at http://localhost
```

---

## 🧩 Project Structure

```
queue-manager-app/
├── frontend/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login/          # LoginPage, RegisterPage
│   │   │   ├── Admin/          # AdminDashboard
│   │   │   ├── ServiceProvider/ # ProviderDashboard, ServicesPage, MessagesPage, SettingsPage
│   │   │   └── Client/         # ClientDashboard, AppointmentsPage, BookingPage
│   │   ├── components/
│   │   │   ├── Layout/         # AppLayout (sidebar + topbar)
│   │   │   └── common/         # StatusBadge, LoadingSpinner, EmptyState, StatCard
│   │   ├── contexts/           # AuthContext
│   │   ├── services/           # api.ts (Axios + all API calls)
│   │   └── types/              # TypeScript types
│   └── Dockerfile
│
├── backend/                # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/             # auth, appointments, services, messages, provider, admin, ai
│   │   ├── controllers/        # Business logic per route
│   │   ├── middleware/         # JWT auth, role guard
│   │   └── services/
│   │       ├── prisma.service.ts   # Database client
│   │       ├── redis.service.ts    # Appointment queue
│   │       ├── socket.service.ts   # Real-time events
│   │       ├── messaging.service.ts # Twilio SMS/WhatsApp
│   │       └── ai.service.ts       # OpenAI assistant
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts             # Demo data
│   └── Dockerfile
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🤖 AI Assistant

The service provider can type natural language commands:

- *"What's on my schedule today?"* → Returns a formatted summary
- *"Delay today's appointments by 30 minutes"* → Automatically reschedules and notifies clients
- *"Cancel all pending appointments"* → Bulk cancellation

**Setup:** Add `OPENAI_API_KEY=sk-...` to `backend/.env`

---

## 📱 SMS / WhatsApp Messaging

Service providers can send:
- Direct messages to specific clients
- Broadcast messages to all their clients
- Appointment reminders

**Setup:** Configure Twilio in `backend/.env`:
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

---

## 🌿 Branching Strategy

```
master                     ← this skeleton
  ├── feature/maya-brows   ← eyebrow designer profile
  ├── feature/tony-barber  ← barber shop profile
  └── feature/spa-wellness ← spa & wellness center
```

Each branch customises:
- Business name, logo, colors
- Services and pricing
- Working hours
- Messaging templates
- Provider-specific features

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login → JWT |
| GET | `/api/auth/me` | Current user |
| GET | `/api/appointments` | List appointments (filtered by role) |
| POST | `/api/appointments` | Book appointment |
| PATCH | `/api/appointments/:id/status` | Update status |
| GET | `/api/appointments/slots/:providerId` | Available time slots |
| GET | `/api/services/:providerId` | Provider's services |
| POST | `/api/services` | Create service |
| POST | `/api/messages/send` | Send direct message |
| POST | `/api/messages/broadcast` | Broadcast to all clients |
| POST | `/api/ai/command` | AI natural language command |
| GET | `/api/admin/stats` | System statistics |
