# PRIM'O — MVP Presentation
### Real-Time Meritocratic Recognition System
**Loïc Cerqueira · Véronique Beauvais — May 2026**

---

## 1. Executive Summary

> *"The time between effort and reward is the silent enemy of motivation."*

**PRIM'O** is a real-time meritocratic recognition SaaS platform designed for SMEs.  
It empowers employers to reward employees **at the exact moment** performance occurs — through a token system redeemable for real benefits.

| Category | Positioning |
|---|---|
| Sector | Fintech / HR-Tech / Enterprise SaaS |
| Target | SMEs (10–250 employees) |
| Model | B2B SaaS + partner marketplace |
| Status | MVP under active development |
| Team | 2 Full-Stack Developers (Tech Lead + UX/Data Lead) |

---

## 2. The Problem: The Motivation Tax

Traditional reward systems suffer from **three structural dysfunctions** that silently erode team engagement.

### 2.1 Temporal Dilution
Monthly or annual bonuses create a **critical psychological latency**: the emotional link between performance and reward is severed. The bonus ends up perceived as an extension of the base salary rather than genuine recognition.

### 2.2 Operational Friction
Existing benefit solutions are **uniform and collective** — meal vouchers, holiday checks, insurance. They offer no lever for individual differentiation and completely ignore the notion of merit-based, in-the-moment recognition.

### 2.3 Engagement Decay
Without an immediate feedback loop, **top performers in smaller organizations** lose their incentive to sustain peak performance. The absence of a real-time positive signal generates a progressive erosion of intrinsic motivation.

```
Performance ──► [30–365 day delay] ──► Generic reward
     ▲                                        ↓
     └──────── Weakened signal ───────────────┘
```

---

## 3. The PRIM'O Solution

### 3.1 Conceptual Architecture

PRIM'O restores the virtuous effort–recognition loop through a **proprietary tokenization engine**.

```
Employer                     PRIM'O Platform                      Employee
────────                     ──────────────                       ────────
 EUR Budget  ──convert──►  [Token Ledger]  ──allocation──►   Token Wallet
                             (Atomic ops)                          │
 Dashboard   ◄──analytics──[Audit Trail]                          ▼
                             (MongoDB)       ◄──push──      [Marketplace]
                                                          Partner promo codes
```

### 3.2 Value Proposition

| For the Employer | For the Employee |
|---|---|
| Instant reward with zero administrative friction | Immediate gratification directly tied to performance |
| Precise budget control (token = accounting unit) | Freedom of choice through the marketplace |
| Analytics dashboard tracking recognition trends | Real-time push notifications |
| Full traceability of every allocation | Personal history of all rewards received |

---

## 4. Team & Responsibilities

### Loïc Cerqueira — Tech Lead & Security Architect

**Strategic oversight:** Security infrastructure and deployment pipeline.

- End-to-end security protocol architecture (back-end + front-end)
- JWT authentication and strict server-side validation of all token movements
- Docker containerization strategy (environment parity, CI/CD)
- Full-stack development of core application features

### Véronique Beauvais — UX Lead & Data Architect

**Strategic oversight:** Data architecture and user journey design.

- MongoDB schema design with long-term scalability in mind
- UX/UI strategy: maximizing retention and simplifying the token-reward loop
- Atomic MongoDB operations for transactional token integrity
- Full-stack development of core application features

> **Collaboration model:** Both members operate as Full-Stack Developers to maintain a holistic understanding of the application lifecycle. Technical disagreements are resolved through a "best-fit" analysis, always prioritizing security and user fluidity.

---

## 5. Operational Framework

### 5.1 Agile Methodology

| Tool | Usage |
|---|---|
| **Notion / Excel** | Centralized backlog — User Stories mapped to granular technical tasks |
| **GitHub** | Version control + systematic peer-review process |
| **Discord** | Synchronous communication hub |

### 5.2 Development Cycle

```
Sprint Planning ──► Development ──► Peer Review (GitHub PR)
       ▲                                      │
       └──────── Retrospective ◄── Delivery ──┘
```

