import { Menu, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/shared/ThemeProvider'
import { useSidebar } from '@/contexts/SidebarContext'

interface AdminNavbarProps {
  readonly title: string
  readonly subtitle?: string
}

export function AdminNavbar({ title, subtitle }: AdminNavbarProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const { openMobile } = useSidebar()

  return (
    <header className="flex h-14 sm:h-16 items-center justify-between border-b bg-background px-4 sm:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-8 w-8"
          onClick={openMobile}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-base sm:text-lg font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  )
}
