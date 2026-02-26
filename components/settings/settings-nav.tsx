'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/context'

type NavItem = {
  label: string
  href: string
  featureFlag?: string
}

const navItems: NavItem[] = [
  { label: 'Perfil', href: '/settings/profile' },
  { label: 'Empresa', href: '/settings/company' },
  { label: 'Usuarios', href: '/settings/users' },
  { label: 'Catálogo', href: '/settings/catalog' },
  { label: 'Tipos de Cultivo', href: '/settings/crop-types' },
  { label: 'Cultivares', href: '/settings/cultivars' },
  { label: 'Templates de Actividad', href: '/settings/activity-templates' },
  { label: 'Config. Regulatoria', href: '/settings/regulatory-config', featureFlag: 'regulatory' },
]

export function SettingsNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  const featuresEnabled = (user.company.settings as Record<string, unknown> | null)?.features_enabled as Record<string, boolean> | undefined

  const visibleItems = navItems.filter((item) => {
    if (!item.featureFlag) return true
    return featuresEnabled?.[item.featureFlag] !== false
  })

  return (
    <>
      {/* Desktop — vertical */}
      <nav className="hidden w-48 flex-col gap-1 md:flex">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Mobile — horizontal scroll */}
      <nav className="flex gap-1 overflow-x-auto border-b pb-2 md:hidden">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
