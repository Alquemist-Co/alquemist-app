'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/schemas/auth'
import { createClient } from '@/lib/supabase/client'
import { getRoleRedirect } from '@/lib/auth/utils'
import { toast } from 'sonner'
import { Sprout } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
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

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  // Show expired session toast on mount
  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      toast.error('Tu sesión ha expirado. Inicia sesión nuevamente.')
    }
  }, [searchParams])

  async function onSubmit(values: LoginInput) {
    setIsLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })

      if (signInError) {
        toast.error('Credenciales inválidas. Verifica tu email y contraseña.')
        return
      }

      // Verify user is active and company is active
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, is_active, company_id, companies(is_active)')
        .single()

      if (userError || !userData) {
        await supabase.auth.signOut()
        toast.error('No se encontró tu cuenta. Contacta al administrador.')
        return
      }

      if (!userData.is_active) {
        await supabase.auth.signOut()
        toast.error('Tu cuenta está suspendida. Contacta al administrador.')
        return
      }

      const company = userData.companies as unknown as { is_active: boolean } | null
      if (!company?.is_active) {
        await supabase.auth.signOut()
        toast.error('Tu empresa está suspendida. Contacta al administrador.')
        return
      }

      // Update last_login_at (fire-and-forget)
      supabase.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', (await supabase.auth.getUser()).data.user!.id).then()

      router.push(getRoleRedirect(userData.role))
    } catch {
      toast.error('Error inesperado. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Sprout className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Alquemist</CardTitle>
        <CardDescription>Ingresa a tu cuenta para continuar</CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="tu@email.com"
                      autoComplete="email"
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
                  <div className="flex items-center justify-between">
                    <FormLabel>Contraseña</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          ¿No tienes cuenta?{' '}
          <Link href="/signup" className="text-primary hover:underline">
            Regístrate
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
