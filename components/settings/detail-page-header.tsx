'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'

type DetailPageHeaderProps = {
  backHref: string
  backLabel: string
  title: string
  subtitle?: string | null
  icon?: string | null
  badges?: ReactNode
  actions?: ReactNode
}

export function DetailPageHeader({
  backHref,
  backLabel,
  title,
  subtitle,
  icon,
  badges,
  actions,
}: DetailPageHeaderProps) {
  return (
    <div className="space-y-4">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon && <span className="text-xl">{icon}</span>}
            <h2 className="text-lg font-semibold truncate">{title}</h2>
            {badges}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-sm text-muted-foreground italic">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
      </div>
    </div>
  )
}
