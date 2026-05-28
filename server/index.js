require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const jwt     = require('jsonwebtoken')
const bcrypt  = require('bcryptjs')
const { randomUUID } = require('node:crypto')
const db      = require('./db')

const app    = express()
const PORT   = process.env.PORT || 3002
const SECRET = process.env.JWT_SECRET || 'evalbook-local-secret-change-in-prod'
const MAX_BOOKINGS = 24

app.disable('x-powered-by')
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }))
app.use(express.json())
app.get('/.well-known/*', (_, res) => res.status(204).end())

// ─── Auth middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  try {
    req.admin = jwt.verify(header.slice(7), SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const [rows] = await db.query('SELECT * FROM admin_profiles WHERE email = ?', [email])
  const admin  = rows[0]
  if (!admin) return res.status(401).json({ error: 'Invalid email or password' })

  const valid = await bcrypt.compare(password, admin.password)
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

  const token = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, SECRET, { expiresIn: '8h' })
  const profile = Object.fromEntries(Object.entries(admin).filter(([k]) => k !== 'password'))
  res.json({ token, user: { id: admin.id, email: admin.email }, profile })
})

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
app.get('/api/auth/me', requireAuth, async (req, res) => {
  const [rows] = await db.query('SELECT id,full_name,email,role,created_at FROM admin_profiles WHERE id = ?', [req.admin.id])
  if (!rows[0]) return res.status(404).json({ error: 'Profile not found' })
  res.json(rows[0])
})

// ─── GET /api/slots/:date ─────────────────────────────────────────────────────
app.get('/api/slots/:date', async (req, res) => {
  const { date } = req.params
  const [[{ booked }]] = await db.query(
    `SELECT COUNT(*) AS booked FROM appointments
     WHERE appointment_date = ? AND status NOT IN ('rejected','cancelled')`,
    [date]
  )
  const remaining = Math.max(MAX_BOOKINGS - booked, 0)
  res.json({ date, booked, remaining, is_full: booked >= MAX_BOOKINGS })
})

// ─── POST /api/book ───────────────────────────────────────────────────────────
app.post('/api/book', async (req, res) => {
  const { full_name, student_id, section, appointment_date, appointment_time } = req.body

  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    // 1. Check slot limit
    const [[{ booked }]] = await conn.query(
      `SELECT COUNT(*) AS booked FROM appointments
       WHERE appointment_date = ? AND status NOT IN ('rejected','cancelled')`,
      [appointment_date]
    )
    if (booked >= MAX_BOOKINGS) {
      await conn.rollback()
      return res.status(409).json({ error: 'SLOT_FULL: No remaining slots for this date' })
    }

    // 2. Upsert student
    const sid = student_id.toUpperCase().trim()
    const [existing] = await conn.query('SELECT * FROM students WHERE student_id = ?', [sid])
    let student
    if (existing[0]) {
      await conn.query('UPDATE students SET full_name=?, section=? WHERE student_id=?', [full_name.trim(), section.trim(), sid])
      student = { ...existing[0], full_name: full_name.trim(), section: section.trim() }
    } else {
      const newId = randomUUID()
      await conn.query(
        'INSERT INTO students (id,full_name,student_id,section) VALUES (?,?,?,?)',
        [newId, full_name.trim(), sid, section.trim()]
      )
      const [[s]] = await conn.query('SELECT * FROM students WHERE id=?', [newId])
      student = s
    }

    // 3. Check duplicate active booking
    const [active] = await conn.query(
      `SELECT id FROM appointments WHERE student_id=? AND status NOT IN ('rejected','cancelled')`,
      [student.id]
    )
    if (active[0]) {
      await conn.rollback()
      return res.status(409).json({ error: 'DUPLICATE_BOOKING: Student already has an active appointment' })
    }

    // 4. Insert appointment
    const apptId = randomUUID()
    await conn.query(
      'INSERT INTO appointments (id,student_id,appointment_date,appointment_time,status) VALUES (?,?,?,?,?)',
      [apptId, student.id, appointment_date, appointment_time, 'approved']
    )
    const [[appointment]] = await conn.query('SELECT * FROM appointments WHERE id=?', [apptId])

    await conn.commit()
    res.status(201).json({ student, appointment })
  } catch (err) {
    await conn.rollback()
    console.error('book_appointment error:', err)
    res.status(500).json({ error: err.message })
  } finally {
    conn.release()
  }
})

