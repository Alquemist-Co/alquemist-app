'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPasswordSchema, type ResetPasswordInput } from '@/schemas/auth'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Sprout, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

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

type PageState = 'loading' | 'invalid-token' | 'ready' | 'submitting' | 'success'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const hasTokenError = searchParams.get('error') === 'invalid_token'
  const [state, setState] = useState<PageState>(hasTokenError ? 'invalid-token' : 'loading')
  const supabase = createClient()

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirm_password: '' },
  })

  useEffect(() => {
    if (hasTokenError) return

    let settled = false

    // Check for existing session (set by auth/confirm callback)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !settled) {
        settled = true
        setState('ready')
      }
    })

    // Also listen for PASSWORD_RECOVERY event (fallback for hash-based tokens)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && !settled) {
        settled = true
        setState('ready')
      }
    })

    // Timeout — if no session after 3s, show error
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        setState('invalid-token')
      }
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [hasTokenError, supabase.auth])

  async function onSubmit(values: ResetPasswordInput) {
    setState('submitting')

    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      })

      if (error) {
        toast.error('Error al actualizar la contraseña. Intenta nuevamente.')
        setState('ready')
        return
      }

      await supabase.auth.signOut()
      setState('success')
    } catch {
      toast.error('Error inesperado. Intenta nuevamente.')
      setState('ready')
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          {state === 'success' ? (
            <CheckCircle2 className="h-6 w-6 text-primary" />
          ) : (
            <Sprout className="h-6 w-6 text-primary" />
          )}
        </div>
        <CardTitle className="text-2xl">
          {state === 'success' ? 'Contraseña actualizada' : 'Nueva contraseña'}
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
              El link ha expirado o no es válido.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/forgot-password">Solicitar nuevo link</Link>
            </Button>
          </div>
        )}

        {(state === 'ready' || state === 'submitting') && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva contraseña</FormLabel>
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
                {state === 'submitting'
                  ? 'Actualizando...'
                  : 'Restablecer contraseña'}
              </Button>
            </form>
          </Form>
        )}

        {state === 'success' && (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Tu contraseña ha sido actualizada correctamente.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          </div>
        )}
      </CardContent>

      {(state === 'ready' || state === 'submitting') && (
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