**Principles:** Short iterations, continuous integration, mandatory code review before merge.

---

## 6. MVP Technical Scope (MoSCoW)

### ✅ MUST HAVE — Core Architecture

#### 6.1 Unified Identity Management (RBAC)
- Secure authentication system based on **JWT**
- Two entity types: **Organization** (Employer) and **User** (Employee)
- Distinct roles with granular permissions (token creation, allocation, read access)
- Strict server-side validation on every sensitive operation

#### 6.2 Token Ledger — The Core Engine
- **EUR budget → token conversion** mechanism
- Manual, real-time token allocation by the employer
- **Atomic MongoDB operations** to prevent double-spending or token loss
- Complete movement history for every transaction (full auditability)

#### 6.3 Redemption Marketplace
- Dedicated portal allowing employees to **exchange tokens for promotional codes**
- Brand partner integration (exclusive offers)
- Fluid, intuitive interface — full redemption in under 3 clicks

---

### 🔶 SHOULD HAVE — High Priority

#### 6.4 Push Notification Engine
- Real-time alerts sent to employees upon token attribution
- Event-driven architecture ensuring instant delivery
- Reinforces the psychological loop: effort → reward → signal

#### 6.5 Audit & Analytics Module
- Detailed transaction history for each employer
- Recognition trend dashboard (frequency, amounts, recipients)
- Actionable data to refine HR recognition policies

---

## 7. Risk Assessment & Mitigation

| Identified Risk | Severity | Mitigation Strategy |
|---|---|---|
| **Security breach / token compromise** | 🔴 High | JWT + strict server-side validation on 100% of token movements. No sensitive operation handled client-side. |
| **Deployment inconsistency** | 🟡 Medium | Full Docker containerization. Guaranteed parity across development, staging, and production environments. |
| **Data integrity (double-spending, token loss)** | 🔴 High | Atomic MongoDB operations. No transaction can partially succeed. Automatic rollback on failure. |
| **Insufficient user adoption** | 🟡 Medium | UX-first approach: reward journey designed to be as fast as the observed performance. Guided onboarding. |
| **Data schema scalability** | 🟢 Low | MongoDB schema designed from day one for horizontal scalability. Quarterly architecture review. |

---

## 8. Success Criteria & KPIs

### 8.1 Technical Integrity
- ✔ Containerized deployment with no security vulnerabilities or performance lag under real-time transaction load
- ✔ Test coverage on all critical operations (allocation, conversion, redemption)
- ✔ Zero double-spending or token loss incidents during testing phases

### 8.2 Client Validation
- ✔ The final product concretely transforms the client's "real-time meritocracy" vision into a tangible, fluid, and simple management tool
- ✔ Full reward journey completable in under **30 seconds** (employer → token → employee notification)
- ✔ User satisfaction score ≥ 4/5 during acceptance testing

### 8.3 Academic Ambition
- ✔ Demonstrated mastery of the full DevSecOps lifecycle (development → security → deployment)
- ✔ Documented, reproducible architecture presentable before a technical jury

---

## 9. Vision & Next Steps

### MVP Phase (current)
Delivery of a fully functional system covering all **MUST HAVE** items: identity management, token ledger, marketplace.

### Post-MVP Phase 1
Integration of **SHOULD HAVE** items: push notifications + full analytics module.

### Phase 2 — Scaling
- Opening the API to third-party integrations (HRIS, existing HR tools)
- Expanded marketplace model (additional partners, dynamic catalog)
- Advanced analytics dashboard with industry benchmarks

---

## 10. Conclusion

PRIM'O addresses a genuine structural need within the SME ecosystem: **restoring the emotional connection between effort and recognition**, replacing slow and impersonal systems with an immediate, secure, and measurable gratification mechanism.

The technical rigor (JWT security, MongoDB atomicity, Docker) combined with a fluidity-first UX philosophy positions PRIM'O as a tool **production-ready for a client environment from the MVP stage**.

---

*Loïc Cerqueira — Tech Lead & Security Architect*  
*Véronique Beauvais — UX Lead & Data Architect*  
*May 2026*
