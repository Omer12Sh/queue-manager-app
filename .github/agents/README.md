# Queue Manager — Custom Agents

This directory contains all role-specific custom agents for the Queue Manager monorepo.

---

## 🚀 Quick Start — You Only Need One Agent

**Always start with the Team Orchestrator.**

Just tell it what you want in plain language. It will:
- Classify your request
- Select the right specialist agents
- Create their prompts
- Execute in optimal sequence
- Validate and secure the output
- Return a single complete answer
- Suggest improvements to itself over time

You do not need to know which agents exist or how to prompt them.

---

## Agent Catalog

| File | Agent | Role |
|------|-------|------|
| `team-orchestrator.md` | **Team Orchestrator** | ⬅ Default entry point for all tasks |
| `product-manager.md` | Product Manager | Scope, acceptance criteria, rollout |
| `backend-api.md` | Backend API | Routes, controllers, services, middleware |
| `database-prisma.md` | Database and Prisma | Schema, migrations, seed, data integrity |
| `frontend-web.md` | Frontend Web | React UI, routing, i18n, RTL |
| `mobile-app.md` | Mobile App | Expo flows, navigation, parity |
| `realtime-messaging.md` | Realtime and Messaging | Socket.IO, events, broadcast/direct messages |
| `qa-validation.md` | QA and Validation | Lint, build, typecheck, regression |
| `devops-release.md` | DevOps and Release | CI/CD, Docker, env, deployment |
| `security.md` | Security | Auth, authz, input safety, secrets |

---

## Orchestrator-First Workflow

```
User prompt
    │
    ▼
Team Orchestrator
    │
    ├── Product Manager (if scope unclear)
    │
    ├── Database and Prisma (if schema changes)
    │
    ├── Backend API (if endpoints change)
    │
    ├── Frontend Web ─┐
    │                  ├── (parallel when independent)
    ├── Mobile App   ─┘
    │
    ├── Realtime and Messaging (if events/messages touched)
    │
    ├── Security (always, for code changes)
    │
    ├── QA and Validation (always, for code changes)
    │
    └── DevOps and Release (if CI/deploy touched)
         │
         ▼
    Consolidated final answer to user
```

---

## When to Prompt Specialist Agents Directly

Avoid this unless you have a very targeted, isolated task and already know exactly what surface is touched. In all other cases, use Team Orchestrator.

| Acceptable direct use | Example |
|----------------------|---------|
| Fix a single known schema field | `database-prisma.md` |
| Review a single endpoint in isolation | `backend-api.md` |
| Check one CI workflow | `devops-release.md` |
| Security audit of a specific file | `security.md` |

---

## Validation Baseline

All code changes must pass these checks before merge:

```bash
# Root (backend + frontend)
npm run lint
npm run build

# Mobile
cd mobile
npm run lint
npm run typecheck
```

---

## Self-Improvement Convention

The Team Orchestrator appends a `🔄 Suggested Update` block at the end of each task when it detects improvements to its own routing, prompts, or quality gates.

When you see this block:
1. Review the proposed change
2. If it looks right, apply it to `team-orchestrator.md`
3. Merge the updated file to the default branch to activate it

This keeps the orchestrator learning and improving with every task.

---

## Codebase Quick Reference

| Layer | Path |
|-------|------|
| Backend routes | `/backend/src/routes/` |
| Controllers | `/backend/src/controllers/` |
| Services | `/backend/src/services/` |
| Prisma schema | `/backend/prisma/schema.prisma` |
| Seed data | `/backend/prisma/seed.ts` |
| Frontend pages | `/frontend/src/pages/` |
| Frontend API layer | `/frontend/src/services/api.ts` |
| Frontend i18n | `/frontend/src/i18n/locales/` |
| Mobile routes | `/mobile/app/` |
| Mobile screens | `/mobile/src/screens/` |
| Mobile services | `/mobile/src/services/` |
| Mobile i18n | `/mobile/src/i18n/locales/` |
| GitHub Actions | `/.github/workflows/` |
| Agent definitions | `/.github/agents/` |

---

## Roles and Access

| Role | Value |
|------|-------|
| Admin | `ADMIN` |
| Service Provider | `SERVICE_PROVIDER` |
| Client | `CLIENT` |

Auth: JWT ****** validated in `/backend/src/middleware/auth.middleware.ts`

---

## Adding a New Agent

1. Create a new file `/.github/agents/<role-name>.md`
2. Use the standard frontmatter template (name + description)
3. Define: mission, responsibilities, required operating order, quality bar, output format
4. Register it in the Team Orchestrator's **Specialist Agents Catalog** section
5. Add routing rules to the **Agent Selection Rules** section
6. Update this README table
7. Merge to default branch to activate
