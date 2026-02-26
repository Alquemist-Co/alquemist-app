import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UsersClient } from '@/components/settings/users-client'

const PAGE_SIZE = 20

type SearchParams = Promise<{
  role?: string
  status?: string
  search?: string
  page?: string
}>

export default async function UsersPage({
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

  // Fetch current user role
  const { data: currentUser } = await supabase
    .from('users')
    .select('id, role, company_id')
    .eq('id', authUser.id)
    .single()

  if (!currentUser) {
    redirect('/login')
  }

  // Only admin and manager can access this page
  if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
    redirect('/settings/profile')
  }

  // Build query
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('users')
    .select('*', { count: 'exact' })

  // Role filter
  if (params.role && ['admin', 'manager', 'supervisor', 'operator', 'viewer'].includes(params.role)) {
    query = query.eq('role', params.role as 'admin')
  }

  // Status filter
  if (params.status === 'active') {
    query = query.eq('is_active', true)
  } else if (params.status === 'inactive') {
    query = query.eq('is_active', false)
  }

  // Search filter
  if (params.search?.trim()) {
    const term = `%${params.search.trim()}%`
    query = query.or(`full_name.ilike.${term},email.ilike.${term}`)
  }

  const { data: users, count } = await query
    .range(offset, offset + PAGE_SIZE - 1)
    .order('full_name')

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Gestión de usuarios</h2>
        <p className="text-sm text-muted-foreground">
          Invita, edita roles y permisos, y gestiona el acceso de los miembros de tu equipo.
        </p>
      </div>

      <UsersClient
        users={(users ?? []).map((u) => ({
          ...u,
          permissions: u.permissions as Record<string, boolean> | null,
        }))}
        currentUserId={currentUser.id}
        currentUserRole={currentUser.role}
        totalPages={totalPages}
        currentPage={page}
        filters={{
          role: params.role || '',
          status: params.status || '',
          search: params.search || '',
        }}
      />
    </div>
  )
}
