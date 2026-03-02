'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  resourceCategorySchema,
  type ResourceCategoryInput,
  unitOfMeasureSchema,
  type UnitOfMeasureInput,
  activityTypeSchema,
  type ActivityTypeInput,
} from '@/schemas/catalog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Power,
  Trash2,
  Package,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

// ---------- Types ----------

type CategoryRow = {
  id: string
  parent_id: string | null
  code: string
  name: string
  icon: string | null
  color: string | null
  is_consumable: boolean
  is_depreciable: boolean
  is_transformable: boolean
  default_lot_tracking: string
  is_active: boolean
}

type UnitRow = {
  id: string
  code: string
  name: string
  dimension: string
  base_unit_id: string | null
  to_base_factor: number
}

type ActivityTypeRow = {
  id: string
  name: string
  category: string | null
  is_active: boolean
}

type Props = {
  categories: CategoryRow[]
  units: UnitRow[]
  activityTypes: ActivityTypeRow[]
  canWrite: boolean
  activeTab: string
}

// ---------- Constants ----------

const lotTrackingLabels: Record<string, string> = {
  required: 'Requerido',
  optional: 'Opcional',
  none: 'Ninguno',
}

const dimensionLabels: Record<string, string> = {
  mass: 'Masa',
  volume: 'Volumen',
  count: 'Conteo',
  area: 'Área',
  energy: 'Energía',
  time: 'Tiempo',
  concentration: 'Concentración',
}

const dimensionOrder = ['mass', 'volume', 'count', 'area', 'energy', 'time', 'concentration']

// ================================================================
// MAIN COMPONENT
// ================================================================

export function CatalogClient({ categories, units, activityTypes, canWrite, activeTab }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.push(`/settings/catalog?${params.toString()}`)
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="categories">Categorías de Recursos</TabsTrigger>
        <TabsTrigger value="units">Unidades de Medida</TabsTrigger>
        <TabsTrigger value="activity-types">Tipos de Actividad</TabsTrigger>
      </TabsList>

      <TabsContent value="categories">
        <CategoriesTab categories={categories} canWrite={canWrite} />
      </TabsContent>
      <TabsContent value="units">
        <UnitsTab units={units} canWrite={canWrite} />
      </TabsContent>
      <TabsContent value="activity-types">
        <ActivityTypesTab activityTypes={activityTypes} canWrite={canWrite} />
      </TabsContent>
    </Tabs>
  )
}

// ================================================================
// CATEGORIES TAB
// ================================================================

type TreeNode = CategoryRow & { depth: number; hasChildren: boolean }

function buildTree(categories: CategoryRow[], showInactive: boolean): TreeNode[] {
  const filtered = showInactive ? categories : categories.filter((c) => c.is_active)
  const childrenMap = new Map<string | null, CategoryRow[]>()
  for (const cat of filtered) {
    const key = cat.parent_id
    if (!childrenMap.has(key)) childrenMap.set(key, [])
    childrenMap.get(key)!.push(cat)
  }

  const result: TreeNode[] = []
  function walk(parentId: string | null, depth: number) {
    const children = childrenMap.get(parentId) ?? []
    for (const child of children) {
      const hasChildren = (childrenMap.get(child.id) ?? []).length > 0
      result.push({ ...child, depth, hasChildren })
      walk(child.id, depth + 1)
    }
  }
  walk(null, 0)
  return result
}