// ─── GET /api/student/:studentId/appointment ──────────────────────────────────
app.get('/api/student/:studentId/appointment', async (req, res) => {
  const sid = req.params.studentId.toUpperCase()
  const [students] = await db.query('SELECT * FROM students WHERE student_id = ?', [sid])
  if (!students[0]) return res.json(null)
  const student = students[0]

  const [appts] = await db.query(
    `SELECT * FROM appointments WHERE student_id=? AND status NOT IN ('rejected','cancelled') LIMIT 1`,
    [student.id]
  )
  if (!appts[0]) return res.json(null)
  const appointment = appts[0]

  const [evals] = await db.query('SELECT * FROM evaluations WHERE appointment_id=?', [appointment.id])
  res.json({ student, appointment, evaluation: evals[0] ?? null })
})

// ─── PATCH /api/appointments/:id/withdraw ────────────────────────────────────
app.patch('/api/appointments/:id/withdraw', async (req, res) => {
  const { student_id } = req.body
  const { id } = req.params
  if (!student_id) return res.status(400).json({ error: 'student_id required' })

  const [rows] = await db.query(`
    SELECT a.*, s.student_id AS s_student_id
    FROM appointments a
    JOIN students s ON s.id = a.student_id
    WHERE a.id = ?
  `, [id])

  const appt = rows[0]
  if (!appt) return res.status(404).json({ error: 'Appointment not found' })
  if (appt.s_student_id.toUpperCase() !== student_id.toUpperCase())
    return res.status(403).json({ error: 'Not your appointment' })
  if (!['pending', 'approved'].includes(appt.status))
    return res.status(409).json({ error: 'INVALID_STATUS: Only pending or approved appointments can be withdrawn' })

  const [y, mo, d] = appt.appointment_date.toISOString
    ? appt.appointment_date.toISOString().slice(0, 10).split('-').map(Number)
    : String(appt.appointment_date).slice(0, 10).split('-').map(Number)
  const [h, m] = String(appt.appointment_time).slice(0, 5).split(':').map(Number)
  const scheduledAt = new Date(y, mo - 1, d, h, m)
  const deadline = new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000)

  if (new Date() >= deadline)
    return res.status(409).json({ error: 'WITHDRAWAL_DEADLINE: Cannot withdraw within 2 hours of your scheduled time' })

  await db.query("UPDATE appointments SET status='cancelled' WHERE id=?", [id])
  res.json({ success: true })
})

// ─── GET /api/appointments ────────────────────────────────────────────────────
app.get('/api/appointments', requireAuth, async (req, res) => {
  const { status, date, search } = req.query
  let sql = `SELECT a.*, s.id AS s_id, s.full_name, s.student_id AS s_student_id,
               s.section, s.created_at AS s_created_at
             FROM appointments a
             JOIN students s ON s.id = a.student_id
             WHERE 1=1`
  const params = []

  if (status && status !== 'all') { sql += ' AND a.status = ?'; params.push(status) }
  if (date)                       { sql += ' AND a.appointment_date = ?'; params.push(date) }
  if (search) {
    sql += ' AND (s.full_name LIKE ? OR s.student_id LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }
  sql += ' ORDER BY a.created_at DESC'

  const [rows] = await db.query(sql, params)

  const data = rows.map(r => ({
    id: r.id, student_id: r.student_id, appointment_date: r.appointment_date,
    appointment_time: r.appointment_time, status: r.status, created_at: r.created_at,
    students: {
      id: r.s_id, full_name: r.full_name, student_id: r.s_student_id,
      section: r.section, created_at: r.s_created_at,
    },
  }))
  res.json(data)
})

// ─── PATCH /api/appointments/:id/status ──────────────────────────────────────
app.patch('/api/appointments/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body
  const { id } = req.params
  const adminId = req.admin.id

  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const [result] = await conn.query('UPDATE appointments SET status=? WHERE id=?', [status, id])
    if (result.affectedRows === 0) {
      await conn.rollback()
      return res.status(404).json({ error: 'Appointment not found' })
    }
    await conn.query(
      'INSERT INTO audit_logs (id,admin_id,action,target_type,target_id,metadata) VALUES (?,?,?,?,?,?)',
      [randomUUID(), adminId, 'STATUS_UPDATE', 'appointment', id, JSON.stringify({ new_status: status })]
    )
    await conn.commit()
    res.json({ success: true })
  } catch (err) {
    await conn.rollback()
    res.status(500).json({ error: err.message })
  } finally {
    conn.release()
  }
})

