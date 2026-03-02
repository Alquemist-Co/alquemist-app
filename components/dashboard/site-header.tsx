'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment } from 'react'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

const segmentLabels: Record<string, string> = {
  areas: 'Áreas',
  facilities: 'Instalaciones',
  zones: 'Zonas',
  inventory: 'Inventario',
  products: 'Productos',
  suppliers: 'Proveedores',
  settings: 'Configuración',
  profile: 'Perfil',
  company: 'Empresa',
  users: 'Usuarios',
  'crop-types': 'Tipos de Cultivo',
  cultivars: 'Cultivares',
  'activity-templates': 'Plantillas',
  catalog: 'Catálogo',
  'regulatory-config': 'Regulatorio',
}

export function SiteHeader() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  // Build breadcrumb items from path segments (skip UUIDs)
  const crumbs = segments
    .filter((s) => !/^[0-9a-f]{8}-/.test(s))
    .map((segment, index, arr) => {
      const href = '/' + segments.slice(0, segments.indexOf(segment) + 1).join('/')
      const label = segmentLabels[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1)
      const isLast = index === arr.length - 1
      return { href, label, isLast }
    })

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((crumb, i) => (
              <Fragment key={crumb.href}>
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {crumb.isLast ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
