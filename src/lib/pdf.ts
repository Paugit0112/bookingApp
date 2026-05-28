import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import type { Student, Appointment, Evaluation } from '@/types'
import { CHECKLIST_CRITERIA, RECOMMENDATION_LABELS, MAX_TOTAL_SCORE } from '@/types'
import { formatDate, formatTime, getScoreGrade } from '@/lib/utils'

const BRAND_COLOR: [number, number, number] = [37, 99, 235]  // blue-600
const MUTED_COLOR: [number, number, number] = [100, 116, 139] // slate-500

// ─── Appointment Slip PDF ─────────────────────────────────────────────────────

export function generateAppointmentSlipPDF(student: Student, appointment: Appointment) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })

  const pageW = doc.internal.pageSize.getWidth()

  // Header band
  doc.setFillColor(...BRAND_COLOR)
  doc.rect(0, 0, pageW, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('APPOINTMENT SLIP', pageW / 2, 12, { align: 'center' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Final Project Evaluation — Project Evaluation System', pageW / 2, 20, { align: 'center' })

  // Check mark circle
  doc.setDrawColor(255, 255, 255)
  doc.setFillColor(255, 255, 255)
  doc.circle(pageW / 2, 36, 10, 'F')
  doc.setTextColor(...BRAND_COLOR)
  doc.setFontSize(14)
  doc.text('✓', pageW / 2, 40, { align: 'center' })

  // Title
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Booking Confirmed', pageW / 2, 56, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED_COLOR)
  doc.text('Your appointment has been successfully registered.', pageW / 2, 63, { align: 'center' })

  // Details table
  autoTable(doc, {
    startY: 70,
    margin: { left: 15, right: 15 },
    body: [
      ['Full Name', student.full_name],
      ['Student ID', student.student_id],
      ['Section', student.section],
      ['Date', formatDate(appointment.appointment_date)],
      ['Time', formatTime(appointment.appointment_time)],
      ['Status', appointment.status.toUpperCase()],
      ['Reference', appointment.id.slice(0, 8).toUpperCase()],
    ],
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [71, 85, 105], cellWidth: 35 },
      1: { textColor: [30, 30, 30] },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.2,
  })

  const finalY = (doc as any).lastAutoTable.finalY + 10

  // Footer note
  doc.setFontSize(7)
  doc.setTextColor(...MUTED_COLOR)
  doc.text(
    'Please bring this slip on your evaluation date. Generated: ' + format(new Date(), 'MMM d, yyyy h:mm a'),
    pageW / 2,
    finalY,
    { align: 'center' }
  )

  doc.save(`appointment-slip-${student.student_id}.pdf`)
}

// ─── Evaluation Report PDF ────────────────────────────────────────────────────

export function generateEvaluationReportPDF(
  evaluations: Array<Evaluation & { appointments: Appointment & { students: Student } }>
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  const isSingle = evaluations.length === 1
  const ev = evaluations[0]
  const student = ev.appointments?.students
  const appointment = ev.appointments

  // Header
  doc.setFillColor(...BRAND_COLOR)
  doc.rect(0, 0, pageW, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('FINAL PROJECT EVALUATION REPORT', pageW / 2, 13, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Project Evaluation Management System', pageW / 2, 22, { align: 'center' })

  let currentY = 40

  if (isSingle && student) {
    // Student info
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    doc.text('Student Information', 15, currentY)
    currentY += 6

    autoTable(doc, {
      startY: currentY,
      margin: { left: 15, right: 15 },
      body: [
        ['Name', student.full_name, 'Student ID', student.student_id],
        ['Section', student.section, 'Date', formatDate(appointment.appointment_date)],
      ],
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 30 },
        2: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 30 },
      },
    })

    currentY = (doc as any).lastAutoTable.finalY + 10

    // Score summary
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Evaluation Scores', 15, currentY)
    currentY += 6

    const scoreRows = CHECKLIST_CRITERIA.map((c) => [
      c.label,
      String(ev[c.key as keyof Evaluation] ?? 0),
      String(c.maxScore),
    ])

    autoTable(doc, {
      startY: currentY,
      margin: { left: 15, right: 15 },
      head: [['Criterion', 'Score', 'Max']],
      body: scoreRows,
      foot: [['Total Score', String(ev.total_score), String(MAX_TOTAL_SCORE)]],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: BRAND_COLOR, textColor: 255 },
      footStyles: { fontStyle: 'bold', fillColor: [241, 245, 249] },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
    })

    currentY = (doc as any).lastAutoTable.finalY + 8

    // Grade + Recommendation
    const grade = getScoreGrade(ev.total_score)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...BRAND_COLOR)
    doc.text(
      `Final Score: ${ev.total_score.toFixed(1)} / ${MAX_TOTAL_SCORE} — ${grade.grade}`,
      15,
      currentY
    )
    currentY += 7

    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    doc.text(`Recommendation: ${RECOMMENDATION_LABELS[ev.recommendation as keyof typeof RECOMMENDATION_LABELS]}`, 15, currentY)
    currentY += 10

    // Comments
    if (ev.evaluator_comments) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('Evaluator Comments:', 15, currentY)
      currentY += 6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...MUTED_COLOR)
      const lines = doc.splitTextToSize(ev.evaluator_comments, pageW - 30)
      doc.text(lines, 15, currentY)
    }
  } else {
    // Multi-evaluation summary table
    autoTable(doc, {
      startY: currentY,
      margin: { left: 15, right: 15 },
      head: [['Student', 'ID', 'Section', 'Date', 'Score', 'Recommendation']],
      body: evaluations.map((e) => [
        e.appointments?.students?.full_name ?? '',
        e.appointments?.students?.student_id ?? '',
        e.appointments?.students?.section ?? '',
        formatDate(e.appointments?.appointment_date ?? ''),
        e.total_score.toFixed(1),
        RECOMMENDATION_LABELS[e.recommendation as keyof typeof RECOMMENDATION_LABELS] ?? '',
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: BRAND_COLOR, textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    })
  }

  // Footer
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFontSize(7)
  doc.setTextColor(...MUTED_COLOR)
  doc.text(
    `Generated on ${format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')} · Project Evaluation System`,
    pageW / 2,
    pageH - 8,
    { align: 'center' }
  )

  const filename = isSingle && student
    ? `evaluation-${student.student_id}.pdf`
    : `evaluations-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`

  doc.save(filename)
}
