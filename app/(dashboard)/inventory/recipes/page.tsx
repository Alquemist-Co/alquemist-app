import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RecipesListClient } from '@/components/inventory/recipes-list-client'
import type { RecipeItemData } from '@/components/inventory/recipes-shared'

const PAGE_SIZE = 20

type SearchParams = Promise<{
  status?: string
  search?: string
  page?: string
}>

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', authUser.id)
    .single()

  if (!currentUser) redirect('/login')

  const canWrite = ['admin', 'manager'].includes(currentUser.role)
  const canExecute = ['admin', 'manager', 'supervisor'].includes(currentUser.role)

  // Build recipes query
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('recipes')
    .select(
      '*, output_product:products(name, sku), base_unit:units_of_measure(code)',
      { count: 'exact' },
    )

  if (params.status === 'active') {
    query = query.eq('is_active', true)
  } else if (params.status === 'inactive') {
    query = query.eq('is_active', false)
  }

  if (params.search?.trim()) {
    const term = `%${params.search.trim()}%`
    query = query.or(`name.ilike.${term},code.ilike.${term}`)
  }

  const { data: recipes, count } = await query
    .range(offset, offset + PAGE_SIZE - 1)
    .order('name')

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // Fetch last execution date per recipe
  const recipeIds = (recipes ?? []).map((r) => r.id)
  let lastExecMap: Record<string, string> = {}
  if (recipeIds.length > 0) {
    const { data: execData } = await supabase
      .from('recipe_executions')
      .select('recipe_id, executed_at')
      .in('recipe_id', recipeIds)
      .order('executed_at', { ascending: false })
    if (execData) {
      for (const e of execData) {
        if (!lastExecMap[e.recipe_id]) {
          lastExecMap[e.recipe_id] = e.executed_at
        }
      }
    }
  }

  // Reference data
  const [productsRes, unitsRes] = await Promise.all([
    supabase.from('products').select('id, name, sku, default_unit_id').eq('is_active', true).order('name'),
    supabase.from('units_of_measure').select('id, code, name').order('code'),
  ])

  const recipesData = (recipes ?? []).map((r) => {
    const outputProduct = r.output_product as { name: string; sku: string } | null
    const baseUnit = r.base_unit as { code: string } | null
    const items = (r.items as RecipeItemData[] | null) ?? []
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      output_product_id: r.output_product_id,
      output_product_name: outputProduct?.name ?? '',
      base_quantity: Number(r.base_quantity),
      base_unit_code: baseUnit?.code ?? '',
      base_unit_id: r.base_unit_id,
      items,
      items_count: items.length,
      is_active: r.is_active,
      last_execution: lastExecMap[r.id] ?? null,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Recetas / Fórmulas</h2>
        <p className="text-sm text-muted-foreground">
          Gestiona recetas de producción y fórmulas de mezcla.
        </p>
      </div>

      <RecipesListClient
        recipes={recipesData}
        products={(productsRes.data ?? []).map((p) => ({ ...p, shelf_life_days: null }))}
        units={unitsRes.data ?? []}
        canWrite={canWrite}
        canExecute={canExecute}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        currentPage={page}
        filters={{
          status: params.status || '',
          search: params.search || '',
        }}
      />
    </div>
  )
}
