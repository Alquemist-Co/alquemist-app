'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronRight,
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
import { useAuth } from '@/lib/auth/context'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'

type NavChild = {
  label: string
  href: string
}

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  disabled?: boolean
  featureFlag?: string
  children?: NavChild[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, disabled: true },
  { label: 'Producción', href: '/production', icon: Sprout, disabled: true },
  {
    label: 'Áreas',
    href: '/areas',
    icon: MapPin,
    children: [
      { label: 'Instalaciones', href: '/areas/facilities' },
      { label: 'Zonas', href: '/areas/zones' },
    ],
  },
  {
    label: 'Inventario',
    href: '/inventory',
    icon: Package,
    children: [
      { label: 'Productos', href: '/inventory/products' },
      { label: 'Proveedores', href: '/inventory/suppliers' },
    ],
  },
  { label: 'Actividades', href: '/activities', icon: CalendarDays, disabled: true },
  { label: 'Calidad', href: '/quality', icon: FileCheck, disabled: true, featureFlag: 'quality' },
  { label: 'Regulatorio', href: '/regulatory', icon: Shield, disabled: true, featureFlag: 'regulatory' },
  { label: 'Operaciones', href: '/operations', icon: Activity, disabled: true },
  { label: 'Configuración', href: '/settings', icon: Settings },
]

export function NavMain() {
  const pathname = usePathname()
  const { user } = useAuth()

  const featuresEnabled = (user.company.settings as Record<string, unknown> | null)
    ?.features_enabled as Record<string, boolean> | undefined

  const visibleItems = navItems.filter((item) => {
    if (!item.featureFlag) return true
    return featuresEnabled?.[item.featureFlag] !== false
  })

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {visibleItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)

            if (item.children) {
              return (
                <Collapsible key={item.href} defaultOpen={isActive} asChild>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.label} isActive={isActive}>
                        <item.icon />
                        <span>{item.label}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.children.map((child) => {
                          const childActive =
                            pathname === child.href ||
                            pathname.startsWith(child.href + '/')
                          return (
                            <SidebarMenuSubItem key={child.href}>
                              <SidebarMenuSubButton asChild isActive={childActive}>
                                <Link href={child.href}>
                                  <span>{child.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )
            }

            return (
              <SidebarMenuItem key={item.href}>
                {item.disabled ? (
                  <SidebarMenuButton
                    tooltip="Próximamente"
                    disabled
                    className="opacity-50"
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton asChild tooltip={item.label} isActive={isActive}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
