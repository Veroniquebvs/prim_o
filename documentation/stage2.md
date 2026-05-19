# High-Level Plan - PRIM'O
**Project Portfolio | Holberton School — Cohort C28**  
**Team:** Loïc Cerqueira · Véronique Beauvais  
**Project Start:** May 2026 | **Expected Delivery:** End of June 2026

---

## Table of Contents
1. [Project Objectives — SMART Method](#1-project-objectives--smart-method)
2. [Project Scope](#2-project-scope)
3. [Risk Identification](#3-risk-identification)
4. [High-Level Plan & Timeline](#4-high-level-plan--timeline)

---

## 1. Project Objectives — SMART Method

Rather than listing isolated criteria, the team formulated the project objectives as a structured set of commitments, each grounded in the SMART framework.

### Specific
PRIM'O aims to provide SME employers with a secure, real-time token-based recognition platform. The system allows employers to instantly reward individual employees for observed performance, and enables those employees to redeem earned tokens for exclusive promotional codes through a curated partner marketplace. The platform enforces strict role separation between Employer and Employee interfaces, and ensures financial-grade integrity across every token movement.

### Measurable
The project will be considered successful if the following are delivered by end of June 2026:

- A fully functional authentication system with role-based access control (Employer / Employee)
- A working token ledger supporting EUR-to-token conversion and real-time allocation
- A partner marketplace where employees can redeem tokens for unique promotional codes
- A real-time push notification system triggered upon token attribution
- An audit trail and analytics dashboard accessible to employers
- A tested, containerized, and deployable MVP validated by the team and Holberton School

### Achievable
The scope has been deliberately kept focused on the core token-reward loop. The team consists of two full-stack developers with complementary specializations — security & DevOps on one side, data architecture & UX on the other. The technology stack (Node.js, Express, PostgreSQL, React) reflects tools both members are confident working with. Docker containerization is introduced progressively to avoid added complexity at the MVP stage.

### Relevant
Employee disengagement driven by delayed and impersonal recognition is a documented and widespread issue in SMEs. PRIM'O directly addresses a gap in how small organizations currently handle performance recognition — most rely on annual bonuses or collective benefits that carry no individual meritocratic signal. The token model avoids the heavy regulatory constraints of traditional financial transactions while restoring a direct, emotionally meaningful link between effort and reward.

### Time-bound
The project runs from May to end of June 2026, spanning approximately 8 weeks split across two phases:

- **Phase A — Design & Foundations** (May): 2 focused days per week. Architecture, UX, and environment setup.
- **Phase B — MVP Sprint** (June): Full-time, 5 days per week. Feature development, testing, and deployment.

Internal checkpoints are established at the end of each week to assess progress and adjust priorities if needed.

---

## 2. Project Scope

### In Scope
The following features and deliverables are part of the MVP:

- Secure account creation and JWT-based authentication
- Role-based access control: Employer (Admin) and Employee (User)
- EUR budget-to-token conversion engine with balance management
- Real-time token allocation from employer to individual employee
- Employee token wallet with full transaction history
- Partner promotional code marketplace (claim system)
- Push notification system triggered upon token attribution
- Employer analytics dashboard: allocation trends, budget tracking
- Full audit trail of all token movements
- Docker containerization for consistent deployment
- Deployment on a public hosting environment (Vercel / Render)

### Out of Scope
The following elements will **not** be addressed in this MVP phase:

- Native mobile application (iOS / Android)
- Automated or AI-driven token attribution (rule-based engines)
- Payroll or legal financial transaction integration
- Multi-company / holding-level management
- Real-time chat between employer and employee
- External HRIS system integrations (e.g., BambooHR, Workday)
- Advanced reporting with industry benchmarking
- Multi-language support beyond French/English

---

## 3. Risk Identification

Risks have been categorized by criticality level to help the team prioritize mitigation efforts.

### 🔴 High Criticality

| Risk | Impact | Mitigation |
|---|---|---|
| **Token double-spending or data loss** | Breaks financial trust and core product integrity | Enforce atomic MongoDB operations on all token movements; no partial transactions allowed |
| **JWT security misconfiguration** | Unauthorized access to employer or employee accounts | Server-side validation on 100% of sensitive routes; short token expiry + refresh token strategy |
| **Scope creep during MVP sprint** | Overengineered MVP, missed deadline | Any addition beyond defined scope requires full team agreement; backlog is frozen after Week 4 |

### 🟡 Medium Criticality

| Risk | Impact | Mitigation |
|---|---|---|
| **Timeline pressure (8 weeks, academic context)** | Incomplete MVP at deadline | Phase B is full-time; SHOULD HAVE features are deprioritized if Phase A deliverables slip |
| **Partner marketplace content dependency** | Employee-facing MVP feels incomplete without real offers | Build marketplace interface with mock promotional codes; real partner data added post-MVP |
| **MongoDB Atlas configuration issues** | Blocks all data-layer development | Configure and test Atlas connection in Week 4 before any feature development begins |
| **Team availability conflicts** | Development delays | Clear task ownership tracked on GitHub Projects; blockers communicated immediately on Discord |

### 🟢 Low Criticality

| Risk | Impact | Mitigation |
|---|---|---|
| **UI/UX inconsistency across interfaces** | Degrades user experience and jury impression | Figma mockups validated before any frontend development begins (Week 2) |
| **Deployment environment issues** | Delayed public availability | Test Vercel/Render deployment pipeline in Week 4; document all configuration steps |
| **Docker complexity overhead** | Slows down development velocity | Containerization introduced progressively; development runs locally first, Docker added in Week 8 |

---

## 4. High-Level Plan & Timeline

### Project Phases

| Phase | Stage | Key Deliverables | Status |
|---|---|---|---|
| Phase 1 | Stage 1: Idea Development | Team formation, concept selection, MVP vision, Stage 1 Report | ✅ Completed |
| Phase 2 | Stage 2: Project Planning | SMART objectives, scope, risk assessment, timeline | 🔄 In Progress |
| Phase 3 | Stage 3: Technical Documentation | Architecture diagram, DB schema, API specification, wireframes | ⏳ Upcoming |
| Phase 4 | Stage 4: MVP Development | Full working application: auth, token ledger, marketplace, notifications | ⏳ Upcoming |
| Phase 5 | Stage 5: Project Closure | Testing, polishing, deployment, final presentation | ⏳ Upcoming |

---

### Timeline Overview

```
PRIM'O — Project Timeline (May → End of June 2026)

Week         1       2       3       4       5       6       7       8
             May 5   May 12  May 19  May 26  Jun 2   Jun 9   Jun 16  Jun 23
             |       |       |       |       |       |       |       |

Stage 1      ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Stage 2      ░░░░████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Stage 3      ░░░░░░░░████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Stage 4      ░░░░░░░░░░░░░░░░████████████████████████░░░░░░░░░░░░░░░░░░
Stage 5      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████████████████

Legend: ██ Active   ░░ Inactive
── Phase A (2 days/week) ────────────────── Phase B (5 days/week, full sprint) ──
```

---

### Weekly Breakdown

#### Phase A — Design & Foundations (May)
*Intensity: 2 focused days per week*

| Week | Period | Stage | Focus | Deliverable |
|---|---|---|---|---|
| **Week 1** | May 5–11 | Stage 2 | Scoping & Backlog | Fully prioritized product backlog (MoSCoW). User Stories drafted and mapped to technical tasks in Notion. |
| **Week 2** | May 12–18 | Stage 3.1 | UX Design | User flows (login → token → redemption). Low-fidelity wireframes for Employer Dashboard, Employee Dashboard, Marketplace. PRIM'O visual identity defined. |
| **Week 3** | May 19–25 | Stage 3.2 | Technical Architecture | Mongoose schema (Users, Wallets, Transactions, Offers). Full API specification (routes, payloads, auth guards). Budget-to-token conversion logic documented. |
| **Week 4** | May 26–Jun 1 | Stage 3.3 | Environment Setup | GitHub repository initialized. React + Node/Express boilerplate configured. JWT authentication baseline implemented. Docker Compose structure drafted. |

#### Phase B — MVP Sprint (June)
*Intensity: 5 days per week — high-velocity production*

| Week | Period | Stage | Focus | Key Features Built |
|---|---|---|---|---|
| **Week 5** | Jun 2–8 | Stage 4.1 | Core Backend & Auth | Full register/login system (Employer / Employee roles). JWT issuance and validation middleware. EUR → token conversion engine. Token Ledger API with atomic operations. |
| **Week 6** | Jun 9–15 | Stage 4.2 | Employer Frontend | Employer Dashboard with employee directory. Real-time token allocation form. Budget tracking visualizations. Audit trail view. |
| **Week 7** | Jun 16–22 | Stage 4.3 | Employee Frontend & Marketplace | Employee Dashboard (wallet balance + transaction history). Partner catalog interface. Token-to-promo-code claim system. Push notification integration. |
| **Week 8** | Jun 23–30 | Stage 5 | Polish, Testing & Delivery | End-to-end testing (security, data integrity, UX flows). Mobile responsiveness. Docker containerization finalized. Deployment on Vercel/Render. Final presentation prepared. |

---

### Milestone Summary

| Milestone | Target Date | Description |
|---|---|---|
| **M1 — Backlog Frozen** | May 11 | Product backlog fully defined, no scope additions after this point |
| **M2 — Design Complete** | May 18 | All wireframes validated, visual identity confirmed |
| **M3 — Specs Locked** | May 25 | DB schema and API contracts finalized, no structural changes during Sprint |
| **M4 — Environment Ready** | Jun 1 | Full-stack boilerplate running, Atlas connected, auth baseline functional |
| **M5 — Backend Complete** | Jun 8 | Token ledger, conversion engine, and all API routes operational |
| **M6 — Frontend Complete** | Jun 22 | Both Employer and Employee interfaces fully integrated with backend |
| **M7 — MVP Live** | Jun 30 | Deployed, tested, and presentation-ready MVP |

---

*This document reflects the team's planning as of Stage 2. The partner marketplace content (promotional codes and brand offers) will initially use mock data and will be updated with real partner integrations in a post-MVP phase.*

*End of Stage 2 Report — PRIM'O Project | Holberton School Cohort C28*

---
**Loïc Cerqueira** — Tech Lead & Security Architect  
**Véronique Beauvais** — UX Lead & Data Architect
