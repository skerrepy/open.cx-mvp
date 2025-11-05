That's an excellent, well-structured project overview\! Here is the information presented in a clean, comprehensive Markdown format.

-----

# SupportAI – AI-Powered Customer Support Platform

SupportAI is an **AI-driven customer support platform** built for SaaS companies, designed to enhance efficiency and customer experience.

### Core Offerings

  * A fully **embeddable chat widget** for customers.
  * A **ticketing dashboard** for support agents.
  * **AI-assisted responses** with configurable tone & business context.
  * **Analytics & insights** for admins/products teams.

### Project Focus

This project fulfills the assignment requirements of OpenCX, with a focus on:

  * **Practical product value**
  * **Smooth, intuitive UX**
  * **Clear, maintainable architecture**
  * **Sensible tradeoffs** to meet the timeline

-----

##  Live Demo & Code

| Item | Link |
| :--- | :--- |
| **Live App** | [https://supportai.vercel.app](https://supportai.vercel.app) |
| **GitHub Repo** | [https://github.com/skerrepy/open.cx-mvp](https://github.com/skerrepy/open.cx-mvp) |
| **Widget Preview** | [https://supportai.vercel.app/widget](https://supportai.vercel.app/widget) |

-----

## Product Value

SupportAI helps SaaS companies **reduce support load** while **improving customer experience** across various user types:

| User Type | Value Delivered |
| :--- | :--- |
| **Customer / End-user** | Fast answers, smooth escalation to humans when needed. |
| **Support Agent** | Ticket organization, AI suggestions, faster resolutions. |
| **Admin / Analyst** | Insights into performance, quality checks, audit history. |
| **Product Manager** | Recurring issue detection & feature request insights. |

-----

## Key Features

### 1\. Embeddable Support Chat Widget

  * **One-line `<script>`** integration.
  * Real-time messaging.
  * Language detection.
  * **AI + human escalation** workflow.
  * Customer satisfaction rating.
  * Responsive & animated UI.

### 2\. Ticketing Dashboard

  * Ticket list + detail views.
  * Ticket **status lifecycle** management.
  * Real-time message updates.
  * AI + agent handoff workflow.
  * Customer history & context viewing.

### 3\. AI Customization

Admins can fine-tune the AI's performance:

  * Choose **primary language**.
  * Select AI **tone** (friendly, formal, concise, etc.).
  * Provide **business context** (FAQ, policies, product info).

### 4\. Admin Analytics Dashboard

  * Ticket volume & **resolution breakdown**.
  * Agent performance metrics.
  * Token usage tracking.
  * Audit logs of all automated actions.

### 5\. Product Insights (for PMs)

  * **Summarized recurring issues**.
  * Most requested features.
  * Trend summaries.
  * Tag distribution analysis.

-----

## Realistic User Flows

### Flow 1 — AI Handles Support

1.  **Customer:** *"How can I reset my password?"*
2.  **AI** responds with instructions using company-specific policy.
3.  Customer confirms the issue is resolved.
4.  Ticket is **automatically closed**.
5.  Customer leaves satisfaction rating.

### Flow 2 — AI → Human Escalation

1.  **Customer:** *"I was charged twice this month."*
2.  **AI** asks clarifying questions.
3.  **Customer** requests a human: *"I want to speak to an agent."*
4.  **AI** changes ticket status to $\rightarrow$ `needs_human_assistance`.
5.  **Agent** picks up ticket, responds, and resolves case.

### Flow 3 — Product Manager Insights

1.  Over time, SupportAI analyzes closed tickets.
2.  It identifies recurring phrases such as: *"Billing confusion about annual renewals"*.
3.  **Insights page** highlights: Top recurring issues and Top requested improvements.
4.  **PM** exports insights $\rightarrow$ shares with engineering.

-----

## 🛠️ Tech Stack

### Frontend

  * **Next.js 14** (App Router), **TypeScript**
  * **React 18** + React Query
  * **Tailwind CSS** + shadcn/ui + Framer Motion
  * **Recharts** for analytics

### Backend

  * **Next.js API Routes** (serverless)
  * **Supabase** PostgreSQL + Auth + Realtime
  * **OpenAI GPT-4o-mini** for conversational AI

-----

## 🗄️ Database Schema (High-Level)

The high-level database architecture consists of the following key tables:

```yaml
tickets
messages
ticket_statuses
ticket_reviews
audit_logs
business_settings
product_insights
```

Full schema is available in: `supabase-setup.sql`

-----

## ⚙️ Installation

```bash
git clone https://github.com/skerrepy/open.cx-mvp
cd open.cx-mvp
pnpm install
pnpm dev
```

### Environment Variables

Create `.env.local` and populate it with your keys:

```makefile
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_BASE_URL=
```

### 🔗 Embedding the Widget

Copy the embed code from `Settings → Widget Embed Code` in the dashboard, or use this format:

```html
<script src="https://supportai.vercel.app/embed.js" data-business-id="YOUR_ID"></script>
```

-----

## Design Decisions & Tradeoffs

| Area | Decision | Tradeoff | Reasoning |
| :--- | :--- | :--- | :--- |
| **Auth** | Simple single-user ownership model | No multi-tenant orgs & roles yet | Prioritized core flows $\rightarrow$ faster shipping. |
| **AI Model** | GPT-4o-mini | Slightly less nuanced than full GPT-4 | Optimized for **real-time feel** and token cost. |
| **Widget** | Simple `<script>` embed | Limited deep customization for now | Prioritized onboarding simplicity. |
| **Summarization** | Happens once per ticket after 3 messages | May miss very late details | Saves token cost + improves performance. |
| **Knowledge Base** | Store business info as free-text context | No PDF/doc crawling or RAG yet | Leaves clean upgrade path. |

### Future KB Expansion Path

```rust
Business Context → Upload Docs → Embed + Search → RAG → Self-improving AI
```

-----

## Future Improvements (Clear Roadmap)

  * File uploads (screenshots/video from customers).
  * Knowledge base crawler (Notion / HelpDocs sync).
  * **RAG** with embeddings search.
  * Conversation quality scoring model.
  * Agent assist UI with auto-drafted replies.

-----

## Final Notes

This project was built to prioritize **user experience** and **real product value**, not just technical completeness. The result is a working, polished support system that:

  * Feels production-ready.
  * Is extensible.
  * Can evolve into a mature SaaS product.

-----

Would you like to dive deeper into the **Tech Stack**, the **Database Schema**, or perhaps explore the **Tradeoffs** in more detail?