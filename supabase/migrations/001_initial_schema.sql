-- ============================================================
-- Migration 001: Initial Schema
-- Appointment & Project Evaluation Management System
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── students ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.students (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name   TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
    student_id  TEXT NOT NULL UNIQUE,         -- e.g., "2021-00123"
    section     TEXT NOT NULL CHECK (char_length(section) BETWEEN 2 AND 20),
    email       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by student_id
CREATE INDEX idx_students_student_id ON public.students (student_id);

-- ─── appointments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id          UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    appointment_date    DATE NOT NULL,
    appointment_time    TIME NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','approved','rejected','evaluated','cancelled')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active booking per student (prevent duplicate bookings)
CREATE UNIQUE INDEX idx_appointments_unique_active
    ON public.appointments (student_id)
    WHERE status NOT IN ('rejected', 'cancelled');

-- Index for daily slot queries
CREATE INDEX idx_appointments_date ON public.appointments (appointment_date);
CREATE INDEX idx_appointments_status ON public.appointments (status);

-- ─── evaluations ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.evaluations (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id          UUID NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
    evaluator_id            UUID NOT NULL,          -- references auth.users

    -- Scores (max values enforced by application + check constraints)
    functionality_score     NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (functionality_score BETWEEN 0 AND 15),
    data_structure_score    NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (data_structure_score BETWEEN 0 AND 15),
    algorithm_score         NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (algorithm_score BETWEEN 0 AND 15),
    file_handling_score     NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (file_handling_score BETWEEN 0 AND 10),
    dataset_score           NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (dataset_score BETWEEN 0 AND 10),
    ui_score                NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (ui_score BETWEEN 0 AND 10),
    code_quality_score      NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (code_quality_score BETWEEN 0 AND 10),
    documentation_score     NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (documentation_score BETWEEN 0 AND 10),
    presentation_score      NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (presentation_score BETWEEN 0 AND 5),

    -- Computed total (0–100)
    total_score             NUMERIC(5,2) GENERATED ALWAYS AS (
                                functionality_score + data_structure_score + algorithm_score +
                                file_handling_score + dataset_score + ui_score +
                                code_quality_score + documentation_score + presentation_score
                            ) STORED,

    evaluator_comments      TEXT NOT NULL DEFAULT '',
    recommendation          TEXT NOT NULL CHECK (
                                recommendation IN ('passed','passed_with_revisions','needs_major_revision','failed')
                            ),
    evaluated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── audit_logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id    UUID NOT NULL,
    action      TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('appointment','evaluation','student')),
    target_id   UUID NOT NULL,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_admin   ON public.audit_logs (admin_id);
CREATE INDEX idx_audit_logs_target  ON public.audit_logs (target_type, target_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs (created_at DESC);

-- ─── admin_profiles ───────────────────────────────────────────────────────────
-- Extends auth.users with role info
CREATE TABLE IF NOT EXISTS public.admin_profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'evaluator'
                    CHECK (role IN ('evaluator','admin','super_admin')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
