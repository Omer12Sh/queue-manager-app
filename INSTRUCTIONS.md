# 🤖 Queue Manager App — Agent Context File

> **This file is written for the AI coding agent (GitHub Copilot / Claude / etc.).**
> It provides full project context so the agent starts every session already knowing the history, architecture, conventions, and current state of the project.
>
> ### ⚠️ Standing instruction to the agent
> **At the end of every session, update this file with any new context learned:**
> - New features added or planned
> - New branches created
> - Schema changes
> - New environment variables or integrations
> - Decisions or conventions established during the session
> - Any bugs found or fixed
> - Changes to tooling, CI, or deployment
>
> Append a new entry under [Session Log](#session-log) at the bottom of this file, with the date and a summary of what changed.

---

## 1. Project Overview

**Queue Manager App** is a modular, full-stack queue management and scheduling platform for service providers (barbers, beauty specialists, eyebrow designers, etc.).

### Roles
| Role | Capabilities |
|------|-------------|
| **Admin** | Full system control, user management, stats dashboard, role changes |
| **Service Provider** | Appointment queue, service/pricing management, client messaging (in-app/SMS/WhatsApp), AI assistant, announcements |
| **Client** | Book appointments, view/edit/cancel bookings, appointment history, provider announcements |

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend (web) | React 18 + TypeScript + Vite + Tailwind CSS |
| Mobile | Expo React Native (expo-router) |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Queue / Cache | Redis (sorted sets for appointment queue) |
| Real-time | Socket.IO |
| Messaging | Twilio (SMS + WhatsApp) |
| AI | OpenAI GPT-4o-mini |
| Container | Docker + Docker Compose |
| i18n | i18next + react-i18next (web & mobile) |

---

## 3. Monorepo Structure

```
queue-manager-app/
├── frontend/               # React + TypeScript + Vite web app
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login/          # LoginPage, RegisterPage
│   │   │   ├── Admin/          # AdminDashboard
│   │   │   ├── ServiceProvider/ # ProviderDashboard, ServicesPage, MessagesPage, SettingsPage
│   │   │   └── Client/         # ClientDashboard, AppointmentsPage, BookingPage
│   │   ├── components/
│   │   │   ├── Layout/         # AppLayout (sidebar + topbar)
│   │   │   └── common/         # StatusBadge, LoadingSpinner, EmptyState, StatCard
│   │   ├── contexts/           # AuthContext, LanguageContext
│   │   ├── i18n/               # i18next setup + locales (en.json, he.json)
│   │   ├── services/           # api.ts (Axios + all API calls)
│   │   └── types/              # Shared TypeScript types
│   └── Dockerfile
│
├── backend/                # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── routes/             # auth, appointments, services, messages, provider, admin, ai, user
│   │   ├── controllers/        # Business logic per route
│   │   ├── middleware/         # JWT auth (auth.middleware.ts), role guard
│   │   └── services/
│   │       ├── prisma.service.ts   # Database client singleton
│   │       ├── redis.service.ts    # Appointment queue (sorted sets)
│   │       ├── socket.service.ts   # Real-time Socket.IO events
│   │       ├── messaging.service.ts # Twilio SMS/WhatsApp
│   │       └── ai.service.ts       # OpenAI GPT-4o-mini assistant
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts             # Demo data seeding
│   └── Dockerfile
│
├── mobile/                 # Expo React Native app
│   ├── app/
│   │   ├── (tabs)/             # Tab-based navigation (index, appointments, services)
│   │   ├── _layout.tsx         # Root layout
│   │   ├── index.tsx           # Root redirect
│   │   └── login.tsx           # Login screen
│   ├── src/
│   │   ├── screens/            # ClientHomeScreen, ProviderHomeScreen, LoginScreen
│   │   ├── contexts/           # AuthContext, LanguageContext
│   │   ├── i18n/               # i18next setup + locales (en.json, he.json)
│   │   ├── services/           # API service layer
│   │   └── types/              # TypeScript types
│   ├── app.json                # Expo config
│   ├── eas.json                # EAS build profiles
│   └── README.md
│
├── docker-compose.yml      # PostgreSQL + Redis + backend + frontend
├── .env.example            # Environment variable template
├── package.json            # Root workspace (npm workspaces: frontend, backend)
└── README.md
```

---

## 4. Branching Strategy

```
master                     ← generic skeleton (this repo)
  ├── feature/maya-brows   ← eyebrow designer profile
  ├── feature/tony-barber  ← barber shop profile
  └── feature/spa-wellness ← spa & wellness center
```

- **`master`** is the reusable skeleton — generic, configurable, no client-specific data.
- Each `feature/<business-name>` branch is a fully customised deployment for a specific client.

**Per-branch customisation points:**
- Business name, logo, colours
- Services and pricing catalogue
- Working hours
- Messaging templates
- Provider-specific features / UI tweaks

---

## 5. Database Schema (Prisma)

### Enums
- `Role`: `ADMIN | SERVICE_PROVIDER | CLIENT`
- `AppointmentStatus`: `PENDING | CONFIRMED | CANCELLED | COMPLETED | RESCHEDULED`
- `MessageType`: `SMS | WHATSAPP | IN_APP`

### Models
| Model | Key Fields |
|-------|-----------|
| `User` | id (cuid), email (unique), password, name, phone?, role, isActive |
| `ProviderProfile` | userId (1-to-1 with User), businessName, workingHours (JSON), defaultLanguage |
| `Service` | providerId, name, durationMin, price, isActive |
| `Appointment` | clientId, providerId, serviceId, startTime, endTime, status, notes? |
| `Message` | fromId, toId? (null = broadcast), content, type, isRead |
| `Announcement` | providerId, title, content, isActive |

---

## 6. Environment Variables

Copy `.env.example` → `backend/.env` and fill in values:

```env
# PostgreSQL
POSTGRES_USER=queueuser
POSTGRES_PASSWORD=change_me_in_production
POSTGRES_DB=queuemanager
DATABASE_URL=postgresql://queueuser:change_me_in_production@localhost:5432/queuemanager

# Backend
JWT_SECRET=super-secret-jwt-key-change-in-production
JWT_EXPIRES=7d
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Redis (optional — for appointment queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# Twilio (optional — SMS / WhatsApp)
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# OpenAI (optional — AI assistant)
OPENAI_API_KEY=sk-xxxxxxxx

# Frontend (Vite)
VITE_API_URL=http://localhost:4000
```

---

## 7. Getting Started (Local Development)

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- npm 9+

### Steps

```bash
# 1. Clone and install all workspace dependencies from root
git clone https://github.com/Omer12Sh/queue-manager-app.git
cd queue-manager-app
npm install

# 2. Copy and configure environment
cp .env.example backend/.env
# Edit backend/.env with your values

# 3. Start PostgreSQL + Redis in Docker
docker compose up postgres redis -d

# 4. Run migrations and seed demo data
cd backend
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
cd ..

# 5. Start dev servers (backend + frontend concurrently)
npm run dev
# Backend API → http://localhost:4000
# Frontend    → http://localhost:5173
```

### Demo Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@queue.app | Admin123! |
| Service Provider | provider@queue.app | Provider123! |
| Client | client@queue.app | Client123! |

---

## 8. Useful npm Scripts (root)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start backend + frontend concurrently |
| `npm run build` | Build backend then frontend |
| `npm run lint` | Lint frontend then backend |

---

## 9. Production Deployment (Docker)

```bash
# Build and start all services (postgres, redis, backend, frontend/nginx)
docker compose up --build -d
# App available at http://localhost (port 80)
```

Services in `docker-compose.yml`:
- `postgres` — PostgreSQL 16-alpine, port 5432
- `redis` — Redis 7-alpine with AOF persistence, port 6379
- `backend` — Node API, port 4000
- `frontend` — Nginx static build, port 80

---

## 10. Mobile App (Expo)

```bash
cd mobile
npm install

# Development (Expo Go)
npx expo start

# EAS Production Build
eas build --platform all --profile production

# EAS Submit to stores
eas submit
```

**EAS Requirements:** Set the `EXPO_TOKEN` secret in GitHub repository settings.

**EAS Build profiles** (`mobile/eas.json`): `development`, `preview`, `production`

---

## 11. API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Create account |
| POST | `/api/auth/login` | Public | Login → JWT |
| GET | `/api/auth/me` | JWT | Current user |
| GET | `/api/appointments` | JWT | List appointments (role-filtered) |
| POST | `/api/appointments` | JWT (Client) | Book appointment |
| PATCH | `/api/appointments/:id/status` | JWT | Update appointment status |
| GET | `/api/appointments/slots/:providerId` | JWT | Available time slots |
| GET | `/api/services/:providerId` | Public | Provider's services |
| POST | `/api/services` | JWT (Provider) | Create service |
| PATCH | `/api/services/:id` | JWT (Provider) | Update service |
| DELETE | `/api/services/:id` | JWT (Provider) | Delete service |
| POST | `/api/messages/send` | JWT (Provider) | Send direct message |
| POST | `/api/messages/broadcast` | JWT (Provider) | Broadcast to all clients |
| GET | `/api/messages` | JWT | Inbox |
| POST | `/api/ai/command` | JWT (Provider) | AI natural language command |
| GET | `/api/admin/stats` | JWT (Admin) | System statistics |
| PATCH | `/api/admin/users/:id/toggle` | JWT (Admin) | Activate/deactivate user |
| GET | `/api/provider/profile` | JWT (Provider) | Get provider profile |
| PATCH | `/api/provider/profile` | JWT (Provider) | Update provider profile |

---

## 12. i18n (Internationalisation)

- **Library:** `i18next` + `react-i18next` (both web and mobile)
- **Supported languages:** English (`en`), Hebrew (`he`)
- **Translation files:**
  - Web: `frontend/src/i18n/locales/{en,he}.json`
  - Mobile: `mobile/src/i18n/locales/{en,he}.json`
- **Language persistence:**
  - Web: `localStorage` under key `qm_language`
  - Mobile: `AsyncStorage` under key `qm_language`
- **RTL:** `LanguageContext` sets `document.dir` for RTL support (Hebrew)
- **Provider language default:** stored on `ProviderProfile.defaultLanguage`

### Translation key namespaces
`nav`, `app`, `auth`, `client`, `appointments`, `booking`, `provider`, `services`, `messages`, `settings`, `admin`, `roles`, `status`, `lang`

---

## 13. CI/CD (GitHub Actions)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `backend-ci.yml` | Push/PR | Lint, typecheck, build backend |
| `frontend-ci.yml` | Push/PR | Lint, typecheck, build frontend |
| `mobile-ci.yml` | Push/PR | Lint, typecheck, build mobile |
| `docker-publish.yml` | Push to `main` | Build & push Docker images to GHCR |
| `eas-build.yml` | Manual or tag | EAS build for iOS/Android |
| `deploy-staging.yml` | As configured | Deploy to staging environment |
| `release.yml` | As configured | Release workflow |

**Dependabot** is configured to cover all 4 ecosystems (npm x3 + GitHub Actions).

---

## 14. AI Assistant

The service provider can type natural language commands to manage their schedule:

- *"What's on my schedule today?"* → Returns a formatted summary
- *"Delay today's appointments by 30 minutes"* → Automatically reschedules and notifies clients
- *"Cancel all pending appointments"* → Bulk cancellation

**Setup:** Add `OPENAI_API_KEY=sk-...` to `backend/.env`

Model: `gpt-4o-mini`

---

## 15. Messaging (Twilio)

Service providers can send:
- Direct in-app, SMS, or WhatsApp messages to specific clients
- Broadcast messages to all their clients

**Setup:** Configure Twilio in `backend/.env` (see Section 6).

---

## 16. Real-time (Socket.IO)

`socket.service.ts` handles real-time events for:
- New appointment bookings
- Status changes (confirmed, cancelled, etc.)
- New in-app messages

---

## 17. Adding a New Client Profile Branch

1. Create branch from `master`: `git checkout -b feature/<business-name>`
2. Update `ProviderProfile` seed data in `backend/prisma/seed.ts`
3. Adjust brand colours in `frontend/tailwind.config.js`
4. Update `app.json` in `mobile/` with the correct app name/slug
5. Set client-specific services/pricing in the seed
6. Customise messaging templates in `messaging.service.ts` if needed
7. Update `eas.json` app identifiers for new mobile build target

---

## 18. Key Conventions

- **IDs:** All models use `cuid()` as the primary key.
- **Timestamps:** All models have `createdAt` / `updatedAt` via Prisma defaults.
- **Soft-delete pattern:** `isActive` boolean on `User` and `Service` (no hard deletes for users).
- **Broadcast messages:** `Message.toId = null` means broadcast to all.
- **Working hours format (JSON):** `{ mon: { open: "09:00", close: "18:00", closed: false }, ... }` for all 7 days (`sun`–`sat`).
- **JWT:** Sent as `Bearer <token>` in `Authorization` header.
- **Frontend API calls:** All go through `frontend/src/services/api.ts` (Axios instance).
- **Mobile API calls:** All go through `mobile/src/services/` layer.

---

## 19. Prisma Commands Cheat Sheet

```bash
cd backend

# Apply migrations in development
npx prisma migrate dev --name <migration-name>

# Apply migrations in production
npx prisma migrate deploy

# Regenerate Prisma client after schema changes
npx prisma generate

# Seed the database
npx ts-node prisma/seed.ts

# Open Prisma Studio (DB GUI)
npx prisma studio
```

---

## 20. Known Optional Integrations

| Feature | Required ENV | Fallback when missing |
|---------|-------------|----------------------|
| AI Assistant | `OPENAI_API_KEY` | Feature disabled, UI shows warning |
| SMS/WhatsApp | Twilio ENVs | In-app messaging still works |
| Redis queue | `REDIS_HOST/PORT` | Falls back to direct DB queries |

---

## Session Log

> **Agent:** append a new entry here at the end of every session. Format:
> ```
> ### YYYY-MM-DD — <short summary>
> - bullet points of what was done / decided / changed
> ```

### 2026-05-12 — Bug fixes: language, notifications, booking, messaging, env

- **Fix 1 – Settings language override**: Removed erroneous `i18n.changeLanguage(p.defaultLanguage)` call in `SettingsPage.tsx` that reset the UI language to the provider profile's `defaultLanguage` every time the settings page was loaded. Language is now solely managed by `LanguageContext` (persisted in `localStorage`).
- **Fix 2 – Notifications dropdown RTL**: Changed the notification dropdown position in `AppLayout.tsx` from `right-0` (always left-opening) to `ltr:right-0 rtl:left-0` so it opens to the correct side in both LTR and RTL layouts, preventing off-screen clipping in Hebrew.
- **Fix 3 – 400 error on timeslots**: Fixed Axios array serialisation mismatch — `serviceIds` array is now joined as a comma-separated string before being sent as a query param (`serviceIds.join(',')` in `api.ts`). The backend's existing `.split(',')` handler processes it correctly. Also added `try/catch` around `handleSelectDate` in `BookingPage.tsx` so a failed slot fetch shows a toast error instead of an infinite loading state.
- **Fix 4 – In-app messages for clients**:
  - Changed `broadcastMessage` backend controller to emit `broadcast:message` directly to each client's personal Socket.IO room (`user:{clientId}`) instead of the `provider-clients:{providerId}` group room that clients never joined. This ensures broadcast messages arrive as real-time notifications.
  - Created `frontend/src/pages/Client/ClientMessagesPage.tsx`: a full inbox view for clients showing all direct and broadcast messages from providers, with mark-as-read functionality.
  - Added `CLIENT` role to the Messages nav item in `AppLayout.tsx`.
  - Added `MessagesRouter` in `App.tsx` that serves `ClientMessagesPage` to clients and `MessagesPage` to providers/admins.
  - Added `messages.clientSubtitle` translation key to `en.json` and `he.json`.
- **Fix 5 – VITE_SHOW_DEMO env var**: Uncommented and set `VITE_SHOW_DEMO=true` in `.env.example` so the demo quick-fill buttons are visible by default in development/demo environments.


- Full monorepo scaffolded: `/frontend` (React+Vite+Tailwind), `/backend` (Express+TypeScript+Prisma), `/mobile` (Expo React Native).
- Three user roles implemented: `ADMIN`, `SERVICE_PROVIDER`, `CLIENT`.
- JWT authentication with role-based middleware in place.
- Prisma schema defined with models: `User`, `ProviderProfile`, `Service`, `Appointment`, `Message`, `Announcement`.
- Redis sorted-set queue for appointments; Socket.IO for real-time updates.
- Twilio (SMS/WhatsApp) and OpenAI GPT-4o-mini (AI assistant) integrations wired up as optional services.
- i18n: `i18next` + `react-i18next` for both web and mobile; English (`en`) and Hebrew (`he`) locales; `qm_language` key in localStorage (web) / AsyncStorage (mobile); RTL handled via `LanguageContext`.
- CI/CD: 7 GitHub Actions workflows (`backend-ci`, `frontend-ci`, `mobile-ci`, `docker-publish`, `eas-build`, `deploy-staging`, `release`). Dependabot for all 4 ecosystems.
- Branching strategy established: `master` = generic skeleton; `feature/<business-name>` = per-client deployment. First planned client profile: `feature/maya-brows` (eyebrow designer).
- Demo seed accounts: `admin@queue.app / Admin123!`, `provider@queue.app / Provider123!`, `client@queue.app / Client123!`.
- `INSTRUCTIONS.md` created (this file) as the persistent agent context document.
