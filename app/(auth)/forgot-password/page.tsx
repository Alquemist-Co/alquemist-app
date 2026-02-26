'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/schemas/auth'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Sprout, Mail } from 'lucide-react'
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

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: ForgotPasswordInput) {
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        values.email,
        { redirectTo: `${window.location.origin}/auth/confirm?redirect_to=/reset-password` }
      )

      if (error) {
        if (error.status === 429) {
          toast.error('Demasiados intentos. Espera unos minutos.')
          return
        }
        // Always show success to prevent email enumeration
      }

      setSent(true)
    } catch {
      toast.error('Error de conexión. Intenta nuevamente.')
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
        <CardTitle className="text-2xl">
          {sent ? 'Revisa tu bandeja' : 'Recuperar contraseña'}
        </CardTitle>
        {!sent && (
          <CardDescription>
            Ingresa tu email y te enviaremos un link para restablecer tu contraseña
          </CardDescription>
        )}
      </CardHeader>

      <CardContent>
        {sent ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Si existe una cuenta con ese email, recibirás un link de restablecimiento.
            </p>
          </div>
        ) : (
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

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Enviando...' : 'Enviar link'}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
