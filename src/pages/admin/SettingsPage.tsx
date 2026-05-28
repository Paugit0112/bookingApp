import { useState } from 'react'
import { Trash2, Plus, CalendarDays, AlertCircle, User, Lock, Eye, EyeOff, UploadCloud, DownloadCloud, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AdminNavbar } from '@/components/shared/Adminnavbar'
import { useExamDates, useAddExamDate, useRemoveExamDate } from '@/hooks/useExamDates'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import type { SyncResult } from '@/lib/api'
import { formatDate } from '@/lib/utils'

function loadLastSync(): SyncResult | null {
  try {
    const s = localStorage.getItem('evalbook_last_sync')
    return s ? JSON.parse(s) : null
  } catch { return null }
}

export default function SettingsPage() {
  const { profile, setProfile } = useAuthStore()

  // ── Exam dates ────────────────────────────────────────────────────────────
  const [newDate, setNewDate] = useState('')
  const [removingDate, setRemovingDate] = useState<string | null>(null)

  const { data: examDates, isLoading } = useExamDates()
  const { mutate: addDate, isPending: isAdding } = useAddExamDate()
  const { mutate: removeDate, isPending: isRemoving } = useRemoveExamDate()

  const handleAdd = () => {
    if (!newDate) return
    addDate(newDate, { onSuccess: () => setNewDate('') })
  }

  const handleRemove = () => {
    if (!removingDate) return
    removeDate(removingDate, { onSettled: () => setRemovingDate(null) })
  }

  // ── Display name ──────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(profile?.full_name ?? '')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const handleSaveProfile = async () => {
    if (!displayName.trim()) { toast.error('Display name cannot be empty.'); return }
    setIsSavingProfile(true)
    try {
      const updated = await api.auth.updateProfile(displayName.trim())
      setProfile(updated)
      toast.success('Display name updated.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  // ── Password ──────────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [isSavingPw, setIsSavingPw] = useState(false)

  const handleSavePassword = async () => {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) { toast.error('All password fields are required.'); return }
    if (pwForm.next.length < 8) { toast.error('New password must be at least 8 characters.'); return }
    if (pwForm.next !== pwForm.confirm) { toast.error('New passwords do not match.'); return }
    setIsSavingPw(true)
    try {
      await api.auth.updatePassword(pwForm.current, pwForm.next)
      setPwForm({ current: '', next: '', confirm: '' })
      toast.success('Password changed successfully.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Password change failed.')
    } finally {
      setIsSavingPw(false)
    }
  }

  // ── Cloud sync ────────────────────────────────────────────────────────────
  const [isSyncing, setIsSyncing]   = useState(false)
  const [syncError, setSyncError]   = useState<string | null>(null)
  const [lastSync,  setLastSync]    = useState<SyncResult | null>(loadLastSync)

  const [isPulling, setIsPulling]   = useState(false)
  const [pullError, setPullError]   = useState<string | null>(null)
  const [lastPull,  setLastPull]    = useState<SyncResult | null>(() => {
    try { const s = localStorage.getItem('evalbook_last_pull'); return s ? JSON.parse(s) : null }
    catch { return null }
  })

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncError(null)
    try {
      const result = await api.sync.push()
      setLastSync(result)
      localStorage.setItem('evalbook_last_sync', JSON.stringify(result))
      const total = result.results.students + result.results.appointments + result.results.evaluations
      if (result.success) {
        toast.success(`Pushed ${total} records to Supabase.`)
      } else {
        toast.warning(`Push finished with ${result.errors.length} error(s).`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed.'
      setSyncError(msg)
      toast.error(msg)
    } finally {
      setIsSyncing(false)
    }
  }

  const handlePull = async () => {
    setIsPulling(true)
    setPullError(null)
    try {
      const result = await api.sync.pull()
      setLastPull(result)
      localStorage.setItem('evalbook_last_pull', JSON.stringify(result))
      const total = result.results.students + result.results.appointments + result.results.evaluations
      if (result.success) {
        toast.success(`Pulled ${total} records from Supabase.`)
      } else {
        toast.warning(`Pull finished with ${result.errors.length} error(s).`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Pull failed.'
      setPullError(msg)
      toast.error(msg)
    } finally {
      setIsPulling(false)
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AdminNavbar title="Settings" subtitle="Manage exam schedule and account settings" />

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">

        {/* ── Cloud Sync ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UploadCloud className="h-4 w-4 text-primary" />
              Cloud Sync
            </CardTitle>
            <CardDescription>
              Sync between local MySQL and Supabase. Use <strong>Push</strong> after working offline,
              or <strong>Pull</strong> to restore local data from the cloud.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-0 divide-y">

            {/* ── Push: Local → Cloud ── */}
            <div className="py-4 space-y-3">
              <div className="flex items-center gap-2">
                <UploadCloud className="h-4 w-4 text-blue-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Local → Cloud</p>
                  <p className="text-xs text-muted-foreground">Push local records to Supabase</p>
                </div>
              </div>

              {lastSync && <SyncSummary result={lastSync} />}
              {syncError && <SyncError message={syncError} />}

              <Button onClick={handleSync} disabled={isSyncing || isPulling} className="gap-2">
                {isSyncing
                  ? <><RefreshCw className="h-4 w-4 animate-spin" />Pushing…</>
                  : <><UploadCloud className="h-4 w-4" />Push to Cloud</>
                }
              </Button>
            </div>

            {/* ── Pull: Cloud → Local ── */}
            <div className="py-4 space-y-3">
              <div className="flex items-center gap-2">
                <DownloadCloud className="h-4 w-4 text-green-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Cloud → Local</p>
                  <p className="text-xs text-muted-foreground">Pull records from Supabase into local database</p>
                </div>
              </div>

              {lastPull && <SyncSummary result={lastPull} />}
              {pullError && <SyncError message={pullError} />}

              <Button onClick={handlePull} disabled={isPulling || isSyncing} variant="outline" className="gap-2">
                {isPulling
                  ? <><RefreshCw className="h-4 w-4 animate-spin" />Pulling…</>
                  : <><DownloadCloud className="h-4 w-4" />Pull from Cloud</>
                }
              </Button>
            </div>

            <p className="pt-3 text-xs text-muted-foreground">
              Requires <code className="rounded bg-muted px-1 py-0.5 font-mono">SUPABASE_SERVICE_KEY</code> in <code className="rounded bg-muted px-1 py-0.5 font-mono">.env</code>
            </p>
          </CardContent>
        </Card>

        {/* ── Exam Dates ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              Exam Dates
            </CardTitle>
            <CardDescription>
              Add or remove available exam dates. Dates with existing bookings cannot be removed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 items-end">
              <div className="space-y-1.5 flex-1">
                <Label htmlFor="new-date">Add Exam Date</Label>
                <Input
                  id="new-date"
                  type="date"
                  value={newDate}
                  min={today}
                  onChange={e => setNewDate(e.target.value)}
                />
              </div>
              <Button onClick={handleAdd} disabled={!newDate || isAdding} className="gap-1.5 shrink-0">
                <Plus className="h-4 w-4" />
                {isAdding ? 'Adding…' : 'Add Date'}
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Current Exam Dates ({examDates?.length ?? 0})
              </p>
              {isLoading && (
                <div className="space-y-2">
                  {['a','b','c','d','e'].map(k => <Skeleton key={k} className="h-10 w-full rounded-md" />)}
                </div>
              )}
              {!isLoading && examDates?.length === 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  No exam dates configured. Add one above.
                </div>
              )}
              {!isLoading && examDates?.map(date => (
                <div key={date} className="flex items-center justify-between rounded-lg border px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{formatDate(date)}</p>
                    <p className="text-xs text-muted-foreground">{date}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setRemovingDate(date)}
                    aria-label={`Remove ${date}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Display Name ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-primary" />
              Display Name
            </CardTitle>
            <CardDescription>
              Update the name shown throughout the admin panel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="display-name">Full Name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                disabled={isSavingProfile}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveProfile}
                disabled={isSavingProfile || displayName.trim() === (profile?.full_name ?? '')}
              >
                {isSavingProfile ? 'Saving…' : 'Save Name'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Logged in as <span className="font-medium text-foreground">{profile?.email}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Change Password ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4 text-primary" />
              Change Password
            </CardTitle>
            <CardDescription>
              Enter your current password then choose a new one (min. 8 characters).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pw-current">Current Password</Label>
              <div className="relative">
                <Input
                  id="pw-current"
                  type={showCurrent ? 'text' : 'password'}
                  value={pwForm.current}
                  onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                  className="pr-9"
                  disabled={isSavingPw}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pw-new">New Password</Label>
              <div className="relative">
                <Input
                  id="pw-new"
                  type={showNext ? 'text' : 'password'}
                  value={pwForm.next}
                  onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                  className="pr-9"
                  disabled={isSavingPw}
                />
                <button
                  type="button"
                  onClick={() => setShowNext(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pw-confirm">Confirm New Password</Label>
              <Input
                id="pw-confirm"
                type="password"
                value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                disabled={isSavingPw}
              />
              {pwForm.confirm && pwForm.next !== pwForm.confirm && (
                <p className="text-xs text-destructive">Passwords do not match.</p>
              )}
            </div>

            <Button
              onClick={handleSavePassword}
              disabled={isSavingPw || !pwForm.current || !pwForm.next || !pwForm.confirm}
            >
              {isSavingPw ? 'Saving…' : 'Change Password'}
            </Button>
          </CardContent>
        </Card>

      </div>

      <AlertDialog open={!!removingDate} onOpenChange={open => { if (!open) setRemovingDate(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Exam Date</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{removingDate ? formatDate(removingDate) : ''}</strong> from the schedule?
              This cannot be done if any bookings exist for this date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Shared sync sub-components ───────────────────────────────────────────────

function SyncSummary({ result }: Readonly<{ result: SyncResult }>) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{new Date(result.synced_at).toLocaleString()}</span>
        <div className="flex items-center gap-1">
          {result.success
            ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /><span className="text-green-600 dark:text-green-400">Success</span></>
            : <><XCircle className="h-3.5 w-3.5 text-destructive" /><span className="text-destructive">Had errors</span></>
          }
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
        {(['Students', 'Appointments', 'Evaluations'] as const).map(label => (
          <div key={label} className="rounded bg-muted px-2 py-1">
            <p className="font-bold">{result.results[label.toLowerCase() as keyof typeof result.results]}</p>
            <p className="text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      {result.errors.length > 0 && result.errors.map((e, i) => (
        <p key={i} className="text-xs text-destructive">
          <span className="font-medium">{e.table}:</span> {e.error}
        </p>
      ))}
    </div>
  )
}

function SyncError({ message }: Readonly<{ message: string }>) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
