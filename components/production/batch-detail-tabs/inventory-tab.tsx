'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Package, ArrowUpRight, ArrowDownRight, RefreshCw, DollarSign } from 'lucide-react'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
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

export type InventoryTransactionData = {
  id: string
  type: string
  quantity: number
  unit_abbreviation: string
  timestamp: string
  product_name: string
  product_sku: string | null
  cost_total: number | null
  activity_id: string | null
  phase_id: string | null
  phase_name: string | null
  user_name: string
  reason: string | null
}

type PhaseGroup = {
  id: string
  name: string
  sort_order: number
}

type Props = {
  phases: PhaseGroup[]
  transactions: InventoryTransactionData[]
}

// ---------- Helpers ----------

const typeLabels: Record<string, string> = {
  receipt: 'Recepción',
  consumption: 'Consumo',
  application: 'Aplicación',
  transfer_out: 'Transferencia salida',
  transfer_in: 'Transferencia entrada',
  transformation_out: 'Transformación salida',
  transformation_in: 'Transformación entrada',
  adjustment: 'Ajuste',
  waste: 'Desperdicio',
  return: 'Devolución',
  reservation: 'Reserva',
  release: 'Liberación',
}

const typeBadgeStyles: Record<string, string> = {
  receipt: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  consumption: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  application: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  transfer_out: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  transfer_in: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  transformation_out: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  transformation_in: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  adjustment: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  waste: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  return: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  reservation: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  release: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
}

const typeIcons: Record<string, typeof ArrowUpRight> = {
  receipt: ArrowDownRight,
  consumption: ArrowUpRight,
  application: ArrowUpRight,
  transfer_out: ArrowUpRight,
  transfer_in: ArrowDownRight,
  transformation_out: RefreshCw,
  transformation_in: RefreshCw,
  adjustment: RefreshCw,
  waste: ArrowUpRight,
  return: ArrowDownRight,
  reservation: Package,
  release: Package,
}

function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

// ---------- Component ----------

export function InventoryTab({ phases, transactions }: Props) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(() => {
    // Expand phases that have transactions
    const withTx = new Set<string>()
    for (const tx of transactions) {
      if (tx.phase_id) withTx.add(tx.phase_id)
    }
    if (transactions.some((tx) => !tx.phase_id)) withTx.add('no-phase')
    return withTx
  })

  // Group transactions by phase
  const txByPhase = useMemo(() => {
    const map = new Map<string, InventoryTransactionData[]>()

    // Initialize all phases
    for (const p of phases) {
      map.set(p.id, [])
    }
    // Add "sin fase" group
    map.set('no-phase', [])

    for (const tx of transactions) {
      const phaseId = tx.phase_id ?? 'no-phase'
      const list = map.get(phaseId)
      if (list) {
        list.push(tx)
      } else {
        const noPhaseList = map.get('no-phase')!
        noPhaseList.push(tx)
      }
    }

    // Sort each list by timestamp desc
    for (const list of map.values()) {
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    }

    return map
  }, [phases, transactions])

  // Calculate stats per phase
  const phaseStats = useMemo(() => {
    const stats = new Map<string, { count: number; totalCost: number }>()

    for (const [phaseId, phaseTx] of txByPhase) {
      stats.set(phaseId, {
        count: phaseTx.length,
        totalCost: phaseTx.reduce((sum, tx) => sum + (tx.cost_total ?? 0), 0),
      })
    }

    return stats
  }, [txByPhase])

  const togglePhase = (phaseId: string) => {
    const next = new Set(expandedPhases)
    if (next.has(phaseId)) {
      next.delete(phaseId)
    } else {
      next.add(phaseId)
    }
    setExpandedPhases(next)
  }

  // Total cost summary
  const totalCost = transactions.reduce((sum, tx) => sum + (tx.cost_total ?? 0), 0)

  // Build display phases
  const displayPhases = useMemo(() => {
    const result: Array<{ id: string; name: string; sort_order: number }> = []

    for (const p of phases) {
      result.push(p)
    }

    if ((txByPhase.get('no-phase')?.length ?? 0) > 0) {
      result.push({ id: 'no-phase', name: 'Sin fase asignada', sort_order: 9999 })
    }

    return result.sort((a, b) => a.sort_order - b.sort_order)
  }, [phases, txByPhase])

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <Package className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-3 text-lg font-medium">Sin transacciones de inventario</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No hay transacciones de inventario asociadas a este lote.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Transacciones</p>
              <p className="text-lg font-semibold">{transactions.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Costo total directo</p>
              <p className="text-lg font-semibold">{formatCurrency(totalCost)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Phase groups */}
      {displayPhases.map((phase) => {
        const phaseTx = txByPhase.get(phase.id) ?? []
        const stats = phaseStats.get(phase.id) ?? { count: 0, totalCost: 0 }

        if (stats.count === 0) return null

        const isExpanded = expandedPhases.has(phase.id)

        return (
          <Collapsible
            key={phase.id}
            open={isExpanded}
            onOpenChange={() => togglePhase(phase.id)}
          >
            <CollapsibleTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-md border bg-muted/50 px-4 py-3 text-left hover:bg-muted/80 transition-colors">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium">{phase.name}</span>
                <span className="text-sm text-muted-foreground">
                  — {stats.count} transacci{stats.count !== 1 ? 'ones' : 'ón'}
                </span>
                {stats.totalCost > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {formatCurrency(stats.totalCost)}
                  </Badge>
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead>Actividad</TableHead>
                      <TableHead>Usuario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {phaseTx.map((tx) => {
                      const TypeIcon = typeIcons[tx.type] ?? Package

                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="text-sm">
                            {formatDateTime(tx.timestamp)}
                          </TableCell>
                          <TableCell>
                            <Badge className={`gap-1 ${typeBadgeStyles[tx.type] ?? ''}`}>
                              <TypeIcon className="h-3 w-3" />
                              {typeLabels[tx.type] ?? tx.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{tx.product_name}</p>
                              {tx.product_sku && (
                                <p className="text-xs text-muted-foreground">{tx.product_sku}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatQuantity(tx.quantity)} {tx.unit_abbreviation}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(tx.cost_total)}
                          </TableCell>
                          <TableCell>
                            {tx.activity_id ? (
                              <Link
                                href={`?tab=activities`}
                                className="text-primary hover:underline text-sm"
                              >
                                Ver actividad
                              </Link>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{tx.user_name}</TableCell>
                        </TableRow>
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
