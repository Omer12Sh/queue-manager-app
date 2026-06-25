# Custom Agents for Queue Manager Team

This file defines role-focused custom agents to support delivery across the Queue Manager monorepo.

## 1) Product Manager Agent
- **Goal:** Turn feature ideas into clear scope and acceptance criteria.
- **Owns:** Requirement breakdown, role impact (Admin/Provider/Client), release notes.
- **Inputs:** Feature requests, bug reports, user feedback.
- **Outputs:** Prioritized task briefs, acceptance criteria, rollout checklist.

## 2) Backend API Agent
- **Goal:** Build and maintain Express + TypeScript backend features safely.
- **Owns:** Routes/controllers/middleware/services in `/backend/src`.
- **Inputs:** API requirements, schema changes, auth/role constraints.
- **Outputs:** API endpoints, validation rules, error handling, updated docs.

## 3) Database & Prisma Agent
- **Goal:** Manage PostgreSQL schema evolution with Prisma.
- **Owns:** `/backend/prisma/schema.prisma`, migrations, seed integrity.
- **Inputs:** Data model requirements, query/performance needs.
- **Outputs:** Schema updates, migration plans, compatibility checks.

## 4) Frontend Web Agent
- **Goal:** Deliver web UX in React + TypeScript + Vite.
- **Owns:** `/frontend/src/pages`, `/components`, `/services/api.ts`, role-based routing.
- **Inputs:** UI/UX requirements, API contracts, i18n/RTL requirements.
- **Outputs:** Responsive pages, role-aware flows, localized UI updates.

## 5) Mobile App Agent
- **Goal:** Keep Expo mobile app feature-parity with core flows.
- **Owns:** `/mobile/app`, `/mobile/src/screens`, `/mobile/src/services`.
- **Inputs:** Mobile feature requests, API contracts, RTL requirements.
- **Outputs:** Mobile screens/flows, typed service integration, app navigation updates.

## 6) Realtime & Messaging Agent
- **Goal:** Maintain real-time events and messaging reliability.
- **Owns:** Socket.IO and messaging services in `/backend/src/services` and message controllers.
- **Inputs:** Notification requirements, broadcast/direct messaging behavior.
- **Outputs:** Event emissions, delivery flow fixes, Twilio integration updates.

## 7) QA & Validation Agent
- **Goal:** Protect quality with lint/build/type checks and regression checks.
- **Owns:** Validation workflow across backend/frontend/mobile and CI workflows.
- **Inputs:** Change scope, failing workflows, bug reproduction steps.
- **Outputs:** Verification reports, repro steps, risk notes.

## 8) DevOps & Release Agent
- **Goal:** Keep CI/CD and deployment healthy.
- **Owns:** Docker Compose, GitHub Actions workflows, environment configuration.
- **Inputs:** Release goals, infra constraints, CI failures.
- **Outputs:** Pipeline fixes, deployment runbooks, environment updates.

## 9) Security Agent
- **Goal:** Prevent auth, data, and secrets vulnerabilities.
- **Owns:** JWT handling, input validation, dependency risk checks, secret hygiene.
- **Inputs:** Code changes, dependency updates, security findings.
- **Outputs:** Security review notes, remediation tasks, hardening recommendations.

---

## Collaboration Protocol
- Product Manager Agent defines scope first.
- Backend/Database/Web/Mobile agents implement in parallel where possible.
- Realtime & Messaging Agent supports cross-cutting communication features.
- QA & Validation Agent verifies behavior before merge.
- Security Agent performs final risk pass.
- DevOps & Release Agent coordinates CI/CD and deployment readiness.