// ─── GET /api/students ────────────────────────────────────────────────────────
app.get('/api/students', requireAuth, async (req, res) => {
  const { search } = req.query
  let sql = 'SELECT * FROM students WHERE 1=1'
  const params = []
  if (search) {
    sql += ' AND (full_name LIKE ? OR student_id LIKE ? OR section LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  sql += ' ORDER BY created_at DESC'
  const [rows] = await db.query(sql, params)
  res.json(rows)
})

// ─── GET /api/evaluations ─────────────────────────────────────────────────────
app.get('/api/evaluations', requireAuth, async (req, res) => {
  const [rows] = await db.query(`
    SELECT e.*,
      a.id AS a_id, a.appointment_date, a.appointment_time, a.status AS a_status,
      s.full_name, s.student_id AS s_student_id, s.section
    FROM evaluations e
    JOIN appointments a ON a.id = e.appointment_id
    JOIN students s ON s.id = a.student_id
    ORDER BY e.evaluated_at DESC
  `)
  const data = rows.map(r => ({
    ...pickEval(r),
    appointments: {
      id: r.a_id, appointment_date: r.appointment_date,
      appointment_time: r.appointment_time, status: r.a_status,
      students: { full_name: r.full_name, student_id: r.s_student_id, section: r.section },
    },
  }))
  res.json(data)
})

// ─── GET /api/evaluations/:appointmentId ──────────────────────────────────────
app.get('/api/evaluations/:appointmentId', requireAuth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM evaluations WHERE appointment_id=?', [req.params.appointmentId])
  res.json(rows[0] ?? null)
})

