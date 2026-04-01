import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export default async function FieldLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('is_active, companies(is_active)')
    .eq('id', user.id)
    .single()

  if (!userData?.is_active) {
    redirect('/login?suspended=user')
  }

  const company = userData.companies as unknown as { is_active: boolean } | null
  if (!company?.is_active) {
    redirect('/login?suspended=company')
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Mobile-first layout for field operations */}
      <main className="flex-1 p-4">{children}</main>
    </div>
  )
}
