import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductsListClient } from '@/components/inventory/products-list-client'

const DEFAULT_PAGE_SIZE = 20
const VALID_PAGE_SIZES = [10, 20, 50]

const VALID_PROCUREMENT = ['purchased', 'produced', 'both']
const VALID_STATUS = ['active', 'inactive']

type SearchParams = Promise<{
  category?: string
  procurement_type?: string
  status?: string
  search?: string
  page?: string
  pageSize?: string
}>

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: currentUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', authUser.id)
    .single()

  if (!currentUser) {
    redirect('/login')
  }

  const canWrite = currentUser.role === 'admin' || currentUser.role === 'manager'

  // Build products query
  const pageSize = VALID_PAGE_SIZES.includes(parseInt(params.pageSize || ''))
    ? parseInt(params.pageSize!)
    : DEFAULT_PAGE_SIZE
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('products')
    .select(
      'id, sku, name, category_id, default_unit_id, cultivar_id, procurement_type, lot_tracking, preferred_supplier_id, default_price, price_currency, requires_regulatory_docs, is_active, category:resource_categories(name, icon), unit:units_of_measure(code), supplier:suppliers(name)',
      { count: 'exact' },
    )

  // Filters
  if (params.category) {
    query = query.eq('category_id', params.category)
  }

  if (params.procurement_type && VALID_PROCUREMENT.includes(params.procurement_type)) {
    query = query.eq('procurement_type', params.procurement_type as 'purchased' | 'produced' | 'both')
  }

  if (params.status && VALID_STATUS.includes(params.status)) {
    query = query.eq('is_active', params.status === 'active')
  }
  // No status filter → show all (active + inactive)

  if (params.search?.trim()) {
    const term = `%${params.search.trim()}%`
    query = query.or(`name.ilike.${term},sku.ilike.${term}`)
  }

  const { data: products, count } = await query
    .range(offset, offset + pageSize - 1)
    .order('name')

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  // Fetch reference data for filters + dialog + status counts
  const [
    { data: categoriesData },
    { data: unitsData },
    { data: cultivarsData },
    { data: suppliersData },
    { data: docTypesData },
    { count: activeCount },
    { count: inactiveCount },
  ] = await Promise.all([
    supabase
      .from('resource_categories')
      .select('id, name, icon, is_transformable')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('units_of_measure')
      .select('id, code, name')
      .order('code'),
    supabase
      .from('cultivars')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('suppliers')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('regulatory_doc_types')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', false),
  ])

  const statusCounts = {
    all: (activeCount ?? 0) + (inactiveCount ?? 0),
    active: activeCount ?? 0,
    inactive: inactiveCount ?? 0,
  }

  // Transform products
  const productsWithData = (products ?? []).map((p) => {
    const category = p.category as { name: string; icon: string | null } | null
    const unit = p.unit as { code: string } | null
    const supplier = p.supplier as { name: string } | null
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      category_id: p.category_id,
      category_name: category?.name ?? '',
      category_icon: category?.icon ?? null,
      default_unit_id: p.default_unit_id,
      unit_code: unit?.code ?? '',
      cultivar_id: p.cultivar_id,
      procurement_type: p.procurement_type,
      lot_tracking: p.lot_tracking,
      preferred_supplier_id: p.preferred_supplier_id,
      supplier_name: supplier?.name ?? null,
      default_price: p.default_price ? Number(p.default_price) : null,
      price_currency: p.price_currency,
      requires_regulatory_docs: p.requires_regulatory_docs,
      is_active: p.is_active,
    }
  })

  const categories = (categoriesData ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    is_transformable: c.is_transformable,
  }))

  const units = (unitsData ?? []).map((u) => ({ id: u.id, code: u.code, name: u.name }))
  const cultivars = (cultivarsData ?? []).map((cv) => ({ id: cv.id, name: cv.name }))
  const suppliers = (suppliersData ?? []).map((s) => ({ id: s.id, name: s.name }))
  const docTypes = (docTypesData ?? []).map((dt) => ({ id: dt.id, name: dt.name, code: dt.code }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Productos</h2>
        <p className="text-sm text-muted-foreground">
          Gestiona el catálogo maestro de productos e insumos.
        </p>
      </div>

      <ProductsListClient
        products={productsWithData}
        categories={categories}
        units={units}
        cultivars={cultivars}
        suppliers={suppliers}
        docTypes={docTypes}
        canWrite={canWrite}
        totalPages={totalPages}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        statusCounts={statusCounts}
        filters={{
          category: params.category || '',
          procurement_type: params.procurement_type || '',
          status: params.status || '',
          search: params.search || '',
        }}
      />
    </div>
  )
}
