import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { AuthProvider, type AuthUser } from '@/lib/auth/context'
import { Sidebar } from '@/components/dashboard/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('id, email, full_name, phone, role, company:companies(id, name, settings)')
    .eq('id', authUser.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  const company = userData.company as unknown as AuthUser['company']

  const initialUser: AuthUser = {
    id: userData.id,
    email: userData.email,
    full_name: userData.full_name,
    phone: userData.phone,
    role: userData.role as AuthUser['role'],
    company,
    facility: null,
  }

  return (
    <AuthProvider initialUser={initialUser}>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </AuthProvider>
  )
}
