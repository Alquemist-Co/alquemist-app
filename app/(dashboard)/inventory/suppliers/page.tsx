import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SuppliersListClient } from '@/components/inventory/suppliers-list-client'

const DEFAULT_PAGE_SIZE = 20
const VALID_PAGE_SIZES = [10, 20, 50]

const VALID_STATUS = ['active', 'inactive']

type SearchParams = Promise<{
  status?: string
  search?: string
  page?: string
  pageSize?: string
}>

export default async function SuppliersPage({
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

  // Build suppliers query
  const pageSize = VALID_PAGE_SIZES.includes(parseInt(params.pageSize || ''))
    ? parseInt(params.pageSize!)
    : DEFAULT_PAGE_SIZE
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('suppliers')
    .select(
      'id, name, contact_info, payment_terms, is_active, products:products(count)',
      { count: 'exact' },
    )

  // Filters
  if (params.status && VALID_STATUS.includes(params.status)) {
    query = query.eq('is_active', params.status === 'active')
  }

  if (params.search?.trim()) {
    const term = `%${params.search.trim()}%`
    query = query.or(`name.ilike.${term},contact_info->>contact_name.ilike.${term},contact_info->>email.ilike.${term}`)
  }

  const { data: suppliers, count } = await query
    .range(offset, offset + pageSize - 1)
    .order('name')

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  // Fetch status counts
  const [{ count: activeCount }, { count: inactiveCount }] = await Promise.all([
    supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('is_active', false),
  ])

  const statusCounts = {
    all: (activeCount ?? 0) + (inactiveCount ?? 0),
    active: activeCount ?? 0,
    inactive: inactiveCount ?? 0,
  }

  // Transform suppliers
  const suppliersWithData = (suppliers ?? []).map((s) => {
    const products = s.products as unknown as { count: number }[]
    return {
      id: s.id,
      name: s.name,
      contact_info: s.contact_info as Record<string, string> | null,
      payment_terms: s.payment_terms,
      is_active: s.is_active,
      product_count: products?.[0]?.count ?? 0,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Proveedores</h2>
        <p className="text-sm text-muted-foreground">
          Gestiona el catálogo de proveedores de insumos y servicios.
        </p>
      </div>

      <SuppliersListClient
        suppliers={suppliersWithData}
        canWrite={canWrite}
        totalPages={totalPages}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        statusCounts={statusCounts}
        filters={{
          status: params.status || '',
          search: params.search || '',
        }}
      />
    </div>
  )
}
