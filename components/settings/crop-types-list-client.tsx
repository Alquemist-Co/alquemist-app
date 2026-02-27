'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Pencil, Power, Sprout } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import {
  type CropTypeRow,
  categoryLabels,
  categoryBadgeStyles,
  CropTypeDialog,
} from './crop-types-shared'

type Props = {
  cropTypes: CropTypeRow[]
  canWrite: boolean
}

export function CropTypesListClient({ cropTypes, canWrite }: Props) {
  const router = useRouter()
  const [showInactive, setShowInactive] = useState(false)
  const [ctDialogOpen, setCtDialogOpen] = useState(false)
  const [editingCt, setEditingCt] = useState<CropTypeRow | null>(null)
  const [deactivatingCt, setDeactivatingCt] = useState<CropTypeRow | null>(null)

  const filtered = showInactive ? cropTypes : cropTypes.filter((ct) => ct.is_active)

  function openNewCt() {
    setEditingCt(null)
    setCtDialogOpen(true)
  }

  function openEditCt(ct: CropTypeRow) {
    setEditingCt(ct)
    setCtDialogOpen(true)
  }

  async function handleToggleCt(ct: CropTypeRow) {
    const supabase = createClient()
    const { error } = await supabase
      .from('crop_types')
      .update({ is_active: !ct.is_active })
      .eq('id', ct.id)
    if (error) {
      toast.error('Error al cambiar el estado.')
      return
    }
    toast.success(ct.is_active ? 'Tipo de cultivo desactivado.' : 'Tipo de cultivo reactivado.')
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={showInactive} onCheckedChange={(v) => setShowInactive(!!v)} />
          Inactivos
        </label>
        {canWrite && (
          <Button size="sm" onClick={openNewCt}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo tipo
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Sprout className="mb-3 h-10 w-10" />
            <p className="text-sm text-center">Crea tu primer tipo de cultivo para comenzar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((ct) => (
            <Card
              key={ct.id}
              className={`cursor-pointer transition-colors hover:border-muted-foreground/30 ${!ct.is_active ? 'opacity-50' : ''}`}
              onClick={() => router.push(`/settings/crop-types/${ct.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {ct.icon && <span className="text-base">{ct.icon}</span>}
                      <span className="truncate font-medium text-sm">{ct.name}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{ct.code}</span>
                      <span>·</span>
                      <span>{ct.phase_count} fases</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${categoryBadgeStyles[ct.category] ?? ''}`}
                    >
                      {categoryLabels[ct.category] ?? ct.category}
                    </Badge>
                    {!ct.is_active && (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-xs">
                        Inactivo
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Inline actions */}
                {canWrite && (
                  <div className="mt-2 flex gap-1 border-t pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => { e.stopPropagation(); openEditCt(ct) }}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (ct.is_active && ct.phase_count > 0) {
                          setDeactivatingCt(ct)
                        } else {
                          handleToggleCt(ct)
                        }
                      }}
                    >
                      <Power className="mr-1 h-3 w-3" />
                      {ct.is_active ? 'Desactivar' : 'Reactivar'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Crop Type Dialog */}
      <CropTypeDialog
        open={ctDialogOpen}
        onOpenChange={(o) => { if (!o) { setCtDialogOpen(false); setEditingCt(null) } else setCtDialogOpen(true) }}
        cropType={editingCt}
        onSuccess={(newId) => {
          setCtDialogOpen(false)
          setEditingCt(null)
          if (newId) {
            router.push(`/settings/crop-types/${newId}`)
          }
          router.refresh()
        }}
      />

      {/* Deactivate warning */}
      <AlertDialog open={!!deactivatingCt} onOpenChange={(o) => !o && setDeactivatingCt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar tipo de cultivo</AlertDialogTitle>
            <AlertDialogDescription>
              Este tipo de cultivo tiene {deactivatingCt?.phase_count ?? 0} fases configuradas. Desactivarlo impedirá crear nuevas órdenes con sus cultivares. ¿Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deactivatingCt) handleToggleCt(deactivatingCt); setDeactivatingCt(null) }}>
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