function CategoriesTab({ categories, canWrite }: { categories: CategoryRow[]; canWrite: boolean }) {
  const router = useRouter()
  const [showInactive, setShowInactive] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null)
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null)
  const [deactivating, setDeactivating] = useState<CategoryRow | null>(null)

  const tree = useMemo(() => buildTree(categories, showInactive), [categories, showInactive])

  // Determine visible nodes (respect expanded state)
  const visibleNodes = useMemo(() => {
    const visible: TreeNode[] = []
    const collapsedAncestors = new Set<string>()
    for (const node of tree) {
      // Check if any ancestor is collapsed
      if (node.parent_id && collapsedAncestors.has(node.parent_id)) {
        collapsedAncestors.add(node.id)
        continue
      }
      visible.push(node)
      if (node.hasChildren && !expanded.has(node.id)) {
        collapsedAncestors.add(node.id)
      }
    }
    return visible
  }, [tree, expanded])

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openNew(parentId: string | null) {
    setEditingCategory(null)
    setParentIdForNew(parentId)
    setDialogOpen(true)
  }

  function openEdit(cat: CategoryRow) {
    setEditingCategory(cat)
    setParentIdForNew(null)
    setDialogOpen(true)
  }

  // Count active children for deactivation warning
  function countActiveChildren(parentId: string) {
    return categories.filter((c) => c.parent_id === parentId && c.is_active).length
  }

  async function handleToggleActive(cat: CategoryRow) {
    const supabase = createClient()
    const { error } = await supabase
      .from('resource_categories')
      .update({ is_active: !cat.is_active })
      .eq('id', cat.id)

    if (error) {
      toast.error('Error al cambiar el estado.')
      return
    }
    toast.success(cat.is_active ? 'Categoría desactivada.' : 'Categoría reactivada.')
    router.refresh()
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={showInactive}
            onCheckedChange={(v) => setShowInactive(!!v)}
          />
          Mostrar inactivos
        </label>
        {canWrite && (
          <Button size="sm" onClick={() => openNew(null)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nueva categoría
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {visibleNodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Package className="mb-3 h-10 w-10" />
              <p className="text-sm">No hay categorías configuradas. Crea la primera.</p>
            </div>
          ) : (
            <div className="divide-y">
              {visibleNodes.map((node) => (
                <div
                  key={node.id}
                  className={`flex items-center gap-2 px-4 py-2.5 ${!node.is_active ? 'opacity-50' : ''}`}
                  style={{ paddingLeft: `${16 + node.depth * 24}px` }}
                >
                  {/* Expand/collapse */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(node.id)}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                  >
                    {node.hasChildren ? (
                      expanded.has(node.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )
                    ) : (
                      <span className="h-4 w-4" />
                    )}
                  </button>

                  {/* Color dot */}
                  {node.color && (
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: node.color }}
                    />
                  )}

                  {/* Name + Code */}
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate font-medium text-sm">{node.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{node.code}</span>
                  </div>

                  {/* Flag badges */}
                  <div className="hidden items-center gap-1 sm:flex">
                    {node.is_consumable && (
                      <Badge variant="outline" className="text-xs">Consumible</Badge>
                    )}
                    {node.is_depreciable && (
                      <Badge variant="outline" className="text-xs">Depreciable</Badge>
                    )}
                    {node.is_transformable && (
                      <Badge variant="outline" className="text-xs">Transformable</Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {lotTrackingLabels[node.default_lot_tracking] ?? node.default_lot_tracking}
                    </Badge>
                    {!node.is_active && (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-xs">Inactivo</Badge>
                    )}
                  </div>

                  {/* Actions */}
                  {canWrite && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(node)}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openNew(node.id)}
                        title="Agregar subcategoría"
                      >
                        <FolderPlus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          if (node.is_active && countActiveChildren(node.id) > 0) {
                            setDeactivating(node)
                          } else {
                            handleToggleActive(node)
                          }
                        }}
                        title={node.is_active ? 'Desactivar' : 'Reactivar'}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <CategoryDialog
        open={dialogOpen}
        onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditingCategory(null) } else setDialogOpen(true) }}
        category={editingCategory}
        parentId={editingCategory?.parent_id ?? parentIdForNew}
        categories={categories}
        onSuccess={() => { setDialogOpen(false); setEditingCategory(null); router.refresh() }}
      />

      {/* Deactivate with children warning */}
      <AlertDialog open={!!deactivating} onOpenChange={(o) => !o && setDeactivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar categoría</AlertDialogTitle>
            <AlertDialogDescription>
              Esta categoría tiene {deactivating ? countActiveChildren(deactivating.id) : 0} subcategorías activas. Desactivarla no afectará las subcategorías. ¿Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deactivating) handleToggleActive(deactivating); setDeactivating(null) }}>
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------- Category Dialog ----------

