'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { LineageRecord } from '../batch-detail-client'

// ---------- Helpers ----------

const formatDateTime = (d: string) => {
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const fmtQty = (v: number | null) => {
  if (v == null) return '—'
  return Number(v).toLocaleString('es-CO')
}

// ---------- Types ----------

type Props = {
  lineage: LineageRecord[]
}

// ---------- Component ----------

export function GenealogyTab({ lineage }: Props) {
  const router = useRouter()

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold">Genealogía</h3>
      {lineage.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No hay historial de genealogía.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operación</TableHead>
                <TableHead>Batch origen</TableHead>
                <TableHead>Batch destino</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Razón</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineage.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {l.operation}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <button
                      className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                      onClick={() => router.push(`/production/batches/${l.parent_batch_id}`)}
                    >
                      {l.parent_batch_code}
                    </button>
                  </TableCell>
                  <TableCell>
                    <button
                      className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                      onClick={() => router.push(`/production/batches/${l.child_batch_id}`)}
                    >
                      {l.child_batch_code}
                    </button>
                  </TableCell>
                  <TableCell className="text-right text-sm">{fmtQty(l.quantity)}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{l.reason ?? '—'}</TableCell>
                  <TableCell className="text-sm">{formatDateTime(l.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
