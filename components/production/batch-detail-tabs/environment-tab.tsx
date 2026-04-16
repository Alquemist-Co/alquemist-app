'use client'

import { useState, useMemo } from 'react'
import { Thermometer, Droplets, Wind, Sun, Waves, FlaskConical, Activity, AlertTriangle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ---------- Types ----------

export type EnvironmentalReadingData = {
  id: string
  parameter: string
  value: number
  unit: string
  timestamp: string
}

type Props = {
  readings: EnvironmentalReadingData[]
  zoneName: string | null
  hasZone: boolean
}

type TimeRange = '24h' | '7d' | '30d'

// ---------- Helpers ----------

const parameterConfig: Record<string, {
  label: string
  icon: typeof Thermometer
  color: string
  decimals: number
}> = {
  temperature: { label: 'Temperatura', icon: Thermometer, color: 'text-red-500', decimals: 1 },
  humidity: { label: 'Humedad', icon: Droplets, color: 'text-blue-500', decimals: 1 },
  co2: { label: 'CO₂', icon: Wind, color: 'text-gray-500', decimals: 0 },
  light_ppfd: { label: 'Luz (PPFD)', icon: Sun, color: 'text-yellow-500', decimals: 0 },
  ec: { label: 'EC', icon: Waves, color: 'text-purple-500', decimals: 2 },
  ph: { label: 'pH', icon: FlaskConical, color: 'text-green-500', decimals: 2 },
  vpd: { label: 'VPD', icon: Activity, color: 'text-orange-500', decimals: 2 },
}

const timeRangeLabels: Record<TimeRange, string> = {
  '24h': '24 horas',
  '7d': '7 días',
  '30d': '30 días',
}

function getTimeRangeMs(range: TimeRange): number {
  switch (range) {
    case '24h': return 24 * 60 * 60 * 1000
    case '7d': return 7 * 24 * 60 * 60 * 1000
    case '30d': return 30 * 24 * 60 * 60 * 1000
  }
}

function formatValue(value: number, decimals: number): string {
  return value.toFixed(decimals)
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------- Component ----------

export function EnvironmentTab({ readings, zoneName, hasZone }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')

  // Filter readings by time range
  const filteredReadings = useMemo(() => {
    const cutoff = new Date()
    const rangeMs = getTimeRangeMs(timeRange)
    cutoff.setTime(cutoff.getTime() - rangeMs)
    const cutoffMs = cutoff.getTime()

    return readings.filter((r) => new Date(r.timestamp).getTime() >= cutoffMs)
  }, [readings, timeRange])

  // Group readings by parameter and calculate stats
  const parameterStats = useMemo(() => {
    const stats = new Map<string, {
      latest: { value: number; timestamp: string; unit: string } | null
      min: number
      max: number
      avg: number
      count: number
    }>()

    // Group by parameter
    const grouped = new Map<string, EnvironmentalReadingData[]>()
    for (const r of filteredReadings) {
      const list = grouped.get(r.parameter) ?? []
      list.push(r)
      grouped.set(r.parameter, list)
    }

    // Calculate stats for each parameter
    for (const [param, paramReadings] of grouped) {
      // Sort by timestamp desc to get latest
      const sorted = [...paramReadings].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      const values = paramReadings.map((r) => r.value)
      const min = Math.min(...values)
      const max = Math.max(...values)
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length

      stats.set(param, {
        latest: sorted[0] ? { value: sorted[0].value, timestamp: sorted[0].timestamp, unit: sorted[0].unit } : null,
        min,
        max,
        avg,
        count: paramReadings.length,
      })
    }

    return stats
  }, [filteredReadings])

  // Get all unique parameters from config order
  const parameters = Object.keys(parameterConfig).filter((p) => parameterStats.has(p))

  if (!hasZone) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-3 text-lg font-medium">Sin zona asignada</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Este lote no tiene una zona asignada. Los datos ambientales se obtienen de los sensores de la zona.
        </p>
      </div>
    )
  }

  if (readings.length === 0) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <Thermometer className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-3 text-lg font-medium">Sin datos ambientales</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No hay lecturas ambientales disponibles para la zona {zoneName}.
          {' '}Verifica que la zona tenga sensores configurados.
        </p>
      </div>
    )
  }

  if (parameters.length === 0) {
    return (
      <div className="space-y-4">
        {/* Time range selector */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Zona: <span className="font-medium">{zoneName}</span>
          </p>
          <div className="flex rounded-md border">
            {(['24h', '7d', '30d'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                } ${range === '24h' ? 'rounded-l-md' : ''} ${range === '30d' ? 'rounded-r-md' : ''}`}
              >
                {timeRangeLabels[range]}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-6 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-lg font-medium">Sin datos en este período</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No hay lecturas ambientales en las últimas {timeRangeLabels[timeRange]}.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with zone name and time range selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Zona: <span className="font-medium">{zoneName}</span>
        </p>
        <div className="flex rounded-md border">
          {(['24h', '7d', '30d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              } ${range === '24h' ? 'rounded-l-md' : ''} ${range === '30d' ? 'rounded-r-md' : ''}`}
            >
              {timeRangeLabels[range]}
            </button>
          ))}
        </div>
      </div>

      {/* Parameter cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {parameters.map((param) => {
          const config = parameterConfig[param]
          const stats = parameterStats.get(param)!
          const Icon = config.icon

          return (
            <Card key={param}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  {config.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Current value */}
                  {stats.latest && (
                    <div>
                      <p className="text-2xl font-bold">
                        {formatValue(stats.latest.value, config.decimals)}
                        <span className="ml-1 text-sm font-normal text-muted-foreground">
                          {stats.latest.unit}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(stats.latest.timestamp)}
                      </p>
                    </div>
                  )}

                  {/* Min/Max/Avg */}
                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Mín: </span>
                      <span className="font-medium">
                        {formatValue(stats.min, config.decimals)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Máx: </span>
                      <span className="font-medium">
                        {formatValue(stats.max, config.decimals)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Prom: </span>
                      <span className="font-medium">
                        {formatValue(stats.avg, config.decimals)}
                      </span>
                    </div>
                  </div>

                  {/* Reading count */}
                  <Badge variant="outline" className="text-xs">
                    {stats.count} lecturas
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
