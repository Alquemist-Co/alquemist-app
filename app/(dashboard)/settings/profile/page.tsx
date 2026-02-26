import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileInfoForm } from '@/components/settings/profile-info-form'
import { ChangePasswordForm } from '@/components/settings/change-password-form'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('id, email, full_name, phone, role, company:companies(name)')
    .eq('id', authUser.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  const company = userData.company as unknown as { name: string }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Mi Perfil</h2>
        <p className="text-sm text-muted-foreground">
          Administra tu información personal y contraseña.
        </p>
      </div>

      <ProfileInfoForm
        user={{
          id: userData.id,
          email: userData.email,
          full_name: userData.full_name,
          phone: userData.phone ?? '',
          role: userData.role,
          company_name: company.name,
        }}
      />

      <ChangePasswordForm email={userData.email} />
    </div>
  )
}
