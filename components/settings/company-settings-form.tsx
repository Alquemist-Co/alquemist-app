'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { companySettingsSchema, type CompanySettingsInput } from '@/schemas/settings'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/context'
import { COUNTRIES, TIMEZONES_BY_COUNTRY, CURRENCY_BY_COUNTRY } from '@/lib/data/countries'
import { toast } from 'sonner'
import { Info, Trash2, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'

type CompanyRow = {
  id: string
  name: string
  legal_id: string | null
  country: string
  timezone: string
  currency: string
  settings: Record<string, unknown> | null
  is_active: boolean
}

type Settings = {
  logo_url?: string | null
  regulatory_mode?: string
  regulatory_blocking_enabled?: boolean
  features_enabled?: {
    quality?: boolean
    regulatory?: boolean
    iot?: boolean
    field_app?: boolean
    cost_tracking?: boolean
  }
}

function parseSettings(raw: Record<string, unknown> | null): Settings {
  if (!raw) return {}
  return raw as Settings
}

export function CompanySettingsForm({
  company,
  isAdmin,
}: {
  company: CompanyRow
  isAdmin: boolean
}) {
  const { refreshUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [warningField, setWarningField] = useState('')
  const [pendingValues, setPendingValues] = useState<CompanySettingsInput | null>(null)

  // Logo state
  const settings = parseSettings(company.settings)
  const [logoUrl, setLogoUrl] = useState<string | null>(settings.logo_url ?? null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const features = settings.features_enabled ?? {}

  const form = useForm<CompanySettingsInput>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      name: company.name,
      legal_id: company.legal_id ?? '',
      country: company.country,
      timezone: company.timezone,
      currency: company.currency,
      regulatory_mode: (settings.regulatory_mode as CompanySettingsInput['regulatory_mode']) ?? 'none',
      regulatory_blocking_enabled: settings.regulatory_blocking_enabled ?? false,
      features_enabled: {
        quality: features.quality ?? false,
        regulatory: features.regulatory ?? false,
        iot: features.iot ?? false,
        field_app: features.field_app ?? false,
        cost_tracking: features.cost_tracking ?? false,
      },
    },
  })

  const isDirty = form.formState.isDirty || logoFile !== null || logoPreview !== null
  const selectedCountry = form.watch('country')
  const timezones = selectedCountry ? TIMEZONES_BY_COUNTRY[selectedCountry] ?? [] : []
  const regulatoryMode = form.watch('regulatory_mode')

  function handleCountryChange(countryCode: string) {
    form.setValue('country', countryCode, { shouldValidate: true, shouldDirty: true })

    const tzOptions = TIMEZONES_BY_COUNTRY[countryCode] ?? []
    if (tzOptions.length === 1) {
      form.setValue('timezone', tzOptions[0].value, { shouldValidate: true, shouldDirty: true })
    } else {
      form.setValue('timezone', '', { shouldValidate: false, shouldDirty: true })
    }

    const currency = CURRENCY_BY_COUNTRY[countryCode]
    if (currency) {
      form.setValue('currency', currency.code, { shouldValidate: true, shouldDirty: true })
    } else {
      form.setValue('currency', '', { shouldValidate: false, shouldDirty: true })
    }
  }

  function handleRegulatoryModeChange(mode: CompanySettingsInput['regulatory_mode']) {
    form.setValue('regulatory_mode', mode, { shouldDirty: true })
    if (mode === 'none') {
      form.setValue('features_enabled.regulatory', false, { shouldDirty: true })
      form.setValue('regulatory_blocking_enabled', false, { shouldDirty: true })
    }
  }

  // --- Logo handling ---
  async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        const MAX = 400
        if (width > MAX || height > MAX) {
          if (width > height) {
            height = Math.round((height * MAX) / width)
            width = MAX
          } else {
            width = Math.round((width * MAX) / height)
            height = MAX
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context unavailable'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Compression failed'))
          },
          file.type === 'image/png' ? 'image/png' : 'image/jpeg',
          0.9,
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      toast.error('El archivo es demasiado grande. Máximo 2MB.')
      return
    }

    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml']
    if (!allowed.includes(file.type)) {
      toast.error('Formato no soportado. Usa PNG, JPG o SVG.')
      return
    }

    // SVGs skip compression
    if (file.type === 'image/svg+xml') {
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
      return
    }

    try {
      const compressed = await compressImage(file)
      const compressedFile = new File([compressed], file.name, { type: compressed.type })
      setLogoFile(compressedFile)
      setLogoPreview(URL.createObjectURL(compressed))
    } catch {
      toast.error('Error al procesar la imagen.')
    }
  }

  async function uploadLogo(): Promise<string | null> {
    if (!logoFile) return logoUrl

    setIsUploadingLogo(true)
    try {
      const supabase = createClient()
      const ext = logoFile.name.split('.').pop() ?? 'png'
      const path = `${company.id}/logo.${ext}`

      // Remove old logo files first
      const { data: existing } = await supabase.storage
        .from('company-logos')
        .list(company.id)
      if (existing?.length) {
        await supabase.storage
          .from('company-logos')
          .remove(existing.map((f) => `${company.id}/${f.name}`))
      }

      const { error } = await supabase.storage
        .from('company-logos')
        .upload(path, logoFile, { upsert: true })

      if (error) {
        toast.error('Error al subir el logo.')
        return logoUrl
      }

      const { data: urlData } = supabase.storage
        .from('company-logos')
        .getPublicUrl(path)

      return urlData.publicUrl
    } catch {
      toast.error('Error al subir el logo.')
      return logoUrl
    } finally {
      setIsUploadingLogo(false)
    }
  }

  async function handleDeleteLogo() {
    setIsUploadingLogo(true)
    try {
      const supabase = createClient()
      const { data: existing } = await supabase.storage
        .from('company-logos')
        .list(company.id)
      if (existing?.length) {
        await supabase.storage
          .from('company-logos')
          .remove(existing.map((f) => `${company.id}/${f.name}`))
      }

      // Update company settings to clear logo_url
      const newSettings = { ...settings, logo_url: null }
      await supabase
        .from('companies')
        .update({ settings: newSettings })
        .eq('id', company.id)

      setLogoUrl(null)
      setLogoPreview(null)
      setLogoFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast.success('Logo eliminado.')
      refreshUser()
    } catch {
      toast.error('Error al eliminar el logo.')
    } finally {
      setIsUploadingLogo(false)
    }
  }

  // --- Submit ---
  async function doSave(values: CompanySettingsInput) {
    setIsLoading(true)
    try {
      const supabase = createClient()

      // Upload logo if new file selected
      const newLogoUrl = await uploadLogo()

      const newSettings = {
        ...settings,
        logo_url: newLogoUrl,
        regulatory_mode: values.regulatory_mode,
        regulatory_blocking_enabled: values.regulatory_blocking_enabled,
        features_enabled: values.features_enabled,
      }

      const { error } = await supabase
        .from('companies')
        .update({
          name: values.name,
          legal_id: values.legal_id || null,
          country: values.country,
          timezone: values.timezone,
          currency: values.currency,
          settings: newSettings,
        })
        .eq('id', company.id)

      if (error) {
        toast.error('Error al guardar los cambios.')
        return
      }

      toast.success('Configuración de empresa actualizada.')
      setLogoUrl(newLogoUrl)
      setLogoFile(null)
      setLogoPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      form.reset(values)
      refreshUser()
    } catch {
      toast.error('Error inesperado. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  function onSubmit(values: CompanySettingsInput) {
    // Check if timezone or currency changed
    const tzChanged = values.timezone !== company.timezone
    const currChanged = values.currency !== company.currency
    if (tzChanged || currChanged) {
      const fields: string[] = []
      if (tzChanged) fields.push('zona horaria')
      if (currChanged) fields.push('moneda')
      setWarningField(fields.join(' y '))
      setPendingValues(values)
      setShowWarning(true)
      return
    }
    doSave(values)
  }

  const disabled = !isAdmin || isLoading

  return (
    <>
      {!isAdmin && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
          <Info className="h-4 w-4 shrink-0" />
          Solo los administradores pueden editar la configuración de la empresa.
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Section 1: Datos Básicos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos básicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la empresa</FormLabel>
                    <FormControl>
                      <Input placeholder="Mi Empresa S.A." disabled={disabled} {...field} />
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
                      ID fiscal <span className="font-normal text-muted-foreground">(opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="RUT, NIT, RFC..." disabled={disabled} {...field} />
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
                        className={SELECT_CLASS}
                        value={field.value}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        disabled={disabled}
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
                        className={SELECT_CLASS}
                        value={field.value}
                        onChange={(e) =>
                          form.setValue('timezone', e.target.value, {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                        disabled={disabled || !selectedCountry}
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
                        disabled={disabled}
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
            </CardContent>
          </Card>

          {/* Section 2: Logo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logo de la empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {(logoPreview || logoUrl) ? (
                  <img
                    src={logoPreview ?? logoUrl!}
                    alt="Logo"
                    className="h-20 w-20 rounded-lg border object-contain"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                    <span className="text-xs">Sin logo</span>
                  </div>
                )}
                {isAdmin && (
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploadingLogo}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {logoPreview || logoUrl ? 'Cambiar logo' : 'Subir logo'}
                    </Button>
                    {(logoUrl || logoPreview) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={isUploadingLogo}
                        onClick={handleDeleteLogo}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG o SVG. Máximo 2MB.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Modo Regulatorio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Modo regulatorio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="regulatory_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={(v) =>
                          handleRegulatoryModeChange(v as CompanySettingsInput['regulatory_mode'])
                        }
                        disabled={disabled}
                        className="space-y-3"
                      >
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem value="strict" id="strict" className="mt-0.5" />
                          <div>
                            <Label htmlFor="strict" className="font-medium">
                              Estricto
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Requiere cumplimiento completo de regulaciones. Puede bloquear operaciones.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem value="standard" id="standard" className="mt-0.5" />
                          <div>
                            <Label htmlFor="standard" className="font-medium">
                              Estándar
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Seguimiento regulatorio sin bloqueo de operaciones.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem value="none" id="none" className="mt-0.5" />
                          <div>
                            <Label htmlFor="none" className="font-medium">
                              Sin regulatorio
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Desactiva completamente el módulo regulatorio.
                            </p>
                          </div>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {regulatoryMode === 'strict' && (
                <FormField
                  control={form.control}
                  name="regulatory_blocking_enabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel className="text-sm font-medium">
                          Bloqueo regulatorio
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Bloquea operaciones que no cumplan con los requisitos regulatorios.
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Section 4: Módulos Habilitados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Módulos habilitados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {([
                {
                  key: 'quality' as const,
                  label: 'Calidad',
                  desc: 'Pruebas de calidad, muestras y resultados de laboratorio.',
                },
                {
                  key: 'regulatory' as const,
                  label: 'Regulatorio',
                  desc: 'Gestión de documentos y cumplimiento normativo.',
                },
                {
                  key: 'iot' as const,
                  label: 'IoT / Monitoreo ambiental',
                  desc: 'Sensores, lecturas ambientales y alertas automatizadas.',
                },
                {
                  key: 'field_app' as const,
                  label: 'App de campo',
                  desc: 'Interfaz simplificada para operadores en terreno.',
                },
                {
                  key: 'cost_tracking' as const,
                  label: 'Seguimiento de costos',
                  desc: 'Registro y análisis de costos por lote y actividad.',
                },
              ]).map((mod) => {
                const isRegulatoryDisabled =
                  mod.key === 'regulatory' && regulatoryMode === 'none'
                return (
                  <FormField
                    key={mod.key}
                    control={form.control}
                    name={`features_enabled.${mod.key}`}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg p-3">
                        <div>
                          <FormLabel className="text-sm font-medium">{mod.label}</FormLabel>
                          <p className="text-sm text-muted-foreground">{mod.desc}</p>
                          {isRegulatoryDisabled && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              Activa el modo regulatorio para habilitar este módulo.
                            </p>
                          )}
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={disabled || isRegulatoryDisabled}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )
              })}
            </CardContent>
          </Card>

          {/* Save button */}
          {isAdmin && (
            <div className="flex justify-end">
              <Button type="submit" disabled={!isDirty || isLoading}>
                {isLoading ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          )}
        </form>
      </Form>

      {/* Warning dialog for timezone/currency changes */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cambio</AlertDialogTitle>
            <AlertDialogDescription>
              Estás cambiando la {warningField} de tu empresa. Este cambio puede afectar
              reportes, cálculos y datos existentes. ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingValues(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingValues) {
                  doSave(pendingValues)
                  setPendingValues(null)
                }
                setShowWarning(false)
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
