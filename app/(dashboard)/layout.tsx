import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { AuthProvider, type AuthUser } from '@/lib/auth/context'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { SiteHeader } from '@/components/dashboard/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

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

  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false'

  return (
    <AuthProvider initialUser={initialUser}>
      <SidebarProvider
        defaultOpen={defaultOpen}
        style={
          {
            '--sidebar-width': 'calc(var(--spacing) * 72)',
            '--header-height': 'calc(var(--spacing) * 12)',
          } as React.CSSProperties
        }
      >
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col gap-6 px-4 py-4 lg:px-6 md:py-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  )
}
