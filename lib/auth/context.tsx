'use client'

import { createContext, useContext } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type AuthUser = {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: 'admin' | 'manager' | 'supervisor' | 'operator' | 'viewer'
  company: {
    id: string
    name: string
    settings: Record<string, unknown> | null
  }
  facility: { id: string; name: string } | null
}

type AuthContextValue = {
  user: AuthUser
  refreshUser: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: AuthUser
  children: React.ReactNode
}) {
  const { data: user } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return initialUser

      const { data } = await supabase
        .from('users')
        .select('id, email, full_name, phone, role, company:companies(id, name, settings)')
        .eq('id', authUser.id)
        .single()

      if (!data) return initialUser

      const company = data.company as unknown as AuthUser['company']
      return {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        phone: data.phone,
        role: data.role as AuthUser['role'],
        company,
        facility: null,
      } satisfies AuthUser
    },
    initialData: initialUser,
    staleTime: 5 * 60 * 1000,
  })

  const queryClient = useQueryClient()

  function refreshUser() {
    queryClient.invalidateQueries({ queryKey: ['auth-user'] })
  }

  return (
    <AuthContext value={{ user, refreshUser }}>
      {children}
    </AuthContext>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
