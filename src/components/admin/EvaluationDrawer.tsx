import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown, ChevronUp, Save, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { evaluationSchema, type EvaluationSchema } from '@/schemas'
import { useEvaluation, useSubmitEvaluation } from '@/hooks/useEvaluations'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { CHECKLIST_CRITERIA, MAX_TOTAL_SCORE, RECOMMENDATION_LABELS } from '@/types'
import { cn, getScoreGrade } from '@/lib/utils'
import type { Recommendation } from '@/types'
import { useState } from 'react'

interface EvaluationDrawerProps {
  appointmentId: string
  open: boolean
  onClose: () => void
}

export function EvaluationDrawer({ appointmentId, open, onClose }: EvaluationDrawerProps) {
  const { profile } = useAuthStore()
  const [expandedCriteria, setExpandedCriteria] = useState<string[]>([])

  // Fetch appointment + student info
  const { data: appointment } = useQuery({
    queryKey: ['appointment-detail', appointmentId],
    queryFn: () => api.appointments.get(appointmentId),
  })

  const { data: existingEval, isLoading } = useEvaluation(appointmentId)
  const { mutate: submitEvaluation, isPending } = useSubmitEvaluation()

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<EvaluationSchema>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: {
      functionality_score: 0,
      data_structure_score: 0,
      algorithm_score: 0,
      file_handling_score: 0,
      dataset_score: 0,
      ui_score: 0,
      code_quality_score: 0,
      documentation_score: 0,
      presentation_score: 0,
      evaluator_comments: '',
      recommendation: undefined,
    },
  })

  // Pre-fill form when editing an existing evaluation
  useEffect(() => {
    if (existingEval) {
      reset({
        functionality_score: existingEval.functionality_score,
        data_structure_score: existingEval.data_structure_score,
        algorithm_score: existingEval.algorithm_score,
        file_handling_score: existingEval.file_handling_score,
        dataset_score: existingEval.dataset_score,
        ui_score: existingEval.ui_score,
        code_quality_score: existingEval.code_quality_score,
        documentation_score: existingEval.documentation_score,
        presentation_score: existingEval.presentation_score,
        evaluator_comments: existingEval.evaluator_comments,
        recommendation: existingEval.recommendation as Recommendation,
      })
    }
  }, [existingEval, reset])

  const watchedScores = watch()
  const currentTotal = CHECKLIST_CRITERIA.reduce((sum, c) => {
    const val = Number(watchedScores[c.key as keyof EvaluationSchema]) || 0
    return sum + Math.min(val, c.maxScore)
  }, 0)

  const scoreGrade = getScoreGrade(currentTotal)

  const onSubmit = (data: EvaluationSchema) => {
    if (!profile) return
    submitEvaluation(
      { appointmentId, evaluatorId: profile.id, formData: data },
      { onSuccess: () => onClose() }
    )
  }

  const toggleCriterion = (key: string) => {
    setExpandedCriteria((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full sm:max-w-2xl flex-col bg-background shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b px-4 sm:px-6 py-4">
              <div>
                <h2 className="font-semibold">Final Project Evaluation</h2>
                {appointment?.students && (
                  <p className="text-sm text-muted-foreground">
                    {appointment.students.full_name} · {appointment.students.student_id}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Live Score Banner */}
            <div className="border-b bg-muted/30 px-4 sm:px-6 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Running Total</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold tabular-nums">{currentTotal.toFixed(1)}</span>
                  <span className="text-muted-foreground">/ {MAX_TOTAL_SCORE}</span>
                  <span className={cn('text-xs font-medium', scoreGrade.color)}>
                    ({scoreGrade.grade})
                  </span>
                </div>
              </div>
              <Progress value={(currentTotal / MAX_TOTAL_SCORE) * 100} className="mt-2 h-2" />
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-4 p-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : (
                <form id="eval-form" onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-3">
                  {/* Evaluation Criteria */}
                  {CHECKLIST_CRITERIA.map((criterion) => {
                    const isExpanded = expandedCriteria.includes(criterion.key)
                    const score = Number(watchedScores[criterion.key as keyof EvaluationSchema]) || 0
                    const pct = Math.min((score / criterion.maxScore) * 100, 100)
                    const fieldError = errors[criterion.key as keyof EvaluationSchema]

                    return (
                      <div key={criterion.key} className="rounded-lg border overflow-hidden">
                        {/* Criterion header */}
                        <button
                          type="button"
                          onClick={() => toggleCriterion(criterion.key)}
                          className="flex w-full items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm truncate">{criterion.label}</span>
                              <span className="text-sm font-bold tabular-nums shrink-0">
                                {score}/{criterion.maxScore}
                              </span>
                            </div>
                            <Progress value={pct} className="mt-1.5 h-1.5" />
                          </div>
                          <span className="ml-3 shrink-0 text-muted-foreground">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </span>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t overflow-hidden"
                            >
                              <div className="p-4 space-y-3 bg-muted/10">
                                <p className="text-sm text-muted-foreground">{criterion.description}</p>
                                {criterion.subcriteria && (
                                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                                    {criterion.subcriteria.map((sc) => (
                                      <li key={sc}>{sc}</li>
                                    ))}
                                  </ul>
                                )}
                                <div className="space-y-1">
                                  <Label htmlFor={criterion.key}>
                                    Score (0–{criterion.maxScore})
                                  </Label>
                                  <input
                                    id={criterion.key}
                                    type="number"
                                    min={0}
                                    max={criterion.maxScore}
                                    step={0.5}
                                    {...register(criterion.key as keyof EvaluationSchema, { valueAsNumber: true })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                  />
                                  {fieldError && (
                                    <p className="text-xs text-destructive">
                                      {typeof fieldError.message === 'string' ? fieldError.message : 'Invalid score'}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}

                  <Separator />

                  {/* Evaluator Comments */}
                  <div className="space-y-1.5">
                    <Label htmlFor="evaluator_comments">Evaluator Comments & Feedback</Label>
                    <textarea
                      id="evaluator_comments"
                      rows={4}
                      placeholder="Provide detailed feedback on the project..."
                      {...register('evaluator_comments')}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    />
                    {errors.evaluator_comments && (
                      <p className="text-xs text-destructive">{errors.evaluator_comments.message}</p>
                    )}
                  </div>

                  {/* Recommendation */}
                  <div className="space-y-1.5">
                    <Label>Recommendation</Label>
                    <Controller
                      name="recommendation"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger aria-invalid={!!errors.recommendation}>
                            <SelectValue placeholder="Select a recommendation" />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.entries(RECOMMENDATION_LABELS) as [Recommendation, string][]).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.recommendation && (
                      <p className="text-xs text-destructive">{errors.recommendation.message}</p>
                    )}
                  </div>

                  {/* Info note */}
                  <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-sm text-blue-700 dark:text-blue-300">
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Total score is automatically computed from all criteria. Maximum is {MAX_TOTAL_SCORE} points.</span>
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="border-t bg-background px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="eval-form"
                disabled={isPending}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isPending ? 'Saving...' : existingEval ? 'Update Evaluation' : 'Submit Evaluation'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
