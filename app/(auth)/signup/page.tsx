'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signupSchema, type SignupInput } from '@/schemas/auth'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES, TIMEZONES_BY_COUNTRY, CURRENCY_BY_COUNTRY } from '@/lib/data/countries'
import { signup } from './actions'
import { toast } from 'sonner'
import { Sprout } from 'lucide-react'
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

const STEP_1_FIELDS = ['name', 'legal_id', 'country', 'timezone', 'currency'] as const

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      legal_id: '',
      country: '',
      timezone: '',
      currency: '',
      full_name: '',
      email: '',
      phone: '',
      password: '',
      confirm_password: '',
    },
  })

  const selectedCountry = form.watch('country')
  const timezones = selectedCountry ? TIMEZONES_BY_COUNTRY[selectedCountry] ?? [] : []

  function handleCountryChange(countryCode: string) {
    form.setValue('country', countryCode, { shouldValidate: true })

    // Auto-set timezone if single option, otherwise clear
    const tzOptions = TIMEZONES_BY_COUNTRY[countryCode] ?? []
    if (tzOptions.length === 1) {
      form.setValue('timezone', tzOptions[0].value, { shouldValidate: true })
    } else {
      form.setValue('timezone', '', { shouldValidate: false })
    }

    // Auto-fill currency
    const currency = CURRENCY_BY_COUNTRY[countryCode]
    if (currency) {
      form.setValue('currency', currency.code, { shouldValidate: true })
    } else {
      form.setValue('currency', '', { shouldValidate: false })
    }
  }

  async function goToStep2() {
    const valid = await form.trigger(STEP_1_FIELDS as unknown as (keyof SignupInput)[])
    if (valid) setStep(2)
  }

  async function onSubmit(values: SignupInput) {
    setIsLoading(true)

    try {
      const result = await signup(values)

      if (!result.success) {
        toast.error(result.error)
        if (result.field) {
          form.setError(result.field as keyof SignupInput, { message: result.error })
          // Navigate back to step 1 if the error field is there
          if (STEP_1_FIELDS.includes(result.field as (typeof STEP_1_FIELDS)[number])) {
            setStep(1)
          }
        }
        return
      }

      // Auto-login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })

      if (signInError) {
        toast.success('Cuenta creada. Inicia sesión con tus credenciales.')
        router.push('/login')
        return
      }

      router.push('/settings/company')
    } catch {
      toast.error('Error inesperado. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Sprout className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Alquemist</CardTitle>

        {/* Stepper */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                step === 1
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/20 text-primary'
              }`}
            >
              1
            </div>
            <span className={`text-sm ${step === 1 ? 'font-medium' : 'text-muted-foreground'}`}>
              Tu empresa
            </span>
          </div>
          <div className="h-px w-8 bg-border" />
          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                step === 2
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              2
            </div>
            <span className={`text-sm ${step === 2 ? 'font-medium' : 'text-muted-foreground'}`}>
              Tu cuenta
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Step 1 - Company */}
            <div className={step === 1 ? undefined : 'hidden'}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la empresa</FormLabel>
                      <FormControl>
                        <Input placeholder="Mi Empresa S.A." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="legal_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        ID fiscal <span className="text-muted-foreground font-normal">(opcional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="RUT, NIT, RFC..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                          value={field.value}
                          onChange={(e) => handleCountryChange(e.target.value)}
                        >
                          <option value="">Selecciona un país</option>
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zona horaria</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                          value={field.value}
                          onChange={(e) => form.setValue('timezone', e.target.value, { shouldValidate: true })}
                          disabled={!selectedCountry}
                        >
                          <option value="">Selecciona una zona horaria</option>
                          {timezones.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moneda</FormLabel>
                      <FormControl>
                        <Input
                          readOnly
                          placeholder="Se asigna automáticamente"
                          value={
                            field.value && selectedCountry
                              ? `${field.value} — ${CURRENCY_BY_COUNTRY[selectedCountry]?.name ?? ''}`
                              : ''
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="button" className="w-full" onClick={goToStep2}>
                  Siguiente
                </Button>
              </div>
            </div>

            {/* Step 2 - Admin account */}
            <div className={step === 2 ? undefined : 'hidden'}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Juan Pérez" autoComplete="name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Teléfono <span className="text-muted-foreground font-normal">(opcional)</span>
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

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(1)}
                    disabled={isLoading}
                  >
                    Atrás
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? 'Creando...' : 'Crear empresa'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
