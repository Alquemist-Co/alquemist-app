'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Sprout,
  MapPin,
  Package,
  CalendarDays,
  Shield,
  FileCheck,
  Activity,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/context'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  disabled?: boolean
  featureFlag?: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, disabled: true },
  { label: 'Producción', href: '/production', icon: Sprout, disabled: true },
  { label: 'Áreas', href: '/areas', icon: MapPin },
  { label: 'Inventario', href: '/inventory', icon: Package, disabled: true },
  { label: 'Actividades', href: '/activities', icon: CalendarDays, disabled: true },
  { label: 'Calidad', href: '/quality', icon: FileCheck, disabled: true, featureFlag: 'quality' },
  { label: 'Regulatorio', href: '/regulatory', icon: Shield, disabled: true, featureFlag: 'regulatory' },
  { label: 'Operaciones', href: '/operations', icon: Activity, disabled: true },
  { label: 'Configuración', href: '/settings', icon: Settings },
]

export function SidebarNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  const featuresEnabled = (user.company.settings as Record<string, unknown> | null)?.features_enabled as Record<string, boolean> | undefined

  const visibleItems = navItems.filter((item) => {
    if (!item.featureFlag) return true
    return featuresEnabled?.[item.featureFlag] !== false
  })

  return (
    <nav className="flex flex-col gap-1 px-3">
      {visibleItems.map((item) => {
        const isActive =
          item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)
        const Icon = item.icon

        if (item.disabled) {
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                    'text-muted-foreground/50 cursor-not-allowed'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
              </TooltipTrigger>
              <TooltipContent side="right">Próximamente</TooltipContent>
            </Tooltip>
          )
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
