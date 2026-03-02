'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { recipeSchema, type RecipeInput } from '@/schemas/recipes'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import type { Json } from '@/types/database'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

// ---------- Types ----------

export type RecipeRow = {
  id: string
  code: string
  name: string
  output_product_id: string
  output_product_name: string
  base_quantity: number
  base_unit_code: string
  base_unit_id: string
  items: RecipeItemData[]
  items_count: number
  is_active: boolean
  last_execution: string | null
}

export type RecipeItemData = {
  product_id: string
  quantity: number
  unit_id: string
}

export type RecipeExecutionRow = {
  id: string
  executed_by_name: string
  scale_factor: number
  output_quantity_expected: number
  output_quantity_actual: number | null
  yield_pct: number | null
  executed_at: string
}

export type ProductOption = { id: string; name: string; sku: string; default_unit_id: string | null }
export type UnitOption = { id: string; code: string; name: string }

export const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'

// ---------- Recipe Dialog ----------

export function RecipeDialog({
  open,
  onOpenChange,
  recipe,
  products,
  units,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipe: RecipeRow | null
  products: ProductOption[]
  units: UnitOption[]
  onSuccess: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const isEdit = !!recipe

  const form = useForm<RecipeInput>({
    resolver: zodResolver(recipeSchema),
    values: {
      code: recipe?.code ?? '',
      name: recipe?.name ?? '',
      output_product_id: recipe?.output_product_id ?? '',
      base_quantity: recipe?.base_quantity ?? ('' as unknown as number),
      base_unit_id: recipe?.base_unit_id ?? '',
      items: recipe?.items?.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_id: i.unit_id,
      })) ?? [{ product_id: '', quantity: '' as unknown as number, unit_id: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })

  async function onSubmit(values: RecipeInput) {
    setIsLoading(true)
    const supabase = createClient()

    const payload = {
      code: values.code,
      name: values.name,
      output_product_id: values.output_product_id,
      base_quantity: values.base_quantity,
      base_unit_id: values.base_unit_id,
      items: values.items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_id: i.unit_id,
      })) as unknown as Json,
    }

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('recipes')
          .update(payload)
          .eq('id', recipe.id)
        if (error) {
          if (error.message?.includes('idx_recipes_code_company')) {
            form.setError('code', { message: 'Ya existe una receta con este código' })
          } else {
            toast.error('Error al actualizar la receta.')
          }
          return
        }
        toast.success('Receta actualizada.')
      } else {
        const { error } = await supabase
          .from('recipes')
          .insert(payload)
        if (error) {
          if (error.message?.includes('idx_recipes_code_company')) {
            form.setError('code', { message: 'Ya existe una receta con este código' })
          } else {
            toast.error('Error al crear la receta.')
          }
          return
        }
        toast.success('Receta creada.')
      }
      onSuccess()
    } catch {
      toast.error('Error inesperado.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isLoading) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar receta' : 'Nueva receta'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifica la fórmula de la receta.' : 'Define una nueva receta o fórmula de producción.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl><Input placeholder="SOL-STOCK-A" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl><Input placeholder="Solución nutritiva Stock A" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="output_product_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Producto resultante</FormLabel>
                <FormControl>
                  <select value={field.value} onChange={field.onChange} className={selectClass}>
                    <option value="">— Seleccionar —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="base_quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad base</FormLabel>
                  <FormControl>
                    <Input
                      type="number" min="0" step="0.01" placeholder="1000"
                      value={field.value === ('' as unknown as number) ? '' : field.value}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="base_unit_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidad base</FormLabel>
                  <FormControl>
                    <select value={field.value} onChange={field.onChange} className={selectClass}>
                      <option value="">— Seleccionar —</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>{u.code} — {u.name}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Ingredients */}
            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Ingredientes</p>
                  <p className="text-xs text-muted-foreground">Productos necesarios para esta receta.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ product_id: '', quantity: '' as unknown as number, unit_id: '' })}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Agregar
                </Button>
              </div>
              {form.formState.errors.items?.root && (
                <p className="text-sm text-destructive">{form.formState.errors.items.root.message}</p>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs min-w-[160px]">Producto</TableHead>
                    <TableHead className="text-xs min-w-[80px]">Cantidad</TableHead>
                    <TableHead className="text-xs min-w-[100px]">Unidad</TableHead>
                    <TableHead className="text-xs w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, idx) => (
                    <TableRow key={field.id}>
                      <TableCell className="py-1.5">
                        <select
                          value={form.watch(`items.${idx}.product_id`)}
                          onChange={(e) => form.setValue(`items.${idx}.product_id`, e.target.value)}
                          className={selectClass + ' text-xs'}
                        >
                          <option value="">— Producto —</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                          ))}
                        </select>
                        {form.formState.errors.items?.[idx]?.product_id && (
                          <p className="text-xs text-destructive mt-0.5">{form.formState.errors.items[idx].product_id?.message}</p>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Input
                          type="number" min="0" step="0.01" className="h-8 text-xs"
                          value={form.watch(`items.${idx}.quantity`) === ('' as unknown as number) ? '' : form.watch(`items.${idx}.quantity`)}
                          onChange={(e) => form.setValue(`items.${idx}.quantity`, e.target.value ? parseFloat(e.target.value) : '' as unknown as number)}
                        />
                      </TableCell>
                      <TableCell className="py-1.5">
                        <select
                          value={form.watch(`items.${idx}.unit_id`)}
                          onChange={(e) => form.setValue(`items.${idx}.unit_id`, e.target.value)}
                          className={selectClass + ' text-xs'}
                        >
                          <option value="">— Und —</option>
                          {units.map((u) => (
                            <option key={u.id} value={u.id}>{u.code}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(idx)} disabled={fields.length === 1}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : isEdit ? 'Guardar receta' : 'Crear receta'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Execute Recipe Dialog ----------

export function ExecuteRecipeDialog({
  open,
  onOpenChange,
  recipe,
  products,
  units,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipe: RecipeRow | null
  products: ProductOption[]
  units: UnitOption[]
  onSuccess: () => void
}) {
  const [scaleFactor, setScaleFactor] = useState(1)
  const [actualQty, setActualQty] = useState<number | null>(null)
  const [executing, setExecuting] = useState(false)
  const [stockMap, setStockMap] = useState<Record<string, number>>({})

  // Load stock for ingredients
  useEffect(() => {
    if (!open || !recipe) return
    let cancelled = false
    const supabase = createClient()
    const productIds = recipe.items.map((i) => i.product_id)
    const uniqueIds = [...new Set(productIds)]

    Promise.all(
      uniqueIds.map(async (pid) => {
        const { data } = await supabase
          .from('inventory_items')
          .select('quantity_available')
          .eq('product_id', pid)
          .eq('lot_status', 'available')
        const total = (data ?? []).reduce((s, r) => s + Number(r.quantity_available), 0)
        return { pid, total }
      }),
    ).then((results) => {
      if (cancelled) return
      const map: Record<string, number> = {}
      for (const r of results) map[r.pid] = r.total
      setStockMap(map)
    })

    return () => { cancelled = true }
  }, [open, recipe])

  useEffect(() => {
    if (open) {
      setScaleFactor(1)
      setActualQty(null)
    }
  }, [open])

  if (!recipe) return null

  const scaledItems = recipe.items.map((item) => {
    const product = products.find((p) => p.id === item.product_id)
    const unit = units.find((u) => u.id === item.unit_id)
    const scaled = item.quantity * scaleFactor
    const available = stockMap[item.product_id] ?? 0
    return {
      ...item,
      product_name: product?.name ?? '',
      unit_code: unit?.code ?? '',
      scaled_quantity: scaled,
      available,
      sufficient: available >= scaled,
    }
  })

  const allSufficient = scaledItems.every((i) => i.sufficient)
  const outputExpected = recipe.base_quantity * scaleFactor

  async function handleExecute() {
    if (!recipe) return
    setExecuting(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/execute-recipe`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          recipe_id: recipe.id,
          scale_factor: scaleFactor,
          output_quantity_actual: actualQty,
        }),
      },
    )

    const result = await response.json()
    if (!response.ok) {
      toast.error(result.error || 'Error al ejecutar la receta.')
    } else {
      toast.success(`Receta ejecutada. Rendimiento: ${result.yield_pct}%`)
      onSuccess()
    }
    setExecuting(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!executing) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ejecutar receta</DialogTitle>
          <DialogDescription>{recipe.name} — {recipe.code}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Producto resultante:</span>{' '}
            <span className="font-medium">{recipe.output_product_name}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Factor de escala</label>
              <Input
                type="number" min="0.01" step="0.01" value={scaleFactor}
                onChange={(e) => setScaleFactor(e.target.value ? parseFloat(e.target.value) : 1)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Producción esperada</label>
              <div className="flex items-center h-9 text-sm font-medium">
                {outputExpected.toLocaleString('es-CO')} {recipe.base_unit_code}
              </div>
            </div>
          </div>

          {/* Scaled ingredients */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Ingrediente</TableHead>
                  <TableHead className="text-xs text-right">Cantidad</TableHead>
                  <TableHead className="text-xs">Und</TableHead>
                  <TableHead className="text-xs text-right">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scaledItems.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-xs">{item.product_name}</TableCell>
                    <TableCell className="text-xs text-right">{item.scaled_quantity.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-xs">{item.unit_code}</TableCell>
                    <TableCell className="text-xs text-right">
                      <Badge variant="secondary" className={`text-xs ${item.sufficient ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {item.available.toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!allSufficient && (
            <div className="text-sm text-red-600 bg-red-50 rounded-md p-2">
              Stock insuficiente para uno o más ingredientes.
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Cantidad real producida (opt)</label>
            <Input
              type="number" min="0" step="0.01" placeholder={String(outputExpected)}
              value={actualQty ?? ''}
              onChange={(e) => setActualQty(e.target.value ? parseFloat(e.target.value) : null)}
            />
            <p className="text-xs text-muted-foreground">Dejar vacío para usar la cantidad esperada.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={executing}>
            Cancelar
          </Button>
          <Button onClick={handleExecute} disabled={executing || !allSufficient}>
            {executing ? 'Ejecutando...' : 'Ejecutar receta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Execution History Panel ----------

export function ExecutionHistoryDialog({
  open,
  onOpenChange,
  recipe,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipe: RecipeRow | null
}) {
  const [executions, setExecutions] = useState<RecipeExecutionRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !recipe) return
    setLoading(true)
    const supabase = createClient()
    supabase
      .from('recipe_executions')
      .select('id, scale_factor, output_quantity_expected, output_quantity_actual, yield_pct, executed_at, user:users!recipe_executions_executed_by_fkey(full_name)')
      .eq('recipe_id', recipe.id)
      .order('executed_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setExecutions(
          (data ?? []).map((e) => ({
            id: e.id,
            executed_by_name: (e.user as { full_name: string } | null)?.full_name ?? '',
            scale_factor: Number(e.scale_factor),
            output_quantity_expected: Number(e.output_quantity_expected),
            output_quantity_actual: e.output_quantity_actual ? Number(e.output_quantity_actual) : null,
            yield_pct: e.yield_pct ? Number(e.yield_pct) : null,
            executed_at: e.executed_at,
          })),
        )
        setLoading(false)
      })
  }, [open, recipe])

  if (!recipe) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Historial de ejecuciones</DialogTitle>
          <DialogDescription>{recipe.name} — {recipe.code}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Cargando...</p>
        ) : executions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sin ejecuciones registradas.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Fecha</TableHead>
                <TableHead className="text-xs">Ejecutado por</TableHead>
                <TableHead className="text-xs text-right">Factor</TableHead>
                <TableHead className="text-xs text-right">Esperado</TableHead>
                <TableHead className="text-xs text-right">Real</TableHead>
                <TableHead className="text-xs text-right">Rend. %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">
                    {new Date(e.executed_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-xs">{e.executed_by_name}</TableCell>
                  <TableCell className="text-xs text-right">{e.scale_factor}x</TableCell>
                  <TableCell className="text-xs text-right">{e.output_quantity_expected}</TableCell>
                  <TableCell className="text-xs text-right">{e.output_quantity_actual ?? '—'}</TableCell>
                  <TableCell className="text-xs text-right">
                    {e.yield_pct != null ? (
                      <Badge variant="secondary" className={`text-xs ${e.yield_pct >= 95 ? 'bg-green-100 text-green-700' : e.yield_pct >= 80 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {e.yield_pct}%
                      </Badge>
                    ) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ---------- Deactivate Confirmation ----------

export function DeactivateRecipeDialog({
  open,
  onOpenChange,
  recipe,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipe: RecipeRow | null
  onSuccess: () => void
}) {
  async function handleToggle() {
    if (!recipe) return
    const supabase = createClient()
    const { error } = await supabase
      .from('recipes')
      .update({ is_active: !recipe.is_active })
      .eq('id', recipe.id)
    if (error) {
      toast.error('Error al cambiar el estado.')
    } else {
      toast.success(recipe.is_active ? 'Receta desactivada.' : 'Receta reactivada.')
      onSuccess()
    }
  }

  if (!recipe) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{recipe.is_active ? 'Desactivar receta' : 'Reactivar receta'}</AlertDialogTitle>
          <AlertDialogDescription>
            {recipe.is_active
              ? `¿Desactivar la receta "${recipe.name}"? No se podrá ejecutar mientras esté inactiva.`
              : `¿Reactivar la receta "${recipe.name}"?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleToggle}>
            {recipe.is_active ? 'Desactivar' : 'Reactivar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