function CategoryDialog({
  open,
  onOpenChange,
  category,
  parentId,
  categories,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: CategoryRow | null
  parentId: string | null
  categories: CategoryRow[]
  onSuccess: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const isEdit = !!category

  const form = useForm<ResourceCategoryInput>({
    resolver: zodResolver(resourceCategorySchema),
    values: {
      parent_id: isEdit ? category.parent_id : parentId,
      code: category?.code ?? '',
      name: category?.name ?? '',
      icon: category?.icon ?? '',
      color: category?.color ?? '',
      is_consumable: category?.is_consumable ?? false,
      is_depreciable: category?.is_depreciable ?? false,
      is_transformable: category?.is_transformable ?? false,
      default_lot_tracking: (category?.default_lot_tracking as ResourceCategoryInput['default_lot_tracking']) ?? 'none',
    },
  })

  async function onSubmit(values: ResourceCategoryInput) {
    setIsLoading(true)
    const supabase = createClient()

    const payload = {
      parent_id: values.parent_id ?? null,
      code: values.code,
      name: values.name,
      icon: values.icon || null,
      color: values.color || null,
      is_consumable: values.is_consumable,
      is_depreciable: values.is_depreciable,
      is_transformable: values.is_transformable,
      default_lot_tracking: values.default_lot_tracking,
    }

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('resource_categories')
          .update(payload)
          .eq('id', category.id)
        if (error) {
          if (error.message?.includes('idx_resource_categories_code_company')) {
            form.setError('code', { message: 'Ya existe una categoría con este código' })
          } else {
            toast.error('Error al actualizar la categoría.')
          }
          return
        }
        toast.success('Categoría actualizada.')
      } else {
        const { error } = await supabase
          .from('resource_categories')
          .insert(payload)
        if (error) {
          if (error.message?.includes('idx_resource_categories_code_company')) {
            form.setError('code', { message: 'Ya existe una categoría con este código' })
          } else {
            toast.error('Error al crear la categoría.')
          }
          return
        }
        toast.success('Categoría creada.')
      }
      onSuccess()
    } catch {
      toast.error('Error inesperado. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  // Build parent options (exclude self and descendants for edit)
  const parentOptions = useMemo(() => {
    if (!isEdit) return categories.filter((c) => c.is_active)

    // Exclude self and all descendants
    const excluded = new Set<string>([category.id])
    let changed = true
    while (changed) {
      changed = false
      for (const c of categories) {
        if (c.parent_id && excluded.has(c.parent_id) && !excluded.has(c.id)) {
          excluded.add(c.id)
          changed = true
        }
      }
    }
    return categories.filter((c) => c.is_active && !excluded.has(c.id))
  }, [categories, category, isEdit])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isLoading) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifica los datos de la categoría.' : 'Crea una nueva categoría de recursos.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría padre</FormLabel>
                  <FormControl>
                    <select
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">— Raíz (sin padre) —</option>
                      {parentOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="NUTRIENT"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nutrientes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icono (opt)</FormLabel>
                    <FormControl>
                      <Input placeholder="🧪" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color (opt)</FormLabel>
                    <FormControl>
                      <Input type="color" {...field} value={field.value || '#000000'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="is_consumable"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-2 space-y-0">
                    <FormLabel className="font-normal">Es consumible — se agota con el uso</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_depreciable"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-2 space-y-0">
                    <FormLabel className="font-normal">Es depreciable — equipos con vida útil</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_transformable"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-2 space-y-0">
                    <FormLabel className="font-normal">Es transformable — cambia de estado</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="default_lot_tracking"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tracking de lotes</FormLabel>
                  <FormControl>
                    <select
                      value={field.value}
                      onChange={field.onChange}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="none">Ninguno</option>
                      <option value="optional">Opcional</option>
                      <option value="required">Requerido</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ================================================================
// UNITS TAB
// ================================================================

function UnitsTab({ units, canWrite }: { units: UnitRow[]; canWrite: boolean }) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<UnitRow | null>(null)
  const [deletingUnit, setDeletingUnit] = useState<UnitRow | null>(null)

  // Group units by dimension
  const grouped = useMemo(() => {
    const map = new Map<string, UnitRow[]>()
    for (const dim of dimensionOrder) {
      const dimUnits = units.filter((u) => u.dimension === dim)
      if (dimUnits.length > 0) map.set(dim, dimUnits)
    }
    return map
  }, [units])

  function openNew() {
    setEditingUnit(null)
    setDialogOpen(true)
  }

  function openEdit(unit: UnitRow) {
    setEditingUnit(unit)
    setDialogOpen(true)
  }

  async function handleDelete(unit: UnitRow) {
    const supabase = createClient()

    // Check if it's a base unit with dependents
    if (!unit.base_unit_id) {
      const dependents = units.filter((u) => u.base_unit_id === unit.id)
      if (dependents.length > 0) {
        toast.error('No se puede eliminar: otras unidades dependen de esta como base.')
        return
      }
    }

    const { error } = await supabase
      .from('units_of_measure')
      .delete()
      .eq('id', unit.id)

    if (error) {
      if (error.message?.includes('foreign key') || error.message?.includes('violates')) {
        toast.error('No se puede eliminar: esta unidad está en uso.')
      } else {
        toast.error('Error al eliminar la unidad.')
      }
      return
    }
    toast.success('Unidad eliminada.')
    setDeletingUnit(null)
    router.refresh()
  }

  // Find base unit name for display
  function getBaseUnitName(baseUnitId: string | null) {
    if (!baseUnitId) return null
    const base = units.find((u) => u.id === baseUnitId)
    return base ? `${base.name} (${base.code})` : null
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-end">
        {canWrite && (
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nueva unidad
          </Button>
        )}
      </div>

      {grouped.size === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package className="mb-3 h-10 w-10" />
            <p className="text-sm">No hay unidades configuradas. Crea la primera.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([dim, dimUnits]) => (
            <Card key={dim}>
              <CardContent className="p-0">
                <div className="border-b px-4 py-2.5">
                  <h3 className="text-sm font-semibold">{dimensionLabels[dim] ?? dim}</h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Unidad base</TableHead>
                      <TableHead>Factor</TableHead>
                      {canWrite && <TableHead className="w-[80px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dimUnits.map((unit) => {
                      const isBase = !unit.base_unit_id
                      return (
                        <TableRow key={unit.id}>
                          <TableCell className="font-mono text-sm">{unit.code}</TableCell>
                          <TableCell>
                            {unit.name}
                            {isBase && (
                              <Badge variant="secondary" className="ml-2 text-xs">Base</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {isBase ? '—' : getBaseUnitName(unit.base_unit_id) ?? '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {isBase ? '1' : `×${unit.to_base_factor}`}
                          </TableCell>
                          {canWrite && (
                            <TableCell>
                              <div className="flex gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openEdit(unit)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setDeletingUnit(unit)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Unit Dialog */}
      <UnitDialog
        open={dialogOpen}
        onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditingUnit(null) } else setDialogOpen(true) }}
        unit={editingUnit}
        allUnits={units}
        onSuccess={() => { setDialogOpen(false); setEditingUnit(null); router.refresh() }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingUnit} onOpenChange={(o) => !o && setDeletingUnit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar unidad</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la unidad &quot;{deletingUnit?.name}&quot;? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingUnit && handleDelete(deletingUnit)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------- Unit Dialog ----------

function UnitDialog({
  open,
  onOpenChange,
  unit,
  allUnits,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  unit: UnitRow | null
  allUnits: UnitRow[]
  onSuccess: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const isEdit = !!unit

  const form = useForm<UnitOfMeasureInput>({
    resolver: zodResolver(unitOfMeasureSchema),
    values: {
      code: unit?.code ?? '',
      name: unit?.name ?? '',
      dimension: (unit?.dimension as UnitOfMeasureInput['dimension']) ?? 'mass',
      base_unit_id: unit?.base_unit_id ?? null,
      to_base_factor: unit?.to_base_factor ?? 1,
    },
  })

  const watchedDimension = form.watch('dimension')

  // Units in the same dimension (for base_unit_id select)
  const sameDimensionUnits = useMemo(() => {
    const filtered = allUnits.filter((u) => u.dimension === watchedDimension)
    if (isEdit) return filtered.filter((u) => u.id !== unit.id)
    return filtered
  }, [allUnits, watchedDimension, isEdit, unit])

  // Find existing base unit for the dimension
  const existingBaseUnit = useMemo(
    () => sameDimensionUnits.find((u) => !u.base_unit_id),
    [sameDimensionUnits]
  )

  const isFirstInDimension = sameDimensionUnits.length === 0

  async function onSubmit(values: UnitOfMeasureInput) {
    setIsLoading(true)
    const supabase = createClient()

    const payload = {
      code: values.code,
      name: values.name,
      dimension: values.dimension,
      base_unit_id: isFirstInDimension ? null : (values.base_unit_id ?? existingBaseUnit?.id ?? null),
      to_base_factor: isFirstInDimension ? 1 : values.to_base_factor,
    }

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('units_of_measure')
          .update(payload)
          .eq('id', unit.id)
        if (error) {
          if (error.message?.includes('idx_units_of_measure_code_company')) {
            form.setError('code', { message: 'Ya existe una unidad con este código' })
          } else {
            toast.error('Error al actualizar la unidad.')
          }
          return
        }
        toast.success('Unidad actualizada.')
      } else {
        const { error } = await supabase
          .from('units_of_measure')
          .insert(payload)
        if (error) {
          if (error.message?.includes('idx_units_of_measure_code_company')) {
            form.setError('code', { message: 'Ya existe una unidad con este código' })
          } else {
            toast.error('Error al crear la unidad.')
          }
          return
        }
        toast.success('Unidad creada.')
      }
      onSuccess()
    } catch {
      toast.error('Error inesperado. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isLoading) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar unidad' : 'Nueva unidad'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifica los datos de la unidad de medida.' : 'Crea una nueva unidad de medida.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="dimension"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dimensión</FormLabel>
                  <FormControl>
                    <select
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isEdit}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    >
                      {dimensionOrder.map((d) => (
                        <option key={d} value={d}>
                          {dimensionLabels[d]}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="kg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Kilogramo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isFirstInDimension ? (
              <p className="text-sm text-muted-foreground">
                Esta será la unidad base de la dimensión (factor = 1).
              </p>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="base_unit_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidad base</FormLabel>
                      <FormControl>
                        <select
                          value={field.value ?? existingBaseUnit?.id ?? ''}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {sameDimensionUnits
                            .filter((u) => !u.base_unit_id)
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.code})
                              </option>
                            ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="to_base_factor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Factor de conversión a base</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="0.0001"
                          placeholder="1000"
                          value={field.value}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ================================================================
// ACTIVITY TYPES TAB
// ================================================================

function ActivityTypesTab({
  activityTypes,
  canWrite,
}: {
  activityTypes: ActivityTypeRow[]
  canWrite: boolean
}) {
  const router = useRouter()
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<ActivityTypeRow | null>(null)

  const filtered = showInactive ? activityTypes : activityTypes.filter((t) => t.is_active)

  async function handleToggleActive(at: ActivityTypeRow) {
    const supabase = createClient()
    const { error } = await supabase
      .from('activity_types')
      .update({ is_active: !at.is_active })
      .eq('id', at.id)

    if (error) {
      toast.error('Error al cambiar el estado.')
      return
    }
    toast.success(at.is_active ? 'Tipo desactivado.' : 'Tipo reactivado.')
    router.refresh()
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={showInactive}
            onCheckedChange={(v) => setShowInactive(!!v)}
          />
          Mostrar inactivos
        </label>
        {canWrite && (
          <Button size="sm" onClick={() => { setEditingType(null); setDialogOpen(true) }}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo tipo
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package className="mb-3 h-10 w-10" />
            <p className="text-sm">No hay tipos de actividad configurados. Crea el primero.</p>
          </div>
        ) : (
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                  {canWrite && <TableHead className="w-[80px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((at) => (
                  <TableRow key={at.id} className={!at.is_active ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{at.name}</TableCell>
                    <TableCell className="text-muted-foreground">{at.category || '—'}</TableCell>
                    <TableCell>
                      {at.is_active ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-xs">
                          Inactivo
                        </Badge>
                      )}
                    </TableCell>
                    {canWrite && (
                      <TableCell>
                        <div className="flex gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { setEditingType(at); setDialogOpen(true) }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleToggleActive(at)}
                            title={at.is_active ? 'Desactivar' : 'Reactivar'}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
          </Table>
        )}
      </div>

      {/* Activity Type Dialog */}
      <ActivityTypeDialog
        open={dialogOpen}
        onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditingType(null) } else setDialogOpen(true) }}
        activityType={editingType}
        onSuccess={() => { setDialogOpen(false); setEditingType(null); router.refresh() }}
      />
    </div>
  )
}

// ---------- Activity Type Dialog ----------

function ActivityTypeDialog({
  open,
  onOpenChange,
  activityType,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  activityType: ActivityTypeRow | null
  onSuccess: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const isEdit = !!activityType

  const form = useForm<ActivityTypeInput>({
    resolver: zodResolver(activityTypeSchema),
    values: {
      name: activityType?.name ?? '',
      category: activityType?.category ?? '',
    },
  })

  async function onSubmit(values: ActivityTypeInput) {
    setIsLoading(true)
    const supabase = createClient()

    const payload = {
      name: values.name,
      category: values.category || null,
    }

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('activity_types')
          .update(payload)
          .eq('id', activityType.id)
        if (error) {
          toast.error('Error al actualizar el tipo.')
          return
        }
        toast.success('Tipo actualizado.')
      } else {
        const { error } = await supabase
          .from('activity_types')
          .insert(payload)
        if (error) {
          toast.error('Error al crear el tipo.')
          return
        }
        toast.success('Tipo creado.')
      }
      onSuccess()
    } catch {
      toast.error('Error inesperado. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isLoading) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar tipo de actividad' : 'Nuevo tipo de actividad'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifica los datos del tipo de actividad.' : 'Crea un nuevo tipo de actividad.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Fertirrigación" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Nutrición" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
