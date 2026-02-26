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

  return (
    <div className="flex min-h-screen flex-col">
      {/* Mobile-first layout for field operations */}
      <main className="flex-1 p-4">{children}</main>
    </div>
  )
}
