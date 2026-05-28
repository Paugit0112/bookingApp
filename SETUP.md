# Appointment & Project Evaluation Management System
## Complete Setup & Deployment Guide

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Installation](#project-installation)
3. [Supabase Setup](#supabase-setup)
4. [Environment Variables](#environment-variables)
5. [Running Locally](#running-locally)
6. [Vercel Deployment](#vercel-deployment)
7. [First Admin Account](#first-admin-account)
8. [Folder Structure](#folder-structure)
9. [Architecture Overview](#architecture-overview)

---

## 1. Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18.x | https://nodejs.org |
| npm | ≥ 9.x | Comes with Node |
| Git | Any | https://git-scm.com |
| Supabase CLI (optional) | Latest | `npm i -g supabase` |

---

## 2. Project Installation

```bash
# Clone or download the project
cd "d:\Pautech Projects\booking system"

# Install all dependencies
npm install
```

---

## 3. Supabase Setup

### Step 1 — Create a Supabase Project
1. Go to https://supabase.com and sign in
2. Click **New Project**
3. Choose organization, enter project name (e.g., `evalbook`), set a strong database password
4. Select region closest to your users (e.g., Southeast Asia)
5. Click **Create new project** and wait ~2 minutes

### Step 2 — Get Your API Keys
1. In your Supabase project, go to **Settings → API**
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / public key** → `VITE_SUPABASE_ANON_KEY`

### Step 3 — Run SQL Migrations

Open the Supabase **SQL Editor** and run each migration file in order:

#### Migration 1: Schema
Copy and run `supabase/migrations/001_initial_schema.sql`

#### Migration 2: Row Level Security
Copy and run `supabase/migrations/002_rls_policies.sql`

#### Migration 3: Functions & Views
Copy and run `supabase/migrations/003_functions.sql`

### Step 4 — Enable Realtime
1. Go to **Database → Replication**
2. Enable realtime for the `appointments` table
3. This powers the live slot counter on the booking page

### Step 5 — Configure Auth
1. Go to **Authentication → Settings**
2. Set **Site URL** to your Vercel URL (or `http://localhost:5173` for dev)
3. Add your Vercel URL to **Redirect URLs**
4. Optionally enable **Email confirmations** for admin accounts

---

## 4. Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

VITE_APP_NAME=Appointment & Evaluation System
VITE_MAX_BOOKINGS_PER_DAY=24
VITE_SESSION_TIMEOUT_MINUTES=30
```

> **Never commit `.env` to Git.** It is already in `.gitignore`.

---

## 5. Running Locally

```bash
npm run dev
```

Open http://localhost:5173

| Route | Page |
|-------|------|
| `/` | Student Booking Page |
| `/dashboard` | Student Dashboard (lookup by ID) |
| `/admin/login` | Admin Login |
| `/admin` | Admin Dashboard |
| `/admin/appointments` | Appointment Management |
| `/admin/evaluations` | Evaluation Results |
| `/admin/students` | Student Registry |
| `/admin/audit-logs` | Audit Trail |

---

## 6. Vercel Deployment

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/evalbook.git
git push -u origin main
```

### Step 2 — Deploy on Vercel
1. Go to https://vercel.com → **New Project**
2. Import your GitHub repository
3. Framework Preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`

### Step 3 — Add Environment Variables in Vercel
In **Project Settings → Environment Variables**, add:
```
VITE_SUPABASE_URL         = https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY    = your-anon-key
VITE_MAX_BOOKINGS_PER_DAY = 24
VITE_SESSION_TIMEOUT_MINUTES = 30
```

### Step 4 — Update Supabase Auth URLs
After deployment, add your Vercel URL to Supabase:
- **Authentication → Settings → Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app/**`

---

## 7. First Admin Account

After migrations are run, create your first admin:

### Via Supabase Dashboard:
1. Go to **Authentication → Users → Invite user**
2. Enter admin email, click **Send invite**
3. The admin completes signup via email link
4. Then run this SQL to give them admin role:

```sql
-- Replace with the actual UUID from auth.users
INSERT INTO public.admin_profiles (id, full_name, role)
VALUES (
  'paste-admin-uuid-here',
  'Admin Name Here',
  'super_admin'
);
```

### Via SQL (for quick testing):
```sql
-- 1. Create auth user (Supabase handles password hashing)
-- Use the dashboard Invite flow above, then:

-- 2. After the user signs up, find their UUID:
SELECT id, email FROM auth.users;

-- 3. Create their admin profile:
INSERT INTO public.admin_profiles (id, full_name, role)
VALUES ('their-uuid', 'Dr. Juan Santos', 'super_admin');
```

---

## 8. Folder Structure

```
booking-system/
├── src/
│   ├── components/
│   │   ├── ui/               # ShadCN UI primitives
│   │   ├── shared/           # Sidebar, Navbar, ThemeProvider, etc.
│   │   ├── student/          # Booking confirmation modal
│   │   └── admin/            # EvaluationDrawer
│   ├── hooks/                # React Query hooks
│   │   ├── useAuth.ts
│   │   ├── useSlots.ts
│   │   ├── useAppointments.ts
│   │   └── useEvaluations.ts
│   ├── layouts/
│   │   └── AdminLayout.tsx   # Protected admin shell
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client
│   │   ├── database.types.ts # Auto-generated DB types
│   │   ├── utils.ts          # Helpers, constants
│   │   └── pdf.ts            # jsPDF generators
│   ├── pages/
│   │   ├── student/
│   │   │   ├── BookingPage.tsx
│   │   │   └── DashboardPage.tsx
│   │   └── admin/
│   │       ├── LoginPage.tsx
│   │       ├── DashboardPage.tsx
│   │       ├── AppointmentsPage.tsx
│   │       ├── EvaluationsPage.tsx
│   │       ├── StudentsPage.tsx
│   │       └── AuditLogsPage.tsx
│   ├── schemas/              # Zod validation schemas
│   ├── stores/               # Zustand state stores
│   ├── styles/               # Global CSS + Tailwind theme
│   └── types/                # TypeScript types & checklist data
├── supabase/
│   └── migrations/           # SQL migration files
├── public/
├── .env.example
├── index.html
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## 9. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        VERCEL (Frontend)                     │
│                                                              │
│   React 18 + Vite + TypeScript                              │
│   ├── Tailwind CSS + ShadCN/UI   (styling)                  │
│   ├── React Router v6            (routing)                  │
│   ├── TanStack Query v5          (server state)             │
│   ├── Zustand                    (client state)             │
│   ├── React Hook Form + Zod      (forms)                    │
│   ├── Framer Motion             (animations)                │
│   └── jsPDF + autoTable          (PDF generation)           │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS (Supabase JS Client)
┌────────────────────────▼────────────────────────────────────┐
│                     SUPABASE (Backend)                       │
│                                                              │
│   ├── PostgreSQL     Database with RLS                      │
│   ├── Auth           Admin login (email/password)           │
│   ├── Realtime       Live slot updates                      │
│   └── Functions      book_appointment(), get_daily_info()   │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Reason |
|----------|--------|
| Supabase RPC for booking | Atomic transaction prevents race conditions on slot limits |
| Realtime subscriptions | Instant slot counter updates without polling |
| Zustand for auth state | Lightweight, persists across refreshes |
| TanStack Query | Auto cache invalidation after mutations |
| Generated total_score | PostgreSQL GENERATED ALWAYS AS prevents score tampering |
| Row Level Security | Students can book/view; only admins can mutate appointments |
| Lazy page loading | Reduces initial JS bundle size |

---

## Troubleshooting

### "Missing Supabase environment variables"
→ Ensure `.env` exists and has both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### "Access denied. Your account does not have admin privileges."
→ The user exists in `auth.users` but has no row in `admin_profiles`. Run the INSERT above.

### Slot count not updating in real-time
→ Enable Realtime on the `appointments` table in Supabase Dashboard → Database → Replication

### PDF download not working
→ Check browser popup blocker. jsPDF uses `document.save()` which may be blocked.

### Build error: "Cannot find module '...'"
→ Run `npm install` to ensure all dependencies are installed