// ─── POST /api/evaluations ────────────────────────────────────────────────────
app.post('/api/evaluations', requireAuth, async (req, res) => {
  const { appointment_id, evaluator_id, ...scores } = req.body
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const [existing] = await conn.query('SELECT id FROM evaluations WHERE appointment_id=?', [appointment_id])
    if (existing[0]) {
      await conn.query(
        `UPDATE evaluations SET evaluator_id=?,functionality_score=?,data_structure_score=?,
         algorithm_score=?,file_handling_score=?,dataset_score=?,ui_score=?,code_quality_score=?,
         documentation_score=?,presentation_score=?,evaluator_comments=?,recommendation=?,
         evaluated_at=NOW() WHERE appointment_id=?`,
        [evaluator_id, scores.functionality_score, scores.data_structure_score, scores.algorithm_score,
         scores.file_handling_score, scores.dataset_score, scores.ui_score, scores.code_quality_score,
         scores.documentation_score, scores.presentation_score, scores.evaluator_comments,
         scores.recommendation, appointment_id]
      )
    } else {
      const newId = randomUUID()
      await conn.query(
        `INSERT INTO evaluations (id,appointment_id,evaluator_id,functionality_score,data_structure_score,
         algorithm_score,file_handling_score,dataset_score,ui_score,code_quality_score,
         documentation_score,presentation_score,evaluator_comments,recommendation)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [newId, appointment_id, evaluator_id, scores.functionality_score, scores.data_structure_score,
         scores.algorithm_score, scores.file_handling_score, scores.dataset_score, scores.ui_score,
         scores.code_quality_score, scores.documentation_score, scores.presentation_score,
         scores.evaluator_comments, scores.recommendation]
      )
    }
    await conn.query("UPDATE appointments SET status='evaluated' WHERE id=?", [appointment_id])
    await conn.commit()
    const [[row]] = await conn.query('SELECT * FROM evaluations WHERE appointment_id=?', [appointment_id])
    res.json(row)
  } catch (err) {
    await conn.rollback()
    res.status(500).json({ error: err.message })
  } finally {
    conn.release()
  }
})

// ─── GET /api/audit-logs ──────────────────────────────────────────────────────
app.get('/api/audit-logs', requireAuth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200')
  res.json(rows)
})

// ─── GET /api/dashboard/stats/:date ──────────────────────────────────────────
app.get('/api/dashboard/stats/:date', requireAuth, async (req, res) => {
  const { date } = req.params
  const [[stats]] = await db.query(`
    SELECT
      COUNT(*)                                       AS total_booked,
      SUM(a.status = 'pending')                      AS pending,
      SUM(a.status = 'approved')                     AS approved,
      SUM(a.status = 'evaluated')                    AS evaluated,
      SUM(a.status = 'rejected')                     AS rejected,
      SUM(a.status = 'cancelled')                    AS cancelled,
      ROUND(AVG(e.total_score), 2)                   AS avg_score
    FROM appointments a
    LEFT JOIN evaluations e ON e.appointment_id = a.id
    WHERE a.appointment_date = ?
  `, [date])
  res.json(stats)
})

// ─── PATCH /api/appointments/:id/withdraw ────────────────────────────────────
app.patch('/api/appointments/:id/withdraw', async (req, res) => {
  const { id } = req.params
  const { student_id } = req.body
  if (!student_id) return res.status(400).json({ error: 'student_id required' })

  const [rows] = await db.query(
    `SELECT a.*, s.student_id AS s_student_id
     FROM appointments a JOIN students s ON s.id = a.student_id
     WHERE a.id = ?`,
    [id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Appointment not found' })
  const appt = rows[0]

  if (appt.s_student_id.toUpperCase() !== student_id.trim().toUpperCase()) {
    return res.status(403).json({ error: 'Unauthorized: student ID mismatch' })
  }

  if (!['pending', 'approved'].includes(appt.status)) {
    return res.status(409).json({ error: 'Appointment cannot be withdrawn in its current status' })
  }

  // Enforce 3-hour withdrawal deadline
  const dateStr = appt.appointment_date instanceof Date
    ? appt.appointment_date.toISOString().slice(0, 10)
    : String(appt.appointment_date).slice(0, 10)
  const timeStr = String(appt.appointment_time).slice(0, 5)
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, m] = timeStr.split(':').map(Number)
  const scheduled = new Date(y, mo - 1, d, h, m)
  const deadline  = new Date(scheduled.getTime() - 3 * 60 * 60 * 1000)

  if (new Date() >= deadline) {
    return res.status(409).json({
      error: 'WITHDRAWAL_DEADLINE: Cannot withdraw within 3 hours of your scheduled appointment',
    })
  }

  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query("UPDATE appointments SET status='cancelled' WHERE id=?", [id])
    await conn.query(
      'INSERT INTO audit_logs (id,admin_id,action,target_type,target_id,metadata) VALUES (?,?,?,?,?,?)',
      [randomUUID(), null, 'STUDENT_WITHDRAW', 'appointment', id,
       JSON.stringify({ student_id: appt.s_student_id })]
    )
    await conn.commit()
    res.json({ success: true })
  } catch (err) {
    await conn.rollback()
    res.status(500).json({ error: err.message })
  } finally {
    conn.release()
  }
})

// ─── GET /api/appointments/:id ───────────────────────────────────────────────
app.get('/api/appointments/:id', requireAuth, async (req, res) => {
  const [rows] = await db.query(`
    SELECT a.*, s.id AS s_id, s.full_name, s.student_id AS s_student_id, s.section, s.created_at AS s_created_at
    FROM appointments a JOIN students s ON s.id = a.student_id
    WHERE a.id = ?
  `, [req.params.id])
  if (!rows[0]) return res.status(404).json({ error: 'Not found' })
  const r = rows[0]
  res.json({
    ...r,
    students: { id: r.s_id, full_name: r.full_name, student_id: r.s_student_id, section: r.section, created_at: r.s_created_at },
  })
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pickEval(r) {
  return {
    id: r.id, appointment_id: r.appointment_id, evaluator_id: r.evaluator_id,
    functionality_score: r.functionality_score, data_structure_score: r.data_structure_score,
    algorithm_score: r.algorithm_score, file_handling_score: r.file_handling_score,
    dataset_score: r.dataset_score, ui_score: r.ui_score, code_quality_score: r.code_quality_score,
    documentation_score: r.documentation_score, presentation_score: r.presentation_score,
    total_score: r.total_score, evaluator_comments: r.evaluator_comments,
    recommendation: r.recommendation, evaluated_at: r.evaluated_at,
  }
}


app.listen(PORT, () => console.log(`EvalBook API running on http://localhost:${PORT}`))
