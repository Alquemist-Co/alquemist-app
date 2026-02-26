'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { changePasswordSchema, type ChangePasswordInput } from '@/schemas/settings'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

function getPasswordStrength(password: string): { label: string; level: number; color: string } {
  if (!password) return { label: '', level: 0, color: '' }

  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 2) return { label: 'Débil', level: 1, color: 'bg-red-500' }
  if (score <= 3) return { label: 'Media', level: 2, color: 'bg-yellow-500' }
  return { label: 'Fuerte', level: 3, color: 'bg-green-500' }
}

export function ChangePasswordForm({ email }: { email: string }) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  })

  const newPassword = form.watch('new_password')
  const strength = getPasswordStrength(newPassword)

  async function onSubmit(values: ChangePasswordInput) {
    setIsLoading(true)
    try {
      const supabase = createClient()

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: values.current_password,
      })

      if (signInError) {
        toast.error('La contraseña actual es incorrecta.')
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.new_password,
      })

      if (updateError) {
        toast.error('Error al cambiar la contraseña.')
        return
      }

      toast.success('Contraseña actualizada correctamente.')
      form.reset()
    } catch {
      toast.error('Error inesperado. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cambiar contraseña</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="current_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña actual</FormLabel>
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

            <FormField
              control={form.control}
              name="new_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva contraseña</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  {newPassword && (
                    <div className="space-y-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full ${
                              level <= strength.level ? strength.color : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{strength.label}</p>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar nueva contraseña</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" variant="outline" disabled={isLoading}>
                {isLoading ? 'Cambiando...' : 'Cambiar contraseña'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
