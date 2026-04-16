'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, FileText, CheckCircle2, AlertTriangle, Clock, ExternalLink } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ---------- Types ----------

export type RegulatoryDocData = {
  id: string
  doc_type_id: string
  doc_type_name: string
  doc_type_category: string
  document_number: string | null
  issue_date: string
  expiry_date: string | null
  status: string
  file_path: string | null
  field_data: Record<string, unknown>
  verified_by: string | null
  verifier_name: string | null
}

type Props = {
  documents: RegulatoryDocData[]
}

// ---------- Helpers ----------

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  valid: 'Válido',
  expired: 'Vencido',
  revoked: 'Revocado',
  superseded: 'Reemplazado',
}

const statusBadgeStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  valid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  revoked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  superseded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
}

const categoryLabels: Record<string, string> = {
  quality: 'Calidad',
  transport: 'Transporte',
  compliance: 'Cumplimiento',
  origin: 'Origen',
  safety: 'Seguridad',
  commercial: 'Comercial',
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) return false
  const expiry = new Date(expiryDate + 'T00:00:00')
  const today = new Date()
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntilExpiry > 0 && daysUntilExpiry <= 30
}

// ---------- Component ----------

export function RegulatoryTab({ documents }: Props) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['quality', 'compliance']))
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set())

  // Group documents by category
  const docsByCategory = useMemo(() => {
    const map = new Map<string, RegulatoryDocData[]>()

    for (const doc of documents) {
      const category = doc.doc_type_category || 'other'
      const list = map.get(category) ?? []
      list.push(doc)
      map.set(category, list)
    }

    return map
  }, [documents])

  // Calculate stats per category
  const categoryStats = useMemo(() => {
    const stats = new Map<string, { total: number; valid: number; expired: number; expiring: number }>()

    for (const [category, docs] of docsByCategory) {
      stats.set(category, {
        total: docs.length,
        valid: docs.filter((d) => d.status === 'valid').length,
        expired: docs.filter((d) => d.status === 'expired').length,
        expiring: docs.filter((d) => d.status === 'valid' && isExpiringSoon(d.expiry_date)).length,
      })
    }

    return stats
  }, [docsByCategory])

  const toggleCategory = (category: string) => {
    const next = new Set(expandedCategories)
    if (next.has(category)) {
      next.delete(category)
    } else {
      next.add(category)
    }
    setExpandedCategories(next)
  }

  const toggleDoc = (docId: string) => {
    const next = new Set(expandedDocs)
    if (next.has(docId)) {
      next.delete(docId)
    } else {
      next.add(docId)
    }
    setExpandedDocs(next)
  }

  // Summary stats
  const totalDocs = documents.length
  const validDocs = documents.filter((d) => d.status === 'valid').length
  const expiredDocs = documents.filter((d) => d.status === 'expired').length
  const expiringDocs = documents.filter((d) => d.status === 'valid' && isExpiringSoon(d.expiry_date)).length

  if (documents.length === 0) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-3 text-lg font-medium">Sin documentos regulatorios</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No hay documentos regulatorios asociados a este lote.
        </p>
      </div>
    )
  }

  const categories = Array.from(docsByCategory.keys()).sort()

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-lg font-semibold">{totalDocs}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Válidos</p>
              <p className="text-lg font-semibold">{validDocs}</p>
            </div>
          </div>
          {expiringDocs > 0 && (
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Por vencer</p>
                <p className="text-lg font-semibold">{expiringDocs}</p>
              </div>
            </div>
          )}
          {expiredDocs > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Vencidos</p>
                <p className="text-lg font-semibold">{expiredDocs}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category groups */}
      {categories.map((category) => {
        const docs = docsByCategory.get(category) ?? []
        const stats = categoryStats.get(category) ?? { total: 0, valid: 0, expired: 0, expiring: 0 }

        if (stats.total === 0) return null

        const isExpanded = expandedCategories.has(category)

        return (
          <Collapsible
            key={category}
            open={isExpanded}
            onOpenChange={() => toggleCategory(category)}
          >
            <CollapsibleTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-md border bg-muted/50 px-4 py-3 text-left hover:bg-muted/80 transition-colors">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium">{categoryLabels[category] ?? category}</span>
                <span className="text-sm text-muted-foreground">
                  — {stats.total} documento{stats.total !== 1 ? 's' : ''}
                </span>
                {stats.expiring > 0 && (
                  <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    <Clock className="mr-1 h-3 w-3" />
                    {stats.expiring} por vencer
                  </Badge>
                )}
                {stats.expired > 0 && (
                  <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {stats.expired} vencido{stats.expired !== 1 ? 's' : ''}
                  </Badge>
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha emisión</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verificado</TableHead>
                      <TableHead className="text-right">Archivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docs.map((doc) => {
                      const isDocExpanded = expandedDocs.has(doc.id)
                      const hasFieldData = Object.keys(doc.field_data).length > 0
                      const expiringSoon = isExpiringSoon(doc.expiry_date)

                      return (
                        <>
                          <TableRow key={doc.id} className="group">
                            <TableCell>
                              {hasFieldData && (
                                <button
                                  onClick={() => toggleDoc(doc.id)}
                                  className="p-1 hover:bg-muted rounded"
                                >
                                  {isDocExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{doc.doc_type_name}</TableCell>
                            <TableCell>{doc.document_number ?? '—'}</TableCell>
                            <TableCell>{formatDate(doc.issue_date)}</TableCell>
                            <TableCell>
                              <span className={expiringSoon ? 'text-yellow-600 font-medium' : ''}>
                                {formatDate(doc.expiry_date)}
                              </span>
                              {expiringSoon && (
                                <Clock className="ml-1 inline h-3 w-3 text-yellow-600" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusBadgeStyles[doc.status] ?? ''}>
                                {statusLabels[doc.status] ?? doc.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {doc.verifier_name ? (
                                <span className="text-green-600 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {doc.verifier_name}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {doc.file_path ? (
                                <Button variant="ghost" size="sm" asChild>
                                  <a
                                    href={doc.file_path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">Sin archivo</span>
                              )}
                            </TableCell>
                          </TableRow>
                          {isDocExpanded && hasFieldData && (
                            <TableRow key={`${doc.id}-details`}>
                              <TableCell colSpan={8} className="bg-muted/30 p-0">
                                <div className="p-4">
                                  <h4 className="text-sm font-medium mb-2">Datos adicionales</h4>
                                  <dl className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                                    {Object.entries(doc.field_data).map(([key, value]) => (
                                      <div key={key}>
                                        <dt className="text-muted-foreground capitalize">
                                          {key.replace(/_/g, ' ')}
                                        </dt>
                                        <dd className="font-medium">
                                          {String(value)}
                                        </dd>
                                      </div>
                                    ))}
                                  </dl>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )
      })}
    </div>
  )
}
