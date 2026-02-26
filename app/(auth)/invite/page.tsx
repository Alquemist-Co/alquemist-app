'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { inviteActivationSchema, type InviteActivationInput } from '@/schemas/auth'
import { createClient } from '@/lib/supabase/client'
import { getRoleRedirect } from '@/lib/auth/utils'
import { activateInvite } from './actions'
import { toast } from 'sonner'
import { Sprout } from 'lucide-react'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

type PageState = 'loading' | 'invalid-token' | 'already-active' | 'ready' | 'submitting'

type UserData = {
  email: string
  full_name: string | null
  phone: string | null
  role: string
  company_name: string
}

export default function InvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasTokenError = searchParams.get('error') === 'invalid_token'
  const [state, setState] = useState<PageState>(hasTokenError ? 'invalid-token' : 'loading')
  const [userData, setUserData] = useState<UserData | null>(null)
  const supabase = createClient()

  const form = useForm<InviteActivationInput>({
    resolver: zodResolver(inviteActivationSchema),
    defaultValues: { full_name: '', phone: '', password: '', confirm_password: '' },
  })

  useEffect(() => {
    if (hasTokenError) return

    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setState('invalid-token')
        return
      }

      const { data, error } = await supabase
        .from('users')
        .select('email, full_name, phone, role, is_active, company_id, companies(name)')
        .eq('id', session.user.id)
        .single()

      if (error || !data) {
        setState('invalid-token')
        return
      }

      if (data.is_active) {
        setState('already-active')
        return
      }

      const company = data.companies as unknown as { name: string } | null

      setUserData({
        email: data.email,
        full_name: data.full_name,
        phone: data.phone,
        role: data.role,
        company_name: company?.name ?? '',
      })

      // Pre-fill form
      form.reset({
        full_name: data.full_name ?? '',
        phone: data.phone ?? '',
        password: '',
        confirm_password: '',
      })

      setState('ready')
    }

    loadUser()
  }, [hasTokenError, supabase, form])

  async function onSubmit(values: InviteActivationInput) {
    if (!userData) return
    setState('submitting')

    try {
      const result = await activateInvite(values)

      if (!result.success) {
        toast.error(result.error)
        setState('ready')
        return
      }

      // Sign out invite session
      await supabase.auth.signOut()

      // Sign in with new password for clean session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: values.password,
      })

      if (signInError) {
        toast.success('Cuenta activada. Inicia sesión con tus credenciales.')
        router.push('/login')
        return
      }

      router.push(getRoleRedirect(userData.role))
    } catch {
      toast.error('Error inesperado. Intenta nuevamente.')
      setState('ready')
    }
  }

  const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Manager',
    supervisor: 'Supervisor',
    operator: 'Operador',
    viewer: 'Visor',
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Sprout className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">
          {state === 'already-active'
            ? 'Cuenta ya activada'
            : state === 'invalid-token'
              ? 'Link inválido'
              : 'Activar cuenta'}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {state === 'loading' && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {state === 'invalid-token' && (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              El link de invitación no es válido o ha expirado.
            </p>
            <p className="text-sm text-muted-foreground">
              Contacta a tu administrador para recibir una nueva invitación.
            </p>
          </div>
        )}

        {state === 'already-active' && (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Tu cuenta ya fue activada. Inicia sesión para continuar.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          </div>
        )}

        {(state === 'ready' || state === 'submitting') && userData && (
          <div className="space-y-4">
            {/* Read-only info */}
            <div className="rounded-md border p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Empresa</span>
                <span className="font-medium">{userData.company_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{userData.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Rol</span>
                <Badge variant="secondary">
                  {ROLE_LABELS[userData.role] ?? userData.role}
                </Badge>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre completo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Juan Pérez"
                          autoComplete="name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Teléfono{' '}
                        <span className="text-muted-foreground font-normal">(opcional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+56 9 1234 5678"
                          autoComplete="tel"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Mínimo 8 caracteres"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirm_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar contraseña</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Repite tu contraseña"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={state === 'submitting'}
                >
                  {state === 'submitting' ? 'Activando...' : 'Activar cuenta'}
                </Button>
              </form>
            </Form>
          </div>
        )}
      </CardContent>

      {state === 'invalid-token' && (
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              Volver a iniciar sesión
            </Link>
          </p>
        </CardFooter>
      )}
    </Card>
  )
}
