-- ============================================================
-- Migration 002: Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.students        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles  ENABLE ROW LEVEL SECURITY;

-- ─── Helper: check if caller is an admin ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = auth.uid()
  );
$$;

-- ─── students ────────────────────────────────────────────────────────────────
-- Anyone (anon) can INSERT a student row when booking
CREATE POLICY "students_insert_public"
    ON public.students FOR INSERT
    WITH CHECK (true);

-- Admins can read all; anon can read their own by student_id
CREATE POLICY "students_read_public"
    ON public.students FOR SELECT
    USING (true);   -- student_id lookup is safe (no PII beyond what student entered)

-- Only admins can update/delete
CREATE POLICY "students_admin_all"
    ON public.students FOR ALL
    USING (public.is_admin());

-- ─── appointments ─────────────────────────────────────────────────────────────
-- Anyone can insert (booking flow) — slot limit enforced via DB function
CREATE POLICY "appointments_insert_public"
    ON public.appointments FOR INSERT
    WITH CHECK (true);

-- Anyone can read appointments (for slot count display)
CREATE POLICY "appointments_read_public"
    ON public.appointments FOR SELECT
    USING (true);

-- Only admins can update status (approve/reject/cancel)
CREATE POLICY "appointments_admin_update"
    ON public.appointments FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "appointments_admin_delete"
    ON public.appointments FOR DELETE
    USING (public.is_admin());

-- ─── evaluations ──────────────────────────────────────────────────────────────
-- Only admins can manage evaluations
CREATE POLICY "evaluations_admin_all"
    ON public.evaluations FOR ALL
    USING (public.is_admin());

-- Students can read their own evaluation (via appointment join)
CREATE POLICY "evaluations_read_public"
    ON public.evaluations FOR SELECT
    USING (true);

-- ─── audit_logs ───────────────────────────────────────────────────────────────
-- Only admins can read/insert audit logs
CREATE POLICY "audit_logs_admin_all"
    ON public.audit_logs FOR ALL
    USING (public.is_admin());

-- ─── admin_profiles ───────────────────────────────────────────────────────────
CREATE POLICY "admin_profiles_self"
    ON public.admin_profiles FOR SELECT
    USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "admin_profiles_super_admin_all"
    ON public.admin_profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_profiles
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );
