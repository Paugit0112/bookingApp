# EvalBook — Setup & Deployment Guide

> **Architecture:** React + Vite frontend · Express + MySQL local server (offline-capable) · Supabase for cloud sync

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Project Installation](#2-project-installation)
3. [MySQL Local Database](#3-mysql-local-database)
4. [Environment Variables](#4-environment-variables)
5. [Running Locally](#5-running-locally)
6. [Supabase Cloud Sync Setup](#6-supabase-cloud-sync-setup)
7. [First Admin Account](#7-first-admin-account)
8. [Seeding Students](#8-seeding-students)
9. [Folder Structure](#9-folder-structure)
10. [Architecture Overview](#10-architecture-overview)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | **≥ 18.x** (required for built-in `fetch`) | https://nodejs.org |
| npm | ≥ 9.x | Comes with Node |
| MySQL | ≥ 8.0 | https://dev.mysql.com/downloads/ |
| Git | Any | https://git-scm.com |

> **Why Node 18+?** The cloud sync feature uses the built-in `fetch` API added in Node 18.

---

## 2. Project Installation

```bash
# In the project root
npm install

# Install server dependencies
cd server
npm install
cd ..
```

---

## 3. MySQL Local Database

### Step 1 — Create the database

Open MySQL and run:

```sql
CREATE DATABASE evalbook CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 2 — Create the tables

Run the following SQL in your `evalbook` database:

```sql
-- Students
CREATE TABLE IF NOT EXISTS students (
  id          VARCHAR(36)  NOT NULL,
  full_name   VARCHAR(100) NOT NULL,
  student_id  VARCHAR(30)  NOT NULL UNIQUE,
  section     VARCHAR(20)  NOT NULL,
  email       VARCHAR(100),
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id               VARCHAR(36) NOT NULL,
  student_id       VARCHAR(36) NOT NULL,
  appointment_date DATE        NOT NULL,
  appointment_time TIME        NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Evaluations
CREATE TABLE IF NOT EXISTS evaluations (
  id                   VARCHAR(36)    NOT NULL,
  appointment_id       VARCHAR(36)    NOT NULL UNIQUE,
  evaluator_id         VARCHAR(36)    NOT NULL,
  functionality_score  DECIMAL(5,2)   NOT NULL DEFAULT 0,
  data_structure_score DECIMAL(5,2)   NOT NULL DEFAULT 0,
  algorithm_score      DECIMAL(5,2)   NOT NULL DEFAULT 0,
  file_handling_score  DECIMAL(5,2)   NOT NULL DEFAULT 0,
  dataset_score        DECIMAL(5,2)   NOT NULL DEFAULT 0,
  ui_score             DECIMAL(5,2)   NOT NULL DEFAULT 0,
  code_quality_score   DECIMAL(5,2)   NOT NULL DEFAULT 0,
  documentation_score  DECIMAL(5,2)   NOT NULL DEFAULT 0,
  presentation_score   DECIMAL(5,2)   NOT NULL DEFAULT 0,
  total_score          DECIMAL(5,2)   GENERATED ALWAYS AS (
                         functionality_score + data_structure_score + algorithm_score +
                         file_handling_score + dataset_score + ui_score +
                         code_quality_score + documentation_score + presentation_score
                       ) STORED,
  evaluator_comments   TEXT           NOT NULL DEFAULT '',
  recommendation       VARCHAR(50)    NOT NULL,
  evaluated_at         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- Admin profiles
CREATE TABLE IF NOT EXISTS admin_profiles (
  id         VARCHAR(36)  NOT NULL,
  full_name  VARCHAR(100) NOT NULL,
  email      VARCHAR(100) NOT NULL UNIQUE,
  password   VARCHAR(100) NOT NULL,
  role       VARCHAR(20)  NOT NULL DEFAULT 'evaluator',
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Exam dates
CREATE TABLE IF NOT EXISTS exam_dates (
  id         VARCHAR(36) NOT NULL,
  exam_date  DATE        NOT NULL,
  created_by VARCHAR(36),
  created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_exam_date (exam_date)
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id          VARCHAR(36)  NOT NULL,
  admin_id    VARCHAR(36)  NOT NULL,
  action      VARCHAR(50)  NOT NULL,
  target_type VARCHAR(50)  NOT NULL,
  target_id   VARCHAR(36)  NOT NULL,
  metadata    JSON,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
```

### Step 3 — Verify the connection

Check `server/db.js` and confirm the credentials match your MySQL setup:

```js
host: '127.0.0.1',
port: 3306,        // change if yours is different (e.g. 3307 for XAMPP)
user: 'root',
password: '',
database: 'evalbook',
```

> **XAMPP users:** Default port is `3306`. If you get a connection error, try `3307`.

---

## 4. Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
# Supabase (frontend — read-only display, not used for local operation)
VITE_SUPABASE_URL=https://your-project-id.supabase.co/rest/v1/
VITE_SUPABASE_ANON_KEY=your-anon-key

# App
VITE_APP_NAME=Appointment & Evaluation System
VITE_MAX_BOOKINGS_PER_DAY=26
VITE_SESSION_TIMEOUT_MINUTES=30

# Cloud Sync — server-side only
# Get this from: Supabase Dashboard → Project Settings → API → Service Role Key
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

> **Never commit `.env` to Git.** It is already in `.gitignore`.

---

## 5. Running Locally

You need **two terminals** — one for the API server, one for the frontend.

### Terminal 1 — API Server
```bash
# From the project root
node server/index.js
```
Server runs at `http://localhost:3002`

### Terminal 2 — Frontend
```bash
# From the project root
npm run dev
```
Frontend runs at `http://localhost:5173`

### Routes

| URL | Page |
|-----|------|
| `/` | Login (Student or Admin) |
| `/booking` | Student Booking Page |
| `/dashboard` | Student Appointment Status |
| `/admin` | Admin Dashboard |
| `/admin/appointments` | Appointment Management |
| `/admin/evaluations` | Evaluation Results |
| `/admin/students` | Student Registry |
| `/admin/reports` | Reports & Analytics |
| `/admin/audit-logs` | Audit Trail |
| `/admin/settings` | Exam Dates · Account · Cloud Sync |

---

## 6. Supabase Cloud Sync Setup

The system runs **fully offline** using local MySQL. When internet is available, use the **Sync to Cloud** button in **Admin → Settings** to push all data to Supabase.

### Step 1 — Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click **New Project**
3. Enter a name (e.g., `evalbook`), set a strong DB password, choose a region
4. Wait ~2 minutes for the project to initialize

### Step 2 — Run the SQL Migrations

In your Supabase project, open the **SQL Editor** and run each file in order:

| Order | File | What it does |
|-------|------|-------------|
| 1 | `supabase/migrations/001_initial_schema.sql` | Creates all tables |
| 2 | `supabase/migrations/002_rls_policies.sql` | Sets up Row Level Security |
| 3 | `supabase/migrations/003_functions.sql` | Helper functions & views |

After running migration 1, also run this to create the `exam_dates` table (added later, not in the original migration):

```sql
CREATE TABLE IF NOT EXISTS public.exam_dates (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_date  DATE        NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_date)
);
```

### Step 3 — Get the Service Role Key

1. In your Supabase project go to **Settings → API**
2. Under **Project API keys**, copy the **`service_role`** key
   - ⚠️ This key bypasses Row Level Security — keep it secret, server-only
   - It starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
3. Also copy the **Project URL** (e.g., `https://abcdefgh.supabase.co`)

### Step 4 — Add Keys to `.env`

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-full-key...
```

### Step 5 — Restart the Server

```bash
# Stop the server (Ctrl+C) then restart
node server/index.js
```

### Step 6 — Sync

1. Log in to the admin panel
2. Go to **Settings**
3. Click **Sync to Cloud**
4. The button shows record counts pushed: students, appointments, evaluations

> **How sync works:** The sync is one-way (local → Supabase). It uses upsert (insert or update by UUID), so running it multiple times is safe. Run it whenever you're back online after working offline.

---

## 7. First Admin Account

Since auth is handled locally (not through Supabase Auth), you create admin accounts directly in MySQL.

### Insert an admin via MySQL

```sql
-- Replace the values below
INSERT INTO admin_profiles (id, full_name, email, password, role)
VALUES (
  UUID(),
  'Dr. Juan Santos',
  'admin@carsu.edu.ph',
  -- Generate a bcrypt hash for your password at: https://bcrypt-generator.com (12 rounds)
  '$2a$12$your-bcrypt-hash-here',
  'super_admin'
);
```

### Quick way — use Node.js to generate the hash

```bash
node -e "require('bcryptjs').hash('yourpassword', 12).then(h => console.log(h))"
```

Copy the output hash and paste it into the SQL above.

---

## 8. Seeding Students

A seed script is included with all students pre-loaded:

```bash
# From the project root
node server/seed-students.js
```

> **Note:** The seed script connects on port `3307` by default. If your MySQL runs on `3306`, edit `server/seed-students.js` and change `port: 3307` → `port: 3306` before running.

---

## 9. Folder Structure

```
booking-system/
├── server/
│   ├── index.js          # Express API server (auth, appointments, sync)
│   ├── db.js             # MySQL connection pool
│   ├── seed-students.js  # Student seed data
│   └── package.json
├── src/
│   ├── components/
│   │   ├── ui/           # ShadCN/UI primitives
│   │   ├── shared/       # Sidebar, Navbar, ThemeProvider, etc.
│   │   ├── student/      # Booking confirmation modal
│   │   └── admin/        # EvaluationDrawer
│   ├── hooks/            # React Query hooks (appointments, slots, exams, etc.)
│   ├── layouts/
│   │   └── AdminLayout.tsx
│   ├── lib/
│   │   ├── api.ts        # All API calls to Express server
│   │   ├── utils.ts      # Helpers, constants, time slots
│   │   └── pdf.ts        # jsPDF slip + evaluation report
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── student/      # BookingPage, DashboardPage
│   │   └── admin/        # Dashboard, Appointments, Evaluations, Students,
│   │                     # Reports, AuditLogs, Settings
│   ├── schemas/          # Zod validation schemas
│   ├── stores/           # Zustand (auth state)
│   └── types/            # TypeScript types + grading criteria
├── supabase/
│   └── migrations/       # SQL files for Supabase schema
├── public/               # Static assets (logo.png, etc.)
├── .env                  # Your local env (not committed)
├── .env.example          # Template
├── SETUP.md              # This file
├── package.json          # Frontend dependencies
├── vite.config.ts
└── tailwind.config.ts
```

---

## 10. Architecture Overview

```
┌──────────────────────────────────────────────┐
│           BROWSER (React + Vite)             │
│                                              │
│  • Student: booking, dashboard, PDF slip     │
│  • Admin: appointments, evaluations,         │
│           students, reports, settings        │
└────────────────────┬─────────────────────────┘
                     │ HTTP (localhost:3002)
┌────────────────────▼─────────────────────────┐
│         LOCAL SERVER (Express + MySQL)        │
│                                              │
│  • All CRUD — works 100% offline             │
│  • JWT auth for admins                       │
│  • POST /api/sync — pushes to Supabase       │
└────────┬─────────────────────────────────────┘
         │ HTTPS (fetch, service role key)
         │ Only when Sync to Cloud is clicked
┌────────▼─────────────────────────────────────┐
│            SUPABASE (Cloud backup)           │
│                                              │
│  • PostgreSQL with RLS                       │
│  • Stores: students, appointments,           │
│            evaluations, exam_dates           │
│  • Read by service role key (bypasses RLS)   │
└──────────────────────────────────────────────┘
```

### What syncs and what doesn't

| Table | Syncs | Notes |
|-------|-------|-------|
| `students` | ✅ | Full upsert by UUID |
| `appointments` | ✅ | Full upsert by UUID |
| `evaluations` | ✅ | `total_score` excluded (generated column in Supabase) |
| `exam_dates` | ✅ | Requires manual table creation (Step 6 above) |
| `admin_profiles` | ❌ | Local auth only — Supabase uses different auth system |
| `audit_logs` | ❌ | Local reference only |

---

## 11. Troubleshooting

### "Supabase not configured" on Sync
→ Set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env`, then restart the server.

### Sync succeeds but data doesn't appear in Supabase
→ The service role key bypasses RLS. If using the anon key by mistake, RLS will block inserts. Make sure you're using the **service_role** key, not the **anon** key.

### MySQL connection refused
→ Check that MySQL is running and that `server/db.js` has the correct `host`, `port`, `user`, `password`, and `database`.

### Seed script fails with "connection refused"
→ Edit `server/seed-students.js` line: `port: 3307` → `port: 3306` (or whichever port your MySQL uses).

### "Cannot find module '...'" on `npm run dev`
→ Run `npm install` in the project root and `npm install` inside `server/`.

### PDF download blocked
→ Allow pop-ups for `localhost:5173` in your browser settings.

### Admin login fails after password change
→ The password must be stored as a bcrypt hash (12 rounds). Plain-text passwords will not work.
