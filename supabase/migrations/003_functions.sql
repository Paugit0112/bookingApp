-- ============================================================
-- Migration 003: PostgreSQL Functions & Views
-- ============================================================

-- ─── View: daily slot counts ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.daily_slot_counts AS
SELECT
    appointment_date,
    COUNT(*) AS booked_count
FROM public.appointments
WHERE status NOT IN ('rejected', 'cancelled')
GROUP BY appointment_date;

-- ─── Function: get_daily_slot_info ───────────────────────────────────────────
-- Returns slot availability info for a given date
CREATE OR REPLACE FUNCTION public.get_daily_slot_info(p_date DATE)
RETURNS TABLE (
    appointment_date DATE,
    booked           INTEGER,
    remaining        INTEGER,
    is_full          BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_max_bookings INTEGER := 24;
    v_booked       INTEGER;
BEGIN
    SELECT COALESCE(COUNT(*), 0)
    INTO   v_booked
    FROM   public.appointments
    WHERE  appointment_date = p_date
    AND    status NOT IN ('rejected', 'cancelled');

    RETURN QUERY SELECT
        p_date,
        v_booked,
        GREATEST(v_max_bookings - v_booked, 0),
        v_booked >= v_max_bookings;
END;
$$;

-- ─── Function: book_appointment ──────────────────────────────────────────────
-- Atomic booking: creates student + appointment in one transaction,
-- enforces 24-slot limit, and prevents duplicate student_id bookings.
CREATE OR REPLACE FUNCTION public.book_appointment(
    p_full_name         TEXT,
    p_student_id        TEXT,
    p_section           TEXT,
    p_appointment_date  DATE,
    p_appointment_time  TIME
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_student          public.students%ROWTYPE;
    v_appointment      public.appointments%ROWTYPE;
    v_slot_count       INTEGER;
    v_max              INTEGER := 24;
BEGIN
    -- 1. Check daily slot limit
    SELECT COUNT(*) INTO v_slot_count
    FROM   public.appointments
    WHERE  appointment_date = p_appointment_date
    AND    status NOT IN ('rejected', 'cancelled');

    IF v_slot_count >= v_max THEN
        RAISE EXCEPTION 'SLOT_FULL: No remaining slots for %', p_appointment_date;
    END IF;

    -- 2. Upsert student record (update name/section if they re-book)
    INSERT INTO public.students (full_name, student_id, section)
    VALUES (p_full_name, p_student_id, p_section)
    ON CONFLICT (student_id)
    DO UPDATE SET
        full_name = EXCLUDED.full_name,
        section   = EXCLUDED.section
    RETURNING * INTO v_student;

    -- 3. Check for an existing active appointment for this student
    IF EXISTS (
        SELECT 1 FROM public.appointments
        WHERE  student_id = v_student.id
        AND    status NOT IN ('rejected', 'cancelled')
    ) THEN
        RAISE EXCEPTION 'DUPLICATE_BOOKING: Student % already has an active appointment', p_student_id;
    END IF;

    -- 4. Insert appointment
    INSERT INTO public.appointments (student_id, appointment_date, appointment_time, status)
    VALUES (v_student.id, p_appointment_date, p_appointment_time, 'pending')
    RETURNING * INTO v_appointment;

    -- 5. Return combined result as JSON
    RETURN json_build_object(
        'student',     row_to_json(v_student),
        'appointment', row_to_json(v_appointment)
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE;  -- re-raise with original message
END;
$$;

-- ─── Function: update_appointment_status ─────────────────────────────────────
-- Admin action: approve / reject / cancel with audit log
CREATE OR REPLACE FUNCTION public.update_appointment_status(
    p_appointment_id  UUID,
    p_status          TEXT,
    p_admin_id        UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    -- Update appointment
    UPDATE public.appointments
    SET    status = p_status
    WHERE  id = p_appointment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'APPOINTMENT_NOT_FOUND: %', p_appointment_id;
    END IF;

    -- Write audit log
    INSERT INTO public.audit_logs (admin_id, action, target_type, target_id, metadata)
    VALUES (
        p_admin_id,
        'STATUS_UPDATE',
        'appointment',
        p_appointment_id,
        jsonb_build_object('new_status', p_status)
    );
END;
$$;

-- ─── Function: get_daily_statistics ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_daily_statistics(p_date DATE)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_booked',   COUNT(*),
        'pending',        COUNT(*) FILTER (WHERE status = 'pending'),
        'approved',       COUNT(*) FILTER (WHERE status = 'approved'),
        'evaluated',      COUNT(*) FILTER (WHERE status = 'evaluated'),
        'rejected',       COUNT(*) FILTER (WHERE status = 'rejected'),
        'cancelled',      COUNT(*) FILTER (WHERE status = 'cancelled'),
        'avg_score',      ROUND(AVG(e.total_score), 2)
    )
    INTO v_result
    FROM public.appointments a
    LEFT JOIN public.evaluations e ON e.appointment_id = a.id
    WHERE a.appointment_date = p_date;

    RETURN v_result;
END;
$$;
