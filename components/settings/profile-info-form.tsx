'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileInfoSchema, type ProfileInfoInput } from '@/schemas/settings'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/context'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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

const roleBadgeStyles: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  supervisor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  operator: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Manager',
  supervisor: 'Supervisor',
  operator: 'Operador',
  viewer: 'Visualizador',
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

type ProfileUser = {
  id: string
  email: string
  full_name: string
  phone: string
  role: string
  company_name: string
}

export function ProfileInfoForm({ user }: { user: ProfileUser }) {
  const { refreshUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<ProfileInfoInput>({
    resolver: zodResolver(profileInfoSchema),
    defaultValues: {
      full_name: user.full_name,
      phone: user.phone,
    },
  })

  const isDirty = form.formState.isDirty

  async function onSubmit(values: ProfileInfoInput) {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update({
          full_name: values.full_name,
          phone: values.phone || null,
        })
        .eq('id', user.id)

      if (error) {
        toast.error('Error al guardar los cambios.')
        return
      }

      toast.success('Perfil actualizado correctamente.')
      form.reset(values)
      refreshUser()
    } catch {
      toast.error('Error inesperado. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Información personal</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Avatar + role */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg font-medium">
                  {getInitials(form.watch('full_name') || user.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{form.watch('full_name') || user.full_name}</p>
                <Badge
                  variant="secondary"
                  className={`mt-1 ${roleBadgeStyles[user.role] ?? ''}`}
                >
                  {roleLabels[user.role] ?? user.role}
                </Badge>
              </div>
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Input value={user.email} disabled className="pr-10" />
                <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Tu nombre" {...field} />
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
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="+56 9 1234 5678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Read-only info */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Empresa</label>
              <Input value={user.company_name} disabled />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={!isDirty || isLoading}>
                {isLoading ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
