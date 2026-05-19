# STAGE 1: Team Formation, Brainstorming, and MVP

## Table of Contents
1. [Team Formation and Organizational Structure](#0-team-formation-and-organizational-structure)
2. [Brainstorming and Idea Evaluation](#1-brainstorming-and-idea-evaluation)
    * [Research and Inspiration](#11-research-and-inspiration)
    * [Brainstorming Techniques](#12-brainstorming-techniques)
    * [Project Evaluation and Ranking](#13-project-evaluation-and-ranking)
3. [Decision and Refinement](#2-decision-and-refinement)
    * [MVP Selection](#mvp-selection-primo)
    * [Project Details](#project-details)
    * [SMART Objectives](#smart-objectives-of-the-mvp)
    * [Project Scope](#project-scope)
4. [Collaboration Strategy and Project Management](#3-collaboration-strategy-and-project-management)
    * [Communication and Tech Infrastructure](#31-communication-and-technological-infrastructure)
    * [Agile Methodology](#32-agile-methodology)
5. [Strategic Risk Assessment](#4-strategic-risk-assessment)
6. [Success Criteria and KPIs](#5-success-criteria-and-key-performance-indicators-kpi)

---

## 0. Team Formation and Organizational Structure

The team brings together two Full-Stack profiles with complementary skills to cover all project needs.

**Loïc Cerqueira (Technical Lead & Full-Stack Developer):**
* **General Skills:** System logic expert.
* **Expertise:** Specialized in end-to-end cybersecurity and containerization.
* **Responsibilities:** Managing security and containerization of back-end and front-end environments, while contributing to full-stack development.

**Véronique Beauvais (Full-Stack Developer & UX Lead):**
* **Interpersonal Skills:** Attention to detail and high empathy for the user.
* **Expertise:** Highly qualified in data modeling and User Experience (UX) architecture.
* **Responsibilities:** Supervising data architecture, ensuring overall UI/UX fluidity across the platform, and contributing to full-stack development.

### Stakeholders: Project Owners
The project is led by **Julien & Sandrine**, founders of the PRIM'O application. Their profile brings strategic expertise to the development:
* **Entrepreneurial Expertise:** They have 20 years of experience in entrepreneurship and currently lead several digital projects.
* **Ecosystem Connection:** Partners of *French Tech Toulouse* and winners of the *Alpha'r* program in Carcassonne.
* **Industry Experience:** 10 years of experience in marketing & management consulting for SMEs, including managing a hairdressing group with 250 franchisees.
* **Vision:** Their approach stems from the observation that the one-month delay for a bonus is "too long." They aim to eliminate the dilution of recognition by creating an immediate link between effort and reward.

---

## 1. Brainstorming and Idea Evaluation

Although the PRIM'O project was presented to us by its founders, our team conducted a deep reflection phase to validate the concept, explore variants, and define the most relevant technical angle.

### 1.1: Research and Inspiration
We explored current trends in **HR Tech** (Human Resources Technology) and **FinTech**:
* **Concrete Problem:** "Dilution of gratitude." A bonus paid at M+1 is perceived as an administrative entitlement rather than recognition of a specific effort.
* **Trends:** The "On-demand economy" (immediacy) and gamification of professional tools.
* **Inspiration:** "Points" systems in gaming and loyalty programs adapted to the workplace.

### 1.2: Brainstorming Techniques Used

#### 1.2.1. Mind Mapping (Visualizing Links)
We structured our reflection around four pillars:
1. **The Emitter (Employer):** Budget, ease of attribution (speed), performance tracking.
2. **The Receiver (Employee):** Sense of competence, digital wallet, rewards catalog.
3. **The Vector (The Token):** Psychological vs. real value, security, immediacy.
4. **The Partner (Merchant):** Promo codes, customer flow, brand visibility.

#### 1.2.2. SCAMPER Framework (Innovating on Existing Concepts)
* **Substitute:** Replace real money (legally complex) with tokens (internal units of value).
* **Combine:** Associate Employee Committee (CE) benefits with immediate manager recognition.
* **Adapt:** Use e-commerce promo codes as the exchange currency for tokens.
* **Modify / Magnify:** "Enhance the impact of the traditional annual bonus by adding instant gratifications, thereby creating a daily link between effort and reward."
* **Eliminate:** Remove banking delays and administrative intermediaries.

#### 1.2.3 Questions "How Might We" (HMW)
* *How might we* enable a restaurant owner to reward a server in less than 10 seconds after a difficult shift?
* *How might we* guarantee that the same benefit is not used twice?
* *How might we* create an interface so simple that it requires no training?

### 1.3: Project Evaluation and Ranking
Before finalizing the scope of PRIM'O, we compared three possible approaches to meet the needs of Julien and Sandrine:

| Project Idea | Brief Description | Feasibility | Impact | Technical Alignment |
| :--- | :--- | :--- | :--- | :--- |
| **1. Classic HR Dashboard** | A tracking tool for quarterly bonuses with bank transfers. | High | Low | Low (too administrative) |
| **2. PRIM'O (Token System)** | **Web app for distributing tokens instantly convertible into promo codes.** | **Medium** | **Very High** | **Excellent (Focus on transactions)** |
| **3. Corporate Social Network** | A "Like" platform between colleagues to thank each other. | High | Medium | Low (no tangible gain) |

**Ranking and Decision:**
Idea #2 (PRIM'O) was selected.
* **Identified Challenges:** Concurrency management for promo code stocks and token transaction security.
* **Risks:** Complexity of role management (Admin vs. User).
* **Impact:** It is the only solution that meets the founders' vision of "real-time reward."

**Why this choice?**
PRIM'O stood out because it offers a complete technical challenge for our portfolio:
1. **Robust Data Architecture:** Modeling virtual financial transactions.
2. **Major Technical Challenge:** Implementing a real-time architecture with **Node.js, React, TypeScript, and MongoDB** represents a stimulating challenge to guarantee system reactivity.
3. **Security:** Protecting digital assets/tokens.

---

## 2. Decision and Refinement

### MVP Selection: PRIM'O
Following our discussions and brainstorming results, the team unanimously validated the development of PRIM'O. This choice represents the best balance between technical challenge and immediate business utility.

### Project Details
* **Problem Solved:** The time lag between employee effort and the perception of reward. This delay leads to a loss of motivation and a "dilution of gratitude."
* **Solution:** An instant gratification platform. The employer "materializes" their thanks by instantly sending tokens to the employee's smartphone, convertible immediately into gift vouchers.
* **Target Audience / Users:**
    * **Employers:** Leaders of SMEs (pilot sector: catering and hospitality) looking to retain talent.
    * **Employees:** Field workers wanting concrete and rapid recognition of their performance.
* **Application Type:** **Mobile-First Web Application (PWA)**. This ensures immediate accessibility without store downloads, essential for fast-paced professional environments (e.g., between shifts).
* **Why this idea?** Unlike dashboards or social networks, PRIM'O creates a direct and secure bridge between performance and purchasing power. It allows us to work on **cybersecurity** (token protection) and **UX** (simplicity), which are key team priorities. Technically, using Node.js and React under TypeScript, coupled with MongoDB's flexibility, allows us to build a real-time infrastructure.

### SMART Objectives of the MVP
1. **Technical Immediacy:** Guarantee the employee's balance is updated in less than 2 seconds after employer attribution (Specific, Measurable, Attainable).
2. **Exchange Reliability:** Achieve a 100% success rate on "Token -> Promo Code" conversions via rigorous database atomicity management (Realistic, Timely).
3. **User Engagement:** Enable a novice user to complete an attribution or exchange in fewer than 3 clicks (Specific, Measurable).

### Project Scope

| Category | In Scope | Out of Scope |
| :--- | :--- | :--- |
| **Authentication** | Secure Login/Signup by roles (Employer vs. Employee). | Social Login (SSO Google/Facebook). |
| **Token Management** | Manual real-time attribution and transaction history. | Automated attribution algorithm based on turnover. |
| **Catalog** | Viewing partner offers and exchanging tokens for promo codes. | Direct payment in Euros to complete a purchase. |
| **Architecture** | Relational/Document secure database and containerization (Docker). | Synchronization with POS (Point of Sale) or payroll software. |
| **Interface** | Responsive Web App optimized for mobile. | Native iOS / Android apps on App/Play Stores. |

---

## 3. Collaboration Strategy and Project Management

### 3.1 Communication and Technological Infrastructure
* **Daily Sync:** We use **Discord** as our headquarters for instant exchanges, daily stand-ups, and fast decision-making.
* **Partner Availability:** Julien and Sandrine are fully integrated. They are available for follow-up meetings via Discord, allowing constant feedback between business needs and technical development.
* **Technical Collaboration:** **GitHub** is our central tool for source code management, Pull Requests, and code reviews.
* **Documentation:** All functional specifications and resources are centralized on **Google Drive**.

### 3.2 Agile Methodology
We adopt an **Agile** approach (Scrum/Kanban style) for fast iterations.
* **Task Management:** We use **Notion** for backlog tracking. Each feature is broken into prioritized User Stories.
* **Conflict Resolution:** Technical disagreements are resolved through objective analysis, prioritizing **simplicity of maintenance** and **system security**.

---

## 4. Strategic Risk Assessment

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Security Breaches** | High | Strict server-side validation, JWT authentication, and encryption of sensitive data. |
| **Deployment Issues** | Medium | Implementation of automated CI/CD pipelines and staging environments. |
| **Data Integrity** | High | Use of **PostgreSQL atomic operations** to guarantee reliability of token balances. |

---

## 5. Success Criteria and Key Performance Indicators (KPI)
1. **Technical Excellence:** Flawless deployment, fluid application, and irreproachable transaction security.
2. **Customer Satisfaction:** A tool that perfectly meets the immediate motivation needs expressed by the client and validated by end-users.

**Signed:** Loïc Cerqueira (Tech Lead)  
Véronique Beauvais (UX Lead)
